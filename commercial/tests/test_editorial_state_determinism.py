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
    assert "/static/home-lab-editorial.js?v=53" in template
    assert "/static/home-lab-editorial.css?v=24" in template


def test_privacy_opt_out_clears_editorial_v2_storage():
    privacy_source = (ROOT / "commercial" / "static" / "privacy-consent.js").read_text(encoding="utf-8")
    assert '"lacurent-home-lab-editorial-v2:"' in privacy_source
