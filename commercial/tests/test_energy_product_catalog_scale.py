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
        bound = _Statement(self._connection, self._sql)
        bound._params = params
        return bound

    async def run(self) -> _Result:
        cursor = self._connection.execute(self._sql, self._params)
        if cursor.description is None:
            self._connection.commit()
            return _Result([])
        columns = [column[0] for column in cursor.description]
        return _Result([dict(zip(columns, row)) for row in cursor.fetchall()])


class _D1LikeSqlite:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def prepare(self, sql: str) -> _Statement:
        return _Statement(self.connection, sql)


def _db() -> _D1LikeSqlite:
    connection = sqlite3.connect(":memory:")
    for migration in MIGRATIONS:
        connection.executescript(migration.read_text(encoding="utf-8"))
    connection.execute(heating_store.HEATING_PARAMETRIC_NODES_CREATE_SQL)
    connection.commit()
    return _D1LikeSqlite(connection)


def _insert_wall_catalog(connection: sqlite3.Connection, count: int) -> None:
    products = []
    properties = []
    offers = []
    for index in range(count):
        product_id = f"scale-wall-{index:05d}"
        products.append(
            (
                product_id,
                "wall_insulation",
                "Scale Manufacturer",
                f"Model {index:05d}",
                f"Scale EPS {index:05d}",
                "source_backed",
                "scale-v1",
                "2026-10-01",
            )
        )
        properties.extend(
            (
                (
                    product_id,
                    "thickness_mm",
                    "nominal",
                    100.0 + (index % 10) * 10.0,
                    100.0 + (index % 10) * 10.0,
                    1,
                ),
                (
                    product_id,
                    "lambda_w_mk",
                    "nominal",
                    0.03 + (index % 5) * 0.001,
                    0.03 + (index % 5) * 0.001,
                    1,
                ),
            )
        )
        offers.append(
            (
                f"{product_id}:offer",
                product_id,
                "Scale Supplier",
                100.0 + (index % 200),
                "lei_unit",
                "2026-10-01",
            )
        )

    connection.executemany(
        """
        INSERT INTO energy_products (
            id, category_id, manufacturer, model, label, evidence_status,
            catalog_version, observed_on
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        products,
    )
    connection.executemany(
        """
        INSERT INTO energy_product_properties (
            product_id, property_key, context_key, numeric_value,
            normalized_numeric_value, is_teo_input
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        properties,
    )
    connection.executemany(
        """
        INSERT INTO energy_product_offers (
            offer_id, product_id, supplier, price_lei, price_basis, observed_on
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        offers,
    )
    connection.commit()


def _insert_heating_catalog(connection: sqlite3.Connection, count: int) -> None:
    products = []
    compat = []
    properties = []
    offers = []
    for index in range(count):
        product_id = f"scale-hp-{index:05d}"
        rated_power = 4.0 + (index % 240) * 0.1
        products.append(
            (
                product_id,
                "heat_pump",
                "Scale Heat",
                f"HP {index:05d}",
                f"Scale Heat Pump {index:05d}",
                "source_backed",
                "scale-v1",
                "2026-10-01",
            )
        )
        compat.append(
            (
                product_id,
                "heat-pump-air-water",
                "Pompă de căldură aer-apă",
                "heat_pump_air_water",
                "heat_pump_air_water",
                "electricity",
                "electricity",
                3.2,
                2500.0,
                "synthetic_scale_fixture",
                "source_backed",
                "catalog_nominal_output",
            )
        )
        properties.append(
            (product_id, "rated_power_kw", "nominal", rated_power, rated_power, 1)
        )
        offers.append(
            (
                f"{product_id}:offer",
                product_id,
                "Scale Supplier",
                12000.0 + index,
                "lei_unit",
                "2026-10-01",
            )
        )

    connection.executemany(
        """
        INSERT INTO energy_products (
            id, category_id, manufacturer, model, label, evidence_status,
            catalog_version, observed_on
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        products,
    )
    connection.executemany(
        """
        INSERT INTO energy_product_heating_compat (
            product_id, technology_id, technology_label, system_type,
            generator_type, carrier, cost_profile, scop,
            installation_allowance_lei, source_kind, confidence, capacity_basis
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        compat,
    )
    connection.executemany(
        """
        INSERT INTO energy_product_properties (
            product_id, property_key, context_key, numeric_value,
            normalized_numeric_value, is_teo_input
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        properties,
    )
    connection.executemany(
        """
        INSERT INTO energy_product_offers (
            offer_id, product_id, supplier, price_lei, price_basis, observed_on
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        offers,
    )
    connection.commit()


def test_cross_category_window_stays_bounded_with_ten_thousand_products() -> None:
    db = _db()
    _insert_wall_catalog(db.connection, 10_000)

    async def exercise() -> None:
        result = await energy_store.read_energy_product_candidate_window_d1(
            db,
            "wall_insulation",
            limit=24,
        )
        assert result["loaded_products"] == 24
        assert len(result["products"]) == 24
        assert len(result["candidates"]) == 24
        assert result["catalog_mode"] == "bounded_d1_category_window"

        hard_cap = await energy_store.read_energy_product_candidate_window_d1(
            db,
            "wall_insulation",
            limit=100_000,
        )
        assert hard_cap["loaded_products"] == 100
        assert len(hard_cap["products"]) == 100

    asyncio.run(exercise())


def test_heating_finalist_window_stays_bounded_with_ten_thousand_products() -> None:
    db = _db()
    _insert_heating_catalog(db.connection, 10_000)

    async def exercise() -> None:
        result = await heating_store.read_heating_commercial_candidate_catalog_from_d1(
            db,
            "heat-pump-air-water",
            8.0,
        )
        assert result is not None
        assert result["source"] == "d1"
        assert result["catalog_mode"] == "persistent_d1_commercial_finalist_bounded"
        assert len(result["options"]) <= heating_store.COMMERCIAL_FINALIST_MAX_PRODUCTS
        assert result["catalog_stats"]["candidate_limit"] == (
            heating_store.COMMERCIAL_FINALIST_MAX_PRODUCTS
        )

        # Search-time planning is still technology/engineering based. The
        # branch payload carries one representative SKU plus market anchors,
        # never all 10k products.
        branch = await heating_store._read_heating_branch_catalog_d1(
            db,
            "heat-pump-air-water",
        )
        assert branch["catalog_stats"]["products"] >= 10_000
        assert branch["catalog_stats"]["loaded_products"] == 1
        assert len(branch["options"]) == 1
        assert len(branch["parametric_heating_nodes"]) <= 241

    asyncio.run(exercise())


def test_large_catalog_does_not_change_teo_product_pass_budget() -> None:
    main_source = (ROOT / "commercial" / "app" / "main.py").read_text(encoding="utf-8")

    assert '"maxProductPasses":0' in main_source.replace(" ", "")
    assert "COMMERCIAL_FINALIST_MAX_PRODUCTS" in (
        ROOT / "commercial" / "app" / "heating_catalog_store.py"
    ).read_text(encoding="utf-8")
