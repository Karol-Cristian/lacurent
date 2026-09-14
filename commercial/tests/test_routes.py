from __future__ import annotations

from fastapi.testclient import TestClient

from commercial.app.engine import demo_building
from commercial.app.main import app


client = TestClient(app)


def demo_form_data() -> dict[str, str]:
    return {
        "project_name": "Commercial test house",
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


def test_company_home_is_a_focused_testing_entry_page() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert "Bring one problematic test flow. Leave with working automation." in response.text
    assert 'href="/software-testing"' in response.text
    assert "CANoe / CAPL" in response.text
    assert "karol@lacurent.com" in response.text
    assert "Three concrete work areas." not in response.text
    assert "Instalații & Energie" not in response.text
    assert 'href="/instalatii"' not in response.text
    assert "/static/favicon.svg" in response.text


def test_software_testing_landing_page_is_sales_ready() -> None:
    response = client.get("/software-testing")
    assert response.status_code == 200
    assert "Bring one problematic test flow. Leave with working automation." in response.text
    assert "What the intervention delivers" in response.text
    assert "Modified test scripts and configuration" in response.text
    assert "One defined bottleneck. A concrete engineering output." in response.text
    assert "Regression & qualification automation" in response.text
    assert "UDS, diagnostics & fault handling" in response.text
    assert "HIL / SIL / PIL throughput" in response.text
    assert "Repeatable execution with expected-versus-actual evidence." in response.text
    assert "A reproduced baseline and documented root-cause findings." in response.text
    assert "Several days → about 2 hours" in response.text
    assert "past engineering result, not a blanket performance guarantee" in response.text
    assert "30-second bottleneck check" in response.text
    assert "We cannot test enough" in response.text
    assert "HIL is the bottleneck" in response.text
    assert "Qualification is always catching up" in response.text
    assert "CI stops before the bench" in response.text
    assert "Prepare the email" in response.text
    assert "What it is costing us:" in response.text
    assert "Embedded verification bottleneck — quick brief" in response.text
    assert "dSPACE / AutomationDesk" in response.text
    assert "ETAS / INCA / LABCAR" in response.text
    assert "CANoe" in response.text
    assert "CAPL" in response.text
    assert "ASPICE" in response.text
    assert "SWE.6" not in response.text
    assert "SYS.4" not in response.text
    assert "Functional safety · ISO 26262" in response.text
    assert "ASIL B" not in response.text
    assert "Aerospace-oriented" in response.text
    assert "/software-testing/resources" in response.text
    assert "A debounce bug that looked like a test problem" in response.text
    assert "karol@lacurent.com" in response.text
    assert "/static/favicon.svg" in response.text
    assert "/static/painpoints.css" in response.text
    assert "€1,000" not in response.text
    assert "10 business days" not in response.text
    assert "Test Automation Rescue Sprint" not in response.text


def test_software_resources_are_public_and_anonymized() -> None:
    response = client.get("/software-testing/resources")
    assert response.status_code == 200
    assert "Useful verification knowledge" in response.text
    assert "From one-off fault injection to repeatable UDS regression" in response.text
    assert "Research library" in response.text
    assert "Project details are intentionally anonymized" in response.text

    article = client.get("/software-testing/resources/timing-is-a-requirement")
    assert article.status_code == 200
    assert "A debounce bug that looked like a test problem" in article.text
    assert "Publication rule" in article.text
    assert "employer/customer identities" in article.text


def test_favicon_route_and_asset_are_available() -> None:
    response = client.get("/favicon.ico", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "/static/favicon.svg"

    asset = client.get("/static/favicon.svg")
    assert asset.status_code == 200
    assert "<svg" in asset.text
    assert "LaCurent" in asset.text


def test_installations_landing_page_links_energy_calculator() -> None:
    response = client.get("/instalatii")
    assert response.status_code == 200
    assert "Fotovoltaice" in response.text
    assert "Eficiență energetică" in response.text
    assert "/instalatii/calculator" in response.text
    assert "/static/favicon.svg" in response.text


def test_energy_calculator_renders_complete_form() -> None:
    response = client.get("/instalatii/calculator")
    assert response.status_code == 200
    assert "Calculate performance" in response.text
    assert "Building envelope" in response.text
    assert "Systems" in response.text
    assert "/static/favicon.svg" in response.text


def test_health_endpoint_is_lightweight() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_www_host_redirects_to_canonical_apex() -> None:
    response = client.get(
        "/software-testing?source=www",
        headers={"host": "www.lacurent.com"},
        follow_redirects=False,
    )
    assert response.status_code == 308
    assert response.headers["location"] == "https://lacurent.com/software-testing?source=www"


def test_form_calculation_renders_commercial_results() -> None:
    response = client.post("/calculate", data=demo_form_data())
    assert response.status_code == 200
    assert "Calculation result" in response.text
    assert "Commercial test house" in response.text
    assert "Primary energy" in response.text
    assert "Generate A4 report" in response.text
    assert "Trace" not in response.text


def test_certificate_renders_printable_report() -> None:
    payload = demo_building().model_dump_json()
    response = client.post("/certificate", data={"payload": payload})
    assert response.status_code == 200
    assert "Energy Performance Report" in response.text
    assert "Print / save PDF" in response.text
    assert "not a legally issued" in response.text
    assert "Certificate" in response.text
