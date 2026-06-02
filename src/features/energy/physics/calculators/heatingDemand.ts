import type { Climate } from "../model/Climate";
import type { PhysicsValue } from "../model/Material";
import { pv } from "./resistance";

export function calculateHeatingDemand(
  totalHeatTransferCoefficient: PhysicsValue,
  climate: Climate,
  gainsKwhYear: PhysicsValue
): PhysicsValue {
  const gross = totalHeatTransferCoefficient.value * climate.heatingDegreeDays.value * 24 / 1000;
  const usableGains = gainsKwhYear.value * 0.5;
  const value = Math.max(0, gross - usableGains);
  return pv(value, "kWh/an", ["Q_heating = H_total x HDD x 24 / 1000 - aporturi utile estimate."], totalHeatTransferCoefficient.confidence);
}
