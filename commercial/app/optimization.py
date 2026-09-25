from __future__ import annotations

import hashlib
import json
from enum import Enum
from typing import Any, Callable, Literal

from pydantic import BaseModel, Field, root_validator

from .cost_curves import ParametricCostCurveV1, curve_cost_per_basis
from .engine import calculate
from .extended_costs import SystemCostCurveV1, system_curve_cost
from .methodology import methodology
from .models import BuildingInput, model_to_dict
from .pricing import estimate_energy_cost


SCHEMA_VERSION = "1.0"
AUTO_ECONOMIC_HORIZONS_YEARS = (5, 10, 15, 20, 25)


class OptimizationMode(str, Enum):
    investment_budget = "investment_budget"
    annual_bill_target = "annual_bill_target"
    max_payback_years = "max_payback_years"
    auto_economic = "auto_economic"


class OptimizationRequestV1(BaseModel):
    """User intent contract.

    Exactly one economic target is accepted. The automatic mode intentionally
    accepts no user-selected financial horizon; it is evaluated across the
    documented LaCurent horizon set instead.
    """

    schema_version: Literal["1.0"] = SCHEMA_VERSION
    baseline: BuildingInput
    mode: OptimizationMode
    investment_budget_lei: float | None = Field(default=None, gt=0)
    annual_bill_target_lei: float | None = Field(default=None, ge=0)
    max_payback_years: float | None = Field(default=None, gt=0, le=50)

    @root_validator(skip_on_failure=True)
    def validate_single_intent(cls, values: dict) -> dict:
        mode = values.get("mode")
        targets = {
            OptimizationMode.investment_budget: values.get("investment_budget_lei"),
            OptimizationMode.annual_bill_target: values.get("annual_bill_target_lei"),
            OptimizationMode.max_payback_years: values.get("max_payback_years"),
        }
        provided = [item for item in targets.values() if item is not None]

        if mode == OptimizationMode.auto_economic:
            if provided:
                raise ValueError("Automatic economic mode does not accept an additional user constraint.")
            return values

        expected = targets.get(mode)
        if expected is None:
            raise ValueError(f"Mode {mode} requires exactly its matching economic target.")
        if len(provided) != 1:
            raise ValueError("Only one economic constraint may be supplied per optimization run.")
        return values


class ParametricMeasuresV1(BaseModel):
    """Continuous technical decision variables used before commercialization."""

    wall_added_r_m2k_w: float = Field(default=0, ge=0, le=15)
    roof_added_r_m2k_w: float = Field(default=0, ge=0, le=20)
    floor_added_r_m2k_w: float = Field(default=0, ge=0, le=15)
    window_replacement_fraction: float = Field(default=0, ge=0, le=1)
    window_target_u_w_m2k: float = Field(default=0.9, gt=0, le=6)
    pv_added_kwp: float = Field(default=0, ge=0, le=100)
    pv_performance_ratio: float | None = Field(default=None, gt=0, le=1)
    solar_thermal_added_m2: float = Field(default=0, ge=0, le=100)
    solar_thermal_system_efficiency: float | None = Field(default=None, gt=0, le=1)


class OptimizationCandidateRequestV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    baseline: BuildingInput
    measures: ParametricMeasuresV1


class CostLineV1(BaseModel):
    family: str
    capex_lei: float = Field(ge=0)
    parameter_value: float
    parameter_unit: str
    source_kind: str | None = None
    source_url: str | None = None
    confidence: str | None = None
    catalog_unit: str | None = None
    note: str | None = None
    product_id: str | None = None
    sku: str | None = None
    quantity: float | None = None
    quantity_unit: str | None = None
    material_subtotal_lei: float | None = None
    nonmaterial_subtotal_lei: float | None = None


class CandidateEvaluationV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    candidate_id: str
    parameters: ParametricMeasuresV1
    capex_lei: float = Field(ge=0)
    baseline_annual_bill_lei: float
    annual_bill_lei: float
    annual_saving_lei: float
    payback_years: float | None = None
    roi_percent_per_year: float | None = None
    final_energy_kwh: float
    design_heat_load_kw: float | None = None
    primary_specific_kwh_m2: float
    co2_total_kg: float
    co2_specific_kg_m2: float
    energy_class: str
    resulting_configuration: BuildingInput | None = None
    cost_breakdown: list[CostLineV1] = Field(default_factory=list)
    cost_catalog_version: str | None = None
    cost_source: str | None = None
    commercialization_status: Literal[
        "raw_only",
        "pending_product_catalog",
        "ready_for_discretization",
        "partially_discretized",
        "commercialized",
    ] = "pending_product_catalog"
    assumptions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class OptimizationSelectionV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    mode: OptimizationMode
    selected: CandidateEvaluationV1 | None = None
    candidate_count: int
    feasible_count: int
    pareto_count: int
    auto_horizons_years: list[int] = Field(default_factory=list)
    rationale: str
    warnings: list[str] = Field(default_factory=list)


class OptimizationSelectionRequestV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    request: OptimizationRequestV1
    candidates: list[CandidateEvaluationV1] = Field(min_items=1, max_items=10000)


class OptimizationSearchBoundsV1(BaseModel):
    """Internal physical search bounds, not commercial increments."""

    wall_added_r_m2k_w_max: float = Field(default=8.0, gt=0, le=15)
    roof_added_r_m2k_w_max: float = Field(default=10.0, gt=0, le=20)
    floor_added_r_m2k_w_max: float = Field(default=6.0, gt=0, le=15)
    window_replacement_fraction_max: float = Field(default=1.0, gt=0, le=1)
    window_target_u_w_m2k: float = Field(default=0.9, gt=0, le=6)
    pv_added_kwp_max: float = Field(default=15.0, gt=0, le=100)
    solar_thermal_added_m2_max: float = Field(default=8.0, gt=0, le=100)


