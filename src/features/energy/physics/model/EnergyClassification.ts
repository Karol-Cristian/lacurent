import type { CalculationTrace } from "./CalculationTrace";
import type { PhysicsConfidence } from "./Material";
import type {
  BuildingEnergyClassType,
  EnergyClassThresholdSet,
  EstimatedEnergyClass
} from "../registries/energyClassThresholds.registry";
import type {
  EmissionClassThresholdSet,
  EstimatedEmissionClass
} from "../registries/emissionClassThresholds.registry";
import type {
  EnergyServiceForClassification,
  ServiceEnergyClassThresholdSet
} from "../registries/serviceEnergyClassThresholds.registry";

export type ClassificationStatus =
  | "classified"
  | "cannot_classify"
  | "cannot_classify_missing_thresholds"
  | "cannot_classify_missing_service_thresholds"
  | "needs_building_type"
  | "not_applicable"
  | "not_calculated"
  | "error";

export interface GlobalEnergyClassResult {
  status: ClassificationStatus;
  primaryEnergyKwhM2Year?: number | null;
  estimatedClass: EstimatedEnergyClass | "unknown";
  thresholdSetUsed?: EnergyClassThresholdSet;
  unit: "kWh/m2.year";
  warnings: string[];
  assumptions: string[];
  confidence: PhysicsConfidence;
  trace: CalculationTrace<EstimatedEnergyClass | "unknown">;
}

export interface EmissionClassResult {
  status: ClassificationStatus;
  co2KgM2Year?: number | null;
  estimatedClass: EstimatedEmissionClass | "unknown";
  thresholdSetUsed?: EmissionClassThresholdSet;
  unit: "kgCO2/m2.year";
  warnings: string[];
  assumptions: string[];
  confidence: PhysicsConfidence;
  trace: CalculationTrace<EstimatedEmissionClass | "unknown">;
}

export interface ServiceEnergyClassInput {
  usefulEnergyKwhM2Year?: number | null;
  finalEnergyKwhM2Year?: number | null;
  primaryEnergyKwhM2Year?: number | null;
  isApplicable?: boolean;
  isCalculated?: boolean;
}

export interface ServiceEnergyClassResult {
  service: EnergyServiceForClassification;
  status: ClassificationStatus;
  usefulEnergyKwhM2Year?: number | null;
  finalEnergyKwhM2Year?: number | null;
  primaryEnergyKwhM2Year?: number | null;
  estimatedClass: EstimatedEnergyClass | "unknown";
  thresholdSetUsed?: ServiceEnergyClassThresholdSet;
  unit: "kWh/m2.year";
  assumptions: string[];
  warnings: string[];
  confidence: PhysicsConfidence;
  trace: CalculationTrace<EstimatedEnergyClass | "unknown">;
}

export interface ReferenceBuildingClassificationResult {
  globalPrimaryEnergyKwhM2Year?: number | null;
  estimatedClass: EstimatedEnergyClass | "unknown";
  status: ClassificationStatus;
  warnings: string[];
}

export interface EnergyClassificationComparison {
  realVsReferencePrimaryEnergyRatio: number | null;
  realVsReferencePrimaryEnergyDeltaKwhM2Year: number | null;
  realVsReferencePrimaryEnergyDeltaPercent: number | null;
  distanceToNextBetterClassKwhM2Year: number | null;
}

export interface EnergyClassificationResult {
  global: GlobalEnergyClassResult;
  emissions: EmissionClassResult;
  services: Record<EnergyServiceForClassification, ServiceEnergyClassResult>;
  referenceBuilding: ReferenceBuildingClassificationResult;
  comparison: EnergyClassificationComparison;
}

export interface EnergyPerformanceClassificationInput {
  totalPrimaryEnergyKwhM2Year?: number | null;
  totalCo2KgM2Year?: number | null;
  buildingEnergyClassType?: BuildingEnergyClassType | null;
  servicePrimaryEnergyKwhM2Year?: Partial<Record<EnergyServiceForClassification, number | null>>;
  serviceUsefulEnergyKwhM2Year?: Partial<Record<EnergyServiceForClassification, number | null>>;
  serviceFinalEnergyKwhM2Year?: Partial<Record<EnergyServiceForClassification, number | null>>;
  services?: Partial<Record<EnergyServiceForClassification, ServiceEnergyClassInput>>;
  referencePrimaryEnergyKwhM2Year?: number | null;
}
