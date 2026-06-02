import type { Climate } from "../model/Climate";
import type { PhysicsCalculation } from "../model/Material";

export function calculateAnnualHeatingDemand(
  hTransmissionWPerK: number,
  hVentilationWPerK: number,
  climate: Climate
): PhysicsCalculation {
  const hdd = climate.heatingDegreeDays.value;
  return {
    value: (hTransmissionWPerK + hVentilationWPerK) * hdd * 24 / 1000,
    unit: "kWh/an",
    source: "internal_estimate",
    confidence: climate.heatingDegreeDays.confidence,
    assumptions: ["Q_H = (H_tr + H_ve) x HDD x 24 / 1000."]
  };
}
