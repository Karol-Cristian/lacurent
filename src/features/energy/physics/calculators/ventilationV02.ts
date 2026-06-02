import type { Building } from "../model/Building";
import type { PhysicsCalculation } from "../model/Material";

function result(value: number, assumptions: string[], confidence: PhysicsCalculation["confidence"] = "medium"): PhysicsCalculation {
  return {
    value,
    unit: "W/K",
    source: "internal_estimate",
    confidence,
    assumptions
  };
}

export function calculateVentilationHeatTransfer(building: Building): PhysicsCalculation {
  const ventilation = building.ventilation;
  const volume = building.heatedVolumeM3 || building.geometry.heatedVolumeM3.value;
  const ach = ventilation.airChangeRateACHValue ?? ventilation.airChangeRateACH?.value;
  const airflow = ventilation.airflowM3PerH ?? ((ach || 0.7) * volume);
  const recovery = ventilation.heatRecoveryEfficiencyValue ?? ventilation.heatRecoveryEfficiency?.value ?? 0;
  return result(
    0.34 * airflow * (1 - recovery),
    [
      "H_ve = 0.34 x airflowM3/h x (1 - heatRecoveryEfficiency).",
      ventilation.airflowM3PerH ? "Debit de aer introdus direct." : "Debit de aer derivat din ACH x volum incalzit."
    ],
    ventilation.source === "user_input" ? "medium" : "low"
  );
}
