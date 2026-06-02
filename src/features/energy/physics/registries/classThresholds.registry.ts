export interface EnergyClassThreshold {
  className: "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "G";
  maxPrimaryEnergyKwhM2Year: number;
  source: "estimated" | "internal_estimate" | "mc001";
}

export const CLASS_THRESHOLDS_REGISTRY: EnergyClassThreshold[] = [
  { className: "A+", maxPrimaryEnergyKwhM2Year: 90, source: "internal_estimate" },
  { className: "A", maxPrimaryEnergyKwhM2Year: 130, source: "internal_estimate" },
  { className: "B", maxPrimaryEnergyKwhM2Year: 180, source: "internal_estimate" },
  { className: "C", maxPrimaryEnergyKwhM2Year: 240, source: "internal_estimate" },
  { className: "D", maxPrimaryEnergyKwhM2Year: 320, source: "internal_estimate" },
  { className: "E", maxPrimaryEnergyKwhM2Year: 420, source: "internal_estimate" },
  { className: "F", maxPrimaryEnergyKwhM2Year: 560, source: "internal_estimate" },
  { className: "G", maxPrimaryEnergyKwhM2Year: Number.POSITIVE_INFINITY, source: "internal_estimate" }
];
