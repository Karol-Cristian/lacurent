export const STATUS_CALCULATED = "calculated";

export const AHU_LOCATION = Object.freeze({
  CONDITIONED: "conditioned",
  UNCONDITIONED: "unconditioned"
});

export const EXTRACT_FAN_POSITION = Object.freeze({
  UPSTREAM_OF_RECOVERY: "upstream_of_recovery",
  DOWNSTREAM_OF_RECOVERY: "downstream_of_recovery"
});

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

function assertFinitePositiveNumber(value, name) {
  assertFiniteNumber(value, name);
  if (value <= 0) {
    throw new Error(`${name} must be a finite positive number`);
  }
}

function assertFraction(value, name) {
  assertFiniteNumber(value, name);
  if (value < 0 || value > 1) {
    throw new Error(`${name} must be between 0 and 1`);
  }
}

function assertEnum(value, allowed, name) {
  if (!Object.values(allowed).includes(value)) {
    throw new Error(`${name} must be one of ${Object.values(allowed).join(", ")}`);
  }
}

function makeResult({
  value,
  valueKey,
  unit,
  formulaId,
  formulaText,
  inputs,
  assumptions = [],
  warnings = [],
  extra = {}
}) {
  return {
    status: STATUS_CALCULATED,
    value,
    [valueKey]: value,
    unit,
    formulaId,
    inputs,
    warnings,
    ...extra,
    trace: {
      formulaId,
      formulaText,
      inputValues: inputs,
      result: value,
      unit,
      assumptions,
      warnings
    }
  };
}

function sumNonNegativeTerms(terms) {
  for (const [name, value] of Object.entries(terms)) {
    assertFiniteNonNegativeNumber(value, name);
  }
  return Object.values(terms).reduce((sum, value) => sum + value, 0);
}

export function calculateChapter3HeatingGeneratorInputEnergy(input) {
  const {
    usefulHeatingDemandKWh,
    emissionLossKWh,
    distributionLossKWh,
    storageLossKWh,
    generationLossKWh
  } = input ?? {};

  const terms = {
    usefulHeatingDemandKWh,
    emissionLossKWh,
    distributionLossKWh,
    storageLossKWh,
    generationLossKWh
  };
  const valueKWh = sumNonNegativeTerms(terms);

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_183_HEATING_GENERATOR_INPUT_ENERGY",
    formulaText:
      "QH,gen,in = QH,nd + QH,em,ls + QH,dis,ls + QH,sto,ls + QH,gen,ls",
    inputs: terms,
    assumptions: ["all_heating_subsystem_terms_are_explicit_or_calculated_upstream"]
  });
}

export function calculateChapter3CoolingGeneratorInputEnergy(input) {
  const {
    usefulCoolingDemandKWh,
    emissionLossKWh,
    distributionLossKWh,
    storageLossKWh,
    generationLossKWh
  } = input ?? {};

  const terms = {
    usefulCoolingDemandKWh,
    emissionLossKWh,
    distributionLossKWh,
    storageLossKWh,
    generationLossKWh
  };
  const valueKWh = sumNonNegativeTerms(terms);

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_184_COOLING_GENERATOR_INPUT_ENERGY",
    formulaText:
      "QC,gen,in = QC,nd + QC,em,ls + QC,dis,ls + QC,sto,ls + QC,gen,ls",
    inputs: terms,
    assumptions: [
      "all_cooling_subsystem_terms_are_explicit_or_calculated_upstream",
      "this_is_not_final_electric_energy_without_EER_or_COP_path"
    ]
  });
}

export function calculateChapter3HeatingAuxiliaryEnergyTotal(input) {
  const {
    emissionAuxiliaryKWh,
    distributionAuxiliaryKWh,
    storageAuxiliaryKWh,
    generationAuxiliaryKWh
  } = input ?? {};

  const terms = {
    emissionAuxiliaryKWh,
    distributionAuxiliaryKWh,
    storageAuxiliaryKWh,
    generationAuxiliaryKWh
  };
  const valueKWh = sumNonNegativeTerms(terms);

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_185_TOTAL_HEATING_AUXILIARY_ENERGY",
    formulaText:
      "WH,in,tot = WH,aux,em,in + WH,aux,dis,in + WH,aux,sto,in + WH,aux,gen,in",
    inputs: terms,
    assumptions: ["all_heating_auxiliary_components_are_explicit"]
  });
}

export function calculateChapter3CoolingAuxiliaryEnergyTotal(input) {
  const {
    emissionAuxiliaryKWh,
    distributionAuxiliaryKWh,
    storageAuxiliaryKWh,
    generationAuxiliaryKWh
  } = input ?? {};

  const terms = {
    emissionAuxiliaryKWh,
    distributionAuxiliaryKWh,
    storageAuxiliaryKWh,
    generationAuxiliaryKWh
  };
  const valueKWh = sumNonNegativeTerms(terms);

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_186_TOTAL_COOLING_AUXILIARY_ENERGY",
    formulaText:
      "WC,in,tot = WC,aux,em,in + WC,aux,dis,in + WC,aux,sto,in + WC,aux,gen,in",
    inputs: terms,
    assumptions: ["all_cooling_auxiliary_components_are_explicit"]
  });
}

export function calculateChapter3SubsystemInputEnergy(input) {
  const {
    subsystemOutputKWh,
    subsystemLossKWh,
    recoveredLossKWh = 0,
    subsystemId = "Y"
  } = input ?? {};

  assertFiniteNonNegativeNumber(subsystemOutputKWh, "subsystemOutputKWh");
  assertFiniteNonNegativeNumber(subsystemLossKWh, "subsystemLossKWh");
  assertFiniteNonNegativeNumber(recoveredLossKWh, "recoveredLossKWh");

  const valueKWh = subsystemOutputKWh + subsystemLossKWh - recoveredLossKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_GENERIC_SUBSYSTEM_ENERGY_BALANCE",
    formulaText: "QY,in = QY,out + QY,ls - QY,ls,rvd",
    inputs: {
      subsystemId,
      subsystemOutputKWh,
      subsystemLossKWh,
      recoveredLossKWh
    },
    assumptions: ["subsystem_terms_are_explicit_and_not_defaulted"]
  });
}

export function calculateAhuRecoverableGenerationLoss(input) {
  const { ahuGenerationLossKWh, ahuLocation } = input ?? {};

  assertFiniteNonNegativeNumber(ahuGenerationLossKWh, "ahuGenerationLossKWh");
  assertEnum(ahuLocation, AHU_LOCATION, "ahuLocation");

  const valueKWh =
    ahuLocation === AHU_LOCATION.CONDITIONED ? ahuGenerationLossKWh : 0;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_49_3_50_AHU_RECOVERABLE_GENERATION_LOSSES",
    formulaText:
      "if AHU in conditioned zone: QV,ls,gen,rbl = QV,ls,gen; otherwise QV,ls,gen,rbl = 0",
    inputs: { ahuGenerationLossKWh, ahuLocation },
    assumptions: ["ahu_location_is_explicit"]
  });
}

export function calculateExtractAirTemperatureForRecovery(input) {
  const {
    extractFanPosition,
    extractAirTemperatureAfterDistributionC,
    extractFanTemperatureRiseK = 0
  } = input ?? {};

  assertEnum(extractFanPosition, EXTRACT_FAN_POSITION, "extractFanPosition");
  assertFiniteNumber(
    extractAirTemperatureAfterDistributionC,
    "extractAirTemperatureAfterDistributionC"
  );
  assertFiniteNonNegativeNumber(extractFanTemperatureRiseK, "extractFanTemperatureRiseK");

  const valueC =
    extractFanPosition === EXTRACT_FAN_POSITION.UPSTREAM_OF_RECOVERY
      ? extractAirTemperatureAfterDistributionC + extractFanTemperatureRiseK
      : extractAirTemperatureAfterDistributionC;
  const relation =
    extractFanPosition === EXTRACT_FAN_POSITION.UPSTREAM_OF_RECOVERY
      ? "MC001_3_53_EXTRACT_AIR_TEMPERATURE_UPSTREAM_FAN"
      : "MC001_3_54_EXTRACT_AIR_TEMPERATURE_DOWNSTREAM_FAN";

  return makeResult({
    value: valueC,
    valueKey: "valueC",
    unit: "degC",
    formulaId: relation,
    formulaText:
      "upstream extract fan: thetaETA,hr,in = thetaETA,dis,out + deltaThetaFan,ETA; downstream: thetaETA,hr,in = thetaETA,dis,out",
    inputs: {
      extractFanPosition,
      extractAirTemperatureAfterDistributionC,
      extractFanTemperatureRiseK
    },
    assumptions: ["extract_fan_position_is_explicit"]
  });
}

