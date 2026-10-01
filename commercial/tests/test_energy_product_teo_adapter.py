from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

from commercial.app.energy_product_teo_adapter import (
    ProductCandidate,
    add_radiator_bom_to_finalist,
    add_underfloor_pipe_bom_to_finalist,
    commercialize_hrv_finalist,
    commercialize_radiator_bom_from_finalist,
    commercialize_underfloor_pipe_bom_from_finalist,
    commercialize_underfloor_system_bom_from_finalist,
    design_underfloor_pipe_requirement,
    candidate_from_source_pack_row,
    match_heating_controls,
    match_hrv_units,
    match_radiators,
    match_underfloor_manifolds,
    match_underfloor_pipe,
    radiator_output_at_design_condition_w,
    wall_products_from_catalog_window,
)
from commercial.app.engine import calculate
from commercial.app.models import BuildingInput
from commercial.app.optimization import (
    ParametricMeasuresV1,
    evaluate_parametric_candidate,
)

ROOT = Path(__file__).resolve().parents[2]
SOURCE_PACK = ROOT / "commercial" / "data" / "energy_product_catalog_source_pack_v2.json"
IMPORTER = ROOT / "scripts" / "build-energy-product-catalog-d1-import.py"


def _load_source_rows():
    spec = importlib.util.spec_from_file_location("energy_catalog_importer", IMPORTER)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.validate(module.load(SOURCE_PACK))["products"]


def test_purmo_radiator_can_be_matched_from_design_output_and_temperatures():
    rows = _load_source_rows()
    purmo = next(row for row in rows if row["product"]["id"] == "purmo-compact-c22-600x1000")
    candidate = candidate_from_source_pack_row(purmo)

    corrected = radiator_output_at_design_condition_w(
        declared_output_w_dt50=1709,
        exponent_n=1.3358,
        flow_temperature_c=55,
        return_temperature_c=45,
        room_temperature_c=20,
    )
    assert corrected < 1709

    match = match_radiators(
        [candidate],
        required_output_w=2500,
        flow_temperature_c=55,
        return_temperature_c=45,
        room_temperature_c=20,
    )
    assert match.quantity >= 2
    assert match.available_output_w >= 2500
    assert match.equipment_subtotal_lei == pytest.approx(509 * match.quantity)


def test_zehnder_is_rejected_until_official_recovery_efficiency_is_parsed():
    rows = _load_source_rows()
    zehnder = next(row for row in rows if row["product"]["id"] == "zehnder-comfoair-q350-hrv")
    candidate = candidate_from_source_pack_row(zehnder)

    with pytest.raises(ValueError, match="heat_recovery_efficiency"):
        match_hrv_units(
            [candidate],
            required_airflow_m3h=280,
            target_heat_recovery_efficiency=0.80,
        )


def test_hrv_match_requires_airflow_efficiency_and_spi():
    candidate = ProductCandidate(
        product_id="complete-hrv",
        category_id="hrv_unit",
        properties={
            "max_airflow_m3h": 350,
            "heat_recovery_efficiency": 0.88,
            "specific_power_input_w_m3h": 0.30,
        },
        unit_price_lei=12000,
    )
    match = match_hrv_units(
        [candidate],
        required_airflow_m3h=300,
        target_heat_recovery_efficiency=0.85,
        max_specific_power_input_w_m3h=0.35,
    )
    assert match.product_id == "complete-hrv"


def test_uponor_pipe_is_bom_matched_after_required_length_is_known():
    rows = _load_source_rows()
    uponor = next(row for row in rows if row["product"]["id"] == "uponor-comfort-pipe-plus-16x2-640")
    candidate = candidate_from_source_pack_row(uponor)

    match = match_underfloor_pipe([candidate], required_pipe_length_m=920)
    assert match.coil_count == 2
    assert match.purchased_length_m == pytest.approx(1280)
    assert match.material_subtotal_lei == pytest.approx(6400)


