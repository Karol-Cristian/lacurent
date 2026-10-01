from __future__ import annotations

import pytest

from commercial.app.engine import (
    calculate,
    ventilation_system_performance,
)
from commercial.app.models import BuildingInput


def building_with_ventilation(ventilation: dict) -> BuildingInput:
    return BuildingInput(
        project_name="Ventilation product integration",
        locality="Cluj-Napoca",
        heated_floor_area_m2=100,
        heated_volume_m3=300,
        indoor_design_temperature_c=20,
        building_type="residential_individual",
        envelope=[
            {"name": "Walls", "type": "exterior_wall", "area_m2": 100, "u_value_w_m2k": 0.4},
            {"name": "Roof", "type": "roof", "area_m2": 80, "u_value_w_m2k": 0.2},
            {"name": "Floor", "type": "floor", "area_m2": 80, "u_value_w_m2k": 0.3},
            {"name": "Windows", "type": "window", "area_m2": 20, "u_value_w_m2k": 1.4},
        ],
        ventilation=ventilation,
        heating={
            "system_type": "condensing_gas_boiler",
            "efficiency": 0.95,
        },
        cooling={"enabled": False},
        dhw={
            "enabled": True,
            "occupants": 3,
            "efficiency": 0.85,
            "carrier": "natural_gas",
        },
    )


def test_ventilation_fan_input_requires_power_and_hours_together():
    with pytest.raises(Exception, match="specific power and annual operation hours"):
        building_with_ventilation(
            {
                "air_changes_per_hour": 0.5,
                "heat_recovery_efficiency": 0.85,
                "specific_fan_power_w_per_m3h": 0.30,
            }
        )


def test_explicit_fan_electricity_uses_modeled_controlled_airflow():
    building = building_with_ventilation(
        {
            "air_changes_per_hour": 0.5,
            "heat_recovery_efficiency": 0.85,
            "specific_fan_power_w_per_m3h": 0.30,
            "fan_operation_hours_per_year": 8760,
        }
    )

    performance = ventilation_system_performance(building)

    assert performance.controlled_airflow_m3h == pytest.approx(150)
    assert performance.auxiliary_electricity_kwh == pytest.approx(
        0.30 * 150 * 8760 / 1000,
        abs=1e-3,
    )
    assert performance.status == "calculated_explicit_fan_data"


def test_fan_electricity_is_separate_regulated_service_and_electric_carrier():
    without_fans = building_with_ventilation(
        {
            "air_changes_per_hour": 0.5,
            "heat_recovery_efficiency": 0.85,
        }
    )
    with_fans = building_with_ventilation(
        {
            "air_changes_per_hour": 0.5,
            "heat_recovery_efficiency": 0.85,
            "specific_fan_power_w_per_m3h": 0.30,
            "fan_operation_hours_per_year": 8760,
        }
    )

    base = calculate(without_fans, include_reference=False)
    result = calculate(with_fans, include_reference=False)
    expected_fan_kwh = 0.30 * 150 * 8760 / 1000

    assert base.final_energy_by_service["ventilation"] == 0
    assert result.final_energy_by_service["ventilation"] == pytest.approx(
        expected_fan_kwh,
        abs=1e-3,
    )
    assert (
        result.gross_final_energy_by_carrier["electricity"]
        - base.gross_final_energy_by_carrier.get("electricity", 0)
    ) == pytest.approx(expected_fan_kwh, abs=1e-3)
    assert result.total_final_energy_kwh > base.total_final_energy_kwh
    assert result.primary_energy.total_kwh > base.primary_energy.total_kwh
    assert result.co2.total_kg > base.co2.total_kg


def test_no_fan_data_preserves_legacy_energy_totals():
    building = building_with_ventilation(
        {
            "air_changes_per_hour": 0.5,
            "heat_recovery_efficiency": 0.85,
        }
    )

    result = calculate(building, include_reference=False)

    assert result.ventilation_system.auxiliary_electricity_kwh == 0
    assert result.ventilation_system.status == "not_applicable_no_fan_data"
    assert result.final_energy_by_service["ventilation"] == 0
