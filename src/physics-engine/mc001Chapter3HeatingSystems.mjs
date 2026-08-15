export const STATUS_CALCULATED = "calculated";

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

function sumArray(values, name) {
  if (!Array.isArray(values)) {
    throw new Error(`${name} must be an array`);
  }
  return values.reduce((sum, value, index) => {
    assertFiniteNonNegativeNumber(value, `${name}[${index}]`);
    return sum + value;
  }, 0);
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

export function calculateChapter3SubsystemInputEnergyBalance(input) {
  const {
    subsystemOutputKWh,
    subsystemLossKWh,
    auxiliaryEnergyKWh,
    auxiliaryRecoveredFraction,
    lossRecoveredFraction,
    subsystemId = "X.Y"
  } = input ?? {};

  assertFiniteNonNegativeNumber(subsystemOutputKWh, "subsystemOutputKWh");
  assertFiniteNonNegativeNumber(subsystemLossKWh, "subsystemLossKWh");
  assertFiniteNonNegativeNumber(auxiliaryEnergyKWh, "auxiliaryEnergyKWh");
  assertFraction(auxiliaryRecoveredFraction, "auxiliaryRecoveredFraction");
  assertFraction(lossRecoveredFraction, "lossRecoveredFraction");

  const recoveredAuxiliaryKWh = auxiliaryEnergyKWh * auxiliaryRecoveredFraction;
  const recoveredLossKWh = subsystemLossKWh * lossRecoveredFraction;
  const valueKWh =
    subsystemOutputKWh + subsystemLossKWh - recoveredAuxiliaryKWh - recoveredLossKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_A_SUBSYSTEM_INPUT_ENERGY_BALANCE",
    formulaText:
      "QX,Y,in = QX,Y,out + QX,Y,ls - WX,Y,aux * fX,Y,aux,rh - QX,Y,ls * fX,Y,ls,rh",
    inputs: {
      subsystemId,
      subsystemOutputKWh,
      subsystemLossKWh,
      auxiliaryEnergyKWh,
      auxiliaryRecoveredFraction,
      lossRecoveredFraction
    },
    extra: { recoveredAuxiliaryKWh, recoveredLossKWh },
    assumptions: ["all_recovery_fractions_are_explicit_project_inputs"]
  });
}

export function calculateChapter3SubsystemRecoverableEnergy(input) {
  const {
    auxiliaryEnergyKWh,
    auxiliaryRecoverableFractionToHeating,
    subsystemLossKWh,
    lossRecoverableFractionToHeating,
    subsystemId = "X.Y"
  } = input ?? {};

  assertFiniteNonNegativeNumber(auxiliaryEnergyKWh, "auxiliaryEnergyKWh");
  assertFraction(
    auxiliaryRecoverableFractionToHeating,
    "auxiliaryRecoverableFractionToHeating"
  );
  assertFiniteNonNegativeNumber(subsystemLossKWh, "subsystemLossKWh");
  assertFraction(lossRecoverableFractionToHeating, "lossRecoverableFractionToHeating");

  const valueKWh =
    auxiliaryEnergyKWh * auxiliaryRecoverableFractionToHeating +
    subsystemLossKWh * lossRecoverableFractionToHeating;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_B_SUBSYSTEM_RECOVERABLE_ENERGY",
    formulaText:
      "QX,Y,ls,rbl = WX,Y,aux * fX,Y,aux,rbl,H + QX,Y,ls * fX,Y,ls,rbl,H",
    inputs: {
      subsystemId,
      auxiliaryEnergyKWh,
      auxiliaryRecoverableFractionToHeating,
      subsystemLossKWh,
      lossRecoverableFractionToHeating
    },
    assumptions: ["recoverability_toward_heating_is_explicit"]
  });
}

export function calculateHeatingEmissionLoss(input) {
  const {
    emissionOutputKWh,
    increasedIndoorTemperatureK,
    indoorTemperatureC,
    combinedOutdoorTemperatureC
  } = input ?? {};

  assertFiniteNonNegativeNumber(emissionOutputKWh, "emissionOutputKWh");
  assertFiniteNonNegativeNumber(increasedIndoorTemperatureK, "increasedIndoorTemperatureK");
  assertFiniteNumber(indoorTemperatureC, "indoorTemperatureC");
  assertFiniteNumber(combinedOutdoorTemperatureC, "combinedOutdoorTemperatureC");
  const denominator = indoorTemperatureC - combinedOutdoorTemperatureC;
  assertFinitePositiveNumber(denominator, "indoorTemperatureC - combinedOutdoorTemperatureC");

  const valueKWh = emissionOutputKWh * increasedIndoorTemperatureK / denominator;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_1_HEATING_EMISSION_LOSS",
    formulaText: "QH,em,ls = QH,em,out * DeltaThetaH,int,inc / (thetaH,int,inc - thetaH,e,comb)",
    inputs: {
      emissionOutputKWh,
      increasedIndoorTemperatureK,
      indoorTemperatureC,
      combinedOutdoorTemperatureC
    }
  });
}

