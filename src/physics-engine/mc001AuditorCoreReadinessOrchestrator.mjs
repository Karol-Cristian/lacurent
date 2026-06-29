import {
  createMc001AuditorInputBuilderGate,
  INPUT_BUILDER_GATE_ID
} from "./mc001AuditorInputBuilderGate.mjs";
import {
  createMc001BztuDirectInputGate,
  MC001_BZTU_DIRECT_INPUT_GATE_ID
} from "./mc001BztuDirectInputGate.mjs";
import {
  createMc001EnvelopeInputBuilder,
  MC001_ENVELOPE_INPUT_BUILDER_ID
} from "./mc001EnvelopeInputBuilder.mjs";
import {
  createMc001HeatLossReadinessGate,
  MC001_HEAT_LOSS_READINESS_GATE_ID
} from "./mc001HeatLossReadinessGate.mjs";
import {
  createMc001HuComponentContractReadinessGate,
  MC001_HU_COMPONENT_CONTRACT_READINESS_GATE_ID
} from "./mc001HuComponentContractReadinessGate.mjs";
import {
  createMc001HuMultiComponentInventoryReadinessGate,
  MC001_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE_ID
} from "./mc001HuMultiComponentInventoryReadinessGate.mjs";
import {
  createMc001TransmissionHtrReadinessGate,
  MC001_TRANSMISSION_HTR_READINESS_GATE_ID
} from "./mc001TransmissionHtrReadinessGate.mjs";
import {
  createMc001VentilationInputBuilder,
  MC001_VENTILATION_INPUT_BUILDER_ID
} from "./mc001VentilationInputBuilder.mjs";

export const MC001_AUDITOR_CORE_READINESS_ORCHESTRATOR_ID =
  "MC001_AUDITOR_CORE_READINESS_ORCHESTRATOR_PHASE_G";

const CORE_DERIVED_NORMAL_FIELDS = new Set(["heatLoss", "totalHeatLoss"]);
const DERIVED_IMPORT_ROOTS = new Set(["validationImports", "expertOverrides"]);
const REQUIRED_RESULT_FIELDS = Object.freeze([
  "inputGateStatus",
  "envelopeReadiness",
  "transmissionReadiness",
  "ventilationReadiness",
  "heatLossReadiness",
  "bztuDirectInputReadiness",
  "huComponentReadiness",
  "huMultiComponentInventoryReadiness",
  "blockedItems",
  "diagnostics",
  "sourceTrace",
  "readinessFlags",
  "nextBlockers"
]);
const REQUIRED_READINESS_FLAGS = Object.freeze([
  "isEnvelopeReady",
  "isTransmissionReady",
  "isVentilationReady",
  "isHeatLossReady",
  "isHuComponentReady",
  "isHuInventoryReady",
  "isCompleteHuReady",
  "isCompleteHtrReady",
  "isMonthlyHeatingReady",
  "isLevel2AuditorReady",
  "isCpeReady"
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertObject(value, path) {
  if (!isObject(value)) {
    throw new Error(`${path} must be an object`);
  }
}

function assertArray(value, path) {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }
}

function assertFieldExists(value, field, path) {
  if (!(field in value)) {
    throw new Error(`${path}.${field} is required`);
  }
}

function assertClassificationMappingPresent(inputPack) {
  assertObject(inputPack.buildingClassification, "buildingClassification");
  assertObject(
    inputPack.buildingClassification.primaryCategoryKey,
    "buildingClassification.primaryCategoryKey"
  );
}

function rejectCoreDerivedNormalInput(value, path = "") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      rejectCoreDerivedNormalInput(entry, `${path}[${index}]`)
    );
    return;
  }

  if (!isObject(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const root = childPath.split(".")[0];
    if (DERIVED_IMPORT_ROOTS.has(root)) {
      continue;
    }
    if (CORE_DERIVED_NORMAL_FIELDS.has(key)) {
      throw new Error(
        `Derived value ${childPath} must be submitted as validationImports or expertOverrides, not normal auditor input`
      );
    }
    rejectCoreDerivedNormalInput(child, childPath);
  }
}

function diagnostic(level, code, message, extra = {}) {
  return {
    level,
    code,
    message,
    ...extra
  };
}