export function calculateAhuHeatingCoilRequiredEnergy(input) {
  const {
    airDensityKgPerM3,
    airSpecificHeatKJPerKgK,
    supplyAirFlowM3PerH,
    requiredSupplyTemperatureC,
    humidificationTemperatureRiseK,
    outdoorTemperatureC,
    calculationHours
  } = input ?? {};

  assertFinitePositiveNumber(airDensityKgPerM3, "airDensityKgPerM3");
  assertFinitePositiveNumber(airSpecificHeatKJPerKgK, "airSpecificHeatKJPerKgK");
  assertFiniteNonNegativeNumber(supplyAirFlowM3PerH, "supplyAirFlowM3PerH");
  assertFiniteNumber(requiredSupplyTemperatureC, "requiredSupplyTemperatureC");
  assertFiniteNonNegativeNumber(humidificationTemperatureRiseK, "humidificationTemperatureRiseK");
  assertFiniteNumber(outdoorTemperatureC, "outdoorTemperatureC");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");

  const valueKWh =
    airDensityKgPerM3 *
    airSpecificHeatKJPerKgK *
    supplyAirFlowM3PerH *
    (requiredSupplyTemperatureC + humidificationTemperatureRiseK - outdoorTemperatureC) *
    calculationHours /
    3600;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_40_AHU_HEATING_COIL_REQUIRED_ENERGY",
    formulaText:
      "QH,ahu,in,req = rhoa * ca * qV,SUP,AHU * (thetaSUP,H,req + DeltaThetaSUP,HU - thetaE) * tci / 3600",
    inputs: {
      airDensityKgPerM3,
      airSpecificHeatKJPerKgK,
      supplyAirFlowM3PerH,
      requiredSupplyTemperatureC,
      humidificationTemperatureRiseK,
      outdoorTemperatureC,
      calculationHours
    }
  });
}

export function calculateAhuRecirculationAirHeatingEnergy(input) {
  const {
    airDensityKgPerM3,
    airSpecificHeatKJPerKgK,
    extractAirFlowM3PerH,
    outdoorAirFraction,
    extractTemperatureIntoRecoveryC,
    outdoorTemperatureC,
    calculationHours
  } = input ?? {};

  assertFinitePositiveNumber(airDensityKgPerM3, "airDensityKgPerM3");
  assertFinitePositiveNumber(airSpecificHeatKJPerKgK, "airSpecificHeatKJPerKgK");
  assertFiniteNonNegativeNumber(extractAirFlowM3PerH, "extractAirFlowM3PerH");
  assertFraction(outdoorAirFraction, "outdoorAirFraction");
  assertFiniteNumber(extractTemperatureIntoRecoveryC, "extractTemperatureIntoRecoveryC");
  assertFiniteNumber(outdoorTemperatureC, "outdoorTemperatureC");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");

  const valueKWh =
    airDensityKgPerM3 *
    airSpecificHeatKJPerKgK *
    extractAirFlowM3PerH *
    (1 - outdoorAirFraction) *
    (extractTemperatureIntoRecoveryC - outdoorTemperatureC) *
    calculationHours /
    3600;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_42_AHU_RECIRCULATION_AIR_HEATING_ENERGY",
    formulaText:
      "QRCA = rhoa * ca * qV,ETA,AHU * (1 - fODA) * (thetaETA,hr,in - thetaE) * tci / 3600",
    inputs: {
      airDensityKgPerM3,
      airSpecificHeatKJPerKgK,
      extractAirFlowM3PerH,
      outdoorAirFraction,
      extractTemperatureIntoRecoveryC,
      outdoorTemperatureC,
      calculationHours
    }
  });
}

export function calculateAhuHeatRecoveryEnergy(input) {
  const {
    airDensityKgPerM3,
    airSpecificHeatKJPerKgK,
    moistureLatentHeatKJPerKg,
    supplyAirFlowM3PerH,
    outdoorAirFraction,
    supplyTemperatureAfterRecoveryC,
    outdoorPreheatTemperatureC,
    supplyHumidityAfterRecoveryKgPerKg,
    outdoorPreheatHumidityKgPerKg,
    calculationHours
  } = input ?? {};

  assertFinitePositiveNumber(airDensityKgPerM3, "airDensityKgPerM3");
  assertFinitePositiveNumber(airSpecificHeatKJPerKgK, "airSpecificHeatKJPerKgK");
  assertFinitePositiveNumber(moistureLatentHeatKJPerKg, "moistureLatentHeatKJPerKg");
  assertFiniteNonNegativeNumber(supplyAirFlowM3PerH, "supplyAirFlowM3PerH");
  assertFraction(outdoorAirFraction, "outdoorAirFraction");
  assertFiniteNumber(supplyTemperatureAfterRecoveryC, "supplyTemperatureAfterRecoveryC");
  assertFiniteNumber(outdoorPreheatTemperatureC, "outdoorPreheatTemperatureC");
  assertFiniteNumber(supplyHumidityAfterRecoveryKgPerKg, "supplyHumidityAfterRecoveryKgPerKg");
  assertFiniteNumber(outdoorPreheatHumidityKgPerKg, "outdoorPreheatHumidityKgPerKg");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");

  const sensibleKJPerH =
    airDensityKgPerM3 *
    airSpecificHeatKJPerKgK *
    supplyAirFlowM3PerH *
    outdoorAirFraction *
    (supplyTemperatureAfterRecoveryC - outdoorPreheatTemperatureC);
  const latentKJPerH =
    airDensityKgPerM3 *
    moistureLatentHeatKJPerKg *
    supplyAirFlowM3PerH *
    outdoorAirFraction *
    (supplyHumidityAfterRecoveryKgPerKg - outdoorPreheatHumidityKgPerKg);
  const valueKWh = (sensibleKJPerH + latentKJPerH) * calculationHours / 3600;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_41_AHU_HEAT_RECOVERY_ENERGY",
    formulaText:
      "Qhr = rhoa*qV,SUP,AHU*fODA*[ca*(thetaSUP,hr - thetaODA,preh) + rw*(xSUP,hr - xODA,preh)] * tci / 3600",
    inputs: {
      airDensityKgPerM3,
      airSpecificHeatKJPerKgK,
      moistureLatentHeatKJPerKg,
      supplyAirFlowM3PerH,
      outdoorAirFraction,
      supplyTemperatureAfterRecoveryC,
      outdoorPreheatTemperatureC,
      supplyHumidityAfterRecoveryKgPerKg,
      outdoorPreheatHumidityKgPerKg,
      calculationHours
    },
    extra: { sensibleKJPerH, latentKJPerH }
  });
}

export function calculateAhuCoolingCoilRequiredEnergy(input) {
  const {
    airDensityKgPerM3,
    airSpecificHeatKJPerKgK,
    moistureLatentHeatKJPerKg,
    supplyAirFlowM3PerH,
    recirculatedSupplyTemperatureC,
    requiredCoolingSupplyTemperatureC,
    recirculatedHumidityKgPerKg,
    requiredCoolingHumidityKgPerKg,
    calculationHours
  } = input ?? {};

  assertFinitePositiveNumber(airDensityKgPerM3, "airDensityKgPerM3");
  assertFinitePositiveNumber(airSpecificHeatKJPerKgK, "airSpecificHeatKJPerKgK");
  assertFinitePositiveNumber(moistureLatentHeatKJPerKg, "moistureLatentHeatKJPerKg");
  assertFiniteNonNegativeNumber(supplyAirFlowM3PerH, "supplyAirFlowM3PerH");
  assertFiniteNumber(recirculatedSupplyTemperatureC, "recirculatedSupplyTemperatureC");
  assertFiniteNumber(requiredCoolingSupplyTemperatureC, "requiredCoolingSupplyTemperatureC");
  assertFiniteNumber(recirculatedHumidityKgPerKg, "recirculatedHumidityKgPerKg");
  assertFiniteNumber(requiredCoolingHumidityKgPerKg, "requiredCoolingHumidityKgPerKg");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");

  const sensibleKJPerH =
    airDensityKgPerM3 *
    airSpecificHeatKJPerKgK *
    supplyAirFlowM3PerH *
    (recirculatedSupplyTemperatureC - requiredCoolingSupplyTemperatureC);
  const latentKJPerH =
    airDensityKgPerM3 *
    moistureLatentHeatKJPerKg *
    supplyAirFlowM3PerH *
    (recirculatedHumidityKgPerKg - requiredCoolingHumidityKgPerKg);
  const valueKWh = (sensibleKJPerH + latentKJPerH) * calculationHours / 3600;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_43_AHU_COOLING_COIL_REQUIRED_ENERGY",
    formulaText:
      "QC,ahu,out,req = qV,SUP,AHU * [rhoa*ca*(thetaSUP,RCA - thetaSUP,C,req) + rhoa*rw*(xSUP,RCA - xSUP,C,req)] * tci / 3600",
    inputs: {
      airDensityKgPerM3,
      airSpecificHeatKJPerKgK,
      moistureLatentHeatKJPerKg,
      supplyAirFlowM3PerH,
      recirculatedSupplyTemperatureC,
      requiredCoolingSupplyTemperatureC,
      recirculatedHumidityKgPerKg,
      requiredCoolingHumidityKgPerKg,
      calculationHours
    },
    extra: { sensibleKJPerH, latentKJPerH }
  });
}

