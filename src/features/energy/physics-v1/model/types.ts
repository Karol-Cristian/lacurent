export type PhysicsV1Confidence = "low" | "medium" | "high";

export type PhysicsV1SourceType =
  | "user_input"
  | "db"
  | "derived"
  | "registry"
  | "fallback"
  | "unknown";

export type BuildingTypeV1 =
  | "single_family_house"
  | "apartment"
  | "apartment_building"
  | "other"
  | "unknown";

export type BoundaryTypeV1 =
  | "exterior"
  | "ground"
  | "unheated_space"
  | "conditioned_space"
  | "unknown";

export type EnvelopeElementTypeV1 =
  | "external_wall"
  | "roof"
  | "ceiling_to_attic"
  | "floor_on_ground"
  | "floor_over_unheated_space"
  | "window"
  | "external_door"
  | "internal_partition_to_unheated"
  | "unknown";

export type OrientationV1 = "north" | "south" | "east" | "west" | "horizontal" | "unknown";

export interface CalculationTraceV1<T = number> {
  formulaId: string;
  formulaText: string;
  inputs: Record<string, unknown>;
  result: T;
  unit: string;
  source: string;
  assumptions: string[];
  warnings: string[];
  confidence: PhysicsV1Confidence;
}

export interface ThermalBridgeInputV1 {
  id?: string;
  type?: string;
  lengthM?: number;
  psiWPerMK?: number;
  sourceType: PhysicsV1SourceType;
}

export interface MaterialLayerInputV1 {
  materialKey?: string;
  thicknessM: number;
  lambdaWPerMK?: number;
}

export interface EnvelopeElementInputV1 {
  id: string;
  type: EnvelopeElementTypeV1;
  areaM2: number;
  boundary: BoundaryTypeV1;
  orientation?: OrientationV1;
  tiltDeg?: number;
  layers?: MaterialLayerInputV1[];
  uValueWPerM2K?: number;
  thermalBridges?: ThermalBridgeInputV1[];
  sourceType: PhysicsV1SourceType;
}

export interface VentilationInputV1 {
  ach?: number;
  airflowM3PerH?: number;
  heatRecoveryEfficiency?: number;
  sourceType: PhysicsV1SourceType;
}

export type HeatingSystemTypeV1 =
  | "wood_stove"
  | "gas_boiler"
  | "electric_boiler"
  | "electric_direct"
  | "heat_pump"
  | "district_heating"
  | "unknown";

export type EnergyCarrierV1 =
  | "electricity"
  | "natural_gas"
  | "wood"
  | "pellets"
  | "district_heating"
  | "lpg"
  | "coal"
  | "unknown";

export interface HeatingSystemInputV1 {
  systemType: HeatingSystemTypeV1;
  carrier: EnergyCarrierV1;
  seasonalEfficiency?: number;
  scop?: number;
  sourceType: PhysicsV1SourceType;
}

export interface SystemsInputV1 {
  heating?: HeatingSystemInputV1;
}

export interface BuildingInputV1 {
  id?: string;
  buildingType: BuildingTypeV1;
  usefulAreaM2?: number;
  heatedAreaM2?: number;
  heatedVolumeM3?: number;
  floorCount?: number;
  averageFloorHeightM?: number;
  location?: {
    country?: string;
    county?: string;
    locality?: string;
  };
  climateZone?: string;
  constructionYear?: number;
  envelopeInput?: EnvelopeElementInputV1[];
  systemsInput?: SystemsInputV1;
  ventilationInput?: VentilationInputV1;
}

export interface NormalizedGeometryV1 {
  usefulAreaM2: number;
  heatedAreaM2: number;
  heatedVolumeM3: number;
  averageFloorHeightM: number;
  assumptions: string[];
  warnings: string[];
  trace: CalculationTraceV1<{
    usefulAreaM2: number;
    heatedAreaM2: number;
    heatedVolumeM3: number;
    averageFloorHeightM: number;
  }>;
}