function createMissingEnvelopeBuilderOutput(phaseCGate) {
  const blockedItem = {
    itemType: "envelope",
    componentId: "envelope",
    status: "blocked_missing_envelope_input",
    reason: "Envelope input is required before transmission readiness can be classified",
    sourceRefs: Object.freeze([]),
    path: "envelope"
  };

  return {
    builderId: MC001_ENVELOPE_INPUT_BUILDER_ID,
    status: "blocked_missing_envelope_input",
    phaseCGate,
    elementResults: Object.freeze([]),
    bridgeResults: Object.freeze([]),
    directTransmissionSubtotal: null,
    blockedItems: Object.freeze([blockedItem]),
    diagnostics: Object.freeze([
      diagnostic("blocked", blockedItem.status, blockedItem.reason, {
        path: blockedItem.path
      })
    ]),
    readinessClaims: {
      isDirectTransmissionSubtotalReady: false,
      isCompleteHtrReady: false,
      isCompleteEnvelopeReady: false,
      isLevel2Ready: false,
      isCertificateCpeWorkflowReady: false,
      isProductionIntegrationReady: false
    },
    nextRequiredStep:
      "PROVIDE_SOURCE_BACKED_ENVELOPE_INPUT_BEFORE_TRANSMISSION_READINESS"
  };
}

function createMissingVentilationReadinessOutput(phaseCGate) {
  const blockedItem = {
    itemType: "ventilation",
    componentId: "Hve",
    status: "blocked_missing_ventilation_input",
    reason: "Ventilation input is required before Hve readiness can be classified",
    sourceRefs: Object.freeze([]),
    path: "ventilation"
  };

  return {
    builderId: MC001_VENTILATION_INPUT_BUILDER_ID,
    status: "blocked_missing_ventilation_input",
    phaseCGate,
    componentResults: Object.freeze([]),
    hveResult: null,
    componentReadiness: {
      Hve: {
        componentId: "Hve",
        status: "blocked_missing_ventilation_input",
        value: null,
        unit: "W/K",
        sourceRefs: Object.freeze([]),
        diagnosticCode: "blocked_missing_ventilation_input",
        reason: blockedItem.reason
      }
    },
    blockedItems: Object.freeze([blockedItem]),
    diagnostics: Object.freeze([
      diagnostic("blocked", blockedItem.status, blockedItem.reason, {
        componentId: "Hve",
        path: blockedItem.path
      })
    ]),
    sourceTrace: {
      Hve: Object.freeze([])
    },
    readinessFlags: {
      isHveReady: false,
      isCompleteVentilationReady: false,
      isCompleteHeatLossReady: false,
      isLevel2Ready: false,
      isCertificateCpeWorkflowReady: false,
      isProductionIntegrationReady: false
    },
    nextRequiredStep:
      "PROVIDE_SOURCE_BACKED_VENTILATION_INPUT_BEFORE_HEAT_LOSS_READINESS"
  };
}

function createNotSuppliedHuComponentReadinessOutput() {
  const sourceTrace = Object.freeze({
    records: Object.freeze([])
  });
  const diagnostics = Object.freeze([]);
  const blockedItems = Object.freeze([]);
  const readinessFlags = {
    isHuComponentReady: false,
    isCompleteHuReady: false,
    isCompleteHtrReady: false,
    isMonthlyHeatingReady: false,
    isQhndReady: false,
    isLevel2AuditorReady: false,
    isCpeReady: false
  };
  const huComponentReadiness = {
    status: "not_supplied",
    componentStatus: "not_evaluated",
    conditionedZoneId: null,
    unconditionedZoneId: null,
    ztuZoneId: null,
    month: null,
    elementId: null,
    area: null,
    uValuePath: null,
    bztuPath: null,
    sourceTrace,
    diagnostics,
    blockers: blockedItems,
    isHuComponentReady: false,
    isCompleteHuReady: false,
    isCompleteHtrReady: false
  };

  return {
    gateId: MC001_HU_COMPONENT_CONTRACT_READINESS_GATE_ID,
    status: "not_supplied",
    componentStatus: "not_evaluated",
    huComponentReadiness,
    sourceTrace,
    diagnostics,
    blockedItems,
    blockers: blockedItems,
    readinessFlags,
    bztuDirectInputReadiness: null,
    nextRequiredStep:
      "SUPPLY_HU_COMPONENT_CANDIDATE_ONLY_WHEN_UNCONDITIONED_ZONE_COMPONENT_READINESS_IS_BEING_EVALUATED"
  };
}

