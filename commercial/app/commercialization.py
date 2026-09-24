from __future__ import annotations

import hashlib
import json
from typing import Any, Literal

from pydantic import BaseModel, Field

from .cost_curves import (
    ParametricCostCurveV1,
    WallProductDiscretizationV1,
    build_wall_product_cost_curve,
    discretize_wall_product,
)
from .engine import calculate
from .models import BuildingInput, model_to_dict
from .optimization import (
    CandidateEvaluationV1,
    CostLineV1,
    OptimizationSearchRequestV1,
    OptimizationSearchResultV1,
    OptimizationSelectionV1,
    ParametricMeasuresV1,
    evaluate_parametric_candidate,
    run_parametric_optimization,
    select_optimization_candidate,
)
from .pricing import estimate_energy_cost
from .product_matching import WallInsulationProductV1


SCHEMA_VERSION = "1.0"


class WallCommercializationRequestV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    baseline: BuildingInput
    raw_candidate: CandidateEvaluationV1
    products: list[WallInsulationProductV1] = Field(min_items=1, max_items=1000)
    nonmaterial_installed_cost_per_m2_lei: float = Field(ge=0)


class WallCommercializationResultV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    commercialization_id: str
    raw_candidate_id: str
    discretization: WallProductDiscretizationV1
    commercial_candidate: CandidateEvaluationV1
    exact_wall_installed_capex_lei: float
    raw_to_commercial_capex_delta_lei: float
    raw_to_commercial_annual_bill_delta_lei: float
    raw_to_commercial_annual_saving_delta_lei: float
    warnings: list[str] = Field(default_factory=list)


class WallProductBackedOptimizationRequestV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    search: OptimizationSearchRequestV1
    products: list[WallInsulationProductV1] = Field(min_items=1, max_items=1000)
    nonmaterial_installed_cost_per_m2_lei: float = Field(ge=0)


class WallProductBackedOptimizationResultV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    wall_cost_curve: ParametricCostCurveV1
    raw_search: OptimizationSearchResultV1
    wall_commercializations: list[WallCommercializationResultV1] = Field(default_factory=list)
    commercial_selection: OptimizationSelectionV1
    commercial_rechecks: int
    skipped_commercializations: int
    scope: Literal["wall_product_backed_v1"] = "wall_product_backed_v1"
    warnings: list[str] = Field(default_factory=list)


def _curve_catalog(
    catalog: dict[str, Any],
    curve: ParametricCostCurveV1,
) -> dict[str, Any]:
    payload = json.loads(json.dumps(catalog))
    curves = payload.setdefault("parametric_curves", {})
    curves["wall"] = model_to_dict(curve)
    return payload


def _commercialization_id(
    raw_candidate: CandidateEvaluationV1,
    discretization: WallProductDiscretizationV1,
) -> str:
    payload = {
        "raw_candidate_id": raw_candidate.candidate_id,
        "product_id": discretization.product.product_id,
        "sku": discretization.product.sku,
        "packages": discretization.packages,
        "realized_r": discretization.realized_added_r_m2k_w,
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return "COM-WALL-" + hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12].upper()


