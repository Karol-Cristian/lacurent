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
