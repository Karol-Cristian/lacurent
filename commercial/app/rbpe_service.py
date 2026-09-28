from __future__ import annotations

import gc
import json
from typing import Any

from .engine import calculate
from .models import building_from_json, model_to_dict


def calculate_home_lab_result_payload(payload: str | dict[str, Any]) -> dict[str, Any]:
    """Run one canonical Home Lab RBPE pass and return a transport-safe result.

    This function deliberately stops at CalculationResult serialization. Pricing,
    HUD/report shaping and other web concerns remain in the main application.
    Keeping the heavy calculate() graph inside the dedicated Python Worker gives
    the web Worker a separate Cloudflare isolate/memory budget.
    """
    if payload in (None, ""):
        raise ValueError("Missing Home Lab RBPE input.")

    building = building_from_json(
        payload if isinstance(payload, str) else json.dumps(payload)
    )
    result = calculate(building, include_reference=False)
    transport = model_to_dict(result)

    del result
    del building
    gc.collect()
    return transport


def calculate_home_lab_result_json(payload: str | dict[str, Any]) -> str:
    """Serialize the canonical result before crossing the Worker RPC boundary.

    Nested Python objects transferred directly through cross-Worker RPC create a
    large Pyodide/V8 proxy graph in the caller. A JSON string is a primitive
    transport value and keeps that bridge memory bounded.
    """
    transport = calculate_home_lab_result_payload(payload)
    encoded = json.dumps(transport, ensure_ascii=False, separators=(",", ":"))
    del transport
    gc.collect()
    return encoded
