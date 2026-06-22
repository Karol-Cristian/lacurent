import assert from "node:assert/strict";
import { createMc001EnvelopeInputBuilder } from "../mc001EnvelopeInputBuilder.mjs";
import { createMc001HeatLossReadinessGate } from "../mc001HeatLossReadinessGate.mjs";
import { createMc001TransmissionHtrReadinessGateFromAuditorInput } from "../mc001TransmissionHtrReadinessGate.mjs";
import { createMc001VentilationInputBuilder } from "../mc001VentilationInputBuilder.mjs";
import { fixture021EnvelopeFromAuditorInput } from "./validation/fixture021EnvelopeFromAuditorInput.mjs";

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

function valueEnvelope(value, unit, sourceRefs = ["HEAT_LOSS_FIELD_NOTE_001"], extra = {}) {
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
    importId: `PHASE_F_IMPORT_${componentId}`,
    targetFieldPath: `transmission.${componentId}`,
    value,
    unit: "W/K",
    source: `Phase F controlled ${componentId} source`,
    owner: "validation_import_with_source",
    sourceRefs: [`${componentId}_PHASE_F_CONTROLLED_SOURCE`],
    traceId: `${componentId}_PHASE_F_TRACE`,
    importContext: "Phase F controlled Htr readiness component",
    sourceFixtureId: "FIXTURE_024_HEAT_LOSS_READINESS_GATE",
    reviewStatus: "reviewed",
    validatesFormulaPath: false,
    ...extra
  };
}

function transmissionInputPack({ complete = false } = {}) {
  const inputPack = clone(fixture021EnvelopeFromAuditorInput.inputPack);
  if (complete) {
    inputPack.envelope.elements = inputPack.envelope.elements.filter(
      (element) => element.boundaryType === "exterior"
    );
    inputPack.explicitBlockers = [];
    inputPack.validationImports = [
      validationImport("Hg", 2),
      validationImport("Hu", 3),
      validationImport("Ha", 4)
    ];
  }
  return inputPack;
}

function readyTransmissionOutput() {
  return createMc001TransmissionHtrReadinessGateFromAuditorInput(transmissionInputPack({
    complete: true
  }), {
    registry: fixture021EnvelopeFromAuditorInput.registry
  });
}

function partialTransmissionOutput() {
  return createMc001TransmissionHtrReadinessGateFromAuditorInput(transmissionInputPack(), {
    registry: fixture021EnvelopeFromAuditorInput.registry
  });
}

function ventilationInputPack() {
  return {
    contractMetadata: {
      contractId: "PHASE_F_HEAT_LOSS_VENTILATION_TEST",
      contractVersion: "PHASE_F_VENTILATION_INPUT_AND_HEAT_LOSS_READINESS",
      targetMethodology: "MC001-2022",
      calculationMode: "explicit_validation",
      createdAt: "2026-06-22T00:00:00Z",
      createdBy: "PHYSICS_ENGINE_VALIDATION"
    },
    sourceTrace: {
      documents: [
        {
          documentId: "HEAT_LOSS_FIELD_NOTE_001",
          documentType: "field_note",
          reviewStatus: "reviewed"
        },
        {
          documentId: "HEAT_LOSS_VENT_CONSTANTS_001",
          documentType: "source_backed_air_properties",
          reviewStatus: "reviewed"
        }
      ]
    },
    buildingClassification: {
      sectionStatus: "ready",
      primaryCategoryKey: valueEnvelope("education", "-", ["HEAT_LOSS_FIELD_NOTE_001"], {
        sourceAuditorClassification: "school education building",
        mappedMc001Category: "education",
        mappingRuleId: "MC001_CATEGORY_MAPPING_PHASE_F_HEAT_LOSS_TEST",
        traceId: "CATEGORY_MAPPING_TRACE_024",
        responsibleModule: "mc001HeatLossReadinessGate.test.mjs"
      })
    },
    geometry: {
      sectionStatus: "ready",
      conditionedFloorArea: valueEnvelope(1200, "m2", ["HEAT_LOSS_FIELD_NOTE_001"])
    },
    normativeReferences: [],
    validationImports: [],
    expertOverrides: [],
    explicitBlockers: [],
    ventilation: {
      airProperties: {
        airDensity: valueEnvelope(1.2, "kg/m3", ["HEAT_LOSS_VENT_CONSTANTS_001"]),
        specificHeatCapacity: valueEnvelope(1000, "J/kgK", [
          "HEAT_LOSS_VENT_CONSTANTS_001"
        ])
      },
      components: [
        {
          componentId: "HEAT_LOSS_VENT_FLOW_001",
          ventilationType: "natural",
          ventilationPath: "natural_exterior_air",
          airflowM3h: valueEnvelope(180, "m3/h", ["HEAT_LOSS_FIELD_NOTE_001"]),
          bve: valueEnvelope(1, "-", ["HEAT_LOSS_FIELD_NOTE_001"]),
          fveDyn: valueEnvelope(1, "-", ["HEAT_LOSS_FIELD_NOTE_001"])
        }
      ]
    }
  };
}

