import type { EnergyProblem, EnergyProfile } from "./energyProfile";
import type { EnergyRecommendation } from "./recommendations";

export interface EnergyReport {
  profile: EnergyProfile;
  visibleSections: [
    "score",
    "main_conclusion",
    "energy_class",
    "cost_summary",
    "top_problems",
    "recommendations",
    "confidence",
    "technical_details"
  ];
}

export interface ReportSnapshot {
  id: string;
  homeId: string;
  generatedAt: string;
  energyScore: number;
  estimatedEnergyClass: string;
  mainConclusion: string;
  shortExplanation?: string;
  estimatedConsumptionKwhM2Year?: number;
  estimatedAnnualCostRon?: number;
  estimatedCo2KgM2Year?: number;
  confidenceLevel: "low" | "medium" | "high";
  confidenceScore?: number;
  confidenceReasons?: string[];
  missingData?: string[];
  topProblems: EnergyProblem[];
  staticRecommendations: EnergyRecommendation[];
  technicalDetails: Record<string, unknown>;
}

export interface AlgorithmInsight {
  id: string;
  homeId: string;
  updatedAt: string;
  type: "insulation" | "heating" | "windows" | "solar" | "lighting" | "controls";
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedScoreImpact?: number;
  estimatedScoreAfter?: number;
  estimatedSavingsRonYearMin?: number;
  estimatedSavingsRonYearMax?: number;
  estimatedCostRonMin?: number;
  estimatedCostRonMax?: number;
  estimatedPaybackYearsMin?: number;
  estimatedPaybackYearsMax?: number;
  confidencePercent: number;
  basedOn: {
    similarHomesCount?: number;
    comparableProjectsCount?: number;
    offersCount?: number;
    materialPriceSourcesCount?: number;
    laborPriceSourcesCount?: number;
    lastMarketUpdate?: string;
  };
  explanation: string;
  nextActionLabel?: string;
}
