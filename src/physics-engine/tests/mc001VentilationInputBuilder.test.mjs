import assert from "node:assert/strict";
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

function valueEnvelope(value, unit, sourceRefs = ["VENT_FIELD_NOTE_001"], extra = {}) {
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

function baseInputPack() {
  return {
    contractMetadata: {
      contractId: "PHASE_F_VENTILATION_INPUT_TEST",
      contractVersion: "PHASE_F_VENTILATION_INPUT_AND_HEAT_LOSS_READINESS",
      targetMethodology: "MC001-2022",
      calculationMode: "explicit_validation",
      createdAt: "2026-06-22T00:00:00Z",
      createdBy: "PHYSICS_ENGINE_VALIDATION"
    },
    sourceTrace: {
      documents: [
        {
          documentId: "VENT_FIELD_NOTE_001",
          documentType: "field_note",
          reviewStatus: "reviewed"
        },
        {
          documentId: "VENT_AIRFLOW_BALANCE_001",
          documentType: "ventilation_airflow_balance",
          reviewStatus: "reviewed"
        },
        {
          documentId: "VENT_CONSTANTS_001",
          documentType: "source_backed_air_properties",
          reviewStatus: "reviewed"
        }
      ]
    },
    buildingClassification: {
      sectionStatus: "ready",
      primaryCategoryKey: valueEnvelope("education", "-", ["VENT_FIELD_NOTE_001"], {
        sourceAuditorClassification: "school education building",
        mappedMc001Category: "education",
        mappingRuleId: "MC001_CATEGORY_MAPPING_PHASE_F_TEST",
        traceId: "CATEGORY_MAPPING_TRACE_023",
        responsibleModule: "mc001VentilationInputBuilder.mjs"
      })
    },
    geometry: {
      sectionStatus: "ready",
      conditionedFloorArea: valueEnvelope(1200, "m2", ["VENT_FIELD_NOTE_001"])
    },
    normativeReferences: [],
    validationImports: [],
    expertOverrides: [],
    explicitBlockers: [],
    ventilation: {
      airProperties: {
        airDensity: valueEnvelope(1.2, "kg/m3", ["VENT_CONSTANTS_001"]),
        specificHeatCapacity: valueEnvelope(1000, "J/kgK", ["VENT_CONSTANTS_001"])
      },
      components: [
        {
          componentId: "NATURAL_EXTERIOR_FLOW_001",
          ventilationType: "natural",
          ventilationPath: "natural_exterior_air",
          airflowM3h: valueEnvelope(180, "m3/h", ["VENT_AIRFLOW_BALANCE_001"]),
          bve: valueEnvelope(1, "-", ["VENT_FIELD_NOTE_001"]),
          fveDyn: valueEnvelope(1, "-", ["VENT_FIELD_NOTE_001"])
        }
      ]
    }
  };
}

function build(inputPack = baseInputPack()) {
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

test("valid explicit airflow ventilation input produces source-backed Hve", () => {
  const result = build();

  assert.equal(result.builderId, "MC001_VENTILATION_FROM_AUDITOR_INPUT_PHASE_F");
  assert.equal(result.phaseCGate.gateId, "MC001_AUDITOR_INPUT_BUILDER_GATE_PHASE_C");
  assert.equal(result.componentReadiness.Hve.status, "ready");
  assert.equal(result.hveResult.formulaId, "MC001_2_30_HVE");
  assertAlmostEqual(result.hveResult.value, 60);
  assert.equal(result.hveResult.unit, "W/K");
  assert.ok(result.hveResult.provenance.sourceRefs.includes("VENT_AIRFLOW_BALANCE_001"));
  assert.equal(result.readinessFlags.isHveReady, true);
  assert.equal(result.readinessFlags.isLevel2Ready, false);
});

test("valid ACH and air volume input is accepted only with source provenance", () => {
  const inputPack = baseInputPack();
  inputPack.ventilation.components = [
    {
      componentId: "ACH_FLOW_001",
      ventilationType: "natural",
      ventilationPath: "natural_exterior_air",
      airChangeRate: valueEnvelope(0.5, "1/h", ["VENT_FIELD_NOTE_001"]),
      airVolume: valueEnvelope(200, "m3", ["VENT_FIELD_NOTE_001"]),
      bve: valueEnvelope(0.8, "-", ["VENT_FIELD_NOTE_001"]),
      fveDyn: valueEnvelope(1, "-", ["VENT_FIELD_NOTE_001"])
    }
  ];

  const result = build(inputPack);

  assert.equal(result.componentResults[0].airflowMethod, "source_backed_ach_volume_airflow");
  assertAlmostEqual(result.componentResults[0].airflow.value, 100);
  assertAlmostEqual(result.hveResult.value, (1.2 * 1000 * 100 * 0.8) / 3600);
});

test("valid temperature-derived bve is accepted with source provenance", () => {
  const inputPack = baseInputPack();
  inputPack.ventilation.components[0].bve = undefined;
  inputPack.ventilation.components[0].bveFromTemperatures = {
    thetaInt: valueEnvelope(20, "C", ["VENT_FIELD_NOTE_001"]),
    thetaSupply: valueEnvelope(0, "C", ["VENT_FIELD_NOTE_001"]),
    thetaExternal: valueEnvelope(0, "C", ["VENT_FIELD_NOTE_001"])
  };

  const result = build(inputPack);

  assert.equal(result.componentResults[0].bveMethod, "source_backed_temperature_bve");
  assert.equal(result.componentResults[0].bve.formulaId, "MC001_2_31_BVE");
  assert.equal(result.componentResults[0].bve.value, 1);
});

test("unsupported ventilation path returns blocked diagnostic instead of guessed Hve", () => {
  const inputPack = baseInputPack();
  inputPack.ventilation.components.push({
    componentId: "UNSUPPORTED_RECIRCULATION_001",
    ventilationType: "natural",
    ventilationPath: "recirculated_air_unvalidated",
    sourceRefs: ["VENT_FIELD_NOTE_001"]
  });

  const result = build(inputPack);

  assert.equal(result.hveResult, null);
  assert.equal(result.componentReadiness.Hve.status, "blocked_incomplete_ventilation_components");
  assert.equal(result.blockedItems[0].status, "blocked_unsupported_ventilation_path");
  assert.equal(result.readinessFlags.isHveReady, false);
});

test("unsupported ventilation type with supported path returns blocked diagnostic", () => {
  const inputPack = baseInputPack();
  inputPack.ventilation.components[0].ventilationType = "recirculation";
  inputPack.ventilation.components[0].ventilationPath = "natural_exterior_air";

  const result = build(inputPack);

  assert.equal(result.hveResult, null);
  assert.equal(result.blockedItems[0].status, "blocked_unsupported_ventilation_type");
  assert.equal(result.readinessFlags.isHveReady, false);
});

test("unsupported heat recovery input is blocked instead of inferred", () => {
  const inputPack = baseInputPack();
  inputPack.ventilation.components[0].heatRecoveryFactor = valueEnvelope(
    0.7,
    "-",
    ["VENT_FIELD_NOTE_001"]
  );

  const result = build(inputPack);

  assert.equal(result.hveResult, null);
  assert.equal(result.blockedItems[0].status, "blocked_unsupported_heat_recovery_method");
});

expectFailure(
  "missing airflow is rejected",
  () => {
    const inputPack = baseInputPack();
    delete inputPack.ventilation.components[0].airflowM3h;
    build(inputPack);
  },
  /must provide exactly one source-backed airflow method/
);

expectFailure(
  "airflow without source is rejected",
  () => {
    const inputPack = baseInputPack();
    inputPack.ventilation.components[0].airflowM3h.sourceRefs = [];
    build(inputPack);
  },
  /sourceRefs must contain at least one item/
);

expectFailure(
  "missing volume is rejected for ACH airflow",
  () => {
    const inputPack = baseInputPack();
    delete inputPack.ventilation.components[0].airflowM3h;
    inputPack.ventilation.components[0].airChangeRate = valueEnvelope(
      0.5,
      "1/h",
      ["VENT_FIELD_NOTE_001"]
    );
    build(inputPack);
  },
  /airVolume must be an object/
);

expectFailure(
  "non-positive volume is rejected for ACH airflow",
  () => {
    const inputPack = baseInputPack();
    delete inputPack.ventilation.components[0].airflowM3h;
    inputPack.ventilation.components[0].airChangeRate = valueEnvelope(
      0.5,
      "1/h",
      ["VENT_FIELD_NOTE_001"]
    );
    inputPack.ventilation.components[0].airVolume = valueEnvelope(
      0,
      "m3",
      ["VENT_FIELD_NOTE_001"]
    );
    build(inputPack);
  },
  /airVolume\.value must be positive/
);

expectFailure(
  "ACH without source is rejected",
  () => {
    const inputPack = baseInputPack();
    delete inputPack.ventilation.components[0].airflowM3h;
    inputPack.ventilation.components[0].airChangeRate = valueEnvelope(0.5, "1/h", []);
    inputPack.ventilation.components[0].airVolume = valueEnvelope(
      200,
      "m3",
      ["VENT_FIELD_NOTE_001"]
    );
    build(inputPack);
  },
  /airChangeRate\.sourceRefs must contain at least one item/
);

expectFailure(
  "missing bve is rejected",
  () => {
    const inputPack = baseInputPack();
    delete inputPack.ventilation.components[0].bve;
    build(inputPack);
  },
  /must provide exactly one source-backed bve method/
);

expectFailure(
  "bve without source is rejected",
  () => {
    const inputPack = baseInputPack();
    inputPack.ventilation.components[0].bve.sourceRefs = [];
    build(inputPack);
  },
  /bve\.sourceRefs must contain at least one item/
);

expectFailure(
  "unconditionedBztu without source is rejected",
  () => {
    const inputPack = baseInputPack();
    delete inputPack.ventilation.components[0].bve;
    inputPack.ventilation.components[0].unconditionedBztu = valueEnvelope(0.7, "-", []);
    build(inputPack);
  },
  /unconditionedBztu\.sourceRefs must contain at least one item/
);

expectFailure(
  "missing fveDyn is rejected so helper default is not used",
  () => {
    const inputPack = baseInputPack();
    delete inputPack.ventilation.components[0].fveDyn;
    build(inputPack);
  },
  /ventilation\.components\[0\]\.fveDyn must be an object/
);

expectFailure(
  "fveDyn without source is rejected",
  () => {
    const inputPack = baseInputPack();
    inputPack.ventilation.components[0].fveDyn.sourceRefs = [];
    build(inputPack);
  },
  /fveDyn\.sourceRefs must contain at least one item/
);

expectFailure(
  "invalid airflow unit is rejected",
  () => {
    const inputPack = baseInputPack();
    inputPack.ventilation.components[0].airflowM3h.unit = "m3/s";
    build(inputPack);
  },
  /airflowM3h\.unit must be m3\/h/
);

expectFailure(
  "product estimate is rejected as MC001 ventilation input",
  () => {
    const inputPack = baseInputPack();
    inputPack.ventilation.components[0].airflowM3h.owner = "product_estimate";
    build(inputPack);
  },
  /owner is not allowed for raw auditor input/
);

for (const fieldName of [
  "Hve",
  "Htr",
  "totalHeatLoss",
  "QHnd",
  "finalEnergyKWh",
  "primaryEnergyKWh",
  "totalPrimaryEnergyKWh",
  "co2Kg",
  "totalCO2Kg"
]) {
  expectFailure(
    `${fieldName} submitted as normal ventilation input is rejected`,
    () => {
      const inputPack = baseInputPack();
      inputPack.ventilation[fieldName] = valueEnvelope(1, "W/K", ["VENT_FIELD_NOTE_001"]);
      build(inputPack);
    },
    new RegExp(
      `Derived value ventilation\\.${fieldName} must be submitted as validationImports or expertOverrides`
    )
  );
}

test("source-backed unconditioned bztu path is accepted only as explicit bve method", () => {
  const inputPack = baseInputPack();
  delete inputPack.ventilation.components[0].bve;
  inputPack.ventilation.components[0].unconditionedBztu = valueEnvelope(
    0.7,
    "-",
    ["VENT_FIELD_NOTE_001"]
  );

  const result = build(inputPack);

  assert.equal(result.componentResults[0].bveMethod, "source_backed_unconditioned_bztu");
  assert.equal(result.componentResults[0].bve.value, 0.7);
  assertAlmostEqual(result.hveResult.value, 42);
});
