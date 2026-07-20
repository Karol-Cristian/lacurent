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
    valueKWh: auxiliary.valueKWh
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
      ? calculateServiceChain({
          service: "heating",
          monthId,
          usefulDemandKWh: month.chapter2Useful?.qHndKWh,
          stages: month.heatingStages
        })
      : null;
    const cooling = coolingEnabled
      ? calculateServiceChain({
          service: "cooling",
          monthId,
          usefulDemandKWh: month.chapter2Useful?.qCndKWh,
          stages: month.coolingStages
        })
      : null;
    const dhw = dhwEnabled && month.dhw
      ? calculateServiceChain({
          service: "dhw",
          monthId,
          usefulDemandKWh: month.dhw.usefulDemandKWh,
          stages: month.dhw.stages
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
  for (const [service, key] of [
    ["heating", "heatingInputKWh"],
    ["cooling", "coolingInputKWh"],
    ["dhw", "dhwInputKWh"]
  ]) {
    const carrier = systemMetadata?.[service]?.energyCarrier;
    if (carrier && annual[key] > 0) {
      energyByCarrier[carrier] = (energyByCarrier[carrier] ?? 0) + annual[key];
    }
  }
  if (annual.ventilationAuxiliaryKWh > 0) {
    energyByCarrier.electricity = (energyByCarrier.electricity ?? 0) + annual.ventilationAuxiliaryKWh;
  }
  if (annual.lightingEnergyKWh > 0) {
    energyByCarrier.electricity = (energyByCarrier.electricity ?? 0) + annual.lightingEnergyKWh;
  }

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
      ...(lightingResult ? ["MC001_3_4_34_LIGHTING_LENI_WEIGHTED_BUILDING"] : [])
    ]
  };
}
