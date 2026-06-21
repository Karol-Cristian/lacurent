import assert from "node:assert/strict";
import {
  calculateDhwBuriedPipeLinearTransmittance,
  calculateDhwInsulatedPipeLinearTransmittance,
  calculateDhwMeanDistributionTemperature,
  calculateDhwUninsulatedPipeApproxLinearTransmittance,
  calculateDhwUninsulatedPipeLinearTransmittance
} from "../dhwDistributionLosses.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function assertCloseTo(actual, expected, epsilon = 1e-12) {
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} is not close to ${expected}`);
}

test("calculates MC001 DHW mean distribution temperature", () => {
  const result = calculateDhwMeanDistributionTemperature({
    thetaWDistributionC: 50,
    deltaThetaWLoopK: 5
  });

  assert.equal(result.status, "calculated");
  assert.equal(result.formulaId, "MC001_3_200_DHW_MEAN_DISTRIBUTION_TEMPERATURE");
  assert.equal(result.unit, "degC");
  assert.equal(result.valueC, 47.5);
});

test("calculates MC001 DHW insulated pipe linear transmittance", () => {
  const result = calculateDhwInsulatedPipeLinearTransmittance({
    innerDiameterM: 0.02,
    outerDiameterM: 0.06,
    insulationThermalConductivityWPerMK: 0.04,
    externalHeatTransferCoefficientWPerM2K: 8
  });

  assert.equal(
    result.formulaId,
    "MC001_3_201_DHW_LINEAR_TRANSMITTANCE_INSULATED_PIPE"
  );
  assert.equal(result.unit, "W/(mK)");
  assertCloseTo(result.valueWPerMK, 0.19863399389321662);
});

test("calculates MC001 DHW buried pipe linear transmittance", () => {
  const result = calculateDhwBuriedPipeLinearTransmittance({
    innerDiameterM: 0.02,
    outerDiameterM: 0.06,
    insulationThermalConductivityWPerMK: 0.04,
    burialMaterialThermalConductivityWPerMK: 1,
    burialDepthM: 0.15
  });

  assert.equal(
    result.formulaId,
    "MC001_3_202_DHW_LINEAR_TRANSMITTANCE_BURIED_PIPE"
  );
  assertCloseTo(result.valueWPerMK, 0.21107256240418676);
});

test("calculates MC001 DHW uninsulated pipe exact and approximate transmittance", () => {
  const exact = calculateDhwUninsulatedPipeLinearTransmittance({
    innerDiameterM: 0.019,
    outerDiameterM: 0.022,
    pipeThermalConductivityWPerMK: 380,
    externalHeatTransferCoefficientWPerM2K: 14
  });
  const approximate = calculateDhwUninsulatedPipeApproxLinearTransmittance({
    outerDiameterM: 0.022,
    externalHeatTransferCoefficientWPerM2K: 14
  });

  assert.equal(
    exact.formulaId,
    "MC001_3_203_DHW_LINEAR_TRANSMITTANCE_UNINSULATED_PIPE"
  );
  assert.equal(
    approximate.formulaId,
    "MC001_3_204_DHW_LINEAR_TRANSMITTANCE_UNINSULATED_APPROX"
  );
  assertCloseTo(exact.valueWPerMK, 0.9675530520888385);
  assertCloseTo(approximate.valueWPerMK, 0.9676105373056563);
});

test("rejects invalid DHW distribution-loss component inputs", () => {
  assert.throws(
    () =>
      calculateDhwInsulatedPipeLinearTransmittance({
        innerDiameterM: 0.06,
        outerDiameterM: 0.02,
        insulationThermalConductivityWPerMK: 0.04,
        externalHeatTransferCoefficientWPerM2K: 8
      }),
    /outerDiameterM must be greater than innerDiameterM/
  );

  assert.throws(
    () =>
      calculateDhwMeanDistributionTemperature({
        thetaWDistributionC: 50,
        deltaThetaWLoopK: -1
      }),
    /deltaThetaWLoopK must be a finite non-negative number/
  );
});
