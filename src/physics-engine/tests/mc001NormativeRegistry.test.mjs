import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getMc001NormativeDefaultValueCandidateByCode,
  getMc001NormativeEntryByCode,
  getMc001NormativeFormulaByCode,
  getMc001NormativeRegistry,
  getMc001NormativeSourcePackByCode,
  mc001NormativeRegistryV1,
  validateMc001NormativeRegistry
} from "../mc001NormativeRegistry.mjs";

const R0_BZTU_SOURCE_PACK_CODE = "MC001_R0_BZTU_FORMULA_SOURCE_PACK";
const R2_HTR_SPINE_SOURCE_PACK_CODE =
  "MC001_R2_HTR_TRANSMISSION_SPINE_SOURCE_PACK";
const R2_MONTHLY_SOURCE_PACK_CODE = "MC001_R2_MONTHLY_TRANSMISSION_SOURCE_PACK";
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
const R21_SOLAR_GAINS_EXPLICIT_FORMULA_SOURCE_PACK_CODE =
  "MC001_R21_SOLAR_GAINS_EXPLICIT_FORMULA_SOURCE_PACK";
const R22_LATENT_DEMAND_SOURCE_PACK_CODE =
  "MC001_R22_LATENT_HUMIDIFICATION_DEHUMIDIFICATION_SOURCE_PACK";
const DEFAULT_CANDIDATE_CODE =
  "bztu_default_values_with_internal_or_solar_gains";
const R0_FORMULA_CODES = [
  "MC001_2_21_ZTU_MONTHLY_TEMPERATURE",
  "MC001_2_22_BZTU_CORRECTION_FACTOR",
  "MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER",
  "MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER"
];
const R2_FORMULA_CODES = [
  "MC001_2_12_HD_DIRECT_TRANSMISSION",
  "MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI",
  "MC001_2_14_TRANSMISSION_HEAT_FLOW",
  "MC001_2_15_HTR_TOTAL_TRANSMISSION",
  "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
  "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT"
];
const EXPECTED_COUNTS = {
  sourcePacks: 23,
  formulas: 10,
  constants: 1,
  concepts: 16,
  zoneTypes: 2,
  figures: 4,
  distributionRules: 2,
  applicabilityRules: 5,
  defaultValueCandidates: 1
};
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

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function registry() {
  return getMc001NormativeRegistry();
}

function mutableRegistry() {
  return clone(mc001NormativeRegistryV1);
}

function sourcePackByCode(sourcePackCode, value = registry()) {
  return value.sourcePacks.find((pack) => pack.sourcePackCode === sourcePackCode);
}

function r0Pack(value = registry()) {
  return sourcePackByCode(R0_BZTU_SOURCE_PACK_CODE, value);
}

function htrSpinePack(value = registry()) {
  return sourcePackByCode(R2_HTR_SPINE_SOURCE_PACK_CODE, value);
}

function monthlyPack(value = registry()) {
  return sourcePackByCode(R2_MONTHLY_SOURCE_PACK_CODE, value);
}

function qhndMonthlyPack(value = registry()) {
  return sourcePackByCode(R3_QHND_MONTHLY_SOURCE_PACK_CODE, value);
}

function figure218HeatingPack(value = registry()) {
  return sourcePackByCode(R4_FIGURE_2_18_HEATING_BRANCH_SOURCE_PACK_CODE, value);
}

function utilizationHeatingPack(value = registry()) {
  return sourcePackByCode(R5_UTILIZATION_FACTORS_HEATING_SOURCE_PACK_CODE, value);
}

function gainsCapacityPack(value = registry()) {
  return sourcePackByCode(R6_GAINS_CAPACITY_TIMECONSTANT_SOURCE_PACK_CODE, value);
}

function qhndAmbiguityPack(value = registry()) {
  return sourcePackByCode(R7_QHND_AMBIGUITY_RESOLUTION_SOURCE_PACK_CODE, value);
}

function heatingEtaPack(value = registry()) {
  return sourcePackByCode(
    R8_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_SOURCE_PACK_CODE,
    value
  );
}

function longUnoccupiedPack(value = registry()) {
  return sourcePackByCode(
    R9_LONG_UNOCCUPIED_INTERPOLATION_SOURCE_PACK_CODE,
    value
  );
}

function heatingQhndClosurePack(value = registry()) {
  return sourcePackByCode(
    R10_HEATING_QHND_VERTICAL_CLOSURE_SOURCE_PACK_CODE,
    value
  );
}

function heatingIntermittencyPack(value = registry()) {
  return sourcePackByCode(R11_HEATING_INTERMITTENCY_SOURCE_PACK_CODE, value);
}

function coolingQcndPack(value = registry()) {
  return sourcePackByCode(R12_COOLING_QCND_FORMULA_SOURCE_PACK_CODE, value);
}

function coolingUtilizationPack(value = registry()) {
  return sourcePackByCode(R13_COOLING_UTILIZATION_FACTOR_SOURCE_PACK_CODE, value);
}

function coolingIntermittencyPack(value = registry()) {
  return sourcePackByCode(R14_COOLING_INTERMITTENCY_SOURCE_PACK_CODE, value);
}

function envelopeMaterialsPack(value = registry()) {
  return sourcePackByCode(R15_ENVELOPE_MATERIALS_RESISTANCE_SOURCE_PACK_CODE, value);
}

function envelopeUValuePack(value = registry()) {
  return sourcePackByCode(R16_ENVELOPE_THERMAL_TRANSMITTANCE_SOURCE_PACK_CODE, value);
}

function envelopeTransmissionPack(value = registry()) {
  return sourcePackByCode(R17_ENVELOPE_TRANSMISSION_COEFFICIENTS_SOURCE_PACK_CODE, value);
}

function envelopeBoundaryPack(value = registry()) {
  return sourcePackByCode(R18_ENVELOPE_BOUNDARY_CORRECTIONS_SOURCE_PACK_CODE, value);
}

function chapter2CoveragePack(value = registry()) {
  return sourcePackByCode(
    R19_CHAPTER_2_COMPLETE_USEFUL_DEMAND_COVERAGE_SOURCE_PACK_CODE,
    value
  );
}

function chapter2ExhaustiveCoveragePack(value = registry()) {
  return sourcePackByCode(
    R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE,
    value
  );
}

function solarGainsExplicitPack(value = registry()) {
  return sourcePackByCode(R21_SOLAR_GAINS_EXPLICIT_FORMULA_SOURCE_PACK_CODE, value);
}

function latentDemandPack(value = registry()) {
  return sourcePackByCode(R22_LATENT_DEMAND_SOURCE_PACK_CODE, value);
}

function formulas(value = registry()) {
  return value.sourcePacks.flatMap((pack) => pack.formulas ?? []);
}

function formulaByRelation(relationCode, value = registry()) {
  return formulas(value).find((formula) => formula.relationCode === relationCode);
}

function formulaByCode(formulaCode, value = registry()) {
  return formulas(value).find((formula) => formula.formulaCode === formulaCode);
}

function figureByCode(figureCode, value = registry()) {
  return value.sourcePacks
    .flatMap((pack) => pack.figures ?? [])
    .find((figure) => figure.figureCode === figureCode);
}

function ruleByCode(ruleCode, value = registry()) {
  return value.sourcePacks
    .flatMap((pack) => pack.applicabilityRules ?? [])
    .find((rule) => rule.ruleCode === ruleCode);
}

function entryCodes(value = registry()) {
  const codes = [];
  for (const pack of value.sourcePacks) {
    if (pack.concept) {
      codes.push(pack.concept.entryCode);
    }
    for (const zoneType of pack.zoneTypes ?? []) {
      codes.push(zoneType.entryCode);
    }
    for (const formula of pack.formulas ?? []) {
      codes.push(formula.entryCode);
      for (const constant of formula.constants ?? []) {
        codes.push(constant.entryCode);
      }
    }
    for (const figure of pack.figures ?? []) {
      codes.push(figure.entryCode);
      for (const rule of figure.rules ?? []) {
        codes.push(rule.entryCode);
      }
    }
    for (const rule of pack.applicabilityRules ?? []) {
      codes.push(rule.entryCode);
    }
    for (const candidate of pack.defaultValueCandidates ?? []) {
      codes.push(candidate.entryCode);
    }
  }
  return codes;
}

function runtimeSource() {
  return readFileSync(
    new URL("../mc001NormativeRegistry.mjs", import.meta.url),
    "utf8"
  );
}

function collectKeys(value, keys = []) {
  if (value === null || typeof value !== "object") {
    return keys;
  }
  if (Array.isArray(value)) {
    for (const child of value) {
      collectKeys(child, keys);
    }
    return keys;
  }
  for (const [key, child] of Object.entries(value)) {
    keys.push(key);
    collectKeys(child, keys);
  }
  return keys;
}

function collectRecommendedValues(value, values = []) {
  if (value === null || typeof value !== "object") {
    return values;
  }
  if (Array.isArray(value)) {
    for (const child of value) {
      collectRecommendedValues(child, values);
    }
    return values;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "recommendedValue") {
      values.push(child);
    }
    collectRecommendedValues(child, values);
  }
  return values;
}

function serializedOutputs() {
  return JSON.stringify([
    registry(),
    getMc001NormativeSourcePackByCode(R0_BZTU_SOURCE_PACK_CODE),
    getMc001NormativeSourcePackByCode(R2_HTR_SPINE_SOURCE_PACK_CODE),
    getMc001NormativeSourcePackByCode(R2_MONTHLY_SOURCE_PACK_CODE),
    getMc001NormativeSourcePackByCode(R3_QHND_MONTHLY_SOURCE_PACK_CODE),
    getMc001NormativeEntryByCode("MC001_CONCEPT_HTR_TRANSMISSION_COEFFICIENT"),
    getMc001NormativeEntryByCode("MC001_CONCEPT_QHND_MONTHLY_USEFUL_ENERGY_DEMAND"),
    getMc001NormativeFormulaByCode("MC001_2_15_HTR_TOTAL_TRANSMISSION"),
    getMc001NormativeDefaultValueCandidateByCode(DEFAULT_CANDIDATE_CODE)
  ]);
}

function privateForbiddenTerms() {
  return [
    "S" + "\u0103" + "licea",
    "owner-" + "snapshot",
    "private-" + "note",
    "person-" + "name",
    "record-" + "JohnDoe",
    "record-" + "001",
    "John " + "Doe",
    "Strada " + "Exemplu 12",
    "person" + "@example.com",
    "+407" + "22111222",
    "source" + "Context",
    "source" + "Trace",
    "source" + "Refs",
    "source" + "RecordId"
  ];
}

function assertBlocked(result) {
  assert.equal(result.status, "blocked");
  assert.ok(Array.isArray(result.blockers));
  assert.ok(result.blockers.length > 0);
  for (const blocker of result.blockers) {
    assert.ok(ALLOWED_BLOCKER_CODES.has(blocker.code), blocker.code);
    assert.equal(blocker.severity, "blocking");
  }
}

function assertUnknownNotEchoed(result, unknownCode) {
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(unknownCode), false);
}

function assertNoNumericDefaultValues(candidate) {
  for (const key of [
    "value",
    "values",
    "defaultValue",
    "defaultValues",
    "numericValue",
    "amount"
  ]) {
    assert.equal(Object.hasOwn(candidate, key), false, key);
  }
  assert.equal(candidate.numericDefaultsAvailable, false);
}

test("registry exports expected schema marker and methodology metadata", () => {
  assert.equal(mc001NormativeRegistryV1.schemaVersion, "mc001-normative-registry-v1");
  assert.equal(mc001NormativeRegistryV1.isMc001NormativeRegistry, true);
  assert.equal(
    mc001NormativeRegistryV1.registryStatus,
    "pilot_registry_with_verified_bztu_source_pack"
  );
  assert.equal(mc001NormativeRegistryV1.methodology.methodologyCode, "MC001");
  assert.equal(mc001NormativeRegistryV1.methodology.methodologyVersion, "2022");
  assert.equal(
    mc001NormativeRegistryV1.methodology.technicalRegulationCode,
    "Mc 001-2022"
  );
});

test("registry identifies MC001 2022 and Monitorul Oficial source document", () => {
  const doc = registry().officialDocument;

  assert.equal(doc.title.includes("Mc 001-2022"), true);
  assert.equal(
    doc.publication,
    "Monitorul Oficial al României, Partea I, nr. 46 bis/17.I.2023"
  );
  assert.equal(doc.order, "Ordinul nr. 16/2023");
  assert.equal(doc.sourceType, "official_normative_document");
});

test("registry now contains the expected source packs", () => {
  const packs = registry().sourcePacks;

  assert.equal(packs.length, EXPECTED_COUNTS.sourcePacks);
  assert.deepEqual(
    packs.map((pack) => pack.sourcePackCode).sort(),
    [
      R0_BZTU_SOURCE_PACK_CODE,
      R2_HTR_SPINE_SOURCE_PACK_CODE,
      R2_MONTHLY_SOURCE_PACK_CODE,
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
      R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE,
      R21_SOLAR_GAINS_EXPLICIT_FORMULA_SOURCE_PACK_CODE,
      R22_LATENT_DEMAND_SOURCE_PACK_CODE
    ].sort()
  );
});

test("existing R0 bztu source pack still has the pilot scope", () => {
  const scope = r0Pack().sourceScope;

  assert.equal(scope.chapter, "Capitolul 2. Anvelopa termică a clădirii");
  assert.equal(scope.section, "2.6.2. Zonarea termică");
  assert.equal(scope.subsection, "2.6.2.2. Factori de corecție și de distribuție");
  assert.deepEqual(scope.pagesVerified, [94, 95, 96, 109]);
});

test("existing R0 bztu source pack tests still pass", () => {
  const pack = r0Pack();
  const concept = pack.concept;
  const relations = pack.formulas.map((entry) => entry.relationCode).sort();

  assert.equal(pack.sourcePackCode, R0_BZTU_SOURCE_PACK_CODE);
  assert.equal(pack.verificationStatus, "human_verified_from_official_pdf");
  assert.equal(pack.implementationStatus, "registry_ready_not_calculator_ready");
  assert.equal(concept.entryCode, "MC001_CONCEPT_BZTU_CORRECTION_FACTOR");
  assert.equal(concept.registryKind, "formula_backed_registry");
  assert.equal(concept.targetSymbol, "b_ztu,m");
  assert.equal(concept.unit, "dimensionless");
  assert.deepEqual(relations, ["2.21", "2.22", "2.23", "2.24"]);
});

test("existing R0 bztu formulas and constant remain unchanged", () => {
  assert.equal(
    formulaByRelation("2.22").equationText,
    "b_ztu,m = H_ztu,e,m / H_ztu,tot,m"
  );
  assert.equal(formulaByRelation("2.24").constants[0].recommendedValue, 0.5);
  assert.deepEqual(collectRecommendedValues(registry()), [0.5]);
});

test("R2 Htr spine source pack exists", () => {
  const pack = htrSpinePack();

  assert.equal(pack.sourcePackCode, R2_HTR_SPINE_SOURCE_PACK_CODE);
  assert.equal(pack.sourceScope.section, "2.4. Rezistențe termice");
  assert.deepEqual(pack.sourceScope.pagesVerified, [81, 82]);
  assert.deepEqual(pack.sourceScope.relationsVerified, [
    "2.12",
    "2.13",
    "2.14",
    "2.15"
  ]);
});

test("R2 monthly transmission source pack exists", () => {
  const pack = monthlyPack();

  assert.equal(pack.sourcePackCode, R2_MONTHLY_SOURCE_PACK_CODE);
  assert.equal(pack.sourceScope.section, "2.7.1. Transferul termic total");
  assert.equal(pack.sourceScope.subsection, "2.7.1.1. Transferul termic prin transmisie");
  assert.deepEqual(pack.sourceScope.pagesVerified, [99, 100]);
  assert.deepEqual(pack.sourceScope.figuresVerified, ["2.10", "2.11", "2.12"]);
  assert.deepEqual(pack.sourceScope.relationsVerified, ["2.27", "2.28"]);
});

test("all R2 source packs have verified visual-review status", () => {
  for (const pack of [htrSpinePack(), monthlyPack()]) {
    assert.equal(
      pack.verificationStatus,
      "human_verified_from_official_pdf_visual_review"
    );
  }
});

