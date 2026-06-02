import type { AuditScenarioResult } from "../model/AuditScenario";
import type { ClassificationResult } from "../model/Classification";
import type { EnergyAuditResult } from "../model/EnergyAuditResult";
import type { FinalEnergyResult } from "../model/FinalEnergy";
import type { PrimaryEnergyAndCo2Result } from "../model/PrimaryEnergyAndCo2";

export function buildEnergyAuditResultV08(input: {
  buildingId: string;
  envelopeResult: unknown;
  demandResult: unknown;
  finalEnergyResult: FinalEnergyResult;
  primaryEnergyAndCo2Result: PrimaryEnergyAndCo2Result;
  classificationResult: ClassificationResult;
  scenarios: AuditScenarioResult[];
  recommendedScenarioIds?: string[];
  generatedAt?: string;
}): EnergyAuditResult {
  const bestScenario = [...input.scenarios].sort((a, b) => b.savings.primaryEnergyKwhYear - a.savings.primaryEnergyKwhYear)[0];
  const maxSavingsRonYear = Math.max(0, ...input.scenarios.map(item => item.savings.annualCostRon || 0));
  const maxCo2ReductionKgYear = Math.max(0, ...input.scenarios.map(item => item.savings.co2KgYear || 0));
  return {
    buildingId: input.buildingId,
    generatedAt: input.generatedAt || new Date().toISOString(),
    baseline: {
      envelopeResult: input.envelopeResult,
      demandResult: input.demandResult,
      finalEnergyResult: input.finalEnergyResult,
      primaryEnergyAndCo2Result: input.primaryEnergyAndCo2Result,
      classificationResult: input.classificationResult
    },
    scenarios: input.scenarios,
    recommendedScenarioIds: input.recommendedScenarioIds || (bestScenario ? [bestScenario.scenarioId] : []),
    summary: {
      currentEnergyClass: input.classificationResult.estimatedEnergyClass,
      bestScenarioEnergyClass: bestScenario?.scenario.energyClass,
      currentPrimaryEnergyKwhM2Year: input.classificationResult.primaryEnergyKwhM2Year,
      bestScenarioPrimaryEnergyKwhM2Year: bestScenario ? Math.round(bestScenario.scenario.primaryEnergyKwhYear / Math.max(1, input.finalEnergyResult.totalFinalEnergyKwhM2Year.value ? input.finalEnergyResult.totalFinalEnergyKwhYear.value / input.finalEnergyResult.totalFinalEnergyKwhM2Year.value : 1)) : undefined,
      maxSavingsRonYear,
      maxCo2ReductionKgYear
    },
    disclaimer: "Evaluarea este estimativa si nu inlocuieste un certificat de performanta energetica emis de un auditor energetic atestat."
  };
}
