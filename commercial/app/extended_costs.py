from __future__ import annotations

import itertools
import math
from typing import Literal

from pydantic import BaseModel, Field, root_validator

from .cost_curves import (
    ParametricCostCurvePointV1,
    ParametricCostCurveV1,
)
from .market_products import (
    PvModuleProductV1,
    SolarThermalCollectorProductV1,
    WindowSystemProductV1,
    WindowUnitV1,
)


class SystemCostCurvePointV1(BaseModel):
    parameter_value: float = Field(gt=0)
    variable_total_cost_lei: float = Field(ge=0)
    source_product_ids: list[str] = Field(default_factory=list)


class SystemCostCurveV1(BaseModel):
    family: Literal["pv", "solar_thermal"]
    parameter_name: Literal["added_power_kwp", "added_collector_area_m2"]
    parameter_unit: Literal["kWp_added", "m2_added"]
    price_scope: Literal["material_only", "installed_total"]
    activation_cost_lei: float = Field(default=0, ge=0)
    points: list[SystemCostCurvePointV1] = Field(min_items=1)
    source_product_count: int = Field(ge=1)
    assumptions: list[str] = Field(default_factory=list)

    @root_validator(skip_on_failure=True)
    def validate_points(cls, values: dict) -> dict:
        points = values.get("points") or []
        xs = [float(item.parameter_value) for item in points]
        if xs != sorted(xs):
            raise ValueError("System cost-curve points must be sorted.")
        if len(xs) != len(set(xs)):
            raise ValueError("System cost-curve points must be unique.")
        return values


class WindowCommercialDiscretizationV1(BaseModel):
    target_replacement_fraction: float = Field(ge=0, le=1)
    realized_replacement_fraction: float = Field(ge=0, le=1)
    target_u_w_m2k: float = Field(gt=0)
    realized_u_w_m2k: float = Field(gt=0)
    replaced_area_m2: float = Field(ge=0)
    total_window_area_m2: float = Field(gt=0)
    selected_unit_ids: list[str] = Field(default_factory=list)
    product: WindowSystemProductV1
    material_subtotal_lei: float
    nonmaterial_subtotal_lei: float
    installed_capex_lei: float
    selection_basis: str
    warnings: list[str] = Field(default_factory=list)


class PvCommercialDiscretizationV1(BaseModel):
    target_added_kwp: float = Field(gt=0)
    realized_added_kwp: float = Field(gt=0)
    module_count: int = Field(ge=1)
    product: PvModuleProductV1
    material_subtotal_lei: float
    nonmodule_subtotal_lei: float
    activation_cost_lei: float
    installed_capex_lei: float
    warnings: list[str] = Field(default_factory=list)


class SolarThermalCommercialDiscretizationV1(BaseModel):
    target_added_area_m2: float = Field(gt=0)
    realized_added_area_m2: float = Field(gt=0)
    collector_count: int = Field(ge=1)
    product: SolarThermalCollectorProductV1
    material_subtotal_lei: float
    noncollector_subtotal_lei: float
    activation_cost_lei: float
    installed_capex_lei: float
    warnings: list[str] = Field(default_factory=list)


def build_window_product_cost_curve(
    products: list[WindowSystemProductV1],
    *,
    nonmaterial_installed_cost_per_m2_lei: float | None = None,
) -> ParametricCostCurveV1:
    eligible = [
        product
        for product in products
        if product.stock_status != "out_of_stock"
        and product.price_per_m2_lei is not None
    ]
    if not eligible:
        raise ValueError("No window product has a usable price per m2.")

    best: dict[float, tuple[float, list[str]]] = {}
    for product in eligible:
        resistance = round(1.0 / float(product.uw_w_m2k), 6)
        material = float(product.price_per_m2_lei)
        previous = best.get(resistance)
        if previous is None or material < previous[0] - 1e-9:
            best[resistance] = (material, [product.product_id])
        elif abs(material - previous[0]) <= 1e-9:
            previous[1].append(product.product_id)

    installed = nonmaterial_installed_cost_per_m2_lei is not None
    return ParametricCostCurveV1(
        family="windows",
        parameter_name="target_window_resistance_m2k_w",
        parameter_unit="m2K/W_window",
        quantity_basis="m2",
        price_scope="installed_total" if installed else "material_only",
        activation_cost_per_basis_lei=(
            float(nonmaterial_installed_cost_per_m2_lei)
            if installed
            else 0.0
        ),
        points=[
            ParametricCostCurvePointV1(
                parameter_value=r,
                variable_cost_per_basis_lei=round(cost, 4),
                source_product_ids=sorted(ids),
            )
            for r, (cost, ids) in sorted(best.items())
        ],
        source_product_count=len(eligible),
        assumptions=[
            "Window performance is parameterized as thermal resistance 1/Uw.",
            "Product price is normalized to lei/m2.",
            "Commercialization chooses an actual window system and whole window units.",
        ],
    )


