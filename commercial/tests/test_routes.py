from __future__ import annotations

import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from commercial.app.engine import demo_building, dhw_energy
from commercial.app.main import app, build_input_from_form
from commercial.app.pricing import _firewood_reference
from commercial.app.simulation_facts import FACT_SCENARIOS, _build_fact


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
        "floor_boundary_type": "ground",
        "ground_exposed_perimeter_m": "36",
        "ground_wall_thickness_m": "0.30",
        "ground_conductivity_w_mk": "2.0",
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


def _simple_home_lab_dhw_form(heating_choice: str, dhw_system_type: str = "same_as_heating") -> dict[str, str]:
    data = demo_form_data()
    data.update(
        {
            "building_length_m": "10",
            "building_width_m": "8",
            "heated_levels": "2",
            "average_height_m": "2.7",
            "house_window_area_m2": "20",
            "house_door_area_m2": "2.2",
            "heating_choice": heating_choice,
            "dhw_system_type": dhw_system_type,
            "expert_dhw_override": "",
        }
    )
    return data


def test_dhw_same_as_heat_pump_uses_dhw_cop_not_resistance_efficiency() -> None:
    building = build_input_from_form(_simple_home_lab_dhw_form("heat_pump"))

    assert building.dhw.system_type.value == "same_as_heating"
    assert building.dhw.carrier.value == "electricity"
    assert building.dhw.cop == pytest.approx(2.4)
    assert building.dhw.efficiency is None

    result = dhw_energy(building, useful_kwh=2400)
    assert result.carrier.value == "electricity"
    assert result.final_kwh == pytest.approx(1000)


def test_dhw_same_as_gas_uses_dhw_specific_generation_efficiency() -> None:
    building = build_input_from_form(_simple_home_lab_dhw_form("condensing_gas_boiler"))

    assert building.dhw.system_type.value == "same_as_heating"
    assert building.dhw.carrier.value == "natural_gas"
    assert building.dhw.efficiency == pytest.approx(0.88)
    assert building.dhw.cop is None


def test_dhw_dedicated_heat_pump_is_independent_from_space_heating_carrier() -> None:
    building = build_input_from_form(
        _simple_home_lab_dhw_form("condensing_gas_boiler", "heat_pump_water_heater")
    )

    assert building.heating.carrier.value == "natural_gas"
    assert building.dhw.system_type.value == "heat_pump_water_heater"
    assert building.dhw.carrier.value == "electricity"
    assert building.dhw.cop == pytest.approx(2.4)
    assert building.dhw.efficiency is None


def test_dhw_expert_override_preserves_explicit_carrier_and_efficiency() -> None:
    data = demo_form_data()
    data.update(
        {
            "expert_dhw_override": "on",
            "dhw_system_type": "custom",
            "dhw_carrier": "biomass",
            "dhw_efficiency": "0.72",
            "dhw_cop": "",
        }
    )
    building = build_input_from_form(data)

    assert building.dhw.system_type.value == "custom"
    assert building.dhw.carrier.value == "biomass"
    assert building.dhw.efficiency == pytest.approx(0.72)
    assert building.dhw.cop is None


def test_home_lab_exposes_explicit_dhw_source_selection() -> None:
    page = client.get("/home-lab-classic")
    assert page.status_code == 200
    assert 'id="hlnHomeDhwSystem"' in page.text
    assert 'value="same_as_heating">Același sistem ca încălzirea' in page.text
    assert 'value="electric_boiler">Boiler electric' in page.text
    assert 'value="gas_boiler">Centrală pe gaz' in page.text
    assert 'value="heat_pump_water_heater">Pompă de căldură pentru ACM' in page.text
    assert 'name="dhw_system_type" value="same_as_heating"' in page.text
    assert 'name="dhw_cop" value=""' in page.text

    js = client.get("/static/home-lab-next.js")
    assert js.status_code == 200
    assert 'dhwSystem: "same_as_heating"' in js.text
    assert 'formSet("dhw_system_type", state.dhwSystem || "same_as_heating")' in js.text
    assert 'homeState.dhwSystem = $("#hlnHomeDhwSystem").value' in js.text


def test_home_lab_editorial_experiment_is_isolated_and_does_not_auto_open_report() -> None:
    primary = client.get("/home-lab-next")
    assert primary.status_code == 200
    assert 'data-editorial-lab' in primary.text
    assert "Home Lab Editorial — experiment" in primary.text

    page = client.get("/home-lab-editorial")
    assert page.status_code == 200
    assert "Home Lab Editorial — experiment" in page.text
    assert "Analiza este gata." in page.text
    assert 'data-page="run"' in page.text
    assert 'data-page="report"' in page.text
    assert 'data-page="renewables"' in page.text
    assert "/static/home-lab-editorial.css?v=14" in page.text
    assert "/static/home-lab-editorial.js?v=14" in page.text
    assert "/static/home-lab-3d.js" not in page.text
    assert 'id="edBaselineClass"' in page.text
    assert 'id="edBaselineCost"' in page.text
    assert 'class="ed-baseline-bar"' in page.text
    assert 'id="edLocalitySuggestions"' in page.text
    assert 'id="edLocationMap"' in page.text
    assert 'inputmode="decimal" data-decimal-input name="heated_floor_area_m2"' in page.text
    assert 'inputmode="decimal" data-decimal-input name="wall_area_m2"' in page.text
    for advanced_id in ("advWallU", "advRoofU", "advFloorU", "advWindowU", "advHeatingScop", "advAch", "advInfiltrationAch", "advPvPerformanceRatio", "advSolarThermalEfficiency"):
        assert f'id="{advanced_id}"' in page.text

    # Editorial changes presentation only. It must keep the technical input
    # granularity of Home Lab instead of collapsing the building to broad
    # envelope profiles.
    for token in (
        'name="heated_floor_area_m2"',
        'name="heated_levels"',
        'name="average_height_m"',
        'name="wall_area_m2"',
        'name="roof_area_m2"',
        'name="floor_area_m2"',
        'name="heated_volume_m3"',
        'id="wallStructure"',
        'id="wallStructureThickness"',
        'id="wallInsulationMaterial"',
        'id="wallIns"',
        'id="topBoundary"',
        'id="roofInsulationMaterial"',
        'id="roofIns"',
        'id="floorBoundary"',
        'id="floorInsulationMaterial"',
        'id="floorIns"',
        'name="window_area_m2"',
        'id="glazing"',
        'id="orientation"',
        'id="heatPumpSource"',
        'id="heatingEmitter"',
        'id="heatingDistribution"',
        'id="heatingStorage"',
        'id="heatingControl"',
        'name="dhw_system_type"',
        'id="ventilation"',
        'id="cooling"',
        'name="pv_installed_power_kwp"',
        'name="pv_orientation"',
        'name="pv_tilt_degrees"',
        'name="solar_thermal_collector_area_m2"',
        'name="solar_thermal_orientation"',
        'name="solar_thermal_tilt_degrees"',
    ):
        assert token in page.text
    assert 'name="insulation_profile"' not in page.text

    css = client.get("/static/home-lab-editorial.css")
    assert css.status_code == 200
    assert "--max:820px" in css.text
    assert "backdrop-filter:blur(18px)" in css.text
    assert ".ed-baseline-bar" in css.text
    assert "width:min(100%,760px)" in css.text
    assert ".ed-locality-suggestions" in css.text
    assert ".ed-location-map-svg" in css.text

    js = client.get("/static/home-lab-editorial.js")
    assert js.status_code == 200
    assert "WALL_STRUCTURE_PRESETS" in js.text
    assert "INSULATION_LAMBDA_W_MK" in js.text
    assert "function syncTechnicalForm()" in js.text
    assert "function scheduleBaselineSummary(" in js.text
    assert "function paintBaselineSummary(" in js.text
    assert "function parseDecimal(" in js.text
    assert 'replace(",", ".")' in js.text
    assert 'data.set(input.name, decimalForForm(input.value))' in js.text
    assert 'fetch("/api/location-data"' in js.text
    assert "function renderLocalitySuggestions(" in js.text
    assert "function renderLocationMap(" in js.text
    assert "function selectLocality(" in js.text
    assert '"/api/home-lab-next/calculate"' in js.text
    assert '"/api/optimization/home-lab/v2/plan"' in js.text
    assert '"/api/optimization/home-lab/v2/branch"' in js.text
    assert '"/api/optimization/home-lab/v2/finalize"' in js.text
    assert 'showPage("done");' in js.text
    assert '$("#openReport").addEventListener("click", () => showPage("report"));' in js.text


def test_privacy_and_terms_pages_expose_required_disclosures() -> None:
    privacy = client.get("/privacy")
    assert privacy.status_code == 200
    assert "Politica de confidențialitate" in privacy.text
    assert "lacurent-home-lab-next-v1" in privacy.text
    assert "lacurent-calculator-draft-v1" in privacy.text
    assert "Continuă fără salvare" in privacy.text
    assert "karol@lacurent.com" in privacy.text
    assert "dataprotection.ro" in privacy.text

    terms = client.get("/terms")
    assert terms.status_code == 200
    assert "Termeni de utilizare" in terms.text
    assert "Nu reprezintă un Certificat de Performanță Energetică" in terms.text
    assert "încadrare orientativă calculată" in terms.text
    assert "karol@lacurent.com" in terms.text


def test_commercial_pages_expose_legal_links_and_privacy_controls_where_needed() -> None:
    company = client.get("/")
    assert company.status_code == 200
    assert 'href="/privacy"' in company.text
    assert 'href="/terms"' in company.text
    assert 'href="mailto:karol@lacurent.com"' in company.text

    calculator = client.get("/instalatii/calculator/legacy")
    assert calculator.status_code == 200
    assert 'href="/privacy"' in calculator.text
    assert 'href="/terms"' in calculator.text
    assert 'href="mailto:karol@lacurent.com"' in calculator.text
    assert 'data-lacurent-privacy-open' in calculator.text
    assert 'data-lacurent-first-use-consent' in calculator.text
    assert "/static/privacy-consent.js?v=privacy1" in calculator.text


def test_home_lab_local_persistence_and_analytics_are_consent_gated() -> None:
    response = client.get("/home-lab-classic")
    assert response.status_code == 200
    assert 'data-lacurent-first-use-consent' in response.text
    assert 'href="/privacy"' in response.text
    assert 'href="/terms"' in response.text
    assert "/static/privacy-consent.js?v=privacy1" in response.text

    privacy_js = client.get("/static/privacy-consent.js")
    assert privacy_js.status_code == 200
    assert 'const CONSENT_KEY = "lacurent-privacy-v1"' in privacy_js.text
    assert "allowsLocalAutosave" in privacy_js.text
    assert "clearLocalDrafts" in privacy_js.text

    home_js = client.get("/static/home-lab-next.js")
    assert home_js.status_code == 200
    assert "const localAutosaveAllowed" in home_js.text
    assert "if (localAutosaveAllowed())" in home_js.text
    assert "if (!localAutosaveAllowed()) return false;" in home_js.text
    assert "if (!analyticsAllowed()) return;" in home_js.text

    autosave_js = client.get("/static/calculator-autosave.js")
    assert autosave_js.status_code == 200
    assert "function autosaveAllowed()" in autosave_js.text
    assert "if (!autosaveAllowed()) return null;" in autosave_js.text
    assert "if (!autosaveAllowed()) return false;" in autosave_js.text


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


def test_installations_landing_is_retired_and_redirects_to_home_lab() -> None:
    response = client.get("/instalatii", follow_redirects=False)
    assert response.status_code == 308
    assert response.headers["location"] == "/home-lab-next"


