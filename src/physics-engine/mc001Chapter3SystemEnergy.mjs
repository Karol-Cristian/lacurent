export const STATUS_CALCULATED = "calculated";

export const AHU_LOCATION = Object.freeze({
  CONDITIONED: "conditioned",
  UNCONDITIONED: "unconditioned"
});

export const EXTRACT_FAN_POSITION = Object.freeze({
  UPSTREAM_OF_RECOVERY: "upstream_of_recovery",
  DOWNSTREAM_OF_RECOVERY: "downstream_of_recovery"
});

export const COOLING_HEAT_REJECTION_REFERENCE_BRANCH = Object.freeze({
  AIR_OUTDOOR: "air_outdoor",
  AIR_INDOOR: "air_indoor",
  WATER: "water"
});

export const COOLING_HEAT_REJECTION_TEMPERATURE_SOURCE = Object.freeze({
  OUTDOOR_AIR: "outdoor_air",
  INDOOR_AIR: "indoor_air"
});

export const COOLING_HEAT_REJECTION_WATER_CONTROL = Object.freeze({
  NO_CONTROL: "no_control",
  CONSTANT_TEMPERATURE: "constant_temperature",
  VARIABLE_TEMPERATURE: "variable_temperature"
});

const TABLE_3_18_PROCESS_DEFAULTS = Object.freeze({
  water_cooled_chiller: Object.freeze({
    condenserTemperatureDifferenceK: 4,
    evaporatorTemperatureDifferenceK: 6
  }),
  air_cooled_room_or_chiller_outdoor_air: Object.freeze({
    condenserTemperatureDifferenceK: 10,
    evaporatorTemperatureDifferenceK: 20
  }),
  air_cooled_chiller_indoor_air: Object.freeze({
    condenserTemperatureDifferenceK: 20,
    evaporatorTemperatureDifferenceK: 6
  })
});

const TABLE_3_19_REFERENCE_TEMPERATURES = Object.freeze({
  room_air_conditioner_or_chiller_no_control: Object.freeze({
    heatRejectionReferenceInletTemperatureC: 32,
    heatRejectionReferenceOutletTemperatureC: null
  }),
  air_cooled_control_piston_or_scroll: Object.freeze({
    heatRejectionReferenceInletTemperatureC: 32,
    heatRejectionReferenceOutletTemperatureC: null
  }),
  air_cooled_control_screw_or_centrifugal: Object.freeze({
    heatRejectionReferenceInletTemperatureC: 32,
    heatRejectionReferenceOutletTemperatureC: null
  }),
  water_cooled_wet_33_27: Object.freeze({
    heatRejectionReferenceInletTemperatureC: 33,
    heatRejectionReferenceOutletTemperatureC: 27
  }),
  water_cooled_dry_45_40_piston_or_centrifugal: Object.freeze({
    heatRejectionReferenceInletTemperatureC: 45,
    heatRejectionReferenceOutletTemperatureC: 40
  }),
  water_cooled_dry_45_40_screw: Object.freeze({
    heatRejectionReferenceInletTemperatureC: 45,
    heatRejectionReferenceOutletTemperatureC: 40
  })
});

const TABLE_3_20_HEAT_REJECTION_POLYNOMIALS = Object.freeze({
  air_cooled_no_temperature_control: Object.freeze({
    temperatureSource: null,
    a2: 0,
    a1: 0,
    a0: 1,
    validMinC: null,
    validMaxC: null
  }),
  air_cooled_control_piston_or_scroll: Object.freeze({
    temperatureSource: COOLING_HEAT_REJECTION_TEMPERATURE_SOURCE.OUTDOOR_AIR,
    a2: 0.00083,
    a1: -0.07753,
    a0: 2.64,
    validMinC: 12,
    validMaxC: 35
  }),
  air_cooled_control_screw_or_centrifugal: Object.freeze({
    temperatureSource: COOLING_HEAT_REJECTION_TEMPERATURE_SOURCE.OUTDOOR_AIR,
    a2: 0.00071,
    a1: -0.08224,
    a0: 2.91,
    validMinC: 12,
    validMaxC: 35
  }),
  water_cooled_wet_33_27: Object.freeze({
    temperatureSource: "cooling_water_inlet",
    a2: 0,
    a1: -0.0307,
    a0: 2.0164,
    validMinC: 12,
    validMaxC: 40
  }),
  water_cooled_dry_45_40_piston_or_centrifugal: Object.freeze({
    temperatureSource: "cooling_water_inlet",
    a2: 0,
    a1: -0.0249,
    a0: 2.1181,
    validMinC: 15,
    validMaxC: 50
  }),
  water_cooled_dry_45_40_screw: Object.freeze({
    temperatureSource: "cooling_water_inlet",
    a2: 0,
    a1: -0.0486,
    a0: 3.1851,
    validMinC: 15,
    validMaxC: 50
  })
});

const TABLE_3_22_HEAT_REJECTION_SPECIFIC_ELECTRIC_DEMAND = Object.freeze({
  wet_open_axial_no_extra_silencer: 0.033,
  wet_closed_axial_no_extra_silencer: 0.018,
  dry_axial_no_extra_silencer: 0.045,
  wet_open_radial_extra_silencer: 0.04,
  wet_closed_radial_extra_silencer: 0.021
});

const TABLE_3_23_HEAT_REJECTION_ELECTRIC_PART_LOAD_FACTOR = Object.freeze({
  no_control: Object.freeze({ dry_or_hybrid_dry: 1, wet_or_hybrid_wet: 1 }),
  constant_water_temperature: Object.freeze({ dry_or_hybrid_dry: 0.1, wet_or_hybrid_wet: 0.1 }),
  variable_water_temperature: Object.freeze({ dry_or_hybrid_dry: 0.45, wet_or_hybrid_wet: 0.8 })
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
  const executionTrace = {
    schema: "mc001_execution_trace_v1",
    chapter: "3",
    formulaId,
    branchId: "direct_normative_relation",
    inputs: Object.fromEntries(
      Object.entries(inputs ?? {}).map(([key, inputValue]) => [
        key,
        {
          value: typeof inputValue === "number" && Number.isFinite(inputValue) ? inputValue : inputValue,
          unit: null
        }
      ])
    ),
    formulaText,
    rawResult: value,
    finalResult: value,
    unit,
    clampApplied: false,
    status: "direct_result",
    provenance: {
      source: "MC001-2022 Chapter 3",
      assumptions,
      warnings
    }
  };
  return {
    status: STATUS_CALCULATED,
    value,
    [valueKey]: value,
    unit,
    formulaId,
    inputs,
    warnings,
    ...extra,
    executionTrace,
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

function assertObjectKey(map, key, name) {
  if (!Object.hasOwn(map, key)) {
    throw new Error(`${name} must be one of ${Object.keys(map).join(", ")}`);
  }
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

export function validateCoolingStorageInputEnergy(input) {
  const { storageInputKWh } = input ?? {};

  assertFiniteNumber(storageInputKWh, "storageInputKWh");

  return makeResult({
    value: storageInputKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_94_COOLING_STORAGE_INPUT_EXPLICIT_BOUNDARY",
    formulaText: "QC,sto,in is received from the cooling distribution module",
    inputs: { storageInputKWh },
    assumptions: ["relation_3_94_is_a_module_input_boundary_in_table_3_9"]
  });
}

export function calculateCoolingStorageSensibleLiquidEnergy(input) {
  const {
    liquidMassKg,
    liquidSpecificHeatKWhPerKgK,
    mediumDensityKgPerM3 = 0,
    mediumVolumeM3 = 0,
    mediumSpecificHeatKWhPerKgK = 0,
    generatorRequiredOutletTemperatureC,
    storageTemperatureC
  } = input ?? {};

  assertFiniteNonNegativeNumber(liquidMassKg, "liquidMassKg");
  assertFiniteNonNegativeNumber(liquidSpecificHeatKWhPerKgK, "liquidSpecificHeatKWhPerKgK");
  assertFiniteNonNegativeNumber(mediumDensityKgPerM3, "mediumDensityKgPerM3");
  assertFiniteNonNegativeNumber(mediumVolumeM3, "mediumVolumeM3");
  assertFiniteNonNegativeNumber(mediumSpecificHeatKWhPerKgK, "mediumSpecificHeatKWhPerKgK");
  assertFiniteNumber(generatorRequiredOutletTemperatureC, "generatorRequiredOutletTemperatureC");
  assertFiniteNumber(storageTemperatureC, "storageTemperatureC");

  const equivalentHeatCapacityKWhPerK =
    liquidMassKg * liquidSpecificHeatKWhPerKgK +
    mediumDensityKgPerM3 * mediumVolumeM3 * mediumSpecificHeatKWhPerKgK;
  const valueKWh = equivalentHeatCapacityKWhPerK *
    (generatorRequiredOutletTemperatureC - storageTemperatureC);

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_95_COOLING_STORAGE_SENSIBLE_LIQUID_ENERGY",
    formulaText:
      "QC,sto,sens,lqd = (mC,sto,lqd Cp,lqd + rhoSto,med Vsto,med Cp,sto,med) (thetaC,gen,out,req - thetaC,sto)",
    inputs: {
      liquidMassKg,
      liquidSpecificHeatKWhPerKgK,
      mediumDensityKgPerM3,
      mediumVolumeM3,
      mediumSpecificHeatKWhPerKgK,
      generatorRequiredOutletTemperatureC,
      storageTemperatureC
    },
    extra: { equivalentHeatCapacityKWhPerK }
  });
}

export function calculateCoolingStorageLatentEnergy(input) {
  const { latentHeatKWhPerKg, solidMassKg } = input ?? {};

  assertFiniteNonNegativeNumber(latentHeatKWhPerKg, "latentHeatKWhPerKg");
  assertFiniteNonNegativeNumber(solidMassKg, "solidMassKg");
  const valueKWh = latentHeatKWhPerKg * solidMassKg;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_96_COOLING_STORAGE_LATENT_ENERGY",
    formulaText: "QC,sto,lat = Cp,lat * mC,sto,sld",
    inputs: { latentHeatKWhPerKg, solidMassKg }
  });
}

