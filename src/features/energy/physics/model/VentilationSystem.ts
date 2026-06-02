import type { PhysicsConfidence, PhysicsSource } from "./Material";

export interface VentilationSystemV04 {
  type: "natural" | "mechanical_exhaust" | "mechanical_supply_exhaust" | "mechanical_with_heat_recovery" | "unknown";
  airflowM3PerH?: number;
  fanPowerW?: number;
  annualOperatingHours?: number;
  heatRecoveryEfficiency?: number;
  source: PhysicsSource;
  confidence: PhysicsConfidence;
  assumptions: string[];
}
