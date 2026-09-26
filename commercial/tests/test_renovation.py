from __future__ import annotations

import math

from fastapi.testclient import TestClient

from commercial.app import renovation as renovation_module
from commercial.app.engine import calculate, demo_building
from commercial.app.main import app
from commercial.app.models import BuildingInput, model_to_dict
from commercial.app.renovation import build_wall_insulation_scenario


client = TestClient(app)


def test_wall_scenario_skips_unused_reference_recalculations(monkeypatch) -> None:
    real_calculate = renovation_module.calculate
    include_reference_flags: list[bool] = []

    def recorded_calculate(*args, **kwargs):
        include_reference_flags.append(kwargs.get("include_reference", True))
        return real_calculate(*args, **kwargs)

    monkeypatch.setattr(renovation_module, "calculate", recorded_calculate)

    renovation_module.build_wall_insulation_scenario(
        demo_building(),
        added_insulation_thickness_mm=100,
        insulation_lambda_w_mk=0.040,
    )

    assert include_reference_flags == [False, False]


def test_engine_exposes_commercial_envelope_geometry_and_u_values() -> None:
    result = calculate(demo_building())

    assert result.envelope_geometry.net_wall_area_m2 == 168.0
    assert result.envelope_geometry.window_area_m2 == 24.0
    assert result.envelope_geometry.exterior_door_area_m2 == 3.2
    assert result.envelope_geometry.gross_wall_area_m2 == 195.2
    assert result.envelope_geometry.roof_area_m2 == 92.0
    assert result.envelope_geometry.floor_area_m2 == 80.0

    assert result.envelope_u_values.wall_u_value_w_m2k == 0.42
    assert result.envelope_u_values.window_u_value_w_m2k == 1.35


def test_wall_insulation_measure_recalculates_full_house_and_builds_requirement() -> None:
    baseline = demo_building()
    original = model_to_dict(baseline)

    bundle = build_wall_insulation_scenario(
        baseline,
        added_insulation_thickness_mm=100,
        insulation_lambda_w_mk=0.040,
    )

    assert model_to_dict(baseline) == original
    assert bundle.schema_version == "1.0"
    assert bundle.measure.type == "wall_insulation"
    assert bundle.measure.target == "external_wall"
    assert bundle.measure.material_source == "generic"
    assert bundle.measure.added_thermal_resistance_m2k_w == 2.5

    expected_u = 1.0 / ((1.0 / 0.42) + 2.5)
    assert math.isclose(bundle.measure.proposed_wall_u_value_w_m2k, expected_u, abs_tol=0.0001)

    assert bundle.scenario.calculation.final_energy_kwh < bundle.house_state.calculation.final_energy_kwh
    assert bundle.scenario.calculation.heat_loss_w_k < bundle.house_state.calculation.heat_loss_w_k
    assert bundle.scenario.calculation.wall_heat_transfer_w_k < bundle.house_state.calculation.wall_heat_transfer_w_k
    assert bundle.scenario.delta_vs_baseline.final_energy.delta < 0
    assert bundle.scenario.delta_vs_baseline.wall_u_value.delta < 0
    assert bundle.scenario.delta_vs_baseline.wall_heat_transfer.delta < 0

    if bundle.scenario.delta_vs_baseline.annual_cost is not None:
        assert bundle.scenario.delta_vs_baseline.annual_cost.delta < 0
    if bundle.scenario.delta_vs_baseline.design_heat_load is not None:
        assert bundle.scenario.delta_vs_baseline.design_heat_load.delta < 0

    requirement = bundle.technical_requirement
    assert requirement.category == "facade_insulation"
    assert requirement.affected_area_m2 == 168.0
    assert requirement.target_added_thermal_resistance_m2k_w == 2.5
    assert requirement.nominal_added_thickness_mm == 100.0
    assert requirement.maximum_lambda_w_mk == 0.04
    assert requirement.purchase_area_m2 is None
    assert requirement.quantity_basis == "net_opaque_external_wall_area_no_waste"


def test_wall_insulation_scenario_ids_are_deterministic() -> None:
    first = build_wall_insulation_scenario(
        demo_building(),
        added_insulation_thickness_mm=100,
        insulation_lambda_w_mk=0.040,
    )
    second = build_wall_insulation_scenario(
        demo_building(),
        added_insulation_thickness_mm=100,
        insulation_lambda_w_mk=0.040,
    )

    assert first.house_state.house_id == second.house_state.house_id
    assert first.measure.measure_id == second.measure.measure_id
    assert first.scenario.scenario_id == second.scenario.scenario_id
    assert first.technical_requirement.requirement_id == second.technical_requirement.requirement_id


def test_wall_insulation_scenario_rejects_house_without_exterior_walls() -> None:
    payload = model_to_dict(demo_building())
    payload["envelope"] = [
        component
        for component in payload["envelope"]
        if component["type"] != "exterior_wall"
    ]
    building = BuildingInput(**payload)

    try:
        build_wall_insulation_scenario(
            building,
            added_insulation_thickness_mm=100,
            insulation_lambda_w_mk=0.040,
        )
    except ValueError as exc:
        assert "exterior-wall" in str(exc)
    else:
        raise AssertionError("Expected a wall-insulation scenario without exterior walls to fail.")


def test_wall_insulation_scenario_api_returns_versioned_contract() -> None:
    response = client.post(
        "/api/scenarios/wall-insulation",
        json={
            "baseline": model_to_dict(demo_building()),
            "added_insulation_thickness_mm": 100,
            "insulation_lambda_w_mk": 0.040,
        },
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["schema_version"] == "1.0"
    assert payload["house_state"]["house_id"].startswith("HS-")
    assert payload["measure"]["measure_id"].startswith("M-WALL-")
    assert payload["scenario"]["scenario_id"].startswith("SC-")
    assert payload["technical_requirement"]["requirement_id"].startswith("REQ-WALL-")
    assert payload["technical_requirement"]["affected_area_m2"] == 168.0
    assert payload["scenario"]["delta_vs_baseline"]["final_energy"]["delta"] < 0


def test_wall_insulation_scenario_api_validates_material_inputs() -> None:
    response = client.post(
        "/api/scenarios/wall-insulation",
        json={
            "baseline": model_to_dict(demo_building()),
            "added_insulation_thickness_mm": 0,
            "insulation_lambda_w_mk": 0.040,
        },
    )
    assert response.status_code == 422
