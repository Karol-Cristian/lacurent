import {
  calculateChapter3SubsystemInputEnergyBalance,
  calculateChapter3SubsystemRecoverableEnergy,
  calculateCentralGeneratorOutputEnergy,
  calculateGenerationLossTotal,
  calculateHeatingGenerationAuxiliaryTotal,
  calculateHeatingGeneratorAuxiliaryEnergy,
  calculateHeatingGeneratorAuxiliaryRecoverableLoss,
  calculateHeatingGeneratorAuxiliaryRecoveredLoss,
  calculateHeatingGeneratorFuelInputEnergy,
  calculateHeatingGeneratorLossEnergy,
  calculateHeatingGeneratorOperationTime,
  calculateHeatingGeneratorUtilizationFactor,
  calculateRecoverableGenerationLossTotal,
  calculateTotalGenerationAuxiliaryRecoveredLoss
} from "./mc001Chapter3HeatingSystems.mjs";
import {
  calculateChapter3CoolingAuxiliaryEnergyTotal,
  calculateChapter3HeatingAuxiliaryEnergyTotal,
  calculateCoolingStorageGeneratorDeltaEnergy,
  calculateCoolingStorageIceMassVariation,
  calculateCoolingStorageIceThickness,
  calculateCoolingStorageInitialIceThickness,
  calculateCoolingStorageLatentEnergy,
  calculateCoolingStorageOutputEnergy,
  calculateCoolingStoragePcmInputEnergyLimitForSolidSensibleStorage,
  calculateCoolingStoragePcmLiquidTemperature,
  calculateCoolingStoragePcmSensibleSolidStorageEnergy,
  calculateCoolingStoragePcmSolidMassDecreaseVariation,
  calculateCoolingStoragePcmSolidMassVariation,
  calculateCoolingStoragePcmSolidTemperature,
  calculateCoolingStorageSensibleLiquidEnergy,
  calculateCoolingStorageSensibleSolidEnergy,
  calculateCoolingStorageSolidMassAfterUse,
  calculateCoolingStorageTransformableEnergyWater,
  calculateFanElectricEnergy,
  calculateLightingLeniFromSubspaces,
  calculateVentilationAuxiliaryTotal,
  limitCoolingStoragePcmSolidMassToExistingSolid,
  limitCoolingStoragePcmSolidMassToLiquid,
  validateCoolingStorageInputEnergy
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

function monthValue(value, index, name) {
  const selected = Array.isArray(value) ? value[index] : value;
  assertFiniteNonNegativeNumber(selected, name);
  return selected;
}

function optionalMonthValue(value, index) {
  if (Array.isArray(value)) return value[index] ?? null;
  return value ?? null;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
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

function serviceGeneratorLoads(serviceResult, service) {
  return (serviceResult?.systemResults ?? [])
    .filter(system => system.metadata?.generatorRef)
    .map(system => {
      const generationStage =
        (system.stageResults ?? []).find(stage => stage.stageId === "generation") ??
        (system.stageResults ?? []).at(-1);
      return {
        service,
        systemId: system.systemId,
        generatorRef: system.metadata.generatorRef,
        loadKWh: generationStage?.outputKWh ?? system.finalStageInputKWh ?? 0,
        stageId: generationStage?.stageId ?? null
      };
    });
}

function sharedGeneratorsList(sharedComponents = {}) {
  return Array.isArray(sharedComponents.generators)
    ? sharedComponents.generators.filter(generator => generator?.enabled !== false)
    : [];
}

function sharedGeneratorOperationHours(generator, monthIndex) {
  const explicitHours = optionalMonthValue(generator.operationHours, monthIndex);
  if (finiteNumber(explicitHours)) {
    assertFiniteNonNegativeNumber(explicitHours, `${generator.componentId}.operationHours`);
    return {
      value: explicitHours,
      source: {
        mode: "operation_schedule_input",
        classification: "OPERATION_SCHEDULE"
      },
      result: null
    };
  }
  if (generator.operationTimeCalculation) {
    const input = Object.fromEntries(
      Object.entries(generator.operationTimeCalculation).map(([key, value]) => [
        key,
        monthValue(value, monthIndex, `${generator.componentId}.operationTimeCalculation.${key}`)
      ])
    );
    const result = calculateHeatingGeneratorOperationTime(input);
    return {
      value: result.valueHours,
      source: {
        mode: "mc001_central_generator_operation_time",
        classification: "NUMERICALLY_IMPLEMENTED"
      },
      result
    };
  }
  throw new Error(`${generator.componentId}.operationHours or operationTimeCalculation is required`);
}

function normalizeSharedServiceFractions(generator, connectedLoads) {
  const services = [...new Set(connectedLoads.map(load => load.service))];
  if (services.length === 1) return { [services[0]]: 1 };
  const allocation = generator.serviceAllocationFractions;
  if (!allocation || typeof allocation !== "object" || Array.isArray(allocation)) {
    throw new Error(`${generator.componentId}.serviceAllocationFractions is required for a shared generator`);
  }
  let total = 0;
  const fractions = {};
  for (const service of services) {
    const fraction = allocation[service];
    assertFraction(fraction, `${generator.componentId}.serviceAllocationFractions.${service}`);
    fractions[service] = fraction;
    total += fraction;
  }
  if (Math.abs(total - 1) > 1e-9) {
    throw new Error(`${generator.componentId}.serviceAllocationFractions must sum to 1 for connected services`);
  }
  return fractions;
}

function allocatedValuesByService(totalValue, fractions) {
  return Object.fromEntries(
    Object.entries(fractions).map(([service, fraction]) => [service, totalValue * fraction])
  );
}

function calculateSharedGeneratorMonth({
  generator,
  monthId,
  monthIndex,
  connectedLoads
}) {
  const componentId = generator.componentId;
  if (!componentId) throw new Error("shared generator componentId is required");
  if (connectedLoads.length === 0) {
    return null;
  }
  const operation = sharedGeneratorOperationHours(generator, monthIndex);
  const controlLossFactor = monthValue(
    generator.controlLossFactor,
    monthIndex,
    `${componentId}.controlLossFactor`
  );
  const lossPowerKW = monthValue(
    generator.lossPowerKW,
    monthIndex,
    `${componentId}.lossPowerKW`
  );
  const auxiliaryPowerKW = monthValue(
    generator.auxiliaryPowerKW,
    monthIndex,
    `${componentId}.auxiliaryPowerKW`
  );
  const recoveredAuxiliaryFraction = monthValue(
    generator.recoveredAuxiliaryFraction,
    monthIndex,
    `${componentId}.recoveredAuxiliaryFraction`
  );
  const auxiliaryRecoverableFraction = monthValue(
    generator.auxiliaryRecoverableFractionToHeating,
    monthIndex,
    `${componentId}.auxiliaryRecoverableFractionToHeating`
  );
  const lossRecoverableFraction = monthValue(
    generator.lossRecoverableFractionToHeating,
    monthIndex,
    `${componentId}.lossRecoverableFractionToHeating`
  );
  const renewableGeneratorHeatKWh = monthValue(
    generator.renewableGeneratorHeatKWh,
    monthIndex,
    `${componentId}.renewableGeneratorHeatKWh`
  );
  const dhwStorageOrDistributionLossKWh = monthValue(
    generator.dhwStorageOrDistributionLossKWh,
    monthIndex,
    `${componentId}.dhwStorageOrDistributionLossKWh`
  );

  const output = calculateCentralGeneratorOutputEnergy({
    controlLossFactor,
    heatingDistributionInputKWh: connectedLoads
      .filter(load => load.service === "heating")
      .map(load => load.loadKWh),
    otherServiceDistributionInputKWh: connectedLoads
      .filter(load => load.service !== "heating")
      .map(load => load.loadKWh)
  });
  const loss = calculateHeatingGeneratorLossEnergy({
    generatorLossPowerKW: lossPowerKW,
    operationHours: operation.value
  });
  const auxiliary = calculateHeatingGeneratorAuxiliaryEnergy({
    auxiliaryPowerKW,
    operationHours: operation.value
  });
  const recoveredAuxiliary = calculateHeatingGeneratorAuxiliaryRecoveredLoss({
    generationAuxiliaryEnergyKWh: auxiliary.valueKWh,
    recoveredAuxiliaryFraction
  });
  const recoverableAuxiliary = calculateHeatingGeneratorAuxiliaryRecoverableLoss({
    generationAuxiliaryEnergyKWh: auxiliary.valueKWh,
    boilerRoomRecoveryFactor: monthValue(
      generator.boilerRoomRecoveryFactor,
      monthIndex,
      `${componentId}.boilerRoomRecoveryFactor`
    ),
    auxiliaryRecoverableFraction
  });
  const fractions = normalizeSharedServiceFractions(generator, connectedLoads);
  const allocatedLosses = allocatedValuesByService(loss.valueKWh, fractions);
  const allocatedAuxiliaries = allocatedValuesByService(auxiliary.valueKWh, fractions);
  const allocatedRecoverableLosses = allocatedValuesByService(
    loss.valueKWh * lossRecoverableFraction,
    fractions
  );
  const allocatedRecoveredAuxiliaries = allocatedValuesByService(
    recoveredAuxiliary.valueKWh,
    fractions
  );
  const auxiliaryTotal = calculateHeatingGenerationAuxiliaryTotal({
    heatingAuxiliaryKWh:
      allocatedAuxiliaries.heating === undefined ? [] : [allocatedAuxiliaries.heating],
    otherServiceAuxiliaryKWh: Object.entries(allocatedAuxiliaries)
      .filter(([service]) => service !== "heating")
      .map(([, value]) => value)
  });
  const lossTotal = calculateGenerationLossTotal({
    heatingGenerationLossKWh: allocatedLosses.heating ?? 0,
    otherServiceGenerationLossesKWh: Object.entries(allocatedLosses)
      .filter(([service]) => service !== "heating")
      .map(([, value]) => value),
    dhwStorageOrDistributionLossKWh
  });
  const recoverableTotal = calculateRecoverableGenerationLossTotal({
    heatingGenerationRecoverableLossKWh: allocatedRecoverableLosses.heating ?? 0,
    otherServiceRecoverableLossesKWh: Object.entries(allocatedRecoverableLosses)
      .filter(([service]) => service !== "heating")
      .map(([, value]) => value),
    heatingAuxiliaryRecoverableLossKWh: recoverableAuxiliary.valueKWh
  });
  const recoveredAuxiliaryTotal = calculateTotalGenerationAuxiliaryRecoveredLoss({
    heatingAuxiliaryRecoveredLossKWh: allocatedRecoveredAuxiliaries.heating ?? 0,
    otherRecoveredAuxiliaryLossesKWh: Object.entries(allocatedRecoveredAuxiliaries)
      .filter(([service]) => service !== "heating")
      .map(([, value]) => value)
  });
  const fuelInput = calculateHeatingGeneratorFuelInputEnergy({
    generatorOutputKWh: output.valueKWh,
    recoveredAuxiliaryLossKWh: recoveredAuxiliaryTotal.valueKWh,
    generatorLossKWh: lossTotal.valueKWh,
    renewableGeneratorHeatKWh
  });
  const utilization =
    fuelInput.valueKWh > 0
      ? calculateHeatingGeneratorUtilizationFactor({
          generatorOutputKWh: output.valueKWh,
          fuelInputKWh: fuelInput.valueKWh
        })
      : null;
  const allocatedFuel = allocatedValuesByService(fuelInput.valueKWh, fractions);
  const allocatedRecoverable = allocatedValuesByService(recoverableTotal.valueKWh, fractions);
  const connectedServices = [...new Set(connectedLoads.map(load => load.service))];
  const energyCarrier = generator.energyCarrier ?? null;
  const auxiliaryCarrier = generator.auxiliaryCarrier ?? energyCarrier;
  const carrierEnergy = {};
  if (energyCarrier) carrierEnergy[energyCarrier] = fuelInput.valueKWh;
  if (auxiliaryCarrier) {
    carrierEnergy[auxiliaryCarrier] =
      (carrierEnergy[auxiliaryCarrier] ?? 0) + auxiliaryTotal.valueKWh;
  }
  const serviceAllocations = Object.fromEntries(
    connectedServices.map(service => [
      service,
      {
        service,
        allocationFraction: fractions[service],
        serviceLoadKWh: sum(connectedLoads.filter(load => load.service === service).map(load => load.loadKWh)),
        allocatedFuelInputKWh: allocatedFuel[service] ?? 0,
        allocatedLossKWh: allocatedLosses[service] ?? 0,
        allocatedAuxiliaryKWh: allocatedAuxiliaries[service] ?? 0,
        allocatedRecoveredAuxiliaryKWh: allocatedRecoveredAuxiliaries[service] ?? 0,
        allocatedRecoverableKWh: allocatedRecoverable[service] ?? 0,
        allocationSource: generator.serviceAllocationSource ?? {
          origin: connectedServices.length === 1 ? "implicit_single_service_reference" : "explicit_engineering_input",
          reference: `${componentId}.serviceAllocationFractions`
        }
      }
    ])
  );

  return {
    componentId,
    month: monthId,
    generatorType: generator.generatorType ?? null,
    energyCarrier,
    auxiliaryCarrier,
    connectedServices,
    connectedLoads,
    serviceAllocationRule:
      connectedServices.length === 1 ? "implicit_single_service_reference" : "explicit_service_fraction",
    serviceAllocations,
    operationHours: operation.value,
    operationTime: operation.result,
    centralOutputEnergy: output,
    generationLoss: loss,
    generationLossTotal: lossTotal,
    auxiliaryEnergy: auxiliary,
    auxiliaryTotal,
    recoveredAuxiliary,
    recoveredAuxiliaryTotal,
    recoverableAuxiliary,
    recoverableGenerationLossTotal: recoverableTotal,
    fuelInput,
    utilizationFactor: utilization,
    renewableGeneratorHeatKWh,
    dhwStorageOrDistributionLossKWh,
    carrierEnergy,
    physicalTotals: {
      outputKWh: output.valueKWh,
      fuelInputKWh: fuelInput.valueKWh,
      generationLossKWh: lossTotal.valueKWh,
      auxiliaryKWh: auxiliaryTotal.valueKWh,
      recoveredAuxiliaryKWh: recoveredAuxiliaryTotal.valueKWh,
      recoverableKWh: recoverableTotal.valueKWh
    },
    invariants: {
      serviceFuelAllocationKWh: sum(Object.values(serviceAllocations).map(item => item.allocatedFuelInputKWh)),
      serviceLossAllocationKWh: sum(Object.values(serviceAllocations).map(item => item.allocatedLossKWh)),
      serviceAuxiliaryAllocationKWh: sum(Object.values(serviceAllocations).map(item => item.allocatedAuxiliaryKWh))
    },
    source: {
      classification: "NUMERICALLY_IMPLEMENTED",
      origin: "mc001_shared_generator_component_contract",
      reference: `sharedComponents.generators.${componentId}`,
      formulaIds: [
        output.formulaId,
        loss.formulaId,
        auxiliary.formulaId,
        auxiliaryTotal.formulaId,
        lossTotal.formulaId,
        recoveredAuxiliary.formulaId,
        recoveredAuxiliaryTotal.formulaId,
        recoverableAuxiliary.formulaId,
        recoverableTotal.formulaId,
        fuelInput.formulaId,
        ...(operation.result ? [operation.result.formulaId] : []),
        ...(utilization ? [utilization.formulaId] : [])
      ],
      details: {
        productDataFields: [
          "lossPowerKW",
          "auxiliaryPowerKW",
          "recoveredAuxiliaryFraction",
          "auxiliaryRecoverableFractionToHeating",
          "lossRecoverableFractionToHeating"
        ],
        scheduleFields: operation.result ? [] : ["operationHours"],
        serviceAllocation: connectedServices.length === 1
          ? "implicit_single_service_reference"
          : "explicit engineering allocation fractions supplied in Building DNA"
      }
    }
  };
}

function calculateSharedGeneratorsForMonth({
  sharedComponents,
  monthId,
  monthIndex,
  heating,
  cooling,
  dhw
}) {
  const loads = [
    ...serviceGeneratorLoads(heating, "heating"),
    ...serviceGeneratorLoads(cooling, "cooling"),
    ...serviceGeneratorLoads(dhw, "dhw")
  ];
  return sharedGeneratorsList(sharedComponents)
    .map(generator =>
      calculateSharedGeneratorMonth({
        generator,
        monthId,
        monthIndex,
        connectedLoads: loads.filter(load => load.generatorRef === generator.componentId)
      })
    )
    .filter(Boolean);
}

function sharedServiceAllocationKWh(sharedGenerators, service) {
  return sum(
    sharedGenerators.map(generator => {
      const allocation = generator.serviceAllocations?.[service];
      if (!allocation) return 0;
      return allocation.allocatedFuelInputKWh + allocation.allocatedAuxiliaryKWh;
    })
  );
}

function serviceInputTotalWithShared(serviceResult, sharedGenerators, service) {
  if (!serviceResult) return 0;
  const nonShared = sum(
    (serviceResult.systemResults ?? [])
      .filter(system => !system.metadata?.generatorRef)
      .map(system => system.finalStageInputKWh)
  );
  const shared = sharedServiceAllocationKWh(sharedGenerators, service);
  return nonShared + shared;
}

function attachSharedAllocations(serviceResult, sharedGenerators, service) {
  if (!serviceResult) return null;
  const allocations = sharedGenerators
    .map(generator => generator.serviceAllocations?.[service]
      ? {
          componentId: generator.componentId,
          ...generator.serviceAllocations[service]
        }
      : null)
    .filter(Boolean);
  if (allocations.length === 0) return serviceResult;
  const finalStageInputKWh = serviceInputTotalWithShared(serviceResult, sharedGenerators, service);
  return {
    ...serviceResult,
    finalStageInputKWh,
    sharedGeneratorAllocations: allocations,
    topology: {
      ...(serviceResult.topology ?? {}),
      sharedGeneratorPolicy: "physical_component_reference_with_service_allocation"
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

function stageInputOverride({ service, stage, monthId, inputEnergyOverride }) {
  if (!inputEnergyOverride) return null;
  const result = inputEnergyOverride.result ?? inputEnergyOverride;
  assertFiniteNonNegativeNumber(
    result.valueKWh,
    `${service}.${monthId}.${stage}.inputEnergyOverride.valueKWh`
  );
  return {
    ...result,
    value: result.value ?? result.valueKWh,
    valueKWh: result.valueKWh,
    unit: result.unit ?? "kWh",
    formulaId: result.formulaId ?? "MC001_3_STAGE_INPUT_ENERGY_OVERRIDE",
    status: result.status ?? "calculated",
    source: inputEnergyOverride.source ?? result.source ?? null
  };
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

    const input =
      stageInputOverride({
        service,
        stage: stageId,
        monthId,
        inputEnergyOverride: stage.inputEnergyOverride
      }) ??
      stageBalance({
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
      inputEnergySource: input.source ?? stage.inputEnergyOverride?.source ?? null,
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
    ahuThermalRelations: month.ventilation.ahuThermalRelations ?? null,
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

function hasFiniteFields(record, fields) {
  return fields.every(field => finiteNumber(record?.[field]));
}

function calculatePcmStorageMonth(input, monthId) {
  if (!input) return null;
  const storageInput = finiteNumber(input.storageInputKWh)
    ? validateCoolingStorageInputEnergy({
        storageInputKWh: input.storageInputKWh
      })
    : null;
  const sensibleLiquid = hasFiniteFields(input, [
    "liquidMassKg",
    "liquidSpecificHeatKWhPerKgK",
    "generatorRequiredOutletTemperatureC",
    "storageTemperatureC"
  ])
    ? calculateCoolingStorageSensibleLiquidEnergy(input)
    : null;
  const latent = hasFiniteFields(input, ["latentHeatKWhPerKg", "solidMassKg"])
    ? calculateCoolingStorageLatentEnergy({
        latentHeatKWhPerKg: input.latentHeatKWhPerKg,
        solidMassKg: input.solidMassKg
      })
    : null;
  const sensibleSolid = hasFiniteFields(input, [
    "solidMassKg",
    "solidSpecificHeatKWhPerKgK",
    "transitionTemperatureC",
    "generatorOutletFlowTemperatureC"
  ])
    ? calculateCoolingStorageSensibleSolidEnergy(input)
    : null;
  const outputEnergy = hasFiniteFields(input, [
    "distributionInputRequiredKWh",
    "storageGeneratorOutputKWh"
  ]) && (sensibleLiquid || latent || sensibleSolid)
    ? calculateCoolingStorageOutputEnergy({
        sensibleLiquidEnergyKWh: input.sensibleLiquidEnergyKWh ?? sensibleLiquid?.valueKWh ?? 0,
        latentEnergyKWh: input.latentEnergyKWh ?? latent?.valueKWh ?? 0,
        sensibleSolidEnergyKWh: input.sensibleSolidEnergyKWh ?? sensibleSolid?.valueKWh ?? 0,
        distributionInputRequiredKWh: input.distributionInputRequiredKWh,
        storageGeneratorOutputKWh: input.storageGeneratorOutputKWh
      })
    : null;
  const transformableWater = hasFiniteFields(input, [
    "storageInputKWh",
    "storageInputLossKWh",
    "storageStandbyLossKWh",
    "storageOutputSideLossKWh"
  ])
    ? calculateCoolingStorageTransformableEnergyWater({
        storageInputKWh: input.storageInputKWh,
        storageInputLossKWh: input.storageInputLossKWh,
        storageStandbyLossKWh: input.storageStandbyLossKWh,
        storageOutputSideLossKWh: input.storageOutputSideLossKWh
      })
    : null;
  const initialIceThickness = hasFiniteFields(input, [
    "solidMassKg",
    "solidDensityKgPerM3",
    "storagePipeLengthM",
    "storagePipeDiameterM"
  ])
    ? calculateCoolingStorageInitialIceThickness(input)
    : null;
  const transformableEnergyKWh =
    input.transformableEnergyKWh ?? transformableWater?.valueKWh ?? null;
  const iceMassVariation = finiteNumber(transformableEnergyKWh) &&
    hasFiniteFields(input, [
      "latentHeatKWhPerKg",
      "solidSpecificHeatKWhPerKgK",
      "transitionTemperatureC",
      "generatorOutletFlowTemperatureC"
    ])
    ? calculateCoolingStorageIceMassVariation({
        transformableEnergyKWh,
        latentHeatKWhPerKg: input.latentHeatKWhPerKg,
        solidSpecificHeatKWhPerKgK: input.solidSpecificHeatKWhPerKgK,
        transitionTemperatureC: input.transitionTemperatureC,
        generatorOutletFlowTemperatureC: input.generatorOutletFlowTemperatureC
      })
    : null;
  const iceThickness = hasFiniteFields(input, [
    "maximumIceThicknessM",
    "storagePipeDiameterM",
    "solidMassKg",
    "solidDensityKgPerM3",
    "storagePipeLengthM"
  ]) && finiteNumber(input.deltaSolidMassKg ?? iceMassVariation?.valueKg)
    ? calculateCoolingStorageIceThickness({
        maximumIceThicknessM: input.maximumIceThicknessM,
        storagePipeDiameterM: input.storagePipeDiameterM,
        solidMassKg: input.solidMassKg,
        deltaSolidMassKg: input.deltaSolidMassKg ?? iceMassVariation.valueKg,
        solidDensityKgPerM3: input.solidDensityKgPerM3,
        storagePipeLengthM: input.storagePipeLengthM
      })
    : null;
  const solidMassAfterUse = hasFiniteFields(input, ["initialSolidMassKg"]) &&
    finiteNumber(input.deltaSolidMassKg ?? iceMassVariation?.valueKg)
    ? calculateCoolingStorageSolidMassAfterUse({
        initialSolidMassKg: input.initialSolidMassKg,
        deltaSolidMassKg: input.deltaSolidMassKg ?? iceMassVariation.valueKg
      })
    : null;
  const pcmSolidMassVariation = finiteNumber(transformableEnergyKWh) &&
    hasFiniteFields(input, [
      "solidSpecificHeatKWhPerKgK",
      "transitionTemperatureC"
    ]) &&
    (finiteNumber(input.latentHeatKWhPerKg) || finiteNumber(input.liquidSpecificHeatKWhPerKgK))
    ? calculateCoolingStoragePcmSolidMassVariation({
        transformableEnergyKWh,
        latentHeatKWhPerKg: input.latentHeatKWhPerKg,
        liquidSpecificHeatKWhPerKgK: input.liquidSpecificHeatKWhPerKgK,
        solidSpecificHeatKWhPerKgK: input.solidSpecificHeatKWhPerKgK,
        transitionTemperatureC: input.transitionTemperatureC
      })
    : null;
  const pcmLimitedToLiquid = pcmSolidMassVariation && finiteNumber(input.initialLiquidMassKg)
    ? limitCoolingStoragePcmSolidMassToLiquid({
        deltaSolidMassKg: pcmSolidMassVariation.valueKg,
        initialLiquidMassKg: input.initialLiquidMassKg
      })
    : null;
  const pcmLimitedToExistingSolid = pcmSolidMassVariation && finiteNumber(input.initialSolidMassKg)
    ? limitCoolingStoragePcmSolidMassToExistingSolid({
        deltaSolidMassKg: pcmSolidMassVariation.valueKg,
        initialSolidMassKg: input.initialSolidMassKg
      })
    : null;
  const pcmDeltaSolidMassKg =
    input.pcmDeltaSolidMassKg ??
    pcmLimitedToLiquid?.valueKg ??
    pcmLimitedToExistingSolid?.valueKg ??
    pcmSolidMassVariation?.valueKg ??
    null;
  const pcmSolidTemperature = finiteNumber(pcmDeltaSolidMassKg) &&
    finiteNumber(transformableEnergyKWh) &&
    hasFiniteFields(input, [
      "initialSolidTemperatureC",
      "solidSpecificHeatKWhPerKgK",
      "transitionTemperatureC",
      "solidMassKg",
      "generatorOutletFlowTemperatureC"
    ])
    ? calculateCoolingStoragePcmSolidTemperature({
        initialSolidTemperatureC: input.initialSolidTemperatureC,
        transformableEnergyKWh,
        solidSpecificHeatKWhPerKgK: input.solidSpecificHeatKWhPerKgK,
        deltaSolidMassKg: pcmDeltaSolidMassKg,
        transitionTemperatureC: input.transitionTemperatureC,
        solidMassKg: input.solidMassKg,
        generatorOutletFlowTemperatureC: input.generatorOutletFlowTemperatureC
      })
    : null;
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
  const pcmLiquidTemperature = finiteNumber(pcmDeltaSolidMassKg) &&
    finiteNumber(transformableEnergyKWh) &&
    hasFiniteFields(input, [
      "initialLiquidTemperatureC",
      "solidSpecificHeatKWhPerKgK",
      "transitionTemperatureC",
      "liquidSpecificHeatKWhPerKgK",
      "initialLiquidMassKg"
    ])
    ? calculateCoolingStoragePcmLiquidTemperature({
        initialLiquidTemperatureC: input.initialLiquidTemperatureC,
        transformableEnergyKWh,
        solidSpecificHeatKWhPerKgK: input.solidSpecificHeatKWhPerKgK,
        deltaSolidMassKg: pcmDeltaSolidMassKg,
        transitionTemperatureC: input.transitionTemperatureC,
        liquidSpecificHeatKWhPerKgK: input.liquidSpecificHeatKWhPerKgK,
        initialLiquidMassKg: input.initialLiquidMassKg
      })
    : null;
  const generatorDelta = hasFiniteFields(input, [
    "storageGeneratorEnergyKWh",
    "inputSideLossKWh",
    "standbyLossKWh",
    "outputSideLossKWh"
  ]) && finiteNumber(input.storageOutputKWh ?? outputEnergy?.valueKWh)
    ? calculateCoolingStorageGeneratorDeltaEnergy({
        storageGeneratorEnergyKWh: input.storageGeneratorEnergyKWh,
        storageOutputKWh: input.storageOutputKWh ?? outputEnergy.valueKWh,
        inputSideLossKWh: input.inputSideLossKWh,
        standbyLossKWh: input.standbyLossKWh,
        outputSideLossKWh: input.outputSideLossKWh
      })
    : null;
  const calculations = Object.fromEntries(
    Object.entries({
      storageInput,
      sensibleLiquid,
      latent,
      sensibleSolid,
      outputEnergy,
      transformableWater,
      initialIceThickness,
      iceMassVariation,
      iceThickness,
      solidMassAfterUse,
      pcmSolidMassVariation,
      pcmLimitedToLiquid,
      pcmLimitedToExistingSolid,
      pcmSolidTemperature,
      sensibleStorage,
      inputLimit,
      solidMassDecrease,
      pcmLiquidTemperature,
      generatorDelta
    }).filter(([, result]) => result)
  );

  return {
    month: monthId,
    sensibleStorage,
    inputLimit,
    solidMassDecrease,
    calculations,
    totals: {
      sensibleSolidStorageEnergyKWh: sensibleStorage.valueKWh,
      inputEnergyLimitKWh: inputLimit.valueKWh,
      solidMassDecreaseKg: solidMassDecrease.valueKg,
      storageInputKWh: storageInput?.valueKWh ?? null,
      storageOutputKWh: outputEnergy?.valueKWh ?? null,
      generatorDeltaEnergyKWh: generatorDelta?.valueKWh ?? null,
      pcmSolidMassVariationKg: pcmSolidMassVariation?.valueKg ?? null,
      pcmSolidTemperatureC: pcmSolidTemperature?.valueC ?? null,
      pcmLiquidTemperatureC: pcmLiquidTemperature?.valueC ?? null
    }
  };
}

export function calculateMc001Chapter3IntegratedRuntime(input = {}) {
  const {
    months,
    lighting,
    coolingStoragePcm,
    sharedComponents = {},
    services = {},
    systemMetadata = {}
  } = input;
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
    const sharedGenerators = calculateSharedGeneratorsForMonth({
      sharedComponents,
      monthId,
      monthIndex: index,
      heating,
      cooling,
      dhw
    });
    const heatingWithShared = attachSharedAllocations(heating, sharedGenerators, "heating");
    const coolingWithShared = attachSharedAllocations(cooling, sharedGenerators, "cooling");
    const dhwWithShared = attachSharedAllocations(dhw, sharedGenerators, "dhw");

    return {
      month: monthId,
      heating: heatingWithShared,
      cooling: coolingWithShared,
      dhw: dhwWithShared,
      ventilation,
      sharedGenerators,
      coolingStoragePcm: pcmStorage,
      lightingEnergyKWh,
      totals: {
        heatingInputKWh: heatingWithShared?.finalStageInputKWh ?? 0,
        coolingInputKWh: coolingWithShared?.finalStageInputKWh ?? 0,
        dhwInputKWh: dhwWithShared?.finalStageInputKWh ?? 0,
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
    coolingAuxiliaryKWh: sum(monthly.map(month => month.cooling?.auxiliaryTotalKWh ?? 0)),
    sharedGeneratorFuelInputKWh: sum(monthly.flatMap(month =>
      (month.sharedGenerators ?? []).map(generator => generator.physicalTotals.fuelInputKWh)
    )),
    sharedGeneratorAuxiliaryKWh: sum(monthly.flatMap(month =>
      (month.sharedGenerators ?? []).map(generator => generator.physicalTotals.auxiliaryKWh)
    )),
    sharedGeneratorLossKWh: sum(monthly.flatMap(month =>
      (month.sharedGenerators ?? []).map(generator => generator.physicalTotals.generationLossKWh)
    ))
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
        if (system.metadata?.generatorRef) continue;
        const carrier = system.metadata?.energyCarrier ?? systemMetadata?.[service]?.energyCarrier;
        if (carrier && system.finalStageInputKWh > 0) {
          energyByCarrier[carrier] = (energyByCarrier[carrier] ?? 0) + system.finalStageInputKWh;
        }
      }
    }
  }
  for (const month of monthly) {
    for (const generator of month.sharedGenerators ?? []) {
      for (const [carrier, value] of Object.entries(generator.carrierEnergy ?? {})) {
        if (carrier && value > 0) {
          energyByCarrier[carrier] = (energyByCarrier[carrier] ?? 0) + value;
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
  const stageFormulaReferences = [
    ...new Set(
      monthly.flatMap(month =>
        ["heating", "cooling", "dhw"].flatMap(service =>
          (month[service]?.systemResults ?? [])
            .flatMap(system => system.stageResults ?? [])
            .flatMap(stage => [
              ...(stage.lossSource?.formulaIds ?? []),
              ...(stage.auxiliarySource?.formulaIds ?? []),
              ...(stage.inputEnergySource?.formulaIds ?? []),
              ...(stage.inputEnergy?.formulaId ? [stage.inputEnergy.formulaId] : [])
            ])
        )
      )
    )
  ];
  const sharedGeneratorFormulaReferences = [
    ...new Set(
      monthly.flatMap(month =>
        (month.sharedGenerators ?? []).flatMap(generator => generator.source?.formulaIds ?? [])
      )
    )
  ];
  const ventilationFormulaReferences = [
    ...new Set(
      monthly.flatMap(month =>
        [
          ...Object.values(month.ventilation?.sources ?? {}),
          month.ventilation?.ahuThermalRelations?.source
        ].flatMap(source => source?.formulaIds ?? [])
      )
    )
  ];
  const coolingStorageFormulaReferences = [
    ...new Set(
      monthly.flatMap(month =>
        Object.values(month.coolingStoragePcm?.calculations ?? {})
          .map(result => result?.formulaId)
          .filter(Boolean)
      )
    )
  ];

  return {
    status: "calculated",
    calculationScope: "MC001_CHAPTER_3_EXPLICIT_RUNTIME_CHAIN",
    services: servicesSummary,
    systemMetadata,
    sharedComponents,
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
      ...coolingStorageFormulaReferences,
      ...stageFormulaReferences,
      ...sharedGeneratorFormulaReferences,
      ...ventilationFormulaReferences,
      ...dhwUsefulFormulaReferences,
      ...(lightingResult ? ["MC001_3_4_34_LIGHTING_LENI_WEIGHTED_BUILDING"] : [])
    ]
  };
}
