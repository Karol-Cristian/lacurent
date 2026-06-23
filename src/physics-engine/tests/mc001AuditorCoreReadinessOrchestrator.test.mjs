import assert from "node:assert/strict";
import { createMc001AuditorCoreReadinessOrchestrator } from "../mc001AuditorCoreReadinessOrchestrator.mjs";
import { fixture021EnvelopeFromAuditorInput } from "./validation/fixture021EnvelopeFromAuditorInput.mjs";
import { fixture023VentilationFromAuditorInput } from "./validation/fixture023VentilationFromAuditorInput.mjs";

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

function valueEnvelope(value, unit, sourceRefs = ["PHASE_G_FIELD_NOTE_001"], extra = {}) {
  return {
    value,
    unit,
    owner: "auditor_entered",
    sourceRefs,
    confidence: "reviewed",
    status: "ready",
    ...extra
  };
}

function validationImport(componentId, value, extra = {}) {
  return {
    importId: `PHASE_G_IMPORT_${componentId}`,
    targetFieldPath: `transmission.${componentId}`,
    value,
    unit: "W/K",
    source: `Phase G controlled ${componentId} source`,
    owner: "validation_import_with_source",
    sourceRefs: [`${componentId}_PHASE_G_CONTROLLED_SOURCE`],
    traceId: `${componentId}_PHASE_G_TRACE`,
    importContext: "Phase G controlled Htr readiness component",
    sourceFixtureId: "FIXTURE_025_AUDITOR_CORE_READINESS_ORCHESTRATOR",
    reviewStatus: "reviewed",
    validatesFormulaPath: false,
    ...extra
  };
}

function baseCoreInputPack() {
  const inputPack = clone(fixture021EnvelopeFromAuditorInput.inputPack);
  const ventilationInput = clone(fixture023VentilationFromAuditorInput.inputPack);

  inputPack.contractMetadata.contractId = "PHASE_G_AUDITOR_CORE_TEST";
  inputPack.contractMetadata.contractVersion =
    "PHASE_G_AUDITOR_CORE_READINESS_ORCHESTRATOR";
  inputPack.contractMetadata.createdBy = "PHYSICS_ENGINE_PHASE_G_TEST";
  inputPack.sourceTrace.documents.push(...ventilationInput.sourceTrace.documents);
  inputPack.explicitBlockers.push(...ventilationInput.explicitBlockers);
  inputPack.ventilation = ventilationInput.ventilation;

  return inputPack;
}

function completeCoreInputPack() {
  const inputPack = baseCoreInputPack();
  inputPack.envelope.elements = inputPack.envelope.elements.filter(
    (element) => element.boundaryType === "exterior"
  );
  inputPack.explicitBlockers = [];
  inputPack.validationImports = [
    validationImport("Hg", 2),
    validationImport("Hu", 3),
    validationImport("Ha", 4)
  ];
  return inputPack;
}

function build(inputPack = baseCoreInputPack()) {
  return createMc001AuditorCoreReadinessOrchestrator(inputPack, {
    registry: fixture021EnvelopeFromAuditorInput.registry
  });
}

function expectFailure(name, fn, expectedError) {
  test(name, () => {
    assert.throws(fn, expectedError);
  });
}

test("valid raw envelope and ventilation produces consolidated readiness result", () => {
  const result = build();

  assert.equal(
    result.orchestratorId,
    "MC001_AUDITOR_CORE_READINESS_ORCHESTRATOR_PHASE_G"
  );
  assert.equal(result.inputGateStatus, "accepted_input_builder_gate");
  assert.equal(result.envelopeReadiness.isDirectTransmissionReady, true);
  assert.equal(result.transmissionReadiness.componentReadiness.Hd.status, "ready");
  assert.equal(result.ventilationReadiness.componentReadiness.Hve.status, "ready");
  assert.equal(result.heatLossReadiness.status, "blocked_incomplete_heat_loss_components");
  assert.equal(result.readinessFlags.isHeatLossReady, false);
  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
});

test("envelope Hd may be ready while Htr remains partial blocked", () => {
  const result = build();

  assert.equal(result.transmissionReadiness.componentReadiness.Hd.status, "ready");
  assert.equal(
    result.transmissionReadiness.componentReadiness.Htr.status,
    "blocked_incomplete_components"
  );
  assert.equal(result.transmissionReadiness.readinessFlags.isHtrReady, false);
  assert.equal(result.readinessFlags.isTransmissionReady, false);
});

test("Hve may be ready while heat-loss remains blocked when Htr is incomplete", () => {
  const result = build();

  assert.equal(result.ventilationReadiness.componentReadiness.Hve.status, "ready");
  assert.equal(result.readinessFlags.isVentilationReady, true);
  assert.equal(result.heatLossReadiness.heatLossResult, null);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
});

test("controlled source-backed imports can complete Htr and heat-loss readiness", () => {
  const result = build(completeCoreInputPack());

  assert.equal(result.transmissionReadiness.componentReadiness.Hg.status, "ready");
  assert.equal(result.transmissionReadiness.componentReadiness.Hu.status, "ready");
  assert.equal(result.transmissionReadiness.componentReadiness.Ha.status, "ready");
  assert.equal(result.transmissionReadiness.componentReadiness.Htr.status, "ready");
  assert.equal(result.heatLossReadiness.status, "ready_heat_loss_components");
  assert.equal(result.readinessFlags.isEnvelopeReady, true);
  assert.equal(result.readinessFlags.isTransmissionReady, true);
  assert.equal(result.readinessFlags.isVentilationReady, true);
  assert.equal(result.readinessFlags.isHeatLossReady, true);
  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isLevel2AuditorReady, false);
  assert.equal(result.readinessFlags.isCpeReady, false);
  assert.ok(
    result.sourceTrace.transmission.Hg.includes("Hg_PHASE_G_CONTROLLED_SOURCE")
  );
});

