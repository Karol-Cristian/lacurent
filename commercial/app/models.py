from __future__ import annotations

import json
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, root_validator, validator


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


class HeatingGeneratorType(str, Enum):
    gas_boiler = "gas_boiler"
    condensing_gas_boiler = "condensing_gas_boiler"
    electric_direct = "electric_direct"
    electric_boiler = "electric_boiler"
    heat_pump_air_water = "heat_pump_air_water"
    heat_pump_ground_water = "heat_pump_ground_water"
    heat_pump_air_air = "heat_pump_air_air"
    district_heat = "district_heat"
    wood_stove = "wood_stove"
    wood_boiler = "wood_boiler"
    pellet_boiler = "pellet_boiler"
    custom = "custom"


class HeatingEmitterType(str, Enum):
    local = "local"
    radiators_high_temp = "radiators_high_temp"
    radiators_low_temp = "radiators_low_temp"
    underfloor = "underfloor"
    fan_coils = "fan_coils"
    air = "air"


class HeatingDistributionType(str, Enum):
    local = "local"
    hydronic_insulated = "hydronic_insulated"
    hydronic_uninsulated = "hydronic_uninsulated"
    underfloor = "underfloor"
    air = "air"


class HeatingStorageType(str, Enum):
    none = "none"
    buffer_small = "buffer_small"
    buffer_large = "buffer_large"


class HeatingControlType(str, Enum):
    manual = "manual"
    room_thermostat = "room_thermostat"
    thermostatic_valves = "thermostatic_valves"
    zoned = "zoned"
    weather_compensated = "weather_compensated"


class HeatingSystemDetails(BaseModel):
    generator_type: HeatingGeneratorType | None = None
    emitter_type: HeatingEmitterType = HeatingEmitterType.radiators_high_temp
    distribution_type: HeatingDistributionType = HeatingDistributionType.hydronic_insulated
    storage_type: HeatingStorageType = HeatingStorageType.none
    control_type: HeatingControlType = HeatingControlType.room_thermostat
    design_flow_temperature_c: float | None = Field(default=None, ge=20, le=90)
    design_return_temperature_c: float | None = Field(default=None, ge=15, le=80)
    auxiliary_electricity_kwh_year: float | None = Field(default=None, ge=0)

    @root_validator(skip_on_failure=True)
    def validate_system_chain(cls, values: dict) -> dict:
        flow = values.get("design_flow_temperature_c")
        ret = values.get("design_return_temperature_c")
        generator = values.get("generator_type")
        emitter = values.get("emitter_type")
        distribution = values.get("distribution_type")

        if flow is not None and ret is not None and ret >= flow:
            raise ValueError("Heating return temperature must be lower than flow temperature.")

        hydronic_pipe_emitters = {
            HeatingEmitterType.radiators_high_temp,
            HeatingEmitterType.radiators_low_temp,
            HeatingEmitterType.fan_coils,
        }
        hydronic_pipe_distributions = {
            HeatingDistributionType.hydronic_insulated,
            HeatingDistributionType.hydronic_uninsulated,
        }

        if emitter == HeatingEmitterType.local and distribution != HeatingDistributionType.local:
            raise ValueError("A local heat emitter requires local/no-pipe distribution.")
        if emitter == HeatingEmitterType.air and distribution != HeatingDistributionType.air:
            raise ValueError("Air heating requires air distribution.")
        if emitter == HeatingEmitterType.underfloor and distribution != HeatingDistributionType.underfloor:
            raise ValueError("Underfloor heating requires underfloor distribution.")
        if emitter in hydronic_pipe_emitters and distribution not in hydronic_pipe_distributions:
            raise ValueError("Radiators and fan coils require hydronic pipe distribution.")

        if generator == HeatingGeneratorType.heat_pump_air_air:
            if emitter != HeatingEmitterType.air or distribution != HeatingDistributionType.air:
                raise ValueError("An air-to-air heat pump requires air emission and air distribution.")
        if generator in {HeatingGeneratorType.wood_stove, HeatingGeneratorType.electric_direct}:
            if emitter != HeatingEmitterType.local or distribution != HeatingDistributionType.local:
                raise ValueError("A local stove/direct-electric generator requires local emission and distribution.")
        return values


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
    # Legacy/equivalent total air-change rate. Existing callers keep using this.
    air_changes_per_hour: float = Field(ge=0, le=5)
    heat_recovery_efficiency: float = Field(default=0, ge=0, lt=1)
    # Optional split used by Home Lab when the homeowner supplies airtightness.
    # Infiltration bypasses heat recovery; controlled ventilation can be recovered.
    infiltration_air_changes_per_hour: float | None = Field(default=None, ge=0, le=5)
    ventilation_air_changes_per_hour: float | None = Field(default=None, ge=0, le=5)


