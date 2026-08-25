"""Black-box JS/Python differential harness for the P11 engine contract."""

from __future__ import annotations

import argparse
import copy
import json
import os
import random
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent
P3V_ROOT = REPO_ROOT / "validation-reference" / "python-mc001"
JS_RUNNER = P3V_ROOT / "compare" / "run_lacurent_runtime.mjs"

sys.path.insert(0, str(PACKAGE_ROOT))

from lacurent_engine import build_engine_input_from_p3v_fixture, calculate  # noqa: E402


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def run_js_fixture(fixture: dict[str, Any]) -> dict[str, Any]:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as handle:
        json.dump(fixture, handle)
        temp_path = Path(handle.name)
    try:
        result = subprocess.run(
            ["node", str(JS_RUNNER), str(temp_path)],
            cwd=str(REPO_ROOT),
            text=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=os.environ.copy(),
        )
        return json.loads(result.stdout)
    finally:
        temp_path.unlink(missing_ok=True)


def compare_fixture(fixture: dict[str, Any], name: str, tolerance: float = 1e-7) -> dict[str, Any]:
    python_result = calculate(build_engine_input_from_p3v_fixture(fixture))
    js_result = run_js_fixture(fixture)
    rows = []
    for path, left, right in [
        ("annual.q_hnd_kwh", python_result["chapter2"]["annual"]["qHndKWh"], js_result["annual"]["q_hnd_kwh"]),
        ("annual.q_cnd_kwh", python_result["chapter2"]["annual"]["qCndKWh"], js_result["annual"]["q_cnd_kwh"]),
    ]:
        delta = abs(float(left) - float(right))
        rows.append({
            "path": path,
            "python": left,
            "javascript": right,
            "absoluteDifference": delta,
            "status": "PASS" if delta <= tolerance else "FAIL",
        })
    return {
        "case": name,
        "status": "PASS" if all(row["status"] == "PASS" for row in rows) else "FAIL",
        "comparisons": rows,
        "pythonRuntimeMs": python_result.get("performance", {}).get("runtimeMs"),
    }


def mutate_fixture(base: dict[str, Any], rng: random.Random, index: int) -> dict[str, Any]:
    fixture = copy.deepcopy(base)
    fixture["fixture_id"] = f"RB-RANDOM-{index:03d}"
    area_factor = rng.uniform(0.75, 1.35)
    u_factor = rng.uniform(0.8, 1.25)
    airflow_factor = rng.uniform(0.7, 1.3)
    gains_factor = rng.uniform(0.75, 1.25)
    for element in fixture["envelope"]["elements"]:
        element["area_m2"] = round(element["area_m2"] * area_factor, 6)
    for assembly in fixture["assemblies"]:
        if "direct_u_w_m2k" in assembly:
            assembly["direct_u_w_m2k"] = round(assembly["direct_u_w_m2k"] * u_factor, 6)
    for month in fixture["monthly"]:
        month["ventilation"]["airflow_m3s"] = round(month["ventilation"]["airflow_m3s"] * airflow_factor, 8)
        month["internal_gains_kwh"] = round(month["internal_gains_kwh"] * gains_factor, 6)
        month["solar_gains_kwh"] = round(month["solar_gains_kwh"] * gains_factor, 6)
    return fixture


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--randomized", type=int, default=12, help="Number of deterministic randomized cases")
    parser.add_argument("--seed", type=int, default=1101)
    parser.add_argument("--write-json")
    args = parser.parse_args(argv)

    fixtures = [
        load_json(P3V_ROOT / "fixtures" / "rb001.json"),
        load_json(P3V_ROOT / "fixtures" / "rb002.json"),
        load_json(P3V_ROOT / "fixtures" / "rb003.json"),
    ]
    rng = random.Random(args.seed)
    randomized = [mutate_fixture(fixtures[index % len(fixtures)], rng, index + 1) for index in range(args.randomized)]
    results = [
        *(compare_fixture(fixture, fixture["fixture_id"]) for fixture in fixtures),
        *(compare_fixture(fixture, fixture["fixture_id"]) for fixture in randomized),
    ]
    output = {
        "schema": "lacurent_python_engine_differential_report_v1",
        "status": "PASS" if all(item["status"] == "PASS" for item in results) else "FAIL",
        "goldenFixtureCount": len(fixtures),
        "randomizedCaseCount": len(randomized),
        "results": results,
    }
    serialized = json.dumps(output, indent=2, sort_keys=True)
    if args.write_json:
        Path(args.write_json).write_text(f"{serialized}\n", encoding="utf-8")
    else:
        print(serialized)
    return 0 if output["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