export function calculateHeatingEmissionEfficiency(input) {
  const { annualEmissionOutputKWh, annualEmissionLossKWh } = input ?? {};

  assertFinitePositiveNumber(annualEmissionOutputKWh, "annualEmissionOutputKWh");
  assertFiniteNonNegativeNumber(annualEmissionLossKWh, "annualEmissionLossKWh");

  const value =
    (annualEmissionOutputKWh + annualEmissionLossKWh) / annualEmissionOutputKWh;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_2_HEATING_EMISSION_EFFICIENCY_FACTOR",
    formulaText: "epsilonH,em = (QH,em,out,an + QH,em,ls,an) / QH,em,out,an",
    inputs: { annualEmissionOutputKWh, annualEmissionLossKWh }
  });
}

export function calculateHeatingEmissionInputEnergy(input) {
  const { annualEmissionOutputKWh, annualEmissionLossKWh } = input ?? {};

  assertFiniteNonNegativeNumber(annualEmissionOutputKWh, "annualEmissionOutputKWh");
  assertFiniteNonNegativeNumber(annualEmissionLossKWh, "annualEmissionLossKWh");
  const valueKWh = annualEmissionOutputKWh + annualEmissionLossKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_3_HEATING_EMISSION_INPUT_ENERGY",
    formulaText: "QH,em,in,an = QH,em,out,an + QH,em,ls,an",
    inputs: { annualEmissionOutputKWh, annualEmissionLossKWh }
  });
}

export function calculateHydronicDesignPower(input) {
  const { pressureDropKPa, designFlowRateM3PerH } = input ?? {};

  assertFiniteNonNegativeNumber(pressureDropKPa, "pressureDropKPa");
  assertFiniteNonNegativeNumber(designFlowRateM3PerH, "designFlowRateM3PerH");
  const valueKW = pressureDropKPa * designFlowRateM3PerH / 3600;

  return makeResult({
    value: valueKW,
    valueKey: "valueKW",
    unit: "kW",
    formulaId: "MC001_3_4_HYDRONIC_DESIGN_POWER",
    formulaText: "PHC,hydr,des = DeltaPHC,des * VdotHC,des / 3600",
    inputs: { pressureDropKPa, designFlowRateM3PerH }
  });
}

export function calculateHydronicPressureDrop(input) {
  const {
    componentResistanceFactor,
    maxLinearPressureDropKPaPerM,
    maxCircuitLengthM,
    additionalPressureDropKPa
  } = input ?? {};

  assertFiniteNonNegativeNumber(componentResistanceFactor, "componentResistanceFactor");
  assertFiniteNonNegativeNumber(
    maxLinearPressureDropKPaPerM,
    "maxLinearPressureDropKPaPerM"
  );
  assertFiniteNonNegativeNumber(maxCircuitLengthM, "maxCircuitLengthM");
  assertFiniteNonNegativeNumber(additionalPressureDropKPa, "additionalPressureDropKPa");
  const valueKPa =
    (1 + componentResistanceFactor) *
      maxLinearPressureDropKPaPerM *
      maxCircuitLengthM +
    additionalPressureDropKPa;

  return makeResult({
    value: valueKPa,
    valueKey: "valueKPa",
    unit: "kPa",
    formulaId: "MC001_3_5_HYDRONIC_PRESSURE_DROP",
    formulaText: "DeltaPHC,des = (1 + fcomp) * RHC,max * Lmax + DeltaPHC,add",
    inputs: {
      componentResistanceFactor,
      maxLinearPressureDropKPaPerM,
      maxCircuitLengthM,
      additionalPressureDropKPa
    }
  });
}

export function calculateHydronicPumpEnergy(input) {
  const {
    designPowerKW,
    operationLoadFactor,
    annualOperationHours,
    correctionFactor
  } = input ?? {};

  assertFiniteNonNegativeNumber(designPowerKW, "designPowerKW");
  assertFiniteNonNegativeNumber(operationLoadFactor, "operationLoadFactor");
  assertFiniteNonNegativeNumber(annualOperationHours, "annualOperationHours");
  assertFiniteNonNegativeNumber(correctionFactor, "correctionFactor");
  const valueKWh =
    designPowerKW * operationLoadFactor * annualOperationHours * correctionFactor;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_6_HYDRONIC_PUMP_ENERGY",
    formulaText: "WHC,dis,hydr,an = PHC,hydr,des * betaHC,dis * tHC,op,an * fHC,corr",
    inputs: { designPowerKW, operationLoadFactor, annualOperationHours, correctionFactor }
  });
}

export function calculateHeatingDistributionAuxiliaryEnergy(input) {
  const { hydronicPumpEnergyKWh, pumpEnergyUseFactor } = input ?? {};

  assertFiniteNonNegativeNumber(hydronicPumpEnergyKWh, "hydronicPumpEnergyKWh");
  assertFiniteNonNegativeNumber(pumpEnergyUseFactor, "pumpEnergyUseFactor");
  const valueKWh = hydronicPumpEnergyKWh * pumpEnergyUseFactor;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_7_HEATING_DISTRIBUTION_AUXILIARY_ENERGY",
    formulaText: "WHC,dis,an = WHC,dis,hydr,an * epsilonHC,dis",
    inputs: { hydronicPumpEnergyKWh, pumpEnergyUseFactor }
  });
}

