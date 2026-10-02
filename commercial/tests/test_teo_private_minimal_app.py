from __future__ import annotations

import asyncio
import json
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

from fastapi import Request
from fastapi.testclient import TestClient

from commercial.app.engine import demo_building
from commercial.app.models import model_to_dict
from commercial.app.optimization import (
    CandidateEvaluationV1,
    OptimizationMode,
    OptimizationRequestV1,
    ParametricMeasuresV1,
)
import commercial.app.teo_app as teo_app
from commercial.app.teo_app import app


ROOT = Path(__file__).resolve().parents[2]
client = TestClient(app)

BASE_FORM = {
    "project_name": "TEO minimal worker regression",
    "locality_id": "siruta-54984",
    "locality": "Cluj-Napoca",
    "heated_floor_area_m2": "120",
    "heated_volume_m3": "324",
    "indoor_design_temperature_c": "21",
    "building_type": "residential_individual",
    "construction_year": "2005",
    "wall_area_m2": "140",
    "wall_u_value": "0.45",
    "roof_area_m2": "70",
    "roof_u_value": "0.25",
    "floor_area_m2": "60",
    "floor_u_value": "0.36",
    "floor_boundary_type": "ground",
    "window_area_m2": "20",
    "window_u_value": "1.4",
    "door_area_m2": "3",
    "door_u_value": "1.7",
    "air_changes_per_hour": "0.5",
    "infiltration_air_changes_per_hour": "0.15",
    "heating_system_type": "condensing_gas_boiler",
    "heating_efficiency": "0.94",
    "heating_carrier": "natural_gas",
    "_optimization_mode": "auto_economic",
}


def test_teo_private_import_graph_does_not_load_public_app() -> None:
    probe = (
        "import sys; "
        "import commercial.app.teo_app; "
        "assert 'commercial.app.main' not in sys.modules; "
        "assert 'commercial.app.account' not in sys.modules; "
        "assert 'commercial.app.impact' not in sys.modules; "
        "assert 'commercial.app.energy_product_teo_adapter' not in sys.modules"
    )
    subprocess.run(
        [sys.executable, "-c", probe],
        cwd=ROOT,
        check=True,
    )


def test_teo_private_bundle_is_strict_and_ui_free() -> None:
    subprocess.run(
        ["node", "scripts/prepare-teo-cloudflare-worker.mjs"],
        cwd=ROOT,
        check=True,
    )
    bundle = ROOT / ".wrangler" / "teo-worker"
    app_dir = bundle / "src" / "app"

    assert (bundle / "src" / "worker.py").read_text(encoding="utf-8").find(
        "from app.teo_app import app"
    ) >= 0
    assert "from app.main import app" not in (
        bundle / "src" / "worker.py"
    ).read_text(encoding="utf-8")

    assert not (bundle / "src" / "static").exists()
    assert not (bundle / "src" / "templates").exists()

    forbidden = {
        "main.py",
        "account.py",
        "impact.py",
        "energy_product_catalog.py",
        "energy_product_catalog_store.py",
        "energy_product_teo_adapter.py",
        "home_lab_images.py",
    }
    bundled = {item.name for item in app_dir.iterdir() if item.is_file()}
    assert not (bundled & forbidden), bundled & forbidden

    public_worker = (
        ROOT / "commercial" / "cloudflare-worker" / "worker.py"
    ).read_text(encoding="utf-8")
    assert "from app.main import app" in public_worker


