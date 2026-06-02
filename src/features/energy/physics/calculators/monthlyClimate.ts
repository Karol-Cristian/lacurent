import type { ClimateYear, MonthlyClimateResult } from "../model/MonthlyClimate";
import { MONTHLY_CLIMATE_REGISTRY } from "../registries/monthlyClimate.registry";

export function getMonthlyClimate(climateZoneId?: string): MonthlyClimateResult {
  const climate: ClimateYear = MONTHLY_CLIMATE_REGISTRY[climateZoneId || ""] || MONTHLY_CLIMATE_REGISTRY.ro_default;
  return {
    climate,
    source: climate.source,
    confidence: climate.confidence,
    assumptions: climateZoneId && MONTHLY_CLIMATE_REGISTRY[climateZoneId]
      ? [`Date lunare climatice pentru ${climate.locationName || climate.climateZoneId}.`]
      : ["Date climatice lunare fallback Romania default."]
  };
}

export function hoursInMonth(month: number): number {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] || 30;
  return days * 24;
}
