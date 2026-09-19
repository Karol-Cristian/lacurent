from __future__ import annotations

import hashlib
import json
from typing import Literal

from pydantic import BaseModel, Field

from .engine import calculate
from .models import BuildingInput, CalculationResult, model_to_dict
from .pricing import estimate_energy_cost


SCHEMA_VERSION = "1.0"


class CalculationSnapshotV1(BaseModel):
    final_energy_kwh: float
    annual_cost_lei: float | None = None
    primary_specific_kwh_m2: float
    co2_kg: float
    heat_loss_w_k: float
    design_heat_load_kw: float | None = None
    wall_heat_transfer_w_k: float
    energy_class: str


class HouseStateV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    house_id: str
    revision: int = 1
    configuration: BuildingInput
    envelope_geometry: dict[str, float]
    envelope_u_values: dict[str, float | None]
    calculation: CalculationSnapshotV1
    provenance: dict[str, str]


class ProductReferenceV1(BaseModel):
    partner_id: str = Field(min_length=1, max_length=120)
    product_id: str = Field(min_length=1, max_length=160)
    sku: str | None = Field(default=None, max_length=160)
    name: str | None = Field(default=None, max_length=240)


class WallInsulationMeasureV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    measure_id: str
    type: Literal["wall_insulation"] = "wall_insulation"
    target: Literal["external_wall"] = "external_wall"
    material_source: Literal["generic", "partner_product"] = "generic"
    product_reference: ProductReferenceV1 | None = None
    baseline_wall_u_value_w_m2k: float
    added_insulation_thickness_mm: float
    insulation_lambda_w_mk: float
    added_thermal_resistance_m2k_w: float
    proposed_wall_u_value_w_m2k: float
    calculation_status: Literal["calculated"] = "calculated"
    assumptions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class TechnicalRequirementV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    requirement_id: str
    category: Literal["facade_insulation"] = "facade_insulation"
    application: Literal["external_wall"] = "external_wall"
    affected_area_m2: float
    target_added_thermal_resistance_m2k_w: float
    nominal_added_thickness_mm: float
    maximum_lambda_w_mk: float
    purchase_area_m2: float | None = None
    quantity_basis: Literal["net_opaque_external_wall_area_no_waste"] = "net_opaque_external_wall_area_no_waste"
    confidence: Literal["medium"] = "medium"
    assumptions: list[str] = Field(default_factory=list)


class MetricDeltaV1(BaseModel):
    before: float
    after: float
    delta: float
    percent: float | None = None
    unit: str


class ScenarioDeltaV1(BaseModel):
    final_energy: MetricDeltaV1
    annual_cost: MetricDeltaV1 | None = None
    primary_specific: MetricDeltaV1
    co2: MetricDeltaV1
    heat_loss_coefficient: MetricDeltaV1
    design_heat_load: MetricDeltaV1 | None = None
    wall_heat_transfer: MetricDeltaV1
    wall_u_value: MetricDeltaV1
    energy_class_before: str
    energy_class_after: str


class ScenarioV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    scenario_id: str
    baseline_house_id: str
    baseline_revision: int
    measures: list[WallInsulationMeasureV1]
    resulting_configuration: BuildingInput
    calculation: CalculationSnapshotV1
    delta_vs_baseline: ScenarioDeltaV1


class WallInsulationScenarioRequestV1(BaseModel):
    baseline: BuildingInput
    added_insulation_thickness_mm: float = Field(default=100.0, gt=0, le=500)
    insulation_lambda_w_mk: float = Field(default=0.040, ge=0.020, le=0.080)


class WallInsulationScenarioBundleV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    house_state: HouseStateV1
    measure: WallInsulationMeasureV1
    scenario: ScenarioV1
    technical_requirement: TechnicalRequirementV1


def _round(value: float, digits: int = 3) -> float:
    return round(float(value), digits)


def _stable_id(prefix: str, payload: object) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=True, separators=(",", ":"), default=str)
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12].upper()
    return f"{prefix}-{digest}"


def _design_heat_load_kw(result: CalculationResult) -> float | None:
    design_temperature = result.climate.get("winter_design_temperature_c")
    if design_temperature is None:
        return None
    delta_t = max(float(result.input.indoor_design_temperature_c) - float(design_temperature), 0.0)
    return _round(float(result.heat_loss_w_k) * delta_t / 1000.0, 3)


def _wall_heat_transfer_w_k(result: CalculationResult) -> float:
    return _round(
        sum(
            float(item.value)
            for item in result.envelope_contributions
            if item.type == "exterior_wall"
        ),
        3,
    )


