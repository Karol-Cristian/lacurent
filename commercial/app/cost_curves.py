from __future__ import annotations

import math
from typing import Literal

from pydantic import BaseModel, Field, root_validator

from .market_products import InsulationProductV1
from .product_matching import WallInsulationProductV1, product_thermal_resistance


SCHEMA_VERSION = "1.0"


class ParametricCostCurvePointV1(BaseModel):
    parameter_value: float = Field(gt=0)
    variable_cost_per_basis_lei: float = Field(ge=0)
    source_product_ids: list[str] = Field(default_factory=list)


class ParametricCostCurveV1(BaseModel):
    """Market-derived cost function for one raw physical parameter.

    The curve separates activation/fixed cost from the variable product-derived
    part so a renovation does not incorrectly approach zero installation cost as
    the optimized physical parameter approaches zero.
    """

    schema_version: Literal["1.0"] = SCHEMA_VERSION
    family: Literal["wall", "roof", "floor", "windows"]
    parameter_name: Literal[
        "added_thermal_resistance_m2k_w",
        "target_window_resistance_m2k_w",
    ]
    parameter_unit: Literal["m2K/W_added", "m2K/W_window"]
    quantity_basis: Literal["m2"]
    price_scope: Literal["material_only", "installed_total"]
    activation_cost_per_basis_lei: float = Field(default=0, ge=0)
    points: list[ParametricCostCurvePointV1] = Field(min_items=1)
    source_product_count: int = Field(ge=1)
    assumptions: list[str] = Field(default_factory=list)

    @root_validator(skip_on_failure=True)
    def validate_points(cls, values: dict) -> dict:
        points = values.get("points") or []
        parameters = [float(item.parameter_value) for item in points]
        if parameters != sorted(parameters):
            raise ValueError("Cost-curve points must be sorted by parameter value.")
        if len(parameters) != len(set(parameters)):
            raise ValueError("Cost-curve points must have unique parameter values.")
        if (
            values.get("price_scope") == "material_only"
            and float(values.get("activation_cost_per_basis_lei") or 0) > 0
        ):
            raise ValueError("Material-only curve cannot claim a non-material activation cost.")
        return values


class WallCostCurveRequestV1(BaseModel):
    products: list[WallInsulationProductV1] = Field(min_items=1, max_items=1000)
    nonmaterial_installed_cost_per_m2_lei: float | None = Field(default=None, ge=0)


class WallProductDiscretizationV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    target_added_r_m2k_w: float = Field(gt=0)
    realized_added_r_m2k_w: float = Field(gt=0)
    thermal_resistance_overshoot_m2k_w: float = Field(ge=0)
    affected_area_m2: float = Field(gt=0)
    product: WallInsulationProductV1
    packages: int | None = None
    purchase_area_m2: float | None = None
    material_subtotal_lei: float | None = None
    selection_basis: str
    warnings: list[str] = Field(default_factory=list)


class WallProductDiscretizationRequestV1(BaseModel):
    target_added_r_m2k_w: float = Field(gt=0)
    affected_area_m2: float = Field(gt=0)
    products: list[WallInsulationProductV1] = Field(min_items=1, max_items=1000)


def insulation_product_thermal_resistance(product: InsulationProductV1) -> float:
    return (float(product.thickness_mm) / 1000.0) / float(product.lambda_w_mk)


def build_insulation_product_cost_curve(
    family: Literal["roof", "floor"],
    products: list[InsulationProductV1],
    *,
    nonmaterial_installed_cost_per_m2_lei: float | None = None,
) -> ParametricCostCurveV1:
    eligible = [
        product
        for product in products
        if product.family == family
        and product.stock_status != "out_of_stock"
        and product.package_area_m2 is not None
        and product.price_per_package_lei is not None
    ]
    if not eligible:
        raise ValueError(
            f"No {family}-insulation product has both package area and package price."
        )

    best_by_r: dict[float, tuple[float, list[str]]] = {}
    for product in eligible:
        r_value = round(insulation_product_thermal_resistance(product), 6)
        cost_per_m2 = float(product.price_per_package_lei) / float(product.package_area_m2)
        previous = best_by_r.get(r_value)
        if previous is None or cost_per_m2 < previous[0] - 1e-9:
            best_by_r[r_value] = (cost_per_m2, [product.product_id])
        elif abs(cost_per_m2 - previous[0]) <= 1e-9:
            previous[1].append(product.product_id)

    installed = nonmaterial_installed_cost_per_m2_lei is not None
    return ParametricCostCurveV1(
        family=family,
        parameter_name="added_thermal_resistance_m2k_w",
        parameter_unit="m2K/W_added",
        quantity_basis="m2",
        price_scope="installed_total" if installed else "material_only",
        activation_cost_per_basis_lei=(
            float(nonmaterial_installed_cost_per_m2_lei) if installed else 0.0
        ),
        points=[
            ParametricCostCurvePointV1(
                parameter_value=r_value,
                variable_cost_per_basis_lei=round(cost, 4),
                source_product_ids=sorted(ids),
            )
            for r_value, (cost, ids) in sorted(best_by_r.items())
        ],
        source_product_count=len(eligible),
        assumptions=[
            "Each product point uses declared thickness and lambda to derive R=d/lambda.",
            "Package material price is normalized to lei/m2.",
            "Between observed products, raw optimization uses piecewise-linear interpolation.",
            "Commercialization must select an actual product and package count.",
        ],
    )


