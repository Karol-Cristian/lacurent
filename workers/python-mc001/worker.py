"""Cloudflare Python Worker adapter for the LaCurent MC001 engine.

This module is intentionally thin: HTTP validation and serialization live here,
while all calculation work remains in ``python_engine.calculate``.
"""

from __future__ import annotations

import json
import time
from typing import Any
from urllib.parse import urlparse

from workers import Response, WorkerEntrypoint

from python_engine import calculate
from python_engine.lacurent_engine.api.calculate import ENGINE_VERSION, compact_engine_output


MAX_REQUEST_BYTES = 1_048_576


def _method(request: Any) -> str:
    value = getattr(request, "method", "")
    return getattr(value, "value", str(value)).upper()


def _header(request: Any, name: str) -> str:
    try:
        return request.headers.get(name) or ""
    except Exception:
        return ""


def _json_body(body: dict[str, Any], status: int = 200, *, request_id: str | None = None, duration_ms: float | None = None) -> Response:
    headers = {
        "content-type": "application/json; charset=utf-8",
        "x-lacurent-engine": "python",
        "x-lacurent-engine-version": ENGINE_VERSION,
    }
    if request_id:
        headers["x-lacurent-request-id"] = request_id
    if duration_ms is not None:
        headers["x-lacurent-duration-ms"] = f"{duration_ms:.3f}"
    return Response(
        json.dumps(body, allow_nan=False, sort_keys=True, separators=(",", ":")),
        status=status,
        headers=headers,
    )


def _diagnostic(code: str, message: str, status: int, *, request_id: str | None = None, duration_ms: float | None = None) -> Response:
    return _json_body(
        {
            "schemaVersion": "lacurent_engine_output_v1",
            "engine": "python",
            "engineVersion": ENGINE_VERSION,
            "status": "error" if status >= 500 else "blocked",
            "diagnostics": [
                {
                    "code": code,
                    "severity": "blocking",
                    "message": message,
                }
            ],
        },
        status,
        request_id=request_id,
        duration_ms=duration_ms,
    )


def _reject_json_constant(value: str) -> None:
    raise ValueError(f"JSON constant {value} is not supported")


def _request_id(request: Any) -> str:
    return _header(request, "x-lacurent-request-id") or f"cfpy-{int(time.time() * 1000)}"


class Default(WorkerEntrypoint):
    async def fetch(self, request: Any) -> Response:
        started = time.perf_counter()
        request_id = _request_id(request)
        path = urlparse(str(getattr(request, "url", ""))).path or "/"
        method = _method(request)

        if method == "GET" and path == "/health":
            return _json_body(
                {
                    "status": "ok",
                    "engine": "python",
                    "engineVersion": ENGINE_VERSION,
                    "runtime": "cloudflare-python-worker",
                },
                request_id=request_id,
            )

        if path != "/calculate":
            return _diagnostic("PYTHON_ENGINE_ROUTE_NOT_FOUND", "Endpoint necunoscut.", 404, request_id=request_id)
        if method != "POST":
            return _diagnostic("PYTHON_ENGINE_METHOD_NOT_ALLOWED", "Calculul se executa doar prin POST.", 405, request_id=request_id)

        content_type = _header(request, "content-type").split(";", 1)[0].strip().lower()
        if content_type != "application/json":
            return _diagnostic("PYTHON_ENGINE_INVALID_CONTENT_TYPE", "Cererea trebuie sa foloseasca application/json.", 415, request_id=request_id)

        try:
            text = await request.text()
            if len(text.encode("utf-8")) > MAX_REQUEST_BYTES:
                return _diagnostic("PYTHON_ENGINE_REQUEST_TOO_LARGE", "Cererea depaseste limita acceptata.", 413, request_id=request_id)
            payload = json.loads(text or "{}", parse_constant=_reject_json_constant)
        except (UnicodeDecodeError, ValueError, json.JSONDecodeError) as error:
            duration_ms = (time.perf_counter() - started) * 1000
            return _diagnostic(
                "PYTHON_ENGINE_INVALID_JSON",
                f"Corpul cererii trebuie sa fie JSON valid: {error}",
                400,
                request_id=request_id,
                duration_ms=duration_ms,
            )

        try:
            compact = _header(request, "x-lacurent-compact-output").lower() == "true"
            calculation_input = payload.get("input", payload) if isinstance(payload, dict) else payload
            if isinstance(calculation_input, list):
                results = [calculate(item) for item in calculation_input]
                body = {
                    "schemaVersion": "lacurent_engine_output_v1",
                    "engine": "python",
                    "engineVersion": ENGINE_VERSION,
                    "status": "ready" if all(item.get("status") in {"ready", "incomplete"} for item in results) else "blocked",
                    "results": [compact_engine_output(item) if compact else item for item in results],
                }
            else:
                result = calculate(calculation_input)
                body = compact_engine_output(result) if compact else result
            duration_ms = (time.perf_counter() - started) * 1000
            return _json_body(body, request_id=request_id, duration_ms=duration_ms)
        except Exception as error:
            duration_ms = (time.perf_counter() - started) * 1000
            return _json_body(
                {
                    "schemaVersion": "lacurent_engine_output_v1",
                    "engine": "python",
                    "engineVersion": ENGINE_VERSION,
                    "status": "error",
                    "diagnostics": [
                        {
                            "code": "PYTHON_ENGINE_UNEXPECTED_ERROR",
                            "severity": "blocking",
                            "message": "Calculul Python MC001 a esuat neasteptat.",
                        }
                    ],
                },
                500,
                request_id=request_id,
                duration_ms=duration_ms,
            )