export function calculateHydronicPumpEnergyUseFactor(input) {
  const {
    pumpEfficiencyFactor,
    controlConstantCp1,
    controlConstantCp2,
    operationLoadFactor,
    energyEfficiencyIndex
  } = input ?? {};

  assertFiniteNonNegativeNumber(pumpEfficiencyFactor, "pumpEfficiencyFactor");
  assertFiniteNumber(controlConstantCp1, "controlConstantCp1");
  assertFiniteNumber(controlConstantCp2, "controlConstantCp2");
  assertFinitePositiveNumber(operationLoadFactor, "operationLoadFactor");
  assertFiniteNonNegativeNumber(energyEfficiencyIndex, "energyEfficiencyIndex");
  const value =
    pumpEfficiencyFactor *
    (controlConstantCp1 + controlConstantCp2 * operationLoadFactor ** -1) *
    energyEfficiencyIndex /
    0.25;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_8_HYDRONIC_PUMP_ENERGY_USE_FACTOR",
    formulaText: "epsilonHC,dis = fHC,e * (CP1 + CP2 * betaHC,dis^-1) * EEI / 0.25",
    inputs: {
      pumpEfficiencyFactor,
      controlConstantCp1,
      controlConstantCp2,
      operationLoadFactor,
      energyEfficiencyIndex
    }
  });
}

export function calculateHydronicPumpEfficiencyFactor(input) {
  const { referencePumpPowerKW, hydronicDesignPowerKW } = input ?? {};

  assertFiniteNonNegativeNumber(referencePumpPowerKW, "referencePumpPowerKW");
  assertFinitePositiveNumber(hydronicDesignPowerKW, "hydronicDesignPowerKW");
  const value = referencePumpPowerKW / hydronicDesignPowerKW;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_9_HYDRONIC_PUMP_EFFICIENCY_FACTOR",
    formulaText: "fHC,e = PHC,ref / PHC,hydr,des",
    inputs: { referencePumpPowerKW, hydronicDesignPowerKW }
  });
}

export function calculateHydronicReferencePumpPower(input) {
  const { hydronicDesignPowerKW } = input ?? {};

  assertFiniteNonNegativeNumber(hydronicDesignPowerKW, "hydronicDesignPowerKW");
  const valueKW =
    (1.7 * hydronicDesignPowerKW +
      17 * (1 - Math.exp(-0.3 * hydronicDesignPowerKW))) *
    10 ** -3;

  return makeResult({
    value: valueKW,
    valueKey: "valueKW",
    unit: "kW",
    formulaId: "MC001_3_10_HYDRONIC_REFERENCE_PUMP_POWER",
    formulaText: "PHC,ref = (1.7 * PHC,hydr,des + 17 * (1 - e^(-0.3 * PHC,hydr,des))) * 10^-3",
    inputs: { hydronicDesignPowerKW }
  });
}

export function calculateHeatingDistributionSetbackPumpEnergy(input) {
  const { setbackPumpPowerKW, calculationHours } = input ?? {};

  assertFiniteNonNegativeNumber(setbackPumpPowerKW, "setbackPumpPowerKW");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");
  const valueKWh = 0.3 * setbackPumpPowerKW * calculationHours;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_11_HEATING_DISTRIBUTION_SETBACK_PUMP_ENERGY",
    formulaText: "WHC,dis,setb = 0.3 * PHC,dis,setb * tci",
    inputs: { setbackPumpPowerKW, calculationHours }
  });
}

export function calculateHeatingDistributionBoostPumpEnergy(input) {
  const { hydronicDesignPowerKW, calculationHours } = input ?? {};

  assertFiniteNonNegativeNumber(hydronicDesignPowerKW, "hydronicDesignPowerKW");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");
  const valueKWh = 3.3 * hydronicDesignPowerKW * calculationHours;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_12_HEATING_DISTRIBUTION_BOOST_PUMP_ENERGY",
    formulaText: "WHC,dis,boost = 3.3 * PHC,hydr,des * tci",
    inputs: { hydronicDesignPowerKW, calculationHours }
  });
}

export function calculateHeatingDistributionAuxiliaryRecoverableEnergy(input) {
  const { recoverableFraction, distributionAuxiliaryEnergyKWh } = input ?? {};

  assertFraction(recoverableFraction, "recoverableFraction");
  assertFiniteNonNegativeNumber(
    distributionAuxiliaryEnergyKWh,
    "distributionAuxiliaryEnergyKWh"
  );
  const valueKWh = recoverableFraction * distributionAuxiliaryEnergyKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_13_HEATING_DISTRIBUTION_AUXILIARY_RECOVERABLE",
    formulaText: "QH,dis,rbl = frbl,dis * WH,dis",
    inputs: { recoverableFraction, distributionAuxiliaryEnergyKWh }
  });
}

export function calculateHeatingDistributionAuxiliaryRecoveredEnergy(input) {
  const { recoverableFraction, distributionAuxiliaryEnergyKWh } = input ?? {};

  assertFraction(recoverableFraction, "recoverableFraction");
  assertFiniteNonNegativeNumber(
    distributionAuxiliaryEnergyKWh,
    "distributionAuxiliaryEnergyKWh"
  );
  const valueKWh = (1 - recoverableFraction) * distributionAuxiliaryEnergyKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_14_HEATING_DISTRIBUTION_AUXILIARY_RECOVERED",
    formulaText: "QH,dis,rvd = (1 - frbl,dis) * WH,dis",
    inputs: { recoverableFraction, distributionAuxiliaryEnergyKWh }
  });
}

