export type TechnicalSource =
  | "mc001"
  | "standard"
  | "estimated"
  | "internal_estimate"
  | "user_input"
  | "custom";

export type Confidence = "low" | "medium" | "high";

export interface TechnicalValue<T> {
  value: T;
  unit?: string;
  source: TechnicalSource;
  confidence: Confidence;
  assumptions?: string[];
}

export interface BuildingIdentification {
  buildingId?: string;
  buildingType:
    | "single_family_house"
    | "apartment"
    | "apartment_building"
    | "office"
    | "school"
    | "hospital"
    | "retail"
    | "industrial"
    | "other";
  usageCategory: "residential" | "commercial" | "public" | "industrial" | "mixed";
  address?: {
    country: string;
    county?: string;
    locality?: string;
    street?: string;
    number?: string;
  };
  constructionYear?: number;
  renovationYear?: number;
  numberOfFloors?: number;
  occupancyPattern?: "permanent" | "seasonal" | "intermittent" | "unknown";
}

export interface BuildingGeometry {
  usefulAreaM2?: number;
  heatedAreaM2?: number;
  cooledAreaM2?: number;
  buildingFootprintM2?: number;
  heatedVolumeM3?: number;
  averageFloorHeightM?: number;
  envelopeAreaM2?: number;
  externalWallAreaM2?: number;
  roofAreaM2?: number;
  floorAreaM2?: number;
  windowAreaM2?: number;
  doorAreaM2?: number;
  compactnessRatio?: number;
  formFactor?: number;
}

export interface ClimateData {
  climateZoneId: string;
  locality?: string;
  county?: string;
  designOutdoorTemperatureC?: number;
  averageOutdoorTemperatureHeatingSeasonC?: number;
  heatingDegreeDays?: number;
  coolingDegreeDays?: number;
  solarRadiationAnnualKwhM2?: number;
  solarRadiationByOrientation?: Partial<Record<"north" | "south" | "east" | "west" | "horizontal", number>>;
  source: "mc001" | "estimated" | "custom";
}

export interface MaterialLayer {
  materialId: string;
  name: string;
  thicknessM: number;
  lambdaWmK?: number;
  densityKgM3?: number;
  specificHeatJkgK?: number;
}

export interface EnvelopeElement {
  id: string;
  type:
    | "external_wall"
    | "roof"
    | "ceiling_to_attic"
    | "floor_on_ground"
    | "floor_over_basement"
    | "window"
    | "external_door";
  areaM2?: number;
  layers?: MaterialLayer[];
  uValueWm2K?: number;
  rValueM2KW?: number;
  thermalBridgeCorrectionWm2K?: number;
  orientation?: "north" | "south" | "east" | "west" | "horizontal" | "unknown";
  adjacentSpace: "exterior" | "ground" | "unheated_space" | "heated_space" | "attic" | "basement" | "unknown";
  quality: "very_poor" | "poor" | "average" | "good" | "very_good" | "unknown";
}

export interface ThermalCalculationResult {
  rsiM2KW: number;
  rseM2KW: number;
  layerResistances: {
    materialId: string;
    resistanceM2KW: number;
  }[];
  totalResistanceM2KW: number;
  uValueWm2K: number;
  assumptions: string[];
  confidence: Confidence;
}

export interface MaterialPreset {
  id: string;
  name: string;
  category: "masonry" | "concrete" | "wood" | "insulation" | "glass" | "air_layer" | "finish" | "other";
  lambdaWmK: number;
  densityKgM3?: number;
  specificHeatJkgK?: number;
  source: "mc001" | "standard" | "estimated" | "custom";
}

export interface WindowSystem {
  glazingType: "single" | "double_old" | "double_low_e" | "triple" | "unknown";
  frameType: "wood_old" | "wood_modern" | "pvc" | "aluminium_no_thermal_break" | "aluminium_thermal_break" | "unknown";
  uValueWm2K?: number;
  gValue?: number;
  airTightnessClass?: string;
  areaM2?: number;
  orientation?: "north" | "south" | "east" | "west" | "unknown";
}