function createNotSuppliedHuMultiComponentInventoryReadinessOutput() {
  const sourceTrace = Object.freeze({
    records: Object.freeze([])
  });
  const diagnostics = Object.freeze([]);
  const blockedItems = Object.freeze([]);
  const readinessFlags = {
    isHuInventoryReady: false,
    isCompleteHuReady: false,
    isCompleteHtrReady: false,
    isMonthlyHeatingReady: false,
    isQhndReady: false,
    isLevel2AuditorReady: false,
    isCpeReady: false
  };
  const huMultiComponentInventoryReadiness = {
    status: "not_supplied",
    inventoryStatus: "not_evaluated",
    month: null,
    conditionedZoneIds: Object.freeze([]),
    unconditionedZoneIds: Object.freeze([]),
    ztuZoneIds: Object.freeze([]),
    componentCount: 0,
    readyComponentCount: 0,
    blockedComponentCount: 0,
    componentReadiness: Object.freeze([]),
    missingComponents: Object.freeze([]),
    unexpectedComponents: Object.freeze([]),
    duplicateComponents: Object.freeze([]),
    ambiguousComponents: Object.freeze([]),
    distributionBlockers: Object.freeze([]),
    sourceTrace,
    diagnostics,
    blockers: blockedItems,
    isHuInventoryReady: false,
    isCompleteHuReady: false,
    isCompleteHtrReady: false
  };

  return {
    gateId: MC001_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE_ID,
    status: "not_supplied",
    inventoryStatus: "not_evaluated",
    huMultiComponentInventoryReadiness,
    sourceTrace,
    diagnostics,
    blockedItems,
    blockers: blockedItems,
    readinessFlags,
    nextRequiredStep:
      "SUPPLY_HU_MULTI_COMPONENT_INVENTORY_ONLY_WHEN_UNCONDITIONED_ZONE_INVENTORY_READINESS_IS_BEING_EVALUATED"
  };
}

function blockedValueIsZeroFallback(item) {
  return item?.status?.startsWith("blocked") && "value" in item && item.value !== null;
}

function assertNoBlockedFallbackValues(items, path) {
  assertArray(items, path);
  items.forEach((item, index) => {
    if (blockedValueIsZeroFallback(item)) {
      throw new Error(`${path}[${index}] is blocked and must not provide a fallback value`);
    }
  });
}

function phaseBlockedItems(phase, items) {
  return items.map((item) => ({
    phase,
    itemType: item.itemType ?? "component",
    componentId: item.componentId ?? item.boundaryType ?? null,
    status: item.status,
    value: item.value ?? null,
    unit: item.unit ?? null,
    sourceRefs: Object.freeze([...(item.sourceRefs ?? [])]),
    diagnosticCode: item.diagnosticCode ?? item.status,
    reason: item.reason ?? item.message ?? item.status,
    path: item.path ?? null
  }));
}

function explicitInputBlockers(inputPack) {
  return (inputPack.explicitBlockers ?? []).map((blocker) => ({
    phase: "input",
    itemType: "explicit_blocker",
    componentId: blocker.blockerId,
    status: blocker.status,
    value: null,
    unit: null,
    sourceRefs: Object.freeze([...(blocker.sourceRefs ?? [])]),
    diagnosticCode: blocker.status,
    reason: blocker.reason,
    path: "explicitBlockers"
  }));
}

function collectDiagnostics({
  envelopeBuilderOutput,
  transmissionReadinessOutput,
  ventilationReadinessOutput,
  heatLossReadinessOutput,
  bztuDirectInputGate,
  huComponentContractReadinessGate,
  huMultiComponentInventoryReadinessGate
}) {
  return Object.freeze([
    ...envelopeBuilderOutput.diagnostics.map((entry) => ({
      ...entry,
      upstreamGate: MC001_ENVELOPE_INPUT_BUILDER_ID
    })),
    ...transmissionReadinessOutput.diagnostics.map((entry) => ({
      ...entry,
      upstreamGate: MC001_TRANSMISSION_HTR_READINESS_GATE_ID
    })),
    ...ventilationReadinessOutput.diagnostics.map((entry) => ({
      ...entry,
      upstreamGate: MC001_VENTILATION_INPUT_BUILDER_ID
    })),
    ...heatLossReadinessOutput.diagnostics.map((entry) => ({
      ...entry,
      upstreamGate: MC001_HEAT_LOSS_READINESS_GATE_ID
    })),
    ...bztuDirectInputGate.diagnostics.map((entry) => ({
      ...entry,
      upstreamGate: MC001_BZTU_DIRECT_INPUT_GATE_ID
    })),
    ...huComponentContractReadinessGate.diagnostics.map((entry) => ({
      ...entry,
      upstreamGate: MC001_HU_COMPONENT_CONTRACT_READINESS_GATE_ID
    })),
    ...huMultiComponentInventoryReadinessGate.diagnostics.map((entry) => ({
      ...entry,
      upstreamGate: MC001_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE_ID
    }))
  ]);
}

