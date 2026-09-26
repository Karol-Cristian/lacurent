from __future__ import annotations

import pytest

from commercial.app.engine import calculate, demo_building
from commercial.app.heating_catalog_store import (
    HEATING_PARAMETRIC_NODE_TOTAL,
    build_parametric_heating_nodes,
    seed_heating_catalog_payload,
)
from commercial.app.heating_optimization import (
    _estimated_heat_pump_scop,
    _rebase_candidate,
    apply_heating_technology,
    apply_supplemental_heating_technology,
    commercialize_heating_finalist,
    heating_branch_plan,
    heating_planning_options,
    heating_technologies,
    heat_pump_monthly_performance_profile,
    run_heating_branch_optimization,
    run_mixed_heating_optimization,
    technology_is_eligible,
)
from commercial.app.optimization import (
    OptimizationMode,
    OptimizationRequestV1,
    OptimizationSearchBoundsV1,
    ParametricMeasuresV1,
    evaluate_parametric_candidate,
)
from commercial.app.models import BuildingInput, model_to_dict
from commercial.app.pricing import estimate_energy_cost


def _catalog() -> dict:
    return {
        "source": "test",
        "catalog_version": "test-v1",
        "costs": {
            "wall": {"cost_lei": 16, "unit": "lei_per_m2_per_cm"},
            "roof": {"cost_lei": 8, "unit": "lei_per_m2_per_cm"},
            "floor": {"cost_lei": 11, "unit": "lei_per_m2_per_cm"},
            "windows": {"cost_lei": 1000, "unit": "lei_per_m2"},
            "ventilation": {"cost_lei": 8000, "unit": "lei_total"},
            "pv": {"cost_lei": 4000, "unit": "lei_per_kwp"},
            "solar_thermal": {"cost_lei": 2650, "unit": "lei_per_m2"},
        },
    }


def test_dense_parametric_heating_grid_has_1000_non_sku_nodes() -> None:
    seed = heating_planning_catalog()
    nodes = build_parametric_heating_nodes(list(seed.get("options") or []))

    assert len(nodes) == HEATING_PARAMETRIC_NODE_TOTAL == 1000
    assert all(":parametric:" in item["id"] for item in nodes)
    assert all(item["planning_capex_lei"] >= 0 for item in nodes)
    assert all(
        item["interpolation_kind"] == "linear_between_source_backed_market_anchors"
        for item in nodes
    )
    assert len({item["source_signature"] for item in nodes}) == 1


def test_heating_technologies_use_dense_grid_without_creating_fake_products() -> None:
    catalog = seed_heating_catalog_payload()
    technologies = heating_technologies(catalog)

    assert sum(len(item.parametric_nodes) for item in technologies) == 1000
    assert sum(len(item.products) for item in technologies) == len(catalog["options"])
    assert len(catalog["options"]) < len(catalog["parametric_heating_nodes"])


def test_heating_catalog_groups_products_into_technology_branches() -> None:
    options = heating_planning_options()
    technologies = heating_technologies()

    assert len(options) > len(technologies)
    ids = {item.id for item in technologies}
    assert {
        "condensing-gas",
        "heat-pump-air-water",
        "heat-pump-air-air",
        "electric-boiler",
        "pellet-boiler",
    } <= ids

    hp = next(item for item in technologies if item.id == "heat-pump-air-water")
    hp_powers = {round(item.rated_power_kw, 2) for item in hp.products}
    assert {5.0, 7.0, 8.0, 12.0, 15.0} <= hp_powers
    assert len(hp.products) >= 5

    electric = next(item for item in technologies if item.id == "electric-boiler")
    electric_powers = {round(item.rated_power_kw, 2) for item in electric.products}
    assert {5.94, 6.0, 8.91, 9.0, 12.0, 18.0} <= electric_powers
    assert len(electric.products) >= 5

    for option in options:
        assert option.source_url
        assert option.equipment_price_lei > 0
        assert option.installed_capex_lei >= option.equipment_price_lei
        assert option.rated_power_kw > 0


