from __future__ import annotations

from time import perf_counter
from typing import Any

import numpy as np
import pandas as pd

from .methodology import carrier_factors
from .vendor.pybuildingenergy_core import (
    PBE_UPSTREAM_PRIMARY_ENERGY_BLOB,
    PBE_UPSTREAM_VERSION,
)
from .vendor.pybuildingenergy_core.primary_energy_52000_1 import (
    PrimaryEnergyAccountingCalculator,
)


def _pbe_input_for_carriers(carrier_totals: dict[str, float]) -> tuple[dict[str, Any], dict[str, float]]:
    carriers = sorted(str(carrier) for carrier in carrier_totals)
    factors: dict[str, dict[str, float]] = {}
    aliases: dict[str, list[str]] = {}
    annual: dict[str, float] = {}

    for carrier in carriers:
        factor = carrier_factors(carrier)
        factors[carrier] = {
            # In this compatibility PoC the Romanian MC001 total primary-energy
            # factor is intentionally mapped to PBE's non-renewable slot.
            # This keeps the numerical comparison apples-to-apples while proving
            # the upstream accounting code can execute inside the Worker.
            "nonrenewable": float(factor["primary_energy_factor"]),
            "renewable": 0.0,
        }
        column = f"E_delivered_{carrier}_kWh"
        aliases[carrier] = [column]
        annual[column] = float(carrier_totals[carrier])

    config = {
        "carriers": carriers,
        "primary_energy_factors": factors,
        "carrier_aliases": aliases,
        "export_credit_method": "none",
    }
    return config, annual


def pbe_primary_energy_from_carriers(
    carrier_totals: dict[str, float],
    *,
    area_m2: float,
) -> dict[str, Any]:
    if area_m2 <= 0:
        raise ValueError("area_m2 must be positive.")

    config, annual = _pbe_input_for_carriers(carrier_totals)
    started = perf_counter()
    result = PrimaryEnergyAccountingCalculator(config).run_annual(annual)
    elapsed_ms = (perf_counter() - started) * 1000.0
    total = float(result.summary["PE_net_total_kWh"])

    return {
        "engine": "pyBuildingEnergy-vendored-primary-energy",
        "upstream_version": PBE_UPSTREAM_VERSION,
        "upstream_primary_energy_blob": PBE_UPSTREAM_PRIMARY_ENERGY_BLOB,
        "elapsed_ms": round(elapsed_ms, 3),
        "primary_energy_total_kwh": round(total, 6),
        "primary_energy_specific_kwh_m2": round(total / float(area_m2), 6),
        "delivered_energy_by_carrier_kwh": {
            carrier: round(float(value), 6)
            for carrier, value in carrier_totals.items()
        },
        "summary": {
            key: (None if not np.isfinite(value) else round(float(value), 6))
            for key, value in result.summary.items()
        },
    }


def compare_calculation_result(result: Any) -> dict[str, Any]:
    pbe = pbe_primary_energy_from_carriers(
        {
            str(carrier): float(value)
            for carrier, value in result.final_energy_by_carrier.items()
        },
        area_m2=float(result.input.heated_floor_area_m2),
    )
    current_total = float(result.primary_energy.total_kwh)
    pbe_total = float(pbe["primary_energy_total_kwh"])
    delta = pbe_total - current_total
    return {
        "status": "ok",
        "scope": (
            "Cloudflare compatibility PoC only. Building physics still comes "
            "from the current LaCurent engine; the vendored PBE module performs "
            "ISO 52000-style carrier accounting with Romanian MC001 factors."
        ),
        "current_engine": {
            "primary_energy_total_kwh": round(current_total, 6),
            "primary_energy_specific_kwh_m2": round(
                float(result.primary_energy.specific_kwh_m2), 6
            ),
            "final_energy_by_carrier_kwh": {
                str(carrier): round(float(value), 6)
                for carrier, value in result.final_energy_by_carrier.items()
            },
        },
        "pbe": pbe,
        "comparison": {
            "delta_primary_energy_kwh": round(delta, 6),
            "absolute_delta_kwh": round(abs(delta), 6),
            "matches_current_accounting": abs(delta) <= 0.01,
        },
    }


def runtime_probe() -> dict[str, Any]:
    started = perf_counter()
    probe = pbe_primary_energy_from_carriers(
        {"natural_gas": 1000.0, "electricity": 500.0},
        area_m2=100.0,
    )
    total_ms = (perf_counter() - started) * 1000.0
    return {
        "status": "ok",
        "numpy_version": np.__version__,
        "pandas_version": pd.__version__,
        "pbe_upstream_version": PBE_UPSTREAM_VERSION,
        "pbe_upstream_primary_energy_blob": PBE_UPSTREAM_PRIMARY_ENERGY_BLOB,
        "probe_elapsed_ms": round(total_ms, 3),
        "probe_primary_energy_kwh": probe["primary_energy_total_kwh"],
    }