test("result preserves diagnostics and source trace from lower modules", () => {
  const result = build();

  assert.ok(
    result.diagnostics.some((entry) => entry.code === "blocked_missing_normative_data")
  );
  assert.ok(
    result.sourceTrace.input.documents.includes("FIELD_NOTE_ENV_001")
  );
  assert.ok(
    result.sourceTrace.input.documents.includes("VENT_CONSTANTS_023")
  );
  assert.ok(
    result.nextBlockers.some((blocker) =>
      blocker.includes("Ground-contact envelope method") ||
      blocker.includes("ground boundary requires")
    )
  );
});

expectFailure(
  "missing classification mapping is rejected",
  () => {
    const inputPack = baseCoreInputPack();
    delete inputPack.buildingClassification.primaryCategoryKey;
    build(inputPack);
  },
  /buildingClassification\.primaryCategoryKey must be an object/
);

expectFailure(
  "raw category key without mapping evidence is rejected",
  () => {
    const inputPack = baseCoreInputPack();
    inputPack.buildingClassification.primaryCategoryKey = valueEnvelope(
      "education",
      "-",
      ["PHASE_G_FIELD_NOTE_001"]
    );
    build(inputPack);
  },
  /sourceAuditorClassification/
);

expectFailure(
  "product estimate fallback is rejected",
  () => {
    const inputPack = baseCoreInputPack();
    inputPack.ventilation.components[0].airflowM3h.owner = "product_fallback";
    build(inputPack);
  },
  /owner is not allowed for raw auditor input/
);

for (const fieldName of [
  "Htr",
  "Hve",
  "heatLoss",
  "totalHeatLoss",
  "QHnd",
  "finalEnergyKWh",
  "primaryEnergyKWh",
  "totalPrimaryEnergyKWh",
  "co2Kg",
  "totalCO2Kg"
]) {
  expectFailure(
    `${fieldName} submitted as normal auditor input is rejected`,
    () => {
      const inputPack = baseCoreInputPack();
      inputPack[fieldName] = valueEnvelope(1, "W/K", ["PHASE_G_FIELD_NOTE_001"]);
      build(inputPack);
    },
    /Derived value/
  );
}

test("missing envelope input keeps envelope and transmission blocked", () => {
  const inputPack = baseCoreInputPack();
  delete inputPack.envelope;

  const result = build(inputPack);

  assert.equal(result.envelopeReadiness.status, "blocked_missing_envelope_input");
  assert.equal(result.envelopeReadiness.isEnvelopeReady, false);
  assert.equal(
    result.transmissionReadiness.componentReadiness.Htr.status,
    "blocked_incomplete_components"
  );
  assert.equal(result.readinessFlags.isTransmissionReady, false);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
});

test("missing ventilation input keeps Hve and heat-loss blocked", () => {
  const inputPack = baseCoreInputPack();
  delete inputPack.ventilation;

  const result = build(inputPack);

  assert.equal(
    result.ventilationReadiness.componentReadiness.Hve.status,
    "blocked_missing_ventilation_input"
  );
  assert.equal(result.readinessFlags.isVentilationReady, false);
  assert.equal(result.heatLossReadiness.heatLossResult, null);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
});

test("blocked Htr is not treated as zero", () => {
  const result = build();

  assert.equal(result.heatLossReadiness.componentReadiness.Htr.value, null);
  assert.equal(result.heatLossReadiness.heatLossResult, null);
  assert.ok(
    result.blockedItems
      .filter((item) => item.componentId === "Htr")
      .every((item) => item.value === null)
  );
});

test("blocked Hve is not treated as zero", () => {
  const inputPack = baseCoreInputPack();
  inputPack.ventilation.components[0].ventilationPath = "unsupported_phase_g_path";

  const result = build(inputPack);

  assert.equal(result.ventilationReadiness.componentReadiness.Hve.value, null);
  assert.equal(result.heatLossReadiness.componentReadiness.Hve.value, null);
  assert.equal(result.heatLossReadiness.heatLossResult, null);
  assert.ok(
    result.blockedItems
      .filter((item) => item.componentId === "Hve")
      .every((item) => item.value === null)
  );
});

test("readiness cannot claim Level 2 monthly QHnd or CPE readiness", () => {
  const result = build(completeCoreInputPack());

  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isQhndReady, false);
  assert.equal(result.readinessFlags.isLevel2AuditorReady, false);
  assert.equal(result.readinessFlags.isCpeReady, false);
  assert.equal(result.readinessFlags.isCertificateCpeWorkflowReady, false);
  assert.equal(result.readinessFlags.isProductionIntegrationReady, false);
});

expectFailure(
  "controlled import without Phase C provenance is rejected",
  () => {
    const inputPack = completeCoreInputPack();
    delete inputPack.validationImports[0].source;
    build(inputPack);
  },
  /validationImports\[0\]\.source must be a non-empty string/
);