def test_simulation_facts_index_is_public_and_indexable() -> None:
    response = client.get("/home-lab/facts")
    assert response.status_code == 200
    assert "Home Lab Facts" in response.text
    assert "SIMULĂRI PUBLICE" in response.text
    assert 'rel="canonical" href="https://lacurent.com/home-lab/facts"' in response.text
    assert "Motorul calculează" in response.text
    assert "AI-ul explică" in response.text
    assert 'href="/home-lab-next?source=facts"' in response.text
    assert "/static/simulation-facts.css?v=facts1" in response.text

    shortcut = client.get("/facts", follow_redirects=False)
    assert shortcut.status_code == 308
    assert shortcut.headers["location"] == "/home-lab/facts"


def test_robots_and_sitemap_expose_home_lab_facts() -> None:
    robots = client.get("/robots.txt")
    assert robots.status_code == 200
    assert "Sitemap: https://lacurent.com/sitemap.xml" in robots.text
    assert "Disallow: /api/" in robots.text

    sitemap = client.get("/sitemap.xml")
    assert sitemap.status_code == 200
    assert "https://lacurent.com/home-lab-next" in sitemap.text
    assert "https://lacurent.com/home-lab/facts" in sitemap.text
    assert "http://www.sitemaps.org/schemas/sitemap/0.9" in sitemap.text


def test_simulation_fact_is_derived_from_real_engine_runs() -> None:
    fact = _build_fact("Brașov", FACT_SCENARIOS[0])
    assert fact["locality"] == "Brașov"
    assert fact["scenario_id"] == "wall-u-025"
    assert fact["baseline_value"] > 0
    assert fact["scenario_value"] > 0
    assert fact["scenario_value"] < fact["baseline_value"]
    assert fact["change_percent"] < 0
    assert "160 m²" in fact["claim"]
    assert "Brașov" in fact["claim"]
    assert fact["methodology_version"]


def test_energy_calculator_alias_goes_straight_to_home_lab() -> None:
    response = client.get("/instalatii/calculator", follow_redirects=False)
    assert response.status_code == 308
    assert response.headers["location"] == "/home-lab-next"

    home_lab = client.get("/home-lab-classic")
    assert home_lab.status_code == 200
    assert 'data-home-lab-next' in home_lab.text
    assert 'data-hln-screen="home"' in home_lab.text
    assert "Casa este interfața." in home_lab.text


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
    assert "Raport tehnic estimativ de performanță energetică" in response.text
    assert "Nu este Certificat de Performanță Energetică (CPE)" in response.text
    assert 'href="/terms"' in response.text
    assert 'href="/privacy"' in response.text
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


def test_invalid_roof_vs_walls_fact_is_retired() -> None:
    index = client.get("/home-lab/facts")
    assert index.status_code == 200
    assert "Podul trebuie izolat întotdeauna primul? Nu." not in index.text
    assert "3.7×" not in index.text

    detail = client.get("/home-lab/facts/podul-trebuie-izolat-intotdeauna-primul")
    assert detail.status_code == 404

    sitemap = client.get("/sitemap.xml")
    assert sitemap.status_code == 200
    assert "podul-trebuie-izolat-intotdeauna-primul" not in sitemap.text


def test_home_lab_next_route_exposes_premium_house_first_flow() -> None:
    response = client.get("/home-lab-classic")
    assert response.status_code == 200
    assert 'id="hlnReportHeatingRequiredPower"' in response.text
    assert 'id="hlnReportHeatingSelectedPower"' in response.text
    assert 'id="hlnReportHeatingPowerReserve"' in response.text
    assert 'data-home-lab-next' in response.text
    assert 'viewport-fit=cover' in response.text
    assert 'data-hln-screen="home"' in response.text
    assert 'data-hln-screen="site"' in response.text
    assert 'data-hln-screen="intervention"' in response.text
    assert 'data-hln-screen="scenario"' in response.text
    assert "Salvează Casa mea și vezi îmbunătățirile" in response.text
    assert "Casa este interfața." in response.text
    assert "Ce vrei să schimbi?" in response.text
    assert "Păstrează intervenția" in response.text
    assert "Vezi îmbunătățirile ca un singur proiect." in response.text
    assert 'class="hln-house-board"' in response.text
    assert 'class="hln-house-visual hln-house-visual-home"' in response.text
    assert 'class="hln-impact-panel"' in response.text
    assert 'id="hln-i-wall"' in response.text
    assert 'id="hln-i-money"' in response.text
    assert "/static/home-lab-next.css?v=next361-cop-fuel" in response.text
    assert "/static/home-lab-next.js?v=next72-heating-power" in response.text
    assert "/static/home-lab-3d.css?v=3d31" in response.text
    assert 'aria-label="Schiță conceptuală a casei"' not in response.text
    assert 'aria-label="Casă cu zone de îmbunătățire"' not in response.text


def test_home_lab_persistent_summary_stays_bound_to_current_result_and_status() -> None:
    response = client.get("/home-lab-classic")
    assert response.status_code == 200
    assert 'class="hln-persistent-stack"' in response.text
    assert 'class="hln-live-summary"' in response.text
    assert 'id="hlnPersistentClass"' in response.text
    assert 'id="hlnPersistentCost"' in response.text
    assert 'id="hlnPersistentEnergy"' in response.text
    assert 'class="hln-dock"' in response.text
    assert 'class="hln-dock-benefits hln-dock-compare"' in response.text
    assert 'id="hlnDockCta"' in response.text
    assert 'id="hlnDockBack"' in response.text
    assert '<use href="#hln-i-arrow-left"></use>' in response.text
    assert 'data-mobile-label="Îmbunătățiri"' in response.text
    assert 'id="hlnPersistentClassContext"' in response.text
    assert 'id="hlnPersistentCostDelta"' in response.text
    assert 'id="hlnPersistentEnergyDelta"' in response.text
    assert 'class="hln-persistent-spacer"' in response.text
    assert 'id="hlnStatus"' in response.text
    assert response.text.index('class="hln-energy-strip"') < response.text.index('class="hln-live-summary"')
    assert response.text.index('class="hln-live-summary"') < response.text.index('data-hln-screen="home"')
    assert 'id="hlnDockClass"' not in response.text
    assert 'id="hlnDockCost"' not in response.text
    assert 'id="hlnDockEnergy"' not in response.text

    css = client.get("/static/home-lab-next.css")
    assert css.status_code == 200
    assert ".hln-persistent-stack{" in css.text
    assert "position:sticky" in css.text
    assert 'data-energy-class="A+"' in css.text
    assert ".hln-live-class-card" in css.text
    assert ".hln-live-delta.is-good" in css.text
    assert ".hln-live-delta.is-bad" in css.text
    assert ".hln-persistent-spacer" in css.text
    assert "position:fixed" in css.text
    assert "z-index:140" in css.text
    assert "-webkit-backdrop-filter:none!important" in css.text
    assert ".hln-technical-open .hln-persistent-stack" in css.text
    assert ".hln-technical-open .hln-editor.is-technical-mode" in css.text
    assert "/* #358 scope correction: comparison dock stays on desktop, CTA-only on phone. */" in css.text
    assert ".hln-dock-benefits{" in css.text
    assert "display:none!important" in css.text
    assert ".hln-dock-back:not([hidden])" in css.text
    assert "order:0" in css.text
    assert "order:1" in css.text
    assert 'data-hln-dock="report"' in css.text
    assert "max-width:min(60vw,190px)" in css.text
    assert "content:attr(data-mobile-label)" in css.text

    js = client.get("/static/home-lab-next.js")
    assert js.status_code == 200
    assert '$("#hlnPersistentClass").textContent' in js.text
    assert '$("#hlnPersistentCost").textContent' in js.text
    assert '$("#hlnPersistentEnergy").textContent' in js.text
    assert 'const costDeltaNode = $("#hlnPersistentCostDelta")' in js.text
    assert 'const energyDeltaNode = $("#hlnPersistentEnergyDelta")' in js.text
    assert 'costDeltaNode.textContent = `vs Casa mea · ${costDelta.text}`' in js.text
    assert 'energyDeltaNode.textContent = `vs Casa mea · ${energyDelta.text}`' in js.text
    assert 'summary.dataset.energyClass = energyClass' in js.text
    assert 'window.requestAnimationFrame(syncPersistentStackHeight)' in js.text
    assert 'document.body.classList.toggle("hln-technical-open", technical)' in js.text
    assert 'document.body.classList.remove("hln-technical-open")' in js.text
    assert 'dock?.classList.toggle("has-comparison", scenarioMode)' in js.text
    assert 'if (back) back.hidden = screen === "home"' in js.text
    assert 'backLabel.textContent = screen === "report" ? "Înapoi la optimizare" : "Înapoi"' in js.text
    assert 'ctaLabel.dataset.mobileLabel = "Îmbunătățiri"' in js.text
    assert '$("#hlnDockBack").addEventListener("click"' in js.text
    assert 'if (screen === "report")' in js.text
    assert 'showScreen("site");' in js.text
    assert 'cancelIntervention();' in js.text
    assert 'root.querySelectorAll("[data-hln-editor-open]").forEach' in js.text


