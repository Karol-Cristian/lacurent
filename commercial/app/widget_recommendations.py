from __future__ import annotations

import math
from typing import Literal

from pydantic import BaseModel, Field

from .engineering_requirements import build_engineering_requirements
from .market_catalog import MarketProductV1, market_catalog
from .models import BuildingInput
from .pv_catalog import PvModuleSizingRequestV1, size_pv_modules


SCHEMA_VERSION = "1.0"


class WidgetRecommendationRequestV1(BaseModel):
    baseline: BuildingInput
    target_pv_kwp: float | None = Field(default=None, gt=0, le=200)
    available_pv_roof_area_m2: float | None = Field(default=None, gt=0)
    preferred_generator_category: Literal[
        "heat_pump_air_water",
        "condensing_gas_boiler",
    ] = "heat_pump_air_water"
    pipe_length_m: float | None = Field(default=None, gt=0)
    insulation_waste_percent: float = Field(default=8.0, ge=0, le=30)


class ProductRecommendationV1(BaseModel):
    category: str
    requirement_summary: dict
    product_id: str
    manufacturer: str
    model: str
    quantity: float | None = None
    quantity_unit: str | None = None
    purchase_quantity: float | None = None
    purchase_unit: str | None = None
    estimated_material_cost_lei: float | None = None
    supplier_name: str | None = None
    product_url: str | None = None
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class WidgetRecommendationResponseV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    recommendations: list[ProductRecommendationV1]
    assumptions: list[str] = Field(default_factory=list)


def _best_offer(product: MarketProductV1):
    if not product.offers:
        return None
    in_stock = [o for o in product.offers if o.stock_status == "in_stock"]
    candidates = in_stock or [o for o in product.offers if o.stock_status != "out_of_stock"] or product.offers
    priced = [o for o in candidates if o.price_lei is not None]
    return min(priced, key=lambda o: float(o.price_lei)) if priced else candidates[0]


def _insulation_cost(product: MarketProductV1, packages: int, purchase_area_m2: float) -> tuple[float | None, object | None]:
    offer = _best_offer(product)
    if offer is None or offer.price_lei is None:
        return None, offer
    if offer.price_unit == "package":
        return round(packages * float(offer.price_lei), 2), offer
    if offer.price_unit == "m2":
        return round(purchase_area_m2 * float(offer.price_lei), 2), offer
    return None, offer


def _recommend_insulation(req, waste_percent: float) -> ProductRecommendationV1 | None:
    catalog = market_catalog()
    candidates = []
    for product in catalog.products:
        if product.category != req.category:
            continue
        thickness_mm = float(product.specs["thickness_mm"])
        lambda_w_mk = float(product.specs["lambda_w_mk"])
        added_r = (thickness_mm / 1000.0) / lambda_w_mk
        if added_r + 1e-9 < float(req.required_added_r_m2k_w):
            continue

        package_area = float(product.specs["package_area_m2"])
        purchase_area = float(req.affected_area_m2) * (1.0 + waste_percent / 100.0)
        packages = int(math.ceil(purchase_area / package_area))
        actual_purchase_area = packages * package_area
        cost, offer = _insulation_cost(product, packages, actual_purchase_area)
        candidates.append((cost if cost is not None else float("inf"), added_r, product, packages, actual_purchase_area, offer))

    if not candidates:
        return None
    candidates.sort(key=lambda row: (row[0], row[1]))
    cost, added_r, product, packages, purchase_area, offer = candidates[0]
    return ProductRecommendationV1(
        category=req.category,
        requirement_summary={
            "surface": req.surface,
            "affected_area_m2": req.affected_area_m2,
            "required_added_r_m2k_w": req.required_added_r_m2k_w,
            "target_u_w_m2k": req.target_u_w_m2k,
        },
        product_id=product.product_id,
        manufacturer=product.manufacturer,
        model=product.model,
        quantity=req.affected_area_m2,
        quantity_unit="m2_net",
        purchase_quantity=float(packages),
        purchase_unit="packages",
        estimated_material_cost_lei=None if math.isinf(cost) else cost,
        supplier_name=None if offer is None else offer.supplier_name,
        product_url=None if offer is None else offer.product_url,
        reasons=[
            f"Product layer R={added_r:.3f} m2K/W meets required added R={req.required_added_r_m2k_w:.3f} m2K/W.",
            f"Purchase quantity includes {waste_percent:.1f}% widget allowance and package rounding.",
        ],
        warnings=[
            "Commercial quantity allowance is a widget assumption, not part of the Home Lab scientific engine.",
            "Accessories, adhesive, anchors, mesh, finish, labour and delivery are not included.",
        ],
    )


def _recommend_generator(requirement, category: str) -> ProductRecommendationV1 | None:
    catalog = market_catalog()
    candidates = []
    for product in catalog.products:
        if product.category != category:
            continue
        capacity = float(product.specs["thermal_capacity_kw"])
        if capacity + 1e-9 < float(requirement.minimum_generator_capacity_kw):
            continue
        offer = _best_offer(product)
        price = float(offer.price_lei) if offer and offer.price_lei is not None else float("inf")
        oversize = capacity - float(requirement.minimum_generator_capacity_kw)
        candidates.append((oversize, price, product, offer, capacity))

    if not candidates:
        return None
    candidates.sort(key=lambda row: (row[0], row[1]))
    oversize, price, product, offer, capacity = candidates[0]
    return ProductRecommendationV1(
        category=category,
        requirement_summary={
            "minimum_generator_capacity_kw": requirement.minimum_generator_capacity_kw,
            "design_heat_load_kw": requirement.design_heat_load_kw,
        },
        product_id=product.product_id,
        manufacturer=product.manufacturer,
        model=product.model,
        quantity=1,
        quantity_unit="piece",
        purchase_quantity=1,
        purchase_unit="piece",
        estimated_material_cost_lei=None if math.isinf(price) else round(price, 2),
        supplier_name=None if offer is None else offer.supplier_name,
        product_url=None if offer is None else offer.product_url,
        reasons=[
            f"Rated thermal capacity {capacity:.1f} kW meets the engine minimum {requirement.minimum_generator_capacity_kw:.2f} kW.",
            f"Selected as the smallest compatible seeded capacity; oversizing is {oversize:.2f} kW.",
        ],
        warnings=[
            "Heat-pump selection by nominal capacity is only a V1 commercial match; final low-temperature design-point capacity must be verified before procurement.",
        ] if category == "heat_pump_air_water" else [],
    )