def _choose_window_units(
    units: list[WindowUnitV1],
    *,
    target_area_m2: float,
    product_u: float,
) -> list[WindowUnitV1]:
    if not units or target_area_m2 <= 1e-9:
        return []

    def key_for(subset: list[WindowUnitV1]) -> tuple[float, float, int, tuple[str, ...]]:
        area = sum(float(item.area_m2) for item in subset)
        overshoot = max(area - target_area_m2, 0.0)
        reduction = sum(
            float(item.area_m2) * max(float(item.current_u_w_m2k) - product_u, 0.0)
            for item in subset
        )
        return (
            round(overshoot, 9),
            -round(reduction, 9),
            len(subset),
            tuple(sorted(item.unit_id for item in subset)),
        )

    if len(units) <= 16:
        best_subset: list[WindowUnitV1] | None = None
        for mask in range(1, 1 << len(units)):
            subset = [units[i] for i in range(len(units)) if mask & (1 << i)]
            area = sum(float(item.area_m2) for item in subset)
            if area + 1e-9 < target_area_m2:
                continue
            if best_subset is None or key_for(subset) < key_for(best_subset):
                best_subset = subset
        if best_subset is not None:
            return best_subset

    ordered = sorted(
        units,
        key=lambda item: (
            -float(item.area_m2) * max(float(item.current_u_w_m2k) - product_u, 0.0),
            -float(item.current_u_w_m2k),
            item.unit_id,
        ),
    )
    selected: list[WindowUnitV1] = []
    area = 0.0
    for unit in ordered:
        selected.append(unit)
        area += float(unit.area_m2)
        if area + 1e-9 >= target_area_m2:
            break
    return selected


def discretize_windows(
    *,
    target_replacement_fraction: float,
    target_u_w_m2k: float,
    units: list[WindowUnitV1],
    products: list[WindowSystemProductV1],
    nonmaterial_installed_cost_per_m2_lei: float,
) -> WindowCommercialDiscretizationV1:
    if not units:
        raise ValueError(
            "Window commercialization requires an inventory of whole window units."
        )
    total_area = sum(float(item.area_m2) for item in units)
    target_area = total_area * float(target_replacement_fraction)
    feasible = [
        product for product in products
        if product.stock_status != "out_of_stock"
        and product.price_per_m2_lei is not None
        and float(product.uw_w_m2k) <= float(target_u_w_m2k) + 1e-9
    ]
    if not feasible:
        raise ValueError(
            f"No supplied window product reaches Uw <= {target_u_w_m2k:.3f} W/m2K."
        )

    rows = []
    for product in feasible:
        selected_units = _choose_window_units(
            units,
            target_area_m2=target_area,
            product_u=float(product.uw_w_m2k),
        )
        replaced_area = sum(float(item.area_m2) for item in selected_units)
        material = replaced_area * float(product.price_per_m2_lei)
        nonmaterial = replaced_area * float(nonmaterial_installed_cost_per_m2_lei)
        rows.append((
            material + nonmaterial,
            replaced_area,
            product,
            selected_units,
            material,
            nonmaterial,
        ))
    selected = min(
        rows,
        key=lambda row: (
            row[0],
            row[1] - target_area,
            float(row[2].uw_w_m2k),
        ),
    )
    installed, replaced_area, product, selected_units, material, nonmaterial = selected
    return WindowCommercialDiscretizationV1(
        target_replacement_fraction=round(float(target_replacement_fraction), 6),
        realized_replacement_fraction=round(replaced_area / total_area, 6),
        target_u_w_m2k=round(float(target_u_w_m2k), 6),
        realized_u_w_m2k=round(float(product.uw_w_m2k), 6),
        replaced_area_m2=round(replaced_area, 3),
        total_window_area_m2=round(total_area, 3),
        selected_unit_ids=[item.unit_id for item in selected_units],
        product=product,
        material_subtotal_lei=round(material, 2),
        nonmaterial_subtotal_lei=round(nonmaterial, 2),
        installed_capex_lei=round(installed, 2),
        selection_basis=(
            "Lowest installed cost among products meeting the Uw target, with whole "
            "window units selected to meet/exceed the raw replacement area."
        ),
        warnings=[
            "Window fraction is discretized to whole supplied window units.",
            "Solar transmittance is not mixed per window in LaCurent Light V1; the report must disclose this limitation.",
        ],
    )


