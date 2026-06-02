import type { PhysicsValue } from "../model/Material";
import { pv } from "./resistance";

export function calculateTransmittance(resistance: PhysicsValue): PhysicsValue {
  if (!resistance.value || resistance.value <= 0) {
    return pv(0, "W/m2K", ["U nu poate fi calculat fara rezistenta termica pozitiva."], "low");
  }
  return pv(1 / resistance.value, "W/m2K", ["U = 1 / R_total."], resistance.confidence);
}
