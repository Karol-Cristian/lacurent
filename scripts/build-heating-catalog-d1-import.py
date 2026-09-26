#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def q(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return repr(value)
    return "'" + str(value).replace("'", "''") + "'"


def require(item: dict[str, Any], *keys: str) -> None:
    missing = [key for key in keys if item.get(key) in (None, "")]
    if missing:
        raise ValueError(f"Missing required fields {missing} in {item.get('id') or item.get('product_id') or item!r}")


def load_payload(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("Catalog import must be a JSON object.")
    return payload


def validate(payload: dict[str, Any]) -> dict[str, Any]:
    products = list(payload.get("options") or payload.get("products") or [])
    points = list(payload.get("heat_pump_performance_points") or payload.get("performance_points") or [])
    seasonal = list(payload.get("heat_pump_seasonal_performance") or payload.get("seasonal_performance") or [])
    certifications = list(payload.get("certifications") or [])
    offers = list(payload.get("offers") or [])

    if not products:
        raise ValueError("Catalog import contains no products.")

    ids: set[str] = set()
    for item in products:
        require(
            item,
            "id",
            "technology_id",
            "technology_label",
            "label",
            "system_type",
            "generator_type",
            "carrier",
            "cost_profile",
            "rated_power_kw",
            "source_kind",
            "confidence",
        )
        product_id = str(item["id"])
        if product_id in ids:
            raise ValueError(f"Duplicate product id: {product_id}")
        ids.add(product_id)
        if float(item["rated_power_kw"]) <= 0:
            raise ValueError(f"Invalid rated_power_kw for {product_id}")
        if float(item.get("equipment_price_lei") or 0) < 0:
            raise ValueError(f"Invalid equipment_price_lei for {product_id}")
        if float(item.get("installation_allowance_lei") or 0) < 0:
            raise ValueError(f"Invalid installation_allowance_lei for {product_id}")

    for point in points:
        require(point, "product_id", "outdoor_temperature_c", "flow_temperature_c", "cop", "source_kind")
        product_id = str(point["product_id"])
        if product_id not in ids:
            raise ValueError(f"Performance point references unknown product {product_id}")
        if float(point["cop"]) <= 1:
            raise ValueError(f"COP must be > 1 for {product_id}")
        capacity = point.get("heating_capacity_kw")
        if capacity is not None and float(capacity) <= 0:
            raise ValueError(f"Heating capacity must be > 0 for {product_id}")

    for item in seasonal:
        require(item, "product_id", "climate", "application_temperature_c", "scop", "source_kind")
        product_id = str(item["product_id"])
        if product_id not in ids:
            raise ValueError(f"Seasonal point references unknown product {product_id}")
        if float(item["scop"]) <= 1:
            raise ValueError(f"SCOP must be > 1 for {product_id}")

    for item in certifications:
        require(item, "product_id", "quality_tier")
        if str(item["product_id"]) not in ids:
            raise ValueError(f"Certification references unknown product {item['product_id']}")
        if str(item["quality_tier"]) not in {"A", "B", "C"}:
            raise ValueError(f"Unknown quality tier {item['quality_tier']}")

    for item in offers:
        require(item, "offer_id", "product_id", "supplier", "price_lei", "observed_on")
        if str(item["product_id"]) not in ids:
            raise ValueError(f"Offer references unknown product {item['product_id']}")
        if float(item["price_lei"]) < 0:
            raise ValueError(f"Offer price must be non-negative for {item['offer_id']}")

    return {
        "products": products,
        "points": points,
        "seasonal": seasonal,
        "certifications": certifications,
        "offers": offers,
    }


def build_sql(payload: dict[str, Any], normalized: dict[str, Any]) -> str:
    catalog_version = str(payload.get("catalog_version") or "external-import")
    observed_on = str(payload.get("observed_on") or "")
    batch = payload.get("batch") or {}
    batch_id = str(batch.get("batch_id") or catalog_version)
    source_name = str(batch.get("source_name") or payload.get("source") or "external")
    source_url = batch.get("source_url")
    note = str(batch.get("note") or "")

    lines = [
        "BEGIN TRANSACTION;",
        "",
    ]

    for item in normalized["products"]:
        row = [
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
            item.get("efficiency"),
            item.get("scop"),
            float(item.get("equipment_price_lei") or 0),
            float(item.get("installation_allowance_lei") or 0),
            item["source_kind"],
            item.get("source_url"),
            item.get("confidence") or "low",
            int(bool(item.get("requires_hydronic", True))),
            int(bool(item.get("requires_existing_gas", False))),
            int(bool(item.get("requires_existing_high_power_electric", False))),
            int(bool(item.get("requires_existing_biomass_infrastructure", False))),
            item.get("capacity_basis") or "catalog_nominal_output",
            item.get("note") or "",
            item.get("catalog_version") or catalog_version,
            item.get("observed_on") or observed_on,
        ]
        lines.append(
            "INSERT OR REPLACE INTO heating_products ("
            "id,external_id,technology_id,technology_label,label,system_type,generator_type,carrier,cost_profile,"
            "rated_power_kw,efficiency,scop,equipment_price_lei,installation_allowance_lei,source_kind,source_url,confidence,"
            "requires_hydronic,requires_existing_gas,requires_existing_high_power_electric,requires_existing_biomass_infrastructure,"
            "capacity_basis,note,catalog_version,observed_on,active,updated_at"
            ") VALUES (" + ",".join(q(v) for v in row) + ",1,CURRENT_TIMESTAMP);"
        )

    for item in normalized["points"]:
        row = [
            item["product_id"],
            float(item["outdoor_temperature_c"]),
            float(item["flow_temperature_c"]),
            item.get("return_temperature_c"),
            item.get("delta_t_k"),
            item.get("heating_capacity_kw"),
            float(item["cop"]),
            item.get("test_standard"),
            item["source_kind"],
            item.get("source_url"),
            item.get("note") or "",
            item.get("catalog_version") or catalog_version,
        ]
        lines.append(
            "INSERT OR REPLACE INTO heat_pump_performance_points ("
            "product_id,outdoor_temperature_c,flow_temperature_c,return_temperature_c,delta_t_k,heating_capacity_kw,cop,"
            "test_standard,source_kind,source_url,note,catalog_version,updated_at"
            ") VALUES (" + ",".join(q(v) for v in row) + ",CURRENT_TIMESTAMP);"
        )

    for item in normalized["seasonal"]:
        row = [
            item["product_id"],
            item["climate"],
            float(item["application_temperature_c"]),
            float(item["scop"]),
            item.get("design_load_kw"),
            item["source_kind"],
            item.get("source_url"),
            item.get("test_standard"),
            item.get("catalog_version") or catalog_version,
        ]
        lines.append(
            "INSERT OR REPLACE INTO heat_pump_seasonal_performance ("
            "product_id,climate,application_temperature_c,scop,design_load_kw,source_kind,source_url,test_standard,catalog_version,updated_at"
            ") VALUES (" + ",".join(q(v) for v in row) + ",CURRENT_TIMESTAMP);"
        )

    for item in normalized["certifications"]:
        row = [
            item["product_id"],
            item.get("manufacturer"),
            item.get("model"),
            item.get("certification_body"),
            item.get("certificate_registration_number"),
            item.get("heat_pump_type"),
            item.get("refrigerant"),
            item["quality_tier"],
            item.get("source_url"),
            item.get("observed_on") or observed_on,
        ]
        lines.append(
            "INSERT OR REPLACE INTO heating_product_certification ("
            "product_id,manufacturer,model,certification_body,certificate_registration_number,heat_pump_type,refrigerant,"
            "quality_tier,source_url,observed_on,updated_at"
            ") VALUES (" + ",".join(q(v) for v in row) + ",CURRENT_TIMESTAMP);"
        )

    for item in normalized["offers"]:
        row = [
            item["offer_id"],
            item["product_id"],
            item["supplier"],
            item.get("sku"),
            float(item["price_lei"]),
            int(bool(item.get("vat_included", True))),
            item.get("stock_status"),
            item.get("source_url"),
            item["observed_on"],
            int(bool(item.get("active", True))),
        ]
        lines.append(
            "INSERT OR REPLACE INTO heating_product_offers ("
            "offer_id,product_id,supplier,sku,price_lei,vat_included,stock_status,source_url,observed_on,active,updated_at"
            ") VALUES (" + ",".join(q(v) for v in row) + ",CURRENT_TIMESTAMP);"
        )

    lines.append(
        "INSERT OR REPLACE INTO heating_catalog_import_batches ("
        "batch_id,source_name,source_url,imported_at,product_count,performance_point_count,seasonal_point_count,status,note"
        ") VALUES ("
        + ",".join(
            [
                q(batch_id),
                q(source_name),
                q(source_url),
                "CURRENT_TIMESTAMP",
                q(len(normalized["products"])),
                q(len(normalized["points"])),
                q(len(normalized["seasonal"])),
                q("imported"),
                q(note),
            ]
        )
        + ");"
    )
    lines.extend(["", "COMMIT;", ""])
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate a normalized heating catalog and emit one D1 SQL import transaction."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    payload = load_payload(args.input)
    normalized = validate(payload)
    sql = build_sql(payload, normalized)
    args.output.write_text(sql, encoding="utf-8")

    print(
        json.dumps(
            {
                "products": len(normalized["products"]),
                "performance_points": len(normalized["points"]),
                "seasonal_points": len(normalized["seasonal"]),
                "certifications": len(normalized["certifications"]),
                "offers": len(normalized["offers"]),
                "output": str(args.output),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
