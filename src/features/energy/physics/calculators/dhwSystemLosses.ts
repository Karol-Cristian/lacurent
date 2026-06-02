import type { DhwSystemV04 } from "../model/DhwSystem";

export function calculateDhwUsefulDemandFromVolume(system: DhwSystemV04) {
  const occupants = system.occupants || 2;
  const liters = system.dailyHotWaterLitersPerPerson || 45;
  const cold = system.coldWaterTemperatureC ?? 10;
  const hot = system.hotWaterTemperatureC ?? 55;
  const annualLiters = occupants * liters * 365;
  const usefulKwh = annualLiters * 1 * 4.186 * (hot - cold) / 3600;
  return {
    usefulDhwDemandKwhYear: Math.round(usefulKwh),
    assumptions: ["Q_dhw = volum_litri x rho_apa x c_apa x deltaT / 3600."],
    confidence: system.confidence
  };
}

export function calculateDhwSystemLosses(system: DhwSystemV04) {
  const useful = calculateDhwUsefulDemandFromVolume(system);
  const efficiency = system.distributionEfficiency * system.storageEfficiency * system.generationEfficiency;
  const final = useful.usefulDhwDemandKwhYear / Math.max(0.1, efficiency);
  return {
    ...useful,
    finalDhwEnergyKwhYear: Math.round(final),
    fuelCarrier: system.fuelCarrier,
    lossesKwhYear: Math.max(0, Math.round(final - useful.usefulDhwDemandKwhYear)),
    assumptions: [...useful.assumptions, "finalDhwEnergy = usefulDhwDemand / (distribution x storage x generation)."],
    confidence: system.confidence
  };
}
