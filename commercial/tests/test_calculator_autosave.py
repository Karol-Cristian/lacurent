from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from commercial.app.main import app


client = TestClient(app)
COMMERCIAL_DIR = Path(__file__).resolve().parents[1]


def test_calculator_autosave_is_loaded_before_main_app() -> None:
    response = client.get("/instalatii/calculator/legacy")
    assert response.status_code == 200
    privacy = "privacy-consent.js?v=privacy1"
    autosave = "calculator-autosave.js?v=draft2"
    assert privacy in response.text
    assert autosave in response.text
    assert response.text.index(privacy) < response.text.index(autosave)
    assert response.text.index(autosave) < response.text.index("app.js")


def test_calculator_autosave_keeps_local_draft_for_30_days() -> None:
    script = (COMMERCIAL_DIR / "static" / "calculator-autosave.js").read_text(encoding="utf-8")
    assert 'lacurent-calculator-draft-v1' in script
    assert "data?.embedPartner" not in script
    assert "dataset?.embedPartner" in script
    assert "partnerId" in script
    assert "30 * 24 * 60 * 60 * 1000" in script
    assert "window.localStorage.setItem" in script
    assert "window.localStorage.getItem" in script
    assert "function autosaveAllowed()" in script
    assert "window.LaCurentPrivacy?.allowsLocalAutosave?.() === true" in script
    assert "window.localStorage.removeItem" in script
    assert 'root.dataset.initialLocalityId' in script
    assert 'root.dataset.initialLocality' in script
    assert 'new MutationObserver(scheduleSave)' in script
    assert 'window.addEventListener("pagehide", saveDraft)' in script
    assert 'form.addEventListener("submit", saveDraft, true)' in script
    assert "Șterge datele salvate" in script