test("all R2 source packs are registry ready but not calculator ready", () => {
  for (const pack of [htrSpinePack(), monthlyPack()]) {
    assert.equal(pack.implementationStatus, "registry_ready_not_calculator_ready");
  }
});

test("R3 monthly useful energy source pack exists as metadata only", () => {
  const pack = qhndMonthlyPack();

  assert.equal(pack.sourcePackCode, R3_QHND_MONTHLY_SOURCE_PACK_CODE);
  assert.equal(pack.sourcePackType, "metadata_only_normative_readiness_source_pack");
  assert.equal(pack.verificationStatus, "human_verified_from_official_pdf_visual_review");
  assert.equal(pack.implementationStatus, "registry_ready_not_calculator_ready");
  assert.equal(pack.metadataOnly, true);
  assert.equal(pack.runtimeCalculatorStatus, "not_implemented");
  assert.equal(Object.hasOwn(pack, "formulas"), false);
  assert.equal(Object.hasOwn(pack, "defaultValueCandidates"), false);
});

test("R3 source pack contains verified source references", () => {
  const pack = qhndMonthlyPack();

  assert.deepEqual(pack.sourceScope.sectionsVerified, [
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
  ]);
  assert.ok(pack.sourceScope.pagesVerified.includes(121));
  assert.ok(pack.sourceScope.figuresVerified.includes("2.18"));
  assert.ok(pack.sourceScope.figuresVerified.includes("2.19"));
  assert.ok(pack.sourceScope.relationsVerified.includes("2.84"));
  assert.ok(pack.sourceScope.relationsVerified.includes("2.85"));
  assert.equal(pack.sourceMap.length, 7);
});

test("R3 source pack includes QH and QC dependency groups", () => {
  const groups = qhndMonthlyPack().dependencyGroups;

  assert.ok(groups.heatTransferTotal.requiredSymbols.includes("QH;ht;ztc;m"));
  assert.ok(groups.heatTransferTotal.requiredSymbols.includes("QC;ht;ztc;m"));
  assert.ok(groups.heatGains.requiredSymbols.includes("QH;gn;ztc;m"));
  assert.ok(groups.heatGains.requiredSymbols.includes("QC;gn;ztc;m"));
  assert.ok(groups.utilizationFactors.requiredSymbols.includes("etaH;gn;ztc;m"));
  assert.ok(groups.utilizationFactors.requiredSymbols.includes("etaC;ht;ztc;m"));
  assert.ok(groups.monthlyUsefulDemand.requiredOutputs.includes("QH;nd;ztc;m"));
  assert.ok(groups.monthlyUsefulDemand.requiredOutputs.includes("QC;nd;ztc;m"));
});

test("R3 declares C5 explicit transfer only and not monthly useful demand", () => {
  const pack = qhndMonthlyPack();
  const c5 = pack.currentImplementedChain.find((entry) => entry.milestoneCode === "C5");

  assert.equal(c5.scope, "explicit transmission plus ventilation heat transfer");
  assert.equal(c5.status, "implemented_explicit_input_only");
  assert.equal(c5.limitation, "not_QH;nd");
  assert.equal(
    pack.dependencyGroups.heatTransferTotal.limitation,
    "C5 is explicit heat transfer only and is not QH;nd or QC;nd"
  );
});

test("R3 declares blockers for certificate final primary and CO2 readiness", () => {
  const blockers = qhndMonthlyPack().dependencyGroups.explicitBlockers.blockers;

  for (const blockerCode of [
    "certificate_not_ready",
    "not_final_energy_ready",
    "not_primary_energy_ready",
    "not_CO2_ready",
    "not_system_losses_ready",
    "gains_not_fully_implemented",
    "utilization_factors_not_implemented",
    "intermittency_and_unoccupied_periods_not_implemented",
    "latent_humidification_dehumidification_not_implemented"
  ]) {
    assert.ok(blockers.includes(blockerCode), blockerCode);
  }
});

test("R3 has no invented defaults personal fixture or copied PDF passage", () => {
  const serialized = JSON.stringify(qhndMonthlyPack());

  assert.equal(serialized.includes("defaultValue"), false);
  assert.equal(serialized.includes("defaultValues"), false);
  assert.equal(serialized.includes("numericValue"), false);
  assert.equal(serialized.includes("S" + "\u0103" + "licea"), false);
  assert.equal(serialized.includes("demo-" + "house"), false);
  assert.equal(
    serialized.includes("Pentru calculul necesarului de energie lunar pentru"),
    false
  );
});

test("R4 figure 2.18 heating branch source pack exists as metadata only", () => {
  const pack = figure218HeatingPack();

  assert.equal(pack.sourcePackCode, R4_FIGURE_2_18_HEATING_BRANCH_SOURCE_PACK_CODE);
  assert.equal(pack.sourcePackType, "metadata_only_normative_readiness_source_pack");
  assert.equal(pack.verificationStatus, "human_verified_from_official_pdf_visual_review");
  assert.equal(pack.implementationStatus, "registry_ready_not_calculator_ready");
  assert.equal(pack.metadataOnly, true);
  assert.equal(pack.runtimeCalculatorStatus, "not_implemented");
  assert.equal(Object.hasOwn(pack, "formulas"), false);
  assert.equal(Object.hasOwn(pack, "figures"), false);
  assert.equal(Object.hasOwn(pack, "defaultValueCandidates"), false);
});

test("R4 references MC001 2022 figure 2.18 and related heating branch sources", () => {
  const pack = figure218HeatingPack();

  assert.equal(pack.sourceIdentity.methodologyCode, "MC001");
  assert.equal(pack.sourceIdentity.methodologyVersion, "2022");
  assert.equal(pack.sourceIdentity.figureReference, "figure_2.18");
  assert.equal(pack.sourceIdentity.primaryPage, 121);
  assert.deepEqual(pack.sourceScope.parentSectionsVerified, [
    "2.7",
    "2.7.6",
    "2.8",
    "2.8.4",
    "2.10"
  ]);
  assert.deepEqual(pack.sourceScope.pagesVerified, [114, 120, 121, 122, 125]);
  assert.ok(pack.sourceScope.figuresVerified.includes("2.18"));
  assert.ok(pack.sourceScope.figuresVerified.includes("2.14"));
  assert.ok(pack.sourceScope.relationsVerified.includes("2.84"));
});

test("R4 includes heating branch symbols with dependency origins", () => {
  const symbols = figure218HeatingPack().heatingBranchSymbols;

  assert.deepEqual(symbols.map((entry) => entry.symbol), [
    "gammaH;ztc;m",
    "QH;ht;ztc;m",
    "etaH;gn;ztc;m",
    "QH;gn;ztc;m",
    "QH;nd;ztc;m"
  ]);
  assert.equal(symbols[0].unit, "dimensionless");
  assert.equal(symbols[1].dependencyOrigin, "implemented_explicit_transfer_chain_C5_or_explicit_input_required");
  assert.equal(symbols[2].dependencyOrigin, "missing_future_source_pack_utilization_factor");
  assert.equal(symbols[4].dependencyOrigin, "not_implemented_output");
});

test("R4 includes figure 2.18 heating branch logic entries", () => {
  const branches = figure218HeatingPack().heatingBranchDecisionLogic;

  assert.deepEqual(branches.map((entry) => entry.branchId), [
    "heating_zero_non_positive_balance_condition",
    "heating_zero_high_balance_ratio",
    "heating_else_gain_utilization"
  ]);
  assert.equal(branches[0].conditionTranscriptionStatus, "needs_human_visual_review");
  assert.equal(branches[0].readinessStatus, "needs_human_visual_review");
  assert.equal(branches[1].conditionExpression, "gammaH;ztc;m > 2.0");
  assert.equal(branches[1].outputExpression, "QH;nd;ztc;m = 0");
  assert.equal(
    branches[2].outputExpression,
    "QH;nd;ztc;m = QH;ht;ztc;m - etaH;gn;ztc;m * QH;gn;ztc;m"
  );
});

test("R4 formula candidates have source references and readiness statuses", () => {
  const candidates = figure218HeatingPack().formulaCandidates;

  assert.equal(candidates.length, 4);
  for (const candidate of candidates) {
    assert.ok(candidate.candidateCode.startsWith("MC001_R4_"));
    assert.ok(candidate.sourceReference.includes("MC001-2022"));
    assert.ok(["verified_for_future_runtime", "needs_human_visual_review"].includes(
      candidate.readinessStatus
    ));
    assert.equal(candidate.sourceLocator.page === 121 || candidate.sourceLocator.page === 114, true);
  }
  assert.equal(
    candidates.find((candidate) => (
      candidate.branchId === "heating_zero_non_positive_balance_condition"
    )).readinessStatus,
    "needs_human_visual_review"
  );
});

test("R4 dependency matrix declares QH nd not implemented", () => {
  const matrix = figure218HeatingPack().dependencyMatrix;

  assert.equal(matrix.c5ExplicitHeatTransferTotal.status, "implemented");
  assert.equal(matrix.c5ExplicitHeatTransferTotal.limitation, "explicit transfer only not QH;nd");
  assert.equal(matrix.internalGains.status, "missing_or_explicit_input_only");
  assert.equal(matrix.solarGains.status, "missing_or_explicit_input_only");
  assert.equal(matrix.gainUtilizationFactor.status, "missing_source_needed");
  assert.equal(matrix.effectiveThermalCapacity.status, "missing_source_needed");
  assert.equal(matrix.timeConstant.status, "missing_source_needed");
  assert.equal(matrix.monthlyHeatingUsefulDemand.status, "not_implemented");
  assert.equal(matrix.annualAggregation.status, "not_implemented");
});

test("R4 declares final primary CO2 CPE and certificate blocked", () => {
  const blockers = figure218HeatingPack().blockers;

  for (const blockerCode of [
    "not_runtime_QH;nd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_CPE_certificate",
    "no_system_losses",
    "utilization_factor_not_implemented",
    "gains_not_implemented",
    "left_branch_condition_needs_human_visual_review",
    "no_hidden_defaults"
  ]) {
    assert.ok(blockers.includes(blockerCode), blockerCode);
  }
});

test("R4 declares C6C must continue extraction before heating runtime", () => {
  const readiness = figure218HeatingPack().futureRuntimeReadiness;

  assert.equal(readiness.canImplementHeatingOnlyRuntime, false);
  assert.equal(
    readiness.recommendedNextMilestone,
    "C6C_continue_source_extraction_for_figure_2.14_utilization_and_figure_2.18_ambiguity"
  );
  assert.ok(readiness.requiredBeforeRuntime.includes(
    "resolve_figure_2.18_first_branch_condition"
  ));
  assert.ok(readiness.requiredBeforeRuntime.includes(
    "transcribe_figure_2.14_heating_utilization_factor"
  ));
});

test("R4 contains no calculator functions runtime access invented defaults or fixture data", () => {
  const serialized = JSON.stringify(figure218HeatingPack());
  const lower = serialized.toLowerCase();
  const networkCall = "fetch" + "(";

  assert.equal(lower.includes("function"), false);
  assert.equal(lower.includes("readfile"), false);
  assert.equal(lower.includes(networkCall), false);
  assert.equal(lower.includes(".pdf"), false);
  assert.equal(serialized.includes("defaultValue"), false);
  assert.equal(serialized.includes("defaultValues"), false);
  assert.equal(serialized.includes("numericValue"), false);
  assert.equal(serialized.includes("S" + "\u0103" + "licea"), false);
  assert.equal(serialized.includes("demo-" + "house"), false);
  assert.equal(serialized.includes("PENTRU CALCULUL NECESARULUI"), false);
});

test("R5 utilization factors heating source pack exists as metadata only", () => {
  const pack = utilizationHeatingPack();

  assert.equal(pack.sourcePackCode, R5_UTILIZATION_FACTORS_HEATING_SOURCE_PACK_CODE);
  assert.equal(pack.sourcePackType, "metadata_only_normative_readiness_source_pack");
  assert.equal(pack.verificationStatus, "human_verified_from_official_pdf_visual_review");
  assert.equal(pack.implementationStatus, "registry_ready_not_calculator_ready");
  assert.equal(pack.metadataOnly, true);
  assert.equal(pack.runtimeCalculatorStatus, "not_implemented");
  assert.equal(Object.hasOwn(pack, "formulas"), false);
  assert.equal(Object.hasOwn(pack, "figures"), false);
  assert.equal(Object.hasOwn(pack, "defaultValueCandidates"), false);
});

test("R5 references MC001 2022 figure 2.14 and figure 2.18", () => {
  const pack = utilizationHeatingPack();

  assert.equal(pack.sourceIdentity.methodologyCode, "MC001");
  assert.equal(pack.sourceIdentity.methodologyVersion, "2022");
  assert.equal(pack.sourceIdentity.primaryFigureReference, "figure_2.14");
  assert.equal(pack.sourceIdentity.linkedHeatingDemandFigureReference, "figure_2.18");
  assert.deepEqual(pack.sourceScope.pagesVerified, [112, 113, 116, 120]);
  assert.deepEqual(pack.sourceScope.figuresVerified, ["2.14", "2.18"]);
  assert.deepEqual(pack.sourceScope.relationsVerified, ["2.55", "2.57"]);
  assert.deepEqual(pack.sourceScope.tablesVerified, ["2.19", "2.20"]);
});

test("R5 includes heating utilization symbols", () => {
  const symbols = utilizationHeatingPack().heatingUtilizationSymbols;

  assert.deepEqual(symbols.map((entry) => entry.symbol), [
    "QH;ht;ztc;m",
    "QH;gn;ztc;m",
    "gammaH;ztc;m",
    "etaH;gn;ztc;m",
    "tauH;ztc;m",
    "Cm;eff;ztc",
    "aH;ztc;m",
    "QH;nd;ztc;m"
  ]);
  assert.equal(symbols.find((entry) => entry.symbol === "tauH;ztc;m").unit, "h");
  assert.equal(symbols.find((entry) => entry.symbol === "Cm;eff;ztc").unit, "J/K");
  assert.equal(
    symbols.find((entry) => entry.symbol === "QH;nd;ztc;m").dependencyOrigin,
    "ambiguous_needs_human_review"
  );
});

test("R5 includes utilization branch and condition entries", () => {
  const branches = utilizationHeatingPack().utilizationBranchConditions;

  assert.deepEqual(branches.map((entry) => entry.branchId), [
    "heating_utilization_positive_gamma_not_one",
    "heating_utilization_gamma_equals_one",
    "heating_utilization_non_positive_gamma_positive_gains",
    "heating_utilization_negative_gamma_non_positive_gains"
  ]);
  assert.equal(branches[0].conditionExpression, "gammaH;ztc;m > 0 and gammaH;ztc;m != 1");
  assert.equal(branches[0].readinessStatus, "verified_for_future_runtime");
  assert.equal(branches[1].outputExpression, "etaH;gn;ztc;m = aH;ztc;m / (aH;ztc;m + 1)");
  assert.equal(branches[2].readinessStatus, "needs_human_visual_review");
  assert.equal(branches[3].outputExpression, "etaH;gn;ztc;m = 1");
});

test("R5 formula candidates have source references and readiness statuses", () => {
  const candidates = utilizationHeatingPack().formulaCandidates;
  const statuses = candidates.map((candidate) => candidate.readinessStatus);

  assert.equal(candidates.length, 9);
  assert.ok(statuses.includes("verified_for_future_runtime"));
  assert.ok(statuses.includes("needs_human_visual_review"));
  assert.ok(statuses.includes("referenced_but_not_transcribed"));
  assert.ok(statuses.includes("blocked_due_to_ambiguous_figure"));
  for (const candidate of candidates) {
    assert.ok(candidate.candidateCode.startsWith("MC001_R5_"));
    assert.ok(candidate.sourceReference.includes("MC001-2022"));
    assert.ok(candidate.sourceLocator.page === 112 ||
      candidate.sourceLocator.page === 113 ||
      candidate.sourceLocator.page === 116 ||
      candidate.sourceLocator.page === 120);
  }
});

