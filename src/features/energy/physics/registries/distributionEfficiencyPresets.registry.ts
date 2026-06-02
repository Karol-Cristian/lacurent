import type { PhysicsValue } from "../model/Material";

export const DISTRIBUTION_EFFICIENCY_PRESETS: Record<string, PhysicsValue> = {
  local: {
    value: 1,
    unit: "-",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Sistem local fara retea de distributie lunga."]
  },
  radiators_uninsulated: {
    value: 0.9,
    unit: "-",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Pierderi estimative pe conducte si distributie cu izolatie necunoscuta."]
  },
  radiators_insulated: {
    value: 0.94,
    unit: "-",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Distributie cu pierderi moderate."]
  },
  underfloor: {
    value: 0.96,
    unit: "-",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Distributie joasa temperatura, pierderi estimative reduse."]
  },
  district_heating: {
    value: 0.88,
    unit: "-",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Pierderi locale estimate pentru transfer/distributie termoficare."]
  }
};
