from __future__ import annotations

import math
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any

from pydantic import BaseModel, Field

from .engine import (
    _renewable_resource_rows,
    classify_energy,
    co2_emissions,
    cooling_final_energy,
    dhw_energy,
    final_energy_by_carrier,
    final_energy_by_service,
    heating_system_performance,
    monthly_energy_balance,
    net_final_energy_by_carrier,
    primary_energy,
    renewable_energy_result,
    transmission_heat_transfer_components,
    ventilation_heat_transfer,
)
from .heating_optimization import (
    HeatingBranchSummaryV1,
    HeatingTechnologyV2,
    _rebase_candidate,
    apply_heating_technology,
    heating_branch_plan,
    heating_technologies,
)
from .methodology import resolve_climate
from .models import BuildingInput
from .optimization import (
    AUTO_ECONOMIC_HORIZONS_YEARS,
    CandidateEvaluationV1,
    OptimizationMode,
    OptimizationRequestV1,
    OptimizationSearchBoundsV1,
    OptimizationSelectionV1,
    ParametricMeasuresV1,
    _measures_from_normalized,
    _measure_signature,
    _stable_candidate_id,
    apply_parametric_measures,
    cached_baseline_evaluation,
    evaluate_parametric_candidate,
    parametric_capex,
    pareto_frontier,
    select_optimization_candidate,
)
from .pricing import estimate_energy_cost


V2_AXIS_LEVELS = (0.5, 1.0)
V2_LADDER_STEP = 0.25
V2_LADDER_STEPS = 7
V2_SHORTLIST_LIMIT = 10
V2_FULL_VERIFICATION_LIMIT = 6


class PhysicsInformedOptimizationResultV2(BaseModel):
    selection: OptimizationSelectionV1
    candidates: list[CandidateEvaluationV1] = Field(default_factory=list)
    branches: list[HeatingBranchSummaryV1] = Field(default_factory=list)
    candidate_branch_ids: dict[str, str] = Field(default_factory=dict)
    fast_evaluations: int = 0
    full_engine_evaluations: int = 0
    heating_branch_evaluations: int = 0
    representative_pool_size: int = 0
    shortlist_size: int = 0
    search_method: str = "physics_informed_marginal_pareto_v2"
    warnings: list[str] = Field(default_factory=list)


@dataclass
class _FastEvaluationContext:
    request: OptimizationRequestV1
    bounds: OptimizationSearchBoundsV1
    catalog: dict[str, Any]
    baseline_result: Any
    baseline_cost: dict[str, Any]
    baseline_bill_lei: float
    heating_catalog: dict[str, Any] | None
    cache: dict[tuple[str, tuple[float, ...]], CandidateEvaluationV1]
    fast_evaluations: int = 0


def axis_probe_measures_v2(
    bounds: OptimizationSearchBoundsV1,
) -> list[ParametricMeasuresV1]:
    """Probe every optimizer dimension symmetrically at 50% and 100%."""

    rows = [
        ParametricMeasuresV1(
            window_target_u_w_m2k=bounds.window_target_u_w_m2k,
        )
    ]
    dimension_count = 7
    for dimension in range(dimension_count):
        for level in V2_AXIS_LEVELS:
            vector = [0.0] * dimension_count
            vector[dimension] = float(level)
            rows.append(_measures_from_normalized(vector, bounds))

    unique: list[ParametricMeasuresV1] = []
    seen: set[tuple[float, ...]] = set()
    for row in rows:
        signature = _measure_signature(row)
        if signature in seen:
            continue
        seen.add(signature)
        unique.append(row)
    return unique


