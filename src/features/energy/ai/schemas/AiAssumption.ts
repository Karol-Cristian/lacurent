export type AiConfidence = "low" | "medium" | "high";

export type AiAssumptionSource =
  | "user_input"
  | "ai_normalization"
  | "rule_based_inference"
  | "physics_engine"
  | "missing_data";

export interface AiAssumption {
  id: string;
  field: string;
  label: string;
  value?: string | number | boolean;
  reason: string;
  confidence: AiConfidence;
  source: AiAssumptionSource;
  numericTruthSource: "physics_engine" | "user_input" | "not_numeric";
}
