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

function expertOverride(componentId, value, extra = {}) {
  return {
    overrideId: `PHASE_G_EXPERT_OVERRIDE_${componentId}`,
    targetFieldPath: `transmission.${componentId}`,
    value,
    unit: "W/K",
    source: `Phase G expert ${componentId} source`,
    owner: "measured_override_with_source",
    sourceRefs: [`${componentId}_PHASE_G_EXPERT_SOURCE`],
    reason: `Reviewed source-backed ${componentId} override for Phase G readiness`,
    responsiblePerson: "Phase G reviewer",
    confidence: "reviewed",
    traceId: `${componentId}_PHASE_G_EXPERT_TRACE`,
    ...extra
  };
}

function validBztuDirectInput(extra = {}) {
  return {
    entryId: "PHASE_H1_BZTU_DIRECT_INPUT_ORCHESTRATOR_001",
    recordId: "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
    value: 0.62,
    unit: "dimensionless",
    month: 1,
    ztuZoneId: "ztu-buffer-zone-001",
    source: "Phase H1 source-backed direct bztu review",
    sourceRefs: ["MC001_2022_2_22_BZTU_CORRECTION_FACTOR"],
    sourceLocator: "MC001 Chapter 2 relation candidate 2.22 reviewed for Phase H1",
    methodologyStatus: "accepted",
    inputClassification: "explicit_methodological_direct_input",
    traceId: "PHASE_H1_BZTU_TRACE_001",
    reviewStatus: "reviewed",
    calculationPeriod: "monthly",
    applicability: {
      calculationPeriod: "monthly",
      notAdjacentToAnotherZtu: true,
      multipleAdjacentConditionedZones: false
    },
    adjacentConditionedZoneRelation: "ztc-school-zone-001_to_ztu-buffer-zone-001",
    ...extra
  };
}

