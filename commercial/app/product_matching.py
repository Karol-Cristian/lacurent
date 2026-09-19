from __future__ import annotations

import math
from typing import Literal

from pydantic import BaseModel, Field

from .models import BuildingInput
from .renovation import (
    ProductReferenceV1,
    TechnicalRequirementV1,
    WallInsulationScenarioBundleV1,
    build_wall_insulation_scenario,
)


SCHEMA_VERSION = "1.0"


class WallInsulationProductV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    partner_id: str = Field(min_length=1, max_length=120)
    product_id: str = Field(min_length=1, max_length=160)
    sku: str | None = Field(default=None, max_length=160)
    name: str = Field(min_length=1, max_length=240)
    manufacturer: str | None = Field(default=None, max_length=160)
    category: Literal["facade_insulation"] = "facade_insulation"
    application: Literal["external_wall"] = "external_wall"
    thickness_mm: float = Field(gt=0, le=500)
    lambda_w_mk: float = Field(ge=0.020, le=0.080)
    package_area_m2: float | None = Field(default=None, gt=0)
    price_per_package_lei: float | None = Field(default=None, ge=0)
    stock_status: Literal["in_stock", "out_of_stock", "unknown"] = "unknown"
    product_url: str | None = Field(default=None, max_length=1000)
    catalog_version: str | None = Field(default=None, max_length=120)


class ProductCompatibilityV1(BaseModel):
    compatible: bool
    status: Literal[
        "meets_requirement",
        "exceeds_requirement",
        "insufficient_thermal_resistance",
        "incompatible_category_or_application",
    ]
    product_thermal_resistance_m2k_w: float
    target_thermal_resistance_m2k_w: float
    thermal_resistance_margin_m2k_w: float
    nominal_thickness_delta_mm: float
    nominal_lambda_requirement_met: bool
    reasons: list[str] = Field(default_factory=list)


class ProductQuantityV1(BaseModel):
    affected_area_m2: float
    package_area_m2: float | None = None
    minimum_packages_no_waste: int | None = None
    minimum_purchase_area_m2: float | None = None
    material_subtotal_lei_no_waste: float | None = None
    assumptions: list[str] = Field(default_factory=list)


class WallInsulationProductMatchV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    product: WallInsulationProductV1
    compatibility: ProductCompatibilityV1
    quantity: ProductQuantityV1


class WallInsulationProductMatchRequestV1(BaseModel):
    requirement: TechnicalRequirementV1
    products: list[WallInsulationProductV1] = Field(min_items=1, max_items=500)


class WallInsulationProductMatchResponseV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    requirement_id: str
    compatible_count: int
    matches: list[WallInsulationProductMatchV1]


class WallInsulationProductScenarioRequestV1(BaseModel):
    baseline: BuildingInput
    requirement: TechnicalRequirementV1
    product: WallInsulationProductV1


class WallInsulationProductScenarioResponseV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    selected_product: WallInsulationProductV1
    match: WallInsulationProductMatchV1
    scenario_bundle: WallInsulationScenarioBundleV1


def _round(value: float, digits: int = 3) -> float:
    return round(float(value), digits)


def product_thermal_resistance(product: WallInsulationProductV1) -> float:
    return (float(product.thickness_mm) / 1000.0) / float(product.lambda_w_mk)


def _quantity_for(
    requirement: TechnicalRequirementV1,
    product: WallInsulationProductV1,
) -> ProductQuantityV1:
    package_area = product.package_area_m2
    if package_area is None:
        return ProductQuantityV1(
            affected_area_m2=_round(requirement.affected_area_m2, 2),
            assumptions=[
                "Affected area is the engine-derived net opaque exterior-wall area.",
                "Package quantity cannot be calculated because package_area_m2 is not provided.",
                "No waste factor, delivery, ETICS accessories or labour is included.",
            ],
        )

    packages = int(math.ceil(float(requirement.affected_area_m2) / float(package_area)))
    purchase_area = packages * float(package_area)
    subtotal = (
        packages * float(product.price_per_package_lei)
        if product.price_per_package_lei is not None
        else None
    )
    return ProductQuantityV1(
        affected_area_m2=_round(requirement.affected_area_m2, 2),
        package_area_m2=_round(package_area, 3),
        minimum_packages_no_waste=packages,
        minimum_purchase_area_m2=_round(purchase_area, 3),
        material_subtotal_lei_no_waste=None if subtotal is None else _round(subtotal, 2),
        assumptions=[
            "Package count is the mathematical minimum to cover the affected area.",
            "No waste factor is applied in Product Matching V1.",
            "Price subtotal covers this insulation product only; delivery, ETICS accessories and labour are excluded.",
        ],
    )


