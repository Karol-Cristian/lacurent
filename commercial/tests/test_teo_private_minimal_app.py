from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

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
