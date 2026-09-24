from __future__ import annotations

from datetime import date
import math

import pytest

from commercial.app.engine import calculate
from commercial.app.main import build_input_from_form
from commercial.app.pricing import _delivery_cost, _firewood_reference, _price_reference_status, estimate_energy_cost


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


def test_firewood_cost_uses_huedin_pallet_price_and_delivery_per_four_pallets() -> None:
    building = build_input_from_form(simple_form("wood_stove"))
    result = calculate(building)
    estimate = estimate_energy_cost(result)
    wood = next(row for row in estimate["rows"] if row["carrier"] == "biomass")

    assert building.heating.cost_profile == "firewood"
    assert wood["label"] == "Lemn de foc"
    assert wood["source_name"] == "Romsilva Store / DS Cluj - Ocolul Silvic Huedin"
    assert wood["price_lei_per_package"] == pytest.approx(700.0)
    assert wood["reference_volume_m3_per_package"] == pytest.approx(0.8)
    assert wood["price_lei_per_m3"] == pytest.approx(875.0)
    assert wood["delivery_cost_lei_per_batch"] == pytest.approx(200.0)
    assert wood["delivery_batch_size_packages"] == 4
    assert wood["unit_price_lei_per_kwh"] == pytest.approx(875.0 / 2821.0)

    expected_packages = wood["final_kwh"] / wood["energy_kwh_per_package"]
    expected_batches = math.ceil(expected_packages / 4)
    expected_delivery = expected_batches * 200.0
    assert wood["estimated_packages"] == pytest.approx(expected_packages, abs=0.01)
    assert wood["delivery_batches"] == expected_batches
    assert wood["delivery_cost_lei"] == pytest.approx(expected_delivery)
    assert wood["annual_cost_lei"] == pytest.approx(
        wood["final_kwh"] * wood["unit_price_lei_per_kwh"] + expected_delivery, abs=0.01
    )
    assert wood["estimated_volume_m3"] == pytest.approx(
        wood["final_kwh"] / wood["energy_kwh_per_m3"], abs=0.01
    )
    assert "transport 200 lei / max. 4 paleți" in wood["basis"]

    service_total = sum(float(row["annual_cost_lei"] or 0) for row in estimate["service_rows"])
    monthly_total = sum(float(row["priced_total_lei"]) for row in estimate["monthly_rows"])
    assert service_total == pytest.approx(estimate["priced_total_lei"], abs=0.01)
    assert monthly_total == pytest.approx(estimate["priced_total_lei"], abs=0.01)

def test_firewood_delivery_cost_steps_after_each_four_pallets() -> None:
    reference = _firewood_reference()
    pallet_kwh = float(reference["energy_kwh_per_package"])

    four = _delivery_cost(reference, 4 * pallet_kwh)
    over_four = _delivery_cost(reference, 4.001 * pallet_kwh)
    eight = _delivery_cost(reference, 8 * pallet_kwh)
    over_eight = _delivery_cost(reference, 8.001 * pallet_kwh)

    assert four["delivery_batches"] == 1
    assert four["delivery_cost_lei"] == pytest.approx(200.0)
    assert over_four["delivery_batches"] == 2
    assert over_four["delivery_cost_lei"] == pytest.approx(400.0)
    assert eight["delivery_batches"] == 2
    assert eight["delivery_cost_lei"] == pytest.approx(400.0)
    assert over_eight["delivery_batches"] == 3
    assert over_eight["delivery_cost_lei"] == pytest.approx(600.0)


def test_pellet_profile_uses_dated_retail_market_reference() -> None:
    building = build_input_from_form(simple_form("pellet_boiler"))
    result = calculate(building)
    estimate = estimate_energy_cost(result)
    pellets = next(row for row in estimate["rows"] if row["carrier"] == "biomass")

    assert building.heating.cost_profile == "pellets"
    assert pellets["label"] == "Peleți"
    assert pellets["annual_cost_lei"] > 0
    assert pellets["price_lei_per_tonne"] == pytest.approx(2065.3333333)
    assert pellets["price_lei_per_15kg_bag"] == pytest.approx(30.98)
    assert pellets["unit_price_lei_per_kwh"] == pytest.approx(2.0653333333 / 4.66667)
    assert pellets["estimated_mass_tonnes"] == pytest.approx(
        pellets["final_kwh"] / pellets["energy_kwh_per_kg"] / 1000, abs=0.01
    )
    assert not any("Peleți" in note for note in estimate["unpriced_notes"])
    assert estimate["complete"] is True


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


