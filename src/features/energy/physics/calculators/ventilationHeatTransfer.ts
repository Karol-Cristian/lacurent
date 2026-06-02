import type { ThermalZone } from "../model/ThermalZone";
import type { VentilationModel } from "../model/Systems";
import type { PhysicsValue } from "../model/Material";
import { pv } from "./resistance";

export function calculateVentilationHeatTransfer(zone: ThermalZone, ventilation: VentilationModel): PhysicsValue {
  const recovery = ventilation.heatRecoveryEfficiency?.value ?? 0;
  const value = 0.34 * ventilation.airChangeRateACH.value * zone.volumeM3.value * (1 - recovery);
  return pv(value, "W/K", ["H_ventilation = 0.34 x n x V x (1 - recuperare)."], ventilation.airChangeRateACH.confidence);
}
