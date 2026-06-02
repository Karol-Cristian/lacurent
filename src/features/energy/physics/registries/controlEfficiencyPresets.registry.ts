import type { PhysicsValue } from "../model/Material";

export const CONTROL_EFFICIENCY_PRESETS: Record<string, PhysicsValue> = {
  none: {
    value: 0.88,
    unit: "-",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Fara reglaj eficient; risc de supraincalzire si risipa."]
  },
  manual: {
    value: 0.92,
    unit: "-",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Reglaj manual simplu."]
  },
  room_thermostat: {
    value: 0.96,
    unit: "-",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Termostat de ambient pentru control de baza."]
  },
  thermostatic_valves: {
    value: 0.97,
    unit: "-",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Robineti termostatati pe zone/camere."]
  },
  zoned_control: {
    value: 0.98,
    unit: "-",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Control pe zone."]
  },
  smart_control: {
    value: 0.99,
    unit: "-",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Control inteligent cu programare si optimizare."]
  }
};
