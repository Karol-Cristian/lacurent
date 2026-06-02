import type { PhysicsValue } from "../model/Material";
import { pv } from "./resistance";

export function calculateFinalEnergy(...deliveredUses: PhysicsValue[]): PhysicsValue {
  const value = deliveredUses.reduce((sum, item) => sum + item.value, 0);
  const confidence = deliveredUses.some(item => item.confidence === "low") ? "low" : "medium";
  return pv(value, "kWh/an", ["Energie finala = suma energiilor livrate pe utilizari."], confidence);
}
