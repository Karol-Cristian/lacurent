import type { PhysicsConfidence } from "./Material";
import type { FuelCarrierCode } from "./FuelCarrier";

export interface HeatingFinalEnergyResult {
  usefulDemandKwh: number;
  finalEnergyKwh: number;
  fuelCarrier: FuelCarrierCode;
  systemEfficiency: number;
  lossesKwh: number;
  breakdown: {
    emissionLossesKwh: number;
    distributionLossesKwh: number;
    storageLossesKwh: number;
    generationLossesKwh: number;
    controlPenaltyKwh: number;
  };
  assumptions: string[];
  confidence: PhysicsConfidence;
}

export interface DhwEnergyResult {
  usefulDhwDemandKwhYear: number;
  finalDhwEnergyKwhYear: number;
  fuelCarrier: FuelCarrierCode;
  lossesKwhYear: number;
  assumptions: string[];
  confidence: PhysicsConfidence;
}

export interface AuxiliaryEnergyResult {
  heatingAuxiliaryKwhYear: number;
  coolingAuxiliaryKwhYear: number;
  ventilationAuxiliaryKwhYear: number;
  dhwAuxiliaryKwhYear: number;
  totalAuxiliaryKwhYear: number;
}
