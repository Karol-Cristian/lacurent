import type { Building } from "../model/Building";
import type { EnergyDemandResult } from "../model/EnergyDemand";
import type { SolarGainSurface } from "../model/Gains";
import { buildAnnualEnergyDemandResult } from "../calculators/annualDemand";
import { calculateMonthlyCoolingDemand } from "../calculators/coolingDemandMonthly";
import { calculateMonthlyHeatingDemand } from "../calculators/heatingDemandMonthly";
import { calculateMonthlyInternalGains } from "../calculators/internalGains";
import { getMonthlyClimate } from "../calculators/monthlyClimate";
import { calculateMonthlySolarGains } from "../calculators/solarGains";
import { calculateTransmissionHeatTransfer } from "../calculators/envelopeV02";
import { calculateVentilationHeatTransfer } from "../calculators/ventilationV02";
import { WINDOWS_REGISTRY } from "../registries/windows.registry";

function numberValue(value: number | { value: number } | undefined, fallback = 0): number {
  if (typeof value === "number") return value;
  if (value && typeof value.value === "number") return value.value;
  return fallback;
}

function solarSurfacesFromBuilding(building: Building): SolarGainSurface[] {
  return building.envelope
    .filter(element => element.type === "window")
    .map(element => {
      const windowSystem = element.windowSystemId ? WINDOWS_REGISTRY[element.windowSystemId] : undefined;
      return {
        elementId: element.id,
        areaM2: numberValue(element.areaM2),
        orientation: element.orientation || "unknown",
        tiltDeg: element.tiltDeg,
        gValue: windowSystem?.gValue.value,
        frameFactor: 0.8,
        shadingFactor: 0.9
      };
    });
}

export function runEnergyDemandV03(building: Building): EnergyDemandResult {
  const monthlyClimate = getMonthlyClimate(building.climateZoneId || building.climate.id);
  const transmission = calculateTransmissionHeatTransfer(building);
  const ventilation = calculateVentilationHeatTransfer(building);
  const heatedArea = building.heatedAreaM2 || building.geometry.heatedAreaM2.value;
  const zone = building.thermalZones[0];
  const internal = calculateMonthlyInternalGains({
    heatedAreaM2: heatedArea,
    buildingType: building.buildingType === "apartment" ? "apartment" : building.buildingType === "single_family_house" ? "single_family_house" : "other",
    occupancyProfileId: "residential_default"
  });
  const solar = calculateMonthlySolarGains(solarSurfacesFromBuilding(building), monthlyClimate.climate.months);
  const heatingBalances = calculateMonthlyHeatingDemand({
    climate: monthlyClimate.climate,
    hTransmissionWPerK: transmission.totalHtrWPerK,
    hVentilationWPerK: ventilation.value,
    indoorTemperatureC: zone?.heatingSetpointC || 20,
    internalGains: internal,
    solarGains: solar
  });
  const balances = calculateMonthlyCoolingDemand({
    climate: monthlyClimate.climate,
    balances: heatingBalances,
    coolingSetpointC: zone?.coolingSetpointC || 26,
    hTotalWPerK: transmission.totalHtrWPerK + ventilation.value
  });

  return buildAnnualEnergyDemandResult({
    monthly: balances,
    heatedAreaM2: heatedArea,
    confidence: monthlyClimate.confidence === "low" || transmission.confidence === "low" || ventilation.confidence === "low" ? "low" : "medium",
    assumptions: [
      "Energy Demand v0.3 calculeaza energia necesara spatiului, nu energia finala consumata de sistem.",
      ...monthlyClimate.assumptions,
      ...transmission.assumptions,
      ...ventilation.assumptions,
      ...internal.flatMap(item => item.assumptions).slice(0, 2),
      ...solar.flatMap(item => item.assumptions).slice(0, 2)
    ]
  });
}
