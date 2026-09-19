from __future__ import annotations

from fastapi.testclient import TestClient

from commercial.app.engine import demo_building
from commercial.app.main import app
from commercial.app.pricing import _firewood_reference


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


def test_energy_calculator_is_minimal_home_lab_product_page() -> None:
    response = client.get("/instalatii/calculator")
    assert response.status_code == 200
    assert "Înțelege casa înainte să investești în ea." in response.text
    assert "Modelează locuința actuală. Testează o renovare. Vezi ce se schimbă." in response.text
    assert "De la casa de azi la scenariul de renovare." in response.text
    assert "Testează Home Lab." in response.text
    assert 'data-hlp-launch' in response.text
    assert 'data-hlp-demo-frame' in response.text
    assert 'class="hlp-product-stage"' in response.text
    assert 'class="hlp-flow-line"' in response.text
    assert "/static/home-lab-product.css?v=product2" in response.text
    assert "/static/home-lab-product.js?v=product2" in response.text
    assert "Casa ta, nu o casă generică" not in response.text
    assert "De la simulare la proiect" not in response.text
    assert "METODOLOGIE" not in response.text
    assert "/static/favicon.svg" in response.text


def test_legacy_energy_calculator_remains_available_during_home_lab_next_cutover() -> None:
    response = client.get("/instalatii/calculator/legacy")
    assert response.status_code == 200
    assert "Anvelopa clădirii" in response.text
    assert "Instalațiile" in response.text
    assert "Ventilație naturală" in response.text
    assert "Orientarea dominantă a ferestrelor" in response.text
    assert "Automat MC001 / Hsol A.9.6" in response.text


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
    assert payload["retrieved_on"] == "2026-09-18"
    assert payload["electricity"]["source_name"] == "POSF / ANRE"
    assert payload["natural_gas"]["source_name"] == "POSF / ANRE"
    assert payload["firewood"]["source_name"] == "Romsilva Store / DS Cluj - Ocolul Silvic Huedin"
    assert payload["firewood"]["reference_price_lei_per_package"] == 700.0
    assert payload["firewood"]["reference_volume_m3_per_package"] == 0.8
    assert payload["firewood"]["reference_price_lei_per_m3"] == 875.0
    assert payload["firewood"]["delivery_cost_lei_per_batch"] == 200.0
    assert payload["firewood"]["delivery_batch_size_packages"] == 4


def test_firewood_reference_uses_huedin_pallet_price_and_delivery_rule() -> None:
    reference = _firewood_reference()
    assert reference["price_lei_per_package"] == 700.0
    assert reference["reference_volume_m3_per_package"] == 0.8
    assert reference["price_lei_per_m3"] == 875.0
    assert reference["delivery_cost_lei_per_batch"] == 200.0
    assert reference["delivery_batch_size_packages"] == 4
    assert reference["energy_kwh_per_package"] == 0.8 * 2821.0
    assert 0.310 < reference["unit_price_lei_per_kwh"] < 0.311
    assert "Ocolul Silvic Huedin" in reference["source_name"]
    assert "transport 200 lei / max. 4 paleți" in reference["basis"]

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

def test_magazin_route_exposes_home_lab_next_launcher() -> None:
    response = client.get("/magazin")
    assert response.status_code == 200
    assert "Depozitul Constructorului" in response.text
    assert "Ce se schimbă dacă renovezi casa?" in response.text
    assert "Începe simularea" in response.text
    assert 'data-next-launcher' in response.text
    assert 'data-lacurent-embed data-partner="demo-store" data-path="next" data-deferred="true"' in response.text


def test_external_style_embed_host_demo_uses_home_lab_next_launcher() -> None:
    response = client.get("/embed-host-demo")
    assert response.status_code == 200
    assert "SITE DEMO PARTENER" in response.text
    assert "Depozitul Constructorului" in response.text
    assert "Categorii populare" in response.text
    assert "Produse recomandate" in response.text
    assert "Servicii pentru proiectul tău" in response.text
    assert "Ce se schimbă dacă renovezi casa?" in response.text
    assert 'data-next-launch' in response.text
    assert 'data-path="next"' in response.text
    assert 'data-deferred="true"' in response.text
    assert 'src="https://lacurent.com/static/embed-loader.js?v=embed8"' in response.text
    assert "app.css" not in response.text
    assert "base.html" not in response.text