export function calculateAhuDehumidificationCoolingEnergy(input) {
  const {
    airDensityKgPerM3,
    airSpecificHeatKJPerKgK,
    moistureLatentHeatKJPerKg,
    supplyAirFlowM3PerH,
    recirculatedSupplyTemperatureC,
    ahuRequiredSupplyTemperatureC,
    requiredCoolingSupplyTemperatureC,
    recirculatedHumidityKgPerKg,
    dehumidificationHumidityReductionKgPerKg,
    requiredCoolingHumidityKgPerKg,
    calculationHours
  } = input ?? {};

  assertFinitePositiveNumber(airDensityKgPerM3, "airDensityKgPerM3");
  assertFinitePositiveNumber(airSpecificHeatKJPerKgK, "airSpecificHeatKJPerKgK");
  assertFinitePositiveNumber(moistureLatentHeatKJPerKg, "moistureLatentHeatKJPerKg");
  assertFiniteNonNegativeNumber(supplyAirFlowM3PerH, "supplyAirFlowM3PerH");
  assertFiniteNumber(recirculatedSupplyTemperatureC, "recirculatedSupplyTemperatureC");
  assertFiniteNumber(ahuRequiredSupplyTemperatureC, "ahuRequiredSupplyTemperatureC");
  assertFiniteNumber(requiredCoolingSupplyTemperatureC, "requiredCoolingSupplyTemperatureC");
  assertFiniteNumber(recirculatedHumidityKgPerKg, "recirculatedHumidityKgPerKg");
  assertFiniteNonNegativeNumber(
    dehumidificationHumidityReductionKgPerKg,
    "dehumidificationHumidityReductionKgPerKg"
  );
  assertFiniteNumber(requiredCoolingHumidityKgPerKg, "requiredCoolingHumidityKgPerKg");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");

  const sensibleTemperatureC = Math.min(
    recirculatedSupplyTemperatureC,
    ahuRequiredSupplyTemperatureC
  );
  const sensibleKJPerH =
    airDensityKgPerM3 *
    airSpecificHeatKJPerKgK *
    supplyAirFlowM3PerH *
    (sensibleTemperatureC - requiredCoolingSupplyTemperatureC);
  const latentKJPerH =
    airDensityKgPerM3 *
    moistureLatentHeatKJPerKg *
    supplyAirFlowM3PerH *
    (recirculatedHumidityKgPerKg -
      dehumidificationHumidityReductionKgPerKg -
      requiredCoolingHumidityKgPerKg);
  const valueKWh = (sensibleKJPerH + latentKJPerH) * calculationHours / 3600;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_44_AHU_DEHUMIDIFICATION_COOLING_ENERGY",
    formulaText:
      "QDHU,ahu,out,req = qV,SUP,AHU * [rhoa*ca*(min(thetaSUP,RCA,thetaSUP,ahu,req)-thetaSUP,C,req) + rhoa*rw*(xSUP,RCA-Delta xC-xSUP,C,req)] * tci / 3600",
    inputs: {
      airDensityKgPerM3,
      airSpecificHeatKJPerKgK,
      moistureLatentHeatKJPerKg,
      supplyAirFlowM3PerH,
      recirculatedSupplyTemperatureC,
      ahuRequiredSupplyTemperatureC,
      requiredCoolingSupplyTemperatureC,
      recirculatedHumidityKgPerKg,
      dehumidificationHumidityReductionKgPerKg,
      requiredCoolingHumidityKgPerKg,
      calculationHours
    },
    extra: { sensibleTemperatureC, sensibleKJPerH, latentKJPerH }
  });
}

export function calculateAhuHumidificationGeneratorInputEnergy(input) {
  const {
    airDensityKgPerM3,
    moistureLatentHeatKJPerKg,
    supplyAirFlowM3PerH,
    targetHumidityKgPerKg,
    sourceHumidityKgPerKg,
    calculationHours
  } = input ?? {};

  assertFinitePositiveNumber(airDensityKgPerM3, "airDensityKgPerM3");
  assertFinitePositiveNumber(moistureLatentHeatKJPerKg, "moistureLatentHeatKJPerKg");
  assertFiniteNonNegativeNumber(supplyAirFlowM3PerH, "supplyAirFlowM3PerH");
  assertFiniteNumber(targetHumidityKgPerKg, "targetHumidityKgPerKg");
  assertFiniteNumber(sourceHumidityKgPerKg, "sourceHumidityKgPerKg");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");

  const valueKWh =
    supplyAirFlowM3PerH *
    airDensityKgPerM3 *
    moistureLatentHeatKJPerKg *
    (targetHumidityKgPerKg - sourceHumidityKgPerKg) *
    calculationHours /
    3600;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_45_AHU_HUMIDIFICATION_GENERATOR_INPUT_ENERGY",
    formulaText: "EHU,gen,in,cr = qV,SUP,AHU * rhoa * rw * (xSUP,HU - xSUP,C) * tci / 3600",
    inputs: {
      airDensityKgPerM3,
      moistureLatentHeatKJPerKg,
      supplyAirFlowM3PerH,
      targetHumidityKgPerKg,
      sourceHumidityKgPerKg,
      calculationHours
    }
  });
}

export function calculateAhuNonSteamHumidificationAuxiliaryEnergy() {
  return makeResult({
    value: 0,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_46_AHU_NON_STEAM_HUMIDIFICATION_AUXILIARY_ENERGY",
    formulaText: "WHU,aux = 0 for non-steam humidification",
    inputs: {},
    assumptions: ["non_steam_humidification_branch_selected_explicitly"]
  });
}

export function calculateAhuGenerationLossConditioned(input) {
  const {
    supplyAuKWPerK,
    supplyTemperatureC,
    extractAuKWPerK,
    extractTemperatureC,
    zoneTemperatureC,
    supplyLeakageM3PerH,
    airDensityKgPerM3,
    airSpecificHeatKJPerKgK,
    calculationHours
  } = input ?? {};

  assertFiniteNonNegativeNumber(supplyAuKWPerK, "supplyAuKWPerK");
  assertFiniteNumber(supplyTemperatureC, "supplyTemperatureC");
  assertFiniteNonNegativeNumber(extractAuKWPerK, "extractAuKWPerK");
  assertFiniteNumber(extractTemperatureC, "extractTemperatureC");
  assertFiniteNumber(zoneTemperatureC, "zoneTemperatureC");
  assertFiniteNonNegativeNumber(supplyLeakageM3PerH, "supplyLeakageM3PerH");
  assertFinitePositiveNumber(airDensityKgPerM3, "airDensityKgPerM3");
  assertFinitePositiveNumber(airSpecificHeatKJPerKgK, "airSpecificHeatKJPerKgK");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");

  const conductiveKW =
    supplyAuKWPerK * (supplyTemperatureC - zoneTemperatureC) +
    extractAuKWPerK * (extractTemperatureC - zoneTemperatureC);
  const leakageKW =
    supplyLeakageM3PerH *
    airDensityKgPerM3 *
    airSpecificHeatKJPerKgK *
    (supplyTemperatureC - zoneTemperatureC) /
    3600;
  const valueKWh = (conductiveKW + leakageKW) * calculationHours;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_47_AHU_GENERATION_LOSS_CONDITIONED",
    formulaText:
      "QV,ls,gen = [(AU)SUP*(thetaSUP,hr - thetaIDA,zt) + (AU)ETA*(thetaETA,hr,in - thetaIDA,zt) + qV,lea,SUP*rhoa*ca*(thetaSUP,hr - thetaIDA,zt)/3600] * tci",
    inputs: {
      supplyAuKWPerK,
      supplyTemperatureC,
      extractAuKWPerK,
      extractTemperatureC,
      zoneTemperatureC,
      supplyLeakageM3PerH,
      airDensityKgPerM3,
      airSpecificHeatKJPerKgK,
      calculationHours
    },
    extra: { conductiveKW, leakageKW }
  });
}

export function calculateAhuGenerationLossUnconditioned(input) {
  const {
    supplyAuKWPerK,
    supplyTemperatureC,
    extractAuKWPerK,
    extractTemperatureC,
    surroundingTemperatureC,
    supplyLeakageM3PerH,
    extractLeakageM3PerH,
    airDensityKgPerM3,
    airSpecificHeatKJPerKgK,
    calculationHours
  } = input ?? {};

  assertFiniteNonNegativeNumber(supplyAuKWPerK, "supplyAuKWPerK");
  assertFiniteNumber(supplyTemperatureC, "supplyTemperatureC");
  assertFiniteNonNegativeNumber(extractAuKWPerK, "extractAuKWPerK");
  assertFiniteNumber(extractTemperatureC, "extractTemperatureC");
  assertFiniteNumber(surroundingTemperatureC, "surroundingTemperatureC");
  assertFiniteNonNegativeNumber(supplyLeakageM3PerH, "supplyLeakageM3PerH");
  assertFiniteNonNegativeNumber(extractLeakageM3PerH, "extractLeakageM3PerH");
  assertFinitePositiveNumber(airDensityKgPerM3, "airDensityKgPerM3");
  assertFinitePositiveNumber(airSpecificHeatKJPerKgK, "airSpecificHeatKJPerKgK");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");

  const conductiveKW =
    supplyAuKWPerK * (supplyTemperatureC - surroundingTemperatureC) +
    extractAuKWPerK * (extractTemperatureC - surroundingTemperatureC);
  const leakageKW =
    (supplyLeakageM3PerH * (supplyTemperatureC - surroundingTemperatureC) +
      extractLeakageM3PerH * (extractTemperatureC - surroundingTemperatureC)) *
    airDensityKgPerM3 *
    airSpecificHeatKJPerKgK /
    3600;
  const valueKWh = (conductiveKW + leakageKW) * calculationHours;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_48_AHU_GENERATION_LOSS_UNCONDITIONED",
    formulaText:
      "QV,ls,gen = [(AU)SUP*(thetaSUP,hr - thetaSur,nc) + (AU)ETA*(thetaETA,hr,in - thetaSur,nc) + leakage terms] * tci",
    inputs: {
      supplyAuKWPerK,
      supplyTemperatureC,
      extractAuKWPerK,
      extractTemperatureC,
      surroundingTemperatureC,
      supplyLeakageM3PerH,
      extractLeakageM3PerH,
      airDensityKgPerM3,
      airSpecificHeatKJPerKgK,
      calculationHours
    },
    extra: { conductiveKW, leakageKW }
  });
}

