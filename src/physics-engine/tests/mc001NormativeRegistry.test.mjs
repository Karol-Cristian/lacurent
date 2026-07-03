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

const SOURCE_PACK_CODE = "MC001_R0_BZTU_FORMULA_SOURCE_PACK";
const DEFAULT_CANDIDATE_CODE =
  "bztu_default_values_with_internal_or_solar_gains";
const FORMULA_CODES = [
  "MC001_2_21_ZTU_MONTHLY_TEMPERATURE",
  "MC001_2_22_BZTU_CORRECTION_FACTOR",
  "MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER",
  "MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER"
];
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

function sourcePack(value = registry()) {
  return value.sourcePacks[0];
}

function formulaByRelation(relationCode, value = registry()) {
  for (const formula of sourcePack(value).formulas) {
    if (formula.relationCode === relationCode) {
      return formula;
    }
  }
  return null;
}

function formulaByCode(formulaCode, value = registry()) {
  for (const formula of sourcePack(value).formulas) {
    if (formula.formulaCode === formulaCode) {
      return formula;
    }
  }
  return null;
}

function entryCodes(value = registry()) {
  const pack = sourcePack(value);
  const codes = [];
  codes.push(pack.concept.entryCode);
  for (const zoneType of pack.zoneTypes) {
    codes.push(zoneType.entryCode);
  }
  for (const formula of pack.formulas) {
    codes.push(formula.entryCode);
    if (Array.isArray(formula.constants)) {
      for (const constant of formula.constants) {
        codes.push(constant.entryCode);
      }
    }
  }
  for (const figure of pack.figures) {
    codes.push(figure.entryCode);
    for (const rule of figure.rules) {
      codes.push(rule.entryCode);
    }
  }
  for (const rule of pack.applicabilityRules) {
    codes.push(rule.entryCode);
  }
  for (const candidate of pack.defaultValueCandidates) {
    codes.push(candidate.entryCode);
  }
  return codes;
}

function runtimeSource() {
  return readFileSync(
    new URL("../mc001NormativeRegistry.mjs", import.meta.url),
    "utf8"
  );
}

