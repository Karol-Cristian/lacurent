import type { CoolingSystemV04 } from "../model/CoolingSystem";

export const COOLING_SYSTEM_PRESETS: Record<string, CoolingSystemV04> = {
  none: {
    present: false,
    type: "none",
    source: "registry_default",
    confidence: "medium",
    assumptions: ["Fara sistem activ de racire."]
  },
  split_ac_default: {
    present: true,
    type: "split_ac",
    seer: 3.1,
    controlType: "thermostat",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["SEER estimativ pentru aparat split uzual."]
  },
  multi_split_default: {
    present: true,
    type: "multi_split",
    seer: 3.3,
    controlType: "thermostat",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["SEER estimativ pentru multi-split."]
  },
  heat_pump_cooling_default: {
    present: true,
    type: "heat_pump_cooling",
    seer: 3.5,
    controlType: "thermostat",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["SEER estimativ pentru racire prin pompa de caldura."]
  }
};
