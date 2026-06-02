export type PhysicsSource =
  | "mc001"
  | "standard"
  | "estimated"
  | "internal_estimate"
  | "user_input"
  | "custom";

export type PhysicsConfidence = "low" | "medium" | "high";

export interface PhysicsValue<T = number> {
  value: T;
  unit: string;
  source: PhysicsSource;
  confidence: PhysicsConfidence;
  assumptions: string[];
}

export interface PhysicsCalculation<T = number> {
  value: T;
  unit: string;
  source: PhysicsSource;
  confidence: PhysicsConfidence;
  assumptions: string[];
}

export interface MaterialPreset {
  id: string;
  name: string;
  category:
    | "masonry"
    | "concrete"
    | "wood"
    | "insulation"
    | "glass"
    | "air_layer"
    | "finish"
    | "plaster"
    | "soil"
    | "other";
  lambdaWmK: PhysicsValue;
  lambdaWPerMK?: number;
  densityKgM3?: PhysicsValue | number;
  specificHeatJkgK?: PhysicsValue;
  specificHeatJPerKgK?: number;
  vaporResistanceFactor?: number;
  source?: PhysicsSource;
  confidence?: PhysicsConfidence;
}

export interface MaterialLayer {
  materialId: string;
  name?: string;
  thicknessM: PhysicsValue | number;
  lambdaWmK?: PhysicsValue;
}

export interface LayerResistance {
  materialId: string;
  name: string;
  resistance: PhysicsValue;
}