def _hrv_test_building() -> BuildingInput:
    return BuildingInput(
        project_name="HRV finalist test",
        locality="Cluj-Napoca",
        heated_floor_area_m2=100,
        heated_volume_m3=300,
        building_type="residential_individual",
        envelope=[
            {"name": "Walls", "type": "exterior_wall", "area_m2": 100, "u_value_w_m2k": 0.5},
            {"name": "Roof", "type": "roof", "area_m2": 80, "u_value_w_m2k": 0.3},
            {"name": "Floor", "type": "floor", "area_m2": 80, "u_value_w_m2k": 0.4},
            {"name": "Windows", "type": "window", "area_m2": 20, "u_value_w_m2k": 1.6},
        ],
        ventilation={
            "air_changes_per_hour": 0.5,
            "infiltration_air_changes_per_hour": 0.1,
            "heat_recovery_efficiency": 0.0,
        },
        heating={
            "system_type": "condensing_gas_boiler",
            "efficiency": 0.94,
        },
        cooling={"enabled": False},
        dhw={
            "enabled": True,
            "occupants": 3,
            "efficiency": 0.85,
            "carrier": "natural_gas",
        },
    )


def test_hrv_finalist_recalculates_house_with_product_fan_electricity():
    baseline = _hrv_test_building()
    catalog = {
        "catalog_version": "test",
        "source": "test",
        "costs": {
            "ventilation": {
                "cost_lei": 8000,
                "unit": "lei_total",
                "source_kind": "planning_allowance",
                "confidence": "low",
            }
        },
    }
    raw = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(
            ventilation_heat_recovery_efficiency_target=0.85,
        ),
        catalog,
    )
    assert raw.resulting_configuration is not None
    assert (
        raw.resulting_configuration.ventilation.specific_fan_power_w_per_m3h
        is None
    )

    product = ProductCandidate(
        product_id="hrv-source-backed",
        category_id="hrv_unit",
        properties={
            "max_airflow_m3h": 350,
            "heat_recovery_efficiency": 0.88,
            "specific_power_input_w_m3h": 0.30,
        },
        unit_price_lei=12000,
    )
    commercial, match = commercialize_hrv_finalist(
        raw,
        [product],
        fan_operation_hours_per_year=8760,
        installation_allowance_lei=3000,
    )

    assert match.product_id == "hrv-source-backed"
    assert commercial.resulting_configuration is not None
    assert (
        commercial.resulting_configuration.ventilation.heat_recovery_efficiency
        == pytest.approx(0.88)
    )
    assert (
        commercial.resulting_configuration.ventilation.specific_fan_power_w_per_m3h
        == pytest.approx(0.30)
    )
    assert (
        commercial.resulting_configuration.ventilation.fan_operation_hours_per_year
        == pytest.approx(8760)
    )
    ventilation_line = next(
        line for line in commercial.cost_breakdown
        if line.family == "ventilation"
    )
    assert ventilation_line.product_id == "hrv-source-backed"
    assert ventilation_line.capex_lei == pytest.approx(15000)
    realized = calculate(
        commercial.resulting_configuration,
        include_reference=False,
    )
    assert realized.final_energy_by_service["ventilation"] > 0
    assert commercial.final_energy_kwh == pytest.approx(
        realized.total_final_energy_kwh,
        abs=1e-3,
    )
    assert commercial.cost_source == "hrv_product_discretized_recalculated"


def test_hrv_finalist_does_not_accept_incomplete_marketing_product():
    baseline = _hrv_test_building()
    raw = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(
            ventilation_heat_recovery_efficiency_target=0.80,
        ),
        {
            "costs": {
                "ventilation": {
                    "cost_lei": 8000,
                    "unit": "lei_total",
                }
            }
        },
    )
    incomplete = ProductCandidate(
        product_id="marketing-only",
        category_id="hrv_unit",
        properties={
            "max_airflow_m3h": 350,
            "specific_power_input_w_m3h": 0.30,
        },
        unit_price_lei=10000,
    )
    with pytest.raises(ValueError, match="heat_recovery_efficiency"):
        commercialize_hrv_finalist(
            raw,
            [incomplete],
            fan_operation_hours_per_year=8760,
        )


