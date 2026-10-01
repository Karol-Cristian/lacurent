from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HTML = ROOT / "commercial" / "templates" / "home_lab_editorial.html"
JS = ROOT / "commercial" / "static" / "home-lab-editorial.js"
CSS = ROOT / "commercial" / "static" / "home-lab-editorial.css"


def test_home_lab_has_controlled_service_downtime_notice() -> None:
    html = HTML.read_text(encoding="utf-8")
    js = JS.read_text(encoding="utf-8")
    css = CSS.read_text(encoding="utf-8")

    assert 'id="edServiceNotice"' in html
    assert 'id="edServiceNoticeText"' in html
    assert "Actualizăm serviciul de calcul." in html
    assert "Datele introduse rămân în pagină" in html

    assert "function showServiceNotice" in js
    assert "function clearServiceNotice" in js
    assert "[500, 502, 503, 504]" in js
    assert 'showServiceNotice(error, "Serviciul RBPE")' in js
    assert "reîncercăm automat" in js

    assert ".ed-service-notice" in css
    assert ".ed-service-notice[hidden]" in css


def test_editorial_assets_are_cache_busted_for_downtime_ui() -> None:
    html = HTML.read_text(encoding="utf-8")
    assert "home-lab-editorial.css?v=36" in html
    assert "home-lab-editorial.js?v=67" in html
