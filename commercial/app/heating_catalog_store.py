from __future__ import annotations

import asyncio
import time
from typing import Any

from .heating_optimization import heating_planning_catalog


HEATING_CATALOG_CACHE_SECONDS = 900
HEATING_CATALOG_RETRY_SECONDS = 30
HEATING_PARAMETRIC_NODE_TOTAL = 1000
D1_BATCH_SIZE = 100

_heating_catalog_lock = asyncio.Lock()
_heating_catalog_cached_payload: dict[str, Any] | None = None
_heating_catalog_cache_expires_at = 0.0
_heating_catalog_retry_after = 0.0


HEATING_PRODUCTS_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS heating_products (
    id TEXT PRIMARY KEY,
    external_id TEXT,
    technology_id TEXT NOT NULL,
    technology_label TEXT NOT NULL,
    label TEXT NOT NULL,
    system_type TEXT NOT NULL,
    generator_type TEXT NOT NULL,
    carrier TEXT NOT NULL,
    cost_profile TEXT NOT NULL,
    rated_power_kw REAL NOT NULL CHECK(rated_power_kw > 0),
    efficiency REAL,
    scop REAL,
    equipment_price_lei REAL NOT NULL CHECK(equipment_price_lei >= 0),
    installation_allowance_lei REAL NOT NULL CHECK(installation_allowance_lei >= 0),
    source_kind TEXT NOT NULL,
    source_url TEXT,
    confidence TEXT NOT NULL,
    requires_hydronic INTEGER NOT NULL DEFAULT 1,
    requires_existing_gas INTEGER NOT NULL DEFAULT 0,
    requires_existing_high_power_electric INTEGER NOT NULL DEFAULT 0,
    requires_existing_biomass_infrastructure INTEGER NOT NULL DEFAULT 0,
    capacity_basis TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    catalog_version TEXT NOT NULL,
    observed_on TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

HEAT_PUMP_POINTS_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS heat_pump_performance_points (
    product_id TEXT NOT NULL,
    outdoor_temperature_c REAL NOT NULL,
    flow_temperature_c REAL NOT NULL,
    return_temperature_c REAL,
    delta_t_k REAL,
    heating_capacity_kw REAL,
    cop REAL NOT NULL CHECK(cop > 1),
    test_standard TEXT,
    source_kind TEXT NOT NULL,
    source_url TEXT,
    note TEXT NOT NULL DEFAULT '',
    catalog_version TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(product_id, outdoor_temperature_c, flow_temperature_c)
)
"""

HEATING_PARAMETRIC_NODES_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS heating_parametric_nodes (
    id TEXT PRIMARY KEY,
    technology_id TEXT NOT NULL,
    technology_label TEXT NOT NULL,
    required_power_kw REAL NOT NULL CHECK(required_power_kw > 0),
    planning_capex_lei REAL NOT NULL CHECK(planning_capex_lei >= 0),
    source_product_count INTEGER NOT NULL CHECK(source_product_count > 0),
    min_source_power_kw REAL NOT NULL CHECK(min_source_power_kw > 0),
    max_source_power_kw REAL NOT NULL CHECK(max_source_power_kw > 0),
    interpolation_kind TEXT NOT NULL,
    catalog_version TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

HEAT_PUMP_SEASONAL_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS heat_pump_seasonal_performance (
    product_id TEXT NOT NULL,
    climate TEXT NOT NULL,
    application_temperature_c REAL NOT NULL,
    scop REAL NOT NULL CHECK(scop > 1),
    design_load_kw REAL,
    source_kind TEXT NOT NULL,
    source_url TEXT,
    test_standard TEXT,
    catalog_version TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(product_id, climate, application_temperature_c)
)
"""

HEATING_PRODUCT_UPSERT_SQL = """
INSERT OR REPLACE INTO heating_products (
    id, external_id, technology_id, technology_label, label,
    system_type, generator_type, carrier, cost_profile,
    rated_power_kw, efficiency, scop, equipment_price_lei,
    installation_allowance_lei, source_kind, source_url, confidence,
    requires_hydronic, requires_existing_gas,
    requires_existing_high_power_electric,
    requires_existing_biomass_infrastructure, capacity_basis, note,
    catalog_version, observed_on, active, updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
"""

HEAT_PUMP_POINT_UPSERT_SQL = """
INSERT OR REPLACE INTO heat_pump_performance_points (
    product_id, outdoor_temperature_c, flow_temperature_c,
    return_temperature_c, delta_t_k, heating_capacity_kw, cop,
    test_standard, source_kind, source_url, note, catalog_version, updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
"""

HEATING_PARAMETRIC_NODE_UPSERT_SQL = """
INSERT OR REPLACE INTO heating_parametric_nodes (
    id, technology_id, technology_label, required_power_kw,
    planning_capex_lei, source_product_count, min_source_power_kw,
    max_source_power_kw, interpolation_kind, catalog_version, updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
"""

HEAT_PUMP_SEASONAL_UPSERT_SQL = """
INSERT OR REPLACE INTO heat_pump_seasonal_performance (
    product_id, climate, application_temperature_c, scop, design_load_kw,
    source_kind, source_url, test_standard, catalog_version, updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
"""


def _d1_rows(result: Any) -> list[dict[str, Any]]:
    raw_rows = getattr(result, "results", None)
    if hasattr(raw_rows, "to_py"):
        raw_rows = raw_rows.to_py()
    return [dict(row) for row in (raw_rows or [])]


def _interpolate_anchor_curve(
    anchors: list[tuple[float, float]],
    power_kw: float,
) -> float:
    if not anchors:
        raise ValueError("Cannot interpolate an empty heating CAPEX curve.")
    if len(anchors) == 1:
        return float(anchors[0][1])
    target = min(max(float(power_kw), float(anchors[0][0])), float(anchors[-1][0]))
    if target <= float(anchors[0][0]) + 1e-12:
        return float(anchors[0][1])
    for index in range(1, len(anchors)):
        low_power, low_cost = anchors[index - 1]
        high_power, high_cost = anchors[index]
        if target <= float(high_power) + 1e-12:
            span = float(high_power) - float(low_power)
            if span <= 1e-12:
                return min(float(low_cost), float(high_cost))
            fraction = (target - float(low_power)) / span
            return float(low_cost) + fraction * (float(high_cost) - float(low_cost))
    return float(anchors[-1][1])


def build_parametric_heating_nodes(
    seed: dict[str, Any] | None = None,
    *,
    total_nodes: int = HEATING_PARAMETRIC_NODE_TOTAL,
) -> list[dict[str, Any]]:
    """Build a dense, non-SKU planning grid from source-backed market anchors.

    These rows are interpolation nodes for the mathematical optimizer. They are
    deliberately not presented as commercial products and never manufacture
    COP/capacity data. Real SKU matching remains a separate finalist step.
    """

    raw = seed or heating_planning_catalog()
    options = list(raw.get("options") or [])
    grouped: dict[str, list[dict[str, Any]]] = {}
    for item in options:
        technology_id = str(item.get("technology_id") or "").strip()
        if technology_id:
            grouped.setdefault(technology_id, []).append(item)
    technology_ids = sorted(grouped)
    if not technology_ids or total_nodes <= 0:
        return []

    base_count = total_nodes // len(technology_ids)
    remainder = total_nodes % len(technology_ids)
    nodes: list[dict[str, Any]] = []
    version = str(raw.get("catalog_version") or "")

    for tech_index, technology_id in enumerate(technology_ids):
        items = grouped[technology_id]
        by_power: dict[float, float] = {}
        for item in items:
            power = float(item["rated_power_kw"])
            capex = float(item["equipment_price_lei"]) + float(
                item["installation_allowance_lei"]
            )
            previous = by_power.get(power)
            if previous is None or capex < previous:
                by_power[power] = capex
        anchors = sorted(by_power.items())
        if not anchors:
            continue

        count = base_count + (1 if tech_index < remainder else 0)
        count = max(count, 1)
        min_power = float(anchors[0][0])
        max_power = float(anchors[-1][0])
        label = str(items[0].get("technology_label") or technology_id)
        for node_index in range(count):
            fraction = 0.0 if count == 1 else node_index / (count - 1)
            power = min_power + fraction * (max_power - min_power)
            capex = _interpolate_anchor_curve(anchors, power)
            nodes.append(
                {
                    "id": f"{technology_id}:parametric:{node_index:04d}",
                    "technology_id": technology_id,
                    "technology_label": label,
                    "required_power_kw": round(power, 6),
                    "planning_capex_lei": round(max(capex, 0.0), 2),
                    "source_product_count": len(items),
                    "min_source_power_kw": round(min_power, 6),
                    "max_source_power_kw": round(max_power, 6),
                    "interpolation_kind": "linear_between_source_backed_market_anchors",
                    "catalog_version": version,
                }
            )
    return nodes


async def _run_d1_batches(
    db: Any,
    statements: list[Any],
    *,
    chunk_size: int = D1_BATCH_SIZE,
) -> None:
    """Execute prepared D1 statements in bounded batches to avoid N round trips."""

    for offset in range(0, len(statements), max(int(chunk_size), 1)):
        chunk = statements[offset: offset + max(int(chunk_size), 1)]
        if chunk:
            await db.batch(chunk)


async def _create_heating_catalog_tables(db: Any) -> None:
    await db.prepare(HEATING_PRODUCTS_CREATE_SQL).run()
    await db.prepare(HEAT_PUMP_POINTS_CREATE_SQL).run()
    await db.prepare(HEATING_PARAMETRIC_NODES_CREATE_SQL).run()
    await db.prepare(HEAT_PUMP_SEASONAL_CREATE_SQL).run()
    await db.prepare(
        "CREATE INDEX IF NOT EXISTS heating_products_active_technology_power_idx "
        "ON heating_products(active, technology_id, rated_power_kw)"
    ).run()
    await db.prepare(
        "CREATE INDEX IF NOT EXISTS heating_products_external_id_idx "
        "ON heating_products(external_id)"
    ).run()
    await db.prepare(
        "CREATE INDEX IF NOT EXISTS heat_pump_performance_product_idx "
        "ON heat_pump_performance_points(product_id, outdoor_temperature_c, flow_temperature_c)"
    ).run()
    await db.prepare(
        "CREATE INDEX IF NOT EXISTS heating_parametric_nodes_technology_power_idx "
        "ON heating_parametric_nodes(technology_id, required_power_kw)"
    ).run()
    await db.prepare(
        "CREATE INDEX IF NOT EXISTS heat_pump_seasonal_product_idx "
        "ON heat_pump_seasonal_performance(product_id, climate, application_temperature_c)"
    ).run()


async def _ensure_heating_catalog_d1(db: Any) -> None:
    """Synchronize the versioned repo seed into D1 through the Worker binding.

    The repo seed remains the deterministic CI fixture and disaster-recovery
    mirror. In production D1 is the runtime source consumed by optimizer/shop.
    """
    seed = heating_planning_catalog()
    products = list(seed.get("options") or [])
    points = list(seed.get("heat_pump_performance_points") or [])
    seasonal = list(seed.get("heat_pump_seasonal_performance") or [])
    parametric_nodes = build_parametric_heating_nodes(seed)
    expected_version = str(seed.get("catalog_version") or "")
    observed_on = str(seed.get("observed_on") or "")

    await _create_heating_catalog_tables(db)

    status_result = await db.prepare(
        """
        SELECT
          (SELECT COUNT(*) FROM heating_products WHERE active = 1) AS products_count,
          (SELECT COUNT(*) FROM heat_pump_performance_points WHERE catalog_version = ?) AS points_count,
          (SELECT COUNT(*) FROM heating_parametric_nodes WHERE catalog_version = ?) AS parametric_count,
          (SELECT COUNT(*) FROM heat_pump_seasonal_performance WHERE catalog_version = ?) AS seasonal_count,
          COALESCE((SELECT MAX(catalog_version) FROM heating_products WHERE active = 1), '') AS catalog_version
        """
    ).bind(expected_version, expected_version, expected_version).run()
    status_rows = _d1_rows(status_result)
    status = status_rows[0] if status_rows else {}
    if (
        int(status.get("products_count") or 0) == len(products)
        and int(status.get("points_count") or 0) == len(points)
        and int(status.get("parametric_count") or 0) == len(parametric_nodes)
        and int(status.get("seasonal_count") or 0) == len(seasonal)
        and str(status.get("catalog_version") or "") == expected_version
    ):
        return

    product_stmt = db.prepare(HEATING_PRODUCT_UPSERT_SQL)
    product_statements = [
        product_stmt.bind(
            item["id"],
            item.get("external_id") or item["id"],
            item["technology_id"],
            item["technology_label"],
            item["label"],
            item["system_type"],
            item["generator_type"],
            item["carrier"],
            item["cost_profile"],
            float(item["rated_power_kw"]),
            None if item.get("efficiency") is None else float(item["efficiency"]),
            None if item.get("scop") is None else float(item["scop"]),
            float(item["equipment_price_lei"]),
            float(item["installation_allowance_lei"]),
            item["source_kind"],
            item.get("source_url"),
            item.get("confidence") or "low",
            int(bool(item.get("requires_hydronic", True))),
            int(bool(item.get("requires_existing_gas", False))),
            int(bool(item.get("requires_existing_high_power_electric", False))),
            int(bool(item.get("requires_existing_biomass_infrastructure", False))),
            item.get("capacity_basis") or "catalog_nominal_output",
            item.get("note") or "",
            expected_version,
            observed_on,
        )
        for item in products
    ]
    await _run_d1_batches(db, product_statements)

    # Products removed from a later seed remain auditable but stop participating
    # in optimization/shop queries.
    await db.prepare(
        "UPDATE heating_products SET active = 0 "
        "WHERE active = 1 AND catalog_version <> ?"
    ).bind(expected_version).run()

    point_stmt = db.prepare(HEAT_PUMP_POINT_UPSERT_SQL)
    point_statements = [
        point_stmt.bind(
            point["product_id"],
            float(point["outdoor_temperature_c"]),
            float(point["flow_temperature_c"]),
            None if point.get("return_temperature_c") is None else float(point["return_temperature_c"]),
            None if point.get("delta_t_k") is None else float(point["delta_t_k"]),
            None if point.get("heating_capacity_kw") is None else float(point["heating_capacity_kw"]),
            float(point["cop"]),
            point.get("test_standard"),
            point["source_kind"],
            point.get("source_url"),
            point.get("note") or "",
            expected_version,
        )
        for point in points
    ]
    await _run_d1_batches(db, point_statements)
    await db.prepare(
        "DELETE FROM heat_pump_performance_points WHERE catalog_version <> ?"
    ).bind(expected_version).run()

    parametric_stmt = db.prepare(HEATING_PARAMETRIC_NODE_UPSERT_SQL)
    parametric_statements = [
        parametric_stmt.bind(
            item["id"],
            item["technology_id"],
            item["technology_label"],
            float(item["required_power_kw"]),
            float(item["planning_capex_lei"]),
            int(item["source_product_count"]),
            float(item["min_source_power_kw"]),
            float(item["max_source_power_kw"]),
            item["interpolation_kind"],
            expected_version,
        )
        for item in parametric_nodes
    ]
    await _run_d1_batches(db, parametric_statements)
    await db.prepare(
        "DELETE FROM heating_parametric_nodes WHERE catalog_version <> ?"
    ).bind(expected_version).run()

    seasonal_stmt = db.prepare(HEAT_PUMP_SEASONAL_UPSERT_SQL)
    seasonal_statements = [
        seasonal_stmt.bind(
            item["product_id"],
            item["climate"],
            float(item["application_temperature_c"]),
            float(item["scop"]),
            None if item.get("design_load_kw") is None else float(item["design_load_kw"]),
            item["source_kind"],
            item.get("source_url"),
            item.get("test_standard"),
            expected_version,
        )
        for item in seasonal
    ]
    await _run_d1_batches(db, seasonal_statements)
    await db.prepare(
        "DELETE FROM heat_pump_seasonal_performance WHERE catalog_version <> ?"
    ).bind(expected_version).run()


def _catalog_payload_from_rows(
    product_rows: list[dict[str, Any]],
    point_rows: list[dict[str, Any]],
    seasonal_rows: list[dict[str, Any]],
    parametric_rows: list[dict[str, Any]],
    *,
    source: str,
) -> dict[str, Any]:
    seed = heating_planning_catalog()
    boolean_fields = {
        "requires_hydronic",
        "requires_existing_gas",
        "requires_existing_high_power_electric",
        "requires_existing_biomass_infrastructure",
    }
    product_fields = {
        "id", "external_id", "technology_id", "technology_label", "label",
        "system_type", "generator_type", "carrier", "cost_profile",
        "rated_power_kw", "efficiency", "scop", "equipment_price_lei",
        "installation_allowance_lei", "source_kind", "source_url", "confidence",
        *boolean_fields, "capacity_basis", "note",
    }
    options: list[dict[str, Any]] = []
    versions: set[str] = set()
    dates: set[str] = set()
    for row in product_rows:
        item = {key: row.get(key) for key in product_fields}
        for key in boolean_fields:
            item[key] = bool(row.get(key))
        options.append(item)
        if row.get("catalog_version"):
            versions.add(str(row["catalog_version"]))
        if row.get("observed_on"):
            dates.add(str(row["observed_on"]))

    def clean_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {
                key: value
                for key, value in row.items()
                if key not in {"catalog_version", "updated_at"}
            }
            for row in rows
        ]

    return {
        "schema_version": seed.get("schema_version"),
        "catalog_version": max(versions) if versions else seed.get("catalog_version"),
        "observed_on": max(dates) if dates else seed.get("observed_on"),
        "sizing_policy": seed.get("sizing_policy") or {},
        "options": options,
        "heat_pump_performance_points": clean_rows(point_rows),
        "heat_pump_seasonal_performance": clean_rows(seasonal_rows),
        "parametric_heating_nodes": clean_rows(parametric_rows),
        "source": source,
    }


