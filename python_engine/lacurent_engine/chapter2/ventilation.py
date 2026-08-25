"""Pure Chapter 2 ventilation helpers."""

from __future__ import annotations

from ..core.units import finite_number


def ventilation_coefficient_w_k(air_heat_capacity_j_m3k: float, airflow_m3s: float, bve: float, fve_dyn: float) -> float:
    return (
        finite_number(air_heat_capacity_j_m3k, "air_heat_capacity_j_m3k")
        * finite_number(airflow_m3s, "airflow_m3s")
        * finite_number(bve, "bve")
        * finite_number(fve_dyn, "fve_dyn")
    )
