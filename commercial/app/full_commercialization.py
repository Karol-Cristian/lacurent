from __future__ import annotations

import hashlib
import json
from typing import Any, Literal

from pydantic import BaseModel, Field

from .cost_curves import (
    build_insulation_product_cost_curve,
    build_wall_product_cost_curve,
    discretize_insulation_product,
    discretize_wall_product,
)
from .engine import calculate
from .extended_costs import (
    build_pv_system_cost_curve,
    build_solar_thermal_system_cost_curve,
    build_window_product_cost_curve,
    discretize_pv,
    discretize_solar_thermal,
    discretize_windows,
)
from .market_products import (
    FullProductCatalogV1,
    FullProductCostInputsV1,
    HeatingSystemProductV1,
)
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


class ProductTraceV1(BaseModel):
    family: str
    product_id: str
    sku: str | None = None
    raw_parameter: float
    realized_parameter: float
    parameter_unit: str
    quantity: float | None = None
    quantity_unit: str | None = None
    installed_capex_lei: float
    note: str


class ContinuousCommercializationResultV1(BaseModel):
    raw_candidate_id: str
    commercial_candidate: CandidateEvaluationV1
    traces: list[ProductTraceV1] = Field(default_factory=list)
    exact_families: list[str] = Field(default_factory=list)
    pending_families: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class FullProductBackedOptimizationRequestV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    search: OptimizationSearchRequestV1
    wall_products: list[WallInsulationProductV1] = Field(default_factory=list)
    catalog: FullProductCatalogV1 = Field(default_factory=FullProductCatalogV1)
    cost_inputs: FullProductCostInputsV1 = Field(default_factory=FullProductCostInputsV1)
    max_continuous_commercializations: int = Field(default=48, ge=1, le=128)
    max_heating_evaluations: int = Field(default=96, ge=0, le=512)


class FullProductBackedOptimizationResultV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    raw_search: OptimizationSearchResultV1
    continuous_commercializations: list[ContinuousCommercializationResultV1] = Field(
        default_factory=list
    )
    final_selection: OptimizationSelectionV1
    continuous_rechecks: int
    heating_rechecks: int
    fully_commercialized_count: int
    partially_commercialized_count: int
    skipped_candidates: int
    warnings: list[str] = Field(default_factory=list)


def _clone_catalog(catalog: dict[str, Any]) -> dict[str, Any]:
    return json.loads(json.dumps(catalog))


def _active_families(measures: ParametricMeasuresV1) -> set[str]:
    active = set()
    if measures.wall_added_r_m2k_w > 1e-9:
        active.add("wall")
    if measures.roof_added_r_m2k_w > 1e-9:
        active.add("roof")
    if measures.floor_added_r_m2k_w > 1e-9:
        active.add("floor")
    if measures.window_replacement_fraction > 1e-9:
        active.add("windows")
    if measures.pv_added_kwp > 1e-9:
        active.add("pv")
    if measures.solar_thermal_added_m2 > 1e-9:
        active.add("solar_thermal")
    return active