export function calculateCoolingStorageSensibleSolidEnergy(input) {
  const {
    solidMassKg,
    solidSpecificHeatKWhPerKgK,
    transitionTemperatureC,
    generatorOutletFlowTemperatureC
  } = input ?? {};

  assertFiniteNonNegativeNumber(solidMassKg, "solidMassKg");
  assertFiniteNonNegativeNumber(solidSpecificHeatKWhPerKgK, "solidSpecificHeatKWhPerKgK");
  assertFiniteNumber(transitionTemperatureC, "transitionTemperatureC");
  assertFiniteNumber(generatorOutletFlowTemperatureC, "generatorOutletFlowTemperatureC");
  const valueKWh =
    solidMassKg * solidSpecificHeatKWhPerKgK *
    ((transitionTemperatureC - generatorOutletFlowTemperatureC) / 2);

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_97_COOLING_STORAGE_SENSIBLE_SOLID_ENERGY",
    formulaText:
      "QC,sto,sens,sld = mC,sto,sld Cp,sens,sld (thetaSto,tr - thetaC,sto,gen,out,flw) / 2",
    inputs: {
      solidMassKg,
      solidSpecificHeatKWhPerKgK,
      transitionTemperatureC,
      generatorOutletFlowTemperatureC
    }
  });
}

export function calculateCoolingStorageOutputEnergy(input) {
  const {
    sensibleLiquidEnergyKWh,
    latentEnergyKWh,
    sensibleSolidEnergyKWh,
    distributionInputRequiredKWh,
    storageGeneratorOutputKWh
  } = input ?? {};

  assertFiniteNumber(sensibleLiquidEnergyKWh, "sensibleLiquidEnergyKWh");
  assertFiniteNumber(latentEnergyKWh, "latentEnergyKWh");
  assertFiniteNumber(sensibleSolidEnergyKWh, "sensibleSolidEnergyKWh");
  assertFiniteNumber(distributionInputRequiredKWh, "distributionInputRequiredKWh");
  assertFiniteNumber(storageGeneratorOutputKWh, "storageGeneratorOutputKWh");
  const availableKWh = sensibleLiquidEnergyKWh + latentEnergyKWh + sensibleSolidEnergyKWh;
  const demandAfterGeneratorKWh = distributionInputRequiredKWh - storageGeneratorOutputKWh;
  const valueKWh = Math.min(availableKWh, demandAfterGeneratorKWh);

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_98_COOLING_STORAGE_OUTPUT_ENERGY",
    formulaText:
      "QC,sto,out = min(QC,sto,sens,lqd + QC,sto,lat + QC,sto,sens,sld; QC,dis,in,tot,req - QC,sto,gen,out)",
    inputs: {
      sensibleLiquidEnergyKWh,
      latentEnergyKWh,
      sensibleSolidEnergyKWh,
      distributionInputRequiredKWh,
      storageGeneratorOutputKWh
    },
    extra: { availableKWh, demandAfterGeneratorKWh }
  });
}

export function calculateCoolingStorageThermalLoss(input) {
  const {
    heatLossCoefficientKWPerK,
    ambientTemperatureC,
    storageTemperatureC,
    calculationHours,
    formulaId = "MC001_3_99_TO_3_101_COOLING_STORAGE_THERMAL_LOSS",
    branch = "storage"
  } = input ?? {};

  assertFiniteNonNegativeNumber(heatLossCoefficientKWPerK, "heatLossCoefficientKWPerK");
  assertFiniteNumber(ambientTemperatureC, "ambientTemperatureC");
  assertFiniteNumber(storageTemperatureC, "storageTemperatureC");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");
  const valueKWh = heatLossCoefficientKWPerK *
    (ambientTemperatureC - storageTemperatureC) *
    calculationHours;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId,
    formulaText: "QC,sto,ls = Hc,sto,ls (thetaSto,amb - thetaC,sto) tci",
    inputs: { heatLossCoefficientKWPerK, ambientTemperatureC, storageTemperatureC, calculationHours, branch }
  });
}

export function calculateCoolingStorageTransformableEnergyWater(input) {
  const {
    storageInputKWh,
    storageInputLossKWh,
    storageStandbyLossKWh,
    storageOutputSideLossKWh
  } = input ?? {};

  assertFiniteNumber(storageInputKWh, "storageInputKWh");
  assertFiniteNumber(storageInputLossKWh, "storageInputLossKWh");
  assertFiniteNumber(storageStandbyLossKWh, "storageStandbyLossKWh");
  assertFiniteNumber(storageOutputSideLossKWh, "storageOutputSideLossKWh");
  const valueKWh =
    storageInputKWh + storageInputLossKWh + storageStandbyLossKWh + storageOutputSideLossKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_102_COOLING_STORAGE_TRANSFORMABLE_ENERGY_WATER",
    formulaText: "DeltaQC,sto = QC,sto,in + QC,sto,in,ls + QC,sto,ls + QC,sto,out,ls",
    inputs: { storageInputKWh, storageInputLossKWh, storageStandbyLossKWh, storageOutputSideLossKWh }
  });
}

export function calculateCoolingStorageInitialIceThickness(input) {
  const { solidMassKg, solidDensityKgPerM3, storagePipeLengthM, storagePipeDiameterM } =
    input ?? {};

  assertFiniteNonNegativeNumber(solidMassKg, "solidMassKg");
  assertFinitePositiveNumber(solidDensityKgPerM3, "solidDensityKgPerM3");
  assertFinitePositiveNumber(storagePipeLengthM, "storagePipeLengthM");
  assertFinitePositiveNumber(storagePipeDiameterM, "storagePipeDiameterM");
  const innerRadiusM = storagePipeDiameterM / 2;
  const outerRadiusM = Math.sqrt(
    innerRadiusM ** 2 + solidMassKg / (solidDensityKgPerM3 * Math.PI * storagePipeLengthM)
  );
  const valueM = 2 * (outerRadiusM - innerRadiusM);

  return makeResult({
    value: valueM,
    valueKey: "valueM",
    unit: "m",
    formulaId: "MC001_3_103_COOLING_STORAGE_INITIAL_ICE_THICKNESS",
    formulaText:
      "dC,sto,0 = 2(sqrt(DC,sto^2/4 + mC,sto,sld,0/(rhoSld*pi*LC,sto)) - DC,sto/2)",
    inputs: { solidMassKg, solidDensityKgPerM3, storagePipeLengthM, storagePipeDiameterM },
    extra: { innerRadiusM, outerRadiusM }
  });
}