export interface ThermalBridge {
  type: "balcony" | "foundation" | "window_reveal" | "wall_roof_junction" | "wall_floor_junction" | "corner" | "unknown";
  lengthM?: number;
  psiWmK?: number;
  severity: "low" | "medium" | "high" | "unknown";
}

export interface VentilationModel {
  ventilationType: "natural" | "mechanical_exhaust" | "mechanical_supply_exhaust" | "mechanical_with_heat_recovery" | "unknown";
  airChangeRateACH?: number;
  heatRecoveryEfficiency?: number;
  infiltrationLevel: "very_leaky" | "leaky" | "average" | "tight" | "very_tight" | "unknown";
}

export interface HeatingSystem {
  fuel: "natural_gas" | "wood" | "pellets" | "electricity" | "district_heating" | "heat_pump" | "lpg" | "coal" | "mixed" | "unknown";
  generatorType:
    | "local_stove"
    | "wood_stove"
    | "gas_boiler_non_condensing"
    | "gas_boiler_condensing"
    | "pellet_boiler"
    | "electric_radiator"
    | "electric_boiler"
    | "air_to_air_heat_pump"
    | "air_to_water_heat_pump"
    | "ground_source_heat_pump"
    | "district_heating"
    | "unknown";
  nominalEfficiency?: number;
  seasonalEfficiency?: number;
  cop?: number;
  scop?: number;
  distributionType: "local" | "radiators" | "underfloor" | "air" | "mixed" | "unknown";
  controlType: "none" | "manual" | "room_thermostat" | "thermostatic_valves" | "zoned_control" | "smart_control" | "unknown";
}

export interface CoolingSystem {
  present: boolean;
  systemType: "split_ac" | "multi_split" | "centralized" | "heat_pump" | "none" | "unknown";
  eer?: number;
  seer?: number;
  cooledAreaM2?: number;
  controlType?: "manual" | "thermostat" | "smart" | "unknown";
}

export interface DomesticHotWaterSystem {
  source: "same_as_heating" | "gas_boiler" | "electric_boiler" | "heat_pump" | "solar_thermal" | "district_heating" | "unknown";
  storageVolumeL?: number;
  distributionLossLevel: "low" | "medium" | "high" | "unknown";
  seasonalEfficiency?: number;
}

export interface LightingSystem {
  dominantType: "led" | "fluorescent" | "incandescent_halogen" | "mixed" | "unknown";
  estimatedInstalledPowerWm2?: number;
  annualLightingEnergyKwh?: number;
}

export interface RenewableSystem {
  photovoltaic?: {
    installed: boolean;
    peakPowerKw?: number;
    annualProductionKwh?: number;
    selfConsumptionPercent?: number;
  };
  solarThermal?: {
    installed: boolean;
    contributionToDhwPercent?: number;
  };
  biomass?: {
    used: boolean;
    fuelType?: "wood" | "pellets" | "chips";
  };
  heatPump?: {
    installed: boolean;
    scop?: number;
  };
}

export interface EnergyUseBreakdown {
  heatingFinalKwhYear?: number;
  coolingFinalKwhYear?: number;
  dhwFinalKwhYear?: number;
  lightingFinalKwhYear?: number;
  auxiliaryFinalKwhYear?: number;
  totalFinalEnergyKwhYear?: number;
  totalFinalEnergyKwhM2Year?: number;
  renewableEnergyKwhYear?: number;
  exportedEnergyKwhYear?: number;
  netDeliveredEnergyKwhYear?: number;
}

export interface PrimaryEnergyFactor {
  carrier: "electricity" | "natural_gas" | "wood" | "pellets" | "district_heating" | "lpg" | "coal";
  renewableFactor?: number;
  nonRenewableFactor?: number;
  totalFactor: number;
  source: "mc001" | "estimated" | "custom";
}

export interface EmissionFactor {
  carrier: PrimaryEnergyFactor["carrier"];
  kgCo2PerKwh: number;
  source: "mc001" | "estimated" | "custom";
}

