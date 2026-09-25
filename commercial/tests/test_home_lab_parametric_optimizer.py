from __future__ import annotations

import json

from fastapi.testclient import TestClient

from commercial.app.main import app, default_form_values


client = TestClient(app)


def _form_payload() -> dict[str, str]:
    values = default_form_values()
    payload: dict[str, str] = {}
    for key, value in values.items():
        if value is None:
            payload[key] = ""
        elif value is True:
            payload[key] = "on"
        elif value is False:
            payload[key] = ""
        else:
            payload[key] = str(value)
    return payload


def _run_sharded(payload: dict[str, str]) -> tuple[dict, dict]:
    plan_response = client.post("/api/optimization/home-lab/plan", data=payload)
    assert plan_response.status_code == 200
    plan = plan_response.json()
    assert plan["evaluationsPerBranch"] == 24
    assert plan["runBranchIds"]

    results = [
        {
            "branch": branch,
            "selection": {"selected": None},
            "candidateCount": 0,
            "parametricEvaluations": 0,
            "calculationTimeMs": 0,
            "warnings": [],
        }
        for branch in plan["branches"]
        if not branch["eligible"]
    ]
    for branch_id in plan["runBranchIds"]:
        branch_payload = dict(payload)
        branch_payload["_heating_branch_id"] = branch_id
        response = client.post(
            "/api/optimization/home-lab/branch",
            data=branch_payload,
        )
        assert response.status_code == 200
        body = response.json()
        assert body["branch"]["branch_id"] == branch_id
        assert body["parametricEvaluations"] <= 24
        results.append(body)

    finalize_payload = dict(payload)
    finalize_payload["_branch_results_json"] = json.dumps(results)
    finalize_response = client.post(
        "/api/optimization/home-lab/finalize",
        data=finalize_payload,
    )
    assert finalize_response.status_code in {200, 422}
    return plan, finalize_response.json()


def test_home_lab_auto_optimizer_runs_sharded_and_returns_traceability() -> None:
    payload = _form_payload()
    payload["_optimization_mode"] = "auto_economic"

    plan, body = _run_sharded(payload)

    assert "error" not in body
    assert body["scenario"]["annual_cost_lei"] is not None
    meta = body["optimization"]
    assert meta["kind"] == "parametric_economic"
    assert meta["economicMode"] == "auto_economic"
    assert meta["executionMode"] == "sharded_by_heating_branch"
    assert meta["parametricEvaluations"] >= 24
    assert meta["heatingBranchEvaluations"] >= 0
    assert len(meta["heatingBranches"]) == len(plan["branches"])
    assert meta["feasibleCandidates"] >= 1
    assert meta["paretoSolutions"] >= 1
    assert meta["paretoScope"] == "branch_finalists"
    assert isinstance(meta["rawSolution"], dict)
    assert "commercialReady" in meta
    assert "commercialMessage" in meta
    assert "selectedHeating" in meta


def test_home_lab_bill_target_sharded_mode_preserves_constraint() -> None:
    payload = _form_payload()
    payload["_optimization_mode"] = "annual_bill_target"
    payload["_annual_bill_target_lei"] = "6000"

    _, body = _run_sharded(payload)

    if "error" not in body:
        assert body["optimization"]["economicMode"] == "annual_bill_target"
        assert body["optimization"]["rawEvaluation"]["annualBillLei"] <= 6000 + 0.01
    else:
        assert "solu" in body["error"].lower() or "ramur" in body["error"].lower()


def test_legacy_monolithic_optimizer_refuses_multi_branch_execution() -> None:
    payload = _form_payload()
    payload["_optimization_mode"] = "auto_economic"

    response = client.post("/api/optimization/home-lab", data=payload)

    assert response.status_code == 409
    body = response.json()
    assert body["requiresShardedExecution"] is True
    assert len(body["runBranchIds"]) > 1
    assert "Reîncarcă pagina" in body["error"]
