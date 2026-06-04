import type { AiAssumption, AiConfidence } from "./AiAssumption";

export type AiInsightTarget = "report" | "algorithms";

export type AiInsightType =
  | "problem"
  | "money_leak"
  | "scenario"
  | "negative_recommendation"
  | "missing_data"
  | "risk"
  | "comfort"
  | "automation"
  | "ventilation"
  | "dhw"
  | "pv"
  | "heating_source"
  | "comparison";

export type AiInsightValidationStatus = "proposed" | "validated" | "rejected" | "needs_more_data";

export interface AiInsightCandidate {
  id: string;
  target: AiInsightTarget;
  type: AiInsightType;
  title: string;
  hypothesis: string;
  requiredInputs: string[];
  relatedPhysicsOutputs: string[];
  suggestedCalculation?: string;
  proposedPlacement: string;
  priority: "low" | "medium" | "high" | "urgent";
  confidence: AiConfidence;
  reason: string;
  assumptions: AiAssumption[];
  warnings: string[];
  validationStatus: AiInsightValidationStatus;
}
