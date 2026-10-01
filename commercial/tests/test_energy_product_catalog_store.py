from __future__ import annotations

from types import SimpleNamespace

import pytest

from commercial.app.energy_product_catalog_store import (
    read_energy_product_candidate_window_d1,
)


class FakeStatement:
    def __init__(self, sql: str):
        self.sql = sql
        self.args = ()

    def bind(self, *args):
        self.args = args
        return self

    async def run(self):
        if "FROM energy_products" in self.sql:
            category_id = self.args[0]
            limit = int(self.args[1])
            rows = [
                {
                    "id": "complete-hrv",
                    "category_id": category_id,
                    "manufacturer": "Example",
                    "model": "HRV 350",
                    "label": "Example HRV 350",
                    "manufacturer_sku": "HRV350",
                    "gtin": None,
                    "evidence_status": "document_backed",
                    "source_url": "https://example.invalid/hrv350",
                    "catalog_version": "test",
                    "observed_on": "2026-10-01",
                },
                {
                    "id": "incomplete-hrv",
                    "category_id": category_id,
                    "manufacturer": "Example",
                    "model": "HRV incomplete",
                    "label": "Example HRV incomplete",
                    "manufacturer_sku": "HRVX",
                    "gtin": None,
                    "evidence_status": "source_backed",
                    "source_url": "https://example.invalid/hrvx",
                    "catalog_version": "test",
                    "observed_on": "2026-10-01",
                },
            ][:limit]
            return SimpleNamespace(results=rows)

        if "FROM energy_product_properties" in self.sql:
            return SimpleNamespace(
                results=[
                    {
                        "product_id": "complete-hrv",
                        "property_key": "max_airflow_m3h",
                        "context_key": "nominal",
                        "numeric_value": 350,
                        "text_value": None,
                        "normalized_numeric_value": 350,
                        "normalized_unit": "m3/h",
                        "source_document_id": "d1",
                        "source_locator": "table",
                        "confidence": "source_backed",
                        "is_teo_input": 1,
                    },
                    {
                        "product_id": "complete-hrv",
                        "property_key": "heat_recovery_efficiency",
                        "context_key": "nominal",
                        "numeric_value": 0.88,
                        "text_value": None,
                        "normalized_numeric_value": 0.88,
                        "normalized_unit": "-",
                        "source_document_id": "d1",
                        "source_locator": "table",
                        "confidence": "source_backed",
                        "is_teo_input": 1,
                    },
                    {
                        "product_id": "complete-hrv",
                        "property_key": "specific_power_input_w_m3h",
                        "context_key": "nominal",
                        "numeric_value": 0.3,
                        "text_value": None,
                        "normalized_numeric_value": 0.3,
                        "normalized_unit": "W/(m3/h)",
                        "source_document_id": "d1",
                        "source_locator": "table",
                        "confidence": "source_backed",
                        "is_teo_input": 1,
                    },
                    {
                        "product_id": "incomplete-hrv",
                        "property_key": "max_airflow_m3h",
                        "context_key": "nominal",
                        "numeric_value": 350,
                        "text_value": None,
                        "normalized_numeric_value": 350,
                        "normalized_unit": "m3/h",
                        "source_document_id": "d2",
                        "source_locator": "table",
                        "confidence": "source_backed",
                        "is_teo_input": 1,
                    },
                ]
            )

        if "FROM energy_product_offers" in self.sql:
            return SimpleNamespace(
                results=[
                    {
                        "offer_id": "o1",
                        "product_id": "complete-hrv",
                        "supplier": "Supplier",
                        "supplier_sku": "S1",
                        "price_lei": 12000,
                        "price_basis": "lei_unit",
                        "quantity": 1,
                        "quantity_unit": "unit",
                        "vat_included": 1,
                        "stock_status": "in_stock",
                        "source_url": "https://example.invalid/offer",
                        "observed_on": "2026-10-01",
                    }
                ]
            )
        raise AssertionError(f"Unexpected SQL: {self.sql}")


class FakeDB:
    def prepare(self, sql: str):
        return FakeStatement(sql)


@pytest.mark.asyncio
async def test_bounded_d1_loader_returns_only_teo_ready_candidates():
    payload = await read_energy_product_candidate_window_d1(
        FakeDB(),
        "hrv_unit",
        limit=2,
    )

    assert payload["catalog_mode"] == "bounded_d1_category_window"
    assert payload["loaded_products"] == 2
    assert payload["teo_ready_products"] == 1
    assert [item.product_id for item in payload["candidates"]] == ["complete-hrv"]
    assert payload["candidates"][0].unit_price_lei == pytest.approx(12000)
    assert payload["blocked_products"] == [
        {
            "product_id": "incomplete-hrv",
            "reason": "missing_teo_properties",
            "missing": [
                "heat_recovery_efficiency",
                "specific_power_input_w_m3h",
            ],
        }
    ]


@pytest.mark.asyncio
async def test_d1_loader_caps_requested_window_at_100():
    payload = await read_energy_product_candidate_window_d1(
        FakeDB(),
        "hrv_unit",
        limit=1000,
    )
    assert payload["loaded_products"] == 2
