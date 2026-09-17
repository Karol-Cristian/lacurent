from __future__ import annotations

import pytest

from commercial.app.engine import calculate
from commercial.app.main import build_input_from_form
from commercial.app.pricing import estimate_energy_cost


def simple_form(heating_choice: str) -> dict[str, str]:
    return {
        "project_name": "Test cost",
        "locality": "Cluj-Napoca",
        "building_type": "residential_individual",
        "building_length_m": "10",
        "building_width_m": "8",
        "heated_levels": "2",
        "average_height_m": "2.7",
        "house_window_area_m2": "20",
        "house_door_area_m2": "2.2",
        "insulation_profile": "average",
        "ventilation_type": "natural",
        "heating_choice": heating_choice,
        "cooling_seer": "3.5",
        "cooling_setpoint_c": "26",
        "dhw_enabled": "on",
        "dhw_occupants": "3",
        "dhw_litres_per_person_day_at_60c": "50",
        "dhw_efficiency": "0.86",
        "indoor_design_temperature_c": "20",
        "solar_gains_kwh_m2_month": "0",
    }


def test_heat_pump_cost_uses_final_electricity_after_scop() -> None:
    building = build_input_from_form(simple_form("heat_pump"))
    result = calculate(building)
    estimate = estimate_energy_cost(result)
    electricity = next(row for row in estimate["rows"] if row["carrier"] == "electricity")

    assert result.heating.final_kwh == pytest.approx(result.heating.useful_kwh / 3.2, abs=0.01)
    assert electricity["final_kwh"] == pytest.approx(result.final_energy_by_carrier["electricity"], abs=0.01)
    assert electricity["annual_cost_lei"] == pytest.approx(
        electricity["final_kwh"] * electricity["unit_price_lei_per_kwh"], abs=0.01
    )
    assert electricity["unit_price_lei_per_kwh"] == pytest.approx(1.27284)


def test_firewood_cost_uses_romsilva_reference_with_consumer_multiplier() -> None:
    building = build_input_from_form(simple_form("wood_stove"))
    result = calculate(building)
    estimate = estimate_energy_cost(result)
    wood = next(row for row in estimate["rows"] if row["carrier"] == "biomass")

    assert building.heating.cost_profile == "firewood"
    assert wood["label"] == "Lemn de foc"
    assert wood["annual_cost_lei"] > 0
    assert wood["estimated_volume_m3"] == pytest.approx(
        wood["final_kwh"] / wood["energy_kwh_per_m3"], abs=0.01
    )
    assert wood["base_price_lei_per_m3"] == pytest.approx(300.0)
    assert wood["consumer_cost_multiplier"] == pytest.approx(2.0)
    assert wood["price_lei_per_m3"] == pytest.approx(600.0)
    assert wood["unit_price_lei_per_kwh"] == pytest.approx(600.0 / 2821.0)
    assert "Romsilva 300 lei/m³" in wood["basis"]
    assert "estimare consumator ×2.0 = 600 lei/m³" in wood["basis"]
    assert "nu reprezintă un preț oficial Romsilva" in wood["consumer_cost_multiplier_note"]


def test_pellet_profile_is_not_assigned_an_invented_national_retail_price() -> None:
    building = build_input_from_form(simple_form("pellet_boiler"))
    result = calculate(building)
    estimate = estimate_energy_cost(result)

    assert building.heating.cost_profile == "pellets"
    assert not any(row["carrier"] == "biomass" for row in estimate["rows"])
    assert any("Peleți" in note for note in estimate["unpriced_notes"])


def test_service_costs_reconcile_with_annual_priced_total() -> None:
    building = build_input_from_form(simple_form("heat_pump"))
    result = calculate(building)
    estimate = estimate_energy_cost(result)

    assert [row["service"] for row in estimate["service_rows"]] == ["heating", "cooling", "dhw"]
    service_total = sum(float(row["annual_cost_lei"] or 0) for row in estimate["service_rows"])
    assert service_total == pytest.approx(estimate["priced_total_lei"], abs=0.01)
    assert estimate["average_monthly_priced_lei"] == pytest.approx(estimate["priced_total_lei"] / 12, abs=0.01)


def test_monthly_costs_reconcile_with_annual_and_follow_heating_profile() -> None:
    building = build_input_from_form(simple_form("heat_pump"))
    result = calculate(building)
    estimate = estimate_energy_cost(result)

    assert len(estimate["monthly_rows"]) == 12
    monthly_total = sum(row["priced_total_lei"] for row in estimate["monthly_rows"])
    assert monthly_total == pytest.approx(estimate["priced_total_lei"], abs=0.01)

    by_month = {row["month"]: row for row in estimate["monthly_rows"]}
    assert by_month["ian"]["cost_lei_by_service"]["heating"] > by_month["iul"]["cost_lei_by_service"]["heating"]

    dhw_annual = next(row for row in estimate["service_rows"] if row["service"] == "dhw")["annual_cost_lei"]
    dhw_monthly = sum(row["cost_lei_by_service"]["dhw"] or 0 for row in estimate["monthly_rows"])
    assert dhw_monthly == pytest.approx(dhw_annual, abs=0.01)


def test_cooling_cost_is_priced_as_electricity_when_enabled() -> None:
    form = simple_form("condensing_gas_boiler")
    form["cooling_enabled"] = "on"
    building = build_input_from_form(form)
    result = calculate(building)
    estimate = estimate_energy_cost(result)
    cooling = next(row for row in estimate["service_rows"] if row["service"] == "cooling")

    assert cooling["carrier"] == "electricity"
    assert cooling["unit_price_lei_per_kwh"] == pytest.approx(1.27284)
    assert cooling["annual_cost_lei"] == pytest.approx(
        cooling["final_kwh"] * cooling["unit_price_lei_per_kwh"], abs=0.01
    )
