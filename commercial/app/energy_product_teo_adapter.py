from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Iterable

from .engine import calculate, design_heat_load_breakdown
from .models import BuildingInput, model_to_dict
from .optimization import CandidateEvaluationV1, CostLineV1
from .pricing import estimate_energy_cost


@dataclass(frozen=True)
class ProductCandidate:
    product_id: str
    category_id: str
    properties: dict[str, float]
    unit_price_lei: float | None = None
    package_price_lei: float | None = None


@dataclass(frozen=True)
class RadiatorMatch:
    product_id: str
    quantity: int
    output_per_unit_w: float
    available_output_w: float
    equipment_subtotal_lei: float | None
    selection_basis: str


@dataclass(frozen=True)
class HrvMatch:
    product_id: str
    max_airflow_m3h: float
    heat_recovery_efficiency: float
    specific_power_input_w_m3h: float
    unit_price_lei: float | None
    selection_basis: str


@dataclass(frozen=True)
class UnderfloorPipeMatch:
    product_id: str
    coil_count: int
    purchased_length_m: float
    required_length_m: float
    surplus_length_m: float
    material_subtotal_lei: float | None
    selection_basis: str


def radiator_output_at_design_condition_w(
    *,
    declared_output_w_dt50: float,
    exponent_n: float,
    flow_temperature_c: float,
    return_temperature_c: float,
    room_temperature_c: float,
) -> float:
    """Correct EN 442 nominal output to the requested water/room temperatures.

    The catalog must provide a source-backed ΔT50 output and radiator exponent.
    This function does not invent an exponent or extrapolate from retailer-only
    generic power labels.
    """

    q50 = float(declared_output_w_dt50)
    exponent = float(exponent_n)
    flow = float(flow_temperature_c)
    ret = float(return_temperature_c)
    room = float(room_temperature_c)
    if q50 <= 0 or exponent <= 0:
        raise ValueError("Radiator declared output and exponent must be positive.")
    if ret >= flow:
        raise ValueError("Return temperature must be below flow temperature.")
    mean_water = (flow + ret) / 2.0
    delta_t = mean_water - room
    if delta_t <= 0:
        raise ValueError("Mean water temperature must exceed room temperature.")
    return q50 * (delta_t / 50.0) ** exponent


def match_radiators(
    candidates: Iterable[ProductCandidate],
    *,
    required_output_w: float,
    flow_temperature_c: float,
    return_temperature_c: float,
    room_temperature_c: float,
) -> RadiatorMatch:
    required = float(required_output_w)
    if required <= 0:
        raise ValueError("required_output_w must be positive.")

    rows: list[RadiatorMatch] = []
    blockers: list[str] = []
    for candidate in candidates:
        if candidate.category_id != "radiator":
            continue
        props = candidate.properties
        if props.get("heat_output_w_dt50") in (None, "") or props.get("radiator_exponent_n") in (None, ""):
            blockers.append(candidate.product_id)
            continue
        output = radiator_output_at_design_condition_w(
            declared_output_w_dt50=float(props["heat_output_w_dt50"]),
            exponent_n=float(props["radiator_exponent_n"]),
            flow_temperature_c=flow_temperature_c,
            return_temperature_c=return_temperature_c,
            room_temperature_c=room_temperature_c,
        )
        quantity = max(1, int(math.ceil(required / output)))
        price = candidate.unit_price_lei
        rows.append(
            RadiatorMatch(
                product_id=candidate.product_id,
                quantity=quantity,
                output_per_unit_w=round(output, 2),
                available_output_w=round(output * quantity, 2),
                equipment_subtotal_lei=None if price is None else round(price * quantity, 2),
                selection_basis=(
                    "EN442-style ΔT correction from source-backed ΔT50 output and radiator exponent; "
                    "quantity rounded up to satisfy the TEO/design heat-output requirement."
                ),
            )
        )

    if not rows:
        suffix = f" Blocked products missing declared output/exponent: {', '.join(blockers)}." if blockers else ""
        raise ValueError("No source-backed radiator can satisfy the matching contract." + suffix)

    priced = [row for row in rows if row.equipment_subtotal_lei is not None]
    return min(
        priced or rows,
        key=lambda row: (
            float(row.equipment_subtotal_lei) if row.equipment_subtotal_lei is not None else float("inf"),
            row.available_output_w - required,
            row.quantity,
            row.product_id,
        ),
    )