def test_existing_condensing_gas_is_represented_by_keep_current_branch() -> None:
    baseline = demo_building()
    gas = next(item for item in heating_technologies() if item.id == "condensing-gas")

    eligible, reason = technology_is_eligible(baseline, gas)

    assert not eligible
    assert "deja instalată" in str(reason)


def test_branch_plan_has_one_heat_pump_branch_not_one_branch_per_power_step() -> None:
    baseline = demo_building()
    request = OptimizationRequestV1(
        baseline=baseline,
        mode=OptimizationMode.auto_economic,
    )

    plan = heating_branch_plan(request)
    ids = [item.branch_id for item in plan]

    assert ids.count("heat-pump-air-water") == 1
    assert not any(item.startswith("heat-pump-air-water-") for item in ids)
    assert "heat-pump-air-air" in ids
    assert "heat-pump-ground-water" in ids
    air_air = next(item for item in plan if item.branch_id == "heat-pump-air-air")
    ground = next(item for item in plan if item.branch_id == "heat-pump-ground-water")
    assert air_air.economic_eligible is True
    assert ground.economic_eligible is False
    assert air_air.commercialization_mode == "raw_parametric_then_product_match"
    assert air_air.min_product_power_kw == pytest.approx(4.0)
    assert air_air.max_product_power_kw == pytest.approx(21.6)


def test_heating_capacity_is_derived_after_each_complete_house_recalculation() -> None:
    baseline = demo_building()
    hp = next(item for item in heating_technologies() if item.id == "heat-pump-air-water")
    hp_building = apply_heating_technology(baseline, hp)

    base_candidate = evaluate_parametric_candidate(
        hp_building,
        ParametricMeasuresV1(window_target_u_w_m2k=0.9),
        _catalog(),
    )
    improved_candidate = evaluate_parametric_candidate(
        hp_building,
        ParametricMeasuresV1(
            wall_added_r_m2k_w=8,
            roof_added_r_m2k_w=10,
            floor_added_r_m2k_w=6,
            window_replacement_fraction=1,
            window_target_u_w_m2k=0.9,
        ),
        _catalog(),
    )

    baseline_bill = float(
        estimate_energy_cost(calculate(baseline, include_reference=False))["priced_total_lei"]
    )
    sized_base = _rebase_candidate(
        base_candidate,
        original_baseline_bill_lei=baseline_bill,
        original_building=baseline,
        technology=hp,
    )
    sized_improved = _rebase_candidate(
        improved_candidate,
        original_baseline_bill_lei=baseline_bill,
        original_building=baseline,
        technology=hp,
    )

    assert sized_base is not None
    assert sized_improved is not None
    assert sized_improved.design_heat_load_kw < sized_base.design_heat_load_kw

    base_line = next(line for line in sized_base.cost_breakdown if line.family == "heating")
    improved_line = next(line for line in sized_improved.cost_breakdown if line.family == "heating")

    assert base_line.parameter_value == pytest.approx(sized_base.design_heat_load_kw)
    assert improved_line.parameter_value == pytest.approx(sized_improved.design_heat_load_kw)
    assert improved_line.parameter_value <= base_line.parameter_value
    assert base_line.product_id is None
    assert improved_line.product_id is None
    assert base_line.source_kind == "product_derived_parametric_curve"
    assert "Niciun SKU" in str(improved_line.note)
    assert any("No arbitrary fixed oversizing factor" in item for item in sized_improved.assumptions)


