from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
LANDING = ROOT / "commercial" / "templates" / "landing.html"
LANDING_JS = ROOT / "commercial" / "static" / "lacurent-landing.js"
LANDING_CSS = ROOT / "commercial" / "static" / "lacurent-landing.css"


def test_landing_is_database_independent_and_does_not_publish_catalog_counts():
    landing = LANDING.read_text(encoding="utf-8")
    source = LANDING_JS.read_text(encoding="utf-8")

    assert 'id="impact"' not in landing
    assert "catalog_product_count" not in landing
    assert "product_categories" not in landing
    assert "<span>D1</span>" not in landing
    assert "/api/home-lab/impact/summary" not in source
    assert "/static/lacurent-landing.css?v=24" in landing
    assert "/static/lacurent-landing.js?v=9" in landing


def test_landing_keeps_the_ambient_renewable_story_without_backend_data():
    landing = LANDING.read_text(encoding="utf-8")
    css = LANDING_CSS.read_text(encoding="utf-8")
    source = LANDING_JS.read_text(encoding="utf-8")

    assert ".lc-renewable-sun{" in css
    assert "width:440px;height:440px" in css
    assert "filter:blur(3px)" in css
    assert "font-weight:600;" in css
    assert ".lc-renewable-wind{" in css
    assert "left:7%;right:auto;bottom:9%" in css
    assert "scale(1.30)" in css
    assert "filter:blur(.68px)" in css
    assert ".lc-renewable-grid{" in css
    assert "@keyframes lc-sun-radiate" in css
    assert "@keyframes lc-sun-breathe" in css
    assert "@keyframes lc-sun-entry-core" in css
    assert "@keyframes lc-sun-entry-radiate" in css
    assert ".lc-renewable-sun.is-reentering::before" in css
    assert "pageshow" in source
    assert 'document.visibilityState === "visible"' in source
    assert "triggerSunReentry();" in source
    assert "@keyframes lc-wind-turn" in css
    assert "52s linear infinite" in css
    assert "height:7px;border-radius:999px" in css
    assert "rgba(153,162,170,.60)" in css
    assert ".lc-renewable-wind::before" not in css
    assert ".lc-renewable-stage.is-scroll-pinned" not in css
    assert "--renewable-pin-y" in css
    assert "releaseStart" in source
    assert "releaseEnd" not in source
    assert "topbar?.offsetHeight" in source
    assert "const pinY = Math.max(0, Math.min(y, releaseStart));" in source
    assert "is-scroll-pinned" not in source
    assert "prefers-reduced-motion:reduce" in css
    assert "IntersectionObserver" in source
    assert "[data-scroll-symbol]" in source
    assert 'href="/produse"' in landing
    assert ">Surse și metodologie<" in landing
    assert 'id="metoda"' not in landing
    assert "RBPE" not in landing
    assert "TEO" not in landing
    assert "MC001" not in landing
    assert "CAPEX" not in landing