function validHuComponentCandidate(extra = {}) {
  return {
    componentId: "PHASE_H2F_HU_COMPONENT_001",
    conditionedZoneId: "ztc-school-zone-001",
    ztuZoneId: "ztu-buffer-zone-001",
    month: 1,
    element: {
      elementId: "phase-h2f-ztu-wall-001",
      elementType: "wall",
      area: {
        value: 12.5,
        unit: "m2"
      }
    },
    boundaryRelation: "external_non_climatized_zone",
    uValuePath: {
      pathType: "source_backed_corrected_u_value",
      value: 0.31,
      unit: "W/(m2*K)",
      source: "Phase H2F reviewed U-value path source",
      sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
      sourceLocator: {
        documentId: "MC001-2022",
        page: 100,
        figure: "Figure 2.12"
      },
      traceId: "PHASE_H2F_U_VALUE_TRACE_001"
    },
    bztuPath: {
      pathType: "accepted_direct_input",
      recordId: "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
      entryId: "PHASE_H1_BZTU_DIRECT_INPUT_ORCHESTRATOR_001"
    },
    applicability: {
      appliesToMonth: 1,
      appliesToZtuZoneId: "ztu-buffer-zone-001",
      notAdjacentToAnotherZtu: true,
      multipleAdjacentConditionedZones: false
    },
    sourceTrace: {
      source: "Phase H2F synthetic Hu component contract source",
      sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
      sourceLocator: {
        documentId: "MC001-2022",
        page: 100,
        figure: "Figure 2.12"
      },
      traceId: "PHASE_H2F_HU_COMPONENT_TRACE_001"
    },
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

function addBztuDirectInputs(inputPack, entries = [validBztuDirectInput()]) {
  inputPack.bztuDirectInputs = entries;
  return inputPack;
}

function addHuComponentCandidate(
  inputPack,
  candidate = validHuComponentCandidate(),
  bztuEntries = [validBztuDirectInput()]
) {
  inputPack.huComponentCandidate = candidate;
  inputPack.bztuDirectInputs = bztuEntries;
  return inputPack;
}

function validHuInventoryComponent(index, extra = {}) {
  return validHuComponentCandidate({
    componentId: `PHASE_H2I_HU_COMPONENT_00${index}`,
    element: {
      elementId: `phase-h2i-ztu-wall-00${index}`,
      elementType: "wall",
      area: {
        value: index === 1 ? 12.5 : 8.75,
        unit: "m2"
      }
    },
    uValuePath: {
      pathType: "source_backed_corrected_u_value",
      value: index === 1 ? 0.31 : 0.29,
      unit: "W/(m2*K)",
      source: `Phase H2I reviewed U-value path source ${index}`,
      sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
      sourceLocator: {
        documentId: "MC001-2022",
        page: 100,
        figure: "Figure 2.12"
      },
      traceId: `PHASE_H2I_U_VALUE_TRACE_00${index}`
    },
    sourceTrace: {
      source: `Phase H2I synthetic Hu component contract source ${index}`,
      sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
      sourceLocator: {
        documentId: "MC001-2022",
        page: 100,
        figure: "Figure 2.12"
      },
      traceId: `PHASE_H2I_HU_COMPONENT_TRACE_00${index}`
    },
    ...extra
  });
}

function expectedHuInventoryComponentFrom(candidate) {
  return {
    componentId: candidate.componentId,
    conditionedZoneId: candidate.conditionedZoneId,
    ztuZoneId: candidate.ztuZoneId,
    month: candidate.month,
    elementId: candidate.element.elementId
  };
}

function validHuMultiComponentInventory(extra = {}) {
  const first = validHuInventoryComponent(1);
  const second = validHuInventoryComponent(2);

  return {
    month: 1,
    conditionedZoneIds: ["ztc-school-zone-001"],
    ztuZoneIds: ["ztu-buffer-zone-001"],
    expectedComponents: [
      expectedHuInventoryComponentFrom(first),
      expectedHuInventoryComponentFrom(second)
    ],
    componentCandidates: [first, second],
    sourceTrace: {
      source: "Phase H2I reviewed Hu inventory coverage source",
      sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
      sourceLocator: {
        documentId: "MC001-2022",
        page: 100,
        figure: "Figure 2.12"
      },
      traceId: "PHASE_H2I_HU_INVENTORY_TRACE_001"
    },
    ...extra
  };
}

function addHuMultiComponentInventory(
  inputPack,
  inventory = validHuMultiComponentInventory(),
  bztuEntries = [validBztuDirectInput()]
) {
  inputPack.huMultiComponentInventory = inventory;
  inputPack.bztuDirectInputs = bztuEntries;
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

function completeCoreInputPackWithExpertOverrides() {
  const inputPack = baseCoreInputPack();
  inputPack.envelope.elements = inputPack.envelope.elements.filter(
    (element) => element.boundaryType === "exterior"
  );
  inputPack.explicitBlockers = [];
  inputPack.expertOverrides = [
    expertOverride("Hg", 2),
    expertOverride("Hu", 3),
    expertOverride("Ha", 4)
  ];
  return inputPack;
}

function build(inputPack = baseCoreInputPack(), options = {}) {
  return createMc001AuditorCoreReadinessOrchestrator(inputPack, {
    registry: fixture021EnvelopeFromAuditorInput.registry,
    ...options
  });
}

function expectFailure(name, fn, expectedError) {
  test(name, () => {
    assert.throws(fn, expectedError);
  });
}

function assertConsolidatedContract(result) {
  for (const fieldName of [
    "inputGateStatus",
    "envelopeReadiness",
    "transmissionReadiness",
    "ventilationReadiness",
    "heatLossReadiness",
    "huMultiComponentInventoryReadiness",
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
    "isHuInventoryReady",
    "isMonthlyHeatingReady",
    "isLevel2AuditorReady",
    "isCpeReady"
  ]) {
    assert.ok(flagName in result.readinessFlags, `${flagName} missing from readiness flags`);
  }

  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isQhndReady, false);
  assert.equal(result.readinessFlags.isLevel2AuditorReady, false);
  assert.equal(result.readinessFlags.isCpeReady, false);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.ok(Array.isArray(result.blockedItems));
  assert.ok(Array.isArray(result.diagnostics));
  assert.ok(Array.isArray(result.nextBlockers));
}

function assertBlockedItemsHaveNoFakeValues(result) {
  assert.ok(
    result.blockedItems.every((item) => item.value === null),
    "blocked consolidated items must not carry fallback values"
  );
}

function assertNoBroaderReadiness(result) {
  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isQhndReady, false);
  assert.equal(result.readinessFlags.isLevel2AuditorReady, false);
  assert.equal(result.readinessFlags.isCpeReady, false);
  assert.equal(result.readinessFlags.isCertificateCpeWorkflowReady, false);
  assert.equal(result.readinessFlags.isProductionIntegrationReady, false);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
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

test("Phase H1 reports accepted BZTU as explicit methodological direct input", () => {
  const result = build(addBztuDirectInputs(baseCoreInputPack()));

  assert.equal(result.bztuDirectInputReadiness.gateId, "MC001_BZTU_DIRECT_INPUT_READINESS_GATE_PHASE_H1");
  assert.equal(result.bztuDirectInputReadiness.status, "accepted");
  assert.equal(result.bztuDirectInputReadiness.acceptedInputs.length, 1);
  assert.equal(
    result.bztuDirectInputReadiness.acceptedInputs[0].inputClassification,
    "explicit_methodological_direct_input"
  );
  assert.equal(result.readinessFlags.isBztuDirectInputReady, true);
});

test("Phase H1 distinguishes BZTU direct input from raw auditor input", () => {
  const inputPack = baseCoreInputPack();
  inputPack.bztu = valueEnvelope(0.62, "-", ["MC001_2022_2_22_BZTU_CORRECTION_FACTOR"]);

  assert.throws(
    () => build(inputPack),
    /BZTU value bztu must use bztuDirectInputs/
  );
});

test("Phase H1 distinguishes BZTU direct input from engine-derived value", () => {
  const result = build(addBztuDirectInputs(baseCoreInputPack(), [
    validBztuDirectInput({
      inputClassification: "engine_derived_value"
    })
  ]));

  assert.equal(result.bztuDirectInputReadiness.status, "rejected");
  assert.equal(result.readinessFlags.isBztuDirectInputReady, false);
  assert.ok(
    result.bztuDirectInputReadiness.rejectedInputs[0].issues.some(
      (entry) => entry.code === "rejected_bztu_derived_or_raw_input"
    )
  );
});

test("Phase H1 preserves BZTU provenance and traceability in consolidated output", () => {
  const result = build(addBztuDirectInputs(baseCoreInputPack()));

  assert.deepEqual(result.sourceTrace.bztu.records[0].sourceRefs, [
    "MC001_2022_2_22_BZTU_CORRECTION_FACTOR"
  ]);
  assert.equal(result.sourceTrace.bztu.records[0].traceId, "PHASE_H1_BZTU_TRACE_001");
  assert.equal(result.sourceTrace.bztu.records[0].ztuZoneId, "ztu-buffer-zone-001");
  assert.equal(result.sourceTrace.bztu.records[0].month, 1);
});

test("Phase H1 keeps full BZTU calculation chain and Hu/Htr readiness blocked", () => {
  const result = build(addBztuDirectInputs(baseCoreInputPack()));

  assert.equal(result.bztuDirectInputReadiness.status, "accepted");
  assert.equal(result.readinessFlags.isFullBztuDerivationReady, false);
  assert.notEqual(result.transmissionReadiness.componentReadiness.Hu.status, "ready");
  assert.equal(
    result.transmissionReadiness.componentReadiness.Htr.status,
    "blocked_incomplete_components"
  );
  assert.equal(result.readinessFlags.isHeatLossReady, false);
});

test("Phase H2F exposes valid Hu component contract readiness through orchestrator", () => {
  const result = build(addHuComponentCandidate(baseCoreInputPack()));

  assert.equal(
    result.huComponentReadiness.gateId,
    "MC001_HU_COMPONENT_CONTRACT_READINESS_GATE_PHASE_H2E"
  );
  assert.equal(result.huComponentReadiness.status, "ready");
  assert.equal(
    result.huComponentReadiness.componentStatus,
    "ready_hu_component_contract"
  );
  assert.equal(
    result.huComponentReadiness.huComponentReadiness.ztuZoneId,
    "ztu-buffer-zone-001"
  );
  assert.equal(result.readinessFlags.isHuComponentReady, true);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isQhndReady, false);
  assert.equal(result.readinessFlags.isCpeReady, false);
  assert.equal(result.readinessFlags.isLevel2AuditorReady, false);
  assert.equal("huResult" in result.huComponentReadiness, false);
  assert.equal("htrResult" in result.huComponentReadiness, false);
  assert.equal(
    result.transmissionReadiness.componentReadiness.Htr.status,
    "blocked_incomplete_components"
  );
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "hu_component_contract_readiness_only"
    )
  );
  assert.ok(
    result.sourceTrace.huComponent.records.some(
      (entry) => entry.traceId === "PHASE_H2F_HU_COMPONENT_TRACE_001"
    )
  );
});