function readyVentilationOutput() {
  return createMc001VentilationInputBuilder(ventilationInputPack(), {
    registry: fixture021EnvelopeFromAuditorInput.registry
  });
}

function blockedVentilationOutput() {
  const inputPack = ventilationInputPack();
  inputPack.ventilation.components.push({
    componentId: "UNSUPPORTED_VENT_001",
    ventilationType: "recirculation",
    ventilationPath: "unsupported_recirculation",
    sourceRefs: ["HEAT_LOSS_FIELD_NOTE_001"]
  });
  return createMc001VentilationInputBuilder(inputPack, {
    registry: fixture021EnvelopeFromAuditorInput.registry
  });
}

function expectFailure(name, fn, expectedError) {
  test(name, () => {
    assert.throws(fn, expectedError);
  });
}

function assertAlmostEqual(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("complete Htr and complete Hve allow heat-loss readiness without monthly demand", () => {
  const transmission = readyTransmissionOutput();
  const ventilation = readyVentilationOutput();
  const result = createMc001HeatLossReadinessGate({
    transmissionReadinessOutput: transmission,
    ventilationReadinessOutput: ventilation
  });

  assert.equal(result.gateId, "MC001_HEAT_LOSS_READINESS_GATE_PHASE_F");
  assert.equal(result.status, "ready_heat_loss_components");
  assert.equal(result.componentReadiness.Htr.status, "ready");
  assert.equal(result.componentReadiness.Hve.status, "ready");
  assertAlmostEqual(
    result.heatLossResult.value,
    transmission.htrResult.value + ventilation.hveResult.value
  );
  assert.equal(result.heatLossResult.unit, "W/K");
  assert.equal(result.readinessFlags.isHeatLossReady, true);
  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isQhndReady, false);
});

test("partial Htr and ready Hve keep heat-loss readiness blocked", () => {
  const result = createMc001HeatLossReadinessGate({
    transmissionReadinessOutput: partialTransmissionOutput(),
    ventilationReadinessOutput: readyVentilationOutput()
  });

  assert.equal(result.status, "blocked_incomplete_heat_loss_components");
  assert.equal(result.heatLossResult, null);
  assert.equal(result.readinessFlags.isHtrReady, false);
  assert.equal(result.readinessFlags.isHveReady, true);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
});

test("ready Htr and blocked Hve keep heat-loss readiness blocked", () => {
  const result = createMc001HeatLossReadinessGate({
    transmissionReadinessOutput: readyTransmissionOutput(),
    ventilationReadinessOutput: blockedVentilationOutput()
  });

  assert.equal(result.status, "blocked_incomplete_heat_loss_components");
  assert.equal(result.heatLossResult, null);
  assert.equal(result.readinessFlags.isHtrReady, true);
  assert.equal(result.readinessFlags.isHveReady, false);
  assert.ok(result.blockedComponents.some((component) => component.componentId === "Hve"));
});

expectFailure(
  "missing transmission output is rejected",
  () =>
    createMc001HeatLossReadinessGate({
      ventilationReadinessOutput: readyVentilationOutput()
    }),
  /transmissionReadinessOutput must be an object/
);

expectFailure(
  "missing ventilation output is rejected",
  () =>
    createMc001HeatLossReadinessGate({
      transmissionReadinessOutput: readyTransmissionOutput()
    }),
  /ventilationReadinessOutput must be an object/
);