function summarizeEnvelopeReadiness(envelopeBuilderOutput) {
  const isDirectTransmissionReady =
    envelopeBuilderOutput.readinessClaims.isDirectTransmissionSubtotalReady === true;
  const isEnvelopeReady =
    isDirectTransmissionReady && envelopeBuilderOutput.blockedItems.length === 0;

  return {
    builderId: envelopeBuilderOutput.builderId,
    status: envelopeBuilderOutput.status,
    isDirectTransmissionReady,
    isEnvelopeReady,
    directTransmissionSubtotal: envelopeBuilderOutput.directTransmissionSubtotal,
    blockedItemCount: envelopeBuilderOutput.blockedItems.length
  };
}

function summarizeTransmissionReadiness(transmissionReadinessOutput) {
  return {
    gateId: transmissionReadinessOutput.gateId,
    status: transmissionReadinessOutput.status,
    componentReadiness: transmissionReadinessOutput.componentReadiness,
    supportedTransmissionComponents:
      transmissionReadinessOutput.supportedTransmissionComponents,
    htrResult: transmissionReadinessOutput.htrResult,
    readinessFlags: transmissionReadinessOutput.readinessFlags
  };
}

function summarizeVentilationReadiness(ventilationReadinessOutput) {
  return {
    builderId: ventilationReadinessOutput.builderId,
    status: ventilationReadinessOutput.status,
    componentReadiness: ventilationReadinessOutput.componentReadiness,
    hveResult: ventilationReadinessOutput.hveResult,
    readinessFlags: ventilationReadinessOutput.readinessFlags
  };
}

function summarizeHeatLossReadiness(heatLossReadinessOutput) {
  return {
    gateId: heatLossReadinessOutput.gateId,
    status: heatLossReadinessOutput.status,
    componentReadiness: heatLossReadinessOutput.componentReadiness,
    heatLossResult: heatLossReadinessOutput.heatLossResult,
    readinessFlags: heatLossReadinessOutput.readinessFlags
  };
}

function summarizeBztuDirectInputReadiness(bztuDirectInputGate) {
  return {
    gateId: bztuDirectInputGate.gateId,
    status: bztuDirectInputGate.status,
    acceptedInputs: bztuDirectInputGate.acceptedInputs,
    rejectedInputs: bztuDirectInputGate.rejectedInputs,
    readinessFlags: bztuDirectInputGate.readinessFlags,
    nextRequiredStep: bztuDirectInputGate.nextRequiredStep
  };
}

function summarizeHuComponentReadiness(huComponentContractReadinessGate) {
  return {
    gateId: huComponentContractReadinessGate.gateId,
    status: huComponentContractReadinessGate.status,
    componentStatus: huComponentContractReadinessGate.componentStatus,
    huComponentReadiness:
      huComponentContractReadinessGate.huComponentReadiness,
    readinessFlags: huComponentContractReadinessGate.readinessFlags,
    nextRequiredStep: huComponentContractReadinessGate.nextRequiredStep
  };
}

function summarizeHuMultiComponentInventoryReadiness(
  huMultiComponentInventoryReadinessGate
) {
  return {
    gateId: huMultiComponentInventoryReadinessGate.gateId,
    status: huMultiComponentInventoryReadinessGate.status,
    inventoryStatus: huMultiComponentInventoryReadinessGate.inventoryStatus,
    huMultiComponentInventoryReadiness:
      huMultiComponentInventoryReadinessGate.huMultiComponentInventoryReadiness,
    readinessFlags: huMultiComponentInventoryReadinessGate.readinessFlags,
    nextRequiredStep: huMultiComponentInventoryReadinessGate.nextRequiredStep
  };
}

function hasHuComponentCandidate(inputPack) {
  return (
    Object.hasOwn(inputPack, "huComponentCandidate") ||
    Object.hasOwn(inputPack, "huComponent") ||
    Object.hasOwn(inputPack, "huComponentContract")
  );
}

function hasHuMultiComponentInventoryCandidate(inputPack) {
  return (
    Object.hasOwn(inputPack, "huMultiComponentInventory") ||
    Object.hasOwn(inputPack, "huInventory") ||
    Object.hasOwn(inputPack, "huMultiComponentInventoryCandidate") ||
    Object.hasOwn(inputPack, "huComponentCandidates") ||
    Object.hasOwn(inputPack, "expectedHuComponents")
  );
}

