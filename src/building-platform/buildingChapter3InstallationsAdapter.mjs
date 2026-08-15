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
import { calculateMc001Chapter3IntegratedRuntime } from "../physics-engine/mc001Chapter3IntegratedRuntime.mjs";

export const TECHNICAL_SYSTEMS_SCHEMA = "technical_systems_v1";
export const CHAPTER3_INSTALLATIONS_ADAPTER_VERSION =
  "building_chapter_3_installations_adapter_p8b_v1";

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
      "technicalSystems.cooling.systems[].stages[].lossRecoveredFraction"
    ]),
    optionalInputFields: Object.freeze([
      "generatorType",
      "energyCarrier",
      "servedScope",
      "nominalCapacityKW",
      "systems[].allocationFraction"
    ]),
    units: Object.freeze(["kWh/month", "fraction", "kW"]),
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
      "technicalSystems.domesticHotWater.systems[].stages[].lossKWhPerMonth",
      "technicalSystems.domesticHotWater.systems[].stages[].auxiliaryKWhPerMonth"
    ]),
    optionalInputFields: Object.freeze([
      "generatorType",
      "energyCarrier",
      "circulationEnabled",
      "systems[].allocationFraction",
      "usefulDemandSource.mode = residential_normative | table_3_3_1 | explicit_monthly",
      "usefulDemandSource.dwellingType",
      "usefulDemandSource.tableEntryId",
      "usefulDemandSource.unitCount"
    ]),
    units: Object.freeze(["kWh/month", "fraction"]),
    outputs: Object.freeze(["monthly.dhw.finalStageInputKWh", "annual.dhwInputKWh"]),
    notebookSection: "chapter3.month.*.dhw",
    reportSection: "instalatii_capitolul_3.dhw",
    uiSection: "installations.dhw",
    persistencePath: "buildingDna.technicalSystems.domesticHotWater",
    testFixture: "buildingChapter3InstallationsProduct.test.mjs"
  },
  {
    groupId: "cooling_storage_pcm",
    mc001RelationGroup: "MC001 Chapter 3 PCM storage relations 3.111-3.113",
    runtimeModule: "src/physics-engine/mc001Chapter3IntegratedRuntime.mjs",
    requiredInputFields: Object.freeze([
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
    units: Object.freeze(["kWh", "kg", "kWh/(kg*K)", "degC", "K"]),
    outputs: Object.freeze([
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

function serviceStagesForMonth(system, service, stageIds, monthIndex, diagnostics) {
  const stages = [];
  const stageMap = new Map((system?.stages ?? []).map(stage => [stage.stageId, stage]));
  for (const stageId of stageIds) {
    const stage = stageMap.get(stageId);
    if (!stage) {
      diagnostics.push(diagnostic("missing_installation_stage", `${service}.stages.${stageId}`));
      continue;
    }
    const lossPath = `${service}.stages.${stageId}.lossKWhPerMonth`;
    const auxiliaryPath = `${service}.stages.${stageId}.auxiliaryKWhPerMonth`;
    const loss = monthlyScalarWithSource(stage.lossKWhPerMonth, monthIndex, lossPath, diagnostics, stage.lossSource);
    const auxiliary = monthlyScalarWithSource(stage.auxiliaryKWhPerMonth, monthIndex, auxiliaryPath, diagnostics, stage.auxiliarySource);
    stages.push({
      stageId,
      lossKWh: loss.value,
      auxiliaryKWh: auxiliary.value,
      lossSource: loss.source,
      auxiliarySource: auxiliary.source,
      auxiliaryRecoveredFraction: fraction(
        stage.auxiliaryRecoveredFraction,
        `${service}.stages.${stageId}.auxiliaryRecoveredFraction`,
        diagnostics,
        0
      ),
      lossRecoveredFraction: fraction(
        stage.lossRecoveredFraction,
        `${service}.stages.${stageId}.lossRecoveredFraction`,
        diagnostics,
        0
      ),
      auxiliaryRecoverableFractionToHeating: fraction(
        stage.auxiliaryRecoverableFractionToHeating,
        `${service}.stages.${stageId}.auxiliaryRecoverableFractionToHeating`,
        diagnostics,
        0
      ),
      lossRecoverableFractionToHeating: fraction(
        stage.lossRecoverableFractionToHeating,
        `${service}.stages.${stageId}.lossRecoverableFractionToHeating`,
        diagnostics,
        0
      )
    });
  }
  return stages;
}

function serviceSystemsForMonth(section, service, path, stageIds, monthIndex, diagnostics) {
  const systems = activeSystems(section, path, diagnostics, { allowMultiple: true });
  if (!systems) return null;
  const multiple = systems.length > 1;
  return systems.map((system, index) => ({
    systemId: system.systemId ?? `${service}-system-${index + 1}`,
    allocationFraction: multiple ? system.allocationFraction : 1,
    stages: serviceStagesForMonth(system, service, stageIds, monthIndex, diagnostics),
    metadata: {
      systemId: system.systemId ?? `${service}-system-${index + 1}`,
      generatorType: system.generatorType ?? null,
      energyCarrier: system.energyCarrier ?? null,
      servedScope: system.servedScope ?? "whole_building",
      nominalCapacityKW: system.nominalCapacityKW ?? null
    },
    source: system.source ?? {
      origin: multiple ? "explicit_parallel_system_allocation" : "explicit_engineering_input",
      reference: `${path}.systems[${index}]`
    }
  }));
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
  return {
    fanElectricEnergyInput: deepClone(fan),
    heatRecoveryAuxiliaryKWh: optionalMonthlyScalar(system.heatRecoveryAuxiliaryKWhPerMonth, monthIndex, 0),
    preheatAuxiliaryKWh: optionalMonthlyScalar(system.preheatAuxiliaryKWhPerMonth, monthIndex, 0),
    controlAuxiliaryKWh: optionalMonthlyScalar(system.controlAuxiliaryKWhPerMonth, monthIndex, 0)
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
  return { ok: true, diagnostics: [] };
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
            diagnostics
          ),
          ...(heatingSystems.length === 1
            ? {
                heatingStages: serviceStagesForMonth(
                  heatingSystems[0],
                  "heating",
                  CHAPTER3_INSTALLATION_STAGE_IDS,
                  index,
                  diagnostics
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
            diagnostics
          ),
          ...(coolingSystems.length === 1
            ? {
                coolingStages: serviceStagesForMonth(
                  coolingSystems[0],
                  "cooling",
                  CHAPTER3_INSTALLATION_STAGE_IDS,
                  index,
                  diagnostics
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
          servedScope: heatingSystems[0].servedScope ?? "whole_building"
        } : null,
        heatingSystems: (heatingSystems ?? []).map((system, index) => ({
          systemId: system.systemId ?? `heating-system-${index + 1}`,
          generatorType: system.generatorType ?? null,
          energyCarrier: system.energyCarrier ?? null,
          servedScope: system.servedScope ?? "whole_building",
          allocationFraction: heatingSystems.length > 1 ? system.allocationFraction : 1
        })),
        cooling: coolingSystems?.[0] ? {
          systemId: coolingSystems[0].systemId ?? "cooling-system-1",
          generatorType: coolingSystems[0].generatorType ?? null,
          energyCarrier: coolingSystems[0].energyCarrier ?? null,
          servedScope: coolingSystems[0].servedScope ?? "whole_building"
        } : null,
        coolingSystems: (coolingSystems ?? []).map((system, index) => ({
          systemId: system.systemId ?? `cooling-system-${index + 1}`,
          generatorType: system.generatorType ?? null,
          energyCarrier: system.energyCarrier ?? null,
          servedScope: system.servedScope ?? "whole_building",
          allocationFraction: coolingSystems.length > 1 ? system.allocationFraction : 1
        })),
        dhw: dhwSystems?.[0]
          ? {
              energyCarrier: dhwSystems[0].energyCarrier ?? null
            }
          : null,
        dhwSystems: (dhwSystems ?? []).map((system, index) => ({
          systemId: system.systemId ?? `dhw-system-${index + 1}`,
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