def test_home_lab_energy_strip_labels_references_and_sen_source() -> None:
    response = client.get("/home-lab-classic")
    assert response.status_code == 200
    assert 'class="hln-energy-strip"' in response.text
    assert "Prețuri de referință, nu cotații live." in response.text
    assert 'href="https://www.transelectrica.ro/web/tel/sistemul-energetic-national"' in response.text
    assert "Referință" in response.text
    assert 'class="hln-price-status' in response.text
    assert "/static/home-lab-3d.js?v=3d55" in response.text
    assert 'id="hlnLiveConfigurator"' in response.text
    assert 'data-hln-smart-config="nzeb"' in response.text
    assert 'data-hln-smart-config="economic-auto"' in response.text
    assert 'data-hln-smart-config="economic-budget"' in response.text
    assert 'data-hln-smart-config="economic-bill"' in response.text
    assert 'data-hln-smart-config="economic-payback"' in response.text
    assert 'id="hlnRoiBudget"' in response.text
    assert 'id="hlnAnnualBillTarget"' in response.text
    assert 'id="hlnRoiPaybackYears"' in response.text
    assert "Optimizează pentru mine" in response.text
    assert "Folosește cel mai bine suma disponibilă" in response.text
    assert "Coboară factura până la ținta ta" in response.text
    assert "Recuperează investiția în maximum X ani" in response.text
    assert "Configurează automat îmbunătățirile" not in response.text
    assert 'data-hln-screen="report"' in response.text
    assert 'data-hln-go="report"' in response.text
    assert 'id="hlnReportBars"' in response.text
    assert 'id="hlnReportNzebStatus"' in response.text
    assert 'id="hlnReportStrategy"' in response.text
    assert 'data-hln-3d-stage="report"' in response.text
    assert 'id="hlnReportMonthlyCostChart"' in response.text
    assert 'id="hlnReportPvGeneration"' in response.text
    assert 'id="hlnReportHeatingSystem"' in response.text
    assert 'id="hlnReportAssumptions"' in response.text
    assert 'id="hlnReportDecisionSaving"' in response.text
    assert 'id="hlnReportDecisionInvestment"' in response.text
    assert 'id="hlnReportDecisionPayback"' in response.text
    assert 'id="hlnReportDecisionPriority"' in response.text
    assert 'id="hlnScenarioInvestmentSummary"' in response.text
    assert "Amortizarea este simplă" not in response.text
    assert 'data-hln-print-report' in response.text
    assert 'id="hlnImpactEfficiency"' in response.text
    assert 'id="hlnScenarioBenefitLabel"' in response.text
    assert 'id="hlnDockSavingLabel"' in response.text
    assert "Variație cost anual" in response.text
    assert "Consum energie" in response.text
    assert "Eficiență energetică" in response.text
    assert 'data-hln-reset-home' in response.text
    assert 'data-hln-reference-house' in response.text
    assert 'id="hlnEnergyScale"' in response.text
    assert 'id="hlnReferenceSpec"' in response.text
    assert "Ce înseamnă „Casa de referință” în MC001?" in response.text
    assert 'data-hln-measure="pv"' in response.text
    assert 'data-hln-measure="solar_thermal"' in response.text
    assert 'id="hlnHomePvKwp"' in response.text
    assert "5 categorii" in response.text
    assert 'data-hln-editor-open="renewables"' in response.text
    assert 'data-hln-editor="renewables"' in response.text
    assert 'id="hlnRenewablesSummary"' in response.text
    assert 'id="hlnHomeLocationMap"' in response.text
    assert 'id="hlnDockHomeClass"' in response.text
    assert 'id="hlnDockHomeCost"' in response.text
    assert 'id="hlnDockScenarioClass"' in response.text
    assert 'id="hlnDockScenarioCost"' in response.text
    assert 'id="hlnMapLocalityResults"' in response.text
    assert 'id="hlnBuildingType"' in response.text
    assert 'id="hlnBuildingType" disabled' in response.text
    assert "Apartament / clădire colectivă" not in response.text
    assert 'id="hlnWallAreaOverride"' in response.text
    assert 'id="hlnTopAreaOverride"' in response.text
    assert 'id="hlnFloorAreaOverride"' in response.text
    assert 'id="hlnVolumeOverride"' in response.text
    assert 'id="hlnDerivedFootprint"' in response.text
    assert 'id="hlnDerivedPerimeter"' in response.text
    assert 'id="hlnDerivedGrossWalls"' in response.text
    assert 'id="hlnDerivedOpenings"' in response.text
    assert "Precalculat de LaCurent" in response.text
    assert "Pereții opaci scad ferestrele și 2,2 m² de uși exterioare." in response.text
    assert "Material izolație pereți" in response.text
    assert "Material și grosime finală simulate" in response.text
    assert "Material strat nou" not in response.text
    assert "Stratul nou se adaugă peste izolația existentă" not in response.text
    assert 'id="hlnConstructionYear"' in response.text
    assert "Estimativ" in response.text
    assert "verifică ipotezele înainte de decizie" in response.text
    assert 'id="hlnHomeTopBoundary"' in response.text
    assert "Pod rece / neîncălzit — calculează planșeul" in response.text
    assert 'id="hlnHomeFloorBoundary"' in response.text
    assert "Placă / pardoseală pe sol" in response.text
    assert "Subsol / beci neîncălzit" in response.text
    assert "Pardoseala pe sol este calculată separat ca Hg" in response.text
    assert "ISO 13370" in response.text
    assert "λ=2,0 W/mK" in response.text
    assert "modelat ca Hu" in response.text
    assert 'name="roof_boundary_type"' in response.text
    assert 'name="floor_boundary_type"' in response.text
    assert "U=3,25 W/m²K" in response.text
    assert "U=2,25 W/m²K" in response.text
    assert "folosește conservator bztu=1,00" in response.text
    assert "setează 0 cm" in response.text
    assert 'id="hlnHomeTopStructure"' not in response.text
    assert 'id="hlnHomeAirtightness"' not in response.text
    assert 'id="hlnHomeAtticLeakage"' not in response.text
    assert 'name="infiltration_air_changes_per_hour"' not in response.text
    assert 'name="ventilation_air_changes_per_hour"' not in response.text
    assert 'id="hlnHomeSolarThermalArea"' in response.text
    assert 'id="hlnHomeHeatingEmitter"' in response.text
    assert response.text.count('data-hln-home-heating-chain') == 4
    assert response.text.count('data-hln-scenario-heating-chain') == 4
    assert 'id="hlnHomeHeatingDistribution"' in response.text
    assert 'id="hlnHomeHeatingStorage"' in response.text
    assert 'id="hlnHomeHeatingControl"' in response.text
    assert 'id="hlnHomeHeatPumpSource"' in response.text
    assert 'id="hlnScenarioHeatingEmitter"' in response.text
    assert 'id="hlnScenarioHeatingDistribution"' in response.text
    assert 'id="hlnScenarioHeatingStorage"' in response.text
    assert 'id="hlnScenarioHeatingControl"' in response.text
    assert 'value="electric_boiler"' in response.text
    assert 'id="hlnLivePvKwp" type="range" min="0" max="30" step="0.5"' in response.text
    assert 'id="hlnLiveSolarThermalKw" type="range" min="0" max="30" step="0.5"' in response.text
    assert 'id="hlnQuickEditOverlay"' in response.text
    assert 'id="hlnQuickEditRange" type="range"' in response.text
    assert "Glisează și urmărește casa și rezultatul actualizându-se. Apasă Gata când ai terminat." in response.text
    assert response.text.count('value="reference_mc001" disabled') == 4


def test_home_lab_mobile_status_stays_in_topbar_flow() -> None:
    response = client.get("/static/home-lab-next.css?v=next26")
    assert response.status_code == 200
    assert ".hln-topbar-meta{\n    grid-column:1/-1;\n    position:static;" in response.text
    assert "max-width:100%;\n    overflow:hidden;" in response.text



def test_home_lab_geometry_and_roi_rounding_share_one_geometry_model() -> None:
    js = client.get("/static/home-lab-next.js")
    assert js.status_code == 200
    source = js.text
    assert "function houseGeometry(state)" in source
    assert "derivedWallArea = Math.max(1, grossWalls - windows - doors)" in source
    assert 'formSet("heated_volume_m3", volume.toFixed(3))' in source
    assert 'formSet("floor_area_m2", floorArea.toFixed(3))' in source
    assert "return houseGeometry(state);" in source
    assert "geometry.floorArea * deltaCm * rate" in source
    assert "const roiCommercialStepCm = 5;" in source
    assert 'const level = mode === "roi"' in source
    assert "Math.ceil(addedThicknessCm / roiCommercialStepCm) * roiCommercialStepCm" in source



def test_home_lab_3d_pauses_hidden_scenes_and_optimizer_rendering() -> None:
    response = client.get("/static/home-lab-3d.js")
    assert response.status_code == 200
    assert 'this.mount.offsetParent !== null' in response.text
    assert 'classList.contains("is-optimizer-busy")' in response.text
    assert '"IntersectionObserver" in window' in response.text
    assert 'this.isViewportVisible' in response.text
    assert 'this.mode === "report" ? 40 : 30' in response.text


def test_home_lab_roi_reconciles_visible_capex_and_avoids_request_bursts() -> None:
    response = client.get("/static/home-lab-next.js")
    assert response.status_code == 200
    source = response.text
    assert "OPTIMIZER_MIN_REQUEST_GAP_MS = 250" in source
    assert "roiCostBasisText(action, baseState, candidateState)" in source
    assert "CAPEX-ul pachetului nu corespunde intervențiilor selectate" in source
    assert "economia pachetului cu o singură măsură" in source
    assert "CEA MAI BUNĂ MĂSURĂ ROI" in source
    assert "lei/lună în medie" in source
    assert 'window.scrollTo({top: 0, behavior: "auto"})' in source
    assert "failedMicroBatches = []" in source
    assert "OPTIMIZER_TRANSIENT_RETRY_STATUSES.has(status)" in source
    assert "partialSearch:failedMicroBatches.length > 0" in source
    assert "puncte de căutare omise după faulturi tranzitorii" in source
    assert '"/api/optimization/home-lab/phase-candidates"' in source
    assert "renderOptimizerFailedCandidates" in source
    assert "resetOptimizerConsole" in source
    assert "appendOptimizerConsole" in source
    assert "optimizerConsoleCandidateParameters" in source
    assert "ventilation_heat_recovery_efficiency_target" in source
    assert "calculationStages" in source
    assert "stage?.stage" in source
    assert "Fault în val: concurență" in source
    assert "Două valuri curate: concurență" in source
    assert "reexecuție serială înainte de a continua" in source
    assert '"RECOVERED"' in source
    assert "C ${batchIndex + 1}/${phaseOffsets.length}" in source
    assert "processedCandidates}/${plannedCandidates} total" in source
    assert '$("#hlnOptimizerConsole")' in source
    assert "candidateParameters" in source
    assert "concurență ${adaptiveBranchParallelism}/${configuredBranchParallelism}" in source


def test_home_lab_exposes_four_single_constraint_parametric_objectives() -> None:
    response = client.get("/static/home-lab-next.js")
    assert response.status_code == 200
    source = response.text
    assert "function configureParametricEconomicOptimizer" in source
    assert 'backendMode:"investment_budget"' in source
    assert 'backendMode:"annual_bill_target"' in source
    assert 'backendMode:"max_payback_years"' in source
    assert 'backendMode:"auto_economic"' in source
    assert 'body.set("_investment_budget_lei"' in source
    assert 'body.set("_annual_bill_target_lei"' in source
    assert 'body.set("_max_payback_years"' in source
    assert '"/api/optimization/home-lab/plan"' in source
    assert '"/api/optimization/home-lab/branch"' in source
    assert '"/api/optimization/home-lab/finalize"' in source
    assert "heatingBranchEvaluations" in source
    assert "selectedHeating" in source
    assert '["economic-auto","economic-budget","economic-bill","economic-payback"].includes(action)' in source
    assert "isFinancialOptimizationMeta" in source
    assert 'const buttons = $("[data-hln-smart-config]")' not in source
    assert 'const buttons = $$("[data-hln-smart-config]")' in source

def test_payback_optimizer_applies_threshold_to_complete_packages_not_components() -> None:
    response = client.get("/static/home-lab-next.js")
    assert response.status_code == 200
    source = response.text
    family_start = source.index("function bestEconomicVariantPerFamily")
    family_end = source.index("async function configureNzeb", family_start)
    family_source = source[family_start:family_end]
    assert "row.paybackYears > settings.maxPaybackYears" not in family_source
    assert "evaluatePaybackPackageFrontier" in source
    assert "threshold-independent package frontier" in source
    assert "item.economics.paybackYears <= settings.maxPaybackYears" in source
    assert "same package is eligible when the user asks for 6 years" in source


def test_cloudflare_worker_converts_ordinary_asgi_exceptions_to_branded_503() -> None:
    worker_source = (
        Path(__file__).resolve().parents[1] / "cloudflare-worker" / "worker.py"
    ).read_text(encoding="utf-8")
    assert "except Exception as exc:" in worker_source
    assert "status=503" in worker_source
    assert '"retry-after": "2"' in worker_source
    assert '"content-type": "text/html; charset=utf-8"' in worker_source
    assert "Laboratorul ia o pauză scurtă." in worker_source
    assert "from app.main import app" in worker_source
    assert worker_source.index("from app.main import app") < worker_source.index("class Default")
    assert "type(exc).__name__" in worker_source