def test_heat_pump_branch_reprices_heating_inside_optimizer_search() -> None:
    baseline = demo_building()
    result = run_heating_branch_optimization(
        OptimizationRequestV1(
            baseline=baseline,
            mode=OptimizationMode.auto_economic,
        ),
        branch_id="heat-pump-air-water",
        bounds=OptimizationSearchBoundsV1(
            wall_added_r_m2k_w_max=8,
            roof_added_r_m2k_w_max=10,
            floor_added_r_m2k_w_max=6,
            window_replacement_fraction_max=1,
            window_target_u_w_m2k=0.9,
            pv_added_kwp_max=3,
            solar_thermal_added_m2_max=4,
        ),
        catalog=_catalog(),
        max_evaluations=12,
    )

    assert result.parametric_evaluations == 12
    assert result.branch.sizing_mode == "raw_design_load_then_product_match_finalists"
    assert result.branch.evaluated_candidates == 12
    assert result.selection.selected is not None

    heating_line = next(
        line
        for line in result.selection.selected.cost_breakdown
        if line.family == "heating"
    )
    assert heating_line.parameter_value == pytest.approx(
        result.selection.selected.design_heat_load_kw
    )
    assert heating_line.product_id is None
    assert heating_line.catalog_unit == "lei_total_as_function_of_design_kW"


def test_mixed_heating_search_recalculates_technology_branches() -> None:
    baseline = demo_building()
    result = run_mixed_heating_optimization(
        OptimizationRequestV1(
            baseline=baseline,
            mode=OptimizationMode.auto_economic,
        ),
        bounds=OptimizationSearchBoundsV1(
            wall_added_r_m2k_w_max=3,
            roof_added_r_m2k_w_max=3,
            floor_added_r_m2k_w_max=2,
            window_replacement_fraction_max=1,
            window_target_u_w_m2k=0.9,
            pv_added_kwp_max=3,
            solar_thermal_added_m2_max=4,
        ),
        catalog=_catalog(),
        max_evaluations_per_branch=12,
    )

    assert result.selection.selected is not None
    assert result.parametric_evaluations >= 24
    assert result.heating_branch_evaluations >= 12
    assert any(item.branch_id == "keep-current-heating" and item.eligible for item in result.branches)
    assert any(item.branch_id == "heat-pump-air-water" and item.eligible for item in result.branches)


def test_mixed_heating_budget_includes_sized_heating_capex() -> None:
    baseline = demo_building()
    budget = 35000
    result = run_mixed_heating_optimization(
        OptimizationRequestV1(
            baseline=baseline,
            mode=OptimizationMode.investment_budget,
            investment_budget_lei=budget,
        ),
        bounds=OptimizationSearchBoundsV1(
            wall_added_r_m2k_w_max=2,
            roof_added_r_m2k_w_max=2,
            floor_added_r_m2k_w_max=1,
            window_replacement_fraction_max=1,
            window_target_u_w_m2k=0.9,
            pv_added_kwp_max=2,
            solar_thermal_added_m2_max=2,
        ),
        catalog=_catalog(),
        max_evaluations_per_branch=12,
    )

    assert result.selection.selected is not None
    assert result.selection.selected.capex_lei <= budget + 0.01


def test_no_universal_oversizing_margin_is_encoded_in_catalog_policy() -> None:
    from commercial.app.heating_optimization import heating_planning_catalog

    policy = heating_planning_catalog()["sizing_policy"]
    assert policy["fixed_oversizing_margin_fraction"] == 0
    assert policy["basis"] == "design_heat_load_at_normative_winter_design_temperature"


def test_real_product_catalog_has_at_least_five_products_per_heating_category() -> None:
    options = heating_planning_options()
    expectations = {
        "heat-pump-air-water": (5, {"Mitsubishi", "Daikin", "LG", "NIBE", "Ariston"}),
        "heat-pump-air-air": (5, {"Daikin"}),
        "condensing-gas": (5, {"Ariston", "Bosch", "Vaillant", "Viessmann", "Immergas"}),
        "electric-boiler": (5, {"Protherm", "Bosch", "Ferroli"}),
        "pellet-boiler": (5, {"Ferroli", "BURNiT", "Fornello", "Thermostahl", "BIODOM"}),
    }
    for technology_id, (minimum, brands) in expectations.items():
        products = [item for item in options if item.technology_id == technology_id]
        assert len(products) >= minimum, (technology_id, [item.label for item in products])
        assert all(item.label.strip() for item in products)
        assert all(item.rated_power_kw > 0 for item in products)
        assert all(item.equipment_price_lei > 0 for item in products)
        assert all(item.source_url for item in products)
        labels = " ".join(item.label for item in products)
        for brand in brands:
            assert brand in labels, (technology_id, brand, labels)


