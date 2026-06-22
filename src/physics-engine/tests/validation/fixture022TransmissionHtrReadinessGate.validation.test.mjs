import assert from "node:assert/strict";
import { createMc001EnvelopeInputBuilder } from "../../mc001EnvelopeInputBuilder.mjs";
import { createMc001TransmissionHtrReadinessGate } from "../../mc001TransmissionHtrReadinessGate.mjs";
import { fixture022TransmissionHtrReadinessGate as fixture } from "./fixture022TransmissionHtrReadinessGate.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function buildEnvelope() {
  return createMc001EnvelopeInputBuilder(fixture.phaseDInputPack, {
    registry: fixture.registry
  });
}

function buildGate(extra = {}) {
  return createMc001TransmissionHtrReadinessGate({
    envelopeBuilderOutput: buildEnvelope(),
    ...extra
  });
}

function assertAlmostEqual(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("documents Fixture 022 Phase E scope without adding product behavior", () => {
  assert.equal(fixture.fixtureId, "FIXTURE_022_TRANSMISSION_HTR_READINESS_GATE");
  assert.ok(fixture.exclusions.includes("no full Htr readiness"));
  assert.ok(fixture.exclusions.includes("no full envelope engine readiness"));
  assert.ok(fixture.exclusions.includes("no Level 2 Full Auditor readiness"));
  assert.ok(fixture.exclusions.includes("no climate/monthly heating readiness"));
  assert.ok(fixture.exclusions.includes("no CPE/report/certificate workflow"));
  assert.ok(fixture.exclusions.includes("no UI/API/DB/Worker/deploy/product integration"));
  assert.ok(fixture.exclusions.includes("no new MC001 physics formulas"));
});

test("classifies Phase D output into transmission component readiness", () => {
  const result = buildGate();

  assert.equal(result.phaseDBuilderId, "MC001_ENVELOPE_FROM_AUDITOR_INPUT_PHASE_D");
  assert.equal(result.phaseCGateId, "MC001_AUDITOR_INPUT_BUILDER_GATE_PHASE_C");
  assert.equal(result.componentReadiness.Hd.status, fixture.expected.hdStatus);
  assert.equal(
    result.componentReadiness.thermalBridges.status,
    fixture.expected.thermalBridgeStatus
  );
  assert.equal(result.componentReadiness.Hg.status, fixture.expected.hgStatusWithoutImport);
  assert.equal(result.componentReadiness.Hu.status, fixture.expected.huStatus);
  assert.equal(result.componentReadiness.Ha.status, fixture.expected.haStatus);
});

test("keeps Hd ready while Htr remains partial blocked", () => {
  const result = buildGate();

  assert.equal(result.readinessFlags.isHdExteriorDirectReady, true);
  assert.equal(result.readinessFlags.isHtrReady, false);
  assert.equal(result.componentReadiness.Htr.status, fixture.expected.htrStatus);
  assert.equal(result.htrResult, null);
  assertAlmostEqual(
    result.componentReadiness.Hd.value,
    fixture.expected.directTransmissionSubtotalWPerK
  );
});

test("keeps ground unconditioned and adjacent blocked unless controlled values exist", () => {
  const result = buildGate({
    validationImports: fixture.controlledValidationImports
  });

  assert.equal(result.componentReadiness.Hg.status, fixture.expected.hgStatusWithImport);
  assert.equal(result.componentReadiness.Hg.value, 2);
  assert.ok(
    result.componentReadiness.Hg.sourceRefs.includes(
      "FIXTURE_022_CONTROLLED_GROUND_SOURCE"
    )
  );
  assert.equal(result.componentReadiness.Hu.status, fixture.expected.huStatus);
  assert.equal(result.componentReadiness.Ha.status, fixture.expected.haStatus);
  assert.equal(result.componentReadiness.Htr.status, fixture.expected.htrStatus);
  assert.equal(result.readinessFlags.isHtrReady, false);
});

test("does not use fake zeroes for missing or blocked components", () => {
  const result = buildGate();

  for (const componentId of ["Hg", "Hu", "Ha", "Htr"]) {
    assert.equal(result.componentReadiness[componentId].value, null);
  }

  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.componentId === "Hg" &&
        diagnostic.code === "blocked_missing_validated_method"
    )
  );
});

test("does not claim complete Htr readiness prematurely", () => {
  const result = buildGate();

  assert.equal(result.status, "blocked_incomplete_components");
  assert.equal(result.readinessFlags.isCompleteTransmissionReady, false);
  assert.equal(result.readinessFlags.isCompleteEnvelopeReady, false);
  assert.equal(result.readinessFlags.isLevel2Ready, false);
  assert.equal(result.readinessFlags.isCertificateCpeWorkflowReady, false);
  assert.equal(result.readinessFlags.isProductionIntegrationReady, false);
});