export function calculateHeatingGeneratorStandbyLossFractionFromCoefficients(input) {
  const { coefficientC5, coefficientC6, nominalPowerKW } = input ?? {};

  assertFiniteNumber(coefficientC5, "coefficientC5");
  assertFiniteNumber(coefficientC6, "coefficientC6");
  assertFinitePositiveNumber(nominalPowerKW, "nominalPowerKW");
  const valuePercent = coefficientC5 * nominalPowerKW ** coefficientC6 / 100;

  return makeResult({
    value: valuePercent,
    valueKey: "valuePercent",
    unit: "%",
    formulaId: "MC001_3_15_HEATING_GENERATOR_STANDBY_LOSS_FRACTION",
    formulaText: "fgen,ls,P0 = (c5 * Pn^c6) / 100",
    inputs: { coefficientC5, coefficientC6, nominalPowerKW },
    assumptions: ["c5_and_c6_are_explicit_from_SR_EN_15316_4_1_table_B6"]
  });
}

export function calculateHeatingGeneratorStandbyLossFractionFromEnvelopeAndChimney(input) {
  const { envelopeLossFractionPercent, chimneyOffLossFractionPercent } = input ?? {};

  assertFiniteNonNegativeNumber(envelopeLossFractionPercent, "envelopeLossFractionPercent");
  assertFiniteNonNegativeNumber(
    chimneyOffLossFractionPercent,
    "chimneyOffLossFractionPercent"
  );
  const valuePercent = envelopeLossFractionPercent + chimneyOffLossFractionPercent;

  return makeResult({
    value: valuePercent,
    valueKey: "valuePercent",
    unit: "%",
    formulaId: "MC001_3_16_HEATING_GENERATOR_STANDBY_LOSS_FRACTION_SUM",
    formulaText: "fgen,ls,P0 = fgen,env + fch,off",
    inputs: { envelopeLossFractionPercent, chimneyOffLossFractionPercent }
  });
}

export function calculateHeatingGeneratorStandbyLossPower(input) {
  const {
    envelopeLossFractionPercent,
    chimneyOffLossFractionPercent,
    generatorDeliveredPowerKW
  } = input ?? {};

  assertFiniteNonNegativeNumber(envelopeLossFractionPercent, "envelopeLossFractionPercent");
  assertFiniteNonNegativeNumber(
    chimneyOffLossFractionPercent,
    "chimneyOffLossFractionPercent"
  );
  assertFiniteNonNegativeNumber(generatorDeliveredPowerKW, "generatorDeliveredPowerKW");
  const valueKW =
    ((envelopeLossFractionPercent + chimneyOffLossFractionPercent) / 100) *
    generatorDeliveredPowerKW;

  return makeResult({
    value: valueKW,
    valueKey: "valueKW",
    unit: "kW",
    formulaId: "MC001_3_17_HEATING_GENERATOR_STANDBY_LOSS_POWER",
    formulaText: "Pgen,ls,ch,P0 = ((fgen,env + fch,off) / 100) * Pgen,del",
    inputs: {
      envelopeLossFractionPercent,
      chimneyOffLossFractionPercent,
      generatorDeliveredPowerKW
    }
  });
}

export function calculateHeatingGeneratorAuxiliaryPowerFromCoefficients(input) {
  const { coefficientC7, coefficientC8, nominalPowerKW } = input ?? {};

  assertFiniteNumber(coefficientC7, "coefficientC7");
  assertFiniteNumber(coefficientC8, "coefficientC8");
  assertFiniteNonNegativeNumber(nominalPowerKW, "nominalPowerKW");
  const valueKW = ((coefficientC7 + coefficientC8) / 100) * nominalPowerKW;

  return makeResult({
    value: valueKW,
    valueKey: "valueKW",
    unit: "kW",
    formulaId: "MC001_3_18_HEATING_GENERATOR_AUXILIARY_POWER",
    formulaText: "Paux,Px = ((c7 + c8) / 100) * Pn,n",
    inputs: { coefficientC7, coefficientC8, nominalPowerKW },
    assumptions: [
      "c7_and_c8_are_explicit_inputs_from_SR_EN_15316_4_1_Annex_B_Table_B6"
    ]
  });
}

export function calculateHeatingGeneratorUtilizationFactor(input) {
  const { generatorOutputKWh, fuelInputKWh } = input ?? {};

  assertFiniteNonNegativeNumber(generatorOutputKWh, "generatorOutputKWh");
  assertFinitePositiveNumber(fuelInputKWh, "fuelInputKWh");
  const value = generatorOutputKWh / fuelInputKWh;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_19_HEATING_GENERATOR_UTILIZATION_FACTOR",
    formulaText: "epsilonH,gen = QH,gen,out / EH,gen,in",
    inputs: { generatorOutputKWh, fuelInputKWh }
  });
}

