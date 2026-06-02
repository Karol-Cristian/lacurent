import type { LightingSystem } from "../model/LightingSystem";

const DEFAULT_POWER_WM2: Record<LightingSystem["dominantType"], number> = {
  led: 2.5,
  fluorescent: 5,
  incandescent_halogen: 12,
  mixed: 6,
  unknown: 6
};

export function calculateLightingDemand(system: LightingSystem, areaM2: number) {
  const power = system.installedPowerWPerM2 ?? DEFAULT_POWER_WM2[system.dominantType];
  const hours = system.annualOperatingHours ?? 900;
  return {
    lightingEnergyKwhYear: Math.round(power * areaM2 * hours / 1000),
    assumptions: ["lightingEnergyKwhYear = installedPowerWPerM2 x areaM2 x hoursYear / 1000."],
    confidence: system.installedPowerWPerM2 ? system.confidence || "medium" : "low"
  };
}
