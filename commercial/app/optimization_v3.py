from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from .heating_optimization import (
    HeatingBranchSummaryV1,
    _rebase_candidate,
    heating_technologies,
)
from .optimization import (
    CandidateEvaluationV1,
    OptimizationRequestV1,
    OptimizationSearchBoundsV1,
    ParametricMeasuresV1,
    _measure_signature,
    _measures_from_normalized,
    cached_baseline_evaluation,
    evaluate_parametric_candidate,
    pareto_frontier,
)
from .optimization_v2 import (
    V2_WORKER_SHORTLIST_LIMIT,
    _branch_baseline,
    _verification_candidates,
    build_worker_safe_plan_v2,
)


V3_HALTON_SAMPLES = 24
V3_BRANCH_BATCH_SIZE = 4
V3_VERIFICATION_MIN = 4
V3_VERIFICATION_MAX = 8
V3_DIMENSIONS = 7
V3_HALTON_BASES = (2, 3, 5, 7, 11, 13, 17)


class WorkerSafePlanV3(BaseModel):
    search_points: list[ParametricMeasuresV1] = Field(default_factory=list)
    branches: list[HeatingBranchSummaryV1] = Field(default_factory=list)
    representative_evaluations: int = 0
    representative_pool_size: int = 0
    base_shortlist_size: int = 0
    low_discrepancy_points: int = 0
    branch_batch_size: int = V3_BRANCH_BATCH_SIZE
    search_method: str = "physics_informed_halton_sharded_v3"


class VerificationPlanV3(BaseModel):
    candidates: list[CandidateEvaluationV1] = Field(default_factory=list)
    candidate_branch_ids: dict[str, str] = Field(default_factory=dict)
    requested_count: int = 0
    frontier_count: int = 0
    source_candidate_count: int = 0
    strategy: str = "adaptive_rank_plus_pareto_v3"


class VerifiedCandidateV3(BaseModel):
    candidate: CandidateEvaluationV1
    branch_id: str
    annual_bill_delta_lei: float = 0.0
    design_load_delta_kw: float = 0.0
    warnings: list[str] = Field(default_factory=list)


def _radical_inverse(index: int, base: int) -> float:
    if index <= 0:
        return 0.0
    inverse = 1.0 / float(base)
    factor = inverse
    value = 0.0
    current = int(index)
    while current > 0:
        current, digit = divmod(current, base)
        value += float(digit) * factor
        factor *= inverse
    return value


def low_discrepancy_measures_v3(
    bounds: OptimizationSearchBoundsV1,
    *,
    sample_count: int = V3_HALTON_SAMPLES,
    start_index: int = 1,
) -> list[ParametricMeasuresV1]:
    """Generate deterministic seven-dimensional Halton coverage.

    These points are intentionally only parameter vectors. They are evaluated
    later in small branch-scoped Worker requests, so search depth can grow
    without increasing the CPU budget of one request.
    """

    rows: list[ParametricMeasuresV1] = []
    seen: set[tuple[float, ...]] = set()
    for sample_offset in range(max(int(sample_count), 0)):
        index = int(start_index) + sample_offset
        vector = [
            _radical_inverse(index, base)
            for base in V3_HALTON_BASES[:V3_DIMENSIONS]
        ]
        measures = _measures_from_normalized(vector, bounds)
        signature = _measure_signature(measures)
        if signature in seen:
            continue
        seen.add(signature)
        rows.append(measures)
    return rows


def build_worker_safe_plan_v3(
    request: OptimizationRequestV1,
    *,
    bounds: OptimizationSearchBoundsV1,
    catalog: dict[str, Any],
    heating_catalog: dict[str, Any] | None = None,
    halton_samples: int = V3_HALTON_SAMPLES,
    branch_batch_size: int = V3_BRANCH_BATCH_SIZE,
) -> WorkerSafePlanV3:
    """Create a deep search plan without evaluating the deep samples here.

    V2's deterministic physics-informed shortlist remains the anchor. V3 adds
    low-discrepancy coverage plus explicit zero/full corners and returns those
    points to the browser, which shards their branch evaluation.
    """

    base = build_worker_safe_plan_v2(
        request,
        bounds=bounds,
        catalog=catalog,
        heating_catalog=heating_catalog,
        shortlist_limit=V2_WORKER_SHORTLIST_LIMIT,
    )

    candidates: list[ParametricMeasuresV1] = [
        _measures_from_normalized([0.0] * V3_DIMENSIONS, bounds),
        *base.shortlist,
        *low_discrepancy_measures_v3(
            bounds,
            sample_count=halton_samples,
        ),
        _measures_from_normalized([1.0] * V3_DIMENSIONS, bounds),
    ]
    search_points: list[ParametricMeasuresV1] = []
    seen: set[tuple[float, ...]] = set()
    for item in candidates:
        signature = _measure_signature(item)
        if signature in seen:
            continue
        seen.add(signature)
        search_points.append(item)

    return WorkerSafePlanV3(
        search_points=search_points,
        branches=base.branches,
        representative_evaluations=base.representative_evaluations,
        representative_pool_size=base.representative_pool_size,
        base_shortlist_size=len(base.shortlist),
        low_discrepancy_points=max(
            len(search_points) - len(base.shortlist) - 2,
            0,
        ),
        branch_batch_size=max(1, min(int(branch_batch_size), V2_WORKER_SHORTLIST_LIMIT)),
    )