def _run_private_teo_flow(run_id: str) -> dict:
    plan_response = client.post(
        "/api/optimization/home-lab/v4/plan",
        data={**BASE_FORM, "_optimizer_run_id": run_id},
    )
    assert plan_response.status_code == 200, plan_response.text
    plan = plan_response.json()
    assert plan["optimizerVersion"] == "teo-v4-browser"
    assert plan["searchPointCount"] == 2064
    assert plan["serverCandidateEvaluations"] == 0
    assert plan["runBranchIds"]

    branch_id = "keep-current-heating"
    assert branch_id in plan["runBranchIds"]

    branch_response = client.post(
        "/api/optimization/home-lab/v3/branch",
        json={
            "form": {**BASE_FORM, "_optimizer_run_id": run_id},
            "branchId": branch_id,
            "runId": run_id,
            "batch": [{}],
        },
    )
    assert branch_response.status_code == 200, branch_response.text
    branch = branch_response.json()
    assert branch["candidateCount"] >= 1
    candidate = branch["candidates"][0]

    verification_plan_response = client.post(
        "/api/optimization/home-lab/v3/verification-plan",
        json={
            "form": {**BASE_FORM, "_optimizer_run_id": run_id},
            "candidateRows": [
                {"branchId": branch_id, "candidate": candidate}
            ],
        },
    )
    assert verification_plan_response.status_code == 200, verification_plan_response.text
    verification_plan = verification_plan_response.json()
    assert verification_plan["targets"]
    target = verification_plan["targets"][0]

    verify_response = client.post(
        "/api/optimization/home-lab/v3/verify",
        headers={"x-lacurent-flow-gated": "1"},
        json={
            "form": {**BASE_FORM, "_optimizer_run_id": run_id},
            "branchId": target["branchId"],
            "candidate": target["candidate"],
            "runId": run_id,
        },
    )
    assert verify_response.status_code == 200, verify_response.text
    verified = verify_response.json()
    assert verified["optimizerVersion"] == "v4-adaptive"
    assert verified["candidate"]["resulting_configuration"] is not None
    assert verified["calculationTimeMs"] >= 0

    finalize_response = client.post(
        "/api/optimization/home-lab/v3/finalize",
        json={
            "form": {**BASE_FORM, "_optimizer_run_id": run_id},
            "runId": run_id,
            "verifiedRows": [
                {
                    "branchId": target["branchId"],
                    "candidate": verified["candidate"],
                    "warnings": verified.get("warnings") or [],
                }
            ],
            "commercialRows": [],
            "branchPlan": plan["branches"],
            "branchStats": [],
            "sourceCandidateCount": 1,
            "representativeEvaluations": 0,
            "branchFastEvaluations": branch.get("fastEvaluations") or 0,
            "searchPointCount": plan["searchPointCount"],
            "branchBatchSize": 1,
            "verificationFrontierCount": verification_plan["frontierCount"],
            "productTargetCount": 0,
            "productFailureCount": 0,
        },
    )
    assert finalize_response.status_code == 200, finalize_response.text
    final = finalize_response.json()
    assert final["scenario"]["energy_class"]
    assert final["optimization"]["optimizerVersion"] == "v3-sharded"
    assert final["optimization"]["fullEngineVerifications"] == 1
    assert final["optimization"]["finalizeRecalculations"] == 0
    return final


def _synthetic_candidate() -> CandidateEvaluationV1:
    baseline = demo_building()
    return CandidateEvaluationV1(
        candidate_id="synthetic-rpc",
        parameters=ParametricMeasuresV1(),
        capex_lei=0.0,
        baseline_annual_bill_lei=12000.0,
        annual_bill_lei=12000.0,
        annual_saving_lei=0.0,
        final_energy_kwh=10000.0,
        primary_specific_kwh_m2=100.0,
        co2_total_kg=1000.0,
        co2_specific_kg_m2=5.0,
        energy_class="B",
        resulting_configuration=baseline,
    )


