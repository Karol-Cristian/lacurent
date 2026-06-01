export const materialPresets = {
  wall: {
    uninsulated_old: { quality: "poor", estimatedUValueWm2K: 1.1 },
    eps_5cm: { quality: "average", estimatedUValueWm2K: 0.55 },
    eps_10cm: { quality: "good", estimatedUValueWm2K: 0.32 },
    eps_15cm: { quality: "very_good", estimatedUValueWm2K: 0.22 }
  },
  roof: {
    uninsulated: { quality: "very_poor", estimatedUValueWm2K: 1.2 },
    insulated_10cm: { quality: "good", estimatedUValueWm2K: 0.28 },
    insulated_20cm: { quality: "very_good", estimatedUValueWm2K: 0.18 }
  },
  windows: {
    single_glazing: { quality: "very_poor", estimatedUValueWm2K: 4.8 },
    old_double_glazing: { quality: "average", estimatedUValueWm2K: 2.7 },
    modern_double_glazing: { quality: "good", estimatedUValueWm2K: 1.4 },
    triple_glazing: { quality: "very_good", estimatedUValueWm2K: 0.9 }
  }
} as const;
