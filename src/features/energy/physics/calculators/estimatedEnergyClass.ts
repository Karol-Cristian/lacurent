import type { CalculationTrace } from "../model/CalculationTrace";
import type { PhysicsConfidence } from "../model/Material";
import {
  ENERGY_CLASS_THRESHOLD_SETS,
  type BuildingEnergyClassType,
  type EnergyClassThresholdSet,
  type EstimatedEnergyClass
} from "../registries/energyClassThresholds.registry";

export type EstimatedEnergyClassStatus =
  | "classified"
  | "cannot_classify"
  | "needs_building_type"
  | "error";

export interface EstimatedEnergyClassResult {
  status: EstimatedEnergyClassStatus;
  estimatedClass: EstimatedEnergyClass | "unknown";
  inputPrimaryEnergyKwhM2Year?: number | null;
  unit: "kWh/m2.year";
  thresholdSetUsed?: EnergyClassThresholdSet;
  assumptions: string[];
  warnings: string[];
  confidence: PhysicsConfidence;
  trace: CalculationTrace<EstimatedEnergyClass | "unknown">;
}

function buildTrace(input: {
  value: EstimatedEnergyClass | "unknown";
  primaryEnergyKwhM2Year?: number | null;
  buildingEnergyClassType?: BuildingEnergyClassType | null;
  thresholdSetId?: string;
  steps: string[];
  assumptions: string[];
  warnings: string[];
  confidence: PhysicsConfidence;
}): CalculationTrace<EstimatedEnergyClass | "unknown"> {
  return {
    value: input.value,
    unit: "class",
    formulaId: "ESTIMATED_ENERGY_CLASS_FROM_PRIMARY_ENERGY",
    inputs: {
      primaryEnergyKwhM2Year: input.primaryEnergyKwhM2Year,
      buildingEnergyClassType: input.buildingEnergyClassType,
      thresholdSetId: input.thresholdSetId
    },
    steps: input.steps,
    assumptions: input.assumptions,
    warnings: input.warnings,
    confidence: input.confidence
  };
}

function matchesThreshold(value: number, minExclusive?: number, maxInclusive?: number): boolean {
  return (minExclusive === undefined || value > minExclusive)
    && (maxInclusive === undefined || value <= maxInclusive);
}

export function classifyEstimatedEnergyClass(
  primaryEnergyKwhM2Year: number | null | undefined,
  buildingEnergyClassType?: BuildingEnergyClassType | null,
  thresholdSets: EnergyClassThresholdSet[] = ENERGY_CLASS_THRESHOLD_SETS
): EstimatedEnergyClassResult {
  const assumptions = [
    "Clasa este estimativa si se bazeaza pe energia primara specifica anuala.",
    "Rezultatul nu reprezinta certificat energetic oficial."
  ];

  if (primaryEnergyKwhM2Year === null || primaryEnergyKwhM2Year === undefined) {
    const warnings = ["MISSING_PRIMARY_ENERGY_KWH_M2_YEAR"];
    const trace = buildTrace({
      value: "unknown",
      primaryEnergyKwhM2Year,
      buildingEnergyClassType,
      steps: ["Nu exista valoare pentru energia primara specifica."],
      assumptions,
      warnings,
      confidence: "low"
    });
    return { status: "cannot_classify", estimatedClass: "unknown", inputPrimaryEnergyKwhM2Year: primaryEnergyKwhM2Year, unit: "kWh/m2.year", assumptions, warnings, confidence: "low", trace };
  }

  if (!Number.isFinite(primaryEnergyKwhM2Year)) {
    const warnings = ["INVALID_PRIMARY_ENERGY_KWH_M2_YEAR"];
    const trace = buildTrace({
      value: "unknown",
      primaryEnergyKwhM2Year,
      buildingEnergyClassType,
      steps: ["Valoarea energiei primare specifice nu este finita."],
      assumptions,
      warnings,
      confidence: "low"
    });
    return { status: "error", estimatedClass: "unknown", inputPrimaryEnergyKwhM2Year: primaryEnergyKwhM2Year, unit: "kWh/m2.year", assumptions, warnings, confidence: "low", trace };
  }

  if (primaryEnergyKwhM2Year < 0) {
    const warnings = ["NEGATIVE_PRIMARY_ENERGY_KWH_M2_YEAR"];
    const trace = buildTrace({
      value: "unknown",
      primaryEnergyKwhM2Year,
      buildingEnergyClassType,
      steps: ["Energia primara specifica negativa nu poate fi clasificata."],
      assumptions,
      warnings,
      confidence: "low"
    });
    return { status: "error", estimatedClass: "unknown", inputPrimaryEnergyKwhM2Year: primaryEnergyKwhM2Year, unit: "kWh/m2.year", assumptions, warnings, confidence: "low", trace };
  }

  if (!buildingEnergyClassType) {
    const warnings = ["NEEDS_BUILDING_ENERGY_CLASS_TYPE"];
    const trace = buildTrace({
      value: "unknown",
      primaryEnergyKwhM2Year,
      buildingEnergyClassType,
      steps: ["Lipseste tipul de cladire pentru setul de praguri energetic."],
      assumptions,
      warnings,
      confidence: "low"
    });
    return { status: "needs_building_type", estimatedClass: "unknown", inputPrimaryEnergyKwhM2Year: primaryEnergyKwhM2Year, unit: "kWh/m2.year", assumptions, warnings, confidence: "low", trace };
  }

  const thresholdSet = thresholdSets.find(item => item.buildingType === buildingEnergyClassType);
  if (!thresholdSet) {
    const warnings = ["MISSING_THRESHOLD_SET_FOR_BUILDING_TYPE"];
    const trace = buildTrace({
      value: "unknown",
      primaryEnergyKwhM2Year,
      buildingEnergyClassType,
      steps: [`Nu exista set de praguri pentru ${buildingEnergyClassType}.`],
      assumptions,
      warnings,
      confidence: "low"
    });
    return { status: "needs_building_type", estimatedClass: "unknown", inputPrimaryEnergyKwhM2Year: primaryEnergyKwhM2Year, unit: "kWh/m2.year", assumptions, warnings, confidence: "low", trace };
  }

  const threshold = thresholdSet.thresholds.find(item => matchesThreshold(primaryEnergyKwhM2Year, item.minExclusive, item.maxInclusive));
  const warnings = threshold ? [] : ["NO_THRESHOLD_MATCH"];
  const estimatedClass = threshold?.className || "unknown";
  const confidence = threshold ? thresholdSet.confidence : "low";
  const trace = buildTrace({
    value: estimatedClass,
    primaryEnergyKwhM2Year,
    buildingEnergyClassType,
    thresholdSetId: thresholdSet.id,
    steps: [
      `Se foloseste setul ${thresholdSet.id}.`,
      threshold
        ? `${primaryEnergyKwhM2Year} ${thresholdSet.unit} -> clasa estimativa ${estimatedClass}.`
        : `${primaryEnergyKwhM2Year} ${thresholdSet.unit} nu se incadreaza in pragurile disponibile.`
    ],
    assumptions: [...assumptions, ...thresholdSet.assumptions],
    warnings,
    confidence
  });

  return {
    status: threshold ? "classified" : "cannot_classify",
    estimatedClass,
    inputPrimaryEnergyKwhM2Year: primaryEnergyKwhM2Year,
    unit: "kWh/m2.year",
    thresholdSetUsed: thresholdSet,
    assumptions: trace.assumptions,
    warnings,
    confidence,
    trace
  };
}
