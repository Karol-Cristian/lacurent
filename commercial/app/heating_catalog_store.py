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

_heating_catalog_summary_lock = asyncio.Lock()
_heating_catalog_summary_cached_payload: dict[str, Any] | None = None
_heating_catalog_summary_cache_expires_at = 0.0
_heating_catalog_summary_retry_after = 0.0

# Branch execution must stay independent from marketplace catalog cardinality.
# Cache one compact technology payload (one representative product + the
# fixed-size planning curve) instead of retaining all products in every fast
# optimizer request.
_heating_branch_catalog_lock = asyncio.Lock()
_heating_branch_catalog_cached_payloads: dict[str, dict[str, Any]] = {}
_heating_branch_catalog_cache_expires_at: dict[str, float] = {}
_heating_branch_catalog_retry_after: dict[str, float] = {}


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
    source_signature TEXT NOT NULL,
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
    max_source_power_kw, interpolation_kind, source_signature, updated_at
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


def _catalog_anchor_signature(product_rows: list[dict[str, Any]]) -> str:
    normalized = [
        {
            "id": str(item.get("id") or ""),
            "technology_id": str(item.get("technology_id") or ""),
            "rated_power_kw": round(float(item.get("rated_power_kw") or 0.0), 6),
            "equipment_price_lei": round(float(item.get("equipment_price_lei") or 0.0), 2),
            "installation_allowance_lei": round(
                float(item.get("installation_allowance_lei") or 0.0), 2
            ),
        }
        for item in product_rows
        if item.get("technology_id") and float(item.get("rated_power_kw") or 0.0) > 0
    ]
    raw = json.dumps(
        sorted(normalized, key=lambda item: (item["technology_id"], item["id"])),
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _interpolate_anchor_curve(
    anchors: list[tuple[float, float]],
    power_kw: float,
) -> float:
    if not anchors:
        raise ValueError("Cannot interpolate an empty heating CAPEX curve.")
    if len(anchors) == 1:
        return float(anchors[0][1])
    target = min(max(float(power_kw), float(anchors[0][0])), float(anchors[-1][0]))
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
    product_rows: list[dict[str, Any]],
    *,
    total_nodes: int = HEATING_PARAMETRIC_NODE_TOTAL,
) -> list[dict[str, Any]]:
    """Create dense planning nodes without manufacturing commercial SKUs.

    Nodes interpolate installed CAPEX only between active, source-backed D1
    product anchors. COP, SCOP and low-temperature capacity are never
    synthesized here; those remain attached to real products and manufacturer
    performance points.
    """

    grouped: dict[str, list[dict[str, Any]]] = {}
    for item in product_rows:
        technology_id = str(item.get("technology_id") or "").strip()
        if technology_id and float(item.get("rated_power_kw") or 0.0) > 0:
            grouped.setdefault(technology_id, []).append(item)
    technology_ids = sorted(grouped)
    if not technology_ids or total_nodes <= 0:
        return []

    signature = _catalog_anchor_signature(product_rows)
    base_count = total_nodes // len(technology_ids)
    remainder = total_nodes % len(technology_ids)
    nodes: list[dict[str, Any]] = []

    for tech_index, technology_id in enumerate(technology_ids):
        items = grouped[technology_id]
        by_power: dict[float, float] = {}
        for item in items:
            power = float(item["rated_power_kw"])
            installed = float(item.get("equipment_price_lei") or 0.0) + float(
                item.get("installation_allowance_lei") or 0.0
            )
            previous = by_power.get(power)
            if previous is None or installed < previous:
                by_power[power] = installed
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
                        max(_interpolate_anchor_curve(anchors, power), 0.0), 2
                    ),
                    "source_product_count": len(items),
                    "min_source_power_kw": round(min_power, 6),
                    "max_source_power_kw": round(max_power, 6),
                    "interpolation_kind": "linear_between_source_backed_market_anchors",
                    "source_signature": signature,
                }
            )
    return nodes