def match_wall_insulation_product(
    requirement: TechnicalRequirementV1,
    product: WallInsulationProductV1,
) -> WallInsulationProductMatchV1:
    product_r = product_thermal_resistance(product)
    target_r = float(requirement.target_added_thermal_resistance_m2k_w)
    margin = product_r - target_r
    tolerance = max(0.01, target_r * 0.005)

    category_match = product.category == requirement.category
    application_match = product.application == requirement.application
    nominal_lambda_met = float(product.lambda_w_mk) <= float(requirement.maximum_lambda_w_mk)
    thickness_delta = float(product.thickness_mm) - float(requirement.nominal_added_thickness_mm)

    reasons: list[str] = []
    if not category_match or not application_match:
        compatible = False
        status = "incompatible_category_or_application"
        reasons.append("Product category/application does not match the technical requirement.")
    elif margin < -tolerance:
        compatible = False
        status = "insufficient_thermal_resistance"
        reasons.append(
            f"Product layer R={product_r:.3f} m²K/W is below target R={target_r:.3f} m²K/W."
        )
    elif margin > tolerance:
        compatible = True
        status = "exceeds_requirement"
        reasons.append(
            f"Product layer R={product_r:.3f} m²K/W exceeds target R={target_r:.3f} m²K/W."
        )
    else:
        compatible = True
        status = "meets_requirement"
        reasons.append(
            f"Product layer R={product_r:.3f} m²K/W meets target R={target_r:.3f} m²K/W."
        )

    if category_match and application_match:
        if nominal_lambda_met:
            reasons.append(
                f"Declared λ={product.lambda_w_mk:.3f} W/mK is at or below the nominal λ limit "
                f"{requirement.maximum_lambda_w_mk:.3f} W/mK."
            )
        else:
            reasons.append(
                "Declared λ is above the nominal λ limit, but compatibility is decided from the "
                "actual thickness/λ thermal resistance of the product layer."
            )

    return WallInsulationProductMatchV1(
        product=product,
        compatibility=ProductCompatibilityV1(
            compatible=compatible,
            status=status,
            product_thermal_resistance_m2k_w=_round(product_r, 4),
            target_thermal_resistance_m2k_w=_round(target_r, 4),
            thermal_resistance_margin_m2k_w=_round(margin, 4),
            nominal_thickness_delta_mm=_round(thickness_delta, 1),
            nominal_lambda_requirement_met=nominal_lambda_met,
            reasons=reasons,
        ),
        quantity=_quantity_for(requirement, product),
    )


def match_wall_insulation_products(
    requirement: TechnicalRequirementV1,
    products: list[WallInsulationProductV1],
) -> WallInsulationProductMatchResponseV1:
    matches = [match_wall_insulation_product(requirement, product) for product in products]
    return WallInsulationProductMatchResponseV1(
        requirement_id=requirement.requirement_id,
        compatible_count=sum(1 for item in matches if item.compatibility.compatible),
        matches=matches,
    )


def build_product_wall_insulation_scenario(
    baseline: BuildingInput,
    requirement: TechnicalRequirementV1,
    product: WallInsulationProductV1,
) -> WallInsulationProductScenarioResponseV1:
    match = match_wall_insulation_product(requirement, product)
    if not match.compatibility.compatible:
        raise ValueError(
            f"Product {product.product_id!r} does not satisfy wall-insulation requirement "
            f"{requirement.requirement_id}: {match.compatibility.status}."
        )

    scenario_bundle = build_wall_insulation_scenario(
        baseline,
        added_insulation_thickness_mm=product.thickness_mm,
        insulation_lambda_w_mk=product.lambda_w_mk,
        material_source="partner_product",
        product_reference=ProductReferenceV1(
            partner_id=product.partner_id,
            product_id=product.product_id,
            sku=product.sku,
            name=product.name,
        ),
    )
    return WallInsulationProductScenarioResponseV1(
        selected_product=product,
        match=match,
        scenario_bundle=scenario_bundle,
    )