export function calculateCoolingStorageIceMassVariation(input) {
  const {
    transformableEnergyKWh,
    latentHeatKWhPerKg,
    solidSpecificHeatKWhPerKgK,
    transitionTemperatureC,
    generatorOutletFlowTemperatureC
  } = input ?? {};

  assertFiniteNumber(transformableEnergyKWh, "transformableEnergyKWh");
  assertFinitePositiveNumber(latentHeatKWhPerKg, "latentHeatKWhPerKg");
  assertFiniteNonNegativeNumber(solidSpecificHeatKWhPerKgK, "solidSpecificHeatKWhPerKgK");
  assertFiniteNumber(transitionTemperatureC, "transitionTemperatureC");
  assertFiniteNumber(generatorOutletFlowTemperatureC, "generatorOutletFlowTemperatureC");
  const denominator =
    latentHeatKWhPerKg +
    solidSpecificHeatKWhPerKgK * ((transitionTemperatureC - generatorOutletFlowTemperatureC) / 2);
  assertFinitePositiveNumber(denominator, "ice mass variation denominator");
  const valueKg = -transformableEnergyKWh / denominator;

  return makeResult({
    value: valueKg,
    valueKey: "valueKg",
    unit: "kg",
    formulaId: "MC001_3_104_COOLING_STORAGE_ICE_MASS_VARIATION",
    formulaText:
      "Delta mC,sto,sld = -DeltaQC,sto / (Cp,lat + Cp,sld (thetaSto,tr - thetaC,sto,gen,out,flw)/2)",
    inputs: {
      transformableEnergyKWh,
      latentHeatKWhPerKg,
      solidSpecificHeatKWhPerKgK,
      transitionTemperatureC,
      generatorOutletFlowTemperatureC
    },
    extra: { denominator }
  });
}

export function calculateCoolingStorageIceThickness(input) {
  const {
    maximumIceThicknessM,
    storagePipeDiameterM,
    solidMassKg,
    deltaSolidMassKg,
    solidDensityKgPerM3,
    storagePipeLengthM
  } = input ?? {};

  assertFiniteNonNegativeNumber(maximumIceThicknessM, "maximumIceThicknessM");
  assertFinitePositiveNumber(storagePipeDiameterM, "storagePipeDiameterM");
  assertFiniteNonNegativeNumber(solidMassKg, "solidMassKg");
  assertFiniteNumber(deltaSolidMassKg, "deltaSolidMassKg");
  assertFinitePositiveNumber(solidDensityKgPerM3, "solidDensityKgPerM3");
  assertFinitePositiveNumber(storagePipeLengthM, "storagePipeLengthM");
  const innerRadiusM = storagePipeDiameterM / 2;
  const candidateMassKg = Math.max(0, solidMassKg + deltaSolidMassKg);
  const candidateThicknessM = 2 * (
    Math.sqrt(
      innerRadiusM ** 2 +
      candidateMassKg / (solidDensityKgPerM3 * Math.PI * storagePipeLengthM)
    ) -
    innerRadiusM
  );
  const valueM = Math.min(maximumIceThicknessM, Math.max(0, candidateThicknessM));

  return makeResult({
    value: valueM,
    valueKey: "valueM",
    unit: "m",
    formulaId: "MC001_3_105_COOLING_STORAGE_ICE_THICKNESS",
    formulaText:
      "dC,sto = min(dC,sto,max; max(0; 2(sqrt(DC,sto^2/4 + (mC,sto,sld + Delta m)/(rhoSld*pi*LC,sto)) - DC,sto/2)))",
    inputs: {
      maximumIceThicknessM,
      storagePipeDiameterM,
      solidMassKg,
      deltaSolidMassKg,
      solidDensityKgPerM3,
      storagePipeLengthM
    },
    extra: { candidateThicknessM, candidateMassKg }
  });
}

export function calculateCoolingStorageSolidMassAfterUse(input) {
  const { initialSolidMassKg, deltaSolidMassKg } = input ?? {};

  assertFiniteNonNegativeNumber(initialSolidMassKg, "initialSolidMassKg");
  assertFiniteNumber(deltaSolidMassKg, "deltaSolidMassKg");
  const valueKg = Math.max(0, initialSolidMassKg + deltaSolidMassKg);

  return makeResult({
    value: valueKg,
    valueKey: "valueKg",
    unit: "kg",
    formulaId: "MC001_3_106_COOLING_STORAGE_SOLID_MASS_AFTER_USE",
    formulaText: "mC,sto,sld = max(0; mC,sto,sld,0 + Delta mC,sto,sld)",
    inputs: { initialSolidMassKg, deltaSolidMassKg }
  });
}

export function calculateCoolingStoragePcmSolidMassVariation(input) {
  const {
    transformableEnergyKWh,
    latentHeatKWhPerKg,
    liquidSpecificHeatKWhPerKgK,
    solidSpecificHeatKWhPerKgK,
    transitionTemperatureC
  } = input ?? {};

  assertFiniteNumber(transformableEnergyKWh, "transformableEnergyKWh");
  const effectiveLatentHeatKWhPerKg = latentHeatKWhPerKg ?? liquidSpecificHeatKWhPerKgK;
  assertFiniteNonNegativeNumber(effectiveLatentHeatKWhPerKg, "latentHeatKWhPerKg");
  assertFiniteNonNegativeNumber(solidSpecificHeatKWhPerKgK, "solidSpecificHeatKWhPerKgK");
  assertFiniteNumber(transitionTemperatureC, "transitionTemperatureC");
  const denominator =
    effectiveLatentHeatKWhPerKg +
    solidSpecificHeatKWhPerKgK * transitionTemperatureC;
  assertFinitePositiveNumber(denominator, "PCM solid mass variation denominator");
  const valueKg = transformableEnergyKWh / denominator;

  return makeResult({
    value: valueKg,
    valueKey: "valueKg",
    unit: "kg",
    formulaId: "MC001_3_107_COOLING_STORAGE_PCM_SOLID_MASS_VARIATION",
    formulaText: "Delta mC,sto,sld = DeltaQC,sto / (Cp,lat + Cp,sld * thetaSto,tr)",
    inputs: {
      transformableEnergyKWh,
      latentHeatKWhPerKg: effectiveLatentHeatKWhPerKg,
      solidSpecificHeatKWhPerKgK,
      transitionTemperatureC
    },
    extra: { denominator }
  });
}

export function limitCoolingStoragePcmSolidMassToLiquid(input) {
  const { deltaSolidMassKg, initialLiquidMassKg } = input ?? {};

  assertFiniteNumber(deltaSolidMassKg, "deltaSolidMassKg");
  assertFiniteNonNegativeNumber(initialLiquidMassKg, "initialLiquidMassKg");
  const valueKg = deltaSolidMassKg > initialLiquidMassKg ? initialLiquidMassKg : deltaSolidMassKg;

  return makeResult({
    value: valueKg,
    valueKey: "valueKg",
    unit: "kg",
    formulaId: "MC001_3_108_COOLING_STORAGE_PCM_SOLID_MASS_LIQUID_LIMIT",
    formulaText: "if Delta mC,sto,sld > mC,sto,lqd,0 then Delta mC,sto,sld = mC,sto,lqd,0",
    inputs: { deltaSolidMassKg, initialLiquidMassKg }
  });
}

export function limitCoolingStoragePcmSolidMassToExistingSolid(input) {
  const { deltaSolidMassKg, initialSolidMassKg } = input ?? {};

  assertFiniteNumber(deltaSolidMassKg, "deltaSolidMassKg");
  assertFiniteNonNegativeNumber(initialSolidMassKg, "initialSolidMassKg");
  const valueKg = deltaSolidMassKg > initialSolidMassKg ? initialSolidMassKg : deltaSolidMassKg;

  return makeResult({
    value: valueKg,
    valueKey: "valueKg",
    unit: "kg",
    formulaId: "MC001_3_109_COOLING_STORAGE_PCM_SOLID_MASS_SOLID_LIMIT",
    formulaText: "if Delta mC,sto,sld > mC,sto,sld,0 then Delta mC,sto,sld = mC,sto,sld,0",
    inputs: { deltaSolidMassKg, initialSolidMassKg }
  });
}

export function calculateCoolingStoragePcmSolidTemperature(input) {
  const {
    initialSolidTemperatureC,
    transformableEnergyKWh,
    solidSpecificHeatKWhPerKgK,
    deltaSolidMassKg,
    transitionTemperatureC,
    solidMassKg,
    generatorOutletFlowTemperatureC
  } = input ?? {};

  assertFiniteNumber(initialSolidTemperatureC, "initialSolidTemperatureC");
  assertFiniteNumber(transformableEnergyKWh, "transformableEnergyKWh");
  assertFinitePositiveNumber(solidSpecificHeatKWhPerKgK, "solidSpecificHeatKWhPerKgK");
  assertFiniteNumber(deltaSolidMassKg, "deltaSolidMassKg");
  assertFiniteNumber(transitionTemperatureC, "transitionTemperatureC");
  assertFiniteNonNegativeNumber(solidMassKg, "solidMassKg");
  assertFiniteNumber(generatorOutletFlowTemperatureC, "generatorOutletFlowTemperatureC");
  const denominator = solidSpecificHeatKWhPerKgK * (solidMassKg + deltaSolidMassKg);
  assertFinitePositiveNumber(denominator, "PCM solid temperature denominator");
  const candidateC = initialSolidTemperatureC +
    (
      transformableEnergyKWh -
      solidSpecificHeatKWhPerKgK * deltaSolidMassKg *
        (transitionTemperatureC - initialSolidTemperatureC)
    ) / denominator;
  const valueC = Math.max(candidateC, generatorOutletFlowTemperatureC);

  return makeResult({
    value: valueC,
    valueKey: "valueC",
    unit: "degC",
    formulaId: "MC001_3_110_COOLING_STORAGE_PCM_SOLID_TEMPERATURE",
    formulaText:
      "thetaC,sto,sld = max(thetaC,sto,sld,0 + adjusted DeltaQC/(Cp,sld (mC,sto,sld + Delta m)); thetaC,gen,out,flw)",
    inputs: {
      initialSolidTemperatureC,
      transformableEnergyKWh,
      solidSpecificHeatKWhPerKgK,
      deltaSolidMassKg,
      transitionTemperatureC,
      solidMassKg,
      generatorOutletFlowTemperatureC
    },
    extra: { candidateC }
  });
}