def test_browser_404_uses_branded_lacurent_error_page() -> None:
    response = client.get(
        "/pagina-care-nu-exista",
        headers={"Accept": "text/html"},
    )
    assert response.status_code == 404
    assert "text/html" in response.headers["content-type"]
    assert "Pagina asta s-a rătăcit." in response.text
    assert "Casă LaCurent cu o siguranță electrică declanșată" in response.text
    assert 'href="/home-lab-next"' in response.text
    assert response.headers["cache-control"] == "no-store"


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
    assert payload["reference_parameters"]["u_values_w_m2k"]["exterior_wall"] == pytest.approx(0.25)
    assert payload["reference_parameters"]["u_values_w_m2k"]["roof"] == pytest.approx(0.15)
    assert payload["reference_parameters"]["u_values_w_m2k"]["floor"] == pytest.approx(0.20)
    assert payload["reference_parameters"]["u_values_w_m2k"]["window"] == pytest.approx(1.11)
    assert payload["reference_parameters"]["physical_mapping"]["roof"]["insulation_cm"] > payload["reference_parameters"]["physical_mapping"]["floor"]["insulation_cm"]
    assert payload["reference_parameters"]["physical_mapping"]["floor"]["mapping_status"] == "iso13370_ground_inverse"
    assert payload["reference_parameters"]["physical_mapping"]["window"]["solar_gn"] == pytest.approx(0.47)
    assert payload["reference_parameters"]["physical_mapping"]["window"]["solar_climate_zone"] == "III"
    assert "Tabel 2.4" in payload["reference_parameters"]["envelope_source"]
    assert payload["reference_parameters"]["heating_efficiency"] > 0
    assert payload["transmission_components"]["hg_w_k"] > 0
    assert payload["annual_outdoor_temperature_c"] is not None
    assert payload["monthly"][0]["ground_transmission_kwh"] > 0
    ground_loss = next(
        row for row in payload["heat_loss_breakdown"]
        if row.get("boundary_type") == "ground"
    )
    assert ground_loss["component"] == "Hg"
    assert ground_loss["calculation_method"] == "iso13370_slab_on_ground_steady_state"
    assert ground_loss["effective_u_value_w_m2k"] < ground_loss["u_value_w_m2k"]


def test_form_maps_cold_attic_and_ground_to_hu_and_hg() -> None:
    data = demo_form_data()
    data["roof_boundary_type"] = "unheated_attic"
    data["floor_boundary_type"] = "ground"

    building = build_input_from_form(data)
    roof = next(item for item in building.envelope if item.type.value == "roof")
    floor = next(item for item in building.envelope if item.type.value == "floor")

    assert roof.boundary_type.value == "unheated_attic"
    assert roof.boundary_correction_factor == 1.0
    assert floor.boundary_type.value == "ground"
    assert floor.boundary_correction_factor is None
    assert floor.ground_contact is not None
    assert floor.ground_contact.exposed_perimeter_m == 36
    assert floor.ground_contact.wall_thickness_m == 0.30
    assert floor.ground_contact.ground_conductivity_w_mk == 2.0


def test_form_can_supply_explicit_unheated_attic_zone_balance() -> None:
    data = demo_form_data()
    data["roof_boundary_type"] = "unheated_attic"
    data["roof_boundary_correction_factor"] = ""
    data["roof_unheated_exterior_envelope_w_k"] = "30"
    data["roof_unheated_exterior_ventilation_coefficient"] = "0.5"
    data["roof_unheated_conditioned_zone_heat_transfer_w_k"] = "20"

    building = build_input_from_form(data)
    roof = next(item for item in building.envelope if item.type.value == "roof")

    assert roof.boundary_type.value == "unheated_attic"
    assert roof.boundary_correction_factor is None
    assert roof.unheated_zone is not None
    assert roof.unheated_zone.heat_transfer_to_exterior_envelope_w_k == 30
    assert roof.unheated_zone.exterior_ventilation_coefficient == 0.5
    assert roof.unheated_zone.conditioned_zone_heat_transfers_w_k == [20]


def test_partial_unheated_zone_balance_is_rejected() -> None:
    data = demo_form_data()
    data["roof_boundary_type"] = "unheated_attic"
    data["roof_unheated_exterior_envelope_w_k"] = "30"

    with pytest.raises(ValueError):
        build_input_from_form(data)


def test_legacy_form_without_floor_boundary_still_maps_floor_to_ground() -> None:
    data = demo_form_data()
    data.pop("floor_boundary_type", None)

    building = build_input_from_form(data)
    floor = next(item for item in building.envelope if item.type.value == "floor")

    assert floor.boundary_type.value == "ground"
    assert floor.boundary_correction_factor is None
    assert floor.ground_contact is not None


def test_form_maps_heated_attic_roof_to_direct_exterior_and_heated_floor_to_zero_loss() -> None:
    data = demo_form_data()
    data["roof_boundary_type"] = "outside_air"
    data["floor_boundary_type"] = "adjacent_heated_space"

    building = build_input_from_form(data)
    roof = next(item for item in building.envelope if item.type.value == "roof")
    floor = next(item for item in building.envelope if item.type.value == "floor")

    assert roof.boundary_type.value == "outside_air"
    assert roof.boundary_correction_factor == 1.0
    assert floor.boundary_type.value == "adjacent_heated_space"
    assert floor.boundary_correction_factor == 0.0


def test_home_lab_next_can_skip_redundant_reference_for_live_scenarios() -> None:
    data = demo_form_data()
    data["_skip_reference"] = "1"

    response = client.post("/api/home-lab-next/calculate", data=data)

    assert response.status_code == 200
    payload = response.json()
    assert payload["final_energy_kwh"] > 0
    assert payload["reference"] is None
    # Methodological reference parameters remain available to the UI from the
    # registry even when the expensive reference-building calculation is skipped.
    assert payload["reference_parameters"]["u_values_w_m2k"]["exterior_wall"] > 0


def test_home_lab_next_optimizer_candidate_returns_compact_metrics_only() -> None:
    data = demo_form_data()
    data["_skip_reference"] = "1"
    data["_optimizer_candidate"] = "1"

    response = client.post("/api/home-lab-next/calculate", data=data)

    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {
        "final_energy_kwh",
        "primary_specific_kwh_m2",
        "co2_specific_kg_m2",
        "annual_cost_lei",
    }
    assert payload["final_energy_kwh"] > 0
    assert payload["primary_specific_kwh_m2"] > 0
    assert payload["co2_specific_kg_m2"] >= 0
    assert payload["annual_cost_lei"] is not None


def test_partner_home_lab_next_calculation_reuses_existing_energy_engine() -> None:
    response = client.post("/embed/demo-store/next/calculate", data=demo_form_data())
    assert response.status_code == 200
    payload = response.json()
    assert payload["final_energy_kwh"] > 0
    assert payload["design_heat_load_kw"] > 0


def test_home_lab_next_direct_electric_heating_pv_changes_live_result() -> None:
    base = demo_form_data()
    base.update(
        {
            "building_length_m": "10",
            "building_width_m": "8",
            "heated_levels": "2",
            "average_height_m": "2.7",
            "house_window_area_m2": "20",
            "heating_choice": "electric_resistance",
            "expert_heating_override": "",
            "cooling_enabled": "",
            "pv_enabled": "",
            "pv_installed_power_kwp": "0",
            "pv_orientation": "south",
            "pv_tilt_degrees": "30",
            "pv_performance_ratio": "0.82",
        }
    )

    without_pv = client.post("/api/home-lab-next/calculate", data=base)
    assert without_pv.status_code == 200
    without_payload = without_pv.json()

    with_pv_data = dict(base)
    with_pv_data.update(
        {
            "pv_enabled": "on",
            "pv_installed_power_kwp": "10",
        }
    )
    with_pv = client.post("/api/home-lab-next/calculate", data=with_pv_data)
    assert with_pv.status_code == 200
    with_payload = with_pv.json()

    assert with_payload["renewables"]["pv"]["annual_generation_kwh"] > 0
    assert with_payload["renewables"]["pv"]["self_consumed_kwh"] > 0
    assert with_payload["final_energy_kwh"] < without_payload["final_energy_kwh"]
    assert with_payload["annual_cost_lei"] < without_payload["annual_cost_lei"]


def test_home_lab_next_normalizes_stale_wood_stove_chain() -> None:
    data = demo_form_data()
    data.update(
        {
            "heating_choice": "wood_stove",
            "expert_heating_override": "",
            "heating_chain_enabled": "on",
            "heating_generator_type": "heat_pump_ground_water",
            "heating_emitter_type": "radiators_high_temp",
            "heating_distribution_type": "hydronic_insulated",
            "heating_storage_type": "buffer_large",
            "heating_control_type": "weather_compensated",
        }
    )

    response = client.post("/api/home-lab-next/calculate", data=data)

    assert response.status_code == 200
    system = response.json()["heating_system"]
    assert system["generator_type"] == "wood_stove"
    assert system["emitter_type"] == "local"
    assert system["distribution_type"] == "local"
    assert system["storage_type"] == "none"
    assert system["control_type"] == "manual"
    assert system["design_flow_temperature_c"] is None
    assert system["design_return_temperature_c"] is None


def test_home_lab_next_exposes_firewood_cubic_metres_per_year() -> None:
    data = demo_form_data()
    data.update(
        {
            "heating_choice": "wood_boiler",
            "expert_heating_override": "",
            "cooling_enabled": "",
        }
    )
    response = client.post("/api/home-lab-next/calculate", data=data)

    assert response.status_code == 200
    fuel = response.json()["annual_fuel_use"]
    assert fuel["fuel"] == "firewood"
    assert fuel["unit"] == "m3"
    assert fuel["quantity"] > 0
    assert fuel["final_energy_kwh"] > 0


def test_home_lab_next_exposes_pellet_kilograms_per_year() -> None:
    data = demo_form_data()
    data.update(
        {
            "heating_choice": "pellet_boiler",
            "expert_heating_override": "",
            "cooling_enabled": "",
        }
    )
    response = client.post("/api/home-lab-next/calculate", data=data)

    assert response.status_code == 200
    fuel = response.json()["annual_fuel_use"]
    assert fuel["fuel"] == "pellets"
    assert fuel["unit"] == "kg"
    assert fuel["quantity"] > 0
    assert fuel["final_energy_kwh"] > 0


def test_home_lab_next_direct_electric_is_generic_and_ignores_stale_chain_inputs() -> None:
    variants = [
        ("radiators_high_temp", "hydronic_insulated", "buffer_large", "manual"),
        ("underfloor", "underfloor", "buffer_small", "zoned"),
        ("fan_coils", "hydronic_uninsulated", "none", "weather_compensated"),
        ("air", "air", "buffer_large", "thermostatic_valves"),
    ]
    results = []
    for emitter, distribution, storage, control in variants:
        data = demo_form_data()
        data.update(
            {
                "heating_choice": "electric_resistance",
                "expert_heating_override": "",
                "heating_chain_enabled": "on",
                "heating_generator_type": "heat_pump_ground_water",
                "heating_emitter_type": emitter,
                "heating_distribution_type": distribution,
                "heating_storage_type": storage,
                "heating_control_type": control,
                "cooling_enabled": "",
                "pv_enabled": "",
                "solar_thermal_enabled": "",
            }
        )
        response = client.post("/api/home-lab-next/calculate", data=data)
        assert response.status_code == 200
        payload = response.json()
        system = payload["heating_system"]
        assert system["generator_type"] == "electric_direct"
        assert system["emitter_type"] == "local"
        assert system["distribution_type"] == "local"
        assert system["storage_type"] == "none"
        assert system["control_type"] == "room_thermostat"
        assert system["design_flow_temperature_c"] is None
        assert system["design_return_temperature_c"] is None
        results.append(payload["final_energy_kwh"])

    assert max(results) == min(results)