def test_heating_product_is_selected_only_after_raw_finalist_exists() -> None:
    baseline = demo_building()
    technology = next(item for item in heating_technologies() if item.id == "electric-boiler")
    branch_building = apply_heating_technology(baseline, technology)
    raw = evaluate_parametric_candidate(
        branch_building,
        ParametricMeasuresV1(window_target_u_w_m2k=0.9),
        _catalog(),
    )
    baseline_bill = float(
        estimate_energy_cost(calculate(baseline, include_reference=False))["priced_total_lei"]
    )
    raw_branch_candidate = _rebase_candidate(
        raw,
        original_baseline_bill_lei=baseline_bill,
        original_building=baseline,
        technology=technology,
    )
    assert raw_branch_candidate is not None
    raw_line = next(
        item for item in raw_branch_candidate.cost_breakdown
        if item.family == "heating"
    )
    assert raw_line.product_id is None
    assert "Niciun SKU" in str(raw_line.note)

    commercial, product, _ = commercialize_heating_finalist(
        raw_branch_candidate,
        original_building=baseline,
    )
    assert product is not None
    exact_line = next(
        item for item in commercial.cost_breakdown
        if item.family == "heating"
    )
    assert exact_line.product_id == product.id
    assert exact_line.parameter_value == pytest.approx(product.rated_power_kw)
    assert exact_line.design_available_capacity_kw == pytest.approx(product.rated_power_kw)
    assert exact_line.capacity_basis == "catalog_rated_output"
    assert str(exact_line.note).startswith(product.label + ":")


def test_air_water_heat_pump_is_not_claimed_sufficient_below_published_capacity_curve() -> None:
    baseline = demo_building()
    hp = next(item for item in heating_technologies() if item.id == "heat-pump-air-water")
    hp_building = apply_heating_technology(baseline, hp)
    raw = evaluate_parametric_candidate(
        hp_building,
        ParametricMeasuresV1(window_target_u_w_m2k=0.9),
        _catalog(),
    )
    baseline_bill = float(
        estimate_energy_cost(calculate(baseline, include_reference=False))["priced_total_lei"]
    )
    raw_branch_candidate = _rebase_candidate(
        raw,
        original_baseline_bill_lei=baseline_bill,
        original_building=baseline,
        technology=hp,
    )
    assert raw_branch_candidate is not None

    commercial, product, warnings = commercialize_heating_finalist(
        raw_branch_candidate,
        original_building=baseline,
    )

    assert product is not None
    exact_line = next(
        item for item in commercial.cost_breakdown
        if item.family == "heating"
    )
    assert exact_line.product_id == product.id
    assert "unverified" in str(exact_line.capacity_basis)
    assert any("not source-verified" in item for item in warnings)


def test_air_air_and_ground_source_are_real_technical_branches() -> None:
    baseline = demo_building()

    air_air = apply_supplemental_heating_technology(
        baseline,
        "heat-pump-air-air",
    )
    assert air_air.heating.details is not None
    assert air_air.heating.details.generator_type.value == "heat_pump_air_air"
    assert air_air.heating.details.emitter_type.value == "air"
    assert air_air.heating.details.distribution_type.value == "air"

    ground = apply_supplemental_heating_technology(
        baseline,
        "heat-pump-ground-water",
    )
    assert ground.heating.details is not None
    assert ground.heating.details.generator_type.value == "heat_pump_ground_water"

    request = OptimizationRequestV1(
        baseline=baseline,
        mode=OptimizationMode.auto_economic,
    )
    air_result = run_heating_branch_optimization(
        request,
        branch_id="heat-pump-air-air",
        bounds=OptimizationSearchBoundsV1(),
        catalog=_catalog(),
        max_evaluations=1,
        search_phase="axis",
        phase_candidate_offset=0,
    )
    assert air_result.branch.eligible is True
    assert air_result.branch.economic_eligible is True
    assert air_result.candidates
    heating_line = next(
        line
        for line in air_result.candidates[0].cost_breakdown
        if line.family == "heating"
    )
    assert heating_line.capex_lei > 0
    assert heating_line.source_kind == "product_derived_parametric_curve"


