import type { PhysicsConfidence } from "../model/Material";

export type EstimatedEmissionClass = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export interface EmissionClassThreshold {
  className: EstimatedEmissionClass;
  minKgCo2M2Year?: number;
  maxKgCo2M2Year?: number;
  unit: "kgCO2/m2.year";
  source: "MC001-2022";
  sourceStatus: "missing_reference_values";
  requiresOfficialVerification: true;
  implementationStatus: "missing_thresholds_not_for_official_certificate";
  confidence: PhysicsConfidence;
}

export interface EmissionClassThresholdSet {
  id: string;
  metric: "co2_kg_m2_year";
  unit: "kgCO2/m2.year";
  source: "MC001-2022";
  sourceStatus: "missing_reference_values";
  requiresOfficialVerification: true;
  implementationStatus: "missing_thresholds_not_for_official_certificate";
  confidence: PhysicsConfidence;
  thresholds: EmissionClassThreshold[];
  assumptions: string[];
}

export const EMISSION_CLASS_THRESHOLD_SETS: EmissionClassThresholdSet[] = [];

export const EMISSION_CLASS_THRESHOLDS_TODO = {
  status: "TODO_REFERENCE_VALUE_MISSING",
  reason: "Nu exista inca registry validat pentru pragurile clasei de emisii CO2. Nu inventa praguri CO2."
} as const;