def _reprice_with_exact_wall_product(
    evaluated: CandidateEvaluationV1,
    *,
    discretization: WallProductDiscretizationV1,
    nonmaterial_installed_cost_per_m2_lei: float,
) -> CandidateEvaluationV1:
    if discretization.material_subtotal_lei is None:
        raise ValueError(
            "Selected wall product has no complete material purchase subtotal."
        )

    nonmaterial = (
        float(discretization.affected_area_m2)
        * float(nonmaterial_installed_cost_per_m2_lei)
    )
    exact_wall_capex = float(discretization.material_subtotal_lei) + nonmaterial

    cost_lines: list[CostLineV1] = []
    wall_replaced = False
    for line in evaluated.cost_breakdown:
        if line.family != "wall":
            cost_lines.append(line)
            continue
        wall_replaced = True
        product = discretization.product
        cost_lines.append(
            CostLineV1(
                family="wall",
                capex_lei=round(exact_wall_capex, 2),
                parameter_value=float(discretization.realized_added_r_m2k_w),
                parameter_unit="m2K/W_added",
                source_kind="commercial_product_installed_total",
                source_url=product.product_url,
                confidence="product_exact_plus_sourced_nonmaterial",
                catalog_unit="packages_plus_nonmaterial_lei_per_m2",
                note=(
                    "Exact material purchase subtotal after package rounding plus "
                    "the supplied non-material installed-system allowance."
                ),
                product_id=product.product_id,
                sku=product.sku,
                quantity=(
                    None
                    if discretization.packages is None
                    else float(discretization.packages)
                ),
                quantity_unit="packages",
                material_subtotal_lei=float(discretization.material_subtotal_lei),
                nonmaterial_subtotal_lei=round(nonmaterial, 2),
            )
        )

    if not wall_replaced:
        raise ValueError(
            "Evaluated candidate has no wall CAPEX line to replace with the commercial product."
        )

    capex = sum(float(line.capex_lei) for line in cost_lines)
    annual_saving = float(evaluated.annual_saving_lei)
    payback = (
        capex / annual_saving
        if capex > 0 and annual_saving > 0
        else None
    )
    roi = (
        100.0 * annual_saving / capex
        if capex > 0
        else None
    )
    other_active = [
        line
        for line in cost_lines
        if line.family != "wall" and float(line.capex_lei) > 0
    ]

    payload = model_to_dict(evaluated)
    payload.update(
        {
            "capex_lei": round(capex, 2),
            "payback_years": None if payback is None else round(payback, 4),
            "roi_percent_per_year": None if roi is None else round(roi, 4),
            "cost_breakdown": [model_to_dict(line) for line in cost_lines],
            "cost_source": "wall_product_discretized_recalculated",
            "commercialization_status": (
                "commercialized" if not other_active else "partially_discretized"
            ),
            "assumptions": [
                *evaluated.assumptions,
                "Wall insulation has been replaced by an actual supplied product and package count.",
                "The full building was recalculated after the raw wall R target was rounded upward to the selected product R.",
            ],
            "warnings": [
                *evaluated.warnings,
                *(
                    [
                        "Other active measure families still use their current planning/parametric cost models."
                    ]
                    if other_active
                    else []
                ),
            ],
        }
    )
    return CandidateEvaluationV1(**payload)


def commercialize_wall_candidate(
    payload: WallCommercializationRequestV1,
    catalog: dict[str, Any],
) -> WallCommercializationResultV1:
    target_r = float(payload.raw_candidate.parameters.wall_added_r_m2k_w)
    if target_r <= 0:
        raise ValueError(
            "Raw candidate has no wall-insulation intervention to commercialize."
        )

    curve = build_wall_product_cost_curve(
        payload.products,
        nonmaterial_installed_cost_per_m2_lei=(
            payload.nonmaterial_installed_cost_per_m2_lei
        ),
    )
    priced_catalog = _curve_catalog(catalog, curve)

    baseline_result = calculate(payload.baseline, include_reference=False)
    baseline_cost = estimate_energy_cost(baseline_result)
    if not baseline_cost.get("complete"):
        raise ValueError(
            "Baseline annual bill is incomplete; commercialization cannot compare economics safely."
        )
    area = float(baseline_result.envelope_geometry.net_wall_area_m2)

    discretization = discretize_wall_product(
        target_added_r_m2k_w=target_r,
        affected_area_m2=area,
        products=payload.products,
    )

    measures_payload = model_to_dict(payload.raw_candidate.parameters)
    measures_payload["wall_added_r_m2k_w"] = float(
        discretization.realized_added_r_m2k_w
    )
    commercial_measures = ParametricMeasuresV1(**measures_payload)

    recalculated = evaluate_parametric_candidate(
        payload.baseline,
        commercial_measures,
        priced_catalog,
        baseline_result=baseline_result,
        baseline_cost=baseline_cost,
    )
    commercial = _reprice_with_exact_wall_product(
        recalculated,
        discretization=discretization,
        nonmaterial_installed_cost_per_m2_lei=(
            payload.nonmaterial_installed_cost_per_m2_lei
        ),
    )

    wall_line = next(
        line for line in commercial.cost_breakdown if line.family == "wall"
    )
    return WallCommercializationResultV1(
        commercialization_id=_commercialization_id(
            payload.raw_candidate,
            discretization,
        ),
        raw_candidate_id=payload.raw_candidate.candidate_id,
        discretization=discretization,
        commercial_candidate=commercial,
        exact_wall_installed_capex_lei=round(float(wall_line.capex_lei), 2),
        raw_to_commercial_capex_delta_lei=round(
            float(commercial.capex_lei) - float(payload.raw_candidate.capex_lei),
            2,
        ),
        raw_to_commercial_annual_bill_delta_lei=round(
            float(commercial.annual_bill_lei)
            - float(payload.raw_candidate.annual_bill_lei),
            2,
        ),
        raw_to_commercial_annual_saving_delta_lei=round(
            float(commercial.annual_saving_lei)
            - float(payload.raw_candidate.annual_saving_lei),
            2,
        ),
        warnings=[
            "Commercial wall CAPEX uses actual package rounding, not the interpolated raw optimizer curve.",
            "The commercial candidate is a new full LaCurent Light calculation after discretization.",
        ],
    )


