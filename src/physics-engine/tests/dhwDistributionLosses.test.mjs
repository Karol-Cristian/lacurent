import assert from "node:assert/strict";
import {
  calculateDhwAuxiliaryDistributionEnergy,
  calculateDhwAverageTemperatureFromProfile,
  calculateDhwAverageTemperatureSimplified,
  calculateDhwBuriedPipeLinearTransmittance,
  calculateDhwDistributionLossWithRecirculation,
  calculateDhwDistributionRecoveryFactor,
  calculateDhwExponentialCoefficient,
  calculateDhwHeatTracingAuxiliaryEnergy,
  calculateDhwInsulatedPipeLinearTransmittance,
  calculateDhwMeanDistributionTemperature,
  calculateDhwPressureDrop,
  calculateDhwPumpDesignPower,
  calculateDhwPumpEfficiencyFactor,
  calculateDhwPumpEnergyUseFactor,
  calculateDhwRecirculationLossWithoutDrawOff,
  calculateDhwRecirculationPumpEnergy,
  calculateDhwRecoverableDistributionLoss,
  calculateDhwRecoveredDistributionHeat,
  calculateDhwReferencePumpPower,
  calculateDhwSpecificLinearHeatLoss,
  calculateDhwStubLossWithoutRecirculation,
  calculateDhwTemperatureAfterNonUseInterval,
  calculateDhwTotalDistributionLoss,
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

test("calculates MC001 DHW distribution loss relations 3.205 to 3.216 from explicit inputs", () => {
  const pipeSegments = [
    {
      linearTransmittanceWPerMK: 0.2,
      thetaWMeanC: 47.5,
      thetaWAmbientC: 13,
      lengthM: 31.88,
      equivalentLengthM: 0.72
    },
    {
      linearTransmittanceWPerMK: 0.1,
      thetaWMeanC: 45,
      thetaWAmbientC: 18,
      lengthM: 10,
      equivalentLengthM: 0
    }
  ];
  const recirculation = calculateDhwDistributionLossWithRecirculation({
    pipeSegments,
    operationTimeHours: 10
  });
  const stub = calculateDhwStubLossWithoutRecirculation({
    pipeSegments: [
      { volumeM3: 0.0064, tapCountPerHour: 0.5, thetaWAmbientC: 13 },
      { volumeM3: 0.002, tapCountPerHour: 1, thetaWAmbientC: 20 }
    ],
    waterDensityKgPerM3: 990,
    specificHeatKWhPerKgK: 0.001163,
    thetaWDistributionC: 50,
    calculationIntervalHours: 1
  });
  const noDraw = calculateDhwRecirculationLossWithoutDrawOff({
    pipeSegments: [
      {
        linearTransmittanceWPerMK: 0.2,
        thetaWMeanC: 25,
        thetaWAmbientC: 13,
        lengthM: 5,
        equivalentLengthM: 1
      }
    ],
    operationTimeHours: 2
  });
  const total = calculateDhwTotalDistributionLoss({
    distributionLossKWh: recirculation.valueKWh,
    recirculationNoDrawLossKWh: noDraw.valueKWh,
    stubLossKWh: stub.valueKWh
  });
  const recoverable = calculateDhwRecoverableDistributionLoss({
    pipeSegments: [pipeSegments[0]],
    operationTimeHours: 10
  });
  const factor = calculateDhwDistributionRecoveryFactor({
    recoverableDistributionLossKWh: recoverable.valueKWh,
    totalDistributionLossKWh: total.valueKWh
  });
  const recovered = calculateDhwRecoveredDistributionHeat({
    recoveryFactor: factor.value,
    totalDistributionLossKWh: total.valueKWh
  });

  const expectedRecirculation =
    ((0.2 * (47.5 - 13) * (31.88 + 0.72)) +
      (0.1 * (45 - 18) * 10)) *
    10 /
    1000;
  const expectedStub =
    0.0064 * 990 * 0.5 * 0.001163 * (50 - 13) +
    0.002 * 990 * 1 * 0.001163 * (50 - 20);
  const expectedNoDraw = 0.2 * (25 + 13) * (5 + 1) * 2 / 1000;
  const expectedRecoverable = 0.2 * (47.5 - 13) * (31.88 + 0.72) * 10 / 1000;

  assert.equal(
    recirculation.formulaId,
    "MC001_3_205_DHW_DISTRIBUTION_LOSS_WITH_RECIRCULATION"
  );
  assert.equal(stub.formulaId, "MC001_3_206_DHW_STUB_LOSS_WITHOUT_RECIRCULATION");
  assert.equal(
    noDraw.formulaId,
    "MC001_3_207_DHW_RECIRCULATION_LOSS_WITHOUT_DRAWOFF"
  );
  assert.equal(total.formulaId, "MC001_3_213_DHW_TOTAL_DISTRIBUTION_LOSS");
  assertCloseTo(recirculation.valueKWh, expectedRecirculation);
  assertCloseTo(stub.valueKWh, expectedStub);
  assertCloseTo(noDraw.valueKWh, expectedNoDraw);
  assertCloseTo(total.valueKWh, expectedRecirculation + expectedStub + expectedNoDraw);
  assertCloseTo(recoverable.valueKWh, expectedRecoverable);
  assertCloseTo(factor.value, expectedRecoverable / total.valueKWh);
  assertCloseTo(recovered.valueKWh, expectedRecoverable);
});

test("calculates MC001 DHW temperature-profile support relations 3.208 to 3.212", () => {
  const q = calculateDhwSpecificLinearHeatLoss({
    linearTransmittanceWPerMK: 0.2,
    thetaWDistributionC: 50,
    thetaWAmbientC: 13
  });
  const coefficient = calculateDhwExponentialCoefficient({
    specificLinearHeatLossWPerM: q.valueWPerM,
    pipeLengthM: 10,
    waterSpecificHeatWhPerKgK: 1.163,
    waterDensityKgPerM3: 990,
    waterVolumeM3: 0.0064,
    pipeSpecificHeatWhPerKgK: 0.385,
    pipeMassKg: 2,
    nonUseIntervalHours: 2,
    thetaWDistributionC: 50,
    thetaWAmbientC: 13
  });
  const after = calculateDhwTemperatureAfterNonUseInterval({
    thetaWAhC: 13,
    thetaWAverageBeginC: 50,
    thetaWAmbientC: 13,
    exponentialCoefficient: coefficient.value
  });
  const average = calculateDhwAverageTemperatureFromProfile({
    thetaWAverageBeginC: 50,
    thetaWAfterNonUseC: after.valueC
  });
  const simplified = calculateDhwAverageTemperatureSimplified({
    linearTransmittanceWPerMK: 0.2
  });

  const heatCapacity = 1.163 * 990 * 0.0064 + 0.385 * 2;
  const expectedCoefficient = ((7.4 * 10) / heatCapacity) * (2 / 37);
  const expectedAfter = 13 + (50 - 13) * Math.exp(-expectedCoefficient);

  assert.equal(q.formulaId, "MC001_3_208_DHW_SPECIFIC_LINEAR_HEAT_LOSS");
  assert.equal(coefficient.formulaId, "MC001_3_209_DHW_EXPONENTIAL_COEFFICIENT");
  assert.equal(after.formulaId, "MC001_3_210_DHW_TEMPERATURE_AFTER_NONUSE_INTERVAL");
  assert.equal(average.formulaId, "MC001_3_211_DHW_AVERAGE_TEMPERATURE_PROFILE");
  assert.equal(simplified.formulaId, "MC001_3_212_DHW_AVERAGE_TEMPERATURE_SIMPLIFIED");
  assertCloseTo(q.valueWPerM, 7.4);
  assertCloseTo(coefficient.value, expectedCoefficient);
  assertCloseTo(after.valueC, expectedAfter);
  assertCloseTo(average.valueC, (50 + expectedAfter) / 2);
  assertCloseTo(simplified.valueC, 25 * 0.2 ** -0.2);
});

test("calculates MC001 DHW auxiliary pump and heat tracing relations", () => {
  const pressure = calculateDhwPressureDrop({
    componentResistanceFactor: 0.3,
    maxLinearPressureDropKPaPerM: 0.15,
    maxCircuitLengthM: 40,
    additionalPressureDropKPa: 12
  });
  const designPower = calculateDhwPumpDesignPower({
    pressureDropKPa: pressure.valueKPa,
    designFlowRateM3PerH: 2.4
  });
  const referencePower = calculateDhwReferencePumpPower({
    pumpDesignPowerKW: designPower.valueKW
  });
  const efficiency = calculateDhwPumpEfficiencyFactor({
    referencePumpPowerKW: referencePower.valueKW,
    pumpDesignPowerKW: designPower.valueKW
  });
  const useFactor = calculateDhwPumpEnergyUseFactor({
    pumpEfficiencyFactor: efficiency.value,
    controlConstantCp1: 0.25,
    controlConstantCp2: 0.75,
    operationLoadFactor: 0.5,
    energyEfficiencyIndex: 0.23
  });
  const pumpEnergy = calculateDhwRecirculationPumpEnergy({
    pumpDesignPowerKW: designPower.valueKW,
    operationLoadFactor: 0.5,
    annualOperationTimeHours: 4000,
    correctionFactor: 1.1
  });
  const auxiliary = calculateDhwAuxiliaryDistributionEnergy({
    recirculationPumpEnergyKWh: pumpEnergy.valueKWh,
    pumpEnergyUseFactor: useFactor.value
  });
  const heatTracing = calculateDhwHeatTracingAuxiliaryEnergy({
    protectedPipeDistributionLossKWh: 12.5
  });

  const expectedPressure = (1 + 0.3) * 0.15 * 40 + 12;
  const expectedDesignPower = expectedPressure * 2.4 / 3600;
  const expectedReferencePower =
    (1.7 * expectedDesignPower +
      17 * (1 - Math.exp(-0.3 * expectedDesignPower))) *
    10 ** -3;
  const expectedEfficiency = expectedReferencePower / expectedDesignPower;
  const expectedUseFactor =
    expectedEfficiency * (0.25 + 0.75 * 0.5 ** -1) * 0.23 / 0.25;
  const expectedPumpEnergy = expectedDesignPower * 0.5 * 4000 * 1.1;

  assert.equal(pressure.formulaId, "MC001_3_218_DHW_PRESSURE_DROP");
  assert.equal(designPower.formulaId, "MC001_3_217_DHW_PUMP_DESIGN_POWER");
  assert.equal(referencePower.formulaId, "MC001_3_223_DHW_REFERENCE_PUMP_POWER");
  assert.equal(efficiency.formulaId, "MC001_3_222_DHW_PUMP_EFFICIENCY_FACTOR");
  assert.equal(useFactor.formulaId, "MC001_3_221_DHW_PUMP_ENERGY_USE_FACTOR");
  assert.equal(pumpEnergy.formulaId, "MC001_3_219_DHW_RECIRCULATION_PUMP_ENERGY");
  assert.equal(auxiliary.formulaId, "MC001_3_220_DHW_AUXILIARY_DISTRIBUTION_ENERGY");
  assert.equal(heatTracing.formulaId, "MC001_3_224_DHW_HEAT_TRACING_AUXILIARY_ENERGY");
  assertCloseTo(pressure.valueKPa, expectedPressure);
  assertCloseTo(designPower.valueKW, expectedDesignPower);
  assertCloseTo(referencePower.valueKW, expectedReferencePower);
  assertCloseTo(efficiency.value, expectedEfficiency);
  assertCloseTo(useFactor.value, expectedUseFactor);
  assertCloseTo(pumpEnergy.valueKWh, expectedPumpEnergy);
  assertCloseTo(auxiliary.valueKWh, expectedPumpEnergy * expectedUseFactor);
  assert.equal(heatTracing.valueKWh, 12.5);
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

  assert.throws(
    () =>
      calculateDhwDistributionLossWithRecirculation({
        pipeSegments: [],
        operationTimeHours: 1
      }),
    /pipeSegments must be a non-empty array/
  );

  assert.throws(
    () =>
      calculateDhwDistributionRecoveryFactor({
        recoverableDistributionLossKWh: 1,
        totalDistributionLossKWh: 0
      }),
    /totalDistributionLossKWh must be a finite positive number/
  );
});