def _product_backed_catalog(
    payload: FullProductBackedOptimizationRequestV1,
    base_catalog: dict[str, Any],
) -> tuple[dict[str, Any], list[str]]:
    catalog = _clone_catalog(base_catalog)
    parametric = catalog.setdefault("parametric_curves", {})
    systems = catalog.setdefault("system_curves", {})
    warnings: list[str] = []
    costs = payload.cost_inputs

    if payload.wall_products and costs.wall_nonmaterial_installed_cost_per_m2_lei is not None:
        parametric["wall"] = model_to_dict(
            build_wall_product_cost_curve(
                payload.wall_products,
                nonmaterial_installed_cost_per_m2_lei=(
                    costs.wall_nonmaterial_installed_cost_per_m2_lei
                ),
            )
        )
    else:
        warnings.append("wall: no complete product-derived installed-cost curve supplied.")

    if (
        payload.catalog.roof_insulation
        and costs.roof_nonmaterial_installed_cost_per_m2_lei is not None
    ):
        parametric["roof"] = model_to_dict(
            build_insulation_product_cost_curve(
                "roof",
                payload.catalog.roof_insulation,
                nonmaterial_installed_cost_per_m2_lei=(
                    costs.roof_nonmaterial_installed_cost_per_m2_lei
                ),
            )
        )
    else:
        warnings.append("roof: no complete product-derived installed-cost curve supplied.")

    if (
        payload.catalog.floor_insulation
        and costs.floor_nonmaterial_installed_cost_per_m2_lei is not None
    ):
        parametric["floor"] = model_to_dict(
            build_insulation_product_cost_curve(
                "floor",
                payload.catalog.floor_insulation,
                nonmaterial_installed_cost_per_m2_lei=(
                    costs.floor_nonmaterial_installed_cost_per_m2_lei
                ),
            )
        )
    else:
        warnings.append("floor: no complete product-derived installed-cost curve supplied.")

    if payload.catalog.windows and costs.window_nonmaterial_installed_cost_per_m2_lei is not None:
        parametric["windows"] = model_to_dict(
            build_window_product_cost_curve(
                payload.catalog.windows,
                nonmaterial_installed_cost_per_m2_lei=(
                    costs.window_nonmaterial_installed_cost_per_m2_lei
                ),
            )
        )
    else:
        warnings.append("windows: no complete product-derived installed-cost curve supplied.")

    if (
        payload.catalog.pv_modules
        and costs.pv_nonmodule_installed_cost_per_kwp_lei is not None
    ):
        systems["pv"] = model_to_dict(
            build_pv_system_cost_curve(
                payload.catalog.pv_modules,
                max_added_kwp=payload.search.bounds.pv_added_kwp_max,
                activation_cost_lei=costs.pv_activation_cost_lei,
                nonmodule_installed_cost_per_kwp_lei=(
                    costs.pv_nonmodule_installed_cost_per_kwp_lei
                ),
            )
        )
    else:
        warnings.append("pv: no complete product-derived installed-cost curve supplied.")

    if (
        payload.catalog.solar_thermal_collectors
        and costs.solar_thermal_noncollector_installed_cost_per_m2_lei is not None
    ):
        systems["solar_thermal"] = model_to_dict(
            build_solar_thermal_system_cost_curve(
                payload.catalog.solar_thermal_collectors,
                max_added_area_m2=payload.search.bounds.solar_thermal_added_m2_max,
                activation_cost_lei=costs.solar_thermal_activation_cost_lei,
                noncollector_installed_cost_per_m2_lei=(
                    costs.solar_thermal_noncollector_installed_cost_per_m2_lei
                ),
            )
        )
    else:
        warnings.append(
            "solar_thermal: no complete product-derived installed-cost curve supplied."
        )
    return catalog, warnings


def _exact_line(
    *,
    family: str,
    capex_lei: float,
    parameter_value: float,
    parameter_unit: str,
    product_id: str,
    sku: str | None,
    quantity: float | None,
    quantity_unit: str | None,
    material_subtotal_lei: float,
    nonmaterial_subtotal_lei: float,
    source_url: str | None,
    note: str,
) -> CostLineV1:
    return CostLineV1(
        family=family,
        capex_lei=round(float(capex_lei), 2),
        parameter_value=round(float(parameter_value), 6),
        parameter_unit=parameter_unit,
        source_kind="commercial_product_installed_total",
        source_url=source_url,
        confidence="product_exact_plus_sourced_nonmaterial",
        catalog_unit="commercial_discrete_solution",
        note=note,
        product_id=product_id,
        sku=sku,
        quantity=quantity,
        quantity_unit=quantity_unit,
        material_subtotal_lei=round(float(material_subtotal_lei), 2),
        nonmaterial_subtotal_lei=round(float(nonmaterial_subtotal_lei), 2),
    )


