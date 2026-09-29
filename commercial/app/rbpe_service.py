from __future__ import annotations

import json
from typing import Any
from urllib.parse import parse_qsl

from .engine import calculate
from .home_lab_form import build_input_from_form
from .home_lab_payload import embed_lab_result_payload, optimizer_candidate_payload
from .models import BuildingInput, building_from_json, model_to_dict, model_to_json
from .renovation import TechnicalRequirementV1, build_wall_insulation_scenario
from .product_matching import WallInsulationProductV1, build_product_wall_insulation_scenario
from .pricing import estimate_energy_cost


def calculate_home_lab_result_payload(payload: str | dict[str, Any]) -> dict[str, Any]:
    """Local/test helper returning the canonical CalculationResult as a dict."""
    encoded = calculate_home_lab_result_json(payload)
    return json.loads(encoded)


def calculate_render_context_json(payload: str | dict[str, Any]) -> str:
    """Run one canonical RBPE pass and serialize a template-ready context.

    Legacy HTML surfaces still need the full result presentation, but production
    must not execute the physics inside the public FastAPI/Pyodide isolate.
    Returning primitive JSON keeps the public Worker limited to Jinja rendering.
    """
    if payload in (None, ""):
        raise ValueError("Missing RBPE render input.")

    building = building_from_json(
        payload if isinstance(payload, str) else json.dumps(payload)
    )
    result = calculate(building, include_reference=False)
    result_payload = model_to_dict(result)
    envelope_sorted = sorted(
        result_payload.get("envelope_contributions") or [],
        key=lambda item: float(item.get("value") or 0),
        reverse=True,
    )
    service_values = result_payload.get("final_energy_by_service") or {}
    carrier_values = result_payload.get("final_energy_by_carrier") or {}
    monthly_rows = result_payload.get("monthly") or []
    context = {
        "result": result_payload,
        "envelope_sorted": envelope_sorted,
        "service_max": max(service_values.values()) if service_values else 1,
        "carrier_max": max(carrier_values.values()) if carrier_values else 1,
        "monthly_max": max(
            (
                float(row.get("useful_heating_kwh") or 0)
                + float(row.get("useful_cooling_kwh") or 0)
                for row in monthly_rows
            ),
            default=1,
        ),
        "cost_estimate": estimate_energy_cost(result),
        "payload": model_to_json(result.input),
    }
    encoded = json.dumps(
        context,
        ensure_ascii=False,
        separators=(",", ":"),
    )
    del context
    del result_payload
    del result
    del building
    return encoded


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

def build_wall_insulation_scenario_json(
    payload: str | dict[str, Any],
    *,
    added_insulation_thickness_mm: float,
    insulation_lambda_w_mk: float,
) -> str:
    """Execute the two-pass renovation scenario inside the private RBPE shard."""
    if payload in (None, ""):
        raise ValueError("Missing wall-insulation baseline input.")

    building = building_from_json(
        payload if isinstance(payload, str) else json.dumps(payload)
    )
    bundle = build_wall_insulation_scenario(
        building,
        added_insulation_thickness_mm=float(added_insulation_thickness_mm),
        insulation_lambda_w_mk=float(insulation_lambda_w_mk),
    )
    encoded = model_to_json(bundle)
    del bundle
    del building
    return encoded


def build_product_wall_insulation_scenario_json(
    payload: str | dict[str, Any],
    requirement_payload: str | dict[str, Any],
    product_payload: str | dict[str, Any],
) -> str:
    """Execute product-backed wall scenario inside the private RBPE shard."""
    if payload in (None, ""):
        raise ValueError("Missing product-scenario baseline input.")

    building = building_from_json(
        payload if isinstance(payload, str) else json.dumps(payload)
    )
    requirement = TechnicalRequirementV1.model_validate_json(requirement_payload) if isinstance(
        requirement_payload, str
    ) and hasattr(TechnicalRequirementV1, "model_validate_json") else TechnicalRequirementV1(
        **(
            json.loads(requirement_payload)
            if isinstance(requirement_payload, str)
            else requirement_payload
        )
    )
    product = WallInsulationProductV1.model_validate_json(product_payload) if isinstance(
        product_payload, str
    ) and hasattr(WallInsulationProductV1, "model_validate_json") else WallInsulationProductV1(
        **(
            json.loads(product_payload)
            if isinstance(product_payload, str)
            else product_payload
        )
    )
    response = build_product_wall_insulation_scenario(
        building,
        requirement,
        product,
    )
    encoded = model_to_json(response)
    del response
    del product
    del requirement
    del building
    return encoded
