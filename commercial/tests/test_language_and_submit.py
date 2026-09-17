from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from commercial.app.main import app


client = TestClient(app)
STATIC_DIR = Path(__file__).resolve().parents[1] / "static"


def test_energy_calculator_loads_header_language_switch_and_submit_safeguard() -> None:
    response = client.get("/instalatii/calculator")
    assert response.status_code == 200
    assert "language-switch-runtime.js?v=lang2" in response.text
    assert "site-language.js?v=lang1" in response.text
    assert 'class="site-language-switch header-language-switch"' in response.text
    assert 'data-site-language="ro"' in response.text
    assert 'data-site-language="en"' in response.text

    language_runtime = (STATIC_DIR / "language-switch-runtime.js").read_text(encoding="utf-8")
    assert "event.stopImmediatePropagation()" in language_runtime
    assert "applyLanguage(language)" in language_runtime
    assert "window.location.reload" not in language_runtime
    assert 'window.location.pathname === "/instalatii"' in language_runtime

    script = (STATIC_DIR / "site-language.js").read_text(encoding="utf-8")
    assert "form.noValidate = true" in script
    assert "HTMLFormElement.prototype.submit.call(form)" in script
    assert "Calculează performanța" in script
    assert "Calculate performance" in script


def test_energy_landing_has_visible_header_language_switch() -> None:
    response = client.get("/instalatii")
    assert response.status_code == 200
    assert "language-switch.css?v=lang2" in response.text
    assert "language-switch-runtime.js?v=lang2" in response.text
    assert 'class="site-language-switch header-language-switch"' in response.text
    assert "Limbă" in response.text


def test_language_dictionary_covers_key_calculator_and_result_labels() -> None:
    script = (STATIC_DIR / "site-language.js").read_text(encoding="utf-8")
    assert '"Calculator energetic pentru locuințe": "Residential energy calculator"' in script
    assert '"Cost anual estimat al energiei": "Estimated annual energy cost"' in script
    assert '"Încălzire": "Heating"' in script
    assert '"Răcire": "Cooling"' in script
    assert '"Apă caldă menajeră": "Domestic hot water"' in script
