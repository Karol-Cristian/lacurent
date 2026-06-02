import type { PhysicsValue } from "./Material";

export interface ThermalBridge {
  id: string;
  type:
    | "wall_floor_junction"
    | "wall_roof_junction"
    | "wall_corner"
    | "window_reveal"
    | "balcony_slab"
    | "foundation"
    | "other"
    | "balcony"
    | "wall_floor_junction"
    | "corner"
    | "unknown";
  lengthM: PhysicsValue | number;
  psiWmK?: PhysicsValue;
  psiWPerMK?: number;
  source?: "mc001" | "c107" | "internal_estimate";
  confidence?: "low" | "medium" | "high";
  severity: "low" | "medium" | "high" | "unknown";
}
