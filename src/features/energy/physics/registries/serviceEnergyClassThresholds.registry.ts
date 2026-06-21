import type { EstimatedEnergyClass } from "./energyClassThresholds.registry";
import type { PhysicsConfidence } from "../model/Material";

export type EnergyServiceForClassification =
  | "heating"
  | "dhw"
  | "cooling"
  | "mechanicalVentilation"
  | "lighting";

export interface ServiceEnergyClassThreshold {
  className: EstimatedEnergyClass;
  minKwhM2Year?: number;
  maxKwhM2Year?: number;
  unit: "kWh/m2.year";
  source: "MC001-2022";
  sourceStatus: "missing_reference_values";
  requiresOfficialVerification: true;
  implementationStatus: "missing_thresholds_not_for_official_certificate";
  confidence: PhysicsConfidence;
}

export interface ServiceEnergyClassThresholdSet {
  id: string;
  service: EnergyServiceForClassification;
  metric: "primary_energy_kwh_m2_year";
  unit: "kWh/m2.year";
  source: "MC001-2022";
  sourceStatus: "missing_reference_values";
  requiresOfficialVerification: true;
  implementationStatus: "missing_thresholds_not_for_official_certificate";
  confidence: PhysicsConfidence;
  thresholds: ServiceEnergyClassThreshold[];
  assumptions: string[];
}

export const SERVICE_ENERGY_CLASS_THRESHOLD_SETS: ServiceEnergyClassThresholdSet[] = [];

export const SERVICE_ENERGY_CLASS_THRESHOLDS_TODO = {
  status: "TODO_REFERENCE_VALUE_MISSING",
  reason: "Nu exista inca registry validat pentru clase energetice pe utilizari. Nu inventa praguri pe servicii."
} as const;
