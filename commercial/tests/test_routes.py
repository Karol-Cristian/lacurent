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

def test_magazin_route_exposes_construction_store_embed_demo() -> None:
    response = client.get("/magazin")
    assert response.status_code == 200
    assert "Depozitul Constructorului" in response.text
    assert 'data-lacurent-embed data-partner="demo-store"' in response.text


def test_external_style_embed_host_demo_uses_public_loader_only() -> None:
    response = client.get("/embed-host-demo")
    assert response.status_code == 200
    assert "SITE DEMO PARTENER" in response.text
    assert "Depozitul Constructorului" in response.text
    assert "Categorii populare" in response.text
    assert "Produse recomandate" in response.text
    assert "Servicii pentru proiectul tău" in response.text
    assert "Înainte să cumperi, estimează necesarul energetic al casei." in response.text
    assert 'data-lacurent-embed data-partner="demo-store"' in response.text
    assert 'src="https://lacurent.com/static/embed-loader.js?v=embed5"' in response.text
    assert "app.css" not in response.text
    assert "base.html" not in response.text


def test_store_demo_forces_full_width_embed_container() -> None:
    response = client.get("/magazin")
    assert response.status_code == 200
    assert ".calculator-section{" in response.text
    assert "width:100%;" in response.text
    assert ".embed-card{" in response.text
    assert "min-width:0;" in response.text
    assert "embed-loader.js?v=embed5" in response.text


def test_partner_embed_integration_page_exposes_two_line_loader() -> None:
    response = client.get("/embed")
    assert response.status_code == 200
    assert "LaCurent Embed" in response.text
    assert 'data-lacurent-embed data-partner="demo-store"' in response.text
    assert "https://lacurent.com/static/embed-loader.js" in response.text
    assert 'href="/embed/demo-store"' in response.text


def test_partner_embed_uses_current_house_lab_assets() -> None:
    response = client.get("/embed/demo-store")
    assert response.status_code == 200
    assert "embed-house-lab.css?v=lab9" in response.text
    assert "embed-house-lab.js?v=lab9" in response.text


def test_partner_embed_calculator_uses_compact_partner_house_lab() -> None:
    response = client.get("/embed/demo-store")
    assert response.status_code == 200
    assert response.headers["content-security-policy"] == "frame-ancestors *"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert 'class="embed-body"' in response.text
    assert 'data-embed-partner="demo-store"' in response.text
    assert "Partener Demo" in response.text
    assert "Powered by LaCurent" in response.text
    assert "Laboratorul casei" in response.text
    assert 'data-calculate-url="/embed/demo-store/lab-calculate"' in response.text
    assert 'id="labLocalitySearch"' in response.text
    assert 'id="labWallIns" type="range" min="0" max="30" step="1"' in response.text
    assert 'id="labWindows" type="range" min="2" max="60" step="0.5"' in response.text
    assert 'id="labGlazing"' in response.text
    assert 'value="double_low_e_face_3"' in response.text
    assert 'id="labOrientation"' in response.text
    assert 'value="south_west"' in response.text
    assert 'value="district_heat"' in response.text
    assert 'value="wood_stove"' in response.text
    assert '/static/home-lab/home-envelope.svg' in response.text
    assert '/static/home-lab/window-orientation.svg' in response.text
    assert 'id="labMonthlyChart"' in response.text
    assert 'id="labServiceChart"' in response.text
    assert 'id="labLossChart"' in response.text
    assert 'id="labReferenceCard"' in response.text
    assert "Nu trebuie să alegi manual o zonă climatică." in response.text
    assert "embed-house-lab.js" in response.text
    assert "embed-runtime.js" in response.text
    assert "Navigare LaCurent Instalații & Energie" not in response.text


def test_home_lab_generated_svg_assets_are_served() -> None:
    for path in (
        "/static/home-lab/home-envelope.svg",
        "/static/home-lab/window-orientation.svg",
        "/static/home-lab/wood-fireplace.svg",
        "/static/home-lab/district-heating.svg",
    ):
        response = client.get(path)
        assert response.status_code == 200
        assert "image/svg+xml" in response.headers.get("content-type", "")
        assert "<svg" in response.text