test("Phase H2F exposes invalid Hu component blockers through orchestrator", () => {
  const candidate = validHuComponentCandidate();
  delete candidate.uValuePath.sourceRefs;

  const result = build(addHuComponentCandidate(baseCoreInputPack(), candidate));

  assert.equal(result.huComponentReadiness.status, "blocked");
  assert.equal(result.readinessFlags.isHuComponentReady, false);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.ok(
    result.diagnostics.some(
      (entry) =>
        entry.upstreamGate === "MC001_HU_COMPONENT_CONTRACT_READINESS_GATE_PHASE_H2E" &&
        entry.code === "blocked_invalid_u_value_source"
    )
  );
  assert.ok(
    result.blockedItems.some(
      (item) =>
        item.phase === "Phase H2E Hu component" &&
        item.diagnosticCode === "blocked_invalid_u_value_source" &&
        item.value === null
    )
  );
});

test("Phase H2F no Hu candidate preserves existing orchestrator behavior", () => {
  const result = build(baseCoreInputPack());

  assert.equal(result.huComponentReadiness.status, "not_supplied");
  assert.equal(result.huComponentReadiness.componentStatus, "not_evaluated");
  assert.equal(result.readinessFlags.isHuComponentReady, false);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.equal(result.envelopeReadiness.isDirectTransmissionReady, true);
  assert.equal(result.transmissionReadiness.componentReadiness.Hd.status, "ready");
  assert.equal(result.ventilationReadiness.componentReadiness.Hve.status, "ready");
  assert.equal(result.readinessFlags.isHeatLossReady, false);
  assert.equal(
    result.blockedItems.some((item) => item.phase === "Phase H2E Hu component"),
    false
  );
});

