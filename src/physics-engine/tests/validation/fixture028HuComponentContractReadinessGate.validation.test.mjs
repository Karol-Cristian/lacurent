import assert from "node:assert/strict";
import { createMc001HuComponentContractReadinessGate } from "../../mc001HuComponentContractReadinessGate.mjs";
import { fixture028HuComponentContractReadinessGate as fixture } from "./fixture028HuComponentContractReadinessGate.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function build(inputPack = fixture.inputPack) {
  return createMc001HuComponentContractReadinessGate(inputPack);
}

test("documents Fixture 028 Phase H2E scope without formula expansion", () => {
  assert.equal(fixture.fixtureId, "FIXTURE_028_HU_COMPONENT_CONTRACT_READINESS_GATE");
  assert.equal(fixture.fixtureType, "phase_h2e_hu_component_contract_readiness_gate");
  assert.ok(fixture.scope.includes("Physics Engine"));
  assert.ok(fixture.exclusions.includes("no numerical Hu calculation"));
  assert.ok(fixture.exclusions.includes("no complete Hu readiness"));
  assert.ok(fixture.exclusions.includes("no complete Htr readiness"));
  assert.ok(fixture.exclusions.includes("no full BZTU derivation"));
  assert.ok(fixture.exclusions.includes("no Hztu;e implementation"));
  assert.ok(fixture.exclusions.includes("no Hztu;tot implementation"));
  assert.ok(fixture.exclusions.includes("no monthly heating readiness"));
  assert.ok(fixture.exclusions.includes("no QHnd readiness"));
  assert.ok(fixture.exclusions.includes("no CPE/report/certificate workflow"));
  assert.ok(fixture.exclusions.includes("no UI/API/DB/Worker/deploy/product integration"));
  assert.ok(fixture.exclusions.includes("no new MC001 calculation formula"));
});

test("validates narrow Hu component contract through the Phase H2E gate", () => {
  const result = build();

  assert.equal(result.status, fixture.expected.gateStatus);
  assert.equal(result.componentStatus, fixture.expected.componentStatus);
  assert.equal(result.conditionedZoneId, fixture.expected.conditionedZoneId);
  assert.equal(result.ztuZoneId, fixture.expected.ztuZoneId);
  assert.equal(result.month, fixture.expected.month);
  assert.equal(result.elementId, fixture.expected.elementId);
  assert.equal(result.area.value, fixture.expected.areaValue);
  assert.equal(result.readinessFlags.isHuComponentReady, true);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isQhndReady, false);
  assert.equal(result.readinessFlags.isCpeReady, false);
});

test("preserves Hu component and BZTU source traces", () => {
  const result = build();

  assert.ok(
    result.sourceTrace.records.some(
      (entry) =>
        entry.componentId === "hu_component_contract" &&
        entry.traceId === "FIXTURE_028_HU_COMPONENT_TRACE_001"
    )
  );
  assert.ok(
    result.sourceTrace.records.some(
      (entry) =>
        entry.componentId === "bztu" &&
        entry.recordId === "MC001_2022_2_22_BZTU_CORRECTION_FACTOR"
    )
  );
});

test("wrong BZTU month keeps Hu component readiness blocked", () => {
  const result = build(fixture.invalidInputPacks.wrongBztuMonth);

  assert.equal(result.readinessFlags.isHuComponentReady, false);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.ok(
    result.diagnostics.some((entry) => entry.code === "blocked_bztu_scope_mismatch")
  );
});

test("missing U-value source keeps Hu component readiness blocked", () => {
  const result = build(fixture.invalidInputPacks.missingUValueSource);

  assert.equal(result.readinessFlags.isHuComponentReady, false);
  assert.ok(
    result.diagnostics.some((entry) => entry.code === "blocked_invalid_u_value_source")
  );
});

test("raw Hu input remains rejected", () => {
  const result = build(fixture.invalidInputPacks.rawHuInput);

  assert.equal(result.status, "rejected");
  assert.equal(result.readinessFlags.isHuComponentReady, false);
  assert.ok(
    result.diagnostics.some((entry) => entry.code === "rejected_hu_raw_auditor_input")
  );
});

test("missing Hg and Ha cannot be promoted to fake zeroes", () => {
  const result = build(fixture.invalidInputPacks.fakeZeroHtrComponents);

  assert.equal(result.readinessFlags.isHuComponentReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "blocked_fake_zero_transmission_component"
    )
  );
});