def _annual_cost_lei(result: CalculationResult) -> float | None:
    cost = estimate_energy_cost(result)
    if not cost.get("complete"):
        return None
    return _round(float(cost["priced_total_lei"]), 2)


def _snapshot(result: CalculationResult) -> CalculationSnapshotV1:
    return CalculationSnapshotV1(
        final_energy_kwh=_round(result.total_final_energy_kwh),
        annual_cost_lei=_annual_cost_lei(result),
        primary_specific_kwh_m2=_round(result.primary_energy.specific_kwh_m2, 2),
        co2_kg=_round(result.co2.total_kg),
        heat_loss_w_k=_round(result.heat_loss_w_k),
        design_heat_load_kw=_design_heat_load_kw(result),
        wall_heat_transfer_w_k=_wall_heat_transfer_w_k(result),
        energy_class=result.energy_class,
    )


def _metric_delta(before: float, after: float, unit: str, digits: int = 3) -> MetricDeltaV1:
    delta = float(after) - float(before)
    percent = (100.0 * delta / float(before)) if abs(float(before)) > 1e-12 else None
    return MetricDeltaV1(
        before=_round(before, digits),
        after=_round(after, digits),
        delta=_round(delta, digits),
        percent=None if percent is None else _round(percent, 2),
        unit=unit,
    )


def _optional_metric_delta(
    before: float | None,
    after: float | None,
    unit: str,
    digits: int = 3,
) -> MetricDeltaV1 | None:
    if before is None or after is None:
        return None
    return _metric_delta(before, after, unit, digits)


def build_house_state(
    building: BuildingInput,
    result: CalculationResult | None = None,
) -> HouseStateV1:
    calculation = result or calculate(building)
    payload = model_to_dict(building)
    return HouseStateV1(
        house_id=_stable_id("HS", payload),
        configuration=building,
        envelope_geometry=model_to_dict(calculation.envelope_geometry),
        envelope_u_values=model_to_dict(calculation.envelope_u_values),
        calculation=_snapshot(calculation),
        provenance={
            "configuration": "baseline_input",
            "envelope_geometry": "derived_by_engine",
            "envelope_u_values": "derived_by_engine",
            "calculation": "derived_by_engine",
        },
    )


def _apply_added_wall_resistance(
    building: BuildingInput,
    added_r_m2k_w: float,
) -> BuildingInput:
    payload = model_to_dict(building)
    changed = 0
    for component in payload.get("envelope", []):
        if component.get("type") != "exterior_wall":
            continue
        current_u = float(component["u_value_w_m2k"])
        current_r = 1.0 / current_u
        component["u_value_w_m2k"] = 1.0 / (current_r + added_r_m2k_w)
        changed += 1
    if not changed:
        raise ValueError("Baseline house has no exterior-wall component to insulate.")
    return BuildingInput(**payload)