def test_teo_cloudflare_verify_delegates_to_reference_rbpe(monkeypatch) -> None:
    candidate = _synthetic_candidate()
    optimization_request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.auto_economic,
    )
    calls: list[tuple] = []

    class FakeRbpe:
        async def verify_teo_candidate_json(self, *args):
            calls.append(args)
            return json.dumps(
                {
                    "candidate": model_to_dict(candidate),
                    "branch_id": "keep-current-heating",
                    "annual_bill_delta_lei": 0.0,
                    "design_load_delta_kw": 0.0,
                    "warnings": [],
                }
            )

    def forbidden_local_verify(*args, **kwargs):
        raise AssertionError("Cloudflare VERIFY must not execute local RBPE.")

    monkeypatch.setattr(teo_app, "verify_one_candidate_v3", forbidden_local_verify)
    request = Request(
        {
            "type": "http",
            "headers": [],
            "env": SimpleNamespace(REFERENCE_RBPE=FakeRbpe()),
        }
    )

    payload, execution = asyncio.run(
        teo_app._verify_candidate_via_rbpe(
            request,
            optimization_request=optimization_request,
            fast_candidate=candidate,
            branch_id="keep-current-heating",
            cost_catalog={"source": "test", "costs": {}},
            heating_catalog={"options": []},
            baseline_annual_bill_lei=12000.0,
        )
    )
    assert execution == "private-rbpe-sharded"
    assert payload["candidate"]["candidate_id"] == candidate.candidate_id
    assert len(calls) == 1


def test_teo_cloudflare_product_delegates_to_reference_rbpe(monkeypatch) -> None:
    candidate = _synthetic_candidate()
    calls: list[tuple] = []

    class FakeRbpe:
        async def commercialize_teo_candidate_json(self, *args):
            calls.append(args)
            return json.dumps(
                {
                    "candidate": model_to_dict(candidate),
                    "matchedProduct": None,
                    "matchedProductQuantity": 1,
                    "scenario": None,
                    "heatPumpPerformanceProfile": None,
                    "warnings": [],
                }
            )

    def forbidden_local_product(*args, **kwargs):
        raise AssertionError("Cloudflare PRODUCT must not execute local RBPE.")

    monkeypatch.setattr(teo_app, "commercialize_heating_finalist", forbidden_local_product)
    request = Request(
        {
            "type": "http",
            "headers": [],
            "env": SimpleNamespace(REFERENCE_RBPE=FakeRbpe()),
        }
    )
    payload, execution = asyncio.run(
        teo_app._commercialize_candidate_via_rbpe(
            request,
            candidate=candidate,
            original_building=demo_building(),
            heating_catalog={"options": []},
            branch_id="keep-current-heating",
        )
    )
    assert execution == "private-rbpe-sharded"
    assert payload["candidate"]["candidate_id"] == candidate.candidate_id
    assert len(calls) == 1


def test_teo_rbpe_rpc_contract_is_wired_end_to_end() -> None:
    reference_worker = (
        ROOT / "commercial" / "reference-worker" / "worker.py"
    ).read_text(encoding="utf-8")
    rbpe_router = (
        ROOT / "commercial" / "rbpe-router" / "worker.mjs"
    ).read_text(encoding="utf-8")
    teo_wrangler = (
        ROOT / "commercial" / "teo-worker" / "wrangler.toml"
    ).read_text(encoding="utf-8")

    for method in (
        "verify_teo_candidate_json",
        "commercialize_teo_candidate_json",
    ):
        assert method in reference_worker
        assert method in rbpe_router

    assert 'binding = "REFERENCE_RBPE"' in teo_wrangler
    assert 'service = "lacurent-rbpe-router"' in teo_wrangler


def test_teo_private_plan_verify_finalize_regression() -> None:
    signatures = []
    for ordinal in range(10):
        final = _run_private_teo_flow(f"minimal-regression-{ordinal}")
        signatures.append(
            (
                final["scenario"]["energy_class"],
                round(float(final["scenario"]["annual_cost_lei"]), 6),
                round(float(final["scenario"]["final_energy_kwh"]), 6),
                round(float(final["scenario"]["primary_specific_kwh_m2"]), 6),
                round(float(final["scenario"]["co2_specific_kg_m2"]), 6),
                round(float(final["optimization"]["annualBillLei"]), 6),
            )
        )
    assert len(set(signatures)) == 1
