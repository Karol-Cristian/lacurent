import type { ClassificationResult, EnergyClassThreshold, EnvironmentalClassThreshold } from "../model/Classification";
import type { PhysicsConfidence } from "../model/Material";
import type { ReferenceBuilding } from "../model/ReferenceBuilding";
import { ENERGY_CLASS_THRESHOLDS_V06, ENVIRONMENTAL_CLASS_THRESHOLDS_V06 } from "../registries/energyClassThresholdsV06.registry";

function inRange(value: number, min?: number, max?: number): boolean {
  return (min === undefined || value >= min) && (max === undefined || value < max);
}

function confidenceMin(values: PhysicsConfidence[]): PhysicsConfidence {
  if (values.includes("low")) return "low";
  if (values.includes("medium")) return "medium";
  return "high";
}

export function classifyEnergy(value: number, thresholds: EnergyClassThreshold[] = ENERGY_CLASS_THRESHOLDS_V06): ClassificationResult["estimatedEnergyClass"] {
  return thresholds.find(item => inRange(value, item.minValueInclusive, item.maxValueExclusive))?.className || "unknown";
}

export function classifyEnvironmental(value: number, thresholds: EnvironmentalClassThreshold[] = ENVIRONMENTAL_CLASS_THRESHOLDS_V06): ClassificationResult["estimatedEnvironmentalClass"] {
  return thresholds.find(item => inRange(value, item.minKgCo2M2Year, item.maxKgCo2M2Year))?.className || "unknown";
}

export function calculateClassificationV06(input: {
  primaryEnergyKwhM2Year: number;
  finalEnergyKwhM2Year: number;
  co2KgM2Year: number;
  referenceBuilding?: ReferenceBuilding;
  referencePrimaryEnergyKwhM2Year?: number;
  confidence?: PhysicsConfidence;
}): ClassificationResult {
  const energyThreshold = ENERGY_CLASS_THRESHOLDS_V06.find(item => inRange(input.primaryEnergyKwhM2Year, item.minValueInclusive, item.maxValueExclusive));
  const environmentalThreshold = ENVIRONMENTAL_CLASS_THRESHOLDS_V06.find(item => inRange(input.co2KgM2Year, item.minKgCo2M2Year, item.maxKgCo2M2Year));
  const referencePrimary = input.referencePrimaryEnergyKwhM2Year;
  return {
    estimatedEnergyClass: energyThreshold?.className || "unknown",
    estimatedEnvironmentalClass: environmentalThreshold?.className || "unknown",
    primaryEnergyKwhM2Year: input.primaryEnergyKwhM2Year,
    finalEnergyKwhM2Year: input.finalEnergyKwhM2Year,
    co2KgM2Year: input.co2KgM2Year,
    comparedToReference: referencePrimary ? {
      referencePrimaryEnergyKwhM2Year: referencePrimary,
      currentPrimaryEnergyKwhM2Year: input.primaryEnergyKwhM2Year,
      differencePercent: Math.round((input.primaryEnergyKwhM2Year - referencePrimary) / referencePrimary * 100)
    } : undefined,
    assumptions: [
      "v0.6 foloseste praguri configurabile, nu hardcodate in componente.",
      "Clasele sunt estimate LaCurent si nu reprezinta certificat energetic oficial.",
      ...(input.referenceBuilding?.assumptions || [])
    ],
    confidence: confidenceMin([input.confidence || "low", energyThreshold?.confidence || "low", environmentalThreshold?.confidence || "low", input.referenceBuilding?.confidence || "low"])
  };
}
