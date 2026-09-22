from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from commercial.app.main import app


client = TestClient(app)
STATIC_DIR = Path(__file__).resolve().parents[1] / "static"


def test_energy_calculator_loads_unified_language_switch_and_submit_safeguard() -> None:
    response = client.get("/instalatii/calculator/legacy")
    assert response.status_code == 200
    assert "energy-i18n.js?v=i18n1" in response.text
    assert "calculator-submit-fix.js?v=submit2" in response.text
    assert "language-switch-runtime.js" not in response.text
    assert "site-language.js" not in response.text
    assert 'class="site-language-switch header-language-switch"' in response.text
    assert 'data-site-language="ro"' in response.text
    assert 'data-site-language="en"' in response.text

    i18n = (STATIC_DIR / "energy-i18n.js").read_text(encoding="utf-8")
    assert "lacurent:languagechange" in i18n
    assert "setLanguage(currentLanguage())" in i18n
    assert "window.location.reload" not in i18n
    assert "window.location.assign" not in i18n
    assert "location.href" not in i18n

    submit = (STATIC_DIR / "calculator-submit-fix.js").read_text(encoding="utf-8")
    assert "form.noValidate = true" in submit
    assert "HTMLFormElement.prototype.submit.call(form)" in submit
    assert "Calculează performanța" in submit
    assert "Calculate performance" in submit


def test_retired_energy_landing_redirects_to_home_lab() -> None:
    response = client.get("/instalatii", follow_redirects=False)
    assert response.status_code == 308
    assert response.headers["location"] == "/home-lab-next"


def test_language_dictionary_covers_landing_calculator_and_results() -> None:
    script = (STATIC_DIR / "energy-i18n.js").read_text(encoding="utf-8")
    assert '"Înțelege consumul casei înainte să investești."' in script
    assert '"Calculator energetic pentru locuințe"' in script
    assert '"Cost anual estimat al energiei"' in script
    assert '"Încălzire":"Heating"' in script
    assert '"Răcire":"Cooling"' in script
    assert '"Apă caldă menajeră":"Domestic hot water"' in script
