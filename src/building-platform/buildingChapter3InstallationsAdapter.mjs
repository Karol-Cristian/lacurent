import { MONTH_IDS } from "../climate-platform/index.mjs";
import { calculateMc001Chapter3IntegratedRuntime } from "../physics-engine/mc001Chapter3IntegratedRuntime.mjs";

export const TECHNICAL_SYSTEMS_SCHEMA = "technical_systems_v1";
export const CHAPTER3_INSTALLATIONS_ADAPTER_VERSION =
  "building_chapter_3_installations_adapter_p4_v1";

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
    optionalInputFields: Object.freeze(["generatorType", "energyCarrier", "servedScope", "nominalCapacityKW"]),
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
      "technicalSystems.domesticHotWater.monthlyUsefulDemandKWh",
      "technicalSystems.domesticHotWater.systems[].stages[].lossKWhPerMonth",
      "technicalSystems.domesticHotWater.systems[].stages[].auxiliaryKWhPerMonth"
    ]),
    optionalInputFields: Object.freeze(["generatorType", "energyCarrier", "circulationEnabled"]),
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

function firstActiveSystem(section, path, diagnostics) {
  if (!enabled(section)) return null;
  const systems = Array.isArray(section.systems) ? section.systems.filter(item => item?.enabled !== false) : [];
  if (systems.length === 0) {
    diagnostics.push(diagnostic("missing_installation_system", `${path}.systems`));
    return null;
  }
  if (systems.length > 1) {
    diagnostics.push(diagnostic("multiple_installation_systems_require_explicit_runtime_allocation", `${path}.systems`));
    return null;
  }
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
    const lossKWh = monthlyScalar(stage.lossKWhPerMonth, monthIndex, `${service}.stages.${stageId}.lossKWhPerMonth`, diagnostics);
    const auxiliaryKWh = monthlyScalar(stage.auxiliaryKWhPerMonth, monthIndex, `${service}.stages.${stageId}.auxiliaryKWhPerMonth`, diagnostics);
    stages.push({
      stageId,
      lossKWh,
      auxiliaryKWh,
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

function dhwForMonth(section, monthIndex, diagnostics) {
  const system = firstActiveSystem(section, "technicalSystems.domesticHotWater", diagnostics);
  if (!system) return null;
  return {
    usefulDemandKWh: monthlyScalar(
      section.monthlyUsefulDemandKWh,
      monthIndex,
      "technicalSystems.domesticHotWater.monthlyUsefulDemandKWh",
      diagnostics
    ),
    stages: serviceStagesForMonth(system, "dhw", CHAPTER3_DHW_STAGE_IDS, monthIndex, diagnostics)
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

  const heatingSystem = firstActiveSystem(technicalSystems.heating, "technicalSystems.heating", diagnostics);
  const coolingSystem = firstActiveSystem(technicalSystems.cooling, "technicalSystems.cooling", diagnostics);
  const heatingEnabled = enabled(technicalSystems.heating);
  const coolingEnabled = enabled(technicalSystems.cooling);
  const dhwEnabled = enabled(technicalSystems.domesticHotWater);
  const ventilationAhuEnabled = enabled(technicalSystems.ventilationAhu);
  const pcmEnabled = enabled(technicalSystems.coolingStoragePcm);
  const lighting = lightingInput(technicalSystems.lighting, buildingDna, diagnostics);

  const months = MONTH_IDS.map((month, index) => ({
    month,
    chapter2Useful: usefulDemand[index] ?? { month, qHndKWh: 0, qCndKWh: 0 },
    ...(heatingEnabled && heatingSystem
      ? {
          heatingStages: serviceStagesForMonth(
            heatingSystem,
            "heating",
            CHAPTER3_INSTALLATION_STAGE_IDS,
            index,
            diagnostics
          )
        }
      : {}),
    ...(coolingEnabled && coolingSystem
      ? {
          coolingStages: serviceStagesForMonth(
            coolingSystem,
            "cooling",
            CHAPTER3_INSTALLATION_STAGE_IDS,
            index,
            diagnostics
          )
        }
      : {}),
    ...(dhwEnabled ? { dhw: dhwForMonth(technicalSystems.domesticHotWater, index, diagnostics) } : {}),
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
        heating: heatingSystem ? {
          systemId: heatingSystem.systemId ?? "heating-system-1",
          generatorType: heatingSystem.generatorType ?? null,
          energyCarrier: heatingSystem.energyCarrier ?? null,
          servedScope: heatingSystem.servedScope ?? "whole_building"
        } : null,
        cooling: coolingSystem ? {
          systemId: coolingSystem.systemId ?? "cooling-system-1",
          generatorType: coolingSystem.generatorType ?? null,
          energyCarrier: coolingSystem.energyCarrier ?? null,
          servedScope: coolingSystem.servedScope ?? "whole_building"
        } : null,
        dhw: firstActiveSystem(technicalSystems.domesticHotWater, "technicalSystems.domesticHotWater", [])
          ? {
              energyCarrier: firstActiveSystem(technicalSystems.domesticHotWater, "technicalSystems.domesticHotWater", [])?.energyCarrier ?? null
            }
          : null,
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
