from __future__ import annotations

import math


def cooling_storage_input_boundary_kwh(storage_input_kwh: float) -> float:
    return storage_input_kwh


def cooling_storage_sensible_liquid_kwh(
    liquid_mass_kg: float,
    liquid_specific_heat_kwh_kgk: float,
    medium_density_kg_m3: float,
    medium_volume_m3: float,
    medium_specific_heat_kwh_kgk: float,
    generator_required_outlet_c: float,
    storage_c: float,
) -> float:
    heat_capacity = (
        liquid_mass_kg * liquid_specific_heat_kwh_kgk
        + medium_density_kg_m3 * medium_volume_m3 * medium_specific_heat_kwh_kgk
    )
    return heat_capacity * (generator_required_outlet_c - storage_c)


def cooling_storage_latent_kwh(latent_heat_kwh_kg: float, solid_mass_kg: float) -> float:
    return latent_heat_kwh_kg * solid_mass_kg


def cooling_storage_sensible_solid_kwh(
    solid_mass_kg: float,
    solid_specific_heat_kwh_kgk: float,
    transition_c: float,
    generator_outlet_flow_c: float,
) -> float:
    return solid_mass_kg * solid_specific_heat_kwh_kgk * ((transition_c - generator_outlet_flow_c) / 2)


def cooling_storage_output_kwh(
    sensible_liquid_kwh: float,
    latent_kwh: float,
    sensible_solid_kwh: float,
    distribution_input_required_kwh: float,
    storage_generator_output_kwh: float,
) -> float:
    available = sensible_liquid_kwh + latent_kwh + sensible_solid_kwh
    demand_after_generator = distribution_input_required_kwh - storage_generator_output_kwh
    return min(available, demand_after_generator)


def cooling_storage_transformable_water_kwh(
    storage_input_kwh: float,
    storage_input_loss_kwh: float,
    storage_standby_loss_kwh: float,
    storage_output_side_loss_kwh: float,
) -> float:
    return storage_input_kwh + storage_input_loss_kwh + storage_standby_loss_kwh + storage_output_side_loss_kwh


def cooling_storage_initial_ice_thickness_m(
    solid_mass_kg: float,
    solid_density_kg_m3: float,
    storage_pipe_length_m: float,
    storage_pipe_diameter_m: float,
) -> float:
    inner_radius = storage_pipe_diameter_m / 2
    outer_radius = math.sqrt(inner_radius**2 + solid_mass_kg / (solid_density_kg_m3 * math.pi * storage_pipe_length_m))
    return 2 * (outer_radius - inner_radius)


def cooling_storage_ice_mass_variation_kg(
    transformable_energy_kwh: float,
    latent_heat_kwh_kg: float,
    solid_specific_heat_kwh_kgk: float,
    transition_c: float,
    generator_outlet_flow_c: float,
) -> float:
    denominator = latent_heat_kwh_kg + solid_specific_heat_kwh_kgk * ((transition_c - generator_outlet_flow_c) / 2)
    return -transformable_energy_kwh / denominator


def cooling_storage_ice_thickness_m(
    maximum_ice_thickness_m: float,
    storage_pipe_diameter_m: float,
    solid_mass_kg: float,
    delta_solid_mass_kg: float,
    solid_density_kg_m3: float,
    storage_pipe_length_m: float,
) -> float:
    inner_radius = storage_pipe_diameter_m / 2
    candidate_mass = max(0, solid_mass_kg + delta_solid_mass_kg)
    candidate = 2 * (
        math.sqrt(inner_radius**2 + candidate_mass / (solid_density_kg_m3 * math.pi * storage_pipe_length_m))
        - inner_radius
    )
    return min(maximum_ice_thickness_m, max(0, candidate))


def cooling_storage_solid_mass_after_use_kg(initial_solid_mass_kg: float, delta_solid_mass_kg: float) -> float:
    return max(0, initial_solid_mass_kg + delta_solid_mass_kg)


