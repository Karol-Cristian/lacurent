from __future__ import annotations

import math

from commercial.app.engine import (
    _cooling_heat_transfer_utilization_factor,
    _monthly_cooling_need,
    _monthly_utilization_parameter,
    calculate,
    co2_emissions,
    demo_building,
    final_energy_by_carrier,
    heating_final_energy,
    primary_energy,
    transmission_heat_transfer,
    ventilation_heat_transfer,
)
from commercial.app.methodology import climate_data, methodology, resolve_monthly_hsol, resolve_monthly_plane_hsol
from commercial.app.models import BuildingInput, EnergyServiceResult
from commercial.app.reference import build_reference_input


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


def test_monthly_method_uses_mc001_medium_thermal_capacity_default() -> None:
    building = simple_building()
    total_h = transmission_heat_transfer(building)[0] + ventilation_heat_transfer(building)
    a_c = _monthly_utilization_parameter(building, total_h, "cooling")

    expected_tau = ((165000 * 100) / 3600) / total_h
    assert_close(a_c, 1 + expected_tau / 15)
    assert methodology()["monthly_method"]["default_effective_internal_heat_capacity_class"] == "medium"


def test_cooling_loss_utilization_handles_negative_transfer_per_mc001_sign_convention() -> None:
    eta = _cooling_heat_transfer_utilization_factor(gamma_c=-1.6, a_c=3.0)
    assert_close(eta, 1.0)

    # Negative Q_C,ht means heat enters the zone; it therefore increases the cooling need.
    assert_close(_monthly_cooling_need(-500, 800, a_c=3.0), 1300)


def test_cooling_zero_branch_when_heat_losses_dominate_gains() -> None:
    # 1 / gamma_C = Q_C,ht / Q_C,gn = 2.5 > 2 -> Figure 2.19 zero-demand branch.
    assert_close(_monthly_cooling_need(2000, 800, a_c=3.0), 0)


def test_cooling_setpoint_changes_summer_demand_with_explicit_monthly_gains() -> None:
    base = {"solar_gains_kwh_m2_month": 4.0}
    setpoint_26 = calculate(
        simple_building(**base, cooling={"enabled": True, "seer": 3.5, "setpoint_c": 26}),
        include_reference=False,
    )
    setpoint_22 = calculate(
        simple_building(**base, cooling={"enabled": True, "seer": 3.5, "setpoint_c": 22}),
        include_reference=False,
    )

    assert setpoint_26.annual_cooling_demand_kwh > 0
    assert setpoint_22.annual_cooling_demand_kwh > setpoint_26.annual_cooling_demand_kwh

    july_26 = next(row for row in setpoint_26.monthly if row.month == "iul")
    july_22 = next(row for row in setpoint_22.monthly if row.month == "iul")
    assert july_22.useful_cooling_kwh > july_26.useful_cooling_kwh


def test_cooling_seer_changes_final_energy_not_useful_demand() -> None:
    seer_3 = calculate(
        simple_building(
            solar_gains_kwh_m2_month=4.0,
            cooling={"enabled": True, "seer": 3.0, "setpoint_c": 24},
        ),
        include_reference=False,
    )
    seer_6 = calculate(
        simple_building(
            solar_gains_kwh_m2_month=4.0,
            cooling={"enabled": True, "seer": 6.0, "setpoint_c": 24},
        ),
        include_reference=False,
    )

    assert_close(seer_3.annual_cooling_demand_kwh, seer_6.annual_cooling_demand_kwh)
    assert seer_6.cooling.final_kwh < seer_3.cooling.final_kwh
    assert_close(seer_3.cooling.final_kwh / 2, seer_6.cooling.final_kwh, tolerance=1e-3)


def test_methodology_no_longer_uses_synthetic_daily_weather_profile() -> None:
    cfg = methodology()
    assert cfg["version"] == "lacurent-commercial-v2.6"
    assert "representative_diurnal_amplitude_c" not in cfg.get("cooling", {})
    assert "24 h" not in " ".join(cfg["assumptions"])
    assert "Mc 001-2022" in cfg["monthly_method"]["model"]


def test_reference_building_is_calculated_with_same_engine() -> None:
    result = calculate(simple_building())

    assert result.reference is not None
    assert result.reference.reference_specific_primary_kwh_m2 > 0
    assert result.reference.actual_specific_primary_kwh_m2 == result.primary_energy.specific_kwh_m2


def test_demo_building_end_to_end_has_complete_result() -> None:
    result = calculate(demo_building())

    assert result.h_tr_w_k > 0
    assert result.h_ve_w_k > 0
    assert result.annual_heating_demand_kwh > 0
    assert result.annual_cooling_demand_kwh >= 0
    assert result.cooling.final_kwh >= 0
    assert result.dhw.final_kwh > 0
    assert result.total_final_energy_kwh > 0
    assert result.primary_energy.specific_kwh_m2 > 0
    assert result.co2.specific_kg_m2 > 0
    assert result.reference is not None
    assert result.energy_class in {"A+", "A", "B", "C", "D", "E", "F", "G"}
    assert len(result.monthly) == 12