def test_non_heat_pump_generator_ignores_stale_heat_pump_subtype() -> None:
    data = demo_form_data()
    data.update(
        {
            "heating_choice": "condensing_gas_boiler",
            "expert_heating_override": "",
            "heating_chain_enabled": "on",
            "heating_generator_type": "heat_pump_ground_water",
            "heating_emitter_type": "radiators_low_temp",
            "heating_distribution_type": "hydronic_insulated",
            "heating_storage_type": "none",
            "heating_control_type": "room_thermostat",
        }
    )

    response = client.post("/api/home-lab-next/calculate", data=data)

    assert response.status_code == 200
    system = response.json()["heating_system"]
    assert system["generator_type"] == "condensing_gas_boiler"
    assert system["emitter_type"] == "radiators_low_temp"


def test_home_lab_next_air_to_air_heat_pump_normalizes_stale_hydronic_chain() -> None:
    data = demo_form_data()
    data.update(
        {
            "heating_choice": "heat_pump",
            "expert_heating_override": "",
            "heating_chain_enabled": "on",
            "heating_generator_type": "heat_pump_air_air",
            "heating_emitter_type": "underfloor",
            "heating_distribution_type": "underfloor",
            "heating_storage_type": "buffer_large",
            "heating_control_type": "zoned",
        }
    )

    response = client.post("/api/home-lab-next/calculate", data=data)

    assert response.status_code == 200
    system = response.json()["heating_system"]
    assert system["generator_type"] == "heat_pump_air_air"
    assert system["emitter_type"] == "air"
    assert system["distribution_type"] == "air"
    assert system["storage_type"] == "none"
    assert system["design_flow_temperature_c"] is None
    assert system["design_return_temperature_c"] is None


def test_home_lab_next_heat_pump_emitter_changes_light_engine_performance() -> None:
    base = demo_form_data()
    base.update(
        {
            "building_length_m": "10",
            "building_width_m": "8",
            "heated_levels": "2",
            "average_height_m": "2.7",
            "house_window_area_m2": "20",
            "heating_choice": "heat_pump",
            "expert_heating_override": "",
            "heating_chain_enabled": "on",
            "heating_generator_type": "heat_pump_air_water",
            "heating_emitter_type": "radiators_high_temp",
            "heating_distribution_type": "hydronic_insulated",
            "heating_storage_type": "none",
            "heating_control_type": "room_thermostat",
            "heating_design_flow_temperature_c": "",
            "heating_design_return_temperature_c": "",
            "heating_auxiliary_electricity_kwh_year": "",
            "cooling_enabled": "",
            "pv_enabled": "",
            "solar_thermal_enabled": "",
        }
    )

    radiators = client.post("/api/home-lab-next/calculate", data=base)
    assert radiators.status_code == 200
    radiator_payload = radiators.json()

    floor_data = dict(base)
    floor_data.update(
        {
            "heating_emitter_type": "underfloor",
            "heating_distribution_type": "underfloor",
            "heating_control_type": "zoned",
        }
    )
    underfloor = client.post("/api/home-lab-next/calculate", data=floor_data)
    assert underfloor.status_code == 200
    floor_payload = underfloor.json()

    assert radiator_payload["heating_system"]["generator_performance_kind"] == "scop"
    assert radiator_payload["heating_system"]["generator_performance"] == 2.3
    assert floor_payload["heating_system"]["generator_performance"] == 3.2
    assert radiator_payload["heating_system"]["design_flow_temperature_c"] == 60
    assert floor_payload["heating_system"]["design_flow_temperature_c"] == 35
    assert floor_payload["final_energy_kwh"] < radiator_payload["final_energy_kwh"]
    assert floor_payload["annual_cost_lei"] < radiator_payload["annual_cost_lei"]
    assert floor_payload["heating_system"]["auxiliary_electricity_kwh"] == 220


def test_home_lab_next_exposes_source_backed_nzeb_target() -> None:
    data = demo_form_data()
    # Home Lab posts the selected geographic locality ID, not only the
    # station/locality display name. The locality record is the source of the
    # MC001 climate-zone assignment used by Table 2.10a.
    data["locality_id"] = "siruta-54984"
    response = client.post("/api/home-lab-next/calculate", data=data)

    assert response.status_code == 200
    payload = response.json()
    target = payload["nzeb_target"]
    assert target is not None
    assert payload["climate_zone"] == "III"
    assert target["primary_energy_kwh_m2_year"] == 133.3
    assert target["co2_kg_m2_year"] == 17.1
    assert target["building_type"] == "residential_individual"
    assert target["climate_zone"] == "III"
    assert target["energy_unit"] == "kWh/(m²·an)"
    assert "Tabel 2.10a" in target["source"]
    assert "Tabel 2.4" in target["envelope_source"]
    assert target["envelope_u_max_w_m2k"]["exterior_wall"] == 0.25
    assert target["envelope_u_max_w_m2k"]["roof"] == 0.15
    assert payload["co2_specific_kg_m2"] >= 0
    assert payload["methodology_version"]
    assert payload["methodology_source"]
    assert isinstance(payload["assumptions"], list)
    assert len(payload["monthly_costs"]) == 12
    assert all(row["final_energy_kwh"] >= 0 for row in payload["monthly_costs"])


def test_home_lab_next_exposes_source_backed_major_renovation_target() -> None:
    data = demo_form_data()
    data["locality_id"] = "siruta-54984"
    response = client.post("/api/home-lab-next/calculate", data=data)

    assert response.status_code == 200
    payload = response.json()
    target = payload["renovation_target"]
    assert target is not None
    assert target["target_kind"] == "existing_major"
    assert target["building_type"] == "residential_individual"
    assert target["climate_zone"] == "III"
    assert target["primary_energy_kwh_m2_year"] == 156.8
    assert target["co2_kg_m2_year"] == 25.5
    assert "Tabel 2.10b" in target["source"]


def test_home_lab_next_calculates_pv_and_solar_thermal_from_solar_resource() -> None:
    data = demo_form_data()
    data.update(
        {
            "pv_enabled": "on",
            "pv_installed_power_kwp": "5",
            "pv_orientation": "south",
            "pv_tilt_degrees": "30",
            "pv_performance_ratio": "0.82",
            "solar_thermal_enabled": "on",
            "solar_thermal_collector_area_m2": "4",
            "solar_thermal_orientation": "south",
            "solar_thermal_tilt_degrees": "45",
            "solar_thermal_system_efficiency": "0.45",
        }
    )

    response = client.post("/api/home-lab-next/calculate", data=data)

    assert response.status_code == 200
    payload = response.json()
    assert payload["renewables"]["pv"]["annual_generation_kwh"] > 0
    assert payload["renewables"]["pv"]["annual_plane_hsol_kwh_m2"] > 0
    assert payload["renewables"]["solar_thermal"]["annual_available_kwh"] > 0
    assert payload["renewables"]["solar_thermal"]["used_for_dhw_kwh"] > 0
    assert len(payload["renewables"]["monthly"]) == 12
    assert payload["gross_service_final_energy_kwh"] >= payload["final_energy_kwh"]


def test_home_lab_next_calculation_is_single_pass_without_reference_engine_recursion() -> None:
    source = Path("commercial/app/main.py").read_text(encoding="utf-8")
    section = source.split("async def home_lab_next_calculation", 1)[1].split(
        '@app.post("/api/home-lab-next/calculate")', 1
    )[0]
    assert "calculate(building, include_reference=False)" in section
    assert "include_reference=not (skip_reference or optimizer_candidate)" not in section


def test_home_lab_next_optimizer_uses_compact_cached_candidates() -> None:
    response = client.get("/static/home-lab-next.js")
    assert response.status_code == 200
    assert 'body.set("_optimizer_candidate", "1")' in response.text
    assert "optimizerCandidateCache = new Map()" in response.text
    assert "OPTIMIZER_CANDIDATE_CACHE_MAX = 192" in response.text
    assert "OPTIMIZER_MAX_ENGINE_EVALUATIONS = 16" in response.text
    assert "optimizerEvaluationCount >= OPTIMIZER_MAX_ENGINE_EVALUATIONS" in response.text
    assert "OPTIMIZER_REQUEST_TIMEOUT_MS = 30000" in response.text
    assert "fetchWithTimeout(" in response.text
    assert "optimizerAbortController?.signal || null" in response.text
    assert "calculateCandidate(state, overrides, {compact:false})" in response.text
    assert "function roiEconomics" in response.text
    assert "function roiCapexForAction" in response.text
    assert "async function loadRoiCostBasis" in response.text
    assert 'roiCostBasisMeta?.source || "catalog"' in response.text
    assert 'const actionMode = projectMode === "new_nzeb" ? "nzeb" : "energy"' in response.text
    assert "alreadyAtTarget" in response.text


def test_home_lab_next_live_calculation_avoids_startup_request_storms_and_hangs() -> None:
    response = client.get("/static/home-lab-next.js")
    assert response.status_code == 200
    js = response.text
    assert "LIVE_REQUEST_TIMEOUT_MS = 8000" in js
    assert "async function fetchWithTimeout" in js
    assert "Calculul a durat prea mult. Reîncearcă." in js
    assert "const retryable =" not in js
    assert 'scheduleCalculate("scenario", 280)' in js
    assert 'homeResultState = homeResult ? "fresh" : "empty"' in js
    assert 'scenarioResultState = scenarioResult ? "fresh" : "empty"' in js
    assert 'refreshedHome = await calculateState' not in js
    assert 'if (baselineSaved) calculateState(scenarioState, "scenario")' not in js
    assert 'cta.disabled = state !== "error"' in js


def test_home_lab_next_roi_uses_catalog_without_homeowner_price_form() -> None:
    response = client.get("/home-lab-classic")
    assert response.status_code == 200
    assert 'id="hlnProjectMode"' in response.text
    assert 'value="existing_standard"' in response.text
    assert 'value="existing_major"' in response.text
    assert 'value="new_nzeb"' in response.text
    assert 'id="hlnRoiCostSource"' in response.text
    assert 'id="hlnRoiCostAssumptions"' in response.text
    assert "Parametrii tehnici sunt optimizați continuu înainte de orice discretizare comercială." in response.text
    assert "Nu combinăm mai multe constrângeri într-o singură rulare." in response.text
    assert 'id="hlnRoiCostWall"' not in response.text
    assert 'id="hlnRoiCostDoor"' not in response.text
    assert 'id="hlnRoiCostHeating"' not in response.text
    assert 'id="hlnRoiCostPv"' not in response.text
    assert "Nu trebuie să introduci costuri manual" in response.text
    assert "efort investițional relativ" not in response.text


def test_market_cost_basis_fallback_is_complete_and_versioned() -> None:
    response = client.get("/api/market-cost-basis")
    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "seed_fallback"
    assert payload["catalog_version"] == "ro-market-planning-2026-09-22"
    expected = {
        "wall", "roof", "floor", "windows", "door",
        "ventilation", "heating_control", "heating", "pv", "solar_thermal",
    }
    assert set(payload["costs"]) == expected
    for item in payload["costs"].values():
        assert float(item["cost_lei"]) > 0
        assert item["unit"]
        assert item["source_kind"]
        assert item["observed_on"] == "2026-09-22"
        assert item["confidence"] in {"low", "medium", "high"}


def test_roi_cost_basis_bootstraps_through_worker_binding_not_deploy_token() -> None:
    from pathlib import Path

    source = Path("commercial/app/main.py").read_text(encoding="utf-8")
    workflow = Path(".github/workflows/commercial-v2-cloudflare-worker.yml").read_text(
        encoding="utf-8"
    )

    assert "async def _ensure_roi_cost_basis_d1" in source
    assert "CREATE TABLE IF NOT EXISTS roi_cost_basis" in source
    assert "INSERT OR REPLACE INTO roi_cost_basis" in source
    assert "await _ensure_roi_cost_basis_d1(db)" in source
    assert "wrangler d1 execute lacurent-db --remote" not in workflow
    assert 'market_cost_payload.get("source") != "d1"' in workflow


