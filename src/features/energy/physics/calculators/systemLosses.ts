import type { HeatingSystem } from "../model/Systems";
import type { PhysicsValue } from "../model/Material";
import { pv } from "./resistance";

export function usefulToDeliveredEnergy(usefulDemand: PhysicsValue, system: HeatingSystem): PhysicsValue {
  const efficiency = system.fuel === "heat_pump"
    ? system.scop?.value || 2.2
    : system.seasonalEfficiency?.value || 0.75;
  const value = usefulDemand.value / Math.max(0.1, efficiency);
  return pv(value, "kWh/an", ["Energie livrata = necesar util / eficienta sezoniera sau SCOP."], system.seasonalEfficiency?.confidence || system.scop?.confidence || "low");
}
