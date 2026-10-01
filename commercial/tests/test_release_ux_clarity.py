from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HTML = ROOT / "commercial" / "templates" / "home_lab_editorial.html"
JS = ROOT / "commercial" / "static" / "home-lab-editorial.js"
CSS = ROOT / "commercial" / "static" / "home-lab-editorial.css"


def test_pages_one_to_three_start_without_silent_defaults_and_confirmation_is_pre_teo() -> None:
    html = HTML.read_text(encoding="utf-8")
    js = JS.read_text(encoding="utf-8")

    assert "Home Lab nu presupune date despre casă" in html
    assert 'id="heatedArea" value=""' in html
    assert 'id="averageHeight" value=""' in html
    assert 'name="construction_year" data-house-critical data-baseline-required value=""' in html
    assert '<option value="" selected disabled>Alege nivelurile</option>' in html
    assert '<option value="" selected disabled>Alege structura</option>' in html
    assert '<option value="" selected disabled>Alege generatorul</option>' in html
    assert html.count("data-baseline-required") >= 20
    assert 'id="edHouseValuesConfirmed"' in html
    assert html.index('data-page="renewables"') < html.index('id="edHouseValuesConfirmed"') < html.index('data-page="goal"')
    assert "Confirmă datele introduse înainte de a continua la obiectivul TEO." in js
    assert "Completează datele obligatorii din pașii 1–3" in js
    assert '.ed-page[data-page="house"],.ed-page[data-page="envelope"],.ed-page[data-page="systems"]' in js
    assert 'class="ed-brand" href="/"' in html
    assert "Alege localitatea din sugestii sau direct de pe hartă." in js


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