def test_normative_hsol_uses_annex_a9_6_and_orientation() -> None:
    south = calculate(
        simple_building(
            locality="Cluj-Napoca",
            solar_gains_kwh_m2_month=0,
            solar={
                "mode": "normative_hsol",
                "orientation": "south",
                "glazing_type_id": "double_low_e_face_3",
                "frame_fraction": 0.20,
                "obstacle_shading_factor": 1.0,
            },
        ),
        include_reference=False,
    )
    north = calculate(
        simple_building(
            locality="Cluj-Napoca",
            solar_gains_kwh_m2_month=0,
            solar={
                "mode": "normative_hsol",
                "orientation": "north",
                "glazing_type_id": "double_low_e_face_3",
                "frame_fraction": 0.20,
                "obstacle_shading_factor": 1.0,
            },
        ),
        include_reference=False,
    )

    january_south = next(row for row in south.monthly if row.month == "ian")
    january_north = next(row for row in north.monthly if row.month == "ian")

    assert january_south.solar_hsol_kwh_m2 is not None
    assert january_south.solar_gains_source == "MC001_2_39_2_40_2_54_with_source_backed_A9_6_oriented_Hsol"
    assert january_south.solar_hsol_kwh_m2 > january_north.solar_hsol_kwh_m2
    assert january_south.solar_gains_kwh > january_north.solar_gains_kwh


def test_every_mc001_climate_station_has_source_backed_hsol_coverage() -> None:
    resolutions = []
    distances = []
    for station in climate_data()["localities"]:
        resolved = resolve_monthly_hsol({"station_id": station["id"]}, "south")
        assert resolved is not None, station["id"]
        assert len(resolved["values_kwh_m2_month"]) == 12
        resolutions.append(resolved["station_resolution"])
        distances.append(float(resolved["station_distance_km"] or 0))

    assert len(resolutions) == 42
    assert "direct" in resolutions
    assert "nearest_source_station" in resolutions
    assert max(distances) <= 74.5


def test_alba_iulia_uses_nearest_normative_solar_source_not_zero_fallback() -> None:
    result = calculate(
        simple_building(
            locality="Alba Iulia",
            solar_gains_kwh_m2_month=1.5,
            solar={"mode": "normative_hsol", "orientation": "south"},
        ),
        include_reference=False,
    )

    july = next(row for row in result.monthly if row.month == "iul")
    assert july.solar_hsol_kwh_m2 is not None
    assert july.solar_station_name == "Sibiu"
    assert july.solar_station_resolution == "nearest_source_station"
    assert july.solar_station_distance_km == 54.3
    assert july.solar_gains_source.startswith("MC001_2_39_2_40_2_54_with_source_backed_A9_6")


def test_oriented_glazing_combines_multiple_annex_a9_6_orientations() -> None:
    all_south = calculate(
        simple_building(
            solar={
                "mode": "normative_hsol",
                "orientation": "south",
                "glazing_type_id": "double_low_e_face_3",
            },
        ),
        include_reference=False,
    )
    split = calculate(
        simple_building(
            solar={
                "mode": "normative_hsol",
                "orientation": "south",
                "glazing_type_id": "double_low_e_face_3",
                "glazing_groups": [
                    {"orientation": "south", "area_m2": 10},
                    {"orientation": "north", "area_m2": 10},
                ],
            },
        ),
        include_reference=False,
    )

    jan_all_south = next(row for row in all_south.monthly if row.month == "ian")
    jan_split = next(row for row in split.monthly if row.month == "ian")
    assert jan_split.solar_gains_kwh < jan_all_south.solar_gains_kwh
    assert set(jan_split.solar_hsol_by_orientation_kwh_m2) == {"south", "north"}
    assert jan_split.solar_hsol_by_orientation_kwh_m2["south"] > jan_split.solar_hsol_by_orientation_kwh_m2["north"]


def test_mc001_table_2_16_shading_reduces_transparent_solar_gains() -> None:
    unshaded = calculate(
        simple_building(
            solar={
                "mode": "normative_hsol",
                "orientation": "south",
                "glazing_type_id": "double_low_e_face_3",
            },
        ),
        include_reference=False,
    )
    shaded = calculate(
        simple_building(
            solar={
                "mode": "normative_hsol",
                "orientation": "south",
                "glazing_type_id": "double_low_e_face_3",
                "shading_device_id": "white_venetian_blinds_abs_0_1_trans_0_05",
                "shading_mounting_side": "exterior",
            },
        ),
        include_reference=False,
    )

    july_unshaded = next(row for row in unshaded.monthly if row.month == "iul")
    july_shaded = next(row for row in shaded.monthly if row.month == "iul")
    assert july_shaded.solar_gains_kwh < july_unshaded.solar_gains_kwh
    assert "TABLE_2_16_shading" in july_shaded.solar_gains_source


