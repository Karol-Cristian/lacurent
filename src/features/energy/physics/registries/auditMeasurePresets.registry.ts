import type { AuditMeasure } from "../model/AuditScenario";

export const AUDIT_MEASURE_PRESETS: Record<string, AuditMeasure> = {
  roof_insulation_basic: {
    id: "roof_insulation_basic",
    type: "roof_insulation",
    modification: {
      finalEnergyReductionPercent: 12,
      primaryEnergyReductionPercent: 12,
      co2ReductionPercent: 10
    },
    estimatedCostRonMin: 6000,
    estimatedCostRonMax: 12000,
    lifetimeYears: 30,
    source: "market_estimate",
    confidence: "low"
  },
  wall_insulation_basic: {
    id: "wall_insulation_basic",
    type: "wall_insulation",
    modification: {
      finalEnergyReductionPercent: 18,
      primaryEnergyReductionPercent: 18,
      co2ReductionPercent: 15
    },
    estimatedCostRonMin: 25000,
    estimatedCostRonMax: 55000,
    lifetimeYears: 35,
    source: "market_estimate",
    confidence: "low"
  },
  heating_controls: {
    id: "heating_controls",
    type: "heating_controls",
    modification: {
      finalEnergyReductionPercent: 6,
      primaryEnergyReductionPercent: 6,
      co2ReductionPercent: 6
    },
    estimatedCostRonMin: 400,
    estimatedCostRonMax: 1800,
    lifetimeYears: 10,
    source: "market_estimate",
    confidence: "medium"
  },
  heat_pump_replacement: {
    id: "heat_pump_replacement",
    type: "heat_pump",
    modification: {
      finalEnergyReductionPercent: 35,
      primaryEnergyReductionPercent: 15,
      co2ReductionPercent: 45
    },
    estimatedCostRonMin: 30000,
    estimatedCostRonMax: 65000,
    lifetimeYears: 18,
    source: "market_estimate",
    confidence: "low"
  }
};
