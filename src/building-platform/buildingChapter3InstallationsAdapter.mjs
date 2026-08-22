import { MONTH_IDS } from "../climate-platform/index.mjs";
import {
  MC001_DHW_DEFAULT_COLD_WATER_TEMPERATURE_C,
  MC001_DHW_RECOMMENDED_DRAW_OFF_TEMPERATURE_C,
  MC001_DHW_RECOMMENDED_NETWORK_TEMPERATURE_C,
  MC001_DHW_RESIDENTIAL_DWELLING_TYPES,
  MC001_DHW_RESIDENTIAL_REFERENCE_COLD_WATER_TEMPERATURE_C,
  MC001_DHW_WATER_DENSITY_KG_PER_M3,
  calculateDhwDailyVolumeFromTable3_3_1,
  calculateDhwDailyVolumeNonResidential,
  calculateDhwSpecificDemandTemperatureCorrection,
  calculateDhwUsefulEnergyFromVolume,
  calculateDhwVolumeWithLossWaste,
  calculateResidentialDailyDhwVolume,
  calculateResidentialEquivalentConsumers,
  calculateResidentialSpecificDhwVolume
} from "../physics-engine/dhwUsefulDemand.mjs";
import {
  calculateChapter3SubsystemInputEnergyBalance,
  calculateHeatingDistributionAuxiliaryEnergy,
  calculateHeatingDistributionAuxiliaryRecoverableEnergy,
  calculateHeatingDistributionAuxiliaryRecoveredEnergy,
  calculateHeatingDistributionBoostPumpEnergy,
  calculateHeatingDistributionSetbackPumpEnergy,
  calculateHeatingEmissionEfficiency,
  calculateHeatingEmissionInputEnergy,
  calculateHeatingEmissionLoss,
  calculateHeatingGeneratorAuxiliaryEnergy,
  calculateHeatingGeneratorAuxiliaryPowerFromCoefficients,
  calculateHeatingGeneratorAuxiliaryPowerHighLoad,
  calculateHeatingGeneratorAuxiliaryPowerLowLoad,
  calculateHeatingGeneratorAuxiliaryRecoverableFraction,
  calculateHeatingGeneratorAuxiliaryRecoverableLoss,
  calculateHeatingGeneratorAuxiliaryRecoveredLoss,
  calculateHeatingGeneratorEnvelopeRecoverableLoss,
  calculateHeatingGeneratorFullLoadHours,
  calculateHeatingGeneratorLoadFactor,
  calculateHeatingGeneratorLossEnergy,
  calculateHeatingGeneratorLossPowerHighLoad,
  calculateHeatingGeneratorLossPowerLowLoad,
  calculateHeatingGeneratorStandbyLossFractionFromCoefficients,
  calculateHeatingGeneratorStandbyLossFractionFromEnvelopeAndChimney,
  calculateHeatingGeneratorStandbyLossPower,
  calculateHydronicDesignPower,
  calculateHydronicPressureDrop,
  calculateHydronicPumpEfficiencyFactor,
  calculateHydronicPumpEnergy,
  calculateHydronicPumpEnergyUseFactor,
  calculateHydronicReferencePumpPower,
  calculateIntermediateLoadFactor
} from "../physics-engine/mc001Chapter3HeatingSystems.mjs";
import {
  calculateCoolingCompressionEer,
  calculateCoolingCompressionDeliveredElectricInput,
  calculateCoolingCompressionElectricInput,
  calculateCoolingControlAuxiliaryEnergy,
  calculateCoolingCoveredPartLoadFactor,
  calculateCoolingAbsorptionHeatInput,
  calculateCoolingAbsorptionPerformanceRatio,
  calculateCoolingDistributionInletOutdoorCompensatedTemperature,
  calculateCoolingDistributionAuxiliaryEnergy,
  calculateCoolingDistributionLoss,
  calculateCoolingDryHeatRejectionWaterTemperature,
  calculateCoolingEerTemperatureCorrectionFactor,
  calculateCoolingExtractedEnergyLimitedByGenerator,
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
  calculateCoolingStoragePumpOperationTime,
  calculateCoolingStorageRecoverableAuxiliaryLoss,
  calculateCoolingStorageRecoverableLossTotal,
  calculateCoolingStorageRecoverableThermalLoss,
  calculateCoolingStorageThermalLoss,
  calculateCoolingWaterHeatRejectionInletTemperature,
  calculateCoolingWetHeatRejectionWaterTemperature,
  calculateAhuLeakageFactor,
  allocateExtractAirFlowToZone,
  allocateSupplyAirFlowToZone,
  calculateAhuCoolingCoilRequiredEnergy,
  calculateAhuDehumidificationCoolingEnergy,
  calculateAhuDistributionThermalLoss,
  calculateAhuGenerationLossConditioned,
  calculateAhuGenerationLossUnconditioned,
  calculateAhuHeatRecoveryEnergy,
  calculateAhuHeatingCoilRequiredEnergy,
  calculateAhuHumidificationGeneratorInputEnergy,
  calculateAhuNonSteamHumidificationAuxiliaryEnergy,
  calculateAhuRecirculationAirHeatingEnergy,
  calculateAhuRecoverableDistributionLossToZone,
  calculateAhuRecoverableGenerationLoss,
  calculateBalancedResidentialFanTemperatureRise,
  calculateDuctLeakageAirFlow,
  calculateDuctLeakageFactor,
  calculateDuctLeakageFlowFromFactor,
  calculateExtractAirTemperatureForRecovery,
  calculateFanEfficiencyFromNominalAndAirflowFactor,
  calculateFanEnergyAssignedToHeatRecoveryPressure,
  calculateFanTemperatureRise,
  calculateGroundPreheatPrecoolEnergy,
  calculateHumidificationPumpAuxiliaryEnergy,
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
  calculateVentilationControlAuxiliaryEnergy,
  lookupCoolingHeatRejectionElectricPartLoadFactorTable323,
  lookupCoolingHeatRejectionPolynomialCoefficientsTable320,
  lookupCoolingHeatRejectionProcessDefaultsTable318,
  lookupCoolingHeatRejectionReferenceTemperaturesTable319,
  lookupCoolingHeatRejectionSpecificElectricDemandTable322,
  selectCoolingGeneratorOutletTemperature,
  selectCoolingHeatRejectionReferenceTemperatures,
  selectCoolingHeatRejectionTemperature,
  selectCoolingPartLoadBin
} from "../physics-engine/mc001Chapter3SystemEnergy.mjs";
import {
  calculateDhwAuxiliaryDistributionEnergy,
  calculateDhwAverageTemperatureFromProfile,
  calculateDhwAverageTemperatureSimplified,
  calculateDhwBuriedPipeLinearTransmittance,
  calculateDhwDistributionLossWithRecirculation,
  calculateDhwDistributionRecoveryFactor,
  calculateDhwExponentialCoefficient,
  calculateDhwHeatTracingAuxiliaryEnergy,
  calculateDhwHeatTracingProtectedPipeLoss,
  calculateDhwInsulatedPipeLinearTransmittance,
  calculateDhwMeanDistributionTemperature,
  calculateDhwPressureDrop,
  calculateDhwPumpDesignPower,
  calculateDhwPumpEfficiencyFactor,
  calculateDhwPumpEnergyUseFactor,
  calculateDhwRecirculationLossWithoutDrawOff,
  calculateDhwRecirculationPumpEnergy,
  calculateDhwRecoverableAuxiliaryDistributionEnergy,
  calculateDhwRecoverableDistributionLoss,
  calculateDhwRecoveredAuxiliaryDistributionEnergy,
  calculateDhwRecoveredDistributionHeat,
  calculateDhwReferencePumpPower,
  calculateDhwSpecificLinearHeatLoss,
  calculateDhwStorageStandingLossSingleVolume,
  calculateDhwStubLossWithoutRecirculation,
  calculateDhwTemperatureAfterNonUseInterval,
  calculateDhwTotalDistributionLoss,
  calculateDhwUninsulatedPipeApproxLinearTransmittance,
  calculateDhwUninsulatedPipeLinearTransmittance
} from "../physics-engine/dhwDistributionLosses.mjs";
import { calculateMc001Chapter3IntegratedRuntime } from "../physics-engine/mc001Chapter3IntegratedRuntime.mjs";

export const TECHNICAL_SYSTEMS_SCHEMA = "technical_systems_v1";
export const CHAPTER3_INSTALLATIONS_ADAPTER_VERSION =
  "building_chapter_3_installations_adapter_p8h_v1";

export const CHAPTER3_INPUT_CLASSIFICATION = Object.freeze({
  NUMERICALLY_IMPLEMENTED: "NUMERICALLY_IMPLEMENTED",
  PROCEDURALLY_IMPLEMENTED: "PROCEDURALLY_IMPLEMENTED",
  EXPLICIT_INPUT_BOUNDARY: "EXPLICIT_INPUT_BOUNDARY",
  EXTERNAL_STANDARD_BLOCKED: "EXTERNAL_STANDARD_BLOCKED",
  NOT_APPLICABLE: "NOT_APPLICABLE"
});

const DAYS_BY_MONTH = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);

export const CHAPTER3_INSTALLATION_STAGE_IDS = Object.freeze([
  "emission",
  "distribution",
  "storage",
  "generation"
]);

export const CHAPTER3_DHW_STAGE_IDS = Object.freeze([
  "distribution",
  "storage",
  "generation"
]);