class OptimizationSearchRequestV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    request: OptimizationRequestV1
    bounds: OptimizationSearchBoundsV1 = Field(default_factory=OptimizationSearchBoundsV1)
    max_evaluations: int = Field(default=36, ge=1, le=128)


class OptimizationSearchResultV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    selection: OptimizationSelectionV1
    bounds: OptimizationSearchBoundsV1
    evaluated_candidates: int
    engine_evaluations: int
    skipped_candidates: int
    max_evaluations: int
    pareto_candidate_ids: list[str] = Field(default_factory=list)
    candidates: list[CandidateEvaluationV1] = Field(default_factory=list)
    search_method: str
    warnings: list[str] = Field(default_factory=list)


def _stable_candidate_id(measures: ParametricMeasuresV1) -> str:
    raw = json.dumps(
        model_to_dict(measures),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    )
    return "OPT-" + hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12].upper()


def _costs(catalog: dict[str, Any]) -> dict[str, dict[str, Any]]:
    raw = catalog.get("costs") if isinstance(catalog, dict) else None
    if isinstance(raw, dict):
        return raw
    return catalog if isinstance(catalog, dict) else {}


def _catalog_item(catalog: dict[str, Any], family: str) -> dict[str, Any]:
    item = _costs(catalog).get(family)
    if not isinstance(item, dict):
        raise ValueError(f"Cost catalog has no entry for family {family!r}.")
    value = item.get("cost_lei")
    if value is None or float(value) <= 0:
        raise ValueError(f"Cost catalog entry {family!r} has no positive cost.")
    return item


def _normalization_lambda(family: str) -> float:
    mapping = methodology()["reference_building"]["physical_mapping"]
    key = {"wall": "wall", "roof": "roof", "floor": "floor"}[family]
    value = mapping[key].get("insulation_lambda_w_mk")
    if value is None or float(value) <= 0:
        raise ValueError(f"Methodology has no normalization lambda for {family}.")
    return float(value)


def _envelope_area(baseline_result: Any, family: str) -> float:
    geometry = baseline_result.envelope_geometry
    return {
        "wall": float(geometry.net_wall_area_m2),
        "roof": float(geometry.roof_area_m2),
        "floor": float(geometry.floor_area_m2),
        "windows": float(geometry.window_area_m2),
    }[family]


def _cost_line(
    *,
    family: str,
    capex_lei: float,
    parameter_value: float,
    parameter_unit: str,
    item: dict[str, Any],
) -> CostLineV1:
    return CostLineV1(
        family=family,
        capex_lei=round(capex_lei, 2),
        parameter_value=round(parameter_value, 6),
        parameter_unit=parameter_unit,
        source_kind=item.get("source_kind"),
        source_url=item.get("source_url"),
        confidence=item.get("confidence"),
        catalog_unit=item.get("unit"),
        note=item.get("note"),
    )


