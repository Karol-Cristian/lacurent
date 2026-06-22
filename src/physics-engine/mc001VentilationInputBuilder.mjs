import { createMc001AuditorInputBuilderGate } from "./mc001AuditorInputBuilderGate.mjs";
import {
  calculateAirflowFromACH,
  calculateBve,
  calculateBveFromUnconditionedZone,
  calculateVentilationHeatTransferCoefficient
} from "./ventilationCoefficients.mjs";

export const MC001_VENTILATION_INPUT_BUILDER_ID =
  "MC001_VENTILATION_FROM_AUDITOR_INPUT_PHASE_F";

export const SUPPORTED_VENTILATION_PATHS = Object.freeze([
  "natural_exterior_air",
  "mechanical_exterior_air_source_backed"
]);

export const SUPPORTED_VENTILATION_TYPES = Object.freeze([
  "natural",
  "mechanical"
]);

const SUPPORTED_PATHS = new Set(SUPPORTED_VENTILATION_PATHS);
const SUPPORTED_TYPES = new Set(SUPPORTED_VENTILATION_TYPES);
const DERIVED_NORMAL_INPUT_FIELDS = new Set([
  "Hve",
  "Htr",
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

function assertSourceRefs(envelope, path) {
  assertArray(envelope?.sourceRefs, `${path}.sourceRefs`);
  if (envelope.sourceRefs.length === 0) {
    throw new Error(`${path}.sourceRefs must contain at least one item`);
  }
  envelope.sourceRefs.forEach((sourceRef, index) =>
    assertRequiredString(sourceRef, `${path}.sourceRefs[${index}]`)
  );
}

function assertNotProductFallback(envelope, path) {
  if (envelope.owner === "product_estimate" || envelope.owner === "product_fallback") {
    throw new Error(`${path}.owner is not allowed for MC001 ventilation input`);
  }
}

function assertValueEnvelope(envelope, path, expectedUnit) {
  assertObject(envelope, path);
  assertFiniteNumber(envelope.value, `${path}.value`);
  assertUnit(envelope, expectedUnit, path);
  assertRequiredString(envelope.owner, `${path}.owner`);
  assertNotProductFallback(envelope, path);
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

function resultValue(value, unit, envelopes, extra = {}) {
  const sourceEnvelopes = Array.isArray(envelopes) ? envelopes : [envelopes];
  return {
    value,
    unit,
    provenance: {
      sourceRefs: Object.freeze([
        ...new Set(sourceEnvelopes.flatMap((envelope) => envelope?.sourceRefs ?? []))
      ]),
      confidence: "reviewed",
      status: "calculated_from_source_backed_inputs",
      owner: "physics_engine"
    },
    ...extra
  };
}

function rejectDerivedNormalVentilationFields(ventilation) {
  if (ventilation === undefined) {
    return;
  }
  assertObject(ventilation, "ventilation");
  for (const key of Object.keys(ventilation)) {
    if (DERIVED_NORMAL_INPUT_FIELDS.has(key)) {
      throw new Error(
        `Derived value ventilation.${key} must be submitted as validationImports or expertOverrides`
      );
    }
  }
}

function blockComponent(component, path, reason, status = "blocked_unsupported_ventilation_path") {
  return {
    itemType: "ventilation_component",
    componentId: component.componentId,
    ventilationPath: component.ventilationPath ?? null,
    ventilationType: component.ventilationType ?? null,
    status,
    reason,
    sourceRefs: component.sourceRefs ?? [],
    path
  };
}

function resolveAirflow(component, path) {
  const suppliedMethods = [
    component.airflowM3h !== undefined ? "airflowM3h" : null,
    component.airflowM3s !== undefined ? "airflowM3s" : null,
    component.airChangeRate !== undefined || component.airVolume !== undefined
      ? "airChangeRateAndAirVolume"
      : null
  ].filter(Boolean);

  if (suppliedMethods.length !== 1) {
    throw new Error(
      `${path} must provide exactly one source-backed airflow method`
    );
  }

  if (component.airflowM3h !== undefined) {
    const airflow = nonNegativeValueEnvelope(
      component.airflowM3h,
      `${path}.airflowM3h`,
      "m3/h"
    );
    return {
      method: "source_backed_airflow_m3h",
      helperResult: null,
      airflowForHve: { airflowM3h: airflow.value },
      airflow: resultValue(airflow.value, "m3/h", airflow, {
        formulaId: "SOURCE_BACKED_AIRFLOW_M3H"
      }),
      sourceEnvelopes: [airflow]
    };
  }

  if (component.airflowM3s !== undefined) {
    const airflow = nonNegativeValueEnvelope(
      component.airflowM3s,
      `${path}.airflowM3s`,
      "m3/s"
    );
    return {
      method: "source_backed_airflow_m3s",
      helperResult: null,
      airflowForHve: { airflowM3s: airflow.value },
      airflow: resultValue(airflow.value, "m3/s", airflow, {
        formulaId: "SOURCE_BACKED_AIRFLOW_M3S"
      }),
      sourceEnvelopes: [airflow]
    };
  }

  const ach = nonNegativeValueEnvelope(
    component.airChangeRate,
    `${path}.airChangeRate`,
    "1/h"
  );
  const volume = positiveValueEnvelope(component.airVolume, `${path}.airVolume`, "m3");
  const airflow = calculateAirflowFromACH({
    ach: ach.value,
    volumeM3: volume.value
  });

  return {
    method: "source_backed_ach_volume_airflow",
    helperResult: airflow,
    airflowForHve: { airflowM3h: airflow.value },
    airflow: resultValue(airflow.value, "m3/h", [ach, volume], {
      formulaId: airflow.formulaId,
      trace: airflow.trace
    }),
    sourceEnvelopes: [ach, volume]
  };
}

function resolveBve(component, path) {
  const suppliedMethods = [
    component.bve !== undefined ? "bve" : null,
    component.bveFromTemperatures !== undefined ? "bveFromTemperatures" : null,
    component.unconditionedBztu !== undefined ? "unconditionedBztu" : null
  ].filter(Boolean);

  if (suppliedMethods.length !== 1) {
    throw new Error(`${path} must provide exactly one source-backed bve method`);
  }

  if (component.bve !== undefined) {
    const bve = nonNegativeValueEnvelope(component.bve, `${path}.bve`, "-");
    return {
      method: "source_backed_direct_bve",
      bve: resultValue(bve.value, "-", bve, {
        formulaId: "SOURCE_BACKED_BVE"
      }),
      sourceEnvelopes: [bve]
    };
  }

  if (component.bveFromTemperatures !== undefined) {
    const temperaturePath = `${path}.bveFromTemperatures`;
    assertObject(component.bveFromTemperatures, temperaturePath);
    const thetaInt = assertValueEnvelope(
      component.bveFromTemperatures.thetaInt,
      `${temperaturePath}.thetaInt`,
      "C"
    );
    const thetaSupply = assertValueEnvelope(
      component.bveFromTemperatures.thetaSupply,
      `${temperaturePath}.thetaSupply`,
      "C"
    );
    const thetaExternal = assertValueEnvelope(
      component.bveFromTemperatures.thetaExternal,
      `${temperaturePath}.thetaExternal`,
      "C"
    );
    const bve = calculateBve({
      thetaInt: thetaInt.value,
      thetaSupply: thetaSupply.value,
      thetaExternal: thetaExternal.value
    });
    return {
      method: "source_backed_temperature_bve",
      bve: resultValue(bve.value, "-", [thetaInt, thetaSupply, thetaExternal], {
        formulaId: bve.formulaId,
        trace: bve.trace
      }),
      sourceEnvelopes: [thetaInt, thetaSupply, thetaExternal]
    };
  }

  const bztu = nonNegativeValueEnvelope(
    component.unconditionedBztu,
    `${path}.unconditionedBztu`,
    "-"
  );
  const bve = calculateBveFromUnconditionedZone({
    bztu: bztu.value,
    source: bztu.sourceRefs.join(",")
  });
  return {
    method: "source_backed_unconditioned_bztu",
    bve: resultValue(bve.value, "-", bztu, {
      formulaId: bve.formulaId,
      trace: bve.trace
    }),
    sourceEnvelopes: [bztu]
  };
}

function resolveFveDyn(component, path) {
  if (component.heatRecoveryFactor !== undefined) {
    return {
      blocked: blockComponent(
        component,
        path,
        "heat recovery input is outside Phase F unless represented by a source-backed fveDyn value",
        "blocked_unsupported_heat_recovery_method"
      ),
      fveDyn: null
    };
  }

  const fveDyn = nonNegativeValueEnvelope(component.fveDyn, `${path}.fveDyn`, "-");
  return {
    blocked: null,
    fveDyn: resultValue(fveDyn.value, "-", fveDyn, {
      formulaId: "SOURCE_BACKED_FVE_DYN"
    }),
    sourceEnvelopes: [fveDyn]
  };
}

function validateAirProperties(airProperties) {
  assertObject(airProperties, "ventilation.airProperties");
  const airDensity = positiveValueEnvelope(
    airProperties.airDensity,
    "ventilation.airProperties.airDensity",
    "kg/m3"
  );
  const specificHeat = positiveValueEnvelope(
    airProperties.specificHeatCapacity,
    "ventilation.airProperties.specificHeatCapacity",
    "J/kgK"
  );
  return {
    airDensity,
    specificHeat,
    sourceRefs: Object.freeze([
      ...new Set([...airDensity.sourceRefs, ...specificHeat.sourceRefs])
    ])
  };
}

function prepareComponent(component, index, airProperties) {
  const path = `ventilation.components[${index}]`;
  assertObject(component, path);
  assertRequiredString(component.componentId, `${path}.componentId`);
  assertRequiredString(component.ventilationType, `${path}.ventilationType`);
  assertRequiredString(component.ventilationPath, `${path}.ventilationPath`);

  if (!SUPPORTED_TYPES.has(component.ventilationType)) {
    return {
      blocked: blockComponent(
        component,
        path,
        `${component.ventilationType} requires a source-backed ventilation type that Phase F does not implement`,
        "blocked_unsupported_ventilation_type"
      ),
      componentResult: null
    };
  }

  if (!SUPPORTED_PATHS.has(component.ventilationPath)) {
    return {
      blocked: blockComponent(
        component,
        path,
        `${component.ventilationPath} requires a source-backed method that Phase F does not implement`
      ),
      componentResult: null
    };
  }

  const airflow = resolveAirflow(component, path);
  const bve = resolveBve(component, path);
  const fveDyn = resolveFveDyn(component, path);
  if (fveDyn.blocked) {
    return {
      blocked: fveDyn.blocked,
      componentResult: null
    };
  }

  const helperResult = calculateVentilationHeatTransferCoefficient({
    rhoA: airProperties.airDensity.value,
    ca: airProperties.specificHeat.value,
    flows: [
      {
        flowId: component.componentId,
        ...airflow.airflowForHve,
        bve: bve.bve.value,
        fveDyn: fveDyn.fveDyn.value
      }
    ]
  });

  const sourceEnvelopes = [
    airProperties.airDensity,
    airProperties.specificHeat,
    ...airflow.sourceEnvelopes,
    ...bve.sourceEnvelopes,
    ...fveDyn.sourceEnvelopes
  ];

  return {
    blocked: null,
    componentResult: {
      componentId: component.componentId,
      ventilationType: component.ventilationType,
      ventilationPath: component.ventilationPath,
      airflowMethod: airflow.method,
      bveMethod: bve.method,
      airflow: airflow.airflow,
      bve: bve.bve,
      fveDyn: fveDyn.fveDyn,
      hveContribution: resultValue(helperResult.value, "W/K", sourceEnvelopes, {
        formulaId: helperResult.formulaId,
        trace: helperResult.trace
      }),
      diagnostics: Object.freeze(
        helperResult.warnings.map((warning) => ({
          level: "warning",
          code: warning,
          message: warning
        }))
      )
    }
  };
}

function buildHveResult(componentResults, airProperties) {
  if (componentResults.length === 0) {
    return null;
  }

  const hve = calculateVentilationHeatTransferCoefficient({
    rhoA: airProperties.airDensity.value,
    ca: airProperties.specificHeat.value,
    flows: componentResults.map((componentResult) => ({
      flowId: componentResult.componentId,
      ...(componentResult.airflow.unit === "m3/h"
        ? { airflowM3h: componentResult.airflow.value }
        : { airflowM3s: componentResult.airflow.value }),
      bve: componentResult.bve.value,
      fveDyn: componentResult.fveDyn.value
    }))
  });

  return {
    value: hve.value,
    unit: hve.unit,
    formulaId: hve.formulaId,
    trace: hve.trace,
    provenance: {
      sourceRefs: Object.freeze([
        ...new Set([
          ...airProperties.sourceRefs,
          ...componentResults.flatMap((componentResult) => [
            ...(componentResult.airflow.provenance?.sourceRefs ?? []),
            ...(componentResult.bve.provenance?.sourceRefs ?? []),
            ...(componentResult.fveDyn.provenance?.sourceRefs ?? [])
          ])
        ])
      ]),
      confidence: "reviewed",
      status: "calculated_from_complete_source_backed_ventilation_inputs",
      owner: "physics_engine"
    }
  };
}

function diagnosticFromBlockedItem(item) {
  return {
    level: "blocked",
    componentId: item.componentId,
    code: item.status,
    message: item.reason,
    path: item.path
  };
}

export function createMc001VentilationInputBuilder(inputPack, { registry } = {}) {
  assertObject(inputPack, "inputPack");
  const phaseCGate = createMc001AuditorInputBuilderGate(inputPack, { registry });
  rejectDerivedNormalVentilationFields(inputPack.ventilation);

  assertObject(inputPack.ventilation, "ventilation");
  assertArray(inputPack.ventilation.components, "ventilation.components");
  const airProperties = validateAirProperties(inputPack.ventilation.airProperties);

  const componentResults = [];
  const blockedItems = [];

  inputPack.ventilation.components.forEach((component, index) => {
    const prepared = prepareComponent(component, index, airProperties);
    if (prepared.blocked) {
      blockedItems.push(prepared.blocked);
      return;
    }
    componentResults.push(prepared.componentResult);
  });

  const hveResult =
    blockedItems.length === 0 ? buildHveResult(componentResults, airProperties) : null;
  const hveReady = hveResult !== null;
  const diagnostics = [
    ...blockedItems.map(diagnosticFromBlockedItem),
    ...componentResults.flatMap((componentResult) => componentResult.diagnostics)
  ];

  return {
    builderId: MC001_VENTILATION_INPUT_BUILDER_ID,
    status: hveReady
      ? "prepared_phase_f_ventilation_input"
      : "blocked_incomplete_ventilation_input",
    phaseCGate,
    componentResults: Object.freeze(componentResults),
    hveResult,
    componentReadiness: {
      Hve: hveReady
        ? {
            componentId: "Hve",
            status: "ready",
            value: hveResult.value,
            unit: hveResult.unit,
            sourceRefs: hveResult.provenance.sourceRefs,
            diagnosticCode: null,
            reason: null
          }
        : {
            componentId: "Hve",
            status: "blocked_incomplete_ventilation_components",
            value: null,
            unit: "W/K",
            sourceRefs: Object.freeze([]),
            diagnosticCode: "blocked_incomplete_ventilation_components",
            reason:
              "Hve requires complete source-backed ventilation components and no blocked ventilation items"
          }
    },
    blockedItems: Object.freeze(blockedItems),
    diagnostics: Object.freeze(diagnostics),
    sourceTrace: {
      Hve: hveResult?.provenance.sourceRefs ?? []
    },
    readinessFlags: {
      isHveReady: hveReady,
      isCompleteVentilationReady: hveReady,
      isCompleteHeatLossReady: false,
      isLevel2Ready: false,
      isCertificateCpeWorkflowReady: false,
      isProductionIntegrationReady: false
    },
    nextRequiredStep:
      "KEEP_HEAT_LOSS_BLOCKED_UNTIL_TRANSMISSION_AND_VENTILATION_ARE_COMPLETE_SOURCE_BACKED_AND_UNBLOCKED"
  };
}