export const CHAPTER3_INSTALLATIONS_PRODUCT_MAPPING_LEDGER = Object.freeze([
  {
    groupId: "shared_generation",
    mc001RelationGroup: "MC001 Chapter 3 central/shared generator topology",
    runtimeModule: "src/physics-engine/mc001Chapter3IntegratedRuntime.mjs",
    requiredInputFields: Object.freeze([
      "technicalSystems.sharedComponents.generators[].componentId",
      "technicalSystems.sharedComponents.generators[].controlLossFactor",
      "technicalSystems.sharedComponents.generators[].lossPowerKW",
      "technicalSystems.sharedComponents.generators[].auxiliaryPowerKW",
      "technicalSystems.sharedComponents.generators[].operationHours or operationTimeCalculation",
      "technicalSystems.sharedComponents.generators[].serviceAllocationFractions when more than one service is connected",
      "technicalSystems.heating.systems[].generatorRef / technicalSystems.domesticHotWater.systems[].generatorRef"
    ]),
    optionalInputFields: Object.freeze([
      "generators[].energyCarrier",
      "generators[].auxiliaryCarrier",
      "generators[].renewableGeneratorHeatKWh",
      "generators[].dhwStorageOrDistributionLossKWh",
      "generators[].boilerRoomRecoveryFactor",
      "generators[].recoveredAuxiliaryFraction",
      "generators[].lossRecoverableFractionToHeating",
      "generators[].auxiliaryRecoverableFractionToHeating"
    ]),
    units: Object.freeze(["kWh/month", "kW", "h/month", "fraction"]),
    enumValues: Object.freeze({
      serviceReference: Object.freeze(["heating", "dhw", "cooling"]),
      energyCarrier: Object.freeze(["natural_gas", "electricity", "district_heat", "biomass", "explicit_other"])
    }),
    outputs: Object.freeze([
      "monthly.sharedGenerators[]",
      "monthly.*.sharedGeneratorAllocations[]",
      "energyByCarrier"
    ]),
    notebookSection: "chapter3.month.*.sharedGenerators",
    reportSection: "instalatii_capitolul_3.shared_generation",
    uiSection: "installations.shared_generation",
    persistencePath: "buildingDna.technicalSystems.sharedComponents.generators",
    testFixture: "buildingChapter3InstallationsProduct.test.mjs"
  },
  {
    groupId: "heating",
    mc001RelationGroup: "MC001 Chapter 3 system-energy chain, heating stages",
    runtimeModule: "src/physics-engine/mc001Chapter3IntegratedRuntime.mjs",
    requiredInputFields: Object.freeze([
      "technicalSystems.heating.systems[].stages[].lossKWhPerMonth",
      "technicalSystems.heating.systems[].stages[].auxiliaryKWhPerMonth",
      "technicalSystems.heating.systems[].stages[].auxiliaryRecoveredFraction",
      "technicalSystems.heating.systems[].stages[].lossRecoveredFraction"
    ]),
    optionalInputFields: Object.freeze([
      "generatorType",
      "energyCarrier",
      "servedScope",
      "nominalCapacityKW",
      "systems[].allocationFraction",
      "stages[].auxiliaryRecoverableFractionToHeating",
      "stages[].lossRecoverableFractionToHeating"
    ]),
    units: Object.freeze(["kWh/month", "fraction", "kW"]),
    enumValues: Object.freeze({
      generatorType: Object.freeze(["condensing_boiler", "electric_resistance", "heat_pump", "district_heating", "explicit_other"]),
      energyCarrier: Object.freeze(["natural_gas", "electricity", "district_heat", "biomass", "explicit_other"])
    }),
    outputs: Object.freeze(["monthly.heating.finalStageInputKWh", "annual.heatingInputKWh", "annual.heatingAuxiliaryKWh"]),
    notebookSection: "chapter3.month.*.heating",
    reportSection: "instalatii_capitolul_3.heating",
    uiSection: "installations.heating",
    persistencePath: "buildingDna.technicalSystems.heating",
    testFixture: "buildingChapter3InstallationsProduct.test.mjs"
  },
  {
    groupId: "cooling",
    mc001RelationGroup: "MC001 Chapter 3 system-energy chain, cooling stages",
    runtimeModule: "src/physics-engine/mc001Chapter3IntegratedRuntime.mjs",
    requiredInputFields: Object.freeze([
      "technicalSystems.cooling.systems[].stages[].lossKWhPerMonth",
      "technicalSystems.cooling.systems[].stages[].auxiliaryKWhPerMonth",
      "technicalSystems.cooling.systems[].stages[].auxiliaryRecoveredFraction",
      "technicalSystems.cooling.systems[].stages[].lossRecoveredFraction",
      "technicalSystems.cooling.systems[].stages[].lossCalculation or auxiliaryCalculation for source-backed component contracts"
    ]),
    optionalInputFields: Object.freeze([
      "generatorType",
      "energyCarrier",
      "servedScope",
      "nominalCapacityKW",
      "systems[].allocationFraction",
      "stages[].lossCalculation.mode = cooling_distribution_factor | cooling_storage_thermal_losses | no_cooling_storage",
      "stages[].auxiliaryCalculation.mode = cooling_distribution_factor | cooling_storage_pump_auxiliary | cooling_compression_generator_auxiliary"
    ]),
    units: Object.freeze(["kWh/month", "fraction", "kW", "h/month", "degC", "kW/K", "kWh/(kg*K)", "m3/h"]),
    enumValues: Object.freeze({
      generatorType: Object.freeze(["split_system", "chiller", "heat_pump_reversible", "district_cooling", "explicit_other"]),
      energyCarrier: Object.freeze(["electricity", "district_cooling", "explicit_other"])
    }),
    outputs: Object.freeze(["monthly.cooling.finalStageInputKWh", "annual.coolingInputKWh", "annual.coolingAuxiliaryKWh"]),
    notebookSection: "chapter3.month.*.cooling",
    reportSection: "instalatii_capitolul_3.cooling",
    uiSection: "installations.cooling",
    persistencePath: "buildingDna.technicalSystems.cooling",
    testFixture: "buildingChapter3InstallationsProduct.test.mjs"
  },
  {
    groupId: "ventilation_ahu",
    mc001RelationGroup: "MC001 Chapter 3 ventilation/AHU auxiliary relations",
    runtimeModule: "src/physics-engine/mc001Chapter3IntegratedRuntime.mjs",
    requiredInputFields: Object.freeze([
      "technicalSystems.ventilationAhu.systems[].fanElectricEnergyInput.supplyAirFlowM3PerH",
      "technicalSystems.ventilationAhu.systems[].fanElectricEnergyInput.supplyPressureDropPa",
      "technicalSystems.ventilationAhu.systems[].fanElectricEnergyInput.supplyFanEfficiency",
      "technicalSystems.ventilationAhu.systems[].fanElectricEnergyInput.extractAirFlowM3PerH",
      "technicalSystems.ventilationAhu.systems[].fanElectricEnergyInput.extractPressureDropPa",
      "technicalSystems.ventilationAhu.systems[].fanElectricEnergyInput.extractFanEfficiency",
      "technicalSystems.ventilationAhu.systems[].fanElectricEnergyInput.calculationHours"
    ]),
    optionalInputFields: Object.freeze([
      "heatRecoveryAuxiliaryKWhPerMonth",
      "preheatAuxiliaryKWhPerMonth",
      "controlAuxiliaryKWhPerMonth"
    ]),
    units: Object.freeze(["m3/h", "Pa", "fraction", "h/month", "kWh/month"]),
    outputs: Object.freeze(["monthly.ventilation.valueKWh", "annual.ventilationAuxiliaryKWh"]),
    notebookSection: "chapter3.month.*.ventilation",
    reportSection: "instalatii_capitolul_3.ventilation_ahu",
    uiSection: "installations.ventilation_ahu",
    persistencePath: "buildingDna.technicalSystems.ventilationAhu",
    testFixture: "buildingChapter3InstallationsProduct.test.mjs"
  },
  {
    groupId: "domestic_hot_water",
    mc001RelationGroup: "MC001 Chapter 3 DHW system-energy chain",
    runtimeModule: "src/physics-engine/mc001Chapter3IntegratedRuntime.mjs",
    requiredInputFields: Object.freeze([
      "technicalSystems.domesticHotWater.usefulDemandSource or technicalSystems.domesticHotWater.monthlyUsefulDemandKWh",
      "technicalSystems.domesticHotWater.systems[].stages[].lossCalculation or lossKWhPerMonth",
      "technicalSystems.domesticHotWater.systems[].stages[].auxiliaryCalculation or auxiliaryKWhPerMonth"
    ]),
    optionalInputFields: Object.freeze([
      "generatorType",
      "energyCarrier",
      "circulationEnabled",
      "systems[].allocationFraction",
      "usefulDemandSource.mode = residential_normative | table_3_3_1 | explicit_monthly",
      "usefulDemandSource.dwellingType",
      "usefulDemandSource.tableEntryId",
      "usefulDemandSource.unitCount",
      "systems[].stages[].lossCalculation.mode = dhw_distribution_loss_components | dhw_storage_standing_loss_single_volume",
      "systems[].stages[].auxiliaryCalculation.mode = dhw_recirculation_pump_auxiliary | dhw_heat_tracing_auxiliary",
      "systems[].stages[].lossKWhPerMonth legacy/expert explicit fallback",
      "systems[].stages[].auxiliaryKWhPerMonth legacy/expert explicit fallback"
    ]),
    units: Object.freeze(["kWh/month", "fraction", "m", "W/(m*K)", "degC", "h/month", "kPa", "m3/h", "kW"]),
    outputs: Object.freeze(["monthly.dhw.finalStageInputKWh", "annual.dhwInputKWh"]),
    notebookSection: "chapter3.month.*.dhw",
    reportSection: "instalatii_capitolul_3.dhw",
    uiSection: "installations.dhw",
    persistencePath: "buildingDna.technicalSystems.domesticHotWater",
    testFixture: "buildingChapter3InstallationsProduct.test.mjs"
  },
  {
    groupId: "cooling_storage_pcm",
    mc001RelationGroup: "MC001 Chapter 3 cooling storage and PCM state relations 3.94-3.123",
    runtimeModule: "src/physics-engine/mc001Chapter3IntegratedRuntime.mjs",
    requiredInputFields: Object.freeze([
      "technicalSystems.coolingStoragePcm.monthly[].storageInputKWh",
      "technicalSystems.coolingStoragePcm.monthly[].storageInputLossKWh",
      "technicalSystems.coolingStoragePcm.monthly[].storageStandbyLossKWh",
      "technicalSystems.coolingStoragePcm.monthly[].storageOutputSideLossKWh",
      "technicalSystems.coolingStoragePcm.monthly[].liquidMassKg",
      "technicalSystems.coolingStoragePcm.monthly[].liquidSpecificHeatKWhPerKgK",
      "technicalSystems.coolingStoragePcm.monthly[].solidDensityKgPerM3",
      "technicalSystems.coolingStoragePcm.monthly[].mediumDensityKgPerM3",
      "technicalSystems.coolingStoragePcm.monthly[].mediumVolumeM3",
      "technicalSystems.coolingStoragePcm.monthly[].mediumSpecificHeatKWhPerKgK",
      "technicalSystems.coolingStoragePcm.monthly[].storagePipeLengthM",
      "technicalSystems.coolingStoragePcm.monthly[].storagePipeDiameterM",
      "technicalSystems.coolingStoragePcm.monthly[].maximumIceThicknessM",
      "technicalSystems.coolingStoragePcm.monthly[].initialLiquidMassKg",
      "technicalSystems.coolingStoragePcm.monthly[].initialSolidTemperatureC",
      "technicalSystems.coolingStoragePcm.monthly[].initialLiquidTemperatureC",
      "technicalSystems.coolingStoragePcm.monthly[].storageGeneratorEnergyKWh",
      "technicalSystems.coolingStoragePcm.monthly[].inputSideLossKWh",
      "technicalSystems.coolingStoragePcm.monthly[].standbyLossKWh",
      "technicalSystems.coolingStoragePcm.monthly[].outputSideLossKWh",
      "technicalSystems.coolingStoragePcm.monthly[].sensibleStorageTransformableEnergyKWh",
      "technicalSystems.coolingStoragePcm.monthly[].solidMassKg",
      "technicalSystems.coolingStoragePcm.monthly[].solidSpecificHeatKWhPerKgK",
      "technicalSystems.coolingStoragePcm.monthly[].generatorOutletFlowTemperatureC",
      "technicalSystems.coolingStoragePcm.monthly[].transitionTemperatureC",
      "technicalSystems.coolingStoragePcm.monthly[].generatorOutletFlowDeltaK",
      "technicalSystems.coolingStoragePcm.monthly[].massDecreaseTransformableEnergyKWh",
      "technicalSystems.coolingStoragePcm.monthly[].latentHeatKWhPerKg",
      "technicalSystems.coolingStoragePcm.monthly[].initialSolidMassKg"
    ]),
    optionalInputFields: Object.freeze([]),
    units: Object.freeze(["kWh", "kg", "kWh/(kg*K)", "degC", "K", "m", "kg/m3", "m3"]),
    outputs: Object.freeze([
      "monthly.coolingStoragePcm.calculations",
      "monthly.coolingStoragePcm.storageInputKWh",
      "monthly.coolingStoragePcm.storageOutputKWh",
      "monthly.coolingStoragePcm.generatorDeltaEnergyKWh",
      "monthly.coolingStoragePcm.totals.sensibleSolidStorageEnergyKWh",
      "monthly.coolingStoragePcm.totals.inputEnergyLimitKWh",
      "monthly.coolingStoragePcm.totals.solidMassDecreaseKg"
    ]),
    notebookSection: "chapter3.month.*.coolingStoragePcm",
    reportSection: "instalatii_capitolul_3.storage_pcm",
    uiSection: "installations.storage",
    persistencePath: "buildingDna.technicalSystems.coolingStoragePcm",
    testFixture: "buildingChapter3InstallationsProduct.test.mjs"
  },
  {
    groupId: "lighting_explicit_leni_boundary",
    mc001RelationGroup: "MC001 LENI aggregation over explicit SR EN 15193-1 boundary values",
    runtimeModule: "src/physics-engine/mc001Chapter3IntegratedRuntime.mjs",
    requiredInputFields: Object.freeze([
      "technicalSystems.lighting.explicitMonthlyEnergyKWh",
      "technicalSystems.lighting.leniSubspaces[].leniKWhPerM2Year",
      "technicalSystems.lighting.leniSubspaces[].areaM2"
    ]),
    optionalInputFields: Object.freeze(["totalAreaM2"]),
    units: Object.freeze(["kWh/month", "kWh/(m2*year)", "m2"]),
    outputs: Object.freeze(["lighting.leni", "annual.lightingEnergyKWh"]),
    notebookSection: "chapter3.month.*.lighting",
    reportSection: "instalatii_capitolul_3.lighting_boundary",
    uiSection: "installations.lighting_boundary",
    persistencePath: "buildingDna.technicalSystems.lighting",
    limitation:
      "Calculul detaliat normativ al iluminatului conform SR EN 15193-1 nu este inclus fara sursa normativa completa. Valorile LENI introduse explicit sunt tratate ca date tehnice furnizate.",
    testFixture: "buildingChapter3InstallationsProduct.test.mjs"
  }
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function finiteNonNegative(value) {
  return finiteNumber(value) && value >= 0;
}

function finitePositive(value) {
  return finiteNumber(value) && value > 0;
}

function enabled(section) {
  return section?.enabled === true;
}

function diagnostic(code, path, message) {
  return { code, path, message, severity: "blocking" };
}

function sourceDescriptor({ classification, origin, reference, formulaIds = [], details = {} }) {
  return {
    classification,
    origin,
    reference,
    formulaIds,
    productionEligible:
      classification === CHAPTER3_INPUT_CLASSIFICATION.NUMERICALLY_IMPLEMENTED ||
      classification === CHAPTER3_INPUT_CLASSIFICATION.PROCEDURALLY_IMPLEMENTED,
    ...details
  };
}

function monthlyScalar(value, monthIndex, path, diagnostics) {
  if (Array.isArray(value)) {
    const monthly = value[monthIndex];
    if (!finiteNonNegative(monthly)) {
      diagnostics.push(diagnostic("missing_monthly_installation_value", `${path}[${monthIndex}]`));
      return null;
    }
    return monthly;
  }
  if (finiteNonNegative(value)) return value;
  diagnostics.push(diagnostic("missing_installation_value", path));
  return null;
}

function monthlyScalarWithSource(value, monthIndex, path, diagnostics, source) {
  const amount = monthlyScalar(value, monthIndex, path, diagnostics);
  return {
    value: amount,
    source: sourceDescriptor({
      classification: CHAPTER3_INPUT_CLASSIFICATION.EXPLICIT_INPUT_BOUNDARY,
      origin: "expert_explicit_monthly_input",
      reference: path,
      formulaIds: [],
      details: source ? { source } : {}
    })
  };
}

function monthlyComponent(value, monthIndex) {
  if (Array.isArray(value)) return value[monthIndex];
  return value;
}

function monthlyField(record, field, monthIndex) {
  const value = record?.[field];
  return Array.isArray(value) ? value[monthIndex] : value;
}

function traceFormulaIds(results) {
  return results
    .filter(Boolean)
    .map(result => result.formulaId)
    .filter(Boolean);
}

function calculatedStageSource({ origin, reference, results, details = {} }) {
  return sourceDescriptor({
    classification: CHAPTER3_INPUT_CLASSIFICATION.NUMERICALLY_IMPLEMENTED,
    origin,
    reference,
    formulaIds: traceFormulaIds(results),
    details: {
      calculationChain: results.filter(Boolean),
      executionTrace: results.filter(Boolean).at(-1)?.executionTrace ?? null,
      ...details
    }
  });
}

function calculatedComponentSource({ origin, reference, results, details = {} }) {
  return sourceDescriptor({
    classification: CHAPTER3_INPUT_CLASSIFICATION.NUMERICALLY_IMPLEMENTED,
    origin,
    reference,
    formulaIds: traceFormulaIds(results),
    details: {
      calculationChain: results.filter(Boolean),
      executionTrace: results.filter(Boolean).at(-1)?.executionTrace ?? null,
      ...details
    }
  });
}

function directBranchResult({ formulaId, branchId, unit, formulaText, provenance }) {
  return {
    status: "calculated",
    value: 0,
    valueKWh: unit === "kWh" ? 0 : undefined,
    unit,
    formulaId,
    executionTrace: {
      schema: "mc001_execution_trace_v1",
      chapter: "3",
      formulaId,
      branchId,
      inputs: {},
      formulaText,
      rawResult: 0,
      finalResult: 0,
      unit,
      clampApplied: false,
      status: "branch_result",
      provenance
    }
  };
}

function noHeatingStorageBranch(path) {
  const result = directBranchResult({
    formulaId: "MC001_3_HEATING_STORAGE_NO_STORAGE_BRANCH",
    branchId: "no_heating_storage_zero_loss",
    unit: "kWh",
    formulaText: "QH,sto,ls = 0 when no heating storage component exists",
    provenance: {
      source: "MC001-2022 Chapter 3 heating service topology",
      assumptions: ["heating_storage_absent_is_explicit_in_building_dna"]
    }
  });
  return {
    value: 0,
    source: calculatedStageSource({
      origin: "mc001_heating_no_storage_branch",
      reference: `${path}.lossCalculation`,
      results: [result],
      details: { mode: "no_heating_storage" }
    }),
    derivedFractions: {}
  };
}

function noCoolingStorageBranch(path, sourcePath = "lossCalculation") {
  const result = directBranchResult({
    formulaId: "MC001_3_COOLING_STORAGE_NO_STORAGE_BRANCH",
    branchId: "no_cooling_storage_zero_loss",
    unit: "kWh",
    formulaText: "QC,sto,ls = 0 when no cooling storage component exists",
    provenance: {
      source: "MC001-2022 Chapter 3 cooling service topology",
      assumptions: ["cooling_storage_absent_is_explicit_in_building_dna"]
    }
  });
  return {
    value: 0,
    source: calculatedStageSource({
      origin: "mc001_cooling_no_storage_branch",
      reference: `${path}.${sourcePath}`,
      results: [result],
      details: { mode: "no_cooling_storage" }
    }),
    derivedFractions: {}
  };
}

function sharedGeneratorReferenceStageSource({ service, stageId, generatorRef, path }) {
  return sourceDescriptor({
    classification: CHAPTER3_INPUT_CLASSIFICATION.PROCEDURALLY_IMPLEMENTED,
    origin: "mc001_shared_generator_service_reference",
    reference: path,
    formulaIds: [
      "MC001_3_21_HEATING_GENERATION_AUXILIARY_TOTAL",
      "MC001_3_22_GENERATION_LOSS_TOTAL",
      "MC001_3_28_RECOVERABLE_GENERATION_LOSS_TOTAL",
      "MC001_3_33_TOTAL_GENERATION_AUXILIARY_RECOVERED_LOSS",
      "MC001_3_39_CENTRAL_GENERATOR_OUTPUT_ENERGY"
    ],
    details: {
      service,
      stageId,
      generatorRef,
      boundary:
        "The service generation stage is delegated to the referenced physical shared generator; local generation losses/auxiliaries are not evaluated as independent duplicated service values."
    }
  });
}

function applySharedGeneratorReferenceToStages(stages, { service, generatorRef }) {
  if (!generatorRef) return stages;
  return stages.map(stage => {
    if (stage.stageId !== "generation") return stage;
    const source = sharedGeneratorReferenceStageSource({
      service,
      stageId: stage.stageId,
      generatorRef,
      path: `${service}.stages.${stage.stageId}.generatorRef`
    });
    return {
      ...stage,
      lossKWh: 0,
      auxiliaryKWh: 0,
      lossSource: source,
      auxiliarySource: source,
      auxiliaryRecoveredFraction: 0,
      lossRecoveredFraction: 0,
      auxiliaryRecoverableFractionToHeating: 0,
      lossRecoverableFractionToHeating: 0
    };
  });
}

function calculateHeatingEmissionLossContract(input, monthIndex, path, stageOutputKWh) {
  const contract = monthlyComponent(input, monthIndex);
  if (!isPlainObject(contract)) return null;
  if (contract.mode !== "heating_emission_temperature_increase") return null;

  const loss = calculateHeatingEmissionLoss({
    emissionOutputKWh: stageOutputKWh,
    increasedIndoorTemperatureK: monthlyField(contract, "increasedIndoorTemperatureK", monthIndex),
    indoorTemperatureC: monthlyField(contract, "indoorTemperatureC", monthIndex),
    combinedOutdoorTemperatureC: monthlyField(contract, "combinedOutdoorTemperatureC", monthIndex)
  });
  const inputEnergy = calculateHeatingEmissionInputEnergy({
    annualEmissionOutputKWh: stageOutputKWh,
    annualEmissionLossKWh: loss.valueKWh
  });
  const efficiency = stageOutputKWh > 0
    ? calculateHeatingEmissionEfficiency({
        annualEmissionOutputKWh: stageOutputKWh,
        annualEmissionLossKWh: loss.valueKWh
      })
    : null;
  const results = [loss, inputEnergy, efficiency].filter(Boolean);
  return {
    value: loss.valueKWh,
    source: calculatedStageSource({
      origin: "mc001_heating_emission_component_contract",
      reference: `${path}.lossCalculation`,
      results,
      details: {
        mode: contract.mode,
        stageOutputKWh,
        emissionInputKWh: inputEnergy.valueKWh,
        emissionEfficiencyFactor: efficiency?.value ?? null
      }
    }),
    derivedFractions: {}
  };
}

function calculateHeatingHydronicPumpAuxiliaryContract(input, monthIndex, path) {
  const contract = monthlyComponent(input, monthIndex);
  if (!isPlainObject(contract)) return null;
  if (contract.mode !== "heating_hydronic_pump_auxiliary") return null;

  const pressureDrop = contract.pressureDropInput
    ? calculateHydronicPressureDrop(contract.pressureDropInput)
    : null;
  const designPower = calculateHydronicDesignPower({
    pressureDropKPa: pressureDrop?.valueKPa ?? contract.pressureDropKPa,
    designFlowRateM3PerH: contract.designFlowRateM3PerH
  });
  const referencePower = calculateHydronicReferencePumpPower({
    hydronicDesignPowerKW: designPower.valueKW
  });
  const efficiencyFactor = calculateHydronicPumpEfficiencyFactor({
    referencePumpPowerKW: referencePower.valueKW,
    hydronicDesignPowerKW: designPower.valueKW
  });
  const energyUseFactor = calculateHydronicPumpEnergyUseFactor({
    pumpEfficiencyFactor: efficiencyFactor.value,
    controlConstantCp1: contract.controlConstantCp1,
    controlConstantCp2: contract.controlConstantCp2,
    operationLoadFactor: contract.operationLoadFactor,
    energyEfficiencyIndex: contract.energyEfficiencyIndex
  });
  const pumpEnergy = calculateHydronicPumpEnergy({
    designPowerKW: designPower.valueKW,
    operationLoadFactor: contract.operationLoadFactor,
    annualOperationHours: monthlyField(contract, "operationHours", monthIndex),
    correctionFactor: contract.correctionFactor
  });
  const auxiliary = calculateHeatingDistributionAuxiliaryEnergy({
    hydronicPumpEnergyKWh: pumpEnergy.valueKWh,
    pumpEnergyUseFactor: energyUseFactor.value
  });
  const setback = finiteNumber(contract.setbackPumpPowerKW) &&
    finiteNumber(monthlyField(contract, "setbackCalculationHours", monthIndex))
    ? calculateHeatingDistributionSetbackPumpEnergy({
        setbackPumpPowerKW: contract.setbackPumpPowerKW,
        calculationHours: monthlyField(contract, "setbackCalculationHours", monthIndex)
      })
    : null;
  const boost = finiteNumber(monthlyField(contract, "boostCalculationHours", monthIndex))
    ? calculateHeatingDistributionBoostPumpEnergy({
        hydronicDesignPowerKW: designPower.valueKW,
        calculationHours: monthlyField(contract, "boostCalculationHours", monthIndex)
      })
    : null;
  const totalAuxiliaryKWh =
    auxiliary.valueKWh +
    (setback?.valueKWh ?? 0) +
    (boost?.valueKWh ?? 0);
  const recoverable = finiteNumber(contract.recoverableFraction)
    ? calculateHeatingDistributionAuxiliaryRecoverableEnergy({
        recoverableFraction: contract.recoverableFraction,
        distributionAuxiliaryEnergyKWh: totalAuxiliaryKWh
      })
    : null;
  const recovered = finiteNumber(contract.recoverableFraction)
    ? calculateHeatingDistributionAuxiliaryRecoveredEnergy({
        recoverableFraction: contract.recoverableFraction,
        distributionAuxiliaryEnergyKWh: totalAuxiliaryKWh
      })
    : null;
  const results = [
    pressureDrop,
    designPower,
    referencePower,
    efficiencyFactor,
    energyUseFactor,
    pumpEnergy,
    auxiliary,
    setback,
    boost,
    recoverable,
    recovered
  ].filter(Boolean);
  return {
    value: totalAuxiliaryKWh,
    source: calculatedStageSource({
      origin: "mc001_heating_distribution_pump_component_contract",
      reference: `${path}.auxiliaryCalculation`,
      results,
      details: {
        mode: contract.mode,
        hydronicAuxiliaryKWh: auxiliary.valueKWh,
        setbackAuxiliaryKWh: setback?.valueKWh ?? null,
        boostAuxiliaryKWh: boost?.valueKWh ?? null,
        recoverableAuxiliaryKWh: recoverable?.valueKWh ?? null,
        recoveredAuxiliaryKWh: recovered?.valueKWh ?? null
      }
    }),
    derivedFractions: {
      ...(finiteNumber(contract.recoverableFraction)
        ? { auxiliaryRecoverableFractionToHeating: contract.recoverableFraction }
        : {})
    }
  };
}

function heatingGeneratorCurveLoadResults(contract, monthIndex, stageOutputKWh) {
  const operationHours = monthlyField(contract, "operationHours", monthIndex);
  const fullLoadHours = calculateHeatingGeneratorFullLoadHours({
    generatorOutputKWh: stageOutputKWh,
    nominalPowerKW: contract.nominalPowerKW
  });
  const loadFactor = calculateHeatingGeneratorLoadFactor({
    generatorOutputKWh: stageOutputKWh,
    nominalPowerKW: contract.nominalPowerKW,
    heatingOperationHours: operationHours
  });
  const intermediateLoadFactor = calculateIntermediateLoadFactor({
    intermediatePowerKW: contract.intermediatePowerKW,
    nominalPowerKW: contract.nominalPowerKW
  });
  return { operationHours, fullLoadHours, loadFactor, intermediateLoadFactor };
}

function calculateHeatingGeneratorLossContract(input, monthIndex, path, stageOutputKWh) {
  const contract = monthlyComponent(input, monthIndex);
  if (!isPlainObject(contract)) return null;

  if (
    contract.mode === "heating_generator_standby_coefficients" ||
    contract.mode === "heating_generator_standby_envelope_chimney"
  ) {
    const operationHours = monthlyField(contract, "operationHours", monthIndex);
    const generatorDeliveredPowerKW = contextMonthlyField(
      contract,
      "generatorDeliveredPowerKW",
      monthIndex,
      contract.nominalPowerKW
    );
    const standbyFraction =
      contract.mode === "heating_generator_standby_coefficients"
        ? calculateHeatingGeneratorStandbyLossFractionFromCoefficients({
            coefficientC5: contract.coefficientC5,
            coefficientC6: contract.coefficientC6,
            nominalPowerKW: contract.nominalPowerKW
          })
        : calculateHeatingGeneratorStandbyLossFractionFromEnvelopeAndChimney({
            envelopeLossFractionPercent: contract.envelopeLossFractionPercent,
            chimneyOffLossFractionPercent: contract.chimneyOffLossFractionPercent
          });
    const standbyLossPower = calculateHeatingGeneratorStandbyLossPower({
      envelopeLossFractionPercent:
        contract.mode === "heating_generator_standby_envelope_chimney"
          ? contract.envelopeLossFractionPercent
          : standbyFraction.valuePercent,
      chimneyOffLossFractionPercent:
        contract.mode === "heating_generator_standby_envelope_chimney"
          ? contract.chimneyOffLossFractionPercent
          : 0,
      generatorDeliveredPowerKW
    });
    const lossEnergy = calculateHeatingGeneratorLossEnergy({
      generatorLossPowerKW: standbyLossPower.valueKW,
      operationHours
    });
    const envelopeRecoverable = finiteNumber(contract.boilerRoomRecoveryFactor) &&
      finiteNumber(contract.envelopeLossFraction)
      ? calculateHeatingGeneratorEnvelopeRecoverableLoss({
          correctedStandbyLossPowerKW: standbyLossPower.valueKW,
          boilerRoomRecoveryFactor: contract.boilerRoomRecoveryFactor,
          envelopeLossFraction: contract.envelopeLossFraction,
          operationHours
        })
      : null;
    const results = [standbyFraction, standbyLossPower, lossEnergy, envelopeRecoverable].filter(Boolean);
    return {
      value: lossEnergy.valueKWh,
      source: calculatedStageSource({
        origin: "mc001_heating_generator_standby_component_contract",
        reference: `${path}.lossCalculation`,
        results,
        details: {
          mode: contract.mode,
          stageOutputKWh,
          generatorDeliveredPowerKW,
          recoverableGenerationLossKWh: envelopeRecoverable?.valueKWh ?? null
        }
      }),
      derivedFractions: {}
    };
  }

  if (contract.mode !== "heating_generator_loss_power_curve") return null;

  const load = heatingGeneratorCurveLoadResults(contract, monthIndex, stageOutputKWh);
  const lossPower =
    load.loadFactor.value <= load.intermediateLoadFactor.value
      ? calculateHeatingGeneratorLossPowerLowLoad({
          generatorLoadFactor: load.loadFactor.value,
          intermediateLoadFactor: load.intermediateLoadFactor.value,
          lossPowerNominalKW: contract.lossPowerNominalKW,
          lossPowerIntermediateKW: contract.lossPowerIntermediateKW
        })
      : calculateHeatingGeneratorLossPowerHighLoad({
          generatorLoadFactor: load.loadFactor.value,
          intermediateLoadFactor: load.intermediateLoadFactor.value,
          nominalLoadFactor: contract.nominalLoadFactor,
          lossPowerNominalKW: contract.lossPowerNominalKW,
          lossPowerIntermediateKW: contract.lossPowerIntermediateKW
        });
  const lossEnergy = calculateHeatingGeneratorLossEnergy({
    generatorLossPowerKW: lossPower.valueKW,
    operationHours: load.operationHours
  });
  const standbyLossInput = contract.standbyLossInput ??
    (finiteNumber(contract.envelopeLossFractionPercent) &&
    finiteNumber(contract.chimneyOffLossFractionPercent) &&
    finiteNumber(contract.generatorDeliveredPowerKW)
      ? {
          envelopeLossFractionPercent: contract.envelopeLossFractionPercent,
          chimneyOffLossFractionPercent: contract.chimneyOffLossFractionPercent,
          generatorDeliveredPowerKW: contract.generatorDeliveredPowerKW
        }
      : null);
  const standbyFraction = standbyLossInput
    ? calculateHeatingGeneratorStandbyLossFractionFromEnvelopeAndChimney({
        envelopeLossFractionPercent: standbyLossInput.envelopeLossFractionPercent,
        chimneyOffLossFractionPercent: standbyLossInput.chimneyOffLossFractionPercent
      })
    : null;
  const standbyLossPower = standbyLossInput
    ? calculateHeatingGeneratorStandbyLossPower(standbyLossInput)
    : null;
  const envelopeRecoverableInput = contract.envelopeRecoverableInput ??
    (standbyLossPower &&
    finiteNumber(contract.boilerRoomRecoveryFactor) &&
    finiteNumber(contract.envelopeLossFraction)
      ? {
          correctedStandbyLossPowerKW: standbyLossPower.valueKW,
          boilerRoomRecoveryFactor: contract.boilerRoomRecoveryFactor,
          envelopeLossFraction: contract.envelopeLossFraction
        }
      : null);
  const envelopeRecoverable = envelopeRecoverableInput
    ? calculateHeatingGeneratorEnvelopeRecoverableLoss({
        ...envelopeRecoverableInput,
        operationHours: load.operationHours
      })
    : null;
  const results = [
    load.fullLoadHours,
    load.loadFactor,
    load.intermediateLoadFactor,
    lossPower,
    lossEnergy,
    standbyFraction,
    standbyLossPower,
    envelopeRecoverable
  ].filter(Boolean);
  return {
    value: lossEnergy.valueKWh,
    source: calculatedStageSource({
      origin: "mc001_heating_generator_loss_power_curve_contract",
      reference: `${path}.lossCalculation`,
      results,
      details: {
        mode: contract.mode,
        stageOutputKWh,
        branch:
          load.loadFactor.value <= load.intermediateLoadFactor.value
            ? "low_load_loss_power"
            : "high_load_loss_power",
        recoverableGenerationLossKWh: envelopeRecoverable?.valueKWh ?? null
      }
    }),
    derivedFractions: {}
  };
}

function calculateHeatingGeneratorAuxiliaryContract(input, monthIndex, path, stageOutputKWh) {
  const contract = monthlyComponent(input, monthIndex);
  if (!isPlainObject(contract)) return null;

  if (contract.mode === "heating_generator_auxiliary_coefficients") {
    const operationHours = monthlyField(contract, "operationHours", monthIndex);
    const auxiliaryPower = calculateHeatingGeneratorAuxiliaryPowerFromCoefficients({
      coefficientC7: contract.coefficientC7,
      coefficientC8: contract.coefficientC8,
      nominalPowerKW: contract.nominalPowerKW
    });
    const auxiliaryEnergy = calculateHeatingGeneratorAuxiliaryEnergy({
      auxiliaryPowerKW: auxiliaryPower.valueKW,
      operationHours
    });
    const recoverableFraction = finiteNumber(contract.recoveredAuxiliaryFraction)
      ? calculateHeatingGeneratorAuxiliaryRecoverableFraction({
          recoveredAuxiliaryFraction: contract.recoveredAuxiliaryFraction
        })
      : null;
    const recovered = finiteNumber(contract.recoveredAuxiliaryFraction)
      ? calculateHeatingGeneratorAuxiliaryRecoveredLoss({
          generationAuxiliaryEnergyKWh: auxiliaryEnergy.valueKWh,
          recoveredAuxiliaryFraction: contract.recoveredAuxiliaryFraction
        })
      : null;
    const recoverable = recoverableFraction && finiteNumber(contract.boilerRoomRecoveryFactor)
      ? calculateHeatingGeneratorAuxiliaryRecoverableLoss({
          generationAuxiliaryEnergyKWh: auxiliaryEnergy.valueKWh,
          boilerRoomRecoveryFactor: contract.boilerRoomRecoveryFactor,
          auxiliaryRecoverableFraction: recoverableFraction.value
        })
      : null;
    const results = [auxiliaryPower, auxiliaryEnergy, recoverableFraction, recovered, recoverable]
      .filter(Boolean);
    return {
      value: auxiliaryEnergy.valueKWh,
      source: calculatedStageSource({
        origin: "mc001_heating_generator_auxiliary_coefficient_contract",
        reference: `${path}.auxiliaryCalculation`,
        results,
        details: {
          mode: contract.mode,
          stageOutputKWh,
          recoveredAuxiliaryKWh: recovered?.valueKWh ?? null,
          recoverableAuxiliaryKWh: recoverable?.valueKWh ?? null
        }
      }),
      derivedFractions: {
        ...(finiteNumber(contract.recoveredAuxiliaryFraction)
          ? { auxiliaryRecoveredFraction: contract.recoveredAuxiliaryFraction }
          : {}),
        ...(recoverableFraction ? { auxiliaryRecoverableFractionToHeating: recoverableFraction.value } : {})
      }
    };
  }

  if (contract.mode !== "heating_generator_auxiliary_power_curve") return null;

  const load = heatingGeneratorCurveLoadResults(contract, monthIndex, stageOutputKWh);
  const auxiliaryPower =
    load.loadFactor.value <= load.intermediateLoadFactor.value
      ? calculateHeatingGeneratorAuxiliaryPowerLowLoad({
          generatorLoadFactor: load.loadFactor.value,
          intermediateLoadFactor: load.intermediateLoadFactor.value,
          auxiliaryPowerIntermediateKW: contract.auxiliaryPowerIntermediateKW,
          auxiliaryPowerStandbyKW: contract.auxiliaryPowerStandbyKW
        })
      : calculateHeatingGeneratorAuxiliaryPowerHighLoad({
          generatorLoadFactor: load.loadFactor.value,
          intermediateLoadFactor: load.intermediateLoadFactor.value,
          auxiliaryPowerNominalKW: contract.auxiliaryPowerNominalKW,
          auxiliaryPowerIntermediateKW: contract.auxiliaryPowerIntermediateKW
        });
  const auxiliaryEnergy = calculateHeatingGeneratorAuxiliaryEnergy({
    auxiliaryPowerKW: auxiliaryPower.valueKW,
    operationHours: load.operationHours
  });
  const recoverableFraction = finiteNumber(contract.recoveredAuxiliaryFraction)
    ? calculateHeatingGeneratorAuxiliaryRecoverableFraction({
        recoveredAuxiliaryFraction: contract.recoveredAuxiliaryFraction
      })
    : null;
  const recovered = finiteNumber(contract.recoveredAuxiliaryFraction)
    ? calculateHeatingGeneratorAuxiliaryRecoveredLoss({
        generationAuxiliaryEnergyKWh: auxiliaryEnergy.valueKWh,
        recoveredAuxiliaryFraction: contract.recoveredAuxiliaryFraction
      })
    : null;
  const recoverable = recoverableFraction && finiteNumber(contract.boilerRoomRecoveryFactor)
    ? calculateHeatingGeneratorAuxiliaryRecoverableLoss({
        generationAuxiliaryEnergyKWh: auxiliaryEnergy.valueKWh,
        boilerRoomRecoveryFactor: contract.boilerRoomRecoveryFactor,
        auxiliaryRecoverableFraction: recoverableFraction.value
      })
    : null;
  const results = [
    load.fullLoadHours,
    load.loadFactor,
    load.intermediateLoadFactor,
    auxiliaryPower,
    auxiliaryEnergy,
    recoverableFraction,
    recovered,
    recoverable
  ].filter(Boolean);
  return {
    value: auxiliaryEnergy.valueKWh,
    source: calculatedStageSource({
      origin: "mc001_heating_generator_auxiliary_power_curve_contract",
      reference: `${path}.auxiliaryCalculation`,
      results,
      details: {
        mode: contract.mode,
        stageOutputKWh,
        branch:
          load.loadFactor.value <= load.intermediateLoadFactor.value
            ? "low_load_auxiliary_power"
            : "high_load_auxiliary_power",
        recoveredAuxiliaryKWh: recovered?.valueKWh ?? null,
        recoverableAuxiliaryKWh: recoverable?.valueKWh ?? null
      }
    }),
    derivedFractions: {
      ...(finiteNumber(contract.recoveredAuxiliaryFraction)
        ? { auxiliaryRecoveredFraction: contract.recoveredAuxiliaryFraction }
        : {}),
      ...(recoverableFraction ? { auxiliaryRecoverableFractionToHeating: recoverableFraction.value } : {})
    }
  };
}

function calculateDhwPipeMeanTemperature(input) {
  if (!isPlainObject(input)) return null;
  return calculateDhwMeanDistributionTemperature(input);
}

function calculateDhwPipeLinearTransmittance(input) {
  if (!isPlainObject(input)) return null;
  switch (input.mode) {
    case "insulated_pipe":
      return calculateDhwInsulatedPipeLinearTransmittance(input);
    case "buried_pipe":
      return calculateDhwBuriedPipeLinearTransmittance(input);
    case "uninsulated_pipe":
      return calculateDhwUninsulatedPipeLinearTransmittance(input);
    case "uninsulated_pipe_approx":
      return calculateDhwUninsulatedPipeApproxLinearTransmittance(input);
    default:
      return null;
  }
}

function calculateDhwPipeTemperatureProfile(input) {
  if (!isPlainObject(input)) return [];
  if (input.mode === "profile") {
    const specificLoss = input.specificLinearHeatLossInput
      ? calculateDhwSpecificLinearHeatLoss(input.specificLinearHeatLossInput)
      : null;
    const coefficient = input.exponentialCoefficientInput
      ? calculateDhwExponentialCoefficient({
          ...input.exponentialCoefficientInput,
          ...(specificLoss ? { specificLinearHeatLossWPerM: specificLoss.valueWPerM } : {})
        })
      : null;
    const temperatureAfterNonUse = input.temperatureAfterNonUseInput
      ? calculateDhwTemperatureAfterNonUseInterval({
          ...input.temperatureAfterNonUseInput,
          ...(coefficient ? { exponentialCoefficient: coefficient.value } : {})
        })
      : null;
    const average = input.averageTemperatureInput
      ? calculateDhwAverageTemperatureFromProfile({
          ...input.averageTemperatureInput,
          ...(temperatureAfterNonUse
            ? { temperatureAfterNonUseIntervalC: temperatureAfterNonUse.valueC }
            : {})
        })
      : null;
    return [specificLoss, coefficient, temperatureAfterNonUse, average].filter(Boolean);
  }
  if (input.mode === "simplified") {
    return [calculateDhwAverageTemperatureSimplified(input)];
  }
  return [];
}

function prepareDhwPipeSegments(segments = []) {
  const results = [];
  const prepared = segments.map(segment => {
    const meanTemperature = calculateDhwPipeMeanTemperature(segment.meanTemperatureInput);
    const linearTransmittance = calculateDhwPipeLinearTransmittance(segment.linearTransmittanceInput);
    const profileResults = calculateDhwPipeTemperatureProfile(segment.temperatureProfileInput);
    results.push(meanTemperature, linearTransmittance, ...profileResults);
    const averageFromProfile = profileResults.find(result => result.valueC !== undefined);
    return {
      ...segment,
      ...(meanTemperature ? { thetaWMeanC: meanTemperature.valueC } : {}),
      ...(averageFromProfile ? { thetaWMeanC: averageFromProfile.valueC } : {}),
      ...(linearTransmittance
        ? { linearTransmittanceWPerMK: linearTransmittance.valueWPerMK }
        : {})
    };
  });
  return { prepared, results: results.filter(Boolean) };
}

function calculateDhwDistributionLossContract(input, monthIndex, path) {
  const contract = monthlyComponent(input, monthIndex);
  if (!isPlainObject(contract)) return null;
  if (contract.mode !== "dhw_distribution_loss_components") return null;

  const results = [];
  let distributionLoss = null;
  let stubLoss = null;
  let recirculationNoDrawLoss = null;
  let recoverableLoss = null;
  let recoveryFactor = null;
  let recoveredHeat = null;

  if (
    !Array.isArray(contract.distributionPipeSegments) &&
    !Array.isArray(contract.stubPipeSegments) &&
    !Array.isArray(contract.recirculationNoDrawPipeSegments)
  ) {
    throw new Error(
      "dhw_distribution_loss_components requires distributionPipeSegments, stubPipeSegments or recirculationNoDrawPipeSegments"
    );
  }

  if (Array.isArray(contract.distributionPipeSegments)) {
    const prepared = prepareDhwPipeSegments(contract.distributionPipeSegments);
    results.push(...prepared.results);
    distributionLoss = calculateDhwDistributionLossWithRecirculation({
      pipeSegments: prepared.prepared,
      operationTimeHours: monthlyField(contract, "operationTimeHours", monthIndex)
    });
    results.push(distributionLoss);
  }
  if (Array.isArray(contract.stubPipeSegments)) {
    stubLoss = calculateDhwStubLossWithoutRecirculation({
      pipeSegments: contract.stubPipeSegments,
      waterDensityKgPerM3: contract.waterDensityKgPerM3 ?? MC001_DHW_WATER_DENSITY_KG_PER_M3,
      specificHeatKWhPerKgK: contract.specificHeatKWhPerKgK ?? 4.186 / 3600,
      thetaWDistributionC: contract.thetaWDistributionC,
      calculationIntervalHours: monthlyField(contract, "calculationIntervalHours", monthIndex)
    });
    results.push(stubLoss);
  }
  if (Array.isArray(contract.recirculationNoDrawPipeSegments)) {
    const prepared = prepareDhwPipeSegments(contract.recirculationNoDrawPipeSegments);
    results.push(...prepared.results);
    recirculationNoDrawLoss = calculateDhwRecirculationLossWithoutDrawOff({
      pipeSegments: prepared.prepared,
      operationTimeHours: monthlyField(contract, "operationTimeHours", monthIndex)
    });
    results.push(recirculationNoDrawLoss);
  }

  const total = calculateDhwTotalDistributionLoss({
    distributionLossKWh: distributionLoss?.valueKWh ?? 0,
    recirculationNoDrawLossKWh: recirculationNoDrawLoss?.valueKWh ?? 0,
    stubLossKWh: stubLoss?.valueKWh ?? 0
  });
  results.push(total);

  if (Array.isArray(contract.recoverablePipeSegments) && total.valueKWh > 0) {
    const prepared = prepareDhwPipeSegments(contract.recoverablePipeSegments);
    results.push(...prepared.results);
    recoverableLoss = calculateDhwRecoverableDistributionLoss({
      pipeSegments: prepared.prepared,
      operationTimeHours: monthlyField(contract, "operationTimeHours", monthIndex)
    });
    recoveryFactor = calculateDhwDistributionRecoveryFactor({
      recoverableDistributionLossKWh: recoverableLoss.valueKWh,
      totalDistributionLossKWh: total.valueKWh
    });
    recoveredHeat = calculateDhwRecoveredDistributionHeat({
      recoveryFactor: recoveryFactor.value,
      totalDistributionLossKWh: total.valueKWh
    });
    results.push(recoverableLoss, recoveryFactor, recoveredHeat);
  }

  return {
    value: total.valueKWh,
    source: calculatedStageSource({
      origin: "mc001_dhw_distribution_component_contract",
      reference: `${path}.lossCalculation`,
      results,
      details: {
        mode: contract.mode,
        recoveredHeatKWh: recoveredHeat?.valueKWh ?? null,
        recoveryFactor: recoveryFactor?.value ?? null
      }
    }),
    derivedFractions: {
      ...(recoveryFactor ? { lossRecoveredFraction: recoveryFactor.value } : {}),
      ...(recoveryFactor ? { lossRecoverableFractionToHeating: recoveryFactor.value } : {})
    }
  };
}

function calculateDhwStorageLossContract(input, monthIndex, path) {
  const contract = monthlyComponent(input, monthIndex);
  if (!isPlainObject(contract)) return null;
  if (contract.mode !== "dhw_storage_standing_loss_single_volume") return null;
  const result = calculateDhwStorageStandingLossSingleVolume({
    ...contract,
    calculationHours: monthlyField(contract, "calculationHours", monthIndex)
  });
  return {
    value: result.valueKWh,
    source: calculatedStageSource({
      origin: "mc001_dhw_storage_component_contract",
      reference: `${path}.lossCalculation`,
      results: [result],
      details: { mode: contract.mode }
    }),
    derivedFractions: {}
  };
}

function calculateDhwHeatTracingAuxiliaryContract(input, monthIndex, path) {
  const contract = monthlyComponent(input, monthIndex);
  if (!isPlainObject(contract)) return null;
  if (contract.mode !== "dhw_heat_tracing_auxiliary") return null;
  const prepared = prepareDhwPipeSegments(contract.protectedPipeSegments ?? []);
  const protectedLoss = calculateDhwHeatTracingProtectedPipeLoss({
    pipeSegments: prepared.prepared,
    operationTimeHours: monthlyField(contract, "operationTimeHours", monthIndex)
  });
  const auxiliary = calculateDhwHeatTracingAuxiliaryEnergy({
    protectedPipeDistributionLossKWh: protectedLoss.valueKWh
  });
  const recoverable = finiteNumber(contract.recoverableFraction)
    ? calculateDhwRecoverableAuxiliaryDistributionEnergy({
        recoverableFraction: contract.recoverableFraction,
        distributionAuxiliaryEnergyKWh: auxiliary.valueKWh
      })
    : null;
  const recovered = finiteNumber(contract.recoverableFraction)
    ? calculateDhwRecoveredAuxiliaryDistributionEnergy({
        recoverableFraction: contract.recoverableFraction,
        distributionAuxiliaryEnergyKWh: auxiliary.valueKWh
      })
    : null;
  const results = [...prepared.results, protectedLoss, auxiliary, recoverable, recovered].filter(Boolean);
  return {
    value: auxiliary.valueKWh,
    source: calculatedStageSource({
      origin: "mc001_dhw_heat_tracing_component_contract",
      reference: `${path}.auxiliaryCalculation`,
      results,
      details: {
        mode: contract.mode,
        recoverableAuxiliaryKWh: recoverable?.valueKWh ?? null,
        recoveredAuxiliaryKWh: recovered?.valueKWh ?? null
      }
    }),
    derivedFractions: {
      ...(finiteNumber(contract.recoverableFraction)
        ? { auxiliaryRecoverableFractionToHeating: contract.recoverableFraction }
        : {})
    }
  };
}

function calculateDhwPumpAuxiliaryContract(input, monthIndex, path) {
  const contract = monthlyComponent(input, monthIndex);
  if (!isPlainObject(contract)) return null;
  if (contract.mode !== "dhw_recirculation_pump_auxiliary") return null;
  const pressureDrop = contract.pressureDropInput
    ? calculateDhwPressureDrop(contract.pressureDropInput)
    : null;
  const designPower = calculateDhwPumpDesignPower({
    pressureDropKPa: pressureDrop?.valueKPa ?? contract.pressureDropKPa,
    designFlowRateM3PerH: contract.designFlowRateM3PerH
  });
  const referencePower = calculateDhwReferencePumpPower({
    pumpDesignPowerKW: designPower.valueKW
  });
  const efficiencyFactor = calculateDhwPumpEfficiencyFactor({
    referencePumpPowerKW: referencePower.valueKW,
    pumpDesignPowerKW: designPower.valueKW
  });
  const energyUseFactor = calculateDhwPumpEnergyUseFactor({
    pumpEfficiencyFactor: efficiencyFactor.value,
    controlConstantCp1: contract.controlConstantCp1,
    controlConstantCp2: contract.controlConstantCp2,
    operationLoadFactor: contract.operationLoadFactor,
    energyEfficiencyIndex: contract.energyEfficiencyIndex
  });
  const pumpEnergy = calculateDhwRecirculationPumpEnergy({
    pumpDesignPowerKW: designPower.valueKW,
    operationLoadFactor: contract.operationLoadFactor,
    annualOperationTimeHours: monthlyField(contract, "operationTimeHours", monthIndex),
    correctionFactor: contract.correctionFactor
  });
  const auxiliary = calculateDhwAuxiliaryDistributionEnergy({
    recirculationPumpEnergyKWh: pumpEnergy.valueKWh,
    pumpEnergyUseFactor: energyUseFactor.value
  });
  const recoverable = finiteNumber(contract.recoverableFraction)
    ? calculateDhwRecoverableAuxiliaryDistributionEnergy({
        recoverableFraction: contract.recoverableFraction,
        distributionAuxiliaryEnergyKWh: auxiliary.valueKWh
      })
    : null;
  const recovered = finiteNumber(contract.recoverableFraction)
    ? calculateDhwRecoveredAuxiliaryDistributionEnergy({
        recoverableFraction: contract.recoverableFraction,
        distributionAuxiliaryEnergyKWh: auxiliary.valueKWh
      })
    : null;
  const results = [
    pressureDrop,
    designPower,
    referencePower,
    efficiencyFactor,
    energyUseFactor,
    pumpEnergy,
    auxiliary,
    recoverable,
    recovered
  ].filter(Boolean);
  return {
    value: auxiliary.valueKWh,
    source: calculatedStageSource({
      origin: "mc001_dhw_pump_component_contract",
      reference: `${path}.auxiliaryCalculation`,
      results,
      details: {
        mode: contract.mode,
        recoverableAuxiliaryKWh: recoverable?.valueKWh ?? null,
        recoveredAuxiliaryKWh: recovered?.valueKWh ?? null
      }
    }),
    derivedFractions: {
      ...(finiteNumber(contract.recoverableFraction)
        ? { auxiliaryRecoverableFractionToHeating: contract.recoverableFraction }
        : {})
    }
  };
}

function stageContextValue(stageContext, field, fallback = null) {
  const value = stageContext?.[field];
  return finiteNumber(value) ? value : fallback;
}

function previousStage(stageContext, stageId) {
  return stageContext?.previousStages instanceof Map
    ? stageContext.previousStages.get(stageId)
    : null;
}

function previousStageValue(stageContext, stageId, field, fallback = 0) {
  const value = previousStage(stageContext, stageId)?.[field];
  return finiteNumber(value) ? value : fallback;
}

function contextMonthlyField(contract, field, monthIndex, fallback = null) {
  const value = monthlyField(contract, field, monthIndex);
  return value === undefined || value === null ? fallback : value;
}

function calculateCoolingDistributionLossContract(input, monthIndex, path, stageContext = {}) {
  const contract = monthlyComponent(input, monthIndex);
  if (!isPlainObject(contract)) return null;
  if (contract.mode !== "cooling_distribution_factor") return null;

  const result = calculateCoolingDistributionLoss({
    coolingLossFactor: contextMonthlyField(contract, "coolingLossFactor", monthIndex),
    usefulCoolingDemandKWh: contextMonthlyField(
      contract,
      "usefulCoolingDemandKWh",
      monthIndex,
      stageContextValue(stageContext, "allocatedUsefulDemandKWh")
    ),
    emissionLossKWh: contextMonthlyField(
      contract,
      "emissionLossKWh",
      monthIndex,
      previousStageValue(stageContext, "emission", "lossKWh")
    ),
    ahuCoolingOutputRequiredKWh: contextMonthlyField(
      contract,
      "ahuCoolingOutputRequiredKWh",
      monthIndex,
      0
    )
  });

  return {
    value: result.valueKWh,
    source: calculatedStageSource({
      origin: "mc001_cooling_distribution_factor_component_contract",
      reference: `${path}.lossCalculation`,
      results: [result],
      details: {
        mode: contract.mode,
        baseKWh: result.baseKWh ?? result.extra?.baseKWh ?? null
      }
    }),
    derivedFractions: {}
  };
}

function calculateCoolingDistributionAuxiliaryContract(input, monthIndex, path, stageContext = {}) {
  const contract = monthlyComponent(input, monthIndex);
  if (!isPlainObject(contract)) return null;
  if (contract.mode !== "cooling_distribution_factor") return null;

  const result = calculateCoolingDistributionAuxiliaryEnergy({
    auxiliaryFactor: contextMonthlyField(contract, "auxiliaryFactor", monthIndex),
    usefulCoolingDemandKWh: contextMonthlyField(
      contract,
      "usefulCoolingDemandKWh",
      monthIndex,
      stageContextValue(stageContext, "allocatedUsefulDemandKWh")
    ),
    emissionLossKWh: contextMonthlyField(
      contract,
      "emissionLossKWh",
      monthIndex,
      previousStageValue(stageContext, "emission", "lossKWh")
    ),
    ahuCoolingOutputRequiredKWh: contextMonthlyField(
      contract,
      "ahuCoolingOutputRequiredKWh",
      monthIndex,
      0
    )
  });

  return {
    value: result.valueKWh,
    source: calculatedStageSource({
      origin: "mc001_cooling_distribution_auxiliary_factor_component_contract",
      reference: `${path}.auxiliaryCalculation`,
      results: [result],
      details: {
        mode: contract.mode,
        baseKWh: result.baseKWh ?? result.extra?.baseKWh ?? null
      }
    }),
    derivedFractions: {}
  };
}

function coolingStorageThermalResult(contract, prefix, formulaId, branch, monthIndex) {
  const heatLossCoefficientKWPerK = contextMonthlyField(
    contract,
    `${prefix}HeatLossCoefficientKWPerK`,
    monthIndex,
    contract.heatLossCoefficientKWPerK
  );
  if (!finiteNumber(heatLossCoefficientKWPerK)) return null;
  return calculateCoolingStorageThermalLoss({
    heatLossCoefficientKWPerK,
    ambientTemperatureC: contextMonthlyField(
      contract,
      `${prefix}AmbientTemperatureC`,
      monthIndex,
      contextMonthlyField(contract, "ambientTemperatureC", monthIndex)
    ),
    storageTemperatureC: contextMonthlyField(
      contract,
      `${prefix}StorageTemperatureC`,
      monthIndex,
      contextMonthlyField(contract, "storageTemperatureC", monthIndex)
    ),
    calculationHours: contextMonthlyField(
      contract,
      `${prefix}CalculationHours`,
      monthIndex,
      contextMonthlyField(contract, "calculationHours", monthIndex)
    ),
    formulaId,
    branch
  });
}

function calculateCoolingStorageLossContract(input, monthIndex, path) {
  const contract = monthlyComponent(input, monthIndex);
  if (!isPlainObject(contract)) return null;
  if (contract.mode === "no_cooling_storage") {
    return noCoolingStorageBranch(path);
  }
  if (contract.mode !== "cooling_storage_thermal_losses") return null;

  const outputLoss = coolingStorageThermalResult(
    contract,
    "outputSide",
    "MC001_3_99_COOLING_STORAGE_OUTPUT_SIDE_THERMAL_LOSS",
    "output_side",
    monthIndex
  );
  const standbyLoss = coolingStorageThermalResult(
    contract,
    "standby",
    "MC001_3_100_COOLING_STORAGE_STANDBY_THERMAL_LOSS",
    "standby",
    monthIndex
  );
  const inputLoss = coolingStorageThermalResult(
    contract,
    "inputSide",
    "MC001_3_101_COOLING_STORAGE_INPUT_SIDE_THERMAL_LOSS",
    "input_side",
    monthIndex
  );
  if (!outputLoss && !standbyLoss && !inputLoss) {
    throw new Error("cooling_storage_thermal_losses requires at least one thermal-loss coefficient");
  }
  const outputSideLossKWh = outputLoss?.valueKWh ?? 0;
  const standbyLossKWh = standbyLoss?.valueKWh ?? 0;
  const inputSideLossKWh = inputLoss?.valueKWh ?? 0;
  const totalLossKWh = outputSideLossKWh + standbyLossKWh + inputSideLossKWh;
  if (totalLossKWh < 0) {
    throw new Error("cooling storage thermal-loss total must be non-negative for the Chapter 3 stage balance");
  }
  const recoverableThermal = finiteNumber(contract.recoverableStorageFraction)
    ? calculateCoolingStorageRecoverableThermalLoss({
        outputSideLossKWh,
        standbyLossKWh,
        inputSideLossKWh,
        recoverableStorageFraction: contract.recoverableStorageFraction
      })
    : null;
  const results = [outputLoss, standbyLoss, inputLoss, recoverableThermal].filter(Boolean);
  return {
    value: totalLossKWh,
    source: calculatedStageSource({
      origin: "mc001_cooling_storage_thermal_component_contract",
      reference: `${path}.lossCalculation`,
      results,
      details: {
        mode: contract.mode,
        outputSideLossKWh,
        standbyLossKWh,
        inputSideLossKWh,
        recoverableThermalLossKWh: recoverableThermal?.valueKWh ?? null
      }
    }),
    derivedFractions: {}
  };
}

function coolingStoragePumpSide(contract, side, formulaIds, monthIndex, fallbackEnergyKWh = null) {
  const storageEnergyKWh = contextMonthlyField(
    contract,
    `${side}StorageEnergyKWh`,
    monthIndex,
    fallbackEnergyKWh
  );
  if (!finiteNumber(storageEnergyKWh)) return null;
  const operation = calculateCoolingStoragePumpOperationTime({
    storageEnergyKWh,
    mediumSpecificHeatKWhPerKgK: contextMonthlyField(
      contract,
      `${side}MediumSpecificHeatKWhPerKgK`,
      monthIndex,
      contract.mediumSpecificHeatKWhPerKgK
    ),
    mediumDensityKgPerM3: contextMonthlyField(
      contract,
      `${side}MediumDensityKgPerM3`,
      monthIndex,
      contract.mediumDensityKgPerM3
    ),
    pumpVolumeFlowM3PerH: contextMonthlyField(
      contract,
      `${side}PumpVolumeFlowM3PerH`,
      monthIndex,
      contract.pumpVolumeFlowM3PerH
    ),
    supplyTemperatureC: contextMonthlyField(
      contract,
      `${side}SupplyTemperatureC`,
      monthIndex,
      contract.supplyTemperatureC
    ),
    returnTemperatureC: contextMonthlyField(
      contract,
      `${side}ReturnTemperatureC`,
      monthIndex,
      contract.returnTemperatureC
    ),
    formulaId: formulaIds.operation
  });
  const auxiliary = calculateCoolingStorageAuxiliaryEnergy({
    pumpOperationHours: operation.valueH,
    pumpElectricPowerKW: contextMonthlyField(
      contract,
      `${side}PumpElectricPowerKW`,
      monthIndex,
      contract.pumpElectricPowerKW
    ),
    formulaId: formulaIds.auxiliary
  });
  return { operation, auxiliary };
}

function calculateCoolingStorageAuxiliaryContract(input, monthIndex, path, stageContext = {}) {
  const contract = monthlyComponent(input, monthIndex);
  if (!isPlainObject(contract)) return null;
  if (contract.mode === "no_cooling_storage") {
    return noCoolingStorageBranch(path, "auxiliaryCalculation");
  }
  if (contract.mode !== "cooling_storage_pump_auxiliary") return null;

  const output = coolingStoragePumpSide(
    contract,
    "outputSide",
    {
      operation: "MC001_3_115_COOLING_STORAGE_OUTPUT_PUMP_OPERATION_TIME",
      auxiliary: "MC001_3_116_COOLING_STORAGE_OUTPUT_AUXILIARY_ENERGY"
    },
    monthIndex,
    stageContextValue(stageContext, "stageOutputKWh")
  );
  const inputSide = coolingStoragePumpSide(
    contract,
    "inputSide",
    {
      operation: "MC001_3_117_COOLING_STORAGE_INPUT_PUMP_OPERATION_TIME",
      auxiliary: "MC001_3_118_COOLING_STORAGE_INPUT_AUXILIARY_ENERGY"
    },
    monthIndex,
    0
  );
  if (!output && !inputSide) {
    throw new Error("cooling_storage_pump_auxiliary requires outputSideStorageEnergyKWh or inputSideStorageEnergyKWh");
  }
  const outputSideAuxiliaryKWh = output?.auxiliary.valueKWh ?? 0;
  const inputSideAuxiliaryKWh = inputSide?.auxiliary.valueKWh ?? 0;
  const total = calculateCoolingStorageAuxiliaryTotal({
    outputSideAuxiliaryKWh,
    inputSideAuxiliaryKWh
  });
  const recoverableAux = finiteNumber(contract.recoverableAuxiliaryFraction)
    ? calculateCoolingStorageRecoverableAuxiliaryLoss({
        auxiliaryEnergyKWh: total.valueKWh,
        recoverableAuxiliaryFraction: contract.recoverableAuxiliaryFraction
      })
    : null;
  const recoverableTotal =
    recoverableAux && finiteNumber(contract.thermalRecoverableLossKWh)
      ? calculateCoolingStorageRecoverableLossTotal({
          auxiliaryRecoverableLossKWh: recoverableAux.valueKWh,
          thermalRecoverableLossKWh: contract.thermalRecoverableLossKWh
        })
      : null;
  const results = [
    output?.operation,
    output?.auxiliary,
    inputSide?.operation,
    inputSide?.auxiliary,
    total,
    recoverableAux,
    recoverableTotal
  ].filter(Boolean);
  return {
    value: total.valueKWh,
    source: calculatedStageSource({
      origin: "mc001_cooling_storage_pump_component_contract",
      reference: `${path}.auxiliaryCalculation`,
      results,
      details: {
        mode: contract.mode,
        outputSideAuxiliaryKWh,
        inputSideAuxiliaryKWh,
        recoverableAuxiliaryLossKWh: recoverableAux?.valueKWh ?? null,
        recoverableLossTotalKWh: recoverableTotal?.valueKWh ?? null
      }
    }),
    derivedFractions: {}
  };
}

function explicitResult({ formulaId, value, valueKey = "value", unit, formulaText, inputs }) {
  return {
    status: "calculated",
    value,
    [valueKey]: value,
    unit,
    formulaId,
    executionTrace: {
      schema: "mc001_execution_trace_v1",
      chapter: "3",
      formulaId,
      branchId: "explicit_component_input",
      inputs,
      formulaText,
      rawResult: value,
      finalResult: value,
      unit,
      clampApplied: false,
      status: "direct_result",
      provenance: {
        source: "Chapter 3 component/product data supplied through Building DNA",
        classification: "PRODUCT_DATA"
      }
    }
  };
}

function coolingEerCorrection(contract, monthIndex, derived = {}) {
  if (isPlainObject(contract.eerCorrectionInput)) {
    return calculateCoolingEerTemperatureCorrectionFactor({
      ...contract.eerCorrectionInput,
      ...(contract.eerCorrectionInput.generatorRequiredOutletTemperatureC === undefined &&
      finiteNumber(derived.generatorRequiredOutletTemperatureC)
        ? { generatorRequiredOutletTemperatureC: derived.generatorRequiredOutletTemperatureC }
        : {}),
      ...(contract.eerCorrectionInput.heatRejectionReferenceInletTemperatureC === undefined &&
      finiteNumber(derived.heatRejectionReferenceInletTemperatureC)
        ? { heatRejectionReferenceInletTemperatureC: derived.heatRejectionReferenceInletTemperatureC }
        : {})
    });
  }
  const value = contextMonthlyField(contract, "eerCorrectionFactor", monthIndex);
  if (!finitePositive(value)) {
    throw new Error("cooling_compression_heat_rejection_auxiliary requires eerCorrectionFactor or eerCorrectionInput");
  }
  return explicitResult({
    formulaId: "MC001_3_155_COOLING_EER_TEMPERATURE_CORRECTION_PRODUCT_INPUT",
    value,
    unit: "-",
    formulaText: "fEER,corr supplied as product/engineering input",
    inputs: { eerCorrectionFactor: value }
  });
}

function coolingGeneratorTemperatureResults(contract, monthIndex) {
  const results = [];
  const outletInput = monthlyComponent(
    contract.generatorOutletTemperatureSelection ?? contract.outletTemperatureSelection,
    monthIndex
  );
  const compensatedInput = monthlyComponent(
    contract.distributionInletOutdoorCompensationInput,
    monthIndex
  );
  let generatorRequiredOutletTemperatureC = null;

  if (isPlainObject(outletInput)) {
    const outlet = selectCoolingGeneratorOutletTemperature(outletInput);
    results.push(outlet);
    generatorRequiredOutletTemperatureC = outlet.valueC;
  }
  if (isPlainObject(compensatedInput)) {
    const compensated = calculateCoolingDistributionInletOutdoorCompensatedTemperature(
      compensatedInput
    );
    results.push(compensated);
    if (!finiteNumber(generatorRequiredOutletTemperatureC)) {
      generatorRequiredOutletTemperatureC = compensated.valueC;
    }
  }

  return { results, generatorRequiredOutletTemperatureC };
}

function coolingGeneratorInputRequired(contract, monthIndex, stageContext = {}) {
  const mode = contract.generatorInputRequirementMode;
  if (!mode) return null;
  const usefulCoolingDemandKWh = contextMonthlyField(
    contract,
    "usefulCoolingDemandKWh",
    monthIndex,
    stageContextValue(stageContext, "allocatedUsefulDemandKWh", 0)
  );
  const emissionLossKWh = contextMonthlyField(
    contract,
    "emissionLossKWh",
    monthIndex,
    stageContext.previousStages?.get("emission")?.lossKWh ?? 0
  );
  const ahuCoolingOutputRequiredKWh = contextMonthlyField(
    contract,
    "ahuCoolingOutputRequiredKWh",
    monthIndex,
    0
  );
  if (mode === "direct_expansion") {
    return calculateCoolingGeneratorInputRequiredDirectExpansion({
      usefulCoolingDemandKWh,
      emissionLossKWh,
      ahuCoolingOutputRequiredKWh
    });
  }
  if (mode === "air_water") {
    return calculateCoolingGeneratorInputRequiredAirWater({
      usefulCoolingDemandKWh,
      emissionLossKWh,
      ahuCoolingOutputRequiredKWh,
      distributionLossKWh: contextMonthlyField(
        contract,
        "distributionLossKWh",
        monthIndex,
        stageContext.previousStages?.get("distribution")?.lossKWh ?? 0
      ),
      auxiliaryDistributionEnergyKWh: contextMonthlyField(
        contract,
        "auxiliaryDistributionEnergyKWh",
        monthIndex,
        stageContext.previousStages?.get("distribution")?.auxiliaryKWh ?? 0
      ),
      auxiliaryHeatFraction: contextMonthlyField(contract, "auxiliaryHeatFraction", monthIndex)
    });
  }
  throw new Error("cooling generator input requirement mode must be direct_expansion or air_water");
}

function coolingHeatRejectionAuxiliary(contract, heatRejectedKWh) {
  if (contract.heatRejectionAuxiliaryMode === "air_cooled_zero") {
    return {
      lookupResults: [],
      result: calculateCoolingHeatRejectionAuxiliaryAirCooledZero()
    };
  }
  if (contract.heatRejectionAuxiliaryMode !== "specific_electric_demand") {
    throw new Error("cooling generator auxiliary requires heatRejectionAuxiliaryMode");
  }
  const specific = contract.heatRejectionSpecificDemandKey
    ? lookupCoolingHeatRejectionSpecificElectricDemandTable322({
        systemKey: contract.heatRejectionSpecificDemandKey
      })
    : explicitResult({
        formulaId: "MC001_TABLE_3_22_HEAT_REJECTION_SPECIFIC_ELECTRIC_DEMAND_PRODUCT_INPUT",
        value: contract.heatRejectionSpecificElectricDemandKWPerKW,
        valueKey: "valueKWPerKW",
        unit: "kW/kW",
        formulaText: "phr,el supplied as product/engineering input",
        inputs: {
          heatRejectionSpecificElectricDemandKWPerKW:
            contract.heatRejectionSpecificElectricDemandKWPerKW
        }
      });
  const partLoad = contract.heatRejectionElectricPartLoadControlKey &&
    contract.heatRejectionElectricPartLoadTypeKey
    ? lookupCoolingHeatRejectionElectricPartLoadFactorTable323({
        controlKey: contract.heatRejectionElectricPartLoadControlKey,
        rejectionTypeKey: contract.heatRejectionElectricPartLoadTypeKey
      })
    : explicitResult({
        formulaId: "MC001_TABLE_3_23_HEAT_REJECTION_ELECTRIC_PART_LOAD_FACTOR_PRODUCT_INPUT",
        value: contract.heatRejectionElectricPartLoadFactor,
        unit: "-",
        formulaText: "fhr,PL,el supplied as product/engineering input",
        inputs: {
          heatRejectionElectricPartLoadFactor: contract.heatRejectionElectricPartLoadFactor
        }
      });
  const freeCoolingElectricFactor = contract.freeCoolingElectricFactor;
  if (!finitePositive(freeCoolingElectricFactor)) {
    throw new Error("cooling heat-rejection auxiliary requires freeCoolingElectricFactor");
  }
  const result = calculateCoolingHeatRejectionAuxiliaryEnergy({
    heatRejectedKWh,
    specificElectricDemandKWPerKW: specific.valueKWPerKW ?? specific.value,
    electricPartLoadFactor: partLoad.value,
    freeCoolingElectricFactor
  });
  return { lookupResults: [specific, partLoad], result };
}

function coolingHeatRejectionReferenceResults(contract, monthIndex) {
  const results = [];
  let heatRejectionReferenceInletTemperatureC = null;
  let heatRejectionReferenceOutletTemperatureC = null;
  const processDefaultsInput = monthlyComponent(contract.heatRejectionProcessDefaultsInput, monthIndex);
  const referenceTableInput = monthlyComponent(contract.heatRejectionReferenceTableInput, monthIndex);
  const referenceSelectionInput = monthlyComponent(contract.heatRejectionReferenceSelection, monthIndex);

  if (isPlainObject(processDefaultsInput)) {
    results.push(lookupCoolingHeatRejectionProcessDefaultsTable318(processDefaultsInput));
  }
  if (isPlainObject(referenceTableInput)) {
    const table = lookupCoolingHeatRejectionReferenceTemperaturesTable319(referenceTableInput);
    results.push(table);
    heatRejectionReferenceInletTemperatureC = table.heatRejectionReferenceInletTemperatureC;
    heatRejectionReferenceOutletTemperatureC = table.heatRejectionReferenceOutletTemperatureC;
  }
  if (isPlainObject(referenceSelectionInput)) {
    const selected = selectCoolingHeatRejectionReferenceTemperatures(referenceSelectionInput);
    results.push(selected);
    heatRejectionReferenceInletTemperatureC = selected.referenceC;
    heatRejectionReferenceOutletTemperatureC =
      selected.referenceOutletC ?? heatRejectionReferenceOutletTemperatureC;
  }

  return {
    results,
    heatRejectionReferenceInletTemperatureC,
    heatRejectionReferenceOutletTemperatureC
  };
}

function coolingHeatRejectionOperationalResults({
  contract,
  monthIndex,
  heatRejectedKWh,
  generatorInputKWh,
  partLoadValue,
  nominalEer,
  eerCorrectionFactor,
  operationHours,
  referenceInletTemperatureC,
  referenceOutletTemperatureC
}) {
  const results = [];
  let selectedTemperatureC = null;
  let waterInletTemperatureC = null;
  let recoverableHeatKWh = null;

  const temperatureSelection = monthlyComponent(contract.heatRejectionTemperatureSelection, monthIndex);
  if (isPlainObject(temperatureSelection)) {
    const selected = selectCoolingHeatRejectionTemperature(temperatureSelection);
    results.push(selected);
    selectedTemperatureC = selected.valueC;
  }

  const polynomialInput = monthlyComponent(contract.heatRejectionPartLoadPolynomialInput, monthIndex);
  if (isPlainObject(polynomialInput)) {
    const lookup = polynomialInput.systemKey
      ? lookupCoolingHeatRejectionPolynomialCoefficientsTable320({
          systemKey: polynomialInput.systemKey
        })
      : null;
    const coefficients = lookup
      ? { a2: lookup.a2, a1: lookup.a1, a0: lookup.a0 }
      : polynomialInput;
    if (lookup) results.push(lookup);
    results.push(calculateCoolingHeatRejectionPartLoadFactor({
      temperatureC: contextMonthlyField(
        polynomialInput,
        "temperatureC",
        monthIndex,
        selectedTemperatureC
      ),
      a2: coefficients.a2,
      a1: coefficients.a1,
      a0: coefficients.a0
    }));
  }

  const waterInput = monthlyComponent(contract.waterHeatRejectionInletTemperatureInput, monthIndex);
  if (isPlainObject(waterInput)) {
    const water = calculateCoolingWaterHeatRejectionInletTemperature({
      ...waterInput,
      heatRejectedKWh: waterInput.heatRejectedKWh ?? heatRejectedKWh,
      operationHours: waterInput.operationHours ?? operationHours,
      referenceInletTemperatureC:
        waterInput.referenceInletTemperatureC ?? referenceInletTemperatureC,
      referenceOutletTemperatureC:
        waterInput.referenceOutletTemperatureC ?? referenceOutletTemperatureC
    });
    results.push(water);
    waterInletTemperatureC = water.valueC;
  }

  const wetInput = monthlyComponent(contract.wetHeatRejectionWaterTemperatureInput, monthIndex);
  if (isPlainObject(wetInput)) {
    results.push(calculateCoolingWetHeatRejectionWaterTemperature(wetInput));
  }
  const dryInput = monthlyComponent(contract.dryHeatRejectionWaterTemperatureInput, monthIndex);
  if (isPlainObject(dryInput)) {
    results.push(calculateCoolingDryHeatRejectionWaterTemperature(dryInput));
  }

  const recoverableMode = contract.recoverableHeatMode;
  if (recoverableMode === "zero") {
    const zero = calculateCoolingRecoverableHeatZero();
    const undefinedTemperature = calculateCoolingRecoverableHeatTemperatureUndefined();
    results.push(zero, undefinedTemperature);
    recoverableHeatKWh = zero.valueKWh;
  } else if (recoverableMode === "compression") {
    const recoverable = calculateCoolingRecoverableHeatByCompression({
      generatorCoolingInputKWh: generatorInputKWh,
      nominalEer,
      partLoadFactor: partLoadValue,
      eerCorrectionFactor
    });
    results.push(recoverable);
    recoverableHeatKWh = recoverable.valueKWh;
  } else if (recoverableMode === "absorption") {
    const nominalHeatRatio = contextMonthlyField(contract, "nominalHeatRatio", monthIndex);
    const recoverable = calculateCoolingRecoverableHeatByAbsorption({
      generatorCoolingInputKWh: generatorInputKWh,
      nominalHeatRatio,
      partLoadFactor: partLoadValue
    });
    results.push(recoverable);
    recoverableHeatKWh = recoverable.valueKWh;
  } else if (recoverableMode !== undefined) {
    throw new Error("cooling recoverableHeatMode must be zero, compression or absorption");
  }

  const maxTemperatureInput = monthlyComponent(contract.recoverableHeatMaximumTemperatureInput, monthIndex);
  if (isPlainObject(maxTemperatureInput) || finiteNumber(waterInletTemperatureC)) {
    const maximumTemperature = calculateCoolingRecoverableHeatMaximumTemperature({
      waterHeatRejectionInletTemperatureC:
        maxTemperatureInput?.waterHeatRejectionInletTemperatureC ?? waterInletTemperatureC
    });
    results.push(maximumTemperature);
  }

  const afterRecoveryInput = monthlyComponent(contract.heatRejectedAfterRecoveryInput, monthIndex);
  if (isPlainObject(afterRecoveryInput)) {
    results.push(calculateCoolingHeatRejectedAfterRecovery({
      recoverableHeatKWh: afterRecoveryInput.recoverableHeatKWh ?? recoverableHeatKWh,
      requiredRecoveredHeatKWh: contextMonthlyField(
        afterRecoveryInput,
        "requiredRecoveredHeatKWh",
        monthIndex
      )
    }));
  }

  const absorptionInput = monthlyComponent(contract.absorptionGeneratorInput, monthIndex);
  if (isPlainObject(absorptionInput)) {
    const absorptionHeat = calculateCoolingAbsorptionHeatInput({
      generatorCoolingInputKWh: absorptionInput.generatorCoolingInputKWh ?? generatorInputKWh,
      partLoadValue: absorptionInput.partLoadValue ?? partLoadValue,
      nominalHeatRatio: absorptionInput.nominalHeatRatio
    });
    const absorptionRatio = calculateCoolingAbsorptionPerformanceRatio({
      generatorCoolingInputKWh: absorptionInput.generatorCoolingInputKWh ?? generatorInputKWh,
      absorptionHeatInputKWh: absorptionHeat.valueKWh
    });
    const rejected = calculateCoolingHeatRejectedByAbsorption({
      generatorCoolingInputKWh: absorptionInput.generatorCoolingInputKWh ?? generatorInputKWh,
      nominalHeatRatio: absorptionInput.nominalHeatRatio,
      partLoadFactor: absorptionInput.partLoadValue ?? partLoadValue
    });
    results.push(absorptionHeat, absorptionRatio, rejected);
  }

  return results;
}

function coolingHeatRejectionDistributionAuxiliary(contract, heatRejectedKWh) {
  if (contract.heatRejectionDistributionAuxiliaryMode === "air_cooled_zero") {
    return calculateCoolingHeatRejectionDistributionAuxiliaryAirCooledZero();
  }
  if (contract.heatRejectionDistributionAuxiliaryMode !== "specific_electric_demand") {
    throw new Error("cooling generator auxiliary requires heatRejectionDistributionAuxiliaryMode");
  }
  return calculateCoolingHeatRejectionDistributionAuxiliaryEnergy({
    heatRejectedKWh,
    distributionSpecificElectricDemandKWPerKW:
      contract.heatRejectionDistributionSpecificElectricDemandKWPerKW
  });
}

function coolingControlAuxiliary(contract, monthIndex) {
  const controlPowersKW = Array.isArray(contract.controlPowersKW)
    ? contract.controlPowersKW
    : (finiteNumber(contract.controlPowerKW) ? [contract.controlPowerKW] : null);
  if (!controlPowersKW) {
    throw new Error("cooling generator auxiliary requires controlPowersKW or controlPowerKW");
  }
  return calculateCoolingControlAuxiliaryEnergy({
    operationHours: contextMonthlyField(contract, "operationHours", monthIndex),
    controlPowersKW
  });
}

function calculateCoolingGeneratorAuxiliaryContract(input, monthIndex, path, stageContext = {}) {
  const contract = monthlyComponent(input, monthIndex);
  if (!isPlainObject(contract)) return null;
  if (contract.mode !== "cooling_compression_heat_rejection_auxiliary") return null;

  const temperatureResolution = coolingGeneratorTemperatureResults(contract, monthIndex);
  const heatRejectionReference = coolingHeatRejectionReferenceResults(contract, monthIndex);
  const generatorInputRequirement = coolingGeneratorInputRequired(
    contract,
    monthIndex,
    stageContext
  );
  const generatorInputRequiredKWh =
    generatorInputRequirement?.valueKWh ??
    contextMonthlyField(
      contract,
      "generatorInputRequiredKWh",
      monthIndex,
      stageContextValue(stageContext, "stageOutputKWh")
    );
  const operationHours = contextMonthlyField(contract, "operationHours", monthIndex);
  const nominalCoolingPowerKW = contextMonthlyField(contract, "nominalCoolingPowerKW", monthIndex);
  const nominalEer = contextMonthlyField(contract, "nominalEer", monthIndex);
  const load = calculateCoolingPartLoadFactor({
    generatorInputRequiredKWh,
    operationHours,
    nominalCoolingPowerKW
  });
  const partLoadBin = selectCoolingPartLoadBin({ partLoadFactor: load.value });
  const available = calculateCoolingGeneratorInputByCapacityLimit({
    generatorInputRequiredKWh,
    operationHours,
    nominalCoolingPowerKW
  });
  if (
    available.valueKWh + 1e-9 < generatorInputRequiredKWh &&
    contract.allowCapacityLimitedGeneratorInput !== true
  ) {
    throw new Error("cooling generator capacity is insufficient for the requested monthly load");
  }
  const covered = calculateCoolingCoveredPartLoadFactor({
    generatorInputKWh: available.valueKWh,
    generatorInputRequiredKWh
  });
  const limitedExtractedEnergy = contract.calculateCapacityLimitedExtractedEnergy === true
    ? calculateCoolingExtractedEnergyLimitedByGenerator({
        requiredEnergyKWh: contextMonthlyField(
          contract,
          "requiredExtractedEnergyKWh",
          monthIndex,
          stageContextValue(stageContext, "allocatedUsefulDemandKWh", generatorInputRequiredKWh)
        ),
        generatorInputRequiredKWh,
        generatorInputAvailableKWh: available.valueKWh,
        formulaId: contract.capacityLimitedExtractedEnergyFormulaId
      })
    : null;
  const eerCorrection = coolingEerCorrection(contract, monthIndex, {
    generatorRequiredOutletTemperatureC:
      temperatureResolution.generatorRequiredOutletTemperatureC,
    heatRejectionReferenceInletTemperatureC:
      heatRejectionReference.heatRejectionReferenceInletTemperatureC
  });
  const compressionElectric = calculateCoolingCompressionElectricInput({
    generatorCoolingInputKWh: available.valueKWh,
    partLoadValue: partLoadBin.value,
    nominalEer,
    eerCorrectionFactor: eerCorrection.value
  });
  const heatRejected = calculateCoolingHeatRejectedByCompression({
    generatorCoolingInputKWh: available.valueKWh,
    nominalEer,
    partLoadFactor: partLoadBin.value,
    eerCorrectionFactor: eerCorrection.value
  });
  const heatRejectionOperationalResults = coolingHeatRejectionOperationalResults({
    contract,
    monthIndex,
    heatRejectedKWh: heatRejected.valueKWh,
    generatorInputKWh: available.valueKWh,
    partLoadValue: partLoadBin.value,
    nominalEer,
    eerCorrectionFactor: eerCorrection.value,
    operationHours,
    referenceInletTemperatureC:
      heatRejectionReference.heatRejectionReferenceInletTemperatureC,
    referenceOutletTemperatureC:
      heatRejectionReference.heatRejectionReferenceOutletTemperatureC
  });
  const heatRejectionAuxiliary = coolingHeatRejectionAuxiliary(
    contract,
    heatRejected.valueKWh
  );
  const heatRejectionDistributionAuxiliary =
    coolingHeatRejectionDistributionAuxiliary(contract, heatRejected.valueKWh);
  const controlAuxiliary = coolingControlAuxiliary(contract, monthIndex);
  const total = calculateCoolingGeneratorAuxiliaryTotal({
    heatRejectionAuxiliaryKWh: heatRejectionAuxiliary.result.valueKWh,
    heatRejectionDistributionAuxiliaryKWh: heatRejectionDistributionAuxiliary.valueKWh,
    controlAuxiliaryKWh: controlAuxiliary.valueKWh
  });
  const deliveredElectric = calculateCoolingCompressionDeliveredElectricInput({
    compressionElectricInputKWh: compressionElectric.valueKWh,
    auxiliaryElectricInputKWh: total.valueKWh
  });
  const effectiveEer = calculateCoolingCompressionEer({
    generatorCoolingInputKWh: available.valueKWh,
    compressionElectricInputKWh: compressionElectric.valueKWh,
    auxiliaryElectricInputKWh: total.valueKWh
  });
  const results = [
    ...temperatureResolution.results,
    generatorInputRequirement,
    ...heatRejectionReference.results,
    load,
    partLoadBin,
    available,
    covered,
    limitedExtractedEnergy,
    eerCorrection,
    compressionElectric,
    heatRejected,
    ...heatRejectionOperationalResults,
    ...heatRejectionAuxiliary.lookupResults,
    heatRejectionAuxiliary.result,
    heatRejectionDistributionAuxiliary,
    controlAuxiliary,
    total,
    deliveredElectric,
    effectiveEer
  ].filter(Boolean);
  return {
    value: total.valueKWh,
    source: calculatedStageSource({
      origin: "mc001_cooling_compression_heat_rejection_auxiliary_contract",
      reference: `${path}.auxiliaryCalculation`,
      results,
      details: {
        mode: contract.mode,
        generatorInputRequiredKWh,
        generatorCoolingInputKWh: available.valueKWh,
        capacityLimited: available.valueKWh + 1e-9 < generatorInputRequiredKWh,
        coveredPartLoadFactor: covered.value,
        compressionElectricInputKWh: compressionElectric.valueKWh,
        heatRejectedKWh: heatRejected.valueKWh,
        heatRejectionAuxiliaryKWh: heatRejectionAuxiliary.result.valueKWh,
        heatRejectionDistributionAuxiliaryKWh: heatRejectionDistributionAuxiliary.valueKWh,
        controlAuxiliaryKWh: controlAuxiliary.valueKWh,
        deliveredElectricInputKWh: deliveredElectric.valueKWh,
        effectiveEer: effectiveEer.value
      }
    }),
    derivedFractions: {},
    stageInputOverride: {
      valueKWh: deliveredElectric.valueKWh,
      result: deliveredElectric,
      source: calculatedStageSource({
        origin: "mc001_cooling_compression_delivered_electric_contract",
        reference: `${path}.auxiliaryCalculation.deliveredElectricInput`,
        results: [compressionElectric, total, deliveredElectric],
        details: {
          mode: contract.mode,
          compressionElectricInputKWh: compressionElectric.valueKWh,
          auxiliaryElectricInputKWh: total.valueKWh,
          deliveredElectricInputKWh: deliveredElectric.valueKWh
        }
      })
    }
  };
}

function calculatedStageLoss(stage, service, stageId, monthIndex, path, diagnostics, stageOutputKWh, stageContext = {}) {
  try {
    if (service === "heating" && stageId === "emission") {
      return calculateHeatingEmissionLossContract(
        stage.lossCalculation,
        monthIndex,
        path,
        stageOutputKWh
      );
    }
    if (service === "heating" && stageId === "storage") {
      const contract = monthlyComponent(stage.lossCalculation, monthIndex);
      if (isPlainObject(contract) && contract.mode === "no_heating_storage") {
        return noHeatingStorageBranch(path);
      }
    }
    if (service === "heating" && stageId === "generation") {
      return calculateHeatingGeneratorLossContract(
        stage.lossCalculation,
        monthIndex,
        path,
        stageOutputKWh
      );
    }
    if (service === "dhw" && stageId === "distribution") {
      return calculateDhwDistributionLossContract(stage.lossCalculation, monthIndex, path);
    }
    if (service === "dhw" && stageId === "storage") {
      return calculateDhwStorageLossContract(stage.lossCalculation, monthIndex, path);
    }
    if (service === "cooling" && stageId === "distribution") {
      return calculateCoolingDistributionLossContract(
        stage.lossCalculation,
        monthIndex,
        path,
        stageContext
      );
    }
    if (service === "cooling" && stageId === "storage") {
      return calculateCoolingStorageLossContract(stage.lossCalculation, monthIndex, path);
    }
  } catch (error) {
    diagnostics.push(diagnostic("invalid_chapter3_stage_loss_component_contract", path, error.message));
  }
  return null;
}

function calculatedStageAuxiliary(stage, service, stageId, monthIndex, path, diagnostics, stageOutputKWh, stageContext = {}) {
  try {
    if (service === "heating" && stageId === "distribution") {
      return calculateHeatingHydronicPumpAuxiliaryContract(
        stage.auxiliaryCalculation,
        monthIndex,
        path
      );
    }
    if (service === "heating" && stageId === "generation") {
      return calculateHeatingGeneratorAuxiliaryContract(
        stage.auxiliaryCalculation,
        monthIndex,
        path,
        stageOutputKWh
      );
    }
    if (service === "dhw" && stageId === "distribution") {
      return (
        calculateDhwPumpAuxiliaryContract(stage.auxiliaryCalculation, monthIndex, path) ??
        calculateDhwHeatTracingAuxiliaryContract(stage.auxiliaryCalculation, monthIndex, path)
      );
    }
    if (service === "cooling" && stageId === "distribution") {
      return calculateCoolingDistributionAuxiliaryContract(
        stage.auxiliaryCalculation,
        monthIndex,
        path,
        stageContext
      );
    }
    if (service === "cooling" && stageId === "storage") {
      return calculateCoolingStorageAuxiliaryContract(
        stage.auxiliaryCalculation,
        monthIndex,
        path,
        {
          ...stageContext,
          stageOutputKWh
        }
      );
    }
    if (service === "cooling" && stageId === "generation") {
      return calculateCoolingGeneratorAuxiliaryContract(
        stage.auxiliaryCalculation,
        monthIndex,
        path,
        {
          ...stageContext,
          stageOutputKWh
        }
      );
    }
  } catch (error) {
    diagnostics.push(diagnostic("invalid_chapter3_stage_auxiliary_component_contract", path, error.message));
  }
  return null;
}

function monthlyFieldWithFallback(record, field, monthIndex, fallback) {
  const value = monthlyField(record, field, monthIndex);
  return value === undefined || value === null ? fallback : value;
}

function calculatedVentilationHeatRecoveryAuxiliary(system, monthIndex, path) {
  const contract = monthlyComponent(system.heatRecoveryAuxiliaryCalculation, monthIndex);
  if (!isPlainObject(contract)) return null;
  const fan = system.fanElectricEnergyInput ?? {};
  const calculationHours = monthlyFieldWithFallback(
    contract,
    "calculationHours",
    monthIndex,
    fan.calculationHours
  );
  let result = null;
  if (contract.mode === "rotary_heat_recovery_auxiliary") {
    result = calculateRotaryHeatRecoveryAuxiliaryEnergy({
      maxRotaryPowerKW: contract.maxRotaryPowerKW,
      calculationHours,
      rotationRatio: monthlyField(contract, "rotationRatio", monthIndex)
    });
  } else if (contract.mode === "pump_heat_recovery_auxiliary") {
    result = calculatePumpHeatRecoveryAuxiliaryEnergy({
      supplyAirFlowM3PerH: contract.supplyAirFlowM3PerH ?? fan.supplyAirFlowM3PerH,
      outdoorAirFraction: contract.outdoorAirFraction,
      maxPumpSpecificPowerKWhPerM3: contract.maxPumpSpecificPowerKWhPerM3,
      calculationHours,
      minimumPartLoadFactor: contract.minimumPartLoadFactor,
      recoveredHeatKWh: monthlyField(contract, "recoveredHeatKWh", monthIndex),
      maxRecoveredHeatPowerKW: contract.maxRecoveredHeatPowerKW
    });
  } else if (contract.mode === "other_heat_recovery_auxiliary_zero") {
    result = calculateOtherHeatRecoveryAuxiliaryEnergy();
  }
  if (!result) return null;
  return {
    value: result.valueKWh,
    source: calculatedComponentSource({
      origin: "mc001_ventilation_heat_recovery_auxiliary_contract",
      reference: `${path}.heatRecoveryAuxiliaryCalculation`,
      results: [result],
      details: { mode: contract.mode }
    })
  };
}

function calculatedVentilationPreheatAuxiliary(system, monthIndex, path) {
  const contract = monthlyComponent(system.preheatAuxiliaryCalculation, monthIndex);
  if (!isPlainObject(contract)) return null;
  const fan = system.fanElectricEnergyInput ?? {};
  const calculationHours = monthlyFieldWithFallback(
    contract,
    "calculationHours",
    monthIndex,
    fan.calculationHours
  );
  let result = null;
  if (contract.mode === "preheater_energy") {
    result = calculatePreheaterEnergy({
      airDensityKgPerM3: contract.airDensityKgPerM3,
      airSpecificHeatKJPerKgK: contract.airSpecificHeatKJPerKgK,
      supplyAirFlowM3PerH: contract.supplyAirFlowM3PerH ?? fan.supplyAirFlowM3PerH,
      outdoorAirFraction: contract.outdoorAirFraction,
      frostProtectionTemperatureC: monthlyField(contract, "frostProtectionTemperatureC", monthIndex),
      outdoorTemperatureC: monthlyField(contract, "outdoorTemperatureC", monthIndex),
      calculationHours
    });
  } else if (contract.mode === "no_preheater") {
    result = calculateNoPreheaterEnergy();
  }
  if (!result) return null;
  return {
    value: result.valueKWh,
    source: calculatedComponentSource({
      origin: "mc001_ventilation_preheat_auxiliary_contract",
      reference: `${path}.preheatAuxiliaryCalculation`,
      results: [result],
      details: { mode: contract.mode }
    })
  };
}

function calculatedVentilationControlAuxiliary(system, monthIndex, path) {
  const contract = monthlyComponent(system.controlAuxiliaryCalculation, monthIndex);
  if (!isPlainObject(contract)) return null;
  const fan = system.fanElectricEnergyInput ?? {};
  if (contract.mode !== "control_auxiliary_energy") return null;
  const result = calculateVentilationControlAuxiliaryEnergy({
    controllerPowerKW: contract.controllerPowerKW,
    operationFactor: monthlyField(contract, "operationFactor", monthIndex),
    calculationHours: monthlyFieldWithFallback(
      contract,
      "calculationHours",
      monthIndex,
      fan.calculationHours
    )
  });
  return {
    value: result.valueKWh,
    source: calculatedComponentSource({
      origin: "mc001_ventilation_control_auxiliary_contract",
      reference: `${path}.controlAuxiliaryCalculation`,
      results: [result],
      details: { mode: contract.mode }
    })
  };
}

function calculatedVentilationAhuThermalRelations(system, monthIndex, path) {
  const contracts = system.thermalRelationCalculations ?? system.ahuThermalRelationCalculations;
  if (!isPlainObject(contracts)) return null;
  const fan = system.fanElectricEnergyInput ?? {};
  const results = [];
  const relations = {};

  const addRelation = (key, result, reference) => {
    if (!result) return;
    relations[key] = {
      status: result.status,
      value: result.value,
      valueKWh: result.valueKWh ?? null,
      valueC: result.valueC ?? null,
      unit: result.unit,
      formulaId: result.formulaId,
      executionTrace: result.executionTrace,
      source: calculatedComponentSource({
        origin: `mc001_ventilation_ahu_${key}_contract`,
        reference,
        results: [result],
        details: { relation: key }
      })
    };
    results.push(result);
  };

  const withHours = (contract) => ({
    ...contract,
    calculationHours: monthlyFieldWithFallback(
      contract,
      "calculationHours",
      monthIndex,
      fan.calculationHours
    )
  });

  const fanTemperatureRise = monthlyComponent(contracts.fanTemperatureRise, monthIndex);
  if (isPlainObject(fanTemperatureRise)) {
    if (fanTemperatureRise.mode === "balanced_residential_fan_temperature_rise") {
      addRelation(
        "fanTemperatureRise",
        calculateBalancedResidentialFanTemperatureRise(),
        `${path}.thermalRelationCalculations.fanTemperatureRise`
      );
    } else if (fanTemperatureRise.mode === "fan_temperature_rise") {
      addRelation(
        "fanTemperatureRise",
        calculateFanTemperatureRise(fanTemperatureRise),
        `${path}.thermalRelationCalculations.fanTemperatureRise`
      );
    }
  }

  const extractTemperature = monthlyComponent(contracts.extractAirTemperatureForRecovery, monthIndex);
  if (isPlainObject(extractTemperature) && extractTemperature.mode === "extract_air_temperature_for_recovery") {
    addRelation(
      "extractAirTemperatureForRecovery",
      calculateExtractAirTemperatureForRecovery(extractTemperature),
      `${path}.thermalRelationCalculations.extractAirTemperatureForRecovery`
    );
  }

  const heatingCoil = monthlyComponent(contracts.heatingCoil, monthIndex);
  if (isPlainObject(heatingCoil) && heatingCoil.mode === "ahu_heating_coil_required_energy") {
    addRelation(
      "heatingCoilRequiredEnergy",
      calculateAhuHeatingCoilRequiredEnergy(withHours(heatingCoil)),
      `${path}.thermalRelationCalculations.heatingCoil`
    );
  }

  const heatRecovery = monthlyComponent(contracts.heatRecovery, monthIndex);
  if (isPlainObject(heatRecovery) && heatRecovery.mode === "ahu_heat_recovery_energy") {
    addRelation(
      "heatRecoveryEnergy",
      calculateAhuHeatRecoveryEnergy(withHours(heatRecovery)),
      `${path}.thermalRelationCalculations.heatRecovery`
    );
  }

  const recirculation = monthlyComponent(contracts.recirculationHeating, monthIndex);
  if (isPlainObject(recirculation) && recirculation.mode === "ahu_recirculation_air_heating_energy") {
    addRelation(
      "recirculationAirHeatingEnergy",
      calculateAhuRecirculationAirHeatingEnergy(withHours(recirculation)),
      `${path}.thermalRelationCalculations.recirculationHeating`
    );
  }

  const coolingCoil = monthlyComponent(contracts.coolingCoil, monthIndex);
  if (isPlainObject(coolingCoil) && coolingCoil.mode === "ahu_cooling_coil_required_energy") {
    addRelation(
      "coolingCoilRequiredEnergy",
      calculateAhuCoolingCoilRequiredEnergy(withHours(coolingCoil)),
      `${path}.thermalRelationCalculations.coolingCoil`
    );
  }

  const dehumidification = monthlyComponent(contracts.dehumidification, monthIndex);
  if (isPlainObject(dehumidification) && dehumidification.mode === "ahu_dehumidification_cooling_energy") {
    addRelation(
      "dehumidificationCoolingEnergy",
      calculateAhuDehumidificationCoolingEnergy(withHours(dehumidification)),
      `${path}.thermalRelationCalculations.dehumidification`
    );
  }

  const humidification = monthlyComponent(contracts.humidification, monthIndex);
  if (isPlainObject(humidification) && humidification.mode === "ahu_humidification_generator_input_energy") {
    addRelation(
      "humidificationGeneratorInputEnergy",
      calculateAhuHumidificationGeneratorInputEnergy(withHours(humidification)),
      `${path}.thermalRelationCalculations.humidification`
    );
  }

  const humidificationAuxiliary = monthlyComponent(contracts.humidificationAuxiliary, monthIndex);
  if (
    isPlainObject(humidificationAuxiliary) &&
    humidificationAuxiliary.mode === "ahu_non_steam_humidification_auxiliary_zero"
  ) {
    addRelation(
      "humidificationAuxiliaryEnergy",
      calculateAhuNonSteamHumidificationAuxiliaryEnergy(),
      `${path}.thermalRelationCalculations.humidificationAuxiliary`
    );
  }

  const generationLoss = monthlyComponent(contracts.generationLoss, monthIndex);
  let generationLossResult = null;
  if (isPlainObject(generationLoss) && generationLoss.mode === "ahu_generation_loss_conditioned") {
    generationLossResult = calculateAhuGenerationLossConditioned(withHours(generationLoss));
    addRelation(
      "generationLoss",
      generationLossResult,
      `${path}.thermalRelationCalculations.generationLoss`
    );
  } else if (isPlainObject(generationLoss) && generationLoss.mode === "ahu_generation_loss_unconditioned") {
    generationLossResult = calculateAhuGenerationLossUnconditioned(withHours(generationLoss));
    addRelation(
      "generationLoss",
      generationLossResult,
      `${path}.thermalRelationCalculations.generationLoss`
    );
  }

  const recoverableGenerationLoss = monthlyComponent(contracts.recoverableGenerationLoss, monthIndex);
  if (
    isPlainObject(recoverableGenerationLoss) &&
    recoverableGenerationLoss.mode === "ahu_recoverable_generation_loss"
  ) {
    addRelation(
      "recoverableGenerationLoss",
      calculateAhuRecoverableGenerationLoss({
        ahuGenerationLossKWh:
          monthlyField(
            recoverableGenerationLoss,
            "ahuGenerationLossKWh",
            monthIndex
          ) ?? generationLossResult?.valueKWh,
        ahuLocation: recoverableGenerationLoss.ahuLocation
      }),
      `${path}.thermalRelationCalculations.recoverableGenerationLoss`
    );
  }

  const fanEfficiency = monthlyComponent(contracts.fanEfficiency, monthIndex);
  if (isPlainObject(fanEfficiency) && fanEfficiency.mode === "fan_efficiency_from_nominal_and_airflow_factor") {
    addRelation(
      "fanEfficiency",
      calculateFanEfficiencyFromNominalAndAirflowFactor(fanEfficiency),
      `${path}.thermalRelationCalculations.fanEfficiency`
    );
  }

  const quadraticPressureDrop = monthlyComponent(contracts.quadraticPressureDrop, monthIndex);
  if (isPlainObject(quadraticPressureDrop) && quadraticPressureDrop.mode === "quadratic_pressure_drop") {
    addRelation(
      "quadraticPressureDrop",
      calculateQuadraticPressureDrop(quadraticPressureDrop),
      `${path}.thermalRelationCalculations.quadraticPressureDrop`
    );
  }

  const multiZoneConstantPressureDrop = monthlyComponent(contracts.multiZoneConstantPressureDrop, monthIndex);
  if (
    isPlainObject(multiZoneConstantPressureDrop) &&
    multiZoneConstantPressureDrop.mode === "multizone_constant_pressure_drop"
  ) {
    addRelation(
      "multiZoneConstantPressureDrop",
      calculateMultiZoneConstantPressureDrop(multiZoneConstantPressureDrop),
      `${path}.thermalRelationCalculations.multiZoneConstantPressureDrop`
    );
  }

  const multiZoneMinimumPressureDrop = monthlyComponent(contracts.multiZoneMinimumPressureDrop, monthIndex);
  if (
    isPlainObject(multiZoneMinimumPressureDrop) &&
    multiZoneMinimumPressureDrop.mode === "multizone_minimum_pressure_drop"
  ) {
    addRelation(
      "multiZoneMinimumPressureDrop",
      calculateMultiZoneMinimumPressureDrop(multiZoneMinimumPressureDrop),
      `${path}.thermalRelationCalculations.multiZoneMinimumPressureDrop`
    );
  }

  const groundPreheatPrecool = monthlyComponent(contracts.groundPreheatPrecool, monthIndex);
  if (isPlainObject(groundPreheatPrecool) && groundPreheatPrecool.mode === "ground_preheat_precool_energy") {
    addRelation(
      "groundPreheatPrecoolEnergy",
      calculateGroundPreheatPrecoolEnergy(withHours(groundPreheatPrecool)),
      `${path}.thermalRelationCalculations.groundPreheatPrecool`
    );
  }

  const fanEnergyAssignedToHeatRecovery = monthlyComponent(contracts.fanEnergyAssignedToHeatRecovery, monthIndex);
  if (
    isPlainObject(fanEnergyAssignedToHeatRecovery) &&
    fanEnergyAssignedToHeatRecovery.mode === "fan_energy_assigned_to_heat_recovery_pressure"
  ) {
    addRelation(
      "fanEnergyAssignedToHeatRecovery",
      calculateFanEnergyAssignedToHeatRecoveryPressure(fanEnergyAssignedToHeatRecovery),
      `${path}.thermalRelationCalculations.fanEnergyAssignedToHeatRecovery`
    );
  }

  const steamHumidificationPumpAuxiliary = monthlyComponent(
    contracts.steamHumidificationPumpAuxiliary,
    monthIndex
  );
  if (
    isPlainObject(steamHumidificationPumpAuxiliary) &&
    steamHumidificationPumpAuxiliary.mode === "steam_humidification_pump_auxiliary_zero"
  ) {
    addRelation(
      "steamHumidificationPumpAuxiliaryEnergy",
      calculateSteamHumidificationPumpAuxiliaryEnergy(),
      `${path}.thermalRelationCalculations.steamHumidificationPumpAuxiliary`
    );
  }

  const humidificationPumpAuxiliary = monthlyComponent(contracts.humidificationPumpAuxiliary, monthIndex);
  if (
    isPlainObject(humidificationPumpAuxiliary) &&
    humidificationPumpAuxiliary.mode === "humidification_pump_auxiliary_energy"
  ) {
    addRelation(
      "humidificationPumpAuxiliaryEnergy",
      calculateHumidificationPumpAuxiliaryEnergy(withHours(humidificationPumpAuxiliary)),
      `${path}.thermalRelationCalculations.humidificationPumpAuxiliary`
    );
  }

  const ductLeakageFactor = monthlyComponent(contracts.ductLeakageFactor, monthIndex);
  if (isPlainObject(ductLeakageFactor) && ductLeakageFactor.mode === "duct_leakage_factor") {
    addRelation(
      "ductLeakageFactor",
      calculateDuctLeakageFactor(ductLeakageFactor),
      `${path}.thermalRelationCalculations.ductLeakageFactor`
    );
  }

  const ductLeakageAirFlow = monthlyComponent(contracts.ductLeakageAirFlow, monthIndex);
  if (isPlainObject(ductLeakageAirFlow) && ductLeakageAirFlow.mode === "duct_leakage_air_flow") {
    addRelation(
      "ductLeakageAirFlow",
      calculateDuctLeakageAirFlow(ductLeakageAirFlow),
      `${path}.thermalRelationCalculations.ductLeakageAirFlow`
    );
  }

  const ahuLeakageFactor = monthlyComponent(contracts.ahuLeakageFactor, monthIndex);
  if (isPlainObject(ahuLeakageFactor) && ahuLeakageFactor.mode === "ahu_leakage_factor") {
    addRelation(
      "ahuLeakageFactor",
      calculateAhuLeakageFactor(ahuLeakageFactor),
      `${path}.thermalRelationCalculations.ahuLeakageFactor`
    );
  }

  const requiredSupplyDistributionAirFlow = monthlyComponent(
    contracts.requiredSupplyDistributionAirFlow,
    monthIndex
  );
  if (
    isPlainObject(requiredSupplyDistributionAirFlow) &&
    requiredSupplyDistributionAirFlow.mode === "required_supply_distribution_air_flow"
  ) {
    addRelation(
      "requiredSupplyDistributionAirFlow",
      calculateRequiredSupplyDistributionAirFlow(requiredSupplyDistributionAirFlow),
      `${path}.thermalRelationCalculations.requiredSupplyDistributionAirFlow`
    );
  }

  const requiredExtractDistributionAirFlow = monthlyComponent(
    contracts.requiredExtractDistributionAirFlow,
    monthIndex
  );
  if (
    isPlainObject(requiredExtractDistributionAirFlow) &&
    requiredExtractDistributionAirFlow.mode === "required_extract_distribution_air_flow"
  ) {
    addRelation(
      "requiredExtractDistributionAirFlow",
      calculateRequiredExtractDistributionAirFlow(requiredExtractDistributionAirFlow),
      `${path}.thermalRelationCalculations.requiredExtractDistributionAirFlow`
    );
  }

  const supplyAirFlowZoneAllocation = monthlyComponent(contracts.supplyAirFlowZoneAllocation, monthIndex);
  if (
    isPlainObject(supplyAirFlowZoneAllocation) &&
    supplyAirFlowZoneAllocation.mode === "supply_air_flow_zone_allocation"
  ) {
    addRelation(
      "supplyAirFlowZoneAllocation",
      allocateSupplyAirFlowToZone(supplyAirFlowZoneAllocation),
      `${path}.thermalRelationCalculations.supplyAirFlowZoneAllocation`
    );
  }

  const extractAirFlowZoneAllocation = monthlyComponent(contracts.extractAirFlowZoneAllocation, monthIndex);
  if (
    isPlainObject(extractAirFlowZoneAllocation) &&
    extractAirFlowZoneAllocation.mode === "extract_air_flow_zone_allocation"
  ) {
    addRelation(
      "extractAirFlowZoneAllocation",
      allocateExtractAirFlowToZone(extractAirFlowZoneAllocation),
      `${path}.thermalRelationCalculations.extractAirFlowZoneAllocation`
    );
  }

  const ductLeakageFlowFromFactor = monthlyComponent(contracts.ductLeakageFlowFromFactor, monthIndex);
  if (
    isPlainObject(ductLeakageFlowFromFactor) &&
    ductLeakageFlowFromFactor.mode === "duct_leakage_flow_from_factor"
  ) {
    addRelation(
      "ductLeakageFlowFromFactor",
      calculateDuctLeakageFlowFromFactor(ductLeakageFlowFromFactor),
      `${path}.thermalRelationCalculations.ductLeakageFlowFromFactor`
    );
  }

  const maximumZoneFlowFactor = monthlyComponent(contracts.maximumZoneFlowFactor, monthIndex);
  if (isPlainObject(maximumZoneFlowFactor) && maximumZoneFlowFactor.mode === "maximum_zone_flow_factor") {
    addRelation(
      "maximumZoneFlowFactor",
      calculateMaximumZoneFlowFactor(maximumZoneFlowFactor),
      `${path}.thermalRelationCalculations.maximumZoneFlowFactor`
    );
  }

  const partLoadAhuAirFlow = monthlyComponent(contracts.partLoadAhuAirFlow, monthIndex);
  if (isPlainObject(partLoadAhuAirFlow) && partLoadAhuAirFlow.mode === "part_load_ahu_air_flow") {
    addRelation(
      "partLoadAhuAirFlow",
      calculatePartLoadAhuAirFlow(partLoadAhuAirFlow),
      `${path}.thermalRelationCalculations.partLoadAhuAirFlow`
    );
  }

  const maximumFlowFactorFromPartLoad = monthlyComponent(contracts.maximumFlowFactorFromPartLoad, monthIndex);
  if (
    isPlainObject(maximumFlowFactorFromPartLoad) &&
    maximumFlowFactorFromPartLoad.mode === "maximum_flow_factor_from_part_load"
  ) {
    addRelation(
      "maximumFlowFactorFromPartLoad",
      calculateMaximumFlowFactorFromPartLoad(maximumFlowFactorFromPartLoad),
      `${path}.thermalRelationCalculations.maximumFlowFactorFromPartLoad`
    );
  }

  const distributionThermalLoss = monthlyComponent(contracts.distributionThermalLoss, monthIndex);
  if (
    isPlainObject(distributionThermalLoss) &&
    distributionThermalLoss.mode === "ahu_distribution_thermal_loss"
  ) {
    addRelation(
      "distributionThermalLoss",
      calculateAhuDistributionThermalLoss(withHours(distributionThermalLoss)),
      `${path}.thermalRelationCalculations.distributionThermalLoss`
    );
  }

  const recoverableDistributionLoss = monthlyComponent(contracts.recoverableDistributionLoss, monthIndex);
  if (
    isPlainObject(recoverableDistributionLoss) &&
    recoverableDistributionLoss.mode === "ahu_distribution_recoverable_loss_to_zone"
  ) {
    addRelation(
      "recoverableDistributionLoss",
      calculateAhuRecoverableDistributionLossToZone(withHours(recoverableDistributionLoss)),
      `${path}.thermalRelationCalculations.recoverableDistributionLoss`
    );
  }

  if (results.length === 0) return null;
  return {
    relations,
    source: calculatedComponentSource({
      origin: "mc001_ventilation_ahu_thermal_relation_contract",
      reference: `${path}.thermalRelationCalculations`,
      results,
      details: {
        relationCount: results.length,
        energyAccounting:
          "thermal AHU relation results are traceable Chapter 3 quantities; they are not added to annual auxiliary electricity totals"
      }
    })
  };
}

function optionalMonthlyScalar(value, monthIndex, fallback = 0) {
  if (Array.isArray(value)) {
    const monthly = value[monthIndex];
    return finiteNonNegative(monthly) ? monthly : fallback;
  }
  return finiteNonNegative(value) ? value : fallback;
}

function fraction(value, path, diagnostics, fallback = null) {
  if (value === undefined || value === null) {
    if (fallback !== null) return fallback;
    diagnostics.push(diagnostic("missing_installation_fraction", path));
    return null;
  }
  if (!finiteNumber(value) || value < 0 || value > 1) {
    diagnostics.push(diagnostic("invalid_installation_fraction", path));
    return null;
  }
  return value;
}

function activeSystems(section, path, diagnostics, { allowMultiple = false } = {}) {
  if (!enabled(section)) return null;
  const systems = Array.isArray(section.systems) ? section.systems.filter(item => item?.enabled !== false) : [];
  if (systems.length === 0) {
    diagnostics.push(diagnostic("missing_installation_system", `${path}.systems`));
    return null;
  }
  if (!allowMultiple && systems.length > 1) {
    diagnostics.push(diagnostic("multiple_installation_systems_require_explicit_runtime_allocation", `${path}.systems`));
    return null;
  }
  if (allowMultiple && systems.length === 1 && systems[0].allocationFraction !== undefined) {
    if (!finiteNumber(systems[0].allocationFraction) || Math.abs(systems[0].allocationFraction - 1) > 1e-9) {
      diagnostics.push(diagnostic(
        "invalid_single_installation_system_allocation_fraction",
        `${path}.systems[0].allocationFraction`,
        "A single active system must either omit allocationFraction or set it to 1."
      ));
    }
  }
  if (allowMultiple && systems.length > 1) {
    let allocationSum = 0;
    for (const [index, system] of systems.entries()) {
      if (!finiteNumber(system.allocationFraction) || system.allocationFraction < 0 || system.allocationFraction > 1) {
        diagnostics.push(diagnostic(
          "missing_multiple_installation_system_allocation_fraction",
          `${path}.systems[${index}].allocationFraction`,
          "Multiple active systems require explicit allocationFraction values between 0 and 1."
        ));
      } else {
        allocationSum += system.allocationFraction;
      }
    }
    if (Math.abs(allocationSum - 1) > 1e-9) {
      diagnostics.push(diagnostic(
        "invalid_multiple_installation_system_allocation_sum",
        `${path}.systems[].allocationFraction`,
        "Multiple active systems require allocationFraction values that sum to 1."
      ));
    }
  }
  return systems;
}

function firstActiveSystem(section, path, diagnostics) {
  const systems = activeSystems(section, path, diagnostics);
  if (!systems) return null;
  return systems[0];
}

function serviceStagesForMonth(
  system,
  service,
  stageIds,
  monthIndex,
  diagnostics,
  { usefulDemandKWh = null, allocationFraction = 1 } = {}
) {
  const stages = [];
  const stageMap = new Map((system?.stages ?? []).map(stage => [stage.stageId, stage]));
  const previousStages = new Map();
  const allocatedUsefulDemandKWh =
    finiteNonNegative(usefulDemandKWh) && finiteNumber(allocationFraction)
      ? usefulDemandKWh * allocationFraction
      : null;
  let stageOutputKWh =
    allocatedUsefulDemandKWh;
  for (const stageId of stageIds) {
    const stage = stageMap.get(stageId);
    if (!stage) {
      diagnostics.push(diagnostic("missing_installation_stage", `${service}.stages.${stageId}`));
      continue;
    }
    const lossPath = `${service}.stages.${stageId}.lossKWhPerMonth`;
    const auxiliaryPath = `${service}.stages.${stageId}.auxiliaryKWhPerMonth`;
    const calculatedLoss = calculatedStageLoss(
      stage,
      service,
      stageId,
      monthIndex,
      `${service}.stages.${stageId}`,
      diagnostics,
      stageOutputKWh,
      {
        allocatedUsefulDemandKWh,
        stageOutputKWh,
        previousStages
      }
    );
    const calculatedAuxiliary = calculatedStageAuxiliary(
      stage,
      service,
      stageId,
      monthIndex,
      `${service}.stages.${stageId}`,
      diagnostics,
      stageOutputKWh,
      {
        allocatedUsefulDemandKWh,
        stageOutputKWh,
        previousStages
      }
    );
    const loss =
      calculatedLoss ??
      monthlyScalarWithSource(stage.lossKWhPerMonth, monthIndex, lossPath, diagnostics, stage.lossSource);
    const auxiliary =
      calculatedAuxiliary ??
      monthlyScalarWithSource(stage.auxiliaryKWhPerMonth, monthIndex, auxiliaryPath, diagnostics, stage.auxiliarySource);
    const resolvedStage = {
      stageId,
      lossKWh: loss.value,
      auxiliaryKWh: auxiliary.value,
      lossSource: loss.source,
      auxiliarySource: auxiliary.source,
      ...(auxiliary.stageInputOverride
        ? { inputEnergyOverride: auxiliary.stageInputOverride }
        : {}),
      auxiliaryRecoveredFraction: fraction(
        stage.auxiliaryRecoveredFraction,
        `${service}.stages.${stageId}.auxiliaryRecoveredFraction`,
        diagnostics,
        auxiliary.derivedFractions?.auxiliaryRecoveredFraction ?? 0
      ),
      lossRecoveredFraction: fraction(
        stage.lossRecoveredFraction,
        `${service}.stages.${stageId}.lossRecoveredFraction`,
        diagnostics,
        loss.derivedFractions?.lossRecoveredFraction ?? 0
      ),
      auxiliaryRecoverableFractionToHeating: fraction(
        stage.auxiliaryRecoverableFractionToHeating,
        `${service}.stages.${stageId}.auxiliaryRecoverableFractionToHeating`,
        diagnostics,
        auxiliary.derivedFractions?.auxiliaryRecoverableFractionToHeating ?? 0
      ),
      lossRecoverableFractionToHeating: fraction(
        stage.lossRecoverableFractionToHeating,
        `${service}.stages.${stageId}.lossRecoverableFractionToHeating`,
        diagnostics,
        loss.derivedFractions?.lossRecoverableFractionToHeating ?? 0
      )
    };
    stages.push(resolvedStage);
    previousStages.set(stageId, resolvedStage);
    if (resolvedStage.inputEnergyOverride) {
      stageOutputKWh = resolvedStage.inputEnergyOverride.valueKWh;
    } else if (
      finiteNonNegative(stageOutputKWh) &&
      finiteNonNegative(resolvedStage.lossKWh) &&
      finiteNonNegative(resolvedStage.auxiliaryKWh) &&
      finiteNumber(resolvedStage.auxiliaryRecoveredFraction) &&
      finiteNumber(resolvedStage.lossRecoveredFraction)
    ) {
      const stageInput = calculateChapter3SubsystemInputEnergyBalance({
        subsystemId: `${service}.${stageId}`,
        subsystemOutputKWh: stageOutputKWh,
        subsystemLossKWh: resolvedStage.lossKWh,
        auxiliaryEnergyKWh: resolvedStage.auxiliaryKWh,
        auxiliaryRecoveredFraction: resolvedStage.auxiliaryRecoveredFraction,
        lossRecoveredFraction: resolvedStage.lossRecoveredFraction
      });
      stageOutputKWh = stageInput.valueKWh;
    } else {
      stageOutputKWh = null;
    }
  }
  return stages;
}

function serviceSystemsForMonth(
  section,
  service,
  path,
  stageIds,
  monthIndex,
  diagnostics,
  { usefulDemandKWh = null } = {}
) {
  const systems = activeSystems(section, path, diagnostics, { allowMultiple: true });
  if (!systems) return null;
  const multiple = systems.length > 1;
  return systems.map((system, index) => {
    const generatorRef = system.generatorRef ?? null;
    const stages = serviceStagesForMonth(system, service, stageIds, monthIndex, diagnostics, {
      usefulDemandKWh,
      allocationFraction: multiple ? system.allocationFraction : 1
    });
    return {
      systemId: system.systemId ?? `${service}-system-${index + 1}`,
      allocationFraction: multiple ? system.allocationFraction : 1,
      stages: applySharedGeneratorReferenceToStages(stages, { service, generatorRef }),
      metadata: {
        systemId: system.systemId ?? `${service}-system-${index + 1}`,
        generatorRef,
        generatorType: system.generatorType ?? null,
        energyCarrier: system.energyCarrier ?? null,
        servedScope: system.servedScope ?? "whole_building",
        nominalCapacityKW: system.nominalCapacityKW ?? null
      },
      source: system.source ?? {
        origin: multiple ? "explicit_parallel_system_allocation" : "explicit_engineering_input",
        reference: `${path}.systems[${index}]`
      }
    };
  });
}

function monthlyUsefulDemand(chapter2Result) {
  const heatingByMonth = new Map(
    (chapter2Result?.result?.heatingResult?.caseResults ?? []).map(item => [item.month, item])
  );
  const coolingByMonth = new Map(
    (chapter2Result?.result?.coolingResult?.caseResults ?? []).map(item => [item.month, item])
  );
  return (chapter2Result?.result?.monthlyResults ?? []).map((month, index) => ({
    month: month.month ?? MONTH_IDS[index],
    qHndKWh: heatingByMonth.get(month.month)?.qHnd ?? 0,
    qCndKWh: coolingByMonth.get(month.month)?.qCnd ?? 0
  }));
}

function buildingUsefulFloorAreaM2(buildingDna) {
  const candidates = [
    buildingDna?.geometry?.usefulFloorAreaM2?.amount,
    buildingDna?.buildingSpecificParameters?.usefulFloorAreaM2?.value,
    buildingDna?.buildingSpecificParameters?.usefulFloorAreaM2
  ];
  return candidates.find(finitePositive);
}

function residentialDhwDwellingType(source = {}, buildingDna = {}) {
  if (source.dwellingType) return source.dwellingType;
  if (buildingDna.buildingType === "apartment") {
    return MC001_DHW_RESIDENTIAL_DWELLING_TYPES.APARTMENT;
  }
  return MC001_DHW_RESIDENTIAL_DWELLING_TYPES.SINGLE_FAMILY_OR_TERRACED;
}

function dhwTemperatureInputs(source = {}) {
  return {
    thetaWDrawC:
      source.thetaWDrawC ?? MC001_DHW_RECOMMENDED_DRAW_OFF_TEMPERATURE_C,
    thetaWColdC:
      source.thetaWColdC ?? MC001_DHW_DEFAULT_COLD_WATER_TEMPERATURE_C,
    specificHeatKWhPerKgK: source.specificHeatKWhPerKgK ?? 4.186 / 3600,
    waterDensityKgPerM3:
      source.waterDensityKgPerM3 ?? MC001_DHW_WATER_DENSITY_KG_PER_M3
  };
}

function applyDhwLossWasteIfAvailable(baseDailyVolumeLiters, source) {
  if (finitePositive(source?.penaltyFactor1) && finitePositive(source?.penaltyFactor2)) {
    return calculateDhwVolumeWithLossWaste({
      baseDailyVolumeLiters,
      penaltyFactor1: source.penaltyFactor1,
      penaltyFactor2: source.penaltyFactor2
    });
  }
  return null;
}

function calculatedDhwUsefulDemandSourceForMonth(section, buildingDna, monthIndex, diagnostics) {
  const source = section.usefulDemandSource;
  if (!isPlainObject(source) || source.mode === "explicit_monthly") return null;

  const days = DAYS_BY_MONTH[monthIndex];
  const temperature = dhwTemperatureInputs(source);
  let dailyVolumeLiters = null;
  let chain = {};
  let formulaIds = [];

  try {
    if (source.mode === "residential_normative") {
      const livingAreaM2 = source.livingAreaM2 ?? buildingUsefulFloorAreaM2(buildingDna);
      if (!finitePositive(livingAreaM2)) {
        diagnostics.push(diagnostic(
          "missing_dhw_residential_living_area",
          "technicalSystems.domesticHotWater.usefulDemandSource.livingAreaM2",
          "Residential DHW useful-demand derivation requires useful floor area from Building DNA or an explicit source override."
        ));
        return null;
      }
      const dwellingType = residentialDhwDwellingType(source, buildingDna);
      const equivalentConsumers = calculateResidentialEquivalentConsumers({
        dwellingType,
        livingAreaM2
      });
      const normativeSpecificVolume = calculateResidentialSpecificDhwVolume({
        livingAreaM2,
        equivalentConsumers: equivalentConsumers.valueEquivalentConsumers,
        ...(source.xCoefficient === undefined ? {} : { xCoefficient: source.xCoefficient }),
        ...(source.yCoefficient === undefined ? {} : { yCoefficient: source.yCoefficient })
      });
      const correctedSpecificVolume = calculateDhwSpecificDemandTemperatureCorrection({
        normativeSpecificDemandLPerUnitDay: normativeSpecificVolume.valueLitersPerPersonDay,
        thetaWReferenceC:
          source.thetaWReferenceC ?? MC001_DHW_RECOMMENDED_NETWORK_TEMPERATURE_C,
        thetaWColdReferenceC:
          source.thetaWColdReferenceC ?? MC001_DHW_RESIDENTIAL_REFERENCE_COLD_WATER_TEMPERATURE_C,
        thetaWDrawC: temperature.thetaWDrawC,
        thetaWColdC: temperature.thetaWColdC
      });
      const dailyVolume = calculateResidentialDailyDhwVolume({
        specificDailyDemandLPerPersonDay: correctedSpecificVolume.valueLitersPerUnitDay,
        equivalentConsumers: equivalentConsumers.valueEquivalentConsumers
      });
      dailyVolumeLiters = dailyVolume.valueLitersPerDay;
      chain = {
        equivalentConsumers,
        normativeSpecificVolume,
        correctedSpecificVolume,
        dailyVolume
      };
      formulaIds = [
        equivalentConsumers.formulaId,
        normativeSpecificVolume.formulaId,
        correctedSpecificVolume.formulaId,
        dailyVolume.formulaId
      ];
    } else if (source.mode === "table_3_3_1") {
      const tableDailyVolume = calculateDhwDailyVolumeFromTable3_3_1({
        tableEntryId: source.tableEntryId,
        unitCount: source.unitCount
      });
      if (tableDailyVolume.status !== "calculated") {
        diagnostics.push(diagnostic(
          "invalid_dhw_table_3_3_1_entry",
          "technicalSystems.domesticHotWater.usefulDemandSource.tableEntryId",
          `Unknown MC001 Tabel 3.3.1 DHW entry: ${source.tableEntryId}`
        ));
        return null;
      }
      const correctedSpecificVolume = calculateDhwSpecificDemandTemperatureCorrection({
        normativeSpecificDemandLPerUnitDay:
          tableDailyVolume.tableEntry.specificDhwDemandLPerUnitDayAt60C,
        thetaWReferenceC:
          source.thetaWReferenceC ?? MC001_DHW_RECOMMENDED_NETWORK_TEMPERATURE_C,
        thetaWColdReferenceC:
          source.thetaWColdReferenceC ?? MC001_DHW_DEFAULT_COLD_WATER_TEMPERATURE_C,
        thetaWDrawC: temperature.thetaWDrawC,
        thetaWColdC: temperature.thetaWColdC
      });
      const correctedDailyVolume = calculateDhwDailyVolumeNonResidential({
        specificDailyDemandLPerUnitDay: correctedSpecificVolume.valueLitersPerUnitDay,
        unitCount: source.unitCount
      });
      dailyVolumeLiters = correctedDailyVolume.valueLitersPerDay;
      chain = { tableDailyVolume, correctedSpecificVolume, correctedDailyVolume };
      formulaIds = [
        tableDailyVolume.formulaId,
        correctedSpecificVolume.formulaId,
        correctedDailyVolume.formulaId
      ];
    } else {
      diagnostics.push(diagnostic(
        "unsupported_dhw_useful_demand_source_mode",
        "technicalSystems.domesticHotWater.usefulDemandSource.mode",
        `Unsupported DHW useful-demand source mode: ${source.mode}`
      ));
      return null;
    }

    const lossWaste = applyDhwLossWasteIfAvailable(dailyVolumeLiters, source);
    const volumeLiters = (lossWaste?.totalDailyVolumeLiters ?? dailyVolumeLiters) * days;
    const usefulEnergy = calculateDhwUsefulEnergyFromVolume({
      volumeLiters,
      specificHeatKWhPerKgK: temperature.specificHeatKWhPerKgK,
      waterDensityKgPerM3: temperature.waterDensityKgPerM3,
      thetaWDrawC: temperature.thetaWDrawC,
      thetaWColdC: temperature.thetaWColdC
    });
    const allFormulaIds = [
      ...formulaIds,
      ...(lossWaste ? [lossWaste.formulaId] : []),
      usefulEnergy.formulaId
    ];
    return {
      valueKWh: usefulEnergy.valueKWh,
      source: sourceDescriptor({
        classification: CHAPTER3_INPUT_CLASSIFICATION.NUMERICALLY_IMPLEMENTED,
        origin: `mc001_${source.mode}`,
        reference: "technicalSystems.domesticHotWater.usefulDemandSource",
        formulaIds: allFormulaIds,
        details: {
          month: MONTH_IDS[monthIndex],
          days,
          mode: source.mode,
          dailyVolumeLiters,
          volumeLiters,
          trace: usefulEnergy.trace,
          executionTrace: usefulEnergy.executionTrace,
          calculationChain: {
            ...chain,
            ...(lossWaste ? { lossWaste } : {}),
            usefulEnergy
          }
        }
      })
    };
  } catch (error) {
    diagnostics.push(diagnostic(
      "invalid_dhw_useful_demand_source",
      "technicalSystems.domesticHotWater.usefulDemandSource",
      error.message
    ));
    return null;
  }
}

function ventilationForMonth(section, monthIndex, diagnostics) {
  const system = firstActiveSystem(section, "technicalSystems.ventilationAhu", diagnostics);
  if (!system) return null;
  const fan = system.fanElectricEnergyInput ?? {};
  const fanFields = [
    "supplyAirFlowM3PerH",
    "supplyPressureDropPa",
    "supplyFanEfficiency",
    "extractAirFlowM3PerH",
    "extractPressureDropPa",
    "extractFanEfficiency",
    "calculationHours"
  ];
  for (const field of fanFields) {
    const value = fan[field];
    const ok = field.endsWith("Efficiency") ? finitePositive(value) && value <= 1 : finiteNonNegative(value);
    if (!ok) diagnostics.push(diagnostic("invalid_ventilation_ahu_fan_input", `technicalSystems.ventilationAhu.${field}`));
  }
  let heatRecoveryAuxiliary = null;
  let preheatAuxiliary = null;
  let controlAuxiliary = null;
  let thermalRelations = null;
  try {
    heatRecoveryAuxiliary = calculatedVentilationHeatRecoveryAuxiliary(
      system,
      monthIndex,
      "technicalSystems.ventilationAhu.systems[0]"
    );
    preheatAuxiliary = calculatedVentilationPreheatAuxiliary(
      system,
      monthIndex,
      "technicalSystems.ventilationAhu.systems[0]"
    );
    controlAuxiliary = calculatedVentilationControlAuxiliary(
      system,
      monthIndex,
      "technicalSystems.ventilationAhu.systems[0]"
    );
    thermalRelations = calculatedVentilationAhuThermalRelations(
      system,
      monthIndex,
      "technicalSystems.ventilationAhu.systems[0]"
    );
  } catch (error) {
    diagnostics.push(diagnostic(
      "invalid_ventilation_ahu_auxiliary_component_contract",
      "technicalSystems.ventilationAhu.systems[0]",
      error.message
    ));
  }
  return {
    fanElectricEnergyInput: deepClone(fan),
    heatRecoveryAuxiliaryKWh:
      heatRecoveryAuxiliary?.value ??
      optionalMonthlyScalar(system.heatRecoveryAuxiliaryKWhPerMonth, monthIndex, 0),
    preheatAuxiliaryKWh:
      preheatAuxiliary?.value ??
      optionalMonthlyScalar(system.preheatAuxiliaryKWhPerMonth, monthIndex, 0),
    controlAuxiliaryKWh:
      controlAuxiliary?.value ??
      optionalMonthlyScalar(system.controlAuxiliaryKWhPerMonth, monthIndex, 0),
    heatRecoveryAuxiliarySource: heatRecoveryAuxiliary?.source ?? null,
    preheatAuxiliarySource: preheatAuxiliary?.source ?? null,
    controlAuxiliarySource: controlAuxiliary?.source ?? null,
    ahuThermalRelations: thermalRelations
  };
}

function dhwForMonth(section, buildingDna, monthIndex, diagnostics) {
  const systems = serviceSystemsForMonth(
    section,
    "dhw",
    "technicalSystems.domesticHotWater",
    CHAPTER3_DHW_STAGE_IDS,
    monthIndex,
    diagnostics
  );
  if (!systems) return null;
  const calculated = calculatedDhwUsefulDemandSourceForMonth(
    section,
    buildingDna,
    monthIndex,
    diagnostics
  );
  const explicit = calculated
    ? null
    : monthlyScalarWithSource(
        section.monthlyUsefulDemandKWh,
        monthIndex,
        "technicalSystems.domesticHotWater.monthlyUsefulDemandKWh",
        diagnostics
      );
  return {
    usefulDemandKWh: calculated?.valueKWh ?? explicit?.value ?? null,
    usefulDemandSource: calculated?.source ?? explicit?.source,
    systems,
    ...(systems.length === 1 ? { stages: systems[0].stages } : {})
  };
}

function pcmForMonth(section, monthIndex, diagnostics) {
  if (!enabled(section)) return null;
  const record = Array.isArray(section.monthly)
    ? section.monthly[monthIndex]
    : section.monthlyTemplate;
  if (!isPlainObject(record)) {
    diagnostics.push(diagnostic("missing_pcm_monthly_input", `technicalSystems.coolingStoragePcm.monthly[${monthIndex}]`));
    return null;
  }
  const required = [
    "sensibleStorageTransformableEnergyKWh",
    "solidMassKg",
    "solidSpecificHeatKWhPerKgK",
    "generatorOutletFlowTemperatureC",
    "transitionTemperatureC",
    "generatorOutletFlowDeltaK",
    "massDecreaseTransformableEnergyKWh",
    "latentHeatKWhPerKg",
    "initialSolidMassKg"
  ];
  for (const field of required) {
    if (!finiteNumber(record[field])) {
      diagnostics.push(diagnostic("invalid_pcm_monthly_input", `technicalSystems.coolingStoragePcm.monthly[${monthIndex}].${field}`));
    }
  }
  return deepClone(record);
}

function lightingInput(section, buildingDna, diagnostics) {
  if (!enabled(section)) return null;
  const monthly = section.explicitMonthlyEnergyKWh ?? section.monthlyEnergyKWh ?? [];
  if (!Array.isArray(monthly) || monthly.length !== 12 || monthly.some(value => !finiteNonNegative(value))) {
    diagnostics.push(diagnostic("invalid_lighting_explicit_monthly_energy", "technicalSystems.lighting.explicitMonthlyEnergyKWh"));
    return null;
  }
  const area =
    section.totalAreaM2 ??
    buildingDna.geometry?.usefulFloorAreaM2?.amount ??
    buildingDna.buildingSpecificParameters?.usefulFloorAreaM2?.value;
  const leniSubspaces = Array.isArray(section.leniSubspaces) ? section.leniSubspaces : [];
  for (const [index, subspace] of leniSubspaces.entries()) {
    if (!finiteNonNegative(subspace?.leniKWhPerM2Year) || !finitePositive(subspace?.areaM2)) {
      diagnostics.push(diagnostic("invalid_lighting_leni_subspace", `technicalSystems.lighting.leniSubspaces[${index}]`));
    }
  }
  return {
    totalAreaM2: finitePositive(area) ? area : undefined,
    leniSubspaces: deepClone(leniSubspaces),
    monthlyEnergyKWh: deepClone(monthly),
    boundaryStatus: "explicit_input_boundary_sr_en_15193_1"
  };
}

export function hasActiveChapter3TechnicalSystems(buildingDna = {}) {
  const systems = buildingDna.technicalSystems ?? {};
  return [
    systems.heating,
    systems.cooling,
    systems.ventilationAhu,
    systems.domesticHotWater,
    systems.coolingStoragePcm,
    systems.lighting
  ].some(enabled);
}

function sharedGeneratorComponents(technicalSystems = {}) {
  const generators = technicalSystems.sharedComponents?.generators;
  return Array.isArray(generators)
    ? generators.filter(generator => generator?.enabled !== false)
    : [];
}

function serviceSystemsWithGeneratorRefs(technicalSystems = {}) {
  return [
    ["heating", technicalSystems.heating],
    ["cooling", technicalSystems.cooling],
    ["dhw", technicalSystems.domesticHotWater]
  ].flatMap(([service, section]) =>
    (Array.isArray(section?.systems) ? section.systems : [])
      .filter(system => system?.enabled !== false && system?.generatorRef)
      .map(system => ({
        service,
        systemId: system.systemId ?? null,
        generatorRef: system.generatorRef
      }))
  );
}

function finiteMonthlyOrScalar(value, { fraction = false } = {}) {
  const valid = item =>
    finiteNonNegative(item) && (!fraction || item <= 1);
  if (Array.isArray(value)) return value.length === 12 && value.every(valid);
  return valid(value);
}

function validateSharedGeneratorTopology(technicalSystems = {}) {
  const diagnostics = [];
  const generators = sharedGeneratorComponents(technicalSystems);
  const ids = new Set();
  for (const [index, generator] of generators.entries()) {
    const path = `technicalSystems.sharedComponents.generators[${index}]`;
    if (typeof generator.componentId !== "string" || generator.componentId.trim() === "") {
      diagnostics.push(diagnostic(
        "missing_shared_generator_component_id",
        `${path}.componentId`,
        "Shared physical generators require a stable componentId."
      ));
      continue;
    }
    if (ids.has(generator.componentId)) {
      diagnostics.push(diagnostic(
        "duplicate_shared_generator_component_id",
        `${path}.componentId`,
        "Shared physical generator componentId values must be unique."
      ));
    }
    ids.add(generator.componentId);
    for (const field of [
      "controlLossFactor",
      "lossPowerKW",
      "auxiliaryPowerKW",
      "operationHours",
      "renewableGeneratorHeatKWh",
      "dhwStorageOrDistributionLossKWh"
    ]) {
      if (field === "operationHours" && isPlainObject(generator.operationTimeCalculation)) continue;
      if (!finiteMonthlyOrScalar(generator[field])) {
        diagnostics.push(diagnostic(
          "invalid_shared_generator_component_input",
          `${path}.${field}`,
          `Shared generator ${generator.componentId} requires finite non-negative ${field}.`
        ));
      }
    }
    for (const field of [
      "recoveredAuxiliaryFraction",
      "auxiliaryRecoverableFractionToHeating",
      "lossRecoverableFractionToHeating",
      "boilerRoomRecoveryFactor"
    ]) {
      if (!finiteMonthlyOrScalar(generator[field], { fraction: true })) {
        diagnostics.push(diagnostic(
          "invalid_shared_generator_fraction_input",
          `${path}.${field}`,
          `Shared generator ${generator.componentId} requires ${field} as a fraction between 0 and 1.`
        ));
      }
    }
  }

  const refs = serviceSystemsWithGeneratorRefs(technicalSystems);
  for (const ref of refs) {
    if (!ids.has(ref.generatorRef)) {
      diagnostics.push(diagnostic(
        "missing_shared_generator_reference",
        `technicalSystems.${ref.service}.systems[].generatorRef`,
        `Service system ${ref.systemId ?? "(unknown)"} references missing shared generator ${ref.generatorRef}.`
      ));
    }
  }

  for (const generator of generators) {
    const connectedServices = [
      ...new Set(refs
        .filter(ref => ref.generatorRef === generator.componentId)
        .map(ref => ref.service))
    ];
    if (connectedServices.length <= 1) continue;
    if (!isPlainObject(generator.serviceAllocationFractions)) {
      diagnostics.push(diagnostic(
        "missing_shared_generator_service_allocation_fractions",
        `technicalSystems.sharedComponents.generators.${generator.componentId}.serviceAllocationFractions`,
        "A physical generator serving multiple services requires explicit serviceAllocationFractions unless a source-backed normative allocation rule is implemented."
      ));
      continue;
    }
    let total = 0;
    for (const service of connectedServices) {
      const allocation = generator.serviceAllocationFractions[service];
      if (!finiteNumber(allocation) || allocation < 0 || allocation > 1) {
        diagnostics.push(diagnostic(
          "invalid_shared_generator_service_allocation_fraction",
          `technicalSystems.sharedComponents.generators.${generator.componentId}.serviceAllocationFractions.${service}`,
          "Shared generator service allocation fractions must be finite values between 0 and 1."
        ));
      } else {
        total += allocation;
      }
    }
    if (Math.abs(total - 1) > 1e-9) {
      diagnostics.push(diagnostic(
        "invalid_shared_generator_service_allocation_sum",
        `technicalSystems.sharedComponents.generators.${generator.componentId}.serviceAllocationFractions`,
        "Shared generator service allocation fractions for connected services must sum to 1."
      ));
    }
  }
  return diagnostics;
}

export function validateTechnicalSystems(technicalSystems = {}) {
  if (technicalSystems === undefined || technicalSystems === null) return { ok: true, diagnostics: [] };
  if (!isPlainObject(technicalSystems)) {
    return {
      ok: false,
      diagnostics: [diagnostic("invalid_technical_systems_model", "technicalSystems")]
    };
  }
  if (
    technicalSystems.schema !== undefined &&
    technicalSystems.schema !== TECHNICAL_SYSTEMS_SCHEMA
  ) {
    return {
      ok: false,
      diagnostics: [diagnostic("unsupported_technical_systems_schema", "technicalSystems.schema")]
    };
  }
  const diagnostics = validateSharedGeneratorTopology(technicalSystems);
  return { ok: diagnostics.length === 0, diagnostics };
}

export function buildChapter3RuntimeInputFromBuildingDna(buildingDna = {}, chapter2Result = {}) {
  const technicalSystems = buildingDna.technicalSystems ?? {};
  if (!hasActiveChapter3TechnicalSystems(buildingDna)) {
    return {
      status: "not_applicable",
      code: "chapter3_technical_systems_not_enabled",
      diagnostics: []
    };
  }

  const diagnostics = [];
  const validation = validateTechnicalSystems(technicalSystems);
  diagnostics.push(...validation.diagnostics);
  const usefulDemand = monthlyUsefulDemand(chapter2Result);
  if (usefulDemand.length !== 12) {
    diagnostics.push(diagnostic("missing_chapter_2_monthly_useful_demand", "chapter2Result.result.monthlyResults"));
  }

  const heatingEnabled = enabled(technicalSystems.heating);
  const coolingEnabled = enabled(technicalSystems.cooling);
  const dhwEnabled = enabled(technicalSystems.domesticHotWater);
  const ventilationAhuEnabled = enabled(technicalSystems.ventilationAhu);
  const pcmEnabled = enabled(technicalSystems.coolingStoragePcm);
  const lighting = lightingInput(technicalSystems.lighting, buildingDna, diagnostics);
  const sharedComponents = {
    generators: sharedGeneratorComponents(technicalSystems).map(generator => deepClone(generator))
  };
  const heatingSystems = heatingEnabled
    ? activeSystems(technicalSystems.heating, "technicalSystems.heating", diagnostics, { allowMultiple: true })
    : null;
  const coolingSystems = coolingEnabled
    ? activeSystems(technicalSystems.cooling, "technicalSystems.cooling", diagnostics, { allowMultiple: true })
    : null;
  const dhwSystems = dhwEnabled
    ? activeSystems(technicalSystems.domesticHotWater, "technicalSystems.domesticHotWater", diagnostics, { allowMultiple: true })
    : null;

  const months = MONTH_IDS.map((month, index) => ({
    month,
    chapter2Useful: usefulDemand[index] ?? { month, qHndKWh: 0, qCndKWh: 0 },
    ...(heatingEnabled && heatingSystems
      ? {
          heatingSystems: serviceSystemsForMonth(
            technicalSystems.heating,
            "heating",
            "technicalSystems.heating",
            CHAPTER3_INSTALLATION_STAGE_IDS,
            index,
            diagnostics,
            { usefulDemandKWh: usefulDemand[index]?.qHndKWh ?? 0 }
          ),
          ...(heatingSystems.length === 1
            ? {
                heatingStages: serviceStagesForMonth(
                  heatingSystems[0],
                  "heating",
                  CHAPTER3_INSTALLATION_STAGE_IDS,
                  index,
                  diagnostics,
                  { usefulDemandKWh: usefulDemand[index]?.qHndKWh ?? 0 }
                )
              }
            : {})
        }
      : {}),
    ...(coolingEnabled && coolingSystems
      ? {
          coolingSystems: serviceSystemsForMonth(
            technicalSystems.cooling,
            "cooling",
            "technicalSystems.cooling",
            CHAPTER3_INSTALLATION_STAGE_IDS,
            index,
            diagnostics,
            { usefulDemandKWh: usefulDemand[index]?.qCndKWh ?? 0 }
          ),
          ...(coolingSystems.length === 1
            ? {
                coolingStages: serviceStagesForMonth(
                  coolingSystems[0],
                  "cooling",
                  CHAPTER3_INSTALLATION_STAGE_IDS,
                  index,
                  diagnostics,
                  { usefulDemandKWh: usefulDemand[index]?.qCndKWh ?? 0 }
                )
              }
            : {})
        }
      : {}),
    ...(dhwEnabled ? { dhw: dhwForMonth(technicalSystems.domesticHotWater, buildingDna, index, diagnostics) } : {}),
    ...(ventilationAhuEnabled ? { ventilation: ventilationForMonth(technicalSystems.ventilationAhu, index, diagnostics) } : {}),
    ...(pcmEnabled ? { coolingStoragePcm: pcmForMonth(technicalSystems.coolingStoragePcm, index, diagnostics) } : {})
  }));

  if (diagnostics.length > 0) {
    return {
      status: "blocked",
      code: "chapter3_installation_inputs_invalid",
      diagnostics
    };
  }

  return {
    status: "ready",
    input: {
      schema: "mc001_chapter3_integrated_runtime_input_v1",
      adapterVersion: CHAPTER3_INSTALLATIONS_ADAPTER_VERSION,
      services: {
        heatingEnabled,
        coolingEnabled,
        dhwEnabled,
        ventilationAhuEnabled,
        coolingStoragePcmEnabled: pcmEnabled,
        lightingEnabled: lighting !== null
      },
      systemMetadata: {
        heating: heatingSystems?.[0] ? {
          systemId: heatingSystems[0].systemId ?? "heating-system-1",
          generatorType: heatingSystems[0].generatorType ?? null,
          energyCarrier: heatingSystems[0].energyCarrier ?? null,
          generatorRef: heatingSystems[0].generatorRef ?? null,
          servedScope: heatingSystems[0].servedScope ?? "whole_building"
        } : null,
        heatingSystems: (heatingSystems ?? []).map((system, index) => ({
          systemId: system.systemId ?? `heating-system-${index + 1}`,
          generatorRef: system.generatorRef ?? null,
          generatorType: system.generatorType ?? null,
          energyCarrier: system.energyCarrier ?? null,
          servedScope: system.servedScope ?? "whole_building",
          allocationFraction: heatingSystems.length > 1 ? system.allocationFraction : 1
        })),
        cooling: coolingSystems?.[0] ? {
          systemId: coolingSystems[0].systemId ?? "cooling-system-1",
          generatorType: coolingSystems[0].generatorType ?? null,
          energyCarrier: coolingSystems[0].energyCarrier ?? null,
          generatorRef: coolingSystems[0].generatorRef ?? null,
          servedScope: coolingSystems[0].servedScope ?? "whole_building"
        } : null,
        coolingSystems: (coolingSystems ?? []).map((system, index) => ({
          systemId: system.systemId ?? `cooling-system-${index + 1}`,
          generatorRef: system.generatorRef ?? null,
          generatorType: system.generatorType ?? null,
          energyCarrier: system.energyCarrier ?? null,
          servedScope: system.servedScope ?? "whole_building",
          allocationFraction: coolingSystems.length > 1 ? system.allocationFraction : 1
        })),
        dhw: dhwSystems?.[0]
          ? {
              systemId: dhwSystems[0].systemId ?? "dhw-system-1",
              generatorType: dhwSystems[0].generatorType ?? null,
              energyCarrier: dhwSystems[0].energyCarrier ?? null,
              generatorRef: dhwSystems[0].generatorRef ?? null
            }
          : null,
        dhwSystems: (dhwSystems ?? []).map((system, index) => ({
          systemId: system.systemId ?? `dhw-system-${index + 1}`,
          generatorRef: system.generatorRef ?? null,
          generatorType: system.generatorType ?? null,
          energyCarrier: system.energyCarrier ?? null,
          servedScope: system.servedScope ?? "whole_building",
          allocationFraction: dhwSystems.length > 1 ? system.allocationFraction : 1
        })),
        lightingBoundary:
          lighting === null
            ? null
            : "explicit LENI/monthly lighting-energy boundary; full SR EN 15193-1 lighting engine pending source"
      },
      ...(sharedComponents.generators.length > 0 ? { sharedComponents } : {}),
      months,
      ...(lighting === null ? {} : { lighting })
    },
    diagnostics: []
  };
}

export function calculateChapter3InstallationsForBuildingDna(buildingDna = {}, chapter2Result = {}) {
  const mapped = buildChapter3RuntimeInputFromBuildingDna(buildingDna, chapter2Result);
  if (mapped.status !== "ready") {
    return mapped;
  }
  const chapter3Result = calculateMc001Chapter3IntegratedRuntime(mapped.input);
  return {
    status: "ready",
    adapterVersion: CHAPTER3_INSTALLATIONS_ADAPTER_VERSION,
    chapter3Input: mapped.input,
    chapter3Result,
    diagnostics: []
  };
}