def build_verification_plan_v3(
    request: OptimizationRequestV1,
    *,
    candidates: list[CandidateEvaluationV1],
    candidate_branch_ids: dict[str, str],
) -> VerificationPlanV3:
    """Choose a bounded but adaptive canonical verification set.

    The count grows with the observed Pareto frontier instead of being fixed to
    three. Each returned candidate is verified by a separate Worker request.
    """

    if not candidates:
        return VerificationPlanV3()

    unique = {
        item.candidate_id: item
        for item in candidates
        if item.candidate_id in candidate_branch_ids
    }
    pool = list(unique.values())
    frontier_count = len(pareto_frontier(pool))
    requested = min(
        V3_VERIFICATION_MAX,
        max(
            V3_VERIFICATION_MIN,
            min(V3_VERIFICATION_MAX, frontier_count + 2),
        ),
    )
    selected = _verification_candidates(
        request,
        pool,
        limit=requested,
    )
    selected_ids = {item.candidate_id for item in selected}
    return VerificationPlanV3(
        candidates=selected,
        candidate_branch_ids={
            candidate_id: branch_id
            for candidate_id, branch_id in candidate_branch_ids.items()
            if candidate_id in selected_ids
        },
        requested_count=len(selected),
        frontier_count=frontier_count,
        source_candidate_count=len(pool),
    )


def verify_one_candidate_v3(
    request: OptimizationRequestV1,
    *,
    fast_candidate: CandidateEvaluationV1,
    branch_id: str,
    catalog: dict[str, Any],
    heating_catalog: dict[str, Any] | None = None,
) -> VerifiedCandidateV3:
    """Run exactly one canonical building recalculation for one finalist."""

    baseline_result, baseline_cost = cached_baseline_evaluation(request.baseline)
    if not baseline_cost.get("complete"):
        raise ValueError(
            "Baseline annual bill is incomplete; V3 verification cannot run safely."
        )

    technologies = {
        item.id: item
        for item in heating_technologies(
            heating_catalog,
            include_parametric_nodes=False,
            technology_id=branch_id,
        )
    }
    branch_baseline, technology = _branch_baseline(
        request,
        branch_id,
        technologies,
    )
    full_raw = evaluate_parametric_candidate(
        branch_baseline,
        fast_candidate.parameters,
        catalog,
        baseline_result=baseline_result,
        baseline_cost=baseline_cost,
    )
    full_item = _rebase_candidate(
        full_raw,
        original_baseline_bill_lei=float(
            baseline_cost["priced_total_lei"]
        ),
        original_building=request.baseline,
        technology=technology,
    )
    if full_item is None:
        raise ValueError(
            f"Canonical V3 verification rejected branch {branch_id!r}."
        )

    bill_delta = abs(
        float(full_item.annual_bill_lei)
        - float(fast_candidate.annual_bill_lei)
    )
    load_delta = abs(
        float(full_item.design_heat_load_kw or 0.0)
        - float(fast_candidate.design_heat_load_kw or 0.0)
    )
    warnings: list[str] = []
    if bill_delta > 1.0 or load_delta > 0.02:
        warnings.append(
            (
                f"{branch_id}: fast/full delta {bill_delta:.2f} lei/an, "
                f"{load_delta:.3f} kW; canonical full-engine result retained."
            )
        )

    return VerifiedCandidateV3(
        candidate=full_item,
        branch_id=branch_id,
        annual_bill_delta_lei=round(bill_delta, 4),
        design_load_delta_kw=round(load_delta, 6),
        warnings=warnings,
    )
