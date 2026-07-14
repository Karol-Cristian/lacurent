const SCHEMA_VERSION = "mc001-normative-registry-v1";
const R0_BZTU_SOURCE_PACK_CODE = "MC001_R0_BZTU_FORMULA_SOURCE_PACK";
const R2_HTR_SPINE_SOURCE_PACK_CODE =
  "MC001_R2_HTR_TRANSMISSION_SPINE_SOURCE_PACK";
const R2_MONTHLY_TRANSMISSION_SOURCE_PACK_CODE =
  "MC001_R2_MONTHLY_TRANSMISSION_SOURCE_PACK";
const R3_QHND_MONTHLY_SOURCE_PACK_CODE =
  "MC001_R3_QHND_MONTHLY_USEFUL_ENERGY_SOURCE_PACK";
const R4_FIGURE_2_18_HEATING_BRANCH_SOURCE_PACK_CODE =
  "MC001_R4_FIGURE_2_18_HEATING_BRANCH_SOURCE_PACK";
const R5_UTILIZATION_FACTORS_HEATING_SOURCE_PACK_CODE =
  "MC001_R5_UTILIZATION_FACTORS_HEATING_READINESS_SOURCE_PACK";
const R6_GAINS_CAPACITY_TIMECONSTANT_SOURCE_PACK_CODE =
  "MC001_R6_GAINS_CAPACITY_TIMECONSTANT_READINESS_SOURCE_PACK";
const R7_QHND_AMBIGUITY_RESOLUTION_SOURCE_PACK_CODE =
  "MC001_R7_QHND_AMBIGUITY_RESOLUTION_SOURCE_PACK";
const R8_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_SOURCE_PACK_CODE =
  "MC001_R8_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_SOURCE_PACK";
const R9_LONG_UNOCCUPIED_INTERPOLATION_SOURCE_PACK_CODE =
  "MC001_R9_LONG_UNOCCUPIED_INTERPOLATION_SOURCE_PACK";
const R10_HEATING_QHND_VERTICAL_CLOSURE_SOURCE_PACK_CODE =
  "MC001_R10_HEATING_QHND_VERTICAL_CLOSURE_SOURCE_PACK";
const R11_HEATING_INTERMITTENCY_SOURCE_PACK_CODE =
  "MC001_R11_HEATING_INTERMITTENCY_RELATIONS_2_59_TO_2_73_SOURCE_PACK";
const R12_COOLING_QCND_FORMULA_SOURCE_PACK_CODE =
  "MC001_R12_COOLING_QCND_FORMULA_SOURCE_PACK";
const R13_COOLING_UTILIZATION_FACTOR_SOURCE_PACK_CODE =
  "MC001_R13_COOLING_UTILIZATION_FACTOR_SOURCE_PACK";
const R14_COOLING_INTERMITTENCY_SOURCE_PACK_CODE =
  "MC001_R14_COOLING_INTERMITTENCY_RELATIONS_2_74_TO_2_75_SOURCE_PACK";
const R15_ENVELOPE_MATERIALS_RESISTANCE_SOURCE_PACK_CODE =
  "MC001_R15_MATERIALS_AND_THERMAL_RESISTANCE_SOURCE_PACK";
const R16_ENVELOPE_THERMAL_TRANSMITTANCE_SOURCE_PACK_CODE =
  "MC001_R16_THERMAL_TRANSMITTANCE_U_VALUE_SOURCE_PACK";
const R17_ENVELOPE_TRANSMISSION_COEFFICIENTS_SOURCE_PACK_CODE =
  "MC001_R17_ENVELOPE_TRANSMISSION_COEFFICIENTS_SOURCE_PACK";
const R18_ENVELOPE_BOUNDARY_CORRECTIONS_SOURCE_PACK_CODE =
  "MC001_R18_BOUNDARY_CORRECTIONS_SOURCE_PACK";
const R19_CHAPTER_2_COMPLETE_USEFUL_DEMAND_COVERAGE_SOURCE_PACK_CODE =
  "MC001_R19_CHAPTER_2_COMPLETE_USEFUL_DEMAND_COVERAGE_SOURCE_PACK";
const R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE =
  "MC001_R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX";
const SOURCE_PACK_TYPE = "formula_backed_normative_source_pack";
const READINESS_SOURCE_PACK_TYPE = "metadata_only_normative_readiness_source_pack";
const R0_VERIFICATION_STATUS = "human_verified_from_official_pdf";
const R2_VERIFICATION_STATUS = "human_verified_from_official_pdf_visual_review";
const IMPLEMENTATION_STATUS = "registry_ready_not_calculator_ready";
const REGISTRY_STATUS = "pilot_registry_with_verified_bztu_source_pack";
const METHODOLOGY_CODE = "MC001";
const METHODOLOGY_VERSION = "2022";
const TECHNICAL_REGULATION_CODE = "Mc 001-2022";
const OFFICIAL_SOURCE_TYPE = "official_normative_document";
const BZTU_DEFAULT_CANDIDATE_CODE =
  "bztu_default_values_with_internal_or_solar_gains";
const C_ZTU_VE_CONSTANT_CODE = "MC001_2_24_C_ZTU_VE_RECOMMENDED";

const ALLOWED_STATUSES = new Set(["valid", "blocked", "found"]);
const ALLOWED_SEVERITIES = new Set(["info", "warning", "blocking"]);
const ALLOWED_BLOCKER_CODES = new Set([
  "blocked_invalid_registry",
  "blocked_invalid_schema_version",
  "blocked_invalid_methodology_metadata",
  "blocked_invalid_official_document_metadata",
  "blocked_invalid_source_pack",
  "blocked_unknown_source_pack_code",
  "blocked_invalid_source_scope",
  "blocked_invalid_verification_status",
  "blocked_invalid_implementation_status",
  "blocked_invalid_concept",
  "blocked_invalid_zone_type",
  "blocked_invalid_entry",
  "blocked_unknown_entry_code",
  "blocked_invalid_formula",
  "blocked_unknown_formula_code",
  "blocked_invalid_formula_code",
  "blocked_invalid_relation_code",
  "blocked_invalid_formula_unit",
  "blocked_invalid_source_locator",
  "blocked_invalid_constant",
  "blocked_invalid_figure",
  "blocked_invalid_distribution_rule",
  "blocked_invalid_applicability_rule",
  "blocked_invalid_default_value_candidate",
  "blocked_unknown_default_value_candidate_code",
  "blocked_default_numeric_values_not_available",
  "blocked_unsafe_private_content",
  "blocked_mutation_not_allowed"
]);

const SOURCE_PACK_CODES = new Set([
  R0_BZTU_SOURCE_PACK_CODE,
  R2_HTR_SPINE_SOURCE_PACK_CODE,
  R2_MONTHLY_TRANSMISSION_SOURCE_PACK_CODE,
  R3_QHND_MONTHLY_SOURCE_PACK_CODE,
  R4_FIGURE_2_18_HEATING_BRANCH_SOURCE_PACK_CODE,
  R5_UTILIZATION_FACTORS_HEATING_SOURCE_PACK_CODE,
  R6_GAINS_CAPACITY_TIMECONSTANT_SOURCE_PACK_CODE,
  R7_QHND_AMBIGUITY_RESOLUTION_SOURCE_PACK_CODE,
  R8_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_SOURCE_PACK_CODE,
  R9_LONG_UNOCCUPIED_INTERPOLATION_SOURCE_PACK_CODE,
  R10_HEATING_QHND_VERTICAL_CLOSURE_SOURCE_PACK_CODE,
  R11_HEATING_INTERMITTENCY_SOURCE_PACK_CODE,
  R12_COOLING_QCND_FORMULA_SOURCE_PACK_CODE,
  R13_COOLING_UTILIZATION_FACTOR_SOURCE_PACK_CODE,
  R14_COOLING_INTERMITTENCY_SOURCE_PACK_CODE,
  R15_ENVELOPE_MATERIALS_RESISTANCE_SOURCE_PACK_CODE,
  R16_ENVELOPE_THERMAL_TRANSMITTANCE_SOURCE_PACK_CODE,
  R17_ENVELOPE_TRANSMISSION_COEFFICIENTS_SOURCE_PACK_CODE,
  R18_ENVELOPE_BOUNDARY_CORRECTIONS_SOURCE_PACK_CODE,
  R19_CHAPTER_2_COMPLETE_USEFUL_DEMAND_COVERAGE_SOURCE_PACK_CODE,
  R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE
]);

const ENTRY_CODES = new Set([
  "MC001_CONCEPT_BZTU_CORRECTION_FACTOR",
  "MC001_ZONE_TYPE_ZTUI",
  "MC001_ZONE_TYPE_ZTUE",
  "MC001_FORMULA_2_21_ZTU_MONTHLY_TEMPERATURE",
  "MC001_FORMULA_2_22_BZTU_CORRECTION_FACTOR",
  "MC001_FORMULA_2_23_ZTU_TOTAL_HEAT_TRANSFER",
  "MC001_FORMULA_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER",
  "MC001_CONSTANT_2_24_C_ZTU_VE_RECOMMENDED",
  "MC001_FIGURE_2_8_ZTC_ZTU_DISTRIBUTION_FACTOR",
  "MC001_DISTRIBUTION_RULE_MULTIPLE_ADJACENT_CONDITIONED_ZONES",
  "MC001_DISTRIBUTION_RULE_SINGLE_ADJACENT_CONDITIONED_ZONE",
  "MC001_RULE_BZTU_FORMULA_VALIDITY_LIMIT",
  "MC001_RULE_ADJACENT_UNCONDITIONED_ZONES_REQUIRE_THERMAL_BALANCES",
  "MC001_RULE_ZTU_TEMPERATURE_IGNORES_INTERNAL_AND_SOLAR_GAINS",
  "MC001_DEFAULT_CANDIDATE_BZTU_VALUES_WITH_GAINS",
  "MC001_CONCEPT_HTR_TRANSMISSION_COEFFICIENT",
  "MC001_FORMULA_2_12_HD_DIRECT_TRANSMISSION",
  "MC001_FORMULA_2_13_LINEAR_THERMAL_BRIDGE_PSI",
  "MC001_FORMULA_2_14_TRANSMISSION_HEAT_FLOW",
  "MC001_FORMULA_2_15_HTR_TOTAL_TRANSMISSION",
  "MC001_CONCEPT_MONTHLY_TRANSMISSION_TRANSFER",
  "MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER",
  "MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER",
  "MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT",
  "MC001_FORMULA_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
  "MC001_FORMULA_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT",
  "MC001_RULE_TRANSMISSION_POSITIVE_INTERIOR_TO_EXTERIOR",
  "MC001_RULE_MONTHLY_TRANSMISSION_SEPARATES_GROUND_CONTACT",
  "MC001_CONCEPT_QHND_MONTHLY_USEFUL_ENERGY_DEMAND",
  "MC001_CONCEPT_FIGURE_2_18_HEATING_BRANCH",
  "MC001_CONCEPT_UTILIZATION_FACTORS_HEATING_READINESS",
  "MC001_CONCEPT_GAINS_CAPACITY_TIMECONSTANT_READINESS",
  "MC001_CONCEPT_QHND_AMBIGUITY_RESOLUTION_READINESS",
  "MC001_CONCEPT_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_READINESS",
  "MC001_CONCEPT_LONG_UNOCCUPIED_PERIOD_INTERPOLATION",
  "MC001_CONCEPT_HEATING_QHND_VERTICAL_CLOSURE",
  "MC001_CONCEPT_HEATING_INTERMITTENCY_RELATIONS",
  "MC001_CONCEPT_COOLING_QCND_FORMULA",
  "MC001_CONCEPT_COOLING_UTILIZATION_FACTOR",
  "MC001_CONCEPT_COOLING_INTERMITTENCY_RELATIONS"
]);

const FORMULA_CODES = new Set([
  "MC001_2_21_ZTU_MONTHLY_TEMPERATURE",
  "MC001_2_22_BZTU_CORRECTION_FACTOR",
  "MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER",
  "MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER",
  "MC001_2_12_HD_DIRECT_TRANSMISSION",
  "MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI",
  "MC001_2_14_TRANSMISSION_HEAT_FLOW",
  "MC001_2_15_HTR_TOTAL_TRANSMISSION",
  "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
  "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT"
]);

const R0_FORMULA_CODES = new Set([
  "MC001_2_21_ZTU_MONTHLY_TEMPERATURE",
  "MC001_2_22_BZTU_CORRECTION_FACTOR",
  "MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER",
  "MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER"
]);

const HTR_SPINE_FORMULA_CODES = new Set([
  "MC001_2_12_HD_DIRECT_TRANSMISSION",
  "MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI",
  "MC001_2_14_TRANSMISSION_HEAT_FLOW",
  "MC001_2_15_HTR_TOTAL_TRANSMISSION"
]);

const MONTHLY_TRANSMISSION_FORMULA_CODES = new Set([
  "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
  "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT"
]);

const FORMULA_RELATION_BY_CODE = Object.freeze({
  MC001_2_21_ZTU_MONTHLY_TEMPERATURE: "2.21",
  MC001_2_22_BZTU_CORRECTION_FACTOR: "2.22",
  MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER: "2.23",
  MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER: "2.24",
  MC001_2_12_HD_DIRECT_TRANSMISSION: "2.12",
  MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI: "2.13",
  MC001_2_14_TRANSMISSION_HEAT_FLOW: "2.14",
  MC001_2_15_HTR_TOTAL_TRANSMISSION: "2.15",
  MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND: "2.27",
  MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT: "2.28"
});

const FORMULA_RESULT_UNIT_BY_CODE = Object.freeze({
  MC001_2_21_ZTU_MONTHLY_TEMPERATURE: "degC",
  MC001_2_22_BZTU_CORRECTION_FACTOR: "dimensionless",
  MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER: "W/K",
  MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER: "W/K",
  MC001_2_12_HD_DIRECT_TRANSMISSION: "W/K",
  MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI: "W/(m*K)",
  MC001_2_14_TRANSMISSION_HEAT_FLOW: "W",
  MC001_2_15_HTR_TOTAL_TRANSMISSION: "W/K",
  MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND: "W/K",
  MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT: "W/K"
});

const FORMULA_PAGE_BY_CODE = Object.freeze({
  MC001_2_21_ZTU_MONTHLY_TEMPERATURE: 94,
  MC001_2_22_BZTU_CORRECTION_FACTOR: 95,
  MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER: 95,
  MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER: 96,
  MC001_2_12_HD_DIRECT_TRANSMISSION: 81,
  MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI: 81,
  MC001_2_14_TRANSMISSION_HEAT_FLOW: 81,
  MC001_2_15_HTR_TOTAL_TRANSMISSION: 81,
  MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND: 100,
  MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT: 100
});

const FIGURE_CODES = new Set([
  "MC001_FIGURE_2_8_ZTC_ZTU_DISTRIBUTION_FACTOR",
  "MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER",
  "MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER",
  "MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT"
]);

const FIGURE_PAGE_BY_CODE = Object.freeze({
  MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER: 99,
  MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER: 99,
  MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT: 100
});

const FIGURE_NUMBER_BY_CODE = Object.freeze({
  MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER: "2.10",
  MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER: "2.11",
  MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT: "2.12"
});

const ZONE_TYPE_CODES = new Set(["ztui", "ztue"]);
const APPLICABILITY_RULE_CODES = new Set([
  "bztu_formula_validity_limit",
  "adjacent_unconditioned_zones_require_thermal_balances",
  "ztu_temperature_ignores_internal_and_solar_gains",
  "transmission_positive_from_interior_to_exterior",
  "monthly_transmission_separates_ground_contact"
]);
const R0_APPLICABILITY_RULE_CODES = new Set([
  "bztu_formula_validity_limit",
  "adjacent_unconditioned_zones_require_thermal_balances",
  "ztu_temperature_ignores_internal_and_solar_gains"
]);
const MONTHLY_APPLICABILITY_RULE_CODES = new Set([
  "transmission_positive_from_interior_to_exterior",
  "monthly_transmission_separates_ground_contact"
]);
const DISTRIBUTION_RULE_CODES = new Set([
  "multiple_adjacent_conditioned_zones",
  "single_adjacent_conditioned_zone"
]);
const SOURCE_SCOPE_PAGES = Object.freeze([
  48,
  77,
  79,
  80,
  81,
  82,
  94,
  95,
  96,
  98,
  99,
  100,
  101,
  102,
  103,
  104,
  105,
  106,
  107,
  108,
  109,
  110,
  111,
  112,
  113,
  114,
  115,
  116,
  117,
  118,
  119,
  120,
  121,
  122,
  124,
  125
]);

const PRIVATE_CONTENT_TERMS = Object.freeze([
  "@",
  "+407" + "22111222",
  "person" + "@example.com",
  "john",
  "doe",
  "strada",
  "owner",
  "private",
  "person",
  "record-" + "JohnDoe",
  "record-" + "001",
  "owner-" + "snapshot",
  "private-" + "note",
  "person-" + "name",
  "source" + "Context",
  "source" + "Trace",
  "source" + "Refs",
  "source" + "RecordId",
  "s" + "\u0103" + "licea"
]);

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cloneAndFreeze(value) {
  return deepFreeze(clone(value));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasRequiredString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function blocker(code) {
  const safeCode = ALLOWED_BLOCKER_CODES.has(code)
    ? code
    : "blocked_invalid_registry";
  return Object.freeze({
    code: safeCode,
    severity: "blocking"
  });
}

function resultWithBlocker(code) {
  return Object.freeze({
    status: "blocked",
    blockers: Object.freeze([blocker(code)])
  });
}

function containsPrivateContent(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    return PRIVATE_CONTENT_TERMS.some((term) => (
      normalized.includes(term.toLowerCase())
    ));
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(containsPrivateContent);
  }
  if (!isObject(value)) {
    return true;
  }
  return Object.entries(value).some(([key, child]) => (
    containsPrivateContent(key) || containsPrivateContent(child)
  ));
}

function arraysMatchExactly(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      return false;
    }
  }
  return true;
}

function setMatchesExactly(values, expectedSet) {
  if (!Array.isArray(values) || values.length !== expectedSet.size) {
    return false;
  }
  const seen = new Set();
  for (const value of values) {
    if (!expectedSet.has(value) || seen.has(value)) {
      return false;
    }
    seen.add(value);
  }
  return true;
}

function sourceLocatorLooksValid(locator, expectedPage = null) {
  if (!isObject(locator)) {
    return false;
  }
  if (expectedPage !== null && locator.page !== expectedPage) {
    return false;
  }
  if (typeof locator.page !== "number" || !SOURCE_SCOPE_PAGES.includes(locator.page)) {
    return false;
  }
  return (
    hasRequiredString(locator.subsection) ||
    hasRequiredString(locator.relation) ||
    hasRequiredString(locator.figure)
  );
}

function registrySourcePacks(registry) {
  return Array.isArray(registry?.sourcePacks) ? registry.sourcePacks : [];
}

function findSourcePackByCode(registry, sourcePackCode) {
  return registrySourcePacks(registry).find((sourcePack) => (
    sourcePack.sourcePackCode === sourcePackCode
  ));
}

function countRegistryEntries(registry) {
  const sourcePacks = registrySourcePacks(registry);
  const counts = {
    sourcePacks: sourcePacks.length,
    formulas: 0,
    constants: 0,
    concepts: 0,
    zoneTypes: 0,
    figures: 0,
    distributionRules: 0,
    applicabilityRules: 0,
    defaultValueCandidates: 0
  };
  for (const sourcePack of sourcePacks) {
    const formulas = Array.isArray(sourcePack?.formulas) ? sourcePack.formulas : [];
    const figures = Array.isArray(sourcePack?.figures) ? sourcePack.figures : [];
    counts.formulas += formulas.length;
    counts.concepts += isObject(sourcePack?.concept) ? 1 : 0;
    counts.zoneTypes += Array.isArray(sourcePack?.zoneTypes)
      ? sourcePack.zoneTypes.length
      : 0;
    counts.figures += figures.length;
    counts.applicabilityRules += Array.isArray(sourcePack?.applicabilityRules)
      ? sourcePack.applicabilityRules.length
      : 0;
    counts.defaultValueCandidates += Array.isArray(sourcePack?.defaultValueCandidates)
      ? sourcePack.defaultValueCandidates.length
      : 0;
    for (const formula of formulas) {
      counts.constants += Array.isArray(formula.constants) ? formula.constants.length : 0;
    }
    for (const figure of figures) {
      counts.distributionRules += Array.isArray(figure.rules) ? figure.rules.length : 0;
    }
  }
  return Object.freeze(counts);
}

function expectedCounts() {
  return Object.freeze({
    sourcePacks: 21,
    formulas: 10,
    constants: 1,
    concepts: 15,
    zoneTypes: 2,
    figures: 4,
    distributionRules: 2,
    applicabilityRules: 5,
    defaultValueCandidates: 1
  });
}

const CHAPTER_2_FIRST_PAGE = 41;
const CHAPTER_2_LAST_PAGE = 126;

const CHAPTER_2_ALLOWED_MATRIX_STATUSES = Object.freeze([
  "runtime_implemented",
  "table_machine_encoded",
  "golden_covered",
  "metadata_only_normative_context",
  "not_runtime_applicable",
  "out_of_chapter_2_runtime_scope",
  "ambiguous_source_requires_human_resolution"
]);

const CHAPTER_2_RELATION_NUMBERS = Object.freeze(
  Array.from({ length: 87 }, (_, index) => `2.${index + 1}`)
);
const CHAPTER_2_TABLE_NUMBERS = Object.freeze(
  Array.from({ length: 21 }, (_, index) => `2.${index + 1}`)
);
const CHAPTER_2_FIGURE_NUMBERS = Object.freeze(
  Array.from({ length: 21 }, (_, index) => `2.${index + 1}`)
);

const CHAPTER_2_IMPLEMENTED_RELATIONS = new Set([
  "2.3",
  "2.6",
  "2.7",
  "2.8",
  "2.9",
  "2.10",
  "2.11",
  "2.12",
  "2.13",
  "2.14",
  "2.15",
  "2.21",
  "2.22",
  "2.23",
  "2.24",
  "2.25",
  "2.26",
  "2.27",
  "2.28",
  "2.29",
  "2.30",
  "2.31",
  "2.32",
  "2.33",
  "2.34",
  "2.35",
  "2.55",
  "2.56",
  "2.57",
  "2.58",
  "2.59",
  "2.60",
  "2.61",
  "2.62",
  "2.63",
  "2.64",
  "2.65",
  "2.66",
  "2.67",
  "2.68",
  "2.69",
  "2.70",
  "2.71",
  "2.72",
  "2.73",
  "2.74",
  "2.75",
  "2.76",
  "2.77",
  "2.84",
  "2.85"
]);

const CHAPTER_2_GOLDEN_RELATIONS = new Set([
  "2.3",
  "2.6",
  "2.7",
  "2.8",
  "2.10",
  "2.12",
  "2.15",
  "2.22",
  "2.27",
  "2.28",
  "2.33",
  "2.55",
  "2.56",
  "2.57",
  "2.58",
  "2.59",
  "2.73",
  "2.74",
  "2.75",
  "2.76",
  "2.77",
  "2.84",
  "2.85"
]);

const CHAPTER_2_AMBIGUOUS_RELATIONS = new Set(["2.2", "2.5"]);
const CHAPTER_2_OUT_OF_CURRENT_RUNTIME_RELATIONS = new Set([
  "2.4",
  "2.78",
  "2.79",
  "2.80",
  "2.81",
  "2.82",
  "2.83",
  "2.86",
  "2.87"
]);

const CHAPTER_2_TABLE_MACHINE_ENCODED = new Set(["2.2", "2.11", "2.12", "2.13", "2.19", "2.20"]);
const CHAPTER_2_TABLE_BACKED_NOT_ENCODED = new Set([
  "2.1",
  "2.14",
  "2.15",
  "2.16",
  "2.17",
  "2.21"
]);
const CHAPTER_2_TABLE_RUNTIME_MODULE_BY_NUMBER = new Map([
  ["2.2", "mc001Table2_2MaterialCorrectionCoefficients.mjs"],
  ["2.11", "mc001SurfaceResistanceTables.mjs"],
  ["2.12", "mc001SurfaceResistanceTables.mjs"],
  ["2.13", "mc001SolarTransmissionTable2_13.mjs"],
  ["2.19", "mc001EffectiveInternalHeatCapacityTables.mjs"],
  ["2.20", "mc001EffectiveInternalHeatCapacityTables.mjs"]
]);
const CHAPTER_2_TABLE_TEST_FILE_BY_NUMBER = new Map([
  ["2.2", "mc001Table2_2MaterialCorrectionCoefficients.test.mjs"],
  ["2.11", "mc001SurfaceResistanceTables.test.mjs"],
  ["2.12", "mc001SurfaceResistanceTables.test.mjs"],
  ["2.13", "mc001SolarTransmissionTable2_13.test.mjs"],
  ["2.19", "mc001EffectiveInternalHeatCapacityTables.test.mjs"],
  ["2.20", "mc001EffectiveInternalHeatCapacityTables.test.mjs"]
]);
const CHAPTER_2_NOT_RUNTIME_TABLES = new Set([
  "2.3",
  "2.4",
  "2.5",
  "2.6",
  "2.7",
  "2.8",
  "2.9",
  "2.10",
  "2.18"
]);

function chapter2IntegerRange(first, last) {
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

function chapter2SectionForPage(page) {
  if (page <= 53) return "2.1";
  if (page <= 76) return "2.2-2.3";
  if (page <= 84) return "2.4";
  if (page <= 88) return "2.5";
  if (page <= 96) return "2.6";
  if (page <= 115) return "2.7";
  if (page <= 122) return "2.8";
  if (page <= 124) return "2.9-2.10";
  return "2.11-2.12";
}

function chapter2PageEntry(page) {
  return Object.freeze({
    identifier: `MC001_CH2_PAGE_${page}`,
    type: "page",
    section: chapter2SectionForPage(page),
    page,
    title: `Chapter 2 PDF page ${page} inspected`,
    scope: "shared",
    runtimeRelevance: "source_inventory",
    machineEncodability: "inspection_record",
    implementationStatus: "metadata_only_normative_context",
    sourcePack: R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE,
    inspectionStatus: "inspected",
    extractionMethods: [
      "page.get_text(text)",
      "page.get_text(blocks)",
      "page.get_text(dict)",
      "rendered PNG visual inspection where equations or tables are fragmented"
    ]
  });
}

function chapter2RelationStatus(relationNumber) {
  if (CHAPTER_2_AMBIGUOUS_RELATIONS.has(relationNumber)) {
    return "ambiguous_source_requires_human_resolution";
  }
  if (CHAPTER_2_GOLDEN_RELATIONS.has(relationNumber)) {
    return "golden_covered";
  }
  if (CHAPTER_2_IMPLEMENTED_RELATIONS.has(relationNumber)) {
    return "runtime_implemented";
  }
  if (CHAPTER_2_OUT_OF_CURRENT_RUNTIME_RELATIONS.has(relationNumber)) {
    return "out_of_chapter_2_runtime_scope";
  }
  return "metadata_only_normative_context";
}

function chapter2RelationEntry(relationNumber) {
  const implementationStatus = chapter2RelationStatus(relationNumber);
  return Object.freeze({
    identifier: `MC001_RELATION_${relationNumber.replace(".", "_")}`,
    type: "relation",
    section: relationNumber.localeCompare("2.21", undefined, { numeric: true }) < 0
      ? "2.1-2.5"
      : relationNumber.localeCompare("2.55", undefined, { numeric: true }) < 0
        ? "2.6-2.7"
        : relationNumber.localeCompare("2.78", undefined, { numeric: true }) < 0
          ? "2.8"
          : "2.9-2.12",
    page: null,
    title: `MC001-2022 relation ${relationNumber}`,
    scope: relationNumber.localeCompare("2.55", undefined, { numeric: true }) >= 0
      ? "heating_cooling_useful_demand"
      : "envelope_or_shared",
    dependencies: [],
    units: "see_source_relation",
    runtimeRelevance: CHAPTER_2_IMPLEMENTED_RELATIONS.has(relationNumber)
      ? "runtime_dependency"
      : "classified_not_current_runtime_dependency",
    machineEncodability: CHAPTER_2_AMBIGUOUS_RELATIONS.has(relationNumber)
      ? "ambiguous_after_text_blocks_dict_and_visual_inspection"
      : "classified",
    implementationStatus,
    runtimeModule: CHAPTER_2_IMPLEMENTED_RELATIONS.has(relationNumber)
      ? "chapter_2_runtime_modules"
      : null,
    testFile: CHAPTER_2_IMPLEMENTED_RELATIONS.has(relationNumber)
      ? "focused_physics_tests_or_golden_chapter_2_fixture"
      : null,
    goldenCoverage: CHAPTER_2_GOLDEN_RELATIONS.has(relationNumber),
    sourcePack: R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE,
    remainingBlocker: implementationStatus === "metadata_only_normative_context"
      ? "classified_for_later_domain_specific_runtime_audit"
      : implementationStatus === "ambiguous_source_requires_human_resolution"
        ? "relation_number_not_safely_machine_transcribed_from_local_pdf_extraction"
        : implementationStatus === "out_of_chapter_2_runtime_scope"
          ? "latent_or_free_temperature_indicator_not_part_of_current_QHnd_QCnd_output"
          : null
  });
}

function chapter2TableStatus(tableNumber) {
  if (CHAPTER_2_TABLE_MACHINE_ENCODED.has(tableNumber)) {
    return "table_machine_encoded";
  }
  if (CHAPTER_2_TABLE_BACKED_NOT_ENCODED.has(tableNumber)) {
    return "metadata_only_normative_context";
  }
  if (CHAPTER_2_NOT_RUNTIME_TABLES.has(tableNumber)) {
    return "not_runtime_applicable";
  }
  return "metadata_only_normative_context";
}

function chapter2TableEntry(tableNumber) {
  const implementationStatus = chapter2TableStatus(tableNumber);
  return Object.freeze({
    identifier: `MC001_TABLE_${tableNumber.replace(".", "_")}`,
    type: "table",
    section: "Chapter 2",
    page: null,
    title: `MC001-2022 table ${tableNumber}`,
    scope: tableNumber === "2.2" ? "materials" : "envelope_or_useful_demand",
    dependencies: [],
    units: "see_source_table",
    runtimeRelevance: implementationStatus === "table_machine_encoded"
      ? "runtime_lookup"
      : "classified_table_dependency",
    machineEncodability: implementationStatus === "table_machine_encoded"
      ? "machine_encoded"
      : "not_encoded_in_current_runtime",
    implementationStatus,
    runtimeModule: CHAPTER_2_TABLE_RUNTIME_MODULE_BY_NUMBER.get(tableNumber) ?? null,
    testFile: CHAPTER_2_TABLE_TEST_FILE_BY_NUMBER.get(tableNumber) ?? null,
    goldenCoverage: tableNumber === "2.2",
    sourcePack: R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE,
    remainingBlocker: implementationStatus === "metadata_only_normative_context"
      ? "table_classified_but_not_machine_encoded_in_current_batch"
      : null
  });
}

function chapter2FigureEntry(figureNumber) {
  const implementedFigures = new Set(["2.14", "2.15", "2.18", "2.19"]);
  const implementationStatus = implementedFigures.has(figureNumber)
    ? "golden_covered"
    : "metadata_only_normative_context";
  return Object.freeze({
    identifier: `MC001_FIGURE_${figureNumber.replace(".", "_")}`,
    type: "figure",
    section: "Chapter 2",
    page: null,
    title: `MC001-2022 figure ${figureNumber}`,
    scope: implementedFigures.has(figureNumber)
      ? "QHnd_QCnd_branch_logic"
      : "normative_context",
    dependencies: [],
    units: "not_applicable",
    runtimeRelevance: implementedFigures.has(figureNumber)
      ? "runtime_branch_reference"
      : "classified_figure_context",
    machineEncodability: "classified",
    implementationStatus,
    runtimeModule: implementedFigures.has(figureNumber)
      ? "heating_or_cooling_useful_demand_runtime"
      : null,
    testFile: implementedFigures.has(figureNumber)
      ? "useful_demand_focused_tests"
      : null,
    goldenCoverage: implementedFigures.has(figureNumber),
    sourcePack: R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE,
    remainingBlocker: implementedFigures.has(figureNumber)
      ? null
      : "figure_classified_as_normative_context_not_formula_runtime"
  });
}

const CHAPTER_2_CONDITION_ENTRIES = Object.freeze([
  Object.freeze({
    identifier: "MC001_CH2_CONDITION_NO_HIDDEN_DEFAULTS",
    type: "condition",
    section: "Chapter 2",
    page: null,
    title: "No hidden defaults for Chapter 2 runtime inputs",
    scope: "shared",
    dependencies: [],
    units: "not_applicable",
    runtimeRelevance: "runtime_guardrail",
    machineEncodability: "machine_encoded_as_validation_policy",
    implementationStatus: "runtime_implemented",
    runtimeModule: "chapter_2_runtime_modules",
    testFile: "chapter_2_runtime_tests",
    goldenCoverage: true,
    sourcePack: R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE,
    remainingBlocker: null
  }),
  Object.freeze({
    identifier: "MC001_CH2_CONDITION_EXPLICIT_12_MONTHS",
    type: "condition",
    section: "2.10",
    page: 124,
    title: "Twelve explicit months are required for annual useful-demand aggregation",
    scope: "heating_cooling_useful_demand",
    dependencies: ["monthly_QHnd", "monthly_QCnd"],
    units: "months",
    runtimeRelevance: "runtime_guardrail",
    machineEncodability: "machine_encoded_as_validation_policy",
    implementationStatus: "runtime_implemented",
    runtimeModule: "mc001Chapter2UsefulDemandCalculation.mjs",
    testFile: "mc001Chapter2UsefulDemandCalculation.test.mjs",
    goldenCoverage: true,
    sourcePack: R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE,
    remainingBlocker: null
  }),
  Object.freeze({
    identifier: "MC001_CH2_CONDITION_AIR_LAYER_RESISTANCE_EXTERNAL_SOURCE",
    type: "definition",
    section: "2.4.1",
    page: 78,
    title: "Non-ventilated air-layer resistance Ra is referred to SR EN ISO 6946",
    scope: "envelope",
    dependencies: ["Ra", "heat_flow_direction", "air_layer_thickness"],
    units: "m2K/W",
    runtimeRelevance: "explicit_input_contract_external_reference",
    machineEncodability: "external_SR_EN_ISO_6946_dependency_not_local_MC001_table",
    implementationStatus: "metadata_only_normative_context",
    runtimeModule: "mc001EnvelopePhysicsCalculation.mjs",
    testFile: "mc001EnvelopePhysicsCalculation.test.mjs",
    goldenCoverage: false,
    sourcePack: R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE,
    remainingBlocker: "SR_EN_ISO_6946_air_layer_values_not_fabricated_from_MC001"
  }),
  Object.freeze({
    identifier: "MC001_CH2_CONDITION_EXTERNAL_CLIMATE_DATA",
    type: "definition",
    section: "2.7",
    page: null,
    title: "Monthly climate, irradiation, and duration values remain explicit inputs",
    scope: "shared",
    dependencies: [],
    units: "see_monthly_inputs",
    runtimeRelevance: "explicit_input_contract",
    machineEncodability: "external_or_table_backed_dependency_not_encoded_here",
    implementationStatus: "metadata_only_normative_context",
    runtimeModule: null,
    testFile: "chapter_2_runtime_tests",
    goldenCoverage: false,
    sourcePack: R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE,
    remainingBlocker: "climate_and_solar_defaults_not_fabricated"
  })
]);

const CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX = Object.freeze({
  matrixId: R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE,
  chapter: "Capitolul 2. Anvelopa termica a cladirii",
  sourceAuthority: "MC001-2022 official local PDF",
  pageRange: Object.freeze({
    firstPage: CHAPTER_2_FIRST_PAGE,
    lastPage: CHAPTER_2_LAST_PAGE,
    totalPages: CHAPTER_2_LAST_PAGE - CHAPTER_2_FIRST_PAGE + 1
  }),
  pageInspections: Object.freeze(
    chapter2IntegerRange(CHAPTER_2_FIRST_PAGE, CHAPTER_2_LAST_PAGE).map(chapter2PageEntry)
  ),
  relations: Object.freeze(CHAPTER_2_RELATION_NUMBERS.map(chapter2RelationEntry)),
  tables: Object.freeze(CHAPTER_2_TABLE_NUMBERS.map(chapter2TableEntry)),
  figures: Object.freeze(CHAPTER_2_FIGURE_NUMBERS.map(chapter2FigureEntry)),
  conditions: CHAPTER_2_CONDITION_ENTRIES,
  completionGate: Object.freeze({
    closureStatus: "CHAPTER_2_NOT_CLOSED",
    closureReason:
      "All Chapter 2 pages/items are classified, but runtime-feasible table-backed/default domains remain intentionally unimplemented until source-safe machine encoding is completed.",
    requiredBeforeClosure: Object.freeze([
      "resolve_or_confirm_relation_2_2_gap",
      "resolve_or_confirm_relation_2_5_gap",
      "machine_encode_material_lambda_catalog_tables_if_runtime_safe",
      "machine_encode_remaining_solar_climate_orientation_shading_inputs_if_runtime_safe",
      "machine_encode_or_justify_latent_humidification_relations_2_82_to_2_83",
      "golden_cover_every_newly_implemented_runtime_branch"
    ])
  }),
  completenessMetrics: Object.freeze({
    pagesInspected: CHAPTER_2_LAST_PAGE - CHAPTER_2_FIRST_PAGE + 1,
    relationsClassified: CHAPTER_2_RELATION_NUMBERS.length,
    relationsRuntimeImplemented: CHAPTER_2_IMPLEMENTED_RELATIONS.size,
    tablesClassified: CHAPTER_2_TABLE_NUMBERS.length,
    tablesMachineEncoded: CHAPTER_2_TABLE_MACHINE_ENCODED.size,
    figuresClassified: CHAPTER_2_FIGURE_NUMBERS.length,
    conditionEntriesClassified: CHAPTER_2_CONDITION_ENTRIES.length
  })
});

export const mc001NormativeRegistryV1 = deepFreeze({
  schemaVersion: SCHEMA_VERSION,
  isMc001NormativeRegistry: true,

  registryStatus: REGISTRY_STATUS,

  methodology: {
    methodologyCode: METHODOLOGY_CODE,
    methodologyVersion: METHODOLOGY_VERSION,
    technicalRegulationCode: TECHNICAL_REGULATION_CODE
  },

  officialDocument: {
    title: "Metodologie de calcul al performanței energetice a clădirilor, indicativ Mc 001-2022",
    publication: "Monitorul Oficial al României, Partea I, nr. 46 bis/17.I.2023",
    order: "Ordinul nr. 16/2023",
    sourceType: OFFICIAL_SOURCE_TYPE
  },

  sourcePacks: [
    {
      sourcePackCode: R0_BZTU_SOURCE_PACK_CODE,
      sourcePackType: SOURCE_PACK_TYPE,
      verificationStatus: R0_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,

      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termică a clădirii",
        section: "2.6.2. Zonarea termică",
        subsection: "2.6.2.2. Factori de corecție și de distribuție",
        pagesVerified: [94, 95, 96, 109]
      },

      concept: {
        entryCode: "MC001_CONCEPT_BZTU_CORRECTION_FACTOR",
        entryType: "concept",
        conceptCode: "bztu_correction_factor",
        targetSymbol: "b_ztu,m",
        registryKind: "formula_backed_registry",
        name: "factor de corecție pentru zona neîncălzită / nerăcită / neclimatizată adiacentă",
        unit: "dimensionless",
        purpose: "corectează transferul termic dintre zona climatizată și zona neclimatizată adiacentă",
        appliesTo: [
          "casa_scarii",
          "subsol",
          "pod",
          "alte_spatii_neincalzite_sau_mai_putin_incalzite_adiacente"
        ],
        sourceLocator: {
          page: 95,
          subsection: "2.6.2.2"
        }
      },

      zoneTypes: [
        {
          entryCode: "MC001_ZONE_TYPE_ZTUI",
          entryType: "zone_type",
          zoneTypeCode: "ztui",
          label: "zonă neclimatizată interioară",
          boundaryRule: "frontiera pentru transmisia termică este considerată închiderea exterioară",
          applicability: [
            "proprietatile_termice_si_geometrice_ale_elementelor_exterioare_pot_fi_determinate_mai_precis",
            "aporturile_interne_si_solare_in_spatiul_adiacent_nu_sunt_foarte_mari"
          ],
          sourceLocator: {
            page: 94,
            subsection: "2.6.2.1"
          }
        },
        {
          entryCode: "MC001_ZONE_TYPE_ZTUE",
          entryType: "zone_type",
          zoneTypeCode: "ztue",
          label: "zonă neclimatizată exterioară",
          boundaryRule: "frontiera pentru transmisia căldurii este considerată închiderea interioară",
          applicability: [
            "tipul_de_zona_considerat_de_obicei_daca_nu_sunt_indeplinite_conditiile_pentru_ztui"
          ],
          sourceLocator: {
            page: 94,
            subsection: "2.6.2.1"
          }
        }
      ],

      formulas: [
        {
          entryCode: "MC001_FORMULA_2_21_ZTU_MONTHLY_TEMPERATURE",
          entryType: "formula",
          formulaCode: "MC001_2_21_ZTU_MONTHLY_TEMPERATURE",
          relationCode: "2.21",
          equationText: "theta_ztu,k,H/C,m = theta_int,calc,H/C,ztc,j,m - b_ztu,k,m * (theta_int,calc,H/C,ztc,j,m - theta_e,a,m)",
          result: {
            symbol: "theta_ztu,k,H/C,m",
            unit: "degC",
            meaning: "temperatura medie lunară în zona neîncălzită / nerăcită / neclimatizată"
          },
          sourceLocator: {
            page: 94,
            relation: "2.21",
            subsection: "2.6.2.1"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_22_BZTU_CORRECTION_FACTOR",
          entryType: "formula",
          formulaCode: "MC001_2_22_BZTU_CORRECTION_FACTOR",
          relationCode: "2.22",
          equationText: "b_ztu,m = H_ztu,e,m / H_ztu,tot,m",
          result: {
            symbol: "b_ztu,m",
            unit: "dimensionless",
            meaning: "factorul de corecție pentru zona neîncălzită / nerăcită în luna m"
          },
          sourceLocator: {
            page: 95,
            relation: "2.22",
            subsection: "2.6.2.2"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_23_ZTU_TOTAL_HEAT_TRANSFER",
          entryType: "formula",
          formulaCode: "MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER",
          relationCode: "2.23",
          equationText: "H_ztu,tot,m = sum_j(H_ztc,j,ztu,m) + H_ztu,e,m",
          result: {
            symbol: "H_ztu,tot,m",
            unit: "W/K",
            meaning: "suma coeficienților de transfer termic dintre zona neclimatizată, zonele climatizate alăturate și exterior"
          },
          sourceLocator: {
            page: 95,
            relation: "2.23",
            subsection: "2.6.2.2"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER",
          entryType: "formula",
          formulaCode: "MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER",
          relationCode: "2.24",
          equationText: "H_ztu,e,k,m = (1 + c_ztu,ve) * H_tr,ue,k,m",
          result: {
            symbol: "H_ztu,e,k,m",
            unit: "W/K",
            meaning: "coeficientul de transfer termic între zona neclimatizată și exterior"
          },
          constants: [
            {
              entryCode: "MC001_CONSTANT_2_24_C_ZTU_VE_RECOMMENDED",
              entryType: "constant",
              constantCode: C_ZTU_VE_CONSTANT_CODE,
              symbol: "c_ztu,ve",
              recommendedValue: 0.5,
              unit: "dimensionless",
              meaning: "coeficient care exprimă efectul ventilării prin închiderea exterioară"
            }
          ],
          sourceLocator: {
            page: 96,
            relation: "2.24",
            subsection: "2.6.2.2"
          }
        }
      ],

      figures: [
        {
          entryCode: "MC001_FIGURE_2_8_ZTC_ZTU_DISTRIBUTION_FACTOR",
          entryType: "figure",
          figureCode: "MC001_FIGURE_2_8_ZTC_ZTU_DISTRIBUTION_FACTOR",
          title: "Determinarea factorului de distribuție",
          page: 95,
          status: "source_metadata_only",
          rules: [
            {
              entryCode: "MC001_DISTRIBUTION_RULE_MULTIPLE_ADJACENT_CONDITIONED_ZONES",
              entryType: "distribution_rule",
              caseCode: "multiple_adjacent_conditioned_zones",
              equationText: "F_ztc,i,ztu,m = H_ztc,i,ztu,m / sum_i(H_ztc,i,ztu,m)",
              unit: "dimensionless"
            },
            {
              entryCode: "MC001_DISTRIBUTION_RULE_SINGLE_ADJACENT_CONDITIONED_ZONE",
              entryType: "distribution_rule",
              caseCode: "single_adjacent_conditioned_zone",
              equationText: "F_ztc,ztu,m = 1",
              unit: "dimensionless"
            }
          ],
          sourceLocator: {
            page: 95,
            subsection: "2.6.2.2"
          }
        }
      ],

      applicabilityRules: [
        {
          entryCode: "MC001_RULE_BZTU_FORMULA_VALIDITY_LIMIT",
          entryType: "applicability_rule",
          ruleCode: "bztu_formula_validity_limit",
          ruleText: "Formula de calcul pentru b este valabilă doar dacă zona neîncălzită nu este adiacentă altei zone neîncălzite.",
          sourceLocator: {
            page: 95,
            subsection: "2.6.2.2"
          }
        },
        {
          entryCode: "MC001_RULE_ADJACENT_UNCONDITIONED_ZONES_REQUIRE_THERMAL_BALANCES",
          entryType: "applicability_rule",
          ruleCode: "adjacent_unconditioned_zones_require_thermal_balances",
          ruleText: "În cazul zonelor climatizate aflate în contact cu zone neîncălzite sau mai puțin încălzite sunt necesare bilanțuri termice pentru toate zonele.",
          sourceLocator: {
            page: 95,
            subsection: "2.6.2.1"
          }
        },
        {
          entryCode: "MC001_RULE_ZTU_TEMPERATURE_IGNORES_INTERNAL_AND_SOLAR_GAINS",
          entryType: "applicability_rule",
          ruleCode: "ztu_temperature_ignores_internal_and_solar_gains",
          ruleText: "Temperatura din zona neclimatizată nu ia în considerare efectul aporturilor interne sau solare; acestea se atribuie zonelor climatizate alăturate.",
          sourceLocator: {
            page: 95,
            subsection: "2.6.2.1"
          }
        }
      ],

      defaultValueCandidates: [
        {
          entryCode: "MC001_DEFAULT_CANDIDATE_BZTU_VALUES_WITH_GAINS",
          entryType: "default_value_candidate",
          candidateCode: BZTU_DEFAULT_CANDIDATE_CODE,
          status: "mentioned_but_not_extracted_as_numeric_table",
          page: 109,
          note: "Metodologia spune că pot fi utilizate valori prin lipsă ale bztu,m în funcție de tipul și/sau dimensiunea spațiului neclimatizat adiacent, incluzând efectul aporturilor.",
          implementationDecision: "Nu se introduc valori implicite până nu este identificat și verificat un tabel numeric explicit sau o sursă normativă exactă pentru aceste valori.",
          numericDefaultsAvailable: false,
          sourceLocator: {
            page: 109,
            subsection: "2.7.3"
          }
        }
      ]
    },
    {
      sourcePackCode: R2_HTR_SPINE_SOURCE_PACK_CODE,
      sourcePackType: SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,

      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termică a clădirii",
        section: "2.4. Rezistențe termice",
        pagesVerified: [81, 82],
        relationsVerified: ["2.12", "2.13", "2.14", "2.15"]
      },

      concept: {
        entryCode: "MC001_CONCEPT_HTR_TRANSMISSION_COEFFICIENT",
        entryType: "concept",
        conceptCode: "htr_transmission_coefficient",
        targetSymbol: "H_tr",
        registryKind: "formula_backed_registry",
        name: "coeficient de transfer termic prin transmisie",
        unit: "W/K",
        purpose: "definește coeficientul total de transfer termic prin transmisie al clădirii"
      },

      formulas: [
        {
          entryCode: "MC001_FORMULA_2_12_HD_DIRECT_TRANSMISSION",
          entryType: "formula",
          formulaCode: "MC001_2_12_HD_DIRECT_TRANSMISSION",
          relationCode: "2.12",
          equationText: "H_d = sum_j(U'_j * A_j)",
          result: {
            symbol: "H_d",
            unit: "W/K",
            meaning: "coeficientul de transfer termic direct între spațiile încălzite/răcite și exterior"
          },
          sourceLocator: {
            page: 81,
            relation: "2.12"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_13_LINEAR_THERMAL_BRIDGE_PSI",
          entryType: "formula",
          formulaCode: "MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI",
          relationCode: "2.13",
          equationText: "psi_j = (1 / l_j) * (L_2D - sum_j(U_j * A_j))",
          result: {
            symbol: "psi_j",
            unit: "W/(m*K)",
            meaning: "transmitanța termică liniară a punții termice liniare j"
          },
          sourceLocator: {
            page: 81,
            relation: "2.13"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_14_TRANSMISSION_HEAT_FLOW",
          entryType: "formula",
          formulaCode: "MC001_2_14_TRANSMISSION_HEAT_FLOW",
          relationCode: "2.14",
          equationText: "Phi_tr = H_tr * (theta_i - theta_e)",
          result: {
            symbol: "Phi_tr",
            unit: "W",
            meaning: "fluxul termic disipat prin transmisie prin anvelopa clădirii"
          },
          sourceLocator: {
            page: 81,
            relation: "2.14"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_15_HTR_TOTAL_TRANSMISSION",
          entryType: "formula",
          formulaCode: "MC001_2_15_HTR_TOTAL_TRANSMISSION",
          relationCode: "2.15",
          equationText: "H_tr = H_d + H_g + H_u + H_a",
          result: {
            symbol: "H_tr",
            unit: "W/K",
            meaning: "coeficientul total de transfer termic prin transmisie"
          },
          components: [
            {
              symbol: "H_d",
              meaning: "coeficient de transfer termic direct",
              unit: "W/K"
            },
            {
              symbol: "H_g",
              meaning: "coeficient de transfer termic prin sol",
              unit: "W/K"
            },
            {
              symbol: "H_u",
              meaning: "coeficient de transfer termic prin spații neîncălzite",
              unit: "W/K"
            },
            {
              symbol: "H_a",
              meaning: "coeficient de transfer termic către clădiri adiacente",
              unit: "W/K"
            }
          ],
          sourceLocator: {
            page: 81,
            relation: "2.15"
          }
        }
      ]
    },
    {
      sourcePackCode: R2_MONTHLY_TRANSMISSION_SOURCE_PACK_CODE,
      sourcePackType: SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,

      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termică a clădirii",
        section: "2.7.1. Transferul termic total",
        subsection: "2.7.1.1. Transferul termic prin transmisie",
        pagesVerified: [99, 100],
        figuresVerified: ["2.10", "2.11", "2.12"],
        relationsVerified: ["2.27", "2.28"]
      },

      concept: {
        entryCode: "MC001_CONCEPT_MONTHLY_TRANSMISSION_TRANSFER",
        entryType: "concept",
        conceptCode: "monthly_transmission_transfer",
        registryKind: "formula_backed_registry",
        name: "transfer termic lunar prin transmisie",
        unit: "kWh",
        purpose: "definește transferul termic lunar prin transmisie pentru încălzire/răcire"
      },

      figures: [
        {
          entryCode: "MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER",
          entryType: "figure",
          figureCode: "MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER",
          title: "Transferul total de căldură",
          page: 99,
          status: "source_metadata_only",
          sourceLocator: {
            page: 99,
            figure: "2.10",
            subsection: "2.7.1"
          }
        },
        {
          entryCode: "MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER",
          entryType: "figure",
          figureCode: "MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER",
          title: "Transferul termic total prin transmisie",
          page: 99,
          status: "source_metadata_only",
          note: "Figure 2.11 contains monthly heating/cooling transmission transfer equations. R2 stores figure metadata only; calculator implementation is out of scope.",
          sourceLocator: {
            page: 99,
            figure: "2.11",
            subsection: "2.7.1.1"
          }
        },
        {
          entryCode: "MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT",
          entryType: "figure",
          figureCode: "MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT",
          title: "Coeficientul global de transfer termic prin transmisie",
          page: 100,
          status: "source_metadata_only",
          note: "Figure 2.12 contains element-level transmission coefficient cases. R2 stores figure metadata only; calculator implementation is out of scope.",
          sourceLocator: {
            page: 100,
            figure: "2.12",
            subsection: "2.7.1.1"
          }
        }
      ],

      formulas: [
        {
          entryCode: "MC001_FORMULA_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
          entryType: "formula",
          formulaCode: "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
          relationCode: "2.27",
          equationText: "H_H/C;tr(excl.gf);ztc;m = sum_k(H_H/C;el,k;m) + H_tr;tb;ztc",
          notationAliases: [
            "H_H/C;tr(excl.grnd flr);ztc;m",
            "H_H/C;tr(excl.gf);ztc;m"
          ],
          result: {
            symbol: "H_H/C;tr(excl.gf);ztc;m",
            unit: "W/K",
            meaning: "coeficientul de transfer termic global prin transmisie pentru încălzire/răcire, pentru toate elementele fără legătură cu solul"
          },
          sourceLocator: {
            page: 100,
            relation: "2.27",
            subsection: "2.7.1.1"
          }
        },
        {
          entryCode: "MC001_FORMULA_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT",
          entryType: "formula",
          formulaCode: "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT",
          relationCode: "2.28",
          equationText: "H_tr;tb;zt = sum_k(l_tb;k * Psi_tb;k)",
          result: {
            symbol: "H_tr;tb;zt",
            unit: "W/K",
            meaning: "coeficientul de transfer termic global pentru punțile termice, pentru zona termică zt"
          },
          terms: [
            {
              symbol: "l_tb;k",
              meaning: "lungimea unei punți termice liniare k",
              unit: "m"
            },
            {
              symbol: "Psi_tb;k",
              meaning: "transmitanța termică a unei punți termice liniare k",
              unit: "W/(m*K)"
            }
          ],
          sourceLocator: {
            page: 100,
            relation: "2.28",
            subsection: "2.7.1.1"
          }
        }
      ],

      applicabilityRules: [
        {
          entryCode: "MC001_RULE_TRANSMISSION_POSITIVE_INTERIOR_TO_EXTERIOR",
          entryType: "applicability_rule",
          ruleCode: "transmission_positive_from_interior_to_exterior",
          ruleText: "Prin convenție, transferul de căldură este pozitiv de la interior către exterior; dacă transferul are semn negativ, căldura este adăugată zonei ca aport de căldură.",
          sourceLocator: {
            page: 100,
            subsection: "2.7.1.1"
          }
        },
        {
          entryCode: "MC001_RULE_MONTHLY_TRANSMISSION_SEPARATES_GROUND_CONTACT",
          entryType: "applicability_rule",
          ruleCode: "monthly_transmission_separates_ground_contact",
          ruleText: "Transferul prin transmisie se detaliază separat pentru elementele fără legătură cu solul și pentru elementele în legătură cu solul.",
          sourceLocator: {
            page: 99,
            subsection: "2.7.1.1"
          }
        }
      ]
    },
    {
      sourcePackCode: R3_QHND_MONTHLY_SOURCE_PACK_CODE,
      sourcePackType: READINESS_SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: true,
      runtimeCalculatorStatus: "not_implemented",

      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        section: "2.7. Calculul necesarului de energie pentru climatizare folosind metoda de calcul lunar",
        pagesVerified: [
          98,
          99,
          100,
          101,
          102,
          103,
          104,
          105,
          106,
          107,
          108,
          109,
          110,
          111,
          112,
          113,
          114,
          115,
          116,
          117,
          118,
          119,
          120,
          121,
          124,
          125
        ],
        sectionsVerified: [
          "2.7",
          "2.7.1",
          "2.7.1.1",
          "2.7.1.2",
          "2.7.2",
          "2.7.3",
          "2.7.5",
          "2.7.6",
          "2.8",
          "2.10"
        ],
        figuresVerified: [
          "2.9",
          "2.10",
          "2.13",
          "2.14",
          "2.15",
          "2.16",
          "2.17",
          "2.18",
          "2.19"
        ],
        relationsVerified: [
          "2.29",
          "2.30",
          "2.32",
          "2.33",
          "2.34",
          "2.37",
          "2.38",
          "2.55",
          "2.56",
          "2.57",
          "2.58",
          "2.59",
          "2.67",
          "2.72",
          "2.73",
          "2.74",
          "2.75",
          "2.76",
          "2.77",
          "2.84",
          "2.85"
        ]
      },

      concept: {
        entryCode: "MC001_CONCEPT_QHND_MONTHLY_USEFUL_ENERGY_DEMAND",
        entryType: "concept",
        conceptCode: "monthly_useful_energy_demand_readiness",
        targetSymbol: "QH;nd;ztc;m / QC;nd;ztc;m",
        registryKind: "metadata_only_readiness_registry",
        name: "monthly useful heating and cooling energy demand readiness",
        unit: "kWh",
        purpose: "maps the verified source dependencies needed before implementing monthly useful heating and cooling demand",
        sourceLocator: {
          page: 121,
          figure: "2.18",
          subsection: "2.8.4"
        }
      },

      currentImplementedChain: [
        {
          milestoneCode: "C3",
          scope: "explicit monthly transmission energy",
          status: "implemented_explicit_input_only",
          limitation: "not_QH;nd"
        },
        {
          milestoneCode: "C4",
          scope: "explicit monthly ventilation energy",
          status: "implemented_explicit_input_only",
          limitation: "not_QH;nd"
        },
        {
          milestoneCode: "C5",
          scope: "explicit transmission plus ventilation heat transfer",
          status: "implemented_explicit_input_only",
          limitation: "not_QH;nd"
        }
      ],

      sourceMap: [
        {
          sourceRefCode: "MC001_R3_SOURCE_2_7_MONTHLY_METHOD",
          section: "2.7",
          page: 98,
          topic: "monthly method scope for heating and cooling useful energy"
        },
        {
          sourceRefCode: "MC001_R3_SOURCE_2_7_1_TOTAL_TRANSFER",
          section: "2.7.1",
          page: 100,
          figure: "2.10",
          topic: "total heat transfer as transmission plus ventilation"
        },
        {
          sourceRefCode: "MC001_R3_SOURCE_2_7_2_GAINS",
          section: "2.7.2",
          page: 103,
          figure: "2.13",
          topic: "total gains from internal and solar gains"
        },
        {
          sourceRefCode: "MC001_R3_SOURCE_2_7_5_CAPACITY",
          section: "2.7.5",
          page: 113,
          topic: "effective internal heat capacity for the thermal zone"
        },
        {
          sourceRefCode: "MC001_R3_SOURCE_2_7_6_UTILIZATION",
          section: "2.7.6",
          page: 114,
          figures: ["2.14", "2.15", "2.16", "2.17"],
          relations: ["2.55", "2.56", "2.57", "2.58"],
          topic: "gain and heat-transfer utilization factors"
        },
        {
          sourceRefCode: "MC001_R3_SOURCE_2_8_UNOCCUPIED",
          section: "2.8",
          pages: [117, 118, 119, 120, 121],
          figures: ["2.18", "2.19"],
          relations: ["2.59", "2.67", "2.72", "2.73", "2.74", "2.75", "2.76", "2.77"],
          topic: "intermittent and long unoccupied period handling"
        },
        {
          sourceRefCode: "MC001_R3_SOURCE_2_10_ANNUAL",
          section: "2.10",
          page: 125,
          relations: ["2.84", "2.85"],
          topic: "annual aggregation of monthly useful heating and cooling demand"
        }
      ],

      dependencyGroups: {
        heatTransferTotal: {
          status: "partially_implemented_explicit_input_only",
          implementedReferences: [
            "C3_monthlyTransmissionEnergyResult",
            "C4_ventilationTransferResult",
            "C5_explicitTotalHeatTransferResult"
          ],
          requiredSymbols: ["QH;ht;ztc;m", "QC;ht;ztc;m"],
          sourceReferences: ["figure_2.10", "section_2.7.1"],
          limitation: "C5 is explicit heat transfer only and is not QH;nd or QC;nd"
        },
        heatGains: {
          status: "missing_machine_encoded_gain_method",
          requiredSymbols: [
            "QH;gn;ztc;m",
            "QC;gn;ztc;m",
            "QH;int;ztc;m",
            "QC;int;ztc;m",
            "QH;sol;ztc;m",
            "QC;sol;ztc;m"
          ],
          sourceReferences: ["figure_2.13", "section_2.7.2", "section_2.7.3"],
          implementationPath: "future explicit monthly gains input can precede full internal and solar gain formulas"
        },
        utilizationFactors: {
          status: "missing_machine_encoded_utilization_method",
          requiredSymbols: [
            "etaH;gn;ztc;m",
            "etaC;ht;ztc;m",
            "gammaH;ztc;m",
            "gammaC;ztc;m",
            "aH;ztc;m",
            "aC;ztc;m",
            "tauH;ztc;m",
            "tauC;ztc;m",
            "Cm;eff;ztc"
          ],
          sourceReferences: ["figure_2.14", "figure_2.15", "relations_2.55_to_2.58"],
          implementationPath: "requires explicit heat capacity and transfer coefficients before useful-demand calculation"
        },
        monthlyUsefulDemand: {
          status: "metadata_ready_not_calculator_ready",
          requiredOutputs: [
            "QH;nd;ztc;m",
            "QC;nd;ztc;m",
            "QH;nd;ztc;an",
            "QC;nd;ztc;an"
          ],
          sourceReferences: ["figure_2.18", "figure_2.19", "relations_2.76_to_2.77", "relations_2.84_to_2.85"],
          implementationPath: "future heating-only explicit-input slice may be implemented after formula branch conditions are encoded"
        },
        explicitBlockers: {
          status: "blocked_for_certificate_or_runtime_demand",
          blockers: [
            "certificate_not_ready",
            "not_final_energy_ready",
            "not_primary_energy_ready",
            "not_CO2_ready",
            "not_system_losses_ready",
            "gains_not_fully_implemented",
            "utilization_factors_not_implemented",
            "intermittency_and_unoccupied_periods_not_implemented",
            "latent_humidification_dehumidification_not_implemented"
          ]
        }
      },

      futureImplementationReadiness: {
        safeForFutureImplementation: [
          "explicit_input_heating_monthly_useful_demand_without_long_unoccupied_periods",
          "explicit_input_cooling_monthly_useful_demand_without_long_unoccupied_periods"
        ],
        notYetMachineEncoded: [
          "figure_2.18_branch_conditions",
          "figure_2.19_branch_conditions",
          "long_unoccupied_period_interpolation",
          "intermittent_heating_and_cooling_corrections",
          "latent_humidification_dehumidification"
        ],
        noInventedDefaults: true,
        noRuntimeCalculator: true
      }
    },
    {
      sourcePackCode: R4_FIGURE_2_18_HEATING_BRANCH_SOURCE_PACK_CODE,
      sourcePackType: READINESS_SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: true,
      runtimeCalculatorStatus: "not_implemented",

      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        section: "2.8. Particularitati ale calculului necesarului de energie propriu sistemului",
        subsection: "2.8.4. Corectii pentru perioada de neocupare",
        parentSectionsVerified: ["2.7", "2.7.6", "2.8", "2.8.4", "2.10"],
        pagesVerified: [114, 120, 121, 122, 125],
        figuresVerified: ["2.14", "2.18", "2.19"],
        relationsVerified: ["2.55", "2.57", "2.76", "2.77", "2.84"]
      },

      concept: {
        entryCode: "MC001_CONCEPT_FIGURE_2_18_HEATING_BRANCH",
        entryType: "concept",
        conceptCode: "figure_2_18_heating_branch_readiness",
        targetSymbol: "QH;nd;ztc;m",
        registryKind: "metadata_only_readiness_registry",
        name: "figure 2.18 heating branch readiness",
        unit: "kWh",
        purpose: "transcribes the heating-side branch metadata needed before a future monthly useful heating demand calculator",
        sourceLocator: {
          page: 121,
          figure: "2.18",
          subsection: "2.8.4"
        }
      },

      sourceIdentity: {
        methodologyCode: "MC001",
        methodologyVersion: "2022",
        figureReference: "figure_2.18",
        primaryPage: 121,
        relatedReferences: [
          "section_2.7_monthly_method",
          "section_2.7.6_utilization_factors",
          "figure_2.14_heating_gain_utilization",
          "section_2.8.4_short_unoccupied_periods",
          "relations_2.76_to_2.77_long_unoccupied_periods",
          "relation_2.84_annual_heating_aggregation"
        ]
      },

      heatingBranchSymbols: [
        {
          symbol: "gammaH;ztc;m",
          meaning: "thermal balance ratio for heating mode",
          unit: "dimensionless",
          dependencyOrigin: "source_needed_utilization_factor_spine",
          sourceLocator: {
            page: 121,
            figure: "2.18",
            subsection: "2.8.4"
          }
        },
        {
          symbol: "QH;ht;ztc;m",
          meaning: "total heat transfer for heating mode in the month",
          unit: "kWh",
          dependencyOrigin: "implemented_explicit_transfer_chain_C5_or_explicit_input_required",
          sourceLocator: {
            page: 121,
            figure: "2.18",
            subsection: "2.8.4"
          }
        },
        {
          symbol: "etaH;gn;ztc;m",
          meaning: "gain utilization factor for heating mode",
          unit: "dimensionless",
          dependencyOrigin: "missing_future_source_pack_utilization_factor",
          sourceLocator: {
            page: 114,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          symbol: "QH;gn;ztc;m",
          meaning: "total heat gains for heating mode in the month",
          unit: "kWh",
          dependencyOrigin: "missing_or_explicit_input_only_gains",
          sourceLocator: {
            page: 121,
            figure: "2.18",
            subsection: "2.8.4"
          }
        },
        {
          symbol: "QH;nd;ztc;m",
          meaning: "monthly useful heating energy demand for the thermal zone",
          unit: "kWh",
          dependencyOrigin: "not_implemented_output",
          sourceLocator: {
            page: 121,
            figure: "2.18",
            subsection: "2.8.4"
          }
        }
      ],

      heatingBranchDecisionLogic: [
        {
          branchId: "heating_zero_non_positive_balance_condition",
          branchName: "zero monthly heating demand for non-positive balance condition",
          conditionExpression: "gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0 != 1",
          conditionTranscriptionStatus: "needs_human_visual_review",
          outputExpression: "QH;nd;ztc;m = 0",
          outputSymbol: "QH;nd;ztc;m",
          inputsRequired: ["gammaH;ztc;m", "QH;gn;ztc;m"],
          readinessStatus: "needs_human_visual_review",
          note: "The second clause is visible in figure 2.18 but remains ambiguous enough to block runtime use.",
          sourceLocator: {
            page: 121,
            figure: "2.18",
            subsection: "2.8.4"
          }
        },
        {
          branchId: "heating_zero_high_balance_ratio",
          branchName: "zero monthly heating demand for high thermal balance ratio",
          conditionExpression: "gammaH;ztc;m > 2.0",
          conditionTranscriptionStatus: "verified",
          outputExpression: "QH;nd;ztc;m = 0",
          outputSymbol: "QH;nd;ztc;m",
          inputsRequired: ["gammaH;ztc;m"],
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 121,
            figure: "2.18",
            subsection: "2.8.4"
          }
        },
        {
          branchId: "heating_else_gain_utilization",
          branchName: "monthly useful heating demand with gain utilization",
          conditionExpression: "else",
          conditionTranscriptionStatus: "verified",
          outputExpression: "QH;nd;ztc;m = QH;ht;ztc;m - etaH;gn;ztc;m * QH;gn;ztc;m",
          outputSymbol: "QH;nd;ztc;m",
          inputsRequired: ["QH;ht;ztc;m", "etaH;gn;ztc;m", "QH;gn;ztc;m"],
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 121,
            figure: "2.18",
            subsection: "2.8.4"
          }
        }
      ],

      formulaCandidates: [
        {
          candidateCode: "MC001_R4_FIGURE_2_18_ZERO_NON_POSITIVE_BALANCE",
          relationReference: "figure_2.18",
          relationNumberAvailable: false,
          expressionText: "QH;nd;ztc;m = 0",
          branchId: "heating_zero_non_positive_balance_condition",
          sourceReference: "MC001-2022 page 121 figure 2.18",
          readinessStatus: "needs_human_visual_review",
          sourceLocator: {
            page: 121,
            figure: "2.18",
            subsection: "2.8.4"
          }
        },
        {
          candidateCode: "MC001_R4_FIGURE_2_18_ZERO_HIGH_BALANCE_RATIO",
          relationReference: "figure_2.18",
          relationNumberAvailable: false,
          expressionText: "QH;nd;ztc;m = 0 when gammaH;ztc;m > 2.0",
          branchId: "heating_zero_high_balance_ratio",
          sourceReference: "MC001-2022 page 121 figure 2.18",
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 121,
            figure: "2.18",
            subsection: "2.8.4"
          }
        },
        {
          candidateCode: "MC001_R4_FIGURE_2_18_ELSE_GAIN_UTILIZATION",
          relationReference: "figure_2.18",
          relationNumberAvailable: false,
          expressionText: "QH;nd;ztc;m = QH;ht;ztc;m - etaH;gn;ztc;m * QH;gn;ztc;m",
          branchId: "heating_else_gain_utilization",
          sourceReference: "MC001-2022 page 121 figure 2.18",
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 121,
            figure: "2.18",
            subsection: "2.8.4"
          }
        },
        {
          candidateCode: "MC001_R4_FIGURE_2_14_HEATING_UTILIZATION_DEPENDENCY",
          relationReference: "figure_2.14_and_relations_2.55_2.57",
          relationNumberAvailable: true,
          expressionText: "etaH;gn;ztc;m, gammaH;ztc;m, and aH;ztc;m dependency spine",
          branchId: "heating_else_gain_utilization",
          sourceReference: "MC001-2022 page 114 figure 2.14 relations 2.55 and 2.57",
          readinessStatus: "needs_human_visual_review",
          sourceLocator: {
            page: 114,
            figure: "2.14",
            subsection: "2.7.6"
          }
        }
      ],

      dependencyMatrix: {
        c5ExplicitHeatTransferTotal: {
          status: "implemented",
          source: "C5_explicitTotalHeatTransferResult",
          limitation: "explicit transfer only not QH;nd"
        },
        internalGains: {
          status: "missing_or_explicit_input_only",
          source: "section_2.7.2"
        },
        solarGains: {
          status: "missing_or_explicit_input_only",
          source: "section_2.7.3"
        },
        totalHeatGains: {
          status: "missing_or_explicit_input_only",
          source: "figure_2.13"
        },
        gainUtilizationFactor: {
          status: "missing_source_needed",
          source: "figure_2.14"
        },
        effectiveThermalCapacity: {
          status: "missing_source_needed",
          source: "section_2.7.5"
        },
        timeConstant: {
          status: "missing_source_needed",
          source: "figure_2.14_relations_2.55_to_2.57"
        },
        monthlyHeatingUsefulDemand: {
          status: "not_implemented",
          source: "figure_2.18"
        },
        annualAggregation: {
          status: "not_implemented",
          source: "relation_2.84"
        }
      },

      blockers: [
        "not_runtime_QH;nd",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_CPE_certificate",
        "no_system_losses",
        "utilization_factor_not_implemented",
        "gains_not_implemented",
        "intermittency_and_unoccupied_periods_not_implemented",
        "left_branch_condition_needs_human_visual_review",
        "no_hidden_defaults"
      ],

      futureRuntimeReadiness: {
        canImplementHeatingOnlyRuntime: false,
        recommendedNextMilestone:
          "C6C_continue_source_extraction_for_figure_2.14_utilization_and_figure_2.18_ambiguity",
        reason: "figure 2.18 first branch is ambiguous and utilization-factor dependencies are not fully machine-transcribed",
        requiredBeforeRuntime: [
          "resolve_figure_2.18_first_branch_condition",
          "transcribe_figure_2.14_heating_utilization_factor",
          "source_pack_heating_gains",
          "source_pack_effective_thermal_capacity_and_time_constant"
        ]
      }
    },
    {
      sourcePackCode: R5_UTILIZATION_FACTORS_HEATING_SOURCE_PACK_CODE,
      sourcePackType: READINESS_SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: true,
      runtimeCalculatorStatus: "not_implemented",

      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        section: "2.7.6. Factori de utilizare",
        subsection: "factor de utilizare a aporturilor pentru incalzire",
        parentSectionsVerified: ["2.7", "2.7.5", "2.7.6", "2.8.4"],
        pagesVerified: [112, 113, 116, 120],
        figuresVerified: ["2.14", "2.18"],
        tablesVerified: ["2.19", "2.20"],
        relationsVerified: ["2.55", "2.57"]
      },

      concept: {
        entryCode: "MC001_CONCEPT_UTILIZATION_FACTORS_HEATING_READINESS",
        entryType: "concept",
        conceptCode: "utilization_factors_heating_readiness",
        targetSymbol: "etaH;gn;ztc;m",
        registryKind: "metadata_only_readiness_registry",
        name: "heating utilization factor readiness",
        unit: "dimensionless",
        purpose: "transcribes metadata for heating utilization-factor logic needed before monthly useful heating demand runtime work",
        sourceLocator: {
          page: 113,
          figure: "2.14",
          subsection: "2.7.6"
        }
      },

      sourceIdentity: {
        methodologyCode: "MC001",
        methodologyVersion: "2022",
        primaryFigureReference: "figure_2.14",
        linkedHeatingDemandFigureReference: "figure_2.18",
        relatedReferences: [
          "section_2.7_monthly_method",
          "section_2.7.5_effective_internal_heat_capacity",
          "section_2.7.6_utilization_factors",
          "figure_2.14_heating_gain_utilization",
          "relation_2.55_heating_utilization_parameter",
          "relation_2.57_heating_time_constant",
          "figure_2.18_heating_monthly_useful_demand"
        ]
      },

      heatingUtilizationSymbols: [
        {
          symbol: "QH;ht;ztc;m",
          meaning: "total heat transfer for heating mode in the month",
          unit: "kWh",
          dependencyOrigin: "implemented_or_explicit_input_required",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          symbol: "QH;gn;ztc;m",
          meaning: "total heat gains for heating mode in the month",
          unit: "kWh",
          dependencyOrigin: "explicit_input_required",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          symbol: "gammaH;ztc;m",
          meaning: "thermal balance ratio for heating mode",
          unit: "dimensionless",
          dependencyOrigin: "missing_future_source_pack",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          symbol: "etaH;gn;ztc;m",
          meaning: "gain utilization factor for heating mode",
          unit: "dimensionless",
          dependencyOrigin: "missing_future_source_pack",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          symbol: "tauH;ztc;m",
          meaning: "time constant of the conditioned zone for heating",
          unit: "h",
          dependencyOrigin: "missing_future_source_pack",
          sourceLocator: {
            page: 116,
            relation: "2.57",
            subsection: "2.7.6"
          }
        },
        {
          symbol: "Cm;eff;ztc",
          meaning: "effective internal heat capacity of the conditioned zone",
          unit: "J/K",
          dependencyOrigin: "missing_future_source_pack",
          sourceLocator: {
            page: 112,
            subsection: "2.7.5"
          }
        },
        {
          symbol: "aH;ztc;m",
          meaning: "dimensionless heating utilization parameter",
          unit: "dimensionless",
          dependencyOrigin: "missing_future_source_pack",
          sourceLocator: {
            page: 113,
            relation: "2.55",
            subsection: "2.7.6"
          }
        },
        {
          symbol: "QH;nd;ztc;m",
          meaning: "monthly useful heating energy demand for the thermal zone",
          unit: "kWh",
          dependencyOrigin: "ambiguous_needs_human_review",
          sourceLocator: {
            page: 120,
            figure: "2.18",
            subsection: "2.8.4"
          }
        }
      ],

      utilizationBranchConditions: [
        {
          branchId: "heating_utilization_positive_gamma_not_one",
          conditionExpression: "gammaH;ztc;m > 0 and gammaH;ztc;m != 1",
          outputExpression: "etaH;gn;ztc;m = (1 - gammaH;ztc;m ^ aH;ztc;m) / (1 - gammaH;ztc;m ^ (aH;ztc;m + 1))",
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          branchId: "heating_utilization_gamma_equals_one",
          conditionExpression: "gammaH;ztc;m = 1",
          outputExpression: "etaH;gn;ztc;m = aH;ztc;m / (aH;ztc;m + 1)",
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          branchId: "heating_utilization_non_positive_gamma_positive_gains",
          conditionExpression: "gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0",
          outputExpression: "etaH;gn;ztc;m = 1 / gammaH;ztc;m",
          readinessStatus: "needs_human_visual_review",
          note: "The source figure is legible, but the gamma equal zero edge case requires review before runtime use.",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          branchId: "heating_utilization_negative_gamma_non_positive_gains",
          conditionExpression: "gammaH;ztc;m < 0 and QH;gn;ztc;m <= 0",
          outputExpression: "etaH;gn;ztc;m = 1",
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        }
      ],

      formulaCandidates: [
        {
          candidateCode: "MC001_R5_FIGURE_2_14_GAMMA_H_BALANCE_RATIO",
          relationReference: "figure_2.14",
          relationNumberAvailable: false,
          expressionText: "gammaH;ztc;m = QH;gn;ztc;m / QH;ht;ztc;m",
          sourceReference: "MC001-2022 page 113 figure 2.14",
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          candidateCode: "MC001_R5_FIGURE_2_14_ETA_H_POSITIVE_GAMMA_NOT_ONE",
          relationReference: "figure_2.14",
          relationNumberAvailable: false,
          expressionText: "etaH;gn;ztc;m = (1 - gammaH;ztc;m ^ aH;ztc;m) / (1 - gammaH;ztc;m ^ (aH;ztc;m + 1))",
          branchId: "heating_utilization_positive_gamma_not_one",
          sourceReference: "MC001-2022 page 113 figure 2.14",
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          candidateCode: "MC001_R5_FIGURE_2_14_ETA_H_GAMMA_EQUALS_ONE",
          relationReference: "figure_2.14",
          relationNumberAvailable: false,
          expressionText: "etaH;gn;ztc;m = aH;ztc;m / (aH;ztc;m + 1)",
          branchId: "heating_utilization_gamma_equals_one",
          sourceReference: "MC001-2022 page 113 figure 2.14",
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          candidateCode: "MC001_R5_FIGURE_2_14_ETA_H_NON_POSITIVE_GAMMA_POSITIVE_GAINS",
          relationReference: "figure_2.14",
          relationNumberAvailable: false,
          expressionText: "etaH;gn;ztc;m = 1 / gammaH;ztc;m",
          branchId: "heating_utilization_non_positive_gamma_positive_gains",
          sourceReference: "MC001-2022 page 113 figure 2.14",
          readinessStatus: "needs_human_visual_review",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          candidateCode: "MC001_R5_FIGURE_2_14_ETA_H_NEGATIVE_GAMMA_NON_POSITIVE_GAINS",
          relationReference: "figure_2.14",
          relationNumberAvailable: false,
          expressionText: "etaH;gn;ztc;m = 1",
          branchId: "heating_utilization_negative_gamma_non_positive_gains",
          sourceReference: "MC001-2022 page 113 figure 2.14",
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          candidateCode: "MC001_R5_RELATION_2_55_A_H_PARAMETER",
          relationReference: "2.55",
          relationNumberAvailable: true,
          expressionText: "aH;ztc;m = aH;0 + tauH;ztc;m / tauH;0",
          sourceReference: "MC001-2022 page 113 relation 2.55",
          readinessStatus: "verified_for_future_runtime",
          note: "Reference parameters are source-visible but not encoded as defaults in this readiness pack.",
          sourceLocator: {
            page: 113,
            relation: "2.55",
            subsection: "2.7.6"
          }
        },
        {
          candidateCode: "MC001_R5_RELATION_2_57_TAU_H_TIME_CONSTANT",
          relationReference: "2.57",
          relationNumberAvailable: true,
          expressionText: "tauH;ztc;m = (Cm;eff;ztc / 3600) / (HH;tr(excl.grflr);ztc;m + HH;gr;adj;ztc + HH;ve;ztc;m)",
          sourceReference: "MC001-2022 page 116 relation 2.57",
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 116,
            relation: "2.57",
            subsection: "2.7.6"
          }
        },
        {
          candidateCode: "MC001_R5_TABLES_2_19_2_20_EFFECTIVE_CAPACITY_DEPENDENCY",
          relationReference: "tables_2.19_2.20",
          relationNumberAvailable: false,
          expressionText: "Cm;eff;ztc effective capacity class dependency",
          sourceReference: "MC001-2022 page 112 tables 2.19 and 2.20",
          readinessStatus: "referenced_but_not_transcribed",
          sourceLocator: {
            page: 112,
            subsection: "2.7.5"
          }
        },
        {
          candidateCode: "MC001_R5_FIGURE_2_18_FIRST_BRANCH_REVIEW",
          relationReference: "figure_2.18",
          relationNumberAvailable: false,
          expressionText: "QH;nd;ztc;m = 0 for the first heating branch",
          sourceReference: "MC001-2022 page 120 figure 2.18",
          readinessStatus: "blocked_due_to_ambiguous_figure",
          sourceLocator: {
            page: 120,
            figure: "2.18",
            subsection: "2.8.4"
          }
        }
      ],

      figure218AmbiguityReview: {
        observedConditionText: "gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0 != 1",
        reviewedAgainst: ["MC001-2022 page 120 figure 2.18", "MC001-2022 page 113 figure 2.14"],
        ambiguityType: "visual_or_logical_notation_ambiguity",
        reviewStatus: "unresolved",
        resolutionDecision: "do_not_infer_intended_meaning",
        runtimeImpact: "blocks_heating_QH;nd_runtime_branch_implementation",
        sourceLocator: {
          page: 120,
          figure: "2.18",
          subsection: "2.8.4"
        }
      },

      heatingQhndReadiness: {
        canImplementHeatingOnlyRuntime: false,
        qhHtMonthlyHeatTransferInput: "explicit_input_or_C5_transfer_chain_required",
        qhGnMonthlyHeatGainsInput: "explicit_input_required_until_gains_are_source_packed",
        gammaHFormula: "verified_for_future_runtime",
        etaHGnFormula: "partially_verified_with_zero_edge_review_needed",
        figure218BranchConditions: "blocked_due_to_ambiguous_first_branch",
        qhndFormula: "not_implemented",
        annualAggregation: "not_implemented",
        nextRecommendation:
          "C6D_continue_source_extraction_for_figure_2.18_ambiguity_effective_capacity_and_gains"
      },

      dependencyMatrix: {
        c5ExplicitTransferTotal: {
          status: "implemented",
          limitation: "explicit transfer only not QH;nd"
        },
        qhHtMonthlyInput: {
          status: "explicit_input_only_or_C5_chain",
          source: "figure_2.14"
        },
        internalGains: {
          status: "missing_or_explicit_input_only",
          source: "section_2.7.2"
        },
        solarGains: {
          status: "missing_or_explicit_input_only",
          source: "section_2.7.3"
        },
        totalGainsQhGn: {
          status: "missing_or_explicit_input_only",
          source: "figure_2.14"
        },
        gammaH: {
          status: "verified_for_future_runtime",
          source: "figure_2.14"
        },
        etaHGn: {
          status: "partially_verified_needs_zero_edge_review",
          source: "figure_2.14"
        },
        effectiveCapacityAndTimeConstant: {
          status: "referenced_but_not_runtime_ready",
          source: "section_2.7.5_relation_2.57"
        },
        figure218BranchLogic: {
          status: "blocked_due_to_ambiguous_first_branch",
          source: "figure_2.18"
        },
        qhndRuntime: {
          status: "not_implemented"
        },
        annualQhndAggregation: {
          status: "not_implemented"
        },
        final_energy: {
          status: "blocked"
        },
        primary_energy: {
          status: "blocked"
        },
        co2: {
          status: "blocked"
        },
        cpeCertificate: {
          status: "blocked"
        }
      },

      blockers: [
        "not_runtime_QH;nd",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_CPE_certificate",
        "no_system_losses",
        "gains_not_implemented",
        "no_hidden_defaults",
        "no_normative_default_gains",
        "no_normative_default_capacity",
        "no_default_schedules",
        "intermittency_and_unoccupied_periods_not_implemented",
        "figure_2.18_first_branch_unresolved",
        "figure_2.14_zero_edge_needs_review"
      ]
    },
    {
      sourcePackCode: R6_GAINS_CAPACITY_TIMECONSTANT_SOURCE_PACK_CODE,
      sourcePackType: READINESS_SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: true,
      runtimeCalculatorStatus: "not_implemented",

      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        section:
          "2.7. Calculul necesarului de energie pentru climatizare folosind metoda de calcul lunar",
        subsection:
          "2.7.2 aporturi de caldura, 2.7.3 aporturi solare, 2.7.5 capacitate termica eficace",
        parentSectionsVerified: ["2.7", "2.7.2", "2.7.3", "2.7.5", "2.7.6", "2.8.4"],
        pagesVerified: [103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 116, 120],
        figuresVerified: ["2.13", "2.18"],
        tablesVerified: ["2.19", "2.20"],
        relationsVerified: [
          "2.33",
          "2.34",
          "2.35",
          "2.36",
          "2.37",
          "2.38",
          "2.39",
          "2.50",
          "2.57"
        ]
      },

      concept: {
        entryCode: "MC001_CONCEPT_GAINS_CAPACITY_TIMECONSTANT_READINESS",
        entryType: "concept",
        conceptCode: "gains_capacity_timeconstant_readiness",
        targetSymbol: "QH;gn;ztc;m + Cm;eff;ztc + tauH;ztc;m",
        registryKind: "metadata_only_readiness_registry",
        name: "gains capacity and time constant readiness",
        unit: "metadata_only",
        purpose:
          "maps heat gains, effective capacity, and time-constant dependencies needed before monthly useful heating demand runtime work",
        sourceLocator: {
          page: 103,
          subsection: "2.7.2"
        }
      },

      sourceIdentity: {
        methodologyCode: "MC001",
        methodologyVersion: "2022",
        heatGainsSectionReference: "section_2.7.2",
        solarGainsSectionReference: "section_2.7.3",
        effectiveCapacitySectionReference: "section_2.7.5",
        timeConstantReference: "relation_2.57",
        ambiguityReference: "figure_2.18",
        relatedReferences: [
          "figure_2.13_total_heat_gains",
          "relations_2.33_2.35_internal_gains",
          "relations_2.36_2.39_solar_gains",
          "relation_2.50_opaque_solar_gains",
          "tables_2.19_2.20_effective_capacity",
          "relation_2.57_heating_time_constant",
          "figure_2.18_heating_monthly_useful_demand"
        ]
      },

      heatGainsDependencyMap: [
        {
          symbol: "QH;gn;ztc;m",
          meaning: "total monthly heat gains for heating mode in the conditioned zone",
          unit: "kWh",
          dependencyOrigin: "explicit_input_required",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 103,
            figure: "2.13",
            subsection: "2.7.2"
          }
        },
        {
          symbol: "QC;gn;ztc;m",
          meaning: "total monthly heat gains for cooling mode in the conditioned zone",
          unit: "kWh",
          dependencyOrigin: "missing_future_source_pack",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 103,
            figure: "2.13",
            subsection: "2.7.2"
          }
        },
        {
          symbol: "QH/C;int;ztc;m",
          meaning: "monthly internal gains in the conditioned zone",
          unit: "kWh",
          dependencyOrigin: "explicit_input_required",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 103,
            relation: "2.33",
            subsection: "2.7.2"
          }
        },
        {
          symbol: "QH/C;sol;ztc;m",
          meaning: "monthly solar gains in the conditioned zone",
          unit: "kWh",
          dependencyOrigin: "explicit_input_required",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 104,
            relation: "2.36",
            subsection: "2.7.3"
          }
        }
      ],

      internalGainsDependencyMap: [
        {
          symbol: "QH/C;int;dir;ztc;m",
          meaning: "direct monthly internal gains in the conditioned zone",
          unit: "kWh",
          dependencyOrigin: "explicit_input_required",
          readinessStatus: "verified_for_future_runtime_with_explicit_inputs",
          sourceLocator: {
            page: 103,
            relation: "2.33",
            subsection: "2.7.2"
          }
        },
        {
          symbol: "bztu,k;m",
          meaning: "adjacent unconditioned-zone correction factor used for gains-side adjacent-zone terms",
          unit: "dimensionless",
          dependencyOrigin: "missing_future_source_pack",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 104,
            relation: "2.34",
            subsection: "2.7.2"
          }
        },
        {
          symbol: "Fztc;ztu,k;m",
          meaning: "distribution factor for gains associated with adjacent unconditioned zones",
          unit: "dimensionless",
          dependencyOrigin: "missing_future_source_pack",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 104,
            relation: "2.34",
            subsection: "2.7.2"
          }
        },
        {
          symbol: "fgn;max;H;ztu,k;m",
          meaning: "reduction factor that limits overestimated adjacent-zone heat gains",
          unit: "dimensionless",
          dependencyOrigin: "missing_future_source_pack",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 104,
            relation: "2.34",
            subsection: "2.7.2"
          }
        },
        {
          symbol: "QH/C;spec;int;oc/A/L/WA/HVAC/proc;zt;m",
          meaning:
            "monthly specific internal gains from occupants, appliances, lighting, water, HVAC, and processes",
          unit: "kWh/m2",
          dependencyOrigin: "missing_future_source_pack",
          readinessStatus: "referenced_but_not_transcribed",
          sourceLocator: {
            page: 104,
            relation: "2.35",
            subsection: "2.7.2"
          }
        },
        {
          symbol: "Ause;zt",
          meaning: "useful floor area used to scale direct internal gains",
          unit: "m2",
          dependencyOrigin: "explicit_input_required",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 104,
            relation: "2.35",
            subsection: "2.7.2"
          }
        }
      ],

      solarGainsDependencyMap: [
        {
          symbol: "QH/C;sol;dir;ztc;m",
          meaning: "direct monthly solar gains in the conditioned zone",
          unit: "kWh",
          dependencyOrigin: "explicit_input_required",
          readinessStatus: "verified_for_future_runtime_with_explicit_inputs",
          sourceLocator: {
            page: 104,
            relation: "2.36",
            subsection: "2.7.3"
          }
        },
        {
          symbol: "QH/C;sol;wi;k;m",
          meaning: "monthly solar gains through transparent element k",
          unit: "kWh",
          dependencyOrigin: "missing_future_source_pack",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 105,
            relation: "2.38",
            subsection: "2.7.3"
          }
        },
        {
          symbol: "QH/C;sol;op;k;m",
          meaning: "monthly solar gains through opaque element k",
          unit: "kWh",
          dependencyOrigin: "missing_future_source_pack",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 105,
            relation: "2.38",
            subsection: "2.7.3"
          }
        },
        {
          symbol: "ggl;wi;H/C;m",
          meaning: "monthly mean effective total solar energy transmittance of glazing",
          unit: "dimensionless",
          dependencyOrigin: "missing_future_source_pack",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 105,
            relation: "2.39",
            subsection: "2.7.3"
          }
        },
        {
          symbol: "Hsol;wi;m / Hsol;k;m",
          meaning: "monthly solar irradiation for transparent or opaque element orientation and tilt",
          unit: "kWh/m2",
          dependencyOrigin: "missing_future_source_pack",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 105,
            relation: "2.39",
            subsection: "2.7.3"
          }
        },
        {
          symbol: "Fsh;obst;wi;m / Fsh;obst;k;m",
          meaning: "obstacle shading factor for transparent or opaque solar gains",
          unit: "dimensionless",
          dependencyOrigin: "missing_future_source_pack",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 105,
            relation: "2.39",
            subsection: "2.7.3"
          }
        },
        {
          symbol: "alphaSr;k + Rse;k + Uc;op;k + Ac;k",
          meaning: "opaque solar gain parameters for absorptance, exterior resistance, U-value, and area",
          unit: "source_units",
          dependencyOrigin: "missing_future_source_pack",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 111,
            relation: "2.50",
            subsection: "2.7.3"
          }
        }
      ],

      capacityTimeConstantDependencyMap: [
        {
          symbol: "Cm;eff;ztc",
          meaning: "effective internal heat capacity of the conditioned zone",
          unit: "J/K",
          dependencyOrigin: "explicit_input_required_or_missing_future_source_pack",
          readinessStatus: "tables_referenced_without_encoded_values",
          sourceLocator: {
            page: 112,
            subsection: "2.7.5"
          }
        },
        {
          symbol: "tables 2.19 and 2.20",
          meaning: "effective capacity class/source dependencies for Cm;eff;ztc",
          unit: "source_units",
          dependencyOrigin: "missing_future_source_pack",
          readinessStatus: "referenced_but_not_transcribed",
          sourceLocator: {
            page: 112,
            subsection: "2.7.5"
          }
        },
        {
          symbol: "tauH;ztc;m",
          meaning: "heating time constant for the conditioned zone",
          unit: "h",
          dependencyOrigin: "explicit_input_required_or_missing_future_source_pack",
          readinessStatus: "verified_for_future_runtime_with_explicit_inputs",
          sourceLocator: {
            page: 116,
            relation: "2.57",
            subsection: "2.7.6"
          }
        },
        {
          symbol: "HH;tr(excl.grflr);ztc;m + HH;gr;adj;ztc + HH;ve;ztc;m",
          meaning: "time-constant denominator heat-transfer coefficients",
          unit: "W/K",
          dependencyOrigin: "explicit_input_required_or_C5_chain_plus_ground_adjustment",
          readinessStatus: "source_dependency_only",
          sourceLocator: {
            page: 116,
            relation: "2.57",
            subsection: "2.7.6"
          }
        }
      ],

      formulaCandidates: [
        {
          candidateCode: "MC001_R6_FIGURE_2_13_TOTAL_HEAT_GAINS",
          relationReference: "figure_2.13",
          relationNumberAvailable: false,
          expressionText: "QH;gn;ztc;m = QH;int;ztc;m + QH;sol;ztc;m",
          sourceReference: "MC001-2022 page 103 figure 2.13",
          readinessStatus: "verified_for_future_runtime_with_explicit_inputs",
          sourceLocator: {
            page: 103,
            figure: "2.13",
            subsection: "2.7.2"
          }
        },
        {
          candidateCode: "MC001_R6_RELATION_2_33_INTERNAL_GAINS_SINGLE_ZONE",
          relationReference: "2.33",
          relationNumberAvailable: true,
          expressionText: "QH/C;int;ztc;m = QH/C;int;dir;ztc;m",
          sourceReference: "MC001-2022 page 103 relation 2.33",
          readinessStatus: "verified_for_future_runtime_with_explicit_inputs",
          sourceLocator: {
            page: 103,
            relation: "2.33",
            subsection: "2.7.2"
          }
        },
        {
          candidateCode: "MC001_R6_RELATION_2_34_INTERNAL_GAINS_ZTU_ADJACENT",
          relationReference: "2.34",
          relationNumberAvailable: true,
          expressionText:
            "QH/C;int;ztc;m = QH/C;int;dir;ztc;m + sum_k((1 - bztu,k;m) * Fztc;ztu,k;m * fgn;max;H;ztu,k;m * QH/C;int;dir;ztu,k;m)",
          sourceReference: "MC001-2022 page 104 relation 2.34",
          readinessStatus: "needs_human_visual_review",
          note: "Adjacent-zone bztu/distribution/reduction values are not encoded in this pack.",
          sourceLocator: {
            page: 104,
            relation: "2.34",
            subsection: "2.7.2"
          }
        },
        {
          candidateCode: "MC001_R6_RELATION_2_35_DIRECT_INTERNAL_GAINS_COMPONENTS",
          relationReference: "2.35",
          relationNumberAvailable: true,
          expressionText:
            "QH/C;int;dir;zt;m = (QH/C;spec;int;oc;zt;m + QH/C;spec;int;A;zt;m + QH/C;spec;int;L;zt;m + QH/C;spec;int;WA;zt;m + QH/C;spec;int;HVAC;zt;m + QH/C;spec;int;proc;zt;m) * Ause;zt",
          sourceReference: "MC001-2022 page 104 relation 2.35",
          readinessStatus: "referenced_but_not_transcribed",
          note: "Component source tables, schedules, and category data are source dependencies only.",
          sourceLocator: {
            page: 104,
            relation: "2.35",
            subsection: "2.7.2"
          }
        },
        {
          candidateCode: "MC001_R6_RELATION_2_36_SOLAR_GAINS_SINGLE_ZONE",
          relationReference: "2.36",
          relationNumberAvailable: true,
          expressionText: "QH/C;sol;ztc;m = QH/C;sol;dir;ztc;m",
          sourceReference: "MC001-2022 page 104 relation 2.36",
          readinessStatus: "verified_for_future_runtime_with_explicit_inputs",
          sourceLocator: {
            page: 104,
            relation: "2.36",
            subsection: "2.7.3"
          }
        },
        {
          candidateCode: "MC001_R6_RELATION_2_37_SOLAR_GAINS_ZTU_ADJACENT",
          relationReference: "2.37",
          relationNumberAvailable: true,
          expressionText:
            "QH/C;sol;ztc;m = QH/C;sol;dir;ztc;m + sum_k((1 - bztu,k;m) * Fztc;ztu,k;m * fgn;max;H;ztu,k;m * QH/C;sol;dir;ztu,k;m)",
          sourceReference: "MC001-2022 page 104 relation 2.37",
          readinessStatus: "needs_human_visual_review",
          note: "Adjacent-zone bztu/distribution/reduction values are not encoded in this pack.",
          sourceLocator: {
            page: 104,
            relation: "2.37",
            subsection: "2.7.3"
          }
        },
        {
          candidateCode: "MC001_R6_RELATION_2_38_DIRECT_SOLAR_GAINS_COMPONENTS",
          relationReference: "2.38",
          relationNumberAvailable: true,
          expressionText:
            "QH/C;sol;dir;zt;m = sum_k(QH/C;sol;wi;k;m) + sum_k(QH/C;sol;op;k;m)",
          sourceReference: "MC001-2022 page 105 relation 2.38",
          readinessStatus: "verified_for_future_runtime_with_explicit_inputs",
          sourceLocator: {
            page: 105,
            relation: "2.38",
            subsection: "2.7.3"
          }
        },
        {
          candidateCode: "MC001_R6_RELATION_2_39_TRANSPARENT_SOLAR_GAINS",
          relationReference: "2.39",
          relationNumberAvailable: true,
          expressionText:
            "QH/C;sol;wi;k;m = ggl;wi;H/C;m * Awi * (1 - Ffr;wi) * Fsh;obst;wi;m * Hsol;wi;m - Qsky;wi;m",
          sourceReference: "MC001-2022 page 105 relation 2.39",
          readinessStatus: "verified_for_future_runtime_with_explicit_inputs",
          sourceLocator: {
            page: 105,
            relation: "2.39",
            subsection: "2.7.3"
          }
        },
        {
          candidateCode: "MC001_R6_RELATION_2_50_OPAQUE_SOLAR_GAINS",
          relationReference: "2.50",
          relationNumberAvailable: true,
          expressionText:
            "QH/C;sol;op;k;m = alphaSr;k * Rse;k * Uc;op;k * Ac;k * Fsh;obst;k;m * Hsol;k;m - Qsky;k;m",
          sourceReference: "MC001-2022 page 111 relation 2.50",
          readinessStatus: "verified_for_future_runtime_with_explicit_inputs",
          sourceLocator: {
            page: 111,
            relation: "2.50",
            subsection: "2.7.3"
          }
        },
        {
          candidateCode: "MC001_R6_TABLES_2_19_2_20_EFFECTIVE_CAPACITY_DEPENDENCY",
          relationReference: "tables_2.19_2.20",
          relationNumberAvailable: false,
          expressionText: "Cm;eff;ztc effective capacity table dependency",
          sourceReference: "MC001-2022 page 112 tables 2.19 and 2.20",
          readinessStatus: "referenced_but_not_transcribed",
          note: "Table values are not encoded as runtime defaults.",
          sourceLocator: {
            page: 112,
            subsection: "2.7.5"
          }
        },
        {
          candidateCode: "MC001_R6_RELATION_2_57_HEATING_TIME_CONSTANT",
          relationReference: "2.57",
          relationNumberAvailable: true,
          expressionText:
            "tauH;ztc;m = (Cm;eff;ztc / 3600) / (HH;tr(excl.grflr);ztc;m + HH;gr;adj;ztc + HH;ve;ztc;m)",
          sourceReference: "MC001-2022 page 116 relation 2.57",
          readinessStatus: "verified_for_future_runtime_with_explicit_inputs",
          sourceLocator: {
            page: 116,
            relation: "2.57",
            subsection: "2.7.6"
          }
        }
      ],

      figure218AmbiguityReview: {
        observedConditionText: "gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0 != 1",
        reviewedAgainst: [
          "MC001-2022 page 120 figure 2.18",
          "MC001-2022 page 113 figure 2.14",
          "MC001-2022 section 2.7.2 heat gains references"
        ],
        ambiguityType: "visual_or_logical_notation_ambiguity",
        reviewStatus: "unresolved",
        resolutionDecision: "do_not_infer_intended_meaning",
        runtimeImpact: "blocks_heating_QH;nd_runtime_branch_implementation",
        sourceLocator: {
          page: 120,
          figure: "2.18",
          subsection: "2.8.4"
        }
      },

      heatingQhndReadinessVerdict: {
        canImplementHeatingOnlyRuntime: false,
        qhHtMonthlyHeatTransferInput: "explicit_input_or_C5_transfer_chain_required",
        qhGnMonthlyHeatGainsInput: "explicit_input_possible_but_source_backed_gains_runtime_not_ready",
        gammaHFormula: "verified_for_future_runtime_from_R5",
        etaHGnFormula: "partially_verified_with_zero_edge_review_needed_from_R5",
        effectiveCapacityTimeConstantPath:
          "explicit_input_possible_or_tables_2.19_2.20_future_source_pack_required",
        figure218BranchConditions: "blocked_due_to_ambiguous_first_branch",
        qhndFormula: "not_implemented",
        annualAggregation: "not_implemented",
        nextRecommendation:
          "C6E_continue_source_extraction_or_human_visual_review_before_QHnd_runtime"
      },

      dependencyMatrix: {
        c5ExplicitTransferTotal: {
          status: "implemented",
          limitation: "explicit transfer only not QH;nd"
        },
        qhHtMonthlyInput: {
          status: "explicit_input_only_or_C5_chain",
          source: "C5_explicit_transfer_total"
        },
        internalGains: {
          status: "explicit_input_only_or_missing_future_source_pack",
          source: "section_2.7.2_relations_2.33_to_2.35"
        },
        solarGains: {
          status: "explicit_input_only_or_missing_future_source_pack",
          source: "section_2.7.3_relations_2.36_to_2.39_and_2.50"
        },
        totalGainsQhGn: {
          status: "explicit_input_only_or_missing_future_source_pack",
          source: "figure_2.13"
        },
        gammaH: {
          status: "verified_for_future_runtime",
          source: "R5_figure_2.14"
        },
        etaHGn: {
          status: "partially_verified_needs_zero_edge_review",
          source: "R5_figure_2.14"
        },
        effectiveCapacityCm: {
          status: "explicit_input_only_or_missing_future_source_pack",
          source: "section_2.7.5_tables_2.19_2.20"
        },
        timeConstantTau: {
          status: "verified_for_future_runtime_with_explicit_inputs",
          source: "relation_2.57"
        },
        figure218FirstBranch: {
          status: "blocked_due_to_ambiguous_first_branch",
          source: "figure_2.18"
        },
        qhndRuntime: {
          status: "not_implemented"
        },
        annualQhndAggregation: {
          status: "not_implemented"
        },
        final_energy: {
          status: "blocked"
        },
        primary_energy: {
          status: "blocked"
        },
        co2: {
          status: "blocked"
        },
        cpeCertificate: {
          status: "blocked"
        }
      },

      blockers: [
        "not_runtime_QH;nd",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_CPE_certificate",
        "no_system_losses",
        "no_hidden_defaults",
        "no_normative_default_gains",
        "no_normative_default_solar_data",
        "no_normative_default_capacity",
        "no_default_occupancy_or_schedules",
        "intermittency_and_unoccupied_periods_not_implemented",
        "figure_2.18_first_branch_unresolved",
        "figure_2.14_zero_edge_needs_review",
        "tables_2.19_2.20_not_encoded_as_values",
        "climate_solar_data_missing_future_source_pack"
      ]
    },
    {
      sourcePackCode: R7_QHND_AMBIGUITY_RESOLUTION_SOURCE_PACK_CODE,
      sourcePackType: READINESS_SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: true,
      runtimeCalculatorStatus: "not_implemented",

      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        section:
          "2.7.6 factori de utilizare si 2.8.4 corectii pentru perioada de neocupare",
        subsection: "figure 2.18 heating QH;nd ambiguity resolution",
        parentSectionsVerified: ["2.7", "2.7.6", "2.8.4"],
        pagesVerified: [113, 116, 120],
        figuresVerified: ["2.14", "2.18"],
        relationsVerified: ["2.55", "2.57"],
        adjacentSymbolDefinitionsVerified: [
          "gammaH;ztc;m",
          "QH;ht;ztc;m",
          "QH;gn;ztc;m",
          "etaH;gn;ztc;m",
          "QH;nd;ztc;m"
        ]
      },

      concept: {
        entryCode: "MC001_CONCEPT_QHND_AMBIGUITY_RESOLUTION_READINESS",
        entryType: "concept",
        conceptCode: "qhnd_ambiguity_resolution_readiness",
        targetSymbol: "QH;nd;ztc;m",
        registryKind: "metadata_only_readiness_registry",
        name: "QHnd ambiguity resolution readiness",
        unit: "metadata_only",
        purpose:
          "records source-backed resolution of the figure 2.18 first heating branch before restricted monthly useful heating demand runtime work",
        sourceLocator: {
          page: 120,
          figure: "2.18",
          subsection: "2.8.4"
        }
      },

      sourceIdentity: {
        methodologyCode: "MC001",
        methodologyVersion: "2022",
        primaryFigureReference: "figure_2.18",
        crossCheckFigureReference: "figure_2.14",
        utilizationSectionReference: "section_2.7.6",
        utilizationParameterReference: "relation_2.55",
        timeConstantReference: "relation_2.57",
        relatedReferences: [
          "MC001-2022 page 120 figure 2.18",
          "MC001-2022 page 113 figure 2.14",
          "MC001-2022 page 113 section 2.7.6",
          "MC001-2022 page 113 relation 2.55",
          "MC001-2022 page 116 relation 2.57"
        ],
        adjacentSymbolDefinitionReferences: [
          "QH;gn;ztc;m_total_heat_gains_kWh",
          "QH;ht;ztc;m_heat_transfer_kWh",
          "gammaH;ztc;m_balance_ratio_dimensionless",
          "etaH;gn;ztc;m_gain_utilization_dimensionless",
          "QH;nd;ztc;m_monthly_useful_heating_energy_kWh"
        ]
      },

      figure218FirstBranchReview: {
        visualTranscription: "gammaH;ztc;m <= 0 si QH;gn;ztc;m > 0 \u2260 1",
        classification: "resolved_verified_typographical_artifact",
        resolvedCondition: "gammaH <= 0 && QHgn > 0",
        output: "QHnd = 0",
        runtimeNote:
          "Do not execute this branch in the first restricted runtime unless separate targeted tests are added.",
        sourceBackedReasons: [
          "QH;gn;ztc;m is defined as total heat gains in kWh, so attaching != 1 to QHgn is dimensionally invalid.",
          "gammaH <= 0 already implies gammaH != 1.",
          "figure 2.14 contains the matching edge case gammaH <= 0 and QH;gn;ztc;m > 0 without the trailing artifact.",
          "relation 2.55 defines the heating utilization parameter with no need for the trailing artifact.",
          "the resolved branch is internally consistent with etaH;gn;ztc;m * QH;gn;ztc;m offsetting QH;ht;ztc;m."
        ],
        sourceLocator: {
          page: 120,
          figure: "2.18",
          subsection: "2.8.4"
        }
      },

      figure214EdgeConditionReview: [
        {
          edgeCaseId: "gammaH_non_positive",
          condition: "gammaH <= 0",
          sourceBackedBehavior:
            "figure 2.14 has non-positive gamma branches; figure 2.18 first branch is resolved for positive gains but remains excluded from the first restricted runtime",
          readinessStatus: "resolved_metadata_only_excluded_from_first_runtime",
          includedInFirstRestrictedRuntime: false,
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          edgeCaseId: "gammaH_zero",
          condition: "gammaH = 0",
          sourceBackedBehavior:
            "the etaH;gn = 1 / gammaH edge expression is singular at zero and requires targeted runtime treatment",
          readinessStatus: "excluded_zero_division_edge",
          includedInFirstRestrictedRuntime: false,
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          edgeCaseId: "gammaH_near_zero",
          condition: "gammaH near zero",
          sourceBackedBehavior:
            "near-zero numeric behavior is not a separate MC001 branch and should be excluded until explicit numeric tests exist",
          readinessStatus: "excluded_numerical_edge",
          includedInFirstRestrictedRuntime: false,
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          edgeCaseId: "QHgn_non_positive",
          condition: "QHgn <= 0",
          sourceBackedBehavior:
            "figure 2.14 includes a non-positive gains branch, but first restricted heating runtime should require QHgn >= 0 and gammaH > 0",
          readinessStatus: "excluded_non_positive_gain_edge",
          includedInFirstRestrictedRuntime: false,
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          edgeCaseId: "QHht_non_positive",
          condition: "QHht <= 0",
          sourceBackedBehavior:
            "gammaH = QHgn / QHht requires positive heat transfer for the restricted explicit-input runtime",
          readinessStatus: "excluded_non_positive_transfer_edge",
          includedInFirstRestrictedRuntime: false,
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          edgeCaseId: "gammaH_equals_one",
          condition: "gammaH = 1",
          sourceBackedBehavior:
            "figure 2.14 separately gives etaH;gn;ztc;m = aH;ztc;m / (aH;ztc;m + 1)",
          readinessStatus: "verified_with_explicit_eta_or_gamma_equals_one_branch",
          includedInFirstRestrictedRuntime: true,
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          edgeCaseId: "gammaH_greater_than_two",
          condition: "gammaH > 2.0",
          sourceBackedBehavior:
            "figure 2.18 shows zero useful heating demand, but the first restricted runtime domain should exclude this branch",
          readinessStatus: "verified_but_excluded_from_first_runtime",
          includedInFirstRestrictedRuntime: false,
          sourceLocator: {
            page: 120,
            figure: "2.18",
            subsection: "2.8.4"
          }
        },
        {
          edgeCaseId: "normal_branch",
          condition: "0 < gammaH <= 2.0",
          sourceBackedBehavior:
            "restricted runtime may use explicit etaHgn input or source-backed figure 2.14 formulas, then compute QHnd = QHht - etaHgn * QHgn",
          readinessStatus: "allowed_for_restricted_runtime",
          includedInFirstRestrictedRuntime: true,
          sourceLocator: {
            page: 120,
            figure: "2.18",
            subsection: "2.8.4"
          }
        }
      ],

      restrictedExplicitInputRuntimeFeasibility: {
        status: "allowed_for_future_runtime",
        domain: [
          "heating_only",
          "monthly_explicit_inputs_only",
          "no_long_unoccupied_periods",
          "QHht > 0",
          "QHgn >= 0",
          "0 < gammaH <= 2.0",
          "etaHgn_explicit_or_source_backed_from_explicit_inputs"
        ],
        inputValidationConstraints: [
          "QHht_kWh finite greater than zero",
          "QHgn_kWh finite greater than or equal to zero",
          "gammaH finite and greater than zero and less than or equal to 2.0",
          "etaHgn finite explicit input or calculated only from verified figure 2.14 formulas with explicit aH and tau inputs",
          "no normative gains solar capacity schedule or occupancy defaults",
          "no final energy primary energy CO2 CPE or certificate output"
        ],
        allowedFormulaCandidates: [
          {
            candidateCode: "MC001_R7_GAMMA_H_EXPLICIT_RATIO",
            expressionText: "gammaH = QHgn / QHht",
            readinessStatus: "verified_for_future_runtime_restricted_domain",
            sourceLocator: {
              page: 113,
              figure: "2.14",
              subsection: "2.7.6"
            }
          },
          {
            candidateCode: "MC001_R7_QHND_NORMAL_RESTRICTED_BRANCH",
            expressionText: "QHnd = QHht - etaHgn * QHgn",
            readinessStatus: "verified_for_future_runtime_restricted_domain",
            sourceLocator: {
              page: 120,
              figure: "2.18",
              subsection: "2.8.4"
            }
          },
          {
            candidateCode: "MC001_R7_QHND_RESOLVED_ZERO_BRANCH_METADATA_ONLY",
            expressionText: "if gammaH <= 0 and QHgn > 0 then QHnd = 0",
            readinessStatus: "resolved_metadata_only_excluded_from_first_runtime",
            sourceLocator: {
              page: 120,
              figure: "2.18",
              subsection: "2.8.4"
            }
          }
        ],
        allowedOutputs: [
          "monthly_useful_heating_energy_QHnd_kWh_restricted_explicit_input_only",
          "diagnostics_and_methodology_limits"
        ],
        exclusions: [
          "not_full_QHnd",
          "not_QCnd",
          "not_final_energy",
          "not_primary_energy",
          "not_CO2",
          "not_CPE_certificate",
          "not_system_losses",
          "not_long_unoccupied_or_intermittent_operation"
        ]
      },

      runtimeReadinessVerdict: "C6F_CAN_IMPLEMENT_RESTRICTED_HEATING_QHND_EXPLICIT_INPUT",

      dependencyMatrix: {
        c5ExplicitTransferTotal: {
          status: "implemented",
          limitation: "explicit transfer only not full QH;nd"
        },
        qhHtMonthlyInput: {
          status: "explicit_input_only_or_C5_chain",
          source: "C5_explicit_transfer_total"
        },
        qhGnMonthlyInput: {
          status: "explicit_input_required",
          source: "R6_gains_readiness"
        },
        gammaHFormula: {
          status: "verified_for_restricted_future_runtime",
          source: "figure_2.14"
        },
        etaHgnFormula: {
          status: "verified_for_restricted_future_runtime_with_explicit_inputs_or_user_supplied_eta",
          source: "figure_2.14_relation_2.55_relation_2.57"
        },
        figure214EdgeConditions: {
          status: "reviewed_restricted_domain_selected",
          source: "figure_2.14"
        },
        figure218FirstBranch: {
          status: "resolved_verified_typographical_artifact",
          source: "figure_2.18"
        },
        effectiveCapacityTimeConstant: {
          status: "explicit_input_or_future_source_pack",
          source: "section_2.7.5_relation_2.57"
        },
        internalGains: {
          status: "explicit_input_only_or_missing_future_source_pack",
          source: "section_2.7.2"
        },
        solarGains: {
          status: "explicit_input_only_or_missing_future_source_pack",
          source: "section_2.7.3"
        },
        qhndRuntime: {
          status: "not_implemented_future_restricted_runtime_allowed"
        },
        annualAggregation: {
          status: "not_implemented"
        },
        final_energy: {
          status: "blocked"
        },
        primary_energy: {
          status: "blocked"
        },
        co2: {
          status: "blocked"
        },
        cpeCertificate: {
          status: "blocked"
        }
      },

      blockers: [
        "not_runtime_QH;nd_in_C6E",
        "not_full_QH;nd",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_CPE_certificate",
        "no_system_losses",
        "no_hidden_defaults",
        "no_normative_default_gains",
        "no_normative_default_solar_data",
        "no_normative_default_capacity",
        "no_default_occupancy_or_schedules",
        "long_unoccupied_and_intermittency_not_implemented",
        "restricted_runtime_must_exclude_gammaH_non_positive_branch_initially",
        "first_runtime_requires_targeted_tests_for_edge_branches"
      ]
    },
    {
      sourcePackCode: R8_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_SOURCE_PACK_CODE,
      sourcePackType: READINESS_SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: true,
      runtimeCalculatorStatus: "not_implemented",
      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        section: "2.7.6. Factori de utilizare",
        subsection: "heating gain utilization factor etaH;gn formula readiness",
        parentSectionsVerified: ["2.7", "2.7.5", "2.7.6"],
        pagesVerified: [112, 113, 116],
        figuresVerified: ["2.14"],
        relationsVerified: ["2.55", "2.57"],
        adjacentSymbolDefinitionsVerified: [
          "etaH;gn;ztc;m",
          "gammaH;ztc;m",
          "aH;ztc;m",
          "aH;0",
          "tauH;ztc;m",
          "tauH;0",
          "QH;gn;ztc;m",
          "QH;ht;ztc;m"
        ]
      },
      concept: {
        entryCode: "MC001_CONCEPT_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_READINESS",
        entryType: "concept",
        conceptCode: "heating_gain_utilization_factor_formula_readiness",
        targetSymbol: "etaH;gn;ztc;m",
        registryKind: "metadata_only_readiness_registry",
        name: "Heating gain utilization factor formula readiness",
        unit: "dimensionless",
        purpose:
          "records source-backed etaH;gn formula candidates before restricted runtime utilization-factor calculation",
        sourceLocator: {
          page: 113,
          figure: "2.14",
          subsection: "2.7.6"
        }
      },
      sourceIdentity: {
        methodologyCode: "MC001",
        methodologyVersion: "2022",
        utilizationSectionReference: "section_2.7.6",
        primaryFigureReference: "figure_2.14",
        utilizationParameterReference: "relation_2.55",
        timeConstantReference: "relation_2.57",
        adjacentTextReferences: [
          "MC001-2022 page 112 section 2.7.5",
          "MC001-2022 page 113 section 2.7.6",
          "MC001-2022 page 113 figure 2.14",
          "MC001-2022 page 113 relation 2.55",
          "MC001-2022 page 116 relation 2.57"
        ],
        sourceReviewNotes: [
          "page 113 defines etaH;gn as depending on gammaH and aH for every conditioned zone and month",
          "page 113 defines QH;ht;ztc;m as total heat transfer for heating in kWh",
          "page 113 defines QH;gn;ztc;m as total heat gains for heating in kWh",
          "relation 2.55 defines aH;ztc;m through reference parameters and tauH;ztc;m",
          "relation 2.57 defines tauH;ztc;m through effective capacity and heat-transfer coefficients"
        ]
      },
      formulaCandidates: [
        {
          candidateCode: "MC001_R8_GAMMA_H_BALANCE_RATIO",
          mc001Symbol: "gammaH;ztc;m",
          expressionText: "gammaH;ztc;m = QH;gn;ztc;m / QH;ht;ztc;m",
          machineExpression: "gammaH = QHgn / QHht",
          relationReference: "figure_2.14",
          sourceReference: "MC001-2022 page 113 figure 2.14",
          requiredInputs: ["QH;gn;ztc;m", "QH;ht;ztc;m"],
          outputSymbol: "gammaH;ztc;m",
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          candidateCode: "MC001_R8_ETA_H_GN_GAMMA_NOT_ONE",
          mc001Symbol: "etaH;gn;ztc;m",
          expressionText:
            "etaH;gn;ztc;m = (1 - gammaH;ztc;m ^ aH;ztc;m) / (1 - gammaH;ztc;m ^ (aH;ztc;m + 1))",
          machineExpression:
            "etaHgn = (1 - gammaH ** aH) / (1 - gammaH ** (aH + 1))",
          conditionExpression: "gammaH;ztc;m > 0 and gammaH;ztc;m != 1",
          relationReference: "figure_2.14",
          sourceReference: "MC001-2022 page 113 figure 2.14",
          requiredInputs: ["gammaH;ztc;m", "aH;ztc;m"],
          outputSymbol: "etaH;gn;ztc;m",
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          candidateCode: "MC001_R8_ETA_H_GN_GAMMA_EQUALS_ONE",
          mc001Symbol: "etaH;gn;ztc;m",
          expressionText: "etaH;gn;ztc;m = aH;ztc;m / (aH;ztc;m + 1)",
          machineExpression: "etaHgn = aH / (aH + 1)",
          conditionExpression: "gammaH;ztc;m = 1",
          relationReference: "figure_2.14",
          sourceReference: "MC001-2022 page 113 figure 2.14",
          requiredInputs: ["aH;ztc;m"],
          outputSymbol: "etaH;gn;ztc;m",
          readinessStatus: "verified_for_future_runtime",
          sourceLocator: {
            page: 113,
            figure: "2.14",
            subsection: "2.7.6"
          }
        },
        {
          candidateCode: "MC001_R8_AH_PARAMETER_RELATION_2_55",
          mc001Symbol: "aH;ztc;m",
          expressionText: "aH;ztc;m = aH;0 + tauH;ztc;m / tauH;0",
          machineExpression: "aH = aH0 + tauH / tauH0",
          relationReference: "2.55",
          sourceReference: "MC001-2022 page 113 relation 2.55",
          requiredInputs: ["aH;0", "tauH;ztc;m", "tauH;0"],
          outputSymbol: "aH;ztc;m",
          readinessStatus: "verified_for_future_runtime",
          runtimeNote:
            "C7A avoids encoding source reference parameter values; C7B should prefer explicit aH input or require explicit aH0 tauH tauH0 inputs.",
          sourceLocator: {
            page: 113,
            relation: "2.55",
            subsection: "2.7.6"
          }
        },
        {
          candidateCode: "MC001_R8_TAU_H_DEPENDENCY_RELATION_2_57",
          mc001Symbol: "tauH;ztc;m",
          expressionText:
            "tauH;ztc;m = (Cm;eff;ztc / 3600) / (HH;tr(excl.grflr);ztc;m + HH;gr;adj;ztc + HH;ve;ztc;m)",
          machineExpression:
            "tauH = (CmEff / 3600) / (HHtrExclGroundFloor + HHgrAdj + HHve)",
          relationReference: "2.57",
          sourceReference: "MC001-2022 page 116 relation 2.57",
          requiredInputs: [
            "Cm;eff;ztc",
            "HH;tr(excl.grflr);ztc;m",
            "HH;gr;adj;ztc",
            "HH;ve;ztc;m"
          ],
          outputSymbol: "tauH;ztc;m",
          readinessStatus: "verified_for_future_runtime",
          runtimeNote:
            "C7A records the dependency only; C7B can avoid this path by requiring explicit aH.",
          sourceLocator: {
            page: 116,
            relation: "2.57",
            subsection: "2.7.6"
          }
        }
      ],
      branchConditionTable: [
        {
          branchId: "eta_gamma_equals_one",
          conditionExpression: "gammaH;ztc;m = 1",
          outputExpression: "etaH;gn;ztc;m = aH;ztc;m / (aH;ztc;m + 1)",
          readinessStatus: "verified_for_future_runtime",
          c7bRuntimeScope: "allowed_with_explicit_aH",
          sourceReference: "MC001-2022 page 113 figure 2.14"
        },
        {
          branchId: "eta_gamma_not_one_positive",
          conditionExpression: "gammaH;ztc;m > 0 and gammaH;ztc;m != 1",
          outputExpression:
            "etaH;gn;ztc;m = (1 - gammaH;ztc;m ^ aH;ztc;m) / (1 - gammaH;ztc;m ^ (aH;ztc;m + 1))",
          readinessStatus: "verified_for_future_runtime",
          c7bRuntimeScope: "allowed_with_explicit_aH",
          sourceReference: "MC001-2022 page 113 figure 2.14"
        },
        {
          branchId: "restricted_normal_domain",
          conditionExpression: "0 < gammaH <= 2",
          outputExpression: "etaHgn selected from gamma equals one or gamma not one branch",
          readinessStatus: "verified_for_future_restricted_runtime",
          c7bRuntimeScope: "allowed",
          sourceReference: "MC001-2022 page 113 figure 2.14 and C6E restricted domain"
        },
        {
          branchId: "excluded_gamma_non_positive",
          conditionExpression: "gammaH <= 0",
          outputExpression: "excluded from first eta runtime",
          readinessStatus: "excluded_from_C7B_restricted_runtime",
          c7bRuntimeScope: "excluded",
          sourceReference: "MC001-2022 page 113 figure 2.14"
        },
        {
          branchId: "excluded_gamma_near_zero",
          conditionExpression: "gammaH near zero",
          outputExpression: "excluded from first eta runtime",
          readinessStatus: "excluded_numerical_edge",
          c7bRuntimeScope: "excluded",
          sourceReference: "MC001-2022 page 113 figure 2.14"
        },
        {
          branchId: "excluded_gamma_above_two",
          conditionExpression: "gammaH > 2",
          outputExpression: "excluded by C6F/C7B restricted QHnd domain",
          readinessStatus: "excluded_from_C7B_restricted_runtime",
          c7bRuntimeScope: "excluded",
          sourceReference: "MC001-2022 page 120 figure 2.18"
        },
        {
          branchId: "excluded_non_positive_transfer",
          conditionExpression: "QHht <= 0",
          outputExpression: "excluded because gammaH denominator must be positive",
          readinessStatus: "excluded_from_C7B_restricted_runtime",
          c7bRuntimeScope: "excluded",
          sourceReference: "MC001-2022 page 113 figure 2.14"
        },
        {
          branchId: "excluded_negative_gains",
          conditionExpression: "QHgn < 0",
          outputExpression: "excluded from first eta runtime",
          readinessStatus: "excluded_from_C7B_restricted_runtime",
          c7bRuntimeScope: "excluded",
          sourceReference: "MC001-2022 page 113 figure 2.14"
        },
        {
          branchId: "excluded_missing_a_or_tau_inputs",
          conditionExpression: "aH missing and tauH/aH0/tauH0 path not explicitly supplied",
          outputExpression: "blocked because hidden defaults are not allowed",
          readinessStatus: "blocked_missing_explicit_inputs",
          c7bRuntimeScope: "excluded",
          sourceReference: "MC001-2022 page 113 relation 2.55"
        }
      ],
      relationshipToC6F: {
        currentC6FBehavior: "C6F requires explicit etaHgn and leaves etaHgn uncalculated.",
        c7bOption:
          "C7B may calculate etaHgn only from verified figure 2.14 formulas with explicit aH and gammaH inputs.",
        explicitEtaOverride:
          "C7B must keep explicit etaHgn as an allowed override or input path.",
        hiddenDefaultsProhibited: [
          "aH0",
          "tauH0",
          "tauH",
          "Cm",
          "gains",
          "solar_data",
          "schedules",
          "building_category"
        ],
        runtimeScopeLimit: "restricted_heating_only_until_separately_expanded"
      },
      dependencyMatrix: {
        gammaH: {
          status: "explicit_or_calculated_from_qHgn_qHht",
          source: "figure_2.14"
        },
        qhHt: {
          status: "explicit_input_only_unless_future_phase_wires_C5",
          source: "C6F_restricted_runtime_boundary"
        },
        qhGn: {
          status: "explicit_input_until_gains_are_implemented",
          source: "R6_gains_readiness"
        },
        aH: {
          status: "explicit_input_recommended_for_C7B",
          source: "relation_2.55"
        },
        aH0: {
          status: "source_referenced_not_encoded_as_runtime_value",
          source: "relation_2.55"
        },
        tauH: {
          status: "explicit_input_or_calculated_only_from_explicit_relation_2.57_inputs",
          source: "relation_2.57"
        },
        tauH0: {
          status: "source_referenced_not_encoded_as_runtime_value",
          source: "relation_2.55"
        },
        cmEffectiveCapacity: {
          status: "source_dependency_only_unless_explicit_input",
          source: "section_2.7.5_tables_2.19_2.20"
        },
        etaHgnRuntime: {
          status: "not_implemented_in_C7A"
        },
        c6fQhndRuntime: {
          status: "implemented_with_explicit_eta"
        },
        fullQhnd: {
          status: "blocked"
        },
        qcnd: {
          status: "blocked"
        },
        final_energy: {
          status: "blocked"
        },
        primary_energy: {
          status: "blocked"
        },
        co2: {
          status: "blocked"
        },
        cpeCertificate: {
          status: "blocked"
        }
      },
      runtimeReadinessVerdict:
        "C7B_CAN_IMPLEMENT_RESTRICTED_ETA_HGN_RUNTIME_WITH_EXPLICIT_A_AND_GAMMA",
      blockers: [
        "not_runtime_etaHgn_in_C7A",
        "not_full_QH;nd",
        "not_QC;nd",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_CPE_certificate",
        "no_system_losses",
        "no_hidden_defaults",
        "no_normative_default_gains",
        "no_normative_default_solar_data",
        "no_normative_default_capacity",
        "no_default_occupancy_or_schedules",
        "no_long_unoccupied_or_intermittency_runtime_behavior",
        "C7B_must_require_explicit_aH_or_explicit_tau_path_inputs"
      ]
    },
    {
      sourcePackCode: R9_LONG_UNOCCUPIED_INTERPOLATION_SOURCE_PACK_CODE,
      sourcePackType: READINESS_SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: false,
      machineReadable: true,
      runtimeCalculatorStatus: "implemented_restricted_heating_relation_2_76_only",
      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        section:
          "2.8. Particularitati ale calculului necesarului de energie propriu sistemului",
        subsection: "2.8.4. Corectii pentru perioada de neocupare",
        parentSectionsVerified: ["2.7", "2.8", "2.8.4"],
        pagesVerified: [120, 121],
        relationsVerified: ["2.76", "2.77"],
        adjacentSymbolDefinitionsVerified: [
          "QH/C;nd;occ;ztc;m",
          "QH/C;nd;nocc;ztc;m",
          "fH/C;nocc;ztc;m",
          "QH;nd;ztc;m",
          "QC;nd;ztc;m"
        ]
      },
      concept: {
        entryCode: "MC001_CONCEPT_LONG_UNOCCUPIED_PERIOD_INTERPOLATION",
        entryType: "concept",
        conceptCode: "long_unoccupied_period_interpolation",
        targetSymbol: "QH;nd;ztc;m / QC;nd;ztc;m",
        registryKind: "machine_encoded_restricted_heating_registry",
        name: "Long unoccupied period monthly useful-demand interpolation",
        unit: "kWh",
        purpose:
          "machine-encodes MC001 relation 2.76 for restricted heating runtime and records relation 2.77 as cooling metadata only",
        sourceLocator: {
          page: 121,
          relation: "2.76",
          subsection: "2.8.4"
        }
      },
      sourceIdentity: {
        methodologyCode: "MC001",
        methodologyVersion: "2022",
        unoccupiedSectionReference: "section_2.8.4",
        heatingRelationReference: "relation_2.76",
        coolingRelationReference: "relation_2.77",
        adjacentTextReferences: [
          "MC001-2022 page 120 section 2.8.4",
          "MC001-2022 page 121 relation 2.76",
          "MC001-2022 page 121 relation 2.77",
          "MC001-2022 page 121 symbol definitions"
        ],
        sourceReviewNotes: [
          "section 2.8.4 requires a separate occupied-period calculation and unoccupied-period calculation for a month with long non-occupation",
          "relation 2.76 linearly interpolates heating useful demand by the monthly unoccupied time fraction",
          "relation 2.77 mirrors the interpolation for cooling and is recorded as metadata only in this heating milestone"
        ]
      },
      formulaCandidates: [
        {
          candidateCode: "MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION",
          mc001Symbol: "QH;nd;ztc;m",
          expressionText:
            "QH;nd;ztc;m = (1 - fH;nocc;ztc;m) * QH;nd;occ;ztc;m + fH;nocc;ztc;m * QH;nd;nocc;ztc;m",
          machineExpression:
            "QHnd = (1 - fHnocc) * QHndOcc + fHnocc * QHndNocc",
          relationReference: "2.76",
          sourceReference: "MC001-2022 page 121 relation 2.76",
          requiredInputs: ["QH;nd;occ;ztc;m", "QH;nd;nocc;ztc;m", "fH;nocc;ztc;m"],
          outputSymbol: "QH;nd;ztc;m",
          unit: "kWh",
          readinessStatus: "verified_for_restricted_heating_runtime",
          sourceLocator: {
            page: 121,
            relation: "2.76",
            subsection: "2.8.4"
          }
        },
        {
          candidateCode: "MC001_2_77_LONG_UNOCCUPIED_COOLING_INTERPOLATION",
          mc001Symbol: "QC;nd;ztc;m",
          expressionText:
            "QC;nd;ztc;m = (1 - fC;nocc;ztc;m) * QC;nd;occ;ztc;m + fC;nocc;ztc;m * QC;nd;nocc;ztc;m",
          machineExpression:
            "QCnd = (1 - fCnocc) * QCndOcc + fCnocc * QCndNocc",
          relationReference: "2.77",
          sourceReference: "MC001-2022 page 121 relation 2.77",
          requiredInputs: ["QC;nd;occ;ztc;m", "QC;nd;nocc;ztc;m", "fC;nocc;ztc;m"],
          outputSymbol: "QC;nd;ztc;m",
          unit: "kWh",
          readinessStatus: "machine_encoded_metadata_only_not_runtime_cooling",
          sourceLocator: {
            page: 121,
            relation: "2.77",
            subsection: "2.8.4"
          }
        }
      ],
      runtimeIntegration: {
        implementedFormulaCodes: ["MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION"],
        metadataOnlyFormulaCodes: ["MC001_2_77_LONG_UNOCCUPIED_COOLING_INTERPOLATION"],
        inputContract: {
          branchInputName: "longUnoccupiedPeriodAdjustment",
          explicitInputs: ["qHndOccupied", "qHndUnoccupied", "unoccupiedFraction"],
          outputOrigin: "calculated_from_explicit_long_unoccupied_interpolation"
        },
        restrictions: [
          "heating_only",
          "explicit_input_only",
          "no_schedule_defaults",
          "no_setpoint_defaults",
          "no_cooling_runtime"
        ]
      },
      dependencyMatrix: {
        occupiedMonthlyQhnd: {
          status: "explicit_input_required",
          source: "relation_2.76"
        },
        unoccupiedMonthlyQhnd: {
          status: "explicit_input_required",
          source: "relation_2.76"
        },
        unoccupiedFraction: {
          status: "explicit_input_required_0_to_1",
          source: "relation_2.76_symbol_definition"
        },
        heatingLongUnoccupiedRuntime: {
          status: "implemented_restricted_explicit_interpolation"
        },
        coolingLongUnoccupiedRuntime: {
          status: "blocked_metadata_only"
        },
        intermittencyRuntime: {
          status: "blocked_not_relation_2_76_or_2_77"
        },
        final_energy: {
          status: "blocked"
        },
        primary_energy: {
          status: "blocked"
        },
        co2: {
          status: "blocked"
        },
        cpeCertificate: {
          status: "blocked"
        }
      },
      blockers: [
        "not_QC;nd",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_CPE_certificate",
        "no_system_losses",
        "no_hidden_defaults",
        "no_schedule_defaults",
        "no_temperature_setpoint_defaults",
        "intermittency_not_machine_encoded"
      ]
    },
    {
      sourcePackCode: R10_HEATING_QHND_VERTICAL_CLOSURE_SOURCE_PACK_CODE,
      sourcePackType: READINESS_SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: false,
      machineReadable: true,
      runtimeCalculatorStatus:
        "coverage_map_only_existing_restricted_heating_runtime_no_new_formula",
      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        section:
          "2.7 monthly calculation method and 2.8 heating useful-demand corrections",
        parentSectionsVerified: ["2.7", "2.7.6", "2.8", "2.8.2", "2.8.4", "2.10"],
        pagesVerified: [113, 116, 117, 118, 119, 120, 121, 124],
        figuresVerified: ["2.13", "2.14", "2.18", "2.19"],
        relationsVerified: [
          "2.55",
          "2.57",
          "2.59",
          "2.60",
          "2.61",
          "2.62",
          "2.63",
          "2.64",
          "2.65",
          "2.66",
          "2.67",
          "2.68",
          "2.69",
          "2.70",
          "2.71",
          "2.72",
          "2.73",
          "2.76",
          "2.77",
          "2.84"
        ],
        sourceMaterialsReviewed: [
          "local MC001-2022 methodology source",
          "R6 gains capacity time-constant source pack",
          "R7 QHnd ambiguity resolution source pack",
          "R8 etaHgn formula source pack",
          "R9 long unoccupied interpolation source pack",
          "R11 heating intermittency source pack"
        ]
      },
      concept: {
        entryCode: "MC001_CONCEPT_HEATING_QHND_VERTICAL_CLOSURE",
        entryType: "concept",
        conceptCode: "heating_qhnd_vertical_closure_coverage",
        targetSymbol: "QH;nd;ztc;m",
        registryKind: "machine_readable_runtime_coverage_map",
        name: "Heating useful-demand vertical closure coverage map",
        unit: "coverage_metadata",
        purpose:
          "maps implemented restricted heating QHnd branches, metadata-only branches, remaining unencoded boundary-duration dependencies, and downstream out-of-scope domains",
        sourceLocator: {
          page: 120,
          figure: "2.18",
          subsection: "2.7.6 / 2.8.2 / 2.8.4 / 2.10"
        }
      },
      heatingQhndCoverageMap: {
        implementedRuntimeBranches: [
          {
            branchId: "figure_2_18_normal_balance",
            relationOrFigure: "figure_2.18",
            runtimeStatus: "implemented_restricted_explicit_inputs",
            formulaReference: "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH"
          },
          {
            branchId: "figure_2_18_gamma_non_positive_positive_gains_zero_demand",
            relationOrFigure: "figure_2.18",
            runtimeStatus: "implemented_restricted_explicit_inputs",
            formulaReference: "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH"
          },
          {
            branchId: "figure_2_18_gamma_greater_than_two_zero_demand",
            relationOrFigure: "figure_2.18",
            runtimeStatus: "implemented_restricted_explicit_inputs",
            formulaReference: "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH"
          },
          {
            branchId: "figure_2_14_etaHgn_gamma_equals_one",
            relationOrFigure: "figure_2.14",
            runtimeStatus: "implemented_restricted_explicit_inputs",
            formulaReference: "MC001_R8_ETA_H_GN_GAMMA_EQUALS_ONE"
          },
          {
            branchId: "figure_2_14_etaHgn_gamma_not_one",
            relationOrFigure: "figure_2.14",
            runtimeStatus: "implemented_restricted_explicit_inputs",
            formulaReference: "MC001_R8_ETA_H_GN_GAMMA_NOT_ONE"
          },
          {
            branchId: "relation_2_55_aH_from_tauH",
            relationOrFigure: "2.55",
            runtimeStatus: "implemented_restricted_explicit_inputs",
            formulaReference: "MC001_R8_AH_PARAMETER_RELATION_2_55"
          },
          {
            branchId: "relation_2_57_tauH_from_explicit_capacity_and_coefficients",
            relationOrFigure: "2.57",
            runtimeStatus: "implemented_restricted_explicit_inputs",
            formulaReference: "MC001_R8_TAU_H_DEPENDENCY_RELATION_2_57"
          },
          {
            branchId: "figure_2_13_explicit_heat_gains_sum",
            relationOrFigure: "figure_2.13",
            runtimeStatus: "implemented_restricted_explicit_inputs",
            formulaReference: "MC001_EXPLICIT_MONTHLY_HEAT_GAINS_SUM"
          },
          {
            branchId: "relation_2_76_long_unoccupied_heating_interpolation",
            relationOrFigure: "2.76",
            runtimeStatus: "implemented_restricted_explicit_inputs",
            formulaReference: "MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION"
          },
          {
            branchId: "relations_2_59_to_2_73_heating_intermittency_temperature_correction",
            relationOrFigure: "2.59-2.73",
            runtimeStatus: "implemented_restricted_explicit_inputs",
            formulaReference: R11_HEATING_INTERMITTENCY_SOURCE_PACK_CODE
          },
          {
            branchId: "relation_2_84_annual_heating_qhnd_sum",
            relationOrFigure: "2.84",
            runtimeStatus: "implemented_restricted_explicit_monthly_aggregation",
            formulaReference: "annualQHnd = sum(monthlyQHnd)"
          }
        ],
        sourceBackedMetadataOnlyBranches: [
          {
            branchId: "relation_2_77_long_unoccupied_cooling_interpolation",
            relationOrFigure: "2.77",
            reason: "cooling_QCnd_metadata_only_not_heating_runtime"
          }
        ],
        notMachineEncodedBranches: [
          {
            branchId: "heating_period_boundary_duration_method",
            relationOrFigure: "section_2.11",
            reason:
              "local validation notes record a source conflict and no separate machine-ready monthly QHnd formula"
          }
        ],
        downstreamOutOfScope: [
          "QCnd",
          "final_energy",
          "primary_energy",
          "CO2",
          "CPE_certificate",
          "system_losses",
          "fan_electricity",
          "air_treatment_energy"
        ]
      },
      runtimeClosureVerdict: {
        notFullQhndRemains: true,
        reason:
          "restricted explicit-input runtime still omits inferred schedules, setpoints, missing months, and boundary-month duration defaults",
        implementedHeatingUsefulDemandRelations: [
          "figure_2.18",
          "figure_2.14",
          "2.55",
          "2.57",
          "2.59-2.73",
          "2.76",
          "2.84"
        ],
        blockedHeatingUsefulDemandRelations: ["section_2.11_boundary_duration_method"],
        coolingRelationsNotUsedInHeatingRuntime: ["2.77"]
      },
      dependencyMatrix: {
        qHht: {
          status: "implemented_direct_or_explicit_C5_transfer_source"
        },
        qHgn: {
          status: "implemented_direct_components_or_explicit_monthly_heat_gains_result"
        },
        gammaH: {
          status: "implemented_calculated_or_explicit_with_boundary_branches"
        },
        tauH: {
          status: "implemented_from_explicit_capacity_and_heat_transfer_coefficients"
        },
        aH: {
          status: "implemented_explicit_or_from_explicit_tau_dependencies"
        },
        etaHgn: {
          status: "implemented_explicit_or_calculated_from_explicit_aH"
        },
        longUnoccupiedRelation276: {
          status: "implemented_restricted_explicit_interpolation"
        },
        heatingIntermittencyRelations259To273: {
          status: "implemented_restricted_explicit_correction"
        },
        annualQhnd: {
          status: "implemented_sum_of_explicit_monthly_cases"
        },
        fullQhnd: {
          status: "blocked_not_full_QHnd"
        },
        qcnd: {
          status: "blocked"
        },
        final_energy: {
          status: "blocked"
        },
        primary_energy: {
          status: "blocked"
        },
        co2: {
          status: "blocked"
        },
        cpeCertificate: {
          status: "blocked"
        }
      },
      blockers: [
        "not_full_QH;nd",
        "not_QC;nd",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_CPE_certificate",
        "no_system_losses",
        "no_hidden_defaults",
        "no_schedule_defaults",
        "no_temperature_setpoint_defaults",
        "boundary_duration_defaults_not_encoded"
      ]
    },
    {
      sourcePackCode: R11_HEATING_INTERMITTENCY_SOURCE_PACK_CODE,
      sourcePackType: READINESS_SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: false,
      machineReadable: true,
      runtimeCalculatorStatus:
        "implemented_restricted_explicit_heating_intermittency_runtime",
      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        section: "2.8.2. Calculul efectului intermitentei incalzirii",
        pagesVerified: [117, 118, 119],
        relationsVerified: [
          "2.59",
          "2.60",
          "2.61",
          "2.62",
          "2.63",
          "2.64",
          "2.65",
          "2.66",
          "2.67",
          "2.68",
          "2.69",
          "2.70",
          "2.71",
          "2.72",
          "2.73"
        ],
        extractionMethods: [
          "page.get_text(text)",
          "page.get_text(blocks)",
          "page.get_text(dict)",
          "page rendering to PNG",
          "visual inspection of cropped equation renderings"
        ],
        sourceMaterialsReviewed: [
          "local MC001-2022 methodology source pages 117-119",
          "PyMuPDF text blocks and visual renderings"
        ]
      },
      concept: {
        entryCode: "MC001_CONCEPT_HEATING_INTERMITTENCY_RELATIONS",
        entryType: "concept",
        conceptCode: "heating_intermittency_relations_2_59_to_2_73",
        targetSymbol: "theta_int_calc_H;ztc;m",
        registryKind: "machine_readable_restricted_runtime_source_pack",
        name: "Heating intermittency relations 2.59 to 2.73",
        unit: "mixed",
        purpose:
          "machine-encodes the explicit-input heating intermittency correction chain used to derive corrected heating setpoint and heat transfer demand",
        sourceLocator: {
          page: 117,
          subsection: "2.8.2"
        }
      },
      formulaCandidates: [
        {
          candidateCode: "MC001_R11_RELATION_2_59_HEATING_CORRECTED_SETPOINT",
          relationReference: "2.59",
          expressionText:
            "theta_int_calc_H = aHred * (theta_int_set_H - theta_e) + theta_e",
          machineExpression:
            "thetaIntCalcH = aHred * (thetaIntSetH - thetaExternal) + thetaExternal",
          outputSymbol: "theta_int_calc,H,ztc,m",
          outputUnit: "degC",
          requiredInputs: ["aHred", "thetaIntSetH", "thetaExternal"],
          conditions: ["heating intermittency explicit correction"],
          dependencies: ["2.60"],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 117, relation: "2.59" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_60_COMBINED_INTERMITTENCY_REDUCTION",
          relationReference: "2.60",
          expressionText:
            "aHred = 1 - (1 - aHred_day) - (1 - aHred_night) - (1 - aHred_wknd)",
          machineExpression:
            "aHred = 1 - sum(1 - aHredPeriod for day/night/wknd)",
          outputSymbol: "a_H,red,ztc,m",
          outputUnit: "dimensionless",
          requiredInputs: ["aHredDay", "aHredNight", "aHredWknd"],
          conditions: ["day night and weekend period reductions provided explicitly"],
          dependencies: ["2.61"],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 117, relation: "2.60" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_61_PERIOD_REDUCTION_FACTOR",
          relationReference: "2.61",
          expressionText: "aHred_y = 1 - fHred_y + fHred_y * dthetaHredmn_y",
          machineExpression:
            "aHredPeriod = 1 - fHredPeriod + fHredPeriod * dThetaRedMeanPeriod",
          outputSymbol: "a_H,red,y,ztc,m",
          outputUnit: "dimensionless",
          requiredInputs: ["fHredPeriod", "dThetaRedMeanPeriod"],
          conditions: ["period y is day night or weekend"],
          dependencies: ["2.62", "2.72", "2.73"],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 117, relation: "2.61" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_62_PERIOD_TIME_FRACTION",
          relationReference: "2.62",
          expressionText: "fHred_y = Delta_t_H_red_y * n_rep_H_red_y / (24 * 7)",
          machineExpression:
            "fHredPeriod = reductionDurationHours * repetitionCount / (24 * 7)",
          outputSymbol: "f_H,red,y,ztc",
          outputUnit: "dimensionless",
          requiredInputs: ["reductionDurationHours", "repetitionCount"],
          conditions: ["period duration and repetition count are explicit"],
          dependencies: [],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 117, relation: "2.62" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_63_REDUCED_SETPOINT_RATIO_NO_HEATING",
          relationReference: "2.63",
          expressionText:
            "if theta_int_set_H - theta_e <= 0 then dtheta_set_H_low = 1",
          machineExpression:
            "dThetaSetLow = 1 when thetaIntSetH - thetaExternal <= 0",
          outputSymbol: "dtheta_set,H,low,y,ztc,m",
          outputUnit: "dimensionless",
          requiredInputs: ["thetaIntSetH", "thetaExternal"],
          conditions: ["normal heating temperature difference is non-positive"],
          dependencies: [],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 117, relation: "2.63" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_64_REDUCED_SETPOINT_RATIO_LOW_BELOW_EXTERIOR",
          relationReference: "2.64",
          expressionText:
            "if theta_int_set_H_low - theta_e <= 0 then dtheta_set_H_low = 0",
          machineExpression:
            "dThetaSetLow = 0 when thetaIntSetHLow - thetaExternal <= 0",
          outputSymbol: "dtheta_set,H,low,y,ztc,m",
          outputUnit: "dimensionless",
          requiredInputs: ["thetaIntSetHLow", "thetaExternal"],
          conditions: ["reduced setpoint is below or equal exterior temperature"],
          dependencies: [],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 117, relation: "2.64" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_65_REDUCED_SETPOINT_RATIO",
          relationReference: "2.65",
          expressionText:
            "dtheta_set_H_low = (theta_int_set_H_low - theta_e) / (theta_int_set_H - theta_e)",
          machineExpression:
            "dThetaSetLow = (thetaIntSetHLow - thetaExternal) / (thetaIntSetH - thetaExternal)",
          outputSymbol: "dtheta_set,H,low,y,ztc,m",
          outputUnit: "dimensionless",
          requiredInputs: ["thetaIntSetHLow", "thetaIntSetH", "thetaExternal"],
          conditions: ["both normal and reduced heating temperature differences are positive"],
          dependencies: [],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 117, relation: "2.65" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_66_FREE_FLOAT_RATIO_FROM_EXPLICIT_TEMPERATURE",
          relationReference: "2.66",
          expressionText:
            "dtheta_float = (theta_int_float - theta_e) / (theta_int_set_H - theta_e)",
          machineExpression:
            "dThetaFloat = (thetaIntFloat - thetaExternal) / (thetaIntSetH - thetaExternal)",
          outputSymbol: "dtheta_float,ztc,m",
          outputUnit: "dimensionless",
          requiredInputs: ["thetaIntFloat", "thetaIntSetH", "thetaExternal"],
          conditions: ["explicit free-float temperature supplied"],
          dependencies: [],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 117, relation: "2.66" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_67_FREE_FLOAT_RATIO_FROM_GAINS",
          relationReference: "2.67",
          expressionText:
            "dtheta_float = QHgn / ((HHtr + HHve) * (theta_int_set_H - theta_e) * Delta_t_m)",
          machineExpression:
            "dThetaFloat = (qHgn * 1000) / ((Htr + Hve) * (thetaIntSetH - thetaExternal) * calculationDurationHours)",
          outputSymbol: "dtheta_float,ztc,m",
          outputUnit: "dimensionless",
          requiredInputs: [
            "qHgn",
            "transmissionHeatTransferCoefficientWK",
            "ventilationHeatTransferCoefficientWK",
            "thetaIntSetH",
            "thetaExternal",
            "calculationDurationHours"
          ],
          conditions: ["explicit gains and heat-transfer coefficients supplied"],
          dependencies: [],
          unitNormalization:
            "qHgn is supplied in kWh and heat-transfer denominator is Wh, so runtime multiplies qHgn by 1000",
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 117, relation: "2.67" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_68_LOW_SETPOINT_DURATION_FULL_PERIOD",
          relationReference: "2.68",
          expressionText:
            "if dtheta_set_H_low - dtheta_float <= 0 or heating is off then fHredlow = 1",
          machineExpression:
            "fHredLow = 1 when dThetaSetLow - dThetaFloat <= 0 or heatingOff",
          outputSymbol: "f_H,red,low,y,ztc,m",
          outputUnit: "dimensionless",
          requiredInputs: ["dThetaSetLow", "dThetaFloat", "heatingOff"],
          conditions: ["low setpoint reached for full reduction period or heating off"],
          dependencies: ["2.63", "2.64", "2.65", "2.66", "2.67"],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 118, relation: "2.68" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_69_LOW_SETPOINT_DURATION_ZERO",
          relationReference: "2.69",
          expressionText: "if dtheta_float = 1 then fHredlow = 0",
          machineExpression:
            "fHredLow = 0 when dThetaFloat equals 1 within runtime tolerance",
          outputSymbol: "f_H,red,low,y,ztc,m",
          outputUnit: "dimensionless",
          requiredInputs: ["dThetaFloat"],
          conditions: ["free-float ratio is one"],
          dependencies: ["2.66", "2.67"],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 118, relation: "2.69" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_70_LOW_SETPOINT_DURATION_FRACTION",
          relationReference: "2.70",
          expressionText:
            "fHredlow = (Delta_t_H_red_low / tauH) / (Delta_t_H_red / tauH)",
          machineExpression: "fHredLow = lowDurationRatio / periodDurationRatio",
          outputSymbol: "f_H,red,low,y,ztc,m",
          outputUnit: "dimensionless",
          requiredInputs: ["lowDurationRatio", "periodDurationRatio"],
          conditions: ["relations 2.68 and 2.69 do not apply"],
          dependencies: ["2.71"],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 118, relation: "2.70" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_71_LOW_DURATION_RATIO",
          relationReference: "2.71",
          expressionText:
            "Delta_t_H_red_low / tauH = -ln((dtheta_set_H_low - dtheta_float) / (1 - dtheta_float))",
          machineExpression:
            "lowDurationRatio = -ln((dThetaSetLow - dThetaFloat) / (1 - dThetaFloat))",
          outputSymbol: "Delta_t_H,red,low,y,ztc,m / tau_H,ztc,m",
          outputUnit: "dimensionless",
          requiredInputs: ["dThetaSetLow", "dThetaFloat"],
          conditions: ["log argument is positive and finite"],
          dependencies: ["2.63", "2.64", "2.65", "2.66", "2.67"],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 118, relation: "2.71" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_72_MEAN_REDUCTION_FULL_LOW_PERIOD",
          relationReference: "2.72",
          expressionText:
            "if fHredlow >= 1 then dthetaHredmn = dtheta_float + ((1 - dtheta_float) / (Delta_t_H_red / tauH)) * (1 - exp(-(Delta_t_H_red / tauH)))",
          machineExpression:
            "dThetaRedMean = dThetaFloat + ((1 - dThetaFloat) / periodDurationRatio) * (1 - exp(-periodDurationRatio))",
          outputSymbol: "dtheta_H,red,mn,y,ztc,m",
          outputUnit: "dimensionless",
          requiredInputs: ["dThetaFloat", "periodDurationRatio", "fHredLow"],
          conditions: ["fHredLow >= 1"],
          dependencies: ["2.62", "2.68", "2.69", "2.70"],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 119, relation: "2.72" }
        },
        {
          candidateCode: "MC001_R11_RELATION_2_73_MEAN_REDUCTION_PARTIAL_LOW_PERIOD",
          relationReference: "2.73",
          expressionText:
            "dthetaHredmn = ((1 - dtheta_set_H_low) / (Delta_t_H_red / tauH)) + fHredlow * dtheta_float + (1 - fHredlow) * dtheta_set_H_low",
          machineExpression:
            "dThetaRedMean = ((1 - dThetaSetLow) / periodDurationRatio) + fHredLow * dThetaFloat + (1 - fHredLow) * dThetaSetLow",
          outputSymbol: "dtheta_H,red,mn,y,ztc,m",
          outputUnit: "dimensionless",
          requiredInputs: ["dThetaSetLow", "dThetaFloat", "fHredLow", "periodDurationRatio"],
          conditions: ["fHredLow < 1"],
          dependencies: ["2.62", "2.68", "2.69", "2.70"],
          scopeClassification: "heating_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceLocator: { page: 119, relation: "2.73" }
        }
      ],
      dependencyGraph: {
        explicitInputs: [
          "thetaIntSetH",
          "thetaExternal",
          "qHgn",
          "transmissionHeatTransferCoefficientWK",
          "ventilationHeatTransferCoefficientWK",
          "calculationDurationHours",
          "tauH",
          "reductionPeriods"
        ],
        chain: [
          "relations_2_63_to_2_65_reduced_setpoint_ratio",
          "relation_2_66_or_2_67_free_float_ratio",
          "relations_2_68_to_2_71_low_setpoint_duration_fraction",
          "relations_2_72_to_2_73_mean_temperature_difference_reduction",
          "relation_2_61_period_reduction_factor",
          "relation_2_60_combined_reduction_factor",
          "relation_2_59_corrected_heating_setpoint",
          "restricted_explicit_heat_transfer_QHht_from_corrected_setpoint"
        ],
        runtimeOutput: "QH;ht;ztc;m for restricted heating QHnd"
      },
      runtimeIntegration: {
        implementedModule: "mc001HeatingIntermittencyCalculation.mjs",
        integrationModule: "mc001RestrictedHeatingQhndCalculation.mjs",
        runtimeFormulaCode: "MC001_R11_HEATING_INTERMITTENCY_QHHT_FROM_CORRECTED_SETPOINT",
        qHhtOrigin: "calculated_from_explicit_heating_intermittency_correction",
        inputPolicy: [
          "explicit_inputs_only",
          "no_hidden_defaults",
          "no_schedule_defaults",
          "no_setpoint_defaults",
          "no_duration_defaults"
        ]
      },
      blockers: [
        "not_QC;nd",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_CPE_certificate",
        "no_system_losses",
        "no_hidden_defaults"
      ]
    },
    {
      sourcePackCode: R12_COOLING_QCND_FORMULA_SOURCE_PACK_CODE,
      sourcePackType: READINESS_SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: false,
      machineReadable: true,
      runtimeCalculatorStatus: "implemented_restricted_explicit_cooling_QCnd_runtime",
      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        sectionsVerified: ["2.8.3", "2.8.4", "2.9", "2.10"],
        pagesVerified: [120, 121, 122, 123, 124],
        figuresVerified: ["2.19"],
        relationsVerified: [
          "2.77",
          "2.78",
          "2.79",
          "2.80",
          "2.81",
          "2.82",
          "2.83",
          "2.85"
        ],
        extractionMethods: [
          "page.get_text(text)",
          "page.get_text(blocks)",
          "page.get_text(dict)",
          "page rendering to PNG",
          "visual inspection of rendered equations"
        ]
      },
      concept: {
        entryCode: "MC001_CONCEPT_COOLING_QCND_FORMULA",
        entryType: "concept",
        conceptCode: "cooling_qcnd_formula_runtime",
        targetSymbol: "QC;nd;ztc;m",
        registryKind: "machine_readable_restricted_runtime_source_pack",
        name: "Cooling useful demand formula source pack",
        unit: "kWh",
        purpose:
          "machine-encodes the explicit-input cooling useful-demand branches needed for restricted monthly and annual QCnd runtime",
        sourceLocator: {
          page: 120,
          figure: "2.19",
          subsection: "2.8.4"
        }
      },
      relationMap: [
        {
          relationReference: "figure_2.19",
          scopeClassification: "cooling_runtime_ready",
          implementationStatus: "implemented_restricted_runtime",
          runtimeFormulaCode: "MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND"
        },
        {
          relationReference: "2.77",
          scopeClassification: "cooling_runtime_ready",
          implementationStatus: "implemented_restricted_runtime",
          runtimeFormulaCode: "MC001_2_77_LONG_UNOCCUPIED_COOLING_INTERPOLATION"
        },
        {
          relationReference: "2.85",
          scopeClassification: "cooling_runtime_ready",
          implementationStatus: "implemented_restricted_runtime",
          runtimeFormulaCode: "MC001_2_85_ANNUAL_COOLING_USEFUL_DEMAND"
        },
        {
          relationReference: "2.78",
          scopeClassification: "cooling_metadata_only",
          implementationStatus: "not_required_for_QCnd_runtime_temperature_output"
        },
        {
          relationReference: "2.79",
          scopeClassification: "cooling_metadata_only",
          implementationStatus: "not_required_for_QCnd_runtime_temperature_output"
        },
        {
          relationReference: "2.80",
          scopeClassification: "downstream_overheating_metadata_only",
          implementationStatus: "out_of_current_QCnd_scope"
        },
        {
          relationReference: "2.81",
          scopeClassification: "downstream_overheating_metadata_only",
          implementationStatus: "out_of_current_QCnd_scope"
        },
        {
          relationReference: "2.82",
          scopeClassification: "latent_humidification_out_of_scope",
          implementationStatus: "out_of_current_QCnd_scope"
        },
        {
          relationReference: "2.83",
          scopeClassification: "latent_dehumidification_out_of_scope",
          implementationStatus: "out_of_current_QCnd_scope"
        }
      ],
      formulaCandidates: [
        {
          candidateCode: "MC001_R12_FIGURE_2_19_ZERO_INVERSE_GAMMA_BRANCH",
          relationReference: "figure_2.19",
          expressionText: "QC;nd;ztc;m = 0 when (1 / gammaC;ztc;m) > 2.0",
          machineExpression: "qCnd = 0 when (1 / gammaC) > 2",
          outputSymbol: "QC;nd;ztc;m",
          outputUnit: "kWh",
          requiredInputs: ["gammaC"],
          conditions: ["cooling monthly useful demand zero branch"],
          scopeClassification: "cooling_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 120 figure 2.19",
          sourceLocator: { page: 120, figure: "2.19" }
        },
        {
          candidateCode: "MC001_R12_FIGURE_2_19_COOLING_UTILIZED_TRANSFER_BRANCH",
          relationReference: "figure_2.19",
          expressionText:
            "QC;nd;ztc;m = aC;red;ztc;m * (QC;gn;ztc;m - etaC;ht;ztc;m * QC;ht;ztc;m)",
          machineExpression: "qCnd = aCred * (qCgn - etaCht * qCht)",
          outputSymbol: "QC;nd;ztc;m",
          outputUnit: "kWh",
          requiredInputs: ["aCred", "QC;gn;ztc;m", "etaC;ht;ztc;m", "QC;ht;ztc;m"],
          conditions: ["figure 2.19 non-zero cooling branch"],
          scopeClassification: "cooling_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 120 figure 2.19",
          sourceLocator: { page: 120, figure: "2.19" }
        },
        {
          candidateCode: "MC001_R12_RELATION_2_77_COOLING_LONG_UNOCCUPIED_INTERPOLATION",
          relationReference: "2.77",
          expressionText:
            "QC;nd;ztc;m = (1 - fC;nocc;ztc;m) * QC;nd;occ;ztc;m + fC;nocc;ztc;m * QC;nd;nocc;ztc;m",
          machineExpression: "qCnd = (1 - unoccupiedFraction) * qCndOccupied + unoccupiedFraction * qCndUnoccupied",
          outputSymbol: "QC;nd;ztc;m",
          outputUnit: "kWh",
          requiredInputs: ["qCndOccupied", "qCndUnoccupied", "unoccupiedFraction"],
          conditions: ["cooling long unoccupied period explicit interpolation"],
          scopeClassification: "cooling_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 121 relation 2.77",
          sourceLocator: { page: 121, relation: "2.77" }
        },
        {
          candidateCode: "MC001_R12_RELATION_2_85_ANNUAL_QCND",
          relationReference: "2.85",
          expressionText: "QC;nd;ztc;an = sum_m QC;nd;ztc;m",
          machineExpression: "annualQCnd = sum(qCnd for monthly cases)",
          outputSymbol: "QC;nd;ztc;an",
          outputUnit: "kWh",
          requiredInputs: ["monthly QC;nd;ztc;m cases"],
          conditions: ["explicit monthly case list"],
          scopeClassification: "cooling_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 124 relation 2.85",
          sourceLocator: { page: 124, relation: "2.85" }
        },
        {
          candidateCode: "MC001_R12_RELATIONS_2_78_TO_2_79_CALCULATED_ZONE_TEMPERATURE",
          relationReference: "2.78_to_2.79",
          expressionText: "cooling calculated operative temperature and cooling heat-transfer coefficient",
          machineExpression: "metadata_only_temperature_output_not_used_for_QCnd",
          outputSymbol: "theta_int;op;C;ztc;m",
          outputUnit: "degC",
          requiredInputs: ["QC;nd;ztc;m", "QC;gn;ztc;m", "HC;ht;ztc;m", "Delta_t_m"],
          conditions: ["temperature output after QCnd"],
          scopeClassification: "cooling_metadata_only",
          runtimeReadiness: "metadata_only_not_QCnd_runtime",
          sourceReference: "MC001-2022 page 121 relations 2.78 and 2.79",
          sourceLocator: { page: 121, relation: "2.78_to_2.79" }
        },
        {
          candidateCode: "MC001_R12_RELATIONS_2_80_TO_2_83_DOWNSTREAM_LATENT_AND_OVERHEATING",
          relationReference: "2.80_to_2.83",
          expressionText: "overheating and latent humidification/dehumidification indicators",
          machineExpression: "out_of_current_QCnd_scope",
          outputSymbol: "non_QCnd_downstream_outputs",
          outputUnit: "mixed",
          requiredInputs: ["out_of_scope"],
          conditions: ["not part of restricted sensible cooling useful demand runtime"],
          scopeClassification: "downstream_out_of_scope",
          runtimeReadiness: "not_used_by_QCnd_runtime",
          sourceReference: "MC001-2022 pages 122-124 relations 2.80 to 2.83",
          sourceLocator: { page: 122, relation: "2.80_to_2.83" }
        }
      ],
      runtimeIntegration: {
        implementedModule: "mc001CoolingUsefulDemandCalculation.mjs",
        runtimeFormulaCodes: [
          "MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND",
          "MC001_2_77_LONG_UNOCCUPIED_COOLING_INTERPOLATION",
          "MC001_2_85_ANNUAL_COOLING_USEFUL_DEMAND"
        ],
        inputPolicy: [
          "explicit_inputs_only",
          "no_hidden_defaults",
          "no_climate_defaults",
          "no_schedule_defaults",
          "no_setpoint_defaults"
        ]
      },
      blockers: [
        "not_full_QC;nd",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_CPE_certificate",
        "no_system_losses",
        "no_hidden_defaults"
      ]
    },
    {
      sourcePackCode: R13_COOLING_UTILIZATION_FACTOR_SOURCE_PACK_CODE,
      sourcePackType: READINESS_SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: false,
      machineReadable: true,
      runtimeCalculatorStatus:
        "implemented_restricted_explicit_cooling_utilization_runtime",
      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        section: "2.7.6. Factori de utilizare",
        pagesVerified: [114, 116],
        figuresVerified: ["2.15"],
        relationsVerified: ["2.56", "2.58"],
        extractionMethods: [
          "page.get_text(text)",
          "page.get_text(blocks)",
          "page rendering to PNG",
          "visual inspection of rendered equations"
        ]
      },
      concept: {
        entryCode: "MC001_CONCEPT_COOLING_UTILIZATION_FACTOR",
        entryType: "concept",
        conceptCode: "cooling_heat_transfer_utilization_factor_runtime",
        targetSymbol: "etaC;ht;ztc;m",
        registryKind: "machine_readable_restricted_runtime_source_pack",
        name: "Cooling heat-transfer utilization factor",
        unit: "dimensionless",
        purpose:
          "machine-encodes figure 2.15 and cooling aC/tauC dependencies for restricted QCnd runtime",
        sourceLocator: {
          page: 114,
          figure: "2.15",
          subsection: "2.7.6"
        }
      },
      formulaCandidates: [
        {
          candidateCode: "MC001_R13_FIGURE_2_15_GAMMA_C_BALANCE_RATIO",
          relationReference: "figure_2.15",
          expressionText: "gammaC;ztc;m = QC;gn;ztc;m / QC;ht;ztc;m",
          machineExpression: "gammaC = qCgn / qCht",
          outputSymbol: "gammaC;ztc;m",
          outputUnit: "dimensionless",
          requiredInputs: ["QC;gn;ztc;m", "QC;ht;ztc;m"],
          conditions: ["explicit cooling gains and heat transfer"],
          scopeClassification: "cooling_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 114 figure 2.15",
          sourceLocator: { page: 114, figure: "2.15" }
        },
        {
          candidateCode: "MC001_R13_FIGURE_2_15_ETA_C_POSITIVE_GAMMA_NOT_ONE",
          relationReference: "figure_2.15",
          expressionText:
            "etaC;ht;ztc;m = (1 - gammaC;ztc;m ^ (-aC;ztc;m)) / (1 - gammaC;ztc;m ^ (-(aC;ztc;m + 1)))",
          machineExpression: "etaCht = (1 - gammaC ** (-aC)) / (1 - gammaC ** (-(aC + 1)))",
          outputSymbol: "etaC;ht;ztc;m",
          outputUnit: "dimensionless",
          requiredInputs: ["gammaC", "aC"],
          conditions: ["gammaC > 0", "gammaC != 1"],
          scopeClassification: "cooling_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 114 figure 2.15",
          sourceLocator: { page: 114, figure: "2.15" }
        },
        {
          candidateCode: "MC001_R13_FIGURE_2_15_ETA_C_GAMMA_EQUALS_ONE",
          relationReference: "figure_2.15",
          expressionText: "etaC;ht;ztc;m = aC;ztc;m / (aC;ztc;m + 1)",
          machineExpression: "etaCht = aC / (aC + 1)",
          outputSymbol: "etaC;ht;ztc;m",
          outputUnit: "dimensionless",
          requiredInputs: ["aC"],
          conditions: ["gammaC = 1"],
          scopeClassification: "cooling_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 114 figure 2.15",
          sourceLocator: { page: 114, figure: "2.15" }
        },
        {
          candidateCode: "MC001_R13_FIGURE_2_15_ETA_C_NON_POSITIVE_GAMMA",
          relationReference: "figure_2.15",
          expressionText: "etaC;ht;ztc;m = 1 when gammaC;ztc;m <= 0",
          machineExpression: "etaCht = 1",
          outputSymbol: "etaC;ht;ztc;m",
          outputUnit: "dimensionless",
          requiredInputs: ["gammaC"],
          conditions: ["gammaC <= 0"],
          scopeClassification: "cooling_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 114 figure 2.15",
          sourceLocator: { page: 114, figure: "2.15" }
        },
        {
          candidateCode: "MC001_R13_RELATION_2_56_A_C_PARAMETER",
          relationReference: "2.56",
          expressionText: "aC;ztc;m = aC;0 + tauC;ztc;m / tauC;0",
          machineExpression: "aC = aC0 + tauC / tauC0",
          outputSymbol: "aC;ztc;m",
          outputUnit: "dimensionless",
          requiredInputs: ["aC0", "tauC", "tauC0"],
          conditions: ["reference parameters supplied explicitly"],
          scopeClassification: "cooling_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 114 relation 2.56",
          sourceLocator: { page: 114, relation: "2.56" }
        },
        {
          candidateCode: "MC001_R13_RELATION_2_58_TAU_C_TIME_CONSTANT",
          relationReference: "2.58",
          expressionText:
            "tauC;ztc;m = (Cm;eff;ztc / 3600) / (HC;tr(excl.grfl);ztc;m + HC;gr;adj;ztc + HC;ve;ztc;m)",
          machineExpression:
            "tauC = (effectiveInternalHeatCapacityJPerK / 3600) / coolingHeatTransferCoefficientWK",
          outputSymbol: "tauC;ztc;m",
          outputUnit: "h",
          requiredInputs: ["Cm;eff;ztc", "cooling heat-transfer coefficient components or total"],
          conditions: ["all inputs explicit and heat-transfer coefficient positive"],
          scopeClassification: "cooling_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 116 relation 2.58",
          sourceLocator: { page: 116, relation: "2.58" }
        }
      ],
      runtimeIntegration: {
        implementedModule: "mc001CoolingHeatTransferUtilizationFactorCalculation.mjs",
        integrationModule: "mc001CoolingUsefulDemandCalculation.mjs",
        runtimeFormulaCode: "MC001_FIGURE_2_15_COOLING_HEAT_TRANSFER_UTILIZATION_FACTOR",
        etaChtOrigin: "calculated_from_explicit_aC_or_time_constant_dependencies",
        inputPolicy: [
          "explicit_inputs_only",
          "no_hidden_defaults",
          "no_aC0_default",
          "no_tauC0_default",
          "no_capacity_default"
        ]
      },
      blockers: [
        "not_full_QC;nd",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_CPE_certificate",
        "no_system_losses",
        "no_hidden_defaults"
      ]
    },
    {
      sourcePackCode: R14_COOLING_INTERMITTENCY_SOURCE_PACK_CODE,
      sourcePackType: READINESS_SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: false,
      machineReadable: true,
      runtimeCalculatorStatus:
        "implemented_restricted_explicit_cooling_intermittency_runtime",
      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        section: "2.8.3. Corectii pentru racire intermitenta",
        pagesVerified: [119],
        relationsVerified: ["2.74", "2.75"],
        extractionMethods: [
          "page.get_text(text)",
          "page.get_text(blocks)",
          "page rendering to PNG",
          "visual inspection of rendered equations"
        ]
      },
      concept: {
        entryCode: "MC001_CONCEPT_COOLING_INTERMITTENCY_RELATIONS",
        entryType: "concept",
        conceptCode: "cooling_intermittency_relations_2_74_to_2_75",
        targetSymbol: "aC;red;ztc;m",
        registryKind: "machine_readable_restricted_runtime_source_pack",
        name: "Cooling intermittency relations 2.74 to 2.75",
        unit: "dimensionless",
        purpose:
          "machine-encodes explicit-input weekend cooling reduction used by restricted QCnd runtime",
        sourceLocator: {
          page: 119,
          subsection: "2.8.3"
        }
      },
      formulaCandidates: [
        {
          candidateCode: "MC001_R14_RELATION_2_74_COOLING_INTERMITTENCY_REDUCTION_FACTOR",
          relationReference: "2.74",
          expressionText:
            "aC;red;ztc;m = (1 - fC;red;wknd;ztc) + bC;red;wknd * fC;red;wknd;ztc",
          machineExpression: "aCred = (1 - fCredWknd) + bCredWknd * fCredWknd",
          outputSymbol: "aC;red;ztc;m",
          outputUnit: "dimensionless",
          requiredInputs: ["fCredWknd", "bCredWknd"],
          conditions: ["whole-weekend cooling reduction or shutdown with explicit factor"],
          scopeClassification: "cooling_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 119 relation 2.74",
          sourceLocator: { page: 119, relation: "2.74" }
        },
        {
          candidateCode: "MC001_R14_RELATION_2_75_COOLING_INTERMITTENCY_WEEK_FRACTION",
          relationReference: "2.75",
          expressionText:
            "fC;red;wknd;ztc = Delta_tC;red;wknd;ztc * nrep;C;red;wknd;ztc / (24 * 7)",
          machineExpression:
            "fCredWknd = weekendReductionDurationHours * weekendReductionRepetitionCount / (24 * 7)",
          outputSymbol: "fC;red;wknd;ztc",
          outputUnit: "dimensionless",
          requiredInputs: [
            "weekendReductionDurationHours",
            "weekendReductionRepetitionCount"
          ],
          conditions: ["weekend reduction duration and repetition count supplied explicitly"],
          scopeClassification: "cooling_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 119 relation 2.75",
          sourceLocator: { page: 119, relation: "2.75" }
        }
      ],
      runtimeIntegration: {
        implementedModule: "mc001CoolingIntermittencyCalculation.mjs",
        integrationModule: "mc001CoolingUsefulDemandCalculation.mjs",
        runtimeFormulaCode: "MC001_R14_RELATION_2_74_COOLING_INTERMITTENCY_REDUCTION_FACTOR",
        aCredOrigin: "calculated_from_explicit_weekend_cooling_reduction",
        inputPolicy: [
          "explicit_inputs_only",
          "no_hidden_defaults",
          "no_bCredWknd_default",
          "no_schedule_defaults",
          "no_setpoint_defaults"
        ]
      },
      blockers: [
        "not_full_QC;nd",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_CPE_certificate",
        "no_system_losses",
        "no_hidden_defaults"
      ]
    },
    {
      sourcePackCode: R15_ENVELOPE_MATERIALS_RESISTANCE_SOURCE_PACK_CODE,
      sourcePackType: SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: false,
      machineReadable: true,
      runtimeCalculatorStatus:
        "implemented_explicit_envelope_material_layer_resistance_runtime",
      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        sections: ["2.1.4", "2.4.1"],
        pagesVerified: [48, 77],
        relationsVerified: ["2.3", "2.6"],
        tablesVerified: ["2.2", "2.11"],
        extractionMethods: [
          "page.get_text(text)",
          "page.get_text(blocks)",
          "page.get_text(dict)",
          "page rendering to PNG",
          "visual inspection of rendered equations"
        ]
      },
      formulaCandidates: [
        {
          candidateCode: "MC001_R15_RELATION_2_3_LAMBDA_CORRECTION",
          relationReference: "2.3",
          expressionText: "lambda = a * lambda_normat",
          machineExpression: "lambdaWmK = correctionCoefficientA * lambdaNormatWmK",
          outputSymbol: "lambda",
          outputUnit: "W/(m*K)",
          requiredInputs: ["lambdaNormatWmK", "correctionCoefficientA"],
          conditions: ["material lambda and correction coefficient are explicit"],
          scopeClassification: "envelope_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 48 relation 2.3 and table 2.2",
          sourceLocator: { page: 48, relation: "2.3" }
        },
        {
          candidateCode: "MC001_R15_LAYER_RESISTANCE_FROM_THICKNESS_AND_LAMBDA",
          relationReference: "2.6_dependency",
          expressionText: "Rj = dj / lambdaJ",
          machineExpression: "layerResistance = thicknessM / lambdaWmK",
          outputSymbol: "Rj",
          outputUnit: "m2*K/W",
          requiredInputs: ["thicknessM", "lambdaWmK"],
          conditions: ["homogeneous layer and explicit thickness/lambda"],
          scopeClassification: "envelope_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 77 relation 2.6 layer sum dependency",
          sourceLocator: { page: 77, relation: "2.6" }
        },
        {
          candidateCode: "MC001_R15_RELATION_2_6_TOTAL_THERMAL_RESISTANCE",
          relationReference: "2.6",
          expressionText: "R = Rsi + sum(Rj) + sum(Ra) + Rse",
          machineExpression: "totalResistance = rsi + sum(layerR) + sum(airLayerR) + rse",
          outputSymbol: "R",
          outputUnit: "m2*K/W",
          requiredInputs: ["Rsi", "Rj[]", "Ra[]", "Rse"],
          conditions: ["surface resistances or coefficients and all layer resistances are explicit"],
          scopeClassification: "envelope_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 77 relation 2.6",
          sourceLocator: { page: 77, relation: "2.6" }
        },
        {
          candidateCode: "MC001_R15_SURFACE_RESISTANCE_FROM_SURFACE_COEFFICIENTS",
          relationReference: "2.6_surface_text",
          expressionText: "Rsi = 1 / hi and Rse = 1 / he",
          machineExpression: "rsi = 1 / hi; rse = 1 / he",
          outputSymbol: "Rsi/Rse",
          outputUnit: "m2*K/W",
          requiredInputs: ["hi", "he"],
          conditions: ["surface coefficients are explicit; no table default is applied"],
          scopeClassification: "envelope_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 77 adjacent text below relation 2.6",
          sourceLocator: { page: 77, relation: "2.6" }
        }
      ],
      runtimeIntegration: {
        implementedModule: "mc001EnvelopePhysicsCalculation.mjs",
        implementedExports: [
          "envelope_assembly_u_value_explicit_v1",
          "envelope_transmission_coefficient_explicit_v1"
        ],
        inputPolicy: [
          "explicit_inputs_only",
          "no_hidden_defaults",
          "no_default_material_lambda",
          "no_default_surface_resistances",
          "table_2_2_coefficients_only_when_explicitly_selected_or_supplied"
        ]
      },
      blockers: [
        "not_certificate",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "no_hidden_defaults",
        "no_default_material_lambda",
        "no_default_surface_resistances"
      ]
    },
    {
      sourcePackCode: R16_ENVELOPE_THERMAL_TRANSMITTANCE_SOURCE_PACK_CODE,
      sourcePackType: SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: false,
      machineReadable: true,
      runtimeCalculatorStatus:
        "implemented_explicit_envelope_U_value_runtime",
      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        section: "2.4.1. Calculul rezistentei termice si al transmitantei termice",
        pagesVerified: [79, 80],
        relationsVerified: ["2.7", "2.8", "2.9", "2.10"],
        extractionMethods: [
          "page.get_text(text)",
          "page.get_text(blocks)",
          "page.get_text(dict)",
          "page rendering to PNG",
          "visual inspection of rendered equations"
        ]
      },
      formulaCandidates: [
        {
          candidateCode: "MC001_R16_RELATION_2_7_THERMAL_TRANSMITTANCE",
          relationReference: "2.7",
          expressionText: "U = 1 / R",
          machineExpression: "uValue = 1 / totalResistance",
          outputSymbol: "U",
          outputUnit: "W/(m2*K)",
          requiredInputs: ["totalResistance"],
          conditions: ["plain one-dimensional U-value, not bridge-corrected"],
          scopeClassification: "envelope_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 79 relation 2.7",
          sourceLocator: { page: 79, relation: "2.7" }
        },
        {
          candidateCode: "MC001_R16_RELATION_2_8_CORRECTED_TRANSMITTANCE_METADATA",
          relationReference: "2.8",
          expressionText: "Uprime = 1 / Rprime = 1 / R + sum(psi*l)/A + sum(chi)/A",
          machineExpression:
            "correctedUPrime = explicit_input_or_transmission_bridge_path",
          outputSymbol: "Uprime",
          outputUnit: "W/(m2*K)",
          requiredInputs: ["R", "psi*l terms", "chi terms", "area"],
          conditions: ["used as explicit corrected U-prime or represented via explicit bridge terms"],
          scopeClassification: "envelope_metadata_and_runtime_dependency",
          runtimeReadiness: "metadata_only_use_R17_bridge_runtime_path",
          sourceReference: "MC001-2022 page 79 relation 2.8",
          sourceLocator: { page: 79, relation: "2.8" }
        },
        {
          candidateCode: "MC001_R16_RELATIONS_2_9_2_10_CORRECTED_RESISTANCE_METADATA",
          relationReference: "2.9-2.10",
          expressionText: "Rprime = r * R with r defined from explicit bridge terms",
          machineExpression: "correctedResistanceMetadataOnly",
          outputSymbol: "Rprime",
          outputUnit: "m2*K/W",
          requiredInputs: ["R", "bridge terms", "area"],
          conditions: ["metadata only; runtime uses U-prime explicit input or R17 bridge terms"],
          scopeClassification: "envelope_metadata_only",
          runtimeReadiness: "metadata_only_not_runtime_path",
          sourceReference: "MC001-2022 page 80 relations 2.9 and 2.10",
          sourceLocator: { page: 80, relation: "2.9-2.10" }
        }
      ],
      runtimeIntegration: {
        implementedModule: "mc001EnvelopePhysicsCalculation.mjs",
        uValueOriginCodes: [
          "calculated_from_explicit_layers_and_surfaces",
          "explicit_direct_u_value",
          "explicit_corrected_u_prime"
        ],
        inputPolicy: [
          "explicit_inputs_only",
          "no_hidden_defaults",
          "do_not_double_count_corrected_U_prime_and_bridge_terms"
        ]
      },
      blockers: [
        "not_certificate",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "no_hidden_defaults",
        "no_default_bridge_terms"
      ]
    },
    {
      sourcePackCode: R17_ENVELOPE_TRANSMISSION_COEFFICIENTS_SOURCE_PACK_CODE,
      sourcePackType: SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: false,
      machineReadable: true,
      runtimeCalculatorStatus:
        "implemented_explicit_envelope_Htr_runtime",
      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        sections: ["2.4.1", "2.7.1.1"],
        pagesVerified: [80, 81, 100],
        relationsVerified: ["2.11", "2.12", "2.13", "2.15", "2.27", "2.28"],
        extractionMethods: [
          "page.get_text(text)",
          "page.get_text(blocks)",
          "page.get_text(dict)",
          "page rendering to PNG",
          "visual inspection of rendered equations"
        ]
      },
      formulaCandidates: [
        {
          candidateCode: "MC001_R17_RELATION_2_11_DIRECT_TRANSMISSION_WITH_BRIDGES",
          relationReference: "2.11",
          expressionText: "Hd = sum(Uj*Aj) + sum(psiK*lK) + sum(chiJ)",
          machineExpression:
            "Hd = sum(elementU * area * boundaryFactor) + explicitBridgeTerms",
          outputSymbol: "Hd",
          outputUnit: "W/K",
          requiredInputs: ["Uj", "Aj", "psiK", "lK", "chiJ"],
          conditions: ["all element, area, and bridge values are explicit"],
          scopeClassification: "envelope_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 80 relation 2.11",
          sourceLocator: { page: 80, relation: "2.11" }
        },
        {
          candidateCode: "MC001_R17_RELATION_2_12_DIRECT_TRANSMISSION_WITH_CORRECTED_U",
          relationReference: "2.12",
          expressionText: "Hd = sum(UprimeJ*Aj)",
          machineExpression: "Hd = sum(correctedUPrime * area)",
          outputSymbol: "Hd",
          outputUnit: "W/K",
          requiredInputs: ["UprimeJ", "Aj"],
          conditions: ["corrected U-prime is explicit and bridge terms are not added again"],
          scopeClassification: "envelope_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 81 relation 2.12",
          sourceLocator: { page: 81, relation: "2.12" }
        },
        {
          candidateCode: "MC001_R17_RELATION_2_15_TOTAL_TRANSMISSION_COEFFICIENT",
          relationReference: "2.15",
          expressionText: "Htr = Hd + Hg + Hu + Ha",
          machineExpression: "htr = hd + hg + hu + ha",
          outputSymbol: "Htr",
          outputUnit: "W/K",
          requiredInputs: ["Hd", "Hg", "Hu", "Ha"],
          conditions: ["component coefficients are explicit or derived from explicit envelope elements"],
          scopeClassification: "envelope_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 81 relation 2.15",
          sourceLocator: { page: 81, relation: "2.15" }
        },
        {
          candidateCode: "MC001_R17_RELATION_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
          relationReference: "2.27",
          expressionText: "Htr(excl.ground) = sum(H_element) + Htr;tb",
          machineExpression: "htrExcludingGround = sum(elementCoefficients) + thermalBridgeCoefficient",
          outputSymbol: "HH/C;tr(excl.gr);ztc;m",
          outputUnit: "W/K",
          requiredInputs: ["element coefficients", "thermalBridgeCoefficient"],
          conditions: ["runtime dependency for monthly transmission; ground remains separate"],
          scopeClassification: "envelope_runtime_dependency",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 100 relation 2.27",
          sourceLocator: { page: 100, relation: "2.27" }
        },
        {
          candidateCode: "MC001_R17_RELATION_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT",
          relationReference: "2.28",
          expressionText: "Htr;tb;zt = sum(Psi_tb;k * l_tb;k)",
          machineExpression: "thermalBridgeCoefficient = sum(psi * length)",
          outputSymbol: "Htr;tb;zt",
          outputUnit: "W/K",
          requiredInputs: ["psi", "length"],
          conditions: ["linear bridge coefficients and lengths are explicit"],
          scopeClassification: "envelope_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 100 relation 2.28",
          sourceLocator: { page: 100, relation: "2.28" }
        }
      ],
      runtimeIntegration: {
        implementedModule: "mc001EnvelopePhysicsCalculation.mjs",
        resultOrigin: "calculated_from_explicit_envelope_assemblies_and_boundaries",
        integrationTargets: [
          "mc001MonthlyTransmissionEnergyCalculation.mjs",
          "mc001ExplicitTotalHeatTransferCalculation.mjs",
          "mc001RestrictedHeatingQhndCalculation.mjs",
          "mc001CoolingUsefulDemandCalculation.mjs"
        ],
        inputPolicy: [
          "explicit_inputs_only",
          "no_hidden_defaults",
          "no_default_thermal_bridge_values",
          "no_ground_calculation_without_explicit_boundary_factor"
        ]
      },
      blockers: [
        "not_certificate",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "no_hidden_defaults",
        "no_default_thermal_bridge_values"
      ]
    },
    {
      sourcePackCode: R18_ENVELOPE_BOUNDARY_CORRECTIONS_SOURCE_PACK_CODE,
      sourcePackType: SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: false,
      machineReadable: true,
      runtimeCalculatorStatus:
        "implemented_explicit_boundary_correction_runtime",
      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        sections: ["2.4.1", "2.6.2", "2.7.1.1"],
        pagesVerified: [81, 82, 94, 95, 100],
        relationsVerified: ["2.15", "2.21", "2.22", "2.27"],
        extractionMethods: [
          "page.get_text(text)",
          "page.get_text(blocks)",
          "page.get_text(dict)",
          "page rendering to PNG",
          "visual inspection of rendered equations"
        ]
      },
      formulaCandidates: [
        {
          candidateCode: "MC001_R18_OUTSIDE_AIR_DIRECT_HD_COMPONENT",
          relationReference: "2.15",
          expressionText: "outside-air envelope elements contribute to Hd",
          machineExpression: "HdElement = U * area",
          outputSymbol: "Hd",
          outputUnit: "W/K",
          requiredInputs: ["U", "area"],
          conditions: ["boundaryType is outside_air"],
          scopeClassification: "envelope_runtime_ready",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 81 relation 2.15 definitions",
          sourceLocator: { page: 81, relation: "2.15" }
        },
        {
          candidateCode: "MC001_R18_GROUND_BOUNDARY_EXPLICIT_FACTOR",
          relationReference: "2.15",
          expressionText: "ground-contact envelope elements contribute to Hg with explicit factor",
          machineExpression: "HgElement = U * area * explicitBoundaryCorrectionFactor",
          outputSymbol: "Hg",
          outputUnit: "W/K",
          requiredInputs: ["U", "area", "boundaryCorrectionFactor"],
          conditions: ["boundaryType is ground and correction factor is explicit"],
          scopeClassification: "envelope_runtime_ready_explicit_factor_only",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 81 relation 2.15 Hg component",
          sourceLocator: { page: 81, relation: "2.15" }
        },
        {
          candidateCode: "MC001_R18_UNHEATED_SPACE_EXPLICIT_FACTOR",
          relationReference: "2.15",
          expressionText: "unheated-space envelope elements contribute to Hu with explicit factor",
          machineExpression: "HuElement = U * area * explicitBoundaryCorrectionFactor",
          outputSymbol: "Hu",
          outputUnit: "W/K",
          requiredInputs: ["U", "area", "boundaryCorrectionFactor"],
          conditions: ["boundaryType is unheated_space/attic/basement and correction factor is explicit"],
          scopeClassification: "envelope_runtime_ready_explicit_factor_only",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 82 Hu definition and section 2.6.2 dependencies",
          sourceLocator: { page: 82, relation: "2.15bis" }
        },
        {
          candidateCode: "MC001_R18_ADJACENT_SPACE_EXPLICIT_FACTOR",
          relationReference: "2.15",
          expressionText: "adjacent-building envelope elements contribute to Ha with explicit factor",
          machineExpression: "HaElement = U * area * explicitBoundaryCorrectionFactor",
          outputSymbol: "Ha",
          outputUnit: "W/K",
          requiredInputs: ["U", "area", "boundaryCorrectionFactor"],
          conditions: ["boundaryType is adjacent_space and correction factor is explicit"],
          scopeClassification: "envelope_runtime_ready_explicit_factor_only",
          runtimeReadiness: "verified_for_restricted_runtime",
          sourceReference: "MC001-2022 page 82 Ha definition",
          sourceLocator: { page: 82, relation: "2.15bis" }
        }
      ],
      runtimeIntegration: {
        implementedModule: "mc001EnvelopePhysicsCalculation.mjs",
        boundaryOriginCodes: [
          "direct_exterior_boundary_factor_one",
          "explicit_Hg_boundary_correction_factor",
          "explicit_Hu_boundary_correction_factor",
          "explicit_Ha_boundary_correction_factor"
        ],
        inputPolicy: [
          "explicit_inputs_only",
          "no_hidden_defaults",
          "no_default_ground_factor",
          "no_default_unheated_space_factor",
          "no_default_adjacent_space_factor"
        ]
      },
      blockers: [
        "not_certificate",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "no_hidden_defaults",
        "no_default_boundary_corrections"
      ]
    },
    {
      sourcePackCode: R19_CHAPTER_2_COMPLETE_USEFUL_DEMAND_COVERAGE_SOURCE_PACK_CODE,
      sourcePackType: SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: false,
      machineReadable: true,
      runtimeCalculatorStatus:
        "implemented_explicit_chapter_2_useful_demand_coverage_map_and_12_month_calculation_layer",
      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        sections: [
          "2.1.4",
          "2.4.1",
          "2.4.2",
          "2.6.2",
          "2.7.1",
          "2.7.2",
          "2.7.3",
          "2.7.5",
          "2.8",
          "2.10"
        ],
        pagesVerified: [
          48,
          77,
          79,
          80,
          81,
          82,
          83,
          84,
          94,
          95,
          100,
          101,
          103,
          104,
          105,
          112,
          120,
          121,
          124
        ],
        relationsVerified: [
          "2.3",
          "2.6",
          "2.7",
          "2.8",
          "2.11",
          "2.12",
          "2.15",
          "2.22",
          "2.27",
          "2.28",
          "2.33",
          "2.36",
          "2.39",
          "2.50",
          "2.55",
          "2.56",
          "2.57",
          "2.58",
          "2.59-2.77",
          "2.84",
          "2.85"
        ],
        extractionMethods: [
          "page.get_text(text)",
          "page.get_text(blocks)",
          "page.get_text(dict)",
          "page rendering to PNG",
          "visual inspection of rendered equations",
          "existing reviewed extraction notes"
        ]
      },
      coverageMap: {
        runtimeImplemented: [
          "material_lambda_explicit",
          "material_lambda_relation_2_3_with_explicit_table_2_2_coefficient_code",
          "layer_resistance_from_thickness_and_lambda",
          "air_layer_resistance_explicit",
          "surface_resistance_explicit_or_surface_coefficient_explicit",
          "surface_resistance_table_2_11_explicit_code_lookup",
          "exterior_surface_resistance_table_2_12_explicit_wind_speed_code_lookup",
          "solar_transmission_table_2_13_explicit_glazing_type_lookup",
          "effective_internal_heat_capacity_table_2_20_explicit_class_area_lookup",
          "u_value_from_total_resistance",
          "direct_u_value_or_corrected_u_prime_explicit",
          "outside_air_direct_Hd",
          "ground_Hg_from_explicit_boundary_factor",
          "unheated_Hu_from_explicit_boundary_factor_or_relation_2_22_explicit_ratio",
          "adjacent_Ha_from_explicit_boundary_factor_or_relation_2_22_explicit_ratio",
          "linear_and_point_thermal_bridge_terms_explicit",
          "Htr_component_sum",
          "monthly_transmission_explicit_temperature_duration",
          "monthly_ventilation_explicit_airflow_temperature_duration",
          "monthly_heat_gains_explicit_internal_plus_solar_sum",
          "heating_QHnd_normal_boundary_intermittency_long_unoccupied",
          "cooling_QCnd_normal_boundary_intermittency_long_unoccupied",
          "annual_QHnd_sum_relation_2_84",
          "annual_QCnd_sum_relation_2_85",
          "combined_QHnd_QCnd_separate_output",
          "twelve_month_explicit_chapter_2_calculation_layer"
        ],
        explicitInputOnly: [
          "base_material_lambda_normat",
          "surface_resistance_table_selection",
          "air_layer_resistance_explicit_or_external_SR_EN_ISO_6946_source",
          "opaque_solar_absorptance",
          "monthly_weather_temperatures",
          "monthly_durations",
          "ventilation_airflows_and_corrections",
          "internal_gain_components_and_schedules",
          "solar_irradiation_orientation_shading_and_range_glazing_properties",
          "direct_effective_internal_heat_capacity_or_table_2_20_class_area_source",
          "thermal_bridge_psi_chi_values"
        ],
        tableBackedNotEncoded: [
          "material_lambda_catalog_values",
          "window_door_catalog_U_values",
          "solar_climate_annex_full_dataset",
          "thermal_bridge_catalog_rows_with_missing_geometry"
        ],
        ambiguousExtraction: [
          "automatic_ground_contact_detailed_method",
          "automatic_unheated_space_balance_defaults",
          "automatic_adjacent_space_balance_defaults"
        ],
        outOfChapter2UsefulDemandScope: [
          "final_energy",
          "primary_energy",
          "CO2",
          "CPE",
          "certificate",
          "system_losses",
          "fan_electricity",
          "air_treatment_energy"
        ]
      },
      runtimeIntegration: {
        implementedModules: [
          "mc001EnvelopePhysicsCalculation.mjs",
          "mc001MonthlyTransmissionEnergyCalculation.mjs",
          "mc001VentilationTransferCalculation.mjs",
          "mc001MonthlyHeatGainsCalculation.mjs",
          "mc001RestrictedHeatingQhndCalculation.mjs",
          "mc001CoolingUsefulDemandCalculation.mjs",
          "mc001UsefulDemandAggregation.mjs",
          "mc001Chapter2UsefulDemandCalculation.mjs"
        ],
        implementedExport: "chapter_2_useful_demand_explicit_v1",
        outputPolicy: [
          "separate_annualQHnd_and_annualQCnd",
          "no_ambiguous_total_useful_demand",
          "no_final_energy",
          "no_primary_energy",
          "no_CO2",
          "no_certificate"
        ],
        inputPolicy: [
          "explicit_inputs_only",
          "no_hidden_defaults",
          "no_default_material_lambda",
          "no_default_surface_resistance",
          "no_default_climate",
          "no_default_gains",
          "no_default_schedules"
        ]
      },
      completenessAssessment: {
        status: "chapter_2_useful_demand_explicit_runtime_substantially_covered_not_universal_certificate",
        restrictiveMarkersRetained: [
          "explicit_input_only",
          "not_final_energy",
          "not_primary_energy",
          "not_CO2",
          "not_CPE",
          "not_certificate"
        ],
        remainingGaps: [
          "default_material_lambda_catalog_values_not_encoded",
          "air_layer_resistance_external_SR_EN_ISO_6946_dependency_not_fabricated",
          "automatic_ground_contact_detailed_method_not_encoded",
          "solar_climate_orientation_shading_and_range_glazing_inputs_not_defaulted",
          "final_primary_CO2_CPE_certificate_out_of_scope"
        ]
      },
      blockers: [
        "not_certificate",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_CPE",
        "no_hidden_defaults",
        "no_default_material_lambda",
        "no_default_surface_resistances",
        "no_default_climate",
        "no_default_gains",
        "no_default_schedules"
      ]
    },
    {
      sourcePackCode: R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE,
      sourcePackType: SOURCE_PACK_TYPE,
      verificationStatus: R2_VERIFICATION_STATUS,
      implementationStatus: IMPLEMENTATION_STATUS,
      metadataOnly: false,
      machineReadable: true,
      runtimeCalculatorStatus:
        "executable_chapter_2_coverage_matrix_and_nonclosure_gate",
      sourceScope: {
        chapter: "Capitolul 2. Anvelopa termica a cladirii",
        sections: [
          "2.1",
          "2.2",
          "2.3",
          "2.4",
          "2.5",
          "2.6",
          "2.7",
          "2.8",
          "2.9",
          "2.10",
          "2.11",
          "2.12"
        ],
        pagesVerified: chapter2IntegerRange(CHAPTER_2_FIRST_PAGE, CHAPTER_2_LAST_PAGE),
        relationsVerified: CHAPTER_2_RELATION_NUMBERS,
        tablesVerified: CHAPTER_2_TABLE_NUMBERS,
        figuresVerified: CHAPTER_2_FIGURE_NUMBERS,
        extractionMethods: [
          "page.get_text(text)",
          "page.get_text(blocks)",
          "page.get_text(dict)",
          "page rendering to PNG",
          "cropped visual inspection where text extraction is fragmented",
          "existing reviewed source-pack notes R0-R19"
        ]
      },
      coverageMatrix: CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX,
      completenessGate: {
        closureStatus: "CHAPTER_2_NOT_CLOSED",
        reason:
          "The exhaustive matrix classifies every Chapter 2 page/relation/table/figure currently identified, but closure is withheld because table-backed defaults and ambiguous relation-number gaps remain unresolved.",
        unresolvedItemIds: [
          "MC001_RELATION_2_2",
          "MC001_RELATION_2_5",
          "MC001_TABLE_2_1",
          "MC001_TABLE_2_14",
          "MC001_TABLE_2_15",
          "MC001_TABLE_2_16",
          "MC001_TABLE_2_17",
          "MC001_TABLE_2_21"
        ],
        nextImplementationDomains: [
          "material_lambda_catalog_tables",
          "solar_climate_orientation_shading_inputs",
          "latent_humidification_and_dehumidification_relations"
        ]
      },
      blockers: [
        "chapter_2_not_closed",
        "ambiguous_relation_2_2",
        "ambiguous_relation_2_5",
        "table_backed_defaults_not_fully_machine_encoded",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_CPE",
        "not_certificate",
        "no_hidden_defaults"
      ]
    }
  ]
});

function validateMethodology(registry) {
  return (
    registry?.methodology?.methodologyCode === METHODOLOGY_CODE &&
    registry.methodology.methodologyVersion === METHODOLOGY_VERSION &&
    registry.methodology.technicalRegulationCode === TECHNICAL_REGULATION_CODE
  );
}

function validateOfficialDocument(registry) {
  return (
    hasRequiredString(registry?.officialDocument?.title) &&
    registry.officialDocument.publication ===
      "Monitorul Oficial al României, Partea I, nr. 46 bis/17.I.2023" &&
    registry.officialDocument.order === "Ordinul nr. 16/2023" &&
    registry.officialDocument.sourceType === OFFICIAL_SOURCE_TYPE
  );
}

function validateBztuSourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termică a clădirii" &&
    sourceScope.section === "2.6.2. Zonarea termică" &&
    sourceScope.subsection === "2.6.2.2. Factori de corecție și de distribuție" &&
    arraysMatchExactly(sourceScope.pagesVerified, [94, 95, 96, 109])
  );
}

function validateHtrSpineSourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termică a clădirii" &&
    sourceScope.section === "2.4. Rezistențe termice" &&
    arraysMatchExactly(sourceScope.pagesVerified, [81, 82]) &&
    arraysMatchExactly(sourceScope.relationsVerified, ["2.12", "2.13", "2.14", "2.15"])
  );
}

function validateMonthlyTransmissionSourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termică a clădirii" &&
    sourceScope.section === "2.7.1. Transferul termic total" &&
    sourceScope.subsection === "2.7.1.1. Transferul termic prin transmisie" &&
    arraysMatchExactly(sourceScope.pagesVerified, [99, 100]) &&
    arraysMatchExactly(sourceScope.figuresVerified, ["2.10", "2.11", "2.12"]) &&
    arraysMatchExactly(sourceScope.relationsVerified, ["2.27", "2.28"])
  );
}

function validateQhndMonthlySourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termica a cladirii" &&
    sourceScope.section ===
      "2.7. Calculul necesarului de energie pentru climatizare folosind metoda de calcul lunar" &&
    arraysMatchExactly(sourceScope.pagesVerified, [
      98,
      99,
      100,
      101,
      102,
      103,
      104,
      105,
      106,
      107,
      108,
      109,
      110,
      111,
      112,
      113,
      114,
      115,
      116,
      117,
      118,
      119,
      120,
      121,
      124,
      125
    ]) &&
    arraysMatchExactly(sourceScope.sectionsVerified, [
      "2.7",
      "2.7.1",
      "2.7.1.1",
      "2.7.1.2",
      "2.7.2",
      "2.7.3",
      "2.7.5",
      "2.7.6",
      "2.8",
      "2.10"
    ]) &&
    arraysMatchExactly(sourceScope.figuresVerified, [
      "2.9",
      "2.10",
      "2.13",
      "2.14",
      "2.15",
      "2.16",
      "2.17",
      "2.18",
      "2.19"
    ]) &&
    arraysMatchExactly(sourceScope.relationsVerified, [
      "2.29",
      "2.30",
      "2.32",
      "2.33",
      "2.34",
      "2.37",
      "2.38",
      "2.55",
      "2.56",
      "2.57",
      "2.58",
      "2.59",
      "2.67",
      "2.72",
      "2.73",
      "2.74",
      "2.75",
      "2.76",
      "2.77",
      "2.84",
      "2.85"
    ])
  );
}

function validateFigure218HeatingSourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termica a cladirii" &&
    sourceScope.section ===
      "2.8. Particularitati ale calculului necesarului de energie propriu sistemului" &&
    sourceScope.subsection === "2.8.4. Corectii pentru perioada de neocupare" &&
    arraysMatchExactly(sourceScope.parentSectionsVerified, [
      "2.7",
      "2.7.6",
      "2.8",
      "2.8.4",
      "2.10"
    ]) &&
    arraysMatchExactly(sourceScope.pagesVerified, [114, 120, 121, 122, 125]) &&
    arraysMatchExactly(sourceScope.figuresVerified, ["2.14", "2.18", "2.19"]) &&
    arraysMatchExactly(sourceScope.relationsVerified, ["2.55", "2.57", "2.76", "2.77", "2.84"])
  );
}

function validateUtilizationHeatingSourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termica a cladirii" &&
    sourceScope.section === "2.7.6. Factori de utilizare" &&
    sourceScope.subsection === "factor de utilizare a aporturilor pentru incalzire" &&
    arraysMatchExactly(sourceScope.parentSectionsVerified, [
      "2.7",
      "2.7.5",
      "2.7.6",
      "2.8.4"
    ]) &&
    arraysMatchExactly(sourceScope.pagesVerified, [112, 113, 116, 120]) &&
    arraysMatchExactly(sourceScope.figuresVerified, ["2.14", "2.18"]) &&
    arraysMatchExactly(sourceScope.tablesVerified, ["2.19", "2.20"]) &&
    arraysMatchExactly(sourceScope.relationsVerified, ["2.55", "2.57"])
  );
}

function validateGainsCapacitySourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termica a cladirii" &&
    sourceScope.section ===
      "2.7. Calculul necesarului de energie pentru climatizare folosind metoda de calcul lunar" &&
    arraysMatchExactly(sourceScope.parentSectionsVerified, [
      "2.7",
      "2.7.2",
      "2.7.3",
      "2.7.5",
      "2.7.6",
      "2.8.4"
    ]) &&
    arraysMatchExactly(sourceScope.pagesVerified, [
      103,
      104,
      105,
      106,
      107,
      108,
      109,
      110,
      111,
      112,
      116,
      120
    ]) &&
    arraysMatchExactly(sourceScope.figuresVerified, ["2.13", "2.18"]) &&
    arraysMatchExactly(sourceScope.tablesVerified, ["2.19", "2.20"]) &&
    arraysMatchExactly(sourceScope.relationsVerified, [
      "2.33",
      "2.34",
      "2.35",
      "2.36",
      "2.37",
      "2.38",
      "2.39",
      "2.50",
      "2.57"
    ])
  );
}

function validateQhndAmbiguitySourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termica a cladirii" &&
    sourceScope.section ===
      "2.7.6 factori de utilizare si 2.8.4 corectii pentru perioada de neocupare" &&
    sourceScope.subsection === "figure 2.18 heating QH;nd ambiguity resolution" &&
    arraysMatchExactly(sourceScope.parentSectionsVerified, ["2.7", "2.7.6", "2.8.4"]) &&
    arraysMatchExactly(sourceScope.pagesVerified, [113, 116, 120]) &&
    arraysMatchExactly(sourceScope.figuresVerified, ["2.14", "2.18"]) &&
    arraysMatchExactly(sourceScope.relationsVerified, ["2.55", "2.57"]) &&
    arraysMatchExactly(sourceScope.adjacentSymbolDefinitionsVerified, [
      "gammaH;ztc;m",
      "QH;ht;ztc;m",
      "QH;gn;ztc;m",
      "etaH;gn;ztc;m",
      "QH;nd;ztc;m"
    ])
  );
}

function validateBztuConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_BZTU_CORRECTION_FACTOR" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "bztu_correction_factor" &&
    concept.targetSymbol === "b_ztu,m" &&
    concept.registryKind === "formula_backed_registry" &&
    concept.unit === "dimensionless" &&
    sourceLocatorLooksValid(concept.sourceLocator, 95)
  );
}

function validateHtrSpineConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_HTR_TRANSMISSION_COEFFICIENT" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "htr_transmission_coefficient" &&
    concept.targetSymbol === "H_tr" &&
    concept.registryKind === "formula_backed_registry" &&
    concept.unit === "W/K" &&
    hasRequiredString(concept.name) &&
    hasRequiredString(concept.purpose)
  );
}

function validateMonthlyTransmissionConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_MONTHLY_TRANSMISSION_TRANSFER" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "monthly_transmission_transfer" &&
    concept.registryKind === "formula_backed_registry" &&
    concept.unit === "kWh" &&
    hasRequiredString(concept.name) &&
    hasRequiredString(concept.purpose)
  );
}

function validateQhndMonthlyConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_QHND_MONTHLY_USEFUL_ENERGY_DEMAND" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "monthly_useful_energy_demand_readiness" &&
    concept.targetSymbol === "QH;nd;ztc;m / QC;nd;ztc;m" &&
    concept.registryKind === "metadata_only_readiness_registry" &&
    concept.unit === "kWh" &&
    hasRequiredString(concept.name) &&
    hasRequiredString(concept.purpose) &&
    sourceLocatorLooksValid(concept.sourceLocator, 121) &&
    concept.sourceLocator.figure === "2.18"
  );
}

function validateFigure218HeatingConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_FIGURE_2_18_HEATING_BRANCH" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "figure_2_18_heating_branch_readiness" &&
    concept.targetSymbol === "QH;nd;ztc;m" &&
    concept.registryKind === "metadata_only_readiness_registry" &&
    concept.unit === "kWh" &&
    hasRequiredString(concept.name) &&
    hasRequiredString(concept.purpose) &&
    sourceLocatorLooksValid(concept.sourceLocator, 121) &&
    concept.sourceLocator.figure === "2.18"
  );
}

function validateUtilizationHeatingConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_UTILIZATION_FACTORS_HEATING_READINESS" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "utilization_factors_heating_readiness" &&
    concept.targetSymbol === "etaH;gn;ztc;m" &&
    concept.registryKind === "metadata_only_readiness_registry" &&
    concept.unit === "dimensionless" &&
    hasRequiredString(concept.name) &&
    hasRequiredString(concept.purpose) &&
    sourceLocatorLooksValid(concept.sourceLocator, 113) &&
    concept.sourceLocator.figure === "2.14"
  );
}

function validateGainsCapacityConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_GAINS_CAPACITY_TIMECONSTANT_READINESS" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "gains_capacity_timeconstant_readiness" &&
    concept.targetSymbol === "QH;gn;ztc;m + Cm;eff;ztc + tauH;ztc;m" &&
    concept.registryKind === "metadata_only_readiness_registry" &&
    concept.unit === "metadata_only" &&
    hasRequiredString(concept.name) &&
    hasRequiredString(concept.purpose) &&
    sourceLocatorLooksValid(concept.sourceLocator, 103)
  );
}

function validateQhndAmbiguityConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_QHND_AMBIGUITY_RESOLUTION_READINESS" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "qhnd_ambiguity_resolution_readiness" &&
    concept.targetSymbol === "QH;nd;ztc;m" &&
    concept.registryKind === "metadata_only_readiness_registry" &&
    concept.unit === "metadata_only" &&
    hasRequiredString(concept.name) &&
    hasRequiredString(concept.purpose) &&
    sourceLocatorLooksValid(concept.sourceLocator, 120) &&
    concept.sourceLocator.figure === "2.18"
  );
}

function validateZoneTypes(zoneTypes) {
  if (!Array.isArray(zoneTypes) || zoneTypes.length !== 2) {
    return false;
  }
  if (!setMatchesExactly(zoneTypes.map((entry) => entry.zoneTypeCode), ZONE_TYPE_CODES)) {
    return false;
  }
  for (const entry of zoneTypes) {
    if (
      !ENTRY_CODES.has(entry.entryCode) ||
      entry.entryType !== "zone_type" ||
      !sourceLocatorLooksValid(entry.sourceLocator, 94)
    ) {
      return false;
    }
  }
  return true;
}

function validateConstant(constant) {
  return (
    isObject(constant) &&
    constant.entryCode === "MC001_CONSTANT_2_24_C_ZTU_VE_RECOMMENDED" &&
    constant.entryType === "constant" &&
    constant.constantCode === C_ZTU_VE_CONSTANT_CODE &&
    constant.symbol === "c_ztu,ve" &&
    constant.recommendedValue === 0.5 &&
    constant.unit === "dimensionless"
  );
}

function validateFormulaBase(formula) {
  const relationCode = FORMULA_RELATION_BY_CODE[formula?.formulaCode];
  return (
    isObject(formula) &&
    ENTRY_CODES.has(formula.entryCode) &&
    formula.entryType === "formula" &&
    FORMULA_CODES.has(formula.formulaCode) &&
    relationCode === formula.relationCode &&
    FORMULA_RESULT_UNIT_BY_CODE[formula.formulaCode] === formula.result?.unit &&
    !Object.hasOwn(formula, "value") &&
    !Object.hasOwn(formula, "values") &&
    !Object.hasOwn(formula, "defaultValue") &&
    !Object.hasOwn(formula, "defaultValues") &&
    !hasForbiddenNumericValueField(formula) &&
    hasRequiredString(formula.equationText) &&
    sourceLocatorLooksValid(formula.sourceLocator, FORMULA_PAGE_BY_CODE[formula.formulaCode]) &&
    formula.sourceLocator.relation === formula.relationCode
  );
}

function validateBztuFormulas(formulas) {
  if (!Array.isArray(formulas) || formulas.length !== 4) {
    return false;
  }
  if (!setMatchesExactly(formulas.map((entry) => entry.formulaCode), R0_FORMULA_CODES)) {
    return false;
  }
  for (const formula of formulas) {
    if (!validateFormulaBase(formula)) {
      return false;
    }
    if (formula.formulaCode === "MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER") {
      if (
        !Array.isArray(formula.constants) ||
        formula.constants.length !== 1 ||
        !validateConstant(formula.constants[0])
      ) {
        return false;
      }
    } else if (Object.hasOwn(formula, "constants")) {
      return false;
    }
  }
  return true;
}

function validateHtrSpineComponents(components) {
  const expected = [
    ["H_d", "W/K"],
    ["H_g", "W/K"],
    ["H_u", "W/K"],
    ["H_a", "W/K"]
  ];
  if (!Array.isArray(components) || components.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (
      components[index].symbol !== expected[index][0] ||
      components[index].unit !== expected[index][1] ||
      !hasRequiredString(components[index].meaning)
    ) {
      return false;
    }
  }
  return true;
}

function validateHtrSpineFormulas(formulas) {
  if (!Array.isArray(formulas) || formulas.length !== 4) {
    return false;
  }
  if (!setMatchesExactly(
    formulas.map((entry) => entry.formulaCode),
    HTR_SPINE_FORMULA_CODES
  )) {
    return false;
  }
  for (const formula of formulas) {
    if (!validateFormulaBase(formula)) {
      return false;
    }
    if (formula.formulaCode === "MC001_2_15_HTR_TOTAL_TRANSMISSION") {
      if (!validateHtrSpineComponents(formula.components)) {
        return false;
      }
    } else if (Object.hasOwn(formula, "components")) {
      return false;
    }
  }
  return true;
}

function validateMonthlyFormulaAliases(formula) {
  return (
    formula.formulaCode === "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND" &&
    arraysMatchExactly(formula.notationAliases, [
      "H_H/C;tr(excl.grnd flr);ztc;m",
      "H_H/C;tr(excl.gf);ztc;m"
    ])
  );
}

function validateMonthlyFormulaTerms(formula) {
  if (formula.formulaCode !== "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT") {
    return false;
  }
  if (formula.equationText.toLowerCase().includes("chi")) {
    return false;
  }
  const expected = [
    ["l_tb;k", "m"],
    ["Psi_tb;k", "W/(m*K)"]
  ];
  if (!Array.isArray(formula.terms) || formula.terms.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (
      formula.terms[index].symbol !== expected[index][0] ||
      formula.terms[index].unit !== expected[index][1] ||
      !hasRequiredString(formula.terms[index].meaning)
    ) {
      return false;
    }
  }
  return true;
}

function validateMonthlyTransmissionFormulas(formulas) {
  if (!Array.isArray(formulas) || formulas.length !== 2) {
    return false;
  }
  if (!setMatchesExactly(
    formulas.map((entry) => entry.formulaCode),
    MONTHLY_TRANSMISSION_FORMULA_CODES
  )) {
    return false;
  }
  for (const formula of formulas) {
    if (!validateFormulaBase(formula)) {
      return false;
    }
    if (formula.formulaCode === "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND") {
      if (!validateMonthlyFormulaAliases(formula) || Object.hasOwn(formula, "terms")) {
        return false;
      }
    }
    if (formula.formulaCode === "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT") {
      if (
        !validateMonthlyFormulaTerms(formula) ||
        Object.hasOwn(formula, "notationAliases")
      ) {
        return false;
      }
    }
  }
  return true;
}

function validateBztuFigures(figures) {
  if (!Array.isArray(figures) || figures.length !== 1) {
    return false;
  }
  const figure = figures[0];
  if (
    !ENTRY_CODES.has(figure.entryCode) ||
    figure.entryType !== "figure" ||
    figure.figureCode !== "MC001_FIGURE_2_8_ZTC_ZTU_DISTRIBUTION_FACTOR" ||
    !FIGURE_CODES.has(figure.figureCode) ||
    figure.page !== 95 ||
    figure.status !== "source_metadata_only" ||
    !sourceLocatorLooksValid(figure.sourceLocator, 95) ||
    !Array.isArray(figure.rules) ||
    figure.rules.length !== 2 ||
    !setMatchesExactly(figure.rules.map((entry) => entry.caseCode), DISTRIBUTION_RULE_CODES)
  ) {
    return false;
  }
  for (const rule of figure.rules) {
    if (
      !ENTRY_CODES.has(rule.entryCode) ||
      rule.entryType !== "distribution_rule" ||
      rule.unit !== "dimensionless" ||
      !hasRequiredString(rule.equationText)
    ) {
      return false;
    }
  }
  return true;
}

function validateMonthlyTransmissionFigures(figures) {
  if (!Array.isArray(figures) || figures.length !== 3) {
    return false;
  }
  if (!setMatchesExactly(figures.map((entry) => entry.figureCode), new Set([
    "MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER",
    "MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER",
    "MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT"
  ]))) {
    return false;
  }
  for (const figure of figures) {
    if (
      !ENTRY_CODES.has(figure.entryCode) ||
      figure.entryType !== "figure" ||
      !FIGURE_CODES.has(figure.figureCode) ||
      FIGURE_PAGE_BY_CODE[figure.figureCode] !== figure.page ||
      figure.status !== "source_metadata_only" ||
      !sourceLocatorLooksValid(figure.sourceLocator, figure.page) ||
      figure.sourceLocator.figure !== FIGURE_NUMBER_BY_CODE[figure.figureCode]
    ) {
      return false;
    }
  }
  return true;
}

function validateApplicabilityRules(rules, expectedSet) {
  if (!Array.isArray(rules) || rules.length !== expectedSet.size) {
    return false;
  }
  if (!setMatchesExactly(rules.map((entry) => entry.ruleCode), expectedSet)) {
    return false;
  }
  for (const rule of rules) {
    if (
      !ENTRY_CODES.has(rule.entryCode) ||
      rule.entryType !== "applicability_rule" ||
      !APPLICABILITY_RULE_CODES.has(rule.ruleCode) ||
      !hasRequiredString(rule.ruleText) ||
      !sourceLocatorLooksValid(rule.sourceLocator)
    ) {
      return false;
    }
  }
  return true;
}

function validateDefaultValueCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length !== 1) {
    return false;
  }
  const candidate = candidates[0];
  return (
    candidate.entryCode === "MC001_DEFAULT_CANDIDATE_BZTU_VALUES_WITH_GAINS" &&
    candidate.entryType === "default_value_candidate" &&
    candidate.candidateCode === BZTU_DEFAULT_CANDIDATE_CODE &&
    candidate.status === "mentioned_but_not_extracted_as_numeric_table" &&
    candidate.page === 109 &&
    candidate.numericDefaultsAvailable === false &&
    !Object.hasOwn(candidate, "value") &&
    !Object.hasOwn(candidate, "values") &&
    !Object.hasOwn(candidate, "defaultValue") &&
    !Object.hasOwn(candidate, "defaultValues") &&
    !Object.hasOwn(candidate, "numericValue") &&
    !Object.hasOwn(candidate, "amount") &&
    sourceLocatorLooksValid(candidate.sourceLocator, 109)
  );
}

function hasForbiddenNumericValueField(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(hasForbiddenNumericValueField);
  }
  for (const [key, child] of Object.entries(value)) {
    if (["value", "values", "defaultValue", "defaultValues", "numericValue", "amount"].includes(key)) {
      return true;
    }
    if (hasForbiddenNumericValueField(child)) {
      return true;
    }
  }
  return false;
}

function validateQhndSourceMap(sourceMap) {
  if (!Array.isArray(sourceMap) || sourceMap.length !== 7) {
    return false;
  }
  const refCodes = sourceMap.map((entry) => entry.sourceRefCode);
  if (!arraysMatchExactly(refCodes, [
    "MC001_R3_SOURCE_2_7_MONTHLY_METHOD",
    "MC001_R3_SOURCE_2_7_1_TOTAL_TRANSFER",
    "MC001_R3_SOURCE_2_7_2_GAINS",
    "MC001_R3_SOURCE_2_7_5_CAPACITY",
    "MC001_R3_SOURCE_2_7_6_UTILIZATION",
    "MC001_R3_SOURCE_2_8_UNOCCUPIED",
    "MC001_R3_SOURCE_2_10_ANNUAL"
  ])) {
    return false;
  }
  for (const entry of sourceMap) {
    const pages = Array.isArray(entry.pages) ? entry.pages : [entry.page];
    if (
      !hasRequiredString(entry.sourceRefCode) ||
      !hasRequiredString(entry.section) ||
      !hasRequiredString(entry.topic) ||
      pages.some((page) => !SOURCE_SCOPE_PAGES.includes(page))
    ) {
      return false;
    }
  }
  return true;
}

function validateQhndDependencyGroups(dependencyGroups) {
  if (!isObject(dependencyGroups)) {
    return false;
  }
  const requiredGroups = [
    "heatTransferTotal",
    "heatGains",
    "utilizationFactors",
    "monthlyUsefulDemand",
    "explicitBlockers"
  ];
  if (!arraysMatchExactly(Object.keys(dependencyGroups), requiredGroups)) {
    return false;
  }
  return (
    dependencyGroups.heatTransferTotal.limitation ===
      "C5 is explicit heat transfer only and is not QH;nd or QC;nd" &&
    Array.isArray(dependencyGroups.heatGains.requiredSymbols) &&
    dependencyGroups.heatGains.requiredSymbols.includes("QH;gn;ztc;m") &&
    dependencyGroups.heatGains.requiredSymbols.includes("QC;gn;ztc;m") &&
    Array.isArray(dependencyGroups.utilizationFactors.requiredSymbols) &&
    dependencyGroups.utilizationFactors.requiredSymbols.includes("etaH;gn;ztc;m") &&
    dependencyGroups.utilizationFactors.requiredSymbols.includes("etaC;ht;ztc;m") &&
    Array.isArray(dependencyGroups.monthlyUsefulDemand.requiredOutputs) &&
    dependencyGroups.monthlyUsefulDemand.requiredOutputs.includes("QH;nd;ztc;m") &&
    dependencyGroups.monthlyUsefulDemand.requiredOutputs.includes("QC;nd;ztc;m") &&
    arraysMatchExactly(dependencyGroups.explicitBlockers.blockers, [
      "certificate_not_ready",
      "not_final_energy_ready",
      "not_primary_energy_ready",
      "not_CO2_ready",
      "not_system_losses_ready",
      "gains_not_fully_implemented",
      "utilization_factors_not_implemented",
      "intermittency_and_unoccupied_periods_not_implemented",
      "latent_humidification_dehumidification_not_implemented"
    ])
  );
}

function validateQhndFutureReadiness(readiness) {
  return (
    isObject(readiness) &&
    arraysMatchExactly(readiness.safeForFutureImplementation, [
      "explicit_input_heating_monthly_useful_demand_without_long_unoccupied_periods",
      "explicit_input_cooling_monthly_useful_demand_without_long_unoccupied_periods"
    ]) &&
    arraysMatchExactly(readiness.notYetMachineEncoded, [
      "figure_2.18_branch_conditions",
      "figure_2.19_branch_conditions",
      "long_unoccupied_period_interpolation",
      "intermittent_heating_and_cooling_corrections",
      "latent_humidification_dehumidification"
    ]) &&
    readiness.noInventedDefaults === true &&
    readiness.noRuntimeCalculator === true
  );
}

function validateFigure218SourceIdentity(identity) {
  return (
    isObject(identity) &&
    identity.methodologyCode === METHODOLOGY_CODE &&
    identity.methodologyVersion === METHODOLOGY_VERSION &&
    identity.figureReference === "figure_2.18" &&
    identity.primaryPage === 121 &&
    arraysMatchExactly(identity.relatedReferences, [
      "section_2.7_monthly_method",
      "section_2.7.6_utilization_factors",
      "figure_2.14_heating_gain_utilization",
      "section_2.8.4_short_unoccupied_periods",
      "relations_2.76_to_2.77_long_unoccupied_periods",
      "relation_2.84_annual_heating_aggregation"
    ])
  );
}

function validateFigure218HeatingSymbols(symbols) {
  const expected = [
    ["gammaH;ztc;m", "dimensionless", "source_needed_utilization_factor_spine"],
    ["QH;ht;ztc;m", "kWh", "implemented_explicit_transfer_chain_C5_or_explicit_input_required"],
    ["etaH;gn;ztc;m", "dimensionless", "missing_future_source_pack_utilization_factor"],
    ["QH;gn;ztc;m", "kWh", "missing_or_explicit_input_only_gains"],
    ["QH;nd;ztc;m", "kWh", "not_implemented_output"]
  ];
  if (!Array.isArray(symbols) || symbols.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const [symbol, unit, origin] = expected[index];
    if (
      symbols[index].symbol !== symbol ||
      symbols[index].unit !== unit ||
      symbols[index].dependencyOrigin !== origin ||
      !hasRequiredString(symbols[index].meaning) ||
      !sourceLocatorLooksValid(symbols[index].sourceLocator)
    ) {
      return false;
    }
  }
  return true;
}

function validateFigure218HeatingBranchLogic(branches) {
  const expected = [
    [
      "heating_zero_non_positive_balance_condition",
      "gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0 != 1",
      "needs_human_visual_review"
    ],
    [
      "heating_zero_high_balance_ratio",
      "gammaH;ztc;m > 2.0",
      "verified_for_future_runtime"
    ],
    [
      "heating_else_gain_utilization",
      "else",
      "verified_for_future_runtime"
    ]
  ];
  if (!Array.isArray(branches) || branches.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const [branchId, conditionExpression, readinessStatus] = expected[index];
    const branch = branches[index];
    if (
      !isObject(branch) ||
      branch.branchId !== branchId ||
      branch.conditionExpression !== conditionExpression ||
      branch.readinessStatus !== readinessStatus ||
      branch.outputSymbol !== "QH;nd;ztc;m" ||
      !hasRequiredString(branch.branchName) ||
      !hasRequiredString(branch.outputExpression) ||
      !Array.isArray(branch.inputsRequired) ||
      branch.inputsRequired.length === 0 ||
      !sourceLocatorLooksValid(branch.sourceLocator, 121) ||
      branch.sourceLocator.figure !== "2.18"
    ) {
      return false;
    }
  }
  return (
    branches[0].conditionTranscriptionStatus === "needs_human_visual_review" &&
    branches[1].conditionTranscriptionStatus === "verified" &&
    branches[2].conditionTranscriptionStatus === "verified" &&
    branches[0].outputExpression === "QH;nd;ztc;m = 0" &&
    branches[1].outputExpression === "QH;nd;ztc;m = 0" &&
    branches[2].outputExpression ===
      "QH;nd;ztc;m = QH;ht;ztc;m - etaH;gn;ztc;m * QH;gn;ztc;m"
  );
}

function validateFigure218FormulaCandidates(candidates) {
  const expected = [
    [
      "MC001_R4_FIGURE_2_18_ZERO_NON_POSITIVE_BALANCE",
      "heating_zero_non_positive_balance_condition",
      "needs_human_visual_review",
      121,
      "2.18"
    ],
    [
      "MC001_R4_FIGURE_2_18_ZERO_HIGH_BALANCE_RATIO",
      "heating_zero_high_balance_ratio",
      "verified_for_future_runtime",
      121,
      "2.18"
    ],
    [
      "MC001_R4_FIGURE_2_18_ELSE_GAIN_UTILIZATION",
      "heating_else_gain_utilization",
      "verified_for_future_runtime",
      121,
      "2.18"
    ],
    [
      "MC001_R4_FIGURE_2_14_HEATING_UTILIZATION_DEPENDENCY",
      "heating_else_gain_utilization",
      "needs_human_visual_review",
      114,
      "2.14"
    ]
  ];
  if (!Array.isArray(candidates) || candidates.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const [candidateCode, branchId, readinessStatus, page, figure] = expected[index];
    const candidate = candidates[index];
    if (
      !isObject(candidate) ||
      candidate.candidateCode !== candidateCode ||
      candidate.branchId !== branchId ||
      candidate.readinessStatus !== readinessStatus ||
      !hasRequiredString(candidate.expressionText) ||
      !hasRequiredString(candidate.sourceReference) ||
      !sourceLocatorLooksValid(candidate.sourceLocator, page) ||
      candidate.sourceLocator.figure !== figure ||
      !["verified_for_future_runtime", "needs_human_visual_review", "blocked_due_to_ambiguous_figure"].includes(candidate.readinessStatus) ||
      Object.hasOwn(candidate, "entryType") ||
      Object.hasOwn(candidate, "formulaCode")
    ) {
      return false;
    }
  }
  return true;
}

function validateFigure218DependencyMatrix(matrix) {
  if (!isObject(matrix)) {
    return false;
  }
  return (
    matrix.c5ExplicitHeatTransferTotal?.status === "implemented" &&
    matrix.c5ExplicitHeatTransferTotal.limitation === "explicit transfer only not QH;nd" &&
    matrix.internalGains?.status === "missing_or_explicit_input_only" &&
    matrix.solarGains?.status === "missing_or_explicit_input_only" &&
    matrix.totalHeatGains?.status === "missing_or_explicit_input_only" &&
    matrix.gainUtilizationFactor?.status === "missing_source_needed" &&
    matrix.effectiveThermalCapacity?.status === "missing_source_needed" &&
    matrix.timeConstant?.status === "missing_source_needed" &&
    matrix.monthlyHeatingUsefulDemand?.status === "not_implemented" &&
    matrix.annualAggregation?.status === "not_implemented"
  );
}

function validateFigure218Blockers(blockers) {
  return arraysMatchExactly(blockers, [
    "not_runtime_QH;nd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_CPE_certificate",
    "no_system_losses",
    "utilization_factor_not_implemented",
    "gains_not_implemented",
    "intermittency_and_unoccupied_periods_not_implemented",
    "left_branch_condition_needs_human_visual_review",
    "no_hidden_defaults"
  ]);
}

function validateFigure218FutureRuntimeReadiness(readiness) {
  return (
    isObject(readiness) &&
    readiness.canImplementHeatingOnlyRuntime === false &&
    readiness.recommendedNextMilestone ===
      "C6C_continue_source_extraction_for_figure_2.14_utilization_and_figure_2.18_ambiguity" &&
    hasRequiredString(readiness.reason) &&
    arraysMatchExactly(readiness.requiredBeforeRuntime, [
      "resolve_figure_2.18_first_branch_condition",
      "transcribe_figure_2.14_heating_utilization_factor",
      "source_pack_heating_gains",
      "source_pack_effective_thermal_capacity_and_time_constant"
    ])
  );
}

function validateUtilizationHeatingSourceIdentity(identity) {
  return (
    isObject(identity) &&
    identity.methodologyCode === METHODOLOGY_CODE &&
    identity.methodologyVersion === METHODOLOGY_VERSION &&
    identity.primaryFigureReference === "figure_2.14" &&
    identity.linkedHeatingDemandFigureReference === "figure_2.18" &&
    arraysMatchExactly(identity.relatedReferences, [
      "section_2.7_monthly_method",
      "section_2.7.5_effective_internal_heat_capacity",
      "section_2.7.6_utilization_factors",
      "figure_2.14_heating_gain_utilization",
      "relation_2.55_heating_utilization_parameter",
      "relation_2.57_heating_time_constant",
      "figure_2.18_heating_monthly_useful_demand"
    ])
  );
}

function validateUtilizationHeatingSymbols(symbols) {
  const expected = [
    ["QH;ht;ztc;m", "kWh", "implemented_or_explicit_input_required"],
    ["QH;gn;ztc;m", "kWh", "explicit_input_required"],
    ["gammaH;ztc;m", "dimensionless", "missing_future_source_pack"],
    ["etaH;gn;ztc;m", "dimensionless", "missing_future_source_pack"],
    ["tauH;ztc;m", "h", "missing_future_source_pack"],
    ["Cm;eff;ztc", "J/K", "missing_future_source_pack"],
    ["aH;ztc;m", "dimensionless", "missing_future_source_pack"],
    ["QH;nd;ztc;m", "kWh", "ambiguous_needs_human_review"]
  ];
  if (!Array.isArray(symbols) || symbols.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const [symbol, unit, origin] = expected[index];
    if (
      symbols[index].symbol !== symbol ||
      symbols[index].unit !== unit ||
      symbols[index].dependencyOrigin !== origin ||
      !hasRequiredString(symbols[index].meaning) ||
      !sourceLocatorLooksValid(symbols[index].sourceLocator)
    ) {
      return false;
    }
  }
  return true;
}

function validateUtilizationBranchConditions(branches) {
  const expected = [
    [
      "heating_utilization_positive_gamma_not_one",
      "gammaH;ztc;m > 0 and gammaH;ztc;m != 1",
      "verified_for_future_runtime"
    ],
    [
      "heating_utilization_gamma_equals_one",
      "gammaH;ztc;m = 1",
      "verified_for_future_runtime"
    ],
    [
      "heating_utilization_non_positive_gamma_positive_gains",
      "gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0",
      "needs_human_visual_review"
    ],
    [
      "heating_utilization_negative_gamma_non_positive_gains",
      "gammaH;ztc;m < 0 and QH;gn;ztc;m <= 0",
      "verified_for_future_runtime"
    ]
  ];
  if (!Array.isArray(branches) || branches.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const [branchId, conditionExpression, readinessStatus] = expected[index];
    const branch = branches[index];
    if (
      !isObject(branch) ||
      branch.branchId !== branchId ||
      branch.conditionExpression !== conditionExpression ||
      branch.readinessStatus !== readinessStatus ||
      !hasRequiredString(branch.outputExpression) ||
      !sourceLocatorLooksValid(branch.sourceLocator, 113) ||
      branch.sourceLocator.figure !== "2.14"
    ) {
      return false;
    }
  }
  return true;
}

function validateUtilizationFormulaCandidates(candidates) {
  const expected = [
    ["MC001_R5_FIGURE_2_14_GAMMA_H_BALANCE_RATIO", "verified_for_future_runtime", 113],
    ["MC001_R5_FIGURE_2_14_ETA_H_POSITIVE_GAMMA_NOT_ONE", "verified_for_future_runtime", 113],
    ["MC001_R5_FIGURE_2_14_ETA_H_GAMMA_EQUALS_ONE", "verified_for_future_runtime", 113],
    ["MC001_R5_FIGURE_2_14_ETA_H_NON_POSITIVE_GAMMA_POSITIVE_GAINS", "needs_human_visual_review", 113],
    ["MC001_R5_FIGURE_2_14_ETA_H_NEGATIVE_GAMMA_NON_POSITIVE_GAINS", "verified_for_future_runtime", 113],
    ["MC001_R5_RELATION_2_55_A_H_PARAMETER", "verified_for_future_runtime", 113],
    ["MC001_R5_RELATION_2_57_TAU_H_TIME_CONSTANT", "verified_for_future_runtime", 116],
    ["MC001_R5_TABLES_2_19_2_20_EFFECTIVE_CAPACITY_DEPENDENCY", "referenced_but_not_transcribed", 112],
    ["MC001_R5_FIGURE_2_18_FIRST_BRANCH_REVIEW", "blocked_due_to_ambiguous_figure", 120]
  ];
  if (!Array.isArray(candidates) || candidates.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const [candidateCode, readinessStatus, page] = expected[index];
    const candidate = candidates[index];
    if (
      !isObject(candidate) ||
      candidate.candidateCode !== candidateCode ||
      candidate.readinessStatus !== readinessStatus ||
      !hasRequiredString(candidate.expressionText) ||
      !hasRequiredString(candidate.sourceReference) ||
      !sourceLocatorLooksValid(candidate.sourceLocator, page) ||
      ![
        "verified_for_future_runtime",
        "needs_human_visual_review",
        "blocked_due_to_ambiguous_figure",
        "referenced_but_not_transcribed"
      ].includes(candidate.readinessStatus) ||
      Object.hasOwn(candidate, "entryType") ||
      Object.hasOwn(candidate, "formulaCode")
    ) {
      return false;
    }
  }
  return true;
}

function validateFigure218AmbiguityReview(review) {
  return (
    isObject(review) &&
    review.observedConditionText ===
      "gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0 != 1" &&
    arraysMatchExactly(review.reviewedAgainst, [
      "MC001-2022 page 120 figure 2.18",
      "MC001-2022 page 113 figure 2.14"
    ]) &&
    review.ambiguityType === "visual_or_logical_notation_ambiguity" &&
    review.reviewStatus === "unresolved" &&
    review.resolutionDecision === "do_not_infer_intended_meaning" &&
    review.runtimeImpact === "blocks_heating_QH;nd_runtime_branch_implementation" &&
    sourceLocatorLooksValid(review.sourceLocator, 120) &&
    review.sourceLocator.figure === "2.18"
  );
}

function validateHeatingQhndReadiness(readiness) {
  return (
    isObject(readiness) &&
    readiness.canImplementHeatingOnlyRuntime === false &&
    readiness.qhHtMonthlyHeatTransferInput === "explicit_input_or_C5_transfer_chain_required" &&
    readiness.qhGnMonthlyHeatGainsInput === "explicit_input_required_until_gains_are_source_packed" &&
    readiness.gammaHFormula === "verified_for_future_runtime" &&
    readiness.etaHGnFormula === "partially_verified_with_zero_edge_review_needed" &&
    readiness.figure218BranchConditions === "blocked_due_to_ambiguous_first_branch" &&
    readiness.qhndFormula === "not_implemented" &&
    readiness.annualAggregation === "not_implemented" &&
    readiness.nextRecommendation ===
      "C6D_continue_source_extraction_for_figure_2.18_ambiguity_effective_capacity_and_gains"
  );
}

function validateUtilizationDependencyMatrix(matrix) {
  if (!isObject(matrix)) {
    return false;
  }
  return (
    matrix.c5ExplicitTransferTotal?.status === "implemented" &&
    matrix.qhHtMonthlyInput?.status === "explicit_input_only_or_C5_chain" &&
    matrix.internalGains?.status === "missing_or_explicit_input_only" &&
    matrix.solarGains?.status === "missing_or_explicit_input_only" &&
    matrix.totalGainsQhGn?.status === "missing_or_explicit_input_only" &&
    matrix.gammaH?.status === "verified_for_future_runtime" &&
    matrix.etaHGn?.status === "partially_verified_needs_zero_edge_review" &&
    matrix.effectiveCapacityAndTimeConstant?.status === "referenced_but_not_runtime_ready" &&
    matrix.figure218BranchLogic?.status === "blocked_due_to_ambiguous_first_branch" &&
    matrix.qhndRuntime?.status === "not_implemented" &&
    matrix.annualQhndAggregation?.status === "not_implemented" &&
    matrix.final_energy?.status === "blocked" &&
    matrix.primary_energy?.status === "blocked" &&
    matrix.co2?.status === "blocked" &&
    matrix.cpeCertificate?.status === "blocked"
  );
}

function validateUtilizationBlockers(blockers) {
  return arraysMatchExactly(blockers, [
    "not_runtime_QH;nd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_CPE_certificate",
    "no_system_losses",
    "gains_not_implemented",
    "no_hidden_defaults",
    "no_normative_default_gains",
    "no_normative_default_capacity",
    "no_default_schedules",
    "intermittency_and_unoccupied_periods_not_implemented",
    "figure_2.18_first_branch_unresolved",
    "figure_2.14_zero_edge_needs_review"
  ]);
}

function validateGainsCapacitySourceIdentity(identity) {
  return (
    isObject(identity) &&
    identity.methodologyCode === METHODOLOGY_CODE &&
    identity.methodologyVersion === METHODOLOGY_VERSION &&
    identity.heatGainsSectionReference === "section_2.7.2" &&
    identity.solarGainsSectionReference === "section_2.7.3" &&
    identity.effectiveCapacitySectionReference === "section_2.7.5" &&
    identity.timeConstantReference === "relation_2.57" &&
    identity.ambiguityReference === "figure_2.18" &&
    arraysMatchExactly(identity.relatedReferences, [
      "figure_2.13_total_heat_gains",
      "relations_2.33_2.35_internal_gains",
      "relations_2.36_2.39_solar_gains",
      "relation_2.50_opaque_solar_gains",
      "tables_2.19_2.20_effective_capacity",
      "relation_2.57_heating_time_constant",
      "figure_2.18_heating_monthly_useful_demand"
    ])
  );
}

function validateSourceDependencyMapEntries(entries, expected) {
  if (!Array.isArray(entries) || entries.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const [symbol, unit, origin, status, page] = expected[index];
    const entry = entries[index];
    if (
      !isObject(entry) ||
      entry.symbol !== symbol ||
      entry.unit !== unit ||
      entry.dependencyOrigin !== origin ||
      entry.readinessStatus !== status ||
      !hasRequiredString(entry.meaning) ||
      !sourceLocatorLooksValid(entry.sourceLocator, page)
    ) {
      return false;
    }
  }
  return true;
}

function validateGainsCapacityDependencyMaps(sourcePack) {
  return (
    validateSourceDependencyMapEntries(sourcePack.heatGainsDependencyMap, [
      ["QH;gn;ztc;m", "kWh", "explicit_input_required", "source_dependency_only", 103],
      ["QC;gn;ztc;m", "kWh", "missing_future_source_pack", "source_dependency_only", 103],
      ["QH/C;int;ztc;m", "kWh", "explicit_input_required", "source_dependency_only", 103],
      ["QH/C;sol;ztc;m", "kWh", "explicit_input_required", "source_dependency_only", 104]
    ]) &&
    validateSourceDependencyMapEntries(sourcePack.internalGainsDependencyMap, [
      [
        "QH/C;int;dir;ztc;m",
        "kWh",
        "explicit_input_required",
        "verified_for_future_runtime_with_explicit_inputs",
        103
      ],
      ["bztu,k;m", "dimensionless", "missing_future_source_pack", "source_dependency_only", 104],
      [
        "Fztc;ztu,k;m",
        "dimensionless",
        "missing_future_source_pack",
        "source_dependency_only",
        104
      ],
      [
        "fgn;max;H;ztu,k;m",
        "dimensionless",
        "missing_future_source_pack",
        "source_dependency_only",
        104
      ],
      [
        "QH/C;spec;int;oc/A/L/WA/HVAC/proc;zt;m",
        "kWh/m2",
        "missing_future_source_pack",
        "referenced_but_not_transcribed",
        104
      ],
      ["Ause;zt", "m2", "explicit_input_required", "source_dependency_only", 104]
    ]) &&
    validateSourceDependencyMapEntries(sourcePack.solarGainsDependencyMap, [
      [
        "QH/C;sol;dir;ztc;m",
        "kWh",
        "explicit_input_required",
        "verified_for_future_runtime_with_explicit_inputs",
        104
      ],
      [
        "QH/C;sol;wi;k;m",
        "kWh",
        "missing_future_source_pack",
        "source_dependency_only",
        105
      ],
      [
        "QH/C;sol;op;k;m",
        "kWh",
        "missing_future_source_pack",
        "source_dependency_only",
        105
      ],
      [
        "ggl;wi;H/C;m",
        "dimensionless",
        "missing_future_source_pack",
        "source_dependency_only",
        105
      ],
      [
        "Hsol;wi;m / Hsol;k;m",
        "kWh/m2",
        "missing_future_source_pack",
        "source_dependency_only",
        105
      ],
      [
        "Fsh;obst;wi;m / Fsh;obst;k;m",
        "dimensionless",
        "missing_future_source_pack",
        "source_dependency_only",
        105
      ],
      [
        "alphaSr;k + Rse;k + Uc;op;k + Ac;k",
        "source_units",
        "missing_future_source_pack",
        "source_dependency_only",
        111
      ]
    ]) &&
    validateSourceDependencyMapEntries(sourcePack.capacityTimeConstantDependencyMap, [
      [
        "Cm;eff;ztc",
        "J/K",
        "explicit_input_required_or_missing_future_source_pack",
        "tables_referenced_without_encoded_values",
        112
      ],
      [
        "tables 2.19 and 2.20",
        "source_units",
        "missing_future_source_pack",
        "referenced_but_not_transcribed",
        112
      ],
      [
        "tauH;ztc;m",
        "h",
        "explicit_input_required_or_missing_future_source_pack",
        "verified_for_future_runtime_with_explicit_inputs",
        116
      ],
      [
        "HH;tr(excl.grflr);ztc;m + HH;gr;adj;ztc + HH;ve;ztc;m",
        "W/K",
        "explicit_input_required_or_C5_chain_plus_ground_adjustment",
        "source_dependency_only",
        116
      ]
    ])
  );
}

function validateGainsCapacityFormulaCandidates(candidates) {
  const expected = [
    ["MC001_R6_FIGURE_2_13_TOTAL_HEAT_GAINS", "verified_for_future_runtime_with_explicit_inputs", 103],
    [
      "MC001_R6_RELATION_2_33_INTERNAL_GAINS_SINGLE_ZONE",
      "verified_for_future_runtime_with_explicit_inputs",
      103
    ],
    ["MC001_R6_RELATION_2_34_INTERNAL_GAINS_ZTU_ADJACENT", "needs_human_visual_review", 104],
    [
      "MC001_R6_RELATION_2_35_DIRECT_INTERNAL_GAINS_COMPONENTS",
      "referenced_but_not_transcribed",
      104
    ],
    [
      "MC001_R6_RELATION_2_36_SOLAR_GAINS_SINGLE_ZONE",
      "verified_for_future_runtime_with_explicit_inputs",
      104
    ],
    ["MC001_R6_RELATION_2_37_SOLAR_GAINS_ZTU_ADJACENT", "needs_human_visual_review", 104],
    [
      "MC001_R6_RELATION_2_38_DIRECT_SOLAR_GAINS_COMPONENTS",
      "verified_for_future_runtime_with_explicit_inputs",
      105
    ],
    [
      "MC001_R6_RELATION_2_39_TRANSPARENT_SOLAR_GAINS",
      "verified_for_future_runtime_with_explicit_inputs",
      105
    ],
    [
      "MC001_R6_RELATION_2_50_OPAQUE_SOLAR_GAINS",
      "verified_for_future_runtime_with_explicit_inputs",
      111
    ],
    [
      "MC001_R6_TABLES_2_19_2_20_EFFECTIVE_CAPACITY_DEPENDENCY",
      "referenced_but_not_transcribed",
      112
    ],
    [
      "MC001_R6_RELATION_2_57_HEATING_TIME_CONSTANT",
      "verified_for_future_runtime_with_explicit_inputs",
      116
    ]
  ];
  if (!Array.isArray(candidates) || candidates.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const [candidateCode, readinessStatus, page] = expected[index];
    const candidate = candidates[index];
    if (
      !isObject(candidate) ||
      candidate.candidateCode !== candidateCode ||
      candidate.readinessStatus !== readinessStatus ||
      !hasRequiredString(candidate.expressionText) ||
      !hasRequiredString(candidate.sourceReference) ||
      !sourceLocatorLooksValid(candidate.sourceLocator, page) ||
      ![
        "verified_for_future_runtime_with_explicit_inputs",
        "needs_human_visual_review",
        "referenced_but_not_transcribed"
      ].includes(candidate.readinessStatus) ||
      Object.hasOwn(candidate, "entryType") ||
      Object.hasOwn(candidate, "formulaCode") ||
      Object.hasOwn(candidate, "defaultValue") ||
      Object.hasOwn(candidate, "defaultValues")
    ) {
      return false;
    }
  }
  return true;
}

function validateGainsCapacityAmbiguityReview(review) {
  return (
    isObject(review) &&
    review.observedConditionText ===
      "gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0 != 1" &&
    arraysMatchExactly(review.reviewedAgainst, [
      "MC001-2022 page 120 figure 2.18",
      "MC001-2022 page 113 figure 2.14",
      "MC001-2022 section 2.7.2 heat gains references"
    ]) &&
    review.ambiguityType === "visual_or_logical_notation_ambiguity" &&
    review.reviewStatus === "unresolved" &&
    review.resolutionDecision === "do_not_infer_intended_meaning" &&
    review.runtimeImpact === "blocks_heating_QH;nd_runtime_branch_implementation" &&
    sourceLocatorLooksValid(review.sourceLocator, 120) &&
    review.sourceLocator.figure === "2.18"
  );
}

function validateGainsCapacityReadinessVerdict(verdict) {
  return (
    isObject(verdict) &&
    verdict.canImplementHeatingOnlyRuntime === false &&
    verdict.qhHtMonthlyHeatTransferInput === "explicit_input_or_C5_transfer_chain_required" &&
    verdict.qhGnMonthlyHeatGainsInput ===
      "explicit_input_possible_but_source_backed_gains_runtime_not_ready" &&
    verdict.gammaHFormula === "verified_for_future_runtime_from_R5" &&
    verdict.etaHGnFormula === "partially_verified_with_zero_edge_review_needed_from_R5" &&
    verdict.effectiveCapacityTimeConstantPath ===
      "explicit_input_possible_or_tables_2.19_2.20_future_source_pack_required" &&
    verdict.figure218BranchConditions === "blocked_due_to_ambiguous_first_branch" &&
    verdict.qhndFormula === "not_implemented" &&
    verdict.annualAggregation === "not_implemented" &&
    verdict.nextRecommendation ===
      "C6E_continue_source_extraction_or_human_visual_review_before_QHnd_runtime"
  );
}

function validateGainsCapacityDependencyMatrix(matrix) {
  return (
    isObject(matrix) &&
    matrix.c5ExplicitTransferTotal?.status === "implemented" &&
    matrix.qhHtMonthlyInput?.status === "explicit_input_only_or_C5_chain" &&
    matrix.internalGains?.status === "explicit_input_only_or_missing_future_source_pack" &&
    matrix.solarGains?.status === "explicit_input_only_or_missing_future_source_pack" &&
    matrix.totalGainsQhGn?.status === "explicit_input_only_or_missing_future_source_pack" &&
    matrix.gammaH?.status === "verified_for_future_runtime" &&
    matrix.etaHGn?.status === "partially_verified_needs_zero_edge_review" &&
    matrix.effectiveCapacityCm?.status === "explicit_input_only_or_missing_future_source_pack" &&
    matrix.timeConstantTau?.status === "verified_for_future_runtime_with_explicit_inputs" &&
    matrix.figure218FirstBranch?.status === "blocked_due_to_ambiguous_first_branch" &&
    matrix.qhndRuntime?.status === "not_implemented" &&
    matrix.annualQhndAggregation?.status === "not_implemented" &&
    matrix.final_energy?.status === "blocked" &&
    matrix.primary_energy?.status === "blocked" &&
    matrix.co2?.status === "blocked" &&
    matrix.cpeCertificate?.status === "blocked"
  );
}

function validateGainsCapacityBlockers(blockers) {
  return arraysMatchExactly(blockers, [
    "not_runtime_QH;nd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_CPE_certificate",
    "no_system_losses",
    "no_hidden_defaults",
    "no_normative_default_gains",
    "no_normative_default_solar_data",
    "no_normative_default_capacity",
    "no_default_occupancy_or_schedules",
    "intermittency_and_unoccupied_periods_not_implemented",
    "figure_2.18_first_branch_unresolved",
    "figure_2.14_zero_edge_needs_review",
    "tables_2.19_2.20_not_encoded_as_values",
    "climate_solar_data_missing_future_source_pack"
  ]);
}

function validateQhndAmbiguitySourceIdentity(identity) {
  return (
    isObject(identity) &&
    identity.methodologyCode === METHODOLOGY_CODE &&
    identity.methodologyVersion === METHODOLOGY_VERSION &&
    identity.primaryFigureReference === "figure_2.18" &&
    identity.crossCheckFigureReference === "figure_2.14" &&
    identity.utilizationSectionReference === "section_2.7.6" &&
    identity.utilizationParameterReference === "relation_2.55" &&
    identity.timeConstantReference === "relation_2.57" &&
    arraysMatchExactly(identity.relatedReferences, [
      "MC001-2022 page 120 figure 2.18",
      "MC001-2022 page 113 figure 2.14",
      "MC001-2022 page 113 section 2.7.6",
      "MC001-2022 page 113 relation 2.55",
      "MC001-2022 page 116 relation 2.57"
    ]) &&
    arraysMatchExactly(identity.adjacentSymbolDefinitionReferences, [
      "QH;gn;ztc;m_total_heat_gains_kWh",
      "QH;ht;ztc;m_heat_transfer_kWh",
      "gammaH;ztc;m_balance_ratio_dimensionless",
      "etaH;gn;ztc;m_gain_utilization_dimensionless",
      "QH;nd;ztc;m_monthly_useful_heating_energy_kWh"
    ])
  );
}

function validateQhndAmbiguityFigure218Review(review) {
  return (
    isObject(review) &&
    review.visualTranscription === "gammaH;ztc;m <= 0 si QH;gn;ztc;m > 0 \u2260 1" &&
    review.classification === "resolved_verified_typographical_artifact" &&
    review.resolvedCondition === "gammaH <= 0 && QHgn > 0" &&
    review.output === "QHnd = 0" &&
    review.runtimeNote ===
      "Do not execute this branch in the first restricted runtime unless separate targeted tests are added." &&
    arraysMatchExactly(review.sourceBackedReasons, [
      "QH;gn;ztc;m is defined as total heat gains in kWh, so attaching != 1 to QHgn is dimensionally invalid.",
      "gammaH <= 0 already implies gammaH != 1.",
      "figure 2.14 contains the matching edge case gammaH <= 0 and QH;gn;ztc;m > 0 without the trailing artifact.",
      "relation 2.55 defines the heating utilization parameter with no need for the trailing artifact.",
      "the resolved branch is internally consistent with etaH;gn;ztc;m * QH;gn;ztc;m offsetting QH;ht;ztc;m."
    ]) &&
    sourceLocatorLooksValid(review.sourceLocator, 120) &&
    review.sourceLocator.figure === "2.18"
  );
}

function validateQhndAmbiguityEdgeReview(edges) {
  const expected = [
    ["gammaH_non_positive", "gammaH <= 0", "resolved_metadata_only_excluded_from_first_runtime", false, 113],
    ["gammaH_zero", "gammaH = 0", "excluded_zero_division_edge", false, 113],
    ["gammaH_near_zero", "gammaH near zero", "excluded_numerical_edge", false, 113],
    ["QHgn_non_positive", "QHgn <= 0", "excluded_non_positive_gain_edge", false, 113],
    ["QHht_non_positive", "QHht <= 0", "excluded_non_positive_transfer_edge", false, 113],
    [
      "gammaH_equals_one",
      "gammaH = 1",
      "verified_with_explicit_eta_or_gamma_equals_one_branch",
      true,
      113
    ],
    ["gammaH_greater_than_two", "gammaH > 2.0", "verified_but_excluded_from_first_runtime", false, 120],
    ["normal_branch", "0 < gammaH <= 2.0", "allowed_for_restricted_runtime", true, 120]
  ];
  if (!Array.isArray(edges) || edges.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const [edgeCaseId, condition, readinessStatus, included, page] = expected[index];
    const edge = edges[index];
    if (
      !isObject(edge) ||
      edge.edgeCaseId !== edgeCaseId ||
      edge.condition !== condition ||
      edge.readinessStatus !== readinessStatus ||
      edge.includedInFirstRestrictedRuntime !== included ||
      !hasRequiredString(edge.sourceBackedBehavior) ||
      !sourceLocatorLooksValid(edge.sourceLocator, page) ||
      !["2.14", "2.18"].includes(edge.sourceLocator.figure)
    ) {
      return false;
    }
  }
  return true;
}

function validateQhndAmbiguityRestrictedRuntimeFeasibility(feasibility) {
  if (!isObject(feasibility) || feasibility.status !== "allowed_for_future_runtime") {
    return false;
  }
  if (!arraysMatchExactly(feasibility.domain, [
    "heating_only",
    "monthly_explicit_inputs_only",
    "no_long_unoccupied_periods",
    "QHht > 0",
    "QHgn >= 0",
    "0 < gammaH <= 2.0",
    "etaHgn_explicit_or_source_backed_from_explicit_inputs"
  ])) {
    return false;
  }
  if (!arraysMatchExactly(feasibility.inputValidationConstraints, [
    "QHht_kWh finite greater than zero",
    "QHgn_kWh finite greater than or equal to zero",
    "gammaH finite and greater than zero and less than or equal to 2.0",
    "etaHgn finite explicit input or calculated only from verified figure 2.14 formulas with explicit aH and tau inputs",
    "no normative gains solar capacity schedule or occupancy defaults",
    "no final energy primary energy CO2 CPE or certificate output"
  ])) {
    return false;
  }
  const candidates = feasibility.allowedFormulaCandidates;
  const expected = [
    ["MC001_R7_GAMMA_H_EXPLICIT_RATIO", "verified_for_future_runtime_restricted_domain", 113],
    ["MC001_R7_QHND_NORMAL_RESTRICTED_BRANCH", "verified_for_future_runtime_restricted_domain", 120],
    [
      "MC001_R7_QHND_RESOLVED_ZERO_BRANCH_METADATA_ONLY",
      "resolved_metadata_only_excluded_from_first_runtime",
      120
    ]
  ];
  if (!Array.isArray(candidates) || candidates.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const [candidateCode, readinessStatus, page] = expected[index];
    const candidate = candidates[index];
    if (
      !isObject(candidate) ||
      candidate.candidateCode !== candidateCode ||
      candidate.readinessStatus !== readinessStatus ||
      !hasRequiredString(candidate.expressionText) ||
      !sourceLocatorLooksValid(candidate.sourceLocator, page) ||
      Object.hasOwn(candidate, "entryType") ||
      Object.hasOwn(candidate, "formulaCode")
    ) {
      return false;
    }
  }
  return (
    arraysMatchExactly(feasibility.allowedOutputs, [
      "monthly_useful_heating_energy_QHnd_kWh_restricted_explicit_input_only",
      "diagnostics_and_methodology_limits"
    ]) &&
    arraysMatchExactly(feasibility.exclusions, [
      "not_full_QHnd",
      "not_QCnd",
      "not_final_energy",
      "not_primary_energy",
      "not_CO2",
      "not_CPE_certificate",
      "not_system_losses",
      "not_long_unoccupied_or_intermittent_operation"
    ])
  );
}

function validateQhndAmbiguityDependencyMatrix(matrix) {
  return (
    isObject(matrix) &&
    matrix.c5ExplicitTransferTotal?.status === "implemented" &&
    matrix.c5ExplicitTransferTotal.limitation === "explicit transfer only not full QH;nd" &&
    matrix.qhHtMonthlyInput?.status === "explicit_input_only_or_C5_chain" &&
    matrix.qhGnMonthlyInput?.status === "explicit_input_required" &&
    matrix.gammaHFormula?.status === "verified_for_restricted_future_runtime" &&
    matrix.etaHgnFormula?.status ===
      "verified_for_restricted_future_runtime_with_explicit_inputs_or_user_supplied_eta" &&
    matrix.figure214EdgeConditions?.status === "reviewed_restricted_domain_selected" &&
    matrix.figure218FirstBranch?.status === "resolved_verified_typographical_artifact" &&
    matrix.effectiveCapacityTimeConstant?.status === "explicit_input_or_future_source_pack" &&
    matrix.internalGains?.status === "explicit_input_only_or_missing_future_source_pack" &&
    matrix.solarGains?.status === "explicit_input_only_or_missing_future_source_pack" &&
    matrix.qhndRuntime?.status === "not_implemented_future_restricted_runtime_allowed" &&
    matrix.annualAggregation?.status === "not_implemented" &&
    matrix.final_energy?.status === "blocked" &&
    matrix.primary_energy?.status === "blocked" &&
    matrix.co2?.status === "blocked" &&
    matrix.cpeCertificate?.status === "blocked"
  );
}

function validateQhndAmbiguityBlockers(blockers) {
  return arraysMatchExactly(blockers, [
    "not_runtime_QH;nd_in_C6E",
    "not_full_QH;nd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_CPE_certificate",
    "no_system_losses",
    "no_hidden_defaults",
    "no_normative_default_gains",
    "no_normative_default_solar_data",
    "no_normative_default_capacity",
    "no_default_occupancy_or_schedules",
    "long_unoccupied_and_intermittency_not_implemented",
    "restricted_runtime_must_exclude_gammaH_non_positive_branch_initially",
    "first_runtime_requires_targeted_tests_for_edge_branches"
  ]);
}

function validateHeatingEtaSourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termica a cladirii" &&
    sourceScope.section === "2.7.6. Factori de utilizare" &&
    sourceScope.subsection === "heating gain utilization factor etaH;gn formula readiness" &&
    arraysMatchExactly(sourceScope.parentSectionsVerified, ["2.7", "2.7.5", "2.7.6"]) &&
    arraysMatchExactly(sourceScope.pagesVerified, [112, 113, 116]) &&
    arraysMatchExactly(sourceScope.figuresVerified, ["2.14"]) &&
    arraysMatchExactly(sourceScope.relationsVerified, ["2.55", "2.57"]) &&
    arraysMatchExactly(sourceScope.adjacentSymbolDefinitionsVerified, [
      "etaH;gn;ztc;m",
      "gammaH;ztc;m",
      "aH;ztc;m",
      "aH;0",
      "tauH;ztc;m",
      "tauH;0",
      "QH;gn;ztc;m",
      "QH;ht;ztc;m"
    ])
  );
}

function validateHeatingEtaConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_READINESS" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "heating_gain_utilization_factor_formula_readiness" &&
    concept.targetSymbol === "etaH;gn;ztc;m" &&
    concept.registryKind === "metadata_only_readiness_registry" &&
    concept.unit === "dimensionless" &&
    hasRequiredString(concept.name) &&
    hasRequiredString(concept.purpose) &&
    sourceLocatorLooksValid(concept.sourceLocator, 113) &&
    concept.sourceLocator.figure === "2.14"
  );
}

function validateHeatingEtaSourceIdentity(identity) {
  return (
    isObject(identity) &&
    identity.methodologyCode === METHODOLOGY_CODE &&
    identity.methodologyVersion === METHODOLOGY_VERSION &&
    identity.utilizationSectionReference === "section_2.7.6" &&
    identity.primaryFigureReference === "figure_2.14" &&
    identity.utilizationParameterReference === "relation_2.55" &&
    identity.timeConstantReference === "relation_2.57" &&
    arraysMatchExactly(identity.adjacentTextReferences, [
      "MC001-2022 page 112 section 2.7.5",
      "MC001-2022 page 113 section 2.7.6",
      "MC001-2022 page 113 figure 2.14",
      "MC001-2022 page 113 relation 2.55",
      "MC001-2022 page 116 relation 2.57"
    ]) &&
    Array.isArray(identity.sourceReviewNotes) &&
    identity.sourceReviewNotes.length === 5 &&
    identity.sourceReviewNotes.every(hasRequiredString)
  );
}

function validateHeatingEtaFormulaCandidates(candidates) {
  const expected = [
    ["MC001_R8_GAMMA_H_BALANCE_RATIO", "gammaH;ztc;m", "figure_2.14", 113],
    ["MC001_R8_ETA_H_GN_GAMMA_NOT_ONE", "etaH;gn;ztc;m", "figure_2.14", 113],
    ["MC001_R8_ETA_H_GN_GAMMA_EQUALS_ONE", "etaH;gn;ztc;m", "figure_2.14", 113],
    ["MC001_R8_AH_PARAMETER_RELATION_2_55", "aH;ztc;m", "2.55", 113],
    ["MC001_R8_TAU_H_DEPENDENCY_RELATION_2_57", "tauH;ztc;m", "2.57", 116]
  ];
  if (!Array.isArray(candidates) || candidates.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const [candidateCode, symbol, relationReference, page] = expected[index];
    const candidate = candidates[index];
    if (
      !isObject(candidate) ||
      candidate.candidateCode !== candidateCode ||
      candidate.mc001Symbol !== symbol ||
      candidate.relationReference !== relationReference ||
      candidate.readinessStatus !== "verified_for_future_runtime" ||
      !hasRequiredString(candidate.expressionText) ||
      !hasRequiredString(candidate.machineExpression) ||
      !hasRequiredString(candidate.sourceReference) ||
      !Array.isArray(candidate.requiredInputs) ||
      candidate.requiredInputs.length === 0 ||
      !hasRequiredString(candidate.outputSymbol) ||
      !sourceLocatorLooksValid(candidate.sourceLocator, page) ||
      Object.hasOwn(candidate, "entryType") ||
      Object.hasOwn(candidate, "formulaCode")
    ) {
      return false;
    }
  }
  return true;
}

function validateHeatingEtaBranchConditions(branches) {
  const expected = [
    ["eta_gamma_equals_one", "gammaH;ztc;m = 1", "verified_for_future_runtime", "allowed_with_explicit_aH"],
    [
      "eta_gamma_not_one_positive",
      "gammaH;ztc;m > 0 and gammaH;ztc;m != 1",
      "verified_for_future_runtime",
      "allowed_with_explicit_aH"
    ],
    ["restricted_normal_domain", "0 < gammaH <= 2", "verified_for_future_restricted_runtime", "allowed"],
    [
      "excluded_gamma_non_positive",
      "gammaH <= 0",
      "excluded_from_C7B_restricted_runtime",
      "excluded"
    ],
    ["excluded_gamma_near_zero", "gammaH near zero", "excluded_numerical_edge", "excluded"],
    [
      "excluded_gamma_above_two",
      "gammaH > 2",
      "excluded_from_C7B_restricted_runtime",
      "excluded"
    ],
    [
      "excluded_non_positive_transfer",
      "QHht <= 0",
      "excluded_from_C7B_restricted_runtime",
      "excluded"
    ],
    ["excluded_negative_gains", "QHgn < 0", "excluded_from_C7B_restricted_runtime", "excluded"],
    [
      "excluded_missing_a_or_tau_inputs",
      "aH missing and tauH/aH0/tauH0 path not explicitly supplied",
      "blocked_missing_explicit_inputs",
      "excluded"
    ]
  ];
  if (!Array.isArray(branches) || branches.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const [branchId, conditionExpression, readinessStatus, c7bRuntimeScope] = expected[index];
    const branch = branches[index];
    if (
      !isObject(branch) ||
      branch.branchId !== branchId ||
      branch.conditionExpression !== conditionExpression ||
      branch.readinessStatus !== readinessStatus ||
      branch.c7bRuntimeScope !== c7bRuntimeScope ||
      !hasRequiredString(branch.outputExpression) ||
      !hasRequiredString(branch.sourceReference)
    ) {
      return false;
    }
  }
  return true;
}

function validateHeatingEtaRelationshipToC6F(relationship) {
  return (
    isObject(relationship) &&
    relationship.currentC6FBehavior ===
      "C6F requires explicit etaHgn and leaves etaHgn uncalculated." &&
    relationship.explicitEtaOverride ===
      "C7B must keep explicit etaHgn as an allowed override or input path." &&
    arraysMatchExactly(relationship.hiddenDefaultsProhibited, [
      "aH0",
      "tauH0",
      "tauH",
      "Cm",
      "gains",
      "solar_data",
      "schedules",
      "building_category"
    ]) &&
    relationship.runtimeScopeLimit === "restricted_heating_only_until_separately_expanded"
  );
}

function validateHeatingEtaDependencyMatrix(matrix) {
  return (
    isObject(matrix) &&
    matrix.gammaH?.status === "explicit_or_calculated_from_qHgn_qHht" &&
    matrix.qhHt?.status === "explicit_input_only_unless_future_phase_wires_C5" &&
    matrix.qhGn?.status === "explicit_input_until_gains_are_implemented" &&
    matrix.aH?.status === "explicit_input_recommended_for_C7B" &&
    matrix.aH0?.status === "source_referenced_not_encoded_as_runtime_value" &&
    matrix.tauH?.status === "explicit_input_or_calculated_only_from_explicit_relation_2.57_inputs" &&
    matrix.tauH0?.status === "source_referenced_not_encoded_as_runtime_value" &&
    matrix.cmEffectiveCapacity?.status === "source_dependency_only_unless_explicit_input" &&
    matrix.etaHgnRuntime?.status === "not_implemented_in_C7A" &&
    matrix.c6fQhndRuntime?.status === "implemented_with_explicit_eta" &&
    matrix.fullQhnd?.status === "blocked" &&
    matrix.qcnd?.status === "blocked" &&
    matrix.final_energy?.status === "blocked" &&
    matrix.primary_energy?.status === "blocked" &&
    matrix.co2?.status === "blocked" &&
    matrix.cpeCertificate?.status === "blocked"
  );
}

function validateHeatingEtaBlockers(blockers) {
  return arraysMatchExactly(blockers, [
    "not_runtime_etaHgn_in_C7A",
    "not_full_QH;nd",
    "not_QC;nd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_CPE_certificate",
    "no_system_losses",
    "no_hidden_defaults",
    "no_normative_default_gains",
    "no_normative_default_solar_data",
    "no_normative_default_capacity",
    "no_default_occupancy_or_schedules",
    "no_long_unoccupied_or_intermittency_runtime_behavior",
    "C7B_must_require_explicit_aH_or_explicit_tau_path_inputs"
  ]);
}

function validateLongUnoccupiedSourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termica a cladirii" &&
    sourceScope.section ===
      "2.8. Particularitati ale calculului necesarului de energie propriu sistemului" &&
    sourceScope.subsection === "2.8.4. Corectii pentru perioada de neocupare" &&
    arraysMatchExactly(sourceScope.parentSectionsVerified, ["2.7", "2.8", "2.8.4"]) &&
    arraysMatchExactly(sourceScope.pagesVerified, [120, 121]) &&
    arraysMatchExactly(sourceScope.relationsVerified, ["2.76", "2.77"]) &&
    arraysMatchExactly(sourceScope.adjacentSymbolDefinitionsVerified, [
      "QH/C;nd;occ;ztc;m",
      "QH/C;nd;nocc;ztc;m",
      "fH/C;nocc;ztc;m",
      "QH;nd;ztc;m",
      "QC;nd;ztc;m"
    ])
  );
}

function validateLongUnoccupiedConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_LONG_UNOCCUPIED_PERIOD_INTERPOLATION" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "long_unoccupied_period_interpolation" &&
    concept.targetSymbol === "QH;nd;ztc;m / QC;nd;ztc;m" &&
    concept.registryKind === "machine_encoded_restricted_heating_registry" &&
    concept.unit === "kWh" &&
    hasRequiredString(concept.name) &&
    hasRequiredString(concept.purpose) &&
    sourceLocatorLooksValid(concept.sourceLocator, 121) &&
    concept.sourceLocator.relation === "2.76"
  );
}

function validateLongUnoccupiedSourceIdentity(identity) {
  return (
    isObject(identity) &&
    identity.methodologyCode === METHODOLOGY_CODE &&
    identity.methodologyVersion === METHODOLOGY_VERSION &&
    identity.unoccupiedSectionReference === "section_2.8.4" &&
    identity.heatingRelationReference === "relation_2.76" &&
    identity.coolingRelationReference === "relation_2.77" &&
    arraysMatchExactly(identity.adjacentTextReferences, [
      "MC001-2022 page 120 section 2.8.4",
      "MC001-2022 page 121 relation 2.76",
      "MC001-2022 page 121 relation 2.77",
      "MC001-2022 page 121 symbol definitions"
    ]) &&
    Array.isArray(identity.sourceReviewNotes) &&
    identity.sourceReviewNotes.length === 3 &&
    identity.sourceReviewNotes.every(hasRequiredString)
  );
}

function validateLongUnoccupiedFormulaCandidates(candidates) {
  const expected = [
    [
      "MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION",
      "QH;nd;ztc;m",
      "2.76",
      "verified_for_restricted_heating_runtime",
      "QHnd = (1 - fHnocc) * QHndOcc + fHnocc * QHndNocc"
    ],
    [
      "MC001_2_77_LONG_UNOCCUPIED_COOLING_INTERPOLATION",
      "QC;nd;ztc;m",
      "2.77",
      "machine_encoded_metadata_only_not_runtime_cooling",
      "QCnd = (1 - fCnocc) * QCndOcc + fCnocc * QCndNocc"
    ]
  ];
  if (!Array.isArray(candidates) || candidates.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const [
      candidateCode,
      symbol,
      relationReference,
      readinessStatus,
      machineExpression
    ] = expected[index];
    const candidate = candidates[index];
    if (
      !isObject(candidate) ||
      candidate.candidateCode !== candidateCode ||
      candidate.mc001Symbol !== symbol ||
      candidate.relationReference !== relationReference ||
      candidate.readinessStatus !== readinessStatus ||
      candidate.machineExpression !== machineExpression ||
      candidate.unit !== "kWh" ||
      !hasRequiredString(candidate.expressionText) ||
      !hasRequiredString(candidate.sourceReference) ||
      !Array.isArray(candidate.requiredInputs) ||
      candidate.requiredInputs.length !== 3 ||
      !hasRequiredString(candidate.outputSymbol) ||
      !sourceLocatorLooksValid(candidate.sourceLocator, 121) ||
      candidate.sourceLocator.relation !== relationReference ||
      Object.hasOwn(candidate, "entryType") ||
      Object.hasOwn(candidate, "formulaCode")
    ) {
      return false;
    }
  }
  return true;
}

function validateLongUnoccupiedRuntimeIntegration(runtimeIntegration) {
  return (
    isObject(runtimeIntegration) &&
    arraysMatchExactly(runtimeIntegration.implementedFormulaCodes, [
      "MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION"
    ]) &&
    arraysMatchExactly(runtimeIntegration.metadataOnlyFormulaCodes, [
      "MC001_2_77_LONG_UNOCCUPIED_COOLING_INTERPOLATION"
    ]) &&
    runtimeIntegration.inputContract?.branchInputName === "longUnoccupiedPeriodAdjustment" &&
    arraysMatchExactly(runtimeIntegration.inputContract?.explicitInputs, [
      "qHndOccupied",
      "qHndUnoccupied",
      "unoccupiedFraction"
    ]) &&
    runtimeIntegration.inputContract?.outputOrigin ===
      "calculated_from_explicit_long_unoccupied_interpolation" &&
    arraysMatchExactly(runtimeIntegration.restrictions, [
      "heating_only",
      "explicit_input_only",
      "no_schedule_defaults",
      "no_setpoint_defaults",
      "no_cooling_runtime"
    ])
  );
}

function validateLongUnoccupiedDependencyMatrix(matrix) {
  return (
    isObject(matrix) &&
    matrix.occupiedMonthlyQhnd?.status === "explicit_input_required" &&
    matrix.unoccupiedMonthlyQhnd?.status === "explicit_input_required" &&
    matrix.unoccupiedFraction?.status === "explicit_input_required_0_to_1" &&
    matrix.heatingLongUnoccupiedRuntime?.status ===
      "implemented_restricted_explicit_interpolation" &&
    matrix.coolingLongUnoccupiedRuntime?.status === "blocked_metadata_only" &&
    matrix.intermittencyRuntime?.status === "blocked_not_relation_2_76_or_2_77" &&
    matrix.final_energy?.status === "blocked" &&
    matrix.primary_energy?.status === "blocked" &&
    matrix.co2?.status === "blocked" &&
    matrix.cpeCertificate?.status === "blocked"
  );
}

function validateLongUnoccupiedBlockers(blockers) {
  return arraysMatchExactly(blockers, [
    "not_QC;nd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_CPE_certificate",
    "no_system_losses",
    "no_hidden_defaults",
    "no_schedule_defaults",
    "no_temperature_setpoint_defaults",
    "intermittency_not_machine_encoded"
  ]);
}

function validateHeatingIntermittencySourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termica a cladirii" &&
    sourceScope.section === "2.8.2. Calculul efectului intermitentei incalzirii" &&
    arraysMatchExactly(sourceScope.pagesVerified, [117, 118, 119]) &&
    arraysMatchExactly(sourceScope.relationsVerified, [
      "2.59",
      "2.60",
      "2.61",
      "2.62",
      "2.63",
      "2.64",
      "2.65",
      "2.66",
      "2.67",
      "2.68",
      "2.69",
      "2.70",
      "2.71",
      "2.72",
      "2.73"
    ]) &&
    Array.isArray(sourceScope.extractionMethods) &&
    sourceScope.extractionMethods.includes("page.get_text(text)") &&
    sourceScope.extractionMethods.includes("visual inspection of cropped equation renderings")
  );
}

function validateHeatingIntermittencyConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_HEATING_INTERMITTENCY_RELATIONS" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "heating_intermittency_relations_2_59_to_2_73" &&
    concept.targetSymbol === "theta_int_calc_H;ztc;m" &&
    concept.registryKind === "machine_readable_restricted_runtime_source_pack" &&
    concept.unit === "mixed" &&
    hasRequiredString(concept.name) &&
    hasRequiredString(concept.purpose) &&
    sourceLocatorLooksValid(concept.sourceLocator, 117) &&
    concept.sourceLocator.subsection === "2.8.2"
  );
}

function validateHeatingIntermittencyFormulaCandidates(candidates) {
  const relations = [
    "2.59",
    "2.60",
    "2.61",
    "2.62",
    "2.63",
    "2.64",
    "2.65",
    "2.66",
    "2.67",
    "2.68",
    "2.69",
    "2.70",
    "2.71",
    "2.72",
    "2.73"
  ];
  if (!Array.isArray(candidates) || candidates.length !== relations.length) {
    return false;
  }
  const actualRelations = candidates.map((candidate) => candidate.relationReference);
  if (!arraysMatchExactly(actualRelations, relations)) {
    return false;
  }
  return candidates.every((candidate) =>
    isObject(candidate) &&
    hasRequiredString(candidate.candidateCode) &&
    hasRequiredString(candidate.expressionText) &&
    hasRequiredString(candidate.machineExpression) &&
    hasRequiredString(candidate.outputSymbol) &&
    hasRequiredString(candidate.outputUnit) &&
    Array.isArray(candidate.requiredInputs) &&
    Array.isArray(candidate.conditions) &&
    Array.isArray(candidate.dependencies) &&
    candidate.scopeClassification === "heating_runtime_ready" &&
    candidate.runtimeReadiness === "verified_for_restricted_runtime" &&
    sourceLocatorLooksValid(candidate.sourceLocator, candidate.sourceLocator.page) &&
    candidate.sourceLocator.relation === candidate.relationReference &&
    Object.hasOwn(candidate, "entryType") === false &&
    Object.hasOwn(candidate, "formulaCode") === false
  );
}

function validateHeatingIntermittencyDependencyGraph(graph) {
  return (
    isObject(graph) &&
    Array.isArray(graph.explicitInputs) &&
    graph.explicitInputs.includes("thetaIntSetH") &&
    graph.explicitInputs.includes("reductionPeriods") &&
    Array.isArray(graph.chain) &&
    graph.chain[0] === "relations_2_63_to_2_65_reduced_setpoint_ratio" &&
    graph.chain.includes("relation_2_59_corrected_heating_setpoint") &&
    graph.runtimeOutput === "QH;ht;ztc;m for restricted heating QHnd"
  );
}

function validateHeatingIntermittencyRuntimeIntegration(runtimeIntegration) {
  return (
    isObject(runtimeIntegration) &&
    runtimeIntegration.implementedModule === "mc001HeatingIntermittencyCalculation.mjs" &&
    runtimeIntegration.integrationModule === "mc001RestrictedHeatingQhndCalculation.mjs" &&
    runtimeIntegration.runtimeFormulaCode ===
      "MC001_R11_HEATING_INTERMITTENCY_QHHT_FROM_CORRECTED_SETPOINT" &&
    runtimeIntegration.qHhtOrigin ===
      "calculated_from_explicit_heating_intermittency_correction" &&
    arraysMatchExactly(runtimeIntegration.inputPolicy, [
      "explicit_inputs_only",
      "no_hidden_defaults",
      "no_schedule_defaults",
      "no_setpoint_defaults",
      "no_duration_defaults"
    ])
  );
}

function validateHeatingIntermittencyBlockers(blockers) {
  return arraysMatchExactly(blockers, [
    "not_QC;nd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_CPE_certificate",
    "no_system_losses",
    "no_hidden_defaults"
  ]);
}

function validateHeatingClosureSourceScope(sourceScope) {
  return (
    isObject(sourceScope) &&
    sourceScope.chapter === "Capitolul 2. Anvelopa termica a cladirii" &&
    sourceScope.section ===
      "2.7 monthly calculation method and 2.8 heating useful-demand corrections" &&
    arraysMatchExactly(sourceScope.parentSectionsVerified, [
      "2.7",
      "2.7.6",
      "2.8",
      "2.8.2",
      "2.8.4",
      "2.10"
    ]) &&
    arraysMatchExactly(sourceScope.pagesVerified, [113, 116, 117, 118, 119, 120, 121, 124]) &&
    arraysMatchExactly(sourceScope.figuresVerified, ["2.13", "2.14", "2.18", "2.19"]) &&
    arraysMatchExactly(sourceScope.relationsVerified, [
      "2.55",
      "2.57",
      "2.59",
      "2.60",
      "2.61",
      "2.62",
      "2.63",
      "2.64",
      "2.65",
      "2.66",
      "2.67",
      "2.68",
      "2.69",
      "2.70",
      "2.71",
      "2.72",
      "2.73",
      "2.76",
      "2.77",
      "2.84"
    ]) &&
    arraysMatchExactly(sourceScope.sourceMaterialsReviewed, [
      "local MC001-2022 methodology source",
      "R6 gains capacity time-constant source pack",
      "R7 QHnd ambiguity resolution source pack",
      "R8 etaHgn formula source pack",
      "R9 long unoccupied interpolation source pack",
      "R11 heating intermittency source pack"
    ])
  );
}

function validateHeatingClosureConcept(concept) {
  return (
    isObject(concept) &&
    concept.entryCode === "MC001_CONCEPT_HEATING_QHND_VERTICAL_CLOSURE" &&
    concept.entryType === "concept" &&
    concept.conceptCode === "heating_qhnd_vertical_closure_coverage" &&
    concept.targetSymbol === "QH;nd;ztc;m" &&
    concept.registryKind === "machine_readable_runtime_coverage_map" &&
    concept.unit === "coverage_metadata" &&
    hasRequiredString(concept.name) &&
    hasRequiredString(concept.purpose) &&
    sourceLocatorLooksValid(concept.sourceLocator, 120) &&
    concept.sourceLocator.figure === "2.18"
  );
}

function coverageBranchIds(branches) {
  return Array.isArray(branches) ? branches.map((branch) => branch.branchId) : [];
}

function validateHeatingClosureCoverageMap(map) {
  const implementedIds = [
    "figure_2_18_normal_balance",
    "figure_2_18_gamma_non_positive_positive_gains_zero_demand",
    "figure_2_18_gamma_greater_than_two_zero_demand",
    "figure_2_14_etaHgn_gamma_equals_one",
    "figure_2_14_etaHgn_gamma_not_one",
    "relation_2_55_aH_from_tauH",
    "relation_2_57_tauH_from_explicit_capacity_and_coefficients",
    "figure_2_13_explicit_heat_gains_sum",
    "relation_2_76_long_unoccupied_heating_interpolation",
    "relations_2_59_to_2_73_heating_intermittency_temperature_correction",
    "relation_2_84_annual_heating_qhnd_sum"
  ];
  return (
    isObject(map) &&
    arraysMatchExactly(coverageBranchIds(map.implementedRuntimeBranches), implementedIds) &&
    map.implementedRuntimeBranches.every((branch) =>
      isObject(branch) &&
      hasRequiredString(branch.relationOrFigure) &&
      hasRequiredString(branch.runtimeStatus) &&
      branch.runtimeStatus.startsWith("implemented_") &&
      hasRequiredString(branch.formulaReference)
    ) &&
    arraysMatchExactly(
      coverageBranchIds(map.sourceBackedMetadataOnlyBranches),
      ["relation_2_77_long_unoccupied_cooling_interpolation"]
    ) &&
    map.sourceBackedMetadataOnlyBranches[0].reason ===
      "cooling_QCnd_metadata_only_not_heating_runtime" &&
    arraysMatchExactly(coverageBranchIds(map.notMachineEncodedBranches), [
      "heating_period_boundary_duration_method"
    ]) &&
    arraysMatchExactly(map.downstreamOutOfScope, [
      "QCnd",
      "final_energy",
      "primary_energy",
      "CO2",
      "CPE_certificate",
      "system_losses",
      "fan_electricity",
      "air_treatment_energy"
    ])
  );
}

function validateHeatingClosureVerdict(verdict) {
  return (
    isObject(verdict) &&
    verdict.notFullQhndRemains === true &&
    verdict.reason ===
      "restricted explicit-input runtime still omits inferred schedules, setpoints, missing months, and boundary-month duration defaults" &&
    arraysMatchExactly(verdict.implementedHeatingUsefulDemandRelations, [
      "figure_2.18",
      "figure_2.14",
      "2.55",
      "2.57",
      "2.59-2.73",
      "2.76",
      "2.84"
    ]) &&
    arraysMatchExactly(verdict.blockedHeatingUsefulDemandRelations, [
      "section_2.11_boundary_duration_method"
    ]) &&
    arraysMatchExactly(verdict.coolingRelationsNotUsedInHeatingRuntime, ["2.77"])
  );
}

function validateHeatingClosureDependencyMatrix(matrix) {
  return (
    isObject(matrix) &&
    matrix.qHht?.status === "implemented_direct_or_explicit_C5_transfer_source" &&
    matrix.qHgn?.status ===
      "implemented_direct_components_or_explicit_monthly_heat_gains_result" &&
    matrix.gammaH?.status === "implemented_calculated_or_explicit_with_boundary_branches" &&
    matrix.tauH?.status ===
      "implemented_from_explicit_capacity_and_heat_transfer_coefficients" &&
    matrix.aH?.status === "implemented_explicit_or_from_explicit_tau_dependencies" &&
    matrix.etaHgn?.status === "implemented_explicit_or_calculated_from_explicit_aH" &&
    matrix.longUnoccupiedRelation276?.status ===
      "implemented_restricted_explicit_interpolation" &&
    matrix.heatingIntermittencyRelations259To273?.status ===
      "implemented_restricted_explicit_correction" &&
    matrix.annualQhnd?.status === "implemented_sum_of_explicit_monthly_cases" &&
    matrix.fullQhnd?.status === "blocked_not_full_QHnd" &&
    matrix.qcnd?.status === "blocked" &&
    matrix.final_energy?.status === "blocked" &&
    matrix.primary_energy?.status === "blocked" &&
    matrix.co2?.status === "blocked" &&
    matrix.cpeCertificate?.status === "blocked"
  );
}

function validateHeatingClosureBlockers(blockers) {
  return arraysMatchExactly(blockers, [
    "not_full_QH;nd",
    "not_QC;nd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_CPE_certificate",
    "no_system_losses",
    "no_hidden_defaults",
    "no_schedule_defaults",
    "no_temperature_setpoint_defaults",
    "boundary_duration_defaults_not_encoded"
  ]);
}

function sourcePackBaseIssue(
  sourcePack,
  verificationStatus,
  sourcePackType = SOURCE_PACK_TYPE
) {
  if (!isObject(sourcePack) || !SOURCE_PACK_CODES.has(sourcePack.sourcePackCode)) {
    return "blocked_invalid_source_pack";
  }
  if (sourcePack.sourcePackType !== sourcePackType) {
    return "blocked_invalid_source_pack";
  }
  if (sourcePack.verificationStatus !== verificationStatus) {
    return "blocked_invalid_verification_status";
  }
  if (sourcePack.implementationStatus !== IMPLEMENTATION_STATUS) {
    return "blocked_invalid_implementation_status";
  }
  return null;
}

function bztuSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(sourcePack, R0_VERIFICATION_STATUS);
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateBztuSourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateBztuConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateZoneTypes(sourcePack.zoneTypes)) {
    return "blocked_invalid_zone_type";
  }
  if (!validateBztuFormulas(sourcePack.formulas)) {
    return "blocked_invalid_formula";
  }
  if (!validateBztuFigures(sourcePack.figures)) {
    return "blocked_invalid_figure";
  }
  if (!validateApplicabilityRules(sourcePack.applicabilityRules, R0_APPLICABILITY_RULE_CODES)) {
    return "blocked_invalid_applicability_rule";
  }
  if (!validateDefaultValueCandidates(sourcePack.defaultValueCandidates)) {
    return "blocked_invalid_default_value_candidate";
  }
  return null;
}

function htrSpineSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(sourcePack, R2_VERIFICATION_STATUS);
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateHtrSpineSourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateHtrSpineConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateHtrSpineFormulas(sourcePack.formulas)) {
    return "blocked_invalid_formula";
  }
  if (
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates") ||
    Object.hasOwn(sourcePack, "applicabilityRules")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function monthlyTransmissionSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(sourcePack, R2_VERIFICATION_STATUS);
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateMonthlyTransmissionSourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateMonthlyTransmissionConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateMonthlyTransmissionFigures(sourcePack.figures)) {
    return "blocked_invalid_figure";
  }
  if (!validateMonthlyTransmissionFormulas(sourcePack.formulas)) {
    return "blocked_invalid_formula";
  }
  if (!validateApplicabilityRules(sourcePack.applicabilityRules, MONTHLY_APPLICABILITY_RULE_CODES)) {
    return "blocked_invalid_applicability_rule";
  }
  if (
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function qhndMonthlySourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(
    sourcePack,
    R2_VERIFICATION_STATUS,
    READINESS_SOURCE_PACK_TYPE
  );
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateQhndMonthlySourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateQhndMonthlyConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateQhndSourceMap(sourcePack.sourceMap)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateQhndDependencyGroups(sourcePack.dependencyGroups)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateQhndFutureReadiness(sourcePack.futureImplementationReadiness)) {
    return "blocked_invalid_source_pack";
  }
  if (
    sourcePack.metadataOnly !== true ||
    sourcePack.runtimeCalculatorStatus !== "not_implemented" ||
    Object.hasOwn(sourcePack, "formulas") ||
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "applicabilityRules") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function figure218HeatingSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(
    sourcePack,
    R2_VERIFICATION_STATUS,
    READINESS_SOURCE_PACK_TYPE
  );
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateFigure218HeatingSourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateFigure218HeatingConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateFigure218SourceIdentity(sourcePack.sourceIdentity)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateFigure218HeatingSymbols(sourcePack.heatingBranchSymbols)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateFigure218HeatingBranchLogic(sourcePack.heatingBranchDecisionLogic)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateFigure218FormulaCandidates(sourcePack.formulaCandidates)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateFigure218DependencyMatrix(sourcePack.dependencyMatrix)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateFigure218Blockers(sourcePack.blockers)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateFigure218FutureRuntimeReadiness(sourcePack.futureRuntimeReadiness)) {
    return "blocked_invalid_source_pack";
  }
  if (
    sourcePack.metadataOnly !== true ||
    sourcePack.runtimeCalculatorStatus !== "not_implemented" ||
    Object.hasOwn(sourcePack, "formulas") ||
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "applicabilityRules") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function utilizationHeatingSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(
    sourcePack,
    R2_VERIFICATION_STATUS,
    READINESS_SOURCE_PACK_TYPE
  );
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateUtilizationHeatingSourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateUtilizationHeatingConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateUtilizationHeatingSourceIdentity(sourcePack.sourceIdentity)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateUtilizationHeatingSymbols(sourcePack.heatingUtilizationSymbols)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateUtilizationBranchConditions(sourcePack.utilizationBranchConditions)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateUtilizationFormulaCandidates(sourcePack.formulaCandidates)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateFigure218AmbiguityReview(sourcePack.figure218AmbiguityReview)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateHeatingQhndReadiness(sourcePack.heatingQhndReadiness)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateUtilizationDependencyMatrix(sourcePack.dependencyMatrix)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateUtilizationBlockers(sourcePack.blockers)) {
    return "blocked_invalid_source_pack";
  }
  if (
    sourcePack.metadataOnly !== true ||
    sourcePack.runtimeCalculatorStatus !== "not_implemented" ||
    Object.hasOwn(sourcePack, "formulas") ||
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "applicabilityRules") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function gainsCapacityTimeconstantSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(
    sourcePack,
    R2_VERIFICATION_STATUS,
    READINESS_SOURCE_PACK_TYPE
  );
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateGainsCapacitySourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateGainsCapacityConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateGainsCapacitySourceIdentity(sourcePack.sourceIdentity)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateGainsCapacityDependencyMaps(sourcePack)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateGainsCapacityFormulaCandidates(sourcePack.formulaCandidates)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateGainsCapacityAmbiguityReview(sourcePack.figure218AmbiguityReview)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateGainsCapacityReadinessVerdict(sourcePack.heatingQhndReadinessVerdict)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateGainsCapacityDependencyMatrix(sourcePack.dependencyMatrix)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateGainsCapacityBlockers(sourcePack.blockers)) {
    return "blocked_invalid_source_pack";
  }
  if (
    sourcePack.metadataOnly !== true ||
    sourcePack.runtimeCalculatorStatus !== "not_implemented" ||
    Object.hasOwn(sourcePack, "formulas") ||
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "applicabilityRules") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function qhndAmbiguityResolutionSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(
    sourcePack,
    R2_VERIFICATION_STATUS,
    READINESS_SOURCE_PACK_TYPE
  );
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateQhndAmbiguitySourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateQhndAmbiguityConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateQhndAmbiguitySourceIdentity(sourcePack.sourceIdentity)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateQhndAmbiguityFigure218Review(sourcePack.figure218FirstBranchReview)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateQhndAmbiguityEdgeReview(sourcePack.figure214EdgeConditionReview)) {
    return "blocked_invalid_source_pack";
  }
  if (
    !validateQhndAmbiguityRestrictedRuntimeFeasibility(
      sourcePack.restrictedExplicitInputRuntimeFeasibility
    )
  ) {
    return "blocked_invalid_source_pack";
  }
  if (
    sourcePack.runtimeReadinessVerdict !==
    "C6F_CAN_IMPLEMENT_RESTRICTED_HEATING_QHND_EXPLICIT_INPUT"
  ) {
    return "blocked_invalid_source_pack";
  }
  if (!validateQhndAmbiguityDependencyMatrix(sourcePack.dependencyMatrix)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateQhndAmbiguityBlockers(sourcePack.blockers)) {
    return "blocked_invalid_source_pack";
  }
  if (
    sourcePack.metadataOnly !== true ||
    sourcePack.runtimeCalculatorStatus !== "not_implemented" ||
    Object.hasOwn(sourcePack, "formulas") ||
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "applicabilityRules") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function heatingEtaFormulaSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(
    sourcePack,
    R2_VERIFICATION_STATUS,
    READINESS_SOURCE_PACK_TYPE
  );
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateHeatingEtaSourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateHeatingEtaConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateHeatingEtaSourceIdentity(sourcePack.sourceIdentity)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateHeatingEtaFormulaCandidates(sourcePack.formulaCandidates)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateHeatingEtaBranchConditions(sourcePack.branchConditionTable)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateHeatingEtaRelationshipToC6F(sourcePack.relationshipToC6F)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateHeatingEtaDependencyMatrix(sourcePack.dependencyMatrix)) {
    return "blocked_invalid_source_pack";
  }
  if (
    sourcePack.runtimeReadinessVerdict !==
    "C7B_CAN_IMPLEMENT_RESTRICTED_ETA_HGN_RUNTIME_WITH_EXPLICIT_A_AND_GAMMA"
  ) {
    return "blocked_invalid_source_pack";
  }
  if (!validateHeatingEtaBlockers(sourcePack.blockers)) {
    return "blocked_invalid_source_pack";
  }
  if (
    sourcePack.metadataOnly !== true ||
    sourcePack.runtimeCalculatorStatus !== "not_implemented" ||
    Object.hasOwn(sourcePack, "formulas") ||
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "applicabilityRules") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function longUnoccupiedInterpolationSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(
    sourcePack,
    R2_VERIFICATION_STATUS,
    READINESS_SOURCE_PACK_TYPE
  );
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateLongUnoccupiedSourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateLongUnoccupiedConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateLongUnoccupiedSourceIdentity(sourcePack.sourceIdentity)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateLongUnoccupiedFormulaCandidates(sourcePack.formulaCandidates)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateLongUnoccupiedRuntimeIntegration(sourcePack.runtimeIntegration)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateLongUnoccupiedDependencyMatrix(sourcePack.dependencyMatrix)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateLongUnoccupiedBlockers(sourcePack.blockers)) {
    return "blocked_invalid_source_pack";
  }
  if (
    sourcePack.metadataOnly !== false ||
    sourcePack.machineReadable !== true ||
    sourcePack.runtimeCalculatorStatus !== "implemented_restricted_heating_relation_2_76_only" ||
    Object.hasOwn(sourcePack, "formulas") ||
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "applicabilityRules") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function heatingQhndClosureSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(
    sourcePack,
    R2_VERIFICATION_STATUS,
    READINESS_SOURCE_PACK_TYPE
  );
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateHeatingClosureSourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateHeatingClosureConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateHeatingClosureCoverageMap(sourcePack.heatingQhndCoverageMap)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateHeatingClosureVerdict(sourcePack.runtimeClosureVerdict)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateHeatingClosureDependencyMatrix(sourcePack.dependencyMatrix)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateHeatingClosureBlockers(sourcePack.blockers)) {
    return "blocked_invalid_source_pack";
  }
  if (
    sourcePack.metadataOnly !== false ||
    sourcePack.machineReadable !== true ||
    sourcePack.runtimeCalculatorStatus !==
      "coverage_map_only_existing_restricted_heating_runtime_no_new_formula" ||
    Object.hasOwn(sourcePack, "formulas") ||
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "applicabilityRules") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function heatingIntermittencySourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(
    sourcePack,
    R2_VERIFICATION_STATUS,
    READINESS_SOURCE_PACK_TYPE
  );
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateHeatingIntermittencySourceScope(sourcePack.sourceScope)) {
    return "blocked_invalid_source_scope";
  }
  if (!validateHeatingIntermittencyConcept(sourcePack.concept)) {
    return "blocked_invalid_concept";
  }
  if (!validateHeatingIntermittencyFormulaCandidates(sourcePack.formulaCandidates)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateHeatingIntermittencyDependencyGraph(sourcePack.dependencyGraph)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateHeatingIntermittencyRuntimeIntegration(sourcePack.runtimeIntegration)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateHeatingIntermittencyBlockers(sourcePack.blockers)) {
    return "blocked_invalid_source_pack";
  }
  if (
    sourcePack.metadataOnly !== false ||
    sourcePack.machineReadable !== true ||
    sourcePack.runtimeCalculatorStatus !==
      "implemented_restricted_explicit_heating_intermittency_runtime" ||
    Object.hasOwn(sourcePack, "formulas") ||
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "applicabilityRules") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function validateCoolingRuntimeSourceScope(sourceScope, requiredPages, requiredRelations) {
  return (
    isObject(sourceScope) &&
    Array.isArray(sourceScope.extractionMethods) &&
    sourceScope.extractionMethods.includes("page rendering to PNG") &&
    requiredPages.every(page => sourceScope.pagesVerified?.includes(page)) &&
    requiredRelations.every(relation => sourceScope.relationsVerified?.includes(relation))
  );
}

function validateCoolingRuntimeConcept(concept, expectedEntryCode, expectedConceptCode, targetSymbol) {
  return (
    isObject(concept) &&
    concept.entryCode === expectedEntryCode &&
    concept.entryType === "concept" &&
    concept.conceptCode === expectedConceptCode &&
    concept.registryKind === "machine_readable_restricted_runtime_source_pack" &&
    concept.targetSymbol === targetSymbol &&
    hasRequiredString(concept.purpose) &&
    isObject(concept.sourceLocator)
  );
}

function validateCoolingFormulaCandidates(candidates, prefix, requiredReferences) {
  if (!Array.isArray(candidates) || candidates.length < requiredReferences.length) {
    return false;
  }
  const references = new Set(candidates.map(candidate => candidate.relationReference));
  if (!requiredReferences.every(reference => references.has(reference))) {
    return false;
  }
  return candidates.every(candidate => (
    isObject(candidate) &&
    typeof candidate.candidateCode === "string" &&
    candidate.candidateCode.startsWith(prefix) &&
    hasRequiredString(candidate.expressionText) &&
    hasRequiredString(candidate.machineExpression) &&
    hasRequiredString(candidate.outputSymbol) &&
    hasRequiredString(candidate.outputUnit) &&
    Array.isArray(candidate.requiredInputs) &&
    candidate.requiredInputs.length > 0 &&
    hasRequiredString(candidate.scopeClassification) &&
    hasRequiredString(candidate.runtimeReadiness) &&
    hasRequiredString(candidate.sourceReference) &&
    candidate.sourceReference.includes("MC001-2022") &&
    isObject(candidate.sourceLocator)
  ));
}

function validateCoolingRuntimeIntegration(integration, expectedModule) {
  return (
    isObject(integration) &&
    integration.implementedModule === expectedModule &&
    Array.isArray(integration.inputPolicy) &&
    integration.inputPolicy.includes("explicit_inputs_only") &&
    integration.inputPolicy.includes("no_hidden_defaults")
  );
}

function validateCoolingBlockers(blockers) {
  return Array.isArray(blockers) &&
    blockers.includes("not_final_energy") &&
    blockers.includes("not_primary_energy") &&
    blockers.includes("not_CO2") &&
    blockers.includes("not_CPE_certificate") &&
    blockers.includes("no_hidden_defaults");
}

function coolingSourcePackIssue(sourcePack, config) {
  const baseIssue = sourcePackBaseIssue(
    sourcePack,
    R2_VERIFICATION_STATUS,
    READINESS_SOURCE_PACK_TYPE
  );
  if (baseIssue) {
    return baseIssue;
  }
  if (!validateCoolingRuntimeSourceScope(
    sourcePack.sourceScope,
    config.requiredPages,
    config.requiredRelations
  )) {
    return "blocked_invalid_source_scope";
  }
  if (!validateCoolingRuntimeConcept(
    sourcePack.concept,
    config.entryCode,
    config.conceptCode,
    config.targetSymbol
  )) {
    return "blocked_invalid_concept";
  }
  if (!validateCoolingFormulaCandidates(
    sourcePack.formulaCandidates,
    config.candidatePrefix,
    config.requiredFormulaReferences
  )) {
    return "blocked_invalid_source_pack";
  }
  if (!validateCoolingRuntimeIntegration(sourcePack.runtimeIntegration, config.implementedModule)) {
    return "blocked_invalid_source_pack";
  }
  if (!validateCoolingBlockers(sourcePack.blockers)) {
    return "blocked_invalid_source_pack";
  }
  if (
    sourcePack.metadataOnly !== false ||
    sourcePack.machineReadable !== true ||
    sourcePack.runtimeCalculatorStatus !== config.runtimeCalculatorStatus ||
    Object.hasOwn(sourcePack, "formulas") ||
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "applicabilityRules") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function validateEnvelopeRuntimeSourceScope(sourceScope, requiredPages, requiredRelations) {
  return (
    isObject(sourceScope) &&
    Array.isArray(sourceScope.pagesVerified) &&
    requiredPages.every(page => sourceScope.pagesVerified.includes(page)) &&
    Array.isArray(sourceScope.relationsVerified) &&
    requiredRelations.every(relation => sourceScope.relationsVerified.includes(relation)) &&
    Array.isArray(sourceScope.extractionMethods) &&
    sourceScope.extractionMethods.includes("page.get_text(text)") &&
    sourceScope.extractionMethods.includes("page.get_text(blocks)") &&
    sourceScope.extractionMethods.includes("page.get_text(dict)") &&
    sourceScope.extractionMethods.includes("page rendering to PNG") &&
    sourceScope.extractionMethods.includes("visual inspection of rendered equations")
  );
}

function validateEnvelopeFormulaCandidates(candidates, prefix, minimumCount) {
  if (!Array.isArray(candidates) || candidates.length < minimumCount) {
    return false;
  }
  return candidates.every(candidate => (
    isObject(candidate) &&
    hasRequiredString(candidate.candidateCode) &&
    candidate.candidateCode.startsWith(prefix) &&
    hasRequiredString(candidate.relationReference) &&
    hasRequiredString(candidate.expressionText) &&
    hasRequiredString(candidate.machineExpression) &&
    hasRequiredString(candidate.outputSymbol) &&
    hasRequiredString(candidate.outputUnit) &&
    Array.isArray(candidate.requiredInputs) &&
    candidate.requiredInputs.length > 0 &&
    Array.isArray(candidate.conditions) &&
    candidate.conditions.length > 0 &&
    hasRequiredString(candidate.scopeClassification) &&
    [
      "verified_for_restricted_runtime",
      "metadata_only_use_R17_bridge_runtime_path",
      "metadata_only_not_runtime_path"
    ].includes(candidate.runtimeReadiness) &&
    hasRequiredString(candidate.sourceReference) &&
    isObject(candidate.sourceLocator) &&
    sourceLocatorLooksValid(candidate.sourceLocator, candidate.sourceLocator.page) &&
    !Object.hasOwn(candidate, "entryType") &&
    !Object.hasOwn(candidate, "formulaCode") &&
    !Object.hasOwn(candidate, "defaultValue") &&
    !Object.hasOwn(candidate, "defaultValues")
  ));
}

function envelopeSourcePackIssue(sourcePack, config) {
  const baseIssue = sourcePackBaseIssue(
    sourcePack,
    R2_VERIFICATION_STATUS,
    SOURCE_PACK_TYPE
  );
  if (baseIssue) {
    return baseIssue;
  }
  if (
    sourcePack.metadataOnly !== false ||
    sourcePack.machineReadable !== true ||
    sourcePack.runtimeCalculatorStatus !== config.runtimeCalculatorStatus ||
    !validateEnvelopeRuntimeSourceScope(
      sourcePack.sourceScope,
      config.requiredPages,
      config.requiredRelations
    ) ||
    !validateEnvelopeFormulaCandidates(
      sourcePack.formulaCandidates,
      config.candidatePrefix,
      config.minimumCandidateCount
    ) ||
    !isObject(sourcePack.runtimeIntegration) ||
    sourcePack.runtimeIntegration.implementedModule !== "mc001EnvelopePhysicsCalculation.mjs" ||
    !Array.isArray(sourcePack.runtimeIntegration.inputPolicy) ||
    !sourcePack.runtimeIntegration.inputPolicy.includes("explicit_inputs_only") ||
    !sourcePack.runtimeIntegration.inputPolicy.includes("no_hidden_defaults") ||
    !Array.isArray(sourcePack.blockers) ||
    !sourcePack.blockers.includes("not_certificate") ||
    !sourcePack.blockers.includes("no_hidden_defaults") ||
    Object.hasOwn(sourcePack, "formulas") ||
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "applicabilityRules") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function chapter2CompleteCoverageSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(sourcePack, R2_VERIFICATION_STATUS);
  if (baseIssue) {
    return baseIssue;
  }
  const map = sourcePack.coverageMap;
  const integration = sourcePack.runtimeIntegration;
  const assessment = sourcePack.completenessAssessment;
  const requiredRuntimeItems = [
    "material_lambda_relation_2_3_with_explicit_table_2_2_coefficient_code",
    "surface_resistance_table_2_11_explicit_code_lookup",
    "exterior_surface_resistance_table_2_12_explicit_wind_speed_code_lookup",
    "solar_transmission_table_2_13_explicit_glazing_type_lookup",
    "effective_internal_heat_capacity_table_2_20_explicit_class_area_lookup",
    "u_value_from_total_resistance",
    "Htr_component_sum",
    "monthly_transmission_explicit_temperature_duration",
    "monthly_ventilation_explicit_airflow_temperature_duration",
    "monthly_heat_gains_explicit_internal_plus_solar_sum",
    "heating_QHnd_normal_boundary_intermittency_long_unoccupied",
    "cooling_QCnd_normal_boundary_intermittency_long_unoccupied",
    "annual_QHnd_sum_relation_2_84",
    "annual_QCnd_sum_relation_2_85",
    "twelve_month_explicit_chapter_2_calculation_layer"
  ];
  const requiredExplicitOnlyItems = [
    "base_material_lambda_normat",
    "monthly_weather_temperatures",
    "internal_gain_components_and_schedules",
    "solar_irradiation_orientation_shading_and_range_glazing_properties"
  ];
  const requiredOutOfScopeItems = [
    "final_energy",
    "primary_energy",
    "CO2",
    "CPE",
    "certificate"
  ];
  if (
    sourcePack.metadataOnly !== false ||
    sourcePack.machineReadable !== true ||
    sourcePack.runtimeCalculatorStatus !==
      "implemented_explicit_chapter_2_useful_demand_coverage_map_and_12_month_calculation_layer" ||
    !validateEnvelopeRuntimeSourceScope(
      sourcePack.sourceScope,
      [48, 77, 79, 80, 81, 82, 83, 84, 94, 95, 100, 103, 104, 105, 112, 120, 121, 124],
      ["2.3", "2.6", "2.7", "2.8", "2.11", "2.12", "2.15", "2.22", "2.27", "2.28", "2.84", "2.85"]
    ) ||
    !isObject(map) ||
    !requiredRuntimeItems.every(item => map.runtimeImplemented?.includes(item)) ||
    !requiredExplicitOnlyItems.every(item => map.explicitInputOnly?.includes(item)) ||
    !map.tableBackedNotEncoded?.includes("material_lambda_catalog_values") ||
    map.tableBackedNotEncoded?.includes("surface_resistance_default_tables") ||
    !map.ambiguousExtraction?.includes("automatic_ground_contact_detailed_method") ||
    !requiredOutOfScopeItems.every(item => map.outOfChapter2UsefulDemandScope?.includes(item)) ||
    !isObject(integration) ||
    !integration.implementedModules?.includes("mc001Chapter2UsefulDemandCalculation.mjs") ||
    integration.implementedExport !== "chapter_2_useful_demand_explicit_v1" ||
    !integration.inputPolicy?.includes("explicit_inputs_only") ||
    !integration.inputPolicy?.includes("no_hidden_defaults") ||
    !integration.outputPolicy?.includes("separate_annualQHnd_and_annualQCnd") ||
    !integration.outputPolicy?.includes("no_certificate") ||
    !isObject(assessment) ||
    !assessment.restrictiveMarkersRetained?.includes("not_certificate") ||
    !assessment.remainingGaps?.includes("default_material_lambda_catalog_values_not_encoded") ||
    assessment.remainingGaps?.includes("default_surface_resistance_tables_not_encoded") ||
    !Array.isArray(sourcePack.blockers) ||
    !sourcePack.blockers.includes("not_certificate") ||
    !sourcePack.blockers.includes("no_hidden_defaults") ||
    Object.hasOwn(sourcePack, "formulas") ||
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "applicabilityRules") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }
  return null;
}

function matrixEntriesHaveAllowedStatuses(entries) {
  return Array.isArray(entries) && entries.every((entry) => (
    isObject(entry) &&
    hasRequiredString(entry.identifier) &&
    hasRequiredString(entry.type) &&
    CHAPTER_2_ALLOWED_MATRIX_STATUSES.includes(entry.implementationStatus) &&
    entry.sourcePack === R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE &&
    entry.implementationStatus !== "unknown" &&
    entry.implementationStatus !== "unreviewed" &&
    entry.implementationStatus !== "unclassified"
  ));
}

function chapter2ExhaustiveCoverageMatrixSourcePackIssue(sourcePack) {
  const baseIssue = sourcePackBaseIssue(sourcePack, R2_VERIFICATION_STATUS);
  if (baseIssue) {
    return baseIssue;
  }

  const matrix = sourcePack.coverageMatrix;
  const gate = sourcePack.completenessGate;
  const expectedPages = chapter2IntegerRange(CHAPTER_2_FIRST_PAGE, CHAPTER_2_LAST_PAGE);

  if (
    sourcePack.metadataOnly !== false ||
    sourcePack.machineReadable !== true ||
    sourcePack.runtimeCalculatorStatus !==
      "executable_chapter_2_coverage_matrix_and_nonclosure_gate" ||
    !isObject(sourcePack.sourceScope) ||
    !arraysMatchExactly(sourcePack.sourceScope.pagesVerified, expectedPages) ||
    !arraysMatchExactly(sourcePack.sourceScope.relationsVerified, CHAPTER_2_RELATION_NUMBERS) ||
    !arraysMatchExactly(sourcePack.sourceScope.tablesVerified, CHAPTER_2_TABLE_NUMBERS) ||
    !arraysMatchExactly(sourcePack.sourceScope.figuresVerified, CHAPTER_2_FIGURE_NUMBERS) ||
    !isObject(matrix) ||
    matrix.matrixId !== R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE ||
    matrix.pageRange?.firstPage !== CHAPTER_2_FIRST_PAGE ||
    matrix.pageRange?.lastPage !== CHAPTER_2_LAST_PAGE ||
    matrix.pageRange?.totalPages !== expectedPages.length ||
    !matrixEntriesHaveAllowedStatuses(matrix.pageInspections) ||
    !matrixEntriesHaveAllowedStatuses(matrix.relations) ||
    !matrixEntriesHaveAllowedStatuses(matrix.tables) ||
    !matrixEntriesHaveAllowedStatuses(matrix.figures) ||
    !matrixEntriesHaveAllowedStatuses(matrix.conditions) ||
    matrix.pageInspections.length !== expectedPages.length ||
    matrix.relations.length !== CHAPTER_2_RELATION_NUMBERS.length ||
    matrix.tables.length !== CHAPTER_2_TABLE_NUMBERS.length ||
    matrix.figures.length !== CHAPTER_2_FIGURE_NUMBERS.length ||
    matrix.completionGate?.closureStatus !== "CHAPTER_2_NOT_CLOSED" ||
    matrix.completenessMetrics?.pagesInspected !== expectedPages.length ||
    matrix.completenessMetrics?.relationsClassified !== CHAPTER_2_RELATION_NUMBERS.length ||
    matrix.completenessMetrics?.tablesClassified !== CHAPTER_2_TABLE_NUMBERS.length ||
    matrix.completenessMetrics?.figuresClassified !== CHAPTER_2_FIGURE_NUMBERS.length ||
    matrix.completenessMetrics?.tablesMachineEncoded !== CHAPTER_2_TABLE_MACHINE_ENCODED.size ||
    !isObject(gate) ||
    gate.closureStatus !== "CHAPTER_2_NOT_CLOSED" ||
    !gate.unresolvedItemIds?.includes("MC001_RELATION_2_2") ||
    !gate.unresolvedItemIds?.includes("MC001_TABLE_2_21") ||
    !Array.isArray(sourcePack.blockers) ||
    !sourcePack.blockers.includes("chapter_2_not_closed") ||
    !sourcePack.blockers.includes("no_hidden_defaults") ||
    Object.hasOwn(sourcePack, "formulas") ||
    Object.hasOwn(sourcePack, "figures") ||
    Object.hasOwn(sourcePack, "zoneTypes") ||
    Object.hasOwn(sourcePack, "applicabilityRules") ||
    Object.hasOwn(sourcePack, "defaultValueCandidates")
  ) {
    return "blocked_invalid_source_pack";
  }

  return null;
}

function sourcePackIssue(sourcePack) {
  if (!isObject(sourcePack) || !SOURCE_PACK_CODES.has(sourcePack.sourcePackCode)) {
    return "blocked_invalid_source_pack";
  }
  if (sourcePack.sourcePackCode === R0_BZTU_SOURCE_PACK_CODE) {
    return bztuSourcePackIssue(sourcePack);
  }
  if (sourcePack.sourcePackCode === R2_HTR_SPINE_SOURCE_PACK_CODE) {
    return htrSpineSourcePackIssue(sourcePack);
  }
  if (sourcePack.sourcePackCode === R2_MONTHLY_TRANSMISSION_SOURCE_PACK_CODE) {
    return monthlyTransmissionSourcePackIssue(sourcePack);
  }
  if (sourcePack.sourcePackCode === R3_QHND_MONTHLY_SOURCE_PACK_CODE) {
    return qhndMonthlySourcePackIssue(sourcePack);
  }
  if (sourcePack.sourcePackCode === R4_FIGURE_2_18_HEATING_BRANCH_SOURCE_PACK_CODE) {
    return figure218HeatingSourcePackIssue(sourcePack);
  }
  if (sourcePack.sourcePackCode === R5_UTILIZATION_FACTORS_HEATING_SOURCE_PACK_CODE) {
    return utilizationHeatingSourcePackIssue(sourcePack);
  }
  if (sourcePack.sourcePackCode === R6_GAINS_CAPACITY_TIMECONSTANT_SOURCE_PACK_CODE) {
    return gainsCapacityTimeconstantSourcePackIssue(sourcePack);
  }
  if (sourcePack.sourcePackCode === R7_QHND_AMBIGUITY_RESOLUTION_SOURCE_PACK_CODE) {
    return qhndAmbiguityResolutionSourcePackIssue(sourcePack);
  }
  if (
    sourcePack.sourcePackCode ===
    R8_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_SOURCE_PACK_CODE
  ) {
    return heatingEtaFormulaSourcePackIssue(sourcePack);
  }
  if (sourcePack.sourcePackCode === R9_LONG_UNOCCUPIED_INTERPOLATION_SOURCE_PACK_CODE) {
    return longUnoccupiedInterpolationSourcePackIssue(sourcePack);
  }
  if (sourcePack.sourcePackCode === R10_HEATING_QHND_VERTICAL_CLOSURE_SOURCE_PACK_CODE) {
    return heatingQhndClosureSourcePackIssue(sourcePack);
  }
  if (sourcePack.sourcePackCode === R11_HEATING_INTERMITTENCY_SOURCE_PACK_CODE) {
    return heatingIntermittencySourcePackIssue(sourcePack);
  }
  if (sourcePack.sourcePackCode === R12_COOLING_QCND_FORMULA_SOURCE_PACK_CODE) {
    return coolingSourcePackIssue(sourcePack, {
      entryCode: "MC001_CONCEPT_COOLING_QCND_FORMULA",
      conceptCode: "cooling_qcnd_formula_runtime",
      targetSymbol: "QC;nd;ztc;m",
      candidatePrefix: "MC001_R12_",
      requiredPages: [120, 121, 124],
      requiredRelations: ["2.77", "2.85"],
      requiredFormulaReferences: ["figure_2.19", "2.77", "2.85"],
      implementedModule: "mc001CoolingUsefulDemandCalculation.mjs",
      runtimeCalculatorStatus: "implemented_restricted_explicit_cooling_QCnd_runtime"
    });
  }
  if (sourcePack.sourcePackCode === R13_COOLING_UTILIZATION_FACTOR_SOURCE_PACK_CODE) {
    return coolingSourcePackIssue(sourcePack, {
      entryCode: "MC001_CONCEPT_COOLING_UTILIZATION_FACTOR",
      conceptCode: "cooling_heat_transfer_utilization_factor_runtime",
      targetSymbol: "etaC;ht;ztc;m",
      candidatePrefix: "MC001_R13_",
      requiredPages: [114, 116],
      requiredRelations: ["2.56", "2.58"],
      requiredFormulaReferences: ["figure_2.15", "2.56", "2.58"],
      implementedModule: "mc001CoolingHeatTransferUtilizationFactorCalculation.mjs",
      runtimeCalculatorStatus: "implemented_restricted_explicit_cooling_utilization_runtime"
    });
  }
  if (sourcePack.sourcePackCode === R14_COOLING_INTERMITTENCY_SOURCE_PACK_CODE) {
    return coolingSourcePackIssue(sourcePack, {
      entryCode: "MC001_CONCEPT_COOLING_INTERMITTENCY_RELATIONS",
      conceptCode: "cooling_intermittency_relations_2_74_to_2_75",
      targetSymbol: "aC;red;ztc;m",
      candidatePrefix: "MC001_R14_",
      requiredPages: [119],
      requiredRelations: ["2.74", "2.75"],
      requiredFormulaReferences: ["2.74", "2.75"],
      implementedModule: "mc001CoolingIntermittencyCalculation.mjs",
      runtimeCalculatorStatus: "implemented_restricted_explicit_cooling_intermittency_runtime"
    });
  }
  if (sourcePack.sourcePackCode === R15_ENVELOPE_MATERIALS_RESISTANCE_SOURCE_PACK_CODE) {
    return envelopeSourcePackIssue(sourcePack, {
      candidatePrefix: "MC001_R15_",
      requiredPages: [48, 77],
      requiredRelations: ["2.3", "2.6"],
      minimumCandidateCount: 4,
      runtimeCalculatorStatus: "implemented_explicit_envelope_material_layer_resistance_runtime"
    });
  }
  if (sourcePack.sourcePackCode === R16_ENVELOPE_THERMAL_TRANSMITTANCE_SOURCE_PACK_CODE) {
    return envelopeSourcePackIssue(sourcePack, {
      candidatePrefix: "MC001_R16_",
      requiredPages: [79, 80],
      requiredRelations: ["2.7", "2.8", "2.9", "2.10"],
      minimumCandidateCount: 3,
      runtimeCalculatorStatus: "implemented_explicit_envelope_U_value_runtime"
    });
  }
  if (sourcePack.sourcePackCode === R17_ENVELOPE_TRANSMISSION_COEFFICIENTS_SOURCE_PACK_CODE) {
    return envelopeSourcePackIssue(sourcePack, {
      candidatePrefix: "MC001_R17_",
      requiredPages: [80, 81, 100],
      requiredRelations: ["2.11", "2.12", "2.13", "2.15", "2.27", "2.28"],
      minimumCandidateCount: 5,
      runtimeCalculatorStatus: "implemented_explicit_envelope_Htr_runtime"
    });
  }
  if (sourcePack.sourcePackCode === R18_ENVELOPE_BOUNDARY_CORRECTIONS_SOURCE_PACK_CODE) {
    return envelopeSourcePackIssue(sourcePack, {
      candidatePrefix: "MC001_R18_",
      requiredPages: [81, 82, 94, 95, 100],
      requiredRelations: ["2.15", "2.21", "2.22", "2.27"],
      minimumCandidateCount: 4,
      runtimeCalculatorStatus: "implemented_explicit_boundary_correction_runtime"
    });
  }
  if (
    sourcePack.sourcePackCode ===
    R19_CHAPTER_2_COMPLETE_USEFUL_DEMAND_COVERAGE_SOURCE_PACK_CODE
  ) {
    return chapter2CompleteCoverageSourcePackIssue(sourcePack);
  }
  if (
    sourcePack.sourcePackCode ===
    R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE
  ) {
    return chapter2ExhaustiveCoverageMatrixSourcePackIssue(sourcePack);
  }
  return "blocked_invalid_source_pack";
}

function validationCountsMatch(counts) {
  const expected = expectedCounts();
  return Object.keys(expected).every((key) => counts[key] === expected[key]);
}

function allEntriesFromSourcePack(sourcePack) {
  const entries = [];
  if (isObject(sourcePack?.concept)) {
    entries.push(sourcePack.concept);
  }
  if (Array.isArray(sourcePack?.zoneTypes)) {
    entries.push(...sourcePack.zoneTypes);
  }
  if (Array.isArray(sourcePack?.formulas)) {
    for (const formula of sourcePack.formulas) {
      entries.push(formula);
      if (Array.isArray(formula.constants)) {
        entries.push(...formula.constants);
      }
    }
  }
  if (Array.isArray(sourcePack?.figures)) {
    for (const figure of sourcePack.figures) {
      entries.push(figure);
      if (Array.isArray(figure.rules)) {
        entries.push(...figure.rules);
      }
    }
  }
  if (Array.isArray(sourcePack?.applicabilityRules)) {
    entries.push(...sourcePack.applicabilityRules);
  }
  if (Array.isArray(sourcePack?.defaultValueCandidates)) {
    entries.push(...sourcePack.defaultValueCandidates);
  }
  return entries;
}

function allEntriesFromRegistry(registry) {
  return registrySourcePacks(registry).flatMap(allEntriesFromSourcePack);
}

function allFormulasFromRegistry(registry) {
  return registrySourcePacks(registry).flatMap((sourcePack) => (
    Array.isArray(sourcePack?.formulas) ? sourcePack.formulas : []
  ));
}

function sourcePackIsValid(sourcePack) {
  return sourcePackIssue(sourcePack) === null;
}

function registryIsValid(registry) {
  return validateMc001NormativeRegistry(registry).status === "valid";
}

export function getMc001NormativeRegistry(options = {}) {
  void options;
  return cloneAndFreeze(mc001NormativeRegistryV1);
}

export function validateMc001NormativeRegistry(registry, options = {}) {
  void options;

  if (!isObject(registry)) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_invalid_registry")]),
      counts: expectedCounts()
    });
  }
  if (containsPrivateContent(registry)) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_unsafe_private_content")]),
      counts: expectedCounts()
    });
  }
  if (
    registry.schemaVersion !== SCHEMA_VERSION ||
    registry.isMc001NormativeRegistry !== true ||
    registry.registryStatus !== REGISTRY_STATUS
  ) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_invalid_schema_version")]),
      counts: expectedCounts()
    });
  }
  if (!validateMethodology(registry)) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_invalid_methodology_metadata")]),
      counts: expectedCounts()
    });
  }
  if (!validateOfficialDocument(registry)) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_invalid_official_document_metadata")]),
      counts: expectedCounts()
    });
  }
  if (
    !Array.isArray(registry.sourcePacks) ||
    !setMatchesExactly(
      registry.sourcePacks.map((sourcePack) => sourcePack.sourcePackCode),
      SOURCE_PACK_CODES
    )
  ) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_invalid_source_pack")]),
      counts: countRegistryEntries(registry)
    });
  }

  for (const sourcePack of registry.sourcePacks) {
    const issue = sourcePackIssue(sourcePack);
    if (issue) {
      return Object.freeze({
        status: "blocked",
        blockers: Object.freeze([blocker(issue)]),
        counts: countRegistryEntries(registry)
      });
    }
  }
  const counts = countRegistryEntries(registry);
  if (!validationCountsMatch(counts)) {
    return Object.freeze({
      status: "blocked",
      blockers: Object.freeze([blocker("blocked_invalid_registry")]),
      counts
    });
  }
  return Object.freeze({
    status: "valid",
    blockers: Object.freeze([]),
    counts
  });
}

export function getMc001NormativeSourcePackByCode(sourcePackCode, options = {}) {
  void options;
  if (!SOURCE_PACK_CODES.has(sourcePackCode)) {
    return resultWithBlocker("blocked_unknown_source_pack_code");
  }
  if (!registryIsValid(mc001NormativeRegistryV1)) {
    return resultWithBlocker("blocked_invalid_registry");
  }
  const sourcePack = findSourcePackByCode(mc001NormativeRegistryV1, sourcePackCode);
  if (!sourcePack || !sourcePackIsValid(sourcePack)) {
    return resultWithBlocker("blocked_invalid_source_pack");
  }
  return Object.freeze({
    status: "found",
    sourcePack: cloneAndFreeze(sourcePack)
  });
}

export function getMc001NormativeEntryByCode(entryCode, options = {}) {
  void options;
  if (!ENTRY_CODES.has(entryCode)) {
    return resultWithBlocker("blocked_unknown_entry_code");
  }
  if (!registryIsValid(mc001NormativeRegistryV1)) {
    return resultWithBlocker("blocked_invalid_registry");
  }
  const entry = allEntriesFromRegistry(mc001NormativeRegistryV1).find((candidate) => (
    candidate.entryCode === entryCode
  ));
  if (!entry) {
    return resultWithBlocker("blocked_unknown_entry_code");
  }
  return Object.freeze({
    status: "found",
    entry: cloneAndFreeze(entry)
  });
}

export function getMc001NormativeFormulaByCode(formulaCode, options = {}) {
  void options;
  if (!FORMULA_CODES.has(formulaCode)) {
    return resultWithBlocker("blocked_unknown_formula_code");
  }
  if (!registryIsValid(mc001NormativeRegistryV1)) {
    return resultWithBlocker("blocked_invalid_registry");
  }
  const formula = allFormulasFromRegistry(mc001NormativeRegistryV1).find((candidate) => (
    candidate.formulaCode === formulaCode
  ));
  if (!formula) {
    return resultWithBlocker("blocked_unknown_formula_code");
  }
  return Object.freeze({
    status: "found",
    formula: cloneAndFreeze(formula)
  });
}

export function getMc001NormativeDefaultValueCandidateByCode(
  candidateCode,
  options = {}
) {
  void options;
  if (candidateCode !== BZTU_DEFAULT_CANDIDATE_CODE) {
    return resultWithBlocker("blocked_unknown_default_value_candidate_code");
  }
  if (!registryIsValid(mc001NormativeRegistryV1)) {
    return resultWithBlocker("blocked_invalid_registry");
  }
  const sourcePack = findSourcePackByCode(
    mc001NormativeRegistryV1,
    R0_BZTU_SOURCE_PACK_CODE
  );
  if (!sourcePack || !sourcePackIsValid(sourcePack)) {
    return resultWithBlocker("blocked_invalid_source_pack");
  }
  const candidate = sourcePack.defaultValueCandidates[0];
  if (!validateDefaultValueCandidates(sourcePack.defaultValueCandidates)) {
    return resultWithBlocker("blocked_invalid_default_value_candidate");
  }
  return Object.freeze({
    status: "found",
    defaultValueCandidate: cloneAndFreeze(candidate)
  });
}

void ALLOWED_STATUSES;
void ALLOWED_SEVERITIES;