def build_wall_insulation_scenario(
    baseline: BuildingInput,
    *,
    added_insulation_thickness_mm: float,
    insulation_lambda_w_mk: float = 0.040,
    material_source: Literal["generic", "partner_product"] = "generic",
    product_reference: ProductReferenceV1 | None = None,
) -> WallInsulationScenarioBundleV1:
    if added_insulation_thickness_mm <= 0:
        raise ValueError("Added wall-insulation thickness must be greater than zero.")
    if insulation_lambda_w_mk <= 0:
        raise ValueError("Insulation thermal conductivity must be greater than zero.")
    if material_source == "partner_product" and product_reference is None:
        raise ValueError("A partner-product wall-insulation scenario requires a product reference.")
    if material_source == "generic" and product_reference is not None:
        raise ValueError("A generic wall-insulation scenario cannot carry a product reference.")

    baseline_result = calculate(baseline)
    baseline_wall_u = baseline_result.envelope_u_values.wall_u_value_w_m2k
    if baseline_wall_u is None:
        raise ValueError("Baseline house has no modeled exterior-wall U-value.")

    house_state = build_house_state(baseline, baseline_result)

    thickness_m = float(added_insulation_thickness_mm) / 1000.0
    added_r = thickness_m / float(insulation_lambda_w_mk)
    scenario_building = _apply_added_wall_resistance(baseline, added_r)
    scenario_result = calculate(scenario_building)

    proposed_wall_u = scenario_result.envelope_u_values.wall_u_value_w_m2k
    if proposed_wall_u is None:
        raise ValueError("Scenario did not produce an exterior-wall U-value.")

    measure_payload = {
        "house_id": house_state.house_id,
        "type": "wall_insulation",
        "target": "external_wall",
        "material_source": material_source,
        "product_reference": model_to_dict(product_reference) if product_reference is not None else None,
        "added_insulation_thickness_mm": float(added_insulation_thickness_mm),
        "insulation_lambda_w_mk": float(insulation_lambda_w_mk),
    }
    measure_id = _stable_id("M-WALL", measure_payload)

    measure = WallInsulationMeasureV1(
        measure_id=measure_id,
        material_source=material_source,
        product_reference=product_reference,
        baseline_wall_u_value_w_m2k=_round(baseline_wall_u, 4),
        added_insulation_thickness_mm=_round(added_insulation_thickness_mm, 1),
        insulation_lambda_w_mk=_round(insulation_lambda_w_mk, 4),
        added_thermal_resistance_m2k_w=_round(added_r, 4),
        proposed_wall_u_value_w_m2k=_round(proposed_wall_u, 4),
        assumptions=[
            (
                "Selected partner product layer applied to every modeled exterior-wall component."
                if material_source == "partner_product"
                else "Generic insulation layer applied to every modeled exterior-wall component."
            ),
            "The existing assembly is represented by its current whole-wall U-value.",
            "Thermal bridges are kept unchanged in this V1 measure.",
        ],
        warnings=[
            "This V1 measure is an energy scenario, not an ETICS system design.",
            "No commercial waste factor, package rounding, anchors, adhesive, mesh, finish or labour is included.",
        ],
    )

    baseline_snapshot = house_state.calculation
    scenario_snapshot = _snapshot(scenario_result)

    annual_cost_delta = _optional_metric_delta(
        baseline_snapshot.annual_cost_lei,
        scenario_snapshot.annual_cost_lei,
        "lei/year",
        2,
    )
    design_load_delta = _optional_metric_delta(
        baseline_snapshot.design_heat_load_kw,
        scenario_snapshot.design_heat_load_kw,
        "kW",
        3,
    )

    delta = ScenarioDeltaV1(
        final_energy=_metric_delta(
            baseline_snapshot.final_energy_kwh,
            scenario_snapshot.final_energy_kwh,
            "kWh/year",
        ),
        annual_cost=annual_cost_delta,
        primary_specific=_metric_delta(
            baseline_snapshot.primary_specific_kwh_m2,
            scenario_snapshot.primary_specific_kwh_m2,
            "kWh/m2.year",
            2,
        ),
        co2=_metric_delta(
            baseline_snapshot.co2_kg,
            scenario_snapshot.co2_kg,
            "kgCO2/year",
        ),
        heat_loss_coefficient=_metric_delta(
            baseline_snapshot.heat_loss_w_k,
            scenario_snapshot.heat_loss_w_k,
            "W/K",
        ),
        design_heat_load=design_load_delta,
        wall_heat_transfer=_metric_delta(
            baseline_snapshot.wall_heat_transfer_w_k,
            scenario_snapshot.wall_heat_transfer_w_k,
            "W/K",
        ),
        wall_u_value=_metric_delta(
            baseline_wall_u,
            proposed_wall_u,
            "W/m2K",
            4,
        ),
        energy_class_before=baseline_snapshot.energy_class,
        energy_class_after=scenario_snapshot.energy_class,
    )

    scenario_id = _stable_id(
        "SC",
        {
            "baseline_house_id": house_state.house_id,
            "baseline_revision": house_state.revision,
            "measure_id": measure_id,
        },
    )
    scenario = ScenarioV1(
        scenario_id=scenario_id,
        baseline_house_id=house_state.house_id,
        baseline_revision=house_state.revision,
        measures=[measure],
        resulting_configuration=scenario_building,
        calculation=scenario_snapshot,
        delta_vs_baseline=delta,
    )

    affected_area = float(baseline_result.envelope_geometry.net_wall_area_m2)
    requirement = TechnicalRequirementV1(
        requirement_id=_stable_id(
            "REQ-WALL",
            {
                "measure_id": measure_id,
                "affected_area_m2": affected_area,
                "added_r_m2k_w": added_r,
            },
        ),
        affected_area_m2=_round(affected_area, 2),
        target_added_thermal_resistance_m2k_w=_round(added_r, 4),
        nominal_added_thickness_mm=_round(added_insulation_thickness_mm, 1),
        maximum_lambda_w_mk=_round(insulation_lambda_w_mk, 4),
        assumptions=[
            "Affected area is the net opaque exterior-wall area used by the energy engine.",
            "Purchase quantity is intentionally not calculated in V1 because no waste factor or package size is defined.",
        ],
    )

    return WallInsulationScenarioBundleV1(
        house_state=house_state,
        measure=measure,
        scenario=scenario,
        technical_requirement=requirement,
    )
