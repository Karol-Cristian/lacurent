import {
  calculateChapter3SubsystemInputEnergyBalance,
  calculateChapter3SubsystemRecoverableEnergy
} from "./mc001Chapter3HeatingSystems.mjs";
import {
  calculateChapter3CoolingAuxiliaryEnergyTotal,
  calculateChapter3HeatingAuxiliaryEnergyTotal,
  calculateCoolingStoragePcmInputEnergyLimitForSolidSensibleStorage,
  calculateCoolingStoragePcmSensibleSolidStorageEnergy,
  calculateCoolingStoragePcmSolidMassDecreaseVariation,
  calculateFanElectricEnergy,
  calculateLightingLeniFromSubspaces,
  calculateVentilationAuxiliaryTotal
} from "./mc001Chapter3SystemEnergy.mjs";

function assertFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

function assertFiniteNonNegativeNumber(value, name) {
  assertFiniteNumber(value, name);
  if (value < 0) {
    throw new Error(`${name} must be a finite non-negative number`);
  }
}

function assertArray(items, name) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`${name} must be a non-empty array`);
  }
}

function assertFraction(value, name) {
  assertFiniteNumber(value, name);
  if (value < 0 || value > 1) {
    throw new Error(`${name} must be between 0 and 1`);
  }
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function directExecutionTrace({
  formulaId,
  branchId,
  inputs,
  rawResult,
  finalResult,
  unit,
  provenance
}) {
  return {
    schema: "mc001_execution_trace_v1",
    chapter: "3",
    formulaId,
    branchId,
    inputs,
    rawResult,
    finalResult,
    unit,
    clampApplied: false,
    status: "direct_result",
    provenance
  };
}

function aggregateCalculatedResults(results, valueKey, unit, formulaId, branchId) {
  const value = sum(results.map(result => result?.[valueKey] ?? result?.value ?? 0));
  const inputs = Object.fromEntries(
    results.map((result, index) => [
      `system_${index + 1}`,
      {
        value: result?.[valueKey] ?? result?.value ?? 0,
        unit,
        formulaId: result?.formulaId ?? null
      }
    ])
  );
  return {
    status: "calculated",
    value,
    [valueKey]: value,
    unit,
    formulaId,
    inputs,
    warnings: [],
    executionTrace: directExecutionTrace({
      formulaId,
      branchId,
      inputs,
      rawResult: value,
      finalResult: value,
      unit,
      provenance: {
        source: "MC001 Chapter 3 explicit parallel-system aggregation",
        aggregation: "sum of explicitly allocated system chains"
      }
    }),
    trace: {
      formulaId,
      formulaText: "parallel-system aggregation := sum(system results)",
      inputValues: inputs,
      result: value,
      unit,
      assumptions: ["Multiple systems require explicit allocation fractions; no hidden default split is inferred."],
      warnings: []
    }
  };
}

function stageBalance({
  service,
  stage,
  outputKWh,
  lossKWh,
  auxiliaryKWh,
  auxiliaryRecoveredFraction,
  lossRecoveredFraction
}) {
  return calculateChapter3SubsystemInputEnergyBalance({
    subsystemId: `${service}.${stage}`,
    subsystemOutputKWh: outputKWh,
    subsystemLossKWh: lossKWh,
    auxiliaryEnergyKWh: auxiliaryKWh,
    auxiliaryRecoveredFraction,
    lossRecoveredFraction
  });
}

function recoverableStage({
  service,
  stage,
  lossKWh,
  auxiliaryKWh,
  auxiliaryRecoverableFractionToHeating,
  lossRecoverableFractionToHeating
}) {
  return calculateChapter3SubsystemRecoverableEnergy({
    subsystemId: `${service}.${stage}`,
    auxiliaryEnergyKWh: auxiliaryKWh,
    auxiliaryRecoverableFractionToHeating,
    subsystemLossKWh: lossKWh,
    lossRecoverableFractionToHeating
  });
}

function calculateServiceChain({ service, usefulDemandKWh, stages, monthId }) {
  assertFiniteNonNegativeNumber(usefulDemandKWh, `${service}.${monthId}.usefulDemandKWh`);
  assertArray(stages, `${service}.${monthId}.stages`);

  let outputKWh = usefulDemandKWh;
  const stageResults = [];
  for (const [index, stage] of stages.entries()) {
    const stageId = stage.stageId ?? `stage_${index + 1}`;
    assertFiniteNonNegativeNumber(stage.lossKWh, `${service}.${monthId}.${stageId}.lossKWh`);
    assertFiniteNonNegativeNumber(
      stage.auxiliaryKWh,
      `${service}.${monthId}.${stageId}.auxiliaryKWh`
    );
    assertFraction(
      stage.auxiliaryRecoveredFraction,
      `${service}.${monthId}.${stageId}.auxiliaryRecoveredFraction`
    );
    assertFraction(
      stage.lossRecoveredFraction,
      `${service}.${monthId}.${stageId}.lossRecoveredFraction`
    );
    assertFraction(
      stage.auxiliaryRecoverableFractionToHeating,
      `${service}.${monthId}.${stageId}.auxiliaryRecoverableFractionToHeating`
    );
    assertFraction(
      stage.lossRecoverableFractionToHeating,
      `${service}.${monthId}.${stageId}.lossRecoverableFractionToHeating`
    );

    const input = stageBalance({
      service,
      stage: stageId,
      outputKWh,
      lossKWh: stage.lossKWh,
      auxiliaryKWh: stage.auxiliaryKWh,
      auxiliaryRecoveredFraction: stage.auxiliaryRecoveredFraction,
      lossRecoveredFraction: stage.lossRecoveredFraction
    });
    const recoverable = recoverableStage({
      service,
      stage: stageId,
      lossKWh: stage.lossKWh,
      auxiliaryKWh: stage.auxiliaryKWh,
      auxiliaryRecoverableFractionToHeating: stage.auxiliaryRecoverableFractionToHeating,
      lossRecoverableFractionToHeating: stage.lossRecoverableFractionToHeating
    });

    stageResults.push({
      stageId,
      outputKWh,
      lossKWh: stage.lossKWh,
      auxiliaryKWh: stage.auxiliaryKWh,
      lossSource: stage.lossSource ?? null,
      auxiliarySource: stage.auxiliarySource ?? null,
      inputEnergy: input,
      recoverableEnergy: recoverable
    });
    outputKWh = input.valueKWh;
  }

  return {
    service,
    usefulDemandKWh,
    finalStageInputKWh: outputKWh,
    stageResults,
    lossTotalKWh: sum(stages.map(stage => stage.lossKWh)),
    auxiliaryTotalKWh: sum(stages.map(stage => stage.auxiliaryKWh)),
    recoverableTotalKWh: sum(stageResults.map(stage => stage.recoverableEnergy.valueKWh))
  };
}

function defaultSystemMetadata(systemMetadata, service) {
  const pluralKey = service === "dhw" ? "dhwSystems" : `${service}Systems`;
  if (Array.isArray(systemMetadata?.[pluralKey]) && systemMetadata[pluralKey].length > 0) {
    return systemMetadata[pluralKey];
  }
  return systemMetadata?.[service] ? [systemMetadata[service]] : [];
}

function normalizeSystemsForService({
  service,
  month,
  systemMetadata,
  systems,
  legacyStages
}) {
  const metadata = defaultSystemMetadata(systemMetadata, service);
  const explicitSystems = Array.isArray(systems) && systems.length > 0
    ? systems
    : null;
  if (!explicitSystems) {
    return [
      {
        systemId: metadata[0]?.systemId ?? `${service}-system-1`,
        allocationFraction: 1,
        stages: legacyStages,
        metadata: metadata[0] ?? {}
      }
    ];
  }

  return explicitSystems.map((system, index) => ({
    systemId: system.systemId ?? metadata[index]?.systemId ?? `${service}-system-${index + 1}`,
    allocationFraction: system.allocationFraction,
    stages: system.stages,
    metadata: {
      ...(metadata[index] ?? {}),
      ...(system.metadata ?? {})
    },
    source: system.source ?? null,
    month: month?.month ?? null
  }));
}

function aggregateStageResults(systemResults) {
  const stageOrder = [];
  for (const system of systemResults) {
    for (const stage of system.stageResults ?? []) {
      if (!stageOrder.includes(stage.stageId)) stageOrder.push(stage.stageId);
    }
  }

  return stageOrder.map(stageId => {
    const stageParts = systemResults.flatMap(system =>
      (system.stageResults ?? [])
        .filter(stage => stage.stageId === stageId)
        .map(stage => ({ ...stage, systemId: system.systemId }))
    );
    const inputResults = stageParts.map(stage => stage.inputEnergy);
    const recoverableResults = stageParts.map(stage => stage.recoverableEnergy);
    return {
      stageId,
      outputKWh: sum(stageParts.map(stage => stage.outputKWh)),
      lossKWh: sum(stageParts.map(stage => stage.lossKWh)),
      auxiliaryKWh: sum(stageParts.map(stage => stage.auxiliaryKWh)),
      inputEnergy: aggregateCalculatedResults(
        inputResults,
        "valueKWh",
        "kWh",
        "MC001_CHAPTER_3_PARALLEL_STAGE_INPUT_AGGREGATION",
        `parallel_${stageId}_input_sum`
      ),
      recoverableEnergy: aggregateCalculatedResults(
        recoverableResults,
        "valueKWh",
        "kWh",
        "MC001_CHAPTER_3_PARALLEL_STAGE_RECOVERABLE_AGGREGATION",
        `parallel_${stageId}_recoverable_sum`
      ),
      systemBreakdown: stageParts.map(stage => ({
        systemId: stage.systemId,
        outputKWh: stage.outputKWh,
        lossKWh: stage.lossKWh,
        auxiliaryKWh: stage.auxiliaryKWh,
        lossSource: stage.lossSource ?? null,
        auxiliarySource: stage.auxiliarySource ?? null,
        inputKWh: stage.inputEnergy.valueKWh,
        recoverableKWh: stage.recoverableEnergy.valueKWh
      }))
    };
  });
}

function calculateServiceTopology({
  service,
  usefulDemandKWh,
  usefulDemandSource,
  monthId,
  month,
  systems,
  legacyStages,
  systemMetadata
}) {
  assertFiniteNonNegativeNumber(usefulDemandKWh, `${service}.${monthId}.usefulDemandKWh`);
  const serviceSystems = normalizeSystemsForService({
    service,
    month,
    systemMetadata,
    systems,
    legacyStages
  });
  assertArray(serviceSystems, `${service}.${monthId}.systems`);

  let allocationSum = 0;
  const systemResults = serviceSystems.map((system, index) => {
    assertFraction(
      system.allocationFraction,
      `${service}.${monthId}.systems[${index}].allocationFraction`
    );
    allocationSum += system.allocationFraction;
    const allocatedUsefulDemandKWh = usefulDemandKWh * system.allocationFraction;
    const chain = calculateServiceChain({
      service,
      usefulDemandKWh: allocatedUsefulDemandKWh,
      stages: system.stages,
      monthId
    });
    return {
      ...chain,
      systemId: system.systemId,
      allocationFraction: system.allocationFraction,
      allocatedUsefulDemandKWh,
      usefulDemandSource: usefulDemandSource ?? null,
      metadata: system.metadata,
      source: system.source
    };
  });

  if (Math.abs(allocationSum - 1) > 1e-9) {
    throw new Error(`${service}.${monthId}.systems allocationFraction values must sum to 1`);
  }

  if (systemResults.length === 1) {
    return {
      ...systemResults[0],
      usefulDemandKWh,
      usefulDemandSource: usefulDemandSource ?? null,
      finalStageInputKWh: systemResults[0].finalStageInputKWh,
      systemResults,
      topology: {
        systemCount: 1,
        allocationPolicy: "implicit_single_system_allocation"
      }
    };
  }

  return {
    service,
    usefulDemandKWh,
    usefulDemandSource: usefulDemandSource ?? null,
    finalStageInputKWh: sum(systemResults.map(system => system.finalStageInputKWh)),
    stageResults: aggregateStageResults(systemResults),
    systemResults,
    lossTotalKWh: sum(systemResults.map(system => system.lossTotalKWh)),
    auxiliaryTotalKWh: sum(systemResults.map(system => system.auxiliaryTotalKWh)),
    recoverableTotalKWh: sum(systemResults.map(system => system.recoverableTotalKWh)),
    topology: {
      systemCount: systemResults.length,
      allocationPolicy: "explicit_allocation_fraction"
    }
  };
}

function calculateVentilationMonth(month) {
  if (!month.ventilation) return null;
  const fan =
    month.ventilation.fanElectricEnergyInput
      ? calculateFanElectricEnergy(month.ventilation.fanElectricEnergyInput)
      : null;
  const heatRecoveryAuxiliaryKWh =
    month.ventilation.heatRecoveryAuxiliaryKWh ?? 0;
  const preheatAuxiliaryKWh = month.ventilation.preheatAuxiliaryKWh ?? 0;
  const controlAuxiliaryKWh = month.ventilation.controlAuxiliaryKWh ?? 0;
  assertFiniteNonNegativeNumber(heatRecoveryAuxiliaryKWh, `${month.month}.heatRecoveryAuxiliaryKWh`);
  assertFiniteNonNegativeNumber(preheatAuxiliaryKWh, `${month.month}.preheatAuxiliaryKWh`);
  assertFiniteNonNegativeNumber(controlAuxiliaryKWh, `${month.month}.controlAuxiliaryKWh`);
  const auxiliary = calculateVentilationAuxiliaryTotal({
    heatRecoveryAuxiliaryKWh: heatRecoveryAuxiliaryKWh + (fan?.valueKWh ?? 0),
    preheatAuxiliaryKWh,
    controlAuxiliaryKWh
  });

  return {
    fanElectricEnergy: fan,
    auxiliaryEnergy: auxiliary,
    valueKWh: auxiliary.valueKWh,
    sources: {
      heatRecoveryAuxiliary: month.ventilation.heatRecoveryAuxiliarySource ?? null,
      preheatAuxiliary: month.ventilation.preheatAuxiliarySource ?? null,
      controlAuxiliary: month.ventilation.controlAuxiliarySource ?? null
    }
  };
}

function calculateLighting(input) {
  if (!input) return null;
  const leni = Array.isArray(input.leniSubspaces) && input.leniSubspaces.length > 0
    ? calculateLightingLeniFromSubspaces({
        subspaces: input.leniSubspaces,
        totalAreaM2: input.totalAreaM2
      })
    : null;
  const monthly = input.monthlyEnergyKWh ?? [];
  if (monthly.length > 0) {
    for (const [index, value] of monthly.entries()) {
      assertFiniteNonNegativeNumber(value, `lighting.monthlyEnergyKWh[${index}]`);
    }
  }
  return {
    leni,
    monthlyEnergyKWh: monthly,
    annualEnergyKWh: sum(monthly)
  };
}

function monthlyValue(values, index, name) {
  if (!Array.isArray(values) || index >= values.length) {
    throw new Error(`${name} must provide a value for every Chapter 3 month`);
  }
  assertFiniteNonNegativeNumber(values[index], `${name}[${index}]`);
  return values[index];
}

function monthlyOptionalValue(values, index) {
  if (!Array.isArray(values)) return null;
  return values[index] ?? null;
}

function calculatePcmStorageMonth(input, monthId) {
  if (!input) return null;
  const sensibleStorage = calculateCoolingStoragePcmSensibleSolidStorageEnergy({
    transformableEnergyKWh: input.sensibleStorageTransformableEnergyKWh,
    solidMassKg: input.solidMassKg,
    solidSpecificHeatKWhPerKgK: input.solidSpecificHeatKWhPerKgK,
    generatorOutletFlowTemperatureC: input.generatorOutletFlowTemperatureC,
    transitionTemperatureC: input.transitionTemperatureC
  });
  const inputLimit = calculateCoolingStoragePcmInputEnergyLimitForSolidSensibleStorage({
    solidMassKg: input.solidMassKg,
    solidSpecificHeatKWhPerKgK: input.solidSpecificHeatKWhPerKgK,
    generatorOutletFlowDeltaK: input.generatorOutletFlowDeltaK
  });
  const solidMassDecrease = calculateCoolingStoragePcmSolidMassDecreaseVariation({
    transformableEnergyKWh: input.massDecreaseTransformableEnergyKWh,
    latentHeatKWhPerKg: input.latentHeatKWhPerKg,
    solidSpecificHeatKWhPerKgK: input.solidSpecificHeatKWhPerKgK,
    transitionTemperatureC: input.transitionTemperatureC,
    initialSolidMassKg: input.initialSolidMassKg
  });

  return {
    month: monthId,
    sensibleStorage,
    inputLimit,
    solidMassDecrease,
    totals: {
      sensibleSolidStorageEnergyKWh: sensibleStorage.valueKWh,
      inputEnergyLimitKWh: inputLimit.valueKWh,
      solidMassDecreaseKg: solidMassDecrease.valueKg
    }
  };
}

export function calculateMc001Chapter3IntegratedRuntime(input = {}) {
  const { months, lighting, coolingStoragePcm, services = {}, systemMetadata = {} } = input;
  assertArray(months, "months");

  const heatingEnabled = services.heatingEnabled !== false;
  const coolingEnabled = services.coolingEnabled !== false;
  const dhwEnabled = services.dhwEnabled !== false;
  const ventilationAhuEnabled = services.ventilationAhuEnabled !== false;
  const coolingStoragePcmEnabled = services.coolingStoragePcmEnabled !== false;
  const lightingEnabled = services.lightingEnabled !== false;
  const lightingResult = lightingEnabled ? calculateLighting(lighting) : null;
  const monthly = months.map((month, index) => {
    const monthId = month.month ?? `month_${index + 1}`;
    const heating = heatingEnabled
      ? calculateServiceTopology({
          service: "heating",
          monthId,
          month,
          usefulDemandKWh: month.chapter2Useful?.qHndKWh,
          legacyStages: month.heatingStages,
          systems: month.heatingSystems,
          systemMetadata
        })
      : null;
    const cooling = coolingEnabled
      ? calculateServiceTopology({
          service: "cooling",
          monthId,
          month,
          usefulDemandKWh: month.chapter2Useful?.qCndKWh,
          legacyStages: month.coolingStages,
          systems: month.coolingSystems,
          systemMetadata
        })
      : null;
    const dhw = dhwEnabled && month.dhw
      ? calculateServiceTopology({
          service: "dhw",
          monthId,
          month,
          usefulDemandKWh: month.dhw.usefulDemandKWh,
          usefulDemandSource: month.dhw.usefulDemandSource,
          legacyStages: month.dhw.stages,
          systems: month.dhw.systems,
          systemMetadata
        })
      : null;
    const ventilation = ventilationAhuEnabled ? calculateVentilationMonth(month) : null;
    const lightingEnergyKWh = lightingEnabled && lightingResult
      ? monthlyValue(lightingResult.monthlyEnergyKWh, index, "lighting.monthlyEnergyKWh")
      : 0;
    const pcmStorage = coolingStoragePcmEnabled
      ? calculatePcmStorageMonth(
          month.coolingStoragePcm ?? monthlyOptionalValue(coolingStoragePcm?.monthly, index),
          monthId
        )
      : null;

    return {
      month: monthId,
      heating,
      cooling,
      dhw,
      ventilation,
      coolingStoragePcm: pcmStorage,
      lightingEnergyKWh,
      totals: {
        heatingInputKWh: heating?.finalStageInputKWh ?? 0,
        coolingInputKWh: cooling?.finalStageInputKWh ?? 0,
        dhwInputKWh: dhw?.finalStageInputKWh ?? 0,
        ventilationAuxiliaryKWh: ventilation?.valueKWh ?? 0,
        pcmSensibleSolidStorageEnergyKWh: pcmStorage?.totals.sensibleSolidStorageEnergyKWh ?? 0,
        pcmInputEnergyLimitKWh: pcmStorage?.totals.inputEnergyLimitKWh ?? 0,
        pcmSolidMassDecreaseKg: pcmStorage?.totals.solidMassDecreaseKg ?? 0,
        lightingEnergyKWh
      }
    };
  });

  const annual = {
    heatingInputKWh: sum(monthly.map(month => month.totals.heatingInputKWh)),
    coolingInputKWh: sum(monthly.map(month => month.totals.coolingInputKWh)),
    dhwInputKWh: sum(monthly.map(month => month.totals.dhwInputKWh)),
    ventilationAuxiliaryKWh: sum(monthly.map(month => month.totals.ventilationAuxiliaryKWh)),
    pcmSensibleSolidStorageEnergyKWh: sum(monthly.map(month => month.totals.pcmSensibleSolidStorageEnergyKWh)),
    pcmInputEnergyLimitKWh: sum(monthly.map(month => month.totals.pcmInputEnergyLimitKWh)),
    pcmSolidMassDecreaseKg: sum(monthly.map(month => month.totals.pcmSolidMassDecreaseKg)),
    lightingEnergyKWh: sum(monthly.map(month => month.totals.lightingEnergyKWh)),
    heatingAuxiliaryKWh: sum(monthly.map(month => month.heating?.auxiliaryTotalKWh ?? 0)),
    coolingAuxiliaryKWh: sum(monthly.map(month => month.cooling?.auxiliaryTotalKWh ?? 0))
  };

  const heatingAuxiliary = calculateChapter3HeatingAuxiliaryEnergyTotal({
    emissionAuxiliaryKWh: sum(monthly.map(month => month.heating?.stageResults?.[0]?.auxiliaryKWh ?? 0)),
    distributionAuxiliaryKWh: sum(monthly.map(month => month.heating?.stageResults?.[1]?.auxiliaryKWh ?? 0)),
    storageAuxiliaryKWh: sum(monthly.map(month => month.heating?.stageResults?.[2]?.auxiliaryKWh ?? 0)),
    generationAuxiliaryKWh: sum(monthly.map(month => month.heating?.stageResults?.[3]?.auxiliaryKWh ?? 0))
  });
  const coolingAuxiliary = calculateChapter3CoolingAuxiliaryEnergyTotal({
    emissionAuxiliaryKWh: sum(monthly.map(month => month.cooling?.stageResults?.[0]?.auxiliaryKWh ?? 0)),
    distributionAuxiliaryKWh: sum(monthly.map(month => month.cooling?.stageResults?.[1]?.auxiliaryKWh ?? 0)),
    storageAuxiliaryKWh: sum(monthly.map(month => month.cooling?.stageResults?.[2]?.auxiliaryKWh ?? 0)),
    generationAuxiliaryKWh: sum(monthly.map(month => month.cooling?.stageResults?.[3]?.auxiliaryKWh ?? 0))
  });
  const servicesSummary = {
    heating: { enabled: heatingEnabled, annualKWh: annual.heatingInputKWh },
    cooling: { enabled: coolingEnabled, annualKWh: annual.coolingInputKWh },
    dhw: { enabled: dhwEnabled, annualKWh: annual.dhwInputKWh },
    ventilationAhu: { enabled: ventilationAhuEnabled, annualKWh: annual.ventilationAuxiliaryKWh },
    coolingStoragePcm: { enabled: coolingStoragePcmEnabled, annualKWh: annual.pcmInputEnergyLimitKWh },
    lighting: { enabled: lightingEnabled && lightingResult !== null, annualKWh: annual.lightingEnergyKWh }
  };
  const energyByService = {
    heating: annual.heatingInputKWh,
    cooling: annual.coolingInputKWh,
    domesticHotWater: annual.dhwInputKWh,
    ventilationAuxiliary: annual.ventilationAuxiliaryKWh,
    lighting: annual.lightingEnergyKWh
  };
  const energyByCarrier = {};
  for (const service of ["heating", "cooling", "dhw"]) {
    for (const month of monthly) {
      for (const system of month[service]?.systemResults ?? []) {
        const carrier = system.metadata?.energyCarrier ?? systemMetadata?.[service]?.energyCarrier;
        if (carrier && system.finalStageInputKWh > 0) {
          energyByCarrier[carrier] = (energyByCarrier[carrier] ?? 0) + system.finalStageInputKWh;
        }
      }
    }
  }
  if (annual.ventilationAuxiliaryKWh > 0) {
    energyByCarrier.electricity = (energyByCarrier.electricity ?? 0) + annual.ventilationAuxiliaryKWh;
  }
  if (annual.lightingEnergyKWh > 0) {
    energyByCarrier.electricity = (energyByCarrier.electricity ?? 0) + annual.lightingEnergyKWh;
  }

  const dhwUsefulFormulaReferences = [
    ...new Set(
      monthly.flatMap(month => month.dhw?.usefulDemandSource?.formulaIds ?? [])
    )
  ];

  return {
    status: "calculated",
    calculationScope: "MC001_CHAPTER_3_EXPLICIT_RUNTIME_CHAIN",
    services: servicesSummary,
    systemMetadata,
    monthCount: monthly.length,
    monthly,
    annual,
    energyByService,
    energyByCarrier,
    lighting: lightingResult,
    auxiliary: {
      heating: heatingAuxiliary,
      cooling: coolingAuxiliary
    },
    formulaReferences: [
      "MC001_3_A_SUBSYSTEM_INPUT_ENERGY_BALANCE",
      "MC001_3_B_SUBSYSTEM_RECOVERABLE_ENERGY",
      "MC001_3_185_TOTAL_HEATING_AUXILIARY_ENERGY",
      "MC001_3_186_TOTAL_COOLING_AUXILIARY_ENERGY",
      ...(monthly.some(month => month.coolingStoragePcm)
        ? [
            "MC001_3_111_COOLING_STORAGE_PCM_SENSIBLE_SOLID_STORAGE_ENERGY",
            "MC001_3_112_COOLING_STORAGE_PCM_INPUT_ENERGY_LIMIT",
            "MC001_3_113_COOLING_STORAGE_PCM_SOLID_MASS_DECREASE_VARIATION"
          ]
        : []),
      ...dhwUsefulFormulaReferences,
      ...(lightingResult ? ["MC001_3_4_34_LIGHTING_LENI_WEIGHTED_BUILDING"] : [])
    ]
  };
}
