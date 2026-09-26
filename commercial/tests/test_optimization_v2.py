from __future__ import annotations

import pytest

from commercial.app.engine import calculate, demo_building
from commercial.app.optimization import (
    CandidateEvaluationV1,
    OptimizationMode,
    OptimizationRequestV1,
    OptimizationSearchBoundsV1,
    ParametricMeasuresV1,
    evaluate_parametric_candidate,
)
from commercial.app.optimization_v2 import (
    V2_WORKER_SHORTLIST_LIMIT,
    _fast_engine_candidate,
    axis_probe_measures_v2,
    build_worker_safe_plan_v2,
    evaluate_worker_safe_branch_v2,
    run_physics_informed_optimization,
    select_optimization_candidate_v2,
)
from commercial.app.pricing import estimate_energy_cost


def _catalog() -> dict:
    return {
        "source": "test",
        "catalog_version": "test-v2",
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
) -> CandidateEvaluationV1:
    baseline = demo_building()
    return CandidateEvaluationV1(
        candidate_id=candidate_id,
        parameters=ParametricMeasuresV1(),
        capex_lei=capex,
        baseline_annual_bill_lei=bill + saving,
        annual_bill_lei=bill,
        annual_saving_lei=saving,
        payback_years=(capex / saving if capex > 0 and saving > 0 else None),
        roi_percent_per_year=(100 * saving / capex if capex > 0 else None),
        final_energy_kwh=10000,
        primary_specific_kwh_m2=100,
        co2_total_kg=1000,
        co2_specific_kg_m2=5,
        energy_class="B",
        resulting_configuration=baseline,
    )


def test_worker_safe_v2_uses_pairwise_search_and_eight_slot_shortlist() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.auto_economic,
    )
    plan = build_worker_safe_plan_v2(
        request,
        bounds=OptimizationSearchBoundsV1(),
        catalog=_catalog(),
    )

    assert V2_WORKER_SHORTLIST_LIMIT == 8
    assert plan.search_method == "physics_informed_marginal_pairwise_worker_safe_v2"
    assert 1 <= len(plan.shortlist) <= V2_WORKER_SHORTLIST_LIMIT
    assert plan.representative_evaluations >= 15
    assert plan.representative_pool_size >= len(plan.shortlist)


def test_v2_axis_probe_covers_all_seven_dimensions_symmetrically() -> None:
    bounds = OptimizationSearchBoundsV1()
    rows = axis_probe_measures_v2(bounds)

    assert len(rows) == 15

    assert any(item.wall_added_r_m2k_w == pytest.approx(bounds.wall_added_r_m2k_w_max) for item in rows)
    assert any(item.roof_added_r_m2k_w == pytest.approx(bounds.roof_added_r_m2k_w_max) for item in rows)
    assert any(item.floor_added_r_m2k_w == pytest.approx(bounds.floor_added_r_m2k_w_max) for item in rows)
    assert any(item.window_replacement_fraction == pytest.approx(1.0) for item in rows)
    assert any(
        item.ventilation_heat_recovery_efficiency_target
        == pytest.approx(bounds.ventilation_heat_recovery_efficiency_target_max)
        for item in rows
    )
    assert any(item.pv_added_kwp == pytest.approx(bounds.pv_added_kwp_max) for item in rows)
    assert any(
        item.solar_thermal_added_m2
        == pytest.approx(bounds.solar_thermal_added_m2_max)
        for item in rows
    )


def test_v2_fast_kernel_matches_canonical_engine_for_candidate_economics() -> None:
    baseline = demo_building()
    baseline_result = calculate(baseline, include_reference=False)
    baseline_cost = estimate_energy_cost(baseline_result)
    measures = ParametricMeasuresV1(
        wall_added_r_m2k_w=1.5,
        roof_added_r_m2k_w=2.0,
        ventilation_heat_recovery_efficiency_target=0.55,
        pv_added_kwp=2.0,
        solar_thermal_added_m2=2.0,
    )

    fast = _fast_engine_candidate(
        baseline,
        measures,
        _catalog(),
        baseline_result=baseline_result,
        baseline_cost=baseline_cost,
    )
    full = evaluate_parametric_candidate(
        baseline,
        measures,
        _catalog(),
        baseline_result=baseline_result,
        baseline_cost=baseline_cost,
    )

    assert fast.annual_bill_lei == pytest.approx(full.annual_bill_lei, abs=0.05)
    assert fast.annual_saving_lei == pytest.approx(full.annual_saving_lei, abs=0.05)
    assert fast.design_heat_load_kw == pytest.approx(full.design_heat_load_kw, abs=0.001)
    assert fast.primary_specific_kwh_m2 == pytest.approx(full.primary_specific_kwh_m2, abs=0.01)
    assert fast.energy_class == full.energy_class


def test_v2_auto_mode_uses_magnitude_aware_robust_regret() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.auto_economic,
    )
    candidates = [
        _synthetic("small", capex=1000, bill=9000, saving=1000),
        _synthetic("balanced", capex=6000, bill=7000, saving=3000),
        _synthetic("deep", capex=30000, bill=4000, saving=6000),
    ]

    result = select_optimization_candidate_v2(request, candidates)

    assert result.selected is not None
    assert result.selected.candidate_id == "balanced"
    assert "regret" in result.rationale.lower()
    assert result.auto_horizons_years == [5, 10, 15, 20, 25]


def test_v2_bounds_full_engine_verification_count() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.auto_economic,
    )

    result = run_physics_informed_optimization(
        request,
        bounds=OptimizationSearchBoundsV1(),
        catalog=_catalog(),
        shortlist_limit=4,
        verification_limit=3,
    )

    assert result.selection.selected is not None
    assert result.fast_evaluations > result.full_engine_evaluations
    assert result.full_engine_evaluations <= 3
    assert result.shortlist_size <= 4
    assert result.search_method == "physics_informed_marginal_pareto_v2"
    assert any("marginal-value ladder" in item for item in result.warnings)



def test_worker_safe_v2_bounds_representative_search_and_shortlist() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.auto_economic,
    )
    plan = build_worker_safe_plan_v2(
        request,
        bounds=OptimizationSearchBoundsV1(),
        catalog=_catalog(),
        shortlist_limit=6,
    )

    assert plan.shortlist
    assert len(plan.shortlist) <= 6
    # 15 symmetric axis probes + at most 14 marginal-ladder steps
    # + at most 6 bounded pairwise interaction probes.
    assert plan.representative_evaluations <= 35
    assert plan.representative_pool_size >= len(plan.shortlist)
    assert plan.search_method == "physics_informed_marginal_pairwise_worker_safe_v2"


def test_worker_safe_v2_evaluates_only_shared_shortlist_per_branch() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.auto_economic,
    )
    plan = build_worker_safe_plan_v2(
        request,
        bounds=OptimizationSearchBoundsV1(),
        catalog=_catalog(),
        shortlist_limit=4,
    )
    branch_id = next(
        item.branch_id
        for item in plan.branches
        if item.eligible and item.economic_eligible
    )

    result = evaluate_worker_safe_branch_v2(
        request,
        branch_id=branch_id,
        shortlist=plan.shortlist,
        bounds=OptimizationSearchBoundsV1(),
        catalog=_catalog(),
    )

    assert result.candidates
    assert result.fast_evaluations <= len(plan.shortlist)
    assert len(result.candidates) <= len(plan.shortlist)
    assert result.branch.branch_id == branch_id
