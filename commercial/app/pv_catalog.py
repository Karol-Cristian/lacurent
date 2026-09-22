from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from .engine import calculate
from .models import BuildingInput, CalculationResult, model_to_dict


SCHEMA_VERSION = "1.0"
BASE_DIR = Path(__file__).resolve().parents[1]
CATALOG_PATH = BASE_DIR / "data" / "pv-products.seed.json"


class PvModuleProductV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    product_id: str = Field(min_length=1, max_length=160)
    manufacturer: str = Field(min_length=1, max_length=160)
    model: str = Field(min_length=1, max_length=200)
    technology: str = Field(min_length=1, max_length=240)
    pmax_w: float = Field(gt=0, le=2000)
    vmp_v: float = Field(gt=0, le=200)
    imp_a: float = Field(gt=0, le=100)
    voc_v: float = Field(gt=0, le=250)
    isc_a: float = Field(gt=0, le=100)
    module_efficiency_percent: float = Field(gt=0, le=100)
    length_mm: float = Field(gt=0, le=5000)
    width_mm: float = Field(gt=0, le=3000)
    thickness_mm: float | None = Field(default=None, gt=0, le=200)
    weight_kg: float | None = Field(default=None, gt=0, le=100)
    temperature_coefficient_pmax_percent_c: float | None = Field(default=None, ge=-2, le=1)
    temperature_coefficient_voc_percent_c: float | None = Field(default=None, ge=-2, le=1)
    temperature_coefficient_isc_percent_c: float | None = Field(default=None, ge=-1, le=2)
    noct_c: float | None = Field(default=None, ge=20, le=80)
    max_system_voltage_v: float | None = Field(default=None, gt=0, le=2000)
    max_series_fuse_a: float | None = Field(default=None, gt=0, le=200)
    bifacial: bool = False
    technical_source_urls: list[str] = Field(default_factory=list)
    catalog_version: str = Field(min_length=1, max_length=120)

    @property
    def module_area_m2(self) -> float:
        return (float(self.length_mm) / 1000.0) * (float(self.width_mm) / 1000.0)


class PvModuleOfferV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    offer_id: str = Field(min_length=1, max_length=200)
    product_id: str = Field(min_length=1, max_length=160)
    supplier_name: str = Field(min_length=1, max_length=200)
    price_lei: float = Field(gt=0)
    vat_included: bool = True
    stock_status: Literal["in_stock", "limited", "out_of_stock", "unknown"] = "unknown"
    product_url: str = Field(min_length=1, max_length=1500)
    observed_on: str = Field(min_length=10, max_length=32)
    currency: Literal["RON"] = "RON"


class PvCatalogEntryV1(BaseModel):
    product: PvModuleProductV1
    offers: list[PvModuleOfferV1] = Field(default_factory=list)


class PvCatalogResponseV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    catalog_version: str
    observed_on: str
    entries: list[PvCatalogEntryV1]


class PvModuleSizingRequestV1(BaseModel):
    target_installed_power_kwp: float = Field(gt=0, le=200)
    max_roof_area_m2: float | None = Field(default=None, gt=0, le=100000)
    product_ids: list[str] = Field(default_factory=list)


class PvModuleSizingCandidateV1(BaseModel):
    product: PvModuleProductV1
    module_count: int
    module_area_m2: float
    array_module_area_m2: float
    installed_power_kwp: float
    target_power_delta_kwp: float
    watts_per_m2: float
    max_modules_by_roof_area: int | None = None
    max_power_by_roof_area_kwp: float | None = None
    roof_area_fits: bool | None = None
    best_offer: PvModuleOfferV1 | None = None
    module_subtotal_lei: float | None = None
    assumptions: list[str] = Field(default_factory=list)


class PvModuleSizingResponseV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    catalog_version: str
    target_installed_power_kwp: float
    max_roof_area_m2: float | None = None
    feasible_count: int
    candidates: list[PvModuleSizingCandidateV1]


class PvProductScenarioRequestV1(BaseModel):
    baseline: BuildingInput
    product_id: str = Field(min_length=1, max_length=160)
    target_installed_power_kwp: float = Field(gt=0, le=200)
    max_roof_area_m2: float | None = Field(default=None, gt=0, le=100000)


class PvProductScenarioResponseV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    selected: PvModuleSizingCandidateV1
    calculation: CalculationResult


def _round(value: float, digits: int = 3) -> float:
    return round(float(value), digits)


@lru_cache(maxsize=1)
def pv_catalog() -> PvCatalogResponseV1:
    raw = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    return PvCatalogResponseV1(**raw)


