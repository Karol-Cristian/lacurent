import type { ThermalBridge } from "../model/ThermalBridge";
import type { PhysicsValue } from "../model/Material";
import { pv } from "./resistance";

export function calculateThermalBridgeLoss(bridges: ThermalBridge[] = []): PhysicsValue {
  const value = bridges.reduce((sum, bridge) => sum + bridge.lengthM.value * bridge.psiWmK.value, 0);
  const confidence = bridges.some(bridge => bridge.lengthM.confidence === "low" || bridge.psiWmK.confidence === "low")
    ? "low"
    : "medium";
  return pv(value, "W/K", ["H_thermal_bridges = suma(psi x lungime)."], confidence);
}
