from __future__ import annotations

import asyncio
import hashlib
import json
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
    catalog_signature TEXT NOT NULL,
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


HEATING_PRODUCT_CERTIFICATION_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS heating_product_certification (
    product_id TEXT PRIMARY KEY,
    manufacturer TEXT,
    model TEXT,
    certification_body TEXT,
    certificate_registration_number TEXT,
    heat_pump_type TEXT,
    refrigerant TEXT,
    quality_tier TEXT NOT NULL DEFAULT 'C',
    source_url TEXT,
    observed_on TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

HEATING_PRODUCT_OFFERS_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS heating_product_offers (
    offer_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    supplier TEXT NOT NULL,
    sku TEXT,
    price_lei REAL NOT NULL CHECK(price_lei >= 0),
    vat_included INTEGER NOT NULL DEFAULT 1,
    stock_status TEXT,
    source_url TEXT,
    observed_on TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

HEATING_CATALOG_IMPORT_BATCHES_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS heating_catalog_import_batches (
    batch_id TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_url TEXT,
    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    product_count INTEGER NOT NULL DEFAULT 0,
    performance_point_count INTEGER NOT NULL DEFAULT 0,
    seasonal_point_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT ''
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
    max_source_power_kw, interpolation_kind, catalog_signature, updated_at
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


def _installed_capex_from_row(item: dict[str, Any]) -> float:
    return float(item.get("equipment_price_lei") or 0.0) + float(
        item.get("installation_allowance_lei") or 0.0
    )


def _heating_curve_signature(product_rows: list[dict[str, Any]]) -> str:
    relevant = [
        {
            "id": str(item.get("id") or ""),
            "technology_id": str(item.get("technology_id") or ""),
            "rated_power_kw": float(item.get("rated_power_kw") or 0.0),
            "installed_capex_lei": _installed_capex_from_row(item),
            "requires_hydronic": bool(item.get("requires_hydronic")),
            "requires_existing_gas": bool(item.get("requires_existing_gas")),
            "requires_existing_high_power_electric": bool(
                item.get("requires_existing_high_power_electric")
            ),
            "requires_existing_biomass_infrastructure": bool(
                item.get("requires_existing_biomass_infrastructure")
            ),
        }
        for item in product_rows
    ]
    relevant.sort(key=lambda item: (item["technology_id"], item["id"]))
    payload = json.dumps(
        relevant,
        ensure_ascii=True,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()[:24]


def _interpolate_market_anchor_curve(
    anchors: list[tuple[float, float]],
    power_kw: float,
) -> float:
    if not anchors:
        raise ValueError("Cannot interpolate an empty heating market curve.")
    if len(anchors) == 1:
        return float(anchors[0][1])

    target = min(
        max(float(power_kw), float(anchors[0][0])),
        float(anchors[-1][0]),
    )
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
            return float(low_cost) + fraction * (
                float(high_cost) - float(low_cost)
            )
    return float(anchors[-1][1])


def build_parametric_heating_nodes(
    product_rows: list[dict[str, Any]],
    *,
    total_nodes: int = HEATING_PARAMETRIC_NODE_TOTAL,
    catalog_signature: str | None = None,
) -> list[dict[str, Any]]:
    """Create a dense optimizer grid from live source-backed commercial anchors.

    The rows are mathematical CAPEX interpolation nodes, never commercial SKUs.
    They deliberately contain no invented COP/capacity values.
    """

    grouped: dict[str, list[dict[str, Any]]] = {}
    for item in product_rows:
        technology_id = str(item.get("technology_id") or "").strip()
        if technology_id and float(item.get("rated_power_kw") or 0.0) > 0:
            grouped.setdefault(technology_id, []).append(item)

    technology_ids = sorted(grouped)
    if not technology_ids or total_nodes <= 0:
        return []

    signature = catalog_signature or _heating_curve_signature(product_rows)
    base_count = int(total_nodes) // len(technology_ids)
    remainder = int(total_nodes) % len(technology_ids)
    nodes: list[dict[str, Any]] = []

    for tech_index, technology_id in enumerate(technology_ids):
        items = grouped[technology_id]
        by_power: dict[float, float] = {}
        for item in items:
            power = float(item["rated_power_kw"])
            capex = _installed_capex_from_row(item)
            previous = by_power.get(power)
            if previous is None or capex < previous:
                by_power[power] = capex

        anchors = sorted(by_power.items())
        if not anchors:
            continue

        count = max(base_count + (1 if tech_index < remainder else 0), 1)
        min_power = float(anchors[0][0])
        max_power = float(anchors[-1][0])
        label = str(items[0].get("technology_label") or technology_id)

        for node_index in range(count):
            fraction = 0.0 if count == 1 else node_index / (count - 1)
            power = min_power + fraction * (max_power - min_power)
            nodes.append(
                {
                    "id": f"{technology_id}:parametric:{node_index:04d}",
                    "technology_id": technology_id,
                    "technology_label": label,
                    "required_power_kw": round(power, 6),
                    "planning_capex_lei": round(
                        max(_interpolate_market_anchor_curve(anchors, power), 0.0),
                        2,
                    ),
                    "source_product_count": len(items),
                    "min_source_power_kw": round(min_power, 6),
                    "max_source_power_kw": round(max_power, 6),
                    "interpolation_kind": (
                        "linear_between_live_source_backed_market_anchors"
                    ),
                    "catalog_signature": signature,
                }
            )
    return nodes


async def _run_d1_batches(
    db: Any,
    statements: list[Any],
    *,
    chunk_size: int = D1_BATCH_SIZE,
) -> None:
    """Run prepared D1 statements in bounded batches instead of N round trips."""

    size = max(int(chunk_size), 1)
    for offset in range(0, len(statements), size):
        chunk = statements[offset: offset + size]
        if chunk:
            await db.batch(chunk)


async def _ensure_parametric_nodes_d1(
    db: Any,
    product_rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], str]:
    signature = _heating_curve_signature(product_rows)
    status_result = await db.prepare(
        """
        SELECT COUNT(*) AS node_count,
               COUNT(DISTINCT catalog_signature) AS signature_count,
               COALESCE(MAX(catalog_signature), '') AS catalog_signature
        FROM heating_parametric_nodes
        WHERE catalog_signature = ?
        """
    ).bind(signature).run()
    status_rows = _d1_rows(status_result)
    status = status_rows[0] if status_rows else {}
    if int(status.get("node_count") or 0) != HEATING_PARAMETRIC_NODE_TOTAL:
        nodes = build_parametric_heating_nodes(
            product_rows,
            catalog_signature=signature,
        )
        stmt = db.prepare(HEATING_PARAMETRIC_NODE_UPSERT_SQL)
        statements = [
            stmt.bind(
                item["id"],
                item["technology_id"],
                item["technology_label"],
                float(item["required_power_kw"]),
                float(item["planning_capex_lei"]),
                int(item["source_product_count"]),
                float(item["min_source_power_kw"]),
                float(item["max_source_power_kw"]),
                item["interpolation_kind"],
                signature,
            )
            for item in nodes
        ]
        await _run_d1_batches(db, statements)
        await db.prepare(
            "DELETE FROM heating_parametric_nodes WHERE catalog_signature <> ?"
        ).bind(signature).run()

    rows_result = await db.prepare(
        """
        SELECT id, technology_id, technology_label, required_power_kw,
               planning_capex_lei, source_product_count, min_source_power_kw,
               max_source_power_kw, interpolation_kind, catalog_signature
        FROM heating_parametric_nodes
        WHERE catalog_signature = ?
        ORDER BY technology_id, required_power_kw, id
        """
    ).bind(signature).run()
    return _d1_rows(rows_result), signature


async def _create_heating_catalog_tables(db: Any) -> None:
    await db.prepare(HEATING_PRODUCTS_CREATE_SQL).run()
    await db.prepare(HEAT_PUMP_POINTS_CREATE_SQL).run()
    await db.prepare(HEATING_PARAMETRIC_NODES_CREATE_SQL).run()
    await db.prepare(HEAT_PUMP_SEASONAL_CREATE_SQL).run()
    await db.prepare(HEATING_PRODUCT_CERTIFICATION_CREATE_SQL).run()
    await db.prepare(HEATING_PRODUCT_OFFERS_CREATE_SQL).run()
    await db.prepare(HEATING_CATALOG_IMPORT_BATCHES_CREATE_SQL).run()
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
        "CREATE INDEX IF NOT EXISTS heating_parametric_nodes_signature_idx "
        "ON heating_parametric_nodes(catalog_signature)"
    ).run()
    await db.prepare(
        "CREATE INDEX IF NOT EXISTS heat_pump_seasonal_product_idx "
        "ON heat_pump_seasonal_performance(product_id, climate, application_temperature_c)"
    ).run()
    await db.prepare(
        "CREATE INDEX IF NOT EXISTS heating_product_offers_product_active_idx "
        "ON heating_product_offers(product_id, active, observed_on)"
    ).run()
    await db.prepare(
        "CREATE INDEX IF NOT EXISTS heating_product_certification_quality_idx "
        "ON heating_product_certification(quality_tier, certification_body)"
    ).run()


async def _ensure_heating_catalog_d1(db: Any) -> None:
    """Ensure schema exists and bootstrap the repo fixture only into an empty D1.

    D1 is the persistent runtime catalog. Once it contains active products,
    request handling must be read-only: a large catalog must never be rewritten
    or deactivated from an optimizer request. The repo seed remains a CI fixture
    and disaster-recovery bootstrap for a genuinely empty database.
    """

    await _create_heating_catalog_tables(db)

    count_result = await db.prepare(
        "SELECT COUNT(*) AS products_count FROM heating_products WHERE active = 1"
    ).run()
    count_rows = _d1_rows(count_result)
    active_count = int((count_rows[0] if count_rows else {}).get("products_count") or 0)
    if active_count > 0:
        return

    seed = heating_planning_catalog()
    products = list(seed.get("options") or [])
    points = list(seed.get("heat_pump_performance_points") or [])
    seasonal = list(seed.get("heat_pump_seasonal_performance") or [])
    expected_version = str(seed.get("catalog_version") or "")
    observed_on = str(seed.get("observed_on") or "")

    product_stmt = db.prepare(HEATING_PRODUCT_UPSERT_SQL)
    await _run_d1_batches(
        db,
        [
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
        ],
    )

    point_stmt = db.prepare(HEAT_PUMP_POINT_UPSERT_SQL)
    await _run_d1_batches(
        db,
        [
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
        ],
    )

    seasonal_stmt = db.prepare(HEAT_PUMP_SEASONAL_UPSERT_SQL)
    await _run_d1_batches(
        db,
        [
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
        ],
    )


def _catalog_payload_from_rows(
    product_rows: list[dict[str, Any]],
    point_rows: list[dict[str, Any]],
    seasonal_rows: list[dict[str, Any]],
    parametric_rows: list[dict[str, Any]],
    *,
    parametric_signature: str,
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

    catalog_versions = sorted(versions)
    return {
        "schema_version": seed.get("schema_version"),
        "catalog_version": (
            catalog_versions[0]
            if len(catalog_versions) == 1
            else "d1-live-multi-version"
        ),
        "catalog_versions": catalog_versions,
        "observed_on": max(dates) if dates else seed.get("observed_on"),
        "sizing_policy": seed.get("sizing_policy") or {},
        "options": options,
        "heat_pump_performance_points": clean_rows(point_rows),
        "heat_pump_seasonal_performance": clean_rows(seasonal_rows),
        "parametric_heating_nodes": clean_rows(parametric_rows),
        "parametric_catalog_signature": parametric_signature,
        "catalog_stats": {
            "products": len(options),
            "parametric_nodes": len(parametric_rows),
            "performance_points": len(point_rows),
            "seasonal_points": len(seasonal_rows),
        },
        "catalog_mode": "persistent_d1",
        "source": source,
    }


async def _read_heating_catalog_d1(db: Any) -> dict[str, Any]:
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
        WHERE active = 1
        ORDER BY technology_id, rated_power_kw, equipment_price_lei, id
        """
    ).run()
    points_result = await db.prepare(
        """
        SELECT pp.product_id, pp.outdoor_temperature_c, pp.flow_temperature_c,
               pp.return_temperature_c, pp.delta_t_k, pp.heating_capacity_kw, pp.cop,
               pp.test_standard, pp.source_kind, pp.source_url, pp.note,
               pp.catalog_version
        FROM heat_pump_performance_points AS pp
        INNER JOIN heating_products AS p ON p.id = pp.product_id
        WHERE p.active = 1
        ORDER BY pp.product_id, pp.outdoor_temperature_c, pp.flow_temperature_c
        """
    ).run()
    seasonal_result = await db.prepare(
        """
        SELECT sp.product_id, sp.climate, sp.application_temperature_c, sp.scop,
               sp.design_load_kw, sp.source_kind, sp.source_url, sp.test_standard,
               sp.catalog_version
        FROM heat_pump_seasonal_performance AS sp
        INNER JOIN heating_products AS p ON p.id = sp.product_id
        WHERE p.active = 1
        ORDER BY sp.product_id, sp.climate, sp.application_temperature_c
        """
    ).run()
    product_rows = _d1_rows(products_result)
    parametric_rows, parametric_signature = await _ensure_parametric_nodes_d1(
        db,
        product_rows,
    )
    return _catalog_payload_from_rows(
        product_rows,
        _d1_rows(points_result),
        _d1_rows(seasonal_result),
        parametric_rows,
        parametric_signature=parametric_signature,
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
    product_rows = list(seed.get("options") or [])
    signature = _heating_curve_signature(product_rows)
    nodes = build_parametric_heating_nodes(
        product_rows,
        catalog_signature=signature,
    )
    return {
        **seed,
        "parametric_heating_nodes": nodes,
        "parametric_catalog_signature": signature,
        "catalog_stats": {
            "products": len(product_rows),
            "parametric_nodes": len(nodes),
            "performance_points": len(seed.get("heat_pump_performance_points") or []),
            "seasonal_points": len(seed.get("heat_pump_seasonal_performance") or []),
        },
        "catalog_mode": "seed_fallback",
        "source": "seed_fallback",
    }
