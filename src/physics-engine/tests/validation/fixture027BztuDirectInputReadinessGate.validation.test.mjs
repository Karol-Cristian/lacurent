import assert from "node:assert/strict";
import { createMc001AuditorCoreReadinessOrchestrator } from "../../mc001AuditorCoreReadinessOrchestrator.mjs";
import { createMc001BztuDirectInputGate } from "../../mc001BztuDirectInputGate.mjs";
import {
  fixture027BztuDirectInputReadinessGate as fixture,
  validBztuDirectInput
} from "./fixture027BztuDirectInputReadinessGate.mjs";

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
  return createMc001AuditorCoreReadinessOrchestrator(inputPack, {
    registry: fixture.registry
  });
}

test("documents Fixture 027 Phase H1 scope without formula expansion", () => {
  assert.equal(fixture.fixtureId, "FIXTURE_027_BZTU_DIRECT_INPUT_READINESS_GATE");
  assert.equal(fixture.fixtureType, "phase_h1_bztu_direct_input_readiness_gate");
  assert.ok(fixture.scope.includes("Physics Engine"));
  assert.ok(fixture.exclusions.includes("no full BZTU derivation"));
  assert.ok(fixture.exclusions.includes("no Hu calculation from bztu"));
  assert.ok(fixture.exclusions.includes("no complete Htr readiness"));
  assert.ok(fixture.exclusions.includes("no monthly heating readiness"));
  assert.ok(fixture.exclusions.includes("no QHnd readiness"));
  assert.ok(fixture.exclusions.includes("no CPE/report/certificate workflow"));
  assert.ok(fixture.exclusions.includes("no UI/API/DB/Worker/deploy/product integration"));
  assert.ok(fixture.exclusions.includes("no new MC001 calculation formula"));
});

test("validates direct BZTU input through the Phase H1 gate", () => {
  const result = createMc001BztuDirectInputGate(fixture.inputPack);

  assert.equal(result.status, fixture.expected.bztuGateStatus);
  assert.equal(result.acceptedInputs.length, 1);
  assert.equal(result.acceptedInputs[0].recordId, fixture.expected.bztuRecordId);
  assert.equal(result.acceptedInputs[0].unit, fixture.expected.bztuUnit);
  assert.equal(result.acceptedInputs[0].month, fixture.expected.bztuMonth);
  assert.equal(result.acceptedInputs[0].ztuZoneId, fixture.expected.bztuZoneId);
  assert.equal(
    result.acceptedInputs[0].inputClassification,
    fixture.expected.bztuInputClassification
  );
  assert.equal(result.readinessFlags.isFullBztuDerivationReady, false);
});

test("exposes BZTU readiness through the auditor core orchestrator", () => {
  const result = build();

  assert.equal(result.bztuDirectInputReadiness.status, fixture.expected.bztuGateStatus);
  assert.equal(result.readinessFlags.isBztuDirectInputReady, true);
  assert.equal(result.readinessFlags.isFullBztuDerivationReady, false);
  assert.equal(
    result.transmissionReadiness.componentReadiness.Htr.status,
    fixture.expected.htrStatus
  );
  assert.equal(result.readinessFlags.isHeatLossReady, fixture.expected.isHeatLossReady);
  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isQhndReady, false);
  assert.equal(result.readinessFlags.isCpeReady, false);
  assert.equal(result.readinessFlags.isProductionIntegrationReady, false);
});

test("preserves BZTU provenance and source trace", () => {
  const result = build();

  assert.deepEqual(result.sourceTrace.bztu.records[0].sourceRefs, [
    fixture.expected.bztuRecordId
  ]);
  assert.equal(result.sourceTrace.bztu.records[0].ztuZoneId, fixture.expected.bztuZoneId);
  assert.equal(result.sourceTrace.bztu.records[0].month, fixture.expected.bztuMonth);
});

test("missing BZTU source remains rejected and blocks readiness", () => {
  const result = build(fixture.invalidInputPacks.missingSource);

  assert.equal(result.bztuDirectInputReadiness.status, "rejected");
  assert.equal(result.readinessFlags.isBztuDirectInputReady, false);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
  assert.ok(
    result.diagnostics.some((entry) => entry.code === "rejected_bztu_missing_source")
  );
});

test("product fallback BZTU remains rejected and blocks readiness", () => {
  const result = build(fixture.invalidInputPacks.productFallback);

  assert.equal(result.bztuDirectInputReadiness.status, "rejected");
  assert.equal(result.readinessFlags.isBztuDirectInputReady, false);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
  assert.ok(
    result.diagnostics.some((entry) => entry.code === "rejected_bztu_product_fallback")
  );
});

test("raw auditor BZTU remains rejected outside the direct-input contract", () => {
  const inputPack = JSON.parse(JSON.stringify(fixture.inputPack));
  delete inputPack.bztuDirectInputs;
  inputPack.envelope.elements[0].bztu = {
    value: 0.62,
    unit: "-",
    owner: "auditor_entered",
    sourceRefs: ["MC001_2022_2_22_BZTU_CORRECTION_FACTOR"],
    confidence: "reviewed",
    status: "ready"
  };

  assert.throws(
    () => build(inputPack),
    /BZTU value envelope\.elements\[0\]\.bztu must use bztuDirectInputs/
  );
});

test("derived BZTU remains rejected as normal methodology input", () => {
  const result = createMc001BztuDirectInputGate({
    bztuDirectInputs: [
      validBztuDirectInput({
        inputClassification: "engine_derived_value"
      })
    ]
  });

  assert.equal(result.status, "rejected");
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "rejected_bztu_derived_or_raw_input"
    )
  );
});
