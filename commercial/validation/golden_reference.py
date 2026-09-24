"""Independent golden-reference oracle for Commercial LaCurent Light.

This module is intentionally calculation-independent from commercial.app.engine.
It may read committed input datasets (Romanian monthly climate data and the
golden-case manifest), but it does not import production calculation code.

Scope is deliberately controlled and documented in golden_reference_cases.json:
explicit U-values/boundary factors, monthly quasi-steady QH,nd/QC,nd, flat
seasonal heating performance, SEER cooling, simple DHW performance, carrier
aggregation, primary energy, CO2 and residential energy-class assignment.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = Path(__file__).with_name("golden_reference_cases.json")
CLIMATE_PATH = ROOT / "commercial" / "data" / "climate.json"

AIR_HEAT_CAPACITY_WH_M3K = 0.34
EFFECTIVE_INTERNAL_HEAT_CAPACITY_J_M2K = 165_000.0
A_H0 = 1.0
TAU_H0_H = 15.0
A_C0 = 1.0
TAU_C0_H = 15.0
A_C_RED = 1.0
GAMMA_EQUALITY_TOLERANCE = 1e-12
DHW_KWH_PER_LITRE_10_TO_60C = 0.05814
DHW_LITRES_PER_PERSON_DAY_AT_60C = 50.0

# Source-locked validation constants. Updating these requires explicit review
# against the cited MC001 source, not a copy from production runtime code.
CARRIER_FACTORS = {
    "natural_gas": {"primary_energy_factor": 1.17, "co2_kg_per_kwh_final": 0.202},
    "electricity": {"primary_energy_factor": 2.50, "co2_kg_per_kwh_final": 0.107},
    "district_heat": {"primary_energy_factor": 0.92, "co2_kg_per_kwh_final": 0.220},
    "biomass": {"primary_energy_factor": 1.08, "co2_kg_per_kwh_final": 0.039},
}

CLASS_THRESHOLDS = {
    "residential_individual": [91.0, 129.0, 257.0, 390.0, 522.0, 652.0, 783.0],
    "residential_collective": [73.0, 101.0, 198.0, 297.0, 396.0, 495.0, 595.0],
}
CLASS_LABELS = ["A+", "A", "B", "C", "D", "E", "F"]


def load_manifest() -> dict[str, Any]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def _climate_station(name: str) -> dict[str, Any]:
    data = json.loads(CLIMATE_PATH.read_text(encoding="utf-8"))
    for station in data["localities"]:
        if station["name"] == name:
            return station
    raise ValueError(f"Unknown Romanian climate station: {name}")


def _boundary_factor(element: dict[str, Any]) -> float:
    boundary = element.get("boundary_type", "outside_air")
    if boundary == "outside_air":
        return 1.0
    if boundary == "adjacent_heated_space":
        return 0.0
    if boundary == "ground":
        if "boundary_correction_factor" not in element:
            raise ValueError("Golden ground element requires an explicit correction factor.")
        return float(element["boundary_correction_factor"])
    raise ValueError(f"Golden oracle boundary not in controlled scope: {boundary}")


def _heat_transfer_coefficients(profile: dict[str, Any]) -> tuple[float, float]:
    h_excluding_ground = 0.0
    h_ground = 0.0

    for element in profile["envelope"]:
        contribution = (
            float(element["area_m2"])
            * float(element["u_value_w_m2k"])
            * _boundary_factor(element)
        )
        if element.get("boundary_type") == "ground":
            h_ground += contribution
        else:
            h_excluding_ground += contribution

    for bridge in profile.get("thermal_bridges", []):
        contribution = float(bridge["length_m"]) * float(bridge["psi_w_mk"])
        if bridge.get("component", "Hd") == "Hg":
            h_ground += contribution
        else:
            h_excluding_ground += contribution

    return h_excluding_ground, h_ground


def _ventilation_coefficient(profile: dict[str, Any]) -> float:
    ventilation = profile["ventilation"]
    airflow_m3h = (
        float(ventilation["air_changes_per_hour"])
        * float(profile["heated_volume_m3"])
    )
    return (
        AIR_HEAT_CAPACITY_WH_M3K
        * airflow_m3h
        * (1.0 - float(ventilation["heat_recovery_efficiency"]))
    )


def _utilization_parameter(area_m2: float, total_h_w_k: float, mode: str) -> float:
    capacity_j_k = EFFECTIVE_INTERNAL_HEAT_CAPACITY_J_M2K * float(area_m2)
    tau_h = (capacity_j_k / 3600.0) / total_h_w_k
    if mode == "heating":
        return A_H0 + tau_h / TAU_H0_H
    return A_C0 + tau_h / TAU_C0_H


def _heating_gain_utilization_factor(gamma_h: float, a_h: float) -> float:
    if abs(gamma_h - 1.0) <= GAMMA_EQUALITY_TOLERANCE:
        return a_h / (a_h + 1.0)
    if gamma_h == 0:
        return 1.0
    return (1.0 - gamma_h**a_h) / (1.0 - gamma_h ** (a_h + 1.0))


def _heating_need(q_h_ht_kwh: float, q_h_gn_kwh: float, a_h: float) -> float:
    if q_h_ht_kwh <= 0:
        return 0.0
    if q_h_gn_kwh <= 0:
        return q_h_ht_kwh
    gamma_h = q_h_gn_kwh / q_h_ht_kwh
    if gamma_h > 2.0:
        return 0.0
    eta_h_gn = _heating_gain_utilization_factor(gamma_h, a_h)
    return max(q_h_ht_kwh - eta_h_gn * q_h_gn_kwh, 0.0)


def _cooling_heat_transfer_utilization_factor(gamma_c: float, a_c: float) -> float:
    if gamma_c < 0:
        return 1.0
    if abs(gamma_c - 1.0) <= GAMMA_EQUALITY_TOLERANCE:
        return a_c / (a_c + 1.0)
    return _heating_gain_utilization_factor(1.0 / gamma_c, a_c)


def _cooling_need(q_c_ht_kwh: float, q_c_gn_kwh: float, a_c: float) -> float:
    if q_c_gn_kwh <= 0:
        return max(-q_c_ht_kwh, 0.0) * A_C_RED
    if abs(q_c_ht_kwh) <= 1e-12:
        return q_c_gn_kwh * A_C_RED

    gamma_c = q_c_gn_kwh / q_c_ht_kwh
    if gamma_c > 0 and (1.0 / gamma_c) > 2.0:
        return 0.0

    eta_c_ht = _cooling_heat_transfer_utilization_factor(gamma_c, a_c)
    return max(A_C_RED * (q_c_gn_kwh - eta_c_ht * q_c_ht_kwh), 0.0)


def _annual_useful_demands(
    profile: dict[str, Any],
    system: dict[str, Any],
    climate: dict[str, Any],
) -> tuple[float, float]:
    h_excluding_ground, h_ground = _heat_transfer_coefficients(profile)
    h_ve = _ventilation_coefficient(profile)
    total_h = h_excluding_ground + h_ground + h_ve
    if total_h <= 0:
        raise ValueError("Golden case requires positive total heat-transfer coefficient.")

    area = float(profile["heated_floor_area_m2"])
    a_h = _utilization_parameter(area, total_h, "heating")
    a_c = _utilization_parameter(area, total_h, "cooling")
    months = climate["monthly_temperatures"]
    annual_outdoor = sum(
        float(month["temperature_c"]) * float(month["days"])
        for month in months
    ) / sum(float(month["days"]) for month in months)

    annual_heating = 0.0
    annual_cooling = 0.0
    indoor_heating = float(profile["indoor_design_temperature_c"])
    cooling = system["cooling"]
    indoor_cooling = float(cooling["setpoint_c"])

    for month in months:
        hours = float(month["days"]) * 24.0
        outdoor = float(month["temperature_c"])
        internal_gains = (
            float(profile["internal_gains_w_m2"]) * area * hours / 1000.0
        )
        solar_gains = float(profile["solar_gains_kwh_m2_month"]) * area
        total_gains = internal_gains + solar_gains

        q_h_ht = (
            h_excluding_ground * (indoor_heating - outdoor) * hours / 1000.0
            + h_ground * (indoor_heating - annual_outdoor) * hours / 1000.0
            + h_ve * (indoor_heating - outdoor) * hours / 1000.0
        )
        annual_heating += _heating_need(q_h_ht, total_gains, a_h)

        if cooling["enabled"]:
            q_c_ht = (
                h_excluding_ground * (indoor_cooling - outdoor) * hours / 1000.0
                + h_ground * (indoor_cooling - annual_outdoor) * hours / 1000.0
                + h_ve * (indoor_cooling - outdoor) * hours / 1000.0
            )
            annual_cooling += _cooling_need(q_c_ht, total_gains, a_c)

    return annual_heating, annual_cooling


def _add_carrier(total: dict[str, float], carrier: str, value: float) -> None:
    if value:
        total[carrier] = total.get(carrier, 0.0) + float(value)


def _final_energy_by_carrier(
    profile: dict[str, Any],
    system: dict[str, Any],
    q_hnd_kwh: float,
    q_cnd_kwh: float,
) -> dict[str, float]:
    totals: dict[str, float] = {}

    heating = system["heating"]
    if heating["system_type"] == "heat_pump":
        heating_performance = float(heating["scop"])
        heating_carrier = "electricity"
    else:
        heating_performance = float(heating["efficiency"])
        heating_carrier = str(heating["carrier"])
        if heating["system_type"] == "electric_resistance":
            heating_carrier = "electricity"
        elif heating["system_type"] == "district_heat":
            heating_carrier = "district_heat"
        elif heating["system_type"] in {"gas_boiler", "condensing_gas_boiler"}:
            heating_carrier = "natural_gas"
    _add_carrier(totals, heating_carrier, q_hnd_kwh / heating_performance)

    cooling = system["cooling"]
    if cooling["enabled"]:
        _add_carrier(totals, "electricity", q_cnd_kwh / float(cooling["seer"]))

    dhw = system["dhw"]
    if dhw["enabled"]:
        useful_dhw = (
            float(profile["occupants"])
            * DHW_LITRES_PER_PERSON_DAY_AT_60C
            * 365.0
            * DHW_KWH_PER_LITRE_10_TO_60C
        )
        performance = (
            float(dhw["cop"])
            if dhw.get("cop") is not None
            else float(dhw["efficiency"])
        )
        _add_carrier(totals, str(dhw["carrier"]), useful_dhw / performance)

    return totals


def _energy_class(building_type: str, specific_primary_kwh_m2: float) -> str:
    for label, limit in zip(CLASS_LABELS, CLASS_THRESHOLDS[building_type]):
        if specific_primary_kwh_m2 <= limit:
            return label
    return "G"


def calculate_reference(case: dict[str, Any], manifest: dict[str, Any] | None = None) -> dict[str, Any]:
    manifest = manifest or load_manifest()
    profile = manifest["building_profiles"][case["building_profile"]]
    system = manifest["system_profiles"][case["system_profile"]]
    climate = _climate_station(case["climate_station"])

    q_hnd, q_cnd = _annual_useful_demands(profile, system, climate)
    carrier_totals = _final_energy_by_carrier(profile, system, q_hnd, q_cnd)

    primary_total = sum(
        value * CARRIER_FACTORS[carrier]["primary_energy_factor"]
        for carrier, value in carrier_totals.items()
    )
    co2_total = sum(
        value * CARRIER_FACTORS[carrier]["co2_kg_per_kwh_final"]
        for carrier, value in carrier_totals.items()
    )
    area = float(profile["heated_floor_area_m2"])
    primary_specific = primary_total / area
    co2_specific = co2_total / area

    return {
        "case_id": case["id"],
        "annual_heating_demand_kwh": q_hnd,
        "annual_cooling_demand_kwh": q_cnd,
        "final_energy_by_carrier": carrier_totals,
        "primary_energy_total_kwh": primary_total,
        "primary_energy_specific_kwh_m2": primary_specific,
        "co2_total_kg": co2_total,
        "co2_specific_kg_m2": co2_specific,
        "energy_class": _energy_class(profile["building_type"], primary_specific),
    }