def test_roi_cost_basis_coalesces_concurrent_d1_bootstrap_and_reads(monkeypatch) -> None:
    import asyncio
    from types import SimpleNamespace

    from starlette.requests import Request
    from commercial.app import main

    seed = main.roi_cost_basis_seed()

    class Result:
        def __init__(self, rows):
            self.results = rows

    class Statement:
        def __init__(self, db, sql):
            self.db = db
            self.sql = sql

        def bind(self, *_args):
            return self

        async def run(self):
            await asyncio.sleep(0)
            self.db.run_calls += 1
            if "SELECT COUNT(*)" in self.sql:
                return Result([{
                    "row_count": len(seed["costs"]),
                    "catalog_version": seed["catalog_version"],
                }])
            if "SELECT family" in self.sql:
                return Result([{"family": family, **item} for family, item in seed["costs"].items()])
            return Result([])

    class Database:
        def __init__(self):
            self.prepare_calls = 0
            self.run_calls = 0

        def prepare(self, sql):
            self.prepare_calls += 1
            return Statement(self, sql)

    monkeypatch.setattr(main, "_roi_cost_basis_cached_payload", None)
    monkeypatch.setattr(main, "_roi_cost_basis_cache_expires_at", 0.0)
    monkeypatch.setattr(main, "_roi_cost_basis_retry_after", 0.0)
    db = Database()

    async def exercise():
        scope = {
            "type": "http", "method": "GET", "path": "/api/market-cost-basis",
            "headers": [], "query_string": b"", "server": ("test", 80),
            "client": ("test", 1), "scheme": "http",
            "env": SimpleNamespace(DB=db),
        }
        return await asyncio.gather(*(
            main.market_cost_basis_api(Request(scope)) for _ in range(100)
        ))

    responses = asyncio.run(exercise())
    assert len(responses) == 100
    assert all(b'"source":"d1"' in response.body for response in responses)
    # One cold lookup: table, index, status and catalog select. Before the fix
    # all 100 requests performed all four operations (400 D1 runs).
    assert db.prepare_calls == 4
    assert db.run_calls == 4


def test_home_lab_next_optimizer_and_report_styles_are_present() -> None:
    response = client.get("/static/home-lab-next.css")
    assert response.status_code == 200
    assert ".hln-smart-configs" in response.text
    assert ".hln-report-hero" in response.text
    assert ".hln-report-grid" in response.text
    assert ".hln-report-strategy" in response.text
    assert ".hln-strategy-list" in response.text
    assert ".hln-report-visual" in response.text
    assert ".hln-report-3d" in response.text
    assert ".hln-monthly-bars" in response.text
    assert ".hln-monthly-cost-chart" in response.text
    assert ".hln-report-provenance" in response.text
    assert ".hln-report-stat-grid" in response.text
    assert "@media print" in response.text


def test_home_lab_next_semantic_delta_colors_are_present() -> None:
    response = client.get("/static/home-lab-next.css")
    assert response.status_code == 200
    assert ".hln-impact-panel strong.is-good" in response.text
    assert ".hln-impact-panel strong.is-bad" in response.text
    assert ".hln-scenario-metrics strong.is-good" in response.text
    assert ".hln-scenario-metrics strong.is-bad" in response.text
    assert ".hln-dock-compare strong b.is-good" in response.text
    assert ".hln-dock-compare strong b.is-bad" in response.text


def test_home_lab_next_map_and_renovation_compare_styles_are_present() -> None:
    response = client.get("/static/home-lab-next.css")
    assert response.status_code == 200
    assert ".hln-map-locality" in response.text
    assert ".hln-map-legend" in response.text
    assert "rgba(244,187,94,.72)" in response.text
    assert ".hln-dock-compare" in response.text
    assert ".hln-dock-compare article.is-renovation" in response.text


def test_home_lab_next_hidden_sections_cannot_be_overridden_by_layout_css() -> None:
    response = client.get("/static/home-lab-next.css")
    assert response.status_code == 200
    assert ".hln-app [hidden]{display:none!important}" in response.text


def test_home_lab_next_frontend_contains_baseline_scenario_contract() -> None:
    response = client.get("/static/home-lab-next.js")
    assert response.status_code == 200
    assert "homeState" in response.text
    assert "scenarioState" in response.text
    assert "baselineSaved" in response.text
    assert "function openMeasure" in response.text
    assert "function keepIntervention" in response.text
    assert "function benefitText" in response.text
    assert "function renderImpactPanel" in response.text
    assert "function populateTechnicalForm" in response.text
    assert '$("[data-hln-editor]").find' not in response.text
    assert "renderConfidence" not in response.text
    assert "function trackEvent" in response.text
    assert '"hln:analytics"' in response.text
    assert '"home_lab_baseline_saved"' in response.text
    assert '"home_lab_intervention_opened"' in response.text
    assert '"home_lab_intervention_kept"' in response.text
    assert '"home_lab_screen_viewed"' in response.text
    assert '"home_lab_report_printed"' in response.text
    assert '"home_lab_viewed"' in response.text
    assert "if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload);" in response.text
    assert "function directChangeText" in response.text
    assert "function applyDeltaState" in response.text
    assert "function energyClassRank" in response.text
    assert '["#hlnImpactCost", cost]' in response.text
    assert '["#hlnImpactEnergy", energy]' in response.text
    assert '["#hlnImpactEfficiency", efficiency]' in response.text
    assert '["#hlnImpactCo2", co2]' in response.text
    assert '["#hlnImpactLoad", load]' in response.text
    assert "const efficiency = benefitText(" in response.text
    assert "scenarioResult.final_energy_kwh" in response.text
    assert 'directChangeText(scenarioResult.final_energy_kwh' in response.text
    assert "function costOutcomeText" in response.text
    assert "async function calculateCandidate" in response.text
    assert "async function configureNzeb" in response.text
    nzeb_section = response.text.split("async function configureNzeb", 1)[1].split("async function configureBestRoi", 1)[0]
    assert '"heat_pump"' in response.text
    assert '"heat_pump_air_water"' in response.text
    assert '"natural_gas"' not in nzeb_section
    assert "async function configureBestRoi" in response.text
    assert 'const buttons = $$("[data-hln-smart-config]")' in response.text
    assert '$$("[data-hln-smart-config]").forEach' in response.text
    assert '$$("[data-hln-reference-house]").forEach' in response.text
    assert '\n  $("[data-hln-smart-config]").forEach' not in response.text
    assert '\n  $("[data-hln-reference-house]").forEach' not in response.text
    assert '"heat_pump_air_air"' in response.text
    assert "hasHydronicDistribution" in response.text
    assert "let state = migrateStoredHeatingState({...homeState}, defaultState);" in nzeb_section
    assert "nzebEnvelopeCandidate(scenarioState" not in nzeb_section
    assert "nzebEnvelopeActions" in response.text
    assert "nzebEnvelopeStatus" in response.text
    assert "function renderReport" in response.text
    assert "hlnReportDecisionSaving" in response.text
    assert "Amortizarea este simplă: CAPEX estimat împărțit la economia anuală modelată." in response.text
    assert 'const strategy = $("#hlnReportStrategy")' in response.text
    assert "Best ROI estimativ" not in response.text
    assert "function roiEconomics" in response.text
    assert "function roiCapexForAction" in response.text
    assert "function regulatoryTargetForProjectMode" in response.text
    assert "function renderResultFreshness" in response.text
    assert "scenarioResultState" in response.text
    assert "OPTIMIZER_MAX_ENGINE_EVALUATIONS = 16" in response.text
    assert "Nu se creează un racord nou la gaz" in response.text
    assert "function adaptiveOptimizerActions" in response.text
    assert "function evaluateActionVariants" in response.text
    assert "function bestVariantPerFamily" in response.text
    assert "function optimizerNoRegression" not in response.text
    assert "familyWinners" in response.text
    assert "selected.length" in response.text
    assert "fără limită artificială la numărul de intervenții" in response.text
    assert "round < 3" not in response.text
    assert "if (dock) dock.hidden = false;" in response.text
    assert 'backLabel.textContent = screen === "report" ? "Înapoi la optimizare" : "Înapoi"' in response.text
    assert "function nzebMeetsTarget" in response.text
    assert "ROI_ACTIONS" not in response.text
    assert "weather_compensated" in response.text
    assert "pv_15_intensify" in response.text
    assert 'showScreen("report")' in response.text
    assert "window.print()" in response.text
    assert "hlnReportMonthlyCostChart" in response.text
    assert "hlnReportPvGeneration" in response.text
    assert "hlnReportHeatingPerformance" in response.text
    assert "hlnReportMethodologySource" in response.text
    assert "function automaticRenovationCopy" in response.text
    assert 'projectMode === "existing_major"' in response.text
    assert 'projectMode === "new_nzeb"' in response.text
    assert "Pachet automat de îmbunătățiri energetice calculat" in response.text
    assert 'fetch("/api/market-cost-basis"' in response.text
    assert "ROI_COST_INPUTS" not in response.text
    assert "Introdu costurile investiției" not in response.text
    assert "const delta = percent ? (100 * (now - base) / Math.abs(base)) : (now - base);" in response.text
    assert "const good = lowerIsBetter ? delta < 0 : delta > 0;" in response.text
    assert 'label: good ? "Economie" : "Cost suplimentar"' in response.text
    assert "savingLabel.textContent = saving.label" in response.text
    assert "async function saveHomeAndOpenSite" in response.text
    assert 'await calculateState(homeState, "home")' in response.text
    assert 'showScreen("site")' in response.text
    assert "function createHomeLocationProjection" in response.text
    assert "function homeMapVisibleLocalities" in response.text
    assert "function homeMapLabels" in response.text
    assert "hln-map-legend" in response.text
    assert 'Zona ${zone} · ${temperatureByZone[zone]}' in response.text
    assert '$("#hlnDockHomeClass").textContent' in response.text
    assert '$("#hlnDockScenarioClass").textContent' in response.text
    assert '$("#hlnDockHomeCost").textContent' in response.text
    assert '$("#hlnDockScenarioCost").textContent' in response.text
    assert "$root" not in response.text
    assert 'root.querySelectorAll("#hlnLevels [data-value]")' in response.text
    assert 'root.querySelectorAll("[data-hln-screen]")' in response.text
    assert "if (!locationProjection) throw new Error" in response.text
    assert 'locationMapData = data' in response.text
    assert 'localityMap = new Map(localities.map(item => [String(item.id), item]))' in response.text
    assert "function renderHomeLocationMap" in response.text
    assert "function selectHomeLocality" in response.text
    assert "nearestHomeMapLocalities" in response.text
    assert 'formSet("building_type"' in response.text
    assert 'formSet("construction_year"' in response.text
    assert "function migrateStoredHeatingState" in response.text
    assert '["wood_stove", "electric_resistance"].includes(homeState.heating)' in response.text
    assert '["wood_stove", "electric_resistance"].includes(scenarioState.heating)' in response.text
    assert 'root.querySelectorAll("[data-hln-home-heating-chain]")' in response.text
    assert 'root.querySelectorAll("[data-hln-scenario-heating-chain]")' in response.text
    assert "hasCompleteStoredChain" in response.text
    assert 'Object.assign(state, heatingChainDefaults(state.heating))' in response.text
    assert 'state.heating === "wood_stove" || state.heating === "electric_resistance"' in response.text
    assert 'state.heatPumpSource === "heat_pump_air_air"' in response.text
    assert "persist();" in response.text
    assert "function setReferenceHouse" in response.text
    assert "physical_mapping" in response.text
    assert 'mappedU("floor", u.floor)' in response.text
    assert 'MC001 Tabel 2.4' in response.text
    assert 'formSet("solar_glazing_gn", referenceSolarGn ?? "")' in response.text
    assert 'syncMeasuresFromOptimizer(meta)' in response.text
    assert 'heating_control:"heating"' in response.text
    assert 'item?.family === "ventilation"' in response.text
    assert "function resetScenarioToHome" in response.text
    assert "function renderLiveConfigurator" in response.text
    assert "function openQuickMeasureEditor" in response.text
    assert "function applyQuickMeasureValue" in response.text
    assert "function commitQuickMeasureEditor" in response.text
    assert "function cancelQuickMeasureEditor" in response.text
    assert 'let quickEditTarget = "scenario"' in response.text
    assert 'window.addEventListener("hln:equipment-select"' in response.text
    assert 'screen === "home" ? "home" : "scenario"' in response.text
    assert 'scheduleCalculate("home", 280)' in response.text
    assert 'quickEditRange.addEventListener("pointerup"' not in response.text
    assert 'quickEditRange.addEventListener("touchend"' not in response.text
    assert 'data-hln-quick-edit-commit' in client.get("/home-lab-classic").text
    assert '$("[data-hln-quick-edit-commit]").addEventListener("click", commitQuickMeasureEditor);' in response.text
    assert "scenarioOverrides" in response.text
    assert "pvEnabled" in response.text
    assert "pvKwp" in response.text
    assert "solarThermalEnabled" in response.text
    assert "solarThermalArea" in response.text
    assert "heatingEmitter" in response.text
    assert "heatingDistribution" in response.text
    assert "heatingStorage" in response.text
    assert "heatingControl" in response.text
    assert "heatingGeneratorType" in response.text
    assert "function normalizeHeatingState" in response.text
    assert "function syncHeatingControlAvailability" in response.text
    assert "function setHeatingFieldDisabled" in response.text
    assert 'root.querySelectorAll("#hlnLevels [data-value]")' in response.text
    assert 'root.querySelectorAll("[data-hln-screen]")' in response.text
    assert 'root.querySelectorAll("[data-hln-quick-edit-close]")' in response.text
    assert 'root.querySelectorAll("[data-hln-home-heating-chain]")' in response.text
    assert 'root.querySelectorAll("[data-hln-scenario-heating-chain]")' in response.text
    assert 'control.disabled = disabled' in response.text
    assert 'state.heatPumpSource === "heat_pump_air_air"' in response.text
    assert 'formSet("heating_generator_type"' in response.text
    assert 'formSet("heating_emitter_type"' in response.text
    assert 'formSet("heating_distribution_type"' in response.text
    assert 'formSet("heating_storage_type"' in response.text
    assert 'formSet("heating_control_type"' in response.text
    assert "ventilation" in response.text
    assert "wallIns" in response.text
    assert "roofIns" in response.text
    assert "floorIns" in response.text
    assert "wallStructure" in response.text
    assert "wallStructureThickness" in response.text
    assert "wallInsulationMaterial" in response.text
    assert "roofInsulationMaterial" in response.text
    assert "floorInsulationMaterial" in response.text
    assert "WALL_STRUCTURE_PRESETS" in response.text
    assert "INSULATION_LAMBDA_W_MK" in response.text
    assert "wallBaseU(state)" in response.text
    assert "insulationLambda(state.wallInsulationMaterial)" in response.text
    assert 'scenarioState.wallInsulationMaterial = $("#hlnWallInsulationMaterial").value' in response.text
    assert 'scenarioState.roofInsulationMaterial = $("#hlnRoofInsulationMaterial").value' in response.text
    assert 'scenarioState.floorInsulationMaterial = $("#hlnFloorInsulationMaterial").value' in response.text
    assert "TOP_BOUNDARY_BASE_U" in response.text
    assert "cold_attic: 3.25" in response.text
    assert "flat_roof: 2.25" in response.text
    assert "function layeredInsulationU" not in response.text
    assert 'scenarioState.wallInsulationMaterial !== homeState.wallInsulationMaterial' in response.text
    assert 'Math.abs(Number(scenarioState.wallIns) - Number(homeState.wallIns)) > 0.01' in response.text
    assert 'labels.insulation[state.wallInsulationMaterial]' in response.text
    assert "Vezi îmbunătățirile" in response.text
    assert "glazing" in response.text
    assert "measures" in response.text
    assert "SOLAR_THERMAL_NOMINAL_KW_PER_M2 = 0.70" in response.text
    assert 'key === "pvKwp"' in response.text
    assert 'key === "solarThermalKw"' in response.text
    assert 'input.addEventListener("change", commitRangeValue)' in response.text
    assert "calculateAbortController" in response.text
    assert "syncMobileViewportBottomInset" in response.text
    assert "window.visualViewport" in response.text
    assert '--hln-mobile-bottom-occlusion' in response.text
    assert "const rawOcclusion" in response.text
    assert "Math.min(rawOcclusion, 48)" in response.text
    assert 'orientationchange' in response.text
    assert "new AbortController()" in response.text
    assert "let optimizerLaunchPending = false" in response.text
    assert "if (optimizerLaunchPending) return" in response.text
    assert "await runOptimizerAction(async () =>" in response.text
    assert "[429, 502, 503, 504].includes(response.status)" not in response.text
    assert "response.status >= 500" not in response.text
    assert "Live interaction must never amplify an overloaded Worker" in response.text
    assert "attempt < 2" not in response.text
    assert "annual_generation_kwh" in response.text
    assert "self_consumed_kwh" in response.text
    assert "exported_kwh" in response.text
    assert 'formSet("pv_installed_power_kwp"' in response.text
    assert 'formSet("solar_thermal_collector_area_m2"' in response.text
    assert "reference_mc001" in response.text
    assert "hlnReferenceSpec" in response.text
    assert 'root.querySelectorAll("[data-hln-reference-house]")' in response.text
    assert "hln:visual-state" in response.text
    assert 'fetchWithTimeout(' in response.text
    assert 'href="#hln-i-' in response.text


