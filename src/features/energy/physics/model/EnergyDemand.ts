import type { PhysicsConfidence, PhysicsSource } from "./Material";
import type { EnergyDemandDiagnostics, MonthlyHeatBalance } from "./HeatBalance";

export interface EnergyDemandResult {
  monthly: MonthlyHeatBalance[];
  annual: {
    heatingDemandKwhYear: number;
    heatingDemandKwhM2Year: number;
    coolingDemandKwhYear?: number;
    coolingDemandKwhM2Year?: number;
    totalInternalGainsKwhYear: number;
    totalSolarGainsKwhYear: number;
    totalTransmissionLossKwhYear: number;
    totalVentilationLossKwhYear: number;
  };
  peakIndicators?: {
    coldestMonth: number;
    highestHeatingDemandMonth: number;
    highestCoolingDemandMonth?: number;
  };
  diagnostics: EnergyDemandDiagnostics;
  unit: "kWh";
  source: PhysicsSource;
  assumptions: string[];
  confidence: PhysicsConfidence;
}
