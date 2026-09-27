from __future__ import annotations

import gc
import json
from urllib.parse import urlparse

from workers import Response, WorkerEntrypoint

from app.engine import reference_primary_specific_energy
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


class Default(WorkerEntrypoint):
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

        if method != "POST" or path != "/reference-comparison":
            return _json_response({"error": "Not found"}, status=404)

        stage = "request_json"
        try:
            body = await request.json()
            stage = "request_fields"
            payload = body.get("payload")
            actual_raw = body.get("actualSpecificPrimaryKwhM2")
            if payload in (None, "") or actual_raw in (None, ""):
                return _json_response(
                    {
                        "error": "Missing reference-comparison input.",
                        "errorType": "ValidationError",
                        "stage": stage,
                    },
                    status=422,
                )

            stage = "building_parse"
            building = building_from_json(
                payload if isinstance(payload, str) else json.dumps(payload)
            )
            stage = "actual_indicator"
            actual_specific = float(actual_raw)
            stage = "reference_rbpe"
            reference_specific = reference_primary_specific_energy(building)
            stage = "response"
            difference = actual_specific - reference_specific
            difference_percent = (
                100.0 * difference / reference_specific
                if reference_specific
                else 0.0
            )
            response = _json_response(
                {
                    "actualSpecificPrimaryKwhM2": round(actual_specific, 3),
                    "referenceSpecificPrimaryKwhM2": round(reference_specific, 3),
                    "differenceKwhM2": round(difference, 2),
                    "differencePercent": round(difference_percent, 1),
                    "calculationMode": "dedicated_reference_rbpe_worker",
                }
            )
            del building
            gc.collect()
            return response
        except Exception as exc:
            return _json_response(
                {
                    "error": str(exc),
                    "errorType": type(exc).__name__,
                    "stage": stage,
                },
                status=422,
            )
