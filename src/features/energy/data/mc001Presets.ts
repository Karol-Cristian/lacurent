import type {
  EmissionFactor,
  EnergyClassThreshold,
  FuelConversionFactor,
  MaterialPreset,
  PrimaryEnergyFactor,
  TechnicalRecommendationRule
} from "../schema/mc001TechnicalModel";

export const materialPresets: MaterialPreset[] = [
  { id: "solid_brick", name: "Caramida plina", category: "masonry", lambdaWmK: 0.77, source: "estimated" },
  { id: "efficient_brick", name: "Caramida eficienta", category: "masonry", lambdaWmK: 0.33, source: "estimated" },
  { id: "bca", name: "BCA", category: "masonry", lambdaWmK: 0.16, source: "estimated" },
  { id: "concrete", name: "Beton", category: "concrete", lambdaWmK: 1.7, source: "estimated" },
  { id: "stone", name: "Piatra", category: "masonry", lambdaWmK: 1.8, source: "estimated" },
  { id: "wood", name: "Lemn", category: "wood", lambdaWmK: 0.18, source: "estimated" },
  { id: "interior_plaster", name: "Tencuiala interioara", category: "finish", lambdaWmK: 0.7, source: "estimated" },
  { id: "exterior_plaster", name: "Tencuiala exterioara", category: "finish", lambdaWmK: 0.87, source: "estimated" },
  { id: "eps", name: "Polistiren EPS", category: "insulation", lambdaWmK: 0.04, source: "estimated" },
  { id: "xps", name: "Polistiren XPS", category: "insulation", lambdaWmK: 0.035, source: "estimated" },
  { id: "mineral_wool", name: "Vata minerala", category: "insulation", lambdaWmK: 0.039, source: "estimated" },
  { id: "cellulose", name: "Celuloza", category: "insulation", lambdaWmK: 0.04, source: "estimated" },
  { id: "wood_fiber", name: "Fibra lemnoasa", category: "insulation", lambdaWmK: 0.045, source: "estimated" },
  { id: "single_glass", name: "Geam simplu", category: "glass", lambdaWmK: 1, source: "estimated" },
  { id: "double_glass", name: "Geam dublu", category: "glass", lambdaWmK: 1, source: "estimated" },
  { id: "triple_glass", name: "Geam triplu", category: "glass", lambdaWmK: 1, source: "estimated" }
];

export const primaryEnergyFactors: PrimaryEnergyFactor[] = [
  { carrier: "electricity", totalFactor: 1.7, source: "estimated" },
  { carrier: "natural_gas", totalFactor: 1.1, source: "estimated" },
  { carrier: "wood", totalFactor: 0.2, source: "estimated" },
  { carrier: "pellets", totalFactor: 0.25, source: "estimated" },
  { carrier: "district_heating", totalFactor: 1.2, source: "estimated" },
  { carrier: "lpg", totalFactor: 1.1, source: "estimated" },
  { carrier: "coal", totalFactor: 1.2, source: "estimated" }
];

export const emissionFactors: EmissionFactor[] = [
  { carrier: "electricity", kgCo2PerKwh: 0.24, source: "estimated" },
  { carrier: "natural_gas", kgCo2PerKwh: 0.202, source: "estimated" },
  { carrier: "wood", kgCo2PerKwh: 0.03, source: "estimated" },
  { carrier: "pellets", kgCo2PerKwh: 0.04, source: "estimated" },
  { carrier: "district_heating", kgCo2PerKwh: 0.25, source: "estimated" },
  { carrier: "lpg", kgCo2PerKwh: 0.23, source: "estimated" },
  { carrier: "coal", kgCo2PerKwh: 0.34, source: "estimated" }
];

export const fuelConversionFactors: FuelConversionFactor[] = [
  { carrier: "natural_gas", fromUnit: "m3", toKwh: 10.55, confidence: "medium", source: "estimated" },
  { carrier: "wood", fromUnit: "stere", toKwh: 1500, confidence: "low", source: "estimated" },
  { carrier: "wood", fromUnit: "m3", toKwh: 1900, confidence: "low", source: "estimated" },
  { carrier: "pellets", fromUnit: "kg", toKwh: 4.8, confidence: "medium", source: "estimated" },
  { carrier: "coal", fromUnit: "kg", toKwh: 7, confidence: "low", source: "estimated" }
];

export const residentialEnergyClassThresholds: EnergyClassThreshold[] = [
  { buildingCategory: "residential", metric: "final_energy_kwh_m2_year", className: "A+", maxValueExclusive: 60, source: "estimated" },
  { buildingCategory: "residential", metric: "final_energy_kwh_m2_year", className: "A", minValueInclusive: 60, maxValueExclusive: 90, source: "estimated" },
  { buildingCategory: "residential", metric: "final_energy_kwh_m2_year", className: "B", minValueInclusive: 90, maxValueExclusive: 130, source: "estimated" },
  { buildingCategory: "residential", metric: "final_energy_kwh_m2_year", className: "C", minValueInclusive: 130, maxValueExclusive: 180, source: "estimated" },
  { buildingCategory: "residential", metric: "final_energy_kwh_m2_year", className: "D", minValueInclusive: 180, maxValueExclusive: 260, source: "estimated" },
  { buildingCategory: "residential", metric: "final_energy_kwh_m2_year", className: "E", minValueInclusive: 260, maxValueExclusive: 340, source: "estimated" },
  { buildingCategory: "residential", metric: "final_energy_kwh_m2_year", className: "F", minValueInclusive: 340, maxValueExclusive: 420, source: "estimated" },
  { buildingCategory: "residential", metric: "final_energy_kwh_m2_year", className: "G", minValueInclusive: 420, source: "estimated" }
];

export const technicalRecommendationRules: TechnicalRecommendationRule[] = [
  {
    id: "wall_u_value_high",
    trigger: { element: "wall", condition: "uValueWm2K > configurable_threshold" },
    measure: "add_wall_insulation",
    expectedImpact: "very_high",
    costLevel: "high",
    affects: "heating",
    defaultSavingsPercentMin: 10,
    defaultSavingsPercentMax: 25
  },
  {
    id: "roof_quality_poor",
    trigger: { element: "roof", condition: "quality in poor, very_poor" },
    measure: "add_roof_insulation",
    expectedImpact: "high",
    costLevel: "medium",
    affects: "heating",
    defaultSavingsPercentMin: 8,
    defaultSavingsPercentMax: 20
  },
  {
    id: "manual_heating_control",
    trigger: { element: "heating", condition: "controlType in none, manual" },
    measure: "add_thermostat",
    expectedImpact: "medium",
    costLevel: "low",
    affects: "heating",
    defaultSavingsPercentMin: 5,
    defaultSavingsPercentMax: 12
  }
];
