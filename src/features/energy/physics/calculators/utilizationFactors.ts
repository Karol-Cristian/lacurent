export type ThermalMassClass = "light" | "medium" | "heavy" | "unknown";

export function calculateHeatingGainUtilizationFactor({
  heatLossKwh,
  gainsKwh,
  thermalMassClass = "unknown"
}: {
  heatLossKwh: number;
  gainsKwh: number;
  thermalMassClass?: ThermalMassClass;
}): number {
  if (heatLossKwh <= 0 || gainsKwh <= 0) return 0;
  const ratio = gainsKwh / heatLossKwh;
  const massFactor = {
    light: 0.55,
    medium: 0.7,
    heavy: 0.82,
    unknown: 0.7
  }[thermalMassClass];
  return Math.max(0.15, Math.min(0.95, massFactor / (1 + ratio * 0.35)));
}