async def _read_heating_catalog_d1(db: Any) -> dict[str, Any]:
    seed = heating_planning_catalog()
    version = str(seed.get("catalog_version") or "")
    products_result = await db.prepare(
        """
        SELECT id, external_id, technology_id, technology_label, label,
               system_type, generator_type, carrier, cost_profile,
               rated_power_kw, efficiency, scop, equipment_price_lei,
               installation_allowance_lei, source_kind, source_url, confidence,
               requires_hydronic, requires_existing_gas,
               requires_existing_high_power_electric,
               requires_existing_biomass_infrastructure, capacity_basis, note,
               catalog_version, observed_on
        FROM heating_products
        WHERE active = 1 AND catalog_version = ?
        ORDER BY technology_id, rated_power_kw, equipment_price_lei, id
        """
    ).bind(version).run()
    points_result = await db.prepare(
        """
        SELECT product_id, outdoor_temperature_c, flow_temperature_c,
               return_temperature_c, delta_t_k, heating_capacity_kw, cop,
               test_standard, source_kind, source_url, note
        FROM heat_pump_performance_points
        WHERE catalog_version = ?
        ORDER BY product_id, outdoor_temperature_c, flow_temperature_c
        """
    ).bind(version).run()
    parametric_result = await db.prepare(
        """
        SELECT id, technology_id, technology_label, required_power_kw,
               planning_capex_lei, source_product_count, min_source_power_kw,
               max_source_power_kw, interpolation_kind
        FROM heating_parametric_nodes
        WHERE catalog_version = ?
        ORDER BY technology_id, required_power_kw, id
        """
    ).bind(version).run()
    seasonal_result = await db.prepare(
        """
        SELECT product_id, climate, application_temperature_c, scop,
               design_load_kw, source_kind, source_url, test_standard
        FROM heat_pump_seasonal_performance
        WHERE catalog_version = ?
        ORDER BY product_id, climate, application_temperature_c
        """
    ).bind(version).run()
    return _catalog_payload_from_rows(
        _d1_rows(products_result),
        _d1_rows(points_result),
        _d1_rows(seasonal_result),
        _d1_rows(parametric_result),
        source="d1",
    )