def test_radiator_bom_reprices_finalist_without_changing_physics():
    baseline = _hrv_test_building()
    raw = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(),
        {"costs": {}},
    )
    product = ProductCandidate(
        product_id="radiator-dt50",
        category_id="radiator",
        properties={
            "heat_output_w_dt50": 1709,
            "radiator_exponent_n": 1.3358,
        },
        unit_price_lei=509,
    )
    commercial, match = add_radiator_bom_to_finalist(
        raw,
        [product],
        required_output_w=2500,
        flow_temperature_c=55,
        return_temperature_c=45,
        room_temperature_c=20,
        installation_allowance_lei_per_unit=120,
    )

    assert match.available_output_w >= 2500
    assert commercial.final_energy_kwh == pytest.approx(raw.final_energy_kwh)
    assert commercial.annual_bill_lei == pytest.approx(raw.annual_bill_lei)
    emitter_line = next(
        line for line in commercial.cost_breakdown
        if line.family == "heating_emitter"
    )
    assert emitter_line.quantity == pytest.approx(match.quantity)
    assert emitter_line.design_available_capacity_kw >= 2.5


def test_underfloor_design_requires_explicit_spacing_and_loop_limit():
    design = design_underfloor_pipe_requirement(
        active_area_m2=92,
        spacing_mm=150,
        max_loop_length_m=100,
        connection_allowance_m=20,
    )
    assert design.required_pipe_length_m == pytest.approx(
        92 / 0.15 + 20,
        abs=0.01,
    )
    assert design.required_loop_count == 7

    with pytest.raises(ValueError):
        design_underfloor_pipe_requirement(
            active_area_m2=92,
            spacing_mm=0,
            max_loop_length_m=100,
        )


def test_underfloor_bom_rounds_explicit_design_to_whole_product_coils():
    baseline = _hrv_test_building()
    raw = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(),
        {"costs": {}},
    )
    product = ProductCandidate(
        product_id="ufh-pipe-640",
        category_id="underfloor_pipe",
        properties={"package_length_m": 640},
        package_price_lei=3200,
    )
    design = design_underfloor_pipe_requirement(
        active_area_m2=92,
        spacing_mm=150,
        max_loop_length_m=100,
        connection_allowance_m=20,
    )
    commercial, match = add_underfloor_pipe_bom_to_finalist(
        raw,
        [product],
        design=design,
        installation_allowance_lei=1000,
    )

    assert match.coil_count == 1
    assert match.purchased_length_m == pytest.approx(640)
    pipe_line = next(
        line for line in commercial.cost_breakdown
        if line.family == "underfloor_pipe"
    )
    assert pipe_line.product_id == "ufh-pipe-640"
    assert pipe_line.capex_lei == pytest.approx(4200)
    assert commercial.final_energy_kwh == pytest.approx(raw.final_energy_kwh)


def test_radiator_finalist_derives_load_and_temperatures_from_canonical_result():
    baseline = _hrv_test_building()
    raw = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(),
        {"costs": {}},
    )
    rows = _load_source_rows()
    purmo = next(
        row
        for row in rows
        if row["product"]["id"] == "purmo-compact-c22-600x1000"
    )
    product = candidate_from_source_pack_row(purmo)

    commercial, match = commercialize_radiator_bom_from_finalist(
        raw,
        [product],
        installation_allowance_lei_per_unit=120,
    )

    assert match.quantity >= 1
    assert match.available_output_w > 0
    assert commercial.final_energy_kwh == pytest.approx(raw.final_energy_kwh)
    line = next(
        item
        for item in commercial.cost_breakdown
        if item.family == "heating_emitter"
    )
    assert line.product_id == "purmo-compact-c22-600x1000"
    assert line.design_available_capacity_kw is not None
    assert any(
        "aggregate whole-building emitter capacity" in assumption
        for assumption in commercial.assumptions
    )


def _underfloor_test_building() -> BuildingInput:
    building = _hrv_test_building()
    data = building.model_dump(mode="json") if hasattr(building, "model_dump") else building.dict()
    data["heating"] = {
        "system_type": "heat_pump",
        "carrier": "electricity",
        "scop": 3.5,
        "cost_profile": "electricity",
    }
    return BuildingInput(**data)


