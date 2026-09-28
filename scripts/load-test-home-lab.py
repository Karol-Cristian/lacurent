#!/usr/bin/env python3
"""Bounded local Home Lab calculation load test (never targets production)."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
from pathlib import Path
import platform
import statistics
import sys
import threading
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "commercial"))

from app.main import default_form_values  # noqa: E402


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int((len(ordered) - 1) * fraction))]


def rss_mib(pid: int | None) -> float | None:
    if not pid:
        return None
    try:
        for line in Path(f"/proc/{pid}/status").read_text().splitlines():
            if line.startswith("VmRSS:"):
                return float(line.split()[1]) / 1024
    except (FileNotFoundError, PermissionError, ValueError):
        pass
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8766")
    parser.add_argument("--users", default="10,50,100")
    parser.add_argument("--requests-per-user", type=int, default=16)
    parser.add_argument("--think-ms", type=int, default=160)
    parser.add_argument("--timeout-seconds", type=float, default=12)
    parser.add_argument("--max-error-rate", type=float, default=0.02)
    parser.add_argument("--server-pid", type=int)
    args = parser.parse_args()

    parsed = urllib.parse.urlsplit(args.base_url)
    if parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        parser.error("This bounded harness only permits a local target.")

    body = urllib.parse.urlencode({
        **default_form_values(),
        "_skip_reference": "1",
        "_optimizer_candidate": "1",
    }).encode()
    url = args.base_url.rstrip("/") + "/api/home-lab-next/calculate"
    lock = threading.Lock()
    report = {
        "environment": {
            "python": platform.python_version(),
            "platform": platform.platform(),
            "target": args.base_url,
            "server_pid": args.server_pid,
        },
        "profile": {
            "requests_per_user": args.requests_per_user,
            "think_ms": args.think_ms,
            "timeout_seconds": args.timeout_seconds,
            "stop_error_rate": args.max_error_rate,
        },
        "steps": [],
    }

    for users in (int(value) for value in args.users.split(",")):
        latencies: list[float] = []
        errors: list[str] = []
        max_rss = rss_mib(args.server_pid)
        stop_sampling = threading.Event()

        def sample_memory() -> None:
            nonlocal max_rss
            while not stop_sampling.wait(0.05):
                value = rss_mib(args.server_pid)
                if value is not None:
                    max_rss = max(value, max_rss or value)

        sampler = threading.Thread(target=sample_memory, daemon=True)
        sampler.start()

        def simulated_user(_user_id: int) -> None:
            for _ in range(args.requests_per_user):
                started = time.perf_counter()
                error = None
                try:
                    request = urllib.request.Request(
                        url,
                        data=body,
                        headers={"Content-Type": "application/x-www-form-urlencoded"},
                    )
                    with urllib.request.urlopen(request, timeout=args.timeout_seconds) as response:
                        payload = response.read()
                        if response.status != 200 or b'"primary_specific_kwh_m2"' not in payload:
                            error = f"unexpected response {response.status}"
                except Exception as exc:  # noqa: BLE001 - load result captures failures
                    error = f"{type(exc).__name__}: {exc}"
                with lock:
                    latencies.append((time.perf_counter() - started) * 1000)
                    if error:
                        errors.append(error)
                time.sleep(args.think_ms / 1000)

        started = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=users) as executor:
            list(executor.map(simulated_user, range(users)))
        elapsed = time.perf_counter() - started
        stop_sampling.set()
        sampler.join()
        error_rate = len(errors) / max(len(latencies), 1)
        step = {
            "users": users,
            "requests": len(latencies),
            "elapsed_seconds": round(elapsed, 3),
            "requests_per_second": round(len(latencies) / elapsed, 2),
            "p50_ms": round(percentile(latencies, 0.50), 2),
            "p95_ms": round(percentile(latencies, 0.95), 2),
            "p99_ms": round(percentile(latencies, 0.99), 2),
            "error_count": len(errors),
            "error_rate": round(error_rate, 6),
            "server_max_rss_mib": None if max_rss is None else round(max_rss, 2),
            "error_sample": errors[:3],
        }
        report["steps"].append(step)
        if error_rate > args.max_error_rate:
            report["stopped_early"] = True
            break

    print(json.dumps(report, indent=2))
    return 1 if report.get("stopped_early") else 0


if __name__ == "__main__":
    raise SystemExit(main())
