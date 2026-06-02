export interface MonthlyHeatBalance {
  month: number;
  transmissionLossKwh: number;
  ventilationLossKwh: number;
  grossHeatLossKwh: number;
  internalGainsKwh: number;
  solarGainsKwh: number;
  totalGainsKwh: number;
  utilizationFactor: number;
  usableGainsKwh: number;
  heatingDemandKwh: number;
  coolingDemandKwh?: number;
}

export interface EnergyDemandDiagnostics {
  heatingLossBreakdown: {
    transmissionPercent: number;
    ventilationPercent: number;
  };
  gainsBreakdown: {
    solarPercent: number;
    internalPercent: number;
  };
  monthlyPattern: string;
  mainReasonForHighDemand: string;
}