export function calculateCoolingStoragePcmSensibleSolidStorageEnergy(input) {
  const {
    transformableEnergyKWh,
    solidMassKg,
    solidSpecificHeatKWhPerKgK,
    generatorOutletFlowTemperatureC,
    transitionTemperatureC
  } = input ?? {};

  assertFiniteNumber(transformableEnergyKWh, "transformableEnergyKWh");
  assertFiniteNonNegativeNumber(solidMassKg, "solidMassKg");
  assertFiniteNonNegativeNumber(solidSpecificHeatKWhPerKgK, "solidSpecificHeatKWhPerKgK");
  assertFiniteNumber(generatorOutletFlowTemperatureC, "generatorOutletFlowTemperatureC");
  assertFiniteNumber(transitionTemperatureC, "transitionTemperatureC");

  const sensibleShareKWh =
    solidMassKg *
    solidSpecificHeatKWhPerKgK *
    (generatorOutletFlowTemperatureC - transitionTemperatureC);
  const valueKWh = transformableEnergyKWh - sensibleShareKWh;
  const warnings = valueKWh < 0 ? ["mc001_3_112_input_energy_limit_required"] : [];

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_111_COOLING_STORAGE_PCM_SENSIBLE_SOLID_STORAGE_ENERGY",
    formulaText:
      "DeltaQC,sto,senssld = DeltaQC,sto - mC,sto,sld * Cp,sens,sld * (thetaC,sto,gen,out,flw - thetaSto,tr)",
    inputs: {
      transformableEnergyKWh,
      solidMassKg,
      solidSpecificHeatKWhPerKgK,
      generatorOutletFlowTemperatureC,
      transitionTemperatureC
    },
    warnings,
    extra: { sensibleShareKWh }
  });
}

export function calculateCoolingStoragePcmInputEnergyLimitForSolidSensibleStorage(input) {
  const { solidMassKg, solidSpecificHeatKWhPerKgK, generatorOutletFlowDeltaK } = input ?? {};

  assertFiniteNonNegativeNumber(solidMassKg, "solidMassKg");
  assertFiniteNonNegativeNumber(solidSpecificHeatKWhPerKgK, "solidSpecificHeatKWhPerKgK");
  assertFiniteNonNegativeNumber(generatorOutletFlowDeltaK, "generatorOutletFlowDeltaK");

  const valueKWh = solidMassKg * solidSpecificHeatKWhPerKgK * generatorOutletFlowDeltaK;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_112_COOLING_STORAGE_PCM_INPUT_ENERGY_LIMIT",
    formulaText: "DeltaQC,sto = mC,sto,sld * Cp,sld,sens * Delta thetaC,sto,gen,out,flw",
    inputs: {
      solidMassKg,
      solidSpecificHeatKWhPerKgK,
      generatorOutletFlowDeltaK
    }
  });
}

export function calculateCoolingStoragePcmSolidMassDecreaseVariation(input) {
  const {
    transformableEnergyKWh,
    latentHeatKWhPerKg,
    solidSpecificHeatKWhPerKgK,
    transitionTemperatureC,
    initialSolidMassKg
  } = input ?? {};

  assertFiniteNumber(transformableEnergyKWh, "transformableEnergyKWh");
  if (transformableEnergyKWh > 0) {
    throw new Error("transformableEnergyKWh must be non-positive for MC001 3.113 solid-mass decrease branch");
  }
  assertFiniteNonNegativeNumber(latentHeatKWhPerKg, "latentHeatKWhPerKg");
  assertFiniteNonNegativeNumber(solidSpecificHeatKWhPerKgK, "solidSpecificHeatKWhPerKgK");
  assertFiniteNumber(transitionTemperatureC, "transitionTemperatureC");
  assertFiniteNonNegativeNumber(initialSolidMassKg, "initialSolidMassKg");

  const denominator =
    latentHeatKWhPerKg +
    solidSpecificHeatKWhPerKgK * transitionTemperatureC;
  assertFinitePositiveNumber(denominator, "PCM solid mass decrease denominator");
  const rawDeltaSolidMassKg = transformableEnergyKWh / denominator;
  const valueKg = Math.max(rawDeltaSolidMassKg, -initialSolidMassKg);
  const limitedByInitialSolidMass = rawDeltaSolidMassKg < -initialSolidMassKg;

  return makeResult({
    value: valueKg,
    valueKey: "valueKg",
    unit: "kg",
    formulaId: "MC001_3_113_COOLING_STORAGE_PCM_SOLID_MASS_DECREASE_VARIATION",
    formulaText: "Delta mC,sto,sld = DeltaQC,sto / (Cp,lat + Cp,sens,sld * thetaSto,tr)",
    inputs: {
      transformableEnergyKWh,
      latentHeatKWhPerKg,
      solidSpecificHeatKWhPerKgK,
      transitionTemperatureC,
      initialSolidMassKg
    },
    warnings: limitedByInitialSolidMass ? ["mc001_3_113_limited_to_initial_solid_mass"] : [],
    extra: { denominator, rawDeltaSolidMassKg, limitedByInitialSolidMass }
  });
}

export function calculateCoolingStoragePcmLiquidTemperature(input) {
  const {
    initialLiquidTemperatureC,
    transformableEnergyKWh,
    solidSpecificHeatKWhPerKgK,
    deltaSolidMassKg,
    transitionTemperatureC,
    liquidSpecificHeatKWhPerKgK,
    initialLiquidMassKg
  } = input ?? {};

  assertFiniteNumber(initialLiquidTemperatureC, "initialLiquidTemperatureC");
  assertFiniteNumber(transformableEnergyKWh, "transformableEnergyKWh");
  assertFiniteNonNegativeNumber(solidSpecificHeatKWhPerKgK, "solidSpecificHeatKWhPerKgK");
  assertFiniteNumber(deltaSolidMassKg, "deltaSolidMassKg");
  assertFiniteNumber(transitionTemperatureC, "transitionTemperatureC");
  assertFinitePositiveNumber(liquidSpecificHeatKWhPerKgK, "liquidSpecificHeatKWhPerKgK");
  assertFiniteNonNegativeNumber(initialLiquidMassKg, "initialLiquidMassKg");
  const denominator = liquidSpecificHeatKWhPerKgK * (initialLiquidMassKg + deltaSolidMassKg);
  assertFinitePositiveNumber(denominator, "PCM liquid temperature denominator");
  const valueC = initialLiquidTemperatureC +
    (
      transformableEnergyKWh -
      solidSpecificHeatKWhPerKgK * deltaSolidMassKg *
        (transitionTemperatureC - initialLiquidTemperatureC)
    ) / denominator;

  return makeResult({
    value: valueC,
    valueKey: "valueC",
    unit: "degC",
    formulaId: "MC001_3_114_COOLING_STORAGE_PCM_LIQUID_TEMPERATURE",
    formulaText:
      "thetaC,sto,lqd = thetaC,sto,lqd,0 + adjusted DeltaQC/(Cp,lqd (mC,sto,lqd,0 + Delta m))",
    inputs: {
      initialLiquidTemperatureC,
      transformableEnergyKWh,
      solidSpecificHeatKWhPerKgK,
      deltaSolidMassKg,
      transitionTemperatureC,
      liquidSpecificHeatKWhPerKgK,
      initialLiquidMassKg
    }
  });
}