test("Phase H2F blocks attempts to force complete Hu or Htr readiness", () => {
  const inputPack = addHuComponentCandidate(baseCoreInputPack());
  inputPack.readinessClaims = {
    isCompleteHuReady: true,
    isCompleteHtrReady: true
  };

  const result = build(inputPack);

  assert.equal(result.readinessFlags.isHuComponentReady, false);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "blocked_complete_hu_readiness_escalation"
    )
  );
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "blocked_complete_htr_readiness_escalation"
    )
  );
});

test("Phase H2F keeps Phase H1 BZTU readiness behavior unchanged", () => {
  const result = build(addBztuDirectInputs(baseCoreInputPack()));

  assert.equal(result.bztuDirectInputReadiness.status, "accepted");
  assert.equal(result.readinessFlags.isBztuDirectInputReady, true);
  assert.equal(result.readinessFlags.isFullBztuDerivationReady, false);
  assert.equal(result.huComponentReadiness.status, "not_supplied");
  assert.equal(result.readinessFlags.isHuComponentReady, false);
});

test("Phase H2I exposes valid Hu multi-component inventory readiness through orchestrator", () => {
  const result = build(addHuMultiComponentInventory(baseCoreInputPack()));

  assert.equal(
    result.huMultiComponentInventoryReadiness.gateId,
    "MC001_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE_PHASE_H2H"
  );
  assert.equal(result.huMultiComponentInventoryReadiness.status, "ready");
  assert.equal(
    result.huMultiComponentInventoryReadiness.inventoryStatus,
    "ready_hu_component_inventory"
  );
  assert.equal(
    result.huMultiComponentInventoryReadiness
      .huMultiComponentInventoryReadiness.componentCount,
    2
  );
  assert.equal(result.readinessFlags.isHuInventoryReady, true);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isQhndReady, false);
  assert.equal(result.readinessFlags.isCpeReady, false);
  assert.equal(result.readinessFlags.isLevel2AuditorReady, false);
  assert.equal("huResult" in result.huMultiComponentInventoryReadiness, false);
  assert.equal("htrResult" in result.huMultiComponentInventoryReadiness, false);
  assert.equal(
    "huResult" in
      result.huMultiComponentInventoryReadiness.huMultiComponentInventoryReadiness,
    false
  );
  assert.equal(
    "htrResult" in
      result.huMultiComponentInventoryReadiness.huMultiComponentInventoryReadiness,
    false
  );
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "hu_component_contract_readiness_only"
    )
  );
  assert.ok(
    result.sourceTrace.huMultiComponentInventory.records.some(
      (entry) => entry.traceId === "PHASE_H2I_HU_INVENTORY_TRACE_001"
    )
  );
});

