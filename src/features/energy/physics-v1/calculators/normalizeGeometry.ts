import type { BuildingInputV1, NormalizedGeometryV1 } from "../model/types";

const FALLBACK_FLOOR_HEIGHT_M = 2.5;

function assertPositiveNumber(value: unknown, fieldName: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
  return number;
}

export function normalizeGeometry(input: BuildingInputV1): NormalizedGeometryV1 {
  const assumptions: string[] = [
    "Physics Engine v1 Stage 1 normalizes only area and volume.",
    "No envelope areas are derived in Stage 1.",
    "No square-footprint assumption is used in Stage 1."
  ];
  const warnings: string[] = [];

  const usefulAreaM2 = assertPositiveNumber(input.usefulAreaM2, "usefulAreaM2");
  const heatedAreaM2 = input.heatedAreaM2 === undefined || input.heatedAreaM2 === null
    ? usefulAreaM2
    : assertPositiveNumber(input.heatedAreaM2, "heatedAreaM2");

  if (input.heatedAreaM2 === undefined || input.heatedAreaM2 === null) {
    warnings.push("heatedAreaM2 missing; usefulAreaM2 used as heatedAreaM2");
  }

  let averageFloorHeightM: number;
  let heatedVolumeM3: number;

  if (input.averageFloorHeightM !== undefined && input.averageFloorHeightM !== null) {
    averageFloorHeightM = assertPositiveNumber(input.averageFloorHeightM, "averageFloorHeightM");
  } else {
    averageFloorHeightM = FALLBACK_FLOOR_HEIGHT_M;
  }

  if (input.heatedVolumeM3 !== undefined && input.heatedVolumeM3 !== null) {
    heatedVolumeM3 = assertPositiveNumber(input.heatedVolumeM3, "heatedVolumeM3");
    if (input.averageFloorHeightM === undefined || input.averageFloorHeightM === null) {
      averageFloorHeightM = Number((heatedVolumeM3 / heatedAreaM2).toFixed(3));
      assumptions.push("averageFloorHeightM derived from provided heatedVolumeM3 / heatedAreaM2.");
    } else {
      assumptions.push("heatedVolumeM3 provided directly and used as source of truth.");
    }
  } else {
    if (input.averageFloorHeightM === undefined || input.averageFloorHeightM === null) {
      warnings.push("SEVERE: averageFloorHeightM missing; fallback 2.5m used");
      assumptions.push("heatedVolumeM3 calculated with fallback averageFloorHeightM = 2.5m.");
    } else {
      assumptions.push("heatedVolumeM3 calculated from heatedAreaM2 * averageFloorHeightM.");
    }
    heatedVolumeM3 = Number((heatedAreaM2 * averageFloorHeightM).toFixed(3));
  }

  const result = {
    usefulAreaM2,
    heatedAreaM2,
    heatedVolumeM3,
    averageFloorHeightM
  };

  return {
    ...result,
    assumptions,
    warnings,
    trace: {
      formulaId: "V1_GEOMETRY_NORMALIZATION",
      formulaText: "heatedVolumeM3 = providedVolume || heatedAreaM2 * averageFloorHeightM",
      inputs: {
        usefulAreaM2: input.usefulAreaM2,
        heatedAreaM2: input.heatedAreaM2,
        heatedVolumeM3: input.heatedVolumeM3,
        averageFloorHeightM: input.averageFloorHeightM
      },
      result,
      unit: "m2/m3",
      source: "physics-v1/calculators/normalizeGeometry",
      assumptions,
      warnings,
      confidence: warnings.length ? "low" : "high"
    }
  };
}
