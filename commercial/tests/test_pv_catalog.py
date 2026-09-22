from __future__ import annotations

import math

from fastapi.testclient import TestClient

from commercial.app.engine import demo_building
from commercial.app.main import app
from commercial.app.models import model_to_dict
from commercial.app.pv_catalog import (
    PvModuleSizingRequestV1,
    PvProductScenarioRequestV1,
    build_pv_product_scenario,
    pv_catalog,
    size_pv_modules,
)


client = TestClient(app)


def test_seed_catalog_contains_real_market_modules_and_traceability() -> None:
    catalog = pv_catalog()
    ids = {entry.product.product_id for entry in catalog.entries}

    assert catalog.catalog_version == "pv-ro-seed-2026-09-22"
    assert {
        "canadian-solar-cs6-2-48td-460",
        "jinko-jkm475n-48ql6-dv",
        "longi-lr7-54hvb-475m",
    }.issubset(ids)

    for entry in catalog.entries:
        assert entry.product.technical_source_urls
        assert entry.offers
        assert all(offer.observed_on == "2026-09-22" for offer in entry.offers)


def test_sizing_uses_whole_panels_and_real_module_dimensions() -> None:
    response = size_pv_modules(
        PvModuleSizingRequestV1(target_installed_power_kwp=6.0)
    )

    by_id = {item.product.product_id: item for item in response.candidates}
    jinko = by_id["jinko-jkm475n-48ql6-dv"]
    canadian = by_id["canadian-solar-cs6-2-48td-460"]

    assert jinko.module_count == math.ceil(6000 / 475)
    assert jinko.installed_power_kwp == 6.175
    assert canadian.module_count == math.ceil(6000 / 460)
    assert canadian.installed_power_kwp == 6.44
    assert jinko.array_module_area_m2 < canadian.array_module_area_m2


def test_roof_constraint_can_reject_one_real_product_and_accept_another() -> None:
    response = size_pv_modules(
        PvModuleSizingRequestV1(
            target_installed_power_kwp=6.0,
            max_roof_area_m2=26.0,
        )
    )
    by_id = {item.product.product_id: item for item in response.candidates}

    assert by_id["jinko-jkm475n-48ql6-dv"].roof_area_fits is True
    assert by_id["longi-lr7-54hvb-475m"].roof_area_fits is False
    assert by_id["canadian-solar-cs6-2-48td-460"].roof_area_fits is False
    assert response.feasible_count == 1


def test_module_subtotal_uses_price_snapshot_without_inventing_bos_costs() -> None:
    response = size_pv_modules(
        PvModuleSizingRequestV1(
            target_installed_power_kwp=4.6,
            product_ids=["canadian-solar-cs6-2-48td-460"],
        )
    )
    item = response.candidates[0]

    assert item.module_count == 10
    assert item.module_subtotal_lei == 4440.70
    assert any("inverter" in assumption.lower() for assumption in item.assumptions)


def test_real_module_selection_recalculates_pv_through_light_engine() -> None:
    baseline = demo_building()
    response = build_pv_product_scenario(
        PvProductScenarioRequestV1(
            baseline=baseline,
            product_id="jinko-jkm475n-48ql6-dv",
            target_installed_power_kwp=4.75,
        )
    )

    assert response.selected.module_count == 10
    assert response.selected.installed_power_kwp == 4.75
    assert response.calculation.renewables.pv.enabled is True
    assert response.calculation.renewables.pv.installed_power_kwp == 4.75
    assert response.calculation.renewables.pv.annual_generation_kwh > 0


def test_pv_catalog_api_exposes_seeded_products() -> None:
    response = client.get("/api/products/pv-modules")
    assert response.status_code == 200
    payload = response.json()
    assert payload["catalog_version"] == "pv-ro-seed-2026-09-22"
    assert len(payload["entries"]) >= 3


def test_pv_sizing_api_returns_real_product_counts_and_costs() -> None:
    response = client.post(
        "/api/products/pv-modules/size",
        json={
            "target_installed_power_kwp": 6.0,
            "max_roof_area_m2": 26.0,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["feasible_count"] == 1
    assert any(
        item["product"]["product_id"] == "jinko-jkm475n-48ql6-dv"
        and item["roof_area_fits"] is True
        for item in payload["candidates"]
    )


def test_pv_product_scenario_api_recalculates_actual_selected_kwp() -> None:
    response = client.post(
        "/api/scenarios/pv/product",
        json={
            "baseline": model_to_dict(demo_building()),
            "product_id": "canadian-solar-cs6-2-48td-460",
            "target_installed_power_kwp": 4.6,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["selected"]["module_count"] == 10
    assert payload["calculation"]["renewables"]["pv"]["installed_power_kwp"] == 4.6
    assert payload["calculation"]["renewables"]["pv"]["annual_generation_kwh"] > 0