function sourceTraceFromInput(inputPack) {
  return Object.freeze({
    documents: Object.freeze(
      (inputPack.sourceTrace?.documents ?? []).map((document) => document.documentId)
    )
  });
}

function nextBlockersFrom(blockedItems, diagnostics) {
  const blockerTexts = [
    ...blockedItems.map((item) => item.reason),
    ...diagnostics
      .filter((entry) => entry.level === "blocked")
      .map((entry) => entry.message)
  ].filter(Boolean);

  return Object.freeze([...new Set(blockerTexts)]);
}

function assertConsolidatedResultShape(result) {
  assertObject(result, "result");
  for (const field of REQUIRED_RESULT_FIELDS) {
    assertFieldExists(result, field, "result");
  }

  assertObject(result.envelopeReadiness, "result.envelopeReadiness");
  assertObject(result.transmissionReadiness, "result.transmissionReadiness");
  assertObject(result.ventilationReadiness, "result.ventilationReadiness");
  assertObject(result.heatLossReadiness, "result.heatLossReadiness");
  assertObject(result.bztuDirectInputReadiness, "result.bztuDirectInputReadiness");
  assertObject(result.huComponentReadiness, "result.huComponentReadiness");
  assertObject(
    result.huMultiComponentInventoryReadiness,
    "result.huMultiComponentInventoryReadiness"
  );
  assertArray(result.blockedItems, "result.blockedItems");
  assertArray(result.diagnostics, "result.diagnostics");
  assertObject(result.sourceTrace, "result.sourceTrace");
  assertObject(result.readinessFlags, "result.readinessFlags");
  assertArray(result.nextBlockers, "result.nextBlockers");

  for (const flag of REQUIRED_READINESS_FLAGS) {
    assertFieldExists(result.readinessFlags, flag, "result.readinessFlags");
  }

  if (result.readinessFlags.isMonthlyHeatingReady !== false) {
    throw new Error("result.readinessFlags.isMonthlyHeatingReady must remain false");
  }
  if (result.readinessFlags.isLevel2AuditorReady !== false) {
    throw new Error("result.readinessFlags.isLevel2AuditorReady must remain false");
  }
  if (result.readinessFlags.isCpeReady !== false) {
    throw new Error("result.readinessFlags.isCpeReady must remain false");
  }
}

function assertLowerBlockerPreserved(result, phase, blocker) {
  const reason = blocker.reason ?? blocker.message ?? blocker.status;
  const status = blocker.status;
  const isPreserved = result.blockedItems.some(
    (item) => item.phase === phase && item.status === status && item.reason === reason
  );
  if (!isPreserved) {
    throw new Error(`${phase} blocker was not preserved in consolidated result: ${status}`);
  }
}

function assertBlockerPropagation(result) {
  const { phaseOutputs } = result;
  assertObject(phaseOutputs, "result.phaseOutputs");
  assertObject(phaseOutputs.envelopeBuilderOutput, "result.phaseOutputs.envelopeBuilderOutput");
  assertObject(
    phaseOutputs.transmissionReadinessOutput,
    "result.phaseOutputs.transmissionReadinessOutput"
  );
  assertObject(
    phaseOutputs.ventilationReadinessOutput,
    "result.phaseOutputs.ventilationReadinessOutput"
  );
  assertObject(
    phaseOutputs.heatLossReadinessOutput,
    "result.phaseOutputs.heatLossReadinessOutput"
  );
  assertObject(
    phaseOutputs.bztuDirectInputGate,
    "result.phaseOutputs.bztuDirectInputGate"
  );
  assertObject(
    phaseOutputs.huComponentContractReadinessGate,
    "result.phaseOutputs.huComponentContractReadinessGate"
  );
  assertObject(
    phaseOutputs.huMultiComponentInventoryReadinessGate,
    "result.phaseOutputs.huMultiComponentInventoryReadinessGate"
  );

  for (const blocker of phaseOutputs.envelopeBuilderOutput.blockedItems) {
    assertLowerBlockerPreserved(result, "Phase D envelope", blocker);
  }
  for (const blocker of phaseOutputs.transmissionReadinessOutput.blockedComponents) {
    assertLowerBlockerPreserved(result, "Phase E transmission", blocker);
  }
  for (const blocker of phaseOutputs.ventilationReadinessOutput.blockedItems) {
    assertLowerBlockerPreserved(result, "Phase F ventilation", blocker);
  }
  for (const blocker of phaseOutputs.heatLossReadinessOutput.blockedComponents) {
    assertLowerBlockerPreserved(result, "Phase F heat-loss", blocker);
  }
  for (const blocker of phaseOutputs.bztuDirectInputGate.blockedItems) {
    assertLowerBlockerPreserved(result, "Phase H1 BZTU", blocker);
  }
  for (const blocker of phaseOutputs.huComponentContractReadinessGate.blockedItems) {
    assertLowerBlockerPreserved(result, "Phase H2E Hu component", blocker);
  }
  for (const blocker of phaseOutputs.huMultiComponentInventoryReadinessGate.blockedItems) {
    assertLowerBlockerPreserved(result, "Phase H2H Hu inventory", blocker);
  }
}

