import assert from "node:assert/strict";
import { createMc001EnvelopeInputBuilder } from "../mc001EnvelopeInputBuilder.mjs";
import {
  createMc001TransmissionHtrReadinessGate,
  createMc001TransmissionHtrReadinessGateFromAuditorInput
} from "../mc001TransmissionHtrReadinessGate.mjs";
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

function validationImport(componentId, value, extra = {}) {
  return {
    importId: `IMPORT_${componentId}`,
    targetFieldPath: `transmission.${componentId}`,
    value,
    unit: "W/K",
    source: `controlled ${componentId} source`,
    owner: "validation_import_with_source",
    sourceRefs: [`${componentId}_CONTROLLED_SOURCE`],
    traceId: `${componentId}_TRACE`,
    importContext: "Phase E controlled transmission readiness component",
    sourceFixtureId: "FIXTURE_022_TRANSMISSION_HTR_READINESS_GATE",
    reviewStatus: "reviewed",
    validatesFormulaPath: false,
    ...extra
  };
}

function buildEnvelope(inputPack = fixture.inputPack) {
  return createMc001EnvelopeInputBuilder(inputPack, { registry: fixture.registry });
}

function buildGate(envelopeBuilderOutput = buildEnvelope(), extra = {}) {
  return createMc001TransmissionHtrReadinessGate({
    envelopeBuilderOutput,
    ...extra
  });
}

function inputWithoutBlockedEnvelopeElements() {
  const inputPack = clone(fixture.inputPack);
  inputPack.envelope.elements = inputPack.envelope.elements.filter(
    (element) => element.boundaryType === "exterior"
  );
  inputPack.explicitBlockers = [];
  return inputPack;
}

