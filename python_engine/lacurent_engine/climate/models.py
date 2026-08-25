"""Climate data models consumed by the Python engine."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MonthlyClimate:
    month: str
    duration_hours: float
    outdoor_temperature_c: float
    hsol_kwh_m2: dict[str, float] | None = None
