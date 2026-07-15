"""Shared constants and lightweight helpers for the P3V reference calculator."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


MONTHS = (
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
)


FORMULA_REFERENCES: dict[str, dict[str, str]] = {
    "design_lambda": {
        "source": "MC001-2022 2.1.4, relation (2.3)",
        "unit": "W/(m*K)",
        "formula": "lambda = a * lambda_normat",
    },
    "layer_resistance": {
        "source": "MC001-2022 2.4.1 thermal resistance method",
        "unit": "m2*K/W",
        "formula": "Rj = dj / lambda_j",
    },
    "assembly_resistance": {
        "source": "MC001-2022 2.4.1, relation (2.6)",
        "unit": "m2*K/W",
        "formula": "R = Rsi + sum(Rj) + sum(Ra) + Rse",
    },
    "u_value": {
        "source": "MC001-2022 2.4.1, relation (2.7)",
        "unit": "W/(m2*K)",
        "formula": "U = 1 / R",
    },
    "direct_transmission": {
        "source": "MC001-2022 2.4.1, relation (2.11)",
        "unit": "W/K",
        "formula": "Hd = sum(Uj * Aj) + sum(psi_k * l_k) + sum(chi_j)",
    },
    "htr": {
        "source": "MC001-2022 2.4.1, relation (2.15)",
        "unit": "W/K",
        "formula": "Htr = Hd + Hg + Hu + Ha",
    },
    "monthly_transmission": {
        "source": "MC001-2022 2.4.1 relation (2.14), time integrated for current explicit runtime path",
        "unit": "kWh",
        "formula": "Qtr = Htr * (theta_i - theta_e) * hours / 1000",
    },
    "hve": {
        "source": "MC001-2022 2.7.1.2, relation (2.30)",
        "unit": "W/K",
        "formula": "Hve = ca_air_volume * sum(qv * bve * fve_dyn)",
    },
    "monthly_ventilation": {
        "source": "MC001-2022 2.7.1.2, relation (2.29)",
        "unit": "kWh",
        "formula": "Qve = Hve * (theta_i - theta_e) * hours / 1000",
    },
    "monthly_gains": {
        "source": "MC001-2022 2.7.2 Figure 2.13; 2.7.2/2.7.3 relations (2.34), (2.37)",
        "unit": "kWh",
        "formula": "Qgn = Qint + Qsol, with explicit adjacent unconditioned-zone gain terms when supplied",
    },
    "tau_h": {
        "source": "MC001-2022 relation (2.57)",
        "unit": "h",
        "formula": "tauH = (Cm_eff / 3600) / (Htr + Hve)",
    },
    "a_h": {
        "source": "MC001-2022 relation (2.55)",
        "unit": "-",
        "formula": "aH = aH0 + tauH / tauH0",
    },
    "eta_hgn": {
        "source": "MC001-2022 Figure 2.14",
        "unit": "-",
        "formula": "etaHgn = (1 - gammaH^aH) / (1 - gammaH^(aH + 1)); gammaH=1 branch aH/(aH+1)",
    },
    "qhnd": {
        "source": "MC001-2022 2.8.1 Figure 2.18",
        "unit": "kWh",
        "formula": "QHnd = 0 for gammaH <= 0 with gains or gammaH > 2; otherwise QHht - etaHgn * QHgn",
    },
    "tau_c": {
        "source": "MC001-2022 relation (2.58)",
        "unit": "h",
        "formula": "tauC = (Cm_eff / 3600) / (Htr + Hve)",
    },
    "a_c": {
        "source": "MC001-2022 relation (2.56)",
        "unit": "-",
        "formula": "aC = aC0 + tauC / tauC0",
    },
    "eta_cht": {
        "source": "MC001-2022 Figure 2.15",
        "unit": "-",
        "formula": "etaCht = (1 - gammaC^(-aC)) / (1 - gammaC^(-(aC + 1))); gammaC=1 branch aC/(aC+1)",
    },
    "qcnd": {
        "source": "MC001-2022 2.8.1 Figure 2.19",
        "unit": "kWh",
        "formula": "QCnd = 0 for 1/gammaC > 2; otherwise aCred * (QCgn - etaCht * QCht)",
    },
    "annual_sums": {
        "source": "MC001-2022 2.10, relations (2.84), (2.85)",
        "unit": "kWh/year",
        "formula": "annual demand = sum of 12 monthly demands",
    },
}


@dataclass(frozen=True)
class QuantityClass:
    absolute_tolerance: float
    relative_tolerance: float


TOLERANCE_POLICY: dict[str, QuantityClass] = {
    "identifier": QuantityClass(0.0, 0.0),
    "lambda_w_mk": QuantityClass(1e-12, 1e-12),
    "resistance_m2k_w": QuantityClass(1e-12, 1e-12),
    "u_value_w_m2k": QuantityClass(1e-12, 1e-12),
    "coefficient_w_k": QuantityClass(1e-10, 1e-12),
    "energy_kwh": QuantityClass(1e-7, 1e-10),
    "ratio": QuantityClass(1e-12, 1e-12),
    "temperature_c": QuantityClass(1e-12, 1e-12),
}


def ensure_number(value: Any, name: str) -> float:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValueError(f"{name} must be numeric")
    number = float(value)
    if number != number or number in (float("inf"), float("-inf")):
        raise ValueError(f"{name} must be finite")
    return number


def ensure_positive(value: Any, name: str) -> float:
    number = ensure_number(value, name)
    if number <= 0:
        raise ValueError(f"{name} must be positive")
    return number


def ensure_non_negative(value: Any, name: str) -> float:
    number = ensure_number(value, name)
    if number < 0:
        raise ValueError(f"{name} must be non-negative")
    return number


def formula_metadata(*keys: str) -> dict[str, dict[str, str]]:
    return {key: FORMULA_REFERENCES[key] for key in keys}


def round_trip_json(value: Any) -> Any:
    """Return a JSON-compatible deep copy without importing production code."""
    import json

    return json.loads(json.dumps(value, sort_keys=True))