function completeControlledInputPack() {
  const inputPack = inputWithoutBlockedEnvelopeElements();
  inputPack.validationImports = [
    validationImport("Hg", 2),
    validationImport("Hu", 3),
    validationImport("Ha", 4)
  ];
  return inputPack;
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

test("Phase D exterior direct subtotal produces Hd ready and Htr partial blocked", () => {
  const result = buildGate();

  assert.equal(result.componentReadiness.Hd.status, "ready");
  assertAlmostEqual(result.componentReadiness.Hd.value, fixture.expected.directTransmissionSubtotalWPerK);
  assert.equal(result.componentReadiness.Hg.status, "blocked_missing_validated_method");
  assert.equal(result.componentReadiness.Hu.status, "blocked_missing_validated_method");
  assert.equal(result.componentReadiness.Ha.status, "blocked_missing_validated_method");
  assert.equal(result.componentReadiness.Htr.status, "blocked_incomplete_components");
  assert.equal(result.htrResult, null);
  assert.equal(result.readinessFlags.isHdExteriorDirectReady, true);
  assert.equal(result.readinessFlags.isHtrReady, false);
});

test("source-backed bridge contribution appears as ready bridge component", () => {
  const result = buildGate();

  assert.equal(result.componentReadiness.thermalBridges.status, "ready");
  assert.equal(result.componentReadiness.thermalBridges.value, fixture.expected.bridgeContributionWPerK);
  assert.ok(
    result.componentReadiness.thermalBridges.sourceRefs.includes("BRIDGE_SCHEDULE_ENV_001")
  );
  assert.ok(result.supportedTransmissionComponents.includes("thermalBridges"));
});

test("controlled validation import for a missing component is accepted with source trace unit and context", () => {
  const result = buildGate(buildEnvelope(), {
    validationImports: [validationImport("Hg", 2)]
  });

  assert.equal(result.componentReadiness.Hg.status, "ready");
  assert.equal(result.componentReadiness.Hg.value, 2);
  assert.equal(result.componentReadiness.Hg.unit, "W/K");
  assert.deepEqual(result.componentReadiness.Hg.sourceRefs, ["Hg_CONTROLLED_SOURCE"]);
  assert.equal(result.componentReadiness.Htr.status, "blocked_incomplete_components");
});

expectFailure(
  "controlled validation import without source trace and context is rejected",
  () =>
    buildGate(buildEnvelope(), {
      validationImports: [
        validationImport("Hg", 2, {
          source: "",
          traceId: "",
          traceability: "",
          importContext: ""
        })
      ]
    }),
  /validationImports\[0\]\.source must be a non-empty string/
);

test("complete source-backed component set can produce Htr through existing helper", () => {
  const inputPack = completeControlledInputPack();
  const result = createMc001TransmissionHtrReadinessGateFromAuditorInput(inputPack, {
    registry: fixture.registry
  });

  const expectedHtr = fixture.expected.directTransmissionSubtotalWPerK + 2 + 3 + 4;

  assert.equal(result.status, "ready_complete_htr");
  assert.equal(result.componentReadiness.Htr.status, "ready");
  assert.equal(result.htrResult.formulaId, "MC001_2_15_HTR_TOTAL");
  assertAlmostEqual(result.htrResult.value, expectedHtr);
  assert.equal(result.readinessFlags.isHtrReady, true);
  assert.equal(result.readinessFlags.isCompleteTransmissionReady, true);
});

test("blocked ground unconditioned and adjacent elements keep Htr incomplete", () => {
  const inputPack = clone(fixture.inputPack);
  inputPack.envelope.elements.push(
    {
      elementId: "UNCONDITIONED_WALL_001",
      elementType: "wall",
      boundaryType: "unconditioned",
      area: valueEnvelope(8, "m2", ["DRAWING_ENV_A101"]),
      certifiedUValue: valueEnvelope(0.31, "W/m2K", ["FIELD_NOTE_ENV_001"])
    },
    {
      elementId: "ADJACENT_WALL_001",
      elementType: "wall",
      boundaryType: "adjacent",
      area: valueEnvelope(9, "m2", ["DRAWING_ENV_A101"]),
      certifiedUValue: valueEnvelope(0.29, "W/m2K", ["FIELD_NOTE_ENV_001"])
    }
  );

  const result = createMc001TransmissionHtrReadinessGateFromAuditorInput(inputPack, {
    registry: fixture.registry
  });

  assert.equal(result.readinessFlags.isHtrReady, false);
  assert.equal(result.componentReadiness.Htr.status, "blocked_incomplete_components");
  assert.ok(result.blockedComponents.some((component) => component.componentId === "Hg"));
  assert.ok(result.blockedComponents.some((component) => component.componentId === "Hu"));
  assert.ok(result.blockedComponents.some((component) => component.componentId === "Ha"));
});

expectFailure(
  "missing envelope output is rejected",
  () => createMc001TransmissionHtrReadinessGate(),
  /envelopeBuilderOutput must be an object/
);

expectFailure(
  "Hd missing but claimed ready is rejected",
  () => {
    const output = clone(buildEnvelope());
    output.directTransmissionSubtotal = null;
    createMc001TransmissionHtrReadinessGate({
      envelopeBuilderOutput: output,
      componentClaims: { Hd: "ready" }
    });
  },
  /Hd is claimed ready but envelopeBuilderOutput\.directTransmissionSubtotal is missing/
);

expectFailure(
  "blocked ground treated as zero is rejected",
  () =>
    buildGate(buildEnvelope(), {
      componentMetadata: {
        Hg: {
          status: "blocked_missing_validated_method",
          value: 0,
          unit: "W/K",
          sourceRefs: ["GROUND_BLOCKER"]
        }
      }
    }),
  /componentMetadata\.Hg is blocked and must not provide a zero fallback value/
);

test("Htr requested while Hg Hu or Ha are missing returns incomplete diagnostic", () => {
  const result = buildGate(buildEnvelope(), {
    componentClaims: { Htr: "requested" }
  });

  assert.equal(result.componentReadiness.Htr.status, "blocked_incomplete_components");
  assert.ok(
    result.diagnostics.some(
      (diagnostic) => diagnostic.code === "blocked_incomplete_components"
    )
  );
});

expectFailure(
  "bridge contribution without source provenance is rejected",
  () => {
    const output = clone(buildEnvelope());
    output.bridgeResults[0].contribution.provenance.sourceRefs = [];
    createMc001TransmissionHtrReadinessGate({ envelopeBuilderOutput: output });
  },
  /bridgeResults\[0\]\.contribution\.sourceRefs must contain at least one item/
);

expectFailure(
  "product estimate fallback promoted as MC001 input is rejected through Phase C and D path",
  () => {
    const inputPack = clone(fixture.inputPack);
    inputPack.envelope.elements[0].area.owner = "product_estimate";
    createMc001TransmissionHtrReadinessGateFromAuditorInput(inputPack, {
      registry: fixture.registry
    });
  },
  /area\.owner is not allowed for raw auditor input/
);

for (const fieldName of ["Hd", "Htr"]) {
  expectFailure(
    `${fieldName} submitted as normal auditor input is rejected through Phase C and D path`,
    () => {
      const inputPack = clone(fixture.inputPack);
      inputPack.envelope[fieldName] = valueEnvelope(1, "W/K", ["FIELD_NOTE_ENV_001"]);
      createMc001TransmissionHtrReadinessGateFromAuditorInput(inputPack, {
        registry: fixture.registry
      });
    },
    new RegExp(
      `Derived value envelope\\.${fieldName} must be submitted as validationImports or expertOverrides`
    )
  );
}

expectFailure(
  "corrected U plus explicit bridge terms is rejected through Phase D path",
  () => {
    const inputPack = clone(fixture.inputPack);
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
          psi: valueEnvelope(0.04, "W/(mK)", ["BRIDGE_SCHEDULE_ENV_001"]),
          length: valueEnvelope(6, "m", ["DRAWING_ENV_A102"])
        }
      ],
      point: []
    };
    inputPack.explicitBlockers = [];

    createMc001TransmissionHtrReadinessGateFromAuditorInput(inputPack, {
      registry: fixture.registry
    });
  },
  /correctedUValue for CORRECTED_WALL_001 cannot be combined with explicit psi\/chi bridge terms/
);

expectFailure(
  "full Htr readiness flag cannot be true when any component is blocked",
  () =>
    buildGate(buildEnvelope(), {
      componentClaims: { Htr: "ready" }
    }),
  /Htr is claimed ready while transmission components are blocked/
);

expectFailure(
  "missing direct transmission unit is rejected",
  () => {
    const output = clone(buildEnvelope());
    delete output.directTransmissionSubtotal.unit;
    createMc001TransmissionHtrReadinessGate({ envelopeBuilderOutput: output });
  },
  /directTransmissionSubtotal\.unit must be a non-empty string/
);

expectFailure(
  "controlled component with invalid unit is rejected",
  () =>
    buildGate(buildEnvelope(), {
      validationImports: [validationImport("Hg", 2, { unit: "kW" })]
    }),
  /validationImports\[0\]\.unit must be W\/K/
);
