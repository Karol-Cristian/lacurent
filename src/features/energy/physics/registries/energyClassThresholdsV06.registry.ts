import type { EnergyClassThreshold, EnvironmentalClassThreshold } from "../model/Classification";
import { ENERGY_CLASS_THRESHOLD_SETS } from "./energyClassThresholds.registry";

export const ENERGY_CLASS_THRESHOLDS_V06: EnergyClassThreshold[] = ENERGY_CLASS_THRESHOLD_SETS.flatMap(set =>
  set.thresholds.map(threshold => ({
    buildingCategory: set.buildingType,
    metric: "primary_energy_kwh_m2_year",
    className: threshold.className,
    minValueInclusive: threshold.minExclusive,
    maxValueExclusive: threshold.maxInclusive,
    source: "internal_estimate",
    confidence: threshold.confidence
  }))
);

export const ENVIRONMENTAL_CLASS_THRESHOLDS_V06: EnvironmentalClassThreshold[] = [];
