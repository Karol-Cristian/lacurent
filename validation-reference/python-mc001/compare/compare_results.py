"""Three-way P3V differential comparator.

The comparator treats committed fixed expected values as an independent oracle.
Python-vs-JavaScript agreement alone is not sufficient for a pass.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURE_DIR = PACKAGE_ROOT / "fixtures"
EXPECTED_DIR = PACKAGE_ROOT / "expected"
NODE_RUNNER = PACKAGE_ROOT / "compare" / "run_lacurent_runtime.mjs"
PYTHON_RUNNER = PACKAGE_ROOT / "compare" / "run_reference.py"

if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from mc001_reference.models import TOLERANCE_POLICY  # noqa: E402

IGNORE_PATHS = {"engine"}


def load_json(path: str | Path) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def run_json(command: list[str], cwd: Path) -> Any:
    result = subprocess.run(
        command,
        cwd=str(cwd),
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={**os.environ, "PYTHONPATH": str(PACKAGE_ROOT)},
    )
    return json.loads(result.stdout)


def run_python_reference(fixture_path: Path, engine: str = "python_reference") -> Any:
    return run_json(
        [sys.executable, str(PYTHON_RUNNER), str(fixture_path), "--engine", engine],
        PACKAGE_ROOT,
    )


def run_lacurent_runtime(fixture_path: Path) -> Any:
    return run_json(["node", str(NODE_RUNNER), str(fixture_path)], REPO_ROOT)


def expected_path_for_fixture(fixture_path: Path) -> Path:
    stem = fixture_path.stem
    return EXPECTED_DIR / f"{stem}_expected.json"


def flatten(value: Any, prefix: str = "") -> dict[str, Any]:
    if isinstance(value, dict):
        flattened: dict[str, Any] = {}
        for key in sorted(value):
            path = f"{prefix}.{key}" if prefix else key
            flattened.update(flatten(value[key], path))
        return flattened
    if isinstance(value, list):
        flattened = {}
        for index, item in enumerate(value):
            flattened.update(flatten(item, f"{prefix}[{index}]"))
        return flattened
    return {prefix: value}


def quantity_class(path: str, left: Any, right: Any) -> str:
    if isinstance(left, bool) or isinstance(right, bool):
        return "identifier"
    if not isinstance(left, (int, float)) or not isinstance(right, (int, float)):
        return "identifier"
    key = path.lower()
    if "lambda" in key:
        return "lambda_w_mk"
    if "resistance" in key or "m2k_w" in key:
        return "resistance_m2k_w"
    if "u_value" in key:
        return "u_value_w_m2k"
    if "temperature" in key:
        return "temperature_c"
    if "kwh" in key:
        return "energy_kwh"
    if (
        "htr" in key
        or "hve" in key
        or key.endswith("_w_k")
        or "contribution_w_k" in key
        or "element_w_k" in key
        or "bridge_w_k" in key
        or "total_w_k" in key
    ):
        return "coefficient_w_k"
    if (
        "gamma" in key
        or "eta" in key
        or "a_cred" in key
        or key.endswith(".a_h")
        or key.endswith(".a_c")
        or key.endswith(".tau_h")
        or key.endswith(".tau_c")
        or "factor" in key
        or "duration_hours" in key
        or "area_m2" in key
        or "thickness_m" in key
        or "length_m" in key
        or "psi_w_mk" in key
        or "chi_w_k" in key
    ):
        return "ratio"
    return "energy_kwh"


def compare_scalar(path: str, left: Any, right: Any) -> dict[str, Any]:
    qclass = quantity_class(path, left, right)
    if qclass == "identifier":
        return {
            "path": path,
            "quantity_class": qclass,
            "left": left,
            "right": right,
            "absolute_difference": None,
            "relative_difference": None,
            "tolerance": {"absolute": 0.0, "relative": 0.0},
            "status": "PASS" if left == right else "FAIL",
        }

    tolerance = TOLERANCE_POLICY[qclass]
    left_number = float(left)
    right_number = float(right)
    absolute = abs(left_number - right_number)
    scale = max(abs(left_number), abs(right_number), 1.0)
    relative = absolute / scale
    allowed = max(tolerance.absolute_tolerance, tolerance.relative_tolerance * scale)
    return {
        "path": path,
        "quantity_class": qclass,
        "left": left_number,
        "right": right_number,
        "absolute_difference": absolute,
        "relative_difference": relative,
        "tolerance": {
            "absolute": tolerance.absolute_tolerance,
            "relative": tolerance.relative_tolerance,
        },
        "status": "PASS" if absolute <= allowed else "FAIL",
    }


def compare_pair(name: str, left: Any, right: Any, left_label: str, right_label: str) -> dict[str, Any]:
    left_flat = flatten(left)
    right_flat = flatten(right)
    field_results: list[dict[str, Any]] = []
    for path in sorted((set(left_flat) | set(right_flat)) - IGNORE_PATHS):
        if path not in left_flat:
            field_results.append({
                "path": path,
                "quantity_class": "schema",
                "left": None,
                "right": right_flat[path],
                "absolute_difference": None,
                "relative_difference": None,
                "tolerance": None,
                "status": "FAIL",
                "reason": f"missing in {left_label}",
            })
            continue
        if path not in right_flat:
            field_results.append({
                "path": path,
                "quantity_class": "schema",
                "left": left_flat[path],
                "right": None,
                "absolute_difference": None,
                "relative_difference": None,
                "tolerance": None,
                "status": "FAIL",
                "reason": f"unexpected in {left_label}",
            })
            continue
        field_results.append(compare_scalar(path, left_flat[path], right_flat[path]))

    failures = [item for item in field_results if item["status"] != "PASS"]
    return {
        "name": name,
        "left_label": left_label,
        "right_label": right_label,
        "status": "PASS" if not failures else "FAIL",
        "field_count": len(field_results),
        "failure_count": len(failures),
        "failures": failures,
        "fields": field_results,
    }


def compact_comparison(comparison: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in comparison.items()
        if key != "fields"
    }


def run_three_way_for_fixture(fixture_path: Path, include_fields: bool = False) -> dict[str, Any]:
    expected_path = expected_path_for_fixture(fixture_path)
    if not expected_path.exists():
        raise FileNotFoundError(f"Missing fixed expected file: {expected_path}")
    expected = load_json(expected_path)
    python_result = run_python_reference(fixture_path)
    runtime_result = run_lacurent_runtime(fixture_path)
    comparisons = [
        compare_pair("fixed_expected_vs_python", expected, python_result, "fixed_expected", "python_reference"),
        compare_pair("fixed_expected_vs_lacurent_runtime", expected, runtime_result, "fixed_expected", "lacurent_runtime"),
        compare_pair("python_reference_vs_lacurent_runtime", python_result, runtime_result, "python_reference", "lacurent_runtime"),
    ]
    if not include_fields:
        comparisons = [compact_comparison(item) for item in comparisons]
    status = "PASS" if all(item["status"] == "PASS" for item in comparisons) else "FAIL"
    return {
        "fixture_id": expected["fixture"]["fixture_id"],
        "fixture_file": str(fixture_path.relative_to(PACKAGE_ROOT)),
        "expected_file": str(expected_path.relative_to(PACKAGE_ROOT)),
        "status": status,
        "comparisons": comparisons,
    }


def all_fixture_paths() -> list[Path]:
    return sorted(FIXTURE_DIR.glob("rb*.json"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("fixture", nargs="?", help="Fixture JSON path")
    parser.add_argument("--all", action="store_true", help="Run all committed RB fixtures")
    parser.add_argument("--include-fields", action="store_true", help="Include every field comparison in output")
    parser.add_argument("--write-json", help="Optional output JSON file")
    args = parser.parse_args(argv)

    if args.all:
        fixture_paths = all_fixture_paths()
    elif args.fixture:
        fixture_paths = [Path(args.fixture).resolve()]
    else:
        parser.error("provide a fixture path or --all")

    results = [run_three_way_for_fixture(path, include_fields=args.include_fields) for path in fixture_paths]
    output = {
        "schema": "p3v.differential_report.v1",
        "status": "PASS" if all(item["status"] == "PASS" for item in results) else "FAIL",
        "fixture_count": len(results),
        "results": results,
    }
    serialized = json.dumps(output, indent=2, sort_keys=True)
    if args.write_json:
        Path(args.write_json).write_text(f"{serialized}\n", encoding="utf-8")
    else:
        sys.stdout.write(f"{serialized}\n")
    return 0 if output["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
