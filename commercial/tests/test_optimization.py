from __future__ import annotations

import math

import pytest

import commercial.app.optimization as optimization_module
from fastapi.testclient import TestClient
from pydantic import ValidationError

from commercial.app.cost_curves import build_wall_product_cost_curve
from commercial.app.engine import calculate, demo_building
from commercial.app.main import app
from commercial.app.models import model_to_dict
from commercial.app.product_matching import WallInsulationProductV1
from commercial.app.optimization import (
    CandidateEvaluationV1,
    OptimizationMode,
    OptimizationRequestV1,
    OptimizationSearchRequestV1,
    ParametricMeasuresV1,
    apply_parametric_measures,
    evaluate_parametric_candidate,
    compact_refinement_candidate,
    refinement_seed_from_compact,
    parametric_capex,
    run_parametric_optimization,
    select_optimization_candidate,
)


def _catalog() -> dict:
    return {
        "source": "test",
        "catalog_version": "test-v1",
        "costs": {
            "wall": {"cost_lei": 16, "unit": "lei_per_m2_per_cm"},
            "roof": {"cost_lei": 8, "unit": "lei_per_m2_per_cm"},
            "floor": {"cost_lei": 11, "unit": "lei_per_m2_per_cm"},
            "windows": {"cost_lei": 1000, "unit": "lei_per_m2"},
            "ventilation": {"cost_lei": 8000, "unit": "lei_total"},
            "pv": {"cost_lei": 4000, "unit": "lei_per_kwp"},
            "solar_thermal": {"cost_lei": 2650, "unit": "lei_per_m2"},
        },
    }


def _synthetic(
    candidate_id: str,
    *,
    capex: float,
    bill: float,
    saving: float,
    payback: float | None,
) -> CandidateEvaluationV1:
    baseline = demo_building()
    return CandidateEvaluationV1(
        candidate_id=candidate_id,
        parameters=ParametricMeasuresV1(),
        capex_lei=capex,
        baseline_annual_bill_lei=bill + saving,
        annual_bill_lei=bill,
        annual_saving_lei=saving,
        payback_years=payback,
        roi_percent_per_year=(100 * saving / capex if capex else None),
        final_energy_kwh=10000,
        primary_specific_kwh_m2=100,
        co2_total_kg=1000,
        co2_specific_kg_m2=5,
        energy_class="B",
        resulting_configuration=baseline,
    )


def test_optimization_request_accepts_only_one_user_constraint() -> None:
    baseline = demo_building()

    request = OptimizationRequestV1(
        baseline=baseline,
        mode=OptimizationMode.investment_budget,
        investment_budget_lei=25000,
    )
    assert request.investment_budget_lei == 25000

    with pytest.raises(ValidationError):
        OptimizationRequestV1(
            baseline=baseline,
            mode=OptimizationMode.investment_budget,
            investment_budget_lei=25000,
            max_payback_years=7,
        )

    with pytest.raises(ValidationError):
        OptimizationRequestV1(
            baseline=baseline,
            mode=OptimizationMode.annual_bill_target,
        )

    auto = OptimizationRequestV1(
        baseline=baseline,
        mode=OptimizationMode.auto_economic,
    )
    assert auto.investment_budget_lei is None

    with pytest.raises(ValidationError):
        OptimizationRequestV1(
            baseline=baseline,
            mode=OptimizationMode.auto_economic,
            annual_bill_target_lei=4000,
        )


def test_added_wall_r_is_applied_directly_to_whole_wall_u() -> None:
    baseline = demo_building()
    measures = ParametricMeasuresV1(wall_added_r_m2k_w=2.5)

    candidate, warnings = apply_parametric_measures(baseline, measures)
    original_wall = next(
        item for item in baseline.envelope if item.type.value == "exterior_wall"
    )
    new_wall = next(
        item for item in candidate.envelope if item.type.value == "exterior_wall"
    )

    expected_u = 1.0 / (1.0 / original_wall.u_value_w_m2k + 2.5)
    assert new_wall.u_value_w_m2k == pytest.approx(expected_u)
    assert model_to_dict(baseline) != model_to_dict(candidate)
    assert warnings == []