test("Phase H2I exposes unexpected actual component blockers through orchestrator", () => {
  const inventory = validHuMultiComponentInventory();
  const extraComponent = clone(inventory.componentCandidates[1]);
  extraComponent.componentId = "PHASE_H2I_UNEXPECTED_HU_COMPONENT_003";
  extraComponent.element.elementId = "phase-h2i-unexpected-ztu-wall-003";
  extraComponent.uValuePath.traceId = "PHASE_H2I_UNEXPECTED_U_VALUE_TRACE_003";
  extraComponent.sourceTrace.traceId = "PHASE_H2I_UNEXPECTED_COMPONENT_TRACE_003";
  inventory.componentCandidates.push(extraComponent);

  const result = build(addHuMultiComponentInventory(baseCoreInputPack(), inventory));

  assert.equal(result.huMultiComponentInventoryReadiness.status, "blocked");
  assert.equal(
    result.huMultiComponentInventoryReadiness.inventoryStatus,
    "blocked_unexpected_hu_component"
  );
  assert.equal(result.readinessFlags.isHuInventoryReady, false);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
  assert.equal("huResult" in result.huMultiComponentInventoryReadiness, false);
  assert.equal("htrResult" in result.huMultiComponentInventoryReadiness, false);
  assert.ok(
    result.diagnostics.some(
      (entry) =>
        entry.upstreamGate ===
          "MC001_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE_PHASE_H2H" &&
        entry.code === "blocked_unexpected_hu_component"
    )
  );
  assert.ok(
    result.blockedItems.some(
      (item) =>
        item.phase === "Phase H2H Hu inventory" &&
        item.diagnosticCode === "blocked_unexpected_hu_component" &&
        item.value === null
    )
  );
});