function assertNoReadinessEscalation(result) {
  const { phaseOutputs, readinessFlags } = result;
  const envelopeBlocked = phaseOutputs.envelopeBuilderOutput.blockedItems.length > 0;
  const transmissionBlocked =
    phaseOutputs.transmissionReadinessOutput.blockedComponents.length > 0;
  const ventilationBlocked = phaseOutputs.ventilationReadinessOutput.blockedItems.length > 0;
  const heatLossBlocked = phaseOutputs.heatLossReadinessOutput.blockedComponents.length > 0;
  const bztuBlocked = phaseOutputs.bztuDirectInputGate.blockedItems.length > 0;
  const huComponentBlocked =
    phaseOutputs.huComponentContractReadinessGate.blockedItems.length > 0;
  const huInventoryBlocked =
    phaseOutputs.huMultiComponentInventoryReadinessGate.blockedItems.length > 0;

  if (envelopeBlocked && readinessFlags.isEnvelopeReady) {
    throw new Error("envelope readiness cannot be true while Phase D has blockers");
  }
  if (transmissionBlocked && readinessFlags.isTransmissionReady) {
    throw new Error("transmission readiness cannot be true while Phase E has blockers");
  }
  if (ventilationBlocked && readinessFlags.isVentilationReady) {
    throw new Error("ventilation readiness cannot be true while Phase F ventilation has blockers");
  }
  if (heatLossBlocked && readinessFlags.isHeatLossReady) {
    throw new Error("heat-loss readiness cannot be true while Phase F heat-loss has blockers");
  }
  if (bztuBlocked && readinessFlags.isHeatLossReady) {
    throw new Error("heat-loss readiness cannot be true while Phase H1 BZTU has blockers");
  }
  if (huComponentBlocked && readinessFlags.isHuComponentReady) {
    throw new Error(
      "Hu component readiness cannot be true while Phase H2E has blockers"
    );
  }
  if (huComponentBlocked && readinessFlags.isHeatLossReady) {
    throw new Error(
      "heat-loss readiness cannot be true while Phase H2E Hu component has blockers"
    );
  }
  if (huInventoryBlocked && readinessFlags.isHuInventoryReady) {
    throw new Error(
      "Hu inventory readiness cannot be true while Phase H2H has blockers"
    );
  }
  if (huInventoryBlocked && readinessFlags.isHeatLossReady) {
    throw new Error(
      "heat-loss readiness cannot be true while Phase H2H Hu inventory has blockers"
    );
  }
  if (
    readinessFlags.isHeatLossReady &&
    (readinessFlags.isTransmissionReady !== true ||
      readinessFlags.isVentilationReady !== true)
  ) {
    throw new Error("heat-loss readiness cannot be true unless Htr and Hve are ready");
  }
  if (readinessFlags.isHeatLossReady && result.heatLossReadiness.heatLossResult === null) {
    throw new Error("heat-loss readiness cannot be true without a heat-loss readiness result");
  }
  if (
    readinessFlags.isTransmissionReady &&
    phaseOutputs.transmissionReadinessOutput.htrResult === null
  ) {
    throw new Error("transmission readiness cannot be true without an Htr result");
  }
  if (
    readinessFlags.isVentilationReady &&
    phaseOutputs.ventilationReadinessOutput.hveResult === null
  ) {
    throw new Error("ventilation readiness cannot be true without an Hve result");
  }
}

