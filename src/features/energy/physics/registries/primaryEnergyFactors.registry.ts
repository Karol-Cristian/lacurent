import type { PhysicsValue } from "../model/Material";

export type EnergyCarrier = "electricity" | "natural_gas" | "wood" | "pellets" | "district_heating" | "lpg" | "coal";

export const PRIMARY_ENERGY_FACTORS_REGISTRY: Record<EnergyCarrier, PhysicsValue> = {
  electricity: { value: 2.5, unit: "-", source: "estimated", confidence: "low", assumptions: ["Factor placeholder configurabil."] },
  natural_gas: { value: 1.1, unit: "-", source: "estimated", confidence: "low", assumptions: ["Factor placeholder configurabil."] },
  wood: { value: 0.2, unit: "-", source: "estimated", confidence: "low", assumptions: ["Factor placeholder pentru biomasa."] },
  pellets: { value: 0.25, unit: "-", source: "estimated", confidence: "low", assumptions: ["Factor placeholder pentru peleti."] },
  district_heating: { value: 1.3, unit: "-", source: "estimated", confidence: "low", assumptions: ["Factor placeholder."] },
  lpg: { value: 1.1, unit: "-", source: "estimated", confidence: "low", assumptions: ["Factor placeholder."] },
  coal: { value: 1.2, unit: "-", source: "estimated", confidence: "low", assumptions: ["Factor placeholder."] }
};
