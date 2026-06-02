import type { PhysicsConfidence } from "./Material";
import type { FuelCarrierCode } from "./FuelCarrier";

export interface PrimaryEnergyFactor {
  carrier: FuelCarrierCode;
  renewableFactor: number;
  nonRenewableFactor: number;
  totalFactor: number;
  source: "mc001" | "registry_default" | "internal_estimate";
  validFrom?: string;
  confidence: PhysicsConfidence;
  assumptions: string[];
}

export interface Co2EmissionFactor {
  carrier: FuelCarrierCode;
  kgCo2PerKwh: number;
  source: "mc001" | "registry_default" | "internal_estimate";
  validFrom?: string;
  confidence: PhysicsConfidence;
  assumptions: string[];
}

export interface PrimaryEnergyAndCo2Result {
  primaryEnergyByCarrier: Record<FuelCarrierCode, {
    renewableKwh: number;
    nonRenewableKwh: number;
    totalKwh: number;
  }>;
  totalPrimaryEnergyKwhYear: number;
  totalPrimaryEnergyKwhM2Year: number;
  renewablePrimaryEnergyKwhYear: number;
  nonRenewablePrimaryEnergyKwhYear: number;
  renewableEnergyRatioPercent: number;
  co2ByCarrierKgYear: Record<FuelCarrierCode, number>;
  totalCo2KgYear: number;
  totalCo2KgM2Year: number;
  assumptions: string[];
  confidence: PhysicsConfidence;
}
