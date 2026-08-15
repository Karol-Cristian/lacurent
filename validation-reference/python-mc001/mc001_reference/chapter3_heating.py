from __future__ import annotations

import math


def heating_emission_loss_kwh(
    emission_output_kwh: float,
    increased_indoor_temperature_k: float,
    indoor_temperature_c: float,
    combined_outdoor_temperature_c: float,
) -> float:
    return (
        emission_output_kwh
        * increased_indoor_temperature_k
        / (indoor_temperature_c - combined_outdoor_temperature_c)
    )


def hydronic_pressure_drop_kpa(
    component_resistance_factor: float,
    max_linear_pressure_drop_kpa_m: float,
    max_circuit_length_m: float,
    additional_pressure_drop_kpa: float,
) -> float:
    return (
        (1 + component_resistance_factor)
        * max_linear_pressure_drop_kpa_m
        * max_circuit_length_m
        + additional_pressure_drop_kpa
    )


def hydronic_design_power_kw(
    pressure_drop_kpa: float,
    design_flow_m3_h: float,
) -> float:
    return pressure_drop_kpa * design_flow_m3_h / 3600


def hydronic_reference_pump_power_kw(hydronic_design_power_kw_value: float) -> float:
    return (
        1.7 * hydronic_design_power_kw_value
        + 17 * (1 - math.exp(-0.3 * hydronic_design_power_kw_value))
    ) * 10**-3


def hydronic_pump_energy_use_factor(
    reference_pump_power_kw_value: float,
    hydronic_design_power_kw_value: float,
    control_constant_cp1: float,
    control_constant_cp2: float,
    operation_load_factor: float,
    energy_efficiency_index: float,
) -> float:
    pump_efficiency_factor = reference_pump_power_kw_value / hydronic_design_power_kw_value
    return (
        pump_efficiency_factor
        * (control_constant_cp1 + control_constant_cp2 * operation_load_factor**-1)
        * energy_efficiency_index
        / 0.25
    )


def hydronic_pump_energy_kwh(
    design_power_kw: float,
    operation_load_factor: float,
    operation_hours: float,
    correction_factor: float,
) -> float:
    return design_power_kw * operation_load_factor * operation_hours * correction_factor


def heating_distribution_auxiliary_energy_kwh(
    hydronic_pump_energy_kwh_value: float,
    pump_energy_use_factor_value: float,
) -> float:
    return hydronic_pump_energy_kwh_value * pump_energy_use_factor_value


def heating_distribution_setback_pump_energy_kwh(
    setback_pump_power_kw: float,
    calculation_hours: float,
) -> float:
    return 0.3 * setback_pump_power_kw * calculation_hours


def heating_distribution_boost_pump_energy_kwh(
    hydronic_design_power_kw_value: float,
    calculation_hours: float,
) -> float:
    return 3.3 * hydronic_design_power_kw_value * calculation_hours


def heating_distribution_auxiliary_recoverable_kwh(
    recoverable_fraction: float,
    distribution_auxiliary_energy_kwh: float,
) -> float:
    return recoverable_fraction * distribution_auxiliary_energy_kwh


def heating_distribution_auxiliary_recovered_kwh(
    recoverable_fraction: float,
    distribution_auxiliary_energy_kwh: float,
) -> float:
    return (1 - recoverable_fraction) * distribution_auxiliary_energy_kwh


def heating_generator_full_load_hours(
    generator_output_kwh: float,
    nominal_power_kw: float,
) -> float:
    return generator_output_kwh / nominal_power_kw


def heating_generator_load_factor(
    generator_output_kwh: float,
    nominal_power_kw: float,
    operation_hours: float,
) -> float:
    return generator_output_kwh / (nominal_power_kw * operation_hours)


def intermediate_load_factor(
    intermediate_power_kw: float,
    nominal_power_kw: float,
) -> float:
    return intermediate_power_kw / nominal_power_kw