expectFailure(
  "blocked Htr represented as zero is rejected",
  () => {
    const transmission = partialTransmissionOutput();
    transmission.componentReadiness.Htr.value = 0;
    createMc001HeatLossReadinessGate({
      transmissionReadinessOutput: transmission,
      ventilationReadinessOutput: readyVentilationOutput()
    });
  },
  /blocked Htr must not provide a fallback numeric value/
);

expectFailure(
  "blocked Hve represented as zero is rejected",
  () => {
    const ventilation = blockedVentilationOutput();
    ventilation.componentReadiness.Hve.value = 0;
    createMc001HeatLossReadinessGate({
      transmissionReadinessOutput: readyTransmissionOutput(),
      ventilationReadinessOutput: ventilation
    });
  },
  /blocked Hve must not provide a fallback numeric value/
);

expectFailure(
  "heat-loss readiness cannot be claimed while Htr is blocked",
  () =>
    createMc001HeatLossReadinessGate({
      transmissionReadinessOutput: partialTransmissionOutput(),
      ventilationReadinessOutput: readyVentilationOutput(),
      componentClaims: { heatLoss: "ready" }
    }),
  /heat-loss readiness is claimed while Htr is blocked or partial/
);

expectFailure(
  "invalid Hve unit is rejected",
  () => {
    const ventilation = readyVentilationOutput();
    ventilation.componentReadiness.Hve.unit = "kW";
    createMc001HeatLossReadinessGate({
      transmissionReadinessOutput: readyTransmissionOutput(),
      ventilationReadinessOutput: ventilation
    });
  },
  /componentReadiness\.Hve\.unit must be W\/K/
);

expectFailure(
  "product fallback cannot be promoted into heat-loss readiness",
  () => {
    const inputPack = ventilationInputPack();
    inputPack.ventilation.components[0].airflowM3h.owner = "product_fallback";
    const ventilation = createMc001VentilationInputBuilder(inputPack, {
      registry: fixture021EnvelopeFromAuditorInput.registry
    });
    createMc001HeatLossReadinessGate({
      transmissionReadinessOutput: readyTransmissionOutput(),
      ventilationReadinessOutput: ventilation
    });
  },
  /owner is not allowed for raw auditor input/
);

for (const fieldName of [
  "Htr",
  "Hve",
  "totalHeatLoss",
  "QHnd",
  "finalEnergyKWh",
  "primaryEnergyKWh",
  "totalPrimaryEnergyKWh",
  "co2Kg",
  "totalCO2Kg"
]) {
  expectFailure(
    `${fieldName} submitted as normal heat-loss input is rejected`,
    () =>
      createMc001HeatLossReadinessGate({
        transmissionReadinessOutput: readyTransmissionOutput(),
        ventilationReadinessOutput: readyVentilationOutput(),
        normalAuditorInput: {
          [fieldName]: 1
        }
      }),
    new RegExp(`normalAuditorInput\\.${fieldName}`)
  );
}

test("Phase E corrected-U bridge guard is still upstream of heat-loss readiness", () => {
  const inputPack = clone(fixture021EnvelopeFromAuditorInput.inputPack);
  inputPack.envelope.elements = [
    {
      elementId: "CORRECTED_WALL_HEAT_LOSS_001",
      elementType: "wall",
      boundaryType: "exterior",
      area: valueEnvelope(12, "m2", ["HEAT_LOSS_FIELD_NOTE_001"]),
      correctedUValue: valueEnvelope(0.28, "W/m2K", ["HEAT_LOSS_FIELD_NOTE_001"])
    }
  ];
  inputPack.envelope.thermalBridges = {
    linear: [
      {
        bridgeId: "DOUBLE_COUNT_BRIDGE_001",
        boundaryType: "exterior",
        psi: valueEnvelope(0.04, "W/(mK)", ["HEAT_LOSS_FIELD_NOTE_001"]),
        length: valueEnvelope(6, "m", ["HEAT_LOSS_FIELD_NOTE_001"])
      }
    ],
    point: []
  };
  inputPack.explicitBlockers = [];

  assert.throws(
    () => createMc001EnvelopeInputBuilder(inputPack, {
      registry: fixture021EnvelopeFromAuditorInput.registry
    }),
    /correctedUValue for CORRECTED_WALL_HEAT_LOSS_001 cannot be combined with explicit psi\/chi bridge terms/
  );
});
