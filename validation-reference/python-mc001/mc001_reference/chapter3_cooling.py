from __future__ import annotations

import math


def cooling_distribution_loss_kwh(loss_factor: float, useful_kwh: float, emission_loss_kwh: float, ahu_output_kwh: float) -> float:
    return loss_factor * (useful_kwh + emission_loss_kwh + ahu_output_kwh)


def cooling_distribution_auxiliary_kwh(auxiliary_factor: float, useful_kwh: float, emission_loss_kwh: float, ahu_output_kwh: float) -> float:
    return auxiliary_factor * (useful_kwh + emission_loss_kwh + ahu_output_kwh)


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


def cooling_generator_input_by_capacity_limit(generator_input_required_kwh: float, operation_hours: float, nominal_power_kw: float) -> float:
    return min(generator_input_required_kwh, operation_hours * nominal_power_kw)


def cooling_covered_part_load_factor(generator_input_kwh: float, generator_input_required_kwh: float) -> float:
    return min(1, generator_input_kwh / generator_input_required_kwh)


def cooling_compression_electric_input_kwh(generator_input_kwh: float, part_load_value: float, nominal_eer: float, eer_correction_factor: float) -> float:
    return generator_input_kwh / (part_load_value * nominal_eer * eer_correction_factor)


def cooling_heat_rejected_compression_kwh(generator_input_kwh: float, nominal_eer: float, part_load_value: float, eer_correction_factor: float) -> float:
    return generator_input_kwh * (1 + 1 / (nominal_eer * part_load_value * eer_correction_factor))


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
