"""Chapter 3 AHU/ventilation formulas exposed from the independent Python kernel."""

from __future__ import annotations

from .._p3v_kernel import ensure_p3v_path

ensure_p3v_path()

from mc001_reference.chapter3_ventilation import *  # noqa: F403,E402


def ahu_generation_loss_unconditioned_kwh(
    supply_au_kw_k: float,
    supply_temperature_c: float,
    extract_au_kw_k: float,
    extract_temperature_c: float,
    surrounding_temperature_c: float,
    supply_leakage_m3_h: float,
    extract_leakage_m3_h: float,
    air_density_kg_m3: float,
    air_specific_heat_kj_kgk: float,
    calculation_hours: float,
) -> float:
    conductive = (
        supply_au_kw_k * (supply_temperature_c - surrounding_temperature_c)
        + extract_au_kw_k * (extract_temperature_c - surrounding_temperature_c)
    )
    leakage = (
        supply_leakage_m3_h * (supply_temperature_c - surrounding_temperature_c)
        + extract_leakage_m3_h * (extract_temperature_c - surrounding_temperature_c)
    ) * air_density_kg_m3 * air_specific_heat_kj_kgk / 3600
    return (conductive + leakage) * calculation_hours