async def _run_d1_batches(
    db: Any,
    statements: list[Any],
    *,
    chunk_size: int = D1_BATCH_SIZE,
) -> None:
    for offset in range(0, len(statements), max(int(chunk_size), 1)):
        chunk = statements[offset: offset + max(int(chunk_size), 1)]
        if not chunk:
            continue
        batch = getattr(db, "batch", None)
        if batch is not None:
            await batch(chunk)
        else:
            for statement in chunk:
                await statement.run()


async def _ensure_parametric_heating_nodes_d1(db: Any) -> None:
    products_result = await db.prepare(
        """
        SELECT id, technology_id, technology_label, rated_power_kw,
               equipment_price_lei, installation_allowance_lei
        FROM heating_products
        WHERE active = 1
        ORDER BY technology_id, rated_power_kw, equipment_price_lei, id
        """
    ).run()
    product_rows = _d1_rows(products_result)
    nodes = build_parametric_heating_nodes(product_rows)
    if not nodes:
        return

    signature = str(nodes[0]["source_signature"])
    status_result = await db.prepare(
        """
        SELECT COUNT(*) AS node_count,
               COUNT(DISTINCT source_signature) AS signature_count,
               COALESCE(MAX(source_signature), '') AS source_signature
        FROM heating_parametric_nodes
        """
    ).run()
    status_rows = _d1_rows(status_result)
    status = status_rows[0] if status_rows else {}
    if (
        int(status.get("node_count") or 0) == len(nodes)
        and int(status.get("signature_count") or 0) == 1
        and str(status.get("source_signature") or "") == signature
    ):
        return

    await db.prepare("DELETE FROM heating_parametric_nodes").run()
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
            item["source_signature"],
        )
        for item in nodes
    ]
    await _run_d1_batches(db, statements)


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
    """Ensure persistent D1 catalog schema and its derived parametric grid.

    Runtime requests never rewrite an existing active commercial catalog.
    Repo seed data is used only to bootstrap a genuinely empty D1. The dense
    parametric grid is derived from whichever active products D1 currently
    contains and is rebuilt only when those source anchors change.
    """

    await _create_heating_catalog_tables(db)

    count_result = await db.prepare(
        "SELECT COUNT(*) AS products_count FROM heating_products WHERE active = 1"
    ).run()
    count_rows = _d1_rows(count_result)
    active_count = int((count_rows[0] if count_rows else {}).get("products_count") or 0)

    if active_count <= 0:
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

    await _ensure_parametric_heating_nodes_d1(db)

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
        "catalog_stats": {
            "products": len(options),
            "parametric_nodes": len(parametric_rows),
            "performance_points": len(point_rows),
            "seasonal_points": len(seasonal_rows),
        },
        "catalog_mode": "persistent_d1",
        "source": source,
    }


def compact_heating_branch_catalog_payload(
    payload: dict[str, Any],
    technology_id: str,
) -> dict[str, Any]:
    """Reduce a catalog to the fixed-size data needed by one optimizer branch.

    Search-time physics needs a technology representative and the precomputed
    kW->CAPEX planning curve. It does not need every commercial SKU, COP map or
    offer. Real products are intentionally reintroduced only for finalist
    commercialization.
    """

    options = [
        dict(item)
        for item in (payload.get("options") or [])
        if str(item.get("technology_id") or "") == technology_id
    ]
    options.sort(
        key=lambda item: (
            float(item.get("rated_power_kw") or 0.0),
            float(item.get("equipment_price_lei") or 0.0)
            + float(item.get("installation_allowance_lei") or 0.0),
            str(item.get("id") or ""),
        )
    )
    nodes = [
        dict(item)
        for item in (payload.get("parametric_heating_nodes") or [])
        if str(item.get("technology_id") or "") == technology_id
    ]
    nodes.sort(key=lambda item: float(item.get("required_power_kw") or 0.0))

    source_stats = dict(payload.get("catalog_stats") or {})
    result = {
        "schema_version": payload.get("schema_version"),
        "catalog_version": payload.get("catalog_version"),
        "catalog_versions": list(payload.get("catalog_versions") or []),
        "observed_on": payload.get("observed_on"),
        "sizing_policy": dict(payload.get("sizing_policy") or {}),
        # One representative preserves the exact technology-level Light model
        # used previously: HeatingTechnologyV2.representative is the minimum
        # rated-power product.
        "options": options[:1],
        "heat_pump_performance_points": [],
        "heat_pump_seasonal_performance": [],
        "parametric_heating_nodes": nodes,
        "catalog_stats": {
            "products": len(options),
            "loaded_products": min(len(options), 1),
            "parametric_nodes": len(nodes),
            "performance_points": int(source_stats.get("performance_points") or 0),
            "seasonal_points": int(source_stats.get("seasonal_points") or 0),
        },
        "catalog_mode": "branch_compact",
        "source": payload.get("source") or "seed",
        "technology_id": technology_id,
    }
    return result


