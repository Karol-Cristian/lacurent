import type { AiAssumption, AiConfidence } from "./AiAssumption";

export type AiNumericSourceType =
  | "user_provided"
  | "registry_default"
  | "deterministic_calculation"
  | "ai_estimate"
  | "placeholder_unknown";

export interface AiTraceableNumber {
  value?: number;
  valueRange?: [number, number];
  unit: string;
  sourceType: AiNumericSourceType;
  confidence: AiConfidence;
  assumptions: AiAssumption[];
  validationNeeded: boolean;
}

export interface AiCalculationEstimate {
  metric: string;
  sourceType: "ai_estimate";
  formula: string;
  inputs: Record<string, unknown>;
  result?: number;
  resultRange?: [number, number];
  unit: string;
  confidence: AiConfidence;
  assumptions: AiAssumption[];
  validationNeeded: boolean;
  warnings: string[];
}