def _recommend_pipe(requirement, pipe_length_m: float | None) -> ProductRecommendationV1 | None:
    if not requirement.hydronic or requirement.minimum_pipe_inner_diameter_mm is None:
        return None
    catalog = market_catalog()
    candidates = []
    required_d = float(requirement.minimum_pipe_inner_diameter_mm)
    for product in catalog.products:
        if product.category != "hydronic_pipe":
            continue
        inner_d = float(product.specs["inner_diameter_mm"])
        if inner_d + 1e-9 < required_d:
            continue
        offer = _best_offer(product)
        price = float(offer.price_lei) if offer and offer.price_lei is not None and offer.price_unit == "m" else float("inf")
        candidates.append((inner_d, price, product, offer))

    if not candidates:
        return None
    candidates.sort(key=lambda row: (row[0], row[1]))
    inner_d, price, product, offer = candidates[0]
    cost = None
    if pipe_length_m is not None and not math.isinf(price):
        cost = round(float(pipe_length_m) * price, 2)

    return ProductRecommendationV1(
        category="hydronic_pipe",
        requirement_summary={
            "required_water_flow_l_h": requirement.required_water_flow_l_h,
            "minimum_pipe_inner_diameter_mm": requirement.minimum_pipe_inner_diameter_mm,
        },
        product_id=product.product_id,
        manufacturer=product.manufacturer,
        model=product.model,
        quantity=pipe_length_m,
        quantity_unit="m" if pipe_length_m is not None else None,
        purchase_quantity=pipe_length_m,
        purchase_unit="m" if pipe_length_m is not None else None,
        estimated_material_cost_lei=cost,
        supplier_name=None if offer is None else offer.supplier_name,
        product_url=None if offer is None else offer.product_url,
        reasons=[
            f"Product inner diameter {inner_d:.1f} mm is at or above the engine minimum {required_d:.2f} mm.",
        ],
        warnings=[
            "Pipe length is not inferred by the scientific engine. A quantity is shown only when the widget receives an explicit route length.",
        ],
    )


def build_widget_recommendations(payload: WidgetRecommendationRequestV1) -> WidgetRecommendationResponseV1:
    requirements = build_engineering_requirements(payload.baseline)
    recommendations: list[ProductRecommendationV1] = []

    for req in requirements.envelope:
        if req.target_already_met:
            continue
        recommendation = _recommend_insulation(req, payload.insulation_waste_percent)
        if recommendation is not None:
            recommendations.append(recommendation)

    generator = _recommend_generator(requirements.heating, payload.preferred_generator_category)
    if generator is not None:
        recommendations.append(generator)

    pipe = _recommend_pipe(requirements.heating, payload.pipe_length_m)
    if pipe is not None:
        recommendations.append(pipe)

    if payload.target_pv_kwp is not None:
        sizing = size_pv_modules(
            PvModuleSizingRequestV1(
                target_installed_power_kwp=payload.target_pv_kwp,
                max_roof_area_m2=payload.available_pv_roof_area_m2,
            )
        )
        feasible = [
            item for item in sizing.candidates
            if item.roof_area_fits is not False
        ]
        if feasible:
            feasible.sort(
                key=lambda item: (
                    item.module_subtotal_lei if item.module_subtotal_lei is not None else float("inf"),
                    item.array_module_area_m2,
                )
            )
            item = feasible[0]
            offer = item.best_offer
            recommendations.append(
                ProductRecommendationV1(
                    category="pv_module",
                    requirement_summary={
                        "target_pv_kwp": payload.target_pv_kwp,
                        "optimum_orientation": requirements.photovoltaic.optimum.orientation,
                        "optimum_tilt_degrees": requirements.photovoltaic.optimum.tilt_degrees,
                    },
                    product_id=item.product.product_id,
                    manufacturer=item.product.manufacturer,
                    model=item.product.model,
                    quantity=float(item.module_count),
                    quantity_unit="modules",
                    purchase_quantity=float(item.module_count),
                    purchase_unit="modules",
                    estimated_material_cost_lei=item.module_subtotal_lei,
                    supplier_name=None if offer is None else offer.supplier_name,
                    product_url=None if offer is None else offer.product_url,
                    reasons=[
                        f"{item.module_count} modules provide {item.installed_power_kwp:.3f} kWp, meeting the target.",
                        "Orientation and tilt recommendation come from the scientific climate model, not from the module catalog.",
                    ],
                    warnings=[
                        "Module-only subtotal excludes inverter, mounting, cabling, protection, labour and transport.",
                    ],
                )
            )

    return WidgetRecommendationResponseV1(
        recommendations=recommendations,
        assumptions=[
            "The Home Lab scientific engine produces requirements; this widget layer performs commercial product matching.",
            "Commercial prices and stock are snapshots and never change the scientific requirement.",
        ],
    )