def _fast_engine_candidate(
    baseline: BuildingInput,
    measures: ParametricMeasuresV1,
    catalog: dict[str, Any],
    *,
    baseline_result: Any,
    baseline_cost: dict[str, Any],
) -> CandidateEvaluationV1:
    """Run Light-engine equations without building the full report object."""

    candidate_building, physical_warnings = apply_parametric_measures(
        baseline,
        measures,
    )
    transmission, _, _ = transmission_heat_transfer_components(candidate_building)
    h_ve = ventilation_heat_transfer(candidate_building)
    climate = resolve_climate(candidate_building.locality)
    monthly = monthly_energy_balance(candidate_building, transmission, h_ve)
    annual_heating = sum(float(row["useful_heating_kwh"]) for row in monthly)
    annual_cooling = sum(float(row["useful_cooling_kwh"]) for row in monthly)

    renewable_rows, pv_pr, thermal_efficiency = _renewable_resource_rows(
        candidate_building,
        climate,
    )
    heating, heating_system = heating_system_performance(
        candidate_building,
        annual_heating,
    )
    cooling = cooling_final_energy(candidate_building, annual_cooling)
    dhw_backup_useful = sum(
        float(row["dhw_backup_useful_kwh"])
        for row in renewable_rows
    )
    dhw = dhw_energy(candidate_building, dhw_backup_useful)
    renewables = renewable_energy_result(
        candidate_building,
        climate,
        monthly,
        heating,
        cooling,
        dhw,
        renewable_rows,
        pv_pr,
        thermal_efficiency,
        heating_auxiliary_kwh_year=heating_system.auxiliary_electricity_kwh,
    )

    by_service = final_energy_by_service(
        heating,
        cooling,
        dhw,
        heating_auxiliary_kwh=heating_system.auxiliary_electricity_kwh,
    )
    gross_by_carrier = final_energy_by_carrier(
        heating,
        cooling,
        dhw,
        additional_electricity_kwh=heating_system.auxiliary_electricity_kwh,
    )
    by_carrier = net_final_energy_by_carrier(
        gross_by_carrier,
        renewables,
    )
    primary = primary_energy(
        by_carrier,
        candidate_building.heated_floor_area_m2,
    )
    co2 = co2_emissions(
        by_carrier,
        candidate_building.heated_floor_area_m2,
    )
    energy_class = classify_energy(
        candidate_building,
        primary.specific_kwh_m2,
    )

    lightweight_result = SimpleNamespace(
        input=candidate_building,
        climate=climate,
        final_energy_by_carrier=by_carrier,
        final_energy_by_service=by_service,
        heating=heating,
        heating_system=heating_system,
        cooling=cooling,
        dhw=dhw,
        renewables=renewables,
        monthly=[SimpleNamespace(**row) for row in monthly],
    )
    candidate_cost = estimate_energy_cost(lightweight_result)
    if not candidate_cost.get("complete"):
        raise ValueError(
            "Candidate annual bill is incomplete; V2 cannot compare economics safely."
        )

    capex_lei, cost_lines, cost_warnings = parametric_capex(
        baseline_result,
        measures,
        catalog,
    )
    baseline_bill = float(baseline_cost["priced_total_lei"])
    annual_bill = float(candidate_cost["priced_total_lei"])
    annual_saving = baseline_bill - annual_bill
    payback = (
        capex_lei / annual_saving
        if capex_lei > 0 and annual_saving > 0
        else None
    )
    roi = (
        100.0 * annual_saving / capex_lei
        if capex_lei > 0
        else None
    )
    design_temperature = climate.get("winter_design_temperature_c")
    design_heat_load_kw = None
    if design_temperature is not None:
        delta_t = max(
            float(candidate_building.indoor_design_temperature_c)
            - float(design_temperature),
            0.0,
        )
        design_heat_load_kw = round(
            float(transmission.htr_w_k + h_ve) * delta_t / 1000.0,
            4,
        )

    active_families = [
        line.family
        for line in cost_lines
        if line.capex_lei > 0
    ]
    return CandidateEvaluationV1(
        candidate_id=_stable_candidate_id(measures),
        parameters=measures,
        capex_lei=round(capex_lei, 2),
        baseline_annual_bill_lei=round(baseline_bill, 2),
        annual_bill_lei=round(annual_bill, 2),
        annual_saving_lei=round(annual_saving, 2),
        payback_years=None if payback is None else round(payback, 4),
        roi_percent_per_year=None if roi is None else round(roi, 4),
        final_energy_kwh=round(sum(float(v) for v in by_carrier.values()), 3),
        design_heat_load_kw=design_heat_load_kw,
        primary_specific_kwh_m2=round(float(primary.specific_kwh_m2), 3),
        co2_total_kg=round(float(co2.total_kg), 3),
        co2_specific_kg_m2=round(float(co2.specific_kg_m2), 3),
        energy_class=energy_class,
        resulting_configuration=candidate_building,
        cost_breakdown=cost_lines,
        cost_catalog_version=catalog.get("catalog_version"),
        cost_source=catalog.get("source"),
        commercialization_status=(
            "raw_only"
            if not active_families
            else "pending_product_catalog"
        ),
        assumptions=[
            "Optimizer V2 fast kernel uses the same LaCurent Light monthly/system equations as calculate().",
            "Only finalist candidates are rebuilt through canonical calculate() before commercialization.",
            "Commercial product matching remains downstream of the raw mathematical search.",
        ],
        warnings=[*physical_warnings, *cost_warnings],
    )