def cooling_storage_pcm_solid_mass_variation_kg(
    transformable_energy_kwh: float,
    latent_heat_kwh_kg: float,
    solid_specific_heat_kwh_kgk: float,
    transition_c: float,
) -> float:
    return transformable_energy_kwh / (latent_heat_kwh_kg + solid_specific_heat_kwh_kgk * transition_c)


def cooling_storage_pcm_limit_to_liquid_kg(delta_solid_mass_kg: float, initial_liquid_mass_kg: float) -> float:
    return initial_liquid_mass_kg if delta_solid_mass_kg > initial_liquid_mass_kg else delta_solid_mass_kg


def cooling_storage_pcm_limit_to_existing_solid_kg(delta_solid_mass_kg: float, initial_solid_mass_kg: float) -> float:
    return initial_solid_mass_kg if delta_solid_mass_kg > initial_solid_mass_kg else delta_solid_mass_kg


def cooling_storage_pcm_solid_temperature_c(
    initial_solid_temperature_c: float,
    transformable_energy_kwh: float,
    solid_specific_heat_kwh_kgk: float,
    delta_solid_mass_kg: float,
    transition_c: float,
    solid_mass_kg: float,
    generator_outlet_flow_c: float,
) -> float:
    denominator = solid_specific_heat_kwh_kgk * (solid_mass_kg + delta_solid_mass_kg)
    candidate = initial_solid_temperature_c + (
        transformable_energy_kwh
        - solid_specific_heat_kwh_kgk * delta_solid_mass_kg * (transition_c - initial_solid_temperature_c)
    ) / denominator
    return max(candidate, generator_outlet_flow_c)


def cooling_storage_pcm_liquid_temperature_c(
    initial_liquid_temperature_c: float,
    transformable_energy_kwh: float,
    solid_specific_heat_kwh_kgk: float,
    delta_solid_mass_kg: float,
    transition_c: float,
    liquid_specific_heat_kwh_kgk: float,
    initial_liquid_mass_kg: float,
) -> float:
    denominator = liquid_specific_heat_kwh_kgk * (initial_liquid_mass_kg + delta_solid_mass_kg)
    return initial_liquid_temperature_c + (
        transformable_energy_kwh
        - solid_specific_heat_kwh_kgk * delta_solid_mass_kg * (transition_c - initial_liquid_temperature_c)
    ) / denominator


def cooling_storage_generator_delta_kwh(
    storage_generator_energy_kwh: float,
    storage_output_kwh: float,
    input_side_loss_kwh: float,
    standby_loss_kwh: float,
    output_side_loss_kwh: float,
) -> float:
    return storage_generator_energy_kwh - storage_output_kwh - input_side_loss_kwh - standby_loss_kwh - output_side_loss_kwh


def cooling_distribution_loss_kwh(loss_factor: float, useful_kwh: float, emission_loss_kwh: float, ahu_output_kwh: float) -> float:
    return loss_factor * (useful_kwh + emission_loss_kwh + ahu_output_kwh)


def cooling_distribution_auxiliary_kwh(auxiliary_factor: float, useful_kwh: float, emission_loss_kwh: float, ahu_output_kwh: float) -> float:
    return auxiliary_factor * (useful_kwh + emission_loss_kwh + ahu_output_kwh)


def cooling_generator_outlet_temperature_c(
    branch: str,
    theta_c_int_inc_c: float | None = None,
    theta_supply_cooling_required_c: float | None = None,
    theta_c_gen_out_set_c: float | None = None,
    theta_c_dis_in_flow_required_c: float | None = None,
) -> float:
    values = {
        "direct_expansion_zone": theta_c_int_inc_c,
        "direct_expansion_air_distribution": theta_supply_cooling_required_c,
        "air_water_constant": theta_c_gen_out_set_c,
        "other": theta_c_dis_in_flow_required_c,
    }
    if branch not in values or values[branch] is None:
        raise ValueError("unsupported or incomplete cooling generator outlet branch")
    return values[branch]