function assertConsolidatedResultContract(result) {
  assertConsolidatedResultShape(result);
  assertNoBlockedFallbackValues(result.blockedItems, "result.blockedItems");
  assertNoBlockedFallbackValues(
    result.phaseOutputs.envelopeBuilderOutput.blockedItems,
    "result.phaseOutputs.envelopeBuilderOutput.blockedItems"
  );
  assertNoBlockedFallbackValues(
    result.phaseOutputs.transmissionReadinessOutput.blockedComponents,
    "result.phaseOutputs.transmissionReadinessOutput.blockedComponents"
  );
  assertNoBlockedFallbackValues(
    result.phaseOutputs.ventilationReadinessOutput.blockedItems,
    "result.phaseOutputs.ventilationReadinessOutput.blockedItems"
  );
  assertNoBlockedFallbackValues(
    result.phaseOutputs.heatLossReadinessOutput.blockedComponents,
    "result.phaseOutputs.heatLossReadinessOutput.blockedComponents"
  );
  assertNoBlockedFallbackValues(
    result.phaseOutputs.bztuDirectInputGate.blockedItems,
    "result.phaseOutputs.bztuDirectInputGate.blockedItems"
  );
  assertNoBlockedFallbackValues(
    result.phaseOutputs.huComponentContractReadinessGate.blockedItems,
    "result.phaseOutputs.huComponentContractReadinessGate.blockedItems"
  );
  assertNoBlockedFallbackValues(
    result.phaseOutputs.huMultiComponentInventoryReadinessGate.blockedItems,
    "result.phaseOutputs.huMultiComponentInventoryReadinessGate.blockedItems"
  );
  assertBlockerPropagation(result);
  assertNoReadinessEscalation(result);
}

