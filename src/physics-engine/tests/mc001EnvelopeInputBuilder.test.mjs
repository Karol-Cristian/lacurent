import assert from "node:assert/strict";
import { createMc001EnvelopeInputBuilder } from "../mc001EnvelopeInputBuilder.mjs";
import { fixture021EnvelopeFromAuditorInput as fixture } from "./validation/fixture021EnvelopeFromAuditorInput.mjs";

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

function valueEnvelope(value, unit, sourceRefs = ["FIELD_NOTE_ENV_001"], extra = {}) {
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

function build(inputPack = fixture.inputPack) {
  return createMc001EnvelopeInputBuilder(inputPack, { registry: fixture.registry });
}

function expectFailure({ name, mutate, expectedError }) {
  test(name, () => {
    const inputPack = clone(fixture.inputPack);
    mutate(inputPack);
    assert.throws(() => build(inputPack), expectedError);
  });
}

function assertAlmostEqual(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

function inputWithSingleElement(element, thermalBridges = { linear: [], point: [] }) {
  const inputPack = clone(fixture.inputPack);
  inputPack.envelope.elements = [element];
  inputPack.envelope.thermalBridges = thermalBridges;
  return inputPack;
}

test("valid layer-based exterior wall input produces U provenance and direct transmission", () => {
  const result = build();
  const wall = result.elementResults.find((element) => element.elementId === "EXT_WALL_001");

  assert.equal(result.phaseCGate.status, "accepted_input_builder_gate");
  assert.equal(wall.method, "source_backed_layer_u_value");
  assert.equal(wall.layers.length, 2);
  assertAlmostEqual(wall.uValue.value, fixture.expected.wallUValueWPerM2K);
  assertAlmostEqual(
    wall.directTransmissionContribution.value,
    fixture.expected.wallDirectTransmissionWPerK
  );
  assert.ok(wall.uValue.provenance.sourceRefs.includes("LAMBDA_TABLE_ENV_001"));
  assert.equal(wall.uValue.unit, "W/m2K");
});

test("valid certified U-value with source is accepted", () => {
  const result = build();
  const roof = result.elementResults.find((element) => element.elementId === "EXT_ROOF_001");

  assert.equal(roof.method, "source_backed_certified_u_value");
  assert.equal(roof.uValue.value, 0.2);
  assert.equal(roof.uValue.unit, "W/m2K");
  assert.deepEqual(roof.uValue.provenance.sourceRefs, ["FIELD_NOTE_ENV_001"]);
  assert.equal(
    roof.directTransmissionContribution.value,
    fixture.expected.roofDirectTransmissionWPerK
  );
});

test("valid corrected U-value with source is accepted for an exterior element", () => {
  const inputPack = inputWithSingleElement({
    elementId: "CORRECTED_WALL_001",
    elementType: "wall",
    boundaryType: "exterior",
    area: valueEnvelope(12, "m2", ["DRAWING_ENV_A102"]),
    correctedUValue: valueEnvelope(0.28, "W/m2K", ["THERMAL_ASSESSMENT_ENV_001"])
  });

  const result = build(inputPack);
  const wall = result.elementResults[0];

  assert.equal(wall.method, "source_backed_corrected_u_value");
  assert.equal(wall.uValue.value, 0.28);
  assert.deepEqual(wall.uValue.provenance.sourceRefs, ["THERMAL_ASSESSMENT_ENV_001"]);
  assertAlmostEqual(result.directTransmissionSubtotal.value, 3.36);
  assert.equal(result.directTransmissionSubtotal.formulaId, "MC001_2_12_HD_CORRECTED_U");
  assert.equal(result.directTransmissionSubtotal.method, "correctedUPrime");
});

test("valid source-backed psi bridge contributes to transmission result", () => {
  const result = build();
  const bridge = result.bridgeResults.find(
    (entry) => entry.bridgeId === "LINEAR_BRIDGE_001"
  );

  assert.equal(bridge.bridgeType, "linear");
  assert.equal(bridge.psi.value, 0.05);
  assert.equal(bridge.length.value, 10);
  assert.equal(bridge.contribution.value, fixture.expected.bridgeContributionWPerK);
  assertAlmostEqual(
    result.directTransmissionSubtotal.value,
    fixture.expected.directTransmissionSubtotalWPerK
  );
});

test("explicit category mapping is accepted", () => {
  const result = build();
  const category = fixture.inputPack.buildingClassification.primaryCategoryKey;

  assert.equal(category.mappedMc001Category, "education");
  assert.equal(category.mappingRuleId, "MC001_CATEGORY_MAPPING_PHASE_D_FIXTURE");
  assert.equal(result.status, "prepared_phase_d_envelope_input");
});

test("unsupported ground element returns blocked diagnostic, not guessed value", () => {
  const result = build();
  const blocked = result.blockedItems.find(
    (item) => item.elementId === "GROUND_SLAB_001"
  );

  assert.equal(result.elementResults.length, fixture.expected.acceptedElementCount);
  assert.equal(result.blockedItems.length, fixture.expected.blockedElementCount);
  assert.equal(blocked.boundaryType, "ground");
  assert.match(blocked.reason, /Phase D does not implement/);
  assert.equal(
    result.elementResults.some((element) => element.elementId === "GROUND_SLAB_001"),
    false
  );
});

for (const boundaryType of ["unconditioned", "adjacent"]) {
  test(`${boundaryType} boundary returns blocked diagnostic, not guessed value`, () => {
    const inputPack = inputWithSingleElement({
      elementId: `${boundaryType.toUpperCase()}_WALL_001`,
      elementType: "wall",
      boundaryType,
      area: valueEnvelope(8, "m2", ["DRAWING_ENV_A103"]),
      certifiedUValue: valueEnvelope(0.31, "W/m2K", ["FIELD_NOTE_ENV_002"])
    });

    const result = build(inputPack);

    assert.equal(result.elementResults.length, 0);
    assert.equal(result.directTransmissionSubtotal, null);
    assert.equal(result.readinessClaims.isDirectTransmissionSubtotalReady, false);
    assert.equal(result.readinessClaims.isCompleteEnvelopeReady, false);
    assert.equal(result.readinessClaims.isCompleteHtrReady, false);
    assert.equal(result.blockedItems.length, 1);
    assert.equal(result.blockedItems[0].boundaryType, boundaryType);
    assert.match(result.blockedItems[0].reason, /Phase D does not implement/);
  });
}

expectFailure({
  name: "missing area is rejected",
  mutate(inputPack) {
    delete inputPack.envelope.elements[0].area;
  },
  expectedError: /envelope\.elements\[0\]\.area must be an object/
});

expectFailure({
  name: "non-positive area is rejected",
  mutate(inputPack) {
    inputPack.envelope.elements[0].area.value = 0;
  },
  expectedError: /envelope\.elements\[0\]\.area\.value must be positive/
});

expectFailure({
  name: "missing unit is rejected",
  mutate(inputPack) {
    delete inputPack.envelope.elements[0].area.unit;
  },
  expectedError: /envelope\.elements\[0\]\.area\.unit must be a non-empty string/
});

expectFailure({
  name: "missing U-value and missing layer stack is rejected",
  mutate(inputPack) {
    delete inputPack.envelope.elements[1].certifiedUValue;
  },
  expectedError:
    /envelope\.elements\[1\] requires certifiedUValue, correctedUValue, or source-backed layers/
});

expectFailure({
  name: "certified U-value without source is rejected",
  mutate(inputPack) {
    delete inputPack.envelope.elements[1].certifiedUValue.sourceRefs;
  },
  expectedError: /certifiedUValue\.sourceRefs must contain at least one item/
});

expectFailure({
  name: "corrected U-value without source is rejected",
  mutate(inputPack) {
    inputPack.envelope.elements = [
      {
        elementId: "CORRECTED_WALL_WITHOUT_SOURCE",
        elementType: "wall",
        boundaryType: "exterior",
        area: valueEnvelope(12, "m2", ["DRAWING_ENV_A102"]),
        correctedUValue: {
          value: 0.28,
          unit: "W/m2K",
          owner: "auditor_entered",
          confidence: "reviewed",
          status: "ready"
        }
      }
    ];
    inputPack.envelope.thermalBridges = { linear: [], point: [] };
  },
  expectedError: /correctedUValue\.sourceRefs must contain at least one item/
});

expectFailure({
  name: "corrected U-value with explicit bridge terms is rejected to prevent double counting",
  mutate(inputPack) {
    inputPack.envelope.elements = [
      {
        elementId: "CORRECTED_WALL_001",
        elementType: "wall",
        boundaryType: "exterior",
        area: valueEnvelope(12, "m2", ["DRAWING_ENV_A102"]),
        correctedUValue: valueEnvelope(0.28, "W/m2K", [
          "THERMAL_ASSESSMENT_ENV_001"
        ])
      }
    ];
    inputPack.envelope.thermalBridges = {
      linear: [
        {
          bridgeId: "LINEAR_BRIDGE_WITH_CORRECTED_U",
          boundaryType: "exterior",
          psi: valueEnvelope(0.04, "W/(mK)", ["THERMAL_BRIDGE_NOTE_ENV_002"]),
          length: valueEnvelope(6, "m", ["DRAWING_ENV_A102"])
        }
      ],
      point: []
    };
  },
  expectedError: /correctedUValue for CORRECTED_WALL_001 cannot be combined with explicit psi\/chi bridge terms/
});

expectFailure({
  name: "layer lambda without source is rejected",
  mutate(inputPack) {
    delete inputPack.envelope.elements[0].layers[0].lambda.sourceRefs;
  },
  expectedError: /layers\[0\]\.lambda\.sourceRefs must contain at least one item/
});

expectFailure({
  name: "linear bridge psi without source is rejected",
  mutate(inputPack) {
    delete inputPack.envelope.thermalBridges.linear[0].psi.sourceRefs;
  },
  expectedError: /thermalBridges\.linear\[0\]\.psi\.sourceRefs must contain at least one item/
});

expectFailure({
  name: "point bridge chi without source is rejected",
  mutate(inputPack) {
    inputPack.envelope.thermalBridges.point = [
      {
        bridgeId: "POINT_BRIDGE_WITHOUT_SOURCE",
        boundaryType: "exterior",
        chi: {
          value: 0.12,
          unit: "W/K",
          owner: "auditor_entered",
          confidence: "reviewed",
          status: "ready"
        }
      }
    ];
  },
  expectedError: /thermalBridges\.point\[0\]\.chi\.sourceRefs must contain at least one item/
});

for (const [fieldName, unit] of [
  ["Hd", "W/K"],
  ["Htr", "W/K"],
  ["Hve", "W/K"],
  ["finalEnergyKWh", "kWh"],
  ["totalPrimaryEnergyKWh", "kWh"],
  ["totalCO2Kg", "kgCO2"]
]) {
  expectFailure({
    name: `${fieldName} submitted as normal auditor input is rejected`,
    mutate(inputPack) {
      inputPack.envelope[fieldName] = valueEnvelope(1, unit);
    },
    expectedError: new RegExp(
      `Derived value envelope\\.${fieldName} must be submitted as validationImports or expertOverrides`
    )
  });
}

expectFailure({
  name: "raw category key without explicit mapping is rejected",
  mutate(inputPack) {
    delete inputPack.buildingClassification.primaryCategoryKey.sourceAuditorClassification;
    delete inputPack.buildingClassification.primaryCategoryKey.mappedMc001Category;
    delete inputPack.buildingClassification.primaryCategoryKey.mappingRuleId;
    delete inputPack.buildingClassification.primaryCategoryKey.traceId;
    delete inputPack.buildingClassification.primaryCategoryKey.responsibleModule;
  },
  expectedError: /primaryCategoryKey\.sourceAuditorClassification must be a non-empty string/
});

expectFailure({
  name: "product estimate fallback promoted as MC001 validation input is rejected",
  mutate(inputPack) {
    inputPack.envelope.elements[0].area.owner = "product_estimate";
  },
  expectedError: /area\.owner is not allowed for raw auditor input/
});

test("unsupported boundary type does not produce a fake result", () => {
  const inputPack = clone(fixture.inputPack);
  inputPack.envelope.elements = [
    {
      elementId: "UNSUPPORTED_ATRIUM_001",
      elementType: "wall",
      boundaryType: "atrium",
      area: valueEnvelope(12, "m2", ["DRAWING_ENV_A101"]),
      certifiedUValue: valueEnvelope(0.25, "W/m2K", ["FIELD_NOTE_ENV_001"])
    }
  ];
  inputPack.envelope.thermalBridges = { linear: [], point: [] };

  const result = build(inputPack);

  assert.equal(result.elementResults.length, 0);
  assert.equal(result.directTransmissionSubtotal, null);
  assert.equal(result.readinessClaims.isDirectTransmissionSubtotalReady, false);
  assert.equal(result.blockedItems.length, 1);
  assert.match(result.blockedItems[0].reason, /unsupported boundary type atrium/);
});

test("readiness claims remain conservative", () => {
  const result = build();

  assert.equal(result.readinessClaims.isDirectTransmissionSubtotalReady, true);
  assert.equal(result.readinessClaims.isCompleteHtrReady, false);
  assert.equal(result.readinessClaims.isCompleteEnvelopeReady, false);
  assert.equal(result.readinessClaims.isLevel2Ready, false);
  assert.equal(result.readinessClaims.isCertificateCpeWorkflowReady, false);
  assert.equal(result.readinessClaims.isProductionIntegrationReady, false);
});
