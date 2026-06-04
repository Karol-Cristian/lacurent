import type { AiAssumption, AiConfidence } from "./AiAssumption";
import type { AiTraceableNumber } from "./AiCalculationEstimate";
import type { AiInsightTarget } from "./AiInsightCandidate";

export type ValidatedInsightCategory =
  | "diagnosis"
  | "financial"
  | "scenario"
  | "risk"
  | "comfort"
  | "negative_recommendation"
  | "missing_data"
  | "technical";

export interface ValidatedInsightMetric {
  label: string;
  value: AiTraceableNumber;
}

export interface ValidatedInsightCard {
  id: string;
  sourceCandidateId: string;
  target: AiInsightTarget;
  title: string;
  summary: string;
  category: ValidatedInsightCategory;
  severity: "low" | "medium" | "high" | "critical";
  priority: "low" | "medium" | "high" | "urgent";
  metrics: ValidatedInsightMetric[];
  explanation: string;
  assumptions: AiAssumption[];
  missingData: string[];
  warnings: string[];
  display: {
    statusLabel: "Calculat" | "Estimat" | "Necesita date" | "Ipoteza" | "Verificat de motor";
    stableForReport: boolean;
    experimental: boolean;
  };
  validatedBy: "physics_engine" | "scenario_engine" | "financial_layer" | "rules_engine" | "ai_estimate_only";
  confidence: AiConfidence;
}
