import assert from "node:assert/strict";
import {
  calculateDirectTransmissionWithBridges,
  calculateDirectTransmissionWithCorrectedU,
  calculateLinearBridgePsi,
  calculateTotalTransmissionCoefficient
} from "../transmissionCoefficients.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("calculates Hd from plain U elements and explicit bridge terms", () => {
  const result = calculateDirectTransmissionWithBridges({
    elements: [
      { uValue: 0.5, areaM2: 80, elementId: "wall" },
      { uValue: 2, areaM2: 10, elementId: "window" }
    ],
    linearBridges: [
      { psi: 0.2, lengthM: 30, bridgeId: "wall_corner", source: "explicit" }
    ],
    pointBridges: [
      { chi: 1.5, bridgeId: "point_bridge", source: "explicit" }
    ]
  });

  assert.equal(result.formulaId, "MC001_2_11_HD_WITH_BRIDGES");
  assert.equal(result.unit, "W/K");
  assert.equal(result.method, "plainUWithExplicitBridges");
  assert.equal(result.value, 67.5);
  assert.deepEqual(result.warnings, []);
});

test("warns when no thermal bridge data is supplied", () => {
  const result = calculateDirectTransmissionWithBridges({
    elements: [{ uValue: 0.5, areaM2: 80 }]
  });

  assert.equal(result.value, 40);
  assert.equal(result.method, "plainUWithoutBridgeData_lowConfidence");
  assert.ok(result.warnings.includes("thermal_bridges_missing_plain_U_without_bridge_data_low_confidence"));
});

test("allows non-positive psi or chi only with source", () => {
  const result = calculateDirectTransmissionWithBridges({
    elements: [{ uValue: 0.5, areaM2: 80 }],
    linearBridges: [{ psi: -0.05, lengthM: 10, source: "2d_model" }],
    pointBridges: [{ chi: 0, source: "catalog" }]
  });

  assert.equal(result.method, "plainUWithExplicitBridges");
  assert.equal(result.value, 39.5);
  assert.throws(
    () => calculateDirectTransmissionWithBridges({
      elements: [{ uValue: 0.5, areaM2: 80 }],
      linearBridges: [{ psi: 0, lengthM: 10 }]
    }),
    /source is required when psi <= 0/
  );
});

test("calculates Hd using corrected U prime and warns when source is missing", () => {
  const result = calculateDirectTransmissionWithCorrectedU({
    elements: [
      { uPrimeValue: 0.58, areaM2: 80, elementId: "wall" },
      { uPrimeValue: 1.3, areaM2: 10, elementId: "window", source: "expert" }
    ]
  });

  assert.equal(result.formulaId, "MC001_2_12_HD_CORRECTED_U");
  assert.equal(result.method, "correctedUPrime");
  assert.equal(result.value, 59.4);
  assert.ok(result.warnings.includes("corrected_U_prime_source_missing"));
});

test("calculates linear bridge psi from explicit L2D", () => {
  const result = calculateLinearBridgePsi({
    l2d: 46,
    elements: [{ uValue: 0.5, areaM2: 80 }],
    lengthM: 30,
    source: "2d_model"
  });

  assert.equal(result.formulaId, "MC001_2_13_PSI_LINEAR_BRIDGE");
  assert.equal(result.unit, "W/(mK)");
  assert.ok(Math.abs(result.value - 0.2) < 1e-12);
  assert.deepEqual(result.warnings, []);
});

test("warns when L2D source is missing", () => {
  const result = calculateLinearBridgePsi({
    l2d: 46,
    elements: [{ uValue: 0.5, areaM2: 80 }],
    lengthM: 30
  });

  assert.ok(result.warnings.includes("linear_bridge_l2d_source_missing"));
});

test("calculates total Htr and warns for applicable missing components", () => {
  const result = calculateTotalTransmissionCoefficient({
    hd: 100,
    hg: 20,
    applicability: {
      hgApplicable: true,
      huApplicable: true,
      haApplicable: false
    }
  });

  assert.equal(result.formulaId, "MC001_2_15_HTR_TOTAL");
  assert.equal(result.value, 120);
  assert.ok(result.warnings.includes("unheated_space_transmission_applicable_but_missing"));
  assert.ok(result.trace.assumptions.includes("ha_component_not_applicable_treated_as_zero"));
});

test("validates transmission inputs", () => {
  assert.throws(
    () => calculateDirectTransmissionWithBridges({
      elements: [{ uValue: 0, areaM2: 80 }]
    }),
    /elements\[0\]\.uValue must be a positive number/
  );
  assert.throws(
    () => calculateDirectTransmissionWithCorrectedU({
      elements: [{ uPrimeValue: 0.5, areaM2: -1 }]
    }),
    /elements\[0\]\.areaM2 must be a positive number/
  );
  assert.throws(
    () => calculateLinearBridgePsi({
      l2d: 46,
      elements: [{ uValue: 0.5, areaM2: 80 }],
      lengthM: 0
    }),
    /lengthM must be a positive number/
  );
  assert.throws(
    () => calculateTotalTransmissionCoefficient({ hd: -1 }),
    /hd must be a non-negative number/
  );
});
