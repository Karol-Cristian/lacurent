"""Chapter 3 heating formulas exposed from the independent Python kernel."""

from __future__ import annotations

from .._p3v_kernel import ensure_p3v_path

ensure_p3v_path()

from mc001_reference.chapter3_heating import *  # noqa: F403,E402


def heating_generator_operation_time(
    heatingUseHours: float,
    heatingLoadFactor: float,
    coolingUseHours: float,
    coolingLoadFactor: float,
    ventilationUseHours: float,
    ventilationLoadFactor: float,
    dhwUseHours: float,
    dhwLoadFactor: float,
) -> float:
    return (
        heatingUseHours * heatingLoadFactor
        - coolingUseHours * coolingLoadFactor
        - ventilationUseHours * ventilationLoadFactor
        - dhwUseHours * dhwLoadFactor
    )