test("Phase H2I exposes partial Hu inventory blockers through orchestrator", () => {
  const inventory = validHuMultiComponentInventory();
  inventory.componentCandidates.pop();

  const result = build(addHuMultiComponentInventory(baseCoreInputPack(), inventory));

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

test("Phase H2I no inventory candidate preserves existing orchestrator behavior", () => {
  const result = build(baseCoreInputPack());

  assert.equal(result.huMultiComponentInventoryReadiness.status, "not_supplied");
  assert.equal(
    result.huMultiComponentInventoryReadiness.inventoryStatus,
    "not_evaluated"
  );
  assert.equal(result.readinessFlags.isHuInventoryReady, false);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.equal(result.envelopeReadiness.isDirectTransmissionReady, true);
  assert.equal(result.transmissionReadiness.componentReadiness.Hd.status, "ready");
  assert.equal(result.ventilationReadiness.componentReadiness.Hve.status, "ready");
  assert.equal(result.readinessFlags.isHeatLossReady, false);
  assert.equal(
    result.blockedItems.some((item) => item.phase === "Phase H2H Hu inventory"),
    false
  );
});

test("Phase H2I blocks attempts to force inventory complete Hu or Htr readiness", () => {
  const inventory = validHuMultiComponentInventory({
    readinessClaims: {
      isHuInventoryReady: true,
      isCompleteHuReady: true,
      isCompleteHtrReady: true
    }
  });
  const result = build(addHuMultiComponentInventory(baseCoreInputPack(), inventory));

  assert.equal(result.readinessFlags.isHuInventoryReady, false);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "blocked_hu_inventory_readiness_escalation"
    )
  );
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "blocked_complete_hu_readiness_escalation"
    )
  );
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "blocked_complete_htr_readiness_escalation"
    )
  );
});

for (const { name, mutate, expectedCode } of [
  {
    name: "missing BZTU source",
    mutate: (input) => {
      delete input.source;
    },
    expectedCode: "rejected_bztu_missing_source"
  },
  {
    name: "invalid BZTU unit",
    mutate: (input) => {
      input.unit = "W/K";
    },
    expectedCode: "rejected_bztu_invalid_unit"
  },
  {
    name: "missing BZTU month scope",
    mutate: (input) => {
      delete input.month;
    },
    expectedCode: "rejected_bztu_missing_month"
  },
  {
    name: "missing BZTU zone scope",
    mutate: (input) => {
      delete input.ztuZoneId;
    },
    expectedCode: "rejected_bztu_missing_ztu_zone"
  },
  {
    name: "ambiguous BZTU applicability",
    mutate: (input) => {
      input.applicability.notAdjacentToAnotherZtu = false;
    },
    expectedCode: "ambiguous_bztu_ztu_adjacent_to_ztu"
  },
  {
    name: "hidden BZTU product fallback",
    mutate: (input) => {
      input.inputClassification = "hidden_fallback";
      input.owner = "product_fallback";
    },
    expectedCode: "rejected_bztu_product_fallback"
  }
]) {
  test(`Phase H1 readiness remains blocked for ${name}`, () => {
    const inputPack = addBztuDirectInputs(completeCoreInputPack(), [
      validBztuDirectInput()
    ]);
    mutate(inputPack.bztuDirectInputs[0]);

    const result = build(inputPack);

    assert.equal(result.readinessFlags.isBztuDirectInputReady, false);
    assert.equal(result.readinessFlags.isHeatLossReady, false);
    assert.ok(
      result.bztuDirectInputReadiness.rejectedInputs.length > 0 ||
        result.bztuDirectInputReadiness.status === "ambiguous"
    );
    assert.ok(
      result.diagnostics.some((entry) => entry.code === expectedCode),
      `Expected diagnostic ${expectedCode}`
    );
    assert.ok(
      result.blockedItems.some(
        (item) => item.phase === "Phase H1 BZTU" && item.diagnosticCode === expectedCode
      )
    );
  });
}

test("consolidated result contract is stable for partial and complete scenarios", () => {
  for (const inputPack of [baseCoreInputPack(), completeCoreInputPack()]) {
    const result = build(inputPack);
    assertConsolidatedContract(result);
    assertBlockedItemsHaveNoFakeValues(result);
    assertNoBroaderReadiness(result);
  }
});

