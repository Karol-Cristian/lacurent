import assert from "node:assert/strict";
import {
  AHU_LOCATION,
  EXTRACT_FAN_POSITION,
  calculateAhuRecoverableGenerationLoss,
  calculateChapter3CoolingAuxiliaryEnergyTotal,
  calculateChapter3CoolingGeneratorInputEnergy,
  calculateChapter3HeatingAuxiliaryEnergyTotal,
  calculateChapter3HeatingGeneratorInputEnergy,
  calculateChapter3SubsystemInputEnergy,
  calculateExtractAirTemperatureForRecovery
} from "../mc001Chapter3SystemEnergy.mjs";

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

test("calculates Chapter 3 generator input balances with explicit subsystem losses", () => {
  const heating = calculateChapter3HeatingGeneratorInputEnergy({
    usefulHeatingDemandKWh: 1200,
    emissionLossKWh: 12,
    distributionLossKWh: 48,
    storageLossKWh: 5,
    generationLossKWh: 35
  });
  const cooling = calculateChapter3CoolingGeneratorInputEnergy({
    usefulCoolingDemandKWh: 450,
    emissionLossKWh: 4,
    distributionLossKWh: 11,
    storageLossKWh: 0,
    generationLossKWh: 21
  });

  assert.equal(heating.formulaId, "MC001_3_183_HEATING_GENERATOR_INPUT_ENERGY");
  assert.equal(cooling.formulaId, "MC001_3_184_COOLING_GENERATOR_INPUT_ENERGY");
  assert.equal(heating.unit, "kWh");
  assert.equal(cooling.unit, "kWh");
  assert.equal(heating.valueKWh, 1300);
  assert.equal(cooling.valueKWh, 486);
});

test("calculates Chapter 3 auxiliary energy totals for heating and cooling", () => {
  const heating = calculateChapter3HeatingAuxiliaryEnergyTotal({
    emissionAuxiliaryKWh: 4,
    distributionAuxiliaryKWh: 18,
    storageAuxiliaryKWh: 2,
    generationAuxiliaryKWh: 9
  });
  const cooling = calculateChapter3CoolingAuxiliaryEnergyTotal({
    emissionAuxiliaryKWh: 3,
    distributionAuxiliaryKWh: 12,
    storageAuxiliaryKWh: 1,
    generationAuxiliaryKWh: 14
  });

  assert.equal(heating.formulaId, "MC001_3_185_TOTAL_HEATING_AUXILIARY_ENERGY");
  assert.equal(cooling.formulaId, "MC001_3_186_TOTAL_COOLING_AUXILIARY_ENERGY");
  assert.equal(heating.valueKWh, 33);
  assert.equal(cooling.valueKWh, 30);
});

test("calculates generic subsystem input energy without defaulted recovered loss", () => {
  const result = calculateChapter3SubsystemInputEnergy({
    subsystemId: "C.dis",
    subsystemOutputKWh: 500,
    subsystemLossKWh: 25,
    recoveredLossKWh: 7
  });

  assert.equal(result.formulaId, "MC001_3_GENERIC_SUBSYSTEM_ENERGY_BALANCE");
  assert.equal(result.valueKWh, 518);
  assert.deepEqual(result.inputs, {
    subsystemId: "C.dis",
    subsystemOutputKWh: 500,
    subsystemLossKWh: 25,
    recoveredLossKWh: 7
  });
});

test("calculates recoverable AHU generation losses for conditioned and unconditioned locations", () => {
  const conditioned = calculateAhuRecoverableGenerationLoss({
    ahuGenerationLossKWh: 42.5,
    ahuLocation: AHU_LOCATION.CONDITIONED
  });
  const unconditioned = calculateAhuRecoverableGenerationLoss({
    ahuGenerationLossKWh: 42.5,
    ahuLocation: AHU_LOCATION.UNCONDITIONED
  });

  assert.equal(
    conditioned.formulaId,
    "MC001_3_49_3_50_AHU_RECOVERABLE_GENERATION_LOSSES"
  );
  assert.equal(conditioned.valueKWh, 42.5);
  assert.equal(unconditioned.valueKWh, 0);
});

test("calculates extract-air temperature branch for upstream and downstream extract fan", () => {
  const upstream = calculateExtractAirTemperatureForRecovery({
    extractFanPosition: EXTRACT_FAN_POSITION.UPSTREAM_OF_RECOVERY,
    extractAirTemperatureAfterDistributionC: 21.4,
    extractFanTemperatureRiseK: 1.2
  });
  const downstream = calculateExtractAirTemperatureForRecovery({
    extractFanPosition: EXTRACT_FAN_POSITION.DOWNSTREAM_OF_RECOVERY,
    extractAirTemperatureAfterDistributionC: 21.4,
    extractFanTemperatureRiseK: 1.2
  });

  assert.equal(upstream.formulaId, "MC001_3_53_EXTRACT_AIR_TEMPERATURE_UPSTREAM_FAN");
  assert.equal(downstream.formulaId, "MC001_3_54_EXTRACT_AIR_TEMPERATURE_DOWNSTREAM_FAN");
  assertCloseTo(upstream.valueC, 22.6);
  assertCloseTo(downstream.valueC, 21.4);
});

test("rejects invalid Chapter 3 system-energy inputs", () => {
  assert.throws(
    () =>
      calculateChapter3CoolingGeneratorInputEnergy({
        usefulCoolingDemandKWh: 450,
        emissionLossKWh: 4,
        distributionLossKWh: -1,
        storageLossKWh: 0,
        generationLossKWh: 21
      }),
    /distributionLossKWh must be a finite non-negative number/
  );

  assert.throws(
    () =>
      calculateAhuRecoverableGenerationLoss({
        ahuGenerationLossKWh: 1,
        ahuLocation: "unknown"
      }),
    /ahuLocation must be one of/
  );
});