export interface EnergyClassThreshold {
  buildingCategory: "residential" | "office" | "school" | "hospital" | "retail" | "industrial" | "other";
  metric: "final_energy_kwh_m2_year" | "primary_energy_kwh_m2_year";
  className: "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "G";
  minValueInclusive?: number;
  maxValueExclusive?: number;
  source: "mc001" | "internal" | "estimated";
}

export interface EmissionClassThreshold {
  buildingCategory: EnergyClassThreshold["buildingCategory"];
  className: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  minKgCo2M2Year?: number;
  maxKgCo2M2Year?: number;
  source: "mc001" | "internal" | "estimated";
}

export interface EnergyPrice {
  carrier: PrimaryEnergyFactor["carrier"];
  unit: "kwh" | "m3" | "kg" | "ton" | "stere";
  priceRonPerUnit: number;
  validFrom?: string;
  validTo?: string;
  region?: string;
  source: "user_input" | "market_estimate" | "default";
}

export interface FuelConversionFactor {
  carrier: "natural_gas" | "wood" | "pellets" | "lpg" | "coal";
  fromUnit: "m3" | "kg" | "ton" | "stere";
  toKwh: number;
  confidence: Confidence;
  source: "standard" | "estimated" | "custom";
}

export interface TechnicalRecommendationRule {
  id: string;
  trigger: {
    element?: "wall" | "roof" | "floor" | "window" | "heating" | "dhw" | "lighting" | "renewables";
    condition: string;
  };
  measure:
    | "add_wall_insulation"
    | "add_roof_insulation"
    | "add_floor_insulation"
    | "replace_windows"
    | "replace_heating_system"
    | "add_thermostat"
    | "add_trv"
    | "install_pv"
    | "install_solar_thermal"
    | "switch_to_led"
    | "professional_audit";
  expectedImpact: "low" | "medium" | "high" | "very_high";
  costLevel: "low" | "medium" | "high" | "very_high";
  affects: "heating" | "cooling" | "dhw" | "lighting" | "emissions" | "comfort";
  defaultSavingsPercentMin?: number;
  defaultSavingsPercentMax?: number;
}

export interface ImportedEnergyCertificate {
  certificateId?: string;
  issueDate?: string;
  auditorName?: string;
  building: BuildingIdentification;
  geometry: BuildingGeometry;
  officialEnergyClass?: EnergyClassThreshold["className"];
  officialEmissionClass?: EmissionClassThreshold["className"];
  finalEnergyKwhM2Year?: number;
  primaryEnergyKwhM2Year?: number;
  co2KgM2Year?: number;
  heatingEnergyKwhM2Year?: number;
  coolingEnergyKwhM2Year?: number;
  dhwEnergyKwhM2Year?: number;
  lightingEnergyKwhM2Year?: number;
  envelopeElements?: EnvelopeElement[];
  heatingSystem?: HeatingSystem;
  coolingSystem?: CoolingSystem;
  dhwSystem?: DomesticHotWaterSystem;
  ventilation?: VentilationModel;
  lighting?: LightingSystem;
  renewables?: RenewableSystem;
  recommendations?: unknown[];
  estimatedSavingsPercentMin?: number;
  estimatedSavingsPercentMax?: number;
  estimatedPaybackYearsMin?: number;
  estimatedPaybackYearsMax?: number;
  rawExtractedData?: Record<string, unknown>;
}

export interface MC001TechnicalModel {
  building: BuildingIdentification;
  geometry: BuildingGeometry;
  climate?: ClimateData;
  envelopeElements: EnvelopeElement[];
  thermalBridges?: ThermalBridge[];
  ventilation?: VentilationModel;
  heatingSystems?: HeatingSystem[];
  coolingSystem?: CoolingSystem;
  domesticHotWater?: DomesticHotWaterSystem[];
  lighting?: LightingSystem;
  renewables?: RenewableSystem;
  energyUse?: EnergyUseBreakdown;
  primaryEnergy?: {
    totalPrimaryEnergyKwhYear?: number;
    totalPrimaryEnergyKwhM2Year?: number;
    factors: PrimaryEnergyFactor[];
  };
  emissions?: {
    totalCo2KgYear?: number;
    totalCo2KgM2Year?: number;
    factors: EmissionFactor[];
  };
}