def test_home_lab_envelope_editor_exposes_structure_and_material_inputs() -> None:
    response = client.get("/home-lab-classic")
    assert response.status_code == 200
    html = response.text
    assert 'id="hlnHomeWallStructure"' in html
    assert 'id="hlnHomeWallStructureThickness"' in html
    assert 'id="hlnHomeWallInsulationMaterial"' in html
    assert 'id="hlnHomeRoofInsulationMaterial"' in html
    assert 'id="hlnHomeFloorInsulationMaterial"' in html
    assert 'id="hlnWallInsulationMaterial"' in html
    assert 'id="hlnRoofInsulationMaterial"' in html
    assert 'id="hlnFloorInsulationMaterial"' in html
    assert '<span>02</span><b>Optimizează</b>' in html
    assert '<span>03</span><b>Raport</b>' in html
    assert 'VARIANTĂ NOUĂ' in html
    assert 'DUPĂ ÎMBUNĂTĂȚIRI' in html
    assert 'value="solid_brick"' in html
    assert 'value="efficient_brick"' in html
    assert 'value="bca"' in html
    assert 'value="concrete"' in html
    assert 'value="wood"' in html
    assert 'value="eps"' in html
    assert 'value="xps"' in html
    assert 'value="mineral_wool"' in html
    assert 'value="cellulose"' in html
    assert 'value="wood_fiber"' in html


def test_home_lab_3d_reflects_selected_house_systems() -> None:
    response = client.get("/static/home-lab-3d.js")
    assert response.status_code == 200
    assert "createSelectionProofLayers" in response.text
    assert 'this.equipmentLayers.set("ventilation"' in response.text
    assert 'this.equipmentLayers.set("gasFlue"' in response.text
    assert 'this.equipmentLayers.set("chimneySmoke"' in response.text
    assert 'this.equipmentLayers.set("woodHeat"' not in response.text
    assert 'this.equipmentLayers.set("districtHeat"' in response.text
    assert 'this.equipmentLayers.set("electricHeat"' in response.text
    assert 'detail.heating === "heat_pump"' in response.text
    assert '"electric_resistance", "electric_boiler"' in response.text
    assert '"condensing_gas_boiler"' in response.text
    assert '"gas_boiler"' in response.text
    assert '"wood_stove"' in response.text
    assert '"wood_boiler"' in response.text
    assert '"pellet_boiler"' in response.text
    assert 'detail.ventilation === "mechanical" || detail.ventilation === "hrv"' in response.text
    assert "detail.pvKwp" in response.text
    assert "detail.solarThermalArea" in response.text
    assert "async createSingleSolarThermalLayer()" in response.text
    assert 'url: "https://cdn.3dassets.dev/assets/2969/v1/model.glb"' in response.text
    assert 'source: "https://3dassets.dev/assets/off-grid-power-and-controls-roof-solar-panel-197e7d81"' in response.text
    assert 'label: "Fondital VLC 25 flat-plate solar thermal collector"' in response.text
    assert "const SOLAR_THERMAL_ANCHOR = [-0.02, 0.78, 0.08]" in response.text
    assert "const panelWidthWorld = s.x * 0.075" in response.text
    assert "const panelDepthWorld = s.z * 0.135" in response.text
    assert "SolarThermalCollector_importedGLB" in response.text
    assert "SolarThermalCollector_lowIronGlass" in response.text
    assert "SolarThermalCollector_absorberRiser" in response.text
    assert "await this.createSingleSolarThermalLayer()" in response.text
    assert "this.mountLayerOnRoof(layer, SOLAR_THERMAL_ANCHOR)" in response.text
    assert "const thermalScale = clamp(" in response.text
    assert "0.82 + Number(detail.solarThermalArea || 0) * 0.025" in response.text
    assert "1.10" in response.text
    assert "solarThermal.scale.setScalar(thermalScale)" in response.text
    assert "thermalPanelCount" not in response.text
    assert "selectedMeasures" in response.text
    assert "this.authorMode && selectedMeasures.has(part)" in response.text
    assert "glazingGlassColors" in response.text
    assert "LaCurentHeatPump_fanBlade" in response.text
    assert "THREE.TorusGeometry" in response.text
    assert 'url: "https://polyfork.dev/cdn/hvac-condenser-unit-a41b8d.glb"' in response.text
    assert 'url: "https://polyfork.dev/cdn/air-con-unit-9fadc2.glb"' in response.text
    assert "async upgradeGroupWithGlb" in response.text
    assert 'group.userData.hlnEquipment = "heatPump"' in response.text
    assert 'ac.userData.hlnEquipment = "ac"' in response.text
    assert 'layer.userData.hlnEquipment = "pv"' in response.text
    assert 'layer.userData.hlnEquipment = "solarThermal"' in response.text
    assert '"hln:equipment-select"' in response.text
    assert "createEquipmentBadges()" in response.text
    assert "updateEquipmentBadges()" in response.text
    assert "ray.intersectObjects(roofCandidates, true)" in response.text


