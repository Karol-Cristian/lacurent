import type { UserEnergyInputs } from "./userInputs";
import type { EnergyRecommendation } from "./recommendations";

export interface EnergyProfile {
  input: UserEnergyInputs;
  derived: DerivedEnergyModel;
  assessment: EnergyAssessment;
  recommendations: EnergyRecommendation[];
  metadata: EnergyAssessmentMetadata;
}

export interface DerivedEnergyModel {
  building: DerivedBuildingProperties;
  climate: DerivedClimateProperties;
  geometry: DerivedGeometryProperties;
  envelope: DerivedEnvelopeProperties;
  systems: DerivedSystemProperties;
  demand: DerivedEnergyDemand;
  realConsumption: DerivedRealConsumption;
  emissions: DerivedEmissions;
}

export interface DerivedBuildingProperties {
  estimatedBuildingAgeYears?: number;
  constructionPeriod: "before_1945" | "1945_1977" | "1978_1990" | "1991_2000" | "2001_2010" | "2011_2020" | "after_2020" | "unknown";
  likelyCodeStandard: "pre_energy_standards" | "basic_energy_standards" | "improved_energy_standards" | "modern_energy_standards" | "nZEB_or_recent" | "unknown";
  renovationStatus: "not_renovated" | "partially_renovated" | "recently_renovated" | "unknown";
}

export interface DerivedClimateProperties {
  climateZone: string | "unknown";
  designOutdoorTemperatureC?: number;
  heatingDegreeDays?: number;
  coolingDegreeDays?: number;
  averageAnnualTemperatureC?: number;
  confidence: "low" | "medium" | "high";
}

export interface DerivedGeometryProperties {
  usefulAreaM2?: number;
  heatedAreaM2?: number;
  estimatedVolumeM3?: number;
  estimatedEnvelopeAreaM2?: number;
  estimatedWallAreaM2?: number;
  estimatedRoofAreaM2?: number;
  estimatedFloorAreaM2?: number;
  estimatedWindowAreaM2?: number;
  compactnessRatio?: number;
  formFactor?: number;
}

export interface EnvelopeElementPerformance {
  estimatedUValueWm2K?: number;
  quality: "very_poor" | "poor" | "average" | "good" | "very_good" | "unknown";
  confidence: "low" | "medium" | "high";
  assumptions: string[];
}

export interface EnvelopeWeakness {
  element: "wall" | "roof" | "floor" | "windows" | "doors";
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
}

export interface DerivedEnvelopeProperties {
  wall: EnvelopeElementPerformance;
  roof: EnvelopeElementPerformance;
  floor: EnvelopeElementPerformance;
  windows: EnvelopeElementPerformance;
  doors: EnvelopeElementPerformance;
  globalHeatLossIndicator?: number;
  weakestElements: EnvelopeWeakness[];
}

export interface DerivedSystemProperties {
  heating: HeatingSystemPerformance;
  cooling: SystemQuality;
  domesticHotWater: SystemQuality;
  ventilation: SystemQuality;
  lighting: SystemQuality;
  renewables: RenewablePerformance;
}

export interface HeatingSystemPerformance {
  estimatedEfficiency?: number;
  quality: "very_poor" | "poor" | "average" | "good" | "very_good" | "unknown";
  fuelType: string;
  controlQuality: "none" | "basic" | "good" | "smart" | "unknown";
  assumptions: string[];
}

export interface SystemQuality {
  quality: "very_poor" | "poor" | "average" | "good" | "very_good" | "unknown";
  assumptions: string[];
}

export interface RenewablePerformance {
  photovoltaicInstalled?: "yes" | "no" | "unknown";
  solarThermalInstalled?: "yes" | "no" | "unknown";
  batteryInstalled?: "yes" | "no" | "unknown";
  assumptions: string[];
}

export interface DerivedEnergyDemand {
  estimatedFinalEnergyKwhYear?: number;
  estimatedFinalEnergyKwhM2Year?: number;
  estimatedPrimaryEnergyKwhYear?: number;
  estimatedPrimaryEnergyKwhM2Year?: number;
  heatingDemandKwhYear?: number;
  heatingDemandKwhM2Year?: number;
  coolingDemandKwhYear?: number;
  coolingDemandKwhM2Year?: number;
  dhwDemandKwhYear?: number;
  dhwDemandKwhM2Year?: number;
  lightingDemandKwhYear?: number;
  lightingDemandKwhM2Year?: number;
  renewableProductionKwhYear?: number;
  netEnergyKwhYear?: number;
  confidence: "low" | "medium" | "high";
  assumptions: string[];
}

export interface DerivedRealConsumption {
  annualCostRon?: number;
  monthlyAverageCostRon?: number;
  annualElectricityKwh?: number;
  annualGasKwh?: number;
  annualWoodKwhEquivalent?: number;
  annualPelletsKwhEquivalent?: number;
  annualTotalDeliveredEnergyKwh?: number;
  costCompleteness: "none" | "partial" | "complete";
  consumptionCompleteness: "none" | "cost_only" | "partial_quantities" | "complete_quantities";
  comparisonToModel: "much_lower_than_model" | "lower_than_model" | "aligned_with_model" | "higher_than_model" | "much_higher_than_model" | "unknown";
  explanation: string;
}

export interface DerivedEmissions {
  estimatedCo2KgYear?: number;
  estimatedCo2KgM2Year?: number;
  emissionClass?: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "unknown";
  assumptions: string[];
}

export interface EnergyAssessment {
  score: number;
  estimatedEnergyClass: "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "unknown";
  mainConclusion: string;
  shortExplanation: string;
  estimatedAnnualCostRon?: number;
  estimatedAnnualSavingsMinRon?: number;
  estimatedAnnualSavingsMaxRon?: number;
  estimatedSavingsPercentMin?: number;
  estimatedSavingsPercentMax?: number;
  benchmark: BenchmarkComparison;
  topProblems: EnergyProblem[];
  confidence: AssessmentConfidence;
}

export interface BenchmarkComparison {
  comparedTo: "similar_homes" | "modern_home" | "national_average" | "unknown";
  result: "much_better" | "better" | "average" | "worse" | "much_worse" | "unknown";
  explanation: string;
}

export interface EnergyProblem {
  id: string;
  area: "walls" | "roof" | "floor" | "windows" | "heating" | "cooling" | "dhw" | "lighting" | "ventilation" | "renewables" | "behavior";
  severity: "low" | "medium" | "high" | "critical";
  impact: "low" | "medium" | "high";
  title: string;
  explanation: string;
}

export interface AssessmentConfidence {
  level: "low" | "medium" | "high";
  score: number;
  reasons: string[];
  missingData: string[];
}

export interface EnergyAssessmentMetadata {
  calculationVersion: string;
  generatedAt: string;
  disclaimer: string;
}
