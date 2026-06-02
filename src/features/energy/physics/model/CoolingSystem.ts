import type { PhysicsConfidence, PhysicsSource } from "./Material";

export interface CoolingSystemV04 {
  present: boolean;
  type: "split_ac" | "multi_split" | "central_chiller" | "heat_pump_cooling" | "none" | "unknown";
  seer?: number;
  eer?: number;
  cooledAreaM2?: number;
  controlType?: "manual" | "thermostat" | "smart" | "unknown";
  source: PhysicsSource;
  confidence: PhysicsConfidence;
  assumptions: string[];
}