def generator_loss_power_low_load_kw(
    generator_load_factor_value: float,
    intermediate_load_factor_value: float,
    loss_power_nominal_kw: float,
    loss_power_intermediate_kw: float,
) -> float:
    return (
        generator_load_factor_value
        / intermediate_load_factor_value
        * (loss_power_nominal_kw - loss_power_intermediate_kw)
        + loss_power_intermediate_kw
    )


def generator_loss_power_high_load_kw(
    generator_load_factor_value: float,
    intermediate_load_factor_value: float,
    nominal_load_factor: float,
    loss_power_nominal_kw: float,
    loss_power_intermediate_kw: float,
) -> float:
    return (
        (generator_load_factor_value - intermediate_load_factor_value)
        / (nominal_load_factor - intermediate_load_factor_value)
        * (loss_power_nominal_kw - loss_power_intermediate_kw)
        + loss_power_intermediate_kw
    )


def generator_loss_energy_kwh(
    generator_loss_power_kw: float,
    operation_hours: float,
) -> float:
    return generator_loss_power_kw * operation_hours


def generator_standby_loss_power_kw(
    envelope_loss_fraction_percent: float,
    chimney_off_loss_fraction_percent: float,
    generator_delivered_power_kw: float,
) -> float:
    return (
        (envelope_loss_fraction_percent + chimney_off_loss_fraction_percent)
        / 100
        * generator_delivered_power_kw
    )


def generator_envelope_recoverable_loss_kwh(
    corrected_standby_loss_power_kw: float,
    boiler_room_recovery_factor: float,
    envelope_loss_fraction: float,
    operation_hours: float,
) -> float:
    return (
        corrected_standby_loss_power_kw
        * (1 - boiler_room_recovery_factor)
        * envelope_loss_fraction
        * operation_hours
    )


def generator_auxiliary_power_low_load_kw(
    generator_load_factor_value: float,
    intermediate_load_factor_value: float,
    auxiliary_power_intermediate_kw: float,
    auxiliary_power_standby_kw: float,
) -> float:
    return (
        generator_load_factor_value
        / intermediate_load_factor_value
        * (auxiliary_power_intermediate_kw - auxiliary_power_standby_kw)
        + auxiliary_power_standby_kw
    )


def generator_auxiliary_power_high_load_kw(
    generator_load_factor_value: float,
    intermediate_load_factor_value: float,
    auxiliary_power_nominal_kw: float,
    auxiliary_power_intermediate_kw: float,
) -> float:
    return (
        (generator_load_factor_value - intermediate_load_factor_value)
        / (1 - intermediate_load_factor_value)
        * (auxiliary_power_nominal_kw - auxiliary_power_intermediate_kw)
        + auxiliary_power_intermediate_kw
    )


def generator_auxiliary_energy_kwh(
    auxiliary_power_kw: float,
    operation_hours: float,
) -> float:
    return auxiliary_power_kw * operation_hours


def generator_auxiliary_recoverable_fraction(recovered_auxiliary_fraction: float) -> float:
    return 1 - recovered_auxiliary_fraction


def generator_auxiliary_recovered_loss_kwh(
    generation_auxiliary_energy_kwh: float,
    recovered_auxiliary_fraction: float,
) -> float:
    return generation_auxiliary_energy_kwh * recovered_auxiliary_fraction


def generator_auxiliary_recoverable_loss_kwh(
    generation_auxiliary_energy_kwh: float,
    boiler_room_recovery_factor: float,
    auxiliary_recoverable_fraction: float,
) -> float:
    return (
        generation_auxiliary_energy_kwh
        * (1 - boiler_room_recovery_factor)
        * auxiliary_recoverable_fraction
    )


def subsystem_input_energy_kwh(
    subsystem_output_kwh: float,
    subsystem_loss_kwh: float,
    auxiliary_energy_kwh: float,
    auxiliary_recovered_fraction: float,
    loss_recovered_fraction: float,
) -> float:
    return (
        subsystem_output_kwh
        + subsystem_loss_kwh
        - auxiliary_energy_kwh * auxiliary_recovered_fraction
        - subsystem_loss_kwh * loss_recovered_fraction
    )