export function calculateHeatingGeneratorFuelInputEnergy(input) {
  const {
    generatorOutputKWh,
    recoveredAuxiliaryLossKWh,
    generatorLossKWh,
    renewableGeneratorHeatKWh
  } = input ?? {};

  assertFiniteNonNegativeNumber(generatorOutputKWh, "generatorOutputKWh");
  assertFiniteNonNegativeNumber(recoveredAuxiliaryLossKWh, "recoveredAuxiliaryLossKWh");
  assertFiniteNonNegativeNumber(generatorLossKWh, "generatorLossKWh");
  assertFiniteNonNegativeNumber(renewableGeneratorHeatKWh, "renewableGeneratorHeatKWh");
  const valueKWh =
    generatorOutputKWh -
    recoveredAuxiliaryLossKWh +
    generatorLossKWh -
    renewableGeneratorHeatKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_20_HEATING_GENERATOR_FUEL_INPUT_ENERGY",
    formulaText: "EH,gen,in = QH,gen,out - QH,gen,aux,rvd + QH,gen,ls - QH,gen,ren",
    inputs: {
      generatorOutputKWh,
      recoveredAuxiliaryLossKWh,
      generatorLossKWh,
      renewableGeneratorHeatKWh
    }
  });
}

export function calculateHeatingGenerationAuxiliaryTotal(input) {
  const { heatingAuxiliaryKWh = [], otherServiceAuxiliaryKWh = [] } = input ?? {};

  const valueKWh =
    sumArray(heatingAuxiliaryKWh, "heatingAuxiliaryKWh") +
    sumArray(otherServiceAuxiliaryKWh, "otherServiceAuxiliaryKWh");

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_21_HEATING_GENERATION_AUXILIARY_TOTAL",
    formulaText: "WH,gen = sum_i WH,gen,i + sum_i WXY,gen,i",
    inputs: { heatingAuxiliaryKWh, otherServiceAuxiliaryKWh }
  });
}

export function calculateGenerationLossTotal(input) {
  const {
    heatingGenerationLossKWh,
    otherServiceGenerationLossesKWh = [],
    dhwStorageOrDistributionLossKWh
  } = input ?? {};

  assertFiniteNonNegativeNumber(heatingGenerationLossKWh, "heatingGenerationLossKWh");
  assertFiniteNonNegativeNumber(
    dhwStorageOrDistributionLossKWh,
    "dhwStorageOrDistributionLossKWh"
  );
  const valueKWh =
    heatingGenerationLossKWh +
    sumArray(otherServiceGenerationLossesKWh, "otherServiceGenerationLossesKWh") +
    dhwStorageOrDistributionLossKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_22_GENERATION_LOSS_TOTAL",
    formulaText: "Qgen,ls = QH,gen,ls + sum_i QXY,gen,ls + QW,S,ls",
    inputs: {
      heatingGenerationLossKWh,
      otherServiceGenerationLossesKWh,
      dhwStorageOrDistributionLossKWh
    }
  });
}

export function calculateHeatingGeneratorLoadFactor(input) {
  const { generatorOutputKWh, nominalPowerKW, heatingOperationHours } = input ?? {};

  assertFiniteNonNegativeNumber(generatorOutputKWh, "generatorOutputKWh");
  assertFinitePositiveNumber(nominalPowerKW, "nominalPowerKW");
  assertFinitePositiveNumber(heatingOperationHours, "heatingOperationHours");
  const value = generatorOutputKWh / (nominalPowerKW * heatingOperationHours);

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_23_HEATING_GENERATOR_LOAD_FACTOR",
    formulaText: "betaH = QH,gen,out / (Pn * tH)",
    inputs: { generatorOutputKWh, nominalPowerKW, heatingOperationHours }
  });
}

export function calculateHeatingGeneratorFullLoadHours(input) {
  const { generatorOutputKWh, nominalPowerKW } = input ?? {};

  assertFiniteNonNegativeNumber(generatorOutputKWh, "generatorOutputKWh");
  assertFinitePositiveNumber(nominalPowerKW, "nominalPowerKW");
  const valueHours = generatorOutputKWh / nominalPowerKW;

  return makeResult({
    value: valueHours,
    valueKey: "valueHours",
    unit: "h",
    formulaId: "MC001_3_24_HEATING_GENERATOR_FULL_LOAD_HOURS",
    formulaText: "tH = QH,gen,out / Pn",
    inputs: { generatorOutputKWh, nominalPowerKW }
  });
}

export function calculateHeatingGeneratorLossPowerLowLoad(input) {
  const {
    generatorLoadFactor,
    intermediateLoadFactor,
    lossPowerNominalKW,
    lossPowerIntermediateKW
  } = input ?? {};

  assertFiniteNonNegativeNumber(generatorLoadFactor, "generatorLoadFactor");
  assertFinitePositiveNumber(intermediateLoadFactor, "intermediateLoadFactor");
  assertFiniteNonNegativeNumber(lossPowerNominalKW, "lossPowerNominalKW");
  assertFiniteNonNegativeNumber(lossPowerIntermediateKW, "lossPowerIntermediateKW");
  const valueKW =
    (generatorLoadFactor / intermediateLoadFactor) *
      (lossPowerNominalKW - lossPowerIntermediateKW) +
    lossPowerIntermediateKW;

  return makeResult({
    value: valueKW,
    valueKey: "valueKW",
    unit: "kW",
    formulaId: "MC001_3_25_HEATING_GENERATOR_LOSS_POWER_LOW_LOAD",
    formulaText: "PH,gen,ls,Px = (betaH,gen / betaPint) * (PH,gen,ls,Pn - PH,gen,ls,Pint) + PH,gen,ls,Pint",
    inputs: {
      generatorLoadFactor,
      intermediateLoadFactor,
      lossPowerNominalKW,
      lossPowerIntermediateKW
    }
  });
}