def test_underfloor_finalist_requires_verified_output_to_cover_design_flux():
    baseline = _underfloor_test_building()
    raw = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(),
        {"costs": {}},
    )
    rows = _load_source_rows()
    uponor = next(
        row
        for row in rows
        if row["product"]["id"] == "uponor-comfort-pipe-plus-16x2-640"
    )
    product = candidate_from_source_pack_row(uponor)

    with pytest.raises(ValueError, match="cannot cover the finalist design load"):
        commercialize_underfloor_pipe_bom_from_finalist(
            raw,
            [product],
            active_area_m2=92,
            spacing_mm=150,
            max_loop_length_m=100,
            connection_allowance_m=20,
            verified_available_heat_output_w_m2=1,
            installation_allowance_lei=1000,
        )

    commercial, match, design = (
        commercialize_underfloor_pipe_bom_from_finalist(
            raw,
            [product],
            active_area_m2=92,
            spacing_mm=150,
            max_loop_length_m=100,
            connection_allowance_m=20,
            verified_available_heat_output_w_m2=250,
            installation_allowance_lei=1000,
        )
    )
    assert design.required_heat_output_w is not None
    assert design.required_heat_flux_w_m2 is not None
    assert design.required_heat_flux_w_m2 <= 250
    assert match.purchased_length_m >= design.required_pipe_length_m
    line = next(
        item
        for item in commercial.cost_breakdown
        if item.family == "underfloor_pipe"
    )
    assert line.product_id == "uponor-comfort-pipe-plus-16x2-640"



def test_manifold_and_control_match_whole_commercial_units():
    manifold = ProductCandidate(
        product_id="manifold-6",
        category_id="underfloor_manifold",
        properties={"circuit_count": 6},
        unit_price_lei=1800,
    )
    manifold_match = match_underfloor_manifolds(
        [manifold],
        required_circuit_count=7,
    )
    assert manifold_match.quantity == 2
    assert manifold_match.available_circuit_count == 12
    assert manifold_match.equipment_subtotal_lei == pytest.approx(3600)

    control = ProductCandidate(
        product_id="control-8",
        category_id="heating_control",
        properties={"controlled_zone_count": 8},
        unit_price_lei=450,
    )
    control_match = match_heating_controls(
        [control],
        required_zone_count=9,
    )
    assert control_match.quantity == 2
    assert control_match.available_zone_count == 16
    assert control_match.equipment_subtotal_lei == pytest.approx(900)


def test_complete_underfloor_bom_adds_pipe_manifold_and_explicit_control():
    baseline = _underfloor_test_building()
    raw = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(),
        {"costs": {}},
    )
    rows = _load_source_rows()
    pipe = candidate_from_source_pack_row(
        next(
            row
            for row in rows
            if row["product"]["id"] == "uponor-comfort-pipe-plus-16x2-640"
        )
    )
    manifold = candidate_from_source_pack_row(
        next(
            row
            for row in rows
            if row["product"]["id"] == "uponor-vario-m-fm-6-1085948"
        )
    )
    control = candidate_from_source_pack_row(
        next(
            row
            for row in rows
            if row["product"]["id"] == "salus-kl08nsb-8-zone"
        )
    )

    commercial, pipe_match, manifold_match, control_match, design = (
        commercialize_underfloor_system_bom_from_finalist(
            raw,
            [pipe],
            [manifold],
            active_area_m2=92,
            spacing_mm=150,
            max_loop_length_m=100,
            connection_allowance_m=20,
            verified_available_heat_output_w_m2=250,
            control_products=[control],
            control_zone_count=6,
            pipe_installation_allowance_lei=1000,
            manifold_installation_allowance_lei=300,
            control_installation_allowance_lei=150,
        )
    )

    assert pipe_match.purchased_length_m >= design.required_pipe_length_m
    assert manifold_match.available_circuit_count >= design.required_loop_count
    assert control_match is not None
    assert control_match.available_zone_count >= 6

    lines = {line.family: line for line in commercial.cost_breakdown}
    assert "underfloor_pipe" in lines
    assert "underfloor_manifold" in lines
    assert "heating_control" in lines
    assert lines["underfloor_manifold"].product_id == "uponor-vario-m-fm-6-1085948"
    assert lines["heating_control"].product_id == "salus-kl08nsb-8-zone"
    assert commercial.final_energy_kwh == pytest.approx(raw.final_energy_kwh)


