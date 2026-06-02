import type { Building } from "../model/Building";
import type { PhysicsValue } from "../model/Material";
import { pv } from "./resistance";

export function estimateCoolingDemand(building: Building): PhysicsValue {
  const cdd = building.climate.coolingDegreeDays?.value ?? 0;
  const value = Math.max(0, building.geometry.heatedAreaM2.value * cdd * 0.04);
  return pv(value, "kWh/an", ["Necesar racire estimativ pentru v0.1."], "low");
}
