from __future__ import annotations

import pytest

from commercial.app.impact import normalize_impact_payload, public_impact_summary


def test_normalize_impact_payload_derives_savings_and_payback_server_side():
    row = normalize_impact_payload(
        {
            "projectId": "house-1",
            "projectName": "Casa mea",
            "baseline": {
                "finalEnergyKwh": 20000,
                "annualCostLei": 12000,
                "co2KgYear": 5000,
            },
            "optimized": {
                "finalEnergyKwh": 12000,
                "annualCostLei": 7000,
                "capexLei": 25000,
                "co2KgYear": 3000,
            },
        }
    )

    assert row["potential_saving_kwh_year"] == pytest.approx(8000)
    assert row["potential_saving_lei_year"] == pytest.approx(5000)
    assert row["estimated_capex_lei"] == pytest.approx(25000)
    assert row["simple_payback_years"] == pytest.approx(5)
    assert row["potential_co2_reduction_kg_year"] == pytest.approx(2000)
    assert row["data_quality"] == "user_saved_modelled"


def test_public_impact_summary_uses_portfolio_payback_not_average_house_payback():
    summary = public_impact_summary(
        {
            "saved_houses": 30,
            "baseline_final_energy_kwh": 100000,
            "optimized_final_energy_kwh": 70000,
            "potential_saving_kwh_year": 30000,
            "potential_saving_lei_year": 20000,
            "estimated_capex_lei": 90000,
            "potential_co2_reduction_kg_year": 6000,
        }
    )

    assert summary["savedHouses"] == 30
    assert summary["potentialReductionPercent"] == pytest.approx(30)
    assert summary["globalSimplePaybackYears"] == pytest.approx(4.5)
    assert summary["method"]["globalPayback"] == "sum_capex_divided_by_sum_annual_saving"
    assert summary["method"]["measuredImpact"] is False


def test_impact_payload_rejects_negative_or_missing_physical_totals():
    with pytest.raises(ValueError):
        normalize_impact_payload(
            {
                "projectId": "bad",
                "baseline": {"finalEnergyKwh": -1, "annualCostLei": 100},
                "optimized": {"finalEnergyKwh": 10, "annualCostLei": 90, "capexLei": 1000},
            }
        )


def test_public_impact_summary_suppresses_small_cohorts():
    summary = public_impact_summary(
        {
            "saved_houses": 3,
            "baseline_final_energy_kwh": 100000,
            "optimized_final_energy_kwh": 70000,
            "potential_saving_kwh_year": 30000,
            "potential_saving_lei_year": 20000,
            "estimated_capex_lei": 90000,
            "potential_co2_reduction_kg_year": 6000,
        }
    )

    assert summary["available"] is True
    assert summary["suppressed"] is True
    assert summary["minimumCohortSize"] == 10
    assert "potentialSavingKwhYear" not in summary
    assert summary["method"]["measuredImpact"] is False
