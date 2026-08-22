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


def ahu_heating_coil_required_energy_kwh(
    air_density_kg_m3: float,
    air_specific_heat_kj_kgk: float,
    supply_air_flow_m3_h: float,
    required_supply_temperature_c: float,
    humidification_temperature_rise_k: float,
    outdoor_temperature_c: float,
    calculation_hours: float,
) -> float:
    return (
        air_density_kg_m3
        * air_specific_heat_kj_kgk
        * supply_air_flow_m3_h
        * (required_supply_temperature_c + humidification_temperature_rise_k - outdoor_temperature_c)
        * calculation_hours
        / 3600
    )


def ahu_heat_recovery_energy_kwh(
    air_density_kg_m3: float,
    air_specific_heat_kj_kgk: float,
    moisture_latent_heat_kj_kg: float,
    supply_air_flow_m3_h: float,
    outdoor_air_fraction: float,
    supply_temperature_after_recovery_c: float,
    outdoor_preheat_temperature_c: float,
    supply_humidity_after_recovery_kg_kg: float,
    outdoor_preheat_humidity_kg_kg: float,
    calculation_hours: float,
) -> float:
    sensible = (
        air_density_kg_m3
        * air_specific_heat_kj_kgk
        * supply_air_flow_m3_h
        * outdoor_air_fraction
        * (supply_temperature_after_recovery_c - outdoor_preheat_temperature_c)
    )
    latent = (
        air_density_kg_m3
        * moisture_latent_heat_kj_kg
        * supply_air_flow_m3_h
        * outdoor_air_fraction
        * (supply_humidity_after_recovery_kg_kg - outdoor_preheat_humidity_kg_kg)
    )
    return (sensible + latent) * calculation_hours / 3600


def ahu_recirculation_air_heating_energy_kwh(
    air_density_kg_m3: float,
    air_specific_heat_kj_kgk: float,
    extract_air_flow_m3_h: float,
    outdoor_air_fraction: float,
    extract_temperature_into_recovery_c: float,
    outdoor_temperature_c: float,
    calculation_hours: float,
) -> float:
    return (
        air_density_kg_m3
        * air_specific_heat_kj_kgk
        * extract_air_flow_m3_h
        * (1 - outdoor_air_fraction)
        * (extract_temperature_into_recovery_c - outdoor_temperature_c)
        * calculation_hours
        / 3600
    )


def ahu_cooling_coil_required_energy_kwh(
    air_density_kg_m3: float,
    air_specific_heat_kj_kgk: float,
    moisture_latent_heat_kj_kg: float,
    supply_air_flow_m3_h: float,
    recirculated_supply_temperature_c: float,
    required_cooling_supply_temperature_c: float,
    recirculated_humidity_kg_kg: float,
    required_cooling_humidity_kg_kg: float,
    calculation_hours: float,
) -> float:
    sensible = (
        air_density_kg_m3
        * air_specific_heat_kj_kgk
        * supply_air_flow_m3_h
        * (recirculated_supply_temperature_c - required_cooling_supply_temperature_c)
    )
    latent = (
        air_density_kg_m3
        * moisture_latent_heat_kj_kg
        * supply_air_flow_m3_h
        * (recirculated_humidity_kg_kg - required_cooling_humidity_kg_kg)
    )
    return (sensible + latent) * calculation_hours / 3600


def ahu_dehumidification_cooling_energy_kwh(
    air_density_kg_m3: float,
    air_specific_heat_kj_kgk: float,
    moisture_latent_heat_kj_kg: float,
    supply_air_flow_m3_h: float,
    recirculated_supply_temperature_c: float,
    ahu_required_supply_temperature_c: float,
    required_cooling_supply_temperature_c: float,
    recirculated_humidity_kg_kg: float,
    dehumidification_humidity_reduction_kg_kg: float,
    required_cooling_humidity_kg_kg: float,
    calculation_hours: float,
) -> float:
    sensible_temperature = min(recirculated_supply_temperature_c, ahu_required_supply_temperature_c)
    sensible = (
        air_density_kg_m3
        * air_specific_heat_kj_kgk
        * supply_air_flow_m3_h
        * (sensible_temperature - required_cooling_supply_temperature_c)
    )
    latent = (
        air_density_kg_m3
        * moisture_latent_heat_kj_kg
        * supply_air_flow_m3_h
        * (
            recirculated_humidity_kg_kg
            - dehumidification_humidity_reduction_kg_kg
            - required_cooling_humidity_kg_kg
        )
    )
    return (sensible + latent) * calculation_hours / 3600


def ahu_humidification_generator_input_energy_kwh(
    air_density_kg_m3: float,
    moisture_latent_heat_kj_kg: float,
    supply_air_flow_m3_h: float,
    target_humidity_kg_kg: float,
    source_humidity_kg_kg: float,
    calculation_hours: float,
) -> float:
    return (
        supply_air_flow_m3_h
        * air_density_kg_m3
        * moisture_latent_heat_kj_kg
        * (target_humidity_kg_kg - source_humidity_kg_kg)
        * calculation_hours
        / 3600
    )


