from __future__ import annotations


def rotary_heat_recovery_auxiliary_energy_kwh(
    max_rotary_power_kw: float,
    calculation_hours: float,
    rotation_ratio: float,
) -> float:
    return max_rotary_power_kw * calculation_hours * rotation_ratio


def pump_heat_recovery_auxiliary_energy_kwh(
    supply_air_flow_m3_h: float,
    outdoor_air_fraction: float,
    max_pump_specific_power_kwh_m3: float,
    calculation_hours: float,
    minimum_part_load_factor: float,
    recovered_heat_kwh: float,
    max_recovered_heat_power_kw: float,
) -> float:
    part_load = max(
        minimum_part_load_factor,
        recovered_heat_kwh / (calculation_hours * max_recovered_heat_power_kw),
    )
    return (
        supply_air_flow_m3_h
        * outdoor_air_fraction
        * max_pump_specific_power_kwh_m3
        * calculation_hours
        * part_load**2.5
    )


def no_heat_recovery_auxiliary_energy_kwh() -> float:
    return 0


def preheater_energy_kwh(
    air_density_kg_m3: float,
    air_specific_heat_kj_kgk: float,
    supply_air_flow_m3_h: float,
    outdoor_air_fraction: float,
    frost_protection_temperature_c: float,
    outdoor_temperature_c: float,
    calculation_hours: float,
) -> float:
    return (
        air_density_kg_m3
        * air_specific_heat_kj_kgk
        * supply_air_flow_m3_h
        * outdoor_air_fraction
        * (frost_protection_temperature_c - outdoor_temperature_c)
        * calculation_hours
        / 3600
    )


def no_preheater_energy_kwh() -> float:
    return 0


def ventilation_control_auxiliary_energy_kwh(
    controller_power_kw: float,
    operation_factor: float,
    calculation_hours: float,
) -> float:
    return controller_power_kw * operation_factor * calculation_hours
