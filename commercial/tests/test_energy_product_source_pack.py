from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
SOURCE_PACK = ROOT / "commercial" / "data" / "energy_product_catalog_source_pack_v2.json"
IMPORTER = ROOT / "scripts" / "build-energy-product-catalog-d1-import.py"
MIGRATION = ROOT / "migrations" / "015_energy_product_catalog.sql"
SMOKE_MIGRATION = ROOT / "migrations" / "016_energy_product_catalog_smoke_pack.sql"


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

    assert result["products"] == 9
    assert result["value_metric_ready"] == 8
    assert result["teo_property_complete"] == 8
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

    # Eight products have complete category-local metric inputs; the HRV is
    # intentionally blocked until official heat-recovery efficiency is parsed.
    assert sql.count("INSERT OR REPLACE INTO energy_product_value_metrics") == 8


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


def test_smoke_pack_is_materialized_as_deterministic_d1_seed():
    sql = SMOKE_MIGRATION.read_text(encoding="utf-8")

    assert sql.count("INSERT OR REPLACE INTO energy_products") == 4
    assert sql.count("INSERT OR REPLACE INTO energy_product_documents") == 5
    assert sql.count("INSERT OR REPLACE INTO energy_product_properties") == 19
    assert sql.count("INSERT OR REPLACE INTO energy_product_offers") == 4
    assert sql.count("INSERT OR REPLACE INTO energy_product_value_metrics") == 3
    assert "zehnder-comfoair-q350-hrv" in sql
    # The incomplete HRV is stored for provenance/catalog display, but the only
    # value metrics are the three technically complete products.
    zehnder_metric_rows = [
        line
        for line in sql.splitlines()
        if "energy_product_value_metrics" in line
        and "zehnder-comfoair-q350-hrv" in line
    ]
    assert zehnder_metric_rows == []


def test_importer_writes_image_only_when_explicit_image_url_exists():
    importer = _load_importer()
    payload = importer.load(SOURCE_PACK)
    payload["products"][0]["image"] = {
        "image_url": "https://manufacturer.example/product.webp",
        "source_page": "https://manufacturer.example/product",
        "rights_basis": "manufacturer_feed_authorized",
        "alt_text": "Product image",
    }
    normalized = importer.validate(payload)
    sql = importer.build_sql(payload, normalized)

    assert "INSERT OR REPLACE INTO energy_product_images" in sql
    assert "manufacturer_feed_authorized" in sql
    assert "https://manufacturer.example/product.webp" in sql
    assert "INSERT OR REPLACE INTO energy_product_import_batches" in sql


def test_current_source_pack_does_not_fake_direct_image_urls():
    importer = _load_importer()
    payload = importer.load(SOURCE_PACK)
    normalized = importer.validate(payload)
    sql = importer.build_sql(payload, normalized)

    assert "INSERT OR REPLACE INTO energy_product_images" not in sql
    assert all(
        not (product.get("image") or {}).get("image_url")
        for product in payload["products"]
    )



def test_expanded_source_pack_covers_multiple_teo_roles_and_categories():
    importer = _load_importer()
    normalized = importer.validate(importer.load(SOURCE_PACK))
    by_id = {row["product"]["id"]: row for row in normalized["products"]}

    rockwool = by_id["rockwool-frontrock-casa-100"]["metric"]
    assert rockwool is not None
    assert rockwool["comparison_scope"] == "wall_insulation"
    assert rockwool["denominator_price_lei"] == pytest.approx(223.06 / 2.88)
    assert rockwool["numerator_value"] == pytest.approx(0.1 / 0.034)

    jinko = by_id["jinko-tiger-neo-jkm440n-54hl4r-v"]["metric"]
    assert jinko is not None
    assert jinko["numerator_value"] == pytest.approx(440)
    assert jinko["denominator_price_lei"] == pytest.approx(339)

    grundfos = by_id["grundfos-alpha2-25-60-180-99411175"]["metric"]
    assert grundfos is not None
    assert grundfos["comparison_scope"] == "circulation_pump"
    assert grundfos["numerator_value"] == pytest.approx(3.4 * 6)

    uponor_manifold = by_id["uponor-vario-m-fm-6-1085948"]["metric"]
    assert uponor_manifold is not None
    assert uponor_manifold["numerator_value"] == pytest.approx(6)

    salus = by_id["salus-kl08nsb-8-zone"]["metric"]
    assert salus is not None
    assert salus["numerator_value"] == pytest.approx(8)

    roles = {
        row["product"]["teo"]["role"]
        for row in normalized["products"]
        if row["product"].get("teo")
    }
    assert {"planning_curve", "finalist_match", "bill_of_materials"} <= roles