def _replace_exact_lines(
    evaluated: CandidateEvaluationV1,
    *,
    exact_lines: dict[str, CostLineV1],
    active_families: set[str],
) -> CandidateEvaluationV1:
    lines = []
    seen = set()
    for line in evaluated.cost_breakdown:
        replacement = exact_lines.get(line.family)
        if replacement is not None:
            if line.family not in seen:
                lines.append(replacement)
                seen.add(line.family)
        else:
            lines.append(line)
    for family, line in exact_lines.items():
        if family not in seen:
            lines.append(line)

    capex = sum(float(line.capex_lei) for line in lines)
    saving = float(evaluated.annual_saving_lei)
    payback = capex / saving if capex > 0 and saving > 0 else None
    roi = 100.0 * saving / capex if capex > 0 else None
    exact_families = set(exact_lines)
    complete = active_families.issubset(exact_families)

    data = model_to_dict(evaluated)
    data.update(
        {
            "capex_lei": round(capex, 2),
            "payback_years": None if payback is None else round(payback, 4),
            "roi_percent_per_year": None if roi is None else round(roi, 4),
            "cost_breakdown": [model_to_dict(line) for line in lines],
            "cost_source": "product_discretized_recalculated",
            "commercialization_status": (
                "commercialized"
                if complete and active_families
                else (
                    "raw_only"
                    if not active_families
                    else "partially_discretized"
                )
            ),
        }
    )
    return CandidateEvaluationV1(**data)


