import type { HeatingSystem } from "../model/Systems";

export const HEATING_SYSTEMS_REGISTRY: Record<string, HeatingSystem> = {
  wood_stove_old: {
    id: "wood_stove_old",
    fuel: "wood",
    generatorType: "wood_stove",
    seasonalEfficiency: {
      value: 0.55,
      unit: "-",
      source: "estimated",
      confidence: "low",
      assumptions: ["Eficienta sezoniera estimativa pentru soba pe lemne veche."]
    },
    distributionType: "local",
    controlType: "manual"
  },
  gas_condensing_boiler: {
    id: "gas_condensing_boiler",
    fuel: "natural_gas",
    generatorType: "gas_boiler_condensing",
    seasonalEfficiency: {
      value: 0.92,
      unit: "-",
      source: "estimated",
      confidence: "medium",
      assumptions: ["Preset estimativ pentru centrala in condensare."]
    },
    distributionType: "radiators",
    controlType: "room_thermostat"
  },
  air_water_heat_pump_radiators: {
    id: "air_water_heat_pump_radiators",
    fuel: "heat_pump",
    generatorType: "air_to_water_heat_pump",
    scop: {
      value: 2.3,
      unit: "-",
      source: "internal_estimate",
      confidence: "low",
      assumptions: ["SCOP estimativ pentru pompa aer-apa pe calorifere; depinde puternic de temperatura agentului."]
    },
    distributionType: "radiators",
    controlType: "room_thermostat"
  }
};
