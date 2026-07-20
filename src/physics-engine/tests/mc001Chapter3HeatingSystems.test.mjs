import assert from "node:assert/strict";
import {
  calculateCentralGeneratorOutputEnergy,
  calculateChapter3SubsystemInputEnergyBalance,
  calculateChapter3SubsystemRecoverableEnergy,
  calculateGenerationLossTotal,
  calculateHeatingDistributionAuxiliaryEnergy,
  calculateHeatingDistributionAuxiliaryRecoverableEnergy,
  calculateHeatingDistributionAuxiliaryRecoveredEnergy,
  calculateHeatingDistributionBoostPumpEnergy,
  calculateHeatingDistributionSetbackPumpEnergy,
  calculateHeatingEmissionEfficiency,
  calculateHeatingEmissionInputEnergy,
  calculateHeatingEmissionLoss,
  calculateHeatingGenerationAuxiliaryTotal,
  calculateHeatingGeneratorAuxiliaryEnergy,
  calculateHeatingGeneratorAuxiliaryPowerFromCoefficients,
  calculateHeatingGeneratorAuxiliaryPowerHighLoad,
  calculateHeatingGeneratorAuxiliaryPowerLowLoad,
  calculateHeatingGeneratorAuxiliaryRecoverableFraction,
  calculateHeatingGeneratorAuxiliaryRecoverableLoss,
  calculateHeatingGeneratorAuxiliaryRecoveredLoss,
  calculateHeatingGeneratorEnvelopeRecoverableLoss,
  calculateHeatingGeneratorFuelInputEnergy,
  calculateHeatingGeneratorFullLoadHours,
  calculateHeatingGeneratorLoadFactor,
  calculateHeatingGeneratorLossEnergy,
  calculateHeatingGeneratorLossPowerHighLoad,
  calculateHeatingGeneratorLossPowerLowLoad,
  calculateHeatingGeneratorOperationTime,
  calculateHeatingGeneratorStandbyLossFractionFromCoefficients,
  calculateHeatingGeneratorStandbyLossFractionFromEnvelopeAndChimney,
  calculateHeatingGeneratorStandbyLossPower,
  calculateHeatingGeneratorUtilizationFactor,
  calculateHydronicDesignPower,
  calculateHydronicPressureDrop,
  calculateHydronicPumpEfficiencyFactor,
  calculateHydronicPumpEnergy,
  calculateHydronicPumpEnergyUseFactor,
  calculateHydronicReferencePumpPower,
  calculateIntermediateLoadFactor,
  calculateRecoverableGenerationLossTotal,
  calculateTotalGenerationAuxiliaryRecoveredLoss
} from "../mc001Chapter3HeatingSystems.mjs";

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

test("calculates Chapter 3 generic subsystem input and recoverable energy balances", () => {
  const input = calculateChapter3SubsystemInputEnergyBalance({
    subsystemId: "H.em",
    subsystemOutputKWh: 100,
    subsystemLossKWh: 8,
    auxiliaryEnergyKWh: 2,
    auxiliaryRecoveredFraction: 0.25,
    lossRecoveredFraction: 0.5
  });
  const recoverable = calculateChapter3SubsystemRecoverableEnergy({
    subsystemId: "H.em",
    auxiliaryEnergyKWh: 2,
    auxiliaryRecoverableFractionToHeating: 0.2,
    subsystemLossKWh: 8,
    lossRecoverableFractionToHeating: 0.75
  });

  assert.equal(input.formulaId, "MC001_3_A_SUBSYSTEM_INPUT_ENERGY_BALANCE");
  assert.equal(recoverable.formulaId, "MC001_3_B_SUBSYSTEM_RECOVERABLE_ENERGY");
  assertCloseTo(input.valueKWh, 100 + 8 - 0.5 - 4);
  assertCloseTo(recoverable.valueKWh, 0.4 + 6);
});

