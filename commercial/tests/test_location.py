from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from commercial.app.main import app
from commercial.app.methodology import location_payload, resolve_climate, resolve_locality


def test_location_payload_uses_full_existing_locality_registry() -> None:
    payload = location_payload()

    assert payload["stats"]["localities"] == 13622
    assert payload["stats"]["counties"] == 42
    assert payload["stats"]["withCoordinates"] == 13622
    assert payload["stats"]["withStation"] == 13622
    assert payload["climateZones"]["type"] == "FeatureCollection"


@pytest.mark.parametrize(
    ("typed", "expected", "station"),
    [
        ("București", "București", "București"),
        ("Bucuresti", "București", "București"),
        ("Iași", "Iași", "Iași"),
        ("Iasi", "Iași", "Iași"),
        ("Brașov", "Brașov", "Brașov"),
        ("Brasov", "Brașov", "Brașov"),
        ("Timișoara", "Timișoara", "Timișoara"),
        ("Timisoara", "Timișoara", "Timișoara"),
    ],
)
def test_resolve_locality_supports_romanian_diacritics_and_aliases(
    typed: str,
    expected: str,
    station: str,
) -> None:
    climate = resolve_climate(typed)

    assert climate["selected_locality"]["name"] == expected
    assert climate["station"] == station
    assert len(climate["monthly_temperatures"]) == 12


def test_commune_and_village_resolve_to_climate_zone_and_station() -> None:
    commune = resolve_climate("siruta-57715")
    village = resolve_climate("siruta-41514")

    assert commune["selected_locality"]["name"] == "Florești"
    assert commune["selected_locality"]["county"] == "Cluj"
    assert commune["climate_zone"] == "III"
    assert commune["station"] == "Cluj-Napoca"

    assert village["selected_locality"]["locality_type"] == "sat"
    assert village["selected_locality"]["name"] == "Măgura"
    assert village["climate_zone"] == "IV"
    assert village["station"] == "Brașov"


def test_duplicate_name_can_be_disambiguated_by_stable_locality_id() -> None:
    prahova = resolve_locality("siruta-133349")
    cluj = resolve_locality("siruta-57715")

    assert prahova["name"] == "Florești"
    assert prahova["county"] == "Prahova"
    assert cluj["name"] == "Florești"
    assert cluj["county"] == "Cluj"


def test_unknown_locality_is_rejected() -> None:
    with pytest.raises(ValueError, match="registrul geografic"):
        resolve_climate("Localitate Inventată")


def test_location_data_endpoint_exposes_map_and_search_payload() -> None:
    client = TestClient(app)
    response = client.get("/api/location-data")

    assert response.status_code == 200
    payload = response.json()
    assert payload["stats"]["localities"] == 13622
    assert any(item["name"] == "Cluj-Napoca" for item in payload["localities"])
    assert payload["romaniaBoundary"]["type"] == "FeatureCollection"


def test_calculate_form_accepts_stable_locality_id() -> None:
    client = TestClient(app)
    response = client.post(
        "/calculate",
        data={
            "project_name": "Casa Florești",
            "locality": "Florești, Cluj",
            "locality_id": "siruta-57715",
            "heated_floor_area_m2": "120",
            "heated_volume_m3": "330",
            "indoor_design_temperature_c": "20",
            "building_type": "residential_individual",
            "wall_area_m2": "130",
            "wall_u_value": "0.45",
            "roof_area_m2": "85",
            "roof_u_value": "0.25",
            "floor_area_m2": "85",
            "floor_u_value": "0.35",
            "window_area_m2": "22",
            "window_u_value": "1.4",
            "door_area_m2": "3",
            "door_u_value": "1.7",
            "thermal_bridge_length_m": "35",
            "thermal_bridge_psi_w_mk": "0.05",
            "air_changes_per_hour": "0.5",
            "heat_recovery_efficiency": "0",
            "heating_system_type": "condensing_gas_boiler",
            "heating_carrier": "natural_gas",
            "heating_efficiency": "0.94",
            "heating_scop": "3.2",
            "cooling_seer": "3.5",
            "cooling_setpoint_c": "26",
            "dhw_enabled": "on",
            "dhw_occupants": "3",
            "dhw_litres_per_person_day_at_60c": "50",
            "dhw_efficiency": "0.86",
            "dhw_carrier": "natural_gas",
        },
    )

    assert response.status_code == 200
    assert "Florești, comuna - Cluj" in response.text
    assert "stație climatică Cluj-Napoca" in response.text