def run_wall_product_backed_optimization(
    payload: WallProductBackedOptimizationRequestV1,
    catalog: dict[str, Any],
) -> WallProductBackedOptimizationResultV1:
    curve = build_wall_product_cost_curve(
        payload.products,
        nonmaterial_installed_cost_per_m2_lei=(
            payload.nonmaterial_installed_cost_per_m2_lei
        ),
    )
    priced_catalog = _curve_catalog(catalog, curve)
    raw_search = run_parametric_optimization(payload.search, priced_catalog)

    raw_by_id = {
        candidate.candidate_id: candidate
        for candidate in raw_search.candidates
    }
    candidate_ids = list(raw_search.pareto_candidate_ids)
    selected_raw = raw_search.selection.selected
    if (
        selected_raw is not None
        and selected_raw.candidate_id not in candidate_ids
    ):
        candidate_ids.append(selected_raw.candidate_id)

    commercializations: list[WallCommercializationResultV1] = []
    selectable: list[CandidateEvaluationV1] = []
    skipped = 0
    for candidate_id in candidate_ids:
        raw_candidate = raw_by_id.get(candidate_id)
        if raw_candidate is None:
            continue
        if float(raw_candidate.parameters.wall_added_r_m2k_w) <= 1e-9:
            selectable.append(raw_candidate)
            continue
        try:
            result = commercialize_wall_candidate(
                WallCommercializationRequestV1(
                    baseline=payload.search.request.baseline,
                    raw_candidate=raw_candidate,
                    products=payload.products,
                    nonmaterial_installed_cost_per_m2_lei=(
                        payload.nonmaterial_installed_cost_per_m2_lei
                    ),
                ),
                priced_catalog,
            )
        except ValueError:
            skipped += 1
            continue
        commercializations.append(result)
        selectable.append(result.commercial_candidate)

    # Discretization can change CAPEX and even annual savings. Re-apply the
    # user's actual economic policy after commercial rounding.
    commercial_selection = select_optimization_candidate(
        payload.search.request,
        selectable,
    )

    warnings = [
        "Wall cost during raw search is derived from the supplied product catalog; final wall CAPEX uses exact package rounding.",
        "Final economic selection is repeated after wall commercialization.",
        "V1 commercial re-selection covers the raw CAPEX-vs-bill Pareto frontier plus the raw selected candidate, not every evaluated raw point.",
    ]
    if commercial_selection.selected is None:
        warnings.append(
            "No commercially rechecked candidate satisfies the selected economic intent."
        )
    if commercial_selection.selected is not None and (
        commercial_selection.selected.commercialization_status
        == "partially_discretized"
    ):
        warnings.append(
            "The selected solution is wall-discretized but other active measure families still require product-level commercialization."
        )

    return WallProductBackedOptimizationResultV1(
        wall_cost_curve=curve,
        raw_search=raw_search,
        wall_commercializations=commercializations,
        commercial_selection=commercial_selection,
        commercial_rechecks=len(selectable),
        skipped_commercializations=skipped,
        warnings=warnings,
    )
