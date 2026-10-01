from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
PREPARED_SRC = ROOT / ".wrangler" / "teo-worker" / "src"
sys.path.insert(0, str(PREPARED_SRC))

from app.teo_service import app  # noqa: E402


def form_data() -> dict[str, str]:
    return {
        "project_name": "TEO private service smoke",
        "locality": "Cluj-Napoca",
        "heated_floor_area_m2": "160",
        "heated_volume_m3": "432",
        "indoor_design_temperature_c": "20",
        "building_type": "residential_individual",
        "construction_year": "2004",
        "solar_gains_kwh_m2_month": "1.2",
        "wall_area_m2": "168",
        "wall_u_value": "0.42",
        "roof_area_m2": "92",
        "roof_u_value": "0.24",
        "floor_area_m2": "80",
        "floor_u_value": "0.36",
        "floor_boundary_type": "ground",
        "ground_exposed_perimeter_m": "36",
        "ground_wall_thickness_m": "0.30",
        "ground_conductivity_w_mk": "2.0",
        "window_area_m2": "24",
        "window_u_value": "1.35",
        "door_area_m2": "3.2",
        "door_u_value": "1.7",
        "thermal_bridge_length_m": "42",
        "thermal_bridge_psi_w_mk": "0.05",
        "air_changes_per_hour": "0.5",
        "infiltration_air_changes_per_hour": "0.25",
        "heat_recovery_efficiency": "0",
        "heating_system_type": "condensing_gas_boiler",
        "heating_efficiency": "0.94",
        "heating_scop": "3.2",
        "heating_carrier": "natural_gas",
        "cooling_enabled": "on",
        "cooling_seer": "3.6",
        "cooling_setpoint_c": "26",
        "dhw_enabled": "on",
        "dhw_occupants": "4",
        "dhw_litres_per_person_day_at_60c": "50",
        "dhw_efficiency": "0.86",
        "dhw_carrier": "natural_gas",
        "_optimization_mode": "auto_economic",
        "_optimizer_run_id": "teo-private-service-smoke",
    }


def require_ok(response, stage: str) -> dict:
    if response.status_code != 200:
        raise AssertionError(
            f"{stage} returned HTTP {response.status_code}: {response.text[:4000]}"
        )
    payload = response.json()
    if payload.get("error"):
        raise AssertionError(f"{stage} returned error: {payload}")
    return payload


client = TestClient(app)
form = form_data()

health = require_ok(client.get("/health"), "health")
assert health["service"] == "lacurent-teo-private"

v4 = require_ok(
    client.post("/api/optimization/home-lab/v4/plan", data=form),
    "v4-plan",
)
assert v4["optimizerVersion"] == "teo-v4-browser"
assert int(v4["searchPointCount"]) >= 2000

v3 = require_ok(
    client.post("/api/optimization/home-lab/v3/plan", data=form),
    "v3-plan",
)
search_points = list(v3.get("searchPoints") or [])
branch_ids = list(v3.get("runBranchIds") or [])
branch_batch_size = max(1, int(v3.get("branchBatchSize") or 1))
assert search_points and branch_ids

candidate_rows: list[dict] = []
branch_stats: list[dict] = []
branch_fast_evaluations = 0
for branch_id in branch_ids:
    branch = require_ok(
        client.post(
            "/api/optimization/home-lab/v3/branch",
            json={
                "form": form,
                "branchId": branch_id,
                "runId": form["_optimizer_run_id"],
                "batch": search_points[: min(branch_batch_size, len(search_points))],
            },
        ),
        f"v3-branch-{branch_id}",
    )
    candidates = list(branch.get("candidates") or [])
    branch_fast_evaluations += int(branch.get("fastEvaluations") or 0)
    branch_stats.append(
        {
            "branchId": branch_id,
            "evaluatedCandidates": int(branch.get("fastEvaluations") or 0),
            "acceptedCandidates": len(candidates),
            "feasibleCandidates": len(candidates),
        }
    )
    if candidates:
        candidate_rows.append(
            {"branchId": branch_id, "candidate": candidates[0]}
        )
    if len(candidate_rows) >= 3:
        break

