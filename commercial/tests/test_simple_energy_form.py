from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from commercial.app.main import app, build_input_from_form


client = TestClient(app)


def base_simple_form() -> dict[str, str]:
    return {
        "project_name": "Simple house",
        "locality": "Cluj-Napoca",
        "building_type": "residential_individual",
        "building_length_m": "10",
        "building_width_m": "8",
        "heated_levels": "2",
        "average_height_m": "2.7",
        "house_window_area_m2": "20",
        "house_door_area_m2": "2.2",
        "construction_year": "2005",
        "insulation_profile": "good",
        "ventilation_type": "heat_recovery",
        "heating_choice": "wood_stove",
        "cooling_seer": "3.5",
        "cooling_setpoint_c": "26",
        "dhw_enabled": "on",
        "dhw_occupants": "3",
        "dhw_litres_per_person_day_at_60c": "50",
        "dhw_efficiency": "0.86",
        "indoor_design_temperature_c": "20",
        "solar_gains_kwh_m2_month": "0",
    }


def test_simple_house_derives_geometry_ventilation_and_wood_heating() -> None:
    building = build_input_from_form(base_simple_form())
    envelope = {item.type.value: item for item in building.envelope}

    assert building.heated_floor_area_m2 == pytest.approx(160)
    assert building.heated_volume_m3 == pytest.approx(432)
    assert envelope["exterior_wall"].area_m2 == pytest.approx(172.2)
    assert envelope["roof"].area_m2 == pytest.approx(80)
    assert envelope["floor"].area_m2 == pytest.approx(80)
    assert envelope["exterior_wall"].u_value_w_m2k == pytest.approx(0.30)
    assert building.ventilation.air_changes_per_hour == pytest.approx(0.45)
    assert building.ventilation.heat_recovery_efficiency == pytest.approx(0.75)
    assert building.heating.system_type.value == "custom"
    assert building.heating.carrier.value == "biomass"
    assert building.heating.efficiency == pytest.approx(0.75)
    assert building.heating.cost_profile == "firewood"
    assert building.dhw.carrier.value == "biomass"


def test_simple_apartment_only_adds_exposed_roof_or_floor() -> None:
    form = base_simple_form()
    form.update(
        {
            "building_type": "residential_collective",
            "apartment_area_m2": "80",
            "apartment_height_m": "2.6",
            "apartment_exterior_wall_length_m": "12",
            "apartment_window_area_m2": "10",
            "apartment_top_exposed": "on",
            "heating_choice": "heat_pump",
            "ventilation_type": "natural",
        }
    )
    building = build_input_from_form(form)
    envelope = {item.type.value: item for item in building.envelope}

    assert building.heated_floor_area_m2 == pytest.approx(80)
    assert building.heated_volume_m3 == pytest.approx(208)
    assert envelope["exterior_wall"].area_m2 == pytest.approx(21.2)
    assert envelope["roof"].area_m2 == pytest.approx(80)
    assert "floor" not in envelope
    assert "exterior_door" not in envelope
    assert building.heating.system_type.value == "heat_pump"
    assert building.heating.carrier.value == "electricity"
    assert building.heating.cost_profile == "electricity"


def test_calculator_exposes_friendly_romanian_defaults_and_advanced_escape_hatch() -> None:
    response = client.get("/instalatii/calculator")
    assert response.status_code == 200
    assert "rotița pentru zoom" in response.text
    assert "Ventilație naturală" in response.text
    assert "Ventilație cu recuperare" in response.text
    assert "Sobă / șemineu pe lemne" in response.text
    assert "Centrală pe lemne" in response.text
    assert "Centrală pe peleți" in response.text
    assert "Setări avansate — suprafețe și coeficienți exacți" in response.text
    assert "Calculează performanța" in response.text
    assert "Natural ventilation" not in response.text


def test_installations_offer_uses_registry_ready_locality_picker() -> None:
    response = client.get("/instalatii")
    assert response.status_code == 200
    assert "Instalații electrice" in response.text
    assert "Pompe de căldură" in response.text
    assert "Ventilație" in response.text
    assert 'id="energy-locality-results"' in response.text
    assert "Începe să scrii localitatea" in response.text
    assert "scop de proiect" in response.text