export function calculateBalancedResidentialFanTemperatureRise() {
  return makeResult({
    value: 0,
    valueKey: "valueK",
    unit: "K",
    formulaId: "MC001_3_51_BALANCED_RESIDENTIAL_FAN_TEMPERATURE_RISE",
    formulaText: "DeltaThetafan,SUP/ETA = 0 for residential balanced double-flow systems",
    inputs: {},
    assumptions: ["residential_balanced_double_flow_branch_selected_explicitly"]
  });
}

export function calculateFanTemperatureRise(input) {
  const {
    fanPressureDropPa,
    fanReadinessFactor,
    airDensityKgPerM3,
    airSpecificHeatKWhPerKgK,
    fanEfficiency
  } = input ?? {};

  assertFiniteNonNegativeNumber(fanPressureDropPa, "fanPressureDropPa");
  assertFiniteNonNegativeNumber(fanReadinessFactor, "fanReadinessFactor");
  assertFinitePositiveNumber(airDensityKgPerM3, "airDensityKgPerM3");
  assertFinitePositiveNumber(airSpecificHeatKWhPerKgK, "airSpecificHeatKWhPerKgK");
  assertFinitePositiveNumber(fanEfficiency, "fanEfficiency");
  const valueK =
    fanPressureDropPa *
    fanReadinessFactor /
    (airDensityKgPerM3 * airSpecificHeatKWhPerKgK * fanEfficiency * 3.6 * 10 ** 6);

  return makeResult({
    value: valueK,
    valueKey: "valueK",
    unit: "K",
    formulaId: "MC001_3_52_FAN_TEMPERATURE_RISE",
    formulaText: "DeltaThetafan = DeltaPfan * ffan,rd / (rhoa * ca * etaFan * 3.6 * 10^6)",
    inputs: {
      fanPressureDropPa,
      fanReadinessFactor,
      airDensityKgPerM3,
      airSpecificHeatKWhPerKgK,
      fanEfficiency
    }
  });
}

export function calculateFanElectricEnergy(input) {
  const {
    supplyAirFlowM3PerH,
    supplyPressureDropPa,
    supplyFanEfficiency,
    extractAirFlowM3PerH,
    extractPressureDropPa,
    extractFanEfficiency,
    calculationHours
  } = input ?? {};

  assertFiniteNonNegativeNumber(supplyAirFlowM3PerH, "supplyAirFlowM3PerH");
  assertFiniteNonNegativeNumber(supplyPressureDropPa, "supplyPressureDropPa");
  assertFinitePositiveNumber(supplyFanEfficiency, "supplyFanEfficiency");
  assertFiniteNonNegativeNumber(extractAirFlowM3PerH, "extractAirFlowM3PerH");
  assertFiniteNonNegativeNumber(extractPressureDropPa, "extractPressureDropPa");
  assertFinitePositiveNumber(extractFanEfficiency, "extractFanEfficiency");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");

  const valueKWh =
    (supplyAirFlowM3PerH * supplyPressureDropPa / supplyFanEfficiency +
      extractAirFlowM3PerH * extractPressureDropPa / extractFanEfficiency) *
    calculationHours /
    (3.6 * 10 ** 6);

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_55_AHU_FAN_ELECTRIC_ENERGY",
    formulaText:
      "EV,gen,in,el = (qV,SUP*DeltaPfan,SUP/etaFan,SUP + qV,ETA*DeltaPfan,ETA/etaFan,ETA) * tci / (3.6*10^6)",
    inputs: {
      supplyAirFlowM3PerH,
      supplyPressureDropPa,
      supplyFanEfficiency,
      extractAirFlowM3PerH,
      extractPressureDropPa,
      extractFanEfficiency,
      calculationHours
    }
  });
}

export function calculateFanEfficiencyFromNominalAndAirflowFactor(input) {
  const { nominalFanEfficiency, airflowFunctionFactor } = input ?? {};

  assertFraction(nominalFanEfficiency, "nominalFanEfficiency");
  assertFiniteNonNegativeNumber(airflowFunctionFactor, "airflowFunctionFactor");
  const value = nominalFanEfficiency * airflowFunctionFactor;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_56_FAN_EFFICIENCY_FROM_AIRFLOW_FACTOR",
    formulaText: "etaFan = etaFan,nom * f(qV)",
    inputs: { nominalFanEfficiency, airflowFunctionFactor }
  });
}

export function calculateQuadraticPressureDrop(input) {
  const { designPressureDropPa, currentFlowM3PerH, nominalFlowM3PerH, formulaId } =
    input ?? {};

  assertFiniteNonNegativeNumber(designPressureDropPa, "designPressureDropPa");
  assertFiniteNonNegativeNumber(currentFlowM3PerH, "currentFlowM3PerH");
  assertFinitePositiveNumber(nominalFlowM3PerH, "nominalFlowM3PerH");
  const valuePa = designPressureDropPa * (currentFlowM3PerH / nominalFlowM3PerH) ** 2;

  return makeResult({
    value: valuePa,
    valueKey: "valuePa",
    unit: "Pa",
    formulaId: formulaId ?? "MC001_3_57_TO_3_60_QUADRATIC_PRESSURE_DROP",
    formulaText: "DeltaP = DeltaPdes * (qV / qVnom)^2",
    inputs: { designPressureDropPa, currentFlowM3PerH, nominalFlowM3PerH }
  });
}

export function calculateMultiZoneConstantPressureDrop(input) {
  const { designPressureDropPa, currentFlowM3PerH, nominalFlowM3PerH, controlFactor } =
    input ?? {};

  assertFiniteNonNegativeNumber(designPressureDropPa, "designPressureDropPa");
  assertFiniteNonNegativeNumber(currentFlowM3PerH, "currentFlowM3PerH");
  assertFinitePositiveNumber(nominalFlowM3PerH, "nominalFlowM3PerH");
  assertFraction(controlFactor, "controlFactor");
  const flowRatio = currentFlowM3PerH / nominalFlowM3PerH;
  const valuePa = designPressureDropPa * ((1 - controlFactor) * flowRatio ** 2 + controlFactor);

  return makeResult({
    value: valuePa,
    valueKey: "valuePa",
    unit: "Pa",
    formulaId: "MC001_3_63_3_64_MULTIZONE_CONSTANT_PRESSURE_DROP",
    formulaText: "DeltaP = DeltaPdes * ((1 - fctrl) * (qV/qVnom)^2 + fctrl)",
    inputs: { designPressureDropPa, currentFlowM3PerH, nominalFlowM3PerH, controlFactor }
  });
}

export function calculateMultiZoneMinimumPressureDrop(input) {
  const {
    designPressureDropPa,
    currentFlowM3PerH,
    nominalFlowM3PerH,
    controlFactor,
    maximumFlowFactor
  } = input ?? {};

  assertFiniteNonNegativeNumber(designPressureDropPa, "designPressureDropPa");
  assertFiniteNonNegativeNumber(currentFlowM3PerH, "currentFlowM3PerH");
  assertFinitePositiveNumber(nominalFlowM3PerH, "nominalFlowM3PerH");
  assertFraction(controlFactor, "controlFactor");
  assertFiniteNonNegativeNumber(maximumFlowFactor, "maximumFlowFactor");
  const flowRatio = currentFlowM3PerH / nominalFlowM3PerH;
  const valuePa =
    designPressureDropPa *
    ((1 - controlFactor) * flowRatio ** 2 + controlFactor * maximumFlowFactor ** 2);

  return makeResult({
    value: valuePa,
    valueKey: "valuePa",
    unit: "Pa",
    formulaId: "MC001_3_65_3_66_MULTIZONE_MINIMUM_PRESSURE_DROP",
    formulaText: "DeltaP = DeltaPdes * ((1 - fctrl) * (qV/qVnom)^2 + fctrl * fVmax^2)",
    inputs: {
      designPressureDropPa,
      currentFlowM3PerH,
      nominalFlowM3PerH,
      controlFactor,
      maximumFlowFactor
    }
  });
}

export function calculateGroundPreheatPrecoolEnergy(input) {
  const {
    airDensityKgPerM3,
    airSpecificHeatKJPerKgK,
    supplyAirFlowM3PerH,
    outdoorAirFraction,
    preheatedOutdoorTemperatureC,
    outdoorTemperatureC,
    calculationHours
  } = input ?? {};

  assertFinitePositiveNumber(airDensityKgPerM3, "airDensityKgPerM3");
  assertFinitePositiveNumber(airSpecificHeatKJPerKgK, "airSpecificHeatKJPerKgK");
  assertFiniteNonNegativeNumber(supplyAirFlowM3PerH, "supplyAirFlowM3PerH");
  assertFraction(outdoorAirFraction, "outdoorAirFraction");
  assertFiniteNumber(preheatedOutdoorTemperatureC, "preheatedOutdoorTemperatureC");
  assertFiniteNumber(outdoorTemperatureC, "outdoorTemperatureC");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");
  const valueKWh =
    airDensityKgPerM3 *
    airSpecificHeatKJPerKgK *
    supplyAirFlowM3PerH *
    outdoorAirFraction *
    (preheatedOutdoorTemperatureC - outdoorTemperatureC) *
    calculationHours /
    3600;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_67_GROUND_PREHEAT_PRECOOL_ENERGY",
    formulaText: "Qgnd = rhoa * ca * qV,SUP,AHU * fODA * (thetaODA,preh - thetaE) * tci / 3600",
    inputs: {
      airDensityKgPerM3,
      airSpecificHeatKJPerKgK,
      supplyAirFlowM3PerH,
      outdoorAirFraction,
      preheatedOutdoorTemperatureC,
      outdoorTemperatureC,
      calculationHours
    }
  });
}

