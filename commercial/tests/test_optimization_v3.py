from __future__ import annotations

from commercial.app.engine import demo_building
from commercial.app.optimization import (
    CandidateEvaluationV1,
    OptimizationMode,
    OptimizationRequestV1,
    OptimizationSearchBoundsV1,
    ParametricMeasuresV1,
)
from commercial.app.optimization_v3 import (
    V3_BRANCH_BATCH_SIZE,
    V3_HALTON_SAMPLES,
    V3_VERIFICATION_MAX,
    V3_VERIFICATION_MIN,
    build_verification_plan_v3,
    build_worker_safe_plan_v3,
    low_discrepancy_measures_v3,
    verify_one_candidate_v3,
)


def _catalog() -> dict:
    return {
        "source": "test",
        "catalog_version": "test-v3",
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


def _synthetic(candidate_id: str, capex: float, bill: float) -> CandidateEvaluationV1:
    baseline_bill = 12000.0
    saving = baseline_bill - bill
    return CandidateEvaluationV1(
        candidate_id=candidate_id,
        parameters=ParametricMeasuresV1(),
        capex_lei=capex,
        baseline_annual_bill_lei=baseline_bill,
        annual_bill_lei=bill,
        annual_saving_lei=saving,
        payback_years=(capex / saving if capex > 0 and saving > 0 else None),
        roi_percent_per_year=(100.0 * saving / capex if capex > 0 else None),
        final_energy_kwh=10000.0,
        primary_specific_kwh_m2=100.0,
        co2_total_kg=1000.0,
        co2_specific_kg_m2=5.0,
        energy_class="B",
        resulting_configuration=demo_building(),
    )


def test_v3_halton_is_deterministic_and_seven_dimensional() -> None:
    bounds = OptimizationSearchBoundsV1()
    first = low_discrepancy_measures_v3(bounds, sample_count=V3_HALTON_SAMPLES)
    second = low_discrepancy_measures_v3(bounds, sample_count=V3_HALTON_SAMPLES)

    assert first == second
    assert len(first) == V3_HALTON_SAMPLES
    assert len({item.model_dump_json() for item in first}) == V3_HALTON_SAMPLES
    assert any(item.wall_added_r_m2k_w > 0 for item in first)
    assert any(item.roof_added_r_m2k_w > 0 for item in first)
    assert any(item.floor_added_r_m2k_w > 0 for item in first)
    assert any(item.window_replacement_fraction > 0 for item in first)
    assert any(item.ventilation_heat_recovery_efficiency_target > 0 for item in first)
    assert any(item.pv_added_kwp > 0 for item in first)
    assert any(item.solar_thermal_added_m2 > 0 for item in first)


def test_v3_plan_expands_search_but_keeps_worker_batches_bounded() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.auto_economic,
    )
    plan = build_worker_safe_plan_v3(
        request,
        bounds=OptimizationSearchBoundsV1(),
        catalog=_catalog(),
    )

    assert plan.search_method == "deterministic_axis_halton_sharded_v3"
    assert plan.branch_batch_size == V3_BRANCH_BATCH_SIZE
    assert plan.representative_evaluations == 0
    assert plan.representative_pool_size == 0
    assert plan.deterministic_axis_points == 15
    assert plan.base_shortlist_size == plan.deterministic_axis_points
    assert len(plan.search_points) == 40
    assert plan.low_discrepancy_points == V3_HALTON_SAMPLES


def test_v3_verification_budget_adapts_between_four_and_eight() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.auto_economic,
    )
    candidates = [
        _synthetic(f"c{index}", capex=1000.0 + 900.0 * index, bill=11000.0 - 350.0 * index)
        for index in range(10)
    ]
    branch_ids = {
        item.candidate_id: "keep-current-heating"
        for item in candidates
    }

    plan = build_verification_plan_v3(
        request,
        candidates=candidates,
        candidate_branch_ids=branch_ids,
    )

    assert V3_VERIFICATION_MIN <= plan.requested_count <= V3_VERIFICATION_MAX
    assert plan.requested_count == len(plan.candidates)
    assert plan.frontier_count >= 1
    assert set(plan.candidate_branch_ids) == {
        item.candidate_id for item in plan.candidates
    }


def test_v3_verify_work_unit_recalculates_one_candidate_only() -> None:
    request = OptimizationRequestV1(
        baseline=demo_building(),
        mode=OptimizationMode.auto_economic,
    )
    fast_candidate = _synthetic("fast", capex=0.0, bill=12000.0)

    verified = verify_one_candidate_v3(
        request,
        fast_candidate=fast_candidate,
        branch_id="keep-current-heating",
        catalog=_catalog(),
    )

    assert verified.branch_id == "keep-current-heating"
    assert verified.candidate.resulting_configuration is not None
    assert verified.candidate.candidate_id
    assert verified.annual_bill_delta_lei >= 0
    assert verified.design_load_delta_kw >= 0
