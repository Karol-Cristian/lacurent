from __future__ import annotations

import asyncio
import sqlite3
from pathlib import Path
from typing import Any

from commercial.app import energy_product_catalog_store as energy_store
from commercial.app import heating_catalog_store as heating_store


ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = (
    ROOT / "migrations" / "015_energy_product_catalog.sql",
    ROOT / "migrations" / "016_energy_product_catalog_smoke_pack.sql",
    ROOT / "migrations" / "017_unify_energy_product_catalog.sql",
)


class _Result:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.results = rows


class _Statement:
    def __init__(self, connection: sqlite3.Connection, sql: str) -> None:
        self._connection = connection
        self._sql = sql
        self._params: tuple[Any, ...] = ()

    def bind(self, *params: Any) -> "_Statement":
        self._params = params
        return self

    async def run(self) -> _Result:
        cursor = self._connection.execute(self._sql, self._params)
        if cursor.description is None:
            self._connection.commit()
            return _Result([])
        columns = [item[0] for item in cursor.description]
        rows = [
            dict(zip(columns, row))
            for row in cursor.fetchall()
        ]
        return _Result(rows)


class _D1LikeSqlite:
    """Minimal async D1 prepare/bind/run facade over SQLite.

    D1 is SQLite-based, so this contract test exercises the exact runtime SQL
    used by the Python Worker against the exact release migrations without
    requiring Cloudflare credentials.
    """

    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def prepare(self, sql: str) -> _Statement:
        return _Statement(self.connection, sql)


def _migrated_database() -> _D1LikeSqlite:
    connection = sqlite3.connect(":memory:")
    for migration in MIGRATIONS:
        connection.executescript(migration.read_text(encoding="utf-8"))

    # This table is a derived optimizer cache, not a second product catalog.
    # Production creates it lazily. Create the empty schema here so summary
    # queries exercise the same SQL contract without bootstrapping legacy data.
    connection.execute(heating_store.HEATING_PARAMETRIC_NODES_CREATE_SQL)
    connection.commit()
    return _D1LikeSqlite(connection)


def test_unified_d1_heating_runtime_queries_execute_against_release_migrations() -> None:
    db = _migrated_database()

    async def exercise() -> None:
        branch = await heating_store._read_heating_branch_catalog_d1(
            db, "heat-pump-air-water"
        )
        assert branch["source"] == "d1"
        assert branch["catalog_mode"] == "persistent_d1_branch_market_anchors"
        assert len(branch["options"]) == 1
        assert len(branch["parametric_heating_nodes"]) >= 2
        assert branch["catalog_stats"]["products"] >= 2

        summary = await heating_store._read_heating_catalog_summary_d1(db)
        assert summary["source"] == "d1"
        assert summary["catalog_stats"]["products"] == 40
        assert summary["catalog_stats"]["performance_points"] == 50
        assert summary["catalog_stats"]["seasonal_points"] == 2
        assert summary["technology_summaries"]

        public_products = await heating_store.read_heating_public_products_from_d1(db)
        assert public_products is not None
        assert public_products["source"] == "d1"
        assert len(public_products["options"]) == 36
        assert not any(
            str(item.get("source_kind") or "").startswith("derived_bundle_")
            for item in public_products["options"]
        )

        public_catalog = await heating_store.read_heating_public_catalog_from_d1(db)
        assert public_catalog is not None
        assert public_catalog["source"] == "d1"
        assert len(public_catalog["options"]) == 36
        public_ids = {str(item["id"]) for item in public_catalog["options"]}
        assert public_ids
        assert all(
            str(point["product_id"]) in public_ids
            for point in public_catalog["heat_pump_performance_points"]
        )
        assert all(
            str(point["product_id"]) in public_ids
            for point in public_catalog["heat_pump_seasonal_performance"]
        )

        finalist = await heating_store.read_heating_commercial_candidate_catalog_from_d1(
            db, "heat-pump-air-water", 8.0
        )
        assert finalist is not None
        assert finalist["source"] == "d1"
        assert finalist["catalog_mode"] == "persistent_d1_commercial_finalist_bounded"
        assert 1 <= len(finalist["options"]) <= heating_store.COMMERCIAL_FINALIST_MAX_PRODUCTS
        finalist_ids = {str(item["id"]) for item in finalist["options"]}
        assert all(
            str(point["product_id"]) in finalist_ids
            for point in finalist["heat_pump_performance_points"]
        )

        exact_branch = await heating_store.read_heating_commercial_branch_catalog_from_d1(
            db, "heat-pump-air-water"
        )
        assert exact_branch is not None
        assert exact_branch["source"] == "d1"
        assert exact_branch["options"]
        assert all(
            item["technology_id"] == "heat-pump-air-water"
            for item in exact_branch["options"]
        )

    asyncio.run(exercise())


def test_unified_d1_cross_category_candidate_windows_execute_against_release_migrations() -> None:
    db = _migrated_database()

    async def exercise() -> None:
        ready_categories = (
            "wall_insulation",
            "radiator",
            "underfloor_pipe",
            "underfloor_manifold",
            "circulation_pump",
            "heating_control",
            "pv_module",
        )
        for category_id in ready_categories:
            payload = await energy_store.read_energy_product_candidate_window_d1(
                db, category_id, limit=24
            )
            assert payload["catalog_mode"] == "bounded_d1_category_window"
            assert payload["loaded_products"] >= 1, category_id
            assert payload["teo_ready_products"] >= 1, category_id
            assert payload["candidates"], category_id
            assert len(payload["products"]) <= 24

        hrv = await energy_store.read_energy_product_candidate_window_d1(
            db, "hrv_unit", limit=24
        )
        assert hrv["loaded_products"] >= 1
        assert hrv["teo_ready_products"] == 0
        assert hrv["blocked_products"]
        assert any(
            "heat_recovery_efficiency" in row.get("missing", [])
            for row in hrv["blocked_products"]
        )

    asyncio.run(exercise())


def test_unified_d1_runtime_never_requires_legacy_heating_product_reads() -> None:
    source = (
        ROOT / "commercial" / "app" / "heating_catalog_store.py"
    ).read_text(encoding="utf-8")
    runtime_boundary = source.index("async def _read_heating_branch_catalog_d1(")
    runtime = source[runtime_boundary:]

    assert "FROM energy_heating_products_compat_v1" in runtime
    assert "FROM energy_heat_pump_performance_points_compat_v1" in runtime
    assert "FROM energy_heat_pump_seasonal_performance_compat_v1" in runtime
    assert "FROM heating_products" not in runtime
    assert "INNER JOIN heating_products AS p" not in runtime
