from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from commercial.app.main import app


client = TestClient(app)
STATIC_DIR = Path(__file__).resolve().parents[1] / "static"


def test_energy_calculator_loads_language_and_submit_safeguard() -> None:
    response = client.get("/instalatii/calculator")
    assert response.status_code == 200
    assert "site-language.js?v=lang1" in response.text

    script = (STATIC_DIR / "site-language.js").read_text(encoding="utf-8")
    assert 'data-site-language="ro"' in script
    assert 'data-site-language="en"' in script
    assert "form.noValidate = true" in script
    assert "HTMLFormElement.prototype.submit.call(form)" in script
    assert "Calculează performanța" in script
    assert "Calculate performance" in script


def test_language_dictionary_covers_key_calculator_and_result_labels() -> None:
    script = (STATIC_DIR / "site-language.js").read_text(encoding="utf-8")
    assert '"Calculator energetic pentru locuințe": "Residential energy calculator"' in script
    assert '"Cost anual estimat al energiei": "Estimated annual energy cost"' in script
    assert '"Încălzire": "Heating"' in script
    assert '"Răcire": "Cooling"' in script
    assert '"Apă caldă menajeră": "Domestic hot water"' in script
