from __future__ import annotations

import importlib.util
import json
import sqlite3
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
SOURCE_PACK = ROOT / "commercial" / "data" / "energy_product_catalog_source_pack_v2.json"
IMPORTER = ROOT / "scripts" / "build-energy-product-catalog-d1-import.py"
MIGRATION = ROOT / "migrations" / "015_energy_product_catalog.sql"
SMOKE_MIGRATION = ROOT / "migrations" / "016_energy_product_catalog_smoke_pack.sql"
UNIFIED_MIGRATION = ROOT / "migrations" / "017_unify_energy_product_catalog.sql"
HEATING_STORE = ROOT / "commercial" / "app" / "heating_catalog_store.py"
HEATING_SEED = ROOT / "commercial" / "data" / "heating-technology-planning.seed.json"


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

    assert result["products"] == 49
    assert result["value_metric_ready"] == 17
    assert result["teo_property_complete"] == 17
    assert len(result["blocked"]) == 32
    blocked = {row["id"]: row["missing_teo_properties"] for row in result["blocked"]}
    assert blocked["zehnder-comfoair-q350-hrv"] == ["heat_recovery_efficiency"]


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

    # The cross-category ready rows plus source-backed heat-pump rows have
    # complete category-local metric inputs. Other heating generators stay
    # catalog-visible but blocked from metric ranking until seasonal efficiency
    # evidence is normalized.
    assert sql.count("INSERT OR REPLACE INTO energy_product_value_metrics") == 17


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
    assert rockwool["denominator_price_lei"] == pytest.approx(round(223.06 / 2.88, 2))
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


def test_unified_migration_materializes_one_product_namespace_and_heating_extensions():
    sql = UNIFIED_MIGRATION.read_text(encoding="utf-8")

    assert sql.count("INSERT OR REPLACE INTO energy_products") == 49
    assert sql.count("INSERT OR REPLACE INTO energy_product_heating_compat") == 40
    assert sql.count("INSERT OR REPLACE INTO energy_product_performance_points") == 50
    assert sql.count("INSERT OR REPLACE INTO energy_product_seasonal_performance") == 2
    assert "CREATE VIEW energy_heating_products_compat_v1 AS" in sql
    assert "CREATE VIEW energy_heat_pump_performance_points_compat_v1 AS" in sql
    assert "CREATE VIEW energy_heat_pump_seasonal_performance_compat_v1 AS" in sql


def test_heating_runtime_reads_unified_catalog_after_shadow_bootstrap_boundary():
    source = HEATING_STORE.read_text(encoding="utf-8")
    boundary = source.index("async def _read_heating_branch_catalog_d1(")
    runtime = source[boundary:]

    assert "FROM energy_heating_products_compat_v1" in runtime
    assert "FROM energy_heat_pump_performance_points_compat_v1" in runtime
    assert "FROM energy_heat_pump_seasonal_performance_compat_v1" in runtime
    assert "FROM heating_products" not in runtime
    assert "INNER JOIN heating_products AS p" not in runtime


def test_unified_d1_shadow_parity_against_legacy_heating_seed():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    for migration in (MIGRATION, SMOKE_MIGRATION, UNIFIED_MIGRATION):
        db.executescript(migration.read_text(encoding="utf-8"))

    seed = json.loads(HEATING_SEED.read_text(encoding="utf-8"))
    legacy = {row["id"]: row for row in seed["options"]}
    universal = {
        row["id"]: dict(row)
        for row in db.execute(
            """
            SELECT id, external_id, technology_id, technology_label, label,
                   system_type, generator_type, carrier, cost_profile,
                   rated_power_kw, efficiency, scop, equipment_price_lei,
                   installation_allowance_lei, source_kind, source_url, confidence,
                   requires_hydronic, requires_existing_gas,
                   requires_existing_high_power_electric,
                   requires_existing_biomass_infrastructure, capacity_basis, note
            FROM energy_heating_products_compat_v1
            ORDER BY id
            """
        )
    }

    assert len(legacy) == 40
    assert set(universal) == set(legacy)

    for product_id, expected in legacy.items():
        actual = universal[product_id]
        for key in (
            "external_id",
            "technology_id",
            "technology_label",
            "label",
            "system_type",
            "generator_type",
            "carrier",
            "cost_profile",
            "source_kind",
            "confidence",
            "capacity_basis",
            "note",
        ):
            assert actual[key] == expected.get(key)
        assert actual["rated_power_kw"] == pytest.approx(expected["rated_power_kw"])
        assert actual["equipment_price_lei"] == pytest.approx(
            expected["equipment_price_lei"]
        )
        assert actual["installation_allowance_lei"] == pytest.approx(
            expected["installation_allowance_lei"]
        )
        if expected.get("efficiency") is None:
            assert actual["efficiency"] is None
        else:
            assert actual["efficiency"] == pytest.approx(expected["efficiency"])
        if expected.get("scop") is None:
            assert actual["scop"] is None
        else:
            assert actual["scop"] == pytest.approx(expected["scop"])
        for key in (
            "requires_hydronic",
            "requires_existing_gas",
            "requires_existing_high_power_electric",
            "requires_existing_biomass_infrastructure",
        ):
            assert bool(actual[key]) == bool(expected.get(key, False))

    assert db.execute("SELECT COUNT(*) FROM energy_products").fetchone()[0] == 49
    assert db.execute(
        "SELECT COUNT(*) FROM energy_product_heating_compat"
    ).fetchone()[0] == 40
    assert db.execute(
        "SELECT COUNT(*) FROM energy_product_performance_points"
    ).fetchone()[0] == 50
    assert db.execute(
        "SELECT COUNT(*) FROM energy_product_seasonal_performance"
    ).fetchone()[0] == 2

    # Four air-air rows are derived multi-unit bundles retained only for TEO
    # parity. They are not standalone purchasable SKUs and must stay out of the
    # public product listing.
    public_heating_count = db.execute(
        """
        SELECT COUNT(*)
        FROM energy_heating_products_compat_v1
        WHERE active = 1
          AND NOT (
              technology_id = 'heat-pump-air-air'
              AND COALESCE(source_kind, '') LIKE 'derived_bundle_%'
          )
        """
    ).fetchone()[0]
    assert public_heating_count == 36
