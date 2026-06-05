export const residentialIndividualPrimaryEnergyClassThresholds = [
  { class: "A+", minKwhM2Year: 0, maxKwhM2Year: 91, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "A", minKwhM2Year: 91, maxKwhM2Year: 129, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "B", minKwhM2Year: 129, maxKwhM2Year: 257, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "C", minKwhM2Year: 257, maxKwhM2Year: 390, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "D", minKwhM2Year: 390, maxKwhM2Year: 522, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "E", minKwhM2Year: 522, maxKwhM2Year: 652, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "F", minKwhM2Year: 652, maxKwhM2Year: 783, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "G", minKwhM2Year: 783, maxKwhM2Year: null, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" }
];

export const residentialCollectivePrimaryEnergyClassThresholds = [
  { class: "A+", minKwhM2Year: 0, maxKwhM2Year: 73, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "A", minKwhM2Year: 73, maxKwhM2Year: 101, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "B", minKwhM2Year: 101, maxKwhM2Year: 198, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "C", minKwhM2Year: 198, maxKwhM2Year: 297, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "D", minKwhM2Year: 297, maxKwhM2Year: 396, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "E", minKwhM2Year: 396, maxKwhM2Year: 495, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "F", minKwhM2Year: 495, maxKwhM2Year: 595, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" },
  { class: "G", minKwhM2Year: 595, maxKwhM2Year: null, source: "MC001-2022", sourceStatus: "user_provided_reference_values", requiresOfficialVerification: true, implementationStatus: "ready_for_registry_but_not_official_certificate" }
];

const COMMON_ASSUMPTIONS = [
  "Pragurile sunt pentru clasa estimativa LaCurent pe baza energiei primare specifice anuale.",
  "Rezultatul nu reprezinta certificat energetic oficial.",
  "Valorile au fost introduse manual de utilizator din MC001-2022 si necesita verificare oficiala."
];

function toThresholdSet(id, buildingType, thresholds) {
  return {
    id,
    buildingType,
    metric: "primary_energy_kwh_m2_year",
    unit: "kWh/m2.year",
    source: "MC001-2022",
    sourceStatus: "user_provided_reference_values",
    requiresOfficialVerification: true,
    implementationStatus: "ready_for_registry_but_not_official_certificate",
    confidence: "medium",
    assumptions: COMMON_ASSUMPTIONS,
    thresholds: thresholds.map(threshold => ({
      className: threshold.class,
      minExclusive: threshold.class === "A+" ? undefined : threshold.minKwhM2Year,
      maxInclusive: threshold.maxKwhM2Year ?? undefined,
      unit: "kWh/m2.year",
      buildingType,
      source: threshold.source,
      sourceStatus: threshold.sourceStatus,
      requiresOfficialVerification: threshold.requiresOfficialVerification,
      implementationStatus: threshold.implementationStatus,
      confidence: "medium"
    }))
  };
}

export const ENERGY_CLASS_THRESHOLD_SETS = [
  toThresholdSet("estimated_primary_energy_residential_individual_mc001_like_v1", "residential_individual", residentialIndividualPrimaryEnergyClassThresholds),
  toThresholdSet("estimated_primary_energy_residential_collective_mc001_like_v1", "residential_collective", residentialCollectivePrimaryEnergyClassThresholds)
];

export const CO2_ENVIRONMENTAL_CLASS_TODO = {
  status: "TODO_REFERENCE_VALUE_MISSING",
  reason: "Nu exista inca registry validat pentru praguri de clasa de mediu CO2. Nu inventa praguri CO2."
};
