import type { PhysicsConfidence } from "./Material";

export type AuditMeasureType =
  | "wall_insulation"
  | "roof_insulation"
  | "floor_insulation"
  | "window_replacement"
  | "door_replacement"
  | "thermal_bridge_treatment"
  | "heating_generator_replacement"
  | "heating_controls"
  | "distribution_insulation"
  | "dhw_upgrade"
  | "ventilation_heat_recovery"
  | "lighting_led"
  | "solar_thermal"
  | "photovoltaic"
  | "heat_pump"
  | "other";

export interface AuditMeasure {
  id: string;
  type: AuditMeasureType;
  targetElementIds?: string[];
  modification: Record<string, unknown>;
  estimatedCostRonMin?: number;
  estimatedCostRonMax?: number;
  lifetimeYears?: number;
  source: "registry_default" | "market_estimate" | "offer" | "user_input";
  confidence: PhysicsConfidence;
}

export interface AuditScenario {
  id: string;
  name: string;
  description: string;
  measures: AuditMeasure[];
  source: "user_selected" | "algorithm_generated" | "auditor_defined";
}

export interface AuditScenarioResult {
  scenarioId: string;
  baseline: {
    finalEnergyKwhYear: number;
    primaryEnergyKwhYear: number;
    co2KgYear: number;
    annualCostRon?: number;
    energyClass?: string;
  };
  scenario: {
    finalEnergyKwhYear: number;
    primaryEnergyKwhYear: number;
    co2KgYear: number;
    annualCostRon?: number;
    energyClass?: string;
  };
  savings: {
    finalEnergyKwhYear: number;
    primaryEnergyKwhYear: number;
    co2KgYear: number;
    annualCostRon?: number;
    finalEnergyPercent: number;
    primaryEnergyPercent: number;
    co2Percent: number;
  };
  economics: {
    investmentCostRonMin?: number;
    investmentCostRonMax?: number;
    simplePaybackYearsMin?: number;
    simplePaybackYearsMax?: number;
  };
  assumptions: string[];
  confidence: PhysicsConfidence;
}