export function calculateHeatingGeneratorLossPowerHighLoad(input) {
  const {
    generatorLoadFactor,
    intermediateLoadFactor,
    nominalLoadFactor,
    lossPowerNominalKW,
    lossPowerIntermediateKW
  } = input ?? {};

  assertFiniteNonNegativeNumber(generatorLoadFactor, "generatorLoadFactor");
  assertFiniteNumber(intermediateLoadFactor, "intermediateLoadFactor");
  assertFiniteNumber(nominalLoadFactor, "nominalLoadFactor");
  assertFiniteNonNegativeNumber(lossPowerNominalKW, "lossPowerNominalKW");
  assertFiniteNonNegativeNumber(lossPowerIntermediateKW, "lossPowerIntermediateKW");
  const denominator = nominalLoadFactor - intermediateLoadFactor;
  assertFinitePositiveNumber(denominator, "nominalLoadFactor - intermediateLoadFactor");
  const valueKW =
    ((generatorLoadFactor - intermediateLoadFactor) / denominator) *
      (lossPowerNominalKW - lossPowerIntermediateKW) +
    lossPowerIntermediateKW;

  return makeResult({
    value: valueKW,
    valueKey: "valueKW",
    unit: "kW",
    formulaId: "MC001_3_26_HEATING_GENERATOR_LOSS_POWER_HIGH_LOAD",
    formulaText: "PH,gen,ls,Px = ((betaH,gen - betaPint) / (betaPn - betaPint)) * (PH,gen,ls,Pn - PH,gen,ls,Pint) + PH,gen,ls,Pint",
    inputs: {
      generatorLoadFactor,
      intermediateLoadFactor,
      nominalLoadFactor,
      lossPowerNominalKW,
      lossPowerIntermediateKW
    }
  });
}

export function calculateHeatingGeneratorLossEnergy(input) {
  const { generatorLossPowerKW, operationHours } = input ?? {};

  assertFiniteNonNegativeNumber(generatorLossPowerKW, "generatorLossPowerKW");
  assertFiniteNonNegativeNumber(operationHours, "operationHours");
  const valueKWh = generatorLossPowerKW * operationHours;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_27_HEATING_GENERATOR_LOSS_ENERGY",
    formulaText: "QH,gen,ls = PH,gen,ls,Px * tH,use",
    inputs: { generatorLossPowerKW, operationHours }
  });
}

export function calculateRecoverableGenerationLossTotal(input) {
  const {
    heatingGenerationRecoverableLossKWh,
    otherServiceRecoverableLossesKWh = [],
    heatingAuxiliaryRecoverableLossKWh
  } = input ?? {};

  assertFiniteNonNegativeNumber(
    heatingGenerationRecoverableLossKWh,
    "heatingGenerationRecoverableLossKWh"
  );
  assertFiniteNonNegativeNumber(
    heatingAuxiliaryRecoverableLossKWh,
    "heatingAuxiliaryRecoverableLossKWh"
  );
  const valueKWh =
    heatingGenerationRecoverableLossKWh +
    sumArray(otherServiceRecoverableLossesKWh, "otherServiceRecoverableLossesKWh") +
    heatingAuxiliaryRecoverableLossKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_28_RECOVERABLE_GENERATION_LOSS_TOTAL",
    formulaText: "Qgen,ls,rbl = QH,gen,ls,rbl + QXY,gen,ls,rbl + QH,gen,aux,rbl",
    inputs: {
      heatingGenerationRecoverableLossKWh,
      otherServiceRecoverableLossesKWh,
      heatingAuxiliaryRecoverableLossKWh
    }
  });
}

export function calculateHeatingGeneratorEnvelopeRecoverableLoss(input) {
  const {
    correctedStandbyLossPowerKW,
    boilerRoomRecoveryFactor,
    envelopeLossFraction,
    operationHours
  } = input ?? {};

  assertFiniteNonNegativeNumber(correctedStandbyLossPowerKW, "correctedStandbyLossPowerKW");
  assertFraction(boilerRoomRecoveryFactor, "boilerRoomRecoveryFactor");
  assertFraction(envelopeLossFraction, "envelopeLossFraction");
  assertFiniteNonNegativeNumber(operationHours, "operationHours");
  const valueKWh =
    correctedStandbyLossPowerKW *
    (1 - boilerRoomRecoveryFactor) *
    envelopeLossFraction *
    operationHours;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_29_HEATING_GENERATOR_ENVELOPE_RECOVERABLE_LOSS",
    formulaText: "QH,gen,ls,env,rbl = PH,gen,ls,P0,corr * (1 - fbrm) * fgen,env * tH,use",
    inputs: {
      correctedStandbyLossPowerKW,
      boilerRoomRecoveryFactor,
      envelopeLossFraction,
      operationHours
    }
  });
}