def match_hrv_units(
    candidates: Iterable[ProductCandidate],
    *,
    required_airflow_m3h: float,
    target_heat_recovery_efficiency: float,
    max_specific_power_input_w_m3h: float | None = None,
) -> HrvMatch:
    airflow = float(required_airflow_m3h)
    target = float(target_heat_recovery_efficiency)
    if airflow <= 0:
        raise ValueError("required_airflow_m3h must be positive.")
    if target <= 0 or target >= 1:
        raise ValueError("target_heat_recovery_efficiency must be in (0, 1).")

    rows: list[HrvMatch] = []
    blockers: list[str] = []
    for candidate in candidates:
        if candidate.category_id != "hrv_unit":
            continue
        props = candidate.properties
        missing = [
            key for key in (
                "max_airflow_m3h",
                "heat_recovery_efficiency",
                "specific_power_input_w_m3h",
            )
            if props.get(key) in (None, "")
        ]
        if missing:
            blockers.append(f"{candidate.product_id}({','.join(missing)})")
            continue
        capacity = float(props["max_airflow_m3h"])
        efficiency = float(props["heat_recovery_efficiency"])
        spi = float(props["specific_power_input_w_m3h"])
        if capacity + 1e-9 < airflow or efficiency + 1e-9 < target:
            continue
        if max_specific_power_input_w_m3h is not None and spi > float(max_specific_power_input_w_m3h) + 1e-9:
            continue
        rows.append(
            HrvMatch(
                product_id=candidate.product_id,
                max_airflow_m3h=capacity,
                heat_recovery_efficiency=efficiency,
                specific_power_input_w_m3h=spi,
                unit_price_lei=candidate.unit_price_lei,
                selection_basis=(
                    "Meets required airflow and heat-recovery target using source-backed technical properties; "
                    "fan electricity remains part of the canonical building recalculation."
                ),
            )
        )
    if not rows:
        suffix = f" Incomplete candidates: {', '.join(blockers)}." if blockers else ""
        raise ValueError("No HRV product satisfies the source-backed finalist requirements." + suffix)
    priced = [row for row in rows if row.unit_price_lei is not None]
    return min(
        priced or rows,
        key=lambda row: (
            float(row.unit_price_lei) if row.unit_price_lei is not None else float("inf"),
            row.max_airflow_m3h - airflow,
            -row.heat_recovery_efficiency,
            row.product_id,
        ),
    )


def match_underfloor_pipe(
    candidates: Iterable[ProductCandidate],
    *,
    required_pipe_length_m: float,
) -> UnderfloorPipeMatch:
    """Map an engineering pipe-length requirement to whole commercial coils.

    This deliberately does not calculate spacing, heat flux or loop geometry.
    Those are engineering inputs upstream of commercial matching.
    """

    required = float(required_pipe_length_m)
    if required <= 0:
        raise ValueError("required_pipe_length_m must be positive.")

    rows: list[UnderfloorPipeMatch] = []
    for candidate in candidates:
        if candidate.category_id != "underfloor_pipe":
            continue
        package_length = candidate.properties.get("package_length_m")
        if package_length in (None, "") or float(package_length) <= 0:
            continue
        length = float(package_length)
        count = max(1, int(math.ceil(required / length)))
        purchased = count * length
        subtotal = (
            None
            if candidate.package_price_lei is None
            else float(candidate.package_price_lei) * count
        )
        rows.append(
            UnderfloorPipeMatch(
                product_id=candidate.product_id,
                coil_count=count,
                purchased_length_m=round(purchased, 2),
                required_length_m=round(required, 2),
                surplus_length_m=round(purchased - required, 2),
                material_subtotal_lei=None if subtotal is None else round(subtotal, 2),
                selection_basis=(
                    "Whole-coil purchase quantity meeting/exceeding the upstream engineering pipe-length requirement."
                ),
            )
        )
    if not rows:
        raise ValueError("No underfloor-pipe product has a source-backed package length.")
    priced = [row for row in rows if row.material_subtotal_lei is not None]
    return min(
        priced or rows,
        key=lambda row: (
            float(row.material_subtotal_lei) if row.material_subtotal_lei is not None else float("inf"),
            row.surplus_length_m,
            row.product_id,
        ),
    )


def candidate_from_source_pack_row(row: dict[str, Any]) -> ProductCandidate:
    """Small adapter for tests/import validation, not a D1 runtime loader."""

    product = row["product"]
    props = dict(row["adapted_properties"])
    offers = list(product.get("offers") or [])
    unit_price = None
    package_price = None
    for offer in offers:
        basis = str(offer.get("price_basis") or "")
        price = float(offer["price_lei"])
        if basis in {"lei_unit", "lei_total"}:
            unit_price = price if unit_price is None else min(unit_price, price)
        elif basis == "lei_package":
            package_price = price if package_price is None else min(package_price, price)
        elif basis == "lei_per_m" and product["category_id"] == "underfloor_pipe":
            length = props.get("package_length_m")
            if length:
                normalized = price * float(length)
                package_price = normalized if package_price is None else min(package_price, normalized)
    return ProductCandidate(
        product_id=str(product["id"]),
        category_id=str(product["category_id"]),
        properties=props,
        unit_price_lei=unit_price,
        package_price_lei=package_price,
    )


