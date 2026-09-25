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
    assert plan["searchPhases"] == ["axis", "halton", "refine"]
    assert plan["evaluationsPerPhase"] == 12
    assert plan["microBatchSize"] == 4
    assert plan["phaseOffsets"] == [0, 4, 8]
    assert plan["evaluationsPerBranch"] == 36
    assert plan["runBranchIds"]

    results = [
        {
            "branch": branch,
            "selection": {"selected": None},
            "candidates": [],
            "candidateCount": 0,
            "parametricEvaluations": 0,
            "calculationTimeMs": 0,
            "warnings": [],
        }
        for branch in plan["branches"]
        if not branch["eligible"]
    ]

    for branch_id in plan["runBranchIds"]:
        prior_candidates: list[dict] = []
        for phase in plan["searchPhases"]:
            fixed_seed = list(prior_candidates) if phase == "refine" else []
            phase_summaries: list[dict] = []
            for phase_offset in plan["phaseOffsets"]:
                response = client.post(
                    "/api/optimization/home-lab/branch",
                    json={
                        "form": dict(payload),
                        "branchId": branch_id,
                        "searchPhase": phase,
                        "phaseOffset": phase_offset,
                        "priorCandidates": fixed_seed,
                    },
                )
                assert response.status_code == 200
                body = response.json()
                assert body["branch"]["branch_id"] == branch_id
                assert body["searchPhase"] == phase
                assert body["phaseOffset"] == phase_offset
                assert 0 <= body["parametricEvaluations"] <= plan["microBatchSize"]
                assert isinstance(body["candidates"], list)
                results.append(body)
                assert isinstance(body["candidateSummaries"], list)
                assert all("resulting_configuration" not in item for item in body["candidateSummaries"])
                phase_summaries.extend(body["candidateSummaries"])
            prior_candidates.extend(phase_summaries)

        assert len(prior_candidates) >= 18

    finalize_response = client.post(
        "/api/optimization/home-lab/finalize",
        json={
            "form": dict(payload),
            "branchResults": results,
        },
    )
    assert finalize_response.status_code in {200, 422}
    return plan, finalize_response.json()


def test_home_lab_auto_optimizer_runs_phased_and_returns_traceability() -> None:
    payload = _form_payload()
    payload["_optimization_mode"] = "auto_economic"

    plan, body = _run_sharded(payload)

    assert "error" not in body
    assert body["scenario"]["annual_cost_lei"] is not None
    meta = body["optimization"]
    assert meta["kind"] == "parametric_economic"
    assert meta["economicMode"] == "auto_economic"
    assert meta["executionMode"] == "sharded_by_heating_branch"
    assert meta["parametricEvaluations"] >= 36
    assert meta["heatingBranchEvaluations"] >= 0
    assert len(meta["heatingBranches"]) == len(plan["branches"])
    assert meta["feasibleCandidates"] >= 1
    assert meta["paretoSolutions"] >= 1
    assert meta["paretoScope"] == "all_phased_candidates"
    assert isinstance(meta["rawSolution"], dict)
    assert "commercialReady" in meta
    assert "commercialMessage" in meta
    assert "selectedHeating" in meta


def test_home_lab_bill_target_phased_mode_preserves_constraint() -> None:
    payload = _form_payload()
    payload["_optimization_mode"] = "annual_bill_target"
    payload["_annual_bill_target_lei"] = "6000"

    _, body = _run_sharded(payload)

    if "error" not in body:
        assert body["optimization"]["economicMode"] == "annual_bill_target"
        assert body["optimization"]["rawEvaluation"]["annualBillLei"] <= 6000 + 0.01
    else:
        assert "solu" in body["error"].lower() or "ramur" in body["error"].lower()


def test_branch_endpoint_rejects_old_unphased_client() -> None:
    payload = _form_payload()
    payload["_optimization_mode"] = "auto_economic"
    payload["_heating_branch_id"] = "keep-current-heating"

    response = client.post("/api/optimization/home-lab/branch", data=payload)

    assert response.status_code == 409
    body = response.json()
    assert body["requiresPhasedExecution"] is True
    assert "Reîncarcă pagina" in body["error"]


def test_legacy_monolithic_optimizer_refuses_multi_branch_execution() -> None:
    payload = _form_payload()
    payload["_optimization_mode"] = "auto_economic"

    response = client.post("/api/optimization/home-lab", data=payload)

    assert response.status_code == 409
    body = response.json()
    assert body["requiresShardedExecution"] is True
    assert len(body["runBranchIds"]) > 1
    assert "Reîncarcă pagina" in body["error"]


def test_refinement_payload_is_compact_and_seedable() -> None:
    payload = _form_payload()
    payload["_optimization_mode"] = "auto_economic"

    summaries: list[dict] = []
    for phase in ("axis", "halton"):
        for phase_offset in (0, 4, 8):
            response = client.post(
                "/api/optimization/home-lab/branch",
                json={
                    "form": dict(payload),
                    "branchId": "electric-boiler",
                    "searchPhase": phase,
                    "phaseOffset": phase_offset,
                    "priorCandidates": [],
                },
            )
            assert response.status_code == 200
            body = response.json()
            assert isinstance(body["candidateSummaries"], list)
            for item in body["candidateSummaries"]:
                assert set(item) == {
                    "candidate_id",
                    "parameters",
                    "capex_lei",
                    "annual_bill_lei",
                    "annual_saving_lei",
                    "payback_years",
                }
                assert "resulting_configuration" not in item
            summaries.extend(body["candidateSummaries"])

    encoded = json.dumps(summaries)
    assert len(encoded) < 50000

    refine = client.post(
        "/api/optimization/home-lab/branch",
        json={
            "form": dict(payload),
            "branchId": "electric-boiler",
            "searchPhase": "refine",
            "phaseOffset": 0,
            "priorCandidates": summaries,
        },
    )
    assert refine.status_code == 200
    assert refine.json()["searchPhase"] == "refine"
