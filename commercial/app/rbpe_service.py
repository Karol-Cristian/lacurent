from __future__ import annotations

import json
from typing import Any
from urllib.parse import parse_qsl

from .engine import calculate
from .home_lab_form import build_input_from_form
from .home_lab_payload import embed_lab_result_payload, optimizer_candidate_payload
from .models import BuildingInput, building_from_json, model_to_json
from .product_matching import WallInsulationProductV1, build_product_wall_insulation_scenario
from .renovation import TechnicalRequirementV1, build_wall_insulation_scenario


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


def _calculate_home_lab_api_json_from_building(
    building: BuildingInput,
    *,
    optimizer_candidate: bool = False,
) -> str:
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
    return encoded


def calculate_home_lab_api_json(
    payload: str | dict[str, Any],
    *,
    optimizer_candidate: bool = False,
) -> str:
    """Run canonical RBPE and return the final browser/API payload as JSON."""
    if payload in (None, ""):
        raise ValueError("Missing Home Lab RBPE input.")

    building = building_from_json(
        payload if isinstance(payload, str) else json.dumps(payload)
    )
    encoded = _calculate_home_lab_api_json_from_building(
        building,
        optimizer_candidate=optimizer_candidate,
    )
    del building
    return encoded


def calculate_home_lab_form_api_json(encoded_form: str) -> str:
    """Parse one live Home Lab form and execute canonical RBPE entirely here.

    This is the route-facing entrypoint used by the dedicated calculation
    gateway. The main FastAPI/Jinja Worker never materializes FormData,
    BuildingInput or CalculationResult for live edits.
    """
    if encoded_form in (None, ""):
        raise ValueError("Missing Home Lab form payload.")

    form = dict(parse_qsl(str(encoded_form), keep_blank_values=True))
    form.pop("_skip_reference", None)
    optimizer_candidate = str(form.pop("_optimizer_candidate", "")).strip().lower() in {
        "1", "true", "yes", "on",
    }
    building = build_input_from_form(form)
    encoded = _calculate_home_lab_api_json_from_building(
        building,
        optimizer_candidate=optimizer_candidate,
    )
    del building
    del form
    return encoded