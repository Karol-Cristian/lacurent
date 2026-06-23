import {
  createMc001AuditorInputBuilderGate,
  INPUT_BUILDER_GATE_ID
} from "./mc001AuditorInputBuilderGate.mjs";
import {
  createMc001EnvelopeInputBuilder,
  MC001_ENVELOPE_INPUT_BUILDER_ID
} from "./mc001EnvelopeInputBuilder.mjs";
import {
  createMc001HeatLossReadinessGate,
  MC001_HEAT_LOSS_READINESS_GATE_ID
} from "./mc001HeatLossReadinessGate.mjs";
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

function blockedValueIsZeroFallback(item) {
  return item?.status?.startsWith("blocked") && item.value !== null;
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
  heatLossReadinessOutput
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
    ...phaseBlockedItems("Phase F heat-loss", heatLossReadinessOutput.blockedComponents)
  ]);
  const diagnostics = collectDiagnostics({
    envelopeBuilderOutput,
    transmissionReadinessOutput,
    ventilationReadinessOutput,
    heatLossReadinessOutput
  });

  const envelopeReadiness = summarizeEnvelopeReadiness(envelopeBuilderOutput);
  const transmissionReadiness = summarizeTransmissionReadiness(
    transmissionReadinessOutput
  );
  const ventilationReadiness = summarizeVentilationReadiness(
    ventilationReadinessOutput
  );
  const heatLossReadiness = summarizeHeatLossReadiness(heatLossReadinessOutput);
  const isHeatLossReady =
    heatLossReadinessOutput.readinessFlags.isHeatLossReady === true;

  return {
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
      heatLoss: heatLossReadinessOutput.sourceTrace
    }),
    readinessFlags: {
      isEnvelopeReady: envelopeReadiness.isEnvelopeReady,
      isTransmissionReady:
        transmissionReadinessOutput.readinessFlags.isCompleteTransmissionReady === true,
      isVentilationReady:
        ventilationReadinessOutput.readinessFlags.isCompleteVentilationReady === true,
      isHeatLossReady,
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
      heatLossReadinessOutput
    },
    nextRequiredStep:
      "KEEP_LEVEL_2_BLOCKED_UNTIL_ENVELOPE_TRANSMISSION_VENTILATION_HEAT_LOSS_CLIMATE_GAINS_SYSTEMS_AND_REPORTING_ARE_COMPLETE"
  };
}
