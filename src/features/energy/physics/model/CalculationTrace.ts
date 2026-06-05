import type { PhysicsConfidence } from "./Material";

export interface CalculationTrace<T = number> {
  value: T;
  unit: string;
  formulaId: string;
  formulaText?: string;
  inputs: Record<string, unknown>;
  steps: string[];
  assumptions: string[];
  warnings: string[];
  source?: string;
  sourceType?: "user_input" | "registry_default" | "internal_estimate" | "mc001" | "calculated";
  confidence: PhysicsConfidence;
}

export interface CalculationTraceGroup<T = unknown> {
  result: T;
  traces: CalculationTrace[];
  assumptions: string[];
  warnings: string[];
  confidence: PhysicsConfidence;
}
