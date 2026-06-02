import type { EnergyCarrier } from "../registries/primaryEnergyFactors.registry";
import { PRIMARY_ENERGY_FACTORS_REGISTRY } from "../registries/primaryEnergyFactors.registry";
import type { PhysicsValue } from "../model/Material";
import { pv } from "./resistance";

export function calculatePrimaryEnergy(finalEnergy: PhysicsValue, carrier: EnergyCarrier): PhysicsValue {
  const factor = PRIMARY_ENERGY_FACTORS_REGISTRY[carrier];
  return pv(finalEnergy.value * factor.value, "kWh/an", [`Energie primara = energie finala x factor ${carrier}.`, ...factor.assumptions], factor.confidence);
}
