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
    CandidateEvaluationV1,
    ParametricMeasuresV1,
)
from commercial.app.optimization_v2 import evaluate_worker_safe_branch_v2
from commercial.app.optimization_v3 import build_verification_plan_v3
from commercial.app.pricing import estimate_energy_cost
from commercial.app.teo_v4 import build_teo_v4_kernel
from commercial.app.models import BuildingInput


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




def test_teo_v4_browser_worker_generates_full_search_grid_locally() -> None:
    bounds = OptimizationSearchBoundsV1()
    bounds_payload = (
        bounds.model_dump()
        if hasattr(bounds, "model_dump")
        else bounds.dict()
    )

    worker_result = _run_worker(
        {
            "type": "run",
            "kernel": {"branches": []},
            "searchSpec": {
                "version": "teo-v4-local-halton-1",
                "haltonSamples": 2048,
                "haltonStartIndex": 1,
                "haltonBases": [2, 3, 5, 7, 11, 13, 17],
                "axisLevels": [0.5, 1.0],
                "dimensions": 7,
                "includeOrigin": True,
                "includeMaxCorner": True,
            },
            "searchBounds": bounds_payload,
            "branchIds": [],
            "mode": "auto_economic",
            "goals": {},
            "baselineAnnualBillLei": 0,
        }
    )

    assert worker_result["searchGeneration"] == "browser"
    assert worker_result["searchPointCount"] == 2064
    assert worker_result["deterministicAxisPoints"] == 15
    assert worker_result["lowDiscrepancyPoints"] == 2048
    assert worker_result["maxCornerPoints"] == 1
    assert worker_result["globalEvaluations"] == 0


def test_teo_v4_browser_worker_refines_locally_when_bounds_are_supplied() -> None:
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
    bounds = OptimizationSearchBoundsV1()
    bounds_payload = (
        bounds.model_dump()
        if hasattr(bounds, "model_dump")
        else bounds.dict()
    )
    seed = ParametricMeasuresV1(
        wall_added_r_m2k_w=1.0,
        roof_added_r_m2k_w=1.0,
        pv_added_kwp=1.0,
    )
    seed_payload = (
        seed.model_dump()
        if hasattr(seed, "model_dump")
        else seed.dict()
    )

    worker_result = _run_worker(
        {
            "type": "run",
            "kernel": kernel,
            "searchPoints": [seed_payload],
            "searchBounds": bounds_payload,
            "branchIds": ["keep-current-heating"],
            "mode": "auto_economic",
            "goals": {},
            "baselineAnnualBillLei": float(baseline_cost["priced_total_lei"]),
        }
    )

    assert worker_result["searchMethod"] == "teo_v4_halton_plus_local_refinement"
    assert worker_result["globalEvaluations"] == 1
    assert worker_result["refinementEvaluations"] > 0
    assert worker_result["sourceCandidateCount"] > 1
    assert worker_result["candidateRows"]


def test_teo_v4_browser_verification_plan_matches_python_canonical_ranking() -> None:
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
    bounds = OptimizationSearchBoundsV1()
    bounds_payload = (
        bounds.model_dump()
        if hasattr(bounds, "model_dump")
        else bounds.dict()
    )
    search_points = []
    for index in range(1, 65):
        fraction = index / 64
        measure = ParametricMeasuresV1(
            wall_added_r_m2k_w=float(bounds.wall_added_r_m2k_w_max) * fraction,
            roof_added_r_m2k_w=float(bounds.roof_added_r_m2k_w_max) * ((index % 17) / 16),
            pv_added_kwp=float(bounds.pv_added_kwp_max) * ((index % 13) / 12),
            window_replacement_fraction=float(bounds.window_replacement_fraction_max) * ((index % 7) / 6),
        )
        search_points.append(
            measure.model_dump()
            if hasattr(measure, "model_dump")
            else measure.dict()
        )

    worker_result = _run_worker(
        {
            "type": "run",
            "kernel": kernel,
            "searchPoints": search_points,
            "searchBounds": bounds_payload,
            "branchIds": ["keep-current-heating"],
            "mode": "auto_economic",
            "goals": {},
            "baselineAnnualBillLei": float(baseline_cost["priced_total_lei"]),
        }
    )

    rows = worker_result["candidateRows"]
    assert rows
    assert 1 <= len(worker_result["verificationRows"]) <= 8

    candidates = [
        CandidateEvaluationV1(**row["candidate"])
        for row in rows
    ]
    branch_ids = {
        row["candidate"]["candidate_id"]: row["branchId"]
        for row in rows
    }
    request = OptimizationRequestV1(
        baseline=baseline,
        mode=OptimizationMode.auto_economic,
    )
    python_plan = build_verification_plan_v3(
        request,
        candidates=candidates,
        candidate_branch_ids=branch_ids,
    )

    browser_ids = [
        row["candidate"]["candidate_id"]
        for row in worker_result["verificationRows"]
    ]
    python_ids = [item.candidate_id for item in python_plan.candidates]
    assert worker_result["frontierCount"] == python_plan.frontier_count
    assert browser_ids == python_ids


def test_teo_v4_browser_matches_python_with_household_pv_economics() -> None:
    baseline_raw = (
        demo_building().model_dump()
        if hasattr(demo_building(), "model_dump")
        else demo_building().dict()
    )
    baseline_raw["renewables"]["pv"].update(
        {
            "household_electricity_kwh_year": 5000,
            "export_credit_lei_per_kwh": 0.25,
        }
    )
    baseline = BuildingInput(**baseline_raw)
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
    measures = ParametricMeasuresV1(pv_added_kwp=3.0)
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
        heating_catalog={"options": [], "parametric_heating_nodes": []},
        baseline_annual_bill_lei=float(baseline_cost["priced_total_lei"]),
    )
    assert len(python_result.candidates) == 1

    worker_result = _run_worker(
        {
            "type": "run",
            "kernel": kernel,
            "searchPoints": [
                measures.model_dump()
                if hasattr(measures, "model_dump")
                else measures.dict()
            ],
            "branchIds": ["keep-current-heating"],
            "mode": "auto_economic",
            "goals": {},
            "baselineAnnualBillLei": float(baseline_cost["priced_total_lei"]),
        }
    )
    browser = worker_result["candidateRows"][0]["candidate"]
    canonical = python_result.candidates[0]

    assert browser["annual_bill_lei"] == pytest.approx(
        canonical.annual_bill_lei,
        abs=2.0,
    )
    assert browser["final_energy_kwh"] == pytest.approx(
        canonical.final_energy_kwh,
        abs=5.0,
    )


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