def seed_heating_branch_catalog_payload(technology_id: str) -> dict[str, Any]:
    return compact_heating_branch_catalog_payload(
        seed_heating_catalog_payload(),
        technology_id,
    )


async def _read_heating_branch_catalog_d1(
    db: Any,
    technology_id: str,
) -> dict[str, Any]:
    """Read O(1 technology) planning data, not O(all marketplace products)."""

    representative_result = await db.prepare(
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
        WHERE active = 1 AND technology_id = ?
        ORDER BY rated_power_kw,
                 (equipment_price_lei + installation_allowance_lei),
                 id
        LIMIT 1
        """
    ).bind(technology_id).run()
    node_result = await db.prepare(
        """
        SELECT id, technology_id, technology_label, required_power_kw,
               planning_capex_lei, source_product_count, min_source_power_kw,
               max_source_power_kw, interpolation_kind, source_signature
        FROM heating_parametric_nodes
        WHERE technology_id = ?
        ORDER BY required_power_kw, id
        """
    ).bind(technology_id).run()
    stats_result = await db.prepare(
        """
        SELECT
          (SELECT COUNT(*) FROM heating_products
             WHERE active = 1 AND technology_id = ?) AS products,
          (SELECT COUNT(*) FROM heating_parametric_nodes
             WHERE technology_id = ?) AS parametric_nodes,
          (SELECT COALESCE(MAX(source_product_count), 0)
             FROM heating_parametric_nodes
             WHERE technology_id = ?) AS node_source_products
        """
    ).bind(technology_id, technology_id, technology_id).run()

    representative_rows = _d1_rows(representative_result)
    node_rows = _d1_rows(node_result)
    stats_rows = _d1_rows(stats_result)
    stats = stats_rows[0] if stats_rows else {}
    product_count = int(stats.get("products") or 0)
    node_source_products = int(stats.get("node_source_products") or 0)

    # If the derived curve is missing or visibly stale, preserve correctness by
    # falling back to this technology's source rows only. Normal production
    # operation uses the fixed-size node path.
    if product_count > 0 and (
        not node_rows or node_source_products != product_count
    ):
        all_products_result = await db.prepare(
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
            WHERE active = 1 AND technology_id = ?
            ORDER BY rated_power_kw, equipment_price_lei, id
            """
        ).bind(technology_id).run()
        payload = _catalog_payload_from_rows(
            _d1_rows(all_products_result),
            [],
            [],
            [],
            source="d1",
        )
        payload["catalog_mode"] = "branch_products_fallback_missing_or_stale_curve"
        payload["technology_id"] = technology_id
        payload["catalog_stats"]["products"] = product_count
        payload["catalog_stats"]["loaded_products"] = len(payload.get("options") or [])
        return payload

    payload = _catalog_payload_from_rows(
        representative_rows,
        [],
        [],
        node_rows,
        source="d1",
    )
    payload["catalog_mode"] = "persistent_d1_branch_compact"
    payload["technology_id"] = technology_id
    payload["catalog_stats"] = {
        "products": product_count,
        "loaded_products": len(representative_rows),
        "parametric_nodes": len(node_rows),
        "performance_points": 0,
        "seasonal_points": 0,
    }
    return payload


