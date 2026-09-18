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
    assert 'data-page="testing-home"' in response.text
    assert 'data-page="software-testing"' not in response.text
    assert 'href="/software-testing#quick-check"' in response.text
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
    assert "Working test files. Evidence you can reproduce." in response.text
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
    assert "Quick bottleneck check" in response.text
    assert "We cannot test enough" in response.text
    assert "HIL is the bottleneck" in response.text
    assert "Qualification is always catching up" in response.text
    assert "CI stops before the bench" in response.text
    assert "Prepare the brief" in response.text
    assert 'data-page="software-testing"' in response.text
    assert 'id="brief-preview" hidden' in response.text
    assert "Copy brief" in response.text
    assert "Open email app" in response.text
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
    assert 'data-page="energy-home"' in response.text
    assert "Înțelege consumul casei înainte să investești." in response.text
    assert "/instalatii/calculator" in response.text
    assert "Pregătește cererea" in response.text
    assert "energy-brief-preview" in response.text
    assert "Eficiență energetică" in response.text
    assert "Cost energetic estimat în lei" in response.text
    assert 'href="/"' not in response.text
    assert "/static/favicon.svg" in response.text


def test_energy_calculator_is_romanian_and_isolated_from_testing_home() -> None:
    response = client.get("/instalatii/calculator")
    assert response.status_code == 200
    assert "Calculează performanța" in response.text
    assert "Anvelopa clădirii" in response.text
    assert "Instalațiile" in response.text
    assert "Ventilație naturală" in response.text
    assert "Sobă / șemineu pe lemne" in response.text
    assert "Orientarea dominantă a ferestrelor" in response.text
    assert "Tipul principal de vitraj" in response.text
    assert "Automat MC001 / Hsol A.9.6" in response.text
    assert 'name="solar_orientation"' in response.text
    assert 'name="solar_glazing_type_id"' in response.text
    assert 'name="solar_window_area_south_m2"' in response.text
    assert 'name="solar_window_area_north_m2"' in response.text
    assert 'name="solar_shading_device_id"' in response.text
    assert "Ferestre pe orientări" in response.text
    assert 'href="/"' not in response.text
    assert "Building envelope" not in response.text
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


def test_form_calculation_renders_romanian_results_and_costs() -> None:
    response = client.post("/calculate", data=demo_form_data())
    assert response.status_code == 200
    assert "Rezultatul calculului" in response.text
    assert "Commercial test house" in response.text
    assert "Energie primară" in response.text
    assert "Cost estimat al serviciilor energetice modelate" in response.text
    assert "lei/an" in response.text
    assert "Generează raportul A4" in response.text
    assert "Cere o evaluare tehnică" in response.text
    assert 'href="/"' not in response.text
    assert "Trace" not in response.text


def test_certificate_renders_romanian_printable_report_with_costs() -> None:
    payload = demo_building().model_dump_json()
    response = client.post("/certificate", data={"payload": payload})
    assert response.status_code == 200
    assert "Raport de performanță energetică" in response.text
    assert "Tipărește / salvează PDF" in response.text
    assert "Cost estimat al serviciilor energetice modelate" in response.text
    assert "nu reprezintă un Certificat de Performanță Energetică" in response.text
    assert "lei/an" in response.text


def test_official_price_registry_endpoint_is_available() -> None:
    response = client.get("/api/energy-prices")
    assert response.status_code == 200
    payload = response.json()
    assert payload["retrieved_on"] == "2026-09-17"
    assert payload["electricity"]["source_name"] == "POSF / ANRE"
    assert payload["natural_gas"]["source_name"] == "POSF / ANRE"
    assert payload["firewood"]["source_name"].startswith("Romsilva")

def test_form_calculation_accepts_normative_solar_controls() -> None:
    data = demo_form_data()
    data.update(
        {
            "solar_mode": "normative_hsol",
            "solar_orientation": "south_west",
            "solar_glazing_type_id": "triple_low_e_faces_2_and_5",
            "solar_frame_fraction": "0.18",
            "solar_obstacle_shading_factor": "0.85",
            "solar_sky_view_factor": "0.5",
            "solar_exterior_surface_resistance_m2k_w": "0.04",
            "solar_longwave_radiation_coefficient_w_m2k": "5",
            "solar_sky_temperature_difference_k": "11",
            "solar_window_area_south_m2": "12",
            "solar_window_area_west_m2": "12",
            "solar_shading_device_id": "white_venetian_blinds_abs_0_1_trans_0_05",
            "solar_shading_mounting_side": "exterior",
        }
    )
    response = client.post("/calculate", data=data)
    assert response.status_code == 200
    assert "Rezultatul calculului" in response.text
    assert "Commercial test house" in response.text



def test_nearest_hsol_source_is_visible_in_result_provenance() -> None:
    data = demo_form_data()
    data.update(
        {
            "locality": "Alba Iulia",
            "solar_mode": "normative_hsol",
            "solar_orientation": "south",
            "solar_glazing_type_id": "double_low_e_face_3",
        }
    )
    response = client.post("/calculate", data=data)
    assert response.status_code == 200
    assert "Stație solară Hsol" in response.text
    assert "Sibiu" in response.text
    assert "54.3 km" in response.text

def test_partner_embed_integration_page_exposes_two_line_loader() -> None:
    response = client.get("/embed")
    assert response.status_code == 200
    assert "LaCurent Embed" in response.text
    assert 'data-lacurent-embed data-partner="demo-store"' in response.text
    assert "https://lacurent.com/static/embed-loader.js" in response.text
    assert 'href="/embed/demo-store"' in response.text


def test_partner_embed_calculator_uses_compact_partner_shell() -> None:
    response = client.get("/embed/demo-store")
    assert response.status_code == 200
    assert response.headers["content-security-policy"] == "frame-ancestors *"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert 'class="embed-body"' in response.text
    assert 'data-embed-partner="demo-store"' in response.text
    assert "Partener Demo" in response.text
    assert "Powered by LaCurent" in response.text
    assert 'action="/embed/demo-store/calculate"' in response.text
    assert 'href="/embed/demo-store/demo"' in response.text
    assert "embed-runtime.js" in response.text
    assert "Navigare LaCurent Instalații & Energie" not in response.text


def test_partner_embed_calculation_keeps_partner_cta_and_shared_engine() -> None:
    response = client.post("/embed/demo-store/calculate", data=demo_form_data())
    assert response.status_code == 200
    assert "Rezultatul calculului" in response.text
    assert "Commercial test house" in response.text
    assert "Transformă scenariul ales într-o ofertă concretă." in response.text
    assert "Cere ofertă pentru scenariul ales" in response.text
    assert 'href="https://lacurent.com/instalatii#evaluare"' in response.text
    assert 'href="/embed/demo-store"' in response.text
    assert "embed-runtime.js" in response.text


def test_unknown_partner_embed_returns_404() -> None:
    response = client.get("/embed/not-a-real-partner")
    assert response.status_code == 404


def test_embed_loader_validates_message_origin_and_source() -> None:
    response = client.get("/static/embed-loader.js")
    assert response.status_code == 200
    assert "[data-lacurent-embed]" in response.text
    assert "event.origin !== embedOrigin" in response.text
    assert "event.source !== iframe.contentWindow" in response.text
    assert "lacurent:embed-height" in response.text

def test_normal_calculator_does_not_get_embed_frame_policy() -> None:
    response = client.get("/instalatii/calculator")
    assert response.status_code == 200
    assert "content-security-policy" not in response.headers

