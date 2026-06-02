import type { PhysicsValue } from "../model/Material";

export const GENERATION_EFFICIENCY_PRESETS: Record<string, PhysicsValue> = {
  wood_stove: {
    value: 0.55,
    unit: "-",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Randament sezonier estimativ pentru soba pe lemne."]
  },
  gas_boiler_non_condensing: {
    value: 0.82,
    unit: "-",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Randament sezonier estimativ pentru centrala gaz non-condensare."]
  },
  gas_boiler_condensing: {
    value: 0.92,
    unit: "-",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Randament sezonier estimativ pentru centrala gaz in condensare."]
  },
  pellet_boiler: {
    value: 0.84,
    unit: "-",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Randament sezonier estimativ pentru centrala pe peleti."]
  },
  electric_direct: {
    value: 0.98,
    unit: "-",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["Incalzire electrica directa, aproape toata energia devine caldura utila local."]
  },
  air_water_heat_pump_radiators: {
    value: 2.3,
    unit: "SCOP",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["SCOP estimativ pentru pompa aer-apa pe calorifere; depinde de temperatura agentului."]
  },
  air_water_heat_pump_underfloor: {
    value: 3.2,
    unit: "SCOP",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["SCOP estimativ mai bun pentru pompa aer-apa cu incalzire in pardoseala."]
  },
  air_air_heat_pump: {
    value: 3,
    unit: "SCOP",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["SCOP estimativ pentru pompa aer-aer."]
  },
  district_heating: {
    value: 0.98,
    unit: "-",
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Conversie locala estimativa pentru termoficare, fara energia primara a retelei."]
  }
};