def commercialize_continuous_candidate(
    *,
    baseline: BuildingInput,
    raw_candidate: CandidateEvaluationV1,
    payload: FullProductBackedOptimizationRequestV1,
    priced_catalog: dict[str, Any],
) -> ContinuousCommercializationResultV1:
    baseline_result = calculate(baseline, include_reference=False)
    baseline_cost = estimate_energy_cost(baseline_result)
    if not baseline_cost.get("complete"):
        raise ValueError("Baseline annual bill is incomplete.")

    measures_data = model_to_dict(raw_candidate.parameters)
    exact: dict[str, CostLineV1] = {}
    traces: list[ProductTraceV1] = []
    warnings: list[str] = []
    active = _active_families(raw_candidate.parameters)
    costs = payload.cost_inputs

    if "wall" in active:
        if not payload.wall_products or costs.wall_nonmaterial_installed_cost_per_m2_lei is None:
            warnings.append("wall remains parametric: complete product/installation catalog missing.")
        else:
            area = float(baseline_result.envelope_geometry.net_wall_area_m2)
            d = discretize_wall_product(
                target_added_r_m2k_w=raw_candidate.parameters.wall_added_r_m2k_w,
                affected_area_m2=area,
                products=payload.wall_products,
            )
            if d.material_subtotal_lei is None:
                raise ValueError("Wall product lacks complete package price.")
            nonmaterial = area * float(costs.wall_nonmaterial_installed_cost_per_m2_lei)
            total = float(d.material_subtotal_lei) + nonmaterial
            measures_data["wall_added_r_m2k_w"] = d.realized_added_r_m2k_w
            exact["wall"] = _exact_line(
                family="wall",
                capex_lei=total,
                parameter_value=d.realized_added_r_m2k_w,
                parameter_unit="m2K/W_added",
                product_id=d.product.product_id,
                sku=d.product.sku,
                quantity=None if d.packages is None else float(d.packages),
                quantity_unit="packages",
                material_subtotal_lei=float(d.material_subtotal_lei),
                nonmaterial_subtotal_lei=nonmaterial,
                source_url=d.product.product_url,
                note="Actual package rounding plus sourced non-material installed cost.",
            )
            traces.append(
                ProductTraceV1(
                    family="wall",
                    product_id=d.product.product_id,
                    sku=d.product.sku,
                    raw_parameter=raw_candidate.parameters.wall_added_r_m2k_w,
                    realized_parameter=d.realized_added_r_m2k_w,
                    parameter_unit="m2K/W_added",
                    quantity=None if d.packages is None else float(d.packages),
                    quantity_unit="packages",
                    installed_capex_lei=round(total, 2),
                    note=d.selection_basis,
                )
            )

    for family, field, products, nonmaterial_rate, area in (
        (
            "roof",
            "roof_added_r_m2k_w",
            payload.catalog.roof_insulation,
            costs.roof_nonmaterial_installed_cost_per_m2_lei,
            float(baseline_result.envelope_geometry.roof_area_m2),
        ),
        (
            "floor",
            "floor_added_r_m2k_w",
            payload.catalog.floor_insulation,
            costs.floor_nonmaterial_installed_cost_per_m2_lei,
            float(baseline_result.envelope_geometry.floor_area_m2),
        ),
    ):
        if family not in active:
            continue
        if not products or nonmaterial_rate is None:
            warnings.append(
                f"{family} remains parametric: complete product/installation catalog missing."
            )
            continue
        d = discretize_insulation_product(
            family=family,
            target_added_r_m2k_w=float(getattr(raw_candidate.parameters, field)),
            affected_area_m2=area,
            products=products,
        )
        if d.material_subtotal_lei is None:
            raise ValueError(f"{family} product lacks complete package price.")
        nonmaterial = area * float(nonmaterial_rate)
        total = float(d.material_subtotal_lei) + nonmaterial
        measures_data[field] = d.realized_added_r_m2k_w
        exact[family] = _exact_line(
            family=family,
            capex_lei=total,
            parameter_value=d.realized_added_r_m2k_w,
            parameter_unit="m2K/W_added",
            product_id=d.product.product_id,
            sku=d.product.sku,
            quantity=None if d.packages is None else float(d.packages),
            quantity_unit="packages",
            material_subtotal_lei=float(d.material_subtotal_lei),
            nonmaterial_subtotal_lei=nonmaterial,
            source_url=d.product.product_url,
            note="Actual package rounding plus sourced non-material installed cost.",
        )
        traces.append(
            ProductTraceV1(
                family=family,
                product_id=d.product.product_id,
                sku=d.product.sku,
                raw_parameter=float(getattr(raw_candidate.parameters, field)),
                realized_parameter=d.realized_added_r_m2k_w,
                parameter_unit="m2K/W_added",
                quantity=None if d.packages is None else float(d.packages),
                quantity_unit="packages",
                installed_capex_lei=round(total, 2),
                note=d.selection_basis,
            )
        )

    if "windows" in active:
        if (
            not payload.catalog.windows
            or not payload.catalog.window_units
            or costs.window_nonmaterial_installed_cost_per_m2_lei is None
        ):
            warnings.append(
                "windows remain parametric: product catalog, whole-window inventory, or installation cost is missing."
            )
        else:
            model_area = float(baseline_result.envelope_geometry.window_area_m2)
            inventory_area = sum(float(unit.area_m2) for unit in payload.catalog.window_units)
            tolerance = max(0.25, model_area * 0.05)
            if abs(inventory_area - model_area) > tolerance:
                raise ValueError(
                    "Window inventory area differs materially from the modeled window area; "
                    "whole-window discretization would not be traceable."
                )
            d = discretize_windows(
                target_replacement_fraction=raw_candidate.parameters.window_replacement_fraction,
                target_u_w_m2k=raw_candidate.parameters.window_target_u_w_m2k,
                units=payload.catalog.window_units,
                products=payload.catalog.windows,
                nonmaterial_installed_cost_per_m2_lei=float(
                    costs.window_nonmaterial_installed_cost_per_m2_lei
                ),
            )
            measures_data["window_replacement_fraction"] = min(
                float(d.replaced_area_m2) / model_area,
                1.0,
            )
            measures_data["window_target_u_w_m2k"] = d.realized_u_w_m2k
            exact["windows"] = _exact_line(
                family="windows",
                capex_lei=d.installed_capex_lei,
                parameter_value=d.realized_replacement_fraction,
                parameter_unit="replacement_fraction",
                product_id=d.product.product_id,
                sku=d.product.sku,
                quantity=float(len(d.selected_unit_ids)),
                quantity_unit="window_units",
                material_subtotal_lei=d.material_subtotal_lei,
                nonmaterial_subtotal_lei=d.nonmaterial_subtotal_lei,
                source_url=d.product.product_url,
                note=(
                    "Whole-window inventory selection: "
                    + ", ".join(d.selected_unit_ids)
                ),
            )
            traces.append(
                ProductTraceV1(
                    family="windows",
                    product_id=d.product.product_id,
                    sku=d.product.sku,
                    raw_parameter=raw_candidate.parameters.window_replacement_fraction,
                    realized_parameter=min(float(d.replaced_area_m2) / model_area, 1.0),
                    parameter_unit="replacement_fraction",
                    quantity=float(len(d.selected_unit_ids)),
                    quantity_unit="window_units",
                    installed_capex_lei=d.installed_capex_lei,
                    note=d.selection_basis,
                )
            )
            warnings.extend(d.warnings)

    if "pv" in active:
        if (
            not payload.catalog.pv_modules
            or costs.pv_nonmodule_installed_cost_per_kwp_lei is None
        ):
            warnings.append("pv remains parametric: module/BOS catalog is incomplete.")
        else:
            d = discretize_pv(
                target_added_kwp=raw_candidate.parameters.pv_added_kwp,
                products=payload.catalog.pv_modules,
                activation_cost_lei=costs.pv_activation_cost_lei,
                nonmodule_installed_cost_per_kwp_lei=float(
                    costs.pv_nonmodule_installed_cost_per_kwp_lei
                ),
            )
            measures_data["pv_added_kwp"] = d.realized_added_kwp
            measures_data["pv_performance_ratio"] = d.product.performance_ratio
            exact["pv"] = _exact_line(
                family="pv",
                capex_lei=d.installed_capex_lei,
                parameter_value=d.realized_added_kwp,
                parameter_unit="kWp_added",
                product_id=d.product.product_id,
                sku=d.product.sku,
                quantity=float(d.module_count),
                quantity_unit="modules",
                material_subtotal_lei=d.material_subtotal_lei,
                nonmaterial_subtotal_lei=(
                    d.nonmodule_subtotal_lei + d.activation_cost_lei
                ),
                source_url=d.product.product_url,
                note="Whole-module rounding plus BOS/activation cost.",
            )
            traces.append(
                ProductTraceV1(
                    family="pv",
                    product_id=d.product.product_id,
                    sku=d.product.sku,
                    raw_parameter=raw_candidate.parameters.pv_added_kwp,
                    realized_parameter=d.realized_added_kwp,
                    parameter_unit="kWp_added",
                    quantity=float(d.module_count),
                    quantity_unit="modules",
                    installed_capex_lei=d.installed_capex_lei,
                    note="PV power rounded to whole modules.",
                )
            )

    if "solar_thermal" in active:
        if (
            not payload.catalog.solar_thermal_collectors
            or costs.solar_thermal_noncollector_installed_cost_per_m2_lei is None
        ):
            warnings.append(
                "solar_thermal remains parametric: collector/system cost catalog is incomplete."
            )
        else:
            d = discretize_solar_thermal(
                target_added_area_m2=raw_candidate.parameters.solar_thermal_added_m2,
                products=payload.catalog.solar_thermal_collectors,
                activation_cost_lei=costs.solar_thermal_activation_cost_lei,
                noncollector_installed_cost_per_m2_lei=float(
                    costs.solar_thermal_noncollector_installed_cost_per_m2_lei
                ),
            )
            measures_data["solar_thermal_added_m2"] = d.realized_added_area_m2
            measures_data["solar_thermal_system_efficiency"] = d.product.system_efficiency
            exact["solar_thermal"] = _exact_line(
                family="solar_thermal",
                capex_lei=d.installed_capex_lei,
                parameter_value=d.realized_added_area_m2,
                parameter_unit="m2_added",
                product_id=d.product.product_id,
                sku=d.product.sku,
                quantity=float(d.collector_count),
                quantity_unit="collectors",
                material_subtotal_lei=d.material_subtotal_lei,
                nonmaterial_subtotal_lei=(
                    d.noncollector_subtotal_lei + d.activation_cost_lei
                ),
                source_url=d.product.product_url,
                note="Whole-collector rounding plus system/activation cost.",
            )
            traces.append(
                ProductTraceV1(
                    family="solar_thermal",
                    product_id=d.product.product_id,
                    sku=d.product.sku,
                    raw_parameter=raw_candidate.parameters.solar_thermal_added_m2,
                    realized_parameter=d.realized_added_area_m2,
                    parameter_unit="m2_added",
                    quantity=float(d.collector_count),
                    quantity_unit="collectors",
                    installed_capex_lei=d.installed_capex_lei,
                    note="Collector area rounded to whole collectors.",
                )
            )

    measures = ParametricMeasuresV1(**measures_data)
    recalculated = evaluate_parametric_candidate(
        baseline,
        measures,
        priced_catalog,
        baseline_result=baseline_result,
        baseline_cost=baseline_cost,
    )
    commercial = _replace_exact_lines(
        recalculated,
        exact_lines=exact,
        active_families=active,
    )
    pending = sorted(active.difference(exact))
    if traces:
        commercial.assumptions.append(
            "Product-backed measures were discretized first; the complete house was then recalculated once with all realized physical values."
        )
    commercial.warnings.extend(warnings)
    return ContinuousCommercializationResultV1(
        raw_candidate_id=raw_candidate.candidate_id,
        commercial_candidate=commercial,
        traces=traces,
        exact_families=sorted(exact),
        pending_families=pending,
        warnings=warnings,
    )


