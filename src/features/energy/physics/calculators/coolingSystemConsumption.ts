import type { CoolingSystemV04 } from "../model/CoolingSystem";

export function calculateCoolingSystemConsumption(coolingDemandKwhYear: number, system: CoolingSystemV04) {
  if (!system.present || coolingDemandKwhYear <= 0) {
    return { finalCoolingElectricityKwhYear: 0, assumptions: ["Fara sistem de racire activ sau fara necesar de racire."], confidence: system.confidence };
  }
  const seer = system.seer || system.eer || 3.1;
  return {
    finalCoolingElectricityKwhYear: Math.round(coolingDemandKwhYear / Math.max(0.5, seer)),
    assumptions: ["coolingFinalElectricityKwh = coolingDemandKwh / SEER."],
    confidence: system.seer || system.eer ? system.confidence : "low"
  };
}