def test_home_lab_restored_heating_profiles_and_solar_controls_reach_engine() -> None:
    base = demo_form_data()
    base.update(
        {
            "locality_id": "siruta-54984",
            "expert_geometry_override": "on",
            "expert_envelope_override": "on",
            "expert_ventilation_override": "on",
            "solar_mode": "normative_hsol",
            "solar_orientation": "west",
            "solar_glazing_type_id": "triple_low_e_faces_2_and_5",
            "window_u_value": "0.9",
        }
    )
    wood = dict(base)
    wood["heating_choice"] = "wood_stove"
    wood_response = client.post("/embed/demo-store/lab-calculate", data=wood)
    assert wood_response.status_code == 200
    assert wood_response.json()["final_energy_kwh"] > 0

    district = dict(base)
    district["heating_choice"] = "district_heat"
    district_response = client.post("/embed/demo-store/lab-calculate", data=district)
    assert district_response.status_code == 200
    payload = district_response.json()
    assert payload["final_energy_kwh"] > 0

    south = dict(district)
    south["solar_orientation"] = "south"
    south_response = client.post("/embed/demo-store/lab-calculate", data=south)
    assert south_response.status_code == 200
    assert south_response.json()["final_energy_kwh"] != payload["final_energy_kwh"]

    double_glazing = dict(district)
    double_glazing["solar_glazing_type_id"] = "double_low_e_face_3"
    double_glazing["window_u_value"] = "1.6"
    double_response = client.post("/embed/demo-store/lab-calculate", data=double_glazing)
    assert double_response.status_code == 200
    assert double_response.json()["final_energy_kwh"] != payload["final_energy_kwh"]


def test_partner_embed_lab_calculation_returns_live_metrics() -> None:
    data = demo_form_data()
    data.update(
        {
            "locality_id": "siruta-54984",
            "expert_geometry_override": "on",
            "expert_envelope_override": "on",
            "expert_ventilation_override": "on",
            "heating_choice": "condensing_gas_boiler",
        }
    )
    response = client.post("/embed/demo-store/lab-calculate", data=data)
    assert response.status_code == 200
    payload = response.json()
    assert payload["final_energy_kwh"] > 0
    assert payload["primary_specific_kwh_m2"] > 0
    assert payload["heat_loss_w_k"] > 0
    assert payload["design_heat_load_kw"] > 0
    assert payload["locality"]
    assert payload["climate_station"]
    assert len(payload["monthly"]) == 12
    assert len(payload["monthly_costs"]) == 12
    assert payload["final_energy_by_service"]["heating"] >= 0
    assert payload["heat_loss_breakdown"]
    assert sum(row["value_w_k"] for row in payload["heat_loss_breakdown"]) > 0
    assert payload["reference"] is not None


def test_partner_embed_calculation_keeps_partner_cta_and_shared_engine() -> None:
    response = client.post("/embed/demo-store/calculate", data=demo_form_data())
    assert response.status_code == 200
    assert "Rezultatul calculului" in response.text
    assert "Commercial test house" in response.text
    assert "Transformă scenariul ales într-o ofertă concretă." in response.text
    assert "Cere ofertă pentru casa configurată" in response.text
    assert 'href="https://lacurent.com/instalatii#evaluare"' in response.text
    assert 'href="/embed/demo-store"' in response.text
    assert "embed-runtime.js" in response.text


def test_unknown_partner_embed_returns_404() -> None:
    response = client.get("/embed/not-a-real-partner")
    assert response.status_code == 404


def test_embed_loader_validates_message_origin_source_and_full_width() -> None:
    response = client.get("/static/embed-loader.js")
    assert response.status_code == 200
    assert "[data-lacurent-embed]" in response.text
    assert 'host.style.width = "100%"' in response.text
    assert 'iframe.setAttribute("width", String(width))' in response.text
    assert "widthContainer.getBoundingClientRect()" in response.text
    assert "requestAnimationFrame(syncFrameWidth)" in response.text
    assert "new ResizeObserver(syncFrameWidth)" in response.text
    assert 'iframe.style.maxWidth = "none"' in response.text
    assert "event.origin !== embedOrigin" in response.text
    assert "event.source !== iframe.contentWindow" in response.text
    assert "lacurent:embed-height" in response.text
    assert "lacurent:embed-viewport" in response.text
    assert "window.addEventListener(\"scroll\", scheduleViewport" in response.text

def test_normal_calculator_does_not_get_embed_frame_policy() -> None:
    response = client.get("/instalatii/calculator")
    assert response.status_code == 200
    assert "content-security-policy" not in response.headers