def ahu_non_steam_humidification_auxiliary_energy_kwh() -> float:
    return 0


def ahu_generation_loss_conditioned_kwh(
    supply_au_kw_k: float,
    supply_temperature_c: float,
    extract_au_kw_k: float,
    extract_temperature_c: float,
    zone_temperature_c: float,
    supply_leakage_m3_h: float,
    air_density_kg_m3: float,
    air_specific_heat_kj_kgk: float,
    calculation_hours: float,
) -> float:
    conductive = (
        supply_au_kw_k * (supply_temperature_c - zone_temperature_c)
        + extract_au_kw_k * (extract_temperature_c - zone_temperature_c)
    )
    leakage = (
        supply_leakage_m3_h
        * air_density_kg_m3
        * air_specific_heat_kj_kgk
        * (supply_temperature_c - zone_temperature_c)
        / 3600
    )
    return (conductive + leakage) * calculation_hours


def ahu_recoverable_generation_loss_kwh(generation_loss_kwh: float, ahu_location: str) -> float:
    return generation_loss_kwh if ahu_location == "conditioned" else 0


def balanced_residential_fan_temperature_rise_k() -> float:
    return 0


def fan_temperature_rise_k(
    fan_pressure_drop_pa: float,
    fan_readiness_factor: float,
    air_density_kg_m3: float,
    air_specific_heat_kwh_kgk: float,
    fan_efficiency: float,
) -> float:
    return (
        fan_pressure_drop_pa
        * fan_readiness_factor
        / (air_density_kg_m3 * air_specific_heat_kwh_kgk * fan_efficiency * 3.6 * 10**6)
    )


def extract_air_temperature_for_recovery_c(
    extract_fan_position: str,
    extract_air_temperature_after_distribution_c: float,
    extract_fan_temperature_rise_k: float = 0,
) -> float:
    if extract_fan_position == "upstream_of_recovery":
        return extract_air_temperature_after_distribution_c + extract_fan_temperature_rise_k
    return extract_air_temperature_after_distribution_c


def fan_efficiency_from_nominal_and_airflow_factor(
    nominal_fan_efficiency: float,
    airflow_function_factor: float,
) -> float:
    return nominal_fan_efficiency * airflow_function_factor


def quadratic_pressure_drop_pa(
    design_pressure_drop_pa: float,
    current_flow_m3_h: float,
    nominal_flow_m3_h: float,
) -> float:
    return design_pressure_drop_pa * (current_flow_m3_h / nominal_flow_m3_h) ** 2


def multizone_constant_pressure_drop_pa(
    design_pressure_drop_pa: float,
    current_flow_m3_h: float,
    nominal_flow_m3_h: float,
    control_factor: float,
) -> float:
    flow_ratio = current_flow_m3_h / nominal_flow_m3_h
    return design_pressure_drop_pa * ((1 - control_factor) * flow_ratio**2 + control_factor)


def multizone_minimum_pressure_drop_pa(
    design_pressure_drop_pa: float,
    current_flow_m3_h: float,
    nominal_flow_m3_h: float,
    control_factor: float,
    maximum_flow_factor: float,
) -> float:
    flow_ratio = current_flow_m3_h / nominal_flow_m3_h
    return design_pressure_drop_pa * (
        (1 - control_factor) * flow_ratio**2 + control_factor * maximum_flow_factor**2
    )


def ground_preheat_precool_energy_kwh(
    air_density_kg_m3: float,
    air_specific_heat_kj_kgk: float,
    supply_air_flow_m3_h: float,
    outdoor_air_fraction: float,
    preheated_outdoor_temperature_c: float,
    outdoor_temperature_c: float,
    calculation_hours: float,
) -> float:
    return (
        air_density_kg_m3
        * air_specific_heat_kj_kgk
        * supply_air_flow_m3_h
        * outdoor_air_fraction
        * (preheated_outdoor_temperature_c - outdoor_temperature_c)
        * calculation_hours
        / 3600
    )


def fan_energy_assigned_to_heat_recovery_pressure_kwh(
    fan_electric_energy_kwh: float,
    heat_recovery_design_pressure_drop_pa: float,
    supply_design_pressure_drop_pa: float,
    extract_design_pressure_drop_pa: float,
) -> float:
    return (
        fan_electric_energy_kwh
        * heat_recovery_design_pressure_drop_pa
        / (supply_design_pressure_drop_pa + extract_design_pressure_drop_pa)
    )


def steam_humidification_pump_auxiliary_energy_kwh() -> float:
    return 0


def humidification_pump_auxiliary_energy_kwh(
    design_humidification_air_flow_m3_h: float,
    design_specific_pump_energy_kwh_m3: float,
    part_load_factor: float,
    calculation_hours: float,
) -> float:
    return (
        design_humidification_air_flow_m3_h
        * design_specific_pump_energy_kwh_m3
        * part_load_factor
        * calculation_hours
    )


