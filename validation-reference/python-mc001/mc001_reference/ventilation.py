"""Ventilation heat-transfer calculations."""

from __future__ import annotations

from .models import ensure_non_negative, ensure_positive


def ventilation_coefficient(ventilation: dict) -> float:
    air_heat_capacity = ensure_positive(
        ventilation["air_heat_capacity_j_m3k"], "air_heat_capacity_j_m3k"
    )
    airflow = ensure_non_negative(ventilation["airflow_m3s"], "airflow_m3s")
    bve = float(ventilation.get("bve", 1.0))
    fve_dyn = ensure_non_negative(ventilation.get("fve_dyn", 1.0), "fve_dyn")
    return air_heat_capacity * airflow * bve * fve_dyn


def monthly_ventilation(hve_w_k: float, indoor_c: float, outdoor_c: float, hours: float) -> float:
    duration = ensure_positive(hours, "duration_hours")
    return float(hve_w_k) * (float(indoor_c) - float(outdoor_c)) * duration / 1000.0

