import {
  calculateLayerResistance,
  calculateLambdaCorrected,
  calculateTotalResistance,
  calculateUValue
} from "./materialsUValues.mjs";
import { createMc001AuditorInputBuilderGate } from "./mc001AuditorInputBuilderGate.mjs";
import {
  calculateDirectTransmissionWithBridges,
  calculateDirectTransmissionWithCorrectedU
} from "./transmissionCoefficients.mjs";

export const MC001_ENVELOPE_INPUT_BUILDER_ID =
  "MC001_ENVELOPE_FROM_AUDITOR_INPUT_PHASE_D";

export const SUPPORTED_ENVELOPE_BOUNDARY_TYPES = Object.freeze(["exterior"]);

export const BLOCKED_ENVELOPE_BOUNDARY_TYPES = Object.freeze([
  "ground",
  "unconditioned",
  "adjacent"
]);

const VALID_ELEMENT_TYPES = new Set([
  "wall",
  "roof",
  "floor",
  "window",
  "door",
  "slab"
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

function assertRequiredString(value, path) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${path} must be a non-empty string`);
  }
}

function assertFiniteNumber(value, path) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }
}

function assertPositiveNumber(value, path) {
  assertFiniteNumber(value, path);
  if (value <= 0) {
    throw new Error(`${path} must be positive`);
  }
}

function assertNonNegativeNumber(value, path) {
  assertFiniteNumber(value, path);
  if (value < 0) {
    throw new Error(`${path} must be non-negative`);
  }
}

function assertUnit(envelope, expectedUnit, path) {
  assertRequiredString(envelope.unit, `${path}.unit`);
  if (envelope.unit !== expectedUnit) {
    throw new Error(`${path}.unit must be ${expectedUnit}`);
  }
}

function hasSourceRefs(envelope) {
  return Array.isArray(envelope?.sourceRefs) && envelope.sourceRefs.length > 0;
}

function assertSourceRefs(envelope, path) {
  if (!hasSourceRefs(envelope)) {
    throw new Error(`${path}.sourceRefs must contain at least one item`);
  }
}

function assertValueEnvelope(envelope, path, expectedUnit) {
  assertObject(envelope, path);
  assertFiniteNumber(envelope.value, `${path}.value`);
  assertUnit(envelope, expectedUnit, path);
  assertRequiredString(envelope.owner, `${path}.owner`);
  assertSourceRefs(envelope, path);
  assertRequiredString(envelope.confidence, `${path}.confidence`);
  assertRequiredString(envelope.status, `${path}.status`);
  return envelope;
}

function positiveValueEnvelope(envelope, path, expectedUnit) {
  const valueEnvelope = assertValueEnvelope(envelope, path, expectedUnit);
  assertPositiveNumber(valueEnvelope.value, `${path}.value`);
  return valueEnvelope;
}

function nonNegativeValueEnvelope(envelope, path, expectedUnit) {
  const valueEnvelope = assertValueEnvelope(envelope, path, expectedUnit);
  assertNonNegativeNumber(valueEnvelope.value, `${path}.value`);
  return valueEnvelope;
}

function provenanceFromEnvelope(envelope) {
  return {
    sourceRefs: Object.freeze([...(envelope.sourceRefs ?? [])]),
    confidence: envelope.confidence,
    status: envelope.status,
    owner: envelope.owner
  };
}

function resultValue(value, unit, envelope, extra = {}) {
  return {
    value,
    unit,
    provenance: provenanceFromEnvelope(envelope),
    ...extra
  };
}

function blockElement(element, path, reason, status = "blocked_missing_normative_data") {
  return {
    itemType: "envelope_element",
    elementId: element.elementId,
    elementType: element.elementType,
    boundaryType: element.boundaryType,
    status,
    reason,
    sourceRefs: element.area?.sourceRefs ?? [],
    path
  };
}

function validateElementEnvelope(element, path) {
  assertObject(element, path);
  assertRequiredString(element.elementId, `${path}.elementId`);
  assertRequiredString(element.elementType, `${path}.elementType`);
  if (!VALID_ELEMENT_TYPES.has(element.elementType)) {
    throw new Error(`${path}.elementType is not supported: ${element.elementType}`);
  }
  assertRequiredString(element.boundaryType, `${path}.boundaryType`);
  positiveValueEnvelope(element.area, `${path}.area`, "m2");
}

function classifyBoundary(element, path) {
  if (SUPPORTED_ENVELOPE_BOUNDARY_TYPES.includes(element.boundaryType)) {
    return null;
  }

  if (BLOCKED_ENVELOPE_BOUNDARY_TYPES.includes(element.boundaryType)) {
    return blockElement(
      element,
      path,
      `${element.boundaryType} boundary requires a source-backed method that Phase D does not implement`
    );
  }

  return blockElement(
    element,
    path,
    `unsupported boundary type ${element.boundaryType}`,
    "blocked_missing_normative_data"
  );
}

function resolveCertifiedUValue(element, path) {
  if (element.certifiedUValue === undefined) {
    return null;
  }

  const certifiedU = positiveValueEnvelope(
    element.certifiedUValue,
    `${path}.certifiedUValue`,
    "W/m2K"
  );

  return {
    method: "source_backed_certified_u_value",
    uValue: resultValue(certifiedU.value, "W/m2K", certifiedU, {
      formulaId: "SOURCE_BACKED_CERTIFIED_U_VALUE",
      trace: {
        inputValues: {
          certifiedUValue: certifiedU.value,
          unit: certifiedU.unit,
          sourceRefs: certifiedU.sourceRefs
        }
      }
    }),
    diagnostics: []
  };
}

function resolveCorrectedUValue(element, path) {
  if (element.correctedUValue === undefined) {
    return null;
  }

  const correctedU = positiveValueEnvelope(
    element.correctedUValue,
    `${path}.correctedUValue`,
    "W/m2K"
  );

  return {
    method: "source_backed_corrected_u_value",
    uValue: resultValue(correctedU.value, "W/m2K", correctedU, {
      formulaId: "SOURCE_BACKED_CORRECTED_U_VALUE",
      trace: {
        inputValues: {
          correctedUValue: correctedU.value,
          unit: correctedU.unit,
          sourceRefs: correctedU.sourceRefs
        }
      }
    }),
    diagnostics: []
  };
}

function resolveLayerUValue(element, path) {
  if (element.layers === undefined) {
    return null;
  }

  assertArray(element.layers, `${path}.layers`);
  if (element.layers.length === 0) {
    throw new Error(`${path}.layers must contain at least one layer`);
  }

  const rsi = nonNegativeValueEnvelope(element.rsi, `${path}.rsi`, "m2K/W");
  const rse = nonNegativeValueEnvelope(element.rse, `${path}.rse`, "m2K/W");

  const layerResults = element.layers.map((layer, layerIndex) => {
    const layerPath = `${path}.layers[${layerIndex}]`;
    assertObject(layer, layerPath);
    assertRequiredString(layer.layerId, `${layerPath}.layerId`);
    const thickness = positiveValueEnvelope(layer.thickness, `${layerPath}.thickness`, "m");
    const lambda = positiveValueEnvelope(layer.lambda, `${layerPath}.lambda`, "W/mK");

    let lambdaForResistance = lambda.value;
    let lambdaTrace = {
      formulaId: "SOURCE_BACKED_LAYER_LAMBDA",
      value: lambda.value,
      unit: lambda.unit,
      sourceRefs: lambda.sourceRefs
    };

    if (layer.correctionCoefficientA !== undefined) {
      const coefficient = positiveValueEnvelope(
        layer.correctionCoefficientA,
        `${layerPath}.correctionCoefficientA`,
        "-"
      );
      const lambdaCorrected = calculateLambdaCorrected({
        lambdaNormat: lambda.value,
        correctionCoefficientA: coefficient.value,
        materialId: layer.materialId,
        source: coefficient.sourceRefs.join(",")
      });
      lambdaForResistance = lambdaCorrected.value;
      lambdaTrace = lambdaCorrected.trace;
    }

    const resistance = calculateLayerResistance({
      thicknessM: thickness.value,
      lambdaWmK: lambdaForResistance
    });

    return {
      layerId: layer.layerId,
      materialId: layer.materialId ?? null,
      thickness: resultValue(thickness.value, "m", thickness),
      lambda: resultValue(lambda.value, "W/mK", lambda, { trace: lambdaTrace }),
      resistance: {
        value: resistance.value,
        unit: resistance.unit,
        trace: resistance.trace
      }
    };
  });

  const totalResistance = calculateTotalResistance({
    rsi: rsi.value,
    layersR: layerResults.map((layer) => layer.resistance.value),
    airLayersR: [],
    rse: rse.value
  });
  const uValue = calculateUValue({ totalResistance: totalResistance.value });

  return {
    method: "source_backed_layer_u_value",
    layerResults,
    totalResistance: {
      value: totalResistance.value,
      unit: totalResistance.unit,
      trace: totalResistance.trace
    },
    uValue: {
      value: uValue.value,
      unit: uValue.unit,
      provenance: {
        sourceRefs: [
          ...rsi.sourceRefs,
          ...rse.sourceRefs,
          ...element.layers.flatMap((layer) => [
            ...(layer.thickness?.sourceRefs ?? []),
            ...(layer.lambda?.sourceRefs ?? []),
            ...(layer.correctionCoefficientA?.sourceRefs ?? [])
          ])
        ],
        confidence: "reviewed",
        status: "calculated_from_source_backed_layers",
        owner: "physics_engine"
      },
      formulaId: uValue.formulaId,
      trace: uValue.trace
    },
    diagnostics: [...uValue.warnings]
  };
}

function resolveElementUValue(element, path) {
  const certified = resolveCertifiedUValue(element, path);
  if (certified) {
    return certified;
  }

  const corrected = resolveCorrectedUValue(element, path);
  if (corrected) {
    return corrected;
  }

  const layerBased = resolveLayerUValue(element, path);
  if (layerBased) {
    return layerBased;
  }

  throw new Error(
    `${path} requires certifiedUValue, correctedUValue, or source-backed layers`
  );
}

function prepareElement(element, index) {
  const path = `envelope.elements[${index}]`;
  validateElementEnvelope(element, path);

  const boundaryBlocker = classifyBoundary(element, path);
  if (boundaryBlocker) {
    return {
      blocked: boundaryBlocker,
      elementResult: null,
      subtotalElement: null
    };
  }

  const area = positiveValueEnvelope(element.area, `${path}.area`, "m2");
  const uResolution = resolveElementUValue(element, path);
  const directValue = uResolution.uValue.value * area.value;

  const elementResult = {
    elementId: element.elementId,
    elementType: element.elementType,
    boundaryType: element.boundaryType,
    area: resultValue(area.value, "m2", area),
    method: uResolution.method,
    layers: uResolution.layerResults ?? [],
    totalResistance: uResolution.totalResistance ?? null,
    uValue: uResolution.uValue,
    directTransmissionContribution: {
      value: directValue,
      unit: "W/K",
      formulaId: "MC001_DIRECT_ELEMENT_TRANSMISSION_CONTRIBUTION",
      trace: {
        formulaText: "H_element = U * A",
        inputValues: {
          uValue: uResolution.uValue.value,
          areaM2: area.value
        },
        result: directValue,
        unit: "W/K"
      },
      provenance: {
        sourceRefs: [
          ...area.sourceRefs,
          ...(uResolution.uValue.provenance?.sourceRefs ?? [])
        ],
        confidence: "reviewed",
        status: "calculated_from_source_backed_inputs",
        owner: "physics_engine"
      }
    },
    diagnostics: uResolution.diagnostics
  };

  return {
    blocked: null,
    elementResult,
    subtotalElement: {
      elementId: element.elementId,
      method: uResolution.method,
      uValue: uResolution.uValue.value,
      areaM2: area.value,
      source: elementResult.directTransmissionContribution.provenance.sourceRefs.join(",")
    }
  };
}

function prepareLinearBridge(bridge, index) {
  const path = `envelope.thermalBridges.linear[${index}]`;
  assertObject(bridge, path);
  assertRequiredString(bridge.bridgeId, `${path}.bridgeId`);

  if (bridge.boundaryType && bridge.boundaryType !== "exterior") {
    return {
      blocked: {
        itemType: "thermal_bridge",
        bridgeId: bridge.bridgeId,
        boundaryType: bridge.boundaryType,
        status: "blocked_missing_normative_data",
        reason: `${bridge.boundaryType} bridge boundary is outside Phase D exterior direct-transmission scope`,
        sourceRefs: bridge.psi?.sourceRefs ?? [],
        path
      },
      bridgeResult: null,
      subtotalBridge: null
    };
  }

  const psi = assertValueEnvelope(bridge.psi, `${path}.psi`, "W/(mK)");
  assertFiniteNumber(psi.value, `${path}.psi.value`);
  const length = positiveValueEnvelope(bridge.length, `${path}.length`, "m");
  const contribution = psi.value * length.value;

  return {
    blocked: null,
    bridgeResult: {
      bridgeId: bridge.bridgeId,
      bridgeType: "linear",
      psi: resultValue(psi.value, "W/(mK)", psi),
      length: resultValue(length.value, "m", length),
      contribution: {
        value: contribution,
        unit: "W/K",
        formulaId: "MC001_LINEAR_THERMAL_BRIDGE_CONTRIBUTION",
        trace: {
          formulaText: "H_bridge_linear = psi * length",
          inputValues: {
            psi: psi.value,
            lengthM: length.value
          },
          result: contribution,
          unit: "W/K"
        },
        provenance: {
          sourceRefs: [...psi.sourceRefs, ...length.sourceRefs],
          confidence: "reviewed",
          status: "calculated_from_source_backed_inputs",
          owner: "physics_engine"
        }
      }
    },
    subtotalBridge: {
      bridgeId: bridge.bridgeId,
      psi: psi.value,
      lengthM: length.value,
      source: psi.sourceRefs.join(",")
    }
  };
}

function preparePointBridge(bridge, index) {
  const path = `envelope.thermalBridges.point[${index}]`;
  assertObject(bridge, path);
  assertRequiredString(bridge.bridgeId, `${path}.bridgeId`);

  if (bridge.boundaryType && bridge.boundaryType !== "exterior") {
    return {
      blocked: {
        itemType: "thermal_bridge",
        bridgeId: bridge.bridgeId,
        boundaryType: bridge.boundaryType,
        status: "blocked_missing_normative_data",
        reason: `${bridge.boundaryType} bridge boundary is outside Phase D exterior direct-transmission scope`,
        sourceRefs: bridge.chi?.sourceRefs ?? [],
        path
      },
      bridgeResult: null,
      subtotalBridge: null
    };
  }

  const chi = assertValueEnvelope(bridge.chi, `${path}.chi`, "W/K");
  assertFiniteNumber(chi.value, `${path}.chi.value`);

  return {
    blocked: null,
    bridgeResult: {
      bridgeId: bridge.bridgeId,
      bridgeType: "point",
      chi: resultValue(chi.value, "W/K", chi),
      contribution: {
        value: chi.value,
        unit: "W/K",
        formulaId: "MC001_POINT_THERMAL_BRIDGE_CONTRIBUTION",
        trace: {
          formulaText: "H_bridge_point = chi",
          inputValues: {
            chi: chi.value
          },
          result: chi.value,
          unit: "W/K"
        },
        provenance: {
          sourceRefs: [...chi.sourceRefs],
          confidence: "reviewed",
          status: "source_backed_input",
          owner: "physics_engine"
        }
      }
    },
    subtotalBridge: {
      bridgeId: bridge.bridgeId,
      chi: chi.value,
      source: chi.sourceRefs.join(",")
    }
  };
}

function prepareThermalBridges(envelope) {
  const thermalBridges = envelope.thermalBridges ?? {};
  assertObject(thermalBridges, "envelope.thermalBridges");
  const linear = thermalBridges.linear ?? [];
  const point = thermalBridges.point ?? [];
  assertArray(linear, "envelope.thermalBridges.linear");
  assertArray(point, "envelope.thermalBridges.point");

  const blockedItems = [];
  const bridgeResults = [];
  const subtotalLinear = [];
  const subtotalPoint = [];

  linear.forEach((bridge, index) => {
    const prepared = prepareLinearBridge(bridge, index);
    if (prepared.blocked) {
      blockedItems.push(prepared.blocked);
      return;
    }
    bridgeResults.push(prepared.bridgeResult);
    subtotalLinear.push(prepared.subtotalBridge);
  });

  point.forEach((bridge, index) => {
    const prepared = preparePointBridge(bridge, index);
    if (prepared.blocked) {
      blockedItems.push(prepared.blocked);
      return;
    }
    bridgeResults.push(prepared.bridgeResult);
    subtotalPoint.push(prepared.subtotalBridge);
  });

  return {
    blockedItems,
    bridgeResults,
    subtotalLinear,
    subtotalPoint
  };
}

function buildDirectTransmissionSubtotal({ elements, linearBridges, pointBridges }) {
  if (elements.length === 0 && linearBridges.length === 0 && pointBridges.length === 0) {
    return null;
  }

  if (elements.length === 0) {
    return {
      value: linearBridges.reduce((sum, bridge) => sum + bridge.psi * bridge.lengthM, 0) +
        pointBridges.reduce((sum, bridge) => sum + bridge.chi, 0),
      unit: "W/K",
      formulaId: "MC001_2_11_HD_WITH_BRIDGES",
      method: "sourceBackedThermalBridgeOnlyDiagnostic",
      warnings: ["no_exterior_element_terms_supplied_for_direct_transmission"],
      trace: {
        formulaText: "Hd diagnostic = sum(psi * length) + sum(chi)",
        inputValues: { linearBridges, pointBridges }
      }
    };
  }

  const allElementsUseCorrectedU = elements.every(
    (element) => element.method === "source_backed_corrected_u_value"
  );

  if (allElementsUseCorrectedU && linearBridges.length === 0 && pointBridges.length === 0) {
    return calculateDirectTransmissionWithCorrectedU({
      elements: elements.map((element) => ({
        elementId: element.elementId,
        uPrimeValue: element.uValue,
        areaM2: element.areaM2,
        source: element.source
      }))
    });
  }

  return calculateDirectTransmissionWithBridges({
    elements,
    linearBridges,
    pointBridges
  });
}

function assertNoCorrectedUBridgeDoubleCounting({ elementResults, linearBridges, pointBridges }) {
  const correctedElement = elementResults.find(
    (element) => element.method === "source_backed_corrected_u_value"
  );

  if (!correctedElement) {
    return;
  }

  if (linearBridges.length > 0 || pointBridges.length > 0) {
    throw new Error(
      `correctedUValue for ${correctedElement.elementId} cannot be combined with explicit psi/chi bridge terms in Phase D direct transmission subtotal`
    );
  }
}

export function createMc001EnvelopeInputBuilder(inputPack, { registry } = {}) {
  assertObject(inputPack, "inputPack");
  const phaseCGate = createMc001AuditorInputBuilderGate(inputPack, { registry });
  assertObject(inputPack.envelope, "envelope");
  assertArray(inputPack.envelope.elements, "envelope.elements");

  const blockedItems = [];
  const elementResults = [];
  const subtotalElements = [];

  inputPack.envelope.elements.forEach((element, index) => {
    const prepared = prepareElement(element, index);
    if (prepared.blocked) {
      blockedItems.push(prepared.blocked);
      return;
    }
    elementResults.push(prepared.elementResult);
    subtotalElements.push(prepared.subtotalElement);
  });

  const bridgePreparation = prepareThermalBridges(inputPack.envelope);
  blockedItems.push(...bridgePreparation.blockedItems);
  assertNoCorrectedUBridgeDoubleCounting({
    elementResults,
    linearBridges: bridgePreparation.subtotalLinear,
    pointBridges: bridgePreparation.subtotalPoint
  });
  const subtotal = buildDirectTransmissionSubtotal({
    elements: subtotalElements,
    linearBridges: bridgePreparation.subtotalLinear,
    pointBridges: bridgePreparation.subtotalPoint
  });

  const diagnostics = [
    ...blockedItems.map((item) => ({
      level: "blocked",
      code: item.status,
      message: item.reason,
      path: item.path
    })),
    ...(subtotal?.warnings ?? []).map((warning) => ({
      level: "warning",
      code: warning,
      message: warning
    }))
  ];

  return {
    builderId: MC001_ENVELOPE_INPUT_BUILDER_ID,
    status: "prepared_phase_d_envelope_input",
    phaseCGate,
    elementResults,
    bridgeResults: bridgePreparation.bridgeResults,
    directTransmissionSubtotal: subtotal
      ? {
          value: subtotal.value,
          unit: subtotal.unit,
          formulaId: subtotal.formulaId,
          method: subtotal.method ?? null,
          trace: subtotal.trace
        }
      : null,
    blockedItems,
    diagnostics,
    readinessClaims: {
      isDirectTransmissionSubtotalReady: subtotal !== null && elementResults.length > 0,
      isCompleteHtrReady: false,
      isCompleteEnvelopeReady: false,
      isLevel2Ready: false,
      isCertificateCpeWorkflowReady: false,
      isProductionIntegrationReady: false
    },
    nextRequiredStep:
      "KEEP_FULL_AUDITOR_BLOCKED_UNTIL_GROUND_UNCONDITIONED_ADJACENT_CLIMATE_AND_SYSTEM_INPUTS_ARE_SOURCE_BACKED"
  };
}
