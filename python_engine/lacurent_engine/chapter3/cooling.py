"""Chapter 3 cooling formulas exposed from the independent Python kernel."""

from __future__ import annotations

from .._p3v_kernel import ensure_p3v_path

ensure_p3v_path()

from mc001_reference.chapter3_cooling import *  # noqa: F403,E402


def cooling_eer_temperature_correction_factor(
    absolute_zero_offset_k: float,
    generator_required_outlet_temperature_c: float,
    heat_rejection_reference_inlet_temperature_c: float,
    nominal_generator_outlet_temperature_c: float,
    nominal_heat_rejection_inlet_temperature_c: float,
    evaporator_temperature_difference_k: float,
    condenser_temperature_difference_k: float,
) -> float:
    actual_cold_k = absolute_zero_offset_k + generator_required_outlet_temperature_c - evaporator_temperature_difference_k
    actual_hot_k = absolute_zero_offset_k + heat_rejection_reference_inlet_temperature_c + condenser_temperature_difference_k
    nominal_cold_k = absolute_zero_offset_k + nominal_generator_outlet_temperature_c - evaporator_temperature_difference_k
    nominal_hot_k = absolute_zero_offset_k + nominal_heat_rejection_inlet_temperature_c + condenser_temperature_difference_k
    return (actual_cold_k / (actual_hot_k - actual_cold_k)) / (nominal_cold_k / (nominal_hot_k - nominal_cold_k))


def cooling_heat_rejected_absorption_kwh(
    generator_input_kwh: float,
    nominal_heat_ratio: float,
    part_load_value: float,
) -> float:
    return generator_input_kwh * (1 + 1 / (nominal_heat_ratio * part_load_value))