def test_ventilation_heat_recovery_is_a_raw_optimizer_variable() -> None:
    baseline = demo_building()
    measures = ParametricMeasuresV1(
        ventilation_heat_recovery_efficiency_target=0.75,
    )

    candidate, warnings = apply_parametric_measures(baseline, measures)

    assert candidate.ventilation.heat_recovery_efficiency == pytest.approx(0.75)
    assert candidate.ventilation.air_changes_per_hour == pytest.approx(
        baseline.ventilation.air_changes_per_hour
    )
    assert any("Ventilation heat recovery is optimized" in item for item in warnings)

    baseline_result = calculate(baseline, include_reference=False)
    capex, lines, cost_warnings = parametric_capex(
        baseline_result,
        measures,
        _catalog(),
    )
    ventilation_line = next(item for item in lines if item.family == "ventilation")
    assert capex == pytest.approx(8000)
    assert ventilation_line.parameter_value == pytest.approx(0.75)
    assert ventilation_line.parameter_unit == "heat_recovery_efficiency_target"
    assert any("optimizerul variază parametrul fizic" in item for item in cost_warnings)


def test_wall_capex_is_continuous_in_added_r_not_commercial_steps() -> None:
    baseline = demo_building()
    result = calculate(baseline, include_reference=False)
    measures = ParametricMeasuresV1(wall_added_r_m2k_w=2.375)

    capex, lines, warnings = parametric_capex(result, measures, _catalog())

    # Wall normalization lambda is 0.040 W/mK in methodology.json.
    expected_cm = 2.375 * 0.040 * 100
    expected = result.envelope_geometry.net_wall_area_m2 * expected_cm * 16
    assert capex == pytest.approx(expected, abs=0.01)
    assert lines[0].parameter_unit == "m2K/W_added"
    assert lines[0].parameter_value == pytest.approx(2.375)
    assert any("product discretization" in item for item in warnings)


def test_partial_window_replacement_uses_area_weighted_effective_u() -> None:
    baseline = demo_building()
    measures = ParametricMeasuresV1(
        window_replacement_fraction=0.5,
        window_target_u_w_m2k=0.9,
    )

    candidate, warnings = apply_parametric_measures(baseline, measures)
    original = next(item for item in baseline.envelope if item.type.value == "window")
    changed = next(item for item in candidate.envelope if item.type.value == "window")

    assert changed.u_value_w_m2k == pytest.approx(
        0.5 * original.u_value_w_m2k + 0.5 * 0.9
    )
    assert any("solar transmittance" in item for item in warnings)


def test_candidate_evaluation_recalculates_complete_house() -> None:
    baseline = demo_building()
    candidate = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(
            wall_added_r_m2k_w=1.8,
            pv_added_kwp=1.7,
        ),
        _catalog(),
    )

    assert candidate.capex_lei > 0
    assert candidate.annual_bill_lei >= 0
    assert candidate.final_energy_kwh >= 0
    assert candidate.cost_catalog_version == "test-v1"
    assert candidate.commercialization_status == "pending_product_catalog"
    assert candidate.resulting_configuration is not None
    assert candidate.resulting_configuration.renewables.pv.enabled
    assert candidate.resulting_configuration.renewables.pv.installed_power_kwp == pytest.approx(1.7)


def test_budget_mode_maximizes_saving_without_forcing_full_budget_spend() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.investment_budget,
        investment_budget_lei=10000,
    )
    candidates = [
        _synthetic("A", capex=5000, bill=7000, saving=3000, payback=1.67),
        _synthetic("B", capex=9000, bill=6500, saving=3500, payback=2.57),
        _synthetic("C", capex=12000, bill=5000, saving=5000, payback=2.4),
    ]

    result = select_optimization_candidate(request, candidates)

    assert result.selected is not None
    assert result.selected.candidate_id == "B"
    assert result.feasible_count == 2


def test_bill_target_mode_minimizes_investment() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.annual_bill_target,
        annual_bill_target_lei=5000,
    )
    candidates = [
        _synthetic("A", capex=16000, bill=4900, saving=5100, payback=3.14),
        _synthetic("B", capex=13000, bill=5000, saving=5000, payback=2.6),
        _synthetic("C", capex=9000, bill=5700, saving=4300, payback=2.09),
    ]

    result = select_optimization_candidate(request, candidates)

    assert result.selected is not None
    assert result.selected.candidate_id == "B"


