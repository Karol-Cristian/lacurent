export const SOLAR_RADIATION_DEFAULTS = {
  unknownOrientationFactor: 0.65,
  defaultGValue: 0.65,
  defaultFrameFactor: 0.8,
  defaultShadingFactor: 0.9,
  source: "internal_estimate",
  confidence: "low" as const,
  assumptions: [
    "Orientarea necunoscuta foloseste un factor mediu.",
    "g-value, frame factor si shading factor sunt preseturi configurabile."
  ]
};
