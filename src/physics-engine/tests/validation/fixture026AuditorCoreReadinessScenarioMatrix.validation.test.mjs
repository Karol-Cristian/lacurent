import assert from "node:assert/strict";
import { createMc001AuditorCoreReadinessOrchestrator } from "../../mc001AuditorCoreReadinessOrchestrator.mjs";
import { fixture026AuditorCoreReadinessScenarioMatrix as fixture } from "./fixture026AuditorCoreReadinessScenarioMatrix.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function build(inputPack) {
  return createMc001AuditorCoreReadinessOrchestrator(inputPack, {
    registry: fixture.registry
  });
}

function assertConsolidatedContract(result) {
  for (const fieldName of [
    "inputGateStatus",
    "envelopeReadiness",
    "transmissionReadiness",
    "ventilationReadiness",
    "heatLossReadiness",
    "blockedItems",
    "diagnostics",
    "sourceTrace",
    "readinessFlags",
    "nextBlockers"
  ]) {
    assert.ok(fieldName in result, `${fieldName} missing from consolidated result`);
  }

  for (const flagName of [
    "isEnvelopeReady",
    "isTransmissionReady",
    "isVentilationReady",
    "isHeatLossReady",
    "isMonthlyHeatingReady",
    "isLevel2AuditorReady",
    "isCpeReady"
  ]) {
    assert.ok(flagName in result.readinessFlags, `${flagName} missing from readiness flags`);
  }
}

function assertNoForbiddenReadiness(result) {
  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isQhndReady, false);
  assert.equal(result.readinessFlags.isLevel2AuditorReady, false);
  assert.equal(result.readinessFlags.isCpeReady, false);
  assert.equal(result.readinessFlags.isCertificateCpeWorkflowReady, false);
  assert.equal(result.readinessFlags.isProductionIntegrationReady, false);
}

function assertNoFakeZeroes(result) {
  assert.ok(result.blockedItems.every((item) => item.value === null));
  if (result.heatLossReadiness.status !== "ready_heat_loss_components") {
    assert.equal(result.heatLossReadiness.heatLossResult, null);
  }
}

function assertExpectedScenario(result, expected) {
  if (expected.envelopeStatus) {
    assert.equal(result.envelopeReadiness.status, expected.envelopeStatus);
  }
  if (expected.hdStatus) {
    assert.equal(result.transmissionReadiness.componentReadiness.Hd.status, expected.hdStatus);
  }
  if (expected.htrStatus) {
    assert.equal(result.transmissionReadiness.componentReadiness.Htr.status, expected.htrStatus);
  }
  if (expected.hveStatus) {
    assert.equal(result.ventilationReadiness.componentReadiness.Hve.status, expected.hveStatus);
  }
  if (expected.heatLossStatus) {
    assert.equal(result.heatLossReadiness.status, expected.heatLossStatus);
  }

  for (const flagName of [
    "isEnvelopeReady",
    "isTransmissionReady",
    "isVentilationReady",
    "isHeatLossReady"
  ]) {
    if (flagName in expected) {
      assert.equal(result.readinessFlags[flagName], expected[flagName], flagName);
    }
  }

  if (expected.requiredBlockedComponentId) {
    assert.ok(
      result.blockedItems.some(
        (item) => item.componentId === expected.requiredBlockedComponentId
      ),
      `${expected.requiredBlockedComponentId} blocker missing`
    );
  }
  if (expected.requiredBlockedStatus) {
    assert.ok(
      result.blockedItems.some((item) => item.status === expected.requiredBlockedStatus),
      `${expected.requiredBlockedStatus} blocker missing`
    );
  }
  if (expected.requiredSourceRef) {
    assert.ok(
      Object.values(result.sourceTrace.transmission).some((refs) =>
        refs.includes(expected.requiredSourceRef)
      ),
      `${expected.requiredSourceRef} source trace missing`
    );
  }
}

test("documents Fixture 026 Phase G1 scope without adding product behavior", () => {
  assert.equal(fixture.fixtureId, "FIXTURE_026_AUDITOR_CORE_READINESS_SCENARIO_MATRIX");
  assert.equal(fixture.fixtureType, "phase_g1_auditor_core_readiness_matrix_hardening");
  assert.ok(fixture.scope.includes("Physics Engine"));
  assert.ok(fixture.exclusions.includes("no full Level 2 Full Auditor readiness"));
  assert.ok(fixture.exclusions.includes("no monthly heating readiness"));
  assert.ok(fixture.exclusions.includes("no QHnd readiness"));
  assert.ok(fixture.exclusions.includes("no CPE/report/certificate workflow"));
  assert.ok(fixture.exclusions.includes("no UI/API/DB/Worker/deploy/product integration"));
  assert.ok(fixture.exclusions.includes("no new MC001 physics formulas"));
});

test("validates multiple auditor core readiness scenarios through the orchestrator", () => {
  assert.equal(fixture.scenarios.length, 6);

  for (const scenario of fixture.scenarios) {
    const result = build(scenario.inputPack);
    assertConsolidatedContract(result);
    assertExpectedScenario(result, scenario.expected);
    assertNoForbiddenReadiness(result);
  }
});

test("preserves blockers and next blockers across partial and unsupported scenarios", () => {
  const partialScenarios = fixture.scenarios.filter(
    (scenario) => scenario.expected.isHeatLossReady !== true
  );

  for (const scenario of partialScenarios) {
    const result = build(scenario.inputPack);
    assert.ok(result.blockedItems.length > 0, `${scenario.id} has no blocked items`);
    assert.ok(result.nextBlockers.length > 0, `${scenario.id} has no next blockers`);
    assert.ok(
      result.diagnostics.some((entry) => entry.level === "blocked"),
      `${scenario.id} has no blocked diagnostic`
    );
  }
});

test("does not use fake zeroes or escalate partial readiness", () => {
  for (const scenario of fixture.scenarios) {
    const result = build(scenario.inputPack);
    assertNoFakeZeroes(result);

    if (result.readinessFlags.isHeatLossReady) {
      assert.equal(result.readinessFlags.isTransmissionReady, true);
      assert.equal(result.readinessFlags.isVentilationReady, true);
      assert.notEqual(result.heatLossReadiness.heatLossResult, null);
    } else {
      assert.equal(result.heatLossReadiness.heatLossResult, null);
    }
  }
});