def test_heat_pump_catalog_contains_source_backed_operating_points() -> None:
    options = heating_planning_options()
    by_id = {item.id: item for item in options}

    for product_id in {
        "hp-ariston-8",
        "hp-lg-therma-v-hm071mr-u44",
        "hp-nibe-s2125-8-400v",
        "hp-mitsubishi-ecodan-puz-swm80vaa",
    }:
        product = by_id[product_id]
        assert product.external_id == product.id
        assert product.performance_points
        assert all(point.cop > 1 for point in product.performance_points)
        assert all(point.source_url for point in product.performance_points)

    nibe = by_id["hp-nibe-s2125-8-400v"]
    nibe_conditions = {
        (point.outdoor_temperature_c, point.flow_temperature_c)
        for point in nibe.performance_points
    }
    assert (-7.0, 35.0) in nibe_conditions
    assert (-7.0, 55.0) in nibe_conditions
    assert nibe.seasonal_performance
    assert {item.application_temperature_c for item in nibe.seasonal_performance} >= {
        35.0,
        55.0,
    }


def test_heat_pump_scop_responds_to_existing_emitter_temperature() -> None:
    baseline = demo_building()
    nibe = next(
        item
        for item in heating_planning_options()
        if item.id == "hp-nibe-s2125-8-400v"
    )

    low_payload = model_to_dict(baseline)
    low_payload["heating"]["details"] = {
        **(low_payload["heating"].get("details") or {}),
        "generator_type": "heat_pump_air_water",
        "emitter_type": "underfloor",
        "distribution_type": "underfloor",
        "design_flow_temperature_c": 35,
        "design_return_temperature_c": 30,
    }
    low_payload["heating"]["system_type"] = "heat_pump"
    low_payload["heating"]["carrier"] = "electricity"
    low_payload["heating"]["efficiency"] = None
    low_payload["heating"]["scop"] = None
    low_payload["heating"]["cost_profile"] = "electricity"
    low_temp_house = BuildingInput(**low_payload)

    high_payload = model_to_dict(baseline)
    high_payload["heating"]["details"] = {
        **(high_payload["heating"].get("details") or {}),
        "generator_type": "heat_pump_air_water",
        "emitter_type": "radiators_high_temp",
        "distribution_type": "hydronic_insulated",
        "design_flow_temperature_c": 55,
        "design_return_temperature_c": 45,
    }
    high_payload["heating"]["system_type"] = "heat_pump"
    high_payload["heating"]["carrier"] = "electricity"
    high_payload["heating"]["efficiency"] = None
    high_payload["heating"]["scop"] = None
    high_payload["heating"]["cost_profile"] = "electricity"
    high_temp_house = BuildingInput(**high_payload)

    low_scop, low_notes = _estimated_heat_pump_scop(low_temp_house, nibe)
    high_scop, high_notes = _estimated_heat_pump_scop(high_temp_house, nibe)

    assert low_scop is not None
    assert high_scop is not None
    assert low_scop > high_scop > 1
    assert any("SCOP LaCurent estimat" in item for item in low_notes)
    assert any("SCOP LaCurent estimat" in item for item in high_notes)