test("scenario matrix A envelope Hd and Hve ready while Htr and heat-loss stay blocked", () => {
  const result = build(baseCoreInputPack());

  assertConsolidatedContract(result);
  assert.equal(result.envelopeReadiness.isDirectTransmissionReady, true);
  assert.equal(result.transmissionReadiness.componentReadiness.Hd.status, "ready");
  assert.equal(result.ventilationReadiness.componentReadiness.Hve.status, "ready");
  assert.equal(
    result.transmissionReadiness.componentReadiness.Htr.status,
    "blocked_incomplete_components"
  );
  assert.equal(result.heatLossReadiness.status, "blocked_incomplete_heat_loss_components");
  assert.equal(result.readinessFlags.isHeatLossReady, false);
  assert.equal(result.heatLossReadiness.heatLossResult, null);
  assertNoBroaderReadiness(result);
});

test("scenario matrix B missing envelope blocks transmission without fake Htr zero", () => {
  const inputPack = baseCoreInputPack();
  delete inputPack.envelope;

  const result = build(inputPack);

  assertConsolidatedContract(result);
  assert.equal(result.envelopeReadiness.status, "blocked_missing_envelope_input");
  assert.equal(result.readinessFlags.isEnvelopeReady, false);
  assert.equal(result.readinessFlags.isTransmissionReady, false);
  assert.equal(result.readinessFlags.isVentilationReady, true);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
  assert.equal(result.heatLossReadiness.componentReadiness.Htr.value, null);
  assert.equal(result.heatLossReadiness.heatLossResult, null);
  assert.ok(
    result.blockedItems.some(
      (item) => item.status === "blocked_missing_envelope_input" && item.value === null
    )
  );
});

test("scenario matrix C missing ventilation blocks Hve and heat-loss without fake zero", () => {
  const inputPack = baseCoreInputPack();
  delete inputPack.ventilation;

  const result = build(inputPack);

  assertConsolidatedContract(result);
  assert.equal(result.envelopeReadiness.isDirectTransmissionReady, true);
  assert.equal(result.transmissionReadiness.componentReadiness.Hd.status, "ready");
  assert.equal(
    result.ventilationReadiness.componentReadiness.Hve.status,
    "blocked_missing_ventilation_input"
  );
  assert.equal(result.ventilationReadiness.componentReadiness.Hve.value, null);
  assert.equal(result.heatLossReadiness.componentReadiness.Hve.value, null);
  assert.equal(result.readinessFlags.isVentilationReady, false);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
  assert.equal(result.heatLossReadiness.heatLossResult, null);
});

test("scenario matrix D unsupported Phase D boundary is preserved and not ignored", () => {
  const inputPack = baseCoreInputPack();
  inputPack.envelope.elements[2].boundaryType = "adjacent";

  const result = build(inputPack);

  assertConsolidatedContract(result);
  assert.equal(result.readinessFlags.isEnvelopeReady, false);
  assert.equal(result.readinessFlags.isTransmissionReady, false);
  assert.ok(
    result.blockedItems.some(
      (item) =>
        item.phase === "Phase D envelope" &&
        item.componentId === "adjacent" &&
        item.status === "blocked_missing_normative_data" &&
        item.value === null
    )
  );
  assert.ok(
    result.blockedItems.some(
      (item) =>
        item.phase === "Phase E transmission" &&
        item.componentId === "Ha" &&
        item.status === "blocked_missing_normative_data" &&
        item.value === null
    )
  );
  assert.ok(result.nextBlockers.some((blocker) => blocker.includes("adjacent")));
});

