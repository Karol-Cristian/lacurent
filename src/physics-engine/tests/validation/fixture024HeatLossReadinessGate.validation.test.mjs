import assert from "node:assert/strict";
import { createMc001HeatLossReadinessGate } from "../../mc001HeatLossReadinessGate.mjs";
import { createMc001TransmissionHtrReadinessGateFromAuditorInput } from "../../mc001TransmissionHtrReadinessGate.mjs";
import { createMc001VentilationInputBuilder } from "../../mc001VentilationInputBuilder.mjs";
import { fixture024HeatLossReadinessGate as fixture } from "./fixture024HeatLossReadinessGate.mjs";

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

function buildTransmission(inputPack = fixture.completeTransmissionInputPack) {
  return createMc001TransmissionHtrReadinessGateFromAuditorInput(inputPack, {
    registry: fixture.registry
  });
}

function buildVentilation(inputPack = fixture.ventilationInputPack) {
  return createMc001VentilationInputBuilder(inputPack, {
    registry: fixture.registry
  });
}

function buildGate({
  transmission = buildTransmission(),
  ventilation = buildVentilation()
} = {}) {
  return createMc001HeatLossReadinessGate({
    transmissionReadinessOutput: transmission,
    ventilationReadinessOutput: ventilation
  });
}

function assertAlmostEqual(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("documents Fixture 024 Phase F scope without adding product behavior", () => {
  assert.equal(fixture.fixtureId, "FIXTURE_024_HEAT_LOSS_READINESS_GATE");
  assert.ok(fixture.exclusions.includes("no Level 2 Full Auditor readiness"));
  assert.ok(fixture.exclusions.includes("no climate/monthly heating readiness"));
  assert.ok(fixture.exclusions.includes("no QHnd calculation"));
  assert.ok(fixture.exclusions.includes("no CPE/report/certificate workflow"));
  assert.ok(fixture.exclusions.includes("no UI/API/DB/Worker/deploy/product integration"));
  assert.ok(fixture.exclusions.includes("no new MC001 physics formulas"));
});

test("complete source-backed Htr and Hve allow heat-loss readiness", () => {
  const result = buildGate();

  assert.equal(result.status, fixture.expected.heatLossReadyStatus);
  assert.equal(result.componentReadiness.Htr.status, fixture.expected.htrReadyStatus);
  assert.equal(result.componentReadiness.Hve.status, fixture.expected.hveReadyStatus);
  assertAlmostEqual(result.componentReadiness.Htr.value, fixture.expected.htrWPerK);
  assertAlmostEqual(result.componentReadiness.Hve.value, fixture.expected.hveWPerK);
  assertAlmostEqual(result.heatLossResult.value, fixture.expected.heatLossWPerK);
  assert.equal(result.readinessFlags.isHeatLossReady, fixture.expected.isHeatLossReady);
});

test("partial Htr keeps heat-loss readiness blocked", () => {
  const partialTransmission = buildTransmission(fixture.partialTransmissionInputPack);
  const result = buildGate({ transmission: partialTransmission });

  assert.equal(partialTransmission.componentReadiness.Htr.status, fixture.expected.partialHtrStatus);
  assert.equal(result.status, fixture.expected.heatLossBlockedStatus);
  assert.equal(result.heatLossResult, null);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
});

test("blocked Hve keeps heat-loss readiness blocked", () => {
  const inputPack = clone(fixture.ventilationInputPack);
  inputPack.ventilation.components.push({
    componentId: "UNSUPPORTED_RECIRCULATION_024",
    ventilationType: "recirculation",
    ventilationPath: "recirculated_air_unvalidated",
    sourceRefs: ["VENT_FIELD_NOTE_023"]
  });
  const result = buildGate({ ventilation: buildVentilation(inputPack) });

  assert.equal(result.status, fixture.expected.heatLossBlockedStatus);
  assert.equal(result.heatLossResult, null);
  assert.ok(result.blockedComponents.some((component) => component.componentId === "Hve"));
});

test("does not use fake zeroes for missing or blocked Htr or Hve", () => {
  const result = buildGate({
    transmission: buildTransmission(fixture.partialTransmissionInputPack)
  });

  assert.equal(result.componentReadiness.Htr.value, null);
  assert.equal(result.heatLossResult, null);
  assert.ok(
    result.diagnostics.some(
      (diagnostic) => diagnostic.componentId === "Htr" ||
        diagnostic.code === "blocked_incomplete_components"
    )
  );
});

test("does not claim monthly heating or QHnd readiness", () => {
  const result = buildGate();

  assert.equal(result.readinessFlags.isMonthlyHeatingReady, fixture.expected.isMonthlyHeatingReady);
  assert.equal(result.readinessFlags.isQhndReady, fixture.expected.isQhndReady);
  assert.equal(result.readinessFlags.isLevel2Ready, false);
  assert.equal(result.readinessFlags.isCertificateCpeWorkflowReady, false);
  assert.equal(result.readinessFlags.isProductionIntegrationReady, false);
});