def test_store_demo_forces_full_width_embed_container() -> None:
    response = client.get("/magazin")
    assert response.status_code == 200
    assert ".calculator-section{" in response.text
    assert "width:100%;" in response.text
    assert ".embed-card{" in response.text
    assert "min-width:0;" in response.text
    assert "embed-loader.js?v=embed8" in response.text


def test_partner_embed_integration_page_recommends_home_lab_next() -> None:
    response = client.get("/embed")
    assert response.status_code == 200
    assert "LaCurent Embed" in response.text
    assert 'data-lacurent-embed data-partner="demo-store" data-path="next"' in response.text
    assert "https://lacurent.com/static/embed-loader.js?v=embed8" in response.text
    assert "Home Lab Next este experiența recomandată" in response.text
    assert 'href="/embed/demo-store/next"' in response.text


def test_home_lab_next_route_exposes_four_screen_product_flow() -> None:
    response = client.get("/home-lab-next")
    assert response.status_code == 200
    assert 'data-home-lab-next' in response.text
    assert 'data-hln-screen="home"' in response.text
    assert 'data-hln-screen="site"' in response.text
    assert 'data-hln-screen="intervention"' in response.text
    assert 'data-hln-screen="scenario"' in response.text
    assert "Salvează Casa mea și începe renovarea" in response.text
    assert "Ce vrei să îmbunătățești?" in response.text
    assert "Păstrează această intervenție" in response.text
    assert "Scenariul meu" in response.text
    assert "/static/home-lab-next.css?v=next1" in response.text
    assert "/static/home-lab-next.js?v=next1" in response.text


def test_partner_home_lab_next_route_is_embeddable_and_partner_scoped() -> None:
    response = client.get("/embed/demo-store/next")
    assert response.status_code == 200
    assert response.headers["content-security-policy"] == "frame-ancestors *"
    assert 'data-partner-id="demo-store"' in response.text
    assert 'data-calculate-url="/embed/demo-store/next/calculate"' in response.text
    assert "Partener Demo" in response.text
    assert "/static/embed-runtime.js?v=embed2" in response.text


def test_home_lab_next_calculation_reuses_existing_energy_engine() -> None:
    response = client.post("/api/home-lab-next/calculate", data=demo_form_data())
    assert response.status_code == 200
    payload = response.json()
    assert payload["final_energy_kwh"] > 0
    assert payload["heat_loss_w_k"] > 0
    assert payload["energy_class"]
    assert "annual_cost_lei" in payload


def test_partner_home_lab_next_calculation_reuses_existing_energy_engine() -> None:
    response = client.post("/embed/demo-store/next/calculate", data=demo_form_data())
    assert response.status_code == 200
    payload = response.json()
    assert payload["final_energy_kwh"] > 0
    assert payload["design_heat_load_kw"] > 0


def test_home_lab_next_frontend_contains_baseline_scenario_contract() -> None:
    response = client.get("/static/home-lab-next.js")
    assert response.status_code == 200
    assert "homeState" in response.text
    assert "scenarioState" in response.text
    assert "baselineSaved" in response.text
    assert "function openMeasure" in response.text
    assert "function keepIntervention" in response.text
    assert "function benefitText" in response.text
    assert "function populateTechnicalForm" in response.text
    assert 'fetch(calcUrl' in response.text


def test_embed_loader_supports_deferred_next_mounts() -> None:
    response = client.get("/static/embed-loader.js")
    assert response.status_code == 200
    assert 'host.dataset.path' in response.text
    assert 'path === "next"' in response.text
    assert 'host.dataset.deferred === "true"' in response.text
    assert "window.LaCurentEmbed" in response.text
    assert "publicApi.mount" in response.text