test("R5 includes figure 2.18 ambiguity review result", () => {
  const review = utilizationHeatingPack().figure218AmbiguityReview;

  assert.equal(
    review.observedConditionText,
    "gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0 != 1"
  );
  assert.equal(review.reviewStatus, "unresolved");
  assert.equal(review.resolutionDecision, "do_not_infer_intended_meaning");
  assert.equal(review.runtimeImpact, "blocks_heating_QH;nd_runtime_branch_implementation");
  assert.equal(review.sourceLocator.figure, "2.18");
});

test("R5 dependency matrix declares QHnd runtime not implemented", () => {
  const matrix = utilizationHeatingPack().dependencyMatrix;

  assert.equal(matrix.c5ExplicitTransferTotal.status, "implemented");
  assert.equal(matrix.gammaH.status, "verified_for_future_runtime");
  assert.equal(matrix.etaHGn.status, "partially_verified_needs_zero_edge_review");
  assert.equal(matrix.figure218BranchLogic.status, "blocked_due_to_ambiguous_first_branch");
  assert.equal(matrix.qhndRuntime.status, "not_implemented");
  assert.equal(matrix.annualQhndAggregation.status, "not_implemented");
  assert.equal(matrix.final_energy.status, "blocked");
  assert.equal(matrix.primary_energy.status, "blocked");
  assert.equal(matrix.co2.status, "blocked");
  assert.equal(matrix.cpeCertificate.status, "blocked");
});

test("R5 declares heating QHnd runtime cannot be implemented yet", () => {
  const readiness = utilizationHeatingPack().heatingQhndReadiness;

  assert.equal(readiness.canImplementHeatingOnlyRuntime, false);
  assert.equal(readiness.gammaHFormula, "verified_for_future_runtime");
  assert.equal(readiness.etaHGnFormula, "partially_verified_with_zero_edge_review_needed");
  assert.equal(readiness.figure218BranchConditions, "blocked_due_to_ambiguous_first_branch");
  assert.equal(readiness.qhndFormula, "not_implemented");
  assert.equal(
    readiness.nextRecommendation,
    "C6D_continue_source_extraction_for_figure_2.18_ambiguity_effective_capacity_and_gains"
  );
});

test("R5 declares final primary CO2 CPE and certificate blocked", () => {
  const blockers = utilizationHeatingPack().blockers;

  for (const blockerCode of [
    "not_runtime_QH;nd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_CPE_certificate",
    "no_system_losses",
    "gains_not_implemented",
    "no_normative_default_gains",
    "no_normative_default_capacity",
    "no_default_schedules",
    "figure_2.18_first_branch_unresolved"
  ]) {
    assert.ok(blockers.includes(blockerCode), blockerCode);
  }
});

test("R5 contains no calculator functions runtime access invented defaults or fixture data", () => {
  const serialized = JSON.stringify(utilizationHeatingPack());
  const lower = serialized.toLowerCase();
  const networkCall = "fetch" + "(";

  assert.equal(lower.includes("function"), false);
  assert.equal(lower.includes("readfile"), false);
  assert.equal(lower.includes(networkCall), false);
  assert.equal(lower.includes(".pdf"), false);
  assert.equal(serialized.includes("defaultValue"), false);
  assert.equal(serialized.includes("defaultValues"), false);
  assert.equal(serialized.includes("numericValue"), false);
  assert.equal(serialized.includes("S" + "\u0103" + "licea"), false);
  assert.equal(serialized.includes("demo-" + "house"), false);
});

test("R6 gains capacity time constant source pack exists as metadata only", () => {
  const pack = gainsCapacityPack();

  assert.equal(pack.sourcePackCode, R6_GAINS_CAPACITY_TIMECONSTANT_SOURCE_PACK_CODE);
  assert.equal(pack.sourcePackType, "metadata_only_normative_readiness_source_pack");
  assert.equal(pack.verificationStatus, "human_verified_from_official_pdf_visual_review");
  assert.equal(pack.implementationStatus, "registry_ready_not_calculator_ready");
  assert.equal(pack.metadataOnly, true);
  assert.equal(pack.runtimeCalculatorStatus, "not_implemented");
  assert.equal(Object.hasOwn(pack, "formulas"), false);
  assert.equal(Object.hasOwn(pack, "figures"), false);
  assert.equal(Object.hasOwn(pack, "defaultValueCandidates"), false);
});

test("R6 references MC001 2022 gains capacity tables and relation 2.57", () => {
  const pack = gainsCapacityPack();

  assert.equal(pack.sourceIdentity.methodologyCode, "MC001");
  assert.equal(pack.sourceIdentity.methodologyVersion, "2022");
  assert.equal(pack.sourceIdentity.heatGainsSectionReference, "section_2.7.2");
  assert.equal(pack.sourceIdentity.solarGainsSectionReference, "section_2.7.3");
  assert.equal(pack.sourceIdentity.effectiveCapacitySectionReference, "section_2.7.5");
  assert.equal(pack.sourceIdentity.timeConstantReference, "relation_2.57");
  assert.ok(pack.sourceScope.parentSectionsVerified.includes("2.7.2"));
  assert.ok(pack.sourceScope.parentSectionsVerified.includes("2.7.3"));
  assert.ok(pack.sourceScope.parentSectionsVerified.includes("2.7.5"));
  assert.deepEqual(pack.sourceScope.tablesVerified, ["2.19", "2.20"]);
  assert.ok(pack.sourceScope.relationsVerified.includes("2.57"));
});

test("R6 includes internal gains dependency map", () => {
  const pack = gainsCapacityPack();
  const internalSymbols = pack.internalGainsDependencyMap.map((entry) => entry.symbol);

  assert.ok(pack.heatGainsDependencyMap.some((entry) => entry.symbol === "QH;gn;ztc;m"));
  assert.ok(internalSymbols.includes("QH/C;int;dir;ztc;m"));
  assert.ok(internalSymbols.includes("QH/C;spec;int;oc/A/L/WA/HVAC/proc;zt;m"));
  assert.equal(
    pack.internalGainsDependencyMap.find((entry) => entry.symbol === "bztu,k;m").readinessStatus,
    "source_dependency_only"
  );
  assert.equal(
    pack.internalGainsDependencyMap.find((entry) => entry.symbol === "Ause;zt").dependencyOrigin,
    "explicit_input_required"
  );
});

test("R6 includes solar gains dependency map", () => {
  const symbols = gainsCapacityPack().solarGainsDependencyMap.map((entry) => entry.symbol);

  assert.ok(symbols.includes("QH/C;sol;dir;ztc;m"));
  assert.ok(symbols.includes("QH/C;sol;wi;k;m"));
  assert.ok(symbols.includes("QH/C;sol;op;k;m"));
  assert.ok(symbols.includes("Hsol;wi;m / Hsol;k;m"));
  assert.ok(symbols.includes("alphaSr;k + Rse;k + Uc;op;k + Ac;k"));
});

test("R6 includes effective capacity and time constant dependency map", () => {
  const map = gainsCapacityPack().capacityTimeConstantDependencyMap;

  assert.equal(map.find((entry) => entry.symbol === "Cm;eff;ztc").unit, "J/K");
  assert.equal(
    map.find((entry) => entry.symbol === "tables 2.19 and 2.20").readinessStatus,
    "referenced_but_not_transcribed"
  );
  assert.equal(map.find((entry) => entry.symbol === "tauH;ztc;m").sourceLocator.relation, "2.57");
});

test("R6 formula candidates are source referenced and do not encode defaults", () => {
  const candidates = gainsCapacityPack().formulaCandidates;
  const codes = candidates.map((candidate) => candidate.candidateCode);

  assert.equal(candidates.length, 11);
  assert.ok(codes.includes("MC001_R6_RELATION_2_35_DIRECT_INTERNAL_GAINS_COMPONENTS"));
  assert.ok(codes.includes("MC001_R6_RELATION_2_39_TRANSPARENT_SOLAR_GAINS"));
  assert.ok(codes.includes("MC001_R6_RELATION_2_57_HEATING_TIME_CONSTANT"));
  assert.ok(codes.includes("MC001_R6_TABLES_2_19_2_20_EFFECTIVE_CAPACITY_DEPENDENCY"));
  for (const candidate of candidates) {
    assert.ok(candidate.candidateCode.startsWith("MC001_R6_"));
    assert.ok(candidate.sourceReference.includes("MC001-2022"));
    assert.equal(Object.hasOwn(candidate, "formulaCode"), false);
    assert.equal(Object.hasOwn(candidate, "defaultValue"), false);
    assert.equal(Object.hasOwn(candidate, "defaultValues"), false);
  }
});

test("R6 includes figure 2.18 ambiguity review result", () => {
  const review = gainsCapacityPack().figure218AmbiguityReview;

  assert.equal(
    review.observedConditionText,
    "gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0 != 1"
  );
  assert.equal(review.reviewStatus, "unresolved");
  assert.equal(review.resolutionDecision, "do_not_infer_intended_meaning");
  assert.equal(review.runtimeImpact, "blocks_heating_QH;nd_runtime_branch_implementation");
  assert.equal(review.sourceLocator.figure, "2.18");
});

test("R6 dependency matrix and verdict keep QHnd runtime blocked", () => {
  const pack = gainsCapacityPack();

  assert.equal(pack.heatingQhndReadinessVerdict.canImplementHeatingOnlyRuntime, false);
  assert.equal(pack.dependencyMatrix.c5ExplicitTransferTotal.status, "implemented");
  assert.equal(
    pack.dependencyMatrix.internalGains.status,
    "explicit_input_only_or_missing_future_source_pack"
  );
  assert.equal(
    pack.dependencyMatrix.solarGains.status,
    "explicit_input_only_or_missing_future_source_pack"
  );
  assert.equal(pack.dependencyMatrix.figure218FirstBranch.status, "blocked_due_to_ambiguous_first_branch");
  assert.equal(pack.dependencyMatrix.qhndRuntime.status, "not_implemented");
  assert.equal(pack.dependencyMatrix.final_energy.status, "blocked");
  assert.equal(pack.dependencyMatrix.primary_energy.status, "blocked");
  assert.equal(pack.dependencyMatrix.co2.status, "blocked");
  assert.equal(pack.dependencyMatrix.cpeCertificate.status, "blocked");
});

test("R6 declares final primary CO2 CPE certificate and hidden defaults blocked", () => {
  const blockers = gainsCapacityPack().blockers;

  for (const blockerCode of [
    "not_runtime_QH;nd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_CPE_certificate",
    "no_hidden_defaults",
    "no_normative_default_gains",
    "no_normative_default_solar_data",
    "no_normative_default_capacity",
    "no_default_occupancy_or_schedules",
    "tables_2.19_2.20_not_encoded_as_values",
    "climate_solar_data_missing_future_source_pack"
  ]) {
    assert.ok(blockers.includes(blockerCode), blockerCode);
  }
});

test("R6 contains no calculator functions runtime access invented defaults or fixture data", () => {
  const serialized = JSON.stringify(gainsCapacityPack());
  const lower = serialized.toLowerCase();
  const networkCall = "fetch" + "(";

  assert.equal(lower.includes("function"), false);
  assert.equal(lower.includes("readfile"), false);
  assert.equal(lower.includes(networkCall), false);
  assert.equal(lower.includes(".pdf"), false);
  assert.equal(serialized.includes("defaultValue"), false);
  assert.equal(serialized.includes("defaultValues"), false);
  assert.equal(serialized.includes("numericValue"), false);
  assert.equal(serialized.includes("S" + "\u0103" + "licea"), false);
  assert.equal(serialized.includes("demo-" + "house"), false);
});

test("R7 QHnd ambiguity resolution source pack exists as metadata only", () => {
  const pack = qhndAmbiguityPack();

  assert.equal(pack.sourcePackCode, R7_QHND_AMBIGUITY_RESOLUTION_SOURCE_PACK_CODE);
  assert.equal(pack.sourcePackType, "metadata_only_normative_readiness_source_pack");
  assert.equal(pack.verificationStatus, "human_verified_from_official_pdf_visual_review");
  assert.equal(pack.implementationStatus, "registry_ready_not_calculator_ready");
  assert.equal(pack.metadataOnly, true);
  assert.equal(pack.runtimeCalculatorStatus, "not_implemented");
  assert.equal(Object.hasOwn(pack, "formulas"), false);
  assert.equal(Object.hasOwn(pack, "figures"), false);
  assert.equal(Object.hasOwn(pack, "defaultValueCandidates"), false);
});

test("R7 references MC001 2022 figure 2.18 figure 2.14 and utilization relations", () => {
  const pack = qhndAmbiguityPack();

  assert.equal(pack.sourceIdentity.methodologyCode, "MC001");
  assert.equal(pack.sourceIdentity.methodologyVersion, "2022");
  assert.equal(pack.sourceIdentity.primaryFigureReference, "figure_2.18");
  assert.equal(pack.sourceIdentity.crossCheckFigureReference, "figure_2.14");
  assert.equal(pack.sourceIdentity.utilizationSectionReference, "section_2.7.6");
  assert.equal(pack.sourceIdentity.utilizationParameterReference, "relation_2.55");
  assert.equal(pack.sourceIdentity.timeConstantReference, "relation_2.57");
  assert.deepEqual(pack.sourceScope.pagesVerified, [113, 116, 120]);
  assert.deepEqual(pack.sourceScope.figuresVerified, ["2.14", "2.18"]);
  assert.deepEqual(pack.sourceScope.relationsVerified, ["2.55", "2.57"]);
});

test("R7 records figure 2.18 first branch as resolved typographical artifact", () => {
  const review = qhndAmbiguityPack().figure218FirstBranchReview;

  assert.equal(review.visualTranscription, "gammaH;ztc;m <= 0 si QH;gn;ztc;m > 0 \u2260 1");
  assert.equal(review.classification, "resolved_verified_typographical_artifact");
  assert.equal(review.resolvedCondition, "gammaH <= 0 && QHgn > 0");
  assert.equal(review.output, "QHnd = 0");
  assert.equal(
    review.runtimeNote,
    "Do not execute this branch in the first restricted runtime unless separate targeted tests are added."
  );
  assert.ok(review.sourceBackedReasons.some((reason) => reason.includes("dimensionally invalid")));
});

test("R7 includes figure 2.14 edge-condition review", () => {
  const edges = qhndAmbiguityPack().figure214EdgeConditionReview;
  const byId = new Map(edges.map((edge) => [edge.edgeCaseId, edge]));

  assert.equal(edges.length, 8);
  assert.equal(byId.get("gammaH_non_positive").includedInFirstRestrictedRuntime, false);
  assert.equal(byId.get("gammaH_zero").readinessStatus, "excluded_zero_division_edge");
  assert.equal(byId.get("gammaH_near_zero").readinessStatus, "excluded_numerical_edge");
  assert.equal(byId.get("QHgn_non_positive").includedInFirstRestrictedRuntime, false);
  assert.equal(byId.get("QHht_non_positive").includedInFirstRestrictedRuntime, false);
  assert.equal(byId.get("gammaH_equals_one").includedInFirstRestrictedRuntime, true);
  assert.equal(byId.get("gammaH_greater_than_two").includedInFirstRestrictedRuntime, false);
  assert.equal(byId.get("normal_branch").readinessStatus, "allowed_for_restricted_runtime");
});

test("R7 allows future restricted explicit-input heating QHnd runtime only", () => {
  const feasibility = qhndAmbiguityPack().restrictedExplicitInputRuntimeFeasibility;

  assert.equal(feasibility.status, "allowed_for_future_runtime");
  assert.ok(feasibility.domain.includes("heating_only"));
  assert.ok(feasibility.domain.includes("0 < gammaH <= 2.0"));
  assert.ok(feasibility.inputValidationConstraints.includes("QHht_kWh finite greater than zero"));
  assert.ok(
    feasibility.allowedFormulaCandidates.some((candidate) => (
      candidate.candidateCode === "MC001_R7_QHND_NORMAL_RESTRICTED_BRANCH"
    ))
  );
  assert.ok(feasibility.exclusions.includes("not_full_QHnd"));
  assert.ok(feasibility.exclusions.includes("not_CPE_certificate"));
});

