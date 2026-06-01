export interface EnergyRecommendation {
  id: string;
  title: string;
  category: "insulation" | "windows" | "heating" | "controls" | "lighting" | "renewables" | "behavior" | "maintenance";
  priority: "low" | "medium" | "high" | "urgent";
  costLevel: "low" | "medium" | "high" | "very_high";
  impactLevel: "low" | "medium" | "high" | "very_high";
  estimatedSavingsRonYearMin?: number;
  estimatedSavingsRonYearMax?: number;
  estimatedSavingsPercentMin?: number;
  estimatedSavingsPercentMax?: number;
  paybackYearsMin?: number;
  paybackYearsMax?: number;
  reason: string;
  action: string;
  userFacingExplanation: string;
  triggeredBy: string[];
}