class InsulationProductDiscretizationV1(BaseModel):
    family: Literal["roof", "floor"]
    target_added_r_m2k_w: float = Field(gt=0)
    realized_added_r_m2k_w: float = Field(gt=0)
    thermal_resistance_overshoot_m2k_w: float = Field(ge=0)
    affected_area_m2: float = Field(gt=0)
    product: InsulationProductV1
    packages: int | None = None
    purchase_area_m2: float | None = None
    material_subtotal_lei: float | None = None
    selection_basis: str


def discretize_insulation_product(
    *,
    family: Literal["roof", "floor"],
    target_added_r_m2k_w: float,
    affected_area_m2: float,
    products: list[InsulationProductV1],
) -> InsulationProductDiscretizationV1:
    target = float(target_added_r_m2k_w)
    area = float(affected_area_m2)
    rows = []
    for product in products:
        if product.family != family or product.stock_status == "out_of_stock":
            continue
        realized_r = insulation_product_thermal_resistance(product)
        if realized_r + 1e-9 < target:
            continue
        packages = purchase_area = subtotal = None
        if product.package_area_m2 is not None and product.price_per_package_lei is not None:
            packages = int(math.ceil(area / float(product.package_area_m2)))
            purchase_area = packages * float(product.package_area_m2)
            subtotal = packages * float(product.price_per_package_lei)
        rows.append((product, realized_r, packages, purchase_area, subtotal))
    if not rows:
        raise ValueError(f"No supplied {family} insulation product reaches R={target:.4f} m2K/W.")
    priced = [row for row in rows if row[4] is not None]
    selected = min(
        priced or rows,
        key=lambda row: (
            float(row[4]) if row[4] is not None else float("inf"),
            row[1] - target,
            row[1],
        ),
    )
    product, realized_r, packages, purchase_area, subtotal = selected
    return InsulationProductDiscretizationV1(
        family=family,
        target_added_r_m2k_w=round(target, 6),
        realized_added_r_m2k_w=round(realized_r, 6),
        thermal_resistance_overshoot_m2k_w=round(realized_r - target, 6),
        affected_area_m2=round(area, 3),
        product=product,
        packages=packages,
        purchase_area_m2=None if purchase_area is None else round(purchase_area, 3),
        material_subtotal_lei=None if subtotal is None else round(subtotal, 2),
        selection_basis=(
            "Lowest known material purchase subtotal among products meeting the raw R target."
            if priced
            else "No complete package prices; smallest R overshoot selected."
        ),
    )


def build_wall_product_cost_curve(
    products: list[WallInsulationProductV1],
    *,
    nonmaterial_installed_cost_per_m2_lei: float | None = None,
) -> ParametricCostCurveV1:
    """Build an R -> lei/m2 planning curve from actual insulation products.

    Product points contribute material price only. A caller may add a sourced
    non-material installed-system allowance (labour, adhesive, mesh, anchors,
    finish, scaffolding etc.). Only then may the curve claim installed_total.
    """

    eligible = [
        product
        for product in products
        if product.stock_status != "out_of_stock"
        and product.package_area_m2 is not None
        and product.price_per_package_lei is not None
        and product.package_area_m2 > 0
        and product.price_per_package_lei >= 0
    ]
    if not eligible:
        raise ValueError(
            "No wall-insulation product has both package area and package price."
        )

    best_by_r: dict[float, tuple[float, list[str]]] = {}
    for product in eligible:
        r_value = round(product_thermal_resistance(product), 6)
        cost_per_m2 = float(product.price_per_package_lei) / float(
            product.package_area_m2
        )
        previous = best_by_r.get(r_value)
        if previous is None or cost_per_m2 < previous[0] - 1e-9:
            best_by_r[r_value] = (cost_per_m2, [product.product_id])
        elif abs(cost_per_m2 - previous[0]) <= 1e-9:
            previous[1].append(product.product_id)

    points = [
        ParametricCostCurvePointV1(
            parameter_value=r_value,
            variable_cost_per_basis_lei=round(cost, 4),
            source_product_ids=sorted(product_ids),
        )
        for r_value, (cost, product_ids) in sorted(best_by_r.items())
    ]
    installed = nonmaterial_installed_cost_per_m2_lei is not None
    return ParametricCostCurveV1(
        family="wall",
        parameter_name="added_thermal_resistance_m2k_w",
        parameter_unit="m2K/W_added",
        quantity_basis="m2",
        price_scope="installed_total" if installed else "material_only",
        activation_cost_per_basis_lei=(
            float(nonmaterial_installed_cost_per_m2_lei)
            if installed
            else 0.0
        ),
        points=points,
        source_product_count=len(eligible),
        assumptions=[
            "Each product point uses declared thickness and lambda to derive R=d/lambda.",
            "Package material price is normalized to lei/m2.",
            "Between observed products, the raw optimizer uses piecewise-linear interpolation.",
            "Commercial recommendation must still select and recalculate an actual product.",
            (
                "A separately sourced non-material installed-system allowance is included."
                if installed
                else "Labour, accessories, finish, delivery and scaffolding are not included."
            ),
        ],
    )


