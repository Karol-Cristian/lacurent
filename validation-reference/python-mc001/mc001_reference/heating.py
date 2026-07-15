"""Useful heating demand reference implementation."""

from __future__ import annotations

from .models import ensure_positive

GAMMA_EQUALITY_TOLERANCE = 1e-12


def time_constant_hours(capacity_j_k: float, transfer_w_k: float) -> float:
    return (ensure_positive(capacity_j_k, "effective_internal_heat_capacity_j_k") / 3600.0) / ensure_positive(
        transfer_w_k, "total_heat_transfer_coefficient_w_k"
    )


def heating_parameter_a(tau_h: float, a_h0: float, tau_h0: float) -> float:
    return float(a_h0) + ensure_positive(tau_h, "tau_h") / ensure_positive(tau_h0, "tau_h0")


def eta_hgn(gamma_h: float, a_h: float) -> dict:
    if abs(gamma_h - 1.0) <= GAMMA_EQUALITY_TOLERANCE:
        return {
            "eta_hgn": float(a_h) / (float(a_h) + 1.0),
            "eta_branch": "gammaH_equals_one",
        }
    return {
        "eta_hgn": (1.0 - gamma_h ** a_h) / (1.0 - gamma_h ** (a_h + 1.0)),
        "eta_branch": "gammaH_not_equal_one",
    }


def heating_need(qhht_kwh: float, qhgn_kwh: float, utilization: dict) -> dict:
    qhht = float(qhht_kwh)
    qhgn = float(qhgn_kwh)
    if qhht <= 0:
        return {
            "gamma_h": None,
            "tau_h": None,
            "a_h": None,
            "eta_hgn": None,
            "q_hnd_kwh": 0.0,
            "heating_branch": "heating_not_applicable_or_no_positive_transfer",
        }
    gamma_h = qhgn / qhht
    if gamma_h <= 0 and qhgn > 0:
        return {
            "gamma_h": gamma_h,
            "tau_h": None,
            "a_h": None,
            "eta_hgn": None,
            "q_hnd_kwh": 0.0,
            "heating_branch": "gammaH_less_or_equal_zero_positive_gains_zero_demand",
        }
    if gamma_h <= 0:
        raise ValueError("gammaH must be positive unless positive gains zero-demand branch applies")
    if gamma_h > 2.0:
        return {
            "gamma_h": gamma_h,
            "tau_h": None,
            "a_h": None,
            "eta_hgn": None,
            "q_hnd_kwh": 0.0,
            "heating_branch": "gammaH_greater_than_two_zero_demand",
        }
    tau_h = time_constant_hours(
        utilization["effective_internal_heat_capacity_j_k"],
        utilization["total_heat_transfer_coefficient_w_k"],
    )
    a_h = heating_parameter_a(tau_h, utilization["a_h0"], utilization["tau_h0"])
    eta = eta_hgn(gamma_h, a_h)
    q_hnd = qhht - eta["eta_hgn"] * qhgn
    if q_hnd < -1e-9:
        raise ValueError("negative QHnd outside selected validation branch")
    return {
        "gamma_h": gamma_h,
        "tau_h": tau_h,
        "a_h": a_h,
        "eta_hgn": eta["eta_hgn"],
        "eta_hgn_branch": eta["eta_branch"],
        "q_hnd_kwh": max(0.0, q_hnd),
        "heating_branch": "figure_2_18_standard_balance",
    }


def long_unoccupied_heating(q_occupied: float, q_unoccupied: float, fraction: float) -> float:
    if not 0 <= fraction <= 1:
        raise ValueError("unoccupied fraction must be between 0 and 1")
    return (1.0 - fraction) * float(q_occupied) + fraction * float(q_unoccupied)

