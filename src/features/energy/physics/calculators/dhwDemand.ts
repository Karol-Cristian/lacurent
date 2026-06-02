import type { Building } from "../model/Building";
import type { PhysicsValue } from "../model/Material";
import { pv } from "./resistance";

export function estimateDhwDemand(building: Building): PhysicsValue {
  const areaBasedOccupants = Math.max(1, Math.round(building.geometry.heatedAreaM2.value / 32));
  const value = areaBasedOccupants * 850;
  return pv(value, "kWh/an", ["ACM estimata din numar orientativ de ocupanti derivat din suprafata."], "low");
}