def test_embed_scenario_lab_uses_partner_calculation_route() -> None:
    response = client.get("/static/scenario-cockpit.js")
    assert response.status_code == 200
    assert "dataset?.embedPartner" in response.text
    assert "calculateUrl=partnerId?'/embed/'+encodeURIComponent(partnerId)+'/calculate':'/calculate'" in response.text
    assert "fetch(calculateUrl" in response.text


def test_embed_house_lab_uses_commercial_configurator_hierarchy() -> None:
    response = client.get("/static/embed-house-lab.css")
    assert response.status_code == 200
    assert "container-type:inline-size" in response.text
    assert "grid-template-columns:minmax(360px,.76fr) minmax(520px,1.24fr)" in response.text
    assert ".house-lab-controls{" in response.text
    assert "border-radius:22px" in response.text
    assert ".lab-section-title>span{display:none}" in response.text
    assert ".house-lab-results{" in response.text
    assert "position:sticky" in response.text
    assert "border-radius:24px" in response.text
    assert ".lab-results-status{" in response.text
    assert "font-size:0" in response.text
    assert ".lab-price-hero{" in response.text
    assert "background:var(--lab-dark)" in response.text
    assert "grid-template-columns:repeat(2,minmax(0,1fr))" in response.text
    assert ".lab-partner-cta{" in response.text
    assert "border-radius:999px" in response.text
    assert ".lab-monthly-chart{" in response.text
    assert "grid-template-columns:repeat(12" in response.text
    assert "@container (max-width:900px)" in response.text
    assert ".house-lab-layout{grid-template-columns:1fr}" in response.text


def test_partner_embed_exposes_commercial_home_lab_copy() -> None:
    response = client.get("/embed/demo-store")
    assert response.status_code == 200
    assert "modifici doar ce contează" in response.text
    assert "Profil climatic automat" in response.text
    assert "Recalculare live" in response.text
    assert "Cost anual estimat" in response.text


def test_home_lab_live_fetch_is_resilient_and_does_not_expose_raw_json_errors() -> None:
    response = client.get("/static/embed-house-lab.js")
    assert response.status_code == 200
    assert "new AbortController()" in response.text
    assert 'response.headers.get("content-type")' in response.text
    assert 'contentType.includes("application/json")' in response.text
    assert 'error.transient = transient' in response.text
    assert 'await wait(450)' in response.text
    assert 'setStatus(tr("calculating"), "calculating")' in response.text
    assert 'setStatus(tr("error"), "error")' in response.text
    assert 'Unexpected token' not in response.text


def test_home_lab_live_indicator_and_class_badge_have_distinct_states() -> None:
    response = client.get("/static/embed-house-lab.css")
    assert response.status_code == 200
    assert ".lab-results-status.is-calculating::before" in response.text
    assert ".lab-results-status.is-live::before" in response.text
    assert ".lab-results-status.is-error::before" in response.text
    assert "@keyframes lab-live-pulse" in response.text
    assert ".lab-class{" in response.text
    assert "width:58px" in response.text
    assert "height:58px" in response.text
    assert "border-radius:12px" in response.text


def test_home_lab_runtime_syncs_glazing_orientation_and_heating_visuals() -> None:
    response = client.get("/static/embed-house-lab.js")
    assert response.status_code == 200
    assert "GLAZING_U" in response.text
    assert 'setField("solar_glazing_type_id", controls.glazing.value)' in response.text
    assert 'setField("solar_orientation", controls.orientation.value)' in response.text
    assert "HEATING_VISUALS" in response.text
    assert 'district-heating.svg' in response.text
    assert 'wood-fireplace.svg' in response.text


def test_home_lab_runtime_renders_dashboard_and_parent_sticky_contract() -> None:
    response = client.get("/static/embed-house-lab.js")
    assert response.status_code == 200
    assert "renderMonthlyChart" in response.text
    assert "renderHorizontalChart" in response.text
    assert "renderReference" in response.text
    assert 'data.type !== "lacurent:embed-viewport"' in response.text
    assert "translateY(" in response.text


def test_embed_language_switch_keeps_ro_en_controls_and_reversible_translation_contract() -> None:
    page = client.get("/embed/demo-store")
    assert page.status_code == 200
    assert 'data-site-language="ro"' in page.text
    assert 'data-site-language="en"' in page.text
    script = client.get("/static/energy-i18n.js")
    assert script.status_code == 200
    assert 'if (lang !== "en") return raw;' in script.text
    assert "originalText.get" in script.text
    assert "window.lacurentSetLanguage = setLanguage" in script.text

