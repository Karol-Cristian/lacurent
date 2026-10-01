from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EDITORIAL_JS = ROOT / "commercial" / "static" / "home-lab-editorial.js"
EDITORIAL_HTML = ROOT / "commercial" / "templates" / "home_lab_editorial.html"


def test_editorial_browser_state_is_versioned_and_legacy_is_sanitized():
    source = EDITORIAL_JS.read_text(encoding="utf-8")

    assert "lacurent-home-lab-editorial-v2:" in source
    assert "lacurent-home-lab-editorial-v1:" in source
    assert 'const EDITORIAL_DRAFT_VERSION = 2;' in source
    assert 'const CALCULATION_MODEL_VERSION = "rbpe-editorial-2026-09-29.1";' in source

    assert "applyEditorialDraft(legacyDraft, {preserveOverrides:false})" in source
    assert "isGeometryOverride || isAdvancedOverride" in source
    assert 'field.dataset.geomAuto = "true"' in source
    assert 'field.dataset.advancedAuto = "true"' in source

    # Hidden geometry overrides from the old Home Lab state must not silently
    # migrate into Editorial because they can make visually identical houses
    # produce different RBPE payloads.
    assert "state.wallAreaOverride" not in source
    assert "state.topAreaOverride" not in source
    assert "state.floorAreaOverride" not in source
    assert "state.volumeOverride" not in source


def test_editorial_exposes_exact_rbpe_input_identity_and_clean_reset():
    source = EDITORIAL_JS.read_text(encoding="utf-8")
    template = EDITORIAL_HTML.read_text(encoding="utf-8")

    assert "function calculationInputFingerprint(data)" in source
    assert "calculationModelVersion:CALCULATION_MODEL_VERSION" in source
    assert "baselineInputFingerprint = inputFingerprint" in source
    assert "INPUT RBPE" in source
    assert "shortInputFingerprint" in source

    assert "function clearEditorialLocalState()" in source
    assert "storageHistoryKey" in source
    assert "legacyStorageHistoryKey" in source
    assert "classicStorageKey" in source
    assert 'id="edNewHouse"' in template

    # Cache busting is deliberate: browsers must not keep running the old
    # persistence code after the deploy.
    assert "/static/home-lab-editorial.js?v=71" in template
    assert "/static/home-lab-editorial.css?v=38" in template


def test_privacy_opt_out_clears_editorial_v2_storage():
    privacy_source = (ROOT / "commercial" / "static" / "privacy-consent.js").read_text(encoding="utf-8")
    assert '"lacurent-home-lab-editorial-v2:"' in privacy_source


def test_editorial_marks_stale_teo_result_for_recalculation():
    source = EDITORIAL_JS.read_text(encoding="utf-8")

    assert 'let teoInputFingerprint = "";' in source
    assert "function syncTeoRecalculationCue()" in source
    assert 'currentFingerprint !== teoInputFingerprint' in source
    assert '"is-recalculation-needed"' in source
    assert "Recalculare disponibilă" in source
    assert "Recalculează optimizarea TEO" in source
    assert "const runInputFingerprint = calculationInputFingerprint(baselinePayload)" in source
    assert "teoInputFingerprint = runInputFingerprint" in source


def test_editorial_resets_manual_advanced_values_when_dependencies_change():
    source = EDITORIAL_JS.read_text(encoding="utf-8")

    assert "ADVANCED_DEPENDENCY_RESETS" in source
    assert 'dhwSystem:["advDhwEfficiency","advDhwCop"]' in source
    assert 'ventilation:["advAch","advHeatRecovery"]' in source
    assert 'heatingEmitter:["advHeatingFlow","advHeatingReturn","advHeatingScop"]' in source
    assert 'floorBoundary:["advFloorU","advGroundConductivity"]' in source
    assert 'field.dataset.advancedAuto = "true"' in source
    assert "resetAdvancedDependents(event.target)" in source


def test_editorial_focuses_teo_progress_on_mobile_when_run_starts():
    source = EDITORIAL_JS.read_text(encoding="utf-8")

    assert "function focusTeoProgressOnMobile()" in source
    assert 'window.matchMedia("(max-width: 720px)")' in source
    assert 'const target = $("#edTeoSteps")' in source
    assert "target.scrollIntoView({" in source
    assert "focusTeoProgressOnMobile();" in source


def test_editorial_positions_home_lab_as_decision_support_not_official_document():
    source = EDITORIAL_JS.read_text(encoding="utf-8")
    template = EDITORIAL_HTML.read_text(encoding="utf-8")

    assert "Construiește planul energetic al casei tale." in template
    assert "Comparăm ce merită" in template
    assert "Home Lab este instrumentul tău de decizie energetică." in template
    assert "nu înlocuiește documentele oficiale" in template

    # The report is intentionally visual; legal/professional guidance stays
    # outside the chart surface instead of being duplicated after TEO.
    assert "Raportul nu repetă recomandările de pe pagina TEO." in source
    assert "LISTĂ DE MATERIALE" in source
    assert "loadCatalogBom(engineering, opt)" in source