def parametric_capex(
    baseline_result: Any,
    measures: ParametricMeasuresV1,
    catalog: dict[str, Any],
) -> tuple[float, list[CostLineV1], list[str]]:
    """Price raw physical parameters using the current planning catalog.

    Insulation is priced in R-space. The legacy per-cm market allowance is
    converted continuously via d = R * lambda. This is a planning fallback,
    not a claim that market price is intrinsically linear in lambda or R.
    """

    lines: list[CostLineV1] = []
    warnings: list[str] = []

    for family, added_r in (
        ("wall", measures.wall_added_r_m2k_w),
        ("roof", measures.roof_added_r_m2k_w),
        ("floor", measures.floor_added_r_m2k_w),
    ):
        if added_r <= 0:
            continue
        area = _envelope_area(baseline_result, family)
        raw_curve = (
            catalog.get("parametric_curves", {}).get(family)
            if isinstance(catalog.get("parametric_curves"), dict)
            else None
        )
        if raw_curve is not None:
            curve = ParametricCostCurveV1(**raw_curve)
            if curve.family != family:
                raise ValueError(
                    f"Parametric cost curve family {curve.family!r} does not match {family!r}."
                )
            capex = area * curve_cost_per_basis(
                curve,
                float(added_r),
                require_installed_total=True,
            )
            lines.append(
                CostLineV1(
                    family=family,
                    capex_lei=round(capex, 2),
                    parameter_value=round(float(added_r), 6),
                    parameter_unit="m2K/W_added",
                    source_kind="product_derived_parametric_curve",
                    confidence="market_derived",
                    catalog_unit="lei_per_m2_as_function_of_R",
                    note=(
                        f"{curve.source_product_count} product observations; "
                        f"scope={curve.price_scope}."
                    ),
                )
            )
            continue

        item = _catalog_item(catalog, family)
        if item.get("unit") != "lei_per_m2_per_cm":
            raise ValueError(
                f"Cost catalog entry {family!r} must use lei_per_m2_per_cm for the planning fallback."
            )
        lambda_w_mk = _normalization_lambda(family)
        equivalent_thickness_cm = float(added_r) * lambda_w_mk * 100.0
        capex = area * equivalent_thickness_cm * float(item["cost_lei"])
        lines.append(
            _cost_line(
                family=family,
                capex_lei=capex,
                parameter_value=float(added_r),
                parameter_unit="m2K/W_added",
                item=item,
            )
        )
        warnings.append(
            f"{family}: CAPEX is a continuous planning curve derived from the current "
            "per-cm allowance and methodology normalization lambda; product discretization "
            "must replace this estimate before a commercial recommendation."
        )

    if measures.window_replacement_fraction > 0:
        affected_area = _envelope_area(baseline_result, "windows") * float(
            measures.window_replacement_fraction
        )
        raw_curve = (
            catalog.get("parametric_curves", {}).get("windows")
            if isinstance(catalog.get("parametric_curves"), dict)
            else None
        )
        if raw_curve is not None:
            curve = ParametricCostCurveV1(**raw_curve)
            target_resistance = 1.0 / float(measures.window_target_u_w_m2k)
            capex = affected_area * curve_cost_per_basis(
                curve,
                target_resistance,
                require_installed_total=True,
            )
            lines.append(
                CostLineV1(
                    family="windows",
                    capex_lei=round(capex, 2),
                    parameter_value=round(float(measures.window_target_u_w_m2k), 6),
                    parameter_unit="target_Uw_W/m2K",
                    source_kind="product_derived_parametric_curve",
                    confidence="market_derived",
                    catalog_unit="lei_per_m2_as_function_of_1_over_Uw",
                    note=(
                        f"{curve.source_product_count} window-product observations; "
                        f"replacement_fraction={float(measures.window_replacement_fraction):.4f}."
                    ),
                )
            )
        else:
            item = _catalog_item(catalog, "windows")
            if item.get("unit") != "lei_per_m2":
                raise ValueError("Window cost catalog entry must use lei_per_m2.")
            capex = affected_area * float(item["cost_lei"])
            lines.append(
                _cost_line(
                    family="windows",
                    capex_lei=capex,
                    parameter_value=float(measures.window_replacement_fraction),
                    parameter_unit="replacement_fraction",
                    item=item,
                )
            )
            warnings.append(
                "windows: planning fallback uses a flat lei/m2 rate; product-derived Uw cost "
                "curve should replace it before commercial recommendation."
            )

    if measures.pv_added_kwp > 0:
        raw_curve = (
            catalog.get("system_curves", {}).get("pv")
            if isinstance(catalog.get("system_curves"), dict)
            else None
        )
        if raw_curve is not None:
            curve = SystemCostCurveV1(**raw_curve)
            capex = system_curve_cost(
                curve,
                float(measures.pv_added_kwp),
                require_installed_total=True,
            )
            lines.append(
                CostLineV1(
                    family="pv",
                    capex_lei=round(capex, 2),
                    parameter_value=round(float(measures.pv_added_kwp), 6),
                    parameter_unit="kWp_added",
                    source_kind="product_derived_system_curve",
                    confidence="market_derived",
                    catalog_unit="lei_total_as_function_of_kWp",
                    note=f"{curve.source_product_count} PV module products.",
                )
            )
        else:
            item = _catalog_item(catalog, "pv")
            if item.get("unit") != "lei_per_kwp":
                raise ValueError("PV cost catalog entry must use lei_per_kwp.")
            capex = float(measures.pv_added_kwp) * float(item["cost_lei"])
            lines.append(
                _cost_line(
                    family="pv",
                    capex_lei=capex,
                    parameter_value=float(measures.pv_added_kwp),
                    parameter_unit="kWp_added",
                    item=item,
                )
            )

    if measures.solar_thermal_added_m2 > 0:
        raw_curve = (
            catalog.get("system_curves", {}).get("solar_thermal")
            if isinstance(catalog.get("system_curves"), dict)
            else None
        )
        if raw_curve is not None:
            curve = SystemCostCurveV1(**raw_curve)
            capex = system_curve_cost(
                curve,
                float(measures.solar_thermal_added_m2),
                require_installed_total=True,
            )
            lines.append(
                CostLineV1(
                    family="solar_thermal",
                    capex_lei=round(capex, 2),
                    parameter_value=round(float(measures.solar_thermal_added_m2), 6),
                    parameter_unit="m2_added",
                    source_kind="product_derived_system_curve",
                    confidence="market_derived",
                    catalog_unit="lei_total_as_function_of_collector_area",
                    note=f"{curve.source_product_count} solar-thermal products.",
                )
            )
        else:
            item = _catalog_item(catalog, "solar_thermal")
            if item.get("unit") != "lei_per_m2":
                raise ValueError("Solar-thermal cost catalog entry must use lei_per_m2.")
            capex = float(measures.solar_thermal_added_m2) * float(item["cost_lei"])
            lines.append(
                _cost_line(
                    family="solar_thermal",
                    capex_lei=capex,
                    parameter_value=float(measures.solar_thermal_added_m2),
                    parameter_unit="m2_added",
                    item=item,
                )
            )

    return round(sum(line.capex_lei for line in lines), 2), lines, warnings


def _apply_added_r(
    payload: dict[str, Any],
    *,
    component_type: str,
    added_r_m2k_w: float,
) -> None:
    if added_r_m2k_w <= 0:
        return
    changed = 0
    for component in payload.get("envelope", []):
        if component.get("type") != component_type:
            continue
        current_u = float(component["u_value_w_m2k"])
        component["u_value_w_m2k"] = 1.0 / (
            1.0 / current_u + float(added_r_m2k_w)
        )
        changed += 1
    if not changed:
        raise ValueError(f"Baseline has no {component_type!r} component to improve.")


def _apply_partial_window_replacement(
    payload: dict[str, Any],
    *,
    fraction: float,
    target_u_w_m2k: float,
) -> None:
    if fraction <= 0:
        return
    changed = 0
    for component in payload.get("envelope", []):
        if component.get("type") != "window":
            continue
        current_u = float(component["u_value_w_m2k"])
        component["u_value_w_m2k"] = (
            (1.0 - float(fraction)) * current_u
            + float(fraction) * float(target_u_w_m2k)
        )
        changed += 1
    if not changed:
        raise ValueError("Baseline has no window component to replace.")