export function createMc001AuditorCoreReadinessOrchestrator(
  inputPack,
  {
    registry,
    componentMetadata = {},
    componentClaims = {}
  } = {}
) {
  assertObject(inputPack, "inputPack");
  assertClassificationMappingPresent(inputPack);

  const inputGate = createMc001AuditorInputBuilderGate(inputPack, { registry });
  rejectCoreDerivedNormalInput(inputPack);

  const envelopeBuilderOutput = inputPack.envelope === undefined
    ? createMissingEnvelopeBuilderOutput(inputGate)
    : createMc001EnvelopeInputBuilder(inputPack, { registry });

  const transmissionReadinessOutput = createMc001TransmissionHtrReadinessGate({
    envelopeBuilderOutput,
    componentMetadata,
    validationImports: inputPack.validationImports,
    expertOverrides: inputPack.expertOverrides,
    componentClaims: componentClaims.transmission ?? {}
  });

  const ventilationReadinessOutput = inputPack.ventilation === undefined
    ? createMissingVentilationReadinessOutput(inputGate)
    : createMc001VentilationInputBuilder(inputPack, { registry });

  const heatLossReadinessOutput = createMc001HeatLossReadinessGate({
    transmissionReadinessOutput,
    ventilationReadinessOutput,
    componentClaims: componentClaims.heatLoss ?? {}
  });
  const bztuDirectInputGate = createMc001BztuDirectInputGate(inputPack);
  const huComponentContractReadinessGate = hasHuComponentCandidate(inputPack)
    ? createMc001HuComponentContractReadinessGate(inputPack)
    : createNotSuppliedHuComponentReadinessOutput();
  const huMultiComponentInventoryReadinessGate = hasHuMultiComponentInventoryCandidate(
    inputPack
  )
    ? createMc001HuMultiComponentInventoryReadinessGate(inputPack)
    : createNotSuppliedHuMultiComponentInventoryReadinessOutput();

  assertNoBlockedFallbackValues(
    transmissionReadinessOutput.blockedComponents,
    "transmissionReadinessOutput.blockedComponents"
  );
  assertNoBlockedFallbackValues(
    heatLossReadinessOutput.blockedComponents,
    "heatLossReadinessOutput.blockedComponents"
  );

  const blockedItems = Object.freeze([
    ...explicitInputBlockers(inputPack),
    ...phaseBlockedItems("Phase D envelope", envelopeBuilderOutput.blockedItems),
    ...phaseBlockedItems(
      "Phase E transmission",
      transmissionReadinessOutput.blockedComponents
    ),
    ...phaseBlockedItems("Phase F ventilation", ventilationReadinessOutput.blockedItems),
    ...phaseBlockedItems("Phase F heat-loss", heatLossReadinessOutput.blockedComponents),
    ...phaseBlockedItems("Phase H1 BZTU", bztuDirectInputGate.blockedItems),
    ...phaseBlockedItems(
      "Phase H2E Hu component",
      huComponentContractReadinessGate.blockedItems
    ),
    ...phaseBlockedItems(
      "Phase H2H Hu inventory",
      huMultiComponentInventoryReadinessGate.blockedItems
    )
  ]);
  const diagnostics = collectDiagnostics({
    envelopeBuilderOutput,
    transmissionReadinessOutput,
    ventilationReadinessOutput,
    heatLossReadinessOutput,
    bztuDirectInputGate,
    huComponentContractReadinessGate,
    huMultiComponentInventoryReadinessGate
  });

  const envelopeReadiness = summarizeEnvelopeReadiness(envelopeBuilderOutput);
  const transmissionReadiness = summarizeTransmissionReadiness(
    transmissionReadinessOutput
  );
  const ventilationReadiness = summarizeVentilationReadiness(
    ventilationReadinessOutput
  );
  const heatLossReadiness = summarizeHeatLossReadiness(heatLossReadinessOutput);
  const bztuDirectInputReadiness = summarizeBztuDirectInputReadiness(
    bztuDirectInputGate
  );
  const huComponentReadiness = summarizeHuComponentReadiness(
    huComponentContractReadinessGate
  );
  const huMultiComponentInventoryReadiness =
    summarizeHuMultiComponentInventoryReadiness(
      huMultiComponentInventoryReadinessGate
    );
  const isHeatLossReady =
    heatLossReadinessOutput.readinessFlags.isHeatLossReady === true &&
    bztuDirectInputGate.blockedItems.length === 0 &&
    huComponentContractReadinessGate.blockedItems.length === 0 &&
    huMultiComponentInventoryReadinessGate.blockedItems.length === 0;

  const result = {
    orchestratorId: MC001_AUDITOR_CORE_READINESS_ORCHESTRATOR_ID,
    status: isHeatLossReady
      ? "ready_heat_loss_components_only"
      : "blocked_partial_auditor_core_readiness",
    inputGateStatus: inputGate.status,
    inputGateId: INPUT_BUILDER_GATE_ID,
    inputGate,
    envelopeReadiness,
    transmissionReadiness,
    ventilationReadiness,
    heatLossReadiness,
    bztuDirectInputReadiness,
    huComponentReadiness,
    huMultiComponentInventoryReadiness,
    blockedItems,
    diagnostics,
    sourceTrace: Object.freeze({
      input: sourceTraceFromInput(inputPack),
      envelope: Object.freeze({
        directTransmission:
          envelopeBuilderOutput.directTransmissionSubtotal?.trace?.inputValues ?? null,
        blockedSourceRefs: Object.freeze(
          envelopeBuilderOutput.blockedItems.flatMap((item) => item.sourceRefs ?? [])
        )
      }),
      transmission: transmissionReadinessOutput.sourceTrace,
      ventilation: ventilationReadinessOutput.sourceTrace,
      heatLoss: heatLossReadinessOutput.sourceTrace,
      bztu: bztuDirectInputGate.sourceTrace,
      huComponent: huComponentContractReadinessGate.sourceTrace,
      huMultiComponentInventory: huMultiComponentInventoryReadinessGate.sourceTrace
    }),
    readinessFlags: {
      isEnvelopeReady: envelopeReadiness.isEnvelopeReady,
      isTransmissionReady:
        transmissionReadinessOutput.readinessFlags.isCompleteTransmissionReady === true,
      isVentilationReady:
        ventilationReadinessOutput.readinessFlags.isCompleteVentilationReady === true,
      isHeatLossReady,
      isBztuDirectInputReady:
        bztuDirectInputGate.readinessFlags.isBztuDirectInputReady === true,
      isFullBztuDerivationReady: false,
      isHuComponentReady:
        huComponentContractReadinessGate.readinessFlags.isHuComponentReady === true,
      isHuInventoryReady:
        huMultiComponentInventoryReadinessGate.readinessFlags.isHuInventoryReady === true,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      isMonthlyHeatingReady: false,
      isQhndReady: false,
      isLevel2AuditorReady: false,
      isLevel2Ready: false,
      isCpeReady: false,
      isCertificateCpeWorkflowReady: false,
      isProductionIntegrationReady: false
    },
    nextBlockers: nextBlockersFrom(blockedItems, diagnostics),
    phaseOutputs: {
      envelopeBuilderOutput,
      transmissionReadinessOutput,
      ventilationReadinessOutput,
      heatLossReadinessOutput,
      bztuDirectInputGate,
      huComponentContractReadinessGate,
      huMultiComponentInventoryReadinessGate
    },
    nextRequiredStep:
      "KEEP_LEVEL_2_BLOCKED_UNTIL_ENVELOPE_TRANSMISSION_VENTILATION_HEAT_LOSS_CLIMATE_GAINS_SYSTEMS_AND_REPORTING_ARE_COMPLETE"
  };

  assertConsolidatedResultContract(result);
  return result;
}
