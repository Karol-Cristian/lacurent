import type { EnergySimulationResult } from "../model/EnergyResult";
import type { PhysicalModelInput } from "./buildPhysicalModel";
import { buildPhysicalModel } from "./buildPhysicalModel";
import { runEnergySimulation } from "./runEnergySimulation";

export function generateEnergyResult(input: PhysicalModelInput): EnergySimulationResult {
  return runEnergySimulation(buildPhysicalModel(input));
}

export function serializeEnergyResult(result: EnergySimulationResult) {
  return {
    heatLossTransmission: result.heatLossTransmission,
    heatLossVentilation: result.heatLossVentilation,
    heatingDemandKwhYear: result.heatingDemandKwhYear,
    finalEnergyKwhYear: result.finalEnergyKwhYear,
    finalEnergyKwhM2Year: result.finalEnergyKwhM2Year,
    primaryEnergyKwhYear: result.primaryEnergyKwhYear,
    primaryEnergyKwhM2Year: result.primaryEnergyKwhM2Year,
    co2KgYear: result.co2KgYear,
    co2KgM2Year: result.co2KgM2Year,
    weakestEnvelopeElements: result.weakestEnvelopeElements,
    assumptions: result.assumptions,
    confidence: result.confidence
  };
}