def test_complete_underfloor_bom_does_not_infer_control_zones():
    baseline = _underfloor_test_building()
    raw = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(),
        {"costs": {}},
    )
    rows = _load_source_rows()
    pipe = candidate_from_source_pack_row(
        next(
            row
            for row in rows
            if row["product"]["id"] == "uponor-comfort-pipe-plus-16x2-640"
        )
    )
    manifold = candidate_from_source_pack_row(
        next(
            row
            for row in rows
            if row["product"]["id"] == "uponor-vario-m-fm-6-1085948"
        )
    )

    commercial, _, _, control_match, _ = (
        commercialize_underfloor_system_bom_from_finalist(
            raw,
            [pipe],
            [manifold],
            active_area_m2=92,
            spacing_mm=150,
            max_loop_length_m=100,
            connection_allowance_m=20,
            verified_available_heat_output_w_m2=250,
        )
    )

    assert control_match is None
    assert all(
        line.family != "heating_control"
        for line in commercial.cost_breakdown
    )



def test_universal_catalog_wall_rows_convert_to_exact_commercial_products():
    rows = _load_source_rows()
    wall_rows = []
    for row in rows:
        if row["product"]["category_id"] != "wall_insulation":
            continue
        wall_rows.append(
            {
                **row["product"],
                "id": row["product"]["id"],
                "properties": row["adapted_properties"],
                "offers": row["product"].get("offers") or [],
            }
        )

    products = wall_products_from_catalog_window({"products": wall_rows})

    assert {product.product_id for product in products} >= {
        "austrotherm-eps-a100-af-plus-160",
        "rockwool-frontrock-casa-100",
    }
    rockwool = next(
        product
        for product in products
        if product.product_id == "rockwool-frontrock-casa-100"
    )
    assert rockwool.thickness_mm == pytest.approx(100)
    assert rockwool.lambda_w_mk == pytest.approx(0.034)
    assert rockwool.package_area_m2 == pytest.approx(2.88)
    assert rockwool.price_per_package_lei == pytest.approx(223.06)


def test_universal_wall_products_can_discretize_a_teo_finalist():
    from commercial.app.commercialization import (
        WallCommercializationRequestV1,
        commercialize_wall_candidate,
    )

    baseline = _hrv_test_building()
    raw = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(wall_added_r_m2k_w=2.5),
        {
            "catalog_version": "test",
            "source": "test",
            "costs": {
                "wall": {
                    "cost_lei": 8.0,
                    "unit": "lei_per_m2_per_cm",
                    "source_kind": "test",
                    "confidence": "test",
                }
            },
        },
    )

    rows = _load_source_rows()
    wall_rows = [
        {
            **row["product"],
            "id": row["product"]["id"],
            "properties": row["adapted_properties"],
            "offers": row["product"].get("offers") or [],
        }
        for row in rows
        if row["product"]["category_id"] == "wall_insulation"
    ]
    products = wall_products_from_catalog_window({"products": wall_rows})

    result = commercialize_wall_candidate(
        WallCommercializationRequestV1(
            baseline=baseline,
            raw_candidate=raw,
            products=products,
            nonmaterial_installed_cost_per_m2_lei=45,
        ),
        {
            "catalog_version": "test",
            "source": "test",
            "costs": {
                "wall": {
                    "cost_lei": 8.0,
                    "unit": "lei_per_m2_per_cm",
                    "source_kind": "test",
                    "confidence": "test",
                }
            },
        },
    )

    assert result.discretization.realized_added_r_m2k_w >= 2.5
    assert result.discretization.product.product_id in {
        "austrotherm-eps-a100-af-plus-160",
        "rockwool-frontrock-casa-100",
    }
    assert result.exact_wall_installed_capex_lei > 0
    wall_line = next(
        line
        for line in result.commercial_candidate.cost_breakdown
        if line.family == "wall"
    )
    assert wall_line.material_subtotal_lei is not None
    assert wall_line.nonmaterial_subtotal_lei is not None