def test_partner_embed_uses_current_house_lab_assets() -> None:
    response = client.get("/embed/demo-store")
    assert response.status_code == 200
    assert "embed-house-lab.css?v=lab17" in response.text
    assert "embed-house-lab.js?v=lab17" in response.text
    assert "app.css?v=v2eng4" in response.text
    assert "embed-runtime.js?v=embed2" in response.text


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
    assert 'id="labVentilation"' in response.text
    assert 'id="labCooling"' in response.text
    assert 'data-heating-choice="heat_pump"' in response.text
    assert 'data-lab-tab="overview"' in response.text
    assert 'data-lab-tab="comparison"' in response.text
    assert 'class="lab-summary-rail"' in response.text
    assert 'id="labServiceDonut"' in response.text
    assert 'id="labSaveBaseline"' in response.text
    assert 'id="labRestoreBaseline"' in response.text
    assert 'id="labBaselineComparison"' in response.text
    assert 'id="labSaveScenario"' in response.text
    assert 'id="labSavedScenarios"' in response.text
    assert 'id="labBaselineRail"' in response.text
    assert 'data-lab-house-carousel' in response.text
    assert response.text.count('data-lab-house-slide') == 3
    assert '/home-lab-assets/house-fireplace.webp?v=2' in response.text
    assert '/home-lab-assets/house-orientation.webp?v=2' in response.text
    assert '/home-lab-assets/house-pv.webp?v=2' in response.text
    assert 'id="labMonthlyChart"' in response.text
    assert 'id="labServiceChart"' in response.text
    assert 'id="labLossChart"' in response.text
    assert 'id="labOverviewBaseline"' in response.text
    assert 'id="labOverviewBaselineData"' in response.text
    assert 'id="labReferenceCard"' not in response.text
    assert "embed-house-lab.js" in response.text
    assert "embed-runtime.js" in response.text
    assert "Navigare LaCurent Instalații & Energie" not in response.text


def test_home_lab_house_carousel_assets_are_served() -> None:
    for path in (
        "/home-lab-assets/house-fireplace.webp?v=2",
        "/home-lab-assets/house-orientation.webp?v=2",
        "/home-lab-assets/house-pv.webp?v=2",
    ):
        response = client.get(path)
        assert response.status_code == 200
        assert "image/webp" in response.headers.get("content-type", "")
        assert response.content.startswith(b"RIFF")
        assert b"WEBP" in response.content[:16]
        assert len(response.content) > 1000