def duct_leakage_factor(
    leakage_air_flow_m3_h: float,
    required_air_flow_m3_h: float,
) -> float:
    return 1 + leakage_air_flow_m3_h / required_air_flow_m3_h


def duct_leakage_air_flow_m3_h(
    duct_area_m2: float,
    leakage_coefficient: float,
    pressure_difference_pa: float,
    exponent: float,
) -> float:
    return duct_area_m2 * leakage_coefficient * pressure_difference_pa**exponent * 3600


def ahu_leakage_factor(
    ahu_leakage_air_flow_m3_h: float,
    distribution_air_flow_m3_h: float,
    ahu_pressure_pa: float,
    test_pressure_pa: float,
) -> float:
    return 1 + (
        ahu_leakage_air_flow_m3_h
        / distribution_air_flow_m3_h
        * (ahu_pressure_pa / test_pressure_pa) ** 0.65
    )


def required_supply_distribution_air_flow_m3_h(zone_required_air_flows: list[tuple[float, float]]) -> float:
    return sum(leakage_factor * required_air_flow for leakage_factor, required_air_flow in zone_required_air_flows)


def required_extract_distribution_air_flow_m3_h(zone_required_air_flows: list[tuple[float, float]]) -> float:
    return -required_supply_distribution_air_flow_m3_h(zone_required_air_flows)


def supply_air_flow_zone_allocation_m3_h(
    supply_distribution_air_flow_m3_h: float,
    zone_required_air_flow_m3_h: float,
    total_required_air_flow_m3_h: float,
) -> float:
    return (
        supply_distribution_air_flow_m3_h
        * zone_required_air_flow_m3_h
        / total_required_air_flow_m3_h
    )


def extract_air_flow_zone_allocation_m3_h(
    extract_distribution_air_flow_m3_h: float,
    zone_required_air_flow_m3_h: float,
    total_required_air_flow_m3_h: float,
) -> float:
    return (
        -extract_distribution_air_flow_m3_h
        * zone_required_air_flow_m3_h
        / total_required_air_flow_m3_h
    )


def duct_leakage_flow_from_factor_m3_h(
    leakage_factor: float,
    zone_air_flow_m3_h: float,
) -> float:
    return (leakage_factor - 1) * zone_air_flow_m3_h


def maximum_zone_flow_factor(zone_flows: list[tuple[float, float]]) -> float:
    return max(current / design_maximum for current, design_maximum in zone_flows)


def part_load_ahu_air_flow_m3_h(
    part_load_factor: float,
    nominal_air_flow_m3_h: float,
) -> float:
    return part_load_factor * nominal_air_flow_m3_h


def maximum_flow_factor_from_part_load(
    part_load_factor: float,
    delta_flow_factor: float,
) -> float:
    return part_load_factor + delta_flow_factor


def ahu_distribution_thermal_loss_kwh(
    air_density_kg_m3: float,
    air_specific_heat_kj_kgk: float,
    supply_distribution_air_flow_m3_h: float,
    supply_duct_unconditioned_delta_k: float,
    supply_duct_conditioned_deltas_k: list[float],
    extract_distribution_air_flow_m3_h: float,
    extract_duct_delta_k: float,
    supply_leakage_zone_terms: list[tuple[float, float]],
    unconditioned_leakage_air_flow_m3_h: float,
    supply_distribution_inlet_c: float,
    unconditioned_surrounding_c: float,
    calculation_hours: float,
) -> float:
    conditioned_delta = sum(supply_duct_conditioned_deltas_k)
    leakage_zone_sum = sum(
        leakage_flow * (supply_distribution_inlet_c - zone_temperature_c)
        for leakage_flow, zone_temperature_c in supply_leakage_zone_terms
    )
    unconditioned_leakage = unconditioned_leakage_air_flow_m3_h * (
        supply_distribution_inlet_c - unconditioned_surrounding_c
    )
    airflow_temperature_sum = (
        supply_distribution_air_flow_m3_h * (supply_duct_unconditioned_delta_k + conditioned_delta)
        + extract_distribution_air_flow_m3_h * extract_duct_delta_k
        + leakage_zone_sum
        + unconditioned_leakage
    )
    return air_density_kg_m3 * air_specific_heat_kj_kgk * airflow_temperature_sum * calculation_hours / 3600


def ahu_recoverable_distribution_loss_to_zone_kwh(
    air_density_kg_m3: float,
    air_specific_heat_kj_kgk: float,
    zone_supply_air_flow_m3_h: float,
    conditioned_supply_duct_delta_k: float,
    zone_supply_leakage_air_flow_m3_h: float,
    supply_distribution_inlet_c: float,
    zone_indoor_temperature_c: float,
    calculation_hours: float,
) -> float:
    airflow_temperature_sum = (
        zone_supply_air_flow_m3_h * conditioned_supply_duct_delta_k
        + zone_supply_leakage_air_flow_m3_h * (supply_distribution_inlet_c - zone_indoor_temperature_c)
    )
    return air_density_kg_m3 * air_specific_heat_kj_kgk * airflow_temperature_sum * calculation_hours / 3600
