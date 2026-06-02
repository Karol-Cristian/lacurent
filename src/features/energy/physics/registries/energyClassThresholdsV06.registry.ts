import type { EnergyClassThreshold, EnvironmentalClassThreshold } from "../model/Classification";

export const ENERGY_CLASS_THRESHOLDS_V06: EnergyClassThreshold[] = [
  { buildingCategory: "residential", metric: "primary_energy_kwh_m2_year", className: "A+", maxValueExclusive: 90, source: "internal_estimate", confidence: "low" },
  { buildingCategory: "residential", metric: "primary_energy_kwh_m2_year", className: "A", minValueInclusive: 90, maxValueExclusive: 130, source: "internal_estimate", confidence: "low" },
  { buildingCategory: "residential", metric: "primary_energy_kwh_m2_year", className: "B", minValueInclusive: 130, maxValueExclusive: 180, source: "internal_estimate", confidence: "low" },
  { buildingCategory: "residential", metric: "primary_energy_kwh_m2_year", className: "C", minValueInclusive: 180, maxValueExclusive: 240, source: "internal_estimate", confidence: "low" },
  { buildingCategory: "residential", metric: "primary_energy_kwh_m2_year", className: "D", minValueInclusive: 240, maxValueExclusive: 320, source: "internal_estimate", confidence: "low" },
  { buildingCategory: "residential", metric: "primary_energy_kwh_m2_year", className: "E", minValueInclusive: 320, maxValueExclusive: 420, source: "internal_estimate", confidence: "low" },
  { buildingCategory: "residential", metric: "primary_energy_kwh_m2_year", className: "F", minValueInclusive: 420, maxValueExclusive: 560, source: "internal_estimate", confidence: "low" },
  { buildingCategory: "residential", metric: "primary_energy_kwh_m2_year", className: "G", minValueInclusive: 560, source: "internal_estimate", confidence: "low" }
];

export const ENVIRONMENTAL_CLASS_THRESHOLDS_V06: EnvironmentalClassThreshold[] = [
  { buildingCategory: "residential", className: "A", maxKgCo2M2Year: 5, source: "internal_estimate", confidence: "low" },
  { buildingCategory: "residential", className: "B", minKgCo2M2Year: 5, maxKgCo2M2Year: 10, source: "internal_estimate", confidence: "low" },
  { buildingCategory: "residential", className: "C", minKgCo2M2Year: 10, maxKgCo2M2Year: 20, source: "internal_estimate", confidence: "low" },
  { buildingCategory: "residential", className: "D", minKgCo2M2Year: 20, maxKgCo2M2Year: 35, source: "internal_estimate", confidence: "low" },
  { buildingCategory: "residential", className: "E", minKgCo2M2Year: 35, maxKgCo2M2Year: 55, source: "internal_estimate", confidence: "low" },
  { buildingCategory: "residential", className: "F", minKgCo2M2Year: 55, maxKgCo2M2Year: 80, source: "internal_estimate", confidence: "low" },
  { buildingCategory: "residential", className: "G", minKgCo2M2Year: 80, source: "internal_estimate", confidence: "low" }
];