class HeatingInput(BaseModel):
    system_type: HeatingSystemType
    carrier: Carrier = Carrier.natural_gas
    efficiency: float | None = Field(default=None, gt=0, le=1)
    scop: float | None = Field(default=None, gt=0)
    details: HeatingSystemDetails | None = None
    cost_profile: Literal[
        "electricity",
        "natural_gas",
        "firewood",
        "pellets",
        "district_heat",
        "other",
    ] | None = None

    @root_validator(skip_on_failure=True)
    def validate_generator_family(cls, values: dict) -> dict:
        system_type = values.get("system_type")
        details = values.get("details")
        if details is None or details.generator_type is None:
            return values

        generator = details.generator_type
        expected = {
            HeatingSystemType.gas_boiler: {HeatingGeneratorType.gas_boiler},
            HeatingSystemType.condensing_gas_boiler: {HeatingGeneratorType.condensing_gas_boiler},
            HeatingSystemType.electric_resistance: {HeatingGeneratorType.electric_direct},
            HeatingSystemType.heat_pump: {
                HeatingGeneratorType.heat_pump_air_water,
                HeatingGeneratorType.heat_pump_ground_water,
                HeatingGeneratorType.heat_pump_air_air,
            },
            HeatingSystemType.district_heat: {HeatingGeneratorType.district_heat},
        }
        allowed = expected.get(system_type)
        if allowed is not None and generator not in allowed:
            raise ValueError("Heating generator type is inconsistent with the selected heating system.")
        return values


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


SolarOrientation = Literal[
    "south",
    "south_west",
    "west",
    "north_west",
    "north",
    "north_east",
    "east",
    "south_east",
]


class SolarGlazingGroup(BaseModel):
    orientation: SolarOrientation
    area_m2: float = Field(gt=0)


class SolarInput(BaseModel):
    mode: Literal["normative_hsol", "explicit"] = "explicit"
    orientation: SolarOrientation = "south"
    glazing_type_id: Literal[
        "single_clear_glazing",
        "double_clear_glazing",
        "double_window",
        "triple_clear_glazing",
        "double_low_e_face_3",
        "triple_low_e_faces_2_and_5",
    ] = "double_low_e_face_3"
    glazing_groups: list[SolarGlazingGroup] = Field(default_factory=list)
    frame_fraction: float = Field(default=0.20, ge=0, lt=1)
    obstacle_shading_factor: float = Field(default=1.0, ge=0, le=1)
    shading_device_id: Literal[
        "white_venetian_blinds_abs_0_1_trans_0_05",
        "white_venetian_blinds_abs_0_1_trans_0_1",
        "white_venetian_blinds_abs_0_1_trans_0_3",
        "white_curtains_abs_0_1_trans_0_5",
        "white_curtains_abs_0_1_trans_0_7",
        "white_curtains_abs_0_1_trans_0_9",
        "colored_textiles_abs_0_3_trans_0_1",
        "colored_textiles_abs_0_3_trans_0_3",
        "colored_textiles_abs_0_3_trans_0_5",
        "aluminium_coated_textiles_abs_0_2_trans_0_05",
    ] | None = None
    shading_mounting_side: Literal["interior", "exterior"] | None = None
    sky_view_factor: float = Field(default=0.5, ge=0, le=1)
    exterior_surface_resistance_m2k_w: float = Field(default=0.04, gt=0)
    longwave_radiation_coefficient_w_m2k: float = Field(default=5.0, ge=0)
    sky_temperature_difference_k: float = Field(default=11.0, ge=0)

    @root_validator(skip_on_failure=True)
    def validate_shading_device_pair(cls, values: dict) -> dict:
        device = values.get("shading_device_id")
        side = values.get("shading_mounting_side")
        if bool(device) != bool(side):
            raise ValueError("Solar shading device and mounting side must be selected together.")
        return values


