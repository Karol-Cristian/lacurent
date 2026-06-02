import type { WindowSystem } from "../model/EnvelopeElement";
import type { PhysicsValue } from "../model/Material";

function value(value: number, unit: string, confidence: PhysicsValue["confidence"] = "medium"): PhysicsValue {
  return {
    value,
    unit,
    source: "estimated",
    confidence,
    assumptions: ["Preset estimativ pentru motorul fizic v0.1."]
  };
}

export const WINDOWS_REGISTRY: Record<string, WindowSystem> = {
  single_old: {
    id: "single_old",
    name: "Geam simplu vechi",
    glazingType: "single",
    frameType: "wood_old",
    uValueWm2K: value(5.0, "W/m2K"),
    gValue: value(0.78, "-")
  },
  double_old: {
    id: "double_old",
    name: "Termopan vechi",
    glazingType: "double_old",
    frameType: "pvc",
    uValueWm2K: value(2.8, "W/m2K"),
    gValue: value(0.65, "-")
  },
  double_low_e: {
    id: "double_low_e",
    name: "Termopan modern low-e",
    glazingType: "double_low_e",
    frameType: "pvc",
    uValueWm2K: value(1.3, "W/m2K"),
    gValue: value(0.55, "-")
  },
  triple: {
    id: "triple",
    name: "Tripan",
    glazingType: "triple",
    frameType: "pvc",
    uValueWm2K: value(0.8, "W/m2K"),
    gValue: value(0.5, "-")
  }
};
