import type { Climate } from "../model/Climate";
import type { PhysicsValue } from "../model/Material";

function value(value: number, unit: string, confidence: PhysicsValue["confidence"] = "medium"): PhysicsValue {
  return {
    value,
    unit,
    source: "estimated",
    confidence,
    assumptions: ["Valoare climatica aproximativa; se va inlocui cu tabel climatic configurabil."]
  };
}

export const CLIMATE_REGISTRY: Record<string, Climate> = {
  ro_default: {
    id: "ro_default",
    country: "Romania",
    climateZone: "romania_default",
    designOutdoorTemperatureC: value(-15, "C", "low"),
    averageOutdoorTemperatureHeatingSeasonC: value(4, "C", "low"),
    indoorSetpointHeatingC: value(20, "C"),
    heatingDegreeDays: value(3200, "Kday", "low"),
    coolingDegreeDays: value(180, "Kday", "low"),
    solarRadiationAnnualKwhM2: value(1200, "kWh/m2/an", "low"),
    source: "estimated",
    confidence: "low"
  },
  cluj: {
    id: "cluj",
    country: "Romania",
    county: "Cluj",
    climateZone: "transilvania_deal",
    designOutdoorTemperatureC: value(-18, "C"),
    averageOutdoorTemperatureHeatingSeasonC: value(3, "C"),
    indoorSetpointHeatingC: value(20, "C"),
    heatingDegreeDays: value(3400, "Kday"),
    coolingDegreeDays: value(140, "Kday"),
    solarRadiationAnnualKwhM2: value(1180, "kWh/m2/an", "low"),
    source: "estimated",
    confidence: "medium"
  }
};