async def cached_heating_branch_catalog_from_d1(
    db: Any,
    technology_id: str,
) -> dict[str, Any] | None:
    now = time.monotonic()
    cached = _heating_branch_catalog_cached_payloads.get(technology_id)
    if (
        cached is not None
        and now < _heating_branch_catalog_cache_expires_at.get(technology_id, 0.0)
    ):
        return cached
    if now < _heating_branch_catalog_retry_after.get(technology_id, 0.0):
        return None

    async with _heating_branch_catalog_lock:
        now = time.monotonic()
        cached = _heating_branch_catalog_cached_payloads.get(technology_id)
        if (
            cached is not None
            and now < _heating_branch_catalog_cache_expires_at.get(technology_id, 0.0)
        ):
            return cached
        if now < _heating_branch_catalog_retry_after.get(technology_id, 0.0):
            return None
        try:
            payload = await _read_heating_branch_catalog_d1(db, technology_id)
            if not payload.get("options"):
                raise ValueError(
                    f"D1 heating branch {technology_id!r} has no active product."
                )
        except Exception:
            _heating_branch_catalog_retry_after[technology_id] = (
                time.monotonic() + HEATING_CATALOG_RETRY_SECONDS
            )
            return None

        _heating_branch_catalog_cached_payloads[technology_id] = payload
        _heating_branch_catalog_cache_expires_at[technology_id] = (
            time.monotonic() + HEATING_CATALOG_CACHE_SECONDS
        )
        _heating_branch_catalog_retry_after[technology_id] = 0.0
        return payload


