"""Chapter 2 normalization over independent Python calculations."""

from __future__ import annotations

from typing import Any

from ..core.provenance import formula_provenance
from ..core.trace import trace_record


def normalize_chapter2_reference(reference: dict[str, Any]) -> dict[str, Any]:
    monthly = reference.get("monthly", [])
    annual = reference.get("annual", {})
    traces = []
    for month in monthly:
        traces.append(trace_record(
            chapter="2",
            formula_id="MC001_2_84_2_85_ANNUAL_MONTHLY_DEMAND",
            branch_id="p3v_monthly_supported_scope",
            inputs={
                "month": month.get("month"),
                "qHhtKWh": month.get("qht_heating_kwh"),
                "qHgnKWh": month.get("qgn_kwh"),
                "qChtKWh": month.get("qct_transfer_kwh"),
            },
            units={
                "qHhtKWh": "kWh/month",
                "qHgnKWh": "kWh/month",
                "qChtKWh": "kWh/month",
            },
            raw_result={
                "qHndKWh": month.get("q_hnd_kwh"),
                "qCndKWh": month.get("q_cnd_kwh"),
            },
            final_result={
                "qHndKWh": month.get("q_hnd_kwh"),
                "qCndKWh": month.get("q_cnd_kwh"),
            },
            expression="monthly useful demand from independent Chapter 2 P3V formulas",
            provenance=formula_provenance("P3V_CHAPTER2_SUPPORTED_SCOPE", "MC001 Chapter 2 owned formulas"),
        ))
    return {
        "status": "calculated",
        "scope": "chapter2_supported_p3v_reference_path",
        "annual": {
            "qHndKWh": annual.get("q_hnd_kwh"),
            "qCndKWh": annual.get("q_cnd_kwh"),
        },
        "monthly": [
            {
                "month": month.get("month"),
                "qHndKWh": month.get("q_hnd_kwh"),
                "qCndKWh": month.get("q_cnd_kwh"),
                "qHhtKWh": month.get("qht_heating_kwh"),
                "qChtKWh": month.get("qct_transfer_kwh"),
                "qGainsKWh": month.get("qgn_kwh"),
                "solarGainsKWh": month.get("solar_gains_kwh"),
                "internalGainsKWh": month.get("internal_gains_kwh"),
            }
            for month in monthly
        ],
        "envelope": reference.get("envelope", {}),
        "assemblies": reference.get("assemblies", {}),
        "diagnostics": reference.get("diagnostics", {}),
        "executionTrace": traces,
    }
