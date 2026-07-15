"""Metamorphic sensitivity pack for P3V fixtures."""

from __future__ import annotations

import copy
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Callable

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = PACKAGE_ROOT / "compare" / "run_lacurent_runtime.mjs"

if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from mc001_reference.calculator import calculate_building, read_fixture  # noqa: E402


def _find_by_id(items: list[dict[str, Any]], key: str, value: str) -> dict[str, Any]:
    for item in items:
        if item.get(key) == value:
            return item
    raise KeyError(value)


def _months(fixture: dict[str, Any], names: set[str]) -> list[dict[str, Any]]:
    return [month for month in fixture["monthly"] if month["month"] in names]


def _run_js(fixture: dict[str, Any]) -> dict[str, Any]:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as handle:
        json.dump(fixture, handle, indent=2, sort_keys=True)
        temp_path = Path(handle.name)
    try:
        result = subprocess.run(
            ["node", str(NODE_RUNNER), str(temp_path)],
            cwd=str(REPO_ROOT),
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env={**os.environ, "PYTHONPATH": str(PACKAGE_ROOT)},
        )
        return json.loads(result.stdout)
    finally:
        temp_path.unlink(missing_ok=True)


def _run_both(fixture: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        "python": calculate_building(fixture, engine="python_reference"),
        "javascript": _run_js(fixture),
    }


def _metric(result: dict[str, Any], metric_path: str) -> float:
    value: Any = result
    for part in metric_path.split("."):
        value = value[part]
    return float(value)


def _direction(delta: float) -> str:
    if delta > 0:
        return "increase"
    if delta < 0:
        return "decrease"
    return "unchanged"


def _branches(result: dict[str, Any]) -> list[tuple[str, str, str]]:
    return [
        (month["month"], month["heating_branch"], month["cooling_branch"])
        for month in result["monthly"]
    ]


def _applicability(result: dict[str, Any]) -> list[tuple[str, bool, bool]]:
    return [
        (month["month"], month["heating_applicable"], month["cooling_applicable"])
        for month in result["monthly"]
    ]


def _status_for_direction(actual: str, expected: str) -> str:
    return "PASS" if actual == expected else "FAIL"


def _mutation(
    fixture_name: str,
    mutation_id: str,
    description: str,
    metric_path: str,
    expected_direction: str,
    mutate: Callable[[dict[str, Any]], None],
    affected_dependencies: list[str],
) -> dict[str, Any]:
    fixture_path = PACKAGE_ROOT / "fixtures" / fixture_name
    baseline_fixture = read_fixture(fixture_path)
    mutated_fixture = copy.deepcopy(baseline_fixture)
    mutate(mutated_fixture)
    baseline = _run_both(baseline_fixture)
    mutated = _run_both(mutated_fixture)
    engine_results = {}
    for engine in ("python", "javascript"):
      baseline_value = _metric(baseline[engine], metric_path)
      mutated_value = _metric(mutated[engine], metric_path)
      delta = mutated_value - baseline_value
      actual_direction = _direction(delta)
      engine_results[engine] = {
          "baseline": baseline_value,
          "mutated": mutated_value,
          "delta": delta,
          "direction": actual_direction,
          "status": _status_for_direction(actual_direction, expected_direction),
          "branch_stability": "PASS" if _branches(baseline[engine]) == _branches(mutated[engine]) else "CHANGED",
          "applicability_stability": "PASS" if _applicability(baseline[engine]) == _applicability(mutated[engine]) else "FAIL",
      }
    status = "PASS" if all(item["status"] == "PASS" and item["applicability_stability"] == "PASS" for item in engine_results.values()) else "FAIL"
    return {
        "mutation_id": mutation_id,
        "fixture": baseline_fixture["fixture_id"],
        "description": description,
        "metric": metric_path,
        "expected_direction": expected_direction,
        "affected_dependencies": affected_dependencies,
        "unaffected_dependencies": ["fixture identity", "monthly applicability flags"],
        "status": status,
        "engines": engine_results,
    }