def cooling_distribution_inlet_outdoor_compensated_c(
    setpoint_min_c: float,
    setpoint_max_c: float,
    compensation_slope: float,
    outdoor_temperature_c: float,
    offset_k: float,
) -> float:
    raw = compensation_slope * outdoor_temperature_c + offset_k
    return min(setpoint_max_c, max(setpoint_min_c, raw))


def cooling_distribution_inlet_constant_setpoint_c(setpoint_c: float = 6) -> float:
    return setpoint_c


def cooling_generator_input_required_direct_expansion_kwh(
    useful_kwh: float,
    emission_loss_kwh: float,
    ahu_output_kwh: float,
) -> float:
    return useful_kwh + emission_loss_kwh + ahu_output_kwh


def cooling_generator_input_required_air_water_kwh(
    useful_kwh: float,
    emission_loss_kwh: float,
    ahu_output_kwh: float,
    distribution_loss_kwh: float,
    auxiliary_distribution_kwh: float,
    auxiliary_heat_fraction: float,
) -> float:
    return (
        useful_kwh
        + emission_loss_kwh
        + ahu_output_kwh
        + distribution_loss_kwh
        + auxiliary_heat_fraction * auxiliary_distribution_kwh
    )


def cooling_storage_thermal_loss_kwh(heat_loss_kw_per_k: float, ambient_c: float, storage_c: float, hours: float) -> float:
    return heat_loss_kw_per_k * (ambient_c - storage_c) * hours


def cooling_storage_pump_operation_hours(
    storage_energy_kwh: float,
    specific_heat_kwh_per_kgk: float,
    density_kg_per_m3: float,
    flow_m3_per_h: float,
    supply_c: float,
    return_c: float,
) -> float:
    delta_k = abs(supply_c - return_c)
    if delta_k <= 0:
        raise ValueError("temperature difference must be positive")
    return storage_energy_kwh / (specific_heat_kwh_per_kgk * density_kg_per_m3 * flow_m3_per_h * delta_k)


def cooling_storage_auxiliary_kwh(operation_hours: float, pump_power_kw: float) -> float:
    return operation_hours * pump_power_kw


def cooling_storage_auxiliary_total_kwh(output_side_kwh: float, input_side_kwh: float) -> float:
    return output_side_kwh + input_side_kwh


def cooling_storage_recoverable_auxiliary_loss_kwh(auxiliary_kwh: float, recoverable_fraction: float) -> float:
    return -auxiliary_kwh * recoverable_fraction


def cooling_storage_recoverable_thermal_loss_kwh(output_loss_kwh: float, standby_loss_kwh: float, input_loss_kwh: float, recoverable_fraction: float) -> float:
    return -(output_loss_kwh + standby_loss_kwh + input_loss_kwh) * recoverable_fraction


def cooling_storage_recoverable_loss_total_kwh(auxiliary_recoverable_kwh: float, thermal_recoverable_kwh: float) -> float:
    return auxiliary_recoverable_kwh + thermal_recoverable_kwh


def cooling_part_load_factor(generator_input_required_kwh: float, operation_hours: float, nominal_power_kw: float) -> float:
    return generator_input_required_kwh / (operation_hours * nominal_power_kw)


def cooling_part_load_bin(part_load_factor: float) -> float:
    if part_load_factor < 0.05:
        return 1
    return min(1, math.ceil(part_load_factor * 10) / 10)


def cooling_generator_part_load_value(
    cooling_part_load_bin_factor: float,
    heat_rejection_part_load_factor: float,
    free_cooling_factor: float,
    multiple_generator_factor: float,
) -> float:
    return (
        cooling_part_load_bin_factor
        * heat_rejection_part_load_factor
        * free_cooling_factor
        * multiple_generator_factor
    )


def cooling_absorption_part_load_value(part_load_value: float | None = None) -> float:
    return 0.95 if part_load_value is None else part_load_value


