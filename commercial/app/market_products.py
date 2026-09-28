from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, root_validator

from .models import BuildingInput, HeatingInput, SolarOrientation


SCHEMA_VERSION = "1.0"
StockStatus = Literal["in_stock", "out_of_stock", "unknown"]


class InsulationProductV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    partner_id: str = Field(min_length=1, max_length=120)
    product_id: str = Field(min_length=1, max_length=160)
    sku: str | None = Field(default=None, max_length=160)
    name: str = Field(min_length=1, max_length=240)
    manufacturer: str | None = Field(default=None, max_length=160)
    family: Literal["roof", "floor"]
    thickness_mm: float = Field(gt=0, le=500)
    lambda_w_mk: float = Field(ge=0.020, le=0.080)
    package_area_m2: float | None = Field(default=None, gt=0)
    price_per_package_lei: float | None = Field(default=None, ge=0)
    stock_status: StockStatus = "unknown"
    product_url: str | None = Field(default=None, max_length=1000)
    catalog_version: str | None = Field(default=None, max_length=120)


class WindowSystemProductV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    partner_id: str = Field(min_length=1, max_length=120)
    product_id: str = Field(min_length=1, max_length=160)
    sku: str | None = Field(default=None, max_length=160)
    name: str = Field(min_length=1, max_length=240)
    manufacturer: str | None = Field(default=None, max_length=160)
    uw_w_m2k: float = Field(gt=0, le=6)
    solar_transmittance_g: float | None = Field(default=None, gt=0, le=1)
    price_per_m2_lei: float | None = Field(default=None, ge=0)
    stock_status: StockStatus = "unknown"
    product_url: str | None = Field(default=None, max_length=1000)
    catalog_version: str | None = Field(default=None, max_length=120)


class WindowUnitV1(BaseModel):
    unit_id: str = Field(min_length=1, max_length=160)
    area_m2: float = Field(gt=0)
    current_u_w_m2k: float = Field(gt=0, le=8)
    orientation: SolarOrientation | None = None


class PvModuleProductV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    partner_id: str = Field(min_length=1, max_length=120)
    product_id: str = Field(min_length=1, max_length=160)
    sku: str | None = Field(default=None, max_length=160)
    name: str = Field(min_length=1, max_length=240)
    manufacturer: str | None = Field(default=None, max_length=160)
    module_power_wp: float = Field(gt=0, le=1500)
    module_price_lei: float | None = Field(default=None, ge=0)
    performance_ratio: float | None = Field(default=None, gt=0, le=1)
    stock_status: StockStatus = "unknown"
    product_url: str | None = Field(default=None, max_length=1000)
    catalog_version: str | None = Field(default=None, max_length=120)


class SolarThermalCollectorProductV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    partner_id: str = Field(min_length=1, max_length=120)
    product_id: str = Field(min_length=1, max_length=160)
    sku: str | None = Field(default=None, max_length=160)
    name: str = Field(min_length=1, max_length=240)
    manufacturer: str | None = Field(default=None, max_length=160)
    collector_area_m2: float = Field(gt=0, le=20)
    collector_price_lei: float | None = Field(default=None, ge=0)
    system_efficiency: float | None = Field(default=None, gt=0, le=1)
    stock_status: StockStatus = "unknown"
    product_url: str | None = Field(default=None, max_length=1000)
    catalog_version: str | None = Field(default=None, max_length=120)


class HeatingSystemProductV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    partner_id: str = Field(min_length=1, max_length=120)
    product_id: str = Field(min_length=1, max_length=160)
    sku: str | None = Field(default=None, max_length=160)
    name: str = Field(min_length=1, max_length=240)
    manufacturer: str | None = Field(default=None, max_length=160)
    rated_power_kw: float = Field(gt=0, le=500)
    heating: HeatingInput
    equipment_price_lei: float = Field(ge=0)
    installation_price_lei: float = Field(default=0, ge=0)
    stock_status: StockStatus = "unknown"
    product_url: str | None = Field(default=None, max_length=1000)
    catalog_version: str | None = Field(default=None, max_length=120)

    @root_validator(skip_on_failure=True)
    def validate_explicit_product_performance(cls, values: dict) -> dict:
        heating = values.get("heating")
        if heating is None:
            return values
        if heating.system_type.value == "heat_pump":
            if heating.scop is None:
                raise ValueError("Heating product heat pump requires explicit SCOP.")
        elif heating.efficiency is None:
            raise ValueError(
                "Heating product requires explicit seasonal generator efficiency."
            )
        return values

    @property
    def installed_capex_lei(self) -> float:
        return float(self.equipment_price_lei) + float(self.installation_price_lei)


class FullProductCatalogV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    roof_insulation: list[InsulationProductV1] = Field(default_factory=list)
    floor_insulation: list[InsulationProductV1] = Field(default_factory=list)
    windows: list[WindowSystemProductV1] = Field(default_factory=list)
    window_units: list[WindowUnitV1] = Field(default_factory=list)
    pv_modules: list[PvModuleProductV1] = Field(default_factory=list)
    solar_thermal_collectors: list[SolarThermalCollectorProductV1] = Field(default_factory=list)
    heating_systems: list[HeatingSystemProductV1] = Field(default_factory=list)

    @root_validator(skip_on_failure=True)
    def validate_insulation_family(cls, values: dict) -> dict:
        if any(item.family != "roof" for item in values.get("roof_insulation") or []):
            raise ValueError("roof_insulation contains a non-roof product.")
        if any(item.family != "floor" for item in values.get("floor_insulation") or []):
            raise ValueError("floor_insulation contains a non-floor product.")
        return values


class FullProductCostInputsV1(BaseModel):
    wall_nonmaterial_installed_cost_per_m2_lei: float | None = Field(default=None, ge=0)
    roof_nonmaterial_installed_cost_per_m2_lei: float | None = Field(default=None, ge=0)
    floor_nonmaterial_installed_cost_per_m2_lei: float | None = Field(default=None, ge=0)
    window_nonmaterial_installed_cost_per_m2_lei: float | None = Field(default=None, ge=0)
    pv_activation_cost_lei: float = Field(default=0, ge=0)
    pv_nonmodule_installed_cost_per_kwp_lei: float | None = Field(default=None, ge=0)
    solar_thermal_activation_cost_lei: float = Field(default=0, ge=0)
    solar_thermal_noncollector_installed_cost_per_m2_lei: float | None = Field(default=None, ge=0)