def test_heating_catalog_can_be_injected_from_d1_shape() -> None:
    source = {
        "options": [
            {
                "technology_id": "heat-pump-air-water",
                "technology_label": "Pompă de căldură aer-apă",
                "id": "external-hp-7",
                "external_id": "ERP-HP-0007",
                "label": "External HP 7 kW",
                "system_type": "heat_pump",
                "generator_type": "heat_pump_air_water",
                "carrier": "electricity",
                "cost_profile": "electricity",
                "rated_power_kw": 7,
                "equipment_price_lei": 21000,
                "installation_allowance_lei": 9000,
                "source_kind": "client_catalog",
                "source_url": "https://example.invalid/hp-7",
                "confidence": "medium",
                "requires_hydronic": True,
                "capacity_basis": "catalog_nominal_output",
                "note": "Injected D1-shaped fixture.",
            }
        ],
        "heat_pump_performance_points": [
            {
                "product_id": "external-hp-7",
                "outdoor_temperature_c": -7,
                "flow_temperature_c": 35,
                "heating_capacity_kw": 6.5,
                "cop": 3.1,
                "source_kind": "manufacturer_technical_data",
                "source_url": "https://example.invalid/hp-7-tech",
            }
        ],
        "heat_pump_seasonal_performance": [],
    }

    products = heating_planning_options(source)
    technologies = heating_technologies(source)

    assert len(products) == 1
    assert products[0].external_id == "ERP-HP-0007"
    assert products[0].performance_points[0].cop == pytest.approx(3.1)
    assert len(technologies) == 1
    assert technologies[0].products[0].equipment_price_lei == pytest.approx(21000)


def test_keep_current_finalist_never_selects_a_new_generator_product() -> None:
    baseline = demo_building()
    raw = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(window_target_u_w_m2k=0.9),
        _catalog(),
    )
    baseline_bill = float(
        estimate_energy_cost(calculate(baseline, include_reference=False))["priced_total_lei"]
    )
    keep_candidate = _rebase_candidate(
        raw,
        original_baseline_bill_lei=baseline_bill,
        original_building=baseline,
        technology=None,
    )
    assert keep_candidate is not None

    commercial, product, warnings = commercialize_heating_finalist(
        keep_candidate,
        original_building=baseline,
        branch_id="keep-current-heating",
    )

    assert product is None
    assert commercial.candidate_id == keep_candidate.candidate_id
    assert not any(line.family == "heating" for line in commercial.cost_breakdown)
    assert any("nu necesită achiziția" in item for item in warnings)



def test_air_air_catalog_has_commercial_cost_and_monthly_cop_curve() -> None:
    baseline = demo_building()
    technology = next(
        item
        for item in heating_technologies()
        if item.id == "heat-pump-air-air"
    )
    product = next(
        item
        for item in technology.products
        if item.id == "hp-aa-daikin-perfera-35a9"
    )

    assert product.installed_capex_lei == pytest.approx(7845.32)
    assert product.scop == pytest.approx(5.2)
    assert len({point.outdoor_temperature_c for point in product.performance_points}) >= 5

    building = apply_heating_technology(baseline, technology)
    assert building.heating.details is not None
    assert building.heating.details.generator_type.value == "heat_pump_air_air"
    assert building.heating.details.emitter_type.value == "air"
    assert building.heating.details.distribution_type.value == "air"

    result = calculate(building, include_reference=False)
    profile = heat_pump_monthly_performance_profile(
        building,
        product,
        list(result.monthly),
    )
    assert profile is not None
    assert profile["profile_kind"] == "cop_curve"
    assert profile["declared_scop"] == pytest.approx(5.2)
    assert profile["modeled_scop_from_monthly_cop"] > 1
    assert "design_point" in profile
    assert profile["design_point"]["outdoor_temperature_c"] is not None
    if profile["design_point"]["covered"]:
        assert profile["design_point"]["cop"] > 1
        assert profile["design_point"]["heating_capacity_kw"] > 0
    heating_months = [
        row
        for row in profile["monthly"]
        if row["useful_heating_kwh"] > 0
    ]
    assert heating_months
    assert all(row["cop"] is not None and row["cop"] > 1 for row in heating_months)


def test_air_air_single_cop_reference_does_not_replace_declared_scop() -> None:
    baseline = demo_building()
    product = next(
        item
        for item in heating_planning_options()
        if item.id == "hp-aa-daikin-perfera-60a"
    )
    estimated, notes = _estimated_heat_pump_scop(baseline, product)

    assert estimated is None
    assert product.scop == pytest.approx(4.3)
    assert any("doar un COP de referință" in item for item in notes)