async def cached_heating_catalog_from_d1(db: Any) -> dict[str, Any] | None:
    global _heating_catalog_cached_payload
    global _heating_catalog_cache_expires_at
    global _heating_catalog_retry_after

    now = time.monotonic()
    if (
        _heating_catalog_cached_payload is not None
        and now < _heating_catalog_cache_expires_at
    ):
        return _heating_catalog_cached_payload
    if now < _heating_catalog_retry_after:
        return None

    async with _heating_catalog_lock:
        now = time.monotonic()
        if (
            _heating_catalog_cached_payload is not None
            and now < _heating_catalog_cache_expires_at
        ):
            return _heating_catalog_cached_payload
        if now < _heating_catalog_retry_after:
            return None
        try:
            await _ensure_heating_catalog_d1(db)
            payload = await _read_heating_catalog_d1(db)
            if not payload.get("options"):
                raise ValueError("D1 heating product catalog is empty.")
        except Exception:
            _heating_catalog_retry_after = time.monotonic() + HEATING_CATALOG_RETRY_SECONDS
            return None

        _heating_catalog_cached_payload = payload
        _heating_catalog_cache_expires_at = time.monotonic() + HEATING_CATALOG_CACHE_SECONDS
        _heating_catalog_retry_after = 0.0
        return payload


def seed_heating_catalog_payload() -> dict[str, Any]:
    seed = heating_planning_catalog()
    return {
        **seed,
        "parametric_heating_nodes": build_parametric_heating_nodes(seed),
        "source": "seed_fallback",
    }
