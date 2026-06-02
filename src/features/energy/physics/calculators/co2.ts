import type { EnergyCarrier } from "../registries/primaryEnergyFactors.registry";
import { CO2_FACTORS_REGISTRY } from "../registries/co2Factors.registry";
import type { PhysicsValue } from "../model/Material";
import { pv } from "./resistance";

export function calculateCo2(finalEnergy: PhysicsValue, carrier: EnergyCarrier): PhysicsValue {
  const factor = CO2_FACTORS_REGISTRY[carrier];
  return pv(finalEnergy.value * factor.value, "kgCO2/an", [`CO2 = energie finala x factor emisii ${carrier}.`, ...factor.assumptions], factor.confidence);
}