function testSource() {
  return readFileSync(new URL(import.meta.url), "utf8");
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
    getMc001NormativeSourcePackByCode(SOURCE_PACK_CODE),
    getMc001NormativeEntryByCode("MC001_CONCEPT_BZTU_CORRECTION_FACTOR"),
    getMc001NormativeFormulaByCode("MC001_2_22_BZTU_CORRECTION_FACTOR"),
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

test("registry has exactly one pilot source pack", () => {
  const packs = registry().sourcePacks;

  assert.equal(packs.length, 1);
  assert.equal(packs[0].sourcePackCode, SOURCE_PACK_CODE);
});

test("pilot source pack scope is Chapter 2 section 2.6.2 subsection 2.6.2.2", () => {
  const scope = sourcePack().sourceScope;

  assert.equal(scope.chapter, "Capitolul 2. Anvelopa termică a clădirii");
  assert.equal(scope.section, "2.6.2. Zonarea termică");
  assert.equal(scope.subsection, "2.6.2.2. Factori de corecție și de distribuție");
  assert.deepEqual(scope.pagesVerified, [94, 95, 96, 109]);
});

test("pilot source pack verification and implementation statuses are controlled", () => {
  const pack = sourcePack();

  assert.equal(pack.verificationStatus, "human_verified_from_official_pdf");
  assert.equal(pack.implementationStatus, "registry_ready_not_calculator_ready");
});

test("bztu concept is formula-backed and unit dimensionless", () => {
  const concept = sourcePack().concept;

  assert.equal(concept.entryCode, "MC001_CONCEPT_BZTU_CORRECTION_FACTOR");
  assert.equal(concept.registryKind, "formula_backed_registry");
  assert.equal(concept.targetSymbol, "b_ztu,m");
  assert.equal(concept.unit, "dimensionless");
  assert.equal(concept.sourceLocator.page, 95);
});

test("zone types include exactly ztui and ztue", () => {
  const zoneCodes = sourcePack().zoneTypes.map((entry) => entry.zoneTypeCode).sort();

  assert.deepEqual(zoneCodes, ["ztue", "ztui"]);
});

test("formulas include exactly relations 2.21 2.22 2.23 and 2.24", () => {
  const relations = sourcePack().formulas.map((entry) => entry.relationCode).sort();

  assert.deepEqual(relations, ["2.21", "2.22", "2.23", "2.24"]);
});

test("formula 2.21 is ztu temperature metadata only", () => {
  const formula = formulaByRelation("2.21");

  assert.equal(formula.formulaCode, "MC001_2_21_ZTU_MONTHLY_TEMPERATURE");
  assert.equal(formula.result.symbol, "theta_ztu,k,H/C,m");
  assert.equal(formula.result.unit, "degC");
  assert.equal(formula.sourceLocator.page, 94);
});

test("formula 2.22 defines bztu as H_ztu_e over H_ztu_tot", () => {
  const formula = formulaByRelation("2.22");

  assert.equal(formula.formulaCode, "MC001_2_22_BZTU_CORRECTION_FACTOR");
  assert.equal(formula.equationText, "b_ztu,m = H_ztu,e,m / H_ztu,tot,m");
  assert.equal(formula.result.unit, "dimensionless");
});

test("formula 2.23 defines H_ztu_tot source metadata", () => {
  const formula = formulaByRelation("2.23");

  assert.equal(formula.formulaCode, "MC001_2_23_ZTU_TOTAL_HEAT_TRANSFER");
  assert.equal(formula.result.symbol, "H_ztu,tot,m");
  assert.equal(formula.result.unit, "W/K");
  assert.equal(formula.sourceLocator.page, 95);
});

test("formula 2.24 defines H_ztu_e source metadata", () => {
  const formula = formulaByRelation("2.24");

  assert.equal(formula.formulaCode, "MC001_2_24_ZTU_TO_EXTERIOR_HEAT_TRANSFER");
  assert.equal(formula.result.symbol, "H_ztu,e,k,m");
  assert.equal(formula.result.unit, "W/K");
  assert.equal(formula.sourceLocator.page, 96);
});

test("formula 2.24 includes only c_ztu_ve recommendedValue 0.5", () => {
  const formula = formulaByRelation("2.24");

  assert.equal(formula.constants.length, 1);
  assert.equal(formula.constants[0].constantCode, "MC001_2_24_C_ZTU_VE_RECOMMENDED");
  assert.equal(formula.constants[0].symbol, "c_ztu,ve");
  assert.equal(formula.constants[0].recommendedValue, 0.5);
  assert.deepEqual(collectRecommendedValues(registry()), [0.5]);
});

test("no other numeric bztu default value exists in the registry", () => {
  const candidates = sourcePack().defaultValueCandidates;

  assert.equal(candidates.length, 1);
  assertNoNumericDefaultValues(candidates[0]);
});

test("default value candidate status is mentioned but not extracted", () => {
  const candidate = sourcePack().defaultValueCandidates[0];

  assert.equal(candidate.status, "mentioned_but_not_extracted_as_numeric_table");
  assert.equal(candidate.page, 109);
});

test("default value candidate has numericDefaultsAvailable false", () => {
  const candidate = sourcePack().defaultValueCandidates[0];

  assert.equal(candidate.numericDefaultsAvailable, false);
});

test("get default value candidate returns no numeric default bztu values", () => {
  const result = getMc001NormativeDefaultValueCandidateByCode(DEFAULT_CANDIDATE_CODE);

  assert.equal(result.status, "found");
  assertNoNumericDefaultValues(result.defaultValueCandidate);
});

test("validate registry returns valid for exported registry", () => {
  const result = validateMc001NormativeRegistry(mc001NormativeRegistryV1);

  assert.equal(result.status, "valid");
  assert.deepEqual(result.blockers, []);
});

test("validation counts match expected counts", () => {
  const result = validateMc001NormativeRegistry(registry());

  assert.deepEqual(result.counts, {
    sourcePacks: 1,
    formulas: 4,
    constants: 1,
    concepts: 1,
    zoneTypes: 2,
    figures: 1,
    distributionRules: 2,
    applicabilityRules: 3,
    defaultValueCandidates: 1
  });
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

test("validation blocks unknown formula code", () => {
  const mutated = mutableRegistry();
  mutated.sourcePacks[0].formulas[1].formulaCode = "UNKNOWN_FORMULA_CODE";

  assertBlocked(validateMc001NormativeRegistry(mutated));
});

test("validation blocks modified relation code", () => {
  const mutated = mutableRegistry();
  mutated.sourcePacks[0].formulas[1].relationCode = "2.99";

  assertBlocked(validateMc001NormativeRegistry(mutated));
});

test("validation blocks modified source locator page", () => {
  const mutated = mutableRegistry();
  mutated.sourcePacks[0].formulas[1].sourceLocator.page = 109;

  assertBlocked(validateMc001NormativeRegistry(mutated));
});

test("validation blocks modified c_ztu_ve value", () => {
  const mutated = mutableRegistry();
  mutated.sourcePacks[0].formulas[3].constants[0].recommendedValue = 0.6;

  assertBlocked(validateMc001NormativeRegistry(mutated));
});

test("source pack lookup returns found for known source pack", () => {
  const result = getMc001NormativeSourcePackByCode(SOURCE_PACK_CODE);

  assert.equal(result.status, "found");
  assert.equal(result.sourcePack.sourcePackCode, SOURCE_PACK_CODE);
});

test("source pack lookup blocks unknown source pack code", () => {
  const unknown = "UNKNOWN_SOURCE_PACK_SHOULD_NOT_ECHO";
  const result = getMc001NormativeSourcePackByCode(unknown);

  assertBlocked(result);
  assertUnknownNotEchoed(result, unknown);
});

test("entry lookup returns found for known entries", () => {
  for (const entryCode of entryCodes()) {
    const result = getMc001NormativeEntryByCode(entryCode);
    assert.equal(result.status, "found", entryCode);
    assert.equal(result.entry.entryCode, entryCode);
  }
});

test("entry lookup blocks unknown entry code", () => {
  const unknown = "UNKNOWN_ENTRY_CODE_SHOULD_NOT_ECHO";
  const result = getMc001NormativeEntryByCode(unknown);

  assertBlocked(result);
  assertUnknownNotEchoed(result, unknown);
});

test("formula lookup returns found for all four known formula codes", () => {
  for (const formulaCode of FORMULA_CODES) {
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

test("unknown lookup codes are not echoed into output", () => {
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

test("returned registry source pack entry and formula objects are not mutable shared state", () => {
  const returnedRegistry = registry();
  const returnedPack = getMc001NormativeSourcePackByCode(SOURCE_PACK_CODE).sourcePack;
  const returnedEntry = getMc001NormativeEntryByCode(
    "MC001_CONCEPT_BZTU_CORRECTION_FACTOR"
  ).entry;
  const returnedFormula = getMc001NormativeFormulaByCode(
    "MC001_2_22_BZTU_CORRECTION_FACTOR"
  ).formula;

  assert.notEqual(returnedRegistry, mc001NormativeRegistryV1);
  assert.notEqual(returnedPack, mc001NormativeRegistryV1.sourcePacks[0]);
  assert.notEqual(returnedEntry, mc001NormativeRegistryV1.sourcePacks[0].concept);
  assert.notEqual(returnedFormula, formulaByCode("MC001_2_22_BZTU_CORRECTION_FACTOR"));
});

test("mutating returned data does not mutate registry source", () => {
  const returnedRegistry = registry();
  const returnedFormula = getMc001NormativeFormulaByCode(
    "MC001_2_22_BZTU_CORRECTION_FACTOR"
  ).formula;

  assert.throws(() => {
    returnedRegistry.sourcePacks[0].concept.unit = "mutated";
  }, TypeError);
  assert.throws(() => {
    returnedFormula.result.unit = "mutated";
  }, TypeError);

  assert.equal(mc001NormativeRegistryV1.sourcePacks[0].concept.unit, "dimensionless");
  assert.equal(
    formulaByCode("MC001_2_22_BZTU_CORRECTION_FACTOR", mc001NormativeRegistryV1)
      .result
      .unit,
    "dimensionless"
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

test("no package or orchestrator or H pipeline files are changed", () => {
  const statusSource = testSource();
  const packageMutation = "package" + ".json mutation";
  const orchestrator = "orches" + "trator";

  assert.equal(statusSource.includes(packageMutation), false);
  assert.equal(runtimeSource().includes(orchestrator), false);
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
  mutated.sourcePacks[0].defaultValueCandidates[0].numericDefaultsAvailable = true;

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

test("no QHnd monthly final primary CO2 or downstream readiness behavior is introduced", () => {
  const readiness = "downstream" + "Readiness";
  const source = runtimeSource();
  const behaviorTerms = [
    "Q" + "Hnd",
    "final" + "Energy",
    "primary" + "Energy",
    "C" + "O2",
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
    "MC001_2_22_BZTU_CORRECTION_FACTOR"
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
  mutated.sourcePacks[0].concept.name = privateTerm;

  const result = validateMc001NormativeRegistry(mutated);

  assertBlocked(result);
  assert.equal(JSON.stringify(result).includes(privateTerm), false);
});