test("R7 C6F readiness verdict is restricted explicit heating only", () => {
  const pack = qhndAmbiguityPack();

  assert.equal(
    pack.runtimeReadinessVerdict,
    "C6F_CAN_IMPLEMENT_RESTRICTED_HEATING_QHND_EXPLICIT_INPUT"
  );
  assert.equal(pack.dependencyMatrix.c5ExplicitTransferTotal.status, "implemented");
  assert.equal(pack.dependencyMatrix.figure218FirstBranch.status, "resolved_verified_typographical_artifact");
  assert.equal(
    pack.dependencyMatrix.qhndRuntime.status,
    "not_implemented_future_restricted_runtime_allowed"
  );
  assert.equal(pack.dependencyMatrix.annualAggregation.status, "not_implemented");
  assert.equal(pack.dependencyMatrix.final_energy.status, "blocked");
  assert.equal(pack.dependencyMatrix.primary_energy.status, "blocked");
  assert.equal(pack.dependencyMatrix.co2.status, "blocked");
  assert.equal(pack.dependencyMatrix.cpeCertificate.status, "blocked");
});

test("R7 declares final primary CO2 CPE certificate and hidden defaults blocked", () => {
  const blockers = qhndAmbiguityPack().blockers;

  for (const blockerCode of [
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
    "no_default_occupancy_or_schedules"
  ]) {
    assert.ok(blockers.includes(blockerCode), blockerCode);
  }
});

test("R7 contains no calculator functions runtime access invented defaults or fixture data", () => {
  const serialized = JSON.stringify(qhndAmbiguityPack());
  const lower = serialized.toLowerCase();
  const networkCall = "fetch" + "(";

  assert.equal(lower.includes("function"), false);
  assert.equal(lower.includes("readfile"), false);
  assert.equal(lower.includes(networkCall), false);
  assert.equal(lower.includes(".pdf"), false);
  assert.equal(serialized.includes("defaultValue"), false);
  assert.equal(serialized.includes("defaultValues"), false);
  assert.equal(serialized.includes("numericValue"), false);
  assert.equal(serialized.includes("S" + "\u0103" + "licea"), false);
  assert.equal(serialized.includes("demo-" + "house"), false);
});

test("R8 heating etaHgn formula source pack exists as metadata only", () => {
  const pack = heatingEtaPack();

  assert.equal(pack.sourcePackCode, R8_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_SOURCE_PACK_CODE);
  assert.equal(pack.sourcePackType, "metadata_only_normative_readiness_source_pack");
  assert.equal(pack.verificationStatus, "human_verified_from_official_pdf_visual_review");
  assert.equal(pack.implementationStatus, "registry_ready_not_calculator_ready");
  assert.equal(pack.metadataOnly, true);
  assert.equal(pack.runtimeCalculatorStatus, "not_implemented");
  assert.equal(Object.hasOwn(pack, "formulas"), false);
  assert.equal(Object.hasOwn(pack, "figures"), false);
  assert.equal(Object.hasOwn(pack, "defaultValueCandidates"), false);
});

test("R8 references MC001 2022 section 2.7.6 figure 2.14 and relations", () => {
  const pack = heatingEtaPack();

  assert.equal(pack.sourceIdentity.methodologyCode, "MC001");
  assert.equal(pack.sourceIdentity.methodologyVersion, "2022");
  assert.equal(pack.sourceIdentity.utilizationSectionReference, "section_2.7.6");
  assert.equal(pack.sourceIdentity.primaryFigureReference, "figure_2.14");
  assert.equal(pack.sourceIdentity.utilizationParameterReference, "relation_2.55");
  assert.equal(pack.sourceIdentity.timeConstantReference, "relation_2.57");
  assert.deepEqual(pack.sourceScope.pagesVerified, [112, 113, 116]);
  assert.deepEqual(pack.sourceScope.figuresVerified, ["2.14"]);
  assert.deepEqual(pack.sourceScope.relationsVerified, ["2.55", "2.57"]);
  assert.ok(pack.sourceScope.adjacentSymbolDefinitionsVerified.includes("etaH;gn;ztc;m"));
  assert.ok(pack.sourceScope.adjacentSymbolDefinitionsVerified.includes("gammaH;ztc;m"));
});

test("R8 formula candidates transcribe etaHgn branches and dependencies", () => {
  const candidates = heatingEtaPack().formulaCandidates;
  const byCode = new Map(candidates.map((candidate) => [candidate.candidateCode, candidate]));

  assert.equal(candidates.length, 5);
  for (const candidate of candidates) {
    assert.ok(candidate.sourceReference.startsWith("MC001-2022 page "));
    assert.equal(candidate.readinessStatus, "verified_for_future_runtime");
    assert.equal(Object.hasOwn(candidate, "formulaCode"), false);
  }
  assert.equal(
    byCode.get("MC001_R8_ETA_H_GN_GAMMA_NOT_ONE").machineExpression,
    "etaHgn = (1 - gammaH ** aH) / (1 - gammaH ** (aH + 1))"
  );
  assert.equal(
    byCode.get("MC001_R8_ETA_H_GN_GAMMA_EQUALS_ONE").machineExpression,
    "etaHgn = aH / (aH + 1)"
  );
  assert.equal(
    byCode.get("MC001_R8_GAMMA_H_BALANCE_RATIO").machineExpression,
    "gammaH = QHgn / QHht"
  );
  assert.equal(byCode.get("MC001_R8_AH_PARAMETER_RELATION_2_55").relationReference, "2.55");
  assert.equal(byCode.get("MC001_R8_TAU_H_DEPENDENCY_RELATION_2_57").relationReference, "2.57");
});

test("R8 includes branch condition table for C7B restricted eta runtime", () => {
  const branches = heatingEtaPack().branchConditionTable;
  const byId = new Map(branches.map((branch) => [branch.branchId, branch]));

  assert.equal(branches.length, 9);
  assert.equal(byId.get("eta_gamma_equals_one").conditionExpression, "gammaH;ztc;m = 1");
  assert.equal(
    byId.get("eta_gamma_not_one_positive").conditionExpression,
    "gammaH;ztc;m > 0 and gammaH;ztc;m != 1"
  );
  assert.equal(byId.get("restricted_normal_domain").c7bRuntimeScope, "allowed");
  assert.equal(byId.get("excluded_gamma_non_positive").c7bRuntimeScope, "excluded");
  assert.equal(byId.get("excluded_gamma_above_two").c7bRuntimeScope, "excluded");
  assert.equal(byId.get("excluded_missing_a_or_tau_inputs").readinessStatus, "blocked_missing_explicit_inputs");
});

test("R8 dependency matrix and verdict allow only explicit aH gamma eta runtime", () => {
  const pack = heatingEtaPack();
  const matrix = pack.dependencyMatrix;

  assert.equal(
    pack.runtimeReadinessVerdict,
    "C7B_CAN_IMPLEMENT_RESTRICTED_ETA_HGN_RUNTIME_WITH_EXPLICIT_A_AND_GAMMA"
  );
  assert.equal(matrix.gammaH.status, "explicit_or_calculated_from_qHgn_qHht");
  assert.equal(matrix.aH.status, "explicit_input_recommended_for_C7B");
  assert.equal(matrix.aH0.status, "source_referenced_not_encoded_as_runtime_value");
  assert.equal(matrix.tauH0.status, "source_referenced_not_encoded_as_runtime_value");
  assert.equal(matrix.etaHgnRuntime.status, "not_implemented_in_C7A");
  assert.equal(matrix.c6fQhndRuntime.status, "implemented_with_explicit_eta");
  assert.equal(matrix.fullQhnd.status, "blocked");
  assert.equal(matrix.qcnd.status, "blocked");
  assert.equal(matrix.final_energy.status, "blocked");
  assert.equal(matrix.primary_energy.status, "blocked");
  assert.equal(matrix.co2.status, "blocked");
  assert.equal(matrix.cpeCertificate.status, "blocked");
});

test("R8 declares downstream claims hidden defaults and runtime behavior blocked", () => {
  const pack = heatingEtaPack();
  const blockers = pack.blockers;

  for (const blockerCode of [
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
    "C7B_must_require_explicit_aH_or_explicit_tau_path_inputs"
  ]) {
    assert.ok(blockers.includes(blockerCode), blockerCode);
  }
});

test("R8 contains no calculator functions runtime access invented defaults or fixture data", () => {
  const serialized = JSON.stringify(heatingEtaPack());
  const lower = serialized.toLowerCase();
  const networkCall = "fetch" + "(";

  assert.equal(lower.includes("function"), false);
  assert.equal(lower.includes("readfile"), false);
  assert.equal(lower.includes(networkCall), false);
  assert.equal(lower.includes(".pdf"), false);
  assert.equal(serialized.includes("defaultValue"), false);
  assert.equal(serialized.includes("defaultValues"), false);
  assert.equal(serialized.includes("numericValue"), false);
  assert.equal(serialized.includes("S" + "\u0103" + "licea"), false);
  assert.equal(serialized.includes("demo-" + "house"), false);
});

test("R9 long unoccupied interpolation source pack machine-encodes relations 2.76 and 2.77", () => {
  const pack = longUnoccupiedPack();

  assert.equal(pack.sourcePackCode, R9_LONG_UNOCCUPIED_INTERPOLATION_SOURCE_PACK_CODE);
  assert.equal(pack.sourcePackType, "metadata_only_normative_readiness_source_pack");
  assert.equal(pack.metadataOnly, false);
  assert.equal(pack.machineReadable, true);
  assert.equal(pack.runtimeCalculatorStatus, "implemented_restricted_heating_relation_2_76_only");
  assert.deepEqual(pack.sourceScope.pagesVerified, [120, 121]);
  assert.deepEqual(pack.sourceScope.relationsVerified, ["2.76", "2.77"]);
  assert.equal(pack.sourceIdentity.heatingRelationReference, "relation_2.76");
  assert.equal(pack.sourceIdentity.coolingRelationReference, "relation_2.77");
});

test("R9 formula candidates expose heating runtime and cooling metadata expressions", () => {
  const candidates = longUnoccupiedPack().formulaCandidates;
  const byCode = new Map(candidates.map((candidate) => [candidate.candidateCode, candidate]));
  const heating = byCode.get("MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION");
  const cooling = byCode.get("MC001_2_77_LONG_UNOCCUPIED_COOLING_INTERPOLATION");

  assert.equal(candidates.length, 2);
  assert.equal(heating.relationReference, "2.76");
  assert.equal(
    heating.machineExpression,
    "QHnd = (1 - fHnocc) * QHndOcc + fHnocc * QHndNocc"
  );
  assert.equal(heating.readinessStatus, "verified_for_restricted_heating_runtime");
  assert.deepEqual(heating.requiredInputs, [
    "QH;nd;occ;ztc;m",
    "QH;nd;nocc;ztc;m",
    "fH;nocc;ztc;m"
  ]);
  assert.equal(cooling.relationReference, "2.77");
  assert.equal(
    cooling.machineExpression,
    "QCnd = (1 - fCnocc) * QCndOcc + fCnocc * QCndNocc"
  );
  assert.equal(cooling.readinessStatus, "machine_encoded_metadata_only_not_runtime_cooling");
});

test("R9 runtime integration is restricted to explicit heating interpolation", () => {
  const pack = longUnoccupiedPack();

  assert.deepEqual(pack.runtimeIntegration.implementedFormulaCodes, [
    "MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION"
  ]);
  assert.deepEqual(pack.runtimeIntegration.metadataOnlyFormulaCodes, [
    "MC001_2_77_LONG_UNOCCUPIED_COOLING_INTERPOLATION"
  ]);
  assert.deepEqual(pack.runtimeIntegration.inputContract.explicitInputs, [
    "qHndOccupied",
    "qHndUnoccupied",
    "unoccupiedFraction"
  ]);
  assert.equal(
    pack.runtimeIntegration.inputContract.outputOrigin,
    "calculated_from_explicit_long_unoccupied_interpolation"
  );
  assert.equal(pack.dependencyMatrix.coolingLongUnoccupiedRuntime.status, "blocked_metadata_only");
  assert.equal(pack.dependencyMatrix.intermittencyRuntime.status, "blocked_not_relation_2_76_or_2_77");
});

test("R9 declares downstream behavior hidden defaults and intermittency blocked", () => {
  const blockers = longUnoccupiedPack().blockers;

  for (const blockerCode of [
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
  ]) {
    assert.ok(blockers.includes(blockerCode), blockerCode);
  }
});

test("R9 contains no calculator functions runtime access invented defaults or fixture data", () => {
  const serialized = JSON.stringify(longUnoccupiedPack());
  const lower = serialized.toLowerCase();
  const networkCall = "fetch" + "(";

  assert.equal(lower.includes("function"), false);
  assert.equal(lower.includes("readfile"), false);
  assert.equal(lower.includes(networkCall), false);
  assert.equal(lower.includes(".pdf"), false);
  assert.equal(serialized.includes("defaultValue"), false);
  assert.equal(serialized.includes("defaultValues"), false);
  assert.equal(serialized.includes("numericValue"), false);
  assert.equal(serialized.includes("S" + "\u0103" + "licea"), false);
  assert.equal(serialized.includes("demo-" + "house"), false);
});

test("R10 heating QHnd closure source pack exists as a machine-readable coverage map", () => {
  const pack = heatingQhndClosurePack();

  assert.equal(pack.sourcePackCode, R10_HEATING_QHND_VERTICAL_CLOSURE_SOURCE_PACK_CODE);
  assert.equal(pack.sourcePackType, "metadata_only_normative_readiness_source_pack");
  assert.equal(pack.metadataOnly, false);
  assert.equal(pack.machineReadable, true);
  assert.equal(
    pack.runtimeCalculatorStatus,
    "coverage_map_only_existing_restricted_heating_runtime_no_new_formula"
  );
  assert.deepEqual(pack.sourceScope.parentSectionsVerified, [
    "2.7",
    "2.7.6",
    "2.8",
    "2.8.2",
    "2.8.4",
    "2.10"
  ]);
  assert.equal(pack.sourceScope.relationsVerified.includes("2.59"), true);
  assert.equal(pack.sourceScope.relationsVerified.includes("2.76"), true);
  assert.equal(pack.sourceScope.relationsVerified.includes("2.84"), true);
});

test("R10 coverage map distinguishes implemented heating branches from blocked domains", () => {
  const map = heatingQhndClosurePack().heatingQhndCoverageMap;
  const implemented = map.implementedRuntimeBranches.map((branch) => branch.branchId);
  const metadataOnly = map.sourceBackedMetadataOnlyBranches.map((branch) => branch.branchId);
  const notEncoded = map.notMachineEncodedBranches.map((branch) => branch.branchId);

  for (const branchId of [
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
  ]) {
    assert.equal(implemented.includes(branchId), true, branchId);
  }
  assert.deepEqual(metadataOnly, ["relation_2_77_long_unoccupied_cooling_interpolation"]);
  assert.deepEqual(notEncoded, ["heating_period_boundary_duration_method"]);
  for (const downstream of [
    "QCnd",
    "final_energy",
    "primary_energy",
    "CO2",
    "CPE_certificate"
  ]) {
    assert.equal(map.downstreamOutOfScope.includes(downstream), true, downstream);
  }
});

test("R10 keeps not_full_QHnd because boundary duration defaults remain out of scope", () => {
  const pack = heatingQhndClosurePack();

  assert.equal(pack.runtimeClosureVerdict.notFullQhndRemains, true);
  assert.deepEqual(pack.runtimeClosureVerdict.blockedHeatingUsefulDemandRelations, [
    "section_2.11_boundary_duration_method"
  ]);
  assert.deepEqual(pack.runtimeClosureVerdict.coolingRelationsNotUsedInHeatingRuntime, ["2.77"]);
  assert.equal(
    pack.dependencyMatrix.heatingIntermittencyRelations259To273.status,
    "implemented_restricted_explicit_correction"
  );
  assert.equal(pack.dependencyMatrix.fullQhnd.status, "blocked_not_full_QHnd");
  assert.equal(pack.dependencyMatrix.qcnd.status, "blocked");
  assert.equal(pack.dependencyMatrix.final_energy.status, "blocked");
  assert.equal(pack.dependencyMatrix.primary_energy.status, "blocked");
  assert.equal(pack.dependencyMatrix.co2.status, "blocked");
  assert.equal(pack.dependencyMatrix.cpeCertificate.status, "blocked");
});

