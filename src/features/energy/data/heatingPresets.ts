export const heatingPresets = {
  stove_wood: { estimatedEfficiency: 0.55, quality: "poor" },
  non_condensing_boiler: { estimatedEfficiency: 0.78, quality: "average" },
  condensing_boiler: { estimatedEfficiency: 0.94, quality: "good" },
  heat_pump: { estimatedEfficiency: 2.8, quality: "very_good" },
  electric_radiators: { estimatedEfficiency: 1, quality: "average" }
} as const;
