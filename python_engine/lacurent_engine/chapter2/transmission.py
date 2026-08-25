"""Pure Chapter 2 transmission helpers."""

from __future__ import annotations

from ..core.units import finite_number


def monthly_transmission_kwh(htr_w_k: float, indoor_c: float, outdoor_c: float, hours: float) -> float:
    return (
        finite_number(htr_w_k, "htr_w_k")
        * (finite_number(indoor_c, "indoor_c") - finite_number(outdoor_c, "outdoor_c"))
        * finite_number(hours, "hours")
        / 1000.0
    )
