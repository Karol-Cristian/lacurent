import type { PhysicsCalculation } from "../model/Material";

export interface SurfaceResistancePreset {
  id: string;
  rsiM2KPerW: PhysicsCalculation;
  rseM2KPerW: PhysicsCalculation;
}

function value(value: number, assumptions: string[]): PhysicsCalculation {
  return {
    value,
    unit: "m2K/W",
    source: "internal_estimate",
    confidence: "medium",
    assumptions
  };
}

export const SURFACE_RESISTANCES_REGISTRY: Record<string, SurfaceResistancePreset> = {
  default_vertical: {
    id: "default_vertical",
    rsiM2KPerW: value(0.13, ["Rezistenta superficiala interioara configurabila pentru element vertical."]),
    rseM2KPerW: value(0.04, ["Rezistenta superficiala exterioara configurabila pentru element exterior."])
  },
  default_horizontal: {
    id: "default_horizontal",
    rsiM2KPerW: value(0.10, ["Rezistenta superficiala interioara configurabila pentru element orizontal."]),
    rseM2KPerW: value(0.04, ["Rezistenta superficiala exterioara configurabila pentru element exterior."])
  },
  ground_contact: {
    id: "ground_contact",
    rsiM2KPerW: value(0.17, ["Rezistenta superficiala interioara pentru pardoseala, placeholder configurabil."]),
    rseM2KPerW: value(0, ["Contactul cu solul este modelat separat; Rse setat configurabil la 0 in v0.2."])
  }
};
