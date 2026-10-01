from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

from commercial.app.energy_product_teo_adapter import (
    ProductCandidate,
    commercialize_hrv_finalist,
    candidate_from_source_pack_row,
    match_hrv_units,
    match_radiators,
    match_underfloor_pipe,
    radiator_output_at_design_condition_w,
)
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
    assert commercial.final_energy_kwh > raw.final_energy_kwh
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
