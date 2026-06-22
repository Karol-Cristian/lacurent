import assert from "node:assert/strict";
import { createMc001VentilationInputBuilder } from "../../mc001VentilationInputBuilder.mjs";
import { fixture023VentilationFromAuditorInput as fixture } from "./fixture023VentilationFromAuditorInput.mjs";

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

function valueEnvelope(value, unit, sourceRefs) {
  return {
    value,
    unit,
    owner: "auditor_entered",
    sourceRefs,
    confidence: "reviewed",
    status: "ready"
  };
}

function build(inputPack = fixture.inputPack) {
  return createMc001VentilationInputBuilder(inputPack, {
    registry: fixture.registry
  });
}

function assertAlmostEqual(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("documents Fixture 023 Phase F scope without adding product behavior", () => {
  assert.equal(fixture.fixtureId, "FIXTURE_023_VENTILATION_FROM_AUDITOR_INPUT");
  assert.ok(fixture.exclusions.includes("no Level 2 Full Auditor readiness"));
  assert.ok(fixture.exclusions.includes("no climate/monthly heating readiness"));
  assert.ok(fixture.exclusions.includes("no CPE/report/certificate workflow"));
  assert.ok(fixture.exclusions.includes("no UI/API/DB/Worker/deploy/product integration"));
  assert.ok(fixture.exclusions.includes("no new MC001 physics formulas"));
});

test("accepts raw ventilation input only with source provenance", () => {
  const result = build();

  assert.equal(result.phaseCGate.gateId, "MC001_AUDITOR_INPUT_BUILDER_GATE_PHASE_C");
  assert.equal(result.componentResults.length, fixture.expected.acceptedComponentCount);
  assert.equal(result.blockedItems.length, fixture.expected.blockedComponentCount);
  assert.equal(result.componentReadiness.Hve.status, fixture.expected.hveStatus);
  assertAlmostEqual(result.hveResult.value, fixture.expected.hveWPerK);
  assert.ok(result.hveResult.provenance.sourceRefs.includes("VENT_AIRFLOW_BALANCE_023"));
});

test("rejects derived Hve submitted as normal ventilation input", () => {
  const inputPack = clone(fixture.inputPack);
  inputPack.ventilation.Hve = valueEnvelope(60, "W/K", ["VENT_FIELD_NOTE_023"]);

  assert.throws(
    () => build(inputPack),
    /Derived value ventilation\.Hve must be submitted as validationImports or expertOverrides/
  );
});

test("blocks unsupported ventilation methods with diagnostics", () => {
  const inputPack = clone(fixture.inputPack);
  inputPack.ventilation.components.push({
    componentId: "UNSUPPORTED_RECIRCULATION_023",
    ventilationType: "natural",
    ventilationPath: "recirculated_air_unvalidated",
    sourceRefs: ["VENT_FIELD_NOTE_023"]
  });

  const result = build(inputPack);

  assert.equal(result.hveResult, null);
  assert.equal(result.blockedItems[0].status, fixture.expected.unsupportedVentilationStatus);
  assert.equal(result.readinessFlags.isHveReady, false);
});

test("keeps readiness flags conservative", () => {
  const result = build();

  assert.equal(result.readinessFlags.isHveReady, fixture.expected.isHveReady);
  assert.equal(
    result.readinessFlags.isCompleteHeatLossReady,
    fixture.expected.isCompleteHeatLossReady
  );
  assert.equal(result.readinessFlags.isLevel2Ready, false);
  assert.equal(result.readinessFlags.isCertificateCpeWorkflowReady, false);
  assert.equal(result.readinessFlags.isProductionIntegrationReady, false);
});