test("R11 heating intermittency source pack machine-encodes relations 2.59 to 2.73", () => {
  const pack = heatingIntermittencyPack();

  assert.equal(pack.sourcePackCode, R11_HEATING_INTERMITTENCY_SOURCE_PACK_CODE);
  assert.equal(pack.sourcePackType, "metadata_only_normative_readiness_source_pack");
  assert.equal(pack.metadataOnly, false);
  assert.equal(pack.machineReadable, true);
  assert.equal(
    pack.runtimeCalculatorStatus,
    "implemented_restricted_explicit_heating_intermittency_runtime"
  );
  assert.deepEqual(pack.sourceScope.pagesVerified, [117, 118, 119]);
  assert.deepEqual(
    pack.sourceScope.relationsVerified,
    [
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
    ]
  );
  assert.equal(pack.concept.entryCode, "MC001_CONCEPT_HEATING_INTERMITTENCY_RELATIONS");
  assert.equal(pack.runtimeIntegration.implementedModule, "mc001HeatingIntermittencyCalculation.mjs");
  assert.equal(
    pack.runtimeIntegration.qHhtOrigin,
    "calculated_from_explicit_heating_intermittency_correction"
  );
});

test("R11 relation candidates are runtime-ready metadata and not calculator functions", () => {
  const candidates = heatingIntermittencyPack().formulaCandidates;
  const byRelation = new Map(candidates.map((candidate) => [
    candidate.relationReference,
    candidate
  ]));

  assert.equal(candidates.length, 15);
  for (const relation of [
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
  ]) {
    const candidate = byRelation.get(relation);
    assert.ok(candidate, relation);
    assert.equal(candidate.scopeClassification, "heating_runtime_ready");
    assert.equal(candidate.runtimeReadiness, "verified_for_restricted_runtime");
    assert.equal(typeof candidate.machineExpression, "string");
    assert.equal(candidate.machineExpression.length > 0, true);
    assert.equal(Object.hasOwn(candidate, "formulaCode"), false);
    assert.equal(Object.hasOwn(candidate, "entryType"), false);
  }
  assert.equal(byRelation.get("2.59").machineExpression.includes("thetaIntCalcH"), true);
  assert.equal(byRelation.get("2.67").unitNormalization.includes("qHgn"), true);
  assert.equal(byRelation.get("2.73").dependencies.includes("2.70"), true);
});

test("R11 contains no runtime access invented defaults private data or copied source", () => {
  const serialized = JSON.stringify(heatingIntermittencyPack());
  const lower = serialized.toLowerCase();
  const networkCall = "fetch" + "(";

  assert.equal(lower.includes("function"), false);
  assert.equal(lower.includes("readfile"), false);
  assert.equal(lower.includes(networkCall), false);
  assert.equal(lower.includes(".pdf"), false);
  assert.equal(serialized.includes("defaultValue"), false);
  assert.equal(serialized.includes("defaultValues"), false);
  assert.equal(serialized.includes("numericValue"), false);
  assert.equal(serialized.includes("S" + "\u0103" + "licea"), false);
  assert.equal(serialized.includes("demo-" + "house"), false);
});

test("R10 contains no calculator functions runtime access invented defaults or fixture data", () => {
  const serialized = JSON.stringify(heatingQhndClosurePack());
  const lower = serialized.toLowerCase();
  const networkCall = "fetch" + "(";

  assert.equal(lower.includes("function"), false);
  assert.equal(lower.includes("readfile"), false);
  assert.equal(lower.includes(networkCall), false);
  assert.equal(lower.includes(".pdf"), false);
  assert.equal(serialized.includes("defaultValue"), false);
  assert.equal(serialized.includes("defaultValues"), false);
  assert.equal(serialized.includes("numericValue"), false);
  assert.equal(serialized.includes("S" + "\u0103" + "licea"), false);
  assert.equal(serialized.includes("demo-" + "house"), false);
});

test("relation 2.12 defines Hd from corrected U prime and area", () => {
  const formula = formulaByRelation("2.12");

  assert.equal(formula.formulaCode, "MC001_2_12_HD_DIRECT_TRANSMISSION");
  assert.equal(formula.equationText, "H_d = sum_j(U'_j * A_j)");
  assert.equal(formula.result.symbol, "H_d");
  assert.equal(formula.result.unit, "W/K");
  assert.equal(formula.sourceLocator.page, 81);
});

test("relation 2.13 defines psi_j using L_2D U_j A_j and l_j", () => {
  const formula = formulaByRelation("2.13");

  assert.equal(formula.formulaCode, "MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI");
  assert.equal(
    formula.equationText,
    "psi_j = (1 / l_j) * (L_2D - sum_j(U_j * A_j))"
  );
  assert.equal(formula.result.symbol, "psi_j");
  assert.equal(formula.result.unit, "W/(m*K)");
});

test("relation 2.14 defines Phi_tr from H_tr and temperature difference", () => {
  const formula = formulaByRelation("2.14");

  assert.equal(formula.formulaCode, "MC001_2_14_TRANSMISSION_HEAT_FLOW");
  assert.equal(formula.equationText, "Phi_tr = H_tr * (theta_i - theta_e)");
  assert.equal(formula.result.symbol, "Phi_tr");
  assert.equal(formula.result.unit, "W");
});

test("relation 2.15 defines H_tr component sum", () => {
  const formula = formulaByRelation("2.15");

  assert.equal(formula.formulaCode, "MC001_2_15_HTR_TOTAL_TRANSMISSION");
  assert.equal(formula.equationText, "H_tr = H_d + H_g + H_u + H_a");
  assert.equal(formula.result.symbol, "H_tr");
  assert.equal(formula.result.unit, "W/K");
});

test("relation 2.15 components include Hd Hg Hu Ha with W/K unit", () => {
  const formula = formulaByRelation("2.15");

  assert.deepEqual(
    formula.components.map((component) => [component.symbol, component.unit]),
    [
      ["H_d", "W/K"],
      ["H_g", "W/K"],
      ["H_u", "W/K"],
      ["H_a", "W/K"]
    ]
  );
});

test("figure 2.10 metadata exists", () => {
  const figure = figureByCode("MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER");

  assert.equal(figure.page, 99);
  assert.equal(figure.sourceLocator.figure, "2.10");
});

test("figure 2.11 metadata exists and is source metadata only", () => {
  const figure = figureByCode("MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER");

  assert.equal(figure.page, 99);
  assert.equal(figure.status, "source_metadata_only");
  assert.equal(figure.sourceLocator.figure, "2.11");
});

test("figure 2.12 metadata exists and is source metadata only", () => {
  const figure = figureByCode("MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT");

  assert.equal(figure.page, 100);
  assert.equal(figure.status, "source_metadata_only");
  assert.equal(figure.sourceLocator.figure, "2.12");
});

test("relation 2.27 defines global transmission excluding ground", () => {
  const formula = formulaByRelation("2.27");

  assert.equal(
    formula.formulaCode,
    "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND"
  );
  assert.equal(
    formula.equationText,
    "H_H/C;tr(excl.gf);ztc;m = sum_k(H_H/C;el,k;m) + H_tr;tb;ztc"
  );
  assert.equal(formula.result.unit, "W/K");
});

test("relation 2.27 includes excl gf and excl grnd flr notation aliases", () => {
  const formula = formulaByRelation("2.27");

  assert.deepEqual(formula.notationAliases, [
    "H_H/C;tr(excl.grnd flr);ztc;m",
    "H_H/C;tr(excl.gf);ztc;m"
  ]);
});

test("relation 2.28 defines H_tr_tb from l_tb and Psi_tb", () => {
  const formula = formulaByRelation("2.28");

  assert.equal(
    formula.formulaCode,
    "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT"
  );
  assert.equal(formula.equationText, "H_tr;tb;zt = sum_k(l_tb;k * Psi_tb;k)");
  assert.deepEqual(
    formula.terms.map((term) => [term.symbol, term.unit]),
    [
      ["l_tb;k", "m"],
      ["Psi_tb;k", "W/(m*K)"]
    ]
  );
});

test("relation 2.28 does not introduce point bridge chi calculation", () => {
  const formula = formulaByRelation("2.28");

  assert.equal(JSON.stringify(formula).toLowerCase().includes("chi"), false);
});

test("positive transmission convention applicability rule exists", () => {
  const rule = ruleByCode("transmission_positive_from_interior_to_exterior");

  assert.equal(rule.entryCode, "MC001_RULE_TRANSMISSION_POSITIVE_INTERIOR_TO_EXTERIOR");
  assert.equal(rule.sourceLocator.page, 100);
});

test("separation of ground-contact elements applicability rule exists", () => {
  const rule = ruleByCode("monthly_transmission_separates_ground_contact");

  assert.equal(rule.entryCode, "MC001_RULE_MONTHLY_TRANSMISSION_SEPARATES_GROUND_CONTACT");
  assert.equal(rule.sourceLocator.page, 99);
});

test("validation counts match C6N expected aggregate counts", () => {
  const result = validateMc001NormativeRegistry(registry());

  assert.equal(result.status, "valid");
  assert.deepEqual(result.counts, EXPECTED_COUNTS);
});

test("validation blocks missing schema marker", () => {
  const mutated = mutableRegistry();
  delete mutated.schemaVersion;

  assertBlocked(validateMc001NormativeRegistry(mutated));
});

test("validation blocks unknown mutated sourcePackCode", () => {
  const mutated = mutableRegistry();
  mutated.sourcePacks[0].sourcePackCode = "UNKNOWN_SOURCE_PACK";

  assertBlocked(validateMc001NormativeRegistry(mutated));
});

test("validation blocks mutated relation 2.12 page", () => {
  const mutated = mutableRegistry();
  formulaByRelation("2.12", mutated).sourceLocator.page = 82;

  assertBlocked(validateMc001NormativeRegistry(mutated));
});

test("validation blocks mutated relation 2.27 unit", () => {
  const mutated = mutableRegistry();
  formulaByRelation("2.27", mutated).result.unit = "kWh";

  assertBlocked(validateMc001NormativeRegistry(mutated));
});

test("validation blocks unknown R2 formula code", () => {
  const mutated = mutableRegistry();
  formulaByRelation("2.28", mutated).formulaCode = "UNKNOWN_R2_FORMULA_CODE";

  assertBlocked(validateMc001NormativeRegistry(mutated));
});

test("validation blocks changing R2 verification status to pending review", () => {
  const mutated = mutableRegistry();
  htrSpinePack(mutated).verificationStatus = "extracted_pending_human_review";

  assertBlocked(validateMc001NormativeRegistry(mutated));
});

test("validation blocks modified c_ztu_ve value", () => {
  const mutated = mutableRegistry();
  formulaByRelation("2.24", mutated).constants[0].recommendedValue = 0.6;

  assertBlocked(validateMc001NormativeRegistry(mutated));
});

test("source pack lookup returns found for all known packs", () => {
  for (const sourcePackCode of [
    R0_BZTU_SOURCE_PACK_CODE,
    R2_HTR_SPINE_SOURCE_PACK_CODE,
    R2_MONTHLY_SOURCE_PACK_CODE,
    R3_QHND_MONTHLY_SOURCE_PACK_CODE,
    R4_FIGURE_2_18_HEATING_BRANCH_SOURCE_PACK_CODE,
    R5_UTILIZATION_FACTORS_HEATING_SOURCE_PACK_CODE,
    R6_GAINS_CAPACITY_TIMECONSTANT_SOURCE_PACK_CODE,
    R7_QHND_AMBIGUITY_RESOLUTION_SOURCE_PACK_CODE,
    R8_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_SOURCE_PACK_CODE,
    R9_LONG_UNOCCUPIED_INTERPOLATION_SOURCE_PACK_CODE,
    R10_HEATING_QHND_VERTICAL_CLOSURE_SOURCE_PACK_CODE
  ]) {
    const result = getMc001NormativeSourcePackByCode(sourcePackCode);
    assert.equal(result.status, "found", sourcePackCode);
    assert.equal(result.sourcePack.sourcePackCode, sourcePackCode);
  }
});

test("source pack lookup blocks unknown source pack code", () => {
  const unknown = "UNKNOWN_SOURCE_PACK_SHOULD_NOT_ECHO";
  const result = getMc001NormativeSourcePackByCode(unknown);

  assertBlocked(result);
  assertUnknownNotEchoed(result, unknown);
});

test("entry lookup returns found for all known entries", () => {
  for (const entryCode of entryCodes()) {
    const result = getMc001NormativeEntryByCode(entryCode);
    assert.equal(result.status, "found", entryCode);
    assert.equal(result.entry.entryCode, entryCode);
  }
});

test("entry lookup returns found for new R2 concepts figures rules and formulas", () => {
  for (const entryCode of [
    "MC001_CONCEPT_HTR_TRANSMISSION_COEFFICIENT",
    "MC001_CONCEPT_MONTHLY_TRANSMISSION_TRANSFER",
    "MC001_FORMULA_2_12_HD_DIRECT_TRANSMISSION",
    "MC001_FORMULA_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT",
    "MC001_FIGURE_2_10_TOTAL_HEAT_TRANSFER",
    "MC001_FIGURE_2_11_TOTAL_TRANSMISSION_HEAT_TRANSFER",
    "MC001_FIGURE_2_12_GLOBAL_TRANSMISSION_COEFFICIENT",
    "MC001_RULE_TRANSMISSION_POSITIVE_INTERIOR_TO_EXTERIOR",
    "MC001_RULE_MONTHLY_TRANSMISSION_SEPARATES_GROUND_CONTACT",
    "MC001_CONCEPT_QHND_MONTHLY_USEFUL_ENERGY_DEMAND"
  ]) {
    const result = getMc001NormativeEntryByCode(entryCode);
    assert.equal(result.status, "found", entryCode);
  }
});

test("entry lookup blocks unknown entry code", () => {
  const unknown = "UNKNOWN_ENTRY_CODE_SHOULD_NOT_ECHO";
  const result = getMc001NormativeEntryByCode(unknown);

  assertBlocked(result);
  assertUnknownNotEchoed(result, unknown);
});

test("formula lookup returns found for all known formula codes", () => {
  for (const formulaCode of [...R0_FORMULA_CODES, ...R2_FORMULA_CODES]) {
    const result = getMc001NormativeFormulaByCode(formulaCode);
    assert.equal(result.status, "found", formulaCode);
    assert.equal(result.formula.formulaCode, formulaCode);
  }
});

test("formula lookup blocks unknown formula code", () => {
  const unknown = "UNKNOWN_FORMULA_CODE_SHOULD_NOT_ECHO";
  const result = getMc001NormativeFormulaByCode(unknown);

  assertBlocked(result);
  assertUnknownNotEchoed(result, unknown);
});

test("unknown lookup inputs are not echoed into output", () => {
  const unknown = "ARBITRARY_PRIVATE_UNKNOWN_LOOKUP_SHOULD_NOT_ECHO";
  const results = [
    getMc001NormativeSourcePackByCode(unknown),
    getMc001NormativeEntryByCode(unknown),
    getMc001NormativeFormulaByCode(unknown),
    getMc001NormativeDefaultValueCandidateByCode(unknown)
  ];

  for (const result of results) {
    assertUnknownNotEchoed(result, unknown);
  }
});

test("get default value candidate returns no numeric default bztu values", () => {
  const result = getMc001NormativeDefaultValueCandidateByCode(DEFAULT_CANDIDATE_CODE);

  assert.equal(result.status, "found");
  assert.equal(
    result.defaultValueCandidate.sourceContractCode,
    "MC001_BZTU_DEFAULT_BY_TYPE_SIZE_SOURCE_CONTRACT"
  );
  assertNoNumericDefaultValues(result.defaultValueCandidate);
});

test("returned registry source pack entry and formula objects are not mutable shared state", () => {
  const returnedRegistry = registry();
  const returnedPack = getMc001NormativeSourcePackByCode(
    R2_HTR_SPINE_SOURCE_PACK_CODE
  ).sourcePack;
  const returnedEntry = getMc001NormativeEntryByCode(
    "MC001_CONCEPT_HTR_TRANSMISSION_COEFFICIENT"
  ).entry;
  const returnedFormula = getMc001NormativeFormulaByCode(
    "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND"
  ).formula;

  assert.notEqual(returnedRegistry, mc001NormativeRegistryV1);
  assert.notEqual(returnedPack, htrSpinePack(mc001NormativeRegistryV1));
  assert.notEqual(returnedEntry, htrSpinePack(mc001NormativeRegistryV1).concept);
  assert.notEqual(returnedFormula, formulaByCode(
    "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
    mc001NormativeRegistryV1
  ));
});

