"""Chapter 3 DHW formulas exposed from the independent Python kernel."""

from __future__ import annotations

import math
from typing import Any

from .._p3v_kernel import ensure_p3v_path

ensure_p3v_path()

from mc001_reference.chapter3_dhw import *  # noqa: F403,E402


def mean_distribution_temperature_c(theta_w_distribution_c: float, delta_theta_w_loop_k: float) -> float:
    return theta_w_distribution_c - delta_theta_w_loop_k / 2


def buried_pipe_linear_transmittance(
    inner_diameter_m: float,
    outer_diameter_m: float,
    insulation_thermal_conductivity_w_mk: float,
    burial_material_thermal_conductivity_w_mk: float,
    burial_depth_m: float,
) -> float:
    denominator = (
        (1 / (2 * insulation_thermal_conductivity_w_mk)) * math.log(outer_diameter_m / inner_diameter_m)
        + (1 / (2 * burial_material_thermal_conductivity_w_mk)) * math.log((4 * burial_depth_m) / outer_diameter_m)
    )
    return math.pi / denominator


def uninsulated_pipe_linear_transmittance(
    inner_diameter_m: float,
    outer_diameter_m: float,
    pipe_thermal_conductivity_w_mk: float,
    external_heat_transfer_coefficient_w_m2k: float,
) -> float:
    denominator = (
        (1 / (2 * pipe_thermal_conductivity_w_mk)) * math.log(outer_diameter_m / inner_diameter_m)
        + 1 / (external_heat_transfer_coefficient_w_m2k * outer_diameter_m)
    )
    return math.pi / denominator


def uninsulated_pipe_approx_linear_transmittance(
    outer_diameter_m: float,
    external_heat_transfer_coefficient_w_m2k: float,
) -> float:
    return external_heat_transfer_coefficient_w_m2k * math.pi * outer_diameter_m


def specific_linear_heat_loss_w_m(
    linear_transmittance_w_mk: float,
    theta_w_distribution_c: float,
    theta_w_ambient_c: float,
) -> float:
    return linear_transmittance_w_mk * (theta_w_distribution_c - theta_w_ambient_c)


def exponential_coefficient(
    specific_linear_heat_loss_w_m: float,
    pipe_length_m: float,
    water_specific_heat_wh_kgk: float,
    water_density_kg_m3: float,
    water_volume_m3: float,
    pipe_specific_heat_wh_kgk: float,
    pipe_mass_kg: float,
    non_use_interval_hours: float,
    theta_w_distribution_c: float,
    theta_w_ambient_c: float,
) -> float:
    heat_capacity_wh_k = water_specific_heat_wh_kgk * water_density_kg_m3 * water_volume_m3 + pipe_specific_heat_wh_kgk * pipe_mass_kg
    return (
        (specific_linear_heat_loss_w_m * pipe_length_m)
        / heat_capacity_wh_k
        * (non_use_interval_hours / (theta_w_distribution_c - theta_w_ambient_c))
    )


def temperature_after_non_use_c(
    theta_w_ah_c: float,
    theta_w_average_begin_c: float,
    theta_w_ambient_c: float,
    exponential_coefficient_value: float,
) -> float:
    return theta_w_ah_c + (theta_w_average_begin_c - theta_w_ambient_c) * math.exp(-exponential_coefficient_value)


def average_temperature_from_profile_c(theta_w_average_begin_c: float, theta_w_after_non_use_c: float) -> float:
    return (theta_w_average_begin_c + theta_w_after_non_use_c) / 2


def average_temperature_simplified_c(linear_transmittance_w_mk: float) -> float:
    return 25 * linear_transmittance_w_mk**-0.2


def pipe_heat_loss_rate_w(segment: dict[str, Any], *, temperature_mode: str = "difference") -> float:
    temperature_term = (
        float(segment["thetaWMeanC"]) + float(segment["thetaWAmbientC"])
        if temperature_mode == "sum"
        else float(segment["thetaWMeanC"]) - float(segment["thetaWAmbientC"])
    )
    length_m = float(segment.get("lengthM", 0)) + float(segment.get("equivalentLengthM", 0))
    return float(segment["linearTransmittanceWPerMK"]) * temperature_term * length_m


def distribution_loss_with_pipe_segments(
    pipe_segments: list[dict[str, Any]],
    operation_time_h: float,
    *,
    temperature_mode: str = "difference",
) -> float:
    return sum(pipe_heat_loss_rate_w(segment, temperature_mode=temperature_mode) for segment in pipe_segments) * operation_time_h / 1000


def stub_loss_without_recirculation(
    pipe_segments: list[dict[str, Any]],
    water_density_kg_m3: float,
    specific_heat_kwh_kgk: float,
    theta_w_distribution_c: float,
    calculation_interval_h: float,
) -> float:
    return sum(
        float(segment["volumeM3"])
        * water_density_kg_m3
        * float(segment["tapCountPerHour"])
        * specific_heat_kwh_kgk
        * (theta_w_distribution_c - float(segment["thetaWAmbientC"]))
        * calculation_interval_h
        for segment in pipe_segments
    )


def total_distribution_loss_kwh(
    distribution_loss_kwh: float = 0,
    recirculation_no_draw_loss_kwh: float = 0,
    stub_loss_kwh: float = 0,
) -> float:
    return distribution_loss_kwh + recirculation_no_draw_loss_kwh + stub_loss_kwh


def distribution_recovery_factor(recoverable_distribution_loss_kwh: float, total_distribution_loss_kwh_value: float) -> float:
    return recoverable_distribution_loss_kwh / total_distribution_loss_kwh_value


def recovered_distribution_heat_kwh(recovery_factor: float, total_distribution_loss_kwh_value: float) -> float:
    return recovery_factor * total_distribution_loss_kwh_value


def pressure_drop_kpa(
    component_resistance_factor: float,
    max_linear_pressure_drop_kpa_m: float,
    max_circuit_length_m: float,
    additional_pressure_drop_kpa: float,
) -> float:
    return (1 + component_resistance_factor) * max_linear_pressure_drop_kpa_m * max_circuit_length_m + additional_pressure_drop_kpa


def pump_efficiency_factor(reference_pump_power_kw_value: float, pump_design_power_kw_value: float) -> float:
    return reference_pump_power_kw_value / pump_design_power_kw_value


def heat_tracing_auxiliary_energy_kwh(protected_pipe_distribution_loss_kwh: float) -> float:
    return protected_pipe_distribution_loss_kwh


def recoverable_auxiliary_distribution_energy_kwh(recoverable_fraction: float, distribution_auxiliary_energy_kwh: float) -> float:
    return recoverable_fraction * distribution_auxiliary_energy_kwh


def recovered_auxiliary_distribution_energy_kwh(recoverable_fraction: float, distribution_auxiliary_energy_kwh: float) -> float:
    return recoverable_fraction * distribution_auxiliary_energy_kwh
