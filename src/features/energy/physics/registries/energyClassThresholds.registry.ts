import type { PhysicsConfidence } from "../model/Material";

export type EstimatedEnergyClass = "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "G";

export type BuildingEnergyClassType =
  | "residential_individual"
  | "residential_collective";

export interface EnergyClassThreshold {
  className: EstimatedEnergyClass;
  minExclusive?: number;
  maxInclusive?: number;
  unit: "kWh/m2.year";
  buildingType: BuildingEnergyClassType;
  source: string;
  confidence: PhysicsConfidence;
}

export interface EnergyClassThresholdSet {
  id: string;
  buildingType: BuildingEnergyClassType;
  metric: "primary_energy_kwh_m2_year";
  unit: "kWh/m2.year";
  source: string;
  confidence: PhysicsConfidence;
  thresholds: EnergyClassThreshold[];
  assumptions: string[];
}

const SOURCE = "user_provided_estimated_primary_energy_thresholds_2026_06_05";

export const ENERGY_CLASS_THRESHOLD_SETS: EnergyClassThresholdSet[] = [
  {
    id: "estimated_primary_energy_residential_individual_v1",
    buildingType: "residential_individual",
    metric: "primary_energy_kwh_m2_year",
    unit: "kWh/m2.year",
    source: SOURCE,
    confidence: "medium",
    assumptions: [
      "Pragurile sunt pentru clasa estimativa LaCurent pe baza energiei primare specifice anuale.",
      "Rezultatul nu reprezinta certificat energetic oficial."
    ],
    thresholds: [
      { className: "A+", maxInclusive: 91, unit: "kWh/m2.year", buildingType: "residential_individual", source: SOURCE, confidence: "medium" },
      { className: "A", minExclusive: 91, maxInclusive: 129, unit: "kWh/m2.year", buildingType: "residential_individual", source: SOURCE, confidence: "medium" },
      { className: "B", minExclusive: 129, maxInclusive: 257, unit: "kWh/m2.year", buildingType: "residential_individual", source: SOURCE, confidence: "medium" },
      { className: "C", minExclusive: 257, maxInclusive: 390, unit: "kWh/m2.year", buildingType: "residential_individual", source: SOURCE, confidence: "medium" },
      { className: "D", minExclusive: 390, maxInclusive: 522, unit: "kWh/m2.year", buildingType: "residential_individual", source: SOURCE, confidence: "medium" },
      { className: "E", minExclusive: 522, maxInclusive: 652, unit: "kWh/m2.year", buildingType: "residential_individual", source: SOURCE, confidence: "medium" },
      { className: "F", minExclusive: 652, maxInclusive: 783, unit: "kWh/m2.year", buildingType: "residential_individual", source: SOURCE, confidence: "medium" },
      { className: "G", minExclusive: 783, unit: "kWh/m2.year", buildingType: "residential_individual", source: SOURCE, confidence: "medium" }
    ]
  },
  {
    id: "estimated_primary_energy_residential_collective_v1",
    buildingType: "residential_collective",
    metric: "primary_energy_kwh_m2_year",
    unit: "kWh/m2.year",
    source: SOURCE,
    confidence: "medium",
    assumptions: [
      "Pragurile sunt pentru clasa estimativa LaCurent pe baza energiei primare specifice anuale.",
      "Rezultatul nu reprezinta certificat energetic oficial."
    ],
    thresholds: [
      { className: "A+", maxInclusive: 73, unit: "kWh/m2.year", buildingType: "residential_collective", source: SOURCE, confidence: "medium" },
      { className: "A", minExclusive: 73, maxInclusive: 101, unit: "kWh/m2.year", buildingType: "residential_collective", source: SOURCE, confidence: "medium" },
      { className: "B", minExclusive: 101, maxInclusive: 198, unit: "kWh/m2.year", buildingType: "residential_collective", source: SOURCE, confidence: "medium" },
      { className: "C", minExclusive: 198, maxInclusive: 297, unit: "kWh/m2.year", buildingType: "residential_collective", source: SOURCE, confidence: "medium" },
      { className: "D", minExclusive: 297, maxInclusive: 396, unit: "kWh/m2.year", buildingType: "residential_collective", source: SOURCE, confidence: "medium" },
      { className: "E", minExclusive: 396, maxInclusive: 495, unit: "kWh/m2.year", buildingType: "residential_collective", source: SOURCE, confidence: "medium" },
      { className: "F", minExclusive: 495, maxInclusive: 595, unit: "kWh/m2.year", buildingType: "residential_collective", source: SOURCE, confidence: "medium" },
      { className: "G", minExclusive: 595, unit: "kWh/m2.year", buildingType: "residential_collective", source: SOURCE, confidence: "medium" }
    ]
  }
];

export const CO2_ENVIRONMENTAL_CLASS_TODO = {
  status: "TODO_REFERENCE_VALUE_MISSING",
  reason: "Nu exista inca registry validat pentru clasa de mediu CO2."
} as const;
