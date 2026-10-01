from pathlib import Path


COMMERCIAL_DIR = Path(__file__).resolve().parents[1]
JS_PATH = COMMERCIAL_DIR / "static" / "home-lab-editorial.js"
HTML_PATH = COMMERCIAL_DIR / "templates" / "home_lab_editorial.html"


def _function_block(source: str, name: str, next_name: str) -> str:
    start = source.index(f"  function {name}")
    end = source.index(f"  function {next_name}", start)
    return source[start:end]


def test_release_product_additions_are_client_only() -> None:
    source = JS_PATH.read_text(encoding="utf-8")

    monthly = _function_block(
        source,
        "monthlyBillProfile",
        "renderMonthlyBillSection",
    )
    bom = _function_block(
        source,
        "technicalBomRows",
        "renderTechnicalBomSection",
    )

    for block in (monthly, bom):
        assert "fetch(" not in block
        assert "/api/" not in block
        assert "new Worker" not in block

    assert "maxCanonicalPasses:5" in source
    assert "maxProductPasses:0" in source


def test_monthly_bill_copy_does_not_claim_a_second_canonical_profile() -> None:
    source = JS_PATH.read_text(encoding="utf-8")
    section = _function_block(
        source,
        "renderMonthlyBillSection",
        "technicalBomRows",
    )

    assert "Totalul anual rămâne exact" in section
    assert "împărțirea pe luni este orientativă" in section
    assert "media lunară a facturii finale" in section


def test_teo_result_exposes_technical_bom_without_sku_claim() -> None:
    source = JS_PATH.read_text(encoding="utf-8")
    html = HTML_PATH.read_text(encoding="utf-8")

    assert 'id="openBomFromGoal"' in html
    assert "Generează lista de materiale" in html
    assert "BOM tehnic preliminar" in source
    assert "Nu selectează încă un SKU" in source
    assert 'href="/magazin?source=home-lab-bom"' in source
    assert "demo fictiv de magazin partener" in source
    assert "Potrivirea source-backed în produse reale rămâne o etapă separată" in source
