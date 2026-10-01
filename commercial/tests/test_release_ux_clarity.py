from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HTML = ROOT / "commercial" / "templates" / "home_lab_editorial.html"
JS = ROOT / "commercial" / "static" / "home-lab-editorial.js"
CSS = ROOT / "commercial" / "static" / "home-lab-editorial.css"


def test_house_prefill_requires_explicit_confirmation() -> None:
    html = HTML.read_text(encoding="utf-8")
    js = JS.read_text(encoding="utf-8")

    assert "Valorile afișate inițial sunt exemple de pornire" in html
    assert 'id="edHouseValuesConfirmed"' in html
    assert html.count("data-house-critical") >= 6
    assert "obligatoriu · verifică" in html
    assert "Confirmă că ai verificat valorile principale ale casei" in js
    assert 'matches?.("[data-house-critical]")' in js


def test_winter_temperature_is_explicitly_indoor_setpoint() -> None:
    html = HTML.read_text(encoding="utf-8")

    assert "Temperatura interioară dorită iarna" in html
    assert "Este setpointul interior ales de tine." in html
    assert "Temperatura exterioară de calcul vine separat din localitate" in html


def test_floor_boundary_and_insulation_position_are_explained() -> None:
    html = HTML.read_text(encoding="utf-8")

    assert "Ce se află sub planșeul nivelului încălzit?" in html
    assert "Sol — placa este în contact cu terenul" in html
    assert "Subsol neîncălzit:" in html
    assert "Exterior:" in html
    assert "Alt spațiu încălzit:" in html
    assert "Alegerea stabilește condiția de frontieră" in html
    assert "Grosime termoizolație în ansamblul planșeului" in html
    assert "izolația introdusă aici" in html
    assert "nu diferențiază separat izolația montată deasupra față de cea de sub placă" in html


def test_report_has_only_available_next_actions() -> None:
    html = HTML.read_text(encoding="utf-8")
    js = JS.read_text(encoding="utf-8")
    css = CSS.read_text(encoding="utf-8")

    assert "CE URMEAZĂ" in html
    assert 'id="edReportEditHouse"' in html
    assert 'id="edReportSaveProject"' in html
    assert 'id="edReportBom"' in html
    assert "Revizuiește casa" in html
    assert "Salvează casa în cont" in html
    assert "Vezi lista tehnică" in html
    assert "edReportEditHouse" in js
    assert "saveCurrentAccountProject()" in js
    assert 'document.querySelector("#edTechnicalBom")' in js
    assert ".ed-report-next" in css