def test_home_lab_generated_svg_assets_are_served() -> None:
    for path in (
        "/static/home-lab/home-envelope.svg",
        "/static/home-lab/window-orientation-card.svg",
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
    assert "isMobileCockpit" in response.text
    assert "mobileViewportHeight" in response.text
    assert "window.visualViewport?.addEventListener(\"resize\", syncFrameHeight" in response.text
    assert 'host.dataset.lacurentMobileCockpit = "true"' in response.text
    assert "lacurent:embed-focus-request" in response.text
    assert "lacurent:embed-focus-state" in response.text
    assert "data-lacurent-focus-bar" in response.text
    assert "Înapoi la magazin" in response.text
    assert 'host.style.position = "fixed"' in response.text
    assert 'document.documentElement.style.overflow = "hidden"' in response.text
    assert 'document.body.style.overflow = "hidden"' in response.text
    assert 'host.dataset.focusMode !== "off"' in response.text
    assert "window.scrollTo(0, focusScrollY)" in response.text

def test_embed_runtime_requests_mobile_focus_and_reflects_focus_state() -> None:
    response = client.get("/static/embed-runtime.js")
    assert response.status_code == 200
    assert "lacurent:embed-focus-request" in response.text
    assert "lacurent:embed-focus-state" in response.text
    assert 'document.addEventListener("click", requestMobileFocus' in response.text
    assert 'document.addEventListener("pointerdown", requestMobileFocus' not in response.text
    assert 'classList.toggle("embed-focus-active"' in response.text


def test_embed_focus_css_removes_partner_chrome_on_mobile() -> None:
    response = client.get("/static/app.css")
    assert response.status_code == 200
    assert ".embed-body.embed-focus-active .embed-partner-bar" in response.text
    assert "display: none;" in response.text
    assert ".embed-body.embed-focus-active .workspace" in response.text


def test_embed_integration_documents_mobile_focus_opt_out() -> None:
    response = client.get("/embed")
    assert response.status_code == 200
    assert "embed-loader.js?v=embed8" in response.text
    assert 'data-focus-mode="off"' in response.text
    assert "prima interacțiune" in response.text


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


def test_embed_house_lab_uses_three_column_product_layout() -> None:
    response = client.get("/static/embed-house-lab.css")
    assert response.status_code == 200
    assert "container-type:inline-size" in response.text
    assert "grid-template-columns:minmax(390px,1.02fr) minmax(500px,1.18fr) minmax(220px,.54fr)" in response.text
    assert ".lab-config-panel" in response.text
    assert ".lab-results-stage" in response.text
    assert ".lab-summary-rail" in response.text
    assert "position:sticky" in response.text
    assert ".lab-result-tabs" in response.text
    assert ".lab-service-donut" in response.text
    assert ".lab-class-scale" in response.text
    assert '.lab-class[data-grade="B"]' in response.text
    assert "@media(max-width:1020px)" in response.text
    assert "@media(max-width:760px)" in response.text
    assert ".lab-chapter-grid" in response.text
    assert ".lab-chapter-tile" in response.text
    assert ".lab-mobile-livebar" in response.text
    assert "[data-lab-chapter-panel]" in response.text
    assert "min-height:100svh" in response.text
    assert ".lab-house-mode-bar" in response.text
    assert ".lab-context-visual" in response.text
    assert "height:100svh" in response.text
    assert ".lab-number-control" in response.text
    assert ".lab-renovation-chooser" in response.text
    assert ".lab-renovation-grid" in response.text
    assert ".lab-mobile-livebar-metrics" in response.text
    assert ".lab-mobile-metric-icon" in response.text
    assert 'min-height:144px!important' in response.text
    assert ".lab-renovation-value-strip" in response.text
    assert ".lab-renovation-group-title" in response.text
    assert '[data-active-renovation="wall"]' in response.text
    assert ".lab-mobile-secondary-actions" in response.text
    assert ".is-renovation-target" in response.text


def test_home_lab_baseline_and_scenario_comparison_has_commercial_layout() -> None:
    response = client.get("/static/embed-house-lab.css")
    assert response.status_code == 200
    assert ".lab-baseline-card" in response.text
    assert ".lab-overview-baseline" in response.text
    assert ".lab-overview-baseline-data" in response.text
    assert ".lab-baseline-comparison" in response.text
    assert ".lab-baseline-metric-list" in response.text
    assert ".lab-saved-scenarios" in response.text
    assert ".lab-scenario-card.is-baseline" in response.text
    assert ".lab-baseline-rail" in response.text
    assert ".is-good" in response.text
    assert ".is-bad" in response.text


def test_partner_embed_exposes_commercial_home_lab_copy() -> None:
    response = client.get("/embed/demo-store")
    assert response.status_code == 200
    assert "Corectează doar ce nu seamănă cu locuința ta" in response.text
    assert "Cost anual estimat" in response.text


def test_partner_embed_exposes_six_mc001_chapter_cockpit_and_product_scope() -> None:
    response = client.get("/embed/demo-store")
    assert response.status_code == 200
    assert response.text.count("data-lab-chapter-open=") == 6
    assert 'data-lab-chapter-open="1"' in response.text
    assert 'data-lab-chapter-open="6"' in response.text
    assert "Fațadă termoizolată" in response.text
    assert "Ferestre eficiente" in response.text
    assert "Iluminat LED" in response.text
    assert "Panouri solare termice" in response.text
    assert "Panouri fotovoltaice" in response.text
    assert 'data-lab-product-action="heat_pump"' in response.text
    assert "<strong>Panouri solare termice</strong><small>calcul în curs de integrare</small>" in response.text
    assert "<strong>Panouri fotovoltaice</strong><small>calcul în curs de integrare</small>" in response.text
    assert 'id="labMobileClass"' in response.text
    assert 'data-mobile-results' in response.text
    assert 'class="lab-house-mode-bar"' in response.text
    assert 'id="labConfirmCurrentHome"' in response.text
    assert "Salvează casa mea → renovări" in response.text
    assert 'id="labContextImage"' in response.text
    assert "MC001 · 6" in response.text
    assert 'id="labRenovationChooser"' in response.text
    assert "Ce vrei să îmbunătățești?" in response.text
    assert 'data-renovation-action="wall"' in response.text
    assert 'data-renovation-action="roof"' in response.text
    assert 'data-renovation-action="floor"' in response.text
    assert 'data-renovation-action="windows"' in response.text
    assert 'data-renovation-action="heating"' in response.text
    assert 'data-renovation-action="ventilation"' in response.text
    assert 'id="labMobilePrimaryAction"' in response.text
    assert 'id="labMobileSecondaryAction"' in response.text
    assert 'id="labMobileHomeAction"' in response.text
    assert 'id="labMobileSecondaryActions"' in response.text
    assert 'id="labRenovationValueStrip"' in response.text
    assert 'id="labRenovationBaseValue"' in response.text
    assert 'id="labRenovationScenarioValue"' in response.text
    assert 'data-renovation-scope="wall"' in response.text
    assert 'data-renovation-scope="heating"' in response.text
    assert 'data-renovation-scope="ventilation"' in response.text
    assert "<strong>Anvelopă</strong>" in response.text
    assert "<strong>Instalații</strong>" in response.text
    assert "<strong>Regenerabile</strong>" in response.text
    assert 'id="labMobileCo2"' in response.text
    assert "Salvează casa mea → renovări" in response.text


def test_home_lab_runtime_wires_mobile_chapter_editor_and_live_summary() -> None:
    response = client.get("/static/embed-house-lab.js")
    assert response.status_code == 200
    assert 'function openChapter(chapter,editorTitle="",preserveRenovation=false)' in response.text
    assert "function closeChapter()" in response.text
    assert "function updateChapterSummaries" in response.text
    assert "is-mobile-results-view" in response.text
    assert "data-lab-product-action='heat_pump'" in response.text
    assert 'controls.heating.value="heat_pump"' in response.text
    assert "labMobileCost" in response.text
    assert "labChapter6Summary" in response.text
    assert "function updateHouseFlow" in response.text
    assert "let editingCurrentHome = !baselineSnapshot" in response.text
    assert "function compactDelta" in response.text
    assert "labMobileCostDelta" in response.text
    assert 'document.getElementById("labConfirmCurrentHome")' in response.text
    assert 'document.getElementById("labEditCurrentHome")' in response.text
    assert "root.scrollIntoView" not in response.text
    assert "lab-number-control" in response.text
    assert "function openRenovationChooser" in response.text
    assert "function openRenovationAction" in response.text
    assert "function updateRenovationComparison" in response.text
    assert "function renovationDisplayValue" in response.text
    assert 'configPanel?.setAttribute("data-active-renovation",actionName)' in response.text
    assert "function updateMobileFlow" in response.text
    assert "mobileHomeAction?.addEventListener" in response.text
    assert "benefitPercentDelta" in response.text
    assert "labMobileCo2Delta" in response.text
    assert "mobilePrimaryAction?.addEventListener" in response.text
    assert "saveCurrentScenario" in response.text


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
    assert ".lab-results-status.is-error" in response.text
    assert "@keyframes lab-pulse" in response.text
    assert ".lab-class{" in response.text
    assert "min-height:104px" in response.text
    assert '.lab-class[data-grade="A"]' in response.text
    assert '.lab-class[data-grade="G"]' in response.text


def test_home_lab_runtime_syncs_glazing_orientation_and_heating_visuals() -> None:
    response = client.get("/static/embed-house-lab.js")
    assert response.status_code == 200
    assert "GLAZING_U" in response.text
    assert 'setField("solar_glazing_type_id", controls.glazing.value)' in response.text
    assert 'setField("solar_orientation", controls.orientation.value)' in response.text
    assert "HEATING_VISUALS" in response.text
    assert 'district-heating.svg' in response.text
    assert 'wood-fireplace.svg' in response.text


def test_home_lab_runtime_wires_product_tabs_system_pills_and_ventilation() -> None:
    response = client.get("/static/embed-house-lab.js")
    assert response.status_code == 200
    assert "renderServiceDonut" in response.text
    assert "syncHeatingPills" in response.text
    assert "syncLevelSegments" in response.text
    assert "openResultTab" in response.text
    assert 'controls.ventilation.addEventListener("change"' in response.text
    assert 'controls.cooling.addEventListener("change"' in response.text
    assert 'setField("cooling_enabled"' in response.text
    assert 'document.querySelector(".lab-summary-rail")' in response.text


def test_home_lab_runtime_persists_current_house_baseline_and_scenarios_per_partner() -> None:
    response = client.get("/static/embed-house-lab.js")
    assert response.status_code == 200
    assert "lacurent-home-lab-scenarios-v1:" in response.text
    assert "captureSnapshot" in response.text
    assert "persistScenarioState" in response.text
    assert "renderBaselineComparison" in response.text
    assert "restoreSnapshot" in response.text
    assert "baselineSnapshot" in response.text
    assert "savedScenarios" in response.text
    assert 'data-load-scenario' in response.text
    assert "lastCalculatedFormSignature" in response.text
    assert "currentFormSignature" in response.text
    assert "captureFreshSnapshot" in response.text
    assert "scenarioNameFromChanges" in response.text
    assert "classDeltaBadge" in response.text
    assert "function updateHouseFlow" in response.text
    assert "editingCurrentHome=false" in response.text


def test_home_lab_runtime_renders_dashboard_and_parent_sticky_contract() -> None:
    response = client.get("/static/embed-house-lab.js")
    assert response.status_code == 200
    assert "renderMonthlyChart" in response.text
    assert "renderHorizontalChart" in response.text
    assert "renderBaselineComparison" in response.text
    assert "renderReference" not in response.text
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

