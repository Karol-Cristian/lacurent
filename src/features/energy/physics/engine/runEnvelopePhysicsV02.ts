import type { Building } from "../model/Building";
import type { PhysicsEnvelopeResult } from "../model/EnergyResult";
import { calculateTransmissionHeatTransfer } from "../calculators/envelopeV02";
import { calculateAnnualHeatingDemand } from "../calculators/heatingDemandV02";
import { calculateVentilationHeatTransfer } from "../calculators/ventilationV02";

function categoryForElementId(elementId: string): string {
  if (elementId.includes("wall")) return "walls";
  if (elementId.includes("roof") || elementId.includes("attic") || elementId.includes("ceiling")) return "roof";
  if (elementId.includes("floor")) return "floor";
  if (elementId.includes("window")) return "windows";
  if (elementId.includes("door")) return "doors";
  return "envelope";
}

export function runEnvelopePhysicsV02(building: Building): PhysicsEnvelopeResult {
  const transmission = calculateTransmissionHeatTransfer(building);
  const ventilation = calculateVentilationHeatTransfer(building);
  const heating = calculateAnnualHeatingDemand(transmission.totalHtrWPerK, ventilation.value, building.climate);
  const area = building.heatedAreaM2 || building.geometry.heatedAreaM2.value;
  const totalHeat = transmission.totalHtrWPerK + ventilation.value;
  const weakestEnvelopeElements = Object.entries(transmission.byElement)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([elementId, heatLoss]) => ({
      elementId,
      category: categoryForElementId(elementId),
      heatLossSharePercent: totalHeat > 0 ? Math.round((heatLoss / totalHeat) * 100) : 0,
      reason: "Contributie ridicata la coeficientul total de transfer termic."
    }));

  return {
    rValuesByElement: transmission.rValuesByElement,
    uValuesByElement: transmission.uValuesByElement,
    correctedUValuesByElement: transmission.correctedUValuesByElement,
    heatTransferByElement: transmission.byElement,
    heatTransferByCategory: transmission.byCategory,
    totalTransmissionHeatTransferWPerK: transmission.totalHtrWPerK,
    totalVentilationHeatTransferWPerK: ventilation.value,
    totalHeatTransferWPerK: totalHeat,
    estimatedHeatingDemandKwhYear: heating.value,
    estimatedHeatingDemandKwhM2Year: area > 0 ? heating.value / area : 0,
    weakestEnvelopeElements,
    assumptions: [...transmission.assumptions, ...ventilation.assumptions, ...heating.assumptions],
    confidence: transmission.confidence === "low" || ventilation.confidence === "low" ? "low" : "medium"
  };
}
