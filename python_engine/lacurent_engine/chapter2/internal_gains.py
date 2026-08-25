"""Chapter 2 internal gains helpers."""

from __future__ import annotations

from ..core.units import non_negative


def monthly_internal_gains_kwh(power_w_per_m2: float, area_m2: float, hours: float) -> float:
    return non_negative(power_w_per_m2, "power_w_per_m2") * non_negative(area_m2, "area_m2") * non_negative(hours, "hours") / 1000
