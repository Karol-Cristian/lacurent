import type { PhysicsConfidence, PhysicsValue } from "./Material";

export type FinalEnergyCarrier =
  | "electricity"
  | "natural_gas"
  | "wood"
  | "pellets"
  | "district_heating"
  | "lpg"
  | "coal"
  | "unknown";

export type FinalEnergyUse = "heating" | "cooling" | "dhw" | "auxiliary";

export interface SystemEfficiencyBreakdown {
  emissionEfficiency: PhysicsValue;
  distributionEfficiency: PhysicsValue;
  storageEfficiency: PhysicsValue;
  generationEfficiency: PhysicsValue;
  controlEfficiency: PhysicsValue;
  totalSystemEfficiency: PhysicsValue;
}

export interface SystemLosses {
  use: FinalEnergyUse;
  usefulDemandKwhYear: PhysicsValue;
  finalEnergyKwhYear: PhysicsValue;
  lossesKwhYear: PhysicsValue;
  efficiency: SystemEfficiencyBreakdown;
}

export interface AuxiliaryEnergy {
  heatingKwhYear: PhysicsValue;
  coolingKwhYear: PhysicsValue;
  dhwKwhYear: PhysicsValue;
  totalKwhYear: PhysicsValue;
}

export interface FinalEnergyResult {
  finalEnergyByCarrier: Record<FinalEnergyCarrier, PhysicsValue>;
  finalEnergyByUse: Record<FinalEnergyUse, PhysicsValue>;
  finalEnergyCarrierByUse: Record<FinalEnergyUse, FinalEnergyCarrier>;
  systemLosses: SystemLosses[];
  auxiliaryEnergy: AuxiliaryEnergy;
  totalFinalEnergyKwhYear: PhysicsValue;
  totalFinalEnergyKwhM2Year: PhysicsValue;
  assumptions: string[];
  confidence: PhysicsConfidence;
}