export function calculateHeatingGeneratorAuxiliaryRecoverableFraction(input) {
  const { recoveredAuxiliaryFraction } = input ?? {};

  assertFraction(recoveredAuxiliaryFraction, "recoveredAuxiliaryFraction");
  const value = 1 - recoveredAuxiliaryFraction;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_30_HEATING_GENERATOR_AUXILIARY_RECOVERABLE_FRACTION",
    formulaText: "faux,rbl = 1 - faux,rvd",
    inputs: { recoveredAuxiliaryFraction }
  });
}

export function calculateHeatingGeneratorAuxiliaryRecoveredLoss(input) {
  const { generationAuxiliaryEnergyKWh, recoveredAuxiliaryFraction } = input ?? {};

  assertFiniteNonNegativeNumber(generationAuxiliaryEnergyKWh, "generationAuxiliaryEnergyKWh");
  assertFraction(recoveredAuxiliaryFraction, "recoveredAuxiliaryFraction");
  const valueKWh = generationAuxiliaryEnergyKWh * recoveredAuxiliaryFraction;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_31_HEATING_GENERATOR_AUXILIARY_RECOVERED_LOSS",
    formulaText: "QH,gen,aux,rvd = WH,gen * faux,rvd",
    inputs: { generationAuxiliaryEnergyKWh, recoveredAuxiliaryFraction }
  });
}

export function calculateHeatingGeneratorAuxiliaryRecoverableLoss(input) {
  const {
    generationAuxiliaryEnergyKWh,
    boilerRoomRecoveryFactor,
    auxiliaryRecoverableFraction
  } = input ?? {};

  assertFiniteNonNegativeNumber(generationAuxiliaryEnergyKWh, "generationAuxiliaryEnergyKWh");
  assertFraction(boilerRoomRecoveryFactor, "boilerRoomRecoveryFactor");
  assertFraction(auxiliaryRecoverableFraction, "auxiliaryRecoverableFraction");
  const valueKWh =
    generationAuxiliaryEnergyKWh *
    (1 - boilerRoomRecoveryFactor) *
    auxiliaryRecoverableFraction;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_32_HEATING_GENERATOR_AUXILIARY_RECOVERABLE_LOSS",
    formulaText: "QH,gen,aux,rbl = WH,gen * (1 - fbrm) * faux,rbl",
    inputs: {
      generationAuxiliaryEnergyKWh,
      boilerRoomRecoveryFactor,
      auxiliaryRecoverableFraction
    }
  });
}

export function calculateTotalGenerationAuxiliaryRecoveredLoss(input) {
  const { heatingAuxiliaryRecoveredLossKWh, otherRecoveredAuxiliaryLossesKWh = [] } =
    input ?? {};

  assertFiniteNonNegativeNumber(
    heatingAuxiliaryRecoveredLossKWh,
    "heatingAuxiliaryRecoveredLossKWh"
  );
  const valueKWh =
    heatingAuxiliaryRecoveredLossKWh +
    sumArray(otherRecoveredAuxiliaryLossesKWh, "otherRecoveredAuxiliaryLossesKWh");

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_33_TOTAL_GENERATION_AUXILIARY_RECOVERED_LOSS",
    formulaText: "Qgen,aux,rvd = sum QH,gen,aux,rvd + sum QXY,gen,aux,rvd",
    inputs: { heatingAuxiliaryRecoveredLossKWh, otherRecoveredAuxiliaryLossesKWh }
  });
}

export function calculateHeatingGeneratorAuxiliaryPowerLowLoad(input) {
  const {
    generatorLoadFactor,
    intermediateLoadFactor,
    auxiliaryPowerIntermediateKW,
    auxiliaryPowerStandbyKW
  } = input ?? {};

  assertFiniteNonNegativeNumber(generatorLoadFactor, "generatorLoadFactor");
  assertFinitePositiveNumber(intermediateLoadFactor, "intermediateLoadFactor");
  assertFiniteNonNegativeNumber(auxiliaryPowerIntermediateKW, "auxiliaryPowerIntermediateKW");
  assertFiniteNonNegativeNumber(auxiliaryPowerStandbyKW, "auxiliaryPowerStandbyKW");
  const valueKW =
    (generatorLoadFactor / intermediateLoadFactor) *
      (auxiliaryPowerIntermediateKW - auxiliaryPowerStandbyKW) +
    auxiliaryPowerStandbyKW;

  return makeResult({
    value: valueKW,
    valueKey: "valueKW",
    unit: "kW",
    formulaId: "MC001_3_34_HEATING_GENERATOR_AUXILIARY_POWER_LOW_LOAD",
    formulaText: "PH,aux,Px = (betaH,gen / betaPint) * (Paux,Pint - Paux,P0) + Paux,P0",
    inputs: {
      generatorLoadFactor,
      intermediateLoadFactor,
      auxiliaryPowerIntermediateKW,
      auxiliaryPowerStandbyKW
    }
  });
}

