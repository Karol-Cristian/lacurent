from __future__ import annotations

import math

from commercial.app.engine import (
    calculate,
    co2_emissions,
    demo_building,
    final_energy_by_carrier,
    heating_final_energy,
    primary_energy,
    transmission_heat_transfer,
    ventilation_heat_transfer,
)
from commercial.app.models import BuildingInput, EnergyServiceResult


def simple_building(**overrides) -> BuildingInput:
    data = {
        "project_name": "Test house",
        "locality": "Cluj-Napoca",
        "heated_floor_area_m2": 100,
        "heated_volume_m3": 300,
        "indoor_design_temperature_c": 20,
        "building_type": "residential_individual",
        "envelope": [
            {"name": "Walls", "type": "exterior_wall", "area_m2": 100, "u_value_w_m2k": 0.4},
            {"name": "Roof", "type": "roof", "area_m2": 80, "u_value_w_m2k": 0.2},
            {"name": "Floor", "type": "floor", "area_m2": 80, "u_value_w_m2k": 0.3},
            {"name": "Windows", "type": "window", "area_m2": 20, "u_value_w_m2k": 1.4},
            {"name": "Door", "type": "exterior_door", "area_m2": 2, "u_value_w_m2k": 1.5},
        ],
        "thermal_bridges": [
            {"name": "Linear bridges", "length_m": 40, "psi_w_mk": 0.05},
        ],
        "ventilation": {"air_changes_per_hour": 0.5, "heat_recovery_efficiency": 0.2},
        "heating": {"system_type": "condensing_gas_boiler", "efficiency": 0.95},
        "cooling": {"enabled": True, "seer": 3.5, "setpoint_c": 26},
        "dhw": {"enabled": True, "occupants": 3, "efficiency": 0.85, "carrier": "natural_gas"},
    }
    data.update(overrides)
    return BuildingInput(**data)


def assert_close(actual: float, expected: float, tolerance: float = 1e-6) -> None:
    assert math.isclose(actual, expected, rel_tol=tolerance, abs_tol=tolerance)


def test_transmission_coefficient_uses_area_u_and_thermal_bridges() -> None:
    building = simple_building()

    h_tr, envelope, bridges = transmission_heat_transfer(building)

    assert_close(h_tr, 113)
    assert envelope[0].value == 40
    assert bridges[0].value == 2


def test_ventilation_coefficient_uses_air_change_volume_and_recovery() -> None:
    building = simple_building()

    assert_close(ventilation_heat_transfer(building), 40.8)


def test_heating_final_energy_uses_efficiency() -> None:
    building = simple_building(
        heating={"system_type": "gas_boiler", "efficiency": 0.9, "carrier": "natural_gas"}
    )

    result = heating_final_energy(building, 9000)

    assert_close(result.final_kwh, 10000)
    assert result.carrier.value == "natural_gas"


def test_heat_pump_final_energy_uses_scop() -> None:
    building = simple_building(
        heating={"system_type": "heat_pump", "scop": 3.0, "carrier": "electricity"}
    )

    result = heating_final_energy(building, 9000)

    assert_close(result.final_kwh, 3000)
    assert result.carrier.value == "electricity"


def test_primary_energy_aggregation_uses_methodology_factors() -> None:
    indicator = primary_energy({"natural_gas": 1000, "electricity": 100}, 100)

    assert_close(indicator.total_kwh, 1420)
    assert_close(indicator.specific_kwh_m2, 14.2)


def test_co2_aggregation_uses_methodology_factors() -> None:
    co2 = co2_emissions({"natural_gas": 1000, "electricity": 100}, 100)

    assert_close(co2.total_kg, 212.7)
    assert_close(co2.specific_kg_m2, 2.13)


def test_final_energy_by_carrier_keeps_carriers_separate() -> None:
    gas = EnergyServiceResult(useful_kwh=900, final_kwh=1000, carrier="natural_gas")
    electricity = EnergyServiceResult(useful_kwh=300, final_kwh=100, carrier="electricity")

    assert final_energy_by_carrier(gas, electricity) == {
        "natural_gas": 1000,
        "electricity": 100,
    }


def test_reference_building_is_calculated_with_same_engine() -> None:
    result = calculate(simple_building())

    assert result.reference is not None
    assert result.reference.reference_specific_primary_kwh_m2 > 0
    assert result.reference.actual_specific_primary_kwh_m2 == result.primary_energy.specific_kwh_m2


def test_demo_building_end_to_end_has_complete_non_zero_result() -> None:
    result = calculate(demo_building())

    assert result.h_tr_w_k > 0
    assert result.h_ve_w_k > 0
    assert result.annual_heating_demand_kwh > 0
    assert result.dhw.final_kwh > 0
    assert result.total_final_energy_kwh > 0
    assert result.primary_energy.specific_kwh_m2 > 0
    assert result.co2.specific_kg_m2 > 0
    assert result.reference is not None
    assert result.energy_class in {"A+", "A", "B", "C", "D", "E", "F", "G"}
    assert len(result.monthly) == 12
