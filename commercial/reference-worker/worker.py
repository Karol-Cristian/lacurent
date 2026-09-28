from __future__ import annotations

import gc
import json
from urllib.parse import urlparse

from workers import Response, WorkerEntrypoint

from app.engine import calculate, reference_primary_specific_energy
from app.models import building_from_json
from app.pricing import estimate_energy_cost


CORS_HEADERS = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "cache-control": "no-store",
}


def _json_response(payload: dict, *, status: int = 200) -> Response:
    return Response(
        json.dumps(payload, ensure_ascii=False),
        status=status,
        headers={
            **CORS_HEADERS,
            "content-type": "application/json; charset=utf-8",
        },
    )


def _reference_comparison_payload(payload, actual_raw) -> dict:
    if payload in (None, "") or actual_raw in (None, ""):
        raise ValueError("Missing reference-comparison input.")

    building = building_from_json(
        payload if isinstance(payload, str) else json.dumps(payload)
    )
    actual_specific = float(actual_raw)
    reference_specific = reference_primary_specific_energy(building)
    difference = actual_specific - reference_specific
    difference_percent = (
        100.0 * difference / reference_specific
        if reference_specific
        else 0.0
    )
    result = {
        "actualSpecificPrimaryKwhM2": round(actual_specific, 3),
        "referenceSpecificPrimaryKwhM2": round(reference_specific, 3),
        "differenceKwhM2": round(difference, 2),
        "differencePercent": round(difference_percent, 1),
        "calculationMode": "dedicated_reference_rbpe_worker",
    }
    del building
    gc.collect()
    return result



def _live_calculation_payload(payload) -> dict:
    if payload in (None, ""):
        raise ValueError("Missing live calculation input.")

    building = building_from_json(
        payload if isinstance(payload, str) else json.dumps(payload)
    )
    result = calculate(building, include_reference=False)
    cost = estimate_energy_cost(result)
    response = {
        "energy_class": result.energy_class,
        "final_energy_kwh": float(result.total_final_energy_kwh),
        "annual_heating_demand_kwh": float(result.annual_heating_demand_kwh),
        "annual_cooling_demand_kwh": float(result.annual_cooling_demand_kwh),
        "primary_specific_kwh_m2": float(result.primary_energy.specific_kwh_m2),
        "co2_specific_kg_m2": float(result.co2.specific_kg_m2),
        "annual_cost_lei": (
            float(cost["priced_total_lei"]) if cost.get("complete") else None
        ),
        "calculationMode": "dedicated_live_rbpe_worker_probe",
    }
    del result
    del building
    del cost
    gc.collect()
    return response


class Default(WorkerEntrypoint):
    async def reference_comparison(self, payload, actual_specific):
        """Private Worker RPC entrypoint used by the main LaCurent service."""
        return _reference_comparison_payload(payload, actual_specific)

    async def live_calculation(self, payload):
        """Probe/full-RBPE RPC without FastAPI/Jinja in this isolate."""
        return _live_calculation_payload(payload)

    async def fetch(self, request):
        path = urlparse(request.url).path
        method = str(request.method).upper()

        if method == "OPTIONS":
            return Response("", status=204, headers=CORS_HEADERS)

        if method == "GET" and path == "/health":
            return _json_response(
                {
                    "status": "ok",
                    "service": "lacurent-reference-rbpe",
                    "executionMode": "dedicated_python_worker",
                }
            )

        if method == "POST" and path == "/live-calculation":
            try:
                body = await request.json()
                return _json_response(_live_calculation_payload(body.get("payload")))
            except Exception as exc:
                return _json_response(
                    {"error": str(exc), "errorType": type(exc).__name__},
                    status=422,
                )

        if method != "POST" or path != "/reference-comparison":
            return _json_response({"error": "Not found"}, status=404)

        try:
            body = await request.json()
            return _json_response(
                _reference_comparison_payload(
                    body.get("payload"),
                    body.get("actualSpecificPrimaryKwhM2"),
                )
            )
        except Exception as exc:
            return _json_response(
                {
                    "error": str(exc),
                    "errorType": type(exc).__name__,
                },
                status=422,
            )
