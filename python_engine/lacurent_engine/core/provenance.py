"""Provenance helpers shared by Python traces and results."""

from __future__ import annotations

from typing import Any


def provenance(
    classification: str,
    *,
    source: str,
    reference: str | None = None,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    result = {
        "classification": classification,
        "source": source,
    }
    if reference:
        result["reference"] = reference
    if details:
        result["details"] = details
    return result


def formula_provenance(formula_id: str, source: str) -> dict[str, Any]:
    return provenance("OWNED_SOURCE_FORMULA_AVAILABLE", source=source, reference=formula_id)