export function calculateCoolingStoragePumpOperationTime(input) {
  const {
    storageEnergyKWh,
    mediumSpecificHeatKWhPerKgK,
    mediumDensityKgPerM3,
    pumpVolumeFlowM3PerH,
    supplyTemperatureC,
    returnTemperatureC,
    formulaId = "MC001_3_115_3_117_COOLING_STORAGE_PUMP_OPERATION_TIME"
  } = input ?? {};

  assertFiniteNonNegativeNumber(storageEnergyKWh, "storageEnergyKWh");
  assertFinitePositiveNumber(mediumSpecificHeatKWhPerKgK, "mediumSpecificHeatKWhPerKgK");
  assertFinitePositiveNumber(mediumDensityKgPerM3, "mediumDensityKgPerM3");
  assertFinitePositiveNumber(pumpVolumeFlowM3PerH, "pumpVolumeFlowM3PerH");
  assertFiniteNumber(supplyTemperatureC, "supplyTemperatureC");
  assertFiniteNumber(returnTemperatureC, "returnTemperatureC");
  const deltaK = Math.abs(supplyTemperatureC - returnTemperatureC);
  assertFinitePositiveNumber(deltaK, "storage pump temperature difference");
  const valueH = storageEnergyKWh /
    (mediumSpecificHeatKWhPerKgK * mediumDensityKgPerM3 * pumpVolumeFlowM3PerH * deltaK);

  return makeResult({
    value: valueH,
    valueKey: "valueH",
    unit: "h",
    formulaId,
    formulaText:
      "tC,sto,aux = QC,sto / (Cp,sto,sens,med rhoSto,med qC,sto,v,pmp Delta theta)",
    inputs: {
      storageEnergyKWh,
      mediumSpecificHeatKWhPerKgK,
      mediumDensityKgPerM3,
      pumpVolumeFlowM3PerH,
      supplyTemperatureC,
      returnTemperatureC
    },
    extra: { deltaK }
  });
}

export function calculateCoolingStorageAuxiliaryEnergy(input) {
  const {
    pumpOperationHours,
    pumpElectricPowerKW,
    formulaId = "MC001_3_116_3_118_COOLING_STORAGE_AUXILIARY_ENERGY"
  } = input ?? {};

  assertFiniteNonNegativeNumber(pumpOperationHours, "pumpOperationHours");
  assertFiniteNonNegativeNumber(pumpElectricPowerKW, "pumpElectricPowerKW");
  const valueKWh = pumpOperationHours * pumpElectricPowerKW;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId,
    formulaText: "WC,sto,aux = tC,sto,aux * PC,sto,pmp",
    inputs: { pumpOperationHours, pumpElectricPowerKW }
  });
}

export function calculateCoolingStorageAuxiliaryTotal(input) {
  const { outputSideAuxiliaryKWh, inputSideAuxiliaryKWh } = input ?? {};

  assertFiniteNonNegativeNumber(outputSideAuxiliaryKWh, "outputSideAuxiliaryKWh");
  assertFiniteNonNegativeNumber(inputSideAuxiliaryKWh, "inputSideAuxiliaryKWh");
  const valueKWh = outputSideAuxiliaryKWh + inputSideAuxiliaryKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_119_COOLING_STORAGE_AUXILIARY_TOTAL",
    formulaText: "WC,sto,aux = WC,sto,gen,aux,out + WC,sto,aux,in",
    inputs: { outputSideAuxiliaryKWh, inputSideAuxiliaryKWh }
  });
}

export function calculateCoolingStorageRecoverableAuxiliaryLoss(input) {
  const { auxiliaryEnergyKWh, recoverableAuxiliaryFraction } = input ?? {};

  assertFiniteNonNegativeNumber(auxiliaryEnergyKWh, "auxiliaryEnergyKWh");
  assertFraction(recoverableAuxiliaryFraction, "recoverableAuxiliaryFraction");
  const valueKWh = -auxiliaryEnergyKWh * recoverableAuxiliaryFraction;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_120_COOLING_STORAGE_RECOVERABLE_AUXILIARY_LOSS",
    formulaText: "QC,sto,aux,ls,rbl = -WC,sto,aux * faux,rbl",
    inputs: { auxiliaryEnergyKWh, recoverableAuxiliaryFraction }
  });
}

export function calculateCoolingStorageRecoverableThermalLoss(input) {
  const {
    outputSideLossKWh,
    standbyLossKWh,
    inputSideLossKWh,
    recoverableStorageFraction
  } = input ?? {};

  assertFiniteNumber(outputSideLossKWh, "outputSideLossKWh");
  assertFiniteNumber(standbyLossKWh, "standbyLossKWh");
  assertFiniteNumber(inputSideLossKWh, "inputSideLossKWh");
  assertFraction(recoverableStorageFraction, "recoverableStorageFraction");
  const valueKWh =
    -(outputSideLossKWh + standbyLossKWh + inputSideLossKWh) *
    recoverableStorageFraction;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_121_COOLING_STORAGE_RECOVERABLE_THERMAL_LOSS",
    formulaText:
      "QC,sto,ls,rbl = -(QC,sto,out,ls + QC,sto,ls + QC,sto,in,ls) * fC,sto,rbl",
    inputs: { outputSideLossKWh, standbyLossKWh, inputSideLossKWh, recoverableStorageFraction }
  });
}

export function calculateCoolingStorageRecoverableLossTotal(input) {
  const { auxiliaryRecoverableLossKWh, thermalRecoverableLossKWh } = input ?? {};

  assertFiniteNumber(auxiliaryRecoverableLossKWh, "auxiliaryRecoverableLossKWh");
  assertFiniteNumber(thermalRecoverableLossKWh, "thermalRecoverableLossKWh");
  const valueKWh = auxiliaryRecoverableLossKWh + thermalRecoverableLossKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_122_COOLING_STORAGE_RECOVERABLE_LOSS_TOTAL",
    formulaText: "QC,sto,ls,tot,rbl = QC,sto,aux,ls,rbl + QC,sto,ls,rbl",
    inputs: { auxiliaryRecoverableLossKWh, thermalRecoverableLossKWh }
  });
}

export function calculateCoolingStorageGeneratorDeltaEnergy(input) {
  const {
    storageGeneratorEnergyKWh,
    storageOutputKWh,
    inputSideLossKWh,
    standbyLossKWh,
    outputSideLossKWh
  } = input ?? {};

  assertFiniteNumber(storageGeneratorEnergyKWh, "storageGeneratorEnergyKWh");
  assertFiniteNumber(storageOutputKWh, "storageOutputKWh");
  assertFiniteNumber(inputSideLossKWh, "inputSideLossKWh");
  assertFiniteNumber(standbyLossKWh, "standbyLossKWh");
  assertFiniteNumber(outputSideLossKWh, "outputSideLossKWh");
  const valueKWh =
    storageGeneratorEnergyKWh -
    storageOutputKWh -
    inputSideLossKWh -
    standbyLossKWh -
    outputSideLossKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_123_COOLING_STORAGE_GENERATOR_DELTA_ENERGY",
    formulaText:
      "DeltaQC,sto = QC,sto,gen - QC,sto,out - QC,sto,in,ls - QC,sto,ls - QC,sto,out,ls",
    inputs: {
      storageGeneratorEnergyKWh,
      storageOutputKWh,
      inputSideLossKWh,
      standbyLossKWh,
      outputSideLossKWh
    }
  });
}

export function selectCoolingHeatRejectionReferenceTemperatures(input) {
  const {
    branch,
    outdoorReferenceTemperatureC,
    outdoorNominalTemperatureC,
    indoorReferenceTemperatureC,
    indoorNominalTemperatureC,
    waterReferenceInletTemperatureC,
    waterNominalInletTemperatureC
  } = input ?? {};

  assertEnum(branch, COOLING_HEAT_REJECTION_REFERENCE_BRANCH, "branch");
  const refs = {
    [COOLING_HEAT_REJECTION_REFERENCE_BRANCH.AIR_OUTDOOR]: {
      referenceC: outdoorReferenceTemperatureC,
      nominalC: outdoorNominalTemperatureC,
      formulaId: "MC001_3_156_COOLING_HEAT_REJECTION_AIR_OUTDOOR_REFERENCE"
    },
    [COOLING_HEAT_REJECTION_REFERENCE_BRANCH.AIR_INDOOR]: {
      referenceC: indoorReferenceTemperatureC ?? outdoorReferenceTemperatureC,
      nominalC: indoorNominalTemperatureC,
      formulaId: "MC001_3_157_COOLING_HEAT_REJECTION_AIR_INDOOR_REFERENCE"
    },
    [COOLING_HEAT_REJECTION_REFERENCE_BRANCH.WATER]: {
      referenceC: waterReferenceInletTemperatureC,
      nominalC: waterNominalInletTemperatureC,
      formulaId: "MC001_3_158_COOLING_HEAT_REJECTION_WATER_REFERENCE"
    }
  };
  const selected = refs[branch];
  assertFiniteNumber(selected.referenceC, "selected.referenceC");
  assertFiniteNumber(selected.nominalC, "selected.nominalC");

  return makeResult({
    value: selected.referenceC,
    valueKey: "referenceC",
    unit: "degC",
    formulaId: selected.formulaId,
    formulaText: "thetaC,gen,hr,req,in selected by MC001 heat-rejection branch",
    inputs: {
      branch,
      outdoorReferenceTemperatureC,
      outdoorNominalTemperatureC,
      indoorReferenceTemperatureC,
      indoorNominalTemperatureC,
      waterReferenceInletTemperatureC,
      waterNominalInletTemperatureC
    },
    extra: { nominalC: selected.nominalC }
  });
}

