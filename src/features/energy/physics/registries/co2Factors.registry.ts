import type { EnergyCarrier } from "./primaryEnergyFactors.registry";
import type { PhysicsValue } from "../model/Material";

export const CO2_FACTORS_REGISTRY: Record<EnergyCarrier, PhysicsValue> = {
  electricity: { value: 0.24, unit: "kgCO2/kWh", source: "estimated", confidence: "low", assumptions: ["Factor placeholder configurabil."] },
  natural_gas: { value: 0.202, unit: "kgCO2/kWh", source: "estimated", confidence: "medium", assumptions: ["Factor estimativ."] },
  wood: { value: 0.03, unit: "kgCO2/kWh", source: "estimated", confidence: "low", assumptions: ["Contabilizare simplificata pentru biomasa."] },
  pellets: { value: 0.04, unit: "kgCO2/kWh", source: "estimated", confidence: "low", assumptions: ["Contabilizare simplificata pentru biomasa."] },
  district_heating: { value: 0.18, unit: "kgCO2/kWh", source: "estimated", confidence: "low", assumptions: ["Factor placeholder."] },
  lpg: { value: 0.23, unit: "kgCO2/kWh", source: "estimated", confidence: "low", assumptions: ["Factor placeholder."] },
  coal: { value: 0.34, unit: "kgCO2/kWh", source: "estimated", confidence: "low", assumptions: ["Factor placeholder."] }
};
