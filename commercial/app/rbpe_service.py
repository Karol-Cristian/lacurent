from __future__ import annotations

import gc
import json
from typing import Any

from .engine import calculate
from .models import building_from_json, model_to_dict, model_to_json


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

    del result
    del building
    gc.collect()
    return encoded
