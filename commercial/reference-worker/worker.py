from __future__ import annotations

import gc
import json
from urllib.parse import urlparse

from workers import Response, WorkerEntrypoint

from app.engine import calculate, reference_primary_specific_energy
from app.home_lab_live_payload import home_lab_live_payload
from app.models import building_from_json


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



def _live_calculation_payload(payload, *, details: bool = False) -> dict:
    if payload in (None, ""):
        raise ValueError("Missing live calculation input.")

    building = building_from_json(
        payload if isinstance(payload, str) else json.dumps(payload)
    )
    result = calculate(building, include_reference=False)
    if details:
        # Import the heavy report/reference projection only on explicit detail
        # requests. High-frequency live edits keep the isolate lean.
        from app.home_lab_payload import embed_lab_result_payload

        response = embed_lab_result_payload(result)
    else:
        response = home_lab_live_payload(result)
    del result
    del building
    gc.collect()
    return response


class Default(WorkerEntrypoint):
    async def reference_comparison(self, payload, actual_specific):
        """Private Worker RPC entrypoint used by the main LaCurent service."""
        return _reference_comparison_payload(payload, actual_specific)

    async def live_calculation(self, payload, details=False):
        """Canonical Home Lab RBPE pass in the isolated Python Worker."""
        return _live_calculation_payload(payload, details=bool(details))

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
                return _json_response(
                    _live_calculation_payload(
                        body.get("payload"),
                        details=bool(body.get("details")),
                    )
                )
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
