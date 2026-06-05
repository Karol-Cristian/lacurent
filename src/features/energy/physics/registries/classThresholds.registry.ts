import { ENERGY_CLASS_THRESHOLD_SETS } from "./energyClassThresholds.registry";

export interface EnergyClassThreshold {
  className: "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "G";
  maxPrimaryEnergyKwhM2Year: number;
  source: string;
}

const individualSet = ENERGY_CLASS_THRESHOLD_SETS.find(set => set.buildingType === "residential_individual");

export const CLASS_THRESHOLDS_REGISTRY: EnergyClassThreshold[] = (individualSet?.thresholds || []).map(threshold => ({
  className: threshold.className,
  maxPrimaryEnergyKwhM2Year: threshold.maxInclusive ?? Number.POSITIVE_INFINITY,
  source: individualSet?.source || "user_provided_estimated_primary_energy_thresholds_2026_06_05"
}));
