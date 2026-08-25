"""Minimal HTTP boundary for the Python physics engine.

This module deliberately keeps HTTP concerns outside the calculation package.
It is suitable for local certification and for a future small containerized
service, but P11B does not make it production authority.
"""

from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from .calculate import ENGINE_VERSION, calculate, compact_engine_output


class CalculateHandler(BaseHTTPRequestHandler):
    server_version = "LaCurentPythonEngine/0.1"

    def do_POST(self) -> None:  # noqa: N802 - stdlib handler API
        if self.path != "/calculate":
            self.send_error(404, "Only POST /calculate is supported")
            return
        try:
            length = int(self.headers.get("content-length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
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
            serialized = json.dumps(body, sort_keys=True).encode("utf-8")
            self.send_response(200)
            self.send_header("content-type", "application/json; charset=utf-8")
            self.send_header("content-length", str(len(serialized)))
            self.end_headers()
            self.wfile.write(serialized)
        except json.JSONDecodeError:
            self.send_error(400, "Request body must be valid JSON")
        except Exception as error:  # Expected calculation blockers are returned as diagnostics.
            serialized = json.dumps({
                "schemaVersion": "lacurent_engine_output_v1",
                "engine": "python",
                "engineVersion": ENGINE_VERSION,
                "status": "error",
                "error": type(error).__name__,
                "message": str(error),
            }, sort_keys=True).encode("utf-8")
            self.send_response(500)
            self.send_header("content-type", "application/json; charset=utf-8")
            self.send_header("content-length", str(len(serialized)))
            self.end_headers()
            self.wfile.write(serialized)

    def log_message(self, format: str, *args: Any) -> None:
        return


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run a minimal LaCurent Python engine HTTP service.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
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
