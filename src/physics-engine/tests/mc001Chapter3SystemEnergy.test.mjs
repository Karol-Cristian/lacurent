import assert from "node:assert/strict";
import {
  AHU_LOCATION,
  EXTRACT_FAN_POSITION,
  calculateAhuRecoverableGenerationLoss,
  calculateAhuCoolingCoilRequiredEnergy,
  calculateAhuGenerationLossConditioned,
  calculateAhuGenerationLossUnconditioned,
  calculateAhuDehumidificationCoolingEnergy,
  calculateAhuHeatRecoveryEnergy,
  calculateAhuHeatingCoilRequiredEnergy,
  calculateAhuHumidificationGeneratorInputEnergy,
  calculateAhuLeakageFactor,
  calculateAhuNonSteamHumidificationAuxiliaryEnergy,
  calculateAhuRecirculationAirHeatingEnergy,
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
  calculateCoolingGeneratorInputByCapacityLimit,
  calculateCoolingGeneratorInputRequiredAirWater,
  calculateCoolingGeneratorInputRequiredDirectExpansion,
  calculateCoolingPartLoadFactor,
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
  selectCoolingGeneratorOutletTemperature,
  selectCoolingPartLoadBin,
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