export function calculateVentilationAuxiliaryTotal(input) {
  const { heatRecoveryAuxiliaryKWh, preheatAuxiliaryKWh, controlAuxiliaryKWh } =
    input ?? {};

  assertFiniteNonNegativeNumber(heatRecoveryAuxiliaryKWh, "heatRecoveryAuxiliaryKWh");
  assertFiniteNonNegativeNumber(preheatAuxiliaryKWh, "preheatAuxiliaryKWh");
  assertFiniteNonNegativeNumber(controlAuxiliaryKWh, "controlAuxiliaryKWh");
  const valueKWh = heatRecoveryAuxiliaryKWh + preheatAuxiliaryKWh + controlAuxiliaryKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_68_VENTILATION_AUXILIARY_TOTAL",
    formulaText: "WV,aux = WV,aux,hr + WV,preh + WV,aux,ctrl",
    inputs: { heatRecoveryAuxiliaryKWh, preheatAuxiliaryKWh, controlAuxiliaryKWh }
  });
}

export function calculateRotaryHeatRecoveryAuxiliaryEnergy(input) {
  const { maxRotaryPowerKW, calculationHours, rotationRatio } = input ?? {};

  assertFiniteNonNegativeNumber(maxRotaryPowerKW, "maxRotaryPowerKW");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");
  assertFiniteNonNegativeNumber(rotationRatio, "rotationRatio");
  const valueKWh = maxRotaryPowerKW * calculationHours * rotationRatio;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_69_ROTARY_HEAT_RECOVERY_AUXILIARY_ENERGY",
    formulaText: "WV,aux,hr = Phr,rot,max * tci * nrot/nrot,max",
    inputs: { maxRotaryPowerKW, calculationHours, rotationRatio }
  });
}

export function calculatePumpHeatRecoveryAuxiliaryEnergy(input) {
  const {
    supplyAirFlowM3PerH,
    outdoorAirFraction,
    maxPumpSpecificPowerKWhPerM3,
    calculationHours,
    minimumPartLoadFactor,
    recoveredHeatKWh,
    maxRecoveredHeatPowerKW
  } = input ?? {};

  assertFiniteNonNegativeNumber(supplyAirFlowM3PerH, "supplyAirFlowM3PerH");
  assertFraction(outdoorAirFraction, "outdoorAirFraction");
  assertFiniteNonNegativeNumber(maxPumpSpecificPowerKWhPerM3, "maxPumpSpecificPowerKWhPerM3");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");
  assertFiniteNonNegativeNumber(minimumPartLoadFactor, "minimumPartLoadFactor");
  assertFiniteNonNegativeNumber(recoveredHeatKWh, "recoveredHeatKWh");
  assertFinitePositiveNumber(maxRecoveredHeatPowerKW, "maxRecoveredHeatPowerKW");
  const partLoad = Math.max(
    minimumPartLoadFactor,
    recoveredHeatKWh / (calculationHours * maxRecoveredHeatPowerKW)
  );
  const valueKWh =
    supplyAirFlowM3PerH *
    outdoorAirFraction *
    maxPumpSpecificPowerKWhPerM3 *
    calculationHours *
    partLoad ** 2.5;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_70_PUMP_HEAT_RECOVERY_AUXILIARY_ENERGY",
    formulaText: "WV,aux,hr = qV,SUP,AHU * fODA * pel,hr,pu,max * tci * max(fpl,hr,min, Qhr/(tci*Phihr,max))^2.5",
    inputs: {
      supplyAirFlowM3PerH,
      outdoorAirFraction,
      maxPumpSpecificPowerKWhPerM3,
      calculationHours,
      minimumPartLoadFactor,
      recoveredHeatKWh,
      maxRecoveredHeatPowerKW
    },
    extra: { partLoad }
  });
}

export function calculateOtherHeatRecoveryAuxiliaryEnergy() {
  return makeResult({
    value: 0,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_71_OTHER_HEAT_RECOVERY_AUXILIARY_ENERGY",
    formulaText: "WV,aux,hr = 0 for other heat recovery systems",
    inputs: {}
  });
}

export function calculateFanEnergyAssignedToHeatRecoveryPressure(input) {
  const {
    fanElectricEnergyKWh,
    heatRecoveryDesignPressureDropPa,
    supplyDesignPressureDropPa,
    extractDesignPressureDropPa
  } = input ?? {};

  assertFiniteNonNegativeNumber(fanElectricEnergyKWh, "fanElectricEnergyKWh");
  assertFiniteNonNegativeNumber(
    heatRecoveryDesignPressureDropPa,
    "heatRecoveryDesignPressureDropPa"
  );
  assertFiniteNonNegativeNumber(supplyDesignPressureDropPa, "supplyDesignPressureDropPa");
  assertFiniteNonNegativeNumber(extractDesignPressureDropPa, "extractDesignPressureDropPa");
  const denominator = supplyDesignPressureDropPa + extractDesignPressureDropPa;
  assertFinitePositiveNumber(denominator, "supplyDesignPressureDropPa + extractDesignPressureDropPa");
  const valueKWh = fanElectricEnergyKWh * heatRecoveryDesignPressureDropPa / denominator;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_72_FAN_ENERGY_ASSIGNED_TO_HEAT_RECOVERY_PRESSURE",
    formulaText: "EV,gen,in,el,hr = EV,gen,in,el * DeltaPdes,hr / (DeltaPSUP,des + DeltaPETA,des)",
    inputs: {
      fanElectricEnergyKWh,
      heatRecoveryDesignPressureDropPa,
      supplyDesignPressureDropPa,
      extractDesignPressureDropPa
    }
  });
}

export function calculatePreheaterEnergy(input) {
  const {
    airDensityKgPerM3,
    airSpecificHeatKJPerKgK,
    supplyAirFlowM3PerH,
    outdoorAirFraction,
    frostProtectionTemperatureC,
    outdoorTemperatureC,
    calculationHours
  } = input ?? {};

  assertFinitePositiveNumber(airDensityKgPerM3, "airDensityKgPerM3");
  assertFinitePositiveNumber(airSpecificHeatKJPerKgK, "airSpecificHeatKJPerKgK");
  assertFiniteNonNegativeNumber(supplyAirFlowM3PerH, "supplyAirFlowM3PerH");
  assertFraction(outdoorAirFraction, "outdoorAirFraction");
  assertFiniteNumber(frostProtectionTemperatureC, "frostProtectionTemperatureC");
  assertFiniteNumber(outdoorTemperatureC, "outdoorTemperatureC");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");
  const valueKWh =
    airDensityKgPerM3 *
    airSpecificHeatKJPerKgK *
    supplyAirFlowM3PerH *
    outdoorAirFraction *
    (frostProtectionTemperatureC - outdoorTemperatureC) *
    calculationHours /
    3600;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_73_PREHEATER_ENERGY",
    formulaText: "WV,preh = rhoa * ca * qV,SUP,AHU * fODA * (thetaODA,fp - thetaE) * tci / 3600",
    inputs: {
      airDensityKgPerM3,
      airSpecificHeatKJPerKgK,
      supplyAirFlowM3PerH,
      outdoorAirFraction,
      frostProtectionTemperatureC,
      outdoorTemperatureC,
      calculationHours
    }
  });
}

export function calculateNoPreheaterEnergy() {
  return makeResult({
    value: 0,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_74_NO_PREHEATER_ENERGY",
    formulaText: "WV,preh = 0 when no preheater exists",
    inputs: {}
  });
}

export function calculateVentilationControlAuxiliaryEnergy(input) {
  const { controllerPowerKW, operationFactor, calculationHours } = input ?? {};

  assertFiniteNonNegativeNumber(controllerPowerKW, "controllerPowerKW");
  assertFiniteNonNegativeNumber(operationFactor, "operationFactor");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");
  const valueKWh = controllerPowerKW * operationFactor * calculationHours;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_75_VENTILATION_CONTROL_AUXILIARY_ENERGY",
    formulaText: "WV,aux,ctrl = sum Pel,V,ctrl * fop,ctrl * tci",
    inputs: { controllerPowerKW, operationFactor, calculationHours }
  });
}

export function calculateSteamHumidificationPumpAuxiliaryEnergy() {
  return makeResult({
    value: 0,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_76_STEAM_HUMIDIFICATION_PUMP_AUXILIARY_ENERGY",
    formulaText: "WHU,aux = 0 for steam humidification pump branch",
    inputs: {}
  });
}

export function calculateHumidificationPumpAuxiliaryEnergy(input) {
  const {
    designHumidificationAirFlowM3PerH,
    designSpecificPumpEnergyKWhPerM3,
    partLoadFactor,
    calculationHours
  } = input ?? {};

  assertFiniteNonNegativeNumber(
    designHumidificationAirFlowM3PerH,
    "designHumidificationAirFlowM3PerH"
  );
  assertFiniteNonNegativeNumber(
    designSpecificPumpEnergyKWhPerM3,
    "designSpecificPumpEnergyKWhPerM3"
  );
  assertFiniteNonNegativeNumber(partLoadFactor, "partLoadFactor");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");
  const valueKWh =
    designHumidificationAirFlowM3PerH *
    designSpecificPumpEnergyKWhPerM3 *
    partLoadFactor *
    calculationHours;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_77_HUMIDIFICATION_PUMP_AUXILIARY_ENERGY",
    formulaText: "WHU,aux = qV,SUP,HU,des * pel,HU,des * fpl,HU * tci",
    inputs: {
      designHumidificationAirFlowM3PerH,
      designSpecificPumpEnergyKWhPerM3,
      partLoadFactor,
      calculationHours
    }
  });
}