assert candidate_rows, "V3 branch evaluation produced no candidates"

verification_plan = require_ok(
    client.post(
        "/api/optimization/home-lab/v3/verification-plan",
        json={"form": form, "candidateRows": candidate_rows},
    ),
    "verification-plan",
)
targets = list(verification_plan.get("targets") or [])
assert targets

verified_rows: list[dict] = []
for target in targets[:2]:
    verified = require_ok(
        client.post(
            "/api/optimization/home-lab/v3/verify",
            headers={"x-lacurent-flow-gated": "1"},
            json={
                "form": form,
                "branchId": target["branchId"],
                "candidate": target["candidate"],
                "runId": form["_optimizer_run_id"],
            },
        ),
        "verify",
    )
    assert verified["optimizerVersion"] == "v4-adaptive"
    assert verified.get("candidate")
    verified_rows.append(verified)

verify_soak_runs = max(1, int(os.getenv("TEO_PRIVATE_VERIFY_SOAK_RUNS", "10")))
verify_digests: set[str] = set()
soak_target = targets[0]
for index in range(verify_soak_runs):
    verified = require_ok(
        client.post(
            "/api/optimization/home-lab/v3/verify",
            headers={"x-lacurent-flow-gated": "1"},
            json={
                "form": form,
                "branchId": soak_target["branchId"],
                "candidate": soak_target["candidate"],
                "runId": f"{form['_optimizer_run_id']}-soak-{index}",
            },
        ),
        f"verify-soak-{index + 1}",
    )
    candidate_json = json.dumps(
        verified["candidate"],
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    verify_digests.add(hashlib.sha256(candidate_json).hexdigest())

assert len(verify_digests) == 1, (
    "Canonical VERIFY became non-deterministic across a reused private TEO service."
)

commercial_rows: list[dict] = []
for verified in verified_rows[:1]:
    product = require_ok(
        client.post(
            "/api/optimization/home-lab/v3/product",
            json={
                "form": form,
                "branchId": verified["branchId"],
                "candidate": verified["candidate"],
                "sourceCandidateId": verified.get("sourceCandidateId") or "",
            },
        ),
        "product",
    )
    commercial_rows.append(product)

finalized = require_ok(
    client.post(
        "/api/optimization/home-lab/v3/finalize",
        json={
            "form": form,
            "commercialRows": commercial_rows,
            "verifiedRows": verified_rows,
            "branchStats": branch_stats,
            "branchPlan": v3.get("branches") or [],
            "representativeEvaluations": int(v3.get("representativeEvaluations") or 0),
            "branchFastEvaluations": branch_fast_evaluations,
            "sourceCandidateCount": len(candidate_rows),
            "searchPointCount": int(v3.get("searchPointCount") or 0),
            "branchBatchSize": int(v3.get("branchBatchSize") or 0),
            "verificationFrontierCount": int(
                verification_plan.get("frontierCount") or 0
            ),
            "productTargetCount": len(commercial_rows),
            "productFailureCount": 0,
            "runId": form["_optimizer_run_id"],
        },
    ),
    "finalize",
)
assert finalized.get("scenario")
assert finalized.get("optimization")
assert finalized["optimization"]["fullEngineVerifications"] == len(verified_rows)

print(
    json.dumps(
        {
            "status": "PASS",
            "v4SearchPointCount": int(v4["searchPointCount"]),
            "verifiedFinalists": len(verified_rows),
            "verifySoakRuns": verify_soak_runs,
            "verifySemanticDigests": len(verify_digests),
            "commercialRows": len(commercial_rows),
            "finalEnergyKwh": finalized["scenario"].get("final_energy_kwh"),
        },
        indent=2,
    )
)
