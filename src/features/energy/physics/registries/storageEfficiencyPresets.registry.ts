import type { PhysicsValue } from "../model/Material";

export const STORAGE_EFFICIENCY_PRESETS: Record<string, PhysicsValue> = {
  none: {
    value: 1,
    unit: "-",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Fara stocare termica separata."]
  },
  buffer_small: {
    value: 0.96,
    unit: "-",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Pierderi estimate pentru puffer/vas acumulare mic."]
  },
  dhw_tank: {
    value: 0.9,
    unit: "-",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Pierderi estimate pentru boiler/acumulator ACM."]
  }
};