def _candidate_id_with_heating(
    candidate: CandidateEvaluationV1,
    product: HeatingSystemProductV1,
) -> str:
    raw = json.dumps(
        {
            "candidate": candidate.candidate_id,
            "heating_product": product.product_id,
            "sku": product.sku,
        },
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    )
    return "OPT-MIX-" + hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12].upper()


def _apply_heating_product(
    candidate: CandidateEvaluationV1,
    product: HeatingSystemProductV1,
) -> CandidateEvaluationV1 | None:
    if candidate.resulting_configuration is None:
        return None
    if (
        candidate.design_heat_load_kw is not None
        and float(product.rated_power_kw) + 1e-9 < float(candidate.design_heat_load_kw)
    ):
        return None

    building_data = model_to_dict(candidate.resulting_configuration)
    building_data["heating"] = model_to_dict(product.heating)

    dhw = building_data.get("dhw") or {}
    if dhw.get("enabled") and dhw.get("system_type") == "same_as_heating":
        if product.heating.system_type.value == "heat_pump":
            dhw["cop"] = float(product.heating.scop)
            dhw["efficiency"] = None
            dhw["carrier"] = "electricity"
        else:
            dhw["cop"] = None
            dhw["efficiency"] = float(product.heating.efficiency)
            dhw["carrier"] = product.heating.carrier.value
        building_data["dhw"] = dhw

    building = BuildingInput(**building_data)
    result = calculate(building, include_reference=False)
    priced = estimate_energy_cost(result)
    if not priced.get("complete"):
        return None

    heating_line = CostLineV1(
        family="heating",
        capex_lei=round(product.installed_capex_lei, 2),
        parameter_value=float(product.rated_power_kw),
        parameter_unit="kW_rated",
        source_kind="commercial_product_installed_total",
        source_url=product.product_url,
        confidence="product_exact",
        catalog_unit="equipment_plus_installation",
        note="Discrete heating-system branch with explicit product performance.",
        product_id=product.product_id,
        sku=product.sku,
        quantity=1,
        quantity_unit="system",
        material_subtotal_lei=round(float(product.equipment_price_lei), 2),
        nonmaterial_subtotal_lei=round(float(product.installation_price_lei), 2),
    )
    lines = [line for line in candidate.cost_breakdown if line.family != "heating"]
    lines.append(heating_line)
    capex = sum(float(line.capex_lei) for line in lines)
    annual_bill = float(priced["priced_total_lei"])
    saving = float(candidate.baseline_annual_bill_lei) - annual_bill
    payback = capex / saving if capex > 0 and saving > 0 else None
    roi = 100.0 * saving / capex if capex > 0 else None

    design_temperature = result.climate.get("winter_design_temperature_c")
    design_load = None
    if design_temperature is not None:
        delta_t = max(
            float(result.input.indoor_design_temperature_c)
            - float(design_temperature),
            0.0,
        )
        design_load = float(result.heat_loss_w_k) * delta_t / 1000.0

    data = model_to_dict(candidate)
    data.update(
        {
            "candidate_id": _candidate_id_with_heating(candidate, product),
            "capex_lei": round(capex, 2),
            "annual_bill_lei": round(annual_bill, 2),
            "annual_saving_lei": round(saving, 2),
            "payback_years": None if payback is None else round(payback, 4),
            "roi_percent_per_year": None if roi is None else round(roi, 4),
            "final_energy_kwh": round(float(result.total_final_energy_kwh), 3),
            "design_heat_load_kw": (
                None if design_load is None else round(design_load, 4)
            ),
            "primary_specific_kwh_m2": round(
                float(result.primary_energy.specific_kwh_m2),
                3,
            ),
            "co2_total_kg": round(float(result.co2.total_kg), 3),
            "co2_specific_kg_m2": round(float(result.co2.specific_kg_m2), 3),
            "energy_class": result.energy_class,
            "resulting_configuration": model_to_dict(building),
            "cost_breakdown": [model_to_dict(line) for line in lines],
            "commercialization_status": (
                "commercialized"
                if candidate.commercialization_status in {"commercialized", "raw_only"}
                else "partially_discretized"
            ),
            "assumptions": [
                *candidate.assumptions,
                "Heating technology is a discrete product branch, not a continuous fake parameter.",
                "Heating capacity is checked against the recalculated design heat load without an added sizing margin.",
            ],
        }
    )
    return CandidateEvaluationV1(**data)