export function lookupCoolingHeatRejectionProcessDefaultsTable318(input) {
  const { processKey } = input ?? {};

  assertObjectKey(TABLE_3_18_PROCESS_DEFAULTS, processKey, "processKey");
  const row = TABLE_3_18_PROCESS_DEFAULTS[processKey];

  return makeResult({
    value: row.condenserTemperatureDifferenceK,
    valueKey: "condenserTemperatureDifferenceK",
    unit: "K",
    formulaId: "MC001_TABLE_3_18_COOLING_PROCESS_DEFAULTS",
    formulaText: "Table 3.18 default Delta theta_cond and Delta theta_evap",
    inputs: { processKey },
    extra: { ...row, table: "Tabel 3.18" }
  });
}

export function lookupCoolingHeatRejectionReferenceTemperaturesTable319(input) {
  const { systemKey } = input ?? {};

  assertObjectKey(TABLE_3_19_REFERENCE_TEMPERATURES, systemKey, "systemKey");
  const row = TABLE_3_19_REFERENCE_TEMPERATURES[systemKey];

  return makeResult({
    value: row.heatRejectionReferenceInletTemperatureC,
    valueKey: "heatRejectionReferenceInletTemperatureC",
    unit: "degC",
    formulaId: "MC001_TABLE_3_19_HEAT_REJECTION_REFERENCE_TEMPERATURES",
    formulaText: "Table 3.19 heat-rejection reference inlet/outlet temperatures",
    inputs: { systemKey },
    extra: { ...row, table: "Tabel 3.19" }
  });
}

export function lookupCoolingHeatRejectionPolynomialCoefficientsTable320(input) {
  const { systemKey } = input ?? {};

  assertObjectKey(TABLE_3_20_HEAT_REJECTION_POLYNOMIALS, systemKey, "systemKey");
  const row = TABLE_3_20_HEAT_REJECTION_POLYNOMIALS[systemKey];

  return makeResult({
    value: row.a0,
    valueKey: "a0",
    unit: "-",
    formulaId: "MC001_TABLE_3_20_HEAT_REJECTION_PART_LOAD_COEFFICIENTS",
    formulaText: "Table 3.20 coefficients a2, a1, a0 for fhr,PL",
    inputs: { systemKey },
    extra: { ...row, table: "Tabel 3.20" }
  });
}

export function calculateCoolingHeatRejectionPartLoadFactor(input) {
  const { temperatureC, a2, a1, a0 } = input ?? {};

  assertFiniteNumber(temperatureC, "temperatureC");
  assertFiniteNumber(a2, "a2");
  assertFiniteNumber(a1, "a1");
  assertFiniteNumber(a0, "a0");
  const value = a2 * temperatureC ** 2 + a1 * temperatureC + a0;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_159_HEAT_REJECTION_PART_LOAD_FACTOR",
    formulaText: "fhr,PL = a2 * theta^2 + a1 * theta + a0",
    inputs: { temperatureC, a2, a1, a0 }
  });
}

export function selectCoolingHeatRejectionTemperature(input) {
  const { source, outdoorTemperatureC, indoorTemperatureC } = input ?? {};

  assertEnum(source, COOLING_HEAT_REJECTION_TEMPERATURE_SOURCE, "source");
  const valueC =
    source === COOLING_HEAT_REJECTION_TEMPERATURE_SOURCE.OUTDOOR_AIR
      ? outdoorTemperatureC
      : indoorTemperatureC;
  assertFiniteNumber(valueC, "selected heat-rejection temperature");

  return makeResult({
    value: valueC,
    valueKey: "valueC",
    unit: "degC",
    formulaId:
      source === COOLING_HEAT_REJECTION_TEMPERATURE_SOURCE.OUTDOOR_AIR
        ? "MC001_3_160_HEAT_REJECTION_OUTDOOR_AIR_TEMPERATURE"
        : "MC001_3_161_HEAT_REJECTION_INDOOR_AIR_TEMPERATURE",
    formulaText: "theta = thetae or thetai according to heat-rejection air branch",
    inputs: { source, outdoorTemperatureC, indoorTemperatureC }
  });
}

export function calculateCoolingRecoverableHeatZero() {
  return makeResult({
    value: 0,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_162_COOLING_RECOVERABLE_HEAT_ZERO_AIR_OR_WATER_CHILLER",
    formulaText: "QC,gen,out,rbl = 0",
    inputs: {}
  });
}

export function calculateCoolingRecoverableHeatTemperatureUndefined() {
  return makeResult({
    value: null,
    valueKey: "valueC",
    unit: "degC",
    formulaId: "MC001_3_163_COOLING_RECOVERABLE_HEAT_TEMPERATURE_UNDEFINED",
    formulaText: "thetaC,gen,out,max = undefined",
    inputs: {}
  });
}

export function calculateCoolingHeatRejectedByCompression(input) {
  const {
    generatorCoolingInputKWh,
    nominalEer,
    partLoadFactor,
    eerCorrectionFactor = 1
  } = input ?? {};

  assertFiniteNonNegativeNumber(generatorCoolingInputKWh, "generatorCoolingInputKWh");
  assertFinitePositiveNumber(nominalEer, "nominalEer");
  assertFinitePositiveNumber(partLoadFactor, "partLoadFactor");
  assertFinitePositiveNumber(eerCorrectionFactor, "eerCorrectionFactor");
  const valueKWh =
    generatorCoolingInputKWh *
    (1 + 1 / (nominalEer * partLoadFactor * eerCorrectionFactor));

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_164_HEAT_REJECTED_COMPRESSION_GENERATOR",
    formulaText: "Qhr,out = QC,gen,in * (1 + 1/(EERn fC,PL,k fEER,corr))",
    inputs: { generatorCoolingInputKWh, nominalEer, partLoadFactor, eerCorrectionFactor }
  });
}

export function calculateCoolingHeatRejectedByAbsorption(input) {
  const { generatorCoolingInputKWh, nominalHeatRatio, partLoadFactor } = input ?? {};

  assertFiniteNonNegativeNumber(generatorCoolingInputKWh, "generatorCoolingInputKWh");
  assertFinitePositiveNumber(nominalHeatRatio, "nominalHeatRatio");
  assertFinitePositiveNumber(partLoadFactor, "partLoadFactor");
  const valueKWh = generatorCoolingInputKWh * (1 + 1 / (nominalHeatRatio * partLoadFactor));

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_165_HEAT_REJECTED_ABSORPTION_GENERATOR",
    formulaText: "Qhr,out = QC,gen,in * (1 + 1/(Bn fC,PL,k))",
    inputs: { generatorCoolingInputKWh, nominalHeatRatio, partLoadFactor }
  });
}

