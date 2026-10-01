from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
LANDING = ROOT / "commercial" / "templates" / "landing.html"
EDITORIAL = ROOT / "commercial" / "templates" / "home_lab_editorial.html"
DOCTRINE = ROOT / "docs" / "LACURENT_PRODUCT_DOCTRINE.md"


def test_landing_leads_with_authoritative_technical_identity_without_personalized_marketing():
    landing = LANDING.read_text(encoding="utf-8")

    assert "Nu promitem." in landing
    assert "Calculăm." in landing
    assert "MODELARE ENERGETICĂ · OPTIMIZARE TEHNICO-ECONOMICĂ" in landing
    assert "Fizică a clădirii, cost, investiție și produse comerciale" in landing
    assert 'href="/home-lab-editorial"' in landing
    assert 'href="/home-lab-editorial?account=1"' in landing
    assert "O recomandare trebuie să poată fi explicată." in landing

    assert "Spune-ne cum este casa ta." not in landing
    assert "pentru tine" not in landing.lower()
    assert "casa ta" not in landing.lower()
    assert "Building Optimization" not in landing
    assert "Building optimization engine" not in landing
    assert "Pornește optimizarea" not in landing


def test_home_lab_is_presented_as_a_plan_not_an_experiment():
    editorial = EDITORIAL.read_text(encoding="utf-8")

    assert "Home Lab <small>by LaCurent</small>" in editorial
    assert "Construiește planul energetic al casei tale." in editorial
    assert "Comparăm ce merită" in editorial
    assert "Casa înainte și după TEO" in editorial
    assert ">Planul meu</span>" in editorial
    assert "Cel mai bun rezultat economic" in editorial

    assert "Home Lab Editorial — experiment" not in editorial
    assert "Home Lab <small>experiment</small>" not in editorial
    assert "Obiective optimizare" not in editorial


def test_product_doctrine_defines_one_core_product_and_north_star():
    doctrine = DOCTRINE.read_text(encoding="utf-8")

    assert "LACURENT is a home-energy decision platform." in doctrine
    assert "Homes with a saved optimized energy plan." in doctrine
    assert "User-facing language leads with the decision, not the engine." in doctrine
    assert "Program → Home Lab → saved plan → aggregate impact" in doctrine
