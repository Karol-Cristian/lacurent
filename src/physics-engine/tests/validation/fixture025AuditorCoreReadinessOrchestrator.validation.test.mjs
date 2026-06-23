import assert from "node:assert/strict";
import { createMc001AuditorCoreReadinessOrchestrator } from "../../mc001AuditorCoreReadinessOrchestrator.mjs";
import { fixture025AuditorCoreReadinessOrchestrator as fixture } from "./fixture025AuditorCoreReadinessOrchestrator.mjs";

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

test("documents Fixture 025 Phase G scope without adding product behavior", () => {
  assert.equal(fixture.fixtureId, "FIXTURE_025_AUDITOR_CORE_READINESS_ORCHESTRATOR");
  assert.equal(fixture.fixtureType, "phase_g_auditor_core_readiness_orchestrator");
  assert.ok(fixture.scope.includes("Physics Engine"));
  assert.ok(fixture.exclusions.includes("no full Level 2 Full Auditor readiness"));
  assert.ok(fixture.exclusions.includes("no monthly heating readiness"));
  assert.ok(fixture.exclusions.includes("no QHnd readiness"));
  assert.ok(fixture.exclusions.includes("no CPE/report/certificate workflow"));
  assert.ok(fixture.exclusions.includes("no UI/API/DB/Worker/deploy/product integration"));
  assert.ok(fixture.exclusions.includes("no new MC001 physics formulas"));
});

test("validates the full Phase C D E F composition path", () => {
  const result = build();

  assert.equal(
    result.orchestratorId,
    "MC001_AUDITOR_CORE_READINESS_ORCHESTRATOR_PHASE_G"
  );
  assert.equal(result.inputGateStatus, fixture.expected.inputGateStatus);
  assert.equal(result.phaseOutputs.envelopeBuilderOutput.builderId, "MC001_ENVELOPE_FROM_AUDITOR_INPUT_PHASE_D");
  assert.equal(
    result.phaseOutputs.transmissionReadinessOutput.gateId,
    "MC001_TRANSMISSION_HTR_READINESS_GATE_PHASE_E"
  );
  assert.equal(
    result.phaseOutputs.ventilationReadinessOutput.builderId,
    "MC001_VENTILATION_FROM_AUDITOR_INPUT_PHASE_F"
  );
  assert.equal(
    result.phaseOutputs.heatLossReadinessOutput.gateId,
    "MC001_HEAT_LOSS_READINESS_GATE_PHASE_F"
  );
});

test("propagates conservative readiness and blocked components", () => {
  const result = build();

  assert.equal(
    result.transmissionReadiness.componentReadiness.Hd.status,
    fixture.expected.hdStatus
  );
  assert.equal(
    result.transmissionReadiness.componentReadiness.Htr.status,
    fixture.expected.htrBlockedStatus
  );
  assert.equal(
    result.ventilationReadiness.componentReadiness.Hve.status,
    fixture.expected.hveStatus
  );
  assert.equal(result.heatLossReadiness.status, fixture.expected.heatLossBlockedStatus);
  assert.equal(result.readinessFlags.isEnvelopeReady, fixture.expected.isEnvelopeReady);
  assert.equal(result.readinessFlags.isTransmissionReady, fixture.expected.isTransmissionReady);
  assert.equal(result.readinessFlags.isVentilationReady, fixture.expected.isVentilationReady);
  assert.equal(result.readinessFlags.isHeatLossReady, fixture.expected.isHeatLossReady);
  assert.ok(result.blockedItems.some((item) => item.componentId === "Hg"));
});

test("does not use fake zeroes for missing or blocked components", () => {
  const result = build();

  assert.equal(result.heatLossReadiness.heatLossResult, null);
  assert.ok(result.blockedItems.length > 0);
  assert.ok(result.blockedItems.every((item) => item.value === null));
  assert.equal(result.heatLossReadiness.componentReadiness.Htr.value, null);
});

test("controlled values can prepare heat-loss readiness without broader readiness claims", () => {
  const result = build(fixture.controlledHeatLossInputPack);

  assert.equal(
    result.heatLossReadiness.status,
    fixture.expected.controlledHeatLossReadyStatus
  );
  assert.equal(result.readinessFlags.isHeatLossReady, true);
  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isQhndReady, false);
  assert.equal(result.readinessFlags.isLevel2AuditorReady, false);
  assert.equal(result.readinessFlags.isCpeReady, false);
  assert.equal(result.readinessFlags.isProductionIntegrationReady, false);
});

test("does not claim monthly heating QHnd CPE report or product readiness", () => {
  const result = build();

  assert.equal(result.readinessFlags.isMonthlyHeatingReady, fixture.expected.isMonthlyHeatingReady);
  assert.equal(result.readinessFlags.isQhndReady, fixture.expected.isQhndReady);
  assert.equal(result.readinessFlags.isLevel2AuditorReady, false);
  assert.equal(result.readinessFlags.isCpeReady, fixture.expected.isCpeReady);
  assert.equal(result.readinessFlags.isCertificateCpeWorkflowReady, false);
  assert.equal(
    result.readinessFlags.isProductionIntegrationReady,
    fixture.expected.isProductionIntegrationReady
  );
});