export function calculateHeatingGeneratorAuxiliaryPowerHighLoad(input) {
  const {
    generatorLoadFactor,
    intermediateLoadFactor,
    auxiliaryPowerNominalKW,
    auxiliaryPowerIntermediateKW
  } = input ?? {};

  assertFiniteNonNegativeNumber(generatorLoadFactor, "generatorLoadFactor");
  assertFiniteNumber(intermediateLoadFactor, "intermediateLoadFactor");
  assertFiniteNonNegativeNumber(auxiliaryPowerNominalKW, "auxiliaryPowerNominalKW");
  assertFiniteNonNegativeNumber(auxiliaryPowerIntermediateKW, "auxiliaryPowerIntermediateKW");
  const denominator = 1 - intermediateLoadFactor;
  assertFinitePositiveNumber(denominator, "1 - intermediateLoadFactor");
  const valueKW =
    ((generatorLoadFactor - intermediateLoadFactor) / denominator) *
      (auxiliaryPowerNominalKW - auxiliaryPowerIntermediateKW) +
    auxiliaryPowerIntermediateKW;

  return makeResult({
    value: valueKW,
    valueKey: "valueKW",
    unit: "kW",
    formulaId: "MC001_3_35_HEATING_GENERATOR_AUXILIARY_POWER_HIGH_LOAD",
    formulaText: "PH,aux,Px = ((betaH,gen - betaPint) / (1 - betaPint)) * (Paux,Pn - Paux,Pint) + Paux,Pint",
    inputs: {
      generatorLoadFactor,
      intermediateLoadFactor,
      auxiliaryPowerNominalKW,
      auxiliaryPowerIntermediateKW
    }
  });
}

export function calculateIntermediateLoadFactor(input) {
  const { intermediatePowerKW, nominalPowerKW } = input ?? {};

  assertFiniteNonNegativeNumber(intermediatePowerKW, "intermediatePowerKW");
  assertFinitePositiveNumber(nominalPowerKW, "nominalPowerKW");
  const value = intermediatePowerKW / nominalPowerKW;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_36_INTERMEDIATE_LOAD_FACTOR",
    formulaText: "betaPint = Pint / Pn",
    inputs: { intermediatePowerKW, nominalPowerKW }
  });
}

export function calculateHeatingGeneratorAuxiliaryEnergy(input) {
  const { auxiliaryPowerKW, operationHours } = input ?? {};

  assertFiniteNonNegativeNumber(auxiliaryPowerKW, "auxiliaryPowerKW");
  assertFiniteNonNegativeNumber(operationHours, "operationHours");
  const valueKWh = auxiliaryPowerKW * operationHours;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_37_HEATING_GENERATOR_AUXILIARY_ENERGY",
    formulaText: "WH,gen = PH,aux,Px * tH,use",
    inputs: { auxiliaryPowerKW, operationHours }
  });
}

export function calculateHeatingGeneratorOperationTime(input) {
  const {
    heatingUseHours,
    heatingLoadFactor,
    coolingUseHours,
    coolingLoadFactor,
    ventilationUseHours,
    ventilationLoadFactor,
    dhwUseHours,
    dhwLoadFactor
  } = input ?? {};

  assertFiniteNonNegativeNumber(heatingUseHours, "heatingUseHours");
  assertFiniteNonNegativeNumber(heatingLoadFactor, "heatingLoadFactor");
  assertFiniteNonNegativeNumber(coolingUseHours, "coolingUseHours");
  assertFiniteNonNegativeNumber(coolingLoadFactor, "coolingLoadFactor");
  assertFiniteNonNegativeNumber(ventilationUseHours, "ventilationUseHours");
  assertFiniteNonNegativeNumber(ventilationLoadFactor, "ventilationLoadFactor");
  assertFiniteNonNegativeNumber(dhwUseHours, "dhwUseHours");
  assertFiniteNonNegativeNumber(dhwLoadFactor, "dhwLoadFactor");
  const valueHours =
    heatingUseHours * heatingLoadFactor -
    coolingUseHours * coolingLoadFactor -
    ventilationUseHours * ventilationLoadFactor -
    dhwUseHours * dhwLoadFactor;

  return makeResult({
    value: valueHours,
    valueKey: "valueHours",
    unit: "h",
    formulaId: "MC001_3_38_HEATING_GENERATOR_OPERATION_TIME",
    formulaText: "tH,op = tH,use*betaH - tC,use*betaC - tV,use*betaV - tW,use*betaW",
    inputs: {
      heatingUseHours,
      heatingLoadFactor,
      coolingUseHours,
      coolingLoadFactor,
      ventilationUseHours,
      ventilationLoadFactor,
      dhwUseHours,
      dhwLoadFactor
    },
    warnings: valueHours < 0 ? ["negative_operation_time_requires_source_review"] : []
  });
}

export function calculateCentralGeneratorOutputEnergy(input) {
  const {
    controlLossFactor,
    heatingDistributionInputKWh = [],
    otherServiceDistributionInputKWh = []
  } = input ?? {};

  assertFiniteNonNegativeNumber(controlLossFactor, "controlLossFactor");
  const heatingSum = sumArray(heatingDistributionInputKWh, "heatingDistributionInputKWh");
  const otherSum = sumArray(
    otherServiceDistributionInputKWh,
    "otherServiceDistributionInputKWh"
  );
  const valueKWh = controlLossFactor * heatingSum + otherSum;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_39_CENTRAL_GENERATOR_OUTPUT_ENERGY",
    formulaText: "Qgen,out = fctr,ls * sum_i QH,dis,in,i + sum_j QXY,dis,in,j",
    inputs: { controlLossFactor, heatingDistributionInputKWh, otherServiceDistributionInputKWh }
  });
}