export function calculateDuctLeakageFactor(input) {
  const { leakageAirFlowM3PerH, requiredAirFlowM3PerH } = input ?? {};

  assertFiniteNonNegativeNumber(leakageAirFlowM3PerH, "leakageAirFlowM3PerH");
  assertFinitePositiveNumber(requiredAirFlowM3PerH, "requiredAirFlowM3PerH");
  const value = 1 + leakageAirFlowM3PerH / requiredAirFlowM3PerH;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_78_DUCT_LEAKAGE_FACTOR",
    formulaText: "flea,du = 1 + qV,lea,du / qV,dis,req",
    inputs: { leakageAirFlowM3PerH, requiredAirFlowM3PerH }
  });
}

export function calculateDuctLeakageAirFlow(input) {
  const { ductAreaM2, leakageCoefficient, pressureDifferencePa, exponent } = input ?? {};

  assertFiniteNonNegativeNumber(ductAreaM2, "ductAreaM2");
  assertFiniteNonNegativeNumber(leakageCoefficient, "leakageCoefficient");
  assertFiniteNonNegativeNumber(pressureDifferencePa, "pressureDifferencePa");
  assertFiniteNonNegativeNumber(exponent, "exponent");
  const valueM3PerH = ductAreaM2 * leakageCoefficient * pressureDifferencePa ** exponent * 3600;

  return makeResult({
    value: valueM3PerH,
    valueKey: "valueM3PerH",
    unit: "m3/h",
    formulaId: "MC001_3_79_DUCT_LEAKAGE_AIR_FLOW",
    formulaText: "qV,lea,du = Adu * clea,du * DeltaPdu^ep * 3600",
    inputs: { ductAreaM2, leakageCoefficient, pressureDifferencePa, exponent }
  });
}

export function calculateAhuLeakageFactor(input) {
  const {
    ahuLeakageAirFlowM3PerH,
    distributionAirFlowM3PerH,
    ahuPressurePa,
    testPressurePa
  } = input ?? {};

  assertFiniteNonNegativeNumber(ahuLeakageAirFlowM3PerH, "ahuLeakageAirFlowM3PerH");
  assertFinitePositiveNumber(distributionAirFlowM3PerH, "distributionAirFlowM3PerH");
  assertFiniteNonNegativeNumber(ahuPressurePa, "ahuPressurePa");
  assertFinitePositiveNumber(testPressurePa, "testPressurePa");
  const value =
    1 +
    (ahuLeakageAirFlowM3PerH / distributionAirFlowM3PerH) *
      (ahuPressurePa / testPressurePa) ** 0.65;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_80_AHU_LEAKAGE_FACTOR",
    formulaText: "flea,ahu = 1 + qV,lea,ahu/qV,dis,in/out * (DeltaP/DeltaPtest)^0.65",
    inputs: {
      ahuLeakageAirFlowM3PerH,
      distributionAirFlowM3PerH,
      ahuPressurePa,
      testPressurePa
    }
  });
}

export function calculateRequiredSupplyDistributionAirFlow(input) {
  const { zoneRequiredAirFlowsM3PerH = [] } = input ?? {};

  const valueM3PerH = zoneRequiredAirFlowsM3PerH.reduce((sum, item, index) => {
    assertFiniteNonNegativeNumber(item.leakageFactor, `zoneRequiredAirFlowsM3PerH[${index}].leakageFactor`);
    assertFiniteNonNegativeNumber(item.requiredAirFlowM3PerH, `zoneRequiredAirFlowsM3PerH[${index}].requiredAirFlowM3PerH`);
    return sum + item.leakageFactor * item.requiredAirFlowM3PerH;
  }, 0);

  return makeResult({
    value: valueM3PerH,
    valueKey: "valueM3PerH",
    unit: "m3/h",
    formulaId: "MC001_3_81_REQUIRED_SUPPLY_DISTRIBUTION_AIR_FLOW",
    formulaText: "qV,SUP,dis,in,req = sum_i(flea,du,SUP * qV,SUP,dis,zv,req,i)",
    inputs: { zoneRequiredAirFlowsM3PerH }
  });
}

export function calculateRequiredExtractDistributionAirFlow(input) {
  const { zoneRequiredAirFlowsM3PerH = [] } = input ?? {};

  const valueM3PerH = -zoneRequiredAirFlowsM3PerH.reduce((sum, item, index) => {
    assertFiniteNonNegativeNumber(item.leakageFactor, `zoneRequiredAirFlowsM3PerH[${index}].leakageFactor`);
    assertFiniteNonNegativeNumber(item.requiredAirFlowM3PerH, `zoneRequiredAirFlowsM3PerH[${index}].requiredAirFlowM3PerH`);
    return sum + item.leakageFactor * item.requiredAirFlowM3PerH;
  }, 0);

  return makeResult({
    value: valueM3PerH,
    valueKey: "valueM3PerH",
    unit: "m3/h",
    formulaId: "MC001_3_82_REQUIRED_EXTRACT_DISTRIBUTION_AIR_FLOW",
    formulaText: "qV,ETA,dis,out,req = -sum_i(flea,du,ETA * qV,ETA,dis,zv,req,i)",
    inputs: { zoneRequiredAirFlowsM3PerH }
  });
}

export function allocateSupplyAirFlowToZone(input) {
  const { supplyDistributionAirFlowM3PerH, zoneRequiredAirFlowM3PerH, totalRequiredAirFlowM3PerH } =
    input ?? {};

  assertFiniteNonNegativeNumber(supplyDistributionAirFlowM3PerH, "supplyDistributionAirFlowM3PerH");
  assertFiniteNonNegativeNumber(zoneRequiredAirFlowM3PerH, "zoneRequiredAirFlowM3PerH");
  assertFinitePositiveNumber(totalRequiredAirFlowM3PerH, "totalRequiredAirFlowM3PerH");
  const valueM3PerH =
    supplyDistributionAirFlowM3PerH * zoneRequiredAirFlowM3PerH / totalRequiredAirFlowM3PerH;

  return makeResult({
    value: valueM3PerH,
    valueKey: "valueM3PerH",
    unit: "m3/h",
    formulaId: "MC001_3_83_SUPPLY_AIR_FLOW_ZONE_ALLOCATION",
    formulaText: "qV,SUP,dis,zv,i = qV,SUP,dis,in * qV,SUP,dis,zv,req,i / qV,SUP,dis,in,req",
    inputs: {
      supplyDistributionAirFlowM3PerH,
      zoneRequiredAirFlowM3PerH,
      totalRequiredAirFlowM3PerH
    }
  });
}

export function allocateExtractAirFlowToZone(input) {
  const { extractDistributionAirFlowM3PerH, zoneRequiredAirFlowM3PerH, totalRequiredAirFlowM3PerH } =
    input ?? {};

  assertFiniteNumber(extractDistributionAirFlowM3PerH, "extractDistributionAirFlowM3PerH");
  assertFiniteNonNegativeNumber(zoneRequiredAirFlowM3PerH, "zoneRequiredAirFlowM3PerH");
  assertFiniteNumber(totalRequiredAirFlowM3PerH, "totalRequiredAirFlowM3PerH");
  if (totalRequiredAirFlowM3PerH === 0) {
    throw new Error("totalRequiredAirFlowM3PerH must not be zero");
  }
  const valueM3PerH =
    -extractDistributionAirFlowM3PerH * zoneRequiredAirFlowM3PerH / totalRequiredAirFlowM3PerH;

  return makeResult({
    value: valueM3PerH,
    valueKey: "valueM3PerH",
    unit: "m3/h",
    formulaId: "MC001_3_84_EXTRACT_AIR_FLOW_ZONE_ALLOCATION",
    formulaText: "qV,ETA,dis,zv,i = -qV,ETA,dis,out * qV,ETA,dis,zv,req,i / qV,ETA,dis,out,req",
    inputs: {
      extractDistributionAirFlowM3PerH,
      zoneRequiredAirFlowM3PerH,
      totalRequiredAirFlowM3PerH
    }
  });
}

export function calculateDuctLeakageFlowFromFactor(input) {
  const { leakageFactor, zoneAirFlowM3PerH, formulaId } = input ?? {};

  assertFiniteNonNegativeNumber(leakageFactor, "leakageFactor");
  assertFiniteNumber(zoneAirFlowM3PerH, "zoneAirFlowM3PerH");
  const valueM3PerH = (leakageFactor - 1) * zoneAirFlowM3PerH;

  return makeResult({
    value: valueM3PerH,
    valueKey: "valueM3PerH",
    unit: "m3/h",
    formulaId: formulaId ?? "MC001_3_85_TO_3_87_DUCT_LEAKAGE_FLOW_FROM_FACTOR",
    formulaText: "qV,lea = (flea,du - 1) * qV",
    inputs: { leakageFactor, zoneAirFlowM3PerH }
  });
}

export function calculateMaximumZoneFlowFactor(input) {
  const { zoneFlows = [] } = input ?? {};
  if (!Array.isArray(zoneFlows) || zoneFlows.length === 0) {
    throw new Error("zoneFlows must be a non-empty array");
  }
  const ratios = zoneFlows.map((item, index) => {
    assertFiniteNonNegativeNumber(item.currentAirFlowM3PerH, `zoneFlows[${index}].currentAirFlowM3PerH`);
    assertFinitePositiveNumber(item.designMaximumAirFlowM3PerH, `zoneFlows[${index}].designMaximumAirFlowM3PerH`);
    return item.currentAirFlowM3PerH / item.designMaximumAirFlowM3PerH;
  });
  const value = Math.max(...ratios);

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_88_MAXIMUM_ZONE_FLOW_FACTOR",
    formulaText: "fVmax = max_i(qV,SUP,dis,zv,i / qV,SUP,dis,zv,max,des,i)",
    inputs: { zoneFlows },
    extra: { ratios }
  });
}

