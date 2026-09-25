from __future__ import annotations

import pytest

from commercial.app.engine import calculate, demo_building
from commercial.app.heating_optimization import (
    _rebase_candidate,
    apply_heating_technology,
    heating_branch_plan,
    heating_planning_options,
    heating_technologies,
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
            "pv": {"cost_lei": 4000, "unit": "lei_per_kwp"},
            "solar_thermal": {"cost_lei": 2650, "unit": "lei_per_m2"},
        },
    }


def test_heating_catalog_groups_products_into_technology_branches() -> None:
    options = heating_planning_options()
    technologies = heating_technologies()

    assert len(options) > len(technologies)
    ids = {item.id for item in technologies}
    assert {
        "condensing-gas",
        "heat-pump-air-water",
        "electric-boiler",
        "pellet-boiler",
    } <= ids

    hp = next(item for item in technologies if item.id == "heat-pump-air-water")
    assert [item.rated_power_kw for item in hp.products] == [5, 8, 12, 15]

    electric = next(item for item in technologies if item.id == "electric-boiler")
    assert [item.rated_power_kw for item in electric.products] == [6, 9, 12, 18]

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

    assert base_line.parameter_value + 1e-9 >= sized_base.design_heat_load_kw
    assert improved_line.parameter_value + 1e-9 >= sized_improved.design_heat_load_kw
    assert improved_line.parameter_value <= base_line.parameter_value
    assert "necesar recalculat" in str(improved_line.note)
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
    assert result.branch.sizing_mode == "design_load_recalculated_per_candidate"
    assert result.branch.evaluated_candidates == 12
    assert result.selection.selected is not None

    heating_line = next(
        line
        for line in result.selection.selected.cost_breakdown
        if line.family == "heating"
    )
    assert heating_line.parameter_value >= result.selection.selected.design_heat_load_kw
    assert "sized_equipment" in str(heating_line.catalog_unit)


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


def test_selected_heating_cost_line_exposes_exact_product_name() -> None:
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
    sized = _rebase_candidate(
        raw,
        original_baseline_bill_lei=baseline_bill,
        original_building=baseline,
        technology=hp,
    )
    assert sized is not None
    line = next(item for item in sized.cost_breakdown if item.family == "heating")
    product = next(item for item in heating_planning_options() if item.id == line.product_id)
    assert str(line.note).startswith(product.label + ":")