export function calculateCoolingWaterHeatRejectionInletTemperature(input) {
  const {
    controlMode,
    heatRejectionOutletTemperatureC,
    heatRejectedKWh,
    operationHours,
    nominalHeatRejectionPowerKW,
    referenceInletTemperatureC,
    referenceOutletTemperatureC,
    inletTemperatureLowerLimitC
  } = input ?? {};

  assertEnum(controlMode, COOLING_HEAT_REJECTION_WATER_CONTROL, "controlMode");
  assertFiniteNumber(heatRejectionOutletTemperatureC, "heatRejectionOutletTemperatureC");
  assertFiniteNonNegativeNumber(heatRejectedKWh, "heatRejectedKWh");
  assertFinitePositiveNumber(operationHours, "operationHours");
  assertFinitePositiveNumber(nominalHeatRejectionPowerKW, "nominalHeatRejectionPowerKW");
  assertFiniteNumber(referenceInletTemperatureC, "referenceInletTemperatureC");
  assertFiniteNumber(referenceOutletTemperatureC, "referenceOutletTemperatureC");
  const loadRatio = heatRejectedKWh / (operationHours * nominalHeatRejectionPowerKW);
  const referenceDeltaK = referenceInletTemperatureC - referenceOutletTemperatureC;
  let valueC;
  if (controlMode === COOLING_HEAT_REJECTION_WATER_CONTROL.NO_CONTROL) {
    valueC = heatRejectionOutletTemperatureC + loadRatio * referenceDeltaK;
  } else if (controlMode === COOLING_HEAT_REJECTION_WATER_CONTROL.CONSTANT_TEMPERATURE) {
    valueC = referenceInletTemperatureC;
  } else {
    assertFiniteNumber(inletTemperatureLowerLimitC, "inletTemperatureLowerLimitC");
    valueC = Math.max(
      inletTemperatureLowerLimitC,
      heatRejectionOutletTemperatureC + loadRatio * referenceDeltaK
    );
  }

  return makeResult({
    value: valueC,
    valueKey: "valueC",
    unit: "degC",
    formulaId: "MC001_3_166_WATER_HEAT_REJECTION_INLET_TEMPERATURE",
    formulaText:
      "thetaC,wat,hr,in selected by NO_CTRL, CNST_TEMP or VAR_TEMP branch",
    inputs: {
      controlMode,
      heatRejectionOutletTemperatureC,
      heatRejectedKWh,
      operationHours,
      nominalHeatRejectionPowerKW,
      referenceInletTemperatureC,
      referenceOutletTemperatureC,
      inletTemperatureLowerLimitC
    },
    extra: { loadRatio, referenceDeltaK }
  });
}

export function calculateCoolingWetHeatRejectionWaterTemperature(input) {
  const {
    heatRejectionOutletTemperatureC,
    heatRejectionInletTemperatureC,
    outdoorWetBulbTemperatureC,
    evaporationTemperatureRatio
  } = input ?? {};

  assertFiniteNumber(heatRejectionOutletTemperatureC, "heatRejectionOutletTemperatureC");
  assertFiniteNumber(heatRejectionInletTemperatureC, "heatRejectionInletTemperatureC");
  assertFiniteNumber(outdoorWetBulbTemperatureC, "outdoorWetBulbTemperatureC");
  assertFiniteNumber(evaporationTemperatureRatio, "evaporationTemperatureRatio");
  const valueC = heatRejectionOutletTemperatureC -
    evaporationTemperatureRatio *
      (heatRejectionInletTemperatureC - outdoorWetBulbTemperatureC);

  return makeResult({
    value: valueC,
    valueKey: "valueC",
    unit: "degC",
    formulaId: "MC001_3_167_WET_HEAT_REJECTION_WATER_TEMPERATURE",
    formulaText:
      "thetaC,wat,hr = thetaC,wat,hr,out - etae(thetaC,wat,hr,in - thetae,wb)",
    inputs: {
      heatRejectionOutletTemperatureC,
      heatRejectionInletTemperatureC,
      outdoorWetBulbTemperatureC,
      evaporationTemperatureRatio
    }
  });
}

export function calculateCoolingDryHeatRejectionWaterTemperature(input) {
  const {
    heatRejectionOutletTemperatureC,
    heatRejectionInletTemperatureC,
    outdoorAirTemperatureC,
    evaporationTemperatureRatio
  } = input ?? {};

  assertFiniteNumber(heatRejectionOutletTemperatureC, "heatRejectionOutletTemperatureC");
  assertFiniteNumber(heatRejectionInletTemperatureC, "heatRejectionInletTemperatureC");
  assertFiniteNumber(outdoorAirTemperatureC, "outdoorAirTemperatureC");
  assertFiniteNumber(evaporationTemperatureRatio, "evaporationTemperatureRatio");
  const valueC = heatRejectionOutletTemperatureC -
    evaporationTemperatureRatio *
      (heatRejectionInletTemperatureC - outdoorAirTemperatureC);

  return makeResult({
    value: valueC,
    valueKey: "valueC",
    unit: "degC",
    formulaId: "MC001_3_168_DRY_HEAT_REJECTION_WATER_TEMPERATURE",
    formulaText:
      "thetaC,wat,hr = thetaC,wat,hr,out - etae(thetaC,wat,hr,in - thetae)",
    inputs: {
      heatRejectionOutletTemperatureC,
      heatRejectionInletTemperatureC,
      outdoorAirTemperatureC,
      evaporationTemperatureRatio
    }
  });
}

export function calculateCoolingRecoverableHeatByCompression(input) {
  const result = calculateCoolingHeatRejectedByCompression(input);
  return {
    ...result,
    formulaId: "MC001_3_169_RECOVERABLE_HEAT_COMPRESSION_GENERATOR",
    trace: {
      ...result.trace,
      formulaId: "MC001_3_169_RECOVERABLE_HEAT_COMPRESSION_GENERATOR"
    }
  };
}

export function calculateCoolingRecoverableHeatByAbsorption(input) {
  const result = calculateCoolingHeatRejectedByAbsorption(input);
  return {
    ...result,
    formulaId: "MC001_3_170_RECOVERABLE_HEAT_ABSORPTION_GENERATOR",
    trace: {
      ...result.trace,
      formulaId: "MC001_3_170_RECOVERABLE_HEAT_ABSORPTION_GENERATOR"
    }
  };
}

export function calculateCoolingRecoverableHeatMaximumTemperature(input) {
  const { waterHeatRejectionInletTemperatureC } = input ?? {};

  assertFiniteNumber(waterHeatRejectionInletTemperatureC, "waterHeatRejectionInletTemperatureC");

  return makeResult({
    value: waterHeatRejectionInletTemperatureC,
    valueKey: "valueC",
    unit: "degC",
    formulaId: "MC001_3_171_RECOVERABLE_HEAT_MAXIMUM_TEMPERATURE",
    formulaText: "thetaC,gen,out,max = thetaC,wat,hr,in",
    inputs: { waterHeatRejectionInletTemperatureC }
  });
}

export function calculateCoolingHeatRejectedAfterRecovery(input) {
  const { recoverableHeatKWh, requiredRecoveredHeatKWh } = input ?? {};

  assertFiniteNonNegativeNumber(recoverableHeatKWh, "recoverableHeatKWh");
  assertFiniteNonNegativeNumber(requiredRecoveredHeatKWh, "requiredRecoveredHeatKWh");
  const valueKWh = Math.max(recoverableHeatKWh - requiredRecoveredHeatKWh, 0);

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_172_HEAT_REJECTED_AFTER_RECOVERY",
    formulaText: "Qhr,out = max(QC,gen,out,rbl - QC,gen,out,req; 0)",
    inputs: { recoverableHeatKWh, requiredRecoveredHeatKWh }
  });
}

export function calculateCoolingCompressionElectricInput(input) {
  const {
    generatorCoolingInputKWh,
    partLoadValue,
    nominalEer,
    eerCorrectionFactor = 1
  } = input ?? {};

  assertFiniteNonNegativeNumber(generatorCoolingInputKWh, "generatorCoolingInputKWh");
  assertFinitePositiveNumber(partLoadValue, "partLoadValue");
  assertFinitePositiveNumber(nominalEer, "nominalEer");
  assertFinitePositiveNumber(eerCorrectionFactor, "eerCorrectionFactor");
  const valueKWh = generatorCoolingInputKWh / (partLoadValue * nominalEer * eerCorrectionFactor);

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_173_COOLING_COMPRESSION_ELECTRIC_INPUT",
    formulaText: "EC,gen,el,in = QC,gen,in / (PLV * EERn * fEER,corr)",
    inputs: { generatorCoolingInputKWh, partLoadValue, nominalEer, eerCorrectionFactor }
  });
}

export function calculateCoolingAbsorptionHeatInput(input) {
  const { generatorCoolingInputKWh, partLoadValue, nominalHeatRatio } = input ?? {};

  assertFiniteNonNegativeNumber(generatorCoolingInputKWh, "generatorCoolingInputKWh");
  assertFinitePositiveNumber(partLoadValue, "partLoadValue");
  assertFinitePositiveNumber(nominalHeatRatio, "nominalHeatRatio");
  const valueKWh = generatorCoolingInputKWh / (partLoadValue * nominalHeatRatio);

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_174_COOLING_ABSORPTION_HEAT_INPUT",
    formulaText: "QH,C,gen,abs,in = QC,gen,in / (PLV * Bn)",
    inputs: { generatorCoolingInputKWh, partLoadValue, nominalHeatRatio }
  });
}

export function calculateCoolingHeatRejectionAuxiliaryAirCooledZero() {
  return makeResult({
    value: 0,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_175_HEAT_REJECTION_AUXILIARY_AIR_COOLED_ZERO",
    formulaText: "Whr,el,in = 0 for air-cooled chiller branch",
    inputs: {}
  });
}

