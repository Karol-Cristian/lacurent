import assert from "node:assert/strict";
import {
  AHU_LOCATION,
  COOLING_HEAT_REJECTION_REFERENCE_BRANCH,
  COOLING_HEAT_REJECTION_TEMPERATURE_SOURCE,
  COOLING_HEAT_REJECTION_WATER_CONTROL,
  EXTRACT_FAN_POSITION,
  calculateAhuRecoverableGenerationLoss,
  calculateAhuCoolingCoilRequiredEnergy,
  calculateAhuDistributionThermalLoss,
  calculateAhuGenerationLossConditioned,
  calculateAhuGenerationLossUnconditioned,
  calculateAhuDehumidificationCoolingEnergy,
  calculateAhuHeatRecoveryEnergy,
  calculateAhuHeatingCoilRequiredEnergy,
  calculateAhuHumidificationGeneratorInputEnergy,
  calculateAhuLeakageFactor,
  calculateAhuNonSteamHumidificationAuxiliaryEnergy,
  calculateAhuRecirculationAirHeatingEnergy,
  calculateAhuRecoverableDistributionLossToZone,
  calculateBalancedResidentialFanTemperatureRise,
  calculateChapter3CoolingAuxiliaryEnergyTotal,
  calculateChapter3CoolingGeneratorInputEnergy,
  calculateChapter3HeatingAuxiliaryEnergyTotal,
  calculateChapter3HeatingGeneratorInputEnergy,
  calculateChapter3SubsystemInputEnergy,
  calculateCoolingCoveredPartLoadFactor,
  calculateCoolingDistributionAuxiliaryEnergy,
  calculateCoolingDistributionInletOutdoorCompensatedTemperature,
  calculateCoolingDistributionLoss,
  calculateCoolingEerTemperatureCorrectionFactor,
  calculateCoolingExtractedEnergyLimitedByGenerator,
  calculateCoolingAbsorptionHeatInput,
  calculateCoolingAbsorptionPerformanceRatio,
  calculateCoolingCompressionEer,
  calculateCoolingCompressionElectricInput,
  calculateCoolingControlAuxiliaryEnergy,
  calculateCoolingDryHeatRejectionWaterTemperature,
  calculateCoolingGeneratorAuxiliaryTotal,
  calculateCoolingGeneratorInputByCapacityLimit,
  calculateCoolingGeneratorInputRequiredAirWater,
  calculateCoolingGeneratorInputRequiredDirectExpansion,
  calculateCoolingHeatRejectedAfterRecovery,
  calculateCoolingHeatRejectedByAbsorption,
  calculateCoolingHeatRejectedByCompression,
  calculateCoolingHeatRejectionAuxiliaryAirCooledZero,
  calculateCoolingHeatRejectionAuxiliaryEnergy,
  calculateCoolingHeatRejectionDistributionAuxiliaryAirCooledZero,
  calculateCoolingHeatRejectionDistributionAuxiliaryEnergy,
  calculateCoolingHeatRejectionPartLoadFactor,
  calculateCoolingPartLoadFactor,
  calculateCoolingRecoverableHeatByAbsorption,
  calculateCoolingRecoverableHeatByCompression,
  calculateCoolingRecoverableHeatMaximumTemperature,
  calculateCoolingRecoverableHeatTemperatureUndefined,
  calculateCoolingRecoverableHeatZero,
  calculateCoolingStorageAuxiliaryEnergy,
  calculateCoolingStorageAuxiliaryTotal,
  calculateCoolingStorageGeneratorDeltaEnergy,
  calculateCoolingStorageIceMassVariation,
  calculateCoolingStorageIceThickness,
  calculateCoolingStorageInitialIceThickness,
  calculateCoolingStorageLatentEnergy,
  calculateCoolingStorageOutputEnergy,
  calculateCoolingStoragePcmLiquidTemperature,
  calculateCoolingStoragePcmInputEnergyLimitForSolidSensibleStorage,
  calculateCoolingStoragePcmSensibleSolidStorageEnergy,
  calculateCoolingStoragePcmSolidMassDecreaseVariation,
  calculateCoolingStoragePcmSolidMassVariation,
  calculateCoolingStoragePcmSolidTemperature,
  calculateCoolingStoragePumpOperationTime,
  calculateCoolingStorageRecoverableAuxiliaryLoss,
  calculateCoolingStorageRecoverableLossTotal,
  calculateCoolingStorageRecoverableThermalLoss,
  calculateCoolingStorageSensibleLiquidEnergy,
  calculateCoolingStorageSensibleSolidEnergy,
  calculateCoolingStorageSolidMassAfterUse,
  calculateCoolingStorageThermalLoss,
  calculateCoolingStorageTransformableEnergyWater,
  calculateCoolingWaterHeatRejectionInletTemperature,
  calculateCoolingWetHeatRejectionWaterTemperature,
  calculateDuctLeakageAirFlow,
  calculateDuctLeakageFactor,
  calculateDuctLeakageFlowFromFactor,
  calculateExtractAirTemperatureForRecovery,
  calculateFanElectricEnergy,
  calculateFanEfficiencyFromNominalAndAirflowFactor,
  calculateFanEnergyAssignedToHeatRecoveryPressure,
  calculateFanTemperatureRise,
  calculateGroundPreheatPrecoolEnergy,
  calculateHumidificationPumpAuxiliaryEnergy,
  calculateLightingLeniFromSubspaces,
  calculateMaximumFlowFactorFromPartLoad,
  calculateMaximumZoneFlowFactor,
  calculateMultiZoneConstantPressureDrop,
  calculateMultiZoneMinimumPressureDrop,
  calculateNoPreheaterEnergy,
  calculateOtherHeatRecoveryAuxiliaryEnergy,
  calculatePartLoadAhuAirFlow,
  calculatePreheaterEnergy,
  calculatePumpHeatRecoveryAuxiliaryEnergy,
  calculateQuadraticPressureDrop,
  calculateRequiredExtractDistributionAirFlow,
  calculateRequiredSupplyDistributionAirFlow,
  calculateRotaryHeatRecoveryAuxiliaryEnergy,
  calculateSteamHumidificationPumpAuxiliaryEnergy,
  calculateVentilationAuxiliaryTotal,
  calculateVentilationControlAuxiliaryEnergy,
  limitCoolingStoragePcmSolidMassToExistingSolid,
  limitCoolingStoragePcmSolidMassToLiquid,
  lookupCoolingHeatRejectionElectricPartLoadFactorTable323,
  lookupCoolingHeatRejectionPolynomialCoefficientsTable320,
  lookupCoolingHeatRejectionProcessDefaultsTable318,
  lookupCoolingHeatRejectionReferenceTemperaturesTable319,
  lookupCoolingHeatRejectionSpecificElectricDemandTable322,
  selectCoolingHeatRejectionReferenceTemperatures,
  selectCoolingHeatRejectionTemperature,
  selectCoolingGeneratorOutletTemperature,
  selectCoolingPartLoadBin,
  validateCoolingStorageInputEnergy,
  allocateExtractAirFlowToZone,
  allocateSupplyAirFlowToZone
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

test("calculates AHU heating, cooling, humidification and generation-loss relations", () => {
  const heating = calculateAhuHeatingCoilRequiredEnergy({
    airDensityKgPerM3: 1.2,
    airSpecificHeatKJPerKgK: 1.006,
    supplyAirFlowM3PerH: 3000,
    requiredSupplyTemperatureC: 18,
    humidificationTemperatureRiseK: 1,
    outdoorTemperatureC: -5,
    calculationHours: 1
  });
  const recirculation = calculateAhuRecirculationAirHeatingEnergy({
    airDensityKgPerM3: 1.2,
    airSpecificHeatKJPerKgK: 1.006,
    extractAirFlowM3PerH: 2800,
    outdoorAirFraction: 0.4,
    extractTemperatureIntoRecoveryC: 20,
    outdoorTemperatureC: -5,
    calculationHours: 2
  });
  const heatRecovery = calculateAhuHeatRecoveryEnergy({
    airDensityKgPerM3: 1.2,
    airSpecificHeatKJPerKgK: 1.006,
    moistureLatentHeatKJPerKg: 2500,
    supplyAirFlowM3PerH: 3000,
    outdoorAirFraction: 0.4,
    supplyTemperatureAfterRecoveryC: 12,
    outdoorPreheatTemperatureC: -5,
    supplyHumidityAfterRecoveryKgPerKg: 0.006,
    outdoorPreheatHumidityKgPerKg: 0.004,
    calculationHours: 1
  });
  const cooling = calculateAhuCoolingCoilRequiredEnergy({
    airDensityKgPerM3: 1.2,
    airSpecificHeatKJPerKgK: 1.006,
    moistureLatentHeatKJPerKg: 2500,
    supplyAirFlowM3PerH: 3000,
    recirculatedSupplyTemperatureC: 26,
    requiredCoolingSupplyTemperatureC: 16,
    recirculatedHumidityKgPerKg: 0.011,
    requiredCoolingHumidityKgPerKg: 0.008,
    calculationHours: 1
  });
  const dehumidification = calculateAhuDehumidificationCoolingEnergy({
    airDensityKgPerM3: 1.2,
    airSpecificHeatKJPerKgK: 1.006,
    moistureLatentHeatKJPerKg: 2500,
    supplyAirFlowM3PerH: 3000,
    recirculatedSupplyTemperatureC: 26,
    ahuRequiredSupplyTemperatureC: 20,
    requiredCoolingSupplyTemperatureC: 16,
    recirculatedHumidityKgPerKg: 0.011,
    dehumidificationHumidityReductionKgPerKg: 0.001,
    requiredCoolingHumidityKgPerKg: 0.008,
    calculationHours: 1
  });
  const humidification = calculateAhuHumidificationGeneratorInputEnergy({
    airDensityKgPerM3: 1.2,
    moistureLatentHeatKJPerKg: 2500,
    supplyAirFlowM3PerH: 3000,
    targetHumidityKgPerKg: 0.007,
    sourceHumidityKgPerKg: 0.004,
    calculationHours: 1
  });
  const nonSteamAux = calculateAhuNonSteamHumidificationAuxiliaryEnergy();
  const conditionedLoss = calculateAhuGenerationLossConditioned({
    supplyAuKWPerK: 0.02,
    supplyTemperatureC: 28,
    extractAuKWPerK: 0.015,
    extractTemperatureC: 22,
    zoneTemperatureC: 20,
    supplyLeakageM3PerH: 50,
    airDensityKgPerM3: 1.2,
    airSpecificHeatKJPerKgK: 1.006,
    calculationHours: 10
  });
  const unconditionedLoss = calculateAhuGenerationLossUnconditioned({
    supplyAuKWPerK: 0.02,
    supplyTemperatureC: 28,
    extractAuKWPerK: 0.015,
    extractTemperatureC: 22,
    surroundingTemperatureC: 5,
    supplyLeakageM3PerH: 50,
    extractLeakageM3PerH: 30,
    airDensityKgPerM3: 1.2,
    airSpecificHeatKJPerKgK: 1.006,
    calculationHours: 10
  });

  assert.equal(heating.formulaId, "MC001_3_40_AHU_HEATING_COIL_REQUIRED_ENERGY");
  assert.equal(heatRecovery.formulaId, "MC001_3_41_AHU_HEAT_RECOVERY_ENERGY");
  assert.equal(recirculation.formulaId, "MC001_3_42_AHU_RECIRCULATION_AIR_HEATING_ENERGY");
  assert.equal(cooling.formulaId, "MC001_3_43_AHU_COOLING_COIL_REQUIRED_ENERGY");
  assert.equal(dehumidification.formulaId, "MC001_3_44_AHU_DEHUMIDIFICATION_COOLING_ENERGY");
  assert.equal(humidification.formulaId, "MC001_3_45_AHU_HUMIDIFICATION_GENERATOR_INPUT_ENERGY");
  assert.equal(nonSteamAux.formulaId, "MC001_3_46_AHU_NON_STEAM_HUMIDIFICATION_AUXILIARY_ENERGY");
  assert.equal(conditionedLoss.formulaId, "MC001_3_47_AHU_GENERATION_LOSS_CONDITIONED");
  assert.equal(unconditionedLoss.formulaId, "MC001_3_48_AHU_GENERATION_LOSS_UNCONDITIONED");
  assertCloseTo(heating.valueKWh, 1.2 * 1.006 * 3000 * 24 / 3600);
  assertCloseTo(
    heatRecovery.valueKWh,
    ((1.2 * 1.006 * 3000 * 0.4 * 17) + (1.2 * 2500 * 3000 * 0.4 * 0.002)) / 3600
  );
  assertCloseTo(recirculation.valueKWh, 1.2 * 1.006 * 2800 * 0.6 * 25 * 2 / 3600);
  assertCloseTo(cooling.valueKWh, ((1.2 * 1.006 * 3000 * 10) + (1.2 * 2500 * 3000 * 0.003)) / 3600);
  assertCloseTo(
    dehumidification.valueKWh,
    ((1.2 * 1.006 * 3000 * 4) + (1.2 * 2500 * 3000 * 0.002)) / 3600
  );
  assertCloseTo(humidification.valueKWh, 3000 * 1.2 * 2500 * 0.003 / 3600);
  assert.equal(nonSteamAux.valueKWh, 0);
  assertCloseTo(
    conditionedLoss.valueKWh,
    ((0.02 * 8 + 0.015 * 2) + (50 * 1.2 * 1.006 * 8 / 3600)) * 10
  );
  assertCloseTo(
    unconditionedLoss.valueKWh,
    ((0.02 * 23 + 0.015 * 17) + ((50 * 23 + 30 * 17) * 1.2 * 1.006 / 3600)) * 10
  );
});

test("calculates AHU fan, pressure, auxiliary and leakage relations 3.51 to 3.91", () => {
  const balancedRise = calculateBalancedResidentialFanTemperatureRise();
  const rise = calculateFanTemperatureRise({
    fanPressureDropPa: 500,
    fanReadinessFactor: 1.1,
    airDensityKgPerM3: 1.2,
    airSpecificHeatKWhPerKgK: 0.0002794,
    fanEfficiency: 0.6
  });
  const fanEnergy = calculateFanElectricEnergy({
    supplyAirFlowM3PerH: 3000,
    supplyPressureDropPa: 500,
    supplyFanEfficiency: 0.6,
    extractAirFlowM3PerH: 2800,
    extractPressureDropPa: 450,
    extractFanEfficiency: 0.58,
    calculationHours: 100
  });
  const fanEfficiency = calculateFanEfficiencyFromNominalAndAirflowFactor({
    nominalFanEfficiency: 0.62,
    airflowFunctionFactor: 0.9
  });
  const quadratic = calculateQuadraticPressureDrop({
    designPressureDropPa: 600,
    currentFlowM3PerH: 1500,
    nominalFlowM3PerH: 3000
  });
  const constantPressure = calculateMultiZoneConstantPressureDrop({
    designPressureDropPa: 600,
    currentFlowM3PerH: 1500,
    nominalFlowM3PerH: 3000,
    controlFactor: 0.25
  });
  const minimumPressure = calculateMultiZoneMinimumPressureDrop({
    designPressureDropPa: 600,
    currentFlowM3PerH: 1500,
    nominalFlowM3PerH: 3000,
    controlFactor: 0.25,
    maximumFlowFactor: 0.7
  });
  const ground = calculateGroundPreheatPrecoolEnergy({
    airDensityKgPerM3: 1.2,
    airSpecificHeatKJPerKgK: 1.006,
    supplyAirFlowM3PerH: 3000,
    outdoorAirFraction: 0.4,
    preheatedOutdoorTemperatureC: 2,
    outdoorTemperatureC: -8,
    calculationHours: 10
  });
  const rotary = calculateRotaryHeatRecoveryAuxiliaryEnergy({
    maxRotaryPowerKW: 0.12,
    calculationHours: 100,
    rotationRatio: 0.5
  });
  const pump = calculatePumpHeatRecoveryAuxiliaryEnergy({
    supplyAirFlowM3PerH: 3000,
    outdoorAirFraction: 0.4,
    maxPumpSpecificPowerKWhPerM3: 0.00001,
    calculationHours: 100,
    minimumPartLoadFactor: 0.2,
    recoveredHeatKWh: 50,
    maxRecoveredHeatPowerKW: 2
  });
  const other = calculateOtherHeatRecoveryAuxiliaryEnergy();
  const assignedFan = calculateFanEnergyAssignedToHeatRecoveryPressure({
    fanElectricEnergyKWh: fanEnergy.valueKWh,
    heatRecoveryDesignPressureDropPa: 120,
    supplyDesignPressureDropPa: 500,
    extractDesignPressureDropPa: 450
  });
  const preheater = calculatePreheaterEnergy({
    airDensityKgPerM3: 1.2,
    airSpecificHeatKJPerKgK: 1.006,
    supplyAirFlowM3PerH: 3000,
    outdoorAirFraction: 0.4,
    frostProtectionTemperatureC: -2,
    outdoorTemperatureC: -8,
    calculationHours: 10
  });
  const noPreheater = calculateNoPreheaterEnergy();
  const control = calculateVentilationControlAuxiliaryEnergy({
    controllerPowerKW: 0.02,
    operationFactor: 0.8,
    calculationHours: 100
  });
  const steam = calculateSteamHumidificationPumpAuxiliaryEnergy();
  const humidificationPump = calculateHumidificationPumpAuxiliaryEnergy({
    designHumidificationAirFlowM3PerH: 500,
    designSpecificPumpEnergyKWhPerM3: 0.00002,
    partLoadFactor: 0.5,
    calculationHours: 100
  });
  const auxiliaryTotal = calculateVentilationAuxiliaryTotal({
    heatRecoveryAuxiliaryKWh: rotary.valueKWh,
    preheatAuxiliaryKWh: preheater.valueKWh,
    controlAuxiliaryKWh: control.valueKWh
  });
  const ductLeak = calculateDuctLeakageFactor({
    leakageAirFlowM3PerH: 60,
    requiredAirFlowM3PerH: 1200
  });
  const ductLeakFlow = calculateDuctLeakageAirFlow({
    ductAreaM2: 20,
    leakageCoefficient: 0.00002,
    pressureDifferencePa: 100,
    exponent: 0.65
  });
  const ahuLeak = calculateAhuLeakageFactor({
    ahuLeakageAirFlowM3PerH: 40,
    distributionAirFlowM3PerH: 1200,
    ahuPressurePa: 400,
    testPressurePa: 700
  });
  const supplyReq = calculateRequiredSupplyDistributionAirFlow({
    zoneRequiredAirFlowsM3PerH: [
      { leakageFactor: 1.05, requiredAirFlowM3PerH: 500 },
      { leakageFactor: 1.02, requiredAirFlowM3PerH: 300 }
    ]
  });
  const extractReq = calculateRequiredExtractDistributionAirFlow({
    zoneRequiredAirFlowsM3PerH: [
      { leakageFactor: 1.04, requiredAirFlowM3PerH: 450 },
      { leakageFactor: 1.03, requiredAirFlowM3PerH: 350 }
    ]
  });
  const supplyZone = allocateSupplyAirFlowToZone({
    supplyDistributionAirFlowM3PerH: supplyReq.valueM3PerH,
    zoneRequiredAirFlowM3PerH: 500,
    totalRequiredAirFlowM3PerH: supplyReq.valueM3PerH
  });
  const extractZone = allocateExtractAirFlowToZone({
    extractDistributionAirFlowM3PerH: extractReq.valueM3PerH,
    zoneRequiredAirFlowM3PerH: 450,
    totalRequiredAirFlowM3PerH: extractReq.valueM3PerH
  });
  const leakageFromFactor = calculateDuctLeakageFlowFromFactor({
    leakageFactor: 1.05,
    zoneAirFlowM3PerH: 500
  });
  const maxFactor = calculateMaximumZoneFlowFactor({
    zoneFlows: [
      { currentAirFlowM3PerH: 300, designMaximumAirFlowM3PerH: 600 },
      { currentAirFlowM3PerH: 420, designMaximumAirFlowM3PerH: 600 }
    ]
  });
  const partLoadFlow = calculatePartLoadAhuAirFlow({
    partLoadFactor: 0.4,
    nominalAirFlowM3PerH: 3000
  });
  const maxFromPartLoad = calculateMaximumFlowFactorFromPartLoad({
    partLoadFactor: 0.4,
    deltaFlowFactor: 0.1
  });

  assert.equal(balancedRise.formulaId, "MC001_3_51_BALANCED_RESIDENTIAL_FAN_TEMPERATURE_RISE");
  assert.equal(rise.formulaId, "MC001_3_52_FAN_TEMPERATURE_RISE");
  assert.equal(fanEnergy.formulaId, "MC001_3_55_AHU_FAN_ELECTRIC_ENERGY");
  assert.equal(fanEfficiency.formulaId, "MC001_3_56_FAN_EFFICIENCY_FROM_AIRFLOW_FACTOR");
  assert.equal(quadratic.formulaId, "MC001_3_57_TO_3_60_QUADRATIC_PRESSURE_DROP");
  assert.equal(constantPressure.formulaId, "MC001_3_63_3_64_MULTIZONE_CONSTANT_PRESSURE_DROP");
  assert.equal(minimumPressure.formulaId, "MC001_3_65_3_66_MULTIZONE_MINIMUM_PRESSURE_DROP");
  assert.equal(ground.formulaId, "MC001_3_67_GROUND_PREHEAT_PRECOOL_ENERGY");
  assert.equal(rotary.formulaId, "MC001_3_69_ROTARY_HEAT_RECOVERY_AUXILIARY_ENERGY");
  assert.equal(pump.formulaId, "MC001_3_70_PUMP_HEAT_RECOVERY_AUXILIARY_ENERGY");
  assert.equal(other.formulaId, "MC001_3_71_OTHER_HEAT_RECOVERY_AUXILIARY_ENERGY");
  assert.equal(assignedFan.formulaId, "MC001_3_72_FAN_ENERGY_ASSIGNED_TO_HEAT_RECOVERY_PRESSURE");
  assert.equal(preheater.formulaId, "MC001_3_73_PREHEATER_ENERGY");
  assert.equal(noPreheater.formulaId, "MC001_3_74_NO_PREHEATER_ENERGY");
  assert.equal(control.formulaId, "MC001_3_75_VENTILATION_CONTROL_AUXILIARY_ENERGY");
  assert.equal(steam.formulaId, "MC001_3_76_STEAM_HUMIDIFICATION_PUMP_AUXILIARY_ENERGY");
  assert.equal(humidificationPump.formulaId, "MC001_3_77_HUMIDIFICATION_PUMP_AUXILIARY_ENERGY");
  assert.equal(auxiliaryTotal.formulaId, "MC001_3_68_VENTILATION_AUXILIARY_TOTAL");
  assert.equal(ductLeak.formulaId, "MC001_3_78_DUCT_LEAKAGE_FACTOR");
  assert.equal(ductLeakFlow.formulaId, "MC001_3_79_DUCT_LEAKAGE_AIR_FLOW");
  assert.equal(ahuLeak.formulaId, "MC001_3_80_AHU_LEAKAGE_FACTOR");
  assert.equal(supplyReq.formulaId, "MC001_3_81_REQUIRED_SUPPLY_DISTRIBUTION_AIR_FLOW");
  assert.equal(extractReq.formulaId, "MC001_3_82_REQUIRED_EXTRACT_DISTRIBUTION_AIR_FLOW");
  assert.equal(supplyZone.formulaId, "MC001_3_83_SUPPLY_AIR_FLOW_ZONE_ALLOCATION");
  assert.equal(extractZone.formulaId, "MC001_3_84_EXTRACT_AIR_FLOW_ZONE_ALLOCATION");
  assert.equal(leakageFromFactor.formulaId, "MC001_3_85_TO_3_87_DUCT_LEAKAGE_FLOW_FROM_FACTOR");
  assert.equal(maxFactor.formulaId, "MC001_3_88_MAXIMUM_ZONE_FLOW_FACTOR");
  assert.equal(partLoadFlow.formulaId, "MC001_3_89_3_90_PART_LOAD_AHU_AIR_FLOW");
  assert.equal(maxFromPartLoad.formulaId, "MC001_3_91_MAXIMUM_FLOW_FACTOR_FROM_PART_LOAD");
  assert.equal(balancedRise.valueK, 0);
  assertCloseTo(rise.valueK, 500 * 1.1 / (1.2 * 0.0002794 * 0.6 * 3.6 * 10 ** 6));
  assertCloseTo(fanEnergy.valueKWh, (3000 * 500 / 0.6 + 2800 * 450 / 0.58) * 100 / (3.6 * 10 ** 6));
  assertCloseTo(fanEfficiency.value, 0.62 * 0.9);
  assertCloseTo(quadratic.valuePa, 600 * 0.5 ** 2);
  assertCloseTo(constantPressure.valuePa, 600 * (0.75 * 0.25 + 0.25));
  assertCloseTo(minimumPressure.valuePa, 600 * (0.75 * 0.25 + 0.25 * 0.7 ** 2));
  assertCloseTo(ground.valueKWh, 1.2 * 1.006 * 3000 * 0.4 * 10 * 10 / 3600);
  assertCloseTo(rotary.valueKWh, 0.12 * 100 * 0.5);
  assertCloseTo(pump.partLoad, Math.max(0.2, 50 / (100 * 2)));
  assert.equal(other.valueKWh, 0);
  assertCloseTo(assignedFan.valueKWh, fanEnergy.valueKWh * 120 / 950);
  assertCloseTo(preheater.valueKWh, 1.2 * 1.006 * 3000 * 0.4 * 6 * 10 / 3600);
  assert.equal(noPreheater.valueKWh, 0);
  assertCloseTo(control.valueKWh, 0.02 * 0.8 * 100);
  assert.equal(steam.valueKWh, 0);
  assertCloseTo(humidificationPump.valueKWh, 500 * 0.00002 * 0.5 * 100);
  assertCloseTo(auxiliaryTotal.valueKWh, rotary.valueKWh + preheater.valueKWh + control.valueKWh);
  assertCloseTo(ductLeak.value, 1.05);
  assertCloseTo(ductLeakFlow.valueM3PerH, 20 * 0.00002 * 100 ** 0.65 * 3600);
  assertCloseTo(ahuLeak.value, 1 + (40 / 1200) * (400 / 700) ** 0.65);
  assertCloseTo(supplyReq.valueM3PerH, 1.05 * 500 + 1.02 * 300);
  assertCloseTo(extractReq.valueM3PerH, -(1.04 * 450 + 1.03 * 350));
  assertCloseTo(supplyZone.valueM3PerH, 500);
  assertCloseTo(extractZone.valueM3PerH, -450);
  assertCloseTo(leakageFromFactor.valueM3PerH, 0.05 * 500);
  assertCloseTo(maxFactor.value, 0.7);
  assertCloseTo(partLoadFlow.valueM3PerH, 1200);
  assertCloseTo(maxFromPartLoad.value, 0.5);
});

test("calculates AHU distribution thermal-loss relations 3.92 and 3.93", () => {
  const distributionLoss = calculateAhuDistributionThermalLoss({
    airDensityKgPerM3: 1.2,
    airSpecificHeatKJPerKgK: 1.006,
    supplyDistributionAirFlowM3PerH: 1200,
    supplyDuctUnconditionedTemperatureDifferenceK: 3,
    supplyDuctConditionedTemperatureDifferencesK: [1.2, 0.8],
    extractDistributionAirFlowM3PerH: 900,
    extractDuctTemperatureDifferenceK: 1.5,
    supplyLeakageZoneTerms: [
      { leakageAirFlowM3PerH: 50, zoneIndoorTemperatureC: 19 },
      { leakageAirFlowM3PerH: 30, zoneIndoorTemperatureC: 20 }
    ],
    unconditionedLeakageAirFlowM3PerH: 40,
    supplyDistributionInletTemperatureC: 16,
    unconditionedSurroundingTemperatureC: 24,
    calculationHours: 10
  });
  const recoverableToZone = calculateAhuRecoverableDistributionLossToZone({
    airDensityKgPerM3: 1.2,
    airSpecificHeatKJPerKgK: 1.006,
    zoneSupplyAirFlowM3PerH: 500,
    conditionedSupplyDuctTemperatureDifferenceK: 2.2,
    zoneSupplyLeakageAirFlowM3PerH: 25,
    supplyDistributionInletTemperatureC: 16,
    zoneIndoorTemperatureC: 20,
    calculationHours: 10
  });

  assert.equal(distributionLoss.formulaId, "MC001_3_92_AHU_DISTRIBUTION_THERMAL_LOSS");
  assert.equal(
    recoverableToZone.formulaId,
    "MC001_3_93_AHU_DISTRIBUTION_RECOVERABLE_LOSS_TO_ZONE"
  );
  assertCloseTo(
    distributionLoss.valueKWh,
    1.2 * 1.006 * (1200 * 5 + 900 * 1.5 + 50 * -3 + 30 * -4 + 40 * -8) * 10 / 3600
  );
  assertCloseTo(
    recoverableToZone.valueKWh,
    1.2 * 1.006 * (500 * 2.2 + 25 * -4) * 10 / 3600
  );
  assert.equal(distributionLoss.airflowTemperatureSum, 6760);
  assert.equal(recoverableToZone.airflowTemperatureSum, 1000);
});

test("calculates cooling-system branch, distribution, generator and LENI relations", () => {
  const selected = selectCoolingGeneratorOutletTemperature({
    branch: "direct_expansion_air_distribution",
    thetaSupplyCoolingRequiredC: 16
  });
  const compensated = calculateCoolingDistributionInletOutdoorCompensatedTemperature({
    setpointMinC: 7,
    setpointMaxC: 18,
    compensationSlope: -0.3,
    outdoorTemperatureC: 30,
    offsetK: 22
  });
  const distributionLoss = calculateCoolingDistributionLoss({
    coolingLossFactor: 0.05,
    usefulCoolingDemandKWh: 100,
    emissionLossKWh: 5,
    ahuCoolingOutputRequiredKWh: 20
  });
  const distributionAux = calculateCoolingDistributionAuxiliaryEnergy({
    auxiliaryFactor: 0.02,
    usefulCoolingDemandKWh: 100,
    emissionLossKWh: 5,
    ahuCoolingOutputRequiredKWh: 20
  });
  const dx = calculateCoolingGeneratorInputRequiredDirectExpansion({
    usefulCoolingDemandKWh: 100,
    emissionLossKWh: 5,
    ahuCoolingOutputRequiredKWh: 20
  });
  const airWater = calculateCoolingGeneratorInputRequiredAirWater({
    usefulCoolingDemandKWh: 100,
    emissionLossKWh: 5,
    ahuCoolingOutputRequiredKWh: 20,
    distributionLossKWh: distributionLoss.valueKWh,
    auxiliaryDistributionEnergyKWh: distributionAux.valueKWh,
    auxiliaryHeatFraction: 1
  });
  const limited = calculateCoolingExtractedEnergyLimitedByGenerator({
    requiredEnergyKWh: 100,
    generatorInputRequiredKWh: 200,
    generatorInputAvailableKWh: 150
  });
  const partLoad = calculateCoolingPartLoadFactor({
    generatorInputRequiredKWh: 120,
    operationHours: 100,
    nominalCoolingPowerKW: 2
  });
  const bin = selectCoolingPartLoadBin({
    partLoadFactor: partLoad.value
  });
  const tinyBin = selectCoolingPartLoadBin({
    partLoadFactor: 0.03
  });
  const within = calculateCoolingGeneratorInputByCapacityLimit({
    generatorInputRequiredKWh: 120,
    operationHours: 100,
    nominalCoolingPowerKW: 2
  });
  const limitedCapacity = calculateCoolingGeneratorInputByCapacityLimit({
    generatorInputRequiredKWh: 250,
    operationHours: 100,
    nominalCoolingPowerKW: 2
  });
  const covered = calculateCoolingCoveredPartLoadFactor({
    generatorInputKWh: limitedCapacity.valueKWh,
    generatorInputRequiredKWh: 250
  });
  const eer = calculateCoolingEerTemperatureCorrectionFactor({
    absoluteZeroOffsetK: 273.15,
    generatorRequiredOutletTemperatureC: 7,
    heatRejectionReferenceInletTemperatureC: 35,
    nominalGeneratorOutletTemperatureC: 7,
    nominalHeatRejectionInletTemperatureC: 35,
    evaporatorTemperatureDifferenceK: 5,
    condenserTemperatureDifferenceK: 5
  });
  const leni = calculateLightingLeniFromSubspaces({
    totalAreaM2: 150,
    subspaces: [
      { leniKWhPerM2Year: 12, areaM2: 100 },
      { leniKWhPerM2Year: 18, areaM2: 50 }
    ]
  });

  assert.equal(selected.formulaId, "MC001_3_137_COOLING_GENERATOR_OUTLET_TEMPERATURE_DIRECT_EXPANSION_AIR");
  assert.equal(compensated.formulaId, "MC001_3_141_COOLING_DISTRIBUTION_INLET_OUTDOOR_COMPENSATED");
  assert.equal(distributionLoss.formulaId, "MC001_3_146_COOLING_DISTRIBUTION_LOSS");
  assert.equal(distributionAux.formulaId, "MC001_3_147_COOLING_DISTRIBUTION_AUXILIARY_ENERGY");
  assert.equal(dx.formulaId, "MC001_3_144_COOLING_GENERATOR_INPUT_REQUIRED_DIRECT_EXPANSION");
  assert.equal(airWater.formulaId, "MC001_3_145_COOLING_GENERATOR_INPUT_REQUIRED_AIR_WATER");
  assert.equal(limited.formulaId, "MC001_3_142_3_143_COOLING_EXTRACTED_LIMITED_BY_GENERATOR");
  assert.equal(partLoad.formulaId, "MC001_3_149_COOLING_PART_LOAD_FACTOR");
  assert.equal(bin.formulaId, "MC001_3_150_COOLING_PART_LOAD_BIN");
  assert.equal(tinyBin.formulaId, "MC001_3_151_COOLING_PART_LOAD_BIN_BELOW_005");
  assert.equal(within.formulaId, "MC001_3_152_COOLING_GENERATOR_INPUT_WITHIN_CAPACITY");
  assert.equal(limitedCapacity.formulaId, "MC001_3_153_COOLING_GENERATOR_INPUT_CAPACITY_LIMIT");
  assert.equal(covered.formulaId, "MC001_3_154_COOLING_COVERED_PART_LOAD_FACTOR");
  assert.equal(eer.formulaId, "MC001_3_155_COOLING_EER_TEMPERATURE_CORRECTION");
  assert.equal(leni.formulaId, "MC001_3_4_34_LIGHTING_LENI_WEIGHTED_BUILDING");
  assert.equal(selected.valueC, 16);
  assert.equal(compensated.valueC, 13);
  assertCloseTo(distributionLoss.valueKWh, 0.05 * 125);
  assertCloseTo(distributionAux.valueKWh, 0.02 * 125);
  assertCloseTo(dx.valueKWh, 125);
  assertCloseTo(airWater.valueKWh, 125 + 6.25 + 2.5);
  assertCloseTo(limited.valueKWh, 75);
  assertCloseTo(partLoad.value, 0.6);
  assertCloseTo(bin.value, 0.6);
  assert.equal(tinyBin.value, 1);
  assertCloseTo(within.valueKWh, 120);
  assertCloseTo(limitedCapacity.valueKWh, 200);
  assertCloseTo(covered.value, 0.8);
  assertCloseTo(eer.value, 1);
  assertCloseTo(leni.valueKWhPerM2Year, (12 * 100 + 18 * 50) / 150);
});

test("calculates MC001 cooling-storage relations 3.94-3.123 with explicit storage inputs", () => {
  const inputBoundary = validateCoolingStorageInputEnergy({ storageInputKWh: 48.29 });
  const sensibleLiquid = calculateCoolingStorageSensibleLiquidEnergy({
    liquidMassKg: 100,
    liquidSpecificHeatKWhPerKgK: 0.00116,
    generatorRequiredOutletTemperatureC: 6,
    storageTemperatureC: 2
  });
  const latent = calculateCoolingStorageLatentEnergy({
    latentHeatKWhPerKg: 0.092,
    solidMassKg: 50
  });
  const sensibleSolid = calculateCoolingStorageSensibleSolidEnergy({
    solidMassKg: 50,
    solidSpecificHeatKWhPerKgK: 0.00058,
    transitionTemperatureC: 0,
    generatorOutletFlowTemperatureC: -4
  });
  const output = calculateCoolingStorageOutputEnergy({
    sensibleLiquidEnergyKWh: sensibleLiquid.valueKWh,
    latentEnergyKWh: latent.valueKWh,
    sensibleSolidEnergyKWh: sensibleSolid.valueKWh,
    distributionInputRequiredKWh: 6,
    storageGeneratorOutputKWh: 1
  });
  const outputLoss = calculateCoolingStorageThermalLoss({
    heatLossCoefficientKWPerK: 0.02,
    ambientTemperatureC: 25,
    storageTemperatureC: 7,
    calculationHours: 10,
    formulaId: "MC001_3_99_COOLING_STORAGE_OUTPUT_SIDE_LOSS",
    branch: "output"
  });
  const inputLoss = calculateCoolingStorageThermalLoss({
    heatLossCoefficientKWPerK: 0.01,
    ambientTemperatureC: 25,
    storageTemperatureC: 8,
    calculationHours: 10,
    formulaId: "MC001_3_100_COOLING_STORAGE_INPUT_SIDE_LOSS",
    branch: "input"
  });
  const standbyLoss = calculateCoolingStorageThermalLoss({
    heatLossCoefficientKWPerK: 0.005,
    ambientTemperatureC: 25,
    storageTemperatureC: 5,
    calculationHours: 10,
    formulaId: "MC001_3_101_COOLING_STORAGE_STANDBY_LOSS",
    branch: "standby"
  });
  const transformable = calculateCoolingStorageTransformableEnergyWater({
    storageInputKWh: 10,
    storageInputLossKWh: 0.2,
    storageStandbyLossKWh: 0.3,
    storageOutputSideLossKWh: 0.4
  });
  const initialThickness = calculateCoolingStorageInitialIceThickness({
    solidMassKg: 50,
    solidDensityKgPerM3: 900,
    storagePipeLengthM: 100,
    storagePipeDiameterM: 0.02
  });
  const iceMassVariation = calculateCoolingStorageIceMassVariation({
    transformableEnergyKWh: 0.76,
    latentHeatKWhPerKg: 0.092,
    solidSpecificHeatKWhPerKgK: 0.00058,
    transitionTemperatureC: 0,
    generatorOutletFlowTemperatureC: -4
  });
  const iceThickness = calculateCoolingStorageIceThickness({
    maximumIceThicknessM: 0.02,
    storagePipeDiameterM: 0.02,
    solidMassKg: 50,
    deltaSolidMassKg: -7,
    solidDensityKgPerM3: 900,
    storagePipeLengthM: 100
  });
  const solidMass = calculateCoolingStorageSolidMassAfterUse({
    initialSolidMassKg: 50,
    deltaSolidMassKg: -7
  });
  const pcmVariation = calculateCoolingStoragePcmSolidMassVariation({
    transformableEnergyKWh: 0.5,
    latentHeatKWhPerKg: 0.0271,
    solidSpecificHeatKWhPerKgK: 0.000392,
    transitionTemperatureC: 20
  });
  const pcmSensiblePositive = calculateCoolingStoragePcmSensibleSolidStorageEnergy({
    transformableEnergyKWh: 1.5,
    solidMassKg: 40,
    solidSpecificHeatKWhPerKgK: 0.001,
    generatorOutletFlowTemperatureC: 5,
    transitionTemperatureC: 0
  });
  const pcmSensibleNegative = calculateCoolingStoragePcmSensibleSolidStorageEnergy({
    transformableEnergyKWh: 0.1,
    solidMassKg: 40,
    solidSpecificHeatKWhPerKgK: 0.001,
    generatorOutletFlowTemperatureC: 5,
    transitionTemperatureC: 0
  });
  const pcmInputLimit = calculateCoolingStoragePcmInputEnergyLimitForSolidSensibleStorage({
    solidMassKg: 40,
    solidSpecificHeatKWhPerKgK: 0.001,
    generatorOutletFlowDeltaK: 5
  });
  const pcmDecrease = calculateCoolingStoragePcmSolidMassDecreaseVariation({
    transformableEnergyKWh: -0.5,
    latentHeatKWhPerKg: 0.0271,
    solidSpecificHeatKWhPerKgK: 0.000392,
    transitionTemperatureC: 20,
    initialSolidMassKg: 20
  });
  const pcmDecreaseLimited = calculateCoolingStoragePcmSolidMassDecreaseVariation({
    transformableEnergyKWh: -2,
    latentHeatKWhPerKg: 0.0271,
    solidSpecificHeatKWhPerKgK: 0.000392,
    transitionTemperatureC: 20,
    initialSolidMassKg: 20
  });
  const pcmDecreaseZero = calculateCoolingStoragePcmSolidMassDecreaseVariation({
    transformableEnergyKWh: 0,
    latentHeatKWhPerKg: 0.0271,
    solidSpecificHeatKWhPerKgK: 0.000392,
    transitionTemperatureC: 20,
    initialSolidMassKg: 20
  });
  const pcmMassAfterDecrease = calculateCoolingStorageSolidMassAfterUse({
    initialSolidMassKg: 20,
    deltaSolidMassKg: pcmDecrease.valueKg
  });
  const limitedLiquid = limitCoolingStoragePcmSolidMassToLiquid({
    deltaSolidMassKg: 60,
    initialLiquidMassKg: 50
  });
  const limitedSolid = limitCoolingStoragePcmSolidMassToExistingSolid({
    deltaSolidMassKg: 60,
    initialSolidMassKg: 42
  });
  const solidTemperature = calculateCoolingStoragePcmSolidTemperature({
    initialSolidTemperatureC: -2,
    transformableEnergyKWh: 0.2,
    solidSpecificHeatKWhPerKgK: 0.001,
    deltaSolidMassKg: 5,
    transitionTemperatureC: 0,
    solidMassKg: 40,
    generatorOutletFlowTemperatureC: -6
  });
  const liquidTemperature = calculateCoolingStoragePcmLiquidTemperature({
    initialLiquidTemperatureC: 2,
    transformableEnergyKWh: 0.2,
    solidSpecificHeatKWhPerKgK: 0.001,
    deltaSolidMassKg: 5,
    transitionTemperatureC: 0,
    liquidSpecificHeatKWhPerKgK: 0.00116,
    initialLiquidMassKg: 45
  });
  const pumpTime = calculateCoolingStoragePumpOperationTime({
    storageEnergyKWh: 1.2,
    mediumSpecificHeatKWhPerKgK: 0.00116,
    mediumDensityKgPerM3: 1000,
    pumpVolumeFlowM3PerH: 2,
    supplyTemperatureC: 12,
    returnTemperatureC: 7
  });
  const pumpAux = calculateCoolingStorageAuxiliaryEnergy({
    pumpOperationHours: pumpTime.valueH,
    pumpElectricPowerKW: 0.4
  });
  const auxTotal = calculateCoolingStorageAuxiliaryTotal({
    outputSideAuxiliaryKWh: 0.3,
    inputSideAuxiliaryKWh: 0.2
  });
  const auxRecoverable = calculateCoolingStorageRecoverableAuxiliaryLoss({
    auxiliaryEnergyKWh: 0.5,
    recoverableAuxiliaryFraction: 0.4
  });
  const thermalRecoverable = calculateCoolingStorageRecoverableThermalLoss({
    outputSideLossKWh: outputLoss.valueKWh,
    standbyLossKWh: standbyLoss.valueKWh,
    inputSideLossKWh: inputLoss.valueKWh,
    recoverableStorageFraction: 0.5
  });
  const recoverableTotal = calculateCoolingStorageRecoverableLossTotal({
    auxiliaryRecoverableLossKWh: auxRecoverable.valueKWh,
    thermalRecoverableLossKWh: thermalRecoverable.valueKWh
  });
  const generatorDelta = calculateCoolingStorageGeneratorDeltaEnergy({
    storageGeneratorEnergyKWh: 48.29,
    storageOutputKWh: 48.0,
    inputSideLossKWh: 0.02,
    standbyLossKWh: 0.09,
    outputSideLossKWh: 0.1
  });

  assert.equal(inputBoundary.formulaId, "MC001_3_94_COOLING_STORAGE_INPUT_EXPLICIT_BOUNDARY");
  assert.equal(sensibleLiquid.formulaId, "MC001_3_95_COOLING_STORAGE_SENSIBLE_LIQUID_ENERGY");
  assert.equal(latent.formulaId, "MC001_3_96_COOLING_STORAGE_LATENT_ENERGY");
  assert.equal(sensibleSolid.formulaId, "MC001_3_97_COOLING_STORAGE_SENSIBLE_SOLID_ENERGY");
  assert.equal(output.formulaId, "MC001_3_98_COOLING_STORAGE_OUTPUT_ENERGY");
  assert.equal(transformable.formulaId, "MC001_3_102_COOLING_STORAGE_TRANSFORMABLE_ENERGY_WATER");
  assert.equal(initialThickness.formulaId, "MC001_3_103_COOLING_STORAGE_INITIAL_ICE_THICKNESS");
  assert.equal(iceMassVariation.formulaId, "MC001_3_104_COOLING_STORAGE_ICE_MASS_VARIATION");
  assert.equal(iceThickness.formulaId, "MC001_3_105_COOLING_STORAGE_ICE_THICKNESS");
  assert.equal(solidMass.formulaId, "MC001_3_106_COOLING_STORAGE_SOLID_MASS_AFTER_USE");
  assert.equal(pcmVariation.formulaId, "MC001_3_107_COOLING_STORAGE_PCM_SOLID_MASS_VARIATION");
  assert.equal(limitedLiquid.formulaId, "MC001_3_108_COOLING_STORAGE_PCM_SOLID_MASS_LIQUID_LIMIT");
  assert.equal(limitedSolid.formulaId, "MC001_3_109_COOLING_STORAGE_PCM_SOLID_MASS_SOLID_LIMIT");
  assert.equal(solidTemperature.formulaId, "MC001_3_110_COOLING_STORAGE_PCM_SOLID_TEMPERATURE");
  assert.equal(
    pcmSensiblePositive.formulaId,
    "MC001_3_111_COOLING_STORAGE_PCM_SENSIBLE_SOLID_STORAGE_ENERGY"
  );
  assert.equal(pcmInputLimit.formulaId, "MC001_3_112_COOLING_STORAGE_PCM_INPUT_ENERGY_LIMIT");
  assert.equal(
    pcmDecrease.formulaId,
    "MC001_3_113_COOLING_STORAGE_PCM_SOLID_MASS_DECREASE_VARIATION"
  );
  assert.equal(liquidTemperature.formulaId, "MC001_3_114_COOLING_STORAGE_PCM_LIQUID_TEMPERATURE");
  assert.equal(pumpTime.formulaId, "MC001_3_115_3_117_COOLING_STORAGE_PUMP_OPERATION_TIME");
  assert.equal(pumpAux.formulaId, "MC001_3_116_3_118_COOLING_STORAGE_AUXILIARY_ENERGY");
  assert.equal(auxTotal.formulaId, "MC001_3_119_COOLING_STORAGE_AUXILIARY_TOTAL");
  assert.equal(auxRecoverable.formulaId, "MC001_3_120_COOLING_STORAGE_RECOVERABLE_AUXILIARY_LOSS");
  assert.equal(thermalRecoverable.formulaId, "MC001_3_121_COOLING_STORAGE_RECOVERABLE_THERMAL_LOSS");
  assert.equal(recoverableTotal.formulaId, "MC001_3_122_COOLING_STORAGE_RECOVERABLE_LOSS_TOTAL");
  assert.equal(generatorDelta.formulaId, "MC001_3_123_COOLING_STORAGE_GENERATOR_DELTA_ENERGY");
  assertCloseTo(sensibleLiquid.valueKWh, 0.464);
  assertCloseTo(latent.valueKWh, 4.6);
  assertCloseTo(sensibleSolid.valueKWh, 0.058);
  assertCloseTo(output.valueKWh, 5);
  assertCloseTo(outputLoss.valueKWh, 3.6);
  assertCloseTo(inputLoss.valueKWh, 1.7);
  assertCloseTo(standbyLoss.valueKWh, 1);
  assertCloseTo(transformable.valueKWh, 10.9);
  assertCloseTo(initialThickness.valueM, 0.013276948517414362);
  assertCloseTo(iceMassVariation.valueKg, -8.158007728638902);
  assertCloseTo(iceThickness.valueM, 0.011754142411067498);
  assert.equal(solidMass.valueKg, 43);
  assertCloseTo(pcmVariation.valueKg, 14.310246136233543);
  assertCloseTo(pcmSensiblePositive.valueKWh, 1.3);
  assertCloseTo(pcmSensibleNegative.valueKWh, -0.1);
  assert.deepEqual(pcmSensibleNegative.warnings, ["mc001_3_112_input_energy_limit_required"]);
  assertCloseTo(pcmInputLimit.valueKWh, 0.2);
  assertCloseTo(pcmDecrease.valueKg, -14.310246136233543);
  assert.equal(pcmDecrease.limitedByInitialSolidMass, false);
  assert.equal(pcmDecrease.unit, "kg");
  assert.equal(pcmDecreaseLimited.valueKg, -20);
  assert.equal(pcmDecreaseLimited.limitedByInitialSolidMass, true);
  assert.deepEqual(pcmDecreaseLimited.warnings, ["mc001_3_113_limited_to_initial_solid_mass"]);
  assert.equal(pcmDecreaseZero.valueKg, 0);
  assertCloseTo(pcmMassAfterDecrease.valueKg, 5.689753863766457);
  assert.throws(
    () =>
      calculateCoolingStoragePcmSolidMassDecreaseVariation({
        transformableEnergyKWh: 0.1,
        latentHeatKWhPerKg: 0.0271,
        solidSpecificHeatKWhPerKgK: 0.000392,
        transitionTemperatureC: 20,
        initialSolidMassKg: 20
      }),
    /non-positive/
  );
  assert.equal(limitedLiquid.valueKg, 50);
  assert.equal(limitedSolid.valueKg, 42);
  assertCloseTo(solidTemperature.valueC, 2.2222222222222223);
  assertCloseTo(liquidTemperature.valueC, 5.620689655172415);
  assertCloseTo(pumpTime.valueH, 0.10344827586206896);
  assertCloseTo(pumpAux.valueKWh, 0.041379310344827586);
  assert.equal(auxTotal.valueKWh, 0.5);
  assert.equal(auxRecoverable.valueKWh, -0.2);
  assertCloseTo(thermalRecoverable.valueKWh, -3.15);
  assertCloseTo(recoverableTotal.valueKWh, -3.35);
  assertCloseTo(generatorDelta.valueKWh, 0.08);
});

test("calculates MC001 cooling heat-rejection and generator relations 3.156-3.182", () => {
  const referenceOutdoor = selectCoolingHeatRejectionReferenceTemperatures({
    branch: COOLING_HEAT_REJECTION_REFERENCE_BRANCH.AIR_OUTDOOR,
    outdoorReferenceTemperatureC: 32,
    outdoorNominalTemperatureC: 35
  });
  const referenceIndoor = selectCoolingHeatRejectionReferenceTemperatures({
    branch: COOLING_HEAT_REJECTION_REFERENCE_BRANCH.AIR_INDOOR,
    indoorReferenceTemperatureC: 26,
    indoorNominalTemperatureC: 27
  });
  const referenceWater = selectCoolingHeatRejectionReferenceTemperatures({
    branch: COOLING_HEAT_REJECTION_REFERENCE_BRANCH.WATER,
    waterReferenceInletTemperatureC: 33,
    waterNominalInletTemperatureC: 30
  });
  const processDefaults = lookupCoolingHeatRejectionProcessDefaultsTable318({
    processKey: "water_cooled_chiller"
  });
  const table319 = lookupCoolingHeatRejectionReferenceTemperaturesTable319({
    systemKey: "water_cooled_wet_33_27"
  });
  const table320 = lookupCoolingHeatRejectionPolynomialCoefficientsTable320({
    systemKey: "air_cooled_control_piston_or_scroll"
  });
  const partLoad = calculateCoolingHeatRejectionPartLoadFactor({
    temperatureC: 25,
    a2: table320.a2,
    a1: table320.a1,
    a0: table320.a0
  });
  const thetaOutdoor = selectCoolingHeatRejectionTemperature({
    source: COOLING_HEAT_REJECTION_TEMPERATURE_SOURCE.OUTDOOR_AIR,
    outdoorTemperatureC: 31
  });
  const zeroRecoverable = calculateCoolingRecoverableHeatZero();
  const undefinedTemperature = calculateCoolingRecoverableHeatTemperatureUndefined();
  const rejectedCompression = calculateCoolingHeatRejectedByCompression({
    generatorCoolingInputKWh: 100,
    nominalEer: 3,
    partLoadFactor: 0.9,
    eerCorrectionFactor: 1
  });
  const rejectedAbsorption = calculateCoolingHeatRejectedByAbsorption({
    generatorCoolingInputKWh: 100,
    nominalHeatRatio: 0.7,
    partLoadFactor: 0.9
  });
  const waterInlet = calculateCoolingWaterHeatRejectionInletTemperature({
    controlMode: COOLING_HEAT_REJECTION_WATER_CONTROL.VARIABLE_TEMPERATURE,
    heatRejectionOutletTemperatureC: 27,
    heatRejectedKWh: 130,
    operationHours: 10,
    nominalHeatRejectionPowerKW: 20,
    referenceInletTemperatureC: 33,
    referenceOutletTemperatureC: 27,
    inletTemperatureLowerLimitC: 25
  });
  const wetWater = calculateCoolingWetHeatRejectionWaterTemperature({
    heatRejectionOutletTemperatureC: 27,
    heatRejectionInletTemperatureC: 31,
    outdoorWetBulbTemperatureC: 21,
    evaporationTemperatureRatio: 0.7
  });
  const dryWater = calculateCoolingDryHeatRejectionWaterTemperature({
    heatRejectionOutletTemperatureC: 32,
    heatRejectionInletTemperatureC: 36,
    outdoorAirTemperatureC: 30,
    evaporationTemperatureRatio: 0.5
  });
  const recoverableCompression = calculateCoolingRecoverableHeatByCompression({
    generatorCoolingInputKWh: 100,
    nominalEer: 3,
    partLoadFactor: 0.9,
    eerCorrectionFactor: 1
  });
  const recoverableAbsorption = calculateCoolingRecoverableHeatByAbsorption({
    generatorCoolingInputKWh: 100,
    nominalHeatRatio: 0.7,
    partLoadFactor: 0.9
  });
  const recoverableMaxTemp = calculateCoolingRecoverableHeatMaximumTemperature({
    waterHeatRejectionInletTemperatureC: 31
  });
  const rejectedAfterRecovery = calculateCoolingHeatRejectedAfterRecovery({
    recoverableHeatKWh: 137.037037037037,
    requiredRecoveredHeatKWh: 40
  });
  const compressionElectric = calculateCoolingCompressionElectricInput({
    generatorCoolingInputKWh: 100,
    partLoadValue: 0.95,
    nominalEer: 3,
    eerCorrectionFactor: 1.1
  });
  const absorptionHeat = calculateCoolingAbsorptionHeatInput({
    generatorCoolingInputKWh: 100,
    partLoadValue: 0.8,
    nominalHeatRatio: 0.7
  });
  const airCooledAux = calculateCoolingHeatRejectionAuxiliaryAirCooledZero();
  const table322 = lookupCoolingHeatRejectionSpecificElectricDemandTable322({
    systemKey: "wet_closed_axial_no_extra_silencer"
  });
  const table323 = lookupCoolingHeatRejectionElectricPartLoadFactorTable323({
    controlKey: "variable_water_temperature",
    rejectionTypeKey: "wet_or_hybrid_wet"
  });
  const heatRejectionAux = calculateCoolingHeatRejectionAuxiliaryEnergy({
    heatRejectedKWh: 130,
    specificElectricDemandKWPerKW: table322.valueKWPerKW,
    electricPartLoadFactor: table323.value,
    freeCoolingElectricFactor: 1
  });
  const controlAux = calculateCoolingControlAuxiliaryEnergy({
    operationHours: 10,
    controlPowersKW: [0.02, 0.03]
  });
  const distributionZero = calculateCoolingHeatRejectionDistributionAuxiliaryAirCooledZero();
  const distributionAux = calculateCoolingHeatRejectionDistributionAuxiliaryEnergy({
    heatRejectedKWh: 130,
    distributionSpecificElectricDemandKWPerKW: 0.01
  });
  const generatorAux = calculateCoolingGeneratorAuxiliaryTotal({
    heatRejectionAuxiliaryKWh: heatRejectionAux.valueKWh,
    heatRejectionDistributionAuxiliaryKWh: distributionAux.valueKWh,
    controlAuxiliaryKWh: controlAux.valueKWh
  });
  const eer = calculateCoolingCompressionEer({
    generatorCoolingInputKWh: 130,
    compressionElectricInputKWh: 31.5,
    auxiliaryElectricInputKWh: generatorAux.valueKWh
  });
  const absorptionRatio = calculateCoolingAbsorptionPerformanceRatio({
    generatorCoolingInputKWh: 100,
    absorptionHeatInputKWh: absorptionHeat.valueKWh
  });

  assert.equal(referenceOutdoor.formulaId, "MC001_3_156_COOLING_HEAT_REJECTION_AIR_OUTDOOR_REFERENCE");
  assert.equal(referenceIndoor.formulaId, "MC001_3_157_COOLING_HEAT_REJECTION_AIR_INDOOR_REFERENCE");
  assert.equal(referenceWater.formulaId, "MC001_3_158_COOLING_HEAT_REJECTION_WATER_REFERENCE");
  assert.equal(partLoad.formulaId, "MC001_3_159_HEAT_REJECTION_PART_LOAD_FACTOR");
  assert.equal(thetaOutdoor.formulaId, "MC001_3_160_HEAT_REJECTION_OUTDOOR_AIR_TEMPERATURE");
  assert.equal(zeroRecoverable.formulaId, "MC001_3_162_COOLING_RECOVERABLE_HEAT_ZERO_AIR_OR_WATER_CHILLER");
  assert.equal(undefinedTemperature.formulaId, "MC001_3_163_COOLING_RECOVERABLE_HEAT_TEMPERATURE_UNDEFINED");
  assert.equal(rejectedCompression.formulaId, "MC001_3_164_HEAT_REJECTED_COMPRESSION_GENERATOR");
  assert.equal(rejectedAbsorption.formulaId, "MC001_3_165_HEAT_REJECTED_ABSORPTION_GENERATOR");
  assert.equal(waterInlet.formulaId, "MC001_3_166_WATER_HEAT_REJECTION_INLET_TEMPERATURE");
  assert.equal(wetWater.formulaId, "MC001_3_167_WET_HEAT_REJECTION_WATER_TEMPERATURE");
  assert.equal(dryWater.formulaId, "MC001_3_168_DRY_HEAT_REJECTION_WATER_TEMPERATURE");
  assert.equal(recoverableCompression.formulaId, "MC001_3_169_RECOVERABLE_HEAT_COMPRESSION_GENERATOR");
  assert.equal(recoverableAbsorption.formulaId, "MC001_3_170_RECOVERABLE_HEAT_ABSORPTION_GENERATOR");
  assert.equal(
    recoverableCompression.executionTrace.formulaId,
    "MC001_3_169_RECOVERABLE_HEAT_COMPRESSION_GENERATOR"
  );
  assert.equal(
    recoverableAbsorption.executionTrace.formulaId,
    "MC001_3_170_RECOVERABLE_HEAT_ABSORPTION_GENERATOR"
  );
  assert.equal(recoverableMaxTemp.formulaId, "MC001_3_171_RECOVERABLE_HEAT_MAXIMUM_TEMPERATURE");
  assert.equal(rejectedAfterRecovery.formulaId, "MC001_3_172_HEAT_REJECTED_AFTER_RECOVERY");
  assert.equal(compressionElectric.formulaId, "MC001_3_173_COOLING_COMPRESSION_ELECTRIC_INPUT");
  assert.equal(absorptionHeat.formulaId, "MC001_3_174_COOLING_ABSORPTION_HEAT_INPUT");
  assert.equal(airCooledAux.formulaId, "MC001_3_175_HEAT_REJECTION_AUXILIARY_AIR_COOLED_ZERO");
  assert.equal(heatRejectionAux.formulaId, "MC001_3_176_HEAT_REJECTION_AUXILIARY_ENERGY");
  assert.equal(controlAux.formulaId, "MC001_3_177_CONTROL_AUXILIARY_ENERGY");
  assert.equal(distributionZero.formulaId, "MC001_3_178_HEAT_REJECTION_DISTRIBUTION_AIR_COOLED_ZERO");
  assert.equal(distributionAux.formulaId, "MC001_3_179_HEAT_REJECTION_DISTRIBUTION_AUXILIARY_ENERGY");
  assert.equal(generatorAux.formulaId, "MC001_3_180_COOLING_GENERATOR_AUXILIARY_TOTAL");
  assert.equal(eer.formulaId, "MC001_3_181_COOLING_COMPRESSION_EER");
  assert.equal(absorptionRatio.formulaId, "MC001_3_182_COOLING_ABSORPTION_PERFORMANCE_RATIO");
  assert.equal(processDefaults.condenserTemperatureDifferenceK, 4);
  assert.equal(processDefaults.evaporatorTemperatureDifferenceK, 6);
  assert.equal(table319.heatRejectionReferenceInletTemperatureC, 33);
  assert.equal(table319.heatRejectionReferenceOutletTemperatureC, 27);
  assert.equal(referenceOutdoor.referenceC, 32);
  assert.equal(referenceOutdoor.nominalC, 35);
  assert.equal(referenceIndoor.referenceC, 26);
  assert.equal(referenceIndoor.nominalC, 27);
  assert.equal(referenceWater.referenceC, 33);
  assertCloseTo(partLoad.value, 1.2205);
  assert.equal(thetaOutdoor.valueC, 31);
  assert.equal(zeroRecoverable.valueKWh, 0);
  assert.equal(undefinedTemperature.valueC, null);
  assertCloseTo(rejectedCompression.valueKWh, 137.037037037037);
  assertCloseTo(rejectedAbsorption.valueKWh, 258.73015873015873);
  assertCloseTo(waterInlet.valueC, 30.9);
  assert.equal(wetWater.valueC, 20);
  assert.equal(dryWater.valueC, 29);
  assertCloseTo(recoverableCompression.valueKWh, 137.037037037037);
  assertCloseTo(recoverableAbsorption.valueKWh, 258.73015873015873);
  assert.equal(recoverableMaxTemp.valueC, 31);
  assertCloseTo(rejectedAfterRecovery.valueKWh, 97.037037037037);
  assertCloseTo(compressionElectric.valueKWh, 31.89792663476874);
  assertCloseTo(absorptionHeat.valueKWh, 178.57142857142858);
  assert.equal(airCooledAux.valueKWh, 0);
  assert.equal(table322.valueKWPerKW, 0.018);
  assert.equal(table323.value, 0.8);
  assertCloseTo(heatRejectionAux.valueKWh, 1.872);
  assert.equal(controlAux.valueKWh, 0.5);
  assert.equal(distributionZero.valueKWh, 0);
  assert.equal(distributionAux.valueKWh, 1.3);
  assertCloseTo(generatorAux.valueKWh, 3.672);
  assertCloseTo(eer.value, 3.6961219151597864);
  assertCloseTo(absorptionRatio.value, 0.56);
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