def _branch_baseline(
    request: OptimizationRequestV1,
    branch_id: str,
    technologies: dict[str, HeatingTechnologyV2],
) -> tuple[BuildingInput, HeatingTechnologyV2 | None]:
    if branch_id == "keep-current-heating":
        return request.baseline, None
    technology = technologies.get(branch_id)
    if technology is None:
        raise ValueError(f"Unknown economic heating branch {branch_id!r}.")
    return apply_heating_technology(request.baseline, technology), technology


def _fast_branch_candidate(
    context: _FastEvaluationContext,
    *,
    branch_id: str,
    measures: ParametricMeasuresV1,
    branch_baseline: BuildingInput,
    technology: HeatingTechnologyV2 | None,
    branch_baseline_cost: dict[str, Any],
) -> CandidateEvaluationV1 | None:
    signature = _measure_signature(measures)
    cache_key = (branch_id, signature)
    cached = context.cache.get(cache_key)
    if cached is not None:
        return cached

    raw = _fast_engine_candidate(
        branch_baseline,
        measures,
        context.catalog,
        baseline_result=context.baseline_result,
        baseline_cost=branch_baseline_cost,
    )
    context.fast_evaluations += 1
    rebased = _rebase_candidate(
        raw,
        original_baseline_bill_lei=context.baseline_bill_lei,
        original_building=context.request.baseline,
        technology=technology,
    )
    if rebased is not None:
        context.cache[cache_key] = rebased
    return rebased


def _marginal_score(
    current: CandidateEvaluationV1,
    candidate: CandidateEvaluationV1,
) -> tuple[float, float, float]:
    delta_saving = float(candidate.annual_saving_lei) - float(current.annual_saving_lei)
    delta_capex = float(candidate.capex_lei) - float(current.capex_lei)
    if delta_saving <= 1e-9:
        return (-math.inf, delta_saving, -delta_capex)
    if delta_capex <= 1e-9:
        return (math.inf, delta_saving, -delta_capex)
    return (
        delta_saving / delta_capex,
        delta_saving,
        -delta_capex,
    )


