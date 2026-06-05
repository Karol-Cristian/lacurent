import type { PhysicsConfidence } from "./Material";

export interface CalculationTrace<T = number> {
  value: T;
  unit: string;
  formulaId: string;
  inputs: Record<string, unknown>;
  steps: string[];
  assumptions: string[];
  warnings: string[];
  confidence: PhysicsConfidence;
}

export interface CalculationTraceGroup<T = unknown> {
  result: T;
  traces: CalculationTrace[];
  assumptions: string[];
  warnings: string[];
  confidence: PhysicsConfidence;
}
