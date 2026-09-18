from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from commercial.app.main import app


client = TestClient(app)
COMMERCIAL_DIR = Path(__file__).resolve().parents[1]


def test_calculator_autosave_is_loaded_before_main_app() -> None:
    response = client.get("/instalatii/calculator")
    assert response.status_code == 200
    autosave = "calculator-autosave.js?v=draft1"
    app_script = "app.js') }}?v=v2eng3"
    assert autosave in response.text
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
    assert "window.localStorage.removeItem" in script
    assert 'root.dataset.initialLocalityId' in script
    assert 'root.dataset.initialLocality' in script
    assert 'new MutationObserver(scheduleSave)' in script
    assert 'window.addEventListener("pagehide", saveDraft)' in script
    assert 'form.addEventListener("submit", saveDraft, true)' in script
    assert "Șterge datele salvate" in script
