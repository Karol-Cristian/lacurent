import type { AiAssumption, AiConfidence } from "./AiAssumption";
import type { AiTraceableNumber } from "./AiCalculationEstimate";

export type AiRecommendationVerdict =
  | "worth_analyzing_first"
  | "worth_after_prerequisites"
  | "good_for_comfort_not_roi"
  | "technically_possible_but_risky"
  | "not_recommended_now"
  | "needs_more_data"
  | "poor_roi"
  | "long_payback"
  | "strong_candidate";

export type AiRecommendationCategory =
  | "insulation"
  | "windows"
  | "heating"
  | "controls"
  | "ventilation"
  | "renewables"
  | "dhw"
  | "lighting"
  | "data_quality";

export interface AiRecommendation {
  id: string;
  title: string;
  category: AiRecommendationCategory;
  reason: string;
  expectedImpact: "low" | "medium" | "high" | "very_high" | "unknown";
  estimatedCost?: AiTraceableNumber;
  estimatedSavings?: AiTraceableNumber;
  payback?: AiTraceableNumber;
  comfortImpact: "negative" | "neutral" | "positive" | "strong_positive" | "unknown";
  technicalRisk: "low" | "medium" | "high" | "unknown";
  dependencies: string[];
  missingData: string[];
  confidence: AiConfidence;
  verdict: AiRecommendationVerdict;
  isNegativeRecommendation: boolean;
  assumptions: AiAssumption[];
}
