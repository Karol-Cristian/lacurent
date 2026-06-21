import assert from "node:assert/strict";
import {
  calculateDhwBuriedPipeLinearTransmittance,
  calculateDhwInsulatedPipeLinearTransmittance,
  calculateDhwMeanDistributionTemperature,
  calculateDhwUninsulatedPipeApproxLinearTransmittance,
  calculateDhwUninsulatedPipeLinearTransmittance
} from "../../dhwDistributionLosses.mjs";
import { fixture009DhwDistributionLossComponent } from "./fixture009DhwDistributionLossComponent.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function percentageError(delta, expected) {
  if (expected === 0) {
    return delta === 0 ? 0 : Number.POSITIVE_INFINITY;
  }

  return Math.abs(delta / expected) * 100;
}

function metric({ metricKey, expected, calculated, toleranceAbs }) {
  const delta = calculated - expected;
  const absoluteDelta = Math.abs(delta);
  const percentError = percentageError(delta, expected);

  console.log(
    `METRIC ${fixture009DhwDistributionLossComponent.fixtureId}.${metricKey} expected=${expected} calculated=${calculated} absoluteDelta=${absoluteDelta} percentageError=${percentError}% toleranceAbs=${toleranceAbs}`
  );

  assert.ok(
    absoluteDelta <= toleranceAbs,
    `${metricKey} expected ${expected}, calculated ${calculated}, absolute delta ${absoluteDelta}, percentage error ${percentError}%`
  );

  return { metricKey, expected, calculated, absoluteDelta, percentError, toleranceAbs };
}

const calculatorsByRowKey = Object.freeze({
  mean_dhw_distribution_temperature: calculateDhwMeanDistributionTemperature,
  insulated_pipe_linear_transmittance: calculateDhwInsulatedPipeLinearTransmittance,
  buried_pipe_linear_transmittance: calculateDhwBuriedPipeLinearTransmittance,
  uninsulated_pipe_linear_transmittance_exact:
    calculateDhwUninsulatedPipeLinearTransmittance,
  uninsulated_pipe_linear_transmittance_approx:
    calculateDhwUninsulatedPipeApproxLinearTransmittance
});

test("validates MC001 fixture 009 DHW distribution-loss component rows", () => {
  for (const row of fixture009DhwDistributionLossComponent.expectedRows) {
    const calculator = calculatorsByRowKey[row.rowKey];
    assert.ok(calculator, `Missing calculator for ${row.rowKey}`);

    const result = calculator(row.inputs);
    const calculated =
      row.expectedUnit === "degC" ? result.valueC : result.valueWPerMK;

    assert.equal(result.status, "calculated");
    assert.equal(result.formulaId, row.formulaId);
    assert.equal(result.unit, row.expectedUnit);

    metric({
      metricKey: row.rowKey,
      expected: row.expected,
      calculated,
      toleranceAbs: row.toleranceAbs
    });
  }
});

test("documents blocked DHW distribution-loss rows outside fixture 009 scope", () => {
  assert.ok(
    fixture009DhwDistributionLossComponent.blockedRows.length >= 1,
    "Expected blocked rows to remain documented"
  );

  for (const row of fixture009DhwDistributionLossComponent.blockedRows) {
    assert.ok(row.source.length > 0);
    assert.ok(row.reason.length > 0);
  }
});