def apply_parametric_measures(
    baseline: BuildingInput,
    measures: ParametricMeasuresV1,
) -> tuple[BuildingInput, list[str]]:
    """Apply the raw mathematical solution without commercial rounding."""

    payload = model_to_dict(baseline)
    warnings: list[str] = []

    _apply_added_r(
        payload,
        component_type="exterior_wall",
        added_r_m2k_w=measures.wall_added_r_m2k_w,
    )
    _apply_added_r(
        payload,
        component_type="roof",
        added_r_m2k_w=measures.roof_added_r_m2k_w,
    )
    _apply_added_r(
        payload,
        component_type="floor",
        added_r_m2k_w=measures.floor_added_r_m2k_w,
    )
    _apply_partial_window_replacement(
        payload,
        fraction=measures.window_replacement_fraction,
        target_u_w_m2k=measures.window_target_u_w_m2k,
    )
    if measures.window_replacement_fraction > 0:
        warnings.append(
            "Partial window replacement is represented by area-weighted effective U. "
            "The current SolarInput still uses one glazing optical type, so mixed-window "
            "solar transmittance is not yet modeled product-by-product."
        )

    renewables = payload.setdefault("renewables", {})
    pv = renewables.setdefault("pv", {})
    current_pv = (
        float(pv.get("installed_power_kwp") or 0)
        if bool(pv.get("enabled"))
        else 0.0
    )
    new_pv = current_pv + float(measures.pv_added_kwp)
    if new_pv > 0:
        pv["enabled"] = True
        pv["installed_power_kwp"] = new_pv
        pv.setdefault("orientation", "south")
        pv.setdefault("tilt_degrees", 30)
        if measures.pv_performance_ratio is not None:
            pv["performance_ratio"] = float(measures.pv_performance_ratio)

    solar = renewables.setdefault("solar_thermal", {})
    current_solar = (
        float(solar.get("collector_area_m2") or 0)
        if bool(solar.get("enabled"))
        else 0.0
    )
    new_solar = current_solar + float(measures.solar_thermal_added_m2)
    if new_solar > 0:
        solar["enabled"] = True
        solar["collector_area_m2"] = new_solar
        solar.setdefault("orientation", "south")
        solar.setdefault("tilt_degrees", 45)
        if measures.solar_thermal_system_efficiency is not None:
            solar["system_efficiency"] = float(
                measures.solar_thermal_system_efficiency
            )

    return BuildingInput(**payload), warnings


def _design_heat_load_kw(result: Any) -> float | None:
    design_temperature = result.climate.get("winter_design_temperature_c")
    if design_temperature is None:
        return None
    delta_t = max(
        float(result.input.indoor_design_temperature_c)
        - float(design_temperature),
        0.0,
    )
    return round(float(result.heat_loss_w_k) * delta_t / 1000.0, 4)


