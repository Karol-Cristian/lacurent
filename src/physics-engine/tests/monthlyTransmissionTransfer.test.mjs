import assert from "node:assert/strict";
import {
  calculateMonthlyTransmissionTransfer,
  calculateMonthlyTransmissionTransferCooling,
  calculateMonthlyTransmissionTransferHeating
} from "../monthlyTransmissionTransfer.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const baseInput = {
  htrExcludingGround: 100,
  hgrAnnual: 20,
  thetaInt: 20,
  thetaExternalMonthly: 0,
  thetaExternalAnnual: 10,
  deltaHours: 744,
  climateSource: "explicit_test_input"
};

test("calculates monthly transmission transfer from explicit climate inputs", () => {
  const result = calculateMonthlyTransmissionTransfer(baseInput);

  assert.equal(result.formulaId, "MC001_2_FIG_2_11_MONTHLY_TRANSMISSION_TRANSFER");
  assert.equal(result.unit, "kWh");
  assert.ok(Math.abs(result.value - 1636.8) < 1e-9);
  assert.deepEqual(result.warnings, []);
  assert.ok(result.trace.assumptions.includes("figure_2_11_ground_term_uses_annual_external_temperature"));
});

test("warns when explicit climate values have no source", () => {
  const result = calculateMonthlyTransmissionTransfer({
    ...baseInput,
    climateSource: undefined
  });

  assert.ok(result.warnings.includes("climate_source_missing_explicit_values_used"));
  assert.ok(Math.abs(result.value - 1636.8) < 1e-9);
});

test("sets heating mode through wrapper without changing formulaId", () => {
  const result = calculateMonthlyTransmissionTransferHeating(baseInput);

  assert.equal(result.formulaId, "MC001_2_FIG_2_11_MONTHLY_TRANSMISSION_TRANSFER");
  assert.equal(result.inputs.mode, "heating");
  assert.equal(result.trace.inputValues.mode, "heating");
});

test("sets cooling mode through wrapper without changing formulaId", () => {
  const result = calculateMonthlyTransmissionTransferCooling(baseInput);

  assert.equal(result.formulaId, "MC001_2_FIG_2_11_MONTHLY_TRANSMISSION_TRANSFER");
  assert.equal(result.inputs.mode, "cooling");
  assert.equal(result.trace.inputValues.mode, "cooling");
});

test("validates monthly transmission transfer inputs", () => {
  assert.throws(
    () => calculateMonthlyTransmissionTransfer({
      ...baseInput,
      htrExcludingGround: -1
    }),
    /htrExcludingGround must be a non-negative number/
  );
  assert.throws(
    () => calculateMonthlyTransmissionTransfer({
      ...baseInput,
      hgrAnnual: -1
    }),
    /hgrAnnual must be a non-negative number/
  );
  assert.throws(
    () => calculateMonthlyTransmissionTransfer({
      ...baseInput,
      thetaExternalMonthly: Number.NaN
    }),
    /thetaExternalMonthly must be a numeric value/
  );
  assert.throws(
    () => calculateMonthlyTransmissionTransfer({
      ...baseInput,
      deltaHours: 0
    }),
    /deltaHours must be a positive number/
  );
  assert.throws(
    () => calculateMonthlyTransmissionTransfer({
      ...baseInput,
      mode: "annual"
    }),
    /mode must be "heating" or "cooling" when supplied/
  );
});
