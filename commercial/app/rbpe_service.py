from __future__ import annotations

import json
from typing import Any

from .engine import calculate
from .home_lab_payload import embed_lab_result_payload, optimizer_candidate_payload
from .models import building_from_json, model_to_json


def calculate_home_lab_result_payload(payload: str | dict[str, Any]) -> dict[str, Any]:
    """Local/test helper returning the canonical CalculationResult as a dict."""
    encoded = calculate_home_lab_result_json(payload)
    return json.loads(encoded)


def calculate_home_lab_result_json(payload: str | dict[str, Any]) -> str:
    """Run one canonical RBPE pass and serialize exactly once.

    The dedicated Worker uses Pydantic v1. Building a transport dict via
    model_to_dict() would perform result.json() -> json.loads(), after which RPC
    serialization performed another json.dumps(). That temporarily materialized
    multiple full result graphs in the 128 MB Pyodide isolate.

    Returning the model JSON directly keeps the canonical calculation identical
    while bounding transient allocation at the Worker boundary.
    """
    if payload in (None, ""):
        raise ValueError("Missing Home Lab RBPE input.")

    building = building_from_json(
        payload if isinstance(payload, str) else json.dumps(payload)
    )
    result = calculate(building, include_reference=False)
    encoded = model_to_json(result)

    # CalculationResult/BuildingInput graphs are acyclic in the canonical path
    # and CPython releases them through reference counting when these local
    # references are dropped. A forced full gc.collect() on every Pyodide
    # request becomes progressively CPU-expensive and can itself trip the
    # Cloudflare Python CPU limit under repeated live recalculation.
    del result
    del building
    return encoded


def calculate_home_lab_api_json(
    payload: str | dict[str, Any],
    *,
    optimizer_candidate: bool = False,
) -> str:
    """Run canonical RBPE and return the final browser/API payload as JSON.

    The main web Worker must not reconstruct the full CalculationResult. Doing
    so duplicates the heavy result graph inside the FastAPI/Jinja isolate and
    defeats the private Worker memory boundary.
    """
    if payload in (None, ""):
        raise ValueError("Missing Home Lab RBPE input.")

    building = building_from_json(
        payload if isinstance(payload, str) else json.dumps(payload)
    )
    result = calculate(building, include_reference=False)
    response_payload = (
        optimizer_candidate_payload(result)
        if optimizer_candidate
        else embed_lab_result_payload(result)
    )
    encoded = json.dumps(
        response_payload,
        ensure_ascii=False,
        separators=(",", ":"),
    )

    del response_payload
    del result
    del building
    return encoded
