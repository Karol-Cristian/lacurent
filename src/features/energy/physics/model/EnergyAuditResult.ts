import type { AuditScenarioResult } from "./AuditScenario";
import type { ClassificationResult } from "./Classification";
import type { FinalEnergyResult } from "./FinalEnergy";
import type { PrimaryEnergyAndCo2Result } from "./PrimaryEnergyAndCo2";

export interface EnergyAuditResult {
  buildingId: string;
  generatedAt: string;
  baseline: {
    envelopeResult: unknown;
    demandResult: unknown;
    finalEnergyResult: FinalEnergyResult;
    primaryEnergyAndCo2Result: PrimaryEnergyAndCo2Result;
    classificationResult: ClassificationResult;
  };
  scenarios: AuditScenarioResult[];
  recommendedScenarioIds: string[];
  summary: {
    currentEnergyClass?: string;
    bestScenarioEnergyClass?: string;
    currentPrimaryEnergyKwhM2Year?: number;
    bestScenarioPrimaryEnergyKwhM2Year?: number;
    maxSavingsRonYear?: number;
    maxCo2ReductionKgYear?: number;
  };
  disclaimer: string;
}
