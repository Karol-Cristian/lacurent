import type { PhysicsConfidence } from "./Material";

export type EstimatedEnergyClass = "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "unknown";
export type EstimatedEnvironmentalClass = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "unknown";

export interface EnergyClassThreshold {
  buildingCategory: string;
  metric: "primary_energy_kwh_m2_year" | "final_energy_kwh_m2_year" | "relative_to_reference";
  className: Exclude<EstimatedEnergyClass, "unknown">;
  minValueInclusive?: number;
  maxValueExclusive?: number;
  source: "mc001" | "internal_estimate";
  confidence: PhysicsConfidence;
}

export interface EnvironmentalClassThreshold {
  buildingCategory: string;
  className: Exclude<EstimatedEnvironmentalClass, "unknown">;
  minKgCo2M2Year?: number;
  maxKgCo2M2Year?: number;
  source: "mc001" | "internal_estimate";
  confidence: PhysicsConfidence;
}

export interface ClassificationResult {
  estimatedEnergyClass: EstimatedEnergyClass;
  estimatedEnvironmentalClass: EstimatedEnvironmentalClass;
  primaryEnergyKwhM2Year: number;
  finalEnergyKwhM2Year: number;
  co2KgM2Year: number;
  comparedToReference?: {
    referencePrimaryEnergyKwhM2Year: number;
    currentPrimaryEnergyKwhM2Year: number;
    differencePercent: number;
  };
  assumptions: string[];
  confidence: PhysicsConfidence;
}
