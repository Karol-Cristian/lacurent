from __future__ import annotations

import math

import pytest

from commercial.app.engine import (
    _cooling_heat_transfer_utilization_factor,
    _monthly_cooling_need,
    _monthly_utilization_parameter,
    calculate,
    co2_emissions,
    demo_building,
    final_energy_by_carrier,
    heating_final_energy,
    heating_system_performance,
    primary_energy,
    slab_on_ground_effective_u,
    transmission_heat_transfer,
    transmission_heat_transfer_components,
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


def test_transmission_separates_hd_hg_hu_and_ha() -> None:
    building = simple_building(
        envelope=[
            {"name": "Walls", "type": "exterior_wall", "area_m2": 100, "u_value_w_m2k": 0.4},
            {
                "name": "Attic ceiling",
                "type": "roof",
                "area_m2": 80,
                "u_value_w_m2k": 0.2,
                "boundary_type": "unheated_attic",
                "boundary_correction_factor": 0.75,
            },
            {
                "name": "Ground floor",
                "type": "floor",
                "area_m2": 80,
                "u_value_w_m2k": 0.3,
                "boundary_type": "ground",
                "boundary_correction_factor": 0.6,
            },
            {"name": "Windows", "type": "window", "area_m2": 20, "u_value_w_m2k": 1.4},
            {"name": "Door", "type": "exterior_door", "area_m2": 2, "u_value_w_m2k": 1.5},
        ],
    )

    components, envelope, bridges = transmission_heat_transfer_components(building)

    assert_close(components.hd_w_k, 73.0)
    assert_close(components.hg_w_k, 14.4)
    assert_close(components.hu_w_k, 12.0)
    assert_close(components.ha_w_k, 0.0)
    assert_close(components.htr_w_k, 99.4)
    attic = next(item for item in envelope if item.name == "Attic ceiling")
    ground = next(item for item in envelope if item.name == "Ground floor")
    assert attic.component.value == "Hu"
    assert attic.boundary_type.value == "unheated_attic"
    assert attic.boundary_correction_factor == 0.75
    assert ground.component.value == "Hg"
    assert ground.boundary_type.value == "ground"
    assert ground.boundary_correction_factor == 0.6
    assert bridges[0].component.value == "Hd"


def test_unheated_attic_can_derive_bztu_from_explicit_zone_heat_balance() -> None:
    building = simple_building(
        envelope=[
            {
                "name": "Ceiling to explicit attic zone",
                "type": "roof",
                "area_m2": 80,
                "u_value_w_m2k": 0.5,
                "boundary_type": "unheated_attic",
                "unheated_zone": {
                    "heat_transfer_to_exterior_envelope_w_k": 30,
                    "exterior_ventilation_coefficient": 0.5,
                    "conditioned_zone_heat_transfers_w_k": [20],
                },
            }
        ],
        thermal_bridges=[],
    )

    components, rows, _ = transmission_heat_transfer_components(building)
    row = rows[0]
    hztu_exterior = 45.0
    hztu_total = 65.0
    bztu = hztu_exterior / hztu_total

    assert components.hd_w_k == 0
    assert components.hu_w_k == pytest.approx(80 * 0.5 * bztu, abs=1e-3)
    assert row.boundary_correction_factor == pytest.approx(bztu, abs=1e-3)
    assert row.hztu_exterior_w_k == pytest.approx(hztu_exterior)
    assert row.hztu_total_w_k == pytest.approx(hztu_total)
    assert row.calculation_method == "mc001_explicit_unheated_zone_balance"


def test_unheated_boundary_rejects_ambiguous_factor_and_zone_balance() -> None:
    with pytest.raises(Exception):
        simple_building(
            envelope=[
                {
                    "name": "Ambiguous attic",
                    "type": "roof",
                    "area_m2": 80,
                    "u_value_w_m2k": 0.5,
                    "boundary_type": "unheated_attic",
                    "boundary_correction_factor": 0.75,
                    "unheated_zone": {
                        "heat_transfer_to_exterior_envelope_w_k": 30,
                        "exterior_ventilation_coefficient": 0.5,
                        "conditioned_zone_heat_transfers_w_k": [20],
                    },
                }
            ]
        )


def test_iso13370_slab_on_ground_u_uses_floor_geometry() -> None:
    effective_u = slab_on_ground_effective_u(
        construction_u_value_w_m2k=0.36,
        area_m2=80,
        exposed_perimeter_m=36,
        wall_thickness_m=0.30,
        ground_conductivity_w_mk=2.0,
    )

    assert effective_u == pytest.approx(0.2535925613, abs=1e-9)
    assert effective_u < 0.36


def test_iso13370_ground_is_not_treated_like_outside_air() -> None:
    ground = simple_building(
        envelope=[
            {
                "name": "Ground floor",
                "type": "floor",
                "area_m2": 80,
                "u_value_w_m2k": 0.36,
                "boundary_type": "ground",
                "ground_contact": {
                    "exposed_perimeter_m": 36,
                    "wall_thickness_m": 0.30,
                    "ground_conductivity_w_mk": 2.0,
                },
            }
        ],
        thermal_bridges=[],
    )
    outside = simple_building(
        envelope=[
            {
                "name": "Exposed floor",
                "type": "floor",
                "area_m2": 80,
                "u_value_w_m2k": 0.36,
                "boundary_type": "outside_air",
            }
        ],
        thermal_bridges=[],
    )

    ground_components, ground_rows, _ = transmission_heat_transfer_components(ground)
    outside_components, _, _ = transmission_heat_transfer_components(outside)
    row = ground_rows[0]

    assert ground_components.hg_w_k > 0
    assert ground_components.hd_w_k == 0
    assert outside_components.hd_w_k == pytest.approx(28.8)
    assert ground_components.hg_w_k < outside_components.hd_w_k
    assert row.calculation_method == "iso13370_slab_on_ground_steady_state"
    assert row.effective_u_value_w_m2k == pytest.approx(
        slab_on_ground_effective_u(0.36, 80, 36, 0.30, 2.0),
        abs=1e-4,
    )
    assert row.effective_u_value_w_m2k < row.u_value_w_m2k


def test_cold_attic_uses_hu_while_heated_attic_roof_uses_hd() -> None:
    cold_attic = simple_building(
        envelope=[
            {
                "name": "Ceiling to cold attic",
                "type": "roof",
                "area_m2": 80,
                "u_value_w_m2k": 0.5,
                "boundary_type": "unheated_attic",
                "boundary_correction_factor": 0.75,
            }
        ],
        thermal_bridges=[],
    )
    heated_attic_roof = simple_building(
        envelope=[
            {
                "name": "Roof over heated attic",
                "type": "roof",
                "area_m2": 80,
                "u_value_w_m2k": 0.5,
                "boundary_type": "outside_air",
            }
        ],
        thermal_bridges=[],
    )

    cold_components, cold_rows, _ = transmission_heat_transfer_components(cold_attic)
    heated_components, heated_rows, _ = transmission_heat_transfer_components(heated_attic_roof)

    assert cold_components.hu_w_k == pytest.approx(30.0)
    assert cold_components.hd_w_k == 0
    assert heated_components.hd_w_k == pytest.approx(40.0)
    assert heated_components.hu_w_k == 0
    assert cold_rows[0].calculation_method == "explicit_bztu_boundary_factor"
    assert heated_rows[0].calculation_method == "direct_outside_air"


def test_ground_monthly_transfer_uses_annual_exterior_temperature() -> None:
    building = BuildingInput(
        project_name="Ground boundary",
        locality="Cluj-Napoca",
        heated_floor_area_m2=10,
        heated_volume_m3=30,
        indoor_design_temperature_c=20,
        internal_gains_w_m2=0,
        solar_gains_kwh_m2_month=0,
        solar={"mode": "explicit"},
        envelope=[
            {
                "name": "Ground floor",
                "type": "floor",
                "area_m2": 10,
                "u_value_w_m2k": 1.0,
                "boundary_type": "ground",
                "boundary_correction_factor": 1.0,
            }
        ],
        ventilation={"air_changes_per_hour": 0, "heat_recovery_efficiency": 0},
        heating={"system_type": "condensing_gas_boiler", "efficiency": 0.95},
        cooling={"enabled": False},
        dhw={"enabled": False, "occupants": 0, "efficiency": 0.85},
    )

    result = calculate(building, include_reference=False)
    annual_outdoor = sum(
        float(month["temperature_c"]) * float(month["days"])
        for month in result.climate["monthly_temperatures"]
    ) / sum(float(month["days"]) for month in result.climate["monthly_temperatures"])
    january = result.monthly[0]
    expected_ground = 10.0 * (20.0 - annual_outdoor) * (31 * 24) / 1000

    assert_close(result.transmission_components.hg_w_k, 10.0)
    assert_close(result.transmission_components.hd_w_k, 0.0)
    assert_close(january.ground_transmission_kwh, expected_ground, tolerance=1e-3)
    assert_close(january.transmission_excluding_ground_kwh, 0.0)
    assert_close(january.ventilation_heat_transfer_kwh, 0.0)


def test_reference_building_recomputes_geometry_dependent_ground_u() -> None:
    actual = demo_building()
    reference = build_reference_input(actual)
    actual_ground = next(item for item in actual.envelope if item.boundary_type.value == "ground")
    reference_ground = next(item for item in reference.envelope if item.boundary_type.value == "ground")

    assert reference_ground.ground_contact is not None
    assert reference_ground.ground_contact == actual_ground.ground_contact
    actual_components, actual_rows, _ = transmission_heat_transfer_components(actual)
    reference_components, reference_rows, _ = transmission_heat_transfer_components(reference)
    actual_floor = next(item for item in actual_rows if item.boundary_type and item.boundary_type.value == "ground")
    reference_floor = next(item for item in reference_rows if item.boundary_type and item.boundary_type.value == "ground")

    assert actual_components.hg_w_k > 0
    assert reference_components.hg_w_k > 0
    assert actual_floor.boundary_correction_factor != reference_floor.boundary_correction_factor


def test_adjacent_heated_space_has_zero_transmission() -> None:
    building = simple_building(
        envelope=[
            {
                "name": "Floor to heated basement",
                "type": "floor",
                "area_m2": 80,
                "u_value_w_m2k": 0.8,
                "boundary_type": "adjacent_heated_space",
            }
        ],
        thermal_bridges=[],
    )

    components, envelope, _ = transmission_heat_transfer_components(building)

    assert_close(components.ha_w_k, 0.0)
    assert_close(components.htr_w_k, 0.0)
    assert envelope[0].boundary_correction_factor == 0.0


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


def test_structured_heat_pump_emitter_changes_scop_and_final_energy() -> None:
    radiators = simple_building(
        heating={
            "system_type": "heat_pump",
            "carrier": "electricity",
            "details": {
                "generator_type": "heat_pump_air_water",
                "emitter_type": "radiators_high_temp",
                "distribution_type": "hydronic_insulated",
                "storage_type": "none",
                "control_type": "room_thermostat",
            },
        }
    )
    underfloor = simple_building(
        heating={
            "system_type": "heat_pump",
            "carrier": "electricity",
            "details": {
                "generator_type": "heat_pump_air_water",
                "emitter_type": "underfloor",
                "distribution_type": "underfloor",
                "storage_type": "none",
                "control_type": "zoned",
            },
        }
    )

    radiator_service, radiator_system = heating_system_performance(radiators, 9000)
    floor_service, floor_system = heating_system_performance(underfloor, 9000)

    assert_close(radiator_system.generator_performance, 2.3)
    assert_close(floor_system.generator_performance, 3.2)
    assert radiator_system.design_flow_temperature_c == 60
    assert floor_system.design_flow_temperature_c == 35
    assert floor_system.effective_system_performance > radiator_system.effective_system_performance
    assert floor_service.final_kwh < radiator_service.final_kwh
    assert floor_system.performance_source == "lacurent_light_product_estimate"
    assert floor_system.confidence == "low"


def test_structured_heating_auxiliary_energy_is_separate_electricity_carrier() -> None:
    building = simple_building(
        cooling={"enabled": False, "seer": None, "setpoint_c": 26},
        heating={
            "system_type": "condensing_gas_boiler",
            "carrier": "natural_gas",
            "cost_profile": "natural_gas",
            "details": {
                "generator_type": "condensing_gas_boiler",
                "emitter_type": "radiators_high_temp",
                "distribution_type": "hydronic_insulated",
                "storage_type": "none",
                "control_type": "room_thermostat",
            },
        },
    )

    result = calculate(building, include_reference=False)

    assert result.heating_system.auxiliary_electricity_kwh == 120
    assert result.gross_final_energy_by_carrier["electricity"] >= 120
    assert result.final_energy_by_service["heating"] == (
        result.heating.final_kwh + result.heating_system.auxiliary_electricity_kwh
    )


def test_structured_condensing_boiler_reflects_emitter_temperature() -> None:
    high_temp = simple_building(
        heating={
            "system_type": "condensing_gas_boiler",
            "carrier": "natural_gas",
            "details": {
                "generator_type": "condensing_gas_boiler",
                "emitter_type": "radiators_high_temp",
                "distribution_type": "hydronic_insulated",
                "storage_type": "none",
                "control_type": "room_thermostat",
            },
        }
    )
    low_temp = simple_building(
        heating={
            "system_type": "condensing_gas_boiler",
            "carrier": "natural_gas",
            "details": {
                "generator_type": "condensing_gas_boiler",
                "emitter_type": "radiators_low_temp",
                "distribution_type": "hydronic_insulated",
                "storage_type": "none",
                "control_type": "room_thermostat",
            },
        }
    )

    high_service, high_system = heating_system_performance(high_temp, 9000)
    low_service, low_system = heating_system_performance(low_temp, 9000)

    assert high_system.generator_performance < low_system.generator_performance
    assert high_system.design_flow_temperature_c == 60
    assert low_system.design_flow_temperature_c == 45
    assert low_service.final_kwh < high_service.final_kwh


def _structured_heating_building(
    *,
    system_type: str,
    carrier: str,
    generator_type: str,
    emitter_type: str,
    distribution_type: str,
    storage_type: str = "none",
    control_type: str = "room_thermostat",
    efficiency: float | None = None,
    cost_profile: str | None = None,
) -> BuildingInput:
    heating = {
        "system_type": system_type,
        "carrier": carrier,
        "details": {
            "generator_type": generator_type,
            "emitter_type": emitter_type,
            "distribution_type": distribution_type,
            "storage_type": storage_type,
            "control_type": control_type,
        },
    }
    if efficiency is not None:
        heating["efficiency"] = efficiency
    if cost_profile is not None:
        heating["cost_profile"] = cost_profile
    return simple_building(heating=heating)


def test_all_supported_hydronic_heating_chain_combinations_resolve() -> None:
    generators = [
        ("condensing_gas_boiler", "natural_gas", "condensing_gas_boiler", None, "natural_gas"),
        ("gas_boiler", "natural_gas", "gas_boiler", None, "natural_gas"),
        ("custom", "electricity", "electric_boiler", 0.98, "electricity"),
        ("heat_pump", "electricity", "heat_pump_air_water", None, "electricity"),
        ("heat_pump", "electricity", "heat_pump_ground_water", None, "electricity"),
        ("district_heat", "district_heat", "district_heat", None, "district_heat"),
        ("custom", "biomass", "wood_boiler", 0.80, "firewood"),
        ("custom", "biomass", "pellet_boiler", 0.88, "pellets"),
    ]
    emitter_distributions = [
        ("radiators_high_temp", "hydronic_insulated"),
        ("radiators_high_temp", "hydronic_uninsulated"),
        ("radiators_low_temp", "hydronic_insulated"),
        ("radiators_low_temp", "hydronic_uninsulated"),
        ("underfloor", "underfloor"),
        ("fan_coils", "hydronic_insulated"),
        ("fan_coils", "hydronic_uninsulated"),
    ]
    storages = ["none", "buffer_small", "buffer_large"]
    controls = ["manual", "room_thermostat", "thermostatic_valves", "zoned", "weather_compensated"]

    checked = 0
    for system_type, carrier, generator, efficiency, cost_profile in generators:
        for emitter, distribution in emitter_distributions:
            for storage in storages:
                for control in controls:
                    building = _structured_heating_building(
                        system_type=system_type,
                        carrier=carrier,
                        generator_type=generator,
                        emitter_type=emitter,
                        distribution_type=distribution,
                        storage_type=storage,
                        control_type=control,
                        efficiency=efficiency,
                        cost_profile=cost_profile,
                    )
                    service, performance = heating_system_performance(building, 10000)
                    assert math.isfinite(service.final_kwh)
                    assert service.final_kwh > 0
                    assert math.isfinite(performance.effective_system_performance)
                    assert performance.effective_system_performance > 0
                    assert performance.generator_type.value == generator
                    checked += 1

    assert checked == 840


@pytest.mark.parametrize(
    ("emitter", "distribution", "valid"),
    [
        (emitter, distribution, (emitter, distribution) in {
            ("local", "local"),
            ("air", "air"),
            ("underfloor", "underfloor"),
            ("radiators_high_temp", "hydronic_insulated"),
            ("radiators_high_temp", "hydronic_uninsulated"),
            ("radiators_low_temp", "hydronic_insulated"),
            ("radiators_low_temp", "hydronic_uninsulated"),
            ("fan_coils", "hydronic_insulated"),
            ("fan_coils", "hydronic_uninsulated"),
        })
        for emitter in [
            "local",
            "radiators_high_temp",
            "radiators_low_temp",
            "underfloor",
            "fan_coils",
            "air",
        ]
        for distribution in [
            "local",
            "hydronic_insulated",
            "hydronic_uninsulated",
            "underfloor",
            "air",
        ]
    ],
)
def test_emitter_distribution_compatibility_matrix(
    emitter: str,
    distribution: str,
    valid: bool,
) -> None:
    payload = {
        "system_type": "custom",
        "carrier": "electricity",
        "efficiency": 0.98,
        "details": {
            "generator_type": "electric_boiler",
            "emitter_type": emitter,
            "distribution_type": distribution,
            "storage_type": "none",
            "control_type": "room_thermostat",
        },
    }
    if valid:
        building = simple_building(heating=payload)
        assert building.heating.details is not None
    else:
        with pytest.raises(Exception):
            simple_building(heating=payload)


def test_heat_pump_source_and_emitter_matrix_has_expected_ordering() -> None:
    def result(generator: str, emitter: str, distribution: str) -> tuple[float, float]:
        building = _structured_heating_building(
            system_type="heat_pump",
            carrier="electricity",
            generator_type=generator,
            emitter_type=emitter,
            distribution_type=distribution,
        )
        service, performance = heating_system_performance(building, 10000)
        return service.final_kwh, performance.generator_performance

    air_water_high, aw_high_scop = result("heat_pump_air_water", "radiators_high_temp", "hydronic_insulated")
    air_water_low, aw_low_scop = result("heat_pump_air_water", "radiators_low_temp", "hydronic_insulated")
    air_water_floor, aw_floor_scop = result("heat_pump_air_water", "underfloor", "underfloor")
    air_water_fan, aw_fan_scop = result("heat_pump_air_water", "fan_coils", "hydronic_insulated")

    ground_high, gw_high_scop = result("heat_pump_ground_water", "radiators_high_temp", "hydronic_insulated")
    ground_low, gw_low_scop = result("heat_pump_ground_water", "radiators_low_temp", "hydronic_insulated")
    ground_floor, gw_floor_scop = result("heat_pump_ground_water", "underfloor", "underfloor")
    ground_fan, gw_fan_scop = result("heat_pump_ground_water", "fan_coils", "hydronic_insulated")

    assert_close(aw_high_scop, 2.3)
    assert_close(aw_low_scop, 2.8)
    assert_close(aw_floor_scop, 3.2)
    assert_close(aw_fan_scop, 2.8)
    assert air_water_floor < air_water_low < air_water_high
    assert air_water_floor < air_water_fan < air_water_high

    assert_close(gw_high_scop, 2.76)
    assert_close(gw_low_scop, 3.36)
    assert_close(gw_floor_scop, 3.84)
    assert_close(gw_fan_scop, 3.36)
    assert ground_floor < ground_low < ground_high
    assert ground_floor < ground_fan < ground_high

    assert ground_high < air_water_high
    assert ground_low < air_water_low
    assert ground_floor < air_water_floor
    assert ground_fan < air_water_fan


def test_hydronic_distribution_storage_and_control_penalties_are_monotonic() -> None:
    base = dict(
        system_type="heat_pump",
        carrier="electricity",
        generator_type="heat_pump_air_water",
        emitter_type="radiators_low_temp",
    )

    insulated = heating_system_performance(
        _structured_heating_building(**base, distribution_type="hydronic_insulated"),
        10000,
    )[0].final_kwh
    uninsulated = heating_system_performance(
        _structured_heating_building(**base, distribution_type="hydronic_uninsulated"),
        10000,
    )[0].final_kwh
    assert insulated < uninsulated

    no_buffer = heating_system_performance(
        _structured_heating_building(**base, distribution_type="hydronic_insulated", storage_type="none"),
        10000,
    )[0].final_kwh
    small_buffer = heating_system_performance(
        _structured_heating_building(**base, distribution_type="hydronic_insulated", storage_type="buffer_small"),
        10000,
    )[0].final_kwh
    large_buffer = heating_system_performance(
        _structured_heating_building(**base, distribution_type="hydronic_insulated", storage_type="buffer_large"),
        10000,
    )[0].final_kwh
    assert no_buffer < small_buffer < large_buffer

    controls = {}
    for control in ["manual", "room_thermostat", "thermostatic_valves", "zoned", "weather_compensated"]:
        controls[control] = heating_system_performance(
            _structured_heating_building(
                **base,
                distribution_type="hydronic_insulated",
                control_type=control,
            ),
            10000,
        )[0].final_kwh
    assert (
        controls["weather_compensated"]
        < controls["zoned"]
        < controls["thermostatic_valves"]
        < controls["room_thermostat"]
        < controls["manual"]
    )


def test_air_to_air_heat_pump_is_fixed_air_system_without_hydronic_temperatures() -> None:
    building = _structured_heating_building(
        system_type="heat_pump",
        carrier="electricity",
        generator_type="heat_pump_air_air",
        emitter_type="air",
        distribution_type="air",
    )
    service, performance = heating_system_performance(building, 10000)

    assert service.carrier.value == "electricity"
    assert_close(performance.generator_performance, 3.0)
    assert performance.design_flow_temperature_c is None
    assert performance.design_return_temperature_c is None
    assert performance.auxiliary_electricity_kwh == 30


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
    assert cfg["version"] == "lacurent-commercial-v2.8"
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