test("calculates heating emission and hydronic distribution relations 3.1 to 3.14", () => {
  const emissionLoss = calculateHeatingEmissionLoss({
    emissionOutputKWh: 1200,
    increasedIndoorTemperatureK: 1.5,
    indoorTemperatureC: 20,
    combinedOutdoorTemperatureC: -5
  });
  const emissionEfficiency = calculateHeatingEmissionEfficiency({
    annualEmissionOutputKWh: 1200,
    annualEmissionLossKWh: emissionLoss.valueKWh
  });
  const emissionInput = calculateHeatingEmissionInputEnergy({
    annualEmissionOutputKWh: 1200,
    annualEmissionLossKWh: emissionLoss.valueKWh
  });
  const pressure = calculateHydronicPressureDrop({
    componentResistanceFactor: 0.3,
    maxLinearPressureDropKPaPerM: 0.16,
    maxCircuitLengthM: 42,
    additionalPressureDropKPa: 11
  });
  const designPower = calculateHydronicDesignPower({
    pressureDropKPa: pressure.valueKPa,
    designFlowRateM3PerH: 2.6
  });
  const referencePower = calculateHydronicReferencePumpPower({
    hydronicDesignPowerKW: designPower.valueKW
  });
  const efficiency = calculateHydronicPumpEfficiencyFactor({
    referencePumpPowerKW: referencePower.valueKW,
    hydronicDesignPowerKW: designPower.valueKW
  });
  const useFactor = calculateHydronicPumpEnergyUseFactor({
    pumpEfficiencyFactor: efficiency.value,
    controlConstantCp1: 0.25,
    controlConstantCp2: 0.75,
    operationLoadFactor: 0.5,
    energyEfficiencyIndex: 0.23
  });
  const pumpEnergy = calculateHydronicPumpEnergy({
    designPowerKW: designPower.valueKW,
    operationLoadFactor: 0.5,
    annualOperationHours: 3000,
    correctionFactor: 1.15
  });
  const auxiliary = calculateHeatingDistributionAuxiliaryEnergy({
    hydronicPumpEnergyKWh: pumpEnergy.valueKWh,
    pumpEnergyUseFactor: useFactor.value
  });
  const setback = calculateHeatingDistributionSetbackPumpEnergy({
    setbackPumpPowerKW: 0.04,
    calculationHours: 200
  });
  const boost = calculateHeatingDistributionBoostPumpEnergy({
    hydronicDesignPowerKW: designPower.valueKW,
    calculationHours: 12
  });
  const recoverableAux = calculateHeatingDistributionAuxiliaryRecoverableEnergy({
    recoverableFraction: 0.1,
    distributionAuxiliaryEnergyKWh: auxiliary.valueKWh
  });
  const recoveredAux = calculateHeatingDistributionAuxiliaryRecoveredEnergy({
    recoverableFraction: 0.1,
    distributionAuxiliaryEnergyKWh: auxiliary.valueKWh
  });

  const expectedLoss = 1200 * 1.5 / 25;
  const expectedPressure = (1 + 0.3) * 0.16 * 42 + 11;
  const expectedDesignPower = expectedPressure * 2.6 / 3600;
  const expectedReferencePower =
    (1.7 * expectedDesignPower + 17 * (1 - Math.exp(-0.3 * expectedDesignPower))) *
    10 ** -3;
  const expectedUseFactor =
    (expectedReferencePower / expectedDesignPower) * (0.25 + 0.75 / 0.5) * 0.23 / 0.25;
  const expectedPump = expectedDesignPower * 0.5 * 3000 * 1.15;

  assert.equal(emissionLoss.formulaId, "MC001_3_1_HEATING_EMISSION_LOSS");
  assert.equal(emissionEfficiency.formulaId, "MC001_3_2_HEATING_EMISSION_EFFICIENCY_FACTOR");
  assert.equal(emissionInput.formulaId, "MC001_3_3_HEATING_EMISSION_INPUT_ENERGY");
  assert.equal(designPower.formulaId, "MC001_3_4_HYDRONIC_DESIGN_POWER");
  assert.equal(pressure.formulaId, "MC001_3_5_HYDRONIC_PRESSURE_DROP");
  assert.equal(pumpEnergy.formulaId, "MC001_3_6_HYDRONIC_PUMP_ENERGY");
  assert.equal(auxiliary.formulaId, "MC001_3_7_HEATING_DISTRIBUTION_AUXILIARY_ENERGY");
  assert.equal(useFactor.formulaId, "MC001_3_8_HYDRONIC_PUMP_ENERGY_USE_FACTOR");
  assert.equal(efficiency.formulaId, "MC001_3_9_HYDRONIC_PUMP_EFFICIENCY_FACTOR");
  assert.equal(referencePower.formulaId, "MC001_3_10_HYDRONIC_REFERENCE_PUMP_POWER");
  assert.equal(setback.formulaId, "MC001_3_11_HEATING_DISTRIBUTION_SETBACK_PUMP_ENERGY");
  assert.equal(boost.formulaId, "MC001_3_12_HEATING_DISTRIBUTION_BOOST_PUMP_ENERGY");
  assert.equal(recoverableAux.formulaId, "MC001_3_13_HEATING_DISTRIBUTION_AUXILIARY_RECOVERABLE");
  assert.equal(recoveredAux.formulaId, "MC001_3_14_HEATING_DISTRIBUTION_AUXILIARY_RECOVERED");
  assertCloseTo(emissionLoss.valueKWh, expectedLoss);
  assertCloseTo(emissionEfficiency.value, (1200 + expectedLoss) / 1200);
  assertCloseTo(emissionInput.valueKWh, 1200 + expectedLoss);
  assertCloseTo(pressure.valueKPa, expectedPressure);
  assertCloseTo(designPower.valueKW, expectedDesignPower);
  assertCloseTo(referencePower.valueKW, expectedReferencePower);
  assertCloseTo(useFactor.value, expectedUseFactor);
  assertCloseTo(pumpEnergy.valueKWh, expectedPump);
  assertCloseTo(auxiliary.valueKWh, expectedPump * expectedUseFactor);
  assertCloseTo(setback.valueKWh, 0.3 * 0.04 * 200);
  assertCloseTo(boost.valueKWh, 3.3 * expectedDesignPower * 12);
  assertCloseTo(recoverableAux.valueKWh, auxiliary.valueKWh * 0.1);
  assertCloseTo(recoveredAux.valueKWh, auxiliary.valueKWh * 0.9);
});

