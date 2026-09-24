from __future__ import annotations

from fastapi.testclient import TestClient

from commercial.app.engine import demo_building
from commercial.app.main import app, form_values_from_building


client = TestClient(app)


def _form_payload() -> dict[str, str]:
    values = form_values_from_building(demo_building())
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


def test_home_lab_auto_optimizer_returns_report_payload_and_traceability() -> None:
    payload = _form_payload()
    payload["_optimization_mode"] = "auto_economic"

    response = client.post("/api/optimization/home-lab", data=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["scenario"]["annual_cost_lei"] is not None

    meta = body["optimization"]
    assert meta["kind"] == "parametric_economic"
    assert meta["economicMode"] == "auto_economic"
    assert 1 <= meta["evaluatedCandidates"] <= 24
    assert meta["feasibleCandidates"] >= 1
    assert meta["paretoSolutions"] >= 1
    assert isinstance(meta["rawSolution"], dict)
    assert "commercialReady" in meta
    assert "commercialMessage" in meta


def test_home_lab_bill_target_uses_exactly_that_economic_mode() -> None:
    payload = _form_payload()
    payload["_optimization_mode"] = "annual_bill_target"
    payload["_annual_bill_target_lei"] = "6000"

    response = client.post("/api/optimization/home-lab", data=payload)

    # A target can legitimately be infeasible in the bounded search; both
    # outcomes must remain explicitly tied to the selected single constraint.
    assert response.status_code in {200, 422}
    body = response.json()
    if response.status_code == 200:
        assert body["optimization"]["economicMode"] == "annual_bill_target"
        assert body["optimization"]["rawEvaluation"]["annualBillLei"] <= 6000 + 0.01
    else:
        assert "error" in body
        assert body.get("evaluated_candidates", 0) >= 1
