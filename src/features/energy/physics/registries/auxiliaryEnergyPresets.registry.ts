import type { PhysicsValue } from "../model/Material";

export const AUXILIARY_ENERGY_PRESETS: Record<string, PhysicsValue> = {
  none: {
    value: 0,
    unit: "kWh/an",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Fara energie auxiliara explicita."]
  },
  local_stove: {
    value: 0,
    unit: "kWh/an",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Soba locala fara pompe electrice permanente."]
  },
  boiler_pumps_basic: {
    value: 120,
    unit: "kWh/an",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Pompe si automatizari estimate pentru centrala individuala."]
  },
  pellet_boiler_aux: {
    value: 180,
    unit: "kWh/an",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Snecuri, ventilatoare si pompe pentru centrala pe peleti."]
  },
  heat_pump_aux: {
    value: 220,
    unit: "kWh/an",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Pompe, ventilatoare si automatizari estimate pentru pompa de caldura."]
  },
  split_ac_aux: {
    value: 30,
    unit: "kWh/an",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Consum auxiliar mic pentru sistem split."]
  }
};
