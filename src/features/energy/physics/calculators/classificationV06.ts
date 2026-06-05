import type { ClassificationResult, EnvironmentalClassThreshold } from "../model/Classification";
import type { PhysicsConfidence } from "../model/Material";
import type { ReferenceBuilding } from "../model/ReferenceBuilding";
import type { BuildingEnergyClassType } from "../registries/energyClassThresholds.registry";
import { classifyEstimatedEnergyClass } from "./estimatedEnergyClass";

function confidenceMin(values: PhysicsConfidence[]): PhysicsConfidence {
  if (values.includes("low")) return "low";
  if (values.includes("medium")) return "medium";
  return "high";
}

export function classifyEnergy(value: number, buildingEnergyClassType?: BuildingEnergyClassType): ClassificationResult["estimatedEnergyClass"] {
  return classifyEstimatedEnergyClass(value, buildingEnergyClassType).estimatedClass;
}

export function classifyEnvironmental(_value: number, _thresholds: EnvironmentalClassThreshold[] = []): ClassificationResult["estimatedEnvironmentalClass"] {
  return "unknown";
}

export function calculateClassificationV06(input: {
  primaryEnergyKwhM2Year: number;
  finalEnergyKwhM2Year: number;
  co2KgM2Year: number;
  buildingEnergyClassType?: BuildingEnergyClassType;
  referenceBuilding?: ReferenceBuilding;
  referencePrimaryEnergyKwhM2Year?: number;
  confidence?: PhysicsConfidence;
}): ClassificationResult {
  const classResult = classifyEstimatedEnergyClass(input.primaryEnergyKwhM2Year, input.buildingEnergyClassType);
  const referencePrimary = input.referencePrimaryEnergyKwhM2Year;
  const missingReasons = [
    ...classResult.warnings,
    "TODO_CO2_ENVIRONMENTAL_CLASS_REGISTRY_MISSING",
    !input.referenceBuilding ? "MISSING_VALIDATED_REFERENCE_BUILDING_METHOD" : ""
  ].filter(Boolean);
  return {
    estimatedEnergyClass: classResult.estimatedClass,
    estimatedEnvironmentalClass: "unknown",
    classCalculationStatus: classResult.status === "classified" ? "calculated_from_estimated_threshold_registry" : classResult.status,
    missingReasons,
    buildingEnergyClassType: input.buildingEnergyClassType,
    estimatedEnergyClassSource: classResult.thresholdSetUsed?.source,
    primaryEnergyKwhM2Year: input.primaryEnergyKwhM2Year,
    finalEnergyKwhM2Year: input.finalEnergyKwhM2Year,
    co2KgM2Year: input.co2KgM2Year,
    comparedToReference: referencePrimary ? {
      referencePrimaryEnergyKwhM2Year: referencePrimary,
      currentPrimaryEnergyKwhM2Year: input.primaryEnergyKwhM2Year,
      differencePercent: Math.round((input.primaryEnergyKwhM2Year - referencePrimary) / referencePrimary * 100)
    } : undefined,
    assumptions: [
      ...classResult.assumptions,
      "Clasele sunt estimate LaCurent si nu reprezinta certificat energetic oficial.",
      "Clasa de mediu CO2 nu este calculata inca; lipseste registry separat de praguri.",
      ...(input.referenceBuilding?.assumptions || [])
    ],
    confidence: confidenceMin([input.confidence || "low", classResult.confidence, input.referenceBuilding?.confidence || "low"])
  };
}