def build_pv_system_cost_curve(
    products: list[PvModuleProductV1],
    *,
    max_added_kwp: float,
    activation_cost_lei: float,
    nonmodule_installed_cost_per_kwp_lei: float | None,
) -> SystemCostCurveV1:
    eligible = [
        p for p in products
        if p.stock_status != "out_of_stock" and p.module_price_lei is not None
    ]
    if not eligible:
        raise ValueError("No PV module has a usable module price.")
    installed = nonmodule_installed_cost_per_kwp_lei is not None
    best: dict[float, tuple[float, list[str]]] = {}
    for product in eligible:
        module_kwp = float(product.module_power_wp) / 1000.0
        max_count = max(1, int(math.ceil(float(max_added_kwp) / module_kwp)))
        for count in range(1, max_count + 1):
            capacity = round(count * module_kwp, 6)
            if capacity > float(max_added_kwp) + module_kwp + 1e-9:
                break
            variable = count * float(product.module_price_lei)
            if nonmodule_installed_cost_per_kwp_lei is not None:
                variable += capacity * float(nonmodule_installed_cost_per_kwp_lei)
            previous = best.get(capacity)
            if previous is None or variable < previous[0] - 1e-9:
                best[capacity] = (variable, [product.product_id])
            elif abs(variable - previous[0]) <= 1e-9:
                previous[1].append(product.product_id)
    return SystemCostCurveV1(
        family="pv",
        parameter_name="added_power_kwp",
        parameter_unit="kWp_added",
        price_scope="installed_total" if installed else "material_only",
        activation_cost_lei=float(activation_cost_lei) if installed else 0.0,
        points=[
            SystemCostCurvePointV1(
                parameter_value=x,
                variable_total_cost_lei=round(cost, 2),
                source_product_ids=sorted(ids),
            )
            for x, (cost, ids) in sorted(best.items())
        ],
        source_product_count=len(eligible),
        assumptions=[
            "Raw PV cost is interpolated between complete module-count observations.",
            "Activation/BOS fixed cost remains separate and does not shrink toward zero.",
            "Commercialization rounds to an integer module count and recalculates generation.",
        ],
    )


def build_solar_thermal_system_cost_curve(
    products: list[SolarThermalCollectorProductV1],
    *,
    max_added_area_m2: float,
    activation_cost_lei: float,
    noncollector_installed_cost_per_m2_lei: float | None,
) -> SystemCostCurveV1:
    eligible = [
        p for p in products
        if p.stock_status != "out_of_stock" and p.collector_price_lei is not None
    ]
    if not eligible:
        raise ValueError("No solar-thermal collector has a usable price.")
    installed = noncollector_installed_cost_per_m2_lei is not None
    best: dict[float, tuple[float, list[str]]] = {}
    for product in eligible:
        area_each = float(product.collector_area_m2)
        max_count = max(1, int(math.ceil(float(max_added_area_m2) / area_each)))
        for count in range(1, max_count + 1):
            area = round(count * area_each, 6)
            if area > float(max_added_area_m2) + area_each + 1e-9:
                break
            variable = count * float(product.collector_price_lei)
            if noncollector_installed_cost_per_m2_lei is not None:
                variable += area * float(noncollector_installed_cost_per_m2_lei)
            previous = best.get(area)
            if previous is None or variable < previous[0] - 1e-9:
                best[area] = (variable, [product.product_id])
            elif abs(variable - previous[0]) <= 1e-9:
                previous[1].append(product.product_id)
    return SystemCostCurveV1(
        family="solar_thermal",
        parameter_name="added_collector_area_m2",
        parameter_unit="m2_added",
        price_scope="installed_total" if installed else "material_only",
        activation_cost_lei=float(activation_cost_lei) if installed else 0.0,
        points=[
            SystemCostCurvePointV1(
                parameter_value=x,
                variable_total_cost_lei=round(cost, 2),
                source_product_ids=sorted(ids),
            )
            for x, (cost, ids) in sorted(best.items())
        ],
        source_product_count=len(eligible),
        assumptions=[
            "Raw solar-thermal cost is interpolated between whole-collector observations.",
            "Commercialization rounds to a whole collector count and recalculates DHW solar contribution.",
        ],
    )