def curve_cost_per_basis(
    curve: ParametricCostCurveV1,
    parameter_value: float,
    *,
    require_installed_total: bool = True,
) -> float:
    target = float(parameter_value)
    if target < 0:
        raise ValueError("Cost-curve parameter cannot be negative.")
    if target == 0:
        return 0.0
    if require_installed_total and curve.price_scope != "installed_total":
        raise ValueError(
            f"{curve.family} curve is material_only and cannot price an economic optimum."
        )

    points = curve.points
    if target > float(points[-1].parameter_value) + 1e-9:
        raise ValueError(
            f"Target {target:.4f} exceeds the sourced {curve.family} curve maximum "
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
        lower_y = float(point.variable_cost_per_basis_lei)

    upper_x = float(upper.parameter_value)
    upper_y = float(upper.variable_cost_per_basis_lei)
    if abs(upper_x - lower_x) <= 1e-12:
        variable = upper_y
    else:
        fraction = (target - lower_x) / (upper_x - lower_x)
        variable = lower_y + fraction * (upper_y - lower_y)

    return round(float(curve.activation_cost_per_basis_lei) + variable, 4)


def discretize_wall_product(
    *,
    target_added_r_m2k_w: float,
    affected_area_m2: float,
    products: list[WallInsulationProductV1],
) -> WallProductDiscretizationV1:
    """Choose an actual product that meets or exceeds the raw R target.

    V1 chooses the lowest known material purchase subtotal; if no complete
    price is available, it minimizes R overshoot. It does not pretend this is
    the final installed-cost optimum.
    """

    target = float(target_added_r_m2k_w)
    area = float(affected_area_m2)
    feasible = [
        product
        for product in products
        if product.stock_status != "out_of_stock"
        and product_thermal_resistance(product) + 1e-9 >= target
    ]
    if not feasible:
        raise ValueError(
            f"No supplied wall-insulation product reaches R={target:.4f} m2K/W."
        )

    rows = []
    for product in feasible:
        realized_r = product_thermal_resistance(product)
        packages = None
        purchase_area = None
        subtotal = None
        if (
            product.package_area_m2 is not None
            and product.price_per_package_lei is not None
        ):
            packages = int(math.ceil(area / float(product.package_area_m2)))
            purchase_area = packages * float(product.package_area_m2)
            subtotal = packages * float(product.price_per_package_lei)
        rows.append(
            (
                product,
                realized_r,
                packages,
                purchase_area,
                subtotal,
            )
        )

    priced = [row for row in rows if row[4] is not None]
    if priced:
        selected = min(
            priced,
            key=lambda row: (
                float(row[4]),
                row[1] - target,
                row[1],
            ),
        )
        basis = (
            "Lowest known material purchase subtotal among supplied products "
            "that meet the raw R target; installed-system cost is not yet compared."
        )
    else:
        selected = min(rows, key=lambda row: (row[1] - target, row[1]))
        basis = (
            "No complete package prices were supplied; selected the smallest "
            "thermal-resistance overshoot."
        )

    product, realized_r, packages, purchase_area, subtotal = selected
    return WallProductDiscretizationV1(
        target_added_r_m2k_w=round(target, 6),
        realized_added_r_m2k_w=round(realized_r, 6),
        thermal_resistance_overshoot_m2k_w=round(realized_r - target, 6),
        affected_area_m2=round(area, 3),
        product=product,
        packages=packages,
        purchase_area_m2=(
            None if purchase_area is None else round(purchase_area, 3)
        ),
        material_subtotal_lei=(
            None if subtotal is None else round(subtotal, 2)
        ),
        selection_basis=basis,
        warnings=[
            "The selected product satisfies the raw thermal target.",
            "Final installed CAPEX requires sourced labour/accessory/system costs.",
            "After all families are discretized, LaCurent must recalculate the complete commercial solution.",
        ],
    )