export function calculatePartLoadAhuAirFlow(input) {
  const { partLoadFactor, nominalAirFlowM3PerH, formulaId } = input ?? {};

  assertFiniteNonNegativeNumber(partLoadFactor, "partLoadFactor");
  assertFiniteNonNegativeNumber(nominalAirFlowM3PerH, "nominalAirFlowM3PerH");
  const valueM3PerH = partLoadFactor * nominalAirFlowM3PerH;

  return makeResult({
    value: valueM3PerH,
    valueKey: "valueM3PerH",
    unit: "m3/h",
    formulaId: formulaId ?? "MC001_3_89_3_90_PART_LOAD_AHU_AIR_FLOW",
    formulaText: "qV,dis,req = fpl * qV,AHU,nom",
    inputs: { partLoadFactor, nominalAirFlowM3PerH }
  });
}

export function calculateMaximumFlowFactorFromPartLoad(input) {
  const { partLoadFactor, deltaFlowFactor } = input ?? {};

  assertFiniteNonNegativeNumber(partLoadFactor, "partLoadFactor");
  assertFiniteNumber(deltaFlowFactor, "deltaFlowFactor");
  const value = partLoadFactor + deltaFlowFactor;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_91_MAXIMUM_FLOW_FACTOR_FROM_PART_LOAD",
    formulaText: "fVmax = fpl + deltaFV",
    inputs: { partLoadFactor, deltaFlowFactor }
  });
}

export function calculateCoolingDistributionLoss(input) {
  const { coolingLossFactor, usefulCoolingDemandKWh, emissionLossKWh, ahuCoolingOutputRequiredKWh } =
    input ?? {};

  assertFiniteNonNegativeNumber(coolingLossFactor, "coolingLossFactor");
  assertFiniteNonNegativeNumber(usefulCoolingDemandKWh, "usefulCoolingDemandKWh");
  assertFiniteNonNegativeNumber(emissionLossKWh, "emissionLossKWh");
  assertFiniteNonNegativeNumber(ahuCoolingOutputRequiredKWh, "ahuCoolingOutputRequiredKWh");
  const baseKWh = usefulCoolingDemandKWh + emissionLossKWh + ahuCoolingOutputRequiredKWh;
  const valueKWh = coolingLossFactor * baseKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_146_COOLING_DISTRIBUTION_LOSS",
    formulaText: "QC,dis,ls = fC,ls,dis * (sum QC,nd,zt + sum QC,em,ls + sum QC,ahu,out,req)",
    inputs: {
      coolingLossFactor,
      usefulCoolingDemandKWh,
      emissionLossKWh,
      ahuCoolingOutputRequiredKWh
    },
    extra: { baseKWh }
  });
}

export function calculateCoolingDistributionAuxiliaryEnergy(input) {
  const { auxiliaryFactor, usefulCoolingDemandKWh, emissionLossKWh, ahuCoolingOutputRequiredKWh } =
    input ?? {};

  assertFiniteNonNegativeNumber(auxiliaryFactor, "auxiliaryFactor");
  assertFiniteNonNegativeNumber(usefulCoolingDemandKWh, "usefulCoolingDemandKWh");
  assertFiniteNonNegativeNumber(emissionLossKWh, "emissionLossKWh");
  assertFiniteNonNegativeNumber(ahuCoolingOutputRequiredKWh, "ahuCoolingOutputRequiredKWh");
  const baseKWh = usefulCoolingDemandKWh + emissionLossKWh + ahuCoolingOutputRequiredKWh;
  const valueKWh = auxiliaryFactor * baseKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_147_COOLING_DISTRIBUTION_AUXILIARY_ENERGY",
    formulaText: "WC,aux,dis = fC,aux,dis * (sum QC,nd,zt + sum QC,em,ls + sum QC,ahu,out,req)",
    inputs: { auxiliaryFactor, usefulCoolingDemandKWh, emissionLossKWh, ahuCoolingOutputRequiredKWh },
    extra: { baseKWh }
  });
}

export function calculateCoolingGeneratorInputRequiredDirectExpansion(input) {
  const { usefulCoolingDemandKWh, emissionLossKWh, ahuCoolingOutputRequiredKWh } =
    input ?? {};

  assertFiniteNonNegativeNumber(usefulCoolingDemandKWh, "usefulCoolingDemandKWh");
  assertFiniteNonNegativeNumber(emissionLossKWh, "emissionLossKWh");
  assertFiniteNonNegativeNumber(ahuCoolingOutputRequiredKWh, "ahuCoolingOutputRequiredKWh");
  const valueKWh = usefulCoolingDemandKWh + emissionLossKWh + ahuCoolingOutputRequiredKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_144_COOLING_GENERATOR_INPUT_REQUIRED_DIRECT_EXPANSION",
    formulaText: "QC,gen,in,req = sum QC,nd,zt + sum QC,em,ls + sum QC,ahu,out,req",
    inputs: { usefulCoolingDemandKWh, emissionLossKWh, ahuCoolingOutputRequiredKWh }
  });
}

export function calculateCoolingGeneratorInputRequiredAirWater(input) {
  const {
    usefulCoolingDemandKWh,
    emissionLossKWh,
    ahuCoolingOutputRequiredKWh,
    distributionLossKWh,
    auxiliaryDistributionEnergyKWh,
    auxiliaryHeatFraction
  } = input ?? {};

  assertFiniteNonNegativeNumber(usefulCoolingDemandKWh, "usefulCoolingDemandKWh");
  assertFiniteNonNegativeNumber(emissionLossKWh, "emissionLossKWh");
  assertFiniteNonNegativeNumber(ahuCoolingOutputRequiredKWh, "ahuCoolingOutputRequiredKWh");
  assertFiniteNonNegativeNumber(distributionLossKWh, "distributionLossKWh");
  assertFiniteNonNegativeNumber(
    auxiliaryDistributionEnergyKWh,
    "auxiliaryDistributionEnergyKWh"
  );
  assertFiniteNonNegativeNumber(auxiliaryHeatFraction, "auxiliaryHeatFraction");
  const valueKWh =
    usefulCoolingDemandKWh +
    emissionLossKWh +
    ahuCoolingOutputRequiredKWh +
    distributionLossKWh +
    auxiliaryHeatFraction * auxiliaryDistributionEnergyKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_145_COOLING_GENERATOR_INPUT_REQUIRED_AIR_WATER",
    formulaText:
      "QC,gen,in,req = sum QC,nd,zt + sum QC,em,ls + sum QC,ahu,out,req + QC,dis,ls + fwat,C,aux,dis * WC,aux,dis",
    inputs: {
      usefulCoolingDemandKWh,
      emissionLossKWh,
      ahuCoolingOutputRequiredKWh,
      distributionLossKWh,
      auxiliaryDistributionEnergyKWh,
      auxiliaryHeatFraction
    }
  });
}

export function selectCoolingGeneratorOutletTemperature(input) {
  const { branch, thetaCIntIncC, thetaSupplyCoolingRequiredC, thetaCGenOutSetC, thetaCDisInFlowRequiredC } =
    input ?? {};

  const branches = {
    direct_expansion_zone: thetaCIntIncC,
    direct_expansion_air_distribution: thetaSupplyCoolingRequiredC,
    air_water_constant: thetaCGenOutSetC,
    other: thetaCDisInFlowRequiredC
  };
  if (!Object.hasOwn(branches, branch)) {
    throw new Error("branch must be direct_expansion_zone, direct_expansion_air_distribution, air_water_constant, or other");
  }
  assertFiniteNumber(branches[branch], `temperature for ${branch}`);
  const formulaIdByBranch = {
    direct_expansion_zone: "MC001_3_136_COOLING_GENERATOR_OUTLET_TEMPERATURE_DIRECT_EXPANSION_ZONE",
    direct_expansion_air_distribution: "MC001_3_137_COOLING_GENERATOR_OUTLET_TEMPERATURE_DIRECT_EXPANSION_AIR",
    air_water_constant: "MC001_3_138_COOLING_GENERATOR_OUTLET_TEMPERATURE_AIR_WATER_CONSTANT",
    other: "MC001_3_139_COOLING_GENERATOR_OUTLET_TEMPERATURE_OTHER"
  };

  return makeResult({
    value: branches[branch],
    valueKey: "valueC",
    unit: "degC",
    formulaId: formulaIdByBranch[branch],
    formulaText: "thetaC,gen,out selected by MC001 cooling system branch",
    inputs: { branch, thetaCIntIncC, thetaSupplyCoolingRequiredC, thetaCGenOutSetC, thetaCDisInFlowRequiredC }
  });
}

