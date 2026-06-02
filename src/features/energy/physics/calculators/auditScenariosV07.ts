import type { AuditMeasure, AuditScenario, AuditScenarioResult } from "../model/AuditScenario";
import type { PhysicsConfidence } from "../model/Material";

export interface AuditBaseline {
  finalEnergyKwhYear: number;
  primaryEnergyKwhYear: number;
  co2KgYear: number;
  annualCostRon?: number;
  energyClass?: string;
}

function percent(measure: AuditMeasure, key: string): number {
  const value = measure.modification[key];
  return typeof value === "number" ? value : 0;
}

function combinedReduction(measures: AuditMeasure[], key: string): number {
  const remaining = measures.reduce((factor, measure) => factor * (1 - Math.max(0, Math.min(95, percent(measure, key))) / 100), 1);
  return Math.round((1 - remaining) * 1000) / 10;
}

function confidenceMin(values: PhysicsConfidence[]): PhysicsConfidence {
  if (values.includes("low")) return "low";
  if (values.includes("medium")) return "medium";
  return "high";
}

function reduced(value: number, reductionPercent: number): number {
  return Math.round(value * (1 - reductionPercent / 100));
}

export function simulateAuditScenarioV07(scenario: AuditScenario, baseline: AuditBaseline): AuditScenarioResult {
  const finalReduction = combinedReduction(scenario.measures, "finalEnergyReductionPercent");
  const primaryReduction = combinedReduction(scenario.measures, "primaryEnergyReductionPercent");
  const co2Reduction = combinedReduction(scenario.measures, "co2ReductionPercent");
  const costReduction = combinedReduction(scenario.measures, "annualCostReductionPercent") || finalReduction;
  const scenarioValues = {
    finalEnergyKwhYear: reduced(baseline.finalEnergyKwhYear, finalReduction),
    primaryEnergyKwhYear: reduced(baseline.primaryEnergyKwhYear, primaryReduction),
    co2KgYear: reduced(baseline.co2KgYear, co2Reduction),
    annualCostRon: baseline.annualCostRon !== undefined ? reduced(baseline.annualCostRon, costReduction) : undefined,
    energyClass: scenario.measures.find(measure => typeof measure.modification.energyClassAfter === "string")?.modification.energyClassAfter as string | undefined || baseline.energyClass
  };
  const savingsRon = baseline.annualCostRon !== undefined && scenarioValues.annualCostRon !== undefined
    ? baseline.annualCostRon - scenarioValues.annualCostRon
    : undefined;
  const investmentMin = scenario.measures.reduce((sum, measure) => sum + (measure.estimatedCostRonMin || 0), 0) || undefined;
  const investmentMax = scenario.measures.reduce((sum, measure) => sum + (measure.estimatedCostRonMax || 0), 0) || undefined;
  return {
    scenarioId: scenario.id,
    baseline,
    scenario: scenarioValues,
    savings: {
      finalEnergyKwhYear: baseline.finalEnergyKwhYear - scenarioValues.finalEnergyKwhYear,
      primaryEnergyKwhYear: baseline.primaryEnergyKwhYear - scenarioValues.primaryEnergyKwhYear,
      co2KgYear: baseline.co2KgYear - scenarioValues.co2KgYear,
      annualCostRon: savingsRon,
      finalEnergyPercent: finalReduction,
      primaryEnergyPercent: primaryReduction,
      co2Percent: co2Reduction
    },
    economics: {
      investmentCostRonMin: investmentMin,
      investmentCostRonMax: investmentMax,
      simplePaybackYearsMin: savingsRon && investmentMin ? Number((investmentMin / savingsRon).toFixed(1)) : undefined,
      simplePaybackYearsMax: savingsRon && investmentMax ? Number((investmentMax / savingsRon).toFixed(1)) : undefined
    },
    assumptions: [
      "v0.7 simuleaza scenarii prin modificari procentuale configurabile pe masuri.",
      "Urmatorul pas este ca fiecare masura sa modifice modelul fizic si sa reruleze envelope/demand/systems complet.",
      ...scenario.measures.map(measure => `${measure.id}: ${measure.type}`)
    ],
    confidence: confidenceMin(scenario.measures.map(measure => measure.confidence))
  };
}

export function simulateAuditScenariosV07(scenarios: AuditScenario[], baseline: AuditBaseline): AuditScenarioResult[] {
  return scenarios.map(scenario => simulateAuditScenarioV07(scenario, baseline));
}
