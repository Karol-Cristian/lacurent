from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
SOURCE_PACK = ROOT / "commercial" / "data" / "energy_product_catalog_source_pack_v2.json"
IMPORTER = ROOT / "scripts" / "build-energy-product-catalog-d1-import.py"
MIGRATION = ROOT / "migrations" / "015_energy_product_catalog.sql"


def _load_importer():
    spec = importlib.util.spec_from_file_location("energy_catalog_importer", IMPORTER)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_real_cross_category_source_pack_validates_and_reports_teo_readiness():
    importer = _load_importer()
    payload = importer.load(SOURCE_PACK)
    normalized = importer.validate(payload)
    result = importer.summary(normalized)

    assert result["products"] == 4
    assert result["value_metric_ready"] == 3
    assert result["teo_property_complete"] == 3
    assert result["blocked"] == [
        {
            "id": "zehnder-comfoair-q350-hrv",
            "missing_teo_properties": ["heat_recovery_efficiency"],
        }
    ]


def test_source_pack_derives_real_category_local_metrics():
    importer = _load_importer()
    normalized = importer.validate(importer.load(SOURCE_PACK))
    by_id = {row["product"]["id"]: row for row in normalized["products"]}

    austrotherm = by_id["austrotherm-eps-a100-af-plus-160"]["metric"]
    assert austrotherm is not None
    assert austrotherm["denominator_basis"] == "lei_per_m2"
    assert austrotherm["denominator_price_lei"] == pytest.approx(114.90 / 1.50)
    assert austrotherm["numerator_value"] == pytest.approx(0.16 / 0.030)

    purmo = by_id["purmo-compact-c22-600x1000"]["metric"]
    assert purmo is not None
    assert purmo["numerator_value"] == pytest.approx(1709)
    assert purmo["metric_value"] == pytest.approx(1709 / 509)

    uponor = by_id["uponor-comfort-pipe-plus-16x2-640"]["metric"]
    assert uponor is not None
    assert uponor["denominator_price_lei"] == pytest.approx(5.0 * 640)
    assert uponor["metric_value"] == pytest.approx(640 / (5.0 * 640))


def test_importer_emits_generic_catalog_tables_and_keeps_blocked_hrv_out_of_value_metrics():
    importer = _load_importer()
    payload = importer.load(SOURCE_PACK)
    normalized = importer.validate(payload)
    sql = importer.build_sql(payload, normalized)

    assert "INSERT OR REPLACE INTO energy_products" in sql
    assert "INSERT OR REPLACE INTO energy_product_documents" in sql
    assert "INSERT OR REPLACE INTO energy_product_properties" in sql
    assert "INSERT OR REPLACE INTO energy_product_offers" in sql
    assert "INSERT OR REPLACE INTO energy_product_value_metrics" in sql

    # Three products have complete metric inputs; the HRV is intentionally blocked
    # until official heat-recovery efficiency is parsed.
    assert sql.count("INSERT OR REPLACE INTO energy_product_value_metrics") == 3


def test_migration_supports_documents_images_offers_and_category_local_value_metrics():
    sql = MIGRATION.read_text(encoding="utf-8")

    for table in (
        "energy_product_categories",
        "energy_products",
        "energy_product_documents",
        "energy_product_properties",
        "energy_product_images",
        "energy_product_offers",
        "energy_product_value_metrics",
        "energy_product_import_batches",
    ):
        assert f"CREATE TABLE IF NOT EXISTS {table}" in sql

    assert "'planning_curve'" in sql
    assert "'finalist_match'" in sql
    assert "'bill_of_materials'" in sql
