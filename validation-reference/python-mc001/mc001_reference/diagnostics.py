"""Input and output diagnostics for P3V fixtures."""

from __future__ import annotations

from .models import MONTHS


def validate_full_fixture(fixture: dict) -> list[dict]:
    findings: list[dict] = []
    if fixture.get("fixture_status") != "full_reference_building":
        findings.append({"code": "not_full_reference_building", "severity": "blocking"})
    provenance = fixture.get("profile_provenance")
    if not isinstance(provenance, dict) or not provenance.get("source_type"):
        findings.append({"code": "missing_climate_profile_provenance", "severity": "blocking"})
    if provenance and provenance.get("source_type") == "demo_fixture":
        findings.append({"code": "implicit_demo_fallback", "severity": "blocking"})
    if provenance and provenance.get("source_type") == "synthetic_validation_profile":
        if provenance.get("represented_as_official_climate_data") is True:
            findings.append({"code": "synthetic_profile_claims_official_status", "severity": "blocking"})

    months = fixture.get("monthly", [])
    if len(months) != 12:
        findings.append({"code": "monthly_profile_not_12_months", "severity": "blocking"})
    seen = [month.get("month") for month in months]
    if sorted(seen) != sorted(MONTHS):
        findings.append({"code": "monthly_profile_missing_or_duplicate_month", "severity": "blocking"})

    solar_values = [float(month.get("solar_gains_kwh", 0)) for month in months]
    for index in range(1, len(solar_values) - 1):
        previous_value = solar_values[index - 1]
        next_value = solar_values[index + 1]
        current = solar_values[index]
        if previous_value > 0 and next_value > 0 and current > 2.75 * max(previous_value, next_value):
            findings.append({
                "code": "isolated_extreme_gain_month",
                "severity": "blocking",
                "month": months[index].get("month"),
            })
    return findings


def validate_hidden_output_patterns(result: dict) -> list[dict]:
    findings: list[dict] = []
    monthly = result.get("monthly", [])
    unequal_duration = len({month["duration_hours"] for month in monthly}) > 1
    if unequal_duration:
        qtr_values = [round(month["qtr_heating_kwh"], 9) for month in monthly]
        qve_values = [round(month["qve_heating_kwh"], 9) for month in monthly]
        if len(set(qtr_values)) == 1:
            findings.append({"code": "identical_qtr_across_unequal_duration_months", "severity": "blocking"})
        if len(set(qve_values)) == 1:
            findings.append({"code": "identical_qve_across_unequal_duration_months", "severity": "blocking"})
    for month in monthly:
        if month["heating_applicable"] and month["q_hnd_kwh"] > 0:
            for key in ("gamma_h", "tau_h", "a_h", "eta_hgn"):
                if month.get(key) is None:
                    findings.append({
                        "code": "missing_heating_audit_intermediate",
                        "severity": "blocking",
                        "month": month["month"],
                        "field": key,
                    })
        if month["cooling_applicable"] and month["q_cnd_kwh"] > 0:
            for key in ("gamma_c", "tau_c", "a_c", "eta_cht"):
                if month.get(key) is None:
                    findings.append({
                        "code": "missing_cooling_audit_intermediate",
                        "severity": "blocking",
                        "month": month["month"],
                        "field": key,
                    })
    return findings