def _marginal_ladder(
    context: _FastEvaluationContext,
    *,
    branch_id: str,
    branch_baseline: BuildingInput,
    technology: HeatingTechnologyV2 | None,
    branch_baseline_cost: dict[str, Any],
) -> list[CandidateEvaluationV1]:
    dimensions = 7
    current_vector = [0.0] * dimensions
    current_measures = _measures_from_normalized(current_vector, context.bounds)
    current = _fast_branch_candidate(
        context,
        branch_id=branch_id,
        measures=current_measures,
        branch_baseline=branch_baseline,
        technology=technology,
        branch_baseline_cost=branch_baseline_cost,
    )
    if current is None:
        return []

    ladder = [current]
    for _ in range(V2_LADDER_STEPS):
        moves = []
        for dimension in range(dimensions):
            if current_vector[dimension] >= 1.0 - 1e-9:
                continue
            vector = list(current_vector)
            vector[dimension] = min(
                1.0,
                vector[dimension] + V2_LADDER_STEP,
            )
            measures = _measures_from_normalized(vector, context.bounds)
            candidate = _fast_branch_candidate(
                context,
                branch_id=branch_id,
                measures=measures,
                branch_baseline=branch_baseline,
                technology=technology,
                branch_baseline_cost=branch_baseline_cost,
            )
            if candidate is None:
                continue
            moves.append((_marginal_score(current, candidate), vector, candidate))

        viable = [row for row in moves if row[0][0] > -math.inf]
        if not viable:
            break
        _, best_vector, best_candidate = max(
            viable,
            key=lambda row: (
                row[0][0],
                row[0][1],
                row[0][2],
                -row[2].annual_bill_lei,
            ),
        )
        if best_candidate.candidate_id == current.candidate_id:
            break
        current_vector = best_vector
        current = best_candidate
        ladder.append(current)
    return ladder


def _representative_pool(
    context: _FastEvaluationContext,
    *,
    branch_id: str,
    branch_baseline: BuildingInput,
    technology: HeatingTechnologyV2 | None,
    branch_baseline_cost: dict[str, Any],
) -> list[CandidateEvaluationV1]:
    rows: list[CandidateEvaluationV1] = []
    for measures in axis_probe_measures_v2(context.bounds):
        item = _fast_branch_candidate(
            context,
            branch_id=branch_id,
            measures=measures,
            branch_baseline=branch_baseline,
            technology=technology,
            branch_baseline_cost=branch_baseline_cost,
        )
        if item is not None:
            rows.append(item)

    rows.extend(
        _marginal_ladder(
            context,
            branch_id=branch_id,
            branch_baseline=branch_baseline,
            technology=technology,
            branch_baseline_cost=branch_baseline_cost,
        )
    )
    return list({item.candidate_id: item for item in rows}.values())


def _shortlist_measures(
    request: OptimizationRequestV1,
    representative: list[CandidateEvaluationV1],
    *,
    limit: int = V2_SHORTLIST_LIMIT,
) -> list[ParametricMeasuresV1]:
    if not representative:
        return []
    frontier = pareto_frontier(representative)
    ordered = list(frontier)

    supplemental = sorted(
        representative,
        key=lambda item: (
            -float(item.annual_saving_lei),
            float(item.capex_lei),
        ),
    )
    if request.mode == OptimizationMode.auto_economic:
        supplemental = _rank_candidates_v2(request, representative)

    ordered.extend(supplemental)
    unique: list[ParametricMeasuresV1] = []
    seen: set[tuple[float, ...]] = set()
    for item in ordered:
        signature = _measure_signature(item.parameters)
        if signature in seen:
            continue
        seen.add(signature)
        unique.append(item.parameters)
        if len(unique) >= limit:
            break
    return unique


def _robust_regret_metrics(
    candidates: list[CandidateEvaluationV1],
) -> dict[str, tuple[float, float, float]]:
    horizons = AUTO_ECONOMIC_HORIZONS_YEARS
    net = {
        item.candidate_id: {
            horizon: float(item.annual_saving_lei) * horizon - float(item.capex_lei)
            for horizon in horizons
        }
        for item in candidates
    }
    best = {
        horizon: max(net[item.candidate_id][horizon] for item in candidates)
        for horizon in horizons
    }
    metrics = {}
    for item in candidates:
        relative_regrets = []
        absolute_regrets = []
        for horizon in horizons:
            regret = best[horizon] - net[item.candidate_id][horizon]
            denominator = max(abs(best[horizon]), 1.0)
            relative_regrets.append(regret / denominator)
            absolute_regrets.append(regret)
        metrics[item.candidate_id] = (
            max(relative_regrets),
            sum(relative_regrets) / len(relative_regrets),
            sum(absolute_regrets),
        )
    return metrics


