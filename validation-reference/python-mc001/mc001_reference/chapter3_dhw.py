from __future__ import annotations

import math


def insulated_pipe_linear_transmittance(
    inner_diameter_m: float,
    outer_diameter_m: float,
    insulation_thermal_conductivity_w_mk: float,
    external_heat_transfer_coefficient_w_m2k: float,
) -> float:
    denominator = (
        (1 / (2 * insulation_thermal_conductivity_w_mk))
        * math.log(outer_diameter_m / inner_diameter_m)
        + 1 / (external_heat_transfer_coefficient_w_m2k * outer_diameter_m)
    )
    return math.pi / denominator


def distribution_loss_with_recirculation(
    linear_transmittance_w_mk: float,
    mean_temperature_c: float,
    ambient_temperature_c: float,
    length_m: float,
    equivalent_length_m: float,
    operation_time_h: float,
) -> float:
    heat_loss_rate_w = (
        linear_transmittance_w_mk
        * (mean_temperature_c - ambient_temperature_c)
        * (length_m + equivalent_length_m)
    )
    return heat_loss_rate_w * operation_time_h / 1000


def pump_design_power_kw(pressure_drop_kpa: float, design_flow_m3_h: float) -> float:
    return pressure_drop_kpa * design_flow_m3_h / 3600


def reference_pump_power_kw(pump_design_power_kw_value: float) -> float:
    return (
        1.7 * pump_design_power_kw_value
        + 17 * (1 - math.exp(-0.3 * pump_design_power_kw_value))
    ) * 10**-3


def pump_energy_use_factor(
    pump_efficiency_factor: float,
    control_constant_cp1: float,
    control_constant_cp2: float,
    operation_load_factor: float,
    energy_efficiency_index: float,
) -> float:
    return (
        pump_efficiency_factor
        * (control_constant_cp1 + control_constant_cp2 * operation_load_factor**-1)
        * energy_efficiency_index
        / 0.25
    )


def recirculation_pump_energy_kwh(
    pump_design_power_kw_value: float,
    operation_load_factor: float,
    operation_time_h: float,
    correction_factor: float,
) -> float:
    return (
        pump_design_power_kw_value
        * operation_load_factor
        * operation_time_h
        * correction_factor
    )


def auxiliary_distribution_energy_kwh(
    recirculation_pump_energy_kwh_value: float,
    pump_energy_use_factor_value: float,
) -> float:
    return recirculation_pump_energy_kwh_value * pump_energy_use_factor_value


def storage_standing_loss_single_volume_kwh(
    accessible_storage_volume_factor: float,
    distribution_storage_loss_factor: float,
    storage_heat_transfer_coefficient_w_k: float,
    storage_setpoint_temperature_c: float,
    storage_ambient_temperature_c: float,
    calculation_hours: float,
) -> float:
    return (
        accessible_storage_volume_factor
        * distribution_storage_loss_factor
        * (storage_heat_transfer_coefficient_w_k / 1000)
        * (storage_setpoint_temperature_c - storage_ambient_temperature_c)
        * calculation_hours
    )