def _ordered_raw_candidates(
    raw: OptimizationSearchResultV1,
    limit: int,
) -> list[CandidateEvaluationV1]:
    by_id = {item.candidate_id: item for item in raw.candidates}
    ordered: list[CandidateEvaluationV1] = []
    for candidate_id in raw.pareto_candidate_ids:
        item = by_id.get(candidate_id)
        if item is not None and item not in ordered:
            ordered.append(item)
    if raw.selection.selected is not None and raw.selection.selected not in ordered:
        ordered.append(raw.selection.selected)
    for item in raw.candidates:
        if item not in ordered:
            ordered.append(item)
        if len(ordered) >= limit:
            break
    return ordered[:limit]


def run_full_product_backed_optimization(
    payload: FullProductBackedOptimizationRequestV1,
    base_catalog: dict[str, Any],
) -> FullProductBackedOptimizationResultV1:
    priced_catalog, catalog_warnings = _product_backed_catalog(payload, base_catalog)
    raw_search = run_parametric_optimization(payload.search, priced_catalog)

    continuous: list[ContinuousCommercializationResultV1] = []
    selectable: list[CandidateEvaluationV1] = []
    skipped = 0
    for raw_candidate in _ordered_raw_candidates(
        raw_search,
        payload.max_continuous_commercializations,
    ):
        try:
            result = commercialize_continuous_candidate(
                baseline=payload.search.request.baseline,
                raw_candidate=raw_candidate,
                payload=payload,
                priced_catalog=priced_catalog,
            )
        except ValueError:
            skipped += 1
            continue
        continuous.append(result)
        selectable.append(result.commercial_candidate)

    heating_rechecks = 0
    if payload.catalog.heating_systems and payload.max_heating_evaluations > 0:
        base_candidates = list(selectable)
        for candidate in base_candidates:
            for product in payload.catalog.heating_systems:
                if heating_rechecks >= payload.max_heating_evaluations:
                    break
                if product.stock_status == "out_of_stock":
                    continue
                upgraded = _apply_heating_product(candidate, product)
                heating_rechecks += 1
                if upgraded is not None:
                    selectable.append(upgraded)
            if heating_rechecks >= payload.max_heating_evaluations:
                break

    final_selection = select_optimization_candidate(
        payload.search.request,
        selectable,
    )
    fully = sum(
        1 for item in selectable
        if item.commercialization_status in {"commercialized", "raw_only"}
    )
    partial = sum(
        1 for item in selectable
        if item.commercialization_status == "partially_discretized"
    )
    warnings = [
        *catalog_warnings,
        "Continuous measures are optimized first in raw physical space, then discretized to actual products and fully recalculated.",
        "Heating is evaluated as a discrete product branch across the bounded commercialized candidate set.",
        "This mixed V1 does not yet re-run local continuous refinement separately inside every heating branch.",
    ]
    if final_selection.selected is not None and (
        final_selection.selected.commercialization_status
        == "partially_discretized"
    ):
        warnings.append(
            "Selected result still contains at least one family without complete product-level commercialization."
        )
    if not selectable:
        warnings.append("No candidate survived commercial rechecking.")

    return FullProductBackedOptimizationResultV1(
        raw_search=raw_search,
        continuous_commercializations=continuous,
        final_selection=final_selection,
        continuous_rechecks=len(continuous),
        heating_rechecks=heating_rechecks,
        fully_commercialized_count=fully,
        partially_commercialized_count=partial,
        skipped_candidates=skipped,
        warnings=warnings,
    )