def evaluate_parametric_candidate(
    baseline: BuildingInput,
    measures: ParametricMeasuresV1,
    catalog: dict[str, Any],
    *,
    baseline_result: Any | None = None,
    baseline_cost: dict[str, Any] | None = None,
) -> CandidateEvaluationV1:
    baseline_result = baseline_result or calculate(baseline, include_reference=False)
    baseline_cost = baseline_cost or estimate_energy_cost(baseline_result)
    if not baseline_cost.get("complete"):
        raise ValueError(
            "Baseline annual bill is incomplete; optimization cannot compare economics safely."
        )

    candidate_building, physical_warnings = apply_parametric_measures(
        baseline,
        measures,
    )
    candidate_result = calculate(candidate_building, include_reference=False)
    candidate_cost = estimate_energy_cost(candidate_result)
    if not candidate_cost.get("complete"):
        raise ValueError(
            "Candidate annual bill is incomplete; optimization cannot compare economics safely."
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

    active_families = [
        line.family
        for line in cost_lines
        if line.capex_lei > 0
    ]
    commercialization_status = (
        "raw_only"
        if not active_families
        else "pending_product_catalog"
    )

    return CandidateEvaluationV1(
        candidate_id=_stable_candidate_id(measures),
        parameters=measures,
        capex_lei=round(capex_lei, 2),
        baseline_annual_bill_lei=round(baseline_bill, 2),
        annual_bill_lei=round(annual_bill, 2),
        annual_saving_lei=round(annual_saving, 2),
        payback_years=None if payback is None else round(payback, 4),
        roi_percent_per_year=None if roi is None else round(roi, 4),
        final_energy_kwh=round(float(candidate_result.total_final_energy_kwh), 3),
        design_heat_load_kw=_design_heat_load_kw(candidate_result),
        primary_specific_kwh_m2=round(
            float(candidate_result.primary_energy.specific_kwh_m2),
            3,
        ),
        co2_total_kg=round(float(candidate_result.co2.total_kg), 3),
        co2_specific_kg_m2=round(float(candidate_result.co2.specific_kg_m2), 3),
        energy_class=candidate_result.energy_class,
        resulting_configuration=candidate_building,
        cost_breakdown=cost_lines,
        cost_catalog_version=catalog.get("catalog_version"),
        cost_source=catalog.get("source"),
        commercialization_status=commercialization_status,
        assumptions=[
            "Raw optimization variables are physical parameters, not commercial product steps.",
            "Energy and annual-bill metrics are recalculated by LaCurent Light for the complete candidate.",
            "Commercial discretization is intentionally downstream of raw optimization.",
        ],
        warnings=[*physical_warnings, *cost_warnings],
    )


def pareto_frontier(
    candidates: list[CandidateEvaluationV1],
) -> list[CandidateEvaluationV1]:
    """Return candidates not dominated in both CAPEX and annual bill."""

    frontier: list[CandidateEvaluationV1] = []
    for candidate in candidates:
        dominated = any(
            other.candidate_id != candidate.candidate_id
            and other.capex_lei <= candidate.capex_lei + 1e-9
            and other.annual_bill_lei <= candidate.annual_bill_lei + 1e-9
            and (
                other.capex_lei < candidate.capex_lei - 1e-9
                or other.annual_bill_lei < candidate.annual_bill_lei - 1e-9
            )
            for other in candidates
        )
        if not dominated:
            frontier.append(candidate)
    return sorted(frontier, key=lambda item: (item.capex_lei, item.annual_bill_lei))


def _auto_economic_choice(
    candidates: list[CandidateEvaluationV1],
) -> tuple[CandidateEvaluationV1 | None, str]:
    if not candidates:
        return None, "No candidate was available for automatic economic analysis."

    horizons = AUTO_ECONOMIC_HORIZONS_YEARS
    rank_sum = {item.candidate_id: 0 for item in candidates}
    horizon_wins = {item.candidate_id: 0 for item in candidates}
    net_by_candidate: dict[str, dict[int, float]] = {}

    for item in candidates:
        net_by_candidate[item.candidate_id] = {
            horizon: float(item.annual_saving_lei) * horizon - float(item.capex_lei)
            for horizon in horizons
        }

    for horizon in horizons:
        ranked = sorted(
            candidates,
            key=lambda item: (
                -net_by_candidate[item.candidate_id][horizon],
                item.capex_lei,
            ),
        )
        best_net = net_by_candidate[ranked[0].candidate_id][horizon]
        for index, item in enumerate(ranked):
            rank_sum[item.candidate_id] += index + 1
            if abs(net_by_candidate[item.candidate_id][horizon] - best_net) <= 0.01:
                horizon_wins[item.candidate_id] += 1

    selected = min(
        candidates,
        key=lambda item: (
            rank_sum[item.candidate_id],
            -horizon_wins[item.candidate_id],
            -net_by_candidate[item.candidate_id][20],
            item.capex_lei,
        ),
    )
    rationale = (
        "Automatic economic mode does not assume one hidden payback horizon. "
        f"It compares simple net benefit at {', '.join(str(value) for value in horizons)} years "
        "and selects the candidate with the strongest cross-horizon rank. "
        "This V1 robustness score excludes financing, inflation, maintenance, replacements "
        "and residual value; those belong in the later lifecycle cost model."
    )
    return selected, rationale


def select_optimization_candidate(
    request: OptimizationRequestV1,
    candidates: list[CandidateEvaluationV1],
) -> OptimizationSelectionV1:
    unique = {
        candidate.candidate_id: candidate
        for candidate in candidates
    }
    pool = list(unique.values())
    frontier = pareto_frontier(pool)

    if request.mode == OptimizationMode.investment_budget:
        budget = float(request.investment_budget_lei)
        feasible = [
            item for item in pool
            if item.capex_lei <= budget + 1e-6
        ]
        selected = min(
            feasible,
            key=lambda item: (
                -item.annual_saving_lei,
                item.capex_lei,
                item.annual_bill_lei,
            ),
        ) if feasible else None
        rationale = (
            f"Selected the largest modeled annual saving without exceeding {budget:.2f} lei CAPEX; "
            "ties prefer lower investment."
        )
    elif request.mode == OptimizationMode.annual_bill_target:
        target = float(request.annual_bill_target_lei)
        feasible = [
            item for item in pool
            if item.annual_bill_lei <= target + 1e-6
        ]
        selected = min(
            feasible,
            key=lambda item: (
                item.capex_lei,
                item.annual_bill_lei,
                -item.annual_saving_lei,
            ),
        ) if feasible else None
        rationale = (
            f"Selected the minimum CAPEX candidate that reaches an annual bill of at most "
            f"{target:.2f} lei."
        )
    elif request.mode == OptimizationMode.max_payback_years:
        limit = float(request.max_payback_years)
        feasible = [
            item for item in pool
            if item.payback_years is not None
            and item.payback_years <= limit + 1e-6
            and item.annual_saving_lei > 0
        ]
        selected = min(
            feasible,
            key=lambda item: (
                -item.annual_saving_lei,
                item.capex_lei,
                item.payback_years or float("inf"),
            ),
        ) if feasible else None
        rationale = (
            f"Accepted only candidates with simple payback <= {limit:.2f} years, then selected "
            "the largest annual saving. This deliberately avoids minimizing payback itself."
        )
    else:
        feasible = frontier if frontier else pool
        selected, rationale = _auto_economic_choice(feasible)

    warnings = []
    if request.mode == OptimizationMode.auto_economic:
        warnings.append(
            "Automatic economic V1 uses transparent multi-horizon simple net benefit, not an "
            "absolute financial optimum. Lifecycle cost inputs will supersede this score when "
            "service-life and maintenance data are source-backed."
        )
    if selected is None:
        warnings.append("No candidate satisfies the selected economic intent.")

    return OptimizationSelectionV1(
        mode=request.mode,
        selected=selected,
        candidate_count=len(pool),
        feasible_count=len(feasible),
        pareto_count=len(frontier),
        auto_horizons_years=(
            list(AUTO_ECONOMIC_HORIZONS_YEARS)
            if request.mode == OptimizationMode.auto_economic
            else []
        ),
        rationale=rationale,
        warnings=warnings,
    )


_SEARCH_DIMENSIONS = (
    ("wall_added_r_m2k_w", "wall_added_r_m2k_w_max"),
    ("roof_added_r_m2k_w", "roof_added_r_m2k_w_max"),
    ("floor_added_r_m2k_w", "floor_added_r_m2k_w_max"),
    ("window_replacement_fraction", "window_replacement_fraction_max"),
    ("pv_added_kwp", "pv_added_kwp_max"),
    ("solar_thermal_added_m2", "solar_thermal_added_m2_max"),
)
_HALTON_BASES = (2, 3, 5, 7, 11, 13)


def _van_der_corput(index: int, base: int) -> float:
    result = 0.0
    denominator = 1.0
    value = index
    while value:
        value, remainder = divmod(value, base)
        denominator *= base
        result += remainder / denominator
    return result


def _measures_from_normalized(
    values: list[float],
    bounds: OptimizationSearchBoundsV1,
) -> ParametricMeasuresV1:
    payload: dict[str, float] = {
        "window_target_u_w_m2k": float(bounds.window_target_u_w_m2k),
    }
    for index, (measure_key, bound_key) in enumerate(_SEARCH_DIMENSIONS):
        normalized = min(max(float(values[index]), 0.0), 1.0)
        payload[measure_key] = normalized * float(getattr(bounds, bound_key))
    return ParametricMeasuresV1(**payload)


def _normalized_from_measures(
    measures: ParametricMeasuresV1,
    bounds: OptimizationSearchBoundsV1,
) -> list[float]:
    values = []
    for measure_key, bound_key in _SEARCH_DIMENSIONS:
        upper = float(getattr(bounds, bound_key))
        values.append(
            min(max(float(getattr(measures, measure_key)) / upper, 0.0), 1.0)
        )
    return values


def _measure_signature(measures: ParametricMeasuresV1) -> tuple[float, ...]:
    return tuple(
        round(float(value), 6)
        for value in (
            measures.wall_added_r_m2k_w,
            measures.roof_added_r_m2k_w,
            measures.floor_added_r_m2k_w,
            measures.window_replacement_fraction,
            measures.window_target_u_w_m2k,
            measures.pv_added_kwp,
            measures.pv_performance_ratio or 0.0,
            measures.solar_thermal_added_m2,
            measures.solar_thermal_system_efficiency or 0.0,
        )
    )


def _axis_phase_candidates(
    bounds: OptimizationSearchBoundsV1,
) -> list[ParametricMeasuresV1]:
    axis_candidates: list[ParametricMeasuresV1] = [
        ParametricMeasuresV1(
            window_target_u_w_m2k=bounds.window_target_u_w_m2k,
        )
    ]
    for dimension in range(len(_SEARCH_DIMENSIONS)):
        for level in (0.5, 1.0):
            vector = [0.0] * len(_SEARCH_DIMENSIONS)
            vector[dimension] = level
            axis_candidates.append(_measures_from_normalized(vector, bounds))

    unique_axis: list[ParametricMeasuresV1] = []
    axis_seen: set[tuple[float, ...]] = set()
    for measures in axis_candidates:
        signature = _measure_signature(measures)
        if signature in axis_seen:
            continue
        axis_seen.add(signature)
        unique_axis.append(measures)
    return unique_axis


def _refinement_phase_candidates(
    bounds: OptimizationSearchBoundsV1,
    refinement_seed: ParametricMeasuresV1,
) -> list[ParametricMeasuresV1]:
    origin = _normalized_from_measures(refinement_seed, bounds)
    refinement_candidates: list[ParametricMeasuresV1] = []
    refinement_seen: set[tuple[float, ...]] = set()
    for step_fraction in (0.125, 0.0625, 0.03125):
        for dimension in range(len(_SEARCH_DIMENSIONS)):
            for direction in (-1.0, 1.0):
                vector = list(origin)
                vector[dimension] = min(
                    max(vector[dimension] + direction * step_fraction, 0.0),
                    1.0,
                )
                measures = _measures_from_normalized(vector, bounds)
                signature = _measure_signature(measures)
                if signature in refinement_seen:
                    continue
                refinement_seen.add(signature)
                refinement_candidates.append(measures)
    return refinement_candidates


def parametric_phase_candidate_descriptors(
    bounds: OptimizationSearchBoundsV1,
    *,
    search_phase: Literal["axis", "halton", "refine"],
    phase_offsets: list[int],
    refinement_seed: ParametricMeasuresV1 | None = None,
    halton_start_index: int = 1,
) -> list[dict[str, Any]]:
    """Describe deterministic phase candidates without running the energy engine.

    This is intentionally cheap and is used for fault traceability. If a
    Worker request is terminated by the platform before it can return a body,
    the browser still knows the exact raw candidate that was attempted.
    """
    descriptors: list[dict[str, Any]] = []
    axis_candidates = _axis_phase_candidates(bounds) if search_phase == "axis" else []
    refinement_candidates = (
        _refinement_phase_candidates(bounds, refinement_seed)
        if search_phase == "refine" and refinement_seed is not None
        else []
    )
    if search_phase == "refine" and refinement_seed is None:
        raise ValueError("Refinement phase requires a seed candidate.")

    for raw_offset in phase_offsets:
        offset = max(int(raw_offset), 0)
        measures: ParametricMeasuresV1 | None = None
        if search_phase == "axis":
            if offset < len(axis_candidates):
                measures = axis_candidates[offset]
        elif search_phase == "halton":
            halton_index = max(int(halton_start_index) + offset, 1)
            vector = [
                _van_der_corput(halton_index, base)
                for base in _HALTON_BASES
            ]
            measures = _measures_from_normalized(vector, bounds)
        elif search_phase == "refine":
            if offset < len(refinement_candidates):
                measures = refinement_candidates[offset]

        if measures is None:
            continue
        descriptors.append(
            {
                "candidate_id": _stable_candidate_id(measures),
                "phase_offset": offset,
                "parameters": model_to_dict(measures),
            }
        )
    return descriptors


def _fallback_refinement_seed(
    request: OptimizationRequestV1,
    candidates: list[CandidateEvaluationV1],
) -> CandidateEvaluationV1 | None:
    if not candidates:
        return None
    if request.mode == OptimizationMode.annual_bill_target:
        return min(candidates, key=lambda item: (item.annual_bill_lei, item.capex_lei))
    if request.mode == OptimizationMode.max_payback_years:
        positive = [
            item for item in candidates
            if item.capex_lei > 0 and item.annual_saving_lei > 0
        ]
        if positive:
            return max(
                positive,
                key=lambda item: (
                    item.annual_saving_lei / item.capex_lei,
                    item.annual_saving_lei,
                ),
            )
    return max(
        candidates,
        key=lambda item: (item.annual_saving_lei, -item.capex_lei),
    )


def compact_refinement_candidate(
    candidate: CandidateEvaluationV1,
) -> dict[str, Any]:
    """Return only fields needed to select a refinement seed."""
    return {
        "candidate_id": candidate.candidate_id,
        "parameters": model_to_dict(candidate.parameters),
        "capex_lei": float(candidate.capex_lei),
        "annual_bill_lei": float(candidate.annual_bill_lei),
        "annual_saving_lei": float(candidate.annual_saving_lei),
        "payback_years": (
            None if candidate.payback_years is None else float(candidate.payback_years)
        ),
    }


def refinement_seed_from_compact(
    request: OptimizationRequestV1,
    rows: list[dict[str, Any]],
) -> ParametricMeasuresV1 | None:
    """Select a refinement seed without deserializing complete building results."""
    compact: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get("parameters"), dict):
            continue
        try:
            compact.append({
                "candidate_id": str(row.get("candidate_id") or ""),
                "parameters": ParametricMeasuresV1(**row["parameters"]),
                "capex_lei": float(row.get("capex_lei") or 0.0),
                "annual_bill_lei": float(row.get("annual_bill_lei") or 0.0),
                "annual_saving_lei": float(row.get("annual_saving_lei") or 0.0),
                "payback_years": (
                    None if row.get("payback_years") is None
                    else float(row.get("payback_years"))
                ),
            })
        except (TypeError, ValueError):
            continue
    if not compact:
        return None

    def pareto_pool(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for item in items:
            dominated = any(
                other["candidate_id"] != item["candidate_id"]
                and other["capex_lei"] <= item["capex_lei"] + 1e-9
                and other["annual_bill_lei"] <= item["annual_bill_lei"] + 1e-9
                and (
                    other["capex_lei"] < item["capex_lei"] - 1e-9
                    or other["annual_bill_lei"] < item["annual_bill_lei"] - 1e-9
                )
                for other in items
            )
            if not dominated:
                out.append(item)
        return out

    selected: dict[str, Any] | None = None
    if request.mode == OptimizationMode.investment_budget:
        budget = float(request.investment_budget_lei)
        feasible = [x for x in compact if x["capex_lei"] <= budget + 1e-6]
        selected = (
            min(feasible, key=lambda x: (-x["annual_saving_lei"], x["capex_lei"], x["annual_bill_lei"]))
            if feasible
            else max(compact, key=lambda x: (x["annual_saving_lei"], -x["capex_lei"]))
        )
    elif request.mode == OptimizationMode.annual_bill_target:
        target = float(request.annual_bill_target_lei)
        feasible = [x for x in compact if x["annual_bill_lei"] <= target + 1e-6]
        selected = (
            min(feasible, key=lambda x: (x["capex_lei"], x["annual_bill_lei"], -x["annual_saving_lei"]))
            if feasible
            else min(compact, key=lambda x: (x["annual_bill_lei"], x["capex_lei"]))
        )
    elif request.mode == OptimizationMode.max_payback_years:
        limit = float(request.max_payback_years)
        feasible = [
            x for x in compact
            if x["payback_years"] is not None
            and x["payback_years"] <= limit + 1e-6
            and x["annual_saving_lei"] > 0
        ]
        if feasible:
            selected = min(feasible, key=lambda x: (-x["annual_saving_lei"], x["capex_lei"], x["payback_years"] or float("inf")))
        else:
            positive = [x for x in compact if x["capex_lei"] > 0 and x["annual_saving_lei"] > 0]
            selected = (
                max(positive, key=lambda x: (x["annual_saving_lei"] / x["capex_lei"], x["annual_saving_lei"]))
                if positive
                else max(compact, key=lambda x: (x["annual_saving_lei"], -x["capex_lei"]))
            )
    else:
        pool = pareto_pool(compact) or compact
        horizons = AUTO_ECONOMIC_HORIZONS_YEARS
        rank_sum = {id(x): 0 for x in pool}
        horizon_wins = {id(x): 0 for x in pool}
        net = {
            id(x): {h: x["annual_saving_lei"] * h - x["capex_lei"] for h in horizons}
            for x in pool
        }
        for horizon in horizons:
            ranked = sorted(pool, key=lambda x: (-net[id(x)][horizon], x["capex_lei"]))
            best_net = net[id(ranked[0])][horizon]
            for rank, item in enumerate(ranked):
                rank_sum[id(item)] += rank + 1
                if abs(net[id(item)][horizon] - best_net) <= 0.01:
                    horizon_wins[id(item)] += 1
        selected = min(
            pool,
            key=lambda x: (
                rank_sum[id(x)],
                -horizon_wins[id(x)],
                -net[id(x)][20],
                x["capex_lei"],
            ),
        )
    return selected["parameters"] if selected is not None else None


def run_parametric_optimization(
    payload: OptimizationSearchRequestV1,
    catalog: dict[str, Any],
    *,
    candidate_postprocessor: Callable[[CandidateEvaluationV1], CandidateEvaluationV1 | None] | None = None,
    search_phase: Literal["full", "axis", "halton", "refine"] = "full",
    refinement_seed: ParametricMeasuresV1 | None = None,
    halton_start_index: int = 1,
    phase_candidate_offset: int = 0,
) -> OptimizationSearchResultV1:
    """Deterministic bounded search in raw physical parameter space.

    Full mode keeps the original all-in-one search. Home Lab can execute the
    same search family in CPU-safe phases: axis, halton, then refine.
    """

    request = payload.request
    bounds = payload.bounds
    max_evaluations = int(payload.max_evaluations)
    baseline_result = calculate(request.baseline, include_reference=False)
    baseline_cost = estimate_energy_cost(baseline_result)
    if not baseline_cost.get("complete"):
        raise ValueError(
            "Baseline annual bill is incomplete; parametric optimization cannot run safely."
        )

    evaluated: list[CandidateEvaluationV1] = []
    seen: set[tuple[float, ...]] = set()
    skipped = 0
    engine_evaluations = 0

    def evaluate_if_new(measures: ParametricMeasuresV1) -> bool:
        nonlocal skipped, engine_evaluations
        if engine_evaluations >= max_evaluations:
            return False
        signature = _measure_signature(measures)
        if signature in seen:
            skipped += 1
            return False
        seen.add(signature)

        try:
            item = evaluate_parametric_candidate(
                request.baseline,
                measures,
                catalog,
                baseline_result=baseline_result,
                baseline_cost=baseline_cost,
            )
            engine_evaluations += 1
            if candidate_postprocessor is not None:
                item = candidate_postprocessor(item)
                if item is None:
                    skipped += 1
                    return False
        except ValueError:
            engine_evaluations += 1
            skipped += 1
            return False
        evaluated.append(item)
        return True

    if search_phase == "axis":
        unique_axis = _axis_phase_candidates(bounds)
        offset = max(int(phase_candidate_offset), 0)
        for measures in unique_axis[offset:offset + max_evaluations]:
            evaluate_if_new(measures)

    elif search_phase == "full":
        evaluate_if_new(
            ParametricMeasuresV1(
                window_target_u_w_m2k=bounds.window_target_u_w_m2k,
            )
        )
        for dimension in range(len(_SEARCH_DIMENSIONS)):
            for level in (0.5, 1.0):
                if engine_evaluations >= max_evaluations:
                    break
                vector = [0.0] * len(_SEARCH_DIMENSIONS)
                vector[dimension] = level
                evaluate_if_new(_measures_from_normalized(vector, bounds))
            if engine_evaluations >= max_evaluations:
                break

    if search_phase == "halton":
        halton_index = max(int(halton_start_index) + max(int(phase_candidate_offset), 0), 1)
        attempts = 0
        attempt_limit = max_evaluations * 8
        while engine_evaluations < max_evaluations and attempts < attempt_limit:
            vector = [
                _van_der_corput(halton_index, base)
                for base in _HALTON_BASES
            ]
            evaluate_if_new(_measures_from_normalized(vector, bounds))
            halton_index += 1
            attempts += 1

    elif search_phase == "refine":
        if refinement_seed is None:
            raise ValueError("Refinement phase requires a seed candidate.")
        refinement_candidates = _refinement_phase_candidates(bounds, refinement_seed)
        offset = max(int(phase_candidate_offset), 0)
        for measures in refinement_candidates[offset:offset + max_evaluations]:
            evaluate_if_new(measures)

    elif search_phase == "full":
        refinement_reserve = max(6, min(12, max_evaluations // 4))
        coarse_limit = max(engine_evaluations, max_evaluations - refinement_reserve)
        halton_index = max(int(halton_start_index), 1)
        attempts = 0
        halton_attempt_limit = max_evaluations * 6
        while engine_evaluations < coarse_limit and attempts < halton_attempt_limit:
            vector = [
                _van_der_corput(halton_index, base)
                for base in _HALTON_BASES
            ]
            evaluate_if_new(_measures_from_normalized(vector, bounds))
            halton_index += 1
            attempts += 1

        for step_fraction in (0.125, 0.0625):
            if engine_evaluations >= max_evaluations:
                break
            current_selection = select_optimization_candidate(request, evaluated)
            seed = current_selection.selected or _fallback_refinement_seed(
                request,
                evaluated,
            )
            if seed is None:
                break
            origin = _normalized_from_measures(seed.parameters, bounds)
            for dimension in range(len(_SEARCH_DIMENSIONS)):
                for direction in (-1.0, 1.0):
                    if engine_evaluations >= max_evaluations:
                        break
                    vector = list(origin)
                    vector[dimension] = min(
                        max(vector[dimension] + direction * step_fraction, 0.0),
                        1.0,
                    )
                    evaluate_if_new(_measures_from_normalized(vector, bounds))
                if engine_evaluations >= max_evaluations:
                    break

    selection = select_optimization_candidate(request, evaluated)
    frontier = pareto_frontier(evaluated)
    method = {
        "full": "axis_halton_coordinate_refinement_v1",
        "axis": "axis_phase_v2",
        "halton": "halton_phase_v2",
        "refine": "coordinate_refinement_phase_v2",
    }[search_phase]

    return OptimizationSearchResultV1(
        selection=selection,
        bounds=bounds,
        evaluated_candidates=len(evaluated),
        engine_evaluations=engine_evaluations,
        skipped_candidates=skipped,
        max_evaluations=max_evaluations,
        pareto_candidate_ids=[item.candidate_id for item in frontier],
        candidates=evaluated,
        search_method=method,
        warnings=[
            "Search bounds are numerical safety bounds, not commercial package sizes.",
            "Home Lab can shard axis, Halton and refinement phases into separate Worker requests while preserving total search depth.",
            "The selected candidate is still a raw mathematical solution. It must be commercially discretized and then recalculated before appearing as the implementable recommendation in the final report.",
        ],
    )
