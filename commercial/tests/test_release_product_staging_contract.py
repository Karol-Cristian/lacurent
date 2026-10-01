from pathlib import Path


COMMERCIAL_DIR = Path(__file__).resolve().parents[1]
JS_PATH = COMMERCIAL_DIR / "static" / "home-lab-editorial.js"
HTML_PATH = COMMERCIAL_DIR / "templates" / "home_lab_editorial.html"
MAIN_PATH = COMMERCIAL_DIR / "app" / "main.py"


def _function_block(source: str, name: str, next_name: str) -> str:
    start = source.index(f"  function {name}")
    end = source.index(f"  function {next_name}", start)
    return source[start:end]


def test_monthly_bill_profile_remains_client_side() -> None:
    source = JS_PATH.read_text(encoding="utf-8")
    monthly = _function_block(source, "monthlyBillProfile", "renderMonthlyBillSection")
    assert "fetch(" not in monthly
    assert "/api/" not in monthly
    assert "new Worker" not in monthly
    assert "maxCanonicalPasses:5" in source
    assert "maxProductPasses:0" in source


def test_visual_report_labels_scaled_monthly_profile_honestly() -> None:
    source = JS_PATH.read_text(encoding="utf-8")
    section = _function_block(source, "renderMonthlyBillSection", "reportComparisonBar")
    assert "Înainte vs. după investiție" in section
    assert "Totalurile anuale sunt cele verificate de motor" in section
    assert "scalează la factura anuală TEO" in section


def test_teo_result_opens_real_post_teo_catalog_bom() -> None:
    source = JS_PATH.read_text(encoding="utf-8")
    html = HTML_PATH.read_text(encoding="utf-8")
    main = MAIN_PATH.read_text(encoding="utf-8")

    assert 'id="openBomFromGoal"' in html
    assert "Vezi lista reală de materiale" in html
    assert 'fetch("/api/home-lab/bom"' in source
    assert "Produse și cantități din catalogul LaCurent" in source
    assert 'href="/magazin?source=home-lab-bom"' not in source
    assert '@app.post("/api/home-lab/bom")' in main
    assert '"stage": "post_teo_bom"' in main


def test_local_bom_route_is_explicitly_unbound_without_cloudflare_env() -> None:
    from fastapi.testclient import TestClient
    from commercial.app.main import app

    response = TestClient(app).post("/api/home-lab/bom", json={"requirements":[]})
    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "local-unbound"
    assert payload["available"] is False
    assert payload["stage"] == "post_teo_bom"
    assert payload["items"] == []