test("calculates heating generation relations 3.15 to 3.39", () => {
  const fractionC = calculateHeatingGeneratorStandbyLossFractionFromCoefficients({
    coefficientC5: 8,
    coefficientC6: -0.4,
    nominalPowerKW: 24
  });
  const fractionSum = calculateHeatingGeneratorStandbyLossFractionFromEnvelopeAndChimney({
    envelopeLossFractionPercent: 1.1,
    chimneyOffLossFractionPercent: 0.4
  });
  const standbyPower = calculateHeatingGeneratorStandbyLossPower({
    envelopeLossFractionPercent: 1.1,
    chimneyOffLossFractionPercent: 0.4,
    generatorDeliveredPowerKW: 24
  });
  const auxPower = calculateHeatingGeneratorAuxiliaryPowerFromCoefficients({
    coefficientC7: 1.5,
    coefficientC8: 0.5,
    nominalPowerKW: 24
  });
  const fuel = calculateHeatingGeneratorFuelInputEnergy({
    generatorOutputKWh: 1100,
    recoveredAuxiliaryLossKWh: 8,
    generatorLossKWh: 90,
    renewableGeneratorHeatKWh: 20
  });
  const utilization = calculateHeatingGeneratorUtilizationFactor({
    generatorOutputKWh: 1100,
    fuelInputKWh: fuel.valueKWh
  });
  const auxTotal = calculateHeatingGenerationAuxiliaryTotal({
    heatingAuxiliaryKWh: [10, 3],
    otherServiceAuxiliaryKWh: [2, 1]
  });
  const losses = calculateGenerationLossTotal({
    heatingGenerationLossKWh: 90,
    otherServiceGenerationLossesKWh: [7, 3],
    dhwStorageOrDistributionLossKWh: 12
  });
  const load = calculateHeatingGeneratorLoadFactor({
    generatorOutputKWh: 1100,
    nominalPowerKW: 24,
    heatingOperationHours: 900
  });
  const fullLoad = calculateHeatingGeneratorFullLoadHours({
    generatorOutputKWh: 1100,
    nominalPowerKW: 24
  });
  const lowLoss = calculateHeatingGeneratorLossPowerLowLoad({
    generatorLoadFactor: 0.2,
    intermediateLoadFactor: 0.3,
    lossPowerNominalKW: 1.2,
    lossPowerIntermediateKW: 0.5
  });
  const highLoss = calculateHeatingGeneratorLossPowerHighLoad({
    generatorLoadFactor: 0.6,
    intermediateLoadFactor: 0.3,
    nominalLoadFactor: 1,
    lossPowerNominalKW: 1.2,
    lossPowerIntermediateKW: 0.5
  });
  const lossEnergy = calculateHeatingGeneratorLossEnergy({
    generatorLossPowerKW: highLoss.valueKW,
    operationHours: 100
  });
  const recoverableTotal = calculateRecoverableGenerationLossTotal({
    heatingGenerationRecoverableLossKWh: 12,
    otherServiceRecoverableLossesKWh: [2, 1],
    heatingAuxiliaryRecoverableLossKWh: 3
  });
  const envelopeRecoverable = calculateHeatingGeneratorEnvelopeRecoverableLoss({
    correctedStandbyLossPowerKW: 0.2,
    boilerRoomRecoveryFactor: 0.25,
    envelopeLossFraction: 0.6,
    operationHours: 400
  });
  const recoverableFraction = calculateHeatingGeneratorAuxiliaryRecoverableFraction({
    recoveredAuxiliaryFraction: 0.75
  });
  const auxRecovered = calculateHeatingGeneratorAuxiliaryRecoveredLoss({
    generationAuxiliaryEnergyKWh: 16,
    recoveredAuxiliaryFraction: 0.75
  });
  const auxRecoverable = calculateHeatingGeneratorAuxiliaryRecoverableLoss({
    generationAuxiliaryEnergyKWh: 16,
    boilerRoomRecoveryFactor: 0.25,
    auxiliaryRecoverableFraction: recoverableFraction.value
  });
  const totalAuxRecovered = calculateTotalGenerationAuxiliaryRecoveredLoss({
    heatingAuxiliaryRecoveredLossKWh: auxRecovered.valueKWh,
    otherRecoveredAuxiliaryLossesKWh: [1, 2]
  });
  const lowAuxPower = calculateHeatingGeneratorAuxiliaryPowerLowLoad({
    generatorLoadFactor: 0.2,
    intermediateLoadFactor: 0.3,
    auxiliaryPowerIntermediateKW: 0.08,
    auxiliaryPowerStandbyKW: 0.02
  });
  const highAuxPower = calculateHeatingGeneratorAuxiliaryPowerHighLoad({
    generatorLoadFactor: 0.6,
    intermediateLoadFactor: 0.3,
    auxiliaryPowerNominalKW: 0.12,
    auxiliaryPowerIntermediateKW: 0.08
  });
  const betaPint = calculateIntermediateLoadFactor({
    intermediatePowerKW: 8,
    nominalPowerKW: 24
  });
  const auxEnergy = calculateHeatingGeneratorAuxiliaryEnergy({
    auxiliaryPowerKW: highAuxPower.valueKW,
    operationHours: 100
  });
  const opTime = calculateHeatingGeneratorOperationTime({
    heatingUseHours: 1000,
    heatingLoadFactor: 0.5,
    coolingUseHours: 100,
    coolingLoadFactor: 0.1,
    ventilationUseHours: 200,
    ventilationLoadFactor: 0.05,
    dhwUseHours: 300,
    dhwLoadFactor: 0.02
  });
  const centralOutput = calculateCentralGeneratorOutputEnergy({
    controlLossFactor: 1.04,
    heatingDistributionInputKWh: [300, 200],
    otherServiceDistributionInputKWh: [50, 25]
  });

  assert.equal(fractionC.formulaId, "MC001_3_15_HEATING_GENERATOR_STANDBY_LOSS_FRACTION");
  assert.equal(fractionSum.formulaId, "MC001_3_16_HEATING_GENERATOR_STANDBY_LOSS_FRACTION_SUM");
  assert.equal(standbyPower.formulaId, "MC001_3_17_HEATING_GENERATOR_STANDBY_LOSS_POWER");
  assert.equal(auxPower.formulaId, "MC001_3_18_HEATING_GENERATOR_AUXILIARY_POWER");
  assert.equal(utilization.formulaId, "MC001_3_19_HEATING_GENERATOR_UTILIZATION_FACTOR");
  assert.equal(fuel.formulaId, "MC001_3_20_HEATING_GENERATOR_FUEL_INPUT_ENERGY");
  assert.equal(auxTotal.formulaId, "MC001_3_21_HEATING_GENERATION_AUXILIARY_TOTAL");
  assert.equal(losses.formulaId, "MC001_3_22_GENERATION_LOSS_TOTAL");
  assert.equal(load.formulaId, "MC001_3_23_HEATING_GENERATOR_LOAD_FACTOR");
  assert.equal(fullLoad.formulaId, "MC001_3_24_HEATING_GENERATOR_FULL_LOAD_HOURS");
  assert.equal(lowLoss.formulaId, "MC001_3_25_HEATING_GENERATOR_LOSS_POWER_LOW_LOAD");
  assert.equal(highLoss.formulaId, "MC001_3_26_HEATING_GENERATOR_LOSS_POWER_HIGH_LOAD");
  assert.equal(lossEnergy.formulaId, "MC001_3_27_HEATING_GENERATOR_LOSS_ENERGY");
  assert.equal(recoverableTotal.formulaId, "MC001_3_28_RECOVERABLE_GENERATION_LOSS_TOTAL");
  assert.equal(envelopeRecoverable.formulaId, "MC001_3_29_HEATING_GENERATOR_ENVELOPE_RECOVERABLE_LOSS");
  assert.equal(recoverableFraction.formulaId, "MC001_3_30_HEATING_GENERATOR_AUXILIARY_RECOVERABLE_FRACTION");
  assert.equal(auxRecovered.formulaId, "MC001_3_31_HEATING_GENERATOR_AUXILIARY_RECOVERED_LOSS");
  assert.equal(auxRecoverable.formulaId, "MC001_3_32_HEATING_GENERATOR_AUXILIARY_RECOVERABLE_LOSS");
  assert.equal(totalAuxRecovered.formulaId, "MC001_3_33_TOTAL_GENERATION_AUXILIARY_RECOVERED_LOSS");
  assert.equal(lowAuxPower.formulaId, "MC001_3_34_HEATING_GENERATOR_AUXILIARY_POWER_LOW_LOAD");
  assert.equal(highAuxPower.formulaId, "MC001_3_35_HEATING_GENERATOR_AUXILIARY_POWER_HIGH_LOAD");
  assert.equal(betaPint.formulaId, "MC001_3_36_INTERMEDIATE_LOAD_FACTOR");
  assert.equal(auxEnergy.formulaId, "MC001_3_37_HEATING_GENERATOR_AUXILIARY_ENERGY");
  assert.equal(opTime.formulaId, "MC001_3_38_HEATING_GENERATOR_OPERATION_TIME");
  assert.equal(centralOutput.formulaId, "MC001_3_39_CENTRAL_GENERATOR_OUTPUT_ENERGY");

  assertCloseTo(fractionC.valuePercent, 8 * 24 ** -0.4 / 100);
  assertCloseTo(fractionSum.valuePercent, 1.5);
  assertCloseTo(standbyPower.valueKW, 0.015 * 24);
  assertCloseTo(auxPower.valueKW, 0.02 * 24);
  assertCloseTo(fuel.valueKWh, 1100 - 8 + 90 - 20);
  assertCloseTo(utilization.value, 1100 / fuel.valueKWh);
  assertCloseTo(auxTotal.valueKWh, 16);
  assertCloseTo(losses.valueKWh, 112);
  assertCloseTo(load.value, 1100 / (24 * 900));
  assertCloseTo(fullLoad.valueHours, 1100 / 24);
  assertCloseTo(lowLoss.valueKW, 0.2 / 0.3 * (1.2 - 0.5) + 0.5);
  assertCloseTo(highLoss.valueKW, (0.6 - 0.3) / (1 - 0.3) * (1.2 - 0.5) + 0.5);
  assertCloseTo(lossEnergy.valueKWh, highLoss.valueKW * 100);
  assertCloseTo(recoverableTotal.valueKWh, 18);
  assertCloseTo(envelopeRecoverable.valueKWh, 0.2 * 0.75 * 0.6 * 400);
  assertCloseTo(recoverableFraction.value, 0.25);
  assertCloseTo(auxRecovered.valueKWh, 12);
  assertCloseTo(auxRecoverable.valueKWh, 16 * 0.75 * 0.25);
  assertCloseTo(totalAuxRecovered.valueKWh, 15);
  assertCloseTo(lowAuxPower.valueKW, 0.2 / 0.3 * (0.08 - 0.02) + 0.02);
  assertCloseTo(highAuxPower.valueKW, (0.6 - 0.3) / (1 - 0.3) * (0.12 - 0.08) + 0.08);
  assertCloseTo(betaPint.value, 8 / 24);
  assertCloseTo(auxEnergy.valueKWh, highAuxPower.valueKW * 100);
  assertCloseTo(opTime.valueHours, 1000 * 0.5 - 100 * 0.1 - 200 * 0.05 - 300 * 0.02);
  assertCloseTo(centralOutput.valueKWh, 1.04 * 500 + 75);
});

test("rejects invalid heating system inputs", () => {
  assert.throws(
    () =>
      calculateHeatingEmissionLoss({
        emissionOutputKWh: 1,
        increasedIndoorTemperatureK: 1,
        indoorTemperatureC: 20,
        combinedOutdoorTemperatureC: 20
      }),
    /indoorTemperatureC - combinedOutdoorTemperatureC must be a finite positive number/
  );

  assert.throws(
    () =>
      calculateChapter3SubsystemInputEnergyBalance({
        subsystemOutputKWh: 1,
        subsystemLossKWh: 1,
        auxiliaryEnergyKWh: 1,
        auxiliaryRecoveredFraction: 1.2,
        lossRecoveredFraction: 0
      }),
    /auxiliaryRecoveredFraction must be between 0 and 1/
  );
});
