import assert from "node:assert/strict";
import {
  calculateLambdaCorrected,
  calculateLayerResistance,
  calculateTotalResistance,
  calculateUValue
} from "../materialsUValues.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("calculates corrected lambda with supplied coefficient", () => {
  const result = calculateLambdaCorrected({
    lambdaNormat: 0.6,
    correctionCoefficientA: 1.15,
    materialId: "brick"
  });

  assert.equal(result.formulaId, "MC001_2_3_LAMBDA_CORRECTED");
  assert.equal(result.unit, "W/mK");
  assert.equal(result.value, 0.69);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.trace.inputValues.materialId, "brick");
});

test("uses normative lambda with warning when correction coefficient is missing", () => {
  const result = calculateLambdaCorrected({ lambdaNormat: 0.038 });

  assert.equal(result.value, 0.038);
  assert.ok(result.warnings.includes("lambda_correction_coefficient_missing_using_normative_lambda"));
  assert.ok(result.trace.warnings.includes("lambda_correction_coefficient_missing_using_normative_lambda"));
});

test("calculates layer resistance", () => {
  const result = calculateLayerResistance({
    thicknessM: 0.3,
    lambdaWmK: 0.6
  });

  assert.equal(result.formulaId, "PHYSICS_LAYER_R");
  assert.equal(result.unit, "m2K/W");
  assert.equal(result.value, 0.5);
});

test("calculates total resistance without hardcoded surface constants", () => {
  const result = calculateTotalResistance({
    rsi: 0.13,
    layersR: [0.5, 1.3157894736842106],
    airLayersR: [],
    rse: 0.04
  });

  assert.equal(result.formulaId, "MC001_2_6_R_TOTAL");
  assert.equal(result.unit, "m2K/W");
  assert.equal(result.value, 1.9857894736842106);
  assert.deepEqual(result.inputs.layersR, [0.5, 1.3157894736842106]);
});

test("calculates plain U-value and warns that it is not bridge-corrected", () => {
  const result = calculateUValue({ totalResistance: 1.9857894736842106 });

  assert.equal(result.formulaId, "MC001_2_7_U_VALUE");
  assert.equal(result.unit, "W/m2K");
  assert.ok(Math.abs(result.value - 0.5035780545984627) < 1e-12);
  assert.ok(result.warnings.includes("plain_U_not_corrected_for_thermal_bridges"));
});

test("validates positive and non-negative inputs", () => {
  assert.throws(
    () => calculateLambdaCorrected({ lambdaNormat: 0 }),
    /lambdaNormat must be a positive number/
  );
  assert.throws(
    () => calculateLambdaCorrected({ lambdaNormat: 0.6, correctionCoefficientA: 0 }),
    /correctionCoefficientA must be a positive number/
  );
  assert.throws(
    () => calculateLayerResistance({ thicknessM: -0.1, lambdaWmK: 0.04 }),
    /thicknessM must be a positive number/
  );
  assert.throws(
    () => calculateTotalResistance({ rsi: 0.13, layersR: [0.5, -1], rse: 0.04 }),
    /layersR\[1\] must be a non-negative number/
  );
  assert.throws(
    () => calculateUValue({ totalResistance: 0 }),
    /totalResistance must be a positive number/
  );
});
