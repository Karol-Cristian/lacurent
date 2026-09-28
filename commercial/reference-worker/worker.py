from __future__ import annotations

import gc
import json
from urllib.parse import urlparse

from workers import Response, WorkerEntrypoint

from app.engine import reference_primary_specific_energy
from app.models import building_from_json
from app.rbpe_service import calculate_home_lab_result_json, calculate_home_lab_result_payload


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


class Default(WorkerEntrypoint):
    async def reference_comparison(self, payload, actual_specific):
        """Private Worker RPC entrypoint used by the main LaCurent service."""
        return _reference_comparison_payload(payload, actual_specific)

    async def calculate_home_lab_json(self, payload):
        """Run canonical Home Lab RBPE and cross RPC as a primitive JSON string."""
        return calculate_home_lab_result_json(payload)

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

        if method != "POST" or path not in {"/reference-comparison", "/calculate-home-lab"}:
            return _json_response({"error": "Not found"}, status=404)

        try:
            body = await request.json()
            if path == "/calculate-home-lab":
                return _json_response(
                    calculate_home_lab_result_payload(body.get("payload"))
                )
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