test("mutating returned R2 data does not mutate registry source", () => {
  const returnedPack = getMc001NormativeSourcePackByCode(
    R2_MONTHLY_SOURCE_PACK_CODE
  ).sourcePack;
  const returnedFormula = getMc001NormativeFormulaByCode(
    "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT"
  ).formula;

  assert.throws(() => {
    returnedPack.concept.unit = "mutated";
  }, TypeError);
  assert.throws(() => {
    returnedFormula.result.unit = "mutated";
  }, TypeError);

  assert.equal(monthlyPack(mc001NormativeRegistryV1).concept.unit, "kWh");
  assert.equal(
    formulaByCode(
      "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT",
      mc001NormativeRegistryV1
    ).result.unit,
    "W/K"
  );
});

test("no PDF parsing filesystem or network behavior exists in runtime", () => {
  const source = runtimeSource();

  for (const forbidden of [
    "readFile",
    "writeFile",
    "createReadStream",
    "fetch(",
    "XMLHttpRequest",
    ".pdf",
    "node:fs",
    "node:path",
    "http:",
    "https:"
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test("runtime import boundary has no DB API UI Worker H3-H12 or orchestrator imports", () => {
  const source = runtimeSource();

  assert.equal(source.includes("import "), false);
  for (const forbidden of [
    "from \"./db",
    "from \"../db",
    "from \"./api",
    "from \"../api",
    "from \"./ui",
    "from \"../ui",
    "from \"./worker",
    "from \"../worker",
    "from \"./orchestrator",
    "from \"../orchestrator",
    "mc001Htr",
    "mc001HuAggregation",
    "mc001HuComponent",
    "mc001HuHtr",
    "mc001HuMulti",
    "mc001Bztu"
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test("no calculator functions are exported", () => {
  const source = runtimeSource();
  const exportMatches = [...source.matchAll(/export function ([^(]+)/g)].map((match) => (
    match[1]
  ));

  assert.deepEqual(exportMatches.sort(), [
    "getMc001NormativeDefaultValueCandidateByCode",
    "getMc001NormativeEntryByCode",
    "getMc001NormativeFormulaByCode",
    "getMc001NormativeRegistry",
    "getMc001NormativeSourcePackByCode",
    "validateMc001NormativeRegistry"
  ].sort());
  assert.equal(source.includes("calculateMc001"), false);
  assert.equal(source.includes("buildMc001Htr"), false);
});

test("privacy forbidden terms are absent from serialized registry and lookup outputs", () => {
  const serialized = serializedOutputs();

  for (const term of privateForbiddenTerms()) {
    assert.equal(serialized.includes(term), false, term);
  }
});

test("blocker codes are finite and allowlisted", () => {
  const blockedResults = [
    validateMc001NormativeRegistry({}),
    getMc001NormativeSourcePackByCode("unknown"),
    getMc001NormativeEntryByCode("unknown"),
    getMc001NormativeFormulaByCode("unknown"),
    getMc001NormativeDefaultValueCandidateByCode("unknown")
  ];

  for (const result of blockedResults) {
    assertBlocked(result);
  }
});

test("default values remain blocked until explicit numeric table is verified", () => {
  const mutated = mutableRegistry();
  r0Pack(mutated).defaultValueCandidates[0].numericDefaultsAvailable = true;

  assertBlocked(validateMc001NormativeRegistry(mutated));
});

test("registry contains no invented default bztu values", () => {
  const keys = collectKeys(registry());

  for (const forbiddenKey of [
    "defaultValue",
    "defaultValues",
    "numericValue",
    "amount"
  ]) {
    assert.equal(keys.includes(forbiddenKey), false, forbiddenKey);
  }
});

test("no hidden fallback values exist", () => {
  const hiddenFallback = "hidden_" + "fallback";
  const productFallback = "product_" + "fallback";
  const serialized = JSON.stringify(registry());

  assert.equal(serialized.includes(hiddenFallback), false);
  assert.equal(serialized.includes(productFallback), false);
});

test("no monthly useful demand final primary CO2 or downstream runtime behavior is introduced", () => {
  const readiness = "downstream" + "Readiness";
  const source = runtimeSource();
  const behaviorTerms = [
    "calculateMc001MonthlyUsefulDemand",
    "calculateQHnd",
    "calculateQCnd",
    "final" + "Energy",
    "primary" + "Energy",
    "calculateCO2",
    readiness,
    "isCompleteHtrReady",
    "isHtrTotalCalculationReady"
  ];

  for (const term of behaviorTerms) {
    assert.equal(source.includes(term), false, term);
  }
});

test("allowed statuses and severities are controlled by output", () => {
  const validResult = validateMc001NormativeRegistry(registry());
  const foundResult = getMc001NormativeFormulaByCode(
    "MC001_2_15_HTR_TOTAL_TRANSMISSION"
  );
  const blockedResult = getMc001NormativeFormulaByCode("unknown");

  assert.equal(validResult.status, "valid");
  assert.equal(foundResult.status, "found");
  assert.equal(blockedResult.status, "blocked");
  assert.equal(blockedResult.blockers[0].severity, "blocking");
});

test("validation blocks private content safely", () => {
  const privateTerm = "person" + "@example.com";
  const mutated = mutableRegistry();
  htrSpinePack(mutated).concept.name = privateTerm;

  const result = validateMc001NormativeRegistry(mutated);

  assertBlocked(result);
  assert.equal(JSON.stringify(result).includes(privateTerm), false);
});

test("package orchestrator H pipeline and H12A behavior remain out of runtime", () => {
  const source = runtimeSource();
  const packageFile = "package" + ".json";
  const orchestrator = "orches" + "trator";
  const goldenPipeline = "Golden" + "Pipeline";

  assert.equal(source.includes(packageFile), false);
  assert.equal(source.includes(orchestrator), false);
  assert.equal(source.includes(goldenPipeline), false);
});

test("R12 cooling QCnd source pack is machine-readable and runtime-scoped", () => {
  const pack = coolingQcndPack();

  assert.equal(pack.sourcePackCode, R12_COOLING_QCND_FORMULA_SOURCE_PACK_CODE);
  assert.equal(pack.machineReadable, true);
  assert.equal(pack.metadataOnly, false);
  assert.equal(pack.runtimeCalculatorStatus, "implemented_restricted_explicit_cooling_QCnd_runtime");
  assert.equal(pack.concept.entryCode, "MC001_CONCEPT_COOLING_QCND_FORMULA");
  assert.ok(pack.sourceScope.figuresVerified.includes("2.19"));
  assert.ok(pack.sourceScope.relationsVerified.includes("2.77"));
  assert.ok(pack.sourceScope.relationsVerified.includes("2.85"));
  assert.equal(pack.runtimeIntegration.implementedModule, "mc001CoolingUsefulDemandCalculation.mjs");
});

test("R12 cooling relation map distinguishes QCnd runtime from downstream metadata", () => {
  const map = coolingQcndPack().relationMap;
  const byRelation = new Map(map.map((entry) => [entry.relationReference, entry]));

  assert.equal(byRelation.get("figure_2.19").scopeClassification, "cooling_runtime_ready");
  assert.equal(byRelation.get("2.77").scopeClassification, "cooling_runtime_ready");
  assert.equal(byRelation.get("2.85").scopeClassification, "cooling_runtime_ready");
  assert.equal(byRelation.get("2.78").scopeClassification, "cooling_metadata_only");
  assert.equal(byRelation.get("2.80").scopeClassification, "downstream_overheating_metadata_only");
  assert.equal(byRelation.get("2.82").scopeClassification, "latent_humidification_out_of_scope");
  assert.equal(byRelation.get("2.83").scopeClassification, "latent_dehumidification_out_of_scope");
});

test("R12 cooling formula candidates include figure 2.19 relation 2.77 and annual 2.85", () => {
  const candidates = coolingQcndPack().formulaCandidates;
  const byCode = new Map(candidates.map((candidate) => [candidate.candidateCode, candidate]));

  assert.equal(
    byCode.get("MC001_R12_FIGURE_2_19_COOLING_UTILIZED_TRANSFER_BRANCH").machineExpression,
    "qCnd = aCred * (qCgn - etaCht * qCht)"
  );
  assert.equal(
    byCode.get("MC001_R12_RELATION_2_77_COOLING_LONG_UNOCCUPIED_INTERPOLATION").machineExpression,
    "qCnd = (1 - unoccupiedFraction) * qCndOccupied + unoccupiedFraction * qCndUnoccupied"
  );
  assert.equal(
    byCode.get("MC001_R12_RELATION_2_85_ANNUAL_QCND").machineExpression,
    "annualQCnd = sum(qCnd for monthly cases)"
  );
  assert.equal(
    byCode.get("MC001_R12_RELATIONS_2_80_TO_2_83_DOWNSTREAM_LATENT_AND_OVERHEATING").runtimeReadiness,
    "not_used_by_QCnd_runtime"
  );
});

test("R13 cooling utilization source pack encodes figure 2.15 and relations 2.56 2.58", () => {
  const pack = coolingUtilizationPack();
  const candidates = pack.formulaCandidates;
  const byCode = new Map(candidates.map((candidate) => [candidate.candidateCode, candidate]));

  assert.equal(pack.sourcePackCode, R13_COOLING_UTILIZATION_FACTOR_SOURCE_PACK_CODE);
  assert.equal(pack.machineReadable, true);
  assert.equal(pack.concept.targetSymbol, "etaC;ht;ztc;m");
  assert.ok(pack.sourceScope.figuresVerified.includes("2.15"));
  assert.ok(pack.sourceScope.relationsVerified.includes("2.56"));
  assert.ok(pack.sourceScope.relationsVerified.includes("2.58"));
  assert.equal(
    byCode.get("MC001_R13_FIGURE_2_15_ETA_C_POSITIVE_GAMMA_NOT_ONE").machineExpression,
    "etaCht = (1 - gammaC ** (-aC)) / (1 - gammaC ** (-(aC + 1)))"
  );
  assert.equal(
    byCode.get("MC001_R13_FIGURE_2_15_ETA_C_GAMMA_EQUALS_ONE").machineExpression,
    "etaCht = aC / (aC + 1)"
  );
  assert.equal(
    byCode.get("MC001_R13_RELATION_2_56_A_C_PARAMETER").machineExpression,
    "aC = aC0 + tauC / tauC0"
  );
  assert.equal(
    byCode.get("MC001_R13_RELATION_2_58_TAU_C_TIME_CONSTANT").outputUnit,
    "h"
  );
});

test("R14 cooling intermittency source pack encodes relations 2.74 and 2.75 without defaults", () => {
  const pack = coolingIntermittencyPack();
  const candidates = pack.formulaCandidates;
  const byCode = new Map(candidates.map((candidate) => [candidate.candidateCode, candidate]));
  const serialized = JSON.stringify(pack);

  assert.equal(pack.sourcePackCode, R14_COOLING_INTERMITTENCY_SOURCE_PACK_CODE);
  assert.equal(pack.machineReadable, true);
  assert.equal(pack.runtimeIntegration.implementedModule, "mc001CoolingIntermittencyCalculation.mjs");
  assert.deepEqual(pack.sourceScope.relationsVerified, ["2.74", "2.75"]);
  assert.equal(
    byCode.get("MC001_R14_RELATION_2_74_COOLING_INTERMITTENCY_REDUCTION_FACTOR").machineExpression,
    "aCred = (1 - fCredWknd) + bCredWknd * fCredWknd"
  );
  assert.equal(
    byCode.get("MC001_R14_RELATION_2_75_COOLING_INTERMITTENCY_WEEK_FRACTION").machineExpression,
    "fCredWknd = weekendReductionDurationHours * weekendReductionRepetitionCount / (24 * 7)"
  );
  assert.equal(serialized.includes("defaultValue"), false);
  assert.equal(serialized.includes("numericValue"), false);
});

test("cooling source packs keep final primary CO2 CPE and certificate blocked", () => {
  for (const pack of [
    coolingQcndPack(),
    coolingUtilizationPack(),
    coolingIntermittencyPack()
  ]) {
    for (const blockerCode of [
      "not_final_energy",
      "not_primary_energy",
      "not_CO2",
      "not_CPE_certificate",
      "no_hidden_defaults"
    ]) {
      assert.ok(pack.blockers.includes(blockerCode), `${pack.sourcePackCode} ${blockerCode}`);
    }
  }
});

test("R15 to R18 envelope source packs machine-encode materials U-values Htr and boundaries", () => {
  const packs = [
    envelopeMaterialsPack(),
    envelopeUValuePack(),
    envelopeTransmissionPack(),
    envelopeBoundaryPack()
  ];

  assert.deepEqual(
    packs.map(pack => pack.sourcePackCode),
    [
      R15_ENVELOPE_MATERIALS_RESISTANCE_SOURCE_PACK_CODE,
      R16_ENVELOPE_THERMAL_TRANSMITTANCE_SOURCE_PACK_CODE,
      R17_ENVELOPE_TRANSMISSION_COEFFICIENTS_SOURCE_PACK_CODE,
      R18_ENVELOPE_BOUNDARY_CORRECTIONS_SOURCE_PACK_CODE
    ]
  );
  for (const pack of packs) {
    assert.equal(pack.machineReadable, true);
    assert.equal(pack.metadataOnly, false);
    assert.equal(pack.runtimeIntegration.implementedModule, "mc001EnvelopePhysicsCalculation.mjs");
    assert.ok(pack.runtimeIntegration.inputPolicy.includes("explicit_inputs_only"));
    assert.ok(pack.runtimeIntegration.inputPolicy.includes("no_hidden_defaults"));
    assert.ok(pack.blockers.includes("not_certificate"));
    assert.equal(Object.hasOwn(pack, "formulas"), false);
  }
});

test("R15 envelope materials pack encodes lambda resistance and surface dependencies", () => {
  const pack = envelopeMaterialsPack();
  const byCode = new Map(pack.formulaCandidates.map(candidate => [candidate.candidateCode, candidate]));

  assert.deepEqual(pack.sourceScope.relationsVerified, ["2.3", "2.6"]);
  assert.deepEqual(pack.sourceScope.pagesVerified, [43, 47, 48, 50, 77, 78]);
  assert.equal(
    byCode.get("MC001_R15_RELATION_2_3_LAMBDA_CORRECTION").machineExpression,
    "lambdaWmK = correctionCoefficientA * lambdaNormatWmK"
  );
  assert.equal(
    byCode.get("MC001_R15_LAYER_RESISTANCE_FROM_THICKNESS_AND_LAMBDA").machineExpression,
    "layerResistance = thicknessM / lambdaWmK"
  );
  assert.equal(
    byCode.get("MC001_R15_RELATION_2_6_TOTAL_THERMAL_RESISTANCE").machineExpression,
    "totalResistance = rsi + sum(layerR) + sum(airLayerR) + rse"
  );
  assert.equal(
    byCode.get("MC001_R15_SURFACE_RESISTANCE_FROM_SURFACE_COEFFICIENTS").machineExpression,
    "rsi = 1 / hi; rse = 1 / he"
  );
  assert.equal(
    byCode.get("MC001_R15_EXTERNAL_MATERIAL_LAMBDA_SOURCE_CONTRACT").runtimeReadiness,
    "verified_for_explicit_external_contract_runtime"
  );
  assert.equal(
    byCode.get("MC001_R15_EXTERNAL_AIR_LAYER_RESISTANCE_SOURCE_CONTRACT").machineExpression,
    "airLayerResistanceM2KPerW = explicitExternalSourceBackedRa"
  );
  assert.ok(
    pack.externalDependencies.some(
      (dependency) => dependency.dependencyCode === "MATERIAL_LAMBDA_EXTERNAL_SOURCE_CONTRACTS"
    )
  );
  assert.ok(
    pack.externalDependencies.some(
      (dependency) => dependency.dependencyCode === "AIR_LAYER_RESISTANCE_SR_EN_ISO_6946_CONTRACT"
    )
  );
  assert.ok(
    pack.runtimeIntegration.inputPolicy.includes(
      "external_material_lambda_contract_or_explicit_lambda_normat"
    )
  );
  assert.ok(
    pack.runtimeIntegration.inputPolicy.includes(
      "external_air_layer_resistance_contract_or_explicit_Ra"
    )
  );
});

test("R16 and R17 envelope packs encode U and Htr runtime formulas", () => {
  const uCandidates = new Map(
    envelopeUValuePack().formulaCandidates.map(candidate => [candidate.candidateCode, candidate])
  );
  const htrCandidates = new Map(
    envelopeTransmissionPack().formulaCandidates.map(candidate => [candidate.candidateCode, candidate])
  );

  assert.equal(
    uCandidates.get("MC001_R16_RELATION_2_7_THERMAL_TRANSMITTANCE").machineExpression,
    "uValue = 1 / totalResistance"
  );
  assert.equal(
    uCandidates.get("MC001_R16_RELATION_2_8_CORRECTED_TRANSMITTANCE_METADATA").runtimeReadiness,
    "metadata_only_use_R17_bridge_runtime_path"
  );
  assert.equal(
    htrCandidates.get("MC001_R17_RELATION_2_11_DIRECT_TRANSMISSION_WITH_BRIDGES").machineExpression,
    "Hd = sum(elementU * area * boundaryFactor) + explicitBridgeTerms"
  );
  assert.equal(
    htrCandidates.get("MC001_R17_RELATION_2_15_TOTAL_TRANSMISSION_COEFFICIENT").machineExpression,
    "htr = hd + hg + hu + ha"
  );
  assert.equal(
    htrCandidates.get("MC001_R17_RELATION_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT").machineExpression,
    "thermalBridgeCoefficient = sum(psi * length)"
  );
});

test("R18 envelope boundary pack keeps non-exterior corrections explicit", () => {
  const pack = envelopeBoundaryPack();
  const byCode = new Map(pack.formulaCandidates.map(candidate => [candidate.candidateCode, candidate]));

  assert.deepEqual(pack.sourceScope.relationsVerified, ["2.15", "2.21", "2.22", "2.23", "2.24", "2.27"]);
  assert.deepEqual(pack.sourceScope.pagesVerified, [81, 82, 84, 94, 95, 96, 99, 100, 109]);
  assert.equal(
    byCode.get("MC001_R18_OUTSIDE_AIR_DIRECT_HD_COMPONENT").machineExpression,
    "HdElement = U * area"
  );
  assert.equal(
    byCode.get("MC001_R18_GROUND_BOUNDARY_EXPLICIT_FACTOR").machineExpression,
    "HgElement = U * area * explicitBoundaryCorrectionFactor"
  );
  assert.equal(
    byCode.get("MC001_R18_GROUND_CONTACT_EXTERNAL_DETAILED_METHOD_CONTRACT")
      .machineExpression,
    "HgElement = U * area * explicitSourceBackedGroundContactFactor"
  );
  assert.equal(
    byCode.get("MC001_R18_GROUND_CONTACT_EXTERNAL_DETAILED_METHOD_CONTRACT")
      .runtimeReadiness,
    "verified_for_explicit_external_contract_runtime"
  );
  assert.equal(
    byCode.get("MC001_R18_UNHEATED_SPACE_EXPLICIT_FACTOR").machineExpression,
    "HuElement = U * area * explicitBoundaryCorrectionFactor"
  );
  assert.equal(
    byCode.get("MC001_R18_ADJACENT_SPACE_EXPLICIT_FACTOR").machineExpression,
    "HaElement = U * area * explicitBoundaryCorrectionFactor"
  );
  assert.equal(
    byCode.get("MC001_R18_UNHEATED_SPACE_EXPLICIT_BZTU_BALANCE").machineExpression,
    "bztu = ((1 + explicitCztuVe) * explicitHtrUe) / (sum(explicitHztcZtu) + ((1 + explicitCztuVe) * explicitHtrUe))"
  );
  assert.equal(
    byCode.get("MC001_R18_UNHEATED_SPACE_EXPLICIT_BZTU_BALANCE").runtimeReadiness,
    "verified_for_restricted_runtime"
  );
  assert.equal(
    byCode.get("MC001_R18_BZTU_SOURCE_BACKED_DEFAULT_FACTOR").machineExpression,
    "boundaryCorrectionFactor = explicitSourceBackedBztuDefaultFactor"
  );
  assert.equal(
    byCode.get("MC001_R18_BZTU_SOURCE_BACKED_DEFAULT_FACTOR").runtimeReadiness,
    "verified_for_explicit_external_contract_runtime"
  );
  assert.ok(pack.runtimeIntegration.inputPolicy.includes("no_default_ground_factor"));
  assert.ok(
    pack.runtimeIntegration.inputPolicy.includes(
      "external_ground_contact_contract_or_explicit_factor"
    )
  );
  assert.ok(pack.runtimeIntegration.inputPolicy.includes("no_default_unheated_space_factor"));
  assert.ok(pack.runtimeIntegration.inputPolicy.includes("no_default_adjacent_space_factor"));
  assert.ok(pack.runtimeIntegration.inputPolicy.includes("no_default_cztu_ve"));
  assert.ok(pack.runtimeIntegration.inputPolicy.includes("external_bztu_default_contract_or_explicit_balance"));
  assert.ok(
    pack.runtimeIntegration.boundaryOriginCodes.includes(
      "calculated_from_MC001_2_22_2_23_2_24_explicit_ztu_balance"
    )
  );
  assert.ok(
    pack.runtimeIntegration.boundaryOriginCodes.includes(
      "source_backed_ground_contact_detailed_method_factor"
    )
  );
  assert.ok(pack.runtimeIntegration.boundaryOriginCodes.includes("source_backed_bztu_default_factor"));
});

test("R19 Chapter 2 coverage pack enforces explicit useful-demand runtime coverage and gaps", () => {
  const pack = chapter2CoveragePack();

  assert.equal(pack.sourcePackCode, R19_CHAPTER_2_COMPLETE_USEFUL_DEMAND_COVERAGE_SOURCE_PACK_CODE);
  assert.equal(pack.machineReadable, true);
  assert.equal(pack.metadataOnly, false);
  assert.equal(
    pack.runtimeCalculatorStatus,
    "implemented_explicit_chapter_2_useful_demand_coverage_map_and_12_month_calculation_layer"
  );
  for (const relation of [
    "2.3",
    "2.6",
    "2.7",
    "2.11",
    "2.15",
    "2.20",
    "2.22",
    "2.23",
    "2.24",
    "2.34",
    "2.36",
    "2.37",
    "2.38",
    "2.39",
    "2.40",
    "2.50",
    "2.51",
    "2.52",
    "2.53",
    "2.54",
    "2.82",
    "2.83",
    "2.84",
    "2.85",
    "2.86"
  ]) {
    assert.ok(pack.sourceScope.relationsVerified.includes(relation), relation);
  }
  for (const runtimeItem of [
    "material_lambda_relation_2_3_with_explicit_table_2_2_coefficient_code",
    "surface_resistance_table_2_11_explicit_code_lookup",
    "exterior_surface_resistance_table_2_12_explicit_wind_speed_code_lookup",
    "solar_transmission_table_2_13_explicit_glazing_type_lookup",
    "effective_internal_heat_capacity_table_2_20_explicit_class_area_lookup",
    "Htr_component_sum",
    "monthly_transmission_explicit_temperature_duration",
    "ventilation_infiltration_table_2_14_explicit_lookup",
    "ventilation_infiltration_relation_2_20_explicit_weighted_average",
    "monthly_ventilation_explicit_airflow_temperature_duration",
    "internal_gains_table_2_15_explicit_category_lookup",
    "monthly_heat_gains_explicit_internal_plus_solar_sum",
    "ground_Hg_from_source_backed_ground_contact_detailed_method_contract",
    "adjacent_unconditioned_zone_internal_gains_relation_2_34_explicit_inputs",
    "adjacent_unconditioned_zone_solar_gains_relation_2_37_explicit_inputs",
    "adjacent_unconditioned_zone_gain_reduction_relations_2_51_2_52_2_53_explicit_inputs",
    "monthly_solar_gains_explicit_transparent_opaque_sum",
    "solar_sky_radiation_relation_2_54_explicit_inputs",
    "solar_shading_table_2_16_explicit_device_lookup",
    "obstacle_shading_tables_2_17_2_18_explicit_month_orientation_lookup",
    "monthly_solar_gains_external_irradiation_and_obstacle_contract_inputs",
    "humidification_table_2_21_explicit_space_category_lookup",
    "unheated_Hu_from_explicit_bztu_balance_relations_2_23_2_24",
    "unheated_Hu_from_source_backed_bztu_default_factor_contract",
    "adjacent_Ha_from_source_backed_bztu_default_factor_contract",
    "heating_QHnd_normal_boundary_intermittency_long_unoccupied",
    "cooling_QCnd_normal_boundary_intermittency_long_unoccupied",
    "annual_QHnd_sum_relation_2_84",
    "annual_QCnd_sum_relation_2_85",
    "latent_humidification_relation_2_82_explicit_inputs",
    "latent_dehumidification_relation_2_83_explicit_inputs",
    "annual_latent_sum_relation_2_86",
    "twelve_month_explicit_chapter_2_calculation_layer"
  ]) {
    assert.ok(pack.coverageMap.runtimeImplemented.includes(runtimeItem), runtimeItem);
  }
  assert.ok(
    pack.coverageMap.explicitInputOnly.includes(
      "base_material_lambda_normat_explicit_or_external_source_contract"
    )
  );
  assert.ok(pack.coverageMap.explicitInputOnly.includes("monthly_weather_temperatures"));
  assert.ok(
    pack.coverageMap.explicitInputOnly.includes(
      "ventilation_airflows_and_mechanical_ventilation_corrections"
    )
  );
  assert.ok(
    pack.coverageMap.explicitInputOnly.includes(
      "air_layer_resistance_explicit_or_external_SR_EN_ISO_6946_source"
    )
  );
  assert.ok(
    pack.coverageMap.explicitInputOnly.includes(
      "ground_contact_external_contract_or_explicit_factor"
    )
  );
  assert.ok(
    pack.coverageMap.explicitInputOnly.includes(
      "solar_irradiation_external_contract_or_explicit_value"
    )
  );
  assert.ok(
    pack.coverageMap.explicitInputOnly.includes(
      "obstacle_shading_external_geometry_contract_or_explicit_factor"
    )
  );
  assert.ok(
    pack.coverageMap.explicitInputOnly.includes(
      "direct_effective_internal_heat_capacity_or_table_2_20_class_area_source"
    )
  );
  assert.equal(pack.coverageMap.tableBackedNotEncoded.includes("surface_resistance_default_tables"), false);
  assert.equal(pack.coverageMap.tableBackedNotEncoded.includes("air_layer_resistance_default_tables"), false);
  assert.equal(pack.coverageMap.tableBackedNotEncoded.includes("material_lambda_catalog_values"), false);
  assert.equal(
    pack.coverageMap.ambiguousExtraction.includes("automatic_ground_contact_detailed_method"),
    false
  );
  assert.deepEqual(pack.coverageMap.ambiguousExtraction, []);
  assert.deepEqual(pack.coverageMap.tableBackedNotEncoded, []);
  assert.equal(
    pack.coverageMap.ambiguousExtraction.includes("automatic_unheated_space_balance_defaults"),
    false
  );
  assert.equal(
    pack.coverageMap.ambiguousExtraction.includes("automatic_adjacent_space_balance_defaults"),
    false
  );
  for (const downstream of [
    "final_energy",
    "primary_energy",
    "CO2",
    "CPE",
    "certificate"
  ]) {
    assert.ok(pack.coverageMap.outOfChapter2UsefulDemandScope.includes(downstream), downstream);
  }
  assert.ok(pack.runtimeIntegration.implementedModules.includes("mc001Chapter2UsefulDemandCalculation.mjs"));
  assert.ok(pack.runtimeIntegration.implementedModules.includes("mc001SolarGainsCalculation.mjs"));
  assert.ok(pack.runtimeIntegration.implementedModules.includes("mc001LatentDemandCalculation.mjs"));
  assert.equal(pack.runtimeIntegration.implementedExport, "chapter_2_useful_demand_explicit_v1");
  assert.ok(pack.runtimeIntegration.outputPolicy.includes("separate_annualQHnd_and_annualQCnd"));
  assert.ok(
    pack.runtimeIntegration.outputPolicy.includes(
      "separate_annual_humidification_and_dehumidification_latent_demands"
    )
  );
  assert.ok(pack.runtimeIntegration.outputPolicy.includes("no_certificate"));
  assert.equal(
    pack.completenessAssessment.remainingGaps.includes("default_material_lambda_catalog_values_not_encoded"),
    false
  );
  assert.equal(
    pack.completenessAssessment.remainingGaps.includes(
      "air_layer_resistance_external_SR_EN_ISO_6946_dependency_not_fabricated"
    ),
    false
  );
  assert.equal(
    pack.completenessAssessment.remainingGaps.includes(
      "solar_climate_irradiation_and_explicit_obstacle_geometry_not_defaulted"
    ),
    false
  );
  assert.equal(
    pack.completenessAssessment.remainingGaps.includes(
      "unheated_adjacent_bztu_default_values_not_fabricated"
    ),
    false
  );
  assert.deepEqual(pack.completenessAssessment.remainingGaps, []);
  assert.equal(
    pack.completenessAssessment.remainingGaps.includes(
      "humidification_dehumidification_relations_2_82_2_83_out_of_useful_demand_scope"
    ),
    false
  );
  assert.equal(
    pack.completenessAssessment.remainingGaps.includes(
      "final_primary_CO2_CPE_certificate_out_of_scope"
    ),
    false
  );
  assert.ok(pack.blockers.includes("not_certificate"));
  assert.ok(pack.blockers.includes("no_hidden_defaults"));
  assert.equal(Object.hasOwn(pack, "formulas"), false);
});

test("R20 Chapter 2 exhaustive coverage matrix classifies all inspected items and closes the gate", () => {
  const pack = chapter2ExhaustiveCoveragePack();
  const matrix = pack.coverageMatrix;
  const allowedStatuses = new Set([
    "runtime_implemented",
    "table_machine_encoded",
    "golden_covered",
    "metadata_only_normative_context",
    "not_runtime_applicable",
    "out_of_chapter_2_runtime_scope",
    "ambiguous_source_requires_human_resolution"
  ]);

  assert.equal(pack.sourcePackCode, R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE);
  assert.equal(pack.machineReadable, true);
  assert.equal(pack.metadataOnly, false);
  assert.equal(
    pack.runtimeCalculatorStatus,
    "executable_chapter_2_coverage_matrix_and_closure_gate"
  );
  assert.equal(matrix.pageRange.firstPage, 41);
  assert.equal(matrix.pageRange.lastPage, 126);
  assert.equal(matrix.pageRange.totalPages, 86);
  assert.equal(matrix.pageInspections.length, 86);
  assert.equal(matrix.relations.length, 87);
  assert.equal(matrix.tables.length, 21);
  assert.equal(matrix.figures.length, 21);
  assert.equal(matrix.conditions.length, 4);
  assert.equal(matrix.completenessMetrics.pagesInspected, 86);
  assert.equal(matrix.completenessMetrics.relationsClassified, 87);
  assert.equal(matrix.completenessMetrics.tablesClassified, 21);
  assert.equal(matrix.completenessMetrics.figuresClassified, 21);
  assert.equal(matrix.completenessMetrics.tablesMachineEncoded, 12);

  for (const pageEntry of matrix.pageInspections) {
    assert.equal(pageEntry.inspectionStatus, "inspected");
    assert.ok(pageEntry.page >= 41 && pageEntry.page <= 126);
  }
  for (const group of [
    matrix.pageInspections,
    matrix.relations,
    matrix.tables,
    matrix.figures,
    matrix.conditions
  ]) {
    for (const item of group) {
      assert.equal(allowedStatuses.has(item.implementationStatus), true, item.identifier);
      assert.notEqual(item.implementationStatus, "unknown");
      assert.notEqual(item.implementationStatus, "unreviewed");
      assert.notEqual(item.implementationStatus, "unclassified");
      assert.equal(item.sourcePack, R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX_SOURCE_PACK_CODE);
    }
  }

  const relationById = new Map(matrix.relations.map((entry) => [entry.identifier, entry]));
  assert.equal(
    relationById.get("MC001_RELATION_2_2").implementationStatus,
    "not_runtime_applicable"
  );
  assert.equal(
    relationById.get("MC001_RELATION_2_2").machineEncodability,
    "not_applicable_relation_number_absent_from_official_pdf_after_full_text_search"
  );
  assert.equal(
    relationById.get("MC001_RELATION_2_5").implementationStatus,
    "not_runtime_applicable"
  );
  assert.equal(relationById.get("MC001_RELATION_2_3").implementationStatus, "golden_covered");
  for (const relationId of [
    "MC001_RELATION_2_36",
    "MC001_RELATION_2_38",
    "MC001_RELATION_2_39",
    "MC001_RELATION_2_50",
    "MC001_RELATION_2_54"
  ]) {
    assert.equal(relationById.get(relationId).implementationStatus, "runtime_implemented");
    assert.equal(relationById.get(relationId).runtimeRelevance, "runtime_dependency");
  }
  assert.equal(
    relationById.get("MC001_RELATION_2_82").implementationStatus,
    "golden_covered"
  );
  assert.equal(
    relationById.get("MC001_RELATION_2_83").implementationStatus,
    "golden_covered"
  );
  assert.equal(
    relationById.get("MC001_RELATION_2_86").implementationStatus,
    "golden_covered"
  );

  const tableById = new Map(matrix.tables.map((entry) => [entry.identifier, entry]));
  assert.equal(tableById.get("MC001_TABLE_2_1").implementationStatus, "not_runtime_applicable");
  assert.equal(
    tableById.get("MC001_TABLE_2_1").machineEncodability,
    "not_runtime_standards_context_table"
  );
  assert.equal(tableById.get("MC001_TABLE_2_1").remainingBlocker, null);
  assert.equal(tableById.get("MC001_TABLE_2_2").implementationStatus, "table_machine_encoded");
  assert.equal(tableById.get("MC001_TABLE_2_11").implementationStatus, "table_machine_encoded");
  assert.equal(tableById.get("MC001_TABLE_2_12").implementationStatus, "table_machine_encoded");
  assert.equal(tableById.get("MC001_TABLE_2_13").implementationStatus, "table_machine_encoded");
  assert.equal(
    tableById.get("MC001_TABLE_2_13").runtimeModule,
    "mc001SolarTransmissionTable2_13.mjs"
  );
  assert.equal(tableById.get("MC001_TABLE_2_14").implementationStatus, "table_machine_encoded");
  assert.equal(
    tableById.get("MC001_TABLE_2_14").runtimeModule,
    "mc001VentilationInfiltrationTable2_14.mjs"
  );
  assert.equal(tableById.get("MC001_TABLE_2_15").implementationStatus, "table_machine_encoded");
  assert.equal(
    tableById.get("MC001_TABLE_2_15").runtimeModule,
    "mc001InternalGainsTable2_15.mjs"
  );
  assert.equal(tableById.get("MC001_TABLE_2_16").implementationStatus, "table_machine_encoded");
  assert.equal(tableById.get("MC001_TABLE_2_16").runtimeModule, "mc001SolarShadingTables.mjs");
  assert.equal(tableById.get("MC001_TABLE_2_17").implementationStatus, "table_machine_encoded");
  assert.equal(tableById.get("MC001_TABLE_2_17").runtimeModule, "mc001SolarShadingTables.mjs");
  assert.equal(tableById.get("MC001_TABLE_2_18").implementationStatus, "table_machine_encoded");
  assert.equal(tableById.get("MC001_TABLE_2_18").runtimeModule, "mc001SolarShadingTables.mjs");
  assert.equal(tableById.get("MC001_TABLE_2_19").implementationStatus, "table_machine_encoded");
  assert.equal(tableById.get("MC001_TABLE_2_20").implementationStatus, "table_machine_encoded");
  assert.equal(
    tableById.get("MC001_TABLE_2_20").runtimeModule,
    "mc001EffectiveInternalHeatCapacityTables.mjs"
  );
  assert.equal(tableById.get("MC001_TABLE_2_21").implementationStatus, "table_machine_encoded");
  assert.equal(
    tableById.get("MC001_TABLE_2_21").runtimeModule,
    "mc001HumidificationTable2_21.mjs"
  );
  assert.equal(tableById.get("MC001_TABLE_2_21").remainingBlocker, null);

  const conditionById = new Map(matrix.conditions.map((entry) => [entry.identifier, entry]));
  assert.equal(
    conditionById.get("MC001_CH2_CONDITION_AIR_LAYER_RESISTANCE_EXTERNAL_SOURCE")
      .implementationStatus,
    "metadata_only_normative_context"
  );

  assert.equal(pack.completenessGate.closureStatus, "CHAPTER_2_CLOSED");
  assert.equal(matrix.completionGate.closureStatus, "CHAPTER_2_CLOSED");
  assert.deepEqual(matrix.completionGate.requiredBeforeClosure, []);
  assert.deepEqual(pack.completenessGate.unresolvedItemIds, []);
  assert.ok(pack.completenessGate.justifiedNonRuntimeItemIds.includes("MC001_RELATION_2_2"));
  assert.ok(pack.completenessGate.justifiedNonRuntimeItemIds.includes("MC001_RELATION_2_5"));
  assert.ok(pack.completenessGate.justifiedNonRuntimeItemIds.includes("MC001_TABLE_2_1"));
  assert.equal(pack.completenessGate.unresolvedItemIds.includes("MC001_TABLE_2_11"), false);
  assert.equal(pack.completenessGate.unresolvedItemIds.includes("MC001_TABLE_2_12"), false);
  assert.equal(pack.completenessGate.unresolvedItemIds.includes("MC001_TABLE_2_13"), false);
  assert.equal(pack.completenessGate.unresolvedItemIds.includes("MC001_TABLE_2_14"), false);
  assert.equal(pack.completenessGate.unresolvedItemIds.includes("MC001_TABLE_2_15"), false);
  assert.equal(pack.completenessGate.unresolvedItemIds.includes("MC001_TABLE_2_16"), false);
  assert.equal(pack.completenessGate.unresolvedItemIds.includes("MC001_TABLE_2_17"), false);
  assert.equal(pack.completenessGate.unresolvedItemIds.includes("MC001_TABLE_2_18"), false);
  assert.equal(pack.completenessGate.unresolvedItemIds.includes("MC001_TABLE_2_19"), false);
  assert.equal(pack.completenessGate.unresolvedItemIds.includes("MC001_TABLE_2_20"), false);
  assert.equal(pack.completenessGate.unresolvedItemIds.includes("MC001_TABLE_2_21"), false);
  assert.equal(pack.blockers.includes("chapter_2_not_closed"), false);
  assert.ok(pack.blockers.includes("no_hidden_defaults"));
  assert.equal(Object.hasOwn(pack, "formulas"), false);
});

test("R21 solar gains source pack machine-encodes explicit monthly solar gains runtime", () => {
  const pack = solarGainsExplicitPack();
  const candidatesByCode = new Map(
    pack.formulaCandidates.map((candidate) => [candidate.candidateCode, candidate])
  );

  assert.equal(pack.sourcePackCode, R21_SOLAR_GAINS_EXPLICIT_FORMULA_SOURCE_PACK_CODE);
  assert.equal(pack.machineReadable, true);
  assert.equal(pack.metadataOnly, false);
  assert.equal(
    pack.runtimeCalculatorStatus,
    "implemented_explicit_monthly_solar_gains_and_adjacent_zone_gain_runtime"
  );
  for (const relation of [
    "2.34",
    "2.36",
    "2.37",
    "2.38",
    "2.39",
    "2.40",
    "2.50",
    "2.51",
    "2.52",
    "2.53",
    "2.54"
  ]) {
    assert.ok(pack.sourceScope.relationsVerified.includes(relation), relation);
  }
  for (const table of ["2.13", "2.16", "2.17", "2.18"]) {
    assert.ok(pack.sourceScope.tablesVerified.includes(table), table);
  }
  for (const page of [83, 84, 102, 104, 105, 108, 109, 110, 111]) {
    assert.ok(pack.sourceScope.pagesVerified.includes(page), page);
  }

  for (const candidateCode of [
    "MC001_R21_RELATION_2_36_SOLAR_GAINS_SINGLE_ZONE",
    "MC001_R21_RELATION_2_37_SOLAR_GAINS_ADJACENT_ZTU",
    "MC001_R21_RELATION_2_38_DIRECT_SOLAR_COMPONENTS",
    "MC001_R21_RELATION_2_39_TRANSPARENT_SOLAR_GAINS",
    "MC001_R21_RELATION_2_40_GLASS_ANGLE_CORRECTION",
    "MC001_R21_RELATION_2_50_OPAQUE_SOLAR_GAINS",
    "MC001_R21_RELATION_2_51_SINGLE_ADJACENT_ZONE_GAIN_REDUCTION",
    "MC001_R21_RELATION_2_52_MULTIPLE_ADJACENT_ZONES_GAIN_REDUCTION",
    "MC001_R21_RELATION_2_53_INTERNAL_ZTU_GAIN_REDUCTION",
    "MC001_R21_RELATION_2_54_SKY_RADIATION",
    "MC001_R21_SOLAR_IRRADIATION_SOURCE_CONTRACT",
    "MC001_R21_OBSTACLE_SHADING_SOURCE_CONTRACT"
  ]) {
    const candidate = candidatesByCode.get(candidateCode);
    assert.ok(candidate, candidateCode);
    assert.ok(
      [
        "verified_for_restricted_runtime",
        "verified_for_explicit_external_contract_runtime"
      ].includes(candidate.runtimeReadiness),
      candidateCode
    );
    assert.equal(typeof candidate.machineExpression, "string");
    assert.ok(candidate.machineExpression.length > 0);
    assert.equal(Array.isArray(candidate.requiredInputs), true);
    assert.ok(candidate.requiredInputs.length > 0);
  }

  const tableByReference = new Map(
    pack.tableDependencies.map((table) => [table.tableReference, table])
  );
  assert.equal(
    tableByReference.get("2.13").runtimeModule,
    "mc001SolarTransmissionTable2_13.mjs"
  );
  assert.equal(tableByReference.get("2.16").runtimeModule, "mc001SolarShadingTables.mjs");
  assert.equal(
    tableByReference.get("2.13").lookupPolicy,
    "explicit_glazing_type_or_explicit_range_value_only"
  );
  assert.equal(
    tableByReference.get("2.16").lookupPolicy,
    "explicit_shading_device_and_mounting_side_only"
  );

  assert.equal(pack.runtimeIntegration.implementedModule, "mc001SolarGainsCalculation.mjs");
  assert.equal(
    pack.runtimeIntegration.adjacentZoneGainIntegrationModule,
    "mc001MonthlyHeatGainsCalculation.mjs"
  );
  assert.equal(
    pack.runtimeIntegration.adjacentZoneGainFormulaCode,
    "MC001_RELATION_2_34_2_37_ADJACENT_UNCONDITIONED_ZONE_GAINS"
  );
  assert.equal(
    pack.runtimeIntegration.implementedEntrypoint,
    "monthly_solar_gains_explicit_v1"
  );
  assert.equal(
    pack.runtimeIntegration.resultScope,
    "monthly_solar_gains_explicit_input_only_not_full_QHnd_QCnd"
  );
  assert.ok(pack.runtimeIntegration.inputPolicy.includes("explicit_inputs_only"));
  assert.ok(pack.runtimeIntegration.inputPolicy.includes("no_hidden_defaults"));
  assert.ok(pack.runtimeIntegration.inputPolicy.includes("no_default_solar_irradiation"));
  assert.ok(pack.runtimeIntegration.inputPolicy.includes("no_default_obstacle_shading"));
  assert.ok(
    pack.runtimeIntegration.inputPolicy.includes(
      "external_solar_irradiation_contract_or_explicit_input"
    )
  );
  assert.ok(
    pack.runtimeIntegration.inputPolicy.includes(
      "external_obstacle_geometry_contract_or_explicit_factor"
    )
  );
  assert.ok(pack.runtimeIntegration.inputPolicy.includes("no_default_sky_radiation"));
  assert.ok(
    pack.remainingExplicitDependencies.includes(
      "solar_irradiation_external_contract_or_explicit_Hsol"
    )
  );
  assert.ok(
    pack.remainingExplicitDependencies.includes(
      "obstacle_shading_external_geometry_contract_or_explicit_factor"
    )
  );
  assert.equal(
    pack.remainingExplicitDependencies.includes(
      "adjacent_unconditioned_zone_solar_gain_terms_relation_2_37"
    ),
    false
  );
  assert.ok(pack.blockers.includes("not_final_energy"));
  assert.ok(pack.blockers.includes("not_primary_energy"));
  assert.ok(pack.blockers.includes("not_CO2"));
  assert.ok(pack.blockers.includes("not_CPE_certificate"));
  assert.ok(pack.blockers.includes("no_hidden_defaults"));
  assert.equal(Object.hasOwn(pack, "formulas"), false);
});

test("R22 latent demand source pack machine-encodes relations 2.82 2.83 and 2.86", () => {
  const pack = latentDemandPack();
  const candidatesByCode = new Map(
    pack.formulaCandidates.map((candidate) => [candidate.candidateCode, candidate])
  );
  const relationByReference = new Map(
    pack.relationMap.map((relation) => [relation.relationReference, relation])
  );

  assert.equal(pack.sourcePackCode, R22_LATENT_DEMAND_SOURCE_PACK_CODE);
  assert.equal(pack.machineReadable, true);
  assert.equal(pack.metadataOnly, false);
  assert.equal(
    pack.runtimeCalculatorStatus,
    "implemented_explicit_chapter_2_latent_humidification_dehumidification_runtime"
  );
  assert.deepEqual(pack.sourceScope.relationsVerified, ["2.82", "2.83", "2.86"]);
  assert.ok(pack.sourceScope.tablesVerified.includes("2.21"));
  for (const page of [123, 124, 125]) {
    assert.ok(pack.sourceScope.pagesVerified.includes(page), page);
  }
  assert.equal(
    relationByReference.get("2.82").scopeClassification,
    "latent_humidification_runtime_ready"
  );
  assert.equal(
    relationByReference.get("2.83").scopeClassification,
    "latent_dehumidification_runtime_ready"
  );
  assert.equal(
    relationByReference.get("2.86").scopeClassification,
    "annual_latent_runtime_ready"
  );

  for (const candidateCode of [
    "MC001_R22_RELATION_2_82_HUMIDIFICATION_LATENT_DEMAND",
    "MC001_R22_RELATION_2_83_DEHUMIDIFICATION_LATENT_DEMAND",
    "MC001_R22_RELATION_2_86_ANNUAL_LATENT_DEMAND"
  ]) {
    const candidate = candidatesByCode.get(candidateCode);
    assert.ok(candidate, candidateCode);
    assert.equal(candidate.runtimeReadiness, "verified_for_explicit_runtime");
    assert.equal(typeof candidate.machineExpression, "string");
    assert.ok(candidate.machineExpression.length > 0);
    assert.ok(candidate.requiredInputs.length > 0);
  }
  assert.equal(
    pack.runtimeIntegration.implementedModule,
    "mc001LatentDemandCalculation.mjs"
  );
  assert.equal(
    pack.runtimeIntegration.integrationModule,
    "mc001Chapter2UsefulDemandCalculation.mjs"
  );
  assert.ok(pack.runtimeIntegration.outputPolicy.includes("not_final_energy"));
  assert.ok(pack.runtimeIntegration.inputPolicy.includes("no_hidden_defaults"));
  assert.ok(
    pack.externalDependencies.some(
      dependency =>
        dependency.dependencyCode === "PEC_M7_1_SR_EN_16798_3_DEHUMIDIFICATION_FRACTION"
    )
  );
  assert.ok(pack.blockers.includes("not_certificate"));
  assert.equal(Object.hasOwn(pack, "formulas"), false);
});
