from __future__ import annotations

from typing import Any

from .energy_product_catalog import (
    CATEGORY_DEFINITIONS,
    missing_teo_properties,
    normalize_teo_properties,
)
from .energy_product_teo_adapter import ProductCandidate


def _d1_rows(result: Any) -> list[dict[str, Any]]:
    raw_rows = getattr(result, "results", None)
    if hasattr(raw_rows, "to_py"):
        raw_rows = raw_rows.to_py()
    return [dict(row) for row in (raw_rows or [])]


def _bounded_limit(limit: int) -> int:
    return max(1, min(int(limit), 100))


async def read_energy_product_candidate_window_d1(
    db: Any,
    category_id: str,
    *,
    limit: int = 24,
) -> dict[str, Any]:
    """Read a bounded source-backed commercial window for one product category.

    This function is intentionally finalist/BOM oriented. It never loads the
    full marketplace into TEO search-time memory.
    """

    if category_id not in CATEGORY_DEFINITIONS:
        raise ValueError(f"Unknown energy product category {category_id!r}.")
    row_limit = _bounded_limit(limit)

    product_result = await db.prepare(
        """
        SELECT id, category_id, manufacturer, model, label, manufacturer_sku,
               gtin, evidence_status, source_url, catalog_version, observed_on
        FROM energy_products
        WHERE active = 1
          AND category_id = ?
          AND evidence_status IN ('source_backed','document_backed','reviewed')
        ORDER BY evidence_status DESC, manufacturer, model, id
        LIMIT ?
        """
    ).bind(category_id, row_limit).run()
    products = _d1_rows(product_result)
    if not products:
        return {
            "category_id": category_id,
            "candidates": [],
            "products": [],
            "loaded_products": 0,
            "teo_ready_products": 0,
            "blocked_products": [],
            "catalog_mode": "bounded_d1_category_window",
        }

    product_ids = [str(item["id"]) for item in products]
    placeholders = ",".join("?" for _ in product_ids)

    property_result = await db.prepare(
        f"""
        SELECT product_id, property_key, context_key, numeric_value, text_value,
               normalized_numeric_value, normalized_unit, source_document_id,
               source_locator, confidence, is_teo_input
        FROM energy_product_properties
        WHERE product_id IN ({placeholders})
        ORDER BY product_id, property_key, context_key
        """
    ).bind(*product_ids).run()
    property_rows = _d1_rows(property_result)

    offer_result = await db.prepare(
        f"""
        SELECT offer_id, product_id, supplier, supplier_sku, price_lei,
               price_basis, quantity, quantity_unit, vat_included,
               stock_status, source_url, observed_on
        FROM energy_product_offers
        WHERE active = 1
          AND product_id IN ({placeholders})
        ORDER BY product_id, observed_on DESC, price_lei ASC, offer_id
        """
    ).bind(*product_ids).run()
    offer_rows = _d1_rows(offer_result)

    # Image rows are optional metadata. Keep the product/BOM path compatible
    # with older test doubles or partially migrated D1 databases.
    try:
        image_result = await db.prepare(
            f"""
            SELECT image_id, product_id, image_url, source_url, alt_text,
                   image_kind, rights_basis, is_primary
            FROM energy_product_images
            WHERE active = 1
              AND product_id IN ({placeholders})
            ORDER BY product_id, is_primary DESC, image_id
            """
        ).bind(*product_ids).run()
        image_rows = _d1_rows(image_result)
    except Exception:
        image_rows = []

    properties_by_product: dict[str, dict[str, Any]] = {pid: {} for pid in product_ids}
    property_trace_by_product: dict[str, list[dict[str, Any]]] = {
        pid: [] for pid in product_ids
    }
    for row in property_rows:
        product_id = str(row.get("product_id") or "")
        key = str(row.get("property_key") or "")
        if product_id not in properties_by_product or not key:
            continue
        value = row.get("normalized_numeric_value")
        if value is None:
            value = row.get("numeric_value")
        if value is None:
            value = row.get("text_value")
        # Keep the first deterministic value per stable key. Context-specific
        # source rows remain available in the trace payload below.
        properties_by_product[product_id].setdefault(key, value)
        property_trace_by_product[product_id].append(dict(row))

    offers_by_product: dict[str, list[dict[str, Any]]] = {
        pid: [] for pid in product_ids
    }
    for row in offer_rows:
        product_id = str(row.get("product_id") or "")
        if product_id in offers_by_product:
            offers_by_product[product_id].append(dict(row))

    images_by_product: dict[str, list[dict[str, Any]]] = {
        pid: [] for pid in product_ids
    }
    for row in image_rows:
        product_id = str(row.get("product_id") or "")
        if product_id in images_by_product:
            images_by_product[product_id].append(dict(row))

    candidates: list[ProductCandidate] = []
    product_payloads: list[dict[str, Any]] = []
    blocked: list[dict[str, Any]] = []

    for product in products:
        product_id = str(product["id"])
        normalized = normalize_teo_properties(
            category_id,
            properties_by_product.get(product_id) or {},
        )
        missing = missing_teo_properties(category_id, normalized)
        offers = offers_by_product.get(product_id) or []

        unit_price: float | None = None
        package_price: float | None = None
        for offer in offers:
            basis = str(offer.get("price_basis") or "")
            price_raw = offer.get("price_lei")
            if price_raw is None:
                continue
            price = float(price_raw)
            if basis in {"lei_unit", "lei_total"}:
                unit_price = price if unit_price is None else min(unit_price, price)
            elif basis == "lei_package":
                package_price = (
                    price if package_price is None else min(package_price, price)
                )
            elif basis == "lei_per_m" and category_id == "underfloor_pipe":
                length = normalized.get("package_length_m")
                if length not in (None, ""):
                    normalized_price = price * float(length)
                    package_price = (
                        normalized_price
                        if package_price is None
                        else min(package_price, normalized_price)
                    )

        payload = {
            **dict(product),
            "properties": normalized,
            "property_trace": property_trace_by_product.get(product_id) or [],
            "offers": offers,
            "images": images_by_product.get(product_id) or [],
            "missing_teo_properties": missing,
        }
        product_payloads.append(payload)

        if missing:
            blocked.append(
                {
                    "product_id": product_id,
                    "reason": "missing_teo_properties",
                    "missing": missing,
                }
            )
            continue

        candidates.append(
            ProductCandidate(
                product_id=product_id,
                category_id=category_id,
                properties={
                    key: float(value)
                    for key, value in normalized.items()
                    if isinstance(value, (int, float))
                },
                unit_price_lei=unit_price,
                package_price_lei=package_price,
            )
        )

    return {
        "category_id": category_id,
        "candidates": candidates,
        "products": product_payloads,
        "loaded_products": len(products),
        "teo_ready_products": len(candidates),
        "blocked_products": blocked,
        "catalog_mode": "bounded_d1_category_window",
    }
