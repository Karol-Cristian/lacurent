from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class EnvelopeType(str, Enum):
    exterior_wall = "exterior_wall"
    roof = "roof"
    floor = "floor"
    window = "window"
    exterior_door = "exterior_door"


class HeatingSystemType(str, Enum):
    gas_boiler = "gas_boiler"
    condensing_gas_boiler = "condensing_gas_boiler"
    electric_resistance = "electric_resistance"
    heat_pump = "heat_pump"
    district_heat = "district_heat"
    custom = "custom"


class Carrier(str, Enum):
    electricity = "electricity"
    natural_gas = "natural_gas"
    district_heat = "district_heat"
    biomass = "biomass"
    other = "other"


class BuildingType(str, Enum):
    residential_individual = "residential_individual"
    residential_collective = "residential_collective"


class EnvelopeComponent(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    type: EnvelopeType
    area_m2: float = Field(gt=0)
    u_value_w_m2k: float = Field(gt=0)


class ThermalBridge(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    length_m: float = Field(gt=0)
    psi_w_mk: float = Field(ge=0)


class VentilationInput(BaseModel):
    air_changes_per_hour: float = Field(ge=0, le=5)
    heat_recovery_efficiency: float = Field(default=0, ge=0, lt=1)


class HeatingInput(BaseModel):
    system_type: HeatingSystemType
    carrier: Carrier = Carrier.natural_gas
    efficiency: float | None = Field(default=None, gt=0, le=1)
    scop: float | None = Field(default=None, gt=0)


class CoolingInput(BaseModel):
    enabled: bool = False
    seer: float | None = Field(default=None, gt=0)
    setpoint_c: float = Field(default=26, ge=20, le=30)


class DhwInput(BaseModel):
    enabled: bool = True
    occupants: int = Field(default=3, ge=0, le=30)
    litres_per_person_day_at_60c: float | None = Field(default=None, gt=0)
    efficiency: float = Field(default=0.85, gt=0, le=1)
    carrier: Carrier = Carrier.natural_gas


class BuildingInput(BaseModel):
    project_name: str = Field(min_length=1, max_length=120)
    locality: str = Field(min_length=1, max_length=80)
    heated_floor_area_m2: float = Field(gt=0)
    heated_volume_m3: float = Field(gt=0)
    indoor_design_temperature_c: float = Field(default=20, ge=16, le=24)
    building_type: BuildingType = BuildingType.residential_individual
    construction_year: int | None = Field(default=None, ge=1800, le=2100)
    internal_gains_w_m2: float | None = Field(default=None, ge=0)
    solar_gains_kwh_m2_month: float = Field(default=0, ge=0)
    envelope: list[EnvelopeComponent] = Field(min_length=1)
    thermal_bridges: list[ThermalBridge] = Field(default_factory=list)
    ventilation: VentilationInput
    heating: HeatingInput
    cooling: CoolingInput = Field(default_factory=CoolingInput)
    dhw: DhwInput = Field(default_factory=DhwInput)

    @field_validator("locality")
    @classmethod
    def normalize_locality(cls, value: str) -> str:
        return " ".join(value.strip().split())

    @model_validator(mode="after")
    def validate_supported_scope(self) -> "BuildingInput":
        if self.cooling.enabled and self.cooling.seer is None:
            raise ValueError("Active cooling requires SEER.")
        if self.heating.system_type == HeatingSystemType.heat_pump and self.heating.scop is None:
            raise ValueError("A heat pump heating system requires SCOP.")
        if self.heating.system_type == HeatingSystemType.custom and self.heating.efficiency is None:
            raise ValueError("A custom heating system requires seasonal efficiency.")
        if self.dhw.enabled and self.dhw.occupants <= 0:
            raise ValueError("Domestic hot water requires at least one occupant.")
        return self


class Contribution(BaseModel):
    name: str
    type: str
    value: float
    unit: str
    percent: float


class MonthlyBalance(BaseModel):
    month: str
    days: int
    outdoor_temperature_c: float
    heat_loss_kwh: float
    internal_gains_kwh: float
    solar_gains_kwh: float
    useful_heating_kwh: float
    useful_cooling_kwh: float


class EnergyServiceResult(BaseModel):
    useful_kwh: float
    final_kwh: float
    carrier: Carrier | None = None


class IndicatorResult(BaseModel):
    total_kwh: float
    specific_kwh_m2: float


class Co2Result(BaseModel):
    total_kg: float
    specific_kg_m2: float


class ComparisonResult(BaseModel):
    actual_specific_primary_kwh_m2: float
    reference_specific_primary_kwh_m2: float
    difference_kwh_m2: float
    difference_percent: float


class CalculationResult(BaseModel):
    input: BuildingInput
    climate: dict
    h_tr_w_k: float
    h_ve_w_k: float
    heat_loss_w_k: float
    envelope_contributions: list[Contribution]
    thermal_bridge_contributions: list[Contribution]
    monthly: list[MonthlyBalance]
    annual_heating_demand_kwh: float
    annual_cooling_demand_kwh: float
    heating: EnergyServiceResult
    cooling: EnergyServiceResult
    dhw: EnergyServiceResult
    final_energy_by_service: dict[str, float]
    final_energy_by_carrier: dict[str, float]
    total_final_energy_kwh: float
    primary_energy: IndicatorResult
    co2: Co2Result
    energy_class: Literal["A+", "A", "B", "C", "D", "E", "F", "G"]
    reference: ComparisonResult | None = None
    methodology_version: str
    assumptions: list[str]
