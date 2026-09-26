from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from commercial.app.engine import calculate, demo_building
from commercial.app.main import roi_cost_basis_seed
from commercial.app.optimization import (
    OptimizationMode,
    OptimizationRequestV1,
    OptimizationSearchBoundsV1,
    ParametricMeasuresV1,
)
from commercial.app.optimization_v2 import evaluate_worker_safe_branch_v2
from commercial.app.pricing import estimate_energy_cost
from commercial.app.teo_v4 import build_teo_v4_kernel


ROOT = Path(__file__).resolve().parents[2]
WORKER = ROOT / "commercial" / "static" / "teo-v4-worker.js"


def _run_worker(payload: dict) -> dict:
    harness = r"""
const fs = require("fs");
const vm = require("vm");
const input = JSON.parse(fs.readFileSync(0, "utf8"));
let terminal = null;
global.self = {
  postMessage(message) {
    if (message && (message.type === "done" || message.type === "error")) {
      terminal = message;
    }
  }
};
const source = fs.readFileSync(input.workerPath, "utf8");
vm.runInThisContext(source, {filename: input.workerPath});
self.onmessage({data: input.payload});
if (!terminal) {
  throw new Error("TEO V4 worker did not emit a terminal message.");
}
process.stdout.write(JSON.stringify(terminal));
"""
    process = subprocess.run(
        ["node", "-e", harness],
        input=json.dumps(
            {
                "workerPath": str(WORKER),
                "payload": payload,
            }
        ),
        text=True,
        capture_output=True,
        check=True,
        cwd=ROOT,
    )
    message = json.loads(process.stdout)
    assert message["type"] == "done", message
    return message


def _signature(measures: dict) -> tuple[float, ...]:
    return (
        float(measures.get("wall_added_r_m2k_w") or 0),
        float(measures.get("roof_added_r_m2k_w") or 0),
        float(measures.get("floor_added_r_m2k_w") or 0),
        float(measures.get("window_replacement_fraction") or 0),
        float(measures.get("ventilation_heat_recovery_efficiency_target") or 0),
        float(measures.get("pv_added_kwp") or 0),
        float(measures.get("solar_thermal_added_m2") or 0),
    )


@pytest.mark.parametrize(
    "measures",
    [
        ParametricMeasuresV1(),
        ParametricMeasuresV1(
            wall_added_r_m2k_w=1.0,
            pv_added_kwp=1.0,
        ),
        ParametricMeasuresV1(
            roof_added_r_m2k_w=1.0,
            ventilation_heat_recovery_efficiency_target=0.5,
        ),
    ],
)
def test_teo_v4_browser_kernel_tracks_python_fast_kernel(measures: ParametricMeasuresV1) -> None:
    baseline = demo_building()
    baseline_result = calculate(baseline, include_reference=False)
    baseline_cost = estimate_energy_cost(baseline_result)
    assert baseline_cost["complete"]

    catalog = roi_cost_basis_seed()
    kernel = build_teo_v4_kernel(
        baseline,
        baseline_result,
        cost_catalog=catalog,
        branch_catalogs={"keep-current-heating": {}},
    )
    request = OptimizationRequestV1(
        baseline=baseline,
        mode=OptimizationMode.auto_economic,
    )
    python_result = evaluate_worker_safe_branch_v2(
        request,
        branch_id="keep-current-heating",
        shortlist=[measures],
        bounds=OptimizationSearchBoundsV1(),
        catalog=catalog,
        heating_catalog={
            "options": [],
            "parametric_heating_nodes": [],
        },
        baseline_annual_bill_lei=float(baseline_cost["priced_total_lei"]),
    )
    assert len(python_result.candidates) == 1
    canonical_fast = python_result.candidates[0]

    worker_result = _run_worker(
        {
            "type": "run",
            "kernel": kernel,
            "searchPoints": [
                (
                    measures.model_dump()
                    if hasattr(measures, "model_dump")
                    else measures.dict()
                )
            ],
            "branchIds": ["keep-current-heating"],
            "mode": "auto_economic",
            "goals": {},
            "baselineAnnualBillLei": float(baseline_cost["priced_total_lei"]),
        }
    )
    assert worker_result["sourceCandidateCount"] == 1
    browser_fast = worker_result["candidateRows"][0]["candidate"]

    assert _signature(browser_fast["parameters"]) == pytest.approx(
        _signature(
            measures.model_dump()
            if hasattr(measures, "model_dump")
            else measures.dict()
        )
    )
    assert browser_fast["annual_bill_lei"] == pytest.approx(
        canonical_fast.annual_bill_lei,
        abs=2.0,
    )
    assert browser_fast["design_heat_load_kw"] == pytest.approx(
        canonical_fast.design_heat_load_kw,
        abs=0.03,
    )
    assert browser_fast["final_energy_kwh"] == pytest.approx(
        canonical_fast.final_energy_kwh,
        abs=5.0,
    )
    assert browser_fast["capex_lei"] == pytest.approx(
        canonical_fast.capex_lei,
        abs=2.0,
    )
