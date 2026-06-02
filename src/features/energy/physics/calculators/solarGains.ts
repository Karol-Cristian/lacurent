import type { Building } from "../model/Building";
import type { MonthlyClimateData } from "../model/MonthlyClimate";
import type { PhysicsValue } from "../model/Material";
import type { MonthlySolarGains, SolarGainSurface } from "../model/Gains";
import { SOLAR_RADIATION_DEFAULTS } from "../registries/solarRadiation.registry";
import { pv } from "./resistance";

export function estimateSolarGains(building: Building): PhysicsValue {
  const windowArea = building.envelope
    .filter(element => element.type === "window")
    .reduce((sum, element) => sum + element.areaM2.value, 0);
  const radiation = building.climate.solarRadiationAnnualKwhM2?.value ?? 1100;
  const value = windowArea * radiation * 0.35 * 0.45;
  return pv(value, "kWh/an", ["Aport solar simplificat: aria vitrata x radiatie x factori orientativi."], "low");
}

function radiationForOrientation(month: MonthlyClimateData, orientation: SolarGainSurface["orientation"]): number {
  if (orientation === "unknown") {
    return (month.solarRadiationKwhM2.horizontal || 0) * SOLAR_RADIATION_DEFAULTS.unknownOrientationFactor;
  }
  return month.solarRadiationKwhM2[orientation] ?? month.solarRadiationKwhM2.horizontal ?? 0;
}

export function calculateMonthlySolarGains(
  surfaces: SolarGainSurface[],
  climateMonths: MonthlyClimateData[]
): MonthlySolarGains[] {
  return climateMonths.map(month => {
    const gainsByElement = surfaces.reduce<Record<string, number>>((acc, surface) => {
      const radiation = radiationForOrientation(month, surface.orientation);
      const gain = radiation *
        surface.areaM2 *
        (surface.gValue ?? SOLAR_RADIATION_DEFAULTS.defaultGValue) *
        (surface.frameFactor ?? SOLAR_RADIATION_DEFAULTS.defaultFrameFactor) *
        (surface.shadingFactor ?? SOLAR_RADIATION_DEFAULTS.defaultShadingFactor);
      acc[surface.elementId] = gain;
      return acc;
    }, {});
    const totalSolarGainsKwh = Object.values(gainsByElement).reduce((sum, value) => sum + value, 0);
    return {
      month: month.month,
      gainsByElement,
      totalSolarGainsKwh,
      unit: "kWh",
      source: SOLAR_RADIATION_DEFAULTS.source,
      confidence: SOLAR_RADIATION_DEFAULTS.confidence,
      assumptions: [...SOLAR_RADIATION_DEFAULTS.assumptions, "Qsol = solarRadiation x area x gValue x frameFactor x shadingFactor."]
    };
  });
}
