"""Useful cooling demand reference implementation."""

from __future__ import annotations

from .heating import GAMMA_EQUALITY_TOLERANCE, time_constant_hours
from .models import ensure_positive


def cooling_parameter_a(tau_c: float, a_c0: float, tau_c0: float) -> float:
    return float(a_c0) + ensure_positive(tau_c, "tau_c") / ensure_positive(tau_c0, "tau_c0")


def eta_cht(gamma_c: float, a_c: float) -> dict:
    if gamma_c <= 0:
        return {
            "eta_cht": 1.0,
            "eta_branch": "gammaC_less_or_equal_zero",
        }
    if abs(gamma_c - 1.0) <= GAMMA_EQUALITY_TOLERANCE:
        return {
            "eta_cht": float(a_c) / (float(a_c) + 1.0),
            "eta_branch": "gammaC_equals_one",
        }
    return {
        "eta_cht": (1.0 - gamma_c ** (-a_c)) / (1.0 - gamma_c ** (-(a_c + 1.0))),
        "eta_branch": "gammaC_not_equal_one",
    }


def cooling_need(qcht_kwh: float, qcgn_kwh: float, utilization: dict, a_cred: float) -> dict:
    qcht = float(qcht_kwh)
    qcgn = float(qcgn_kwh)
    if qcht <= 0:
        return {
            "gamma_c": None,
            "tau_c": None,
            "a_c": None,
            "eta_cht": None,
            "a_cred": float(a_cred),
            "q_cnd_kwh": 0.0,
            "cooling_branch": "cooling_not_applicable_or_no_positive_cooling_transfer",
        }
    gamma_c = qcgn / qcht
    if gamma_c <= 0:
        return {
            "gamma_c": gamma_c,
            "tau_c": None,
            "a_c": None,
            "eta_cht": None,
            "a_cred": float(a_cred),
            "q_cnd_kwh": 0.0,
            "cooling_branch": "gammaC_less_or_equal_zero_zero_demand",
        }
    if (1.0 / gamma_c) > 2.0:
        return {
            "gamma_c": gamma_c,
            "tau_c": None,
            "a_c": None,
            "eta_cht": None,
            "a_cred": float(a_cred),
            "q_cnd_kwh": 0.0,
            "cooling_branch": "inverse_gammaC_greater_than_two_zero_demand",
        }
    tau_c = time_constant_hours(
        utilization["effective_internal_heat_capacity_j_k"],
        utilization["total_heat_transfer_coefficient_w_k"],
    )
    a_c = cooling_parameter_a(tau_c, utilization["a_c0"], utilization["tau_c0"])
    eta = eta_cht(gamma_c, a_c)
    q_cnd = float(a_cred) * (qcgn - eta["eta_cht"] * qcht)
    if q_cnd < -1e-9:
        raise ValueError("negative QCnd outside selected validation branch")
    return {
        "gamma_c": gamma_c,
        "tau_c": tau_c,
        "a_c": a_c,
        "eta_cht": eta["eta_cht"],
        "eta_cht_branch": eta["eta_branch"],
        "a_cred": float(a_cred),
        "q_cnd_kwh": max(0.0, q_cnd),
        "cooling_branch": "figure_2_19_cooling_utilized_transfer_branch",
    }


def long_unoccupied_cooling(q_occupied: float, q_unoccupied: float, fraction: float) -> float:
    if not 0 <= fraction <= 1:
        raise ValueError("unoccupied fraction must be between 0 and 1")
    return (1.0 - fraction) * float(q_occupied) + fraction * float(q_unoccupied)