def test_oriented_glazing_area_must_match_envelope_window_area() -> None:
    building = simple_building(
        solar={
            "mode": "normative_hsol",
            "glazing_groups": [{"orientation": "south", "area_m2": 8}],
        }
    )
    try:
        calculate(building, include_reference=False)
    except ValueError as exc:
        assert "suprafețelor vitrate pe orientări" in str(exc)
    else:
        raise AssertionError("Expected inconsistent oriented glazing area to be rejected")


def test_explicit_solar_mode_preserves_legacy_equivalent_monthly_gain() -> None:
    result = calculate(
        simple_building(
            solar_gains_kwh_m2_month=1.2,
            solar={"mode": "explicit"},
        ),
        include_reference=False,
    )

    assert all(row.solar_gains_source == "explicit_equivalent_monthly_gain" for row in result.monthly)
    assert all(row.solar_hsol_kwh_m2 is None for row in result.monthly)
    assert all(math.isclose(row.solar_gains_kwh, 120.0, rel_tol=1e-9) for row in result.monthly)

def test_tilted_solar_plane_uses_source_horizontal_and_vertical_endpoints() -> None:
    station = next(item for item in climate_data()["localities"] if item["name"] == "Cluj-Napoca")
    climate = {"station_id": station["id"]}

    horizontal = resolve_monthly_plane_hsol(climate, "south", 0)
    vertical = resolve_monthly_plane_hsol(climate, "south", 90)

    assert horizontal is not None
    assert vertical is not None
    assert horizontal["values_kwh_m2_month"] == horizontal["horizontal_values_kwh_m2_month"]
    assert vertical["values_kwh_m2_month"] == vertical["vertical_values_kwh_m2_month"]
    assert horizontal["plane_model"] == "linear_horizontal_to_vertical_source_interpolation"


def test_photovoltaic_generation_uses_zone_orientation_and_reduces_grid_electricity() -> None:
    common = {
        "heating": {"system_type": "heat_pump", "scop": 3.2, "carrier": "electricity"},
        "renewables": {
            "pv": {
                "enabled": True,
                "installed_power_kwp": 5.0,
                "tilt_degrees": 30,
                "performance_ratio": 0.82,
                "orientation": "south",
            }
        },
    }
    south = calculate(simple_building(**common), include_reference=False)
    north_payload = dict(common)
    north_payload["renewables"] = {
        "pv": {
            **common["renewables"]["pv"],
            "orientation": "north",
        }
    }
    north = calculate(simple_building(**north_payload), include_reference=False)

    assert south.renewables.pv.annual_generation_kwh > 0
    assert south.renewables.pv.annual_generation_kwh > north.renewables.pv.annual_generation_kwh
    assert 0 < south.renewables.pv.self_consumed_kwh <= south.renewables.pv.annual_generation_kwh
    assert south.renewables.pv.exported_kwh >= 0
    assert south.final_energy_by_carrier["electricity"] < south.gross_final_energy_by_carrier["electricity"]
    assert len(south.renewables.monthly) == 12


def test_photovoltaic_resource_changes_with_climate_station() -> None:
    renewables = {
        "pv": {
            "enabled": True,
            "installed_power_kwp": 5.0,
            "orientation": "south",
            "tilt_degrees": 30,
        }
    }
    cluj = calculate(
        simple_building(
            locality="Cluj-Napoca",
            heating={"system_type": "heat_pump", "scop": 3.2, "carrier": "electricity"},
            renewables=renewables,
        ),
        include_reference=False,
    )
    constanta = calculate(
        simple_building(
            locality="Constanța",
            heating={"system_type": "heat_pump", "scop": 3.2, "carrier": "electricity"},
            renewables=renewables,
        ),
        include_reference=False,
    )

    assert cluj.renewables.pv.annual_generation_kwh != constanta.renewables.pv.annual_generation_kwh


def test_solar_thermal_uses_monthly_resource_and_offsets_dhw_useful_energy() -> None:
    baseline = calculate(simple_building(), include_reference=False)
    solar = calculate(
        simple_building(
            renewables={
                "solar_thermal": {
                    "enabled": True,
                    "collector_area_m2": 4.0,
                    "orientation": "south",
                    "tilt_degrees": 45,
                    "system_efficiency": 0.45,
                }
            }
        ),
        include_reference=False,
    )

    assert solar.renewables.solar_thermal.annual_available_kwh > 0
    assert solar.renewables.solar_thermal.used_for_dhw_kwh > 0
    assert 0 < solar.renewables.solar_thermal.dhw_solar_fraction_percent <= 100
    assert solar.dhw.useful_kwh < baseline.dhw.useful_kwh
    assert solar.dhw.final_kwh < baseline.dhw.final_kwh


def test_reference_building_does_not_implicitly_copy_actual_renewables() -> None:
    actual = simple_building(
        renewables={
            "pv": {
                "enabled": True,
                "installed_power_kwp": 6.0,
                "orientation": "south",
                "tilt_degrees": 30,
            },
            "solar_thermal": {
                "enabled": True,
                "collector_area_m2": 4.0,
                "orientation": "south",
                "tilt_degrees": 45,
            },
        }
    )

    reference = build_reference_input(actual)

    assert reference.renewables.pv.enabled is False
    assert reference.renewables.solar_thermal.enabled is False

