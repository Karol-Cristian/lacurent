import { MC001_TRANSMISSION_HTR_READINESS_GATE_ID } from "./mc001TransmissionHtrReadinessGate.mjs";
import { MC001_VENTILATION_INPUT_BUILDER_ID } from "./mc001VentilationInputBuilder.mjs";

export const MC001_HEAT_LOSS_READINESS_GATE_ID =
  "MC001_HEAT_LOSS_READINESS_GATE_PHASE_F";

const DERIVED_NORMAL_INPUT_FIELDS = new Set([
  "Htr",
  "Hve",
  "totalHeatLoss",
  "QHnd",
  "finalEnergyKWh",
  "primaryEnergyKWh",
  "totalPrimaryEnergyKWh",
  "co2Kg",
  "totalCO2Kg"
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

function rejectDerivedNormalHeatLossInput(normalAuditorInput) {
  if (normalAuditorInput === undefined) {
    return;
  }
  assertObject(normalAuditorInput, "normalAuditorInput");
  for (const key of Object.keys(normalAuditorInput)) {
    if (DERIVED_NORMAL_INPUT_FIELDS.has(key)) {
      throw new Error(
        `Derived value normalAuditorInput.${key} must pass through Phase C validationImports or expertOverrides`
      );
    }
  }
}

function assertTransmissionReadinessOutput(transmissionReadinessOutput) {
  assertObject(transmissionReadinessOutput, "transmissionReadinessOutput");
  if (transmissionReadinessOutput.gateId !== MC001_TRANSMISSION_HTR_READINESS_GATE_ID) {
    throw new Error(
      `transmissionReadinessOutput.gateId must be ${MC001_TRANSMISSION_HTR_READINESS_GATE_ID}`
    );
  }
  assertObject(
    transmissionReadinessOutput.componentReadiness,
    "transmissionReadinessOutput.componentReadiness"
  );
  assertObject(
    transmissionReadinessOutput.readinessFlags,
    "transmissionReadinessOutput.readinessFlags"
  );
  assertArray(
    transmissionReadinessOutput.blockedComponents,
    "transmissionReadinessOutput.blockedComponents"
  );
}

function assertVentilationReadinessOutput(ventilationReadinessOutput) {
  assertObject(ventilationReadinessOutput, "ventilationReadinessOutput");
  if (ventilationReadinessOutput.builderId !== MC001_VENTILATION_INPUT_BUILDER_ID) {
    throw new Error(
      `ventilationReadinessOutput.builderId must be ${MC001_VENTILATION_INPUT_BUILDER_ID}`
    );
  }
  assertObject(
    ventilationReadinessOutput.componentReadiness,
    "ventilationReadinessOutput.componentReadiness"
  );
  assertObject(
    ventilationReadinessOutput.readinessFlags,
    "ventilationReadinessOutput.readinessFlags"
  );
  assertArray(ventilationReadinessOutput.blockedItems, "ventilationReadinessOutput.blockedItems");
}

function blockedComponentHasValue(component) {
  return component?.status?.startsWith("blocked") && component.value !== null;
}

function classifyHtr(transmissionReadinessOutput, componentClaims) {
  const htr = transmissionReadinessOutput.componentReadiness.Htr;
  assertObject(htr, "transmissionReadinessOutput.componentReadiness.Htr");

  if (blockedComponentHasValue(htr)) {
    throw new Error("blocked Htr must not provide a fallback numeric value");
  }

  if (htr.status !== "ready") {
    if (componentClaims?.heatLoss === "ready" || componentClaims?.Htr === "ready") {
      throw new Error("heat-loss readiness is claimed while Htr is blocked or partial");
    }
    return {
      componentId: "Htr",
      status: htr.status ?? "blocked_incomplete_htr",
      value: null,
      unit: htr.unit ?? "W/K",
      sourceRefs: Object.freeze([]),
      diagnosticCode: htr.diagnosticCode ?? htr.status ?? "blocked_incomplete_htr",
      reason: htr.reason ?? "Htr is not ready"
    };
  }

  if (transmissionReadinessOutput.readinessFlags.isHtrReady !== true) {
    throw new Error("Htr component is ready but transmission readiness flag is false");
  }

  assertNonNegativeNumber(htr.value, "transmissionReadinessOutput.componentReadiness.Htr.value");
  assertUnit(htr.unit, "transmissionReadinessOutput.componentReadiness.Htr.unit");
  assertSourceRefs(htr.sourceRefs, "transmissionReadinessOutput.componentReadiness.Htr.sourceRefs");

  return {
    componentId: "Htr",
    status: "ready",
    value: htr.value,
    unit: htr.unit,
    sourceRefs: Object.freeze([...htr.sourceRefs]),
    diagnosticCode: null,
    reason: null
  };
}

function classifyHve(ventilationReadinessOutput, componentClaims) {
  const hve = ventilationReadinessOutput.componentReadiness.Hve;
  assertObject(hve, "ventilationReadinessOutput.componentReadiness.Hve");

  if (blockedComponentHasValue(hve)) {
    throw new Error("blocked Hve must not provide a fallback numeric value");
  }

  if (hve.status !== "ready") {
    if (componentClaims?.heatLoss === "ready" || componentClaims?.Hve === "ready") {
      throw new Error("heat-loss readiness is claimed while Hve is blocked or partial");
    }
    return {
      componentId: "Hve",
      status: hve.status ?? "blocked_incomplete_hve",
      value: null,
      unit: hve.unit ?? "W/K",
      sourceRefs: Object.freeze([]),
      diagnosticCode: hve.diagnosticCode ?? hve.status ?? "blocked_incomplete_hve",
      reason: hve.reason ?? "Hve is not ready"
    };
  }

  if (ventilationReadinessOutput.readinessFlags.isHveReady !== true) {
    throw new Error("Hve component is ready but ventilation readiness flag is false");
  }

  assertNonNegativeNumber(hve.value, "ventilationReadinessOutput.componentReadiness.Hve.value");
  assertUnit(hve.unit, "ventilationReadinessOutput.componentReadiness.Hve.unit");
  assertSourceRefs(hve.sourceRefs, "ventilationReadinessOutput.componentReadiness.Hve.sourceRefs");

  return {
    componentId: "Hve",
    status: "ready",
    value: hve.value,
    unit: hve.unit,
    sourceRefs: Object.freeze([...hve.sourceRefs]),
    diagnosticCode: null,
    reason: null
  };
}

function componentIsBlocked(component) {
  return component.status !== "ready";
}

function diagnosticFromComponent(component) {
  return {
    level: componentIsBlocked(component) ? "blocked" : "info",
    componentId: component.componentId,
    code: component.diagnosticCode ?? component.status,
    message: component.reason ?? component.status
  };
}

export function createMc001HeatLossReadinessGate({
  transmissionReadinessOutput,
  ventilationReadinessOutput,
  componentClaims = {},
  normalAuditorInput
} = {}) {
  rejectDerivedNormalHeatLossInput(normalAuditorInput);
  assertTransmissionReadinessOutput(transmissionReadinessOutput);
  assertVentilationReadinessOutput(ventilationReadinessOutput);
  assertObject(componentClaims, "componentClaims");

  const componentReadiness = {
    Htr: classifyHtr(transmissionReadinessOutput, componentClaims),
    Hve: classifyHve(ventilationReadinessOutput, componentClaims)
  };

  const blockedComponents = [
    ...Object.values(componentReadiness).filter(componentIsBlocked),
    ...transmissionReadinessOutput.blockedComponents.map((component) => ({
      componentId: component.componentId ?? "Htr",
      status: component.status,
      value: null,
      unit: component.unit ?? "W/K",
      sourceRefs: Object.freeze([...(component.sourceRefs ?? [])]),
      diagnosticCode: component.diagnosticCode ?? component.status,
      reason: component.reason
    })),
    ...ventilationReadinessOutput.blockedItems.map((item) => ({
      componentId: "Hve",
      status: item.status,
      value: null,
      unit: "W/K",
      sourceRefs: Object.freeze([...(item.sourceRefs ?? [])]),
      diagnosticCode: item.status,
      reason: item.reason,
      path: item.path
    }))
  ];

  if (componentClaims?.heatLoss === "ready" && blockedComponents.length > 0) {
    throw new Error("heat-loss readiness is claimed while Htr or Hve is blocked");
  }

  const canPrepareHeatLoss =
    componentReadiness.Htr.status === "ready" &&
    componentReadiness.Hve.status === "ready" &&
    blockedComponents.length === 0;

  const heatLossResult = canPrepareHeatLoss
    ? {
        value: componentReadiness.Htr.value + componentReadiness.Hve.value,
        unit: "W/K",
        relation: "heat_loss_readiness_component_sum_Htr_plus_Hve",
        provenance: {
          sourceRefs: Object.freeze([
            ...new Set([
              ...componentReadiness.Htr.sourceRefs,
              ...componentReadiness.Hve.sourceRefs
            ])
          ]),
          status: "readiness_aggregate_from_complete_source_backed_components",
          owner: "physics_engine"
        }
      }
    : null;

  const diagnostics = [
    ...Object.values(componentReadiness)
      .filter(componentIsBlocked)
      .map(diagnosticFromComponent),
    ...transmissionReadinessOutput.diagnostics.map((diagnostic) => ({
      ...diagnostic,
      upstreamGate: MC001_TRANSMISSION_HTR_READINESS_GATE_ID
    })),
    ...ventilationReadinessOutput.diagnostics.map((diagnostic) => ({
      ...diagnostic,
      upstreamGate: MC001_VENTILATION_INPUT_BUILDER_ID
    }))
  ];

  return {
    gateId: MC001_HEAT_LOSS_READINESS_GATE_ID,
    status: heatLossResult
      ? "ready_heat_loss_components"
      : "blocked_incomplete_heat_loss_components",
    transmissionGateId: transmissionReadinessOutput.gateId,
    ventilationBuilderId: ventilationReadinessOutput.builderId,
    componentReadiness,
    blockedComponents: Object.freeze(blockedComponents),
    diagnostics: Object.freeze(diagnostics),
    sourceTrace: Object.freeze({
      Htr: componentReadiness.Htr.sourceRefs ?? [],
      Hve: componentReadiness.Hve.sourceRefs ?? [],
      heatLoss: heatLossResult?.provenance.sourceRefs ?? []
    }),
    heatLossResult,
    readinessFlags: {
      isHtrReady: componentReadiness.Htr.status === "ready",
      isHveReady: componentReadiness.Hve.status === "ready",
      isHeatLossReady: heatLossResult !== null,
      isMonthlyHeatingReady: false,
      isQhndReady: false,
      isLevel2Ready: false,
      isCertificateCpeWorkflowReady: false,
      isProductionIntegrationReady: false
    },
    nextRequiredStep:
      "KEEP_MONTHLY_HEATING_BLOCKED_UNTIL_HEAT_LOSS_CLIMATE_GAINS_AND_METHOD_BOUNDARIES_ARE_COMPLETE"
  };
}