def cooling_generator_input_by_capacity_limit(generator_input_required_kwh: float, operation_hours: float, nominal_power_kw: float) -> float:
    return min(generator_input_required_kwh, operation_hours * nominal_power_kw)


def cooling_covered_part_load_factor(generator_input_kwh: float, generator_input_required_kwh: float) -> float:
    return min(1, generator_input_kwh / generator_input_required_kwh)


def cooling_extracted_energy_limited_by_generator(
    required_energy_kwh: float,
    generator_input_required_kwh: float,
    generator_input_available_kwh: float,
) -> float:
    if generator_input_required_kwh == 0:
        return 0
    return min(
        required_energy_kwh,
        required_energy_kwh / generator_input_required_kwh * generator_input_available_kwh,
    )


def cooling_unmet_load_kwh(required_energy_kwh: float, supplied_energy_kwh: float) -> float:
    if supplied_energy_kwh > required_energy_kwh:
        raise ValueError("supplied cooling cannot exceed required cooling")
    return max(required_energy_kwh - supplied_energy_kwh, 0)


def cooling_compression_electric_input_kwh(generator_input_kwh: float, part_load_value: float, nominal_eer: float, eer_correction_factor: float) -> float:
    return generator_input_kwh / (part_load_value * nominal_eer * eer_correction_factor)


def cooling_heat_rejected_compression_kwh(generator_input_kwh: float, nominal_eer: float, part_load_value: float, eer_correction_factor: float) -> float:
    return generator_input_kwh * (1 + 1 / (nominal_eer * part_load_value * eer_correction_factor))


def cooling_heat_rejection_reference_temperature_c(
    branch: str,
    outdoor_reference_c: float | None = None,
    indoor_reference_c: float | None = None,
    water_reference_inlet_c: float | None = None,
) -> float:
    values = {
        "air_outdoor": outdoor_reference_c,
        "air_indoor": indoor_reference_c if indoor_reference_c is not None else outdoor_reference_c,
        "water": water_reference_inlet_c,
    }
    if branch not in values or values[branch] is None:
        raise ValueError("unsupported or incomplete heat-rejection reference branch")
    return values[branch]


def cooling_heat_rejection_part_load_factor(temperature_c: float, a2: float, a1: float, a0: float) -> float:
    return a2 * temperature_c**2 + a1 * temperature_c + a0


def cooling_heat_rejection_temperature_c(
    source: str,
    outdoor_temperature_c: float | None = None,
    indoor_temperature_c: float | None = None,
) -> float:
    if source == "outdoor_air" and outdoor_temperature_c is not None:
        return outdoor_temperature_c
    if source == "indoor_air" and indoor_temperature_c is not None:
        return indoor_temperature_c
    raise ValueError("unsupported or incomplete heat-rejection temperature source")


def cooling_recoverable_heat_zero_kwh() -> float:
    return 0


def cooling_water_heat_rejection_inlet_temperature_c(
    control_mode: str,
    heat_rejection_outlet_c: float,
    heat_rejected_kwh: float,
    operation_hours: float,
    nominal_heat_rejection_power_kw: float,
    reference_inlet_c: float,
    reference_outlet_c: float,
    inlet_temperature_lower_limit_c: float | None = None,
) -> float:
    load_ratio = heat_rejected_kwh / (operation_hours * nominal_heat_rejection_power_kw)
    reference_delta = reference_inlet_c - reference_outlet_c
    if control_mode == "no_control":
        return heat_rejection_outlet_c + load_ratio * reference_delta
    if control_mode == "constant_temperature":
        return reference_inlet_c
    if control_mode == "variable_temperature" and inlet_temperature_lower_limit_c is not None:
        return max(
            inlet_temperature_lower_limit_c,
            heat_rejection_outlet_c + load_ratio * reference_delta,
        )
    raise ValueError("unsupported or incomplete heat-rejection water control")


