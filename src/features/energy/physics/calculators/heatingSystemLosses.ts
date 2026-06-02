import type { HeatingSystem } from "../model/Systems";
import { calculateTotalSystemEfficiency } from "./systemsLayerV04";
import { pv } from "./resistance";

export function calculateHeatingSystemLosses(heatingDemandKwhYear: number, system: HeatingSystem) {
  const efficiency = calculateTotalSystemEfficiency(system);
  const finalEnergyKwhYear = heatingDemandKwhYear / Math.max(0.1, efficiency.totalSystemEfficiency.value);
  return {
    usefulDemandKwh: heatingDemandKwhYear,
    finalEnergyKwh: Math.round(finalEnergyKwhYear),
    systemEfficiency: efficiency.totalSystemEfficiency,
    lossesKwh: pv(Math.max(0, Math.round(finalEnergyKwhYear - heatingDemandKwhYear)), "kWh/an", ["Pierderi incalzire = energie finala - necesar util."], efficiency.totalSystemEfficiency.confidence),
    assumptions: ["Incalzirea este calculata pe subsisteme: emisie, distributie, stocare, generatie, control."]
  };
}
