import type { PhysicsValue } from "../model/Material";

export const EMISSION_EFFICIENCY_PRESETS: Record<string, PhysicsValue> = {
  local_stove: {
    value: 0.92,
    unit: "-",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Eficienta de emisie estimata pentru incalzire locala prin soba."]
  },
  radiators: {
    value: 0.94,
    unit: "-",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Eficienta de emisie estimata pentru calorifere dimensionate obisnuit."]
  },
  underfloor: {
    value: 0.97,
    unit: "-",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Incalzirea in pardoseala poate lucra cu temperaturi mai joase."]
  },
  air: {
    value: 0.95,
    unit: "-",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Eficienta de emisie estimata pentru incalzire/racire cu aer."]
  }
};