def commercialize_hrv_finalist(
    raw_candidate: CandidateEvaluationV1,
    candidate_products: Iterable[ProductCandidate],
    *,
    fan_operation_hours_per_year: float,
    installation_allowance_lei: float = 0.0,
    max_specific_power_input_w_m3h: float | None = None,
) -> tuple[CandidateEvaluationV1, HrvMatch]:
    """Replace a finalist HRV target with one source-backed product and recalculate.

    The function is deliberately downstream of TEO search. It never loops HRV
    SKUs inside the mathematical search. Product heat-recovery efficiency and
    fan SFP become explicit BuildingInput values, then canonical RBPE is run
    again so fan electricity, primary energy, CO2 and annual cost are updated.
    """

    if raw_candidate.resulting_configuration is None:
        raise ValueError("HRV commercialization requires a finalist building configuration.")

    target = float(
        raw_candidate.parameters.ventilation_heat_recovery_efficiency_target
    )
    if target <= 0:
        raise ValueError("Finalist has no positive heat-recovery target.")

    building = raw_candidate.resulting_configuration
    required_airflow_m3h = (
        float(building.ventilation.air_changes_per_hour)
        * float(building.heated_volume_m3)
    )
    match = match_hrv_units(
        candidate_products,
        required_airflow_m3h=required_airflow_m3h,
        target_heat_recovery_efficiency=target,
        max_specific_power_input_w_m3h=max_specific_power_input_w_m3h,
    )

    hours = float(fan_operation_hours_per_year)
    if not math.isfinite(hours) or hours <= 0 or hours > 8784:
        raise ValueError("fan_operation_hours_per_year must be in (0, 8784].")

    installation = float(installation_allowance_lei)
    if not math.isfinite(installation) or installation < 0:
        raise ValueError("installation_allowance_lei must be finite and non-negative.")

    building_data = model_to_dict(building)
    ventilation = dict(building_data.get("ventilation") or {})
    ventilation.update(
        {
            "heat_recovery_efficiency": match.heat_recovery_efficiency,
            "specific_fan_power_w_per_m3h": match.specific_power_input_w_m3h,
            "fan_operation_hours_per_year": hours,
        }
    )
    building_data["ventilation"] = ventilation
    realized_building = BuildingInput(**building_data)

    result = calculate(realized_building, include_reference=False)
    priced = estimate_energy_cost(result)
    if not priced.get("complete"):
        raise ValueError("HRV finalist recalculation has incomplete annual energy cost.")

    equipment = (
        None if match.unit_price_lei is None else float(match.unit_price_lei)
    )
    if equipment is None:
        raise ValueError("HRV finalist requires a current explicit equipment price.")
    exact_capex = equipment + installation

    lines = [
        line
        for line in raw_candidate.cost_breakdown
        if line.family != "ventilation"
    ]
    lines.append(
        CostLineV1(
            family="ventilation",
            capex_lei=round(exact_capex, 2),
            parameter_value=round(match.heat_recovery_efficiency, 6),
            parameter_unit="heat_recovery_efficiency",
            source_kind="commercial_product_explicit_performance",
            confidence="source_backed_product_plus_explicit_installation",
            catalog_unit="equipment_plus_installation",
            note=(
                "HRV finalist matched by required airflow and recovery target; "
                "canonical RBPE recalculated with explicit fan SFP and annual operating hours."
            ),
            product_id=match.product_id,
            quantity=1,
            quantity_unit="system",
            material_subtotal_lei=round(equipment, 2),
            nonmaterial_subtotal_lei=round(installation, 2),
        )
    )

    capex = sum(float(line.capex_lei) for line in lines)
    annual_bill = float(priced["priced_total_lei"])
    saving = float(raw_candidate.baseline_annual_bill_lei) - annual_bill
    payback = capex / saving if capex > 0 and saving > 0 else None
    roi = 100.0 * saving / capex if capex > 0 else None

    design = design_heat_load_breakdown(
        realized_building,
        result.transmission_components,
        result.h_ve_w_k,
        result.climate,
    )

    data = model_to_dict(raw_candidate)
    data.update(
        {
            "candidate_id": raw_candidate.candidate_id + "-HRV-" + match.product_id,
            "capex_lei": round(capex, 2),
            "annual_bill_lei": round(annual_bill, 2),
            "annual_saving_lei": round(saving, 2),
            "payback_years": None if payback is None else round(payback, 4),
            "roi_percent_per_year": None if roi is None else round(roi, 4),
            "final_energy_kwh": round(float(result.total_final_energy_kwh), 3),
            "design_heat_load_kw": (
                None
                if design.get("total_kw") is None
                else round(float(design["total_kw"]), 4)
            ),
            "primary_specific_kwh_m2": round(
                float(result.primary_energy.specific_kwh_m2),
                3,
            ),
            "co2_total_kg": round(float(result.co2.total_kg), 3),
            "co2_specific_kg_m2": round(float(result.co2.specific_kg_m2), 3),
            "energy_class": result.energy_class,
            "resulting_configuration": model_to_dict(realized_building),
            "cost_breakdown": [model_to_dict(line) for line in lines],
            "cost_source": "hrv_product_discretized_recalculated",
            "commercialization_status": "partially_discretized",
            "assumptions": [
                *raw_candidate.assumptions,
                "HRV SKU selection is finalist-only and does not increase TEO search cardinality.",
                "Fan electricity is recalculated from source-backed product SFP and explicit annual operating hours.",
            ],
        }
    )
    return CandidateEvaluationV1(**data), match
