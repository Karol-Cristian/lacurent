"""Full-building orchestration for the independent Python reference."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .aggregation import annual_sum
from .assemblies import assembly_results
from .diagnostics import validate_full_fixture, validate_hidden_output_patterns
from .envelope import calculate_envelope
from .gains import monthly_gains
from .heating import heating_need
from .cooling import cooling_need
from .latent import latent_summary
from .materials import material_results
from .models import FORMULA_REFERENCES, MONTHS, formula_metadata, round_trip_json
from .transmission import monthly_transmission, total_heat_transfer
from .ventilation import monthly_ventilation, ventilation_coefficient


def read_fixture(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _month_by_id(months: list[dict]) -> list[dict]:
    by_id = {month["month"]: month for month in months}
    return [by_id[month] for month in MONTHS]


def _heating_utilization(fixture: dict, htr_w_k: float, hve_w_k: float) -> dict:
    utilization = fixture["utilization"]
    return {
        "effective_internal_heat_capacity_j_k": utilization["effective_internal_heat_capacity_j_k"],
        "total_heat_transfer_coefficient_w_k": htr_w_k + hve_w_k,
        "a_h0": utilization.get("a_h0", 1.0),
        "tau_h0": utilization.get("tau_h0", 15.0),
    }


def _cooling_utilization(fixture: dict, htr_w_k: float, hve_w_k: float) -> dict:
    utilization = fixture["utilization"]
    return {
        "effective_internal_heat_capacity_j_k": utilization["effective_internal_heat_capacity_j_k"],
        "total_heat_transfer_coefficient_w_k": htr_w_k + hve_w_k,
        "a_c0": utilization.get("a_c0", 1.0),
        "tau_c0": utilization.get("tau_c0", 15.0),
    }


def calculate_building(fixture: dict[str, Any], engine: str = "python_reference") -> dict[str, Any]:
    input_findings = validate_full_fixture(fixture)
    materials = material_results(fixture["materials"])
    assemblies = assembly_results(fixture["assemblies"], materials)
    envelope = calculate_envelope(fixture["envelope"], assemblies)
    htr = envelope["htr_w_k"]
    monthly_results: list[dict] = []

    for month in _month_by_id(fixture["monthly"]):
        month_id = month["month"]
        hours = float(month["duration_hours"])
        outdoor = float(month["outdoor_temperature_c"])
        ventilation = month["ventilation"]
        hve = ventilation_coefficient(ventilation)
        gains = monthly_gains(month)

        heating_applicable = bool(month.get("heating", {}).get("applicable", True))
        heating_indoor = float(month["heating_indoor_temperature_c"])
        qtr_h = monthly_transmission(htr, heating_indoor, outdoor, hours)
        qve_h = monthly_ventilation(hve, heating_indoor, outdoor, hours)
        qhht = max(0.0, total_heat_transfer(qtr_h, qve_h)) if heating_applicable else 0.0
        h_result = heating_need(qhht, gains["qgn_kwh"], _heating_utilization(fixture, htr, hve))

        cooling_applicable = bool(month.get("cooling", {}).get("applicable", False))
        cooling_indoor = float(month["cooling_indoor_temperature_c"])
        qtr_c_signed = monthly_transmission(htr, cooling_indoor, outdoor, hours)
        qve_c_signed = monthly_ventilation(hve, cooling_indoor, outdoor, hours)
        qcht = max(0.0, -(qtr_c_signed + qve_c_signed)) if cooling_applicable else 0.0
        a_cred = float(month.get("cooling", {}).get("a_cred", fixture["utilization"].get("a_cred", 1.0)))
        c_result = cooling_need(qcht, gains["qgn_kwh"], _cooling_utilization(fixture, htr, hve), a_cred)

        monthly_results.append({
            "month": month_id,
            "duration_hours": hours,
            "outdoor_temperature_c": outdoor,
            "heating_indoor_temperature_c": heating_indoor,
            "cooling_indoor_temperature_c": cooling_indoor,
            "heating_applicable": heating_applicable,
            "cooling_applicable": cooling_applicable,
            "hve_w_k": hve,
            "qtr_heating_kwh": qtr_h,
            "qve_heating_kwh": qve_h,
            "qht_heating_kwh": qhht,
            "qtr_cooling_signed_kwh": qtr_c_signed,
            "qve_cooling_signed_kwh": qve_c_signed,
            "qct_transfer_kwh": qcht,
            **gains,
            **h_result,
            **c_result,
        })

    result = {
        "schema": "p3v.normalized.v1",
        "engine": engine,
        "fixture": {
            "fixture_id": fixture["fixture_id"],
            "description": fixture["description"],
            "fixture_status": fixture["fixture_status"],
            "profile_provenance": fixture["profile_provenance"],
        },
        "materials": materials,
        "assemblies": assemblies,
        "envelope": envelope,
        "monthly": monthly_results,
        "annual": {
            "q_hnd_kwh": annual_sum(monthly_results, "q_hnd_kwh"),
            "q_cnd_kwh": annual_sum(monthly_results, "q_cnd_kwh"),
        },
        "latent": latent_summary(),
        "units": {
            "lambda": "W/(m*K)",
            "resistance": "m2*K/W",
            "u_value": "W/(m2*K)",
            "heat_transfer_coefficient": "W/K",
            "monthly_energy": "kWh",
            "annual_energy": "kWh/year",
        },
        "formulas": formula_metadata(*FORMULA_REFERENCES.keys()),
        "diagnostics": {
            "input_findings": input_findings,
            "hidden_input_findings": [],
            "status": "PASS" if not input_findings else "FAIL",
        },
    }
    output_findings = validate_hidden_output_patterns(result)
    result["diagnostics"]["hidden_input_findings"] = output_findings
    if output_findings:
        result["diagnostics"]["status"] = "FAIL"
    return round_trip_json(result)


def calculate_fixture_file(path: str | Path, engine: str = "python_reference") -> dict[str, Any]:
    return calculate_building(read_fixture(path), engine=engine)

