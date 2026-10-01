from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
LANDING = ROOT / "commercial" / "templates" / "landing.html"
LANDING_JS = ROOT / "commercial" / "static" / "lacurent-landing.js"
LANDING_CSS = ROOT / "commercial" / "static" / "lacurent-landing.css"
EDITORIAL = ROOT / "commercial" / "templates" / "home_lab_editorial.html"


def test_collective_impact_lives_on_landing_not_home_lab_intro():
    landing = LANDING.read_text(encoding="utf-8")
    editorial = EDITORIAL.read_text(encoding="utf-8")

    assert 'id="impact"' in landing
    assert "IMPACT MODELAT" in landing
    assert 'id="lcImpactEnergy"' in landing
    assert 'id="lcImpactHomes"' in landing
    assert 'id="lcImpactMoney"' in landing
    assert 'id="lcImpactCapex"' in landing
    assert 'id="lcImpactPayback"' in landing
    assert "potențial modelat" in landing.lower()
    assert "nu economii măsurate" in landing.lower()
    assert "/static/lacurent-landing.css?v=7" in landing
    assert "/static/lacurent-landing.js?v=2" in landing

    assert 'id="edImpactOverview"' not in editorial


def test_landing_impact_reads_live_aggregate_and_respects_cohort_suppression():
    source = LANDING_JS.read_text(encoding="utf-8")

    assert 'fetch("/api/home-lab/impact/summary"' in source
    assert "summary.suppressed" in source
    assert "minimumCohortSize" in source
    assert "potentialSavingKwhYear" in source
    assert "potentialSavingLeiYear" in source
    assert "estimatedCapexLei" in source
    assert "globalSimplePaybackYears" in source


def test_landing_impact_is_below_hero_and_renewable_story_is_ambient():
    landing = LANDING.read_text(encoding="utf-8")
    css = LANDING_CSS.read_text(encoding="utf-8")
    source = LANDING_JS.read_text(encoding="utf-8")

    assert landing.index('class="lc-hero"') < landing.index('id="impact"')
    assert ".lc-impact-strip{" in css
    assert ".lc-renewable-sun{" in css
    assert ".lc-renewable-wind{" in css
    assert ".lc-renewable-grid{" in css
    assert "IntersectionObserver" in source
    assert "[data-scroll-symbol]" in source
