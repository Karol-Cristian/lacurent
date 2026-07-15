"""Monthly transmission transfer helpers."""

from __future__ import annotations

from .models import ensure_positive


def monthly_transmission(htr_w_k: float, indoor_c: float, outdoor_c: float, hours: float) -> float:
    duration = ensure_positive(hours, "duration_hours")
    return float(htr_w_k) * (float(indoor_c) - float(outdoor_c)) * duration / 1000.0


def total_heat_transfer(qtr_kwh: float, qve_kwh: float) -> float:
    return float(qtr_kwh) + float(qve_kwh)