def test_payback_mode_does_not_minimize_payback_itself() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.max_payback_years,
        max_payback_years=5,
    )
    candidates = [
        _synthetic("tiny", capex=1000, bill=9000, saving=1000, payback=1),
        _synthetic("large", capex=9000, bill=2000, saving=8000, payback=1.125),
        _synthetic("slow", capex=30000, bill=1000, saving=9000, payback=6),
    ]

    result = select_optimization_candidate(request, candidates)

    assert result.selected is not None
    assert result.selected.candidate_id == "large"


def test_auto_mode_is_explicit_multi_horizon_not_shortest_payback() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.auto_economic,
    )
    candidates = [
        _synthetic("tiny", capex=1000, bill=9000, saving=1000, payback=1),
        _synthetic("balanced", capex=9000, bill=2000, saving=8000, payback=1.125),
        _synthetic("overbuilt", capex=60000, bill=1000, saving=9000, payback=6.67),
    ]

    result = select_optimization_candidate(request, candidates)

    assert result.selected is not None
    assert result.selected.candidate_id == "balanced"
    assert result.auto_horizons_years == [5, 10, 15, 20, 25]
    assert "does not assume one hidden payback horizon" in result.rationale


client = TestClient(app)


def test_parametric_candidate_api_uses_versioned_cost_catalog() -> None:
    response = client.post(
        "/api/optimization/candidate",
        json={
            "baseline": model_to_dict(demo_building()),
            "measures": {
                "wall_added_r_m2k_w": 1.25,
                "pv_added_kwp": 1.4,
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["candidate_id"].startswith("OPT-")
    assert payload["capex_lei"] > 0
    assert payload["commercialization_status"] == "pending_product_catalog"
    assert payload["cost_source"] == "seed_fallback"
    assert {row["family"] for row in payload["cost_breakdown"]} == {"wall", "pv"}


def test_optimization_select_api_applies_single_requested_policy() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.max_payback_years,
        max_payback_years=4,
    )
    candidates = [
        _synthetic("small", capex=1000, bill=9000, saving=1000, payback=1),
        _synthetic("valuable", capex=12000, bill=3000, saving=7000, payback=1.71),
        _synthetic("too_slow", capex=40000, bill=1000, saving=9000, payback=4.44),
    ]

    response = client.post(
        "/api/optimization/select",
        json={
            "request": model_to_dict(request),
            "candidates": [model_to_dict(item) for item in candidates],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["selected"]["candidate_id"] == "valuable"
    assert payload["feasible_count"] == 2



def test_parametric_search_is_bounded_and_returns_policy_selection() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.investment_budget,
        investment_budget_lei=20000,
    )
    result = run_parametric_optimization(
        OptimizationSearchRequestV1(
            request=request,
            max_evaluations=12,
        ),
        _catalog(),
    )

    assert 1 <= result.evaluated_candidates <= 12
    assert result.selection.selected is not None
    assert result.selection.selected.capex_lei <= 20000 + 0.01
    assert result.search_method == "axis_halton_coordinate_refinement_v1"
    assert result.pareto_candidate_ids


def test_parametric_search_api_returns_raw_solution_and_counts() -> None:
    response = client.post(
        "/api/optimization/run",
        json={
            "request": {
                "baseline": model_to_dict(demo_building()),
                "mode": "annual_bill_target",
                "annual_bill_target_lei": 0,
            },
            "max_evaluations": 12,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert 1 <= payload["evaluated_candidates"] <= 12
    assert payload["selection"]["candidate_count"] == payload["evaluated_candidates"]
    assert payload["search_method"] == "axis_halton_coordinate_refinement_v1"
    assert "commercially discretized" in " ".join(payload["warnings"])



def test_parametric_capex_prefers_complete_product_derived_curve() -> None:
    baseline = demo_building()
    result = calculate(baseline, include_reference=False)
    products = [
        WallInsulationProductV1(
            partner_id="test",
            product_id="wall-100",
            name="Wall 100",
            thickness_mm=100,
            lambda_w_mk=0.040,
            package_area_m2=2,
            price_per_package_lei=100,
            stock_status="in_stock",
        ),
        WallInsulationProductV1(
            partner_id="test",
            product_id="wall-120",
            name="Wall 120",
            thickness_mm=120,
            lambda_w_mk=0.040,
            package_area_m2=2,
            price_per_package_lei=116,
            stock_status="in_stock",
        ),
    ]
    curve = build_wall_product_cost_curve(
        products,
        nonmaterial_installed_cost_per_m2_lei=80,
    )
    catalog = _catalog()
    catalog["parametric_curves"] = {"wall": model_to_dict(curve)}

    capex, lines, warnings = parametric_capex(
        result,
        ParametricMeasuresV1(wall_added_r_m2k_w=2.75),
        catalog,
    )

    expected_per_m2 = 134
    assert capex == pytest.approx(
        result.envelope_geometry.net_wall_area_m2 * expected_per_m2,
        abs=0.01,
    )
    assert lines[0].source_kind == "product_derived_parametric_curve"
    assert not any(item.startswith("wall: CAPEX is a continuous planning curve") for item in warnings)


def test_compact_refinement_seed_matches_full_candidate_selection() -> None:
    baseline = demo_building()
    candidates = [
        _synthetic("A", capex=5000, bill=7800, saving=2200, payback=2.27),
        _synthetic("B", capex=12000, bill=5200, saving=4800, payback=2.50),
        _synthetic("C", capex=23000, bill=3000, saving=7000, payback=3.29),
        _synthetic("D", capex=38000, bill=1800, saving=8200, payback=4.63),
    ]
    for index, candidate in enumerate(candidates, start=1):
        candidate.parameters = ParametricMeasuresV1(
            wall_added_r_m2k_w=float(index),
            window_target_u_w_m2k=0.9,
        )

    requests = [
        OptimizationRequestV1(
            baseline=baseline,
            mode=OptimizationMode.investment_budget,
            investment_budget_lei=20000,
        ),
        OptimizationRequestV1(
            baseline=baseline,
            mode=OptimizationMode.annual_bill_target,
            annual_bill_target_lei=5500,
        ),
        OptimizationRequestV1(
            baseline=baseline,
            mode=OptimizationMode.max_payback_years,
            max_payback_years=3,
        ),
        OptimizationRequestV1(
            baseline=baseline,
            mode=OptimizationMode.auto_economic,
        ),
    ]

    summaries = [compact_refinement_candidate(item) for item in candidates]
    for request in requests:
        full = select_optimization_candidate(request, candidates).selected
        assert full is not None
        compact_seed = refinement_seed_from_compact(request, summaries)
        assert compact_seed is not None
        assert compact_seed.wall_added_r_m2k_w == pytest.approx(
            full.parameters.wall_added_r_m2k_w
        )


def test_optimizer_baseline_cache_reuses_identical_building(monkeypatch: pytest.MonkeyPatch) -> None:
    assert (
        optimization_module._cached_baseline_evaluation_serialized
        .cache_parameters()["maxsize"]
        == 2
    )
    optimization_module._cached_baseline_evaluation_serialized.cache_clear()
    calls = {"count": 0}
    real_calculate = optimization_module.calculate

    def counted_calculate(*args, **kwargs):
        calls["count"] += 1
        return real_calculate(*args, **kwargs)

    monkeypatch.setattr(optimization_module, "calculate", counted_calculate)

    baseline = demo_building()
    first_result, first_cost = optimization_module.cached_baseline_evaluation(baseline)
    second_result, second_cost = optimization_module.cached_baseline_evaluation(baseline)

    assert calls["count"] == 1
    assert first_result.total_final_energy_kwh == pytest.approx(
        second_result.total_final_energy_kwh
    )
    assert first_cost["priced_total_lei"] == pytest.approx(second_cost["priced_total_lei"])

    changed_payload = model_to_dict(baseline)
    changed_payload["indoor_design_temperature_c"] = (
        float(changed_payload["indoor_design_temperature_c"]) + 1.0
    )
    changed = optimization_module.BuildingInput(**changed_payload)
    optimization_module.cached_baseline_evaluation(changed)
    assert calls["count"] == 2

    optimization_module._cached_baseline_evaluation_serialized.cache_clear()
