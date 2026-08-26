"""Minimal production HTTP boundary for the Python physics engine.

HTTP concerns stay outside the calculation package. The service validates and
serializes requests, then delegates all MC001 work to ``calculate``.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

from .calculate import ENGINE_VERSION, calculate, compact_engine_output

MAX_REQUEST_BYTES = 1_048_576


def _request_limit() -> int:
    try:
        return max(1, int(os.environ.get("LACURENT_MAX_REQUEST_BYTES", str(MAX_REQUEST_BYTES))))
    except ValueError:
        return MAX_REQUEST_BYTES


def _reject_constant(value: str) -> None:
    raise ValueError(f"JSON constant {value} is not supported")


def _json_bytes(body: dict[str, Any]) -> bytes:
    return json.dumps(body, allow_nan=False, sort_keys=True).encode("utf-8")


def _status_from_body(body: Any) -> str:
    if isinstance(body, dict):
        return str(body.get("status") or "unknown")
    return "unknown"


def _primary_diagnostic(body: Any) -> str | None:
    if not isinstance(body, dict):
        return None
    diagnostics = body.get("diagnostics")
    if isinstance(diagnostics, list) and diagnostics:
        first = diagnostics[0]
        if isinstance(first, dict):
            return first.get("code")
    error = body.get("error")
    return str(error) if error else None


class CalculateHandler(BaseHTTPRequestHandler):
    server_version = "LaCurentPythonEngine/0.2"

    def _send_json(
        self,
        body: dict[str, Any],
        status: int = 200,
        *,
        request_id: str | None = None,
        duration_ms: float | None = None,
    ) -> None:
        serialized = _json_bytes(body)
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("content-length", str(len(serialized)))
        self.send_header("x-lacurent-engine", "python")
        self.send_header("x-lacurent-engine-version", ENGINE_VERSION)
        if request_id:
            self.send_header("x-lacurent-request-id", request_id)
        if duration_ms is not None:
            self.send_header("x-lacurent-duration-ms", f"{duration_ms:.3f}")
        self.end_headers()
        self.wfile.write(serialized)

    def _diagnostic(
        self,
        code: str,
        message: str,
        status: int,
        *,
        request_id: str | None = None,
        duration_ms: float | None = None,
    ) -> None:
        self._send_json(
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

    def _log_summary(self, request_id: str, status: int, body: Any, duration_ms: float) -> None:
        print(
            json.dumps(
                {
                    "requestId": request_id,
                    "engine": "python",
                    "engineVersion": ENGINE_VERSION,
                    "httpStatus": status,
                    "calculationStatus": _status_from_body(body),
                    "diagnosticCode": _primary_diagnostic(body),
                    "durationMs": round(duration_ms, 3),
                },
                allow_nan=False,
                sort_keys=True,
            ),
            file=sys.stderr,
            flush=True,
        )

    def do_GET(self) -> None:  # noqa: N802 - stdlib handler API
        path = urlparse(self.path).path
        if path == "/calculate":
            self._diagnostic("PYTHON_ENGINE_METHOD_NOT_ALLOWED", "Calculul se executa doar prin POST.", 405)
            return
        if path != "/health":
            self._diagnostic("PYTHON_ENGINE_ROUTE_NOT_FOUND", "Endpoint necunoscut.", 404)
            return
        self._send_json(
            {
                "status": "ok",
                "engine": "python",
                "engineVersion": ENGINE_VERSION,
            }
        )

    def do_POST(self) -> None:  # noqa: N802 - stdlib handler API
        started = time.perf_counter()
        request_id = self.headers.get("x-lacurent-request-id") or str(uuid.uuid4())
        if urlparse(self.path).path != "/calculate":
            self._diagnostic("PYTHON_ENGINE_ROUTE_NOT_FOUND", "Doar POST /calculate este suportat.", 404, request_id=request_id)
            return
        content_type = self.headers.get("content-type", "").split(";", 1)[0].strip().lower()
        if content_type != "application/json":
            self._diagnostic(
                "PYTHON_ENGINE_INVALID_CONTENT_TYPE",
                "Cererea trebuie sa foloseasca application/json.",
                415,
                request_id=request_id,
            )
            return
        try:
            length = int(self.headers.get("content-length", "0"))
        except ValueError:
            self._diagnostic("PYTHON_ENGINE_INVALID_CONTENT_LENGTH", "Content-Length invalid.", 400, request_id=request_id)
            return
        if length <= 0:
            self._diagnostic("PYTHON_ENGINE_EMPTY_REQUEST", "Corpul cererii JSON este obligatoriu.", 400, request_id=request_id)
            return
        if length > _request_limit():
            self._diagnostic("PYTHON_ENGINE_REQUEST_TOO_LARGE", "Cererea depaseste limita acceptata.", 413, request_id=request_id)
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"), parse_constant=_reject_constant)
            compact = self.headers.get("x-lacurent-compact-output", "").lower() == "true"
            if isinstance(payload, list):
                results = [calculate(item) for item in payload]
                body: dict[str, Any] = {
                    "schemaVersion": "lacurent_engine_output_v1",
                    "engine": "python",
                    "engineVersion": ENGINE_VERSION,
                    "status": "ready" if all(item.get("status") in {"ready", "incomplete"} for item in results) else "blocked",
                    "results": [compact_engine_output(item) if compact else item for item in results],
                }
            else:
                result = calculate(payload)
                body = compact_engine_output(result) if compact else result
            duration_ms = (time.perf_counter() - started) * 1000
            self._send_json(body, 200, request_id=request_id, duration_ms=duration_ms)
            self._log_summary(request_id, 200, body, duration_ms)
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as error:
            duration_ms = (time.perf_counter() - started) * 1000
            self._diagnostic(
                "PYTHON_ENGINE_INVALID_JSON",
                f"Corpul cererii trebuie sa fie JSON valid: {error}",
                400,
                request_id=request_id,
                duration_ms=duration_ms,
            )
        except Exception as error:  # Expected calculation blockers are returned as diagnostics.
            duration_ms = (time.perf_counter() - started) * 1000
            self._send_json(
                {
                    "schemaVersion": "lacurent_engine_output_v1",
                    "engine": "python",
                    "engineVersion": ENGINE_VERSION,
                    "status": "error",
                    "diagnostics": [
                        {
                            "code": "PYTHON_ENGINE_UNEXPECTED_ERROR",
                            "severity": "blocking",
                            "message": str(error),
                            "errorType": type(error).__name__,
                        }
                    ],
                },
                500,
                request_id=request_id,
                duration_ms=duration_ms,
            )

    def log_message(self, format: str, *args: Any) -> None:
        return


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run a minimal LaCurent Python engine HTTP service.")
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8765")))
    args = parser.parse_args(argv)
    server = ThreadingHTTPServer((args.host, args.port), CalculateHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        return 0
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