def _rank_candidates_v2(
    request: OptimizationRequestV1,
    candidates: list[CandidateEvaluationV1],
) -> list[CandidateEvaluationV1]:
    unique = list({item.candidate_id: item for item in candidates}.values())
    if not unique:
        return []

    if request.mode == OptimizationMode.investment_budget:
        budget = float(request.investment_budget_lei)
        feasible = [item for item in unique if item.capex_lei <= budget + 1e-6]
        return sorted(
            feasible or unique,
            key=lambda item: (
                -float(item.annual_saving_lei),
                float(item.capex_lei),
                float(item.annual_bill_lei),
            ),
        )
    if request.mode == OptimizationMode.annual_bill_target:
        target = float(request.annual_bill_target_lei)
        feasible = [item for item in unique if item.annual_bill_lei <= target + 1e-6]
        return sorted(
            feasible or unique,
            key=lambda item: (
                float(item.capex_lei),
                float(item.annual_bill_lei),
                -float(item.annual_saving_lei),
            ),
        )
    if request.mode == OptimizationMode.max_payback_years:
        limit = float(request.max_payback_years)
        feasible = [
            item for item in unique
            if item.payback_years is not None
            and item.payback_years <= limit + 1e-6
            and item.annual_saving_lei > 0
        ]
        return sorted(
            feasible or unique,
            key=lambda item: (
                -float(item.annual_saving_lei),
                float(item.capex_lei),
                float(item.payback_years or math.inf),
            ),
        )

    pool = pareto_frontier(unique) or unique
    metrics = _robust_regret_metrics(pool)
    return sorted(
        pool,
        key=lambda item: (
            metrics[item.candidate_id][0],
            metrics[item.candidate_id][1],
            -(
                float(item.annual_saving_lei) * 20.0
                - float(item.capex_lei)
            ),
            float(item.capex_lei),
        ),
    )


def select_optimization_candidate_v2(
    request: OptimizationRequestV1,
    candidates: list[CandidateEvaluationV1],
) -> OptimizationSelectionV1:
    if request.mode != OptimizationMode.auto_economic:
        return select_optimization_candidate(request, candidates)

    unique = list({item.candidate_id: item for item in candidates}.values())
    frontier = pareto_frontier(unique)
    pool = frontier or unique
    ranked = _rank_candidates_v2(request, pool)
    selected = ranked[0] if ranked else None
    return OptimizationSelectionV1(
        mode=request.mode,
        selected=selected,
        candidate_count=len(unique),
        feasible_count=len(pool),
        pareto_count=len(frontier),
        auto_horizons_years=list(AUTO_ECONOMIC_HORIZONS_YEARS),
        rationale=(
            "Optimizer V2 minimizes worst relative economic regret across 5, 10, 15, "
            "20 and 25 years using the actual magnitude of net benefit "
            "(annual saving × horizon − CAPEX). Unlike V1 rank-sum, a 10 lei gap and "
            "a 20,000 lei gap are not treated as equivalent."
        ),
        warnings=[
            "Lifecycle V2 currently uses simple undiscounted net benefit because maintenance, "
            "replacement and financing inputs are not yet source-backed. The robust regret "
            "rule avoids hiding a single preferred horizon."
        ],
    )


def _verification_candidates(
    request: OptimizationRequestV1,
    candidates: list[CandidateEvaluationV1],
    *,
    limit: int = V2_FULL_VERIFICATION_LIMIT,
) -> list[CandidateEvaluationV1]:
    ranked = _rank_candidates_v2(request, candidates)
    frontier = pareto_frontier(candidates)
    ordered = [*ranked, *frontier]
    unique: list[CandidateEvaluationV1] = []
    seen: set[str] = set()
    for item in ordered:
        if item.candidate_id in seen:
            continue
        seen.add(item.candidate_id)
        unique.append(item)
        if len(unique) >= limit:
            break
    return unique


