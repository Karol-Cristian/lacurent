import type { Building } from "../model/Building";
import type { EnergySimulationResult, WeakEnvelopeElement } from "../model/EnergyResult";
import { FUELS_REGISTRY } from "../registries/fuels.registry";
import { calculateCo2 } from "../calculators/co2";
import { estimateCoolingDemand } from "../calculators/coolingDemand";
import { estimateDhwDemand } from "../calculators/dhwDemand";
import { calculateFinalEnergy } from "../calculators/finalEnergy";
import { calculateHeatingDemand } from "../calculators/heatingDemand";
import { estimateInternalGains } from "../calculators/internalGains";
import { calculatePrimaryEnergy } from "../calculators/primaryEnergy";
import { pv } from "../calculators/resistance";
import { estimateSolarGains } from "../calculators/solarGains";
import { usefulToDeliveredEnergy } from "../calculators/systemLosses";
import { calculateThermalBridgeLoss } from "../calculators/thermalBridgeLoss";
import { calculateTransmissionHeatTransfer } from "../calculators/transmissionHeatTransfer";
import { calculateVentilationHeatTransfer } from "../calculators/ventilationHeatTransfer";

function weakestElements(results: EnergySimulationResult["envelopeResults"]): WeakEnvelopeElement[] {
  return [...results]
    .sort((a, b) => b.heatTransferCoefficientWK.value - a.heatTransferCoefficientWK.value)
    .slice(0, 3)
    .map(element => ({
      elementId: element.elementId,
      name: element.name,
      type: element.type,
      uValueWm2K: Number(element.correctedUValueWm2K.value.toFixed(2)),
      heatTransferCoefficientWK: Number(element.heatTransferCoefficientWK.value.toFixed(1)),
      reason: "Element cu contributie mare la H_transmission."
    }));
}

export function runEnergySimulation(building: Building): EnergySimulationResult {
  const mainZone = building.thermalZones[0];
  const transmission = calculateTransmissionHeatTransfer(building.envelope);
  const bridgeLoss = calculateThermalBridgeLoss(building.thermalBridges);
  const ventilationLoss = calculateVentilationHeatTransfer(mainZone, building.ventilation);
  const totalH = pv(
    transmission.heatTransfer.value + bridgeLoss.value + ventilationLoss.value,
    "W/K",
    ["H_total = H_transmission + H_punti_termice + H_ventilation."],
    [transmission.heatTransfer, bridgeLoss, ventilationLoss].some(item => item.confidence === "low") ? "low" : "medium"
  );
  const gains = pv(
    estimateSolarGains(building).value + estimateInternalGains(building).value,
    "kWh/an",
    ["Aporturi totale = aporturi solare + aporturi interne, cu utilizare partiala in necesarul de incalzire."],
    "low"
  );
  const heatingDemand = calculateHeatingDemand(totalH, building.climate, gains);
  const coolingDemand = estimateCoolingDemand(building);
  const dhwDemand = estimateDhwDemand(building);
  const heatingDelivered = usefulToDeliveredEnergy(heatingDemand, building.heatingSystem);
  const dhwDelivered = pv(
    dhwDemand.value / Math.max(0.1, building.domesticHotWater.seasonalEfficiency.value),
    "kWh/an",
    ["Energie finala ACM = necesar ACM / eficienta sistem ACM."],
    building.domesticHotWater.seasonalEfficiency.confidence
  );
  const finalEnergy = calculateFinalEnergy(heatingDelivered, dhwDelivered, coolingDemand);
  const carrier = FUELS_REGISTRY[building.heatingSystem.fuel]?.finalEnergyCarrier || "electricity";
  const primary = calculatePrimaryEnergy(finalEnergy, carrier);
  const co2 = calculateCo2(finalEnergy, carrier);
  const area = building.geometry.heatedAreaM2.value;
  const assumptions = [
    "Motor fizic v0.1: o singura zona termica incalzita.",
    "Podul este modelat ca zona neincalzita simplificata.",
    "Nu reprezinta calcul MC001 complet si nu emite certificat oficial.",
    ...transmission.heatTransfer.assumptions,
    ...bridgeLoss.assumptions,
    ...ventilationLoss.assumptions,
    ...heatingDemand.assumptions,
    ...primary.assumptions,
    ...co2.assumptions
  ];
  const lowSignals = [
    transmission.heatTransfer,
    bridgeLoss,
    ventilationLoss,
    heatingDemand,
    dhwDemand,
    finalEnergy
  ].filter(item => item.confidence === "low").length;
  const confidenceScore = Math.max(25, 78 - lowSignals * 8);

  return {
    heatLossTransmission: transmission.heatTransfer,
    heatLossVentilation: ventilationLoss,
    thermalBridgeLoss: bridgeLoss,
    totalHeatTransferCoefficient: totalH,
    heatingDemandKwhYear: heatingDemand,
    coolingDemandKwhYear: coolingDemand,
    dhwDemandKwhYear: dhwDemand,
    finalEnergyKwhYear: finalEnergy,
    finalEnergyKwhM2Year: pv(finalEnergy.value / area, "kWh/m2/an", ["Consum specific final = energie finala / aria incalzita."], finalEnergy.confidence),
    primaryEnergyKwhYear: primary,
    primaryEnergyKwhM2Year: pv(primary.value / area, "kWh/m2/an", ["Consum specific primar = energie primara / aria incalzita."], primary.confidence),
    co2KgYear: co2,
    co2KgM2Year: pv(co2.value / area, "kgCO2/m2/an", ["Emisii specifice = emisii totale / aria incalzita."], co2.confidence),
    envelopeResults: transmission.elementResults,
    weakestEnvelopeElements: weakestElements(transmission.elementResults),
    assumptions,
    confidence: {
      level: confidenceScore >= 70 ? "high" : confidenceScore >= 50 ? "medium" : "low",
      score: confidenceScore,
      reasons: lowSignals
        ? ["Mai multe arii, punti termice si valori climatice sunt estimate."]
        : ["Modelul are date suficiente pentru o estimare fizica orientativa."]
    }
  };
}
