from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HTML = ROOT / "commercial" / "templates" / "home_lab_editorial.html"
JS = ROOT / "commercial" / "static" / "home-lab-editorial.js"
CSS = ROOT / "commercial" / "static" / "home-lab-editorial.css"


def test_steps_1_to_3_start_empty_and_require_explicit_input() -> None:
    html = HTML.read_text(encoding="utf-8")
    js = JS.read_text(encoding="utf-8")

    assert "Valorile afișate inițial sunt exemple de pornire" not in html
    assert 'id="heatedArea" value=""' in html
    assert 'id="averageHeight" value=""' in html
    assert 'name="construction_year" data-house-critical value=""' in html
    assert '<option value="" selected disabled>Alege</option>' in html
    assert '<select id="wallStructure" required><option value="" selected disabled>' in html
    assert '<select name="heating_choice" id="heatingChoice" required><option value="" selected disabled>' in html
    assert "function requiredCoreInputsComplete()" in js
    assert 'for (const pageName of ["house","envelope","systems"])' in js
    assert 'if (!validatePage(current)) return;' in js
    assert 'id="edHouseValuesConfirmed"' in html
    assert html.index('id="edHouseValuesConfirmed"') > html.index('data-page="renewables"')
    assert html.index('id="edHouseValuesConfirmed"') < html.index('data-page="goal"')
    assert "Confirmă că ai verificat datele introduse în pașii 1–4" in js
    assert 'href="/" aria-label="LaCurent — pagina principală"' in html
    assert "Home Lab este instrumentul tău de decizie energetică." not in html


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


def test_report_is_visual_and_does_not_duplicate_teo_next_actions() -> None:
    html = HTML.read_text(encoding="utf-8")
    js = JS.read_text(encoding="utf-8")
    css = CSS.read_text(encoding="utf-8")

    assert "RAPORT VIZUAL · LACURENT" in html
    assert "Casa înainte și după TEO" in html
    assert "CE URMEAZĂ" not in html
    assert 'id="edReportEditHouse"' not in html
    assert 'id="edReportSaveProject"' not in html
    assert 'id="edReportBom"' not in html
    assert "Înainte vs. după investiție" in js
    assert "Produse și cantități din catalogul LaCurent" in js
    assert ".ed-report-compare" in css
    assert ".ed-bom-product" in css