def _best_offer(offers: list[PvModuleOfferV1]) -> PvModuleOfferV1 | None:
    if not offers:
        return None
    in_stock = [item for item in offers if item.stock_status == "in_stock"]
    candidates = in_stock or [item for item in offers if item.stock_status != "out_of_stock"] or offers
    return min(candidates, key=lambda item: float(item.price_lei))


def _candidate(
    entry: PvCatalogEntryV1,
    target_installed_power_kwp: float,
    max_roof_area_m2: float | None,
) -> PvModuleSizingCandidateV1:
    product = entry.product
    target_w = float(target_installed_power_kwp) * 1000.0
    module_count = int(math.ceil(target_w / float(product.pmax_w)))
    installed_kwp = (module_count * float(product.pmax_w)) / 1000.0
    module_area = product.module_area_m2
    array_area = module_count * module_area
    max_modules = None
    max_power = None
    roof_fits = None

    if max_roof_area_m2 is not None:
        max_modules = int(math.floor(float(max_roof_area_m2) / module_area))
        max_power = (max_modules * float(product.pmax_w)) / 1000.0
        roof_fits = max_modules >= module_count

    offer = _best_offer(entry.offers)
    subtotal = None if offer is None else module_count * float(offer.price_lei)

    return PvModuleSizingCandidateV1(
        product=product,
        module_count=module_count,
        module_area_m2=_round(module_area, 4),
        array_module_area_m2=_round(array_area, 3),
        installed_power_kwp=_round(installed_kwp, 3),
        target_power_delta_kwp=_round(installed_kwp - float(target_installed_power_kwp), 3),
        watts_per_m2=_round(float(product.pmax_w) / module_area, 1),
        max_modules_by_roof_area=max_modules,
        max_power_by_roof_area_kwp=None if max_power is None else _round(max_power, 3),
        roof_area_fits=roof_fits,
        best_offer=offer,
        module_subtotal_lei=None if subtotal is None else _round(subtotal, 2),
        assumptions=[
            "Module count is the minimum whole-panel count that meets or exceeds the target DC installed power.",
            "Array area is module face area only; access paths, fire setbacks, inter-row spacing, roof obstacles and mounting clearances are not included.",
            "Module subtotal uses the lowest currently seeded in-stock module offer only; inverter, mounting, DC/AC protection, cabling, labour, transport and VAT differences are outside this subtotal.",
            "Electrical values are retained for later inverter, MPPT and string compatibility checks; this V1 sizing step does not yet validate string design.",
        ],
    )


def size_pv_modules(payload: PvModuleSizingRequestV1) -> PvModuleSizingResponseV1:
    catalog = pv_catalog()
    selected_ids = set(payload.product_ids)
    entries = [
        entry
        for entry in catalog.entries
        if not selected_ids or entry.product.product_id in selected_ids
    ]
    candidates = [
        _candidate(entry, payload.target_installed_power_kwp, payload.max_roof_area_m2)
        for entry in entries
    ]
    return PvModuleSizingResponseV1(
        catalog_version=catalog.catalog_version,
        target_installed_power_kwp=_round(payload.target_installed_power_kwp, 3),
        max_roof_area_m2=payload.max_roof_area_m2,
        feasible_count=sum(1 for item in candidates if item.roof_area_fits is not False),
        candidates=candidates,
    )


def build_pv_product_scenario(payload: PvProductScenarioRequestV1) -> PvProductScenarioResponseV1:
    sizing = size_pv_modules(
        PvModuleSizingRequestV1(
            target_installed_power_kwp=payload.target_installed_power_kwp,
            max_roof_area_m2=payload.max_roof_area_m2,
            product_ids=[payload.product_id],
        )
    )
    if not sizing.candidates:
        raise ValueError(f"Unknown PV product_id {payload.product_id!r}.")
    selected = sizing.candidates[0]
    if selected.roof_area_fits is False:
        raise ValueError(
            f"PV product {payload.product_id!r} cannot reach {payload.target_installed_power_kwp:.3f} kWp "
            f"inside the supplied roof area."
        )

    building_payload = model_to_dict(payload.baseline)
    renewables = building_payload.setdefault("renewables", {})
    pv = renewables.setdefault("pv", {})
    pv["enabled"] = True
    pv["installed_power_kwp"] = float(selected.installed_power_kwp)

    scenario_building = BuildingInput(**building_payload)
    return PvProductScenarioResponseV1(
        selected=selected,
        calculation=calculate(scenario_building),
    )