test("scenario matrix E unsupported Phase F ventilation type blocks Hve and heat-loss", () => {
  const inputPack = baseCoreInputPack();
  inputPack.ventilation.components[0].ventilationType = "unsupported_phase_g_type";

  const result = build(inputPack);

  assertConsolidatedContract(result);
  assert.equal(result.ventilationReadiness.componentReadiness.Hve.value, null);
  assert.equal(result.readinessFlags.isVentilationReady, false);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
  assert.equal(result.heatLossReadiness.heatLossResult, null);
  assert.ok(
    result.blockedItems.some(
      (item) =>
        item.phase === "Phase F ventilation" &&
        item.status === "blocked_unsupported_ventilation_type" &&
        item.value === null
    )
  );
});

test("scenario matrix E unsupported Phase F ventilation path blocks Hve and heat-loss", () => {
  const inputPack = baseCoreInputPack();
  inputPack.ventilation.components[0].ventilationPath = "unsupported_phase_g_path";

  const result = build(inputPack);

  assertConsolidatedContract(result);
  assert.equal(result.ventilationReadiness.componentReadiness.Hve.value, null);
  assert.equal(result.readinessFlags.isVentilationReady, false);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
  assert.equal(result.heatLossReadiness.heatLossResult, null);
  assert.ok(
    result.blockedItems.some(
      (item) =>
        item.phase === "Phase F ventilation" &&
        item.status === "blocked_unsupported_ventilation_path" &&
        item.value === null
    )
  );
});

for (const { name, mutate } of [
  {
    name: "building classification",
    mutate: (inputPack) => {
      inputPack.buildingClassification.primaryCategoryKey.owner = "product_fallback";
    }
  },
  {
    name: "envelope area",
    mutate: (inputPack) => {
      inputPack.envelope.elements[0].area.owner = "product_estimate";
    }
  },
  {
    name: "ventilation airflow",
    mutate: (inputPack) => {
      inputPack.ventilation.components[0].airflowM3h.owner = "product_fallback";
    }
  }
]) {
  expectFailure(
    `scenario matrix F product fallback in ${name} is rejected`,
    () => {
      const inputPack = baseCoreInputPack();
      mutate(inputPack);
      build(inputPack);
    },
    /owner is not allowed for raw auditor input/
  );
}

test("scenario matrix H validation imports preserve provenance in consolidated result", () => {
  const result = build(completeCoreInputPack());

  assertConsolidatedContract(result);
  assert.equal(result.readinessFlags.isTransmissionReady, true);
  assert.equal(result.readinessFlags.isHeatLossReady, true);
  assert.ok(
    result.sourceTrace.transmission.Hg.includes("Hg_PHASE_G_CONTROLLED_SOURCE")
  );
  assert.ok(
    result.sourceTrace.heatLoss.heatLoss.includes("Hg_PHASE_G_CONTROLLED_SOURCE")
  );
  assertNoBroaderReadiness(result);
});

test("scenario matrix H expert overrides preserve provenance in consolidated result", () => {
  const result = build(completeCoreInputPackWithExpertOverrides());

  assertConsolidatedContract(result);
  assert.equal(result.readinessFlags.isTransmissionReady, true);
  assert.equal(result.readinessFlags.isHeatLossReady, true);
  assert.ok(result.sourceTrace.transmission.Hg.includes("Hg_PHASE_G_EXPERT_SOURCE"));
  assert.ok(result.sourceTrace.heatLoss.heatLoss.includes("Hg_PHASE_G_EXPERT_SOURCE"));
  assertNoBroaderReadiness(result);
});

expectFailure(
  "scenario matrix prevents Htr readiness escalation while transmission is blocked",
  () => {
    build(baseCoreInputPack(), {
      componentClaims: {
        transmission: {
          Htr: "ready"
        }
      }
    });
  },
  /Htr is claimed ready while transmission components are blocked/
);

expectFailure(
  "scenario matrix prevents heat-loss readiness escalation while Htr is blocked",
  () => {
    build(baseCoreInputPack(), {
      componentClaims: {
        heatLoss: {
          heatLoss: "ready"
        }
      }
    });
  },
  /heat-loss readiness is claimed while Htr is blocked or partial/
);

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
