from __future__ import annotations

from fastapi.testclient import TestClient

from commercial.app.engine import demo_building
from commercial.app.main import app


client = TestClient(app)


def demo_form_data() -> dict[str, str]:
    return {
        "project_name": "Casa test comercial",
        "locality": "Cluj-Napoca",
        "heated_floor_area_m2": "160",
        "heated_volume_m3": "432",
        "indoor_design_temperature_c": "20",
        "building_type": "residential_individual",
        "construction_year": "2004",
        "solar_gains_kwh_m2_month": "1.2",
        "wall_area_m2": "168",
        "wall_u_value": "0.42",
        "roof_area_m2": "92",
        "roof_u_value": "0.24",
        "floor_area_m2": "80",
        "floor_u_value": "0.36",
        "window_area_m2": "24",
        "window_u_value": "1.35",
        "door_area_m2": "3.2",
        "door_u_value": "1.7",
        "thermal_bridge_length_m": "42",
        "thermal_bridge_psi_w_mk": "0.05",
        "air_changes_per_hour": "0.5",
        "heat_recovery_efficiency": "0",
        "heating_system_type": "condensing_gas_boiler",
        "heating_efficiency": "0.94",
        "heating_scop": "3.2",
        "heating_carrier": "natural_gas",
        "cooling_enabled": "on",
        "cooling_seer": "3.6",
        "cooling_setpoint_c": "26",
        "dhw_enabled": "on",
        "dhw_occupants": "4",
        "dhw_litres_per_person_day_at_60c": "50",
        "dhw_efficiency": "0.86",
        "dhw_carrier": "natural_gas",
    }


def test_home_page_renders_complete_form() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "Calculează performanța" in response.text
    assert "Anvelopă" in response.text
    assert "Instalații" in response.text


def test_form_calculation_renders_commercial_results() -> None:
    response = client.post("/calculate", data=demo_form_data())

    assert response.status_code == 200
    assert "Rezultat calcul" in response.text
    assert "Casa test comercial" in response.text
    assert "Energie primară" in response.text
    assert "Generează raport A4" in response.text
    assert "Trace" not in response.text


def test_certificate_renders_printable_report() -> None:
    payload = demo_building().model_dump_json()
    response = client.post("/certificate", data={"payload": payload})

    assert response.status_code == 200
    assert "Raport de performanță energetică" in response.text
    assert "Tipărește / salvează PDF" in response.text
    assert "nu reprezintă" in response.text