def _technology_summaries_from_profile_rows(
    rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        technology_id = str(row.get("technology_id") or "").strip()
        if not technology_id:
            continue
        count = int(row.get("profile_product_count") or 0)
        min_power = float(row.get("profile_min_power_kw") or 0.0)
        max_power = float(row.get("profile_max_power_kw") or 0.0)
        min_capex = float(row.get("profile_min_capex_lei") or 0.0)
        entry = grouped.setdefault(
            technology_id,
            {
                "technology_id": technology_id,
                "technology_label": str(
                    row.get("technology_label") or technology_id
                ),
                "product_count": 0,
                "minimum_capex_lei": min_capex,
                "min_product_power_kw": min_power,
                "max_product_power_kw": max_power,
                "generator_types": set(),
                "requirement_profiles": [],
            },
        )
        entry["product_count"] = int(entry["product_count"]) + count
        entry["minimum_capex_lei"] = min(
            float(entry["minimum_capex_lei"]),
            min_capex,
        )
        entry["min_product_power_kw"] = min(
            float(entry["min_product_power_kw"]),
            min_power,
        )
        entry["max_product_power_kw"] = max(
            float(entry["max_product_power_kw"]),
            max_power,
        )
        generator = str(row.get("generator_type") or "").strip()
        if generator:
            entry["generator_types"].add(generator)
        entry["requirement_profiles"].append(
            {
                "requires_hydronic": bool(row.get("requires_hydronic")),
                "requires_existing_gas": bool(row.get("requires_existing_gas")),
                "requires_existing_high_power_electric": bool(
                    row.get("requires_existing_high_power_electric")
                ),
                "requires_existing_biomass_infrastructure": bool(
                    row.get("requires_existing_biomass_infrastructure")
                ),
                "product_count": count,
            }
        )

    summaries: list[dict[str, Any]] = []
    for technology_id in sorted(grouped):
        entry = grouped[technology_id]
        entry["generator_types"] = sorted(entry["generator_types"])
        summaries.append(entry)
    return summaries


def build_heating_technology_summaries(
    product_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Collapse arbitrary product cardinality into bounded branch metadata."""

    profiles: dict[tuple[Any, ...], dict[str, Any]] = {}
    for item in product_rows:
        technology_id = str(item.get("technology_id") or "").strip()
        if not technology_id:
            continue
        key = (
            technology_id,
            str(item.get("generator_type") or ""),
            bool(item.get("requires_hydronic")),
            bool(item.get("requires_existing_gas")),
            bool(item.get("requires_existing_high_power_electric")),
            bool(item.get("requires_existing_biomass_infrastructure")),
        )
        power = float(item.get("rated_power_kw") or 0.0)
        capex = float(item.get("equipment_price_lei") or 0.0) + float(
            item.get("installation_allowance_lei") or 0.0
        )
        row = profiles.setdefault(
            key,
            {
                "technology_id": technology_id,
                "technology_label": str(
                    item.get("technology_label") or technology_id
                ),
                "generator_type": str(item.get("generator_type") or ""),
                "requires_hydronic": bool(item.get("requires_hydronic")),
                "requires_existing_gas": bool(item.get("requires_existing_gas")),
                "requires_existing_high_power_electric": bool(
                    item.get("requires_existing_high_power_electric")
                ),
                "requires_existing_biomass_infrastructure": bool(
                    item.get("requires_existing_biomass_infrastructure")
                ),
                "profile_product_count": 0,
                "profile_min_power_kw": power,
                "profile_max_power_kw": power,
                "profile_min_capex_lei": capex,
            },
        )
        row["profile_product_count"] = int(row["profile_product_count"]) + 1
        row["profile_min_power_kw"] = min(
            float(row["profile_min_power_kw"]),
            power,
        )
        row["profile_max_power_kw"] = max(
            float(row["profile_max_power_kw"]),
            power,
        )
        row["profile_min_capex_lei"] = min(
            float(row["profile_min_capex_lei"]),
            capex,
        )
    return _technology_summaries_from_profile_rows(list(profiles.values()))


async def _read_heating_catalog_summary_d1(db: Any) -> dict[str, Any]:
    """Read bounded technology metadata, never the complete marketplace."""

    profiles_result = await db.prepare(
        """
        SELECT
          technology_id,
          MIN(technology_label) AS technology_label,
          generator_type,
          requires_hydronic,
          requires_existing_gas,
          requires_existing_high_power_electric,
          requires_existing_biomass_infrastructure,
          COUNT(*) AS profile_product_count,
          MIN(rated_power_kw) AS profile_min_power_kw,
          MAX(rated_power_kw) AS profile_max_power_kw,
          MIN(equipment_price_lei + installation_allowance_lei)
            AS profile_min_capex_lei
        FROM heating_products
        WHERE active = 1
        GROUP BY
          technology_id,
          generator_type,
          requires_hydronic,
          requires_existing_gas,
          requires_existing_high_power_electric,
          requires_existing_biomass_infrastructure
        ORDER BY technology_id, generator_type
        """
    ).run()
    stats_result = await db.prepare(
        """
        SELECT
          (SELECT COUNT(*) FROM heating_products WHERE active = 1) AS products,
          (SELECT COUNT(*) FROM heating_parametric_nodes) AS parametric_nodes,
          (
            SELECT COUNT(*)
            FROM heat_pump_performance_points AS pp
            INNER JOIN heating_products AS p ON p.id = pp.product_id
            WHERE p.active = 1
          ) AS performance_points,
          (
            SELECT COUNT(*)
            FROM heat_pump_seasonal_performance AS sp
            INNER JOIN heating_products AS p ON p.id = sp.product_id
            WHERE p.active = 1
          ) AS seasonal_points,
          (
            SELECT COUNT(DISTINCT catalog_version)
            FROM heating_products
            WHERE active = 1
          ) AS catalog_version_count,
          (
            SELECT MIN(catalog_version)
            FROM heating_products
            WHERE active = 1
          ) AS catalog_version,
          (
            SELECT MAX(observed_on)
            FROM heating_products
            WHERE active = 1
          ) AS observed_on
        """
    ).run()

    seed = heating_planning_catalog()
    summaries = _technology_summaries_from_profile_rows(
        _d1_rows(profiles_result)
    )
    stats_rows = _d1_rows(stats_result)
    row = stats_rows[0] if stats_rows else {}
    version_count = int(row.get("catalog_version_count") or 0)
    return {
        "schema_version": seed.get("schema_version"),
        "catalog_version": (
            str(row.get("catalog_version") or "")
            if version_count == 1
            else "d1-live-multi-version"
        ),
        "observed_on": row.get("observed_on") or seed.get("observed_on"),
        "sizing_policy": seed.get("sizing_policy") or {},
        "options": [],
        "technology_summaries": summaries,
        "heat_pump_performance_points": [],
        "heat_pump_seasonal_performance": [],
        "parametric_heating_nodes": [],
        "catalog_stats": {
            "products": int(row.get("products") or 0),
            "technology_summaries": len(summaries),
            "parametric_nodes": int(row.get("parametric_nodes") or 0),
            "performance_points": int(row.get("performance_points") or 0),
            "seasonal_points": int(row.get("seasonal_points") or 0),
        },
        "catalog_mode": "persistent_d1_technology_summary",
        "source": "d1",
    }

async def cached_heating_catalog_summary_from_d1(
    db: Any,
) -> dict[str, Any] | None:
    global _heating_catalog_summary_cached_payload
    global _heating_catalog_summary_cache_expires_at
    global _heating_catalog_summary_retry_after

    now = time.monotonic()
    if (
        _heating_catalog_summary_cached_payload is not None
        and now < _heating_catalog_summary_cache_expires_at
    ):
        return _heating_catalog_summary_cached_payload
    if now < _heating_catalog_summary_retry_after:
        return None

    async with _heating_catalog_summary_lock:
        now = time.monotonic()
        if (
            _heating_catalog_summary_cached_payload is not None
            and now < _heating_catalog_summary_cache_expires_at
        ):
            return _heating_catalog_summary_cached_payload
        if now < _heating_catalog_summary_retry_after:
            return None
        try:
            payload = await _read_heating_catalog_summary_d1(db)
            if not payload.get("technology_summaries"):
                raise ValueError("D1 heating technology summary is empty.")
        except Exception:
            _heating_catalog_summary_retry_after = (
                time.monotonic() + HEATING_CATALOG_RETRY_SECONDS
            )
            return None

        _heating_catalog_summary_cached_payload = payload
        _heating_catalog_summary_cache_expires_at = (
            time.monotonic() + HEATING_CATALOG_CACHE_SECONDS
        )
        _heating_catalog_summary_retry_after = 0.0
        return payload


def seed_heating_catalog_summary_payload() -> dict[str, Any]:
    seed = heating_planning_catalog()
    products = list(seed.get("options") or [])
    performance = list(seed.get("heat_pump_performance_points") or [])
    seasonal = list(seed.get("heat_pump_seasonal_performance") or [])
    summaries = build_heating_technology_summaries(products)
    return {
        "schema_version": seed.get("schema_version"),
        "catalog_version": seed.get("catalog_version"),
        "observed_on": seed.get("observed_on"),
        "sizing_policy": seed.get("sizing_policy") or {},
        "options": [],
        "technology_summaries": summaries,
        "heat_pump_performance_points": [],
        "heat_pump_seasonal_performance": [],
        "parametric_heating_nodes": [],
        "catalog_stats": {
            "products": len(products),
            "technology_summaries": len(summaries),
            "parametric_nodes": HEATING_PARAMETRIC_NODE_TOTAL,
            "performance_points": len(performance),
            "seasonal_points": len(seasonal),
        },
        "catalog_mode": "seed_technology_summary",
        "source": "seed_summary",
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
    parametric_result = await db.prepare(
        """
        SELECT id, technology_id, technology_label, required_power_kw,
               planning_capex_lei, source_product_count, min_source_power_kw,
               max_source_power_kw, interpolation_kind, source_signature
        FROM heating_parametric_nodes
        ORDER BY technology_id, required_power_kw, id
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
    products = list(seed.get("options") or [])
    nodes = build_parametric_heating_nodes(products)
    return {
        **seed,
        "parametric_heating_nodes": nodes,
        "catalog_stats": {
            "products": len(products),
            "parametric_nodes": len(nodes),
            "performance_points": len(seed.get("heat_pump_performance_points") or []),
            "seasonal_points": len(seed.get("heat_pump_seasonal_performance") or []),
        },
        "catalog_mode": "seed_fallback",
        "source": "seed_fallback",
    }