class PhotovoltaicInput(BaseModel):
    enabled: bool = False
    installed_power_kwp: float = Field(default=0, ge=0, le=200)
    orientation: SolarOrientation = "south"
    tilt_degrees: float = Field(default=30, ge=0, le=90)
    performance_ratio: float | None = Field(default=None, gt=0, le=1)

    @root_validator(skip_on_failure=True)
    def validate_enabled_system(cls, values: dict) -> dict:
        if values.get("enabled") and float(values.get("installed_power_kwp") or 0) <= 0:
            raise ValueError("Photovoltaic production requires installed power greater than zero.")
        return values


class SolarThermalInput(BaseModel):
    enabled: bool = False
    collector_area_m2: float = Field(default=0, ge=0, le=200)
    orientation: SolarOrientation = "south"
    tilt_degrees: float = Field(default=45, ge=0, le=90)
    system_efficiency: float | None = Field(default=None, gt=0, le=1)

    @root_validator(skip_on_failure=True)
    def validate_enabled_system(cls, values: dict) -> dict:
        if values.get("enabled") and float(values.get("collector_area_m2") or 0) <= 0:
            raise ValueError("Solar thermal production requires collector area greater than zero.")
        return values


class RenewablesInput(BaseModel):
    pv: PhotovoltaicInput = Field(default_factory=PhotovoltaicInput)
    solar_thermal: SolarThermalInput = Field(default_factory=SolarThermalInput)


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
    solar: SolarInput = Field(default_factory=SolarInput)
    renewables: RenewablesInput = Field(default_factory=RenewablesInput)
    envelope: list[EnvelopeComponent] = Field(min_items=1)
    thermal_bridges: list[ThermalBridge] = Field(default_factory=list)
    ventilation: VentilationInput
    heating: HeatingInput
    cooling: CoolingInput = Field(default_factory=CoolingInput)
    dhw: DhwInput = Field(default_factory=DhwInput)

    @validator("locality")
    def normalize_locality(cls, value: str) -> str:
        return " ".join(value.strip().split())

    @root_validator(skip_on_failure=True)
    def validate_supported_scope(cls, values: dict) -> dict:
        cooling = values.get("cooling")
        heating = values.get("heating")
        dhw = values.get("dhw")
        if cooling and cooling.enabled and cooling.seer is None:
            raise ValueError("Active cooling requires SEER.")
        if (
            heating
            and heating.system_type == HeatingSystemType.heat_pump
            and heating.scop is None
            and heating.details is None
        ):
            raise ValueError("A heat pump heating system requires SCOP or structured heating-system details.")
        if heating and heating.system_type == HeatingSystemType.custom and heating.efficiency is None:
            raise ValueError("A custom heating system requires seasonal efficiency.")
        if dhw and dhw.enabled and dhw.occupants <= 0:
            raise ValueError("Domestic hot water requires at least one occupant.")
        return values


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
    solar_gains_source: str | None = None
    solar_hsol_kwh_m2: float | None = None
    solar_hsol_by_orientation_kwh_m2: dict[str, float] = Field(default_factory=dict)
    solar_station_name: str | None = None
    solar_station_resolution: str | None = None
    solar_station_distance_km: float | None = None
    useful_heating_kwh: float
    useful_cooling_kwh: float


class EnergyServiceResult(BaseModel):
    useful_kwh: float
    final_kwh: float
    carrier: Carrier | None = None


class HeatingSystemPerformanceResult(BaseModel):
    generator_type: HeatingGeneratorType
    emitter_type: HeatingEmitterType
    distribution_type: HeatingDistributionType
    storage_type: HeatingStorageType
    control_type: HeatingControlType
    design_flow_temperature_c: float | None
    design_return_temperature_c: float | None
    emission_efficiency: float
    distribution_efficiency: float
    storage_efficiency: float
    control_efficiency: float
    generator_performance: float
    generator_performance_kind: Literal["efficiency", "scop"]
    effective_system_performance: float
    auxiliary_electricity_kwh: float
    main_carrier_final_kwh: float
    total_heating_final_kwh: float
    performance_source: str
    confidence: Literal["low", "medium", "high"]
    assumptions: list[str] = Field(default_factory=list)


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