def run_sensitivity_pack() -> dict[str, Any]:
    mutations = [
        _mutation(
            "rb001.json",
            "increase_eps_thickness",
            "Increase RB-001 EPS intervention thickness by 0.05 m",
            "annual.q_hnd_kwh",
            "decrease",
            lambda fixture: _find_by_id(
                _find_by_id(fixture["assemblies"], "assembly_id", "wall_masonry_eps")["layers"],
                "layer_id",
                "eps_intervention",
            ).update({"thickness_m": 0.15}),
            ["assembly resistance", "U-value", "Htr", "monthly heating transfer"],
        ),
        _mutation(
            "rb001.json",
            "increase_material_lambda",
            "Increase RB-001 EPS design lambda by 25 percent",
            "annual.q_hnd_kwh",
            "increase",
            lambda fixture: fixture["materials"]["eps"].update({"lambda_w_mk": fixture["materials"]["eps"]["lambda_w_mk"] * 1.25}),
            ["material lambda", "layer resistance", "U-value", "Htr"],
        ),
        _mutation(
            "rb001.json",
            "increase_wall_area",
            "Increase RB-001 exterior wall area by 10 percent",
            "annual.q_hnd_kwh",
            "increase",
            lambda fixture: _find_by_id(fixture["envelope"]["elements"], "element_id", "exterior_walls").update({"area_m2": 143}),
            ["element contribution", "Hd", "Htr"],
        ),
        _mutation(
            "rb002.json",
            "increase_high_u_window_area",
            "Increase RB-002 legacy high-U window area by 20 percent",
            "annual.q_hnd_kwh",
            "increase",
            lambda fixture: _find_by_id(fixture["envelope"]["elements"], "element_id", "windows").update({"area_m2": 28.8}),
            ["window element contribution", "Hd", "Htr"],
        ),
        _mutation(
            "rb002.json",
            "improve_window_u",
            "Improve RB-002 legacy window U-value from 2.8 to 2.1 W/m2K",
            "annual.q_hnd_kwh",
            "decrease",
            lambda fixture: _find_by_id(fixture["assemblies"], "assembly_id", "window_legacy_double").update({"direct_u_w_m2k": 2.1}),
            ["direct U override", "window element contribution", "Hd"],
        ),
        _mutation(
            "rb001.json",
            "add_positive_thermal_bridge",
            "Add a positive RB-001 linear thermal bridge",
            "annual.q_hnd_kwh",
            "increase",
            lambda fixture: fixture["envelope"].setdefault("linear_bridges", []).append({
                "bridge_id": "added_positive_bridge",
                "component": "Hd",
                "length_m": 10,
                "psi_w_mk": 0.1,
                "source_reference": "RB-001.bridge.added_positive_bridge",
            }),
            ["thermal bridge contribution", "Hd", "Htr"],
        ),
        _mutation(
            "rb001.json",
            "remove_positive_thermal_bridge",
            "Remove RB-001 canopy point bridge",
            "annual.q_hnd_kwh",
            "decrease",
            lambda fixture: fixture["envelope"].update({
                "point_bridges": [
                    bridge for bridge in fixture["envelope"].get("point_bridges", [])
                    if bridge["bridge_id"] != "canopy_anchor"
                ]
            }),
            ["thermal bridge contribution", "Hd", "Htr"],
        ),
        _mutation(
            "rb001.json",
            "increase_ventilation",
            "Increase RB-001 monthly ventilation airflow by 25 percent",
            "annual.q_hnd_kwh",
            "increase",
            lambda fixture: [
                month["ventilation"].update({"airflow_m3s": month["ventilation"]["airflow_m3s"] * 1.25})
                for month in fixture["monthly"]
            ],
            ["Hve", "monthly ventilation transfer"],
        ),
        _mutation(
            "rb001.json",
            "increase_winter_solar_gains",
            "Increase RB-001 December-January-February direct solar gains by 25 percent",
            "annual.q_hnd_kwh",
            "decrease",
            lambda fixture: [
                month.update({"solar_gains_kwh": month["solar_gains_kwh"] * 1.25})
                for month in _months(fixture, {"december", "january", "february"})
            ],
            ["monthly gains", "gammaH", "QHnd"],
        ),
        _mutation(
            "rb003.json",
            "increase_summer_solar_gains",
            "Increase RB-003 June-July-August direct solar gains by 15 percent",
            "annual.q_cnd_kwh",
            "increase",
            lambda fixture: [
                month.update({"solar_gains_kwh": month["solar_gains_kwh"] * 1.15})
                for month in _months(fixture, {"june", "july", "august"})
            ],
            ["monthly gains", "gammaC", "QCnd"],
        ),
    ]
    return {
        "schema": "p3v.sensitivity_report.v1",
        "status": "PASS" if all(item["status"] == "PASS" for item in mutations) else "FAIL",
        "mutation_count": len(mutations),
        "mutations": mutations,
    }


if __name__ == "__main__":
    sensitivity_report = run_sensitivity_pack()
    print(json.dumps(sensitivity_report, indent=2, sort_keys=True))
    raise SystemExit(0 if sensitivity_report["status"] == "PASS" else 1)