def test_home_lab_3d_uses_one_capacity_scaled_pv_field_and_visible_primary_chimney_smoke() -> None:
    response = client.get("/static/home-lab-3d.js")
    assert response.status_code == 200
    source = response.text
    assert 'name:"PV_primary_lower"' in source
    assert 'name:"PV_primary_upper"' in source
    assert 'name:"PV_secondary_lower"' in source
    assert 'name:"PV_secondary_upper"' in source
    assert 'name:"PV_primary_top"' in source
    assert 'name:"PV_secondary_top"' in source
    assert 'name:"PV_primary_ridge"' in source
    assert 'name:"PV_secondary_ridge"' in source
    assert "const zRidge = -rowPitch * 2" in source
    assert 'Math.max(2, Math.min(pv.children.length, Math.ceil(Number(detail.pvKwp || 0) / 2.5)))' in source
    assert "Every panel is a child of" in source
    assert 'const panelDepthWorld = s.z * 0.085' in source
    assert 'const gapZ = this.localLength(s.z * 0.006)' in source
    assert 'this.mountLayerOnRoof(layer, [-0.34, 0.72, 0.16])' in source
    assert "localDownslope: localDownslope.toArray()" in source
    assert "basePositionLocal: group.position.toArray()" in source
    assert 'objectUuid: hit.object?.uuid || ""' in source
    assert "const downslopeShift = rowPitch * 0.195" not in source
    assert "layer.translateZ(downslopeShift)" not in source
    assert "layer.translateX(chimneyNudge)" not in source
    assert "runtime-calibrated" in source.lower()
    assert "return this.localPointFromNormalized([0.076, 1.005, 0.033])" in source
    assert '"condensing_gas_boiler"' in source
    assert '"gas_boiler"' in source
    assert "this.modelSize.y * 0.34" in source
    assert "this.modelSize.x * 0.065" in source
    assert "index < 10" in source
    assert "depthTest:false" in source
    assert "Math.sin(Math.PI * t) * 0.78" in source


def test_home_lab_3d_orientation_is_semantic_and_independent_from_camera_orbit() -> None:
    js = client.get("/static/home-lab-3d.js")
    assert js.status_code == 200
    source = js.text
    assert 'data-hln-3d-compass' in source
    assert "setCompassOrientation(orientation)" in source
    assert "orientationFromCompassPointer(event, compass)" in source
    assert 'document.querySelector("#hlnOrientation")' in source
    assert 'select.dispatchEvent(new Event("change", {bubbles:true}))' in source
    assert "focusOrientation(" not in source
    assert 'this.setCompassOrientation(detail.orientation)' in source
    assert 'detail.focus === "pv" || detail.focus === "solarThermal"' not in source
    assert 'this.controls.enableZoom = false' in source
    assert "this.rebuildRenovationLayer(part)" not in source


def test_home_lab_3d_compass_has_visible_orientation_arrow() -> None:
    css = client.get("/static/home-lab-3d.css")
    assert css.status_code == 200
    source = css.text
    assert "--hln-compass-angle" in source
    assert ".hln-3d-compass-arrow" in source
    assert 'data-hln-3d-stage="home"' in source
    assert "cursor: crosshair" in source


def test_home_lab_mobile_house_first_controls_keep_context_visible() -> None:
    css = client.get("/static/home-lab-next.css")
    assert css.status_code == 200
    source = css.text
    assert ".hln-hotspot span,.hln-zone span{display:inline}" in source
    assert "backdrop-filter:blur(11px)" in source
    assert "height:min(82dvh,760px)" in source

    css3d = client.get("/static/home-lab-3d.css")
    assert css3d.status_code == 200
    assert ".hln-3d-equipment-badge" in css3d.text
    assert ".hln-3d-equipment-dot" in css3d.text
    assert ".hln-house-visual-3d-ready > .hln-zone-heating" in css3d.text
    assert ".hln-semantic-wall-ready > .hln-zone-wall" in css3d.text
    assert ".hln-semantic-roof-ready > .hln-zone-roof" in css3d.text
    assert ".hln-semantic-windows-ready > .hln-zone-window" in css3d.text
    assert "@keyframes hlnDiscoverPulse" in css3d.text
    assert "@media(prefers-reduced-motion:reduce)" in css3d.text





def test_home_lab_issue_359_adaptive_intro_contract() -> None:
    response = client.get("/home-lab-classic")
    assert response.status_code == 200
    assert response.text.count('class="hln-screen-intro-copy"') == 2
    assert "/static/home-lab-next.css?v=next361-cop-fuel" in response.text
    assert "/static/home-lab-next.js?v=next72-heating-power" in response.text

    css = client.get("/static/home-lab-next.css")
    assert css.status_code == 200
    source = css.text
    assert ".is-intro-collapsed" in source
    assert "@media(min-width:981px) and (max-height:820px)" in source
    assert "min-height:470px" in source
    assert "min-height:392px" in source
    assert "padding-top:8px" in source
    assert "padding-top:12px" in source

    js = client.get("/static/home-lab-next.js")
    assert js.status_code == 200
    source = js.text
    assert "const introCollapsedScreens = new Set()" in source
    assert "collapseAdaptiveIntroFor" in source
    assert "resetAdaptiveIntros" in source
    assert 'event.persisted' in source
    assert 'root.addEventListener("pointerdown"' in source
    assert "localStorage.setItem" in source
    assert "introCollapsedScreens" not in source.split("localStorage.setItem", 1)[1].split("));", 1)[0]


def test_home_lab_mobile_declutter_contract() -> None:
    response = client.get("/home-lab-classic")
    assert response.status_code == 200
    assert 'class="hln-copy-mobile"' in response.text
    assert "Alege ce vrei să îmbunătățești." in response.text

    js = client.get("/static/home-lab-next.js")
    assert js.status_code == 200
    assert "root.dataset.hlnActiveScreen = screen" in js.text
    assert 'summary.classList.toggle("is-fresh", state === "fresh")' in js.text
    assert 'equipment === "solidHeat"' in js.text

    css = client.get("/static/home-lab-next.css")
    assert css.status_code == 200
    assert ".hln-energy-preview{display:none}" in css.text
    assert '.hln-app[data-hln-active-screen]:not([data-hln-active-screen="home"])' in css.text
    assert ".hln-live-summary.is-fresh .hln-live-calc-status" in css.text
    assert '.hln-screen[data-hln-screen="site"] .hln-home-return{display:none}' in css.text

    semantic = client.get("/static/final-house-semantic.json")
    assert semantic.status_code == 200
    assert semantic.json()["parts"]["windows"]["anchor"] == [0.43, 0.44, 0.14]


def test_home_lab_gameified_controls_are_separate_from_technical_mode() -> None:
    response = client.get("/home-lab-classic")
    assert response.status_code == 200
    assert 'data-hln-technical-open' in response.text
    assert 'data-hln-technical-nav' in response.text
    assert 'data-hln-technical-section="systems"' in response.text
    assert 'data-hln-technical-entry' in response.text
    assert 'hln-hotspot-renewables' not in response.text
    assert 'data-hln-editor="renewables"' in response.text

    js = client.get("/static/home-lab-next.js")
    assert js.status_code == 200
    assert 'editor.dataset.hlnEditorMode = technical ? "technical" : "context"' in js.text
    assert 'editor.dataset.hlnEditorMode !== "technical"' in js.text
    assert 'setEditorSection(button.dataset.hlnTechnicalSection)' in js.text

    js3d = client.get("/static/home-lab-3d.js")
    assert js3d.status_code == 200
    assert "this.controls.enableZoom = false" in js3d.text
    assert 'new Set(["wall", "roof", "windows"])' in js3d.text
    assert 'button.classList.add("is-gameified")' in js3d.text
    assert 'button.classList.add("is-discoverable")' in js3d.text
    assert 'solidHeat: "Încălzire"' in js3d.text
    assert '["home", "site"].includes(this.mode)' in js3d.text
    assert "(this.isMobile || (" in js3d.text
    assert 'this.isMobile = window.matchMedia?.("(max-width: 760px)").matches' in js3d.text
    assert 'const mobileSiteFallback = this.isMobile && this.mode === "site"' in js3d.text
    assert 'wall:[54, height * 0.56]' in js3d.text
    assert "this.updateHotspotPositions();" in js3d.text
    assert "this.updateEquipmentBadges();" in js3d.text
    assert "hln-semantic-${part}-ready" in js3d.text
    assert 'data-hln-3d-add-rail' in js3d.text
    assert 'pvButton.hidden = Boolean(detail.pvEnabled)' in js3d.text
    assert 'solarButton.hidden = Boolean(detail.solarThermalEnabled)' in js3d.text
    assert 'Math.ceil(Number(detail.pvKwp || 0) / 2.5)' in js3d.text

    css = client.get("/static/home-lab-next.css")
    assert css.status_code == 200
    assert ".hln-editor.is-technical-mode" in css.text
    assert ".hln-editor textarea{font-size:16px}" in css.text

    css3d = client.get("/static/home-lab-3d.css")
    assert css3d.status_code == 200
    assert ".hln-3d-hotspot.is-gameified" in css3d.text
    assert ".hln-3d-add-rail" in css3d.text


def test_home_lab_3d_is_visible_from_first_paint_without_2d_house_flash() -> None:
    css = client.get("/static/home-lab-3d.css")
    assert css.status_code == 200
    source = css.text
    assert "never flash the old 2D house" in source
    assert ".hln-house-visual > svg" in source
    assert "display: none" in source


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
    assert payload["reference"] is None
    assert payload["reference_parameters"]["u_values_w_m2k"]["exterior_wall"] > 0


def test_partner_embed_calculation_keeps_partner_cta_and_shared_engine() -> None:
    response = client.post("/embed/demo-store/calculate", data=demo_form_data())
    assert response.status_code == 200
    assert "Rezultatul calculului" in response.text
    assert "Commercial test house" in response.text
    assert "Transformă scenariul ales într-o ofertă concretă." in response.text
    assert "Cere ofertă pentru casa configurată" in response.text
    assert 'href="mailto:karol@lacurent.com?subject=Evaluare%20tehnica%20locuinta"' in response.text
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
    response = client.get("/home-lab-classic")
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


def test_home_lab_report_3d_stage_is_contained_by_positioned_wrapper() -> None:
    response = client.get("/static/home-lab-next.css")
    assert response.status_code == 200
    css = response.text.replace("\n", "")
    assert ".hln-report-3d-wrap{position:relative;" in css


def test_home_lab_report_exposes_heating_branch_traceability() -> None:
    response = client.get("/home-lab-classic")
    assert response.status_code == 200
    assert 'id="hlnReportHeatingBranches"' in response.text

    js = client.get("/static/home-lab-next.js")
    assert js.status_code == 200
    assert "renderHeatingBranchTraceability" in js.text
    assert "heatingBranches" in js.text
    assert "rejected_for_capacity" in js.text


def test_heating_branch_report_uses_explicit_verdict_labels() -> None:
    response = client.get("/static/home-lab-next.js")
    assert response.status_code == 200
    source = response.text
    assert "SELECTAT" in source
    assert "EVALUAT · NESELECTAT" in source
    assert "EVALUAT TEHNIC · COST COMERCIAL LIPSĂ" in source
    assert "EXCLUS ÎNAINTE DE CALCUL" in source
    assert "ELIMINAT · NECESAR PESTE PLAJA CATALOGULUI" in source
    assert "nu a fost selectată" in source


def test_home_lab_next_uses_transient_retry_asset_version() -> None:
    response = client.get("/home-lab-classic")
    assert response.status_code == 200
    assert "/static/home-lab-next.js?v=next72-heating-power" in response.text



def test_cloudflare_free_plan_worker_config_has_no_cpu_limit() -> None:
    config = Path("commercial/cloudflare-worker/wrangler.toml").read_text(
        encoding="utf-8"
    )
    assert "[limits]" not in config
    assert "cpu_ms" not in config
