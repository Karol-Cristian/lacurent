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
  sourcePacks: 5,
  formulas: 10,
  constants: 1,
  concepts: 5,
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

test("registry now contains exactly five source packs", () => {
  const packs = registry().sourcePacks;

  assert.equal(packs.length, 5);
  assert.deepEqual(
    packs.map((pack) => pack.sourcePackCode).sort(),
    [
      R0_BZTU_SOURCE_PACK_CODE,
      R2_HTR_SPINE_SOURCE_PACK_CODE,
      R2_MONTHLY_SOURCE_PACK_CODE,
      R3_QHND_MONTHLY_SOURCE_PACK_CODE,
      R4_FIGURE_2_18_HEATING_BRANCH_SOURCE_PACK_CODE
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

test("validation counts match R4 expected aggregate counts", () => {
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
    R3_QHND_MONTHLY_SOURCE_PACK_CODE
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
    "mc001Hu",
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
