import assert from "node:assert/strict";
import { runMc001ReadOnlySavedAnalysisDiagnosticDryRun } from "../mc001ReadOnlySavedAnalysisDiagnosticDryRunRunner.mjs";
import {
  MC001_DB6_DIAGNOSTIC_SCHEMA_VERSION,
  MC001_DB6_FORBIDDEN_SERIALIZED_TERMS,
  mc001Db6ReadOnlyDiagnosticFixtures
} from "./fixtures/mc001Db6ReadOnlyDiagnosticFixtures.mjs";

const SAFE_DIAGNOSTIC_CODES = Object.freeze([
  "blocked_missing_explicit_mc001_readiness_mapping",
  "blocked_missing_ztu_zone_mapping",
  "blocked_missing_hu_inventory_mapping",
  "blocked_missing_u_value_path",
  "blocked_missing_bztu_path",
  "unknown_blocker",
  "unknown_warning",
  "unknown_gap",
  "diagnostic_content_sanitized",
  "source_context_sanitized",
  "source_identifiers_sanitized",
  "source_trace_sanitized"
]);

const FORBIDDEN_RESULT_KEYS = Object.freeze([
  "huResult",
  "htrResult",
  "qHndResult",
  "finalEnergyResult",
  "primaryEnergyResult",
  "co2Result",
  "certificateResult",
  "reportResult"
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

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

function hasKeyDeep(value, forbiddenKey) {
  if (Array.isArray(value)) {
    return value.some((entry) => hasKeyDeep(entry, forbiddenKey));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, child]) => key === forbiddenKey || hasKeyDeep(child, forbiddenKey)
    );
  }
  return false;
}

function diagnosticCodes(contract, section) {
  return contract.diagnostics[section].map((entry) => entry.code);
}

function allDiagnosticCodes(contract) {
  return [
    ...diagnosticCodes(contract, "blockers"),
    ...diagnosticCodes(contract, "warnings"),
    ...diagnosticCodes(contract, "gaps")
  ];
}

function assertNoForbiddenTerms(contract, forbiddenTerms) {
  const serialized = JSON.stringify(contract);
  for (const term of forbiddenTerms) {
    assert.equal(serialized.includes(term), false, `${term} leaked`);
  }
}

function assertNoForbiddenResultKeys(contract) {
  for (const key of FORBIDDEN_RESULT_KEYS) {
    assert.equal(hasKeyDeep(contract, key), false, `${key} must not be emitted`);
  }
}

function assertReadiness(actual, expected) {
  assert.deepEqual(actual, expected);
  assert.equal(actual.isCompleteHuReady, false);
  assert.equal(actual.isCompleteHtrReady, false);
  assert.equal(actual.hasHuResult, false);
  assert.equal(actual.hasHtrResult, false);
  assert.equal(actual.downstreamReadiness, false);
}

function assertPipeline(actual, expected) {
  assert.deepEqual(actual.mapper, expected.mapper);
  assert.deepEqual(actual.orchestrator, expected.orchestrator);
}

function assertContractScope(contract, expectedScope) {
  assert.deepEqual(contract.contractScope, expectedScope);
}

function assertExpectedCodes(contract, expected) {
  const emittedCodes = allDiagnosticCodes(contract);
  for (const code of expected.expectedDiagnosticCodes) {
    assert.ok(emittedCodes.includes(code), `${code} missing`);
  }
  for (const code of expected.expectedPrivacyWarnings) {
    assert.ok(diagnosticCodes(contract, "warnings").includes(code), `${code} missing`);
  }
  for (const code of emittedCodes) {
    assert.ok(SAFE_DIAGNOSTIC_CODES.includes(code), `${code} is not allowlisted`);
  }
}

function assertNoRawSections(contract) {
  for (const key of [
    "snapshot",
    "rawSnapshot",
    "answers",
    "sourceContext",
    "sourceTrace",
    "sourceLocator",
    "sourceRefs",
    "sourceRecordId"
  ]) {
    assert.equal(hasKeyDeep(contract, key), false, `${key} must not be emitted`);
  }
}

test("DB6 exposes the expected fixture set", () => {
  assert.deepEqual(
    mc001Db6ReadOnlyDiagnosticFixtures.map((fixture) => fixture.fixtureId),
    [
      "DB6_GENERIC_SAVED_APP_NOT_MAPPABLE",
      "DB6_INCOMPLETE_EXPLICIT_MC001_MAPPING",
      "DB6_HU_INVENTORY_READY_EXPLICIT_MAPPING",
      "DB6_ADVERSARIAL_PRIVACY_SENTINELS",
      "DB6_SOURCE_PROVENANCE_GAP"
    ]
  );
});

for (const fixture of mc001Db6ReadOnlyDiagnosticFixtures) {
  test(`${fixture.fixtureId} matches DB5 golden diagnostic contract`, () => {
    const snapshotBefore = clone(fixture.snapshot);
    deepFreeze(fixture.snapshot);

    const contract = runMc001ReadOnlySavedAnalysisDiagnosticDryRun(fixture.snapshot);

    assert.equal(contract.schemaVersion, MC001_DB6_DIAGNOSTIC_SCHEMA_VERSION);
    assert.equal(contract.schemaVersion, fixture.expected.schemaVersion);
    assert.equal(contract.isReadOnlyDiagnosticContract, true);
    assert.equal(
      contract.isReadOnlyDiagnosticContract,
      fixture.expected.isReadOnlyDiagnosticContract
    );
    assert.equal(contract.status, fixture.expected.status);
    assertPipeline(contract.pipeline, fixture.expected.pipeline);
    assertReadiness(contract.readiness, fixture.expected.readiness);
    assert.deepEqual(contract.counts, fixture.expected.counts);
    assertContractScope(contract, fixture.expected.contractScope);
    assertExpectedCodes(contract, fixture.expected);
    assertNoForbiddenTerms(contract, fixture.expected.forbiddenSerializedTerms);
    assertNoForbiddenTerms(contract, MC001_DB6_FORBIDDEN_SERIALIZED_TERMS);
    assertNoForbiddenResultKeys(contract);
    assertNoRawSections(contract);
    assert.deepEqual(fixture.snapshot, snapshotBefore);
  });
}

test("DB6 fixture outputs remain DB4 diagnostics-only without wrapper fields", () => {
  for (const fixture of mc001Db6ReadOnlyDiagnosticFixtures) {
    const contract = runMc001ReadOnlySavedAnalysisDiagnosticDryRun(fixture.snapshot);

    assert.equal("runnerId" in contract, false);
    assert.equal("pipelineStage" in contract, false);
    assert.equal(contract.privacy.sanitized, true);
    assert.equal(contract.readiness.isCompleteHuReady, false);
    assert.equal(contract.readiness.isCompleteHtrReady, false);
    assert.equal(contract.readiness.hasHuResult, false);
    assert.equal(contract.readiness.hasHtrResult, false);
    assert.equal(contract.readiness.downstreamReadiness, false);
  }
});

test("DB6 fixture module uses only synthetic anonymized privacy sentinels", () => {
  const fixtureText = JSON.stringify(mc001Db6ReadOnlyDiagnosticFixtures);

  for (const disallowedRealDataHint of [
    "Sălicea",
    "Salicea",
    "demo-house",
    "lemnaru",
    "@gmail.com",
    "@yahoo.com",
    "@outlook.com"
  ]) {
    assert.equal(
      fixtureText.toLowerCase().includes(disallowedRealDataHint.toLowerCase()),
      false,
      `${disallowedRealDataHint} must not appear in DB6 fixtures`
    );
  }
});