export function calculateCoolingDistributionInletOutdoorCompensatedTemperature(input) {
  const { setpointMinC, setpointMaxC, compensationSlope, outdoorTemperatureC, offsetK } =
    input ?? {};

  assertFiniteNumber(setpointMinC, "setpointMinC");
  assertFiniteNumber(setpointMaxC, "setpointMaxC");
  assertFiniteNumber(compensationSlope, "compensationSlope");
  assertFiniteNumber(outdoorTemperatureC, "outdoorTemperatureC");
  assertFiniteNumber(offsetK, "offsetK");
  const rawC = compensationSlope * outdoorTemperatureC + offsetK;
  const valueC = Math.min(setpointMaxC, Math.max(setpointMinC, rawC));

  return makeResult({
    value: valueC,
    valueKey: "valueC",
    unit: "degC",
    formulaId: "MC001_3_141_COOLING_DISTRIBUTION_INLET_OUTDOOR_COMPENSATED",
    formulaText: "thetaC,dis,in,flw,req = min(thetaSet,max, max(thetaSet,min, fe*thetae + DeltaThetaoff))",
    inputs: { setpointMinC, setpointMaxC, compensationSlope, outdoorTemperatureC, offsetK },
    extra: { rawC }
  });
}

export function calculateCoolingExtractedEnergyLimitedByGenerator(input) {
  const { requiredEnergyKWh, generatorInputRequiredKWh, generatorInputAvailableKWh, formulaId } =
    input ?? {};

  assertFiniteNonNegativeNumber(requiredEnergyKWh, "requiredEnergyKWh");
  assertFinitePositiveNumber(generatorInputRequiredKWh, "generatorInputRequiredKWh");
  assertFiniteNonNegativeNumber(generatorInputAvailableKWh, "generatorInputAvailableKWh");
  const valueKWh = Math.min(
    requiredEnergyKWh,
    requiredEnergyKWh / generatorInputRequiredKWh * generatorInputAvailableKWh
  );

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: formulaId ?? "MC001_3_142_3_143_COOLING_EXTRACTED_LIMITED_BY_GENERATOR",
    formulaText: "QC = min(QC,req, QC,req / QC,gen,in,req * QC,gen,in)",
    inputs: { requiredEnergyKWh, generatorInputRequiredKWh, generatorInputAvailableKWh }
  });
}

export function calculateCoolingPartLoadFactor(input) {
  const { generatorInputRequiredKWh, operationHours, nominalCoolingPowerKW } = input ?? {};

  assertFiniteNonNegativeNumber(generatorInputRequiredKWh, "generatorInputRequiredKWh");
  assertFinitePositiveNumber(operationHours, "operationHours");
  assertFinitePositiveNumber(nominalCoolingPowerKW, "nominalCoolingPowerKW");
  const value = generatorInputRequiredKWh / (operationHours * nominalCoolingPowerKW);

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_149_COOLING_PART_LOAD_FACTOR",
    formulaText: "fC,PL = QC,gen,in,req / (tC,gen,op * PhiC,gen,N)",
    inputs: { generatorInputRequiredKWh, operationHours, nominalCoolingPowerKW }
  });
}

export function selectCoolingPartLoadBin(input) {
  const { partLoadFactor } = input ?? {};

  assertFiniteNonNegativeNumber(partLoadFactor, "partLoadFactor");
  let value;
  let formulaId;
  if (partLoadFactor < 0.05) {
    value = 1;
    formulaId = "MC001_3_151_COOLING_PART_LOAD_BIN_BELOW_005";
  } else {
    value = Math.min(1, Math.ceil(partLoadFactor * 10) / 10);
    formulaId = "MC001_3_150_COOLING_PART_LOAD_BIN";
  }

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId,
    formulaText: partLoadFactor < 0.05 ? "fC,PL,k = 1 when fC,PL < 0.05" : "fC,PL,k selected from MC001 0.1 part-load bins",
    inputs: { partLoadFactor }
  });
}

export function calculateCoolingGeneratorInputByCapacityLimit(input) {
  const { generatorInputRequiredKWh, operationHours, nominalCoolingPowerKW } = input ?? {};

  assertFiniteNonNegativeNumber(generatorInputRequiredKWh, "generatorInputRequiredKWh");
  assertFiniteNonNegativeNumber(operationHours, "operationHours");
  assertFiniteNonNegativeNumber(nominalCoolingPowerKW, "nominalCoolingPowerKW");
  const capacityKWh = operationHours * nominalCoolingPowerKW;
  const valueKWh = generatorInputRequiredKWh <= capacityKWh ? generatorInputRequiredKWh : capacityKWh;
  const formulaId =
    generatorInputRequiredKWh <= capacityKWh
      ? "MC001_3_152_COOLING_GENERATOR_INPUT_WITHIN_CAPACITY"
      : "MC001_3_153_COOLING_GENERATOR_INPUT_CAPACITY_LIMIT";

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId,
    formulaText: "QC,gen,in = QC,gen,in,req if capacity allows; otherwise tC,gen,op * PhiC,gen,N",
    inputs: { generatorInputRequiredKWh, operationHours, nominalCoolingPowerKW },
    extra: { capacityKWh }
  });
}

export function calculateCoolingCoveredPartLoadFactor(input) {
  const { generatorInputKWh, generatorInputRequiredKWh } = input ?? {};

  assertFiniteNonNegativeNumber(generatorInputKWh, "generatorInputKWh");
  assertFinitePositiveNumber(generatorInputRequiredKWh, "generatorInputRequiredKWh");
  const value = Math.min(1, generatorInputKWh / generatorInputRequiredKWh);

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_154_COOLING_COVERED_PART_LOAD_FACTOR",
    formulaText: "fC,PL,cvd = min(1, QC,gen,in / QC,gen,in,req)",
    inputs: { generatorInputKWh, generatorInputRequiredKWh }
  });
}

export function calculateCoolingEerTemperatureCorrectionFactor(input) {
  const {
    absoluteZeroOffsetK,
    generatorRequiredOutletTemperatureC,
    heatRejectionReferenceInletTemperatureC,
    nominalGeneratorOutletTemperatureC,
    nominalHeatRejectionInletTemperatureC,
    evaporatorTemperatureDifferenceK,
    condenserTemperatureDifferenceK
  } = input ?? {};

  assertFinitePositiveNumber(absoluteZeroOffsetK, "absoluteZeroOffsetK");
  assertFiniteNumber(generatorRequiredOutletTemperatureC, "generatorRequiredOutletTemperatureC");
  assertFiniteNumber(heatRejectionReferenceInletTemperatureC, "heatRejectionReferenceInletTemperatureC");
  assertFiniteNumber(nominalGeneratorOutletTemperatureC, "nominalGeneratorOutletTemperatureC");
  assertFiniteNumber(nominalHeatRejectionInletTemperatureC, "nominalHeatRejectionInletTemperatureC");
  assertFiniteNonNegativeNumber(evaporatorTemperatureDifferenceK, "evaporatorTemperatureDifferenceK");
  assertFiniteNonNegativeNumber(condenserTemperatureDifferenceK, "condenserTemperatureDifferenceK");
  const actualColdK =
    absoluteZeroOffsetK + generatorRequiredOutletTemperatureC - evaporatorTemperatureDifferenceK;
  const actualHotK =
    absoluteZeroOffsetK + heatRejectionReferenceInletTemperatureC + condenserTemperatureDifferenceK;
  const nominalColdK =
    absoluteZeroOffsetK + nominalGeneratorOutletTemperatureC - evaporatorTemperatureDifferenceK;
  const nominalHotK =
    absoluteZeroOffsetK + nominalHeatRejectionInletTemperatureC + condenserTemperatureDifferenceK;
  const actualDenominator = actualHotK - actualColdK;
  const nominalDenominator = nominalHotK - nominalColdK;
  assertFinitePositiveNumber(actualDenominator, "actualHotK - actualColdK");
  assertFinitePositiveNumber(nominalDenominator, "nominalHotK - nominalColdK");
  const value = (actualColdK / actualDenominator) / (nominalColdK / nominalDenominator);

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_155_COOLING_EER_TEMPERATURE_CORRECTION",
    formulaText:
      "fEER,corr = Carnot(thetaC,gen,out,thetaC,gen,hr,in,ref) / Carnot(thetaC,gen,out,N,thetaC,gen,hr,in,N)",
    inputs: {
      absoluteZeroOffsetK,
      generatorRequiredOutletTemperatureC,
      heatRejectionReferenceInletTemperatureC,
      nominalGeneratorOutletTemperatureC,
      nominalHeatRejectionInletTemperatureC,
      evaporatorTemperatureDifferenceK,
      condenserTemperatureDifferenceK
    },
    extra: { actualColdK, actualHotK, nominalColdK, nominalHotK }
  });
}

export function calculateLightingLeniFromSubspaces(input) {
  const { subspaces = [], totalAreaM2 } = input ?? {};

  if (!Array.isArray(subspaces) || subspaces.length === 0) {
    throw new Error("subspaces must be a non-empty array");
  }
  assertFinitePositiveNumber(totalAreaM2, "totalAreaM2");
  const weightedSum = subspaces.reduce((sum, item, index) => {
    assertFiniteNonNegativeNumber(item.leniKWhPerM2Year, `subspaces[${index}].leniKWhPerM2Year`);
    assertFiniteNonNegativeNumber(item.areaM2, `subspaces[${index}].areaM2`);
    return sum + item.leniKWhPerM2Year * item.areaM2;
  }, 0);
  const valueKWhPerM2Year = weightedSum / totalAreaM2;

  return makeResult({
    value: valueKWhPerM2Year,
    valueKey: "valueKWhPerM2Year",
    unit: "kWh/(m2*year)",
    formulaId: "MC001_3_4_34_LIGHTING_LENI_WEIGHTED_BUILDING",
    formulaText: "LENI = sum_i(LENIsub,i * Ai) / A",
    inputs: { subspaces, totalAreaM2 },
    assumptions: [
      "subspace_LENI_values_are_explicit_project_inputs_or_external_SR_EN_15193_1_results"
    ],
    extra: { weightedSum }
  });
}