def cooling_wet_heat_rejection_water_temperature_c(
    heat_rejection_outlet_c: float,
    heat_rejection_inlet_c: float,
    outdoor_wet_bulb_c: float,
    evaporation_temperature_ratio: float,
) -> float:
    return heat_rejection_outlet_c - evaporation_temperature_ratio * (
        heat_rejection_inlet_c - outdoor_wet_bulb_c
    )


def cooling_dry_heat_rejection_water_temperature_c(
    heat_rejection_outlet_c: float,
    heat_rejection_inlet_c: float,
    outdoor_air_c: float,
    evaporation_temperature_ratio: float,
) -> float:
    return heat_rejection_outlet_c - evaporation_temperature_ratio * (
        heat_rejection_inlet_c - outdoor_air_c
    )


def cooling_recoverable_heat_compression_kwh(
    generator_input_kwh: float,
    nominal_eer: float,
    part_load_value: float,
    eer_correction_factor: float,
) -> float:
    return cooling_heat_rejected_compression_kwh(
        generator_input_kwh,
        nominal_eer,
        part_load_value,
        eer_correction_factor,
    )


def cooling_recoverable_heat_maximum_temperature_c(water_heat_rejection_inlet_c: float) -> float:
    return water_heat_rejection_inlet_c


def cooling_heat_rejected_after_recovery_kwh(recoverable_heat_kwh: float, required_recovered_heat_kwh: float) -> float:
    return max(recoverable_heat_kwh - required_recovered_heat_kwh, 0)


def cooling_absorption_heat_input_kwh(generator_input_kwh: float, part_load_value: float, nominal_heat_ratio: float) -> float:
    return generator_input_kwh / (part_load_value * nominal_heat_ratio)


def cooling_absorption_performance_ratio(generator_input_kwh: float, absorption_heat_input_kwh: float) -> float:
    return generator_input_kwh / absorption_heat_input_kwh


def cooling_absorption_multi_carrier_input(
    absorption_heat_input_kwh: float,
    auxiliary_electric_input_kwh: float,
    absorption_heat_carrier: str = "thermal",
    auxiliary_carrier: str = "electricity",
) -> dict[str, object]:
    carriers: dict[str, float] = {
        absorption_heat_carrier: absorption_heat_input_kwh,
        auxiliary_carrier: auxiliary_electric_input_kwh,
    }
    return {
        "carrier_energy": carriers,
        "total_delivered_input_kwh": sum(carriers.values()),
    }


def cooling_heat_rejection_auxiliary_kwh(
    heat_rejected_kwh: float,
    specific_electric_demand_kw_per_kw: float,
    electric_part_load_factor: float,
    free_cooling_electric_factor: float,
) -> float:
    return heat_rejected_kwh * specific_electric_demand_kw_per_kw * electric_part_load_factor * free_cooling_electric_factor


def cooling_heat_rejection_distribution_auxiliary_kwh(heat_rejected_kwh: float, distribution_specific_electric_demand_kw_per_kw: float) -> float:
    return heat_rejected_kwh * distribution_specific_electric_demand_kw_per_kw


def cooling_control_auxiliary_kwh(operation_hours: float, control_powers_kw: list[float]) -> float:
    return operation_hours * sum(control_powers_kw)


def cooling_generator_auxiliary_total_kwh(heat_rejection_aux_kwh: float, heat_rejection_distribution_aux_kwh: float, control_aux_kwh: float) -> float:
    return heat_rejection_aux_kwh + heat_rejection_distribution_aux_kwh + control_aux_kwh


def cooling_compression_eer(generator_input_kwh: float, compression_electric_kwh: float, auxiliary_electric_kwh: float) -> float:
    return generator_input_kwh / (compression_electric_kwh + auxiliary_electric_kwh)


def cooling_compression_delivered_electric_input_kwh(compression_electric_kwh: float, auxiliary_electric_kwh: float) -> float:
    return compression_electric_kwh + auxiliary_electric_kwh
