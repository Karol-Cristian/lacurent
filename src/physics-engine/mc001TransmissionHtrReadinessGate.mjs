import { createMc001EnvelopeInputBuilder } from "./mc001EnvelopeInputBuilder.mjs";
import { calculateTotalTransmissionCoefficient } from "./transmissionCoefficients.mjs";

export const MC001_TRANSMISSION_HTR_READINESS_GATE_ID =
  "MC001_TRANSMISSION_HTR_READINESS_GATE_PHASE_E";

export const TRANSMISSION_COMPONENT_IDS = Object.freeze([
  "Hd",
  "thermalBridges",
  "Hg",
  "Hu",
  "Ha",
  "Htr"
]);

const REQUIRED_HTR_COMPONENTS = Object.freeze(["Hd", "Hg", "Hu", "Ha"]);
const CONTROLLED_COMPONENTS = new Set(["Hg", "Hu", "Ha"]);
const DERIVED_RAW_FIELDS = new Set(["Hd", "Hg", "Hu", "Ha", "Htr"]);
const VALIDATION_IMPORT_OWNER = "validation_import_with_source";
const EXPERT_OVERRIDE_OWNER = "measured_override_with_source";

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

function assertRequiredString(value, path) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${path} must be a non-empty string`);
  }
}

function hasRequiredString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function assertFiniteNumber(value, path) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }
}

function assertNonNegativeNumber(value, path) {
  assertFiniteNumber(value, path);
  if (value < 0) {
    throw new Error(`${path} must be non-negative`);
  }
}

function assertUnit(value, path, expectedUnit = "W/K") {
  assertRequiredString(value, path);
  if (value !== expectedUnit) {
    throw new Error(`${path} must be ${expectedUnit}`);
  }
}

function assertSourceRefs(sourceRefs, path) {
  assertArray(sourceRefs, path);
  if (sourceRefs.length === 0) {
    throw new Error(`${path} must contain at least one item`);
  }
  sourceRefs.forEach((sourceRef, index) =>
    assertRequiredString(sourceRef, `${path}[${index}]`)
  );
}

function sourceRefsFromValue(value, path) {
  const sourceRefs = value?.provenance?.sourceRefs ?? value?.sourceRefs;
  assertSourceRefs(sourceRefs, `${path}.sourceRefs`);
  return [...sourceRefs];
}

function assertNotProductFallback(owner, path) {
  if (owner === "product_estimate" || owner === "product_fallback") {
    throw new Error(`${path}.owner is not allowed for MC001 transmission readiness`);
  }
}

function targetComponentFromPath(targetFieldPath, path) {
  assertRequiredString(targetFieldPath, path);
  const componentId = targetFieldPath.split(".").pop();
  if (!DERIVED_RAW_FIELDS.has(componentId)) {
    throw new Error(`${path} must target an MC001 transmission derived field`);
  }
  if (componentId === "Htr") {
    throw new Error(`${path} must not supply Htr directly; Htr is computed only after component readiness`);
  }
  if (!CONTROLLED_COMPONENTS.has(componentId)) {
    throw new Error(`${path} may only supply controlled Hg, Hu, or Ha components in Phase E`);
  }
  return componentId;
}

function assertTraceabilityOrTraceId(value, path) {
  if (hasRequiredString(value.traceId)) {
    return;
  }
  if (hasRequiredString(value.traceability)) {
    return;
  }
  if (isObject(value.traceability) && Object.keys(value.traceability).length > 0) {
    return;
  }
  throw new Error(`${path} must include traceId or traceability`);
}

function assertTimestampOrTraceId(value, path) {
  if (hasRequiredString(value.timestamp) || hasRequiredString(value.traceId)) {
    return;
  }
  throw new Error(`${path} must include timestamp or traceId`);
}

function controlledComponentResult({
  componentId,
  value,
  unit,
  sourceRefs,
  path,
  sourceKind,
  source,
  traceId,
  confidence,
  reviewStatus,
  owner
}) {
  assertNonNegativeNumber(value, `${path}.value`);
  assertUnit(unit, `${path}.unit`);
  assertSourceRefs(sourceRefs, `${path}.sourceRefs`);
  assertNotProductFallback(owner, path);

  return {
    componentId,
    status: "ready",
    value,
    unit,
    sourceKind,
    source: source ?? null,
    sourceRefs: Object.freeze([...sourceRefs]),
    traceId: traceId ?? null,
    confidence: confidence ?? reviewStatus ?? "reviewed",
    diagnosticCode: null,
    reason: null
  };
}

function validateValidationImport(entry, index) {
  const path = `validationImports[${index}]`;
  assertObject(entry, path);
  const componentId = targetComponentFromPath(entry.targetFieldPath, `${path}.targetFieldPath`);
  assertRequiredString(entry.importId, `${path}.importId`);
  assertRequiredString(entry.source, `${path}.source`);
  if (entry.owner !== VALIDATION_IMPORT_OWNER) {
    throw new Error(`${path}.owner must be ${VALIDATION_IMPORT_OWNER}`);
  }
  assertTraceabilityOrTraceId(entry, path);
  assertRequiredString(entry.importContext, `${path}.importContext`);
  assertRequiredString(entry.sourceFixtureId, `${path}.sourceFixtureId`);
  assertRequiredString(entry.reviewStatus, `${path}.reviewStatus`);
  if (entry.validatesFormulaPath === true) {
    throw new Error(`${path}.validatesFormulaPath must remain false`);
  }

  return controlledComponentResult({
    componentId,
    value: entry.value,
    unit: entry.unit,
    sourceRefs: entry.sourceRefs,
    path,
    sourceKind: "validationImport",
    source: entry.source,
    traceId: entry.traceId,
    confidence: entry.reviewStatus,
    owner: entry.owner
  });
}

function validateExpertOverride(entry, index) {
  const path = `expertOverrides[${index}]`;
  assertObject(entry, path);
  const componentId = targetComponentFromPath(entry.targetFieldPath, `${path}.targetFieldPath`);
  assertRequiredString(entry.overrideId, `${path}.overrideId`);
  if (entry.owner !== EXPERT_OVERRIDE_OWNER) {
    throw new Error(`${path}.owner must be ${EXPERT_OVERRIDE_OWNER}`);
  }
  assertRequiredString(entry.source, `${path}.source`);
  assertRequiredString(entry.reason, `${path}.reason`);
  if (!hasRequiredString(entry.approvedBy) && !hasRequiredString(entry.responsiblePerson)) {
    throw new Error(`${path} must include approvedBy or responsiblePerson`);
  }
  assertRequiredString(entry.confidence, `${path}.confidence`);
  assertTimestampOrTraceId(entry, path);

  return controlledComponentResult({
    componentId,
    value: entry.value,
    unit: entry.unit,
    sourceRefs: entry.sourceRefs,
    path,
    sourceKind: "expertOverride",
    source: entry.source,
    traceId: entry.traceId,
    confidence: entry.confidence,
    owner: entry.owner
  });
}

function validateComponentMetadata(componentId, metadata) {
  const path = `componentMetadata.${componentId}`;
  assertObject(metadata, path);
  assertRequiredString(metadata.status, `${path}.status`);

  if (metadata.status.startsWith("blocked")) {
    if ("value" in metadata) {
      throw new Error(`${path} is blocked and must not provide a zero fallback value`);
    }
    return {
      componentId,
      status: metadata.status,
      value: null,
      unit: metadata.unit ?? null,
      sourceKind: "componentMetadata",
      source: metadata.source ?? null,
      sourceRefs: Object.freeze([...(metadata.sourceRefs ?? [])]),
      traceId: metadata.traceId ?? null,
      confidence: metadata.confidence ?? null,
      diagnosticCode: metadata.status,
      reason: metadata.reason ?? `${componentId} is blocked by component metadata`
    };
  }

  if (metadata.status !== "ready") {
    throw new Error(`${path}.status is not supported: ${metadata.status}`);
  }

  return controlledComponentResult({
    componentId,
    value: metadata.value,
    unit: metadata.unit,
    sourceRefs: metadata.sourceRefs,
    path,
    sourceKind: "componentMetadata",
    source: metadata.source,
    traceId: metadata.traceId,
    confidence: metadata.confidence,
    owner: metadata.owner
  });
}

function collectControlledComponents({
  validationImports = [],
  expertOverrides = [],
  componentMetadata = {}
}) {
  assertArray(validationImports, "validationImports");
  assertArray(expertOverrides, "expertOverrides");
  assertObject(componentMetadata, "componentMetadata");

  const controlled = new Map();
  const addControlled = (entry) => {
    if (controlled.has(entry.componentId)) {
      throw new Error(`${entry.componentId} has multiple controlled readiness values`);
    }
    controlled.set(entry.componentId, entry);
  };

  for (const componentId of Object.keys(componentMetadata)) {
    if (!CONTROLLED_COMPONENTS.has(componentId)) {
      throw new Error(`componentMetadata.${componentId} is outside Phase E controlled component scope`);
    }
    addControlled(validateComponentMetadata(componentId, componentMetadata[componentId]));
  }

  validationImports.forEach((entry, index) => addControlled(validateValidationImport(entry, index)));
  expertOverrides.forEach((entry, index) => addControlled(validateExpertOverride(entry, index)));

  return controlled;
}

function assertEnvelopeBuilderOutput(envelopeBuilderOutput) {
  assertObject(envelopeBuilderOutput, "envelopeBuilderOutput");
  assertObject(envelopeBuilderOutput.phaseCGate, "envelopeBuilderOutput.phaseCGate");
  if (envelopeBuilderOutput.phaseCGate.status !== "accepted_input_builder_gate") {
    throw new Error("envelopeBuilderOutput.phaseCGate must be accepted_input_builder_gate");
  }
  assertArray(envelopeBuilderOutput.elementResults, "envelopeBuilderOutput.elementResults");
  assertArray(envelopeBuilderOutput.bridgeResults, "envelopeBuilderOutput.bridgeResults");
  assertArray(envelopeBuilderOutput.blockedItems, "envelopeBuilderOutput.blockedItems");
  assertObject(envelopeBuilderOutput.readinessClaims, "envelopeBuilderOutput.readinessClaims");
}

function assertNoCorrectedUBridgeDoubleCounting(envelopeBuilderOutput) {
  const correctedElement = envelopeBuilderOutput.elementResults.find(
    (element) => element.method === "source_backed_corrected_u_value"
  );
  if (!correctedElement) {
    return;
  }
  if (envelopeBuilderOutput.bridgeResults.length > 0) {
    throw new Error(
      `correctedUValue for ${correctedElement.elementId} cannot be combined with explicit psi/chi bridge terms in Phase E Htr readiness`
    );
  }
}

function classifyHd(envelopeBuilderOutput, componentClaims) {
  const subtotal = envelopeBuilderOutput.directTransmissionSubtotal;
  if (!subtotal) {
    if (componentClaims?.Hd === "ready") {
      throw new Error("Hd is claimed ready but envelopeBuilderOutput.directTransmissionSubtotal is missing");
    }
    return {
      componentId: "Hd",
      status: "blocked_missing_exterior_direct_transmission",
      value: null,
      unit: "W/K",
      sourceRefs: Object.freeze([]),
      diagnosticCode: "blocked_missing_exterior_direct_transmission",
      reason: "Hd exterior direct subtotal is missing"
    };
  }

  assertNonNegativeNumber(subtotal.value, "envelopeBuilderOutput.directTransmissionSubtotal.value");
  assertUnit(subtotal.unit, "envelopeBuilderOutput.directTransmissionSubtotal.unit");

  if (envelopeBuilderOutput.readinessClaims.isDirectTransmissionSubtotalReady !== true) {
    if (componentClaims?.Hd === "ready") {
      throw new Error("Hd is claimed ready but Phase D did not mark direct transmission ready");
    }
    return {
      componentId: "Hd",
      status: "blocked_direct_transmission_not_ready",
      value: null,
      unit: "W/K",
      sourceRefs: Object.freeze([]),
      diagnosticCode: "blocked_direct_transmission_not_ready",
      reason: "Phase D direct transmission subtotal is not ready"
    };
  }

  const sourceRefs = envelopeBuilderOutput.elementResults.flatMap((element, index) =>
    sourceRefsFromValue(
      element.directTransmissionContribution,
      `envelopeBuilderOutput.elementResults[${index}].directTransmissionContribution`
    )
  );

  return {
    componentId: "Hd",
    status: "ready",
    value: subtotal.value,
    unit: subtotal.unit,
    formulaId: subtotal.formulaId,
    method: subtotal.method,
    sourceRefs: Object.freeze([...new Set(sourceRefs)]),
    diagnosticCode: null,
    reason: null
  };
}

function classifyThermalBridges(envelopeBuilderOutput) {
  const hasCorrectedU = envelopeBuilderOutput.elementResults.some(
    (element) => element.method === "source_backed_corrected_u_value"
  );

  if (envelopeBuilderOutput.bridgeResults.length === 0) {
    if (hasCorrectedU) {
      return {
        componentId: "thermalBridges",
        status: "controlled_in_corrected_u_path",
        value: null,
        unit: "W/K",
        sourceRefs: Object.freeze([]),
        diagnosticCode: null,
        reason: "Corrected U path contains correction effects; no explicit psi/chi terms are combined"
      };
    }

    if (envelopeBuilderOutput.directTransmissionSubtotal?.method === "plainUWithoutBridgeData_lowConfidence") {
      return {
        componentId: "thermalBridges",
        status: "blocked_missing_source_backed_bridge_data",
        value: null,
        unit: "W/K",
        sourceRefs: Object.freeze([]),
        diagnosticCode: "blocked_missing_source_backed_bridge_data",
        reason: "Plain U direct transmission has no source-backed bridge data"
      };
    }

    return {
      componentId: "thermalBridges",
      status: "not_supplied",
      value: null,
      unit: "W/K",
      sourceRefs: Object.freeze([]),
      diagnosticCode: null,
      reason: "No explicit thermal bridge terms supplied"
    };
  }

  const sourceRefs = [];
  const value = envelopeBuilderOutput.bridgeResults.reduce((sum, bridge, index) => {
    assertObject(bridge, `envelopeBuilderOutput.bridgeResults[${index}]`);
    assertObject(bridge.contribution, `envelopeBuilderOutput.bridgeResults[${index}].contribution`);
    assertNonNegativeNumber(
      bridge.contribution.value,
      `envelopeBuilderOutput.bridgeResults[${index}].contribution.value`
    );
    assertUnit(
      bridge.contribution.unit,
      `envelopeBuilderOutput.bridgeResults[${index}].contribution.unit`
    );
    sourceRefs.push(
      ...sourceRefsFromValue(
        bridge.contribution,
        `envelopeBuilderOutput.bridgeResults[${index}].contribution`
      )
    );
    return sum + bridge.contribution.value;
  }, 0);

  return {
    componentId: "thermalBridges",
    status: "ready",
    value,
    unit: "W/K",
    sourceRefs: Object.freeze([...new Set(sourceRefs)]),
    diagnosticCode: null,
    reason: null
  };
}

function blockedMissingComponent(componentId) {
  return {
    componentId,
    status: "blocked_missing_validated_method",
    value: null,
    unit: "W/K",
    sourceRefs: Object.freeze([]),
    sourceKind: null,
    diagnosticCode: "blocked_missing_validated_method",
    reason: `${componentId} requires a validated source-backed method, validation import, or expert override`
  };
}

function componentIsBlocked(component) {
  return component.status.startsWith("blocked");
}

function diagnosticFromComponent(component) {
  return {
    level: componentIsBlocked(component) ? "blocked" : "info",
    componentId: component.componentId,
    code: component.diagnosticCode ?? component.status,
    message: component.reason ?? component.status
  };
}

function rejectUnsupportedNormalAuditorTransmissionInput(normalAuditorInput) {
  if (normalAuditorInput === undefined) {
    return;
  }
  assertObject(normalAuditorInput, "normalAuditorInput");
  for (const key of Object.keys(normalAuditorInput)) {
    if (DERIVED_RAW_FIELDS.has(key)) {
      throw new Error(
        `Derived value normalAuditorInput.${key} must pass through Phase C validationImports or expertOverrides`
      );
    }
  }
}

export function createMc001TransmissionHtrReadinessGate({
  envelopeBuilderOutput,
  componentMetadata = {},
  validationImports = [],
  expertOverrides = [],
  componentClaims = {},
  normalAuditorInput
} = {}) {
  rejectUnsupportedNormalAuditorTransmissionInput(normalAuditorInput);
  assertEnvelopeBuilderOutput(envelopeBuilderOutput);
  assertObject(componentClaims, "componentClaims");
  assertNoCorrectedUBridgeDoubleCounting(envelopeBuilderOutput);

  const controlledComponents = collectControlledComponents({
    validationImports,
    expertOverrides,
    componentMetadata
  });

  const componentReadiness = {
    Hd: classifyHd(envelopeBuilderOutput, componentClaims),
    thermalBridges: classifyThermalBridges(envelopeBuilderOutput)
  };

  for (const componentId of ["Hg", "Hu", "Ha"]) {
    componentReadiness[componentId] =
      controlledComponents.get(componentId) ?? blockedMissingComponent(componentId);
  }

  const blockedComponents = Object.values(componentReadiness).filter(componentIsBlocked);
  for (const blockedItem of envelopeBuilderOutput.blockedItems) {
    blockedComponents.push({
      componentId: blockedItem.boundaryType === "ground"
        ? "Hg"
        : blockedItem.boundaryType === "unconditioned"
          ? "Hu"
          : blockedItem.boundaryType === "adjacent"
            ? "Ha"
            : "Htr",
      status: blockedItem.status,
      value: null,
      unit: "W/K",
      sourceRefs: Object.freeze([...(blockedItem.sourceRefs ?? [])]),
      diagnosticCode: blockedItem.status,
      reason: blockedItem.reason,
      path: blockedItem.path
    });
  }

  if (componentClaims?.Htr === "ready" && blockedComponents.length > 0) {
    throw new Error("Htr is claimed ready while transmission components are blocked");
  }

  const allRequiredComponentsReady = REQUIRED_HTR_COMPONENTS.every(
    (componentId) => componentReadiness[componentId]?.status === "ready"
  );
  const thermalBridgesComplete =
    componentReadiness.thermalBridges.status === "ready" ||
    componentReadiness.thermalBridges.status === "controlled_in_corrected_u_path";
  const hasBlockedItems = envelopeBuilderOutput.blockedItems.length > 0;
  const canComputeHtr =
    allRequiredComponentsReady &&
    thermalBridgesComplete &&
    blockedComponents.length === 0 &&
    !hasBlockedItems;

  let htrResult = null;
  if (canComputeHtr) {
    const helperResult = calculateTotalTransmissionCoefficient({
      hd: componentReadiness.Hd.value,
      hg: componentReadiness.Hg.value,
      hu: componentReadiness.Hu.value,
      ha: componentReadiness.Ha.value,
      applicability: {
        hgApplicable: true,
        huApplicable: true,
        haApplicable: true
      }
    });
    htrResult = {
      value: helperResult.value,
      unit: helperResult.unit,
      formulaId: helperResult.formulaId,
      trace: helperResult.trace,
      provenance: {
        sourceRefs: Object.freeze([
          ...new Set(
            REQUIRED_HTR_COMPONENTS.flatMap(
              (componentId) => componentReadiness[componentId].sourceRefs
            )
          )
        ]),
        status: "calculated_from_complete_source_backed_components",
        owner: "physics_engine"
      }
    };
    componentReadiness.Htr = {
      componentId: "Htr",
      status: "ready",
      value: htrResult.value,
      unit: htrResult.unit,
      sourceRefs: htrResult.provenance.sourceRefs,
      diagnosticCode: null,
      reason: null
    };
  } else {
    componentReadiness.Htr = {
      componentId: "Htr",
      status: "blocked_incomplete_components",
      value: null,
      unit: "W/K",
      sourceRefs: Object.freeze([]),
      diagnosticCode: "blocked_incomplete_components",
      reason: "Htr requires Hd, Hg, Hu, and Ha to be complete and no blocked items"
    };
  }

  const diagnostics = [
    ...Object.values(componentReadiness)
      .filter((component) => component.status !== "ready")
      .map(diagnosticFromComponent),
    ...envelopeBuilderOutput.blockedItems.map((item) => ({
      level: "blocked",
      componentId: item.boundaryType === "ground"
        ? "Hg"
        : item.boundaryType === "unconditioned"
          ? "Hu"
          : item.boundaryType === "adjacent"
            ? "Ha"
            : "Htr",
      code: item.status,
      message: item.reason,
      path: item.path
    }))
  ];

  const supportedTransmissionComponents = Object.values(componentReadiness)
    .filter((component) => component.status === "ready")
    .map((component) => component.componentId);

  return {
    gateId: MC001_TRANSMISSION_HTR_READINESS_GATE_ID,
    status: htrResult ? "ready_complete_htr" : "blocked_incomplete_components",
    phaseDBuilderId: envelopeBuilderOutput.builderId,
    phaseCGateId: envelopeBuilderOutput.phaseCGate.gateId,
    componentReadiness,
    supportedTransmissionComponents: Object.freeze(supportedTransmissionComponents),
    blockedComponents: Object.freeze(blockedComponents),
    diagnostics: Object.freeze(diagnostics),
    sourceTrace: Object.freeze(
      Object.fromEntries(
        Object.entries(componentReadiness).map(([componentId, component]) => [
          componentId,
          component.sourceRefs ?? []
        ])
      )
    ),
    htrResult,
    readinessFlags: {
      isHdExteriorDirectReady: componentReadiness.Hd.status === "ready",
      areThermalBridgesReady:
        componentReadiness.thermalBridges.status === "ready" ||
        componentReadiness.thermalBridges.status === "controlled_in_corrected_u_path",
      isHtrReady: htrResult !== null,
      isCompleteTransmissionReady: htrResult !== null,
      isCompleteEnvelopeReady: false,
      isLevel2Ready: false,
      isCertificateCpeWorkflowReady: false,
      isProductionIntegrationReady: false
    },
    nextRequiredStep:
      "KEEP_HTR_BLOCKED_UNTIL_HD_HG_HU_HA_ARE_SOURCE_BACKED_AND_NO_BLOCKED_ITEMS_REMAIN"
  };
}

export function createMc001TransmissionHtrReadinessGateFromAuditorInput(
  inputPack,
  { registry, componentMetadata = {}, componentClaims = {} } = {}
) {
  const envelopeBuilderOutput = createMc001EnvelopeInputBuilder(inputPack, { registry });
  return createMc001TransmissionHtrReadinessGate({
    envelopeBuilderOutput,
    componentMetadata,
    validationImports: inputPack.validationImports,
    expertOverrides: inputPack.expertOverrides,
    componentClaims
  });
}