def system_curve_cost(
    curve: SystemCostCurveV1,
    parameter_value: float,
    *,
    require_installed_total: bool = True,
) -> float:
    target = float(parameter_value)
    if target <= 0:
        return 0.0
    if require_installed_total and curve.price_scope != "installed_total":
        raise ValueError(
            f"{curve.family} curve is material_only and cannot price an economic optimum."
        )
    points = curve.points
    if target > float(points[-1].parameter_value) + 1e-9:
        raise ValueError(
            f"Target {target:.4f} exceeds sourced {curve.family} curve maximum "
            f"{float(points[-1].parameter_value):.4f}."
        )
    lower_x = 0.0
    lower_y = 0.0
    upper = points[0]
    for point in points:
        if target <= float(point.parameter_value) + 1e-12:
            upper = point
            break
        lower_x = float(point.parameter_value)
        lower_y = float(point.variable_total_cost_lei)
    upper_x = float(upper.parameter_value)
    upper_y = float(upper.variable_total_cost_lei)
    if abs(upper_x - lower_x) <= 1e-12:
        variable = upper_y
    else:
        fraction = (target - lower_x) / (upper_x - lower_x)
        variable = lower_y + fraction * (upper_y - lower_y)
    return round(float(curve.activation_cost_lei) + variable, 2)


def discretize_pv(
    *,
    target_added_kwp: float,
    products: list[PvModuleProductV1],
    activation_cost_lei: float,
    nonmodule_installed_cost_per_kwp_lei: float,
) -> PvCommercialDiscretizationV1:
    rows = []
    for product in products:
        if product.stock_status == "out_of_stock" or product.module_price_lei is None:
            continue
        module_kwp = float(product.module_power_wp) / 1000.0
        count = int(math.ceil(float(target_added_kwp) / module_kwp))
        realized = count * module_kwp
        material = count * float(product.module_price_lei)
        nonmodule = realized * float(nonmodule_installed_cost_per_kwp_lei)
        installed = float(activation_cost_lei) + material + nonmodule
        rows.append((installed, realized, count, product, material, nonmodule))
    if not rows:
        raise ValueError("No priced PV module is available for commercialization.")
    installed, realized, count, product, material, nonmodule = min(
        rows,
        key=lambda row: (row[0], row[1] - float(target_added_kwp), row[1]),
    )
    return PvCommercialDiscretizationV1(
        target_added_kwp=round(float(target_added_kwp), 6),
        realized_added_kwp=round(realized, 6),
        module_count=count,
        product=product,
        material_subtotal_lei=round(material, 2),
        nonmodule_subtotal_lei=round(nonmodule, 2),
        activation_cost_lei=round(float(activation_cost_lei), 2),
        installed_capex_lei=round(installed, 2),
        warnings=["PV power is rounded upward to a whole module count."],
    )


def discretize_solar_thermal(
    *,
    target_added_area_m2: float,
    products: list[SolarThermalCollectorProductV1],
    activation_cost_lei: float,
    noncollector_installed_cost_per_m2_lei: float,
) -> SolarThermalCommercialDiscretizationV1:
    rows = []
    for product in products:
        if product.stock_status == "out_of_stock" or product.collector_price_lei is None:
            continue
        count = int(math.ceil(float(target_added_area_m2) / float(product.collector_area_m2)))
        realized = count * float(product.collector_area_m2)
        material = count * float(product.collector_price_lei)
        noncollector = realized * float(noncollector_installed_cost_per_m2_lei)
        installed = float(activation_cost_lei) + material + noncollector
        rows.append((installed, realized, count, product, material, noncollector))
    if not rows:
        raise ValueError("No priced solar-thermal collector is available for commercialization.")
    installed, realized, count, product, material, noncollector = min(
        rows,
        key=lambda row: (row[0], row[1] - float(target_added_area_m2), row[1]),
    )
    return SolarThermalCommercialDiscretizationV1(
        target_added_area_m2=round(float(target_added_area_m2), 6),
        realized_added_area_m2=round(realized, 6),
        collector_count=count,
        product=product,
        material_subtotal_lei=round(material, 2),
        noncollector_subtotal_lei=round(noncollector, 2),
        activation_cost_lei=round(float(activation_cost_lei), 2),
        installed_capex_lei=round(installed, 2),
        warnings=["Solar-thermal area is rounded upward to a whole collector count."],
    )
