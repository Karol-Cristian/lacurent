export const INTERNAL_GAINS_REGISTRY = {
  residential_default: {
    occupantSensibleGainW: 70,
    lightingPowerWPerM2: 2.5,
    appliancePowerWPerM2: 3.0,
    lightingEquivalentHoursPerDay: 4,
    applianceEquivalentHoursPerDay: 8,
    source: "internal_estimate",
    confidence: "low",
    assumptions: [
      "Aporturi interne simplificate pentru locuinte.",
      "Valorile sunt configurabile si pot fi inlocuite cu profiluri orare."
    ]
  }
};