export function lookupCoolingHeatRejectionSpecificElectricDemandTable322(input) {
  const { systemKey } = input ?? {};

  assertObjectKey(TABLE_3_22_HEAT_REJECTION_SPECIFIC_ELECTRIC_DEMAND, systemKey, "systemKey");
  const valueKWPerKW = TABLE_3_22_HEAT_REJECTION_SPECIFIC_ELECTRIC_DEMAND[systemKey];

  return makeResult({
    value: valueKWPerKW,
    valueKey: "valueKWPerKW",
    unit: "kW/kW",
    formulaId: "MC001_TABLE_3_22_HEAT_REJECTION_SPECIFIC_ELECTRIC_DEMAND",
    formulaText: "Table 3.22 phr,el specific electric demand",
    inputs: { systemKey },
    extra: { table: "Tabel 3.22" }
  });
}

export function lookupCoolingHeatRejectionElectricPartLoadFactorTable323(input) {
  const { controlKey, rejectionTypeKey } = input ?? {};

  assertObjectKey(TABLE_3_23_HEAT_REJECTION_ELECTRIC_PART_LOAD_FACTOR, controlKey, "controlKey");
  const row = TABLE_3_23_HEAT_REJECTION_ELECTRIC_PART_LOAD_FACTOR[controlKey];
  assertObjectKey(row, rejectionTypeKey, "rejectionTypeKey");
  const value = row[rejectionTypeKey];

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_TABLE_3_23_HEAT_REJECTION_ELECTRIC_PART_LOAD_FACTOR",
    formulaText: "Table 3.23 fhr,PL,el",
    inputs: { controlKey, rejectionTypeKey },
    extra: { table: "Tabel 3.23" }
  });
}

export function calculateCoolingHeatRejectionAuxiliaryEnergy(input) {
  const {
    heatRejectedKWh,
    specificElectricDemandKWPerKW,
    electricPartLoadFactor,
    freeCoolingElectricFactor = 1
  } = input ?? {};

  assertFiniteNonNegativeNumber(heatRejectedKWh, "heatRejectedKWh");
  assertFiniteNonNegativeNumber(specificElectricDemandKWPerKW, "specificElectricDemandKWPerKW");
  assertFinitePositiveNumber(electricPartLoadFactor, "electricPartLoadFactor");
  assertFinitePositiveNumber(freeCoolingElectricFactor, "freeCoolingElectricFactor");
  const valueKWh =
    heatRejectedKWh *
    specificElectricDemandKWPerKW *
    electricPartLoadFactor *
    freeCoolingElectricFactor;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_176_HEAT_REJECTION_AUXILIARY_ENERGY",
    formulaText: "Whr,el,in = Qhr,out * phr,el * fhr,PL,el * fhr,fc,el",
    inputs: {
      heatRejectedKWh,
      specificElectricDemandKWPerKW,
      electricPartLoadFactor,
      freeCoolingElectricFactor
    }
  });
}

export function calculateCoolingControlAuxiliaryEnergy(input) {
  const { operationHours, controlPowersKW = [] } = input ?? {};

  assertFiniteNonNegativeNumber(operationHours, "operationHours");
  if (!Array.isArray(controlPowersKW)) {
    throw new Error("controlPowersKW must be an array");
  }
  const powerTotalKW = controlPowersKW.reduce((sum, value, index) => {
    assertFiniteNonNegativeNumber(value, `controlPowersKW[${index}]`);
    return sum + value;
  }, 0);
  const valueKWh = operationHours * powerTotalKW;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_177_CONTROL_AUXILIARY_ENERGY",
    formulaText: "Wctrl,el,in = tC,gen,op * sum_j Pctrl,el,j",
    inputs: { operationHours, controlPowersKW },
    extra: { powerTotalKW }
  });
}

export function calculateCoolingHeatRejectionDistributionAuxiliaryAirCooledZero() {
  return makeResult({
    value: 0,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_178_HEAT_REJECTION_DISTRIBUTION_AIR_COOLED_ZERO",
    formulaText: "Wdis,hr,el,in = 0 for air-cooled chiller branch",
    inputs: {}
  });
}

export function calculateCoolingHeatRejectionDistributionAuxiliaryEnergy(input) {
  const { heatRejectedKWh, distributionSpecificElectricDemandKWPerKW } = input ?? {};

  assertFiniteNonNegativeNumber(heatRejectedKWh, "heatRejectedKWh");
  assertFiniteNonNegativeNumber(
    distributionSpecificElectricDemandKWPerKW,
    "distributionSpecificElectricDemandKWPerKW"
  );
  const valueKWh = heatRejectedKWh * distributionSpecificElectricDemandKWPerKW;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_179_HEAT_REJECTION_DISTRIBUTION_AUXILIARY_ENERGY",
    formulaText: "Wdis,hr,el,in = Qhr,out * pdis,el",
    inputs: { heatRejectedKWh, distributionSpecificElectricDemandKWPerKW }
  });
}

export function calculateCoolingGeneratorAuxiliaryTotal(input) {
  const {
    heatRejectionAuxiliaryKWh,
    heatRejectionDistributionAuxiliaryKWh,
    controlAuxiliaryKWh
  } = input ?? {};

  assertFiniteNonNegativeNumber(heatRejectionAuxiliaryKWh, "heatRejectionAuxiliaryKWh");
  assertFiniteNonNegativeNumber(
    heatRejectionDistributionAuxiliaryKWh,
    "heatRejectionDistributionAuxiliaryKWh"
  );
  assertFiniteNonNegativeNumber(controlAuxiliaryKWh, "controlAuxiliaryKWh");
  const valueKWh =
    heatRejectionAuxiliaryKWh +
    heatRejectionDistributionAuxiliaryKWh +
    controlAuxiliaryKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_180_COOLING_GENERATOR_AUXILIARY_TOTAL",
    formulaText: "Waux,el,in = Whr,el,in + Wdist,hr,el,in + Wctrl,el,in",
    inputs: {
      heatRejectionAuxiliaryKWh,
      heatRejectionDistributionAuxiliaryKWh,
      controlAuxiliaryKWh
    }
  });
}

export function calculateCoolingCompressionEer(input) {
  const { generatorCoolingInputKWh, compressionElectricInputKWh, auxiliaryElectricInputKWh } =
    input ?? {};

  assertFiniteNonNegativeNumber(generatorCoolingInputKWh, "generatorCoolingInputKWh");
  assertFiniteNonNegativeNumber(compressionElectricInputKWh, "compressionElectricInputKWh");
  assertFiniteNonNegativeNumber(auxiliaryElectricInputKWh, "auxiliaryElectricInputKWh");
  const denominator = compressionElectricInputKWh + auxiliaryElectricInputKWh;
  assertFinitePositiveNumber(denominator, "compression EER denominator");
  const value = generatorCoolingInputKWh / denominator;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_181_COOLING_COMPRESSION_EER",
    formulaText: "EER = QC,gen,in / (EC,gen,el,in + Waux,el,in)",
    inputs: { generatorCoolingInputKWh, compressionElectricInputKWh, auxiliaryElectricInputKWh }
  });
}

export function calculateCoolingCompressionDeliveredElectricInput(input) {
  const { compressionElectricInputKWh, auxiliaryElectricInputKWh } = input ?? {};

  assertFiniteNonNegativeNumber(compressionElectricInputKWh, "compressionElectricInputKWh");
  assertFiniteNonNegativeNumber(auxiliaryElectricInputKWh, "auxiliaryElectricInputKWh");
  const valueKWh = compressionElectricInputKWh + auxiliaryElectricInputKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_181_COOLING_COMPRESSION_DELIVERED_ELECTRIC_INPUT",
    formulaText: "EC,gen,el,delivered = EC,gen,el,in + Waux,el,in",
    inputs: { compressionElectricInputKWh, auxiliaryElectricInputKWh },
    assumptions: [
      "This is the delivered electric energy represented by the denominator of MC001 relation 3.181."
    ]
  });
}

export function calculateCoolingAbsorptionPerformanceRatio(input) {
  const { generatorCoolingInputKWh, absorptionHeatInputKWh } = input ?? {};

  assertFiniteNonNegativeNumber(generatorCoolingInputKWh, "generatorCoolingInputKWh");
  assertFinitePositiveNumber(absorptionHeatInputKWh, "absorptionHeatInputKWh");
  const value = generatorCoolingInputKWh / absorptionHeatInputKWh;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_182_COOLING_ABSORPTION_PERFORMANCE_RATIO",
    formulaText: "B = QC,gen,in / QH,C,gen,abs,in",
    inputs: { generatorCoolingInputKWh, absorptionHeatInputKWh }
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
