import assert from "node:assert/strict";
import { createMc001HuMultiComponentInventoryReadinessGate } from "../../mc001HuMultiComponentInventoryReadinessGate.mjs";
import { fixture029HuMultiComponentInventoryReadinessGate as fixture } from "./fixture029HuMultiComponentInventoryReadinessGate.mjs";

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
  return createMc001HuMultiComponentInventoryReadinessGate(inputPack);
}

test("documents Fixture 029 Phase H2H scope without formula expansion", () => {
  assert.equal(
    fixture.fixtureId,
    "FIXTURE_029_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE"
  );
  assert.equal(
    fixture.fixtureType,
    "phase_h2h_hu_multi_component_inventory_readiness_gate"
  );
  assert.ok(fixture.scope.includes("Physics Engine"));
  assert.ok(fixture.exclusions.includes("no numerical Hu calculation"));
  assert.ok(fixture.exclusions.includes("no Hu aggregation"));
  assert.ok(fixture.exclusions.includes("no complete Hu readiness"));
  assert.ok(fixture.exclusions.includes("no complete Htr readiness"));
  assert.ok(fixture.exclusions.includes("no A * U * bztu calculation"));
  assert.ok(fixture.exclusions.includes("no full BZTU derivation"));
  assert.ok(fixture.exclusions.includes("no Hztu;e implementation"));
  assert.ok(fixture.exclusions.includes("no Hztu;tot implementation"));
  assert.ok(fixture.exclusions.includes("no monthly heating readiness"));
  assert.ok(fixture.exclusions.includes("no QHnd readiness"));
  assert.ok(fixture.exclusions.includes("no CPE/report/certificate workflow"));
  assert.ok(fixture.exclusions.includes("no UI/API/DB/Worker/deploy/product integration"));
  assert.ok(fixture.exclusions.includes("no new MC001 calculation formula"));
});

test("validates narrow multi-component Hu inventory through the Phase H2H gate", () => {
  const result = build();

  assert.equal(result.status, fixture.expected.gateStatus);
  assert.equal(result.inventoryStatus, fixture.expected.inventoryStatus);
  assert.equal(result.month, fixture.expected.month);
  assert.deepEqual(result.conditionedZoneIds, fixture.expected.conditionedZoneIds);
  assert.deepEqual(result.ztuZoneIds, fixture.expected.ztuZoneIds);
  assert.equal(result.componentCount, fixture.expected.componentCount);
  assert.equal(result.readyComponentCount, fixture.expected.readyComponentCount);
  assert.equal(result.blockedComponentCount, fixture.expected.blockedComponentCount);
  assert.equal(result.readinessFlags.isHuInventoryReady, true);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isQhndReady, false);
  assert.equal(result.readinessFlags.isCpeReady, false);
  assert.equal("huResult" in result, false);
  assert.equal("htrResult" in result, false);
});

test("preserves Hu inventory component and BZTU source traces", () => {
  const result = build();

  assert.ok(
    result.sourceTrace.records.some(
      (entry) =>
        entry.componentId === "hu_multi_component_inventory" &&
        entry.traceId === "FIXTURE_029_HU_INVENTORY_TRACE_001"
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

test("missing expected component keeps inventory readiness blocked", () => {
  const result = build(fixture.invalidInputPacks.missingExpectedComponent);

  assert.equal(result.readinessFlags.isHuInventoryReady, false);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.ok(
    result.diagnostics.some((entry) => entry.code === "blocked_missing_hu_component")
  );
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "blocked_partial_inventory_escalation"
    )
  );
});

test("unexpected actual component keeps inventory readiness blocked", () => {
  const result = build(fixture.invalidInputPacks.unexpectedActualComponent);

  assert.equal(result.readinessFlags.isHuInventoryReady, false);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.ok(
    result.diagnostics.some((entry) => entry.code === "blocked_unexpected_hu_component")
  );
  assert.equal(result.unexpectedComponents.length, 1);
});

test("duplicate component id keeps inventory readiness blocked", () => {
  const result = build(fixture.invalidInputPacks.duplicateComponentId);

  assert.equal(result.readinessFlags.isHuInventoryReady, false);
  assert.ok(
    result.diagnostics.some((entry) => entry.code === "blocked_duplicate_component_id")
  );
});

test("wrong BZTU month keeps inventory readiness blocked", () => {
  const result = build(fixture.invalidInputPacks.wrongBztuMonth);

  assert.equal(result.readinessFlags.isHuInventoryReady, false);
  assert.ok(
    result.diagnostics.some((entry) => entry.code === "blocked_bztu_scope_mismatch")
  );
});

test("input cannot force partial Hu inventory readiness", () => {
  const result = build(fixture.invalidInputPacks.partialInventoryEscalation);

  assert.equal(result.readinessFlags.isHuInventoryReady, false);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "blocked_hu_inventory_readiness_escalation"
    )
  );
});
