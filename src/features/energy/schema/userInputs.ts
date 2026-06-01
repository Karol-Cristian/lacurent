export type Unknownable<T> = T | "unknown";

export interface UserEnergyInputs {
  general: GeneralInputs;
  geometry: GeometryInputs;
  envelope: EnvelopeInputs;
  heating: HeatingInputs;
  cooling: CoolingInputs;
  ventilation: VentilationInputs;
  dhw: DomesticHotWaterInputs;
  lighting: LightingInputs;
  renewables: RenewableInputs;
  realConsumption: RealConsumptionInputs;
}

export interface GeneralInputs {
  buildingType: "house" | "apartment";
  usageType: "permanent" | "seasonal" | "mixed" | "unknown";
  location: {
    country: string;
    county?: string;
    cityOrVillage?: string;
    altitudeM?: Unknownable<number>;
  };
  constructionYear: Unknownable<number>;
  lastMajorRenovation:
    | "never"
    | "less_than_5_years"
    | "5_10_years"
    | "10_20_years"
    | "more_than_20_years"
    | "unknown";
  occupants: Unknownable<number>;
}

export interface GeometryInputs {
  usefulAreaM2: Unknownable<number>;
  heatedAreaM2?: Unknownable<number>;
  buildingFootprintM2?: Unknownable<number>;
  numberOfFloors: Unknownable<number>;
  floorHeightM?: Unknownable<number>;
  volumeM3?: Unknownable<number>;
  attachedBuilding:
    | "detached"
    | "semi_detached"
    | "row_house"
    | "apartment_middle"
    | "apartment_top"
    | "apartment_ground"
    | "unknown";
  mainOrientation: "north" | "south" | "east" | "west" | "mixed" | "unknown";
}

export interface EnvelopeInputs {
  walls: {
    material: "brick" | "bca" | "concrete" | "wood" | "stone" | "mixed" | "unknown";
    approximateThicknessCm?: Unknownable<number>;
    insulated: "yes" | "no" | "partial" | "unknown";
    insulationThicknessCm?: Unknownable<number>;
    insulationMaterial?: "eps" | "mineral_wool" | "xps" | "wood_fiber" | "unknown";
  };
  roof: {
    type: "unheated_attic" | "heated_attic" | "flat_roof" | "pitched_roof_no_attic" | "unknown";
    insulated: "yes" | "no" | "partial" | "unknown";
    insulationThicknessCm?: Unknownable<number>;
    insulationMaterial?: "mineral_wool" | "eps" | "xps" | "cellulose" | "unknown";
  };
  floor: {
    type: "on_ground" | "over_basement" | "over_unheated_space" | "over_heated_space" | "unknown";
    insulated: "yes" | "no" | "partial" | "unknown";
    insulationThicknessCm?: Unknownable<number>;
  };
  windows: {
    type: "single_glazing" | "old_double_glazing" | "modern_double_glazing" | "triple_glazing" | "unknown";
    frameMaterial: "wood" | "pvc" | "aluminium" | "mixed" | "unknown";
    approximateAgeYears?: Unknownable<number>;
    hasLowEGlass?: "yes" | "no" | "unknown";
  };
  doors: {
    exteriorDoorType: "old_wood" | "insulated_metal" | "pvc" | "modern_insulated" | "unknown";
  };
  thermalBridges?: {
    visibleIssues: "none" | "mold" | "condensation" | "cold_walls" | "unknown";
  };
}

export interface HeatingInputs {
  mainSource: "gas" | "wood" | "pellets" | "electric" | "heat_pump" | "district_heating" | "lpg" | "coal" | "mixed" | "unknown";
  systemType:
    | "stove"
    | "individual_boiler"
    | "condensing_boiler"
    | "non_condensing_boiler"
    | "electric_radiators"
    | "underfloor_heating"
    | "heat_pump_air_water"
    | "heat_pump_air_air"
    | "district_heating"
    | "unknown";
  equipmentAgeYears?: Unknownable<number>;
  distribution: "radiators" | "underfloor" | "air" | "local_stoves" | "mixed" | "unknown";
  control: {
    thermostat: "yes" | "no" | "unknown";
    smartThermostat?: "yes" | "no" | "unknown";
    thermostaticValves: "yes" | "no" | "unknown";
    zoning: "yes" | "no" | "unknown";
  };
}

export interface CoolingInputs {
  hasCooling: "yes" | "no" | "unknown";
  systemType?: "split_ac" | "multi_split" | "heat_pump_air_air" | "centralized" | "none" | "unknown";
  equipmentAgeYears?: Unknownable<number>;
}

export interface VentilationInputs {
  type: "natural" | "mechanical_exhaust" | "mechanical_with_heat_recovery" | "unknown";
  hasHeatRecovery?: "yes" | "no" | "unknown";
}

export interface DomesticHotWaterInputs {
  source: "same_as_heating" | "electric_boiler" | "gas_boiler" | "solar_thermal" | "heat_pump" | "unknown";
  storageTank: "yes" | "no" | "unknown";
  recirculation?: "yes" | "no" | "unknown";
}

export interface LightingInputs {
  dominantType: "led" | "mixed" | "incandescent_halogen" | "unknown";
}

export interface RenewableInputs {
  photovoltaic: {
    installed: "yes" | "no" | "unknown";
    capacityKw?: Unknownable<number>;
    annualProductionKwh?: Unknownable<number>;
  };
  solarThermal: {
    installed: "yes" | "no" | "unknown";
  };
  batteryStorage?: {
    installed: "yes" | "no" | "unknown";
    capacityKwh?: Unknownable<number>;
  };
}

export interface RealConsumptionInputs {
  mode: "simple" | "detailed" | "none";
  simple?: {
    averageMonthlyElectricityCostRon?: Unknownable<number>;
    averageMonthlyGasCostRon?: Unknownable<number>;
    annualWoodCostRon?: Unknownable<number>;
    annualPelletsCostRon?: Unknownable<number>;
    annualOtherFuelCostRon?: Unknownable<number>;
    annualElectricityKwh?: Unknownable<number>;
    annualGasKwh?: Unknownable<number>;
    annualGasM3?: Unknownable<number>;
    annualWoodM3?: Unknownable<number>;
    annualPelletsKg?: Unknownable<number>;
  };
  detailed?: MonthlyEnergyConsumption[];
}

export interface MonthlyEnergyConsumption {
  month: string;
  electricityCostRon?: number;
  electricityKwh?: number;
  gasCostRon?: number;
  gasKwh?: number;
  gasM3?: number;
  woodCostRon?: number;
  woodM3?: number;
  pelletsCostRon?: number;
  pelletsKg?: number;
  otherFuelCostRon?: number;
}
