"""Execution trace records compatible with the product technical annex."""

from __future__ import annotations

from typing import Any


def trace_record(
    *,
    chapter: str,
    formula_id: str,
    branch_id: str,
    inputs: dict[str, Any],
    units: dict[str, str],
    raw_result: Any,
    final_result: Any,
    status: str = "calculated",
    expression: str | None = None,
    provenance: dict[str, Any] | None = None,
    table_id: str | None = None,
) -> dict[str, Any]:
    record = {
        "schema": "lacurent_python_execution_trace_v1",
        "chapter": chapter,
        "formulaId": formula_id,
        "branchId": branch_id,
        "inputs": inputs,
        "units": units,
        "rawResult": raw_result,
        "finalResult": final_result,
        "status": status,
        "provenance": provenance or {},
    }
    if expression:
        record["expression"] = expression
    if table_id:
        record["tableId"] = table_id
    return record


def blocked_trace(
    *,
    chapter: str,
    formula_id: str,
    branch_id: str,
    diagnostics: list[dict],
    provenance: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return trace_record(
        chapter=chapter,
        formula_id=formula_id,
        branch_id=branch_id,
        inputs={},
        units={},
        raw_result=None,
        final_result=None,
        status="blocked",
        provenance=provenance or {},
        expression="blocked diagnostic; no substitute value emitted",
    ) | {"diagnostics": diagnostics}