class EnvelopeGeometryResult(BaseModel):
    gross_wall_area_m2: float
    window_area_m2: float
    exterior_door_area_m2: float
    net_wall_area_m2: float
    roof_area_m2: float
    floor_area_m2: float


class EnvelopeUValuesResult(BaseModel):
    wall_u_value_w_m2k: float | None = None
    roof_u_value_w_m2k: float | None = None
    floor_u_value_w_m2k: float | None = None
    window_u_value_w_m2k: float | None = None
    exterior_door_u_value_w_m2k: float | None = None


class MonthlyRenewableBalance(BaseModel):
    month: str
    pv_plane_hsol_kwh_m2: float = 0
    pv_generation_kwh: float = 0
    pv_self_consumed_kwh: float = 0
    pv_exported_kwh: float = 0
    solar_thermal_plane_hsol_kwh_m2: float = 0
    solar_thermal_available_kwh: float = 0
    solar_thermal_used_dhw_kwh: float = 0


class PhotovoltaicResult(BaseModel):
    enabled: bool = False
    installed_power_kwp: float = 0
    orientation: SolarOrientation = "south"
    tilt_degrees: float = 30
    performance_ratio: float = 0
    annual_plane_hsol_kwh_m2: float = 0
    annual_generation_kwh: float = 0
    self_consumed_kwh: float = 0
    exported_kwh: float = 0
    self_consumption_percent: float = 0


class SolarThermalResult(BaseModel):
    enabled: bool = False
    collector_area_m2: float = 0
    orientation: SolarOrientation = "south"
    tilt_degrees: float = 45
    system_efficiency: float = 0
    annual_plane_hsol_kwh_m2: float = 0
    annual_available_kwh: float = 0
    used_for_dhw_kwh: float = 0
    dhw_solar_fraction_percent: float = 0


class RenewableEnergyResult(BaseModel):
    pv: PhotovoltaicResult = Field(default_factory=PhotovoltaicResult)
    solar_thermal: SolarThermalResult = Field(default_factory=SolarThermalResult)
    monthly: list[MonthlyRenewableBalance] = Field(default_factory=list)
    plane_model: str


class CalculationResult(BaseModel):
    input: BuildingInput
    climate: dict
    h_tr_w_k: float
    h_ve_w_k: float
    heat_loss_w_k: float
    envelope_geometry: EnvelopeGeometryResult
    envelope_u_values: EnvelopeUValuesResult
    envelope_contributions: list[Contribution]
    thermal_bridge_contributions: list[Contribution]
    monthly: list[MonthlyBalance]
    annual_heating_demand_kwh: float
    annual_cooling_demand_kwh: float
    heating: EnergyServiceResult
    heating_system: HeatingSystemPerformanceResult
    cooling: EnergyServiceResult
    dhw: EnergyServiceResult
    final_energy_by_service: dict[str, float]
    gross_final_energy_by_carrier: dict[str, float]
    final_energy_by_carrier: dict[str, float]
    total_service_final_energy_kwh: float
    total_final_energy_kwh: float
    renewables: RenewableEnergyResult
    primary_energy: IndicatorResult
    co2: Co2Result
    energy_class: Literal["A+", "A", "B", "C", "D", "E", "F", "G"]
    reference: ComparisonResult | None = None
    methodology_version: str
    assumptions: list[str]


def model_to_dict(model: BaseModel) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump(mode="json")
    return json.loads(model.json())


def model_to_json(model: BaseModel) -> str:
    if hasattr(model, "model_dump_json"):
        return model.model_dump_json()
    return model.json()


def building_from_json(payload: str) -> BuildingInput:
    if hasattr(BuildingInput, "model_validate_json"):
        return BuildingInput.model_validate_json(payload)
    return BuildingInput.parse_raw(payload)
