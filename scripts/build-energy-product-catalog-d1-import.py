#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from commercial.app.energy_product_catalog import (  # noqa: E402
    CATEGORY_DEFINITIONS,
    compute_primary_value_metric,
    missing_teo_properties,
    normalize_teo_properties,
)


def q(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return repr(value)
    return "'" + str(value).replace("'", "''") + "'"


def load(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("Source pack must be a JSON object.")
    if not isinstance(payload.get("products"), list) or not payload["products"]:
        raise ValueError("Source pack must contain products.")
    return payload


def _flatten_properties(product: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    merged: dict[str, Any] = {}
    rows: list[dict[str, Any]] = []
    for source_index, source in enumerate(product.get("technical_sources") or []):
        document_id = f"{product['id']}:source:{source_index:02d}"
        source_url = source.get("url")
        for key, value in (source.get("properties") or {}).items():
            merged[key] = value
            rows.append(
                {
                    "product_id": product["id"],
                    "property_key": key,
                    "context_key": "nominal",
                    "value": value,
                    "source_document_id": document_id,
                    "source_url": source_url,
                }
            )
    return merged, rows


def _normalized_metric_offer(
    category_id: str,
    properties: dict[str, Any],
    offers: list[dict[str, Any]],
) -> tuple[float, str] | None:
    if not offers:
        return None
    # Deterministic first pass: lowest active observed offer after basis normalization.
    candidates: list[tuple[float, str]] = []
    for offer in offers:
        price = float(offer["price_lei"])
        basis = str(offer["price_basis"])
        quantity = offer.get("quantity")
        unit = offer.get("quantity_unit")
        if category_id in {"wall_insulation", "roof_insulation", "floor_insulation"}:
            if basis == "lei_package" and unit == "m2" and quantity:
                candidates.append((price / float(quantity), "lei_per_m2"))
        elif category_id == "underfloor_pipe":
            if basis == "lei_per_m":
                candidates.append(
                    (
                        price * float(properties["package_length_m"]),
                        "lei_package",
                    )
                )
            elif basis == "lei_package":
                candidates.append((price, "lei_package"))
        else:
            if basis in {"lei_unit", "lei_total"}:
                candidates.append((price, basis))
    return min(candidates, key=lambda item: item[0]) if candidates else None


def validate(payload: dict[str, Any]) -> dict[str, Any]:
    ids: set[str] = set()
    normalized: list[dict[str, Any]] = []
    for product in payload["products"]:
        for key in ("id", "category_id", "manufacturer", "label", "evidence_status"):
            if product.get(key) in (None, ""):
                raise ValueError(f"Missing {key} in product {product!r}")
        product_id = str(product["id"])
        if product_id in ids:
            raise ValueError(f"Duplicate product id {product_id}")
        ids.add(product_id)
        category_id = str(product["category_id"])
        if category_id not in CATEGORY_DEFINITIONS:
            raise ValueError(f"Unknown category {category_id!r} for {product_id}")
        if not product.get("technical_sources"):
            raise ValueError(f"{product_id} has no technical source.")

        properties, property_rows = _flatten_properties(product)
        adapted = normalize_teo_properties(category_id, properties)
        missing = missing_teo_properties(category_id, adapted)
        metric = None
        normalized_offer = _normalized_metric_offer(
            category_id,
            adapted,
            list(product.get("offers") or []),
        )
        if not missing and normalized_offer is not None:
            metric = compute_primary_value_metric(
                category_id,
                adapted,
                price_lei=normalized_offer[0],
                price_basis=normalized_offer[1],
            )

        normalized.append(
            {
                "product": product,
                "properties": properties,
                "adapted_properties": adapted,
                "property_rows": property_rows,
                "missing_teo_properties": missing,
                "metric": metric,
            }
        )
    return {"products": normalized}


def build_sql(payload: dict[str, Any], normalized: dict[str, Any]) -> str:
    observed_on = str(payload.get("observed_on") or "")
    catalog_version = str(payload.get("schema_version") or "energy-product-source-pack-v1")
    lines = ["BEGIN TRANSACTION;", ""]

    for item in normalized["products"]:
        product = item["product"]
        product_id = str(product["id"])
        category_id = str(product["category_id"])
        row = [
            product_id,
            product.get("external_id"),
            category_id,
            product["manufacturer"],
            product.get("model"),
            product["label"],
            product.get("manufacturer_sku"),
            product.get("gtin"),
            product.get("intended_use"),
            product.get("description") or "",
            "manufacturer_and_offer_sources",
            (product.get("technical_sources") or [{}])[0].get("url"),
            product["evidence_status"],
            catalog_version,
            observed_on,
        ]
        lines.append(
            "INSERT OR REPLACE INTO energy_products ("
            "id,external_id,category_id,manufacturer,model,label,manufacturer_sku,gtin,"
            "intended_use,description,source_kind,source_url,evidence_status,catalog_version,"
            "observed_on,active,updated_at"
            ") VALUES (" + ",".join(q(v) for v in row) + ",1,CURRENT_TIMESTAMP);"
        )

        for source_index, source in enumerate(product.get("technical_sources") or []):
            document_id = f"{product_id}:source:{source_index:02d}"
            docrow = [
                document_id,
                product_id,
                source.get("kind") or "technical_source",
                source.get("kind") or "Technical source",
                product["manufacturer"],
                None,
                source.get("standard_context"),
                None,
                None,
                source["url"],
                observed_on,
                None,
                "partial",
                "Link/reference only; source content is not redistributed.",
            ]
            lines.append(
                "INSERT OR REPLACE INTO energy_product_documents ("
                "document_id,product_id,document_type,title,issuer,declaration_number,"
                "standard_reference,revision,language,source_url,observed_on,sha256,"
                "parse_status,rights_note,updated_at"
                ") VALUES (" + ",".join(q(v) for v in docrow) + ",CURRENT_TIMESTAMP);"
            )

        adapted = item["adapted_properties"]
        category = CATEGORY_DEFINITIONS[category_id]
        required = set(category.required_properties)
        for prop in item["property_rows"]:
            value = prop["value"]
            numeric_value = float(value) if isinstance(value, (int, float)) else None
            text_value = None if numeric_value is not None else str(value)
            source_normalized = normalize_teo_properties(
                category_id,
                {prop["property_key"]: value},
            )
            is_teo = int(any(key in source_normalized for key in required))
            prow = [
                product_id,
                prop["property_key"],
                prop["context_key"],
                numeric_value,
                text_value,
                None,
                numeric_value,
                None,
                prop["source_document_id"],
                prop["source_url"],
                "source_backed",
                is_teo,
            ]
            lines.append(
                "INSERT OR REPLACE INTO energy_product_properties ("
                "product_id,property_key,context_key,numeric_value,text_value,unit,"
                "normalized_numeric_value,normalized_unit,source_document_id,source_locator,"
                "confidence,is_teo_input,updated_at"
                ") VALUES (" + ",".join(q(v) for v in prow) + ",CURRENT_TIMESTAMP);"
            )

        for offer_index, offer in enumerate(product.get("offers") or []):
            offer_id = f"{product_id}:offer:{offer_index:02d}"
            orow = [
                offer_id,
                product_id,
                offer["supplier"],
                offer.get("supplier_sku"),
                float(offer["price_lei"]),
                offer["price_basis"],
                offer.get("quantity"),
                offer.get("quantity_unit"),
                int(bool(offer.get("vat_included", True))),
                offer.get("stock_status") or "unknown",
                offer.get("source_url"),
                offer.get("observed_on") or observed_on,
                1,
            ]
            lines.append(
                "INSERT OR REPLACE INTO energy_product_offers ("
                "offer_id,product_id,supplier,supplier_sku,price_lei,price_basis,quantity,"
                "quantity_unit,vat_included,stock_status,source_url,observed_on,active,updated_at"
                ") VALUES (" + ",".join(q(v) for v in orow) + ",CURRENT_TIMESTAMP);"
            )

        metric = item["metric"]
        if metric is not None:
            source_signature = "|".join(
                sorted(
                    str(source.get("url") or "")
                    for source in product.get("technical_sources") or []
                )
            ) + "|" + "|".join(
                sorted(str(offer.get("source_url") or "") for offer in product.get("offers") or [])
            )
            mrow = [
                product_id,
                metric["metric_key"],
                metric["comparison_scope"],
                metric["numerator_value"],
                metric["numerator_unit"],
                metric["denominator_price_lei"],
                metric["denominator_basis"],
                metric["metric_value"],
                metric["metric_unit"],
                metric["formula_version"],
                source_signature,
            ]
            lines.append(
                "INSERT OR REPLACE INTO energy_product_value_metrics ("
                "product_id,metric_key,comparison_scope,numerator_value,numerator_unit,"
                "denominator_price_lei,denominator_basis,metric_value,metric_unit,"
                "formula_version,source_signature,computed_at"
                ") VALUES (" + ",".join(q(v) for v in mrow) + ",CURRENT_TIMESTAMP);"
            )

    lines.extend(["", "COMMIT;", ""])
    return "\n".join(lines)


def summary(normalized: dict[str, Any]) -> dict[str, Any]:
    rows = normalized["products"]
    return {
        "products": len(rows),
        "teo_property_complete": sum(not row["missing_teo_properties"] for row in rows),
        "value_metric_ready": sum(row["metric"] is not None for row in rows),
        "blocked": [
            {
                "id": row["product"]["id"],
                "missing_teo_properties": row["missing_teo_properties"],
            }
            for row in rows
            if row["missing_teo_properties"]
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate an evidence-backed energy product source pack and emit D1 SQL."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--summary", type=Path)
    args = parser.parse_args()

    payload = load(args.input)
    normalized = validate(payload)
    args.output.write_text(build_sql(payload, normalized), encoding="utf-8")
    result = summary(normalized)
    if args.summary:
        args.summary.write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
