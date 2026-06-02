import type { PhysicsConfidence, PhysicsSource } from "./Material";

export interface LightingSystem {
  dominantType: "led" | "fluorescent" | "incandescent_halogen" | "mixed" | "unknown";
  installedPowerWPerM2?: number;
  annualOperatingHours?: number;
  source?: PhysicsSource;
  confidence?: PhysicsConfidence;
  assumptions?: string[];
}