def run_physics_informed_optimization(
    request: OptimizationRequestV1,
    *,
    bounds: OptimizationSearchBoundsV1,
    catalog: dict[str, Any],
    heating_catalog: dict[str, Any] | None = None,
    shortlist_limit: int = V2_SHORTLIST_LIMIT,
    verification_limit: int = V2_FULL_VERIFICATION_LIMIT,
) -> PhysicsInformedOptimizationResultV2:
    """Physics-informed V2 search with bounded canonical verification."""

    baseline_result, baseline_cost = cached_baseline_evaluation(request.baseline)
    if not baseline_cost.get("complete"):
        raise ValueError(
            "Baseline annual bill is incomplete; optimizer V2 cannot run safely."
        )

    context = _FastEvaluationContext(
        request=request,
        bounds=bounds,
        catalog=catalog,
        baseline_result=baseline_result,
        baseline_cost=baseline_cost,
        baseline_bill_lei=float(baseline_cost["priced_total_lei"]),
        heating_catalog=heating_catalog,
        cache={},
    )
    technologies = {item.id: item for item in heating_technologies(heating_catalog)}
    plan = heating_branch_plan(request, heating_catalog)
    economic_plan = [
        branch for branch in plan
        if branch.eligible and branch.economic_eligible
    ]
    if not economic_plan:
        return PhysicsInformedOptimizationResultV2(
            selection=select_optimization_candidate_v2(request, []),
            branches=plan,
            warnings=["No eligible economic heating branch is available."],
        )

    representative_branch = next(
        (
            branch for branch in economic_plan
            if branch.branch_id == "keep-current-heating"
        ),
        economic_plan[0],
    )
    representative_baseline, representative_technology = _branch_baseline(
        request,
        representative_branch.branch_id,
        technologies,
    )
    representative_baseline_cost = baseline_cost
    if representative_branch.branch_id != "keep-current-heating":
        zero = _fast_engine_candidate(
            representative_baseline,
            ParametricMeasuresV1(
                window_target_u_w_m2k=bounds.window_target_u_w_m2k,
            ),
            catalog,
            baseline_result=baseline_result,
            baseline_cost=baseline_cost,
        )
        representative_baseline_cost = {
            "complete": True,
            "priced_total_lei": zero.annual_bill_lei,
        }

    representative = _representative_pool(
        context,
        branch_id=representative_branch.branch_id,
        branch_baseline=representative_baseline,
        technology=representative_technology,
        branch_baseline_cost=representative_baseline_cost,
    )
    shortlist = _shortlist_measures(
        request,
        representative,
        limit=shortlist_limit,
    )

    fast_candidates: list[CandidateEvaluationV1] = []
    branch_by_candidate_id: dict[str, str] = {}
    branch_baselines: dict[str, BuildingInput] = {}
    branch_technologies: dict[str, HeatingTechnologyV2 | None] = {}
    branch_baseline_costs: dict[str, dict[str, Any]] = {}
    branch_counts: dict[str, int] = {}

    for branch in economic_plan:
        branch_baseline, technology = _branch_baseline(
            request,
            branch.branch_id,
            technologies,
        )
        branch_baselines[branch.branch_id] = branch_baseline
        branch_technologies[branch.branch_id] = technology

        if branch.branch_id == "keep-current-heating":
            branch_cost = baseline_cost
        else:
            zero_raw = _fast_engine_candidate(
                branch_baseline,
                ParametricMeasuresV1(
                    window_target_u_w_m2k=bounds.window_target_u_w_m2k,
                ),
                catalog,
                baseline_result=baseline_result,
                baseline_cost=baseline_cost,
            )
            context.fast_evaluations += 1
            branch_cost = {
                "complete": True,
                "priced_total_lei": float(zero_raw.annual_bill_lei),
            }
        branch_baseline_costs[branch.branch_id] = branch_cost

        branch_count = 0
        for measures in shortlist:
            item = _fast_branch_candidate(
                context,
                branch_id=branch.branch_id,
                measures=measures,
                branch_baseline=branch_baseline,
                technology=technology,
                branch_baseline_cost=branch_cost,
            )
            if item is None:
                continue
            fast_candidates.append(item)
            branch_by_candidate_id[item.candidate_id] = branch.branch_id
            branch_count += 1
        branch_counts[branch.branch_id] = branch_count

    if not fast_candidates:
        return PhysicsInformedOptimizationResultV2(
            selection=select_optimization_candidate_v2(request, []),
            branches=plan,
            fast_evaluations=context.fast_evaluations,
            representative_pool_size=len(representative),
            shortlist_size=len(shortlist),
            warnings=["V2 search did not produce any valid economic candidate."],
        )

    verification_rows = _verification_candidates(
        request,
        fast_candidates,
        limit=verification_limit,
    )
    verified: list[CandidateEvaluationV1] = []
    verified_branch_ids: dict[str, str] = {}
    verification_warnings: list[str] = []

    for fast_item in verification_rows:
        branch_id = branch_by_candidate_id[fast_item.candidate_id]
        branch_baseline = branch_baselines[branch_id]
        technology = branch_technologies[branch_id]
        full_raw = evaluate_parametric_candidate(
            branch_baseline,
            fast_item.parameters,
            catalog,
            baseline_result=baseline_result,
            baseline_cost=branch_baseline_costs[branch_id],
        )
        full_item = _rebase_candidate(
            full_raw,
            original_baseline_bill_lei=context.baseline_bill_lei,
            original_building=request.baseline,
            technology=technology,
        )
        if full_item is None:
            continue
        verified.append(full_item)
        verified_branch_ids[full_item.candidate_id] = branch_id

        bill_delta = abs(
            float(full_item.annual_bill_lei)
            - float(fast_item.annual_bill_lei)
        )
        load_delta = abs(
            float(full_item.design_heat_load_kw or 0.0)
            - float(fast_item.design_heat_load_kw or 0.0)
        )
        if bill_delta > 1.0 or load_delta > 0.02:
            verification_warnings.append(
                (
                    f"{branch_id}: fast-kernel/full-engine delta for "
                    f"{fast_item.candidate_id} is {bill_delta:.2f} lei/an and "
                    f"{load_delta:.3f} kW; canonical full-engine values were retained."
                )
            )

    selection_pool = verified or fast_candidates
    selection = select_optimization_candidate_v2(
        request,
        selection_pool,
    )
    final_branch_map = verified_branch_ids or branch_by_candidate_id

    summaries: list[HeatingBranchSummaryV1] = []
    for branch in plan:
        data = branch.model_dump() if hasattr(branch, "model_dump") else branch.dict()
        if branch.branch_id in branch_counts:
            data["evaluated_candidates"] = int(branch_counts[branch.branch_id])
            data["accepted_candidates"] = int(branch_counts[branch.branch_id])
            branch_selection = select_optimization_candidate_v2(
                request,
                [
                    item for item in fast_candidates
                    if branch_by_candidate_id.get(item.candidate_id) == branch.branch_id
                ],
            )
            data["feasible_candidates"] = int(branch_selection.feasible_count)
        summaries.append(HeatingBranchSummaryV1(**data))

    return PhysicsInformedOptimizationResultV2(
        selection=selection,
        candidates=selection_pool,
        branches=summaries,
        candidate_branch_ids=final_branch_map,
        fast_evaluations=context.fast_evaluations,
        full_engine_evaluations=len(verified),
        heating_branch_evaluations=sum(
            count
            for branch_id, count in branch_counts.items()
            if branch_id != "keep-current-heating"
        ),
        representative_pool_size=len(representative),
        shortlist_size=len(shortlist),
        warnings=[
            (
                "Optimizer V2 uses a symmetric seven-dimensional axis probe, then a "
                "marginal-value ladder that recalculates after every accepted intervention."
            ),
            (
                f"V2 evaluated {context.fast_evaluations} fast-kernel states and rebuilt only "
                f"{len(verified)} raw finalists through canonical calculate()."
            ),
            (
                "Heating technologies are compared after the physical shortlist, so the same "
                "envelope/renewables search is not rediscovered independently with Halton sampling."
            ),
            (
                "Commercial generator SKU selection remains finalist-only; V2 never loops over "
                "manufacturer products during the mathematical search."
            ),
            *verification_warnings,
        ],
    )