def test_heating_auxiliaries_use_electricity_price_and_cost_totals_reconcile() -> None:
    form = simple_form("condensing_gas_boiler")
    form.update(
        {
            "heating_chain_enabled": "on",
            "heating_auxiliary_electricity_kwh_year": "120",
        }
    )
    result = calculate(build_input_from_form(form))
    estimate = estimate_energy_cost(result)
    heating = next(row for row in estimate["service_rows"] if row["service"] == "heating")
    gas = next(row for row in estimate["rows"] if row["carrier"] == "natural_gas")
    electricity = next(row for row in estimate["rows"] if row["carrier"] == "electricity")

    expected_heating_cost = (
        result.heating.final_kwh * gas["unit_price_lei_per_kwh"]
        + result.heating_system.auxiliary_electricity_kwh
        * electricity["unit_price_lei_per_kwh"]
    )

    assert result.heating_system.auxiliary_electricity_kwh == pytest.approx(120.0)
    assert heating["main_carrier_final_kwh"] == pytest.approx(result.heating.final_kwh, abs=0.01)
    assert heating["auxiliary_electricity_kwh"] == pytest.approx(120.0)
    assert heating["annual_cost_lei"] == pytest.approx(expected_heating_cost, abs=0.01)
    assert sum(float(row["annual_cost_lei"] or 0) for row in estimate["service_rows"]) == pytest.approx(
        estimate["priced_total_lei"], abs=0.01
    )
    assert sum(float(row["priced_total_lei"]) for row in estimate["monthly_rows"]) == pytest.approx(
        estimate["priced_total_lei"], abs=0.01
    )


def test_price_reference_status_expires_dated_tariffs() -> None:
    reference = {"valid_from": "2026-04-01", "valid_until": "2026-09-30"}
    assert _price_reference_status(reference, today=date(2026, 9, 18)) == "current"
    assert _price_reference_status(reference, today=date(2026, 10, 1)) == "stale"
    assert _price_reference_status(reference, today=date(2026, 3, 31)) == "not_yet_valid"


def test_current_cost_estimate_exposes_commercial_price_freshness() -> None:
    building = build_input_from_form(simple_form("condensing_gas_boiler"))
    estimate = estimate_energy_cost(calculate(building))

    assert estimate["price_references_current"] is True
    assert estimate["commercially_current"] is True
    assert estimate["stale_price_labels"] == []
    assert estimate["future_price_labels"] == []

def test_pv_self_consumption_reduces_purchased_electricity_cost_and_monthly_totals_reconcile() -> None:
    baseline_building = build_input_from_form(simple_form("heat_pump"))
    baseline_result = calculate(baseline_building)
    baseline_estimate = estimate_energy_cost(baseline_result)

    form = simple_form("heat_pump")
    form.update(
        {
            "pv_enabled": "on",
            "pv_installed_power_kwp": "5",
            "pv_orientation": "south",
            "pv_tilt_degrees": "30",
            "pv_performance_ratio": "0.82",
        }
    )
    pv_building = build_input_from_form(form)
    pv_result = calculate(pv_building)
    pv_estimate = estimate_energy_cost(pv_result)

    assert pv_result.renewables.pv.annual_generation_kwh > 0
    assert pv_result.renewables.pv.self_consumed_kwh > 0
    assert pv_result.final_energy_by_carrier["electricity"] < pv_result.gross_final_energy_by_carrier["electricity"]
    assert pv_estimate["priced_total_lei"] < baseline_estimate["priced_total_lei"]

    monthly_total = sum(float(row["priced_total_lei"]) for row in pv_estimate["monthly_rows"])
    assert monthly_total == pytest.approx(pv_estimate["priced_total_lei"], abs=0.05)
    assert sum(float(row["pv_self_consumed_kwh"]) for row in pv_estimate["monthly_rows"]) > 0
