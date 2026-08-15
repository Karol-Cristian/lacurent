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

function assertNonEmptyArray(items, name) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`${name} must be a non-empty array`);
  }
}

function assertOuterDiameterGreaterThanInner(innerDiameterM, outerDiameterM) {
  if (outerDiameterM <= innerDiameterM) {
    throw new Error("outerDiameterM must be greater than innerDiameterM");
  }
}

function assertPositiveDenominator(value, formulaId) {
  if (value <= 0) {
    throw new Error(`${formulaId} denominator must be positive`);
  }
}

function makeResult({
  value,
  valueKey,
  unit,
  formulaId,
  formulaText,
  inputs,
  assumptions = []
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
          value:
            typeof inputValue === "number" && Number.isFinite(inputValue)
              ? inputValue
              : inputValue,
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
      source: "MC001-2022 Chapter 3.3",
      assumptions,
      warnings: []
    }
  };
  return {
    status: STATUS_CALCULATED,
    value,
    [valueKey]: value,
    unit,
    formulaId,
    inputs,
    executionTrace,
    trace: {
      formulaId,
      formulaText,
      inputValues: inputs,
      result: value,
      unit,
      assumptions,
      warnings: []
    }
  };
}

function pipeLength(segment) {
  return Number(segment.lengthM) + Number(segment.equivalentLengthM ?? 0);
}

function assertPipeLossSegment(segment, name) {
  assertFiniteNonNegativeNumber(
    segment.linearTransmittanceWPerMK,
    `${name}.linearTransmittanceWPerMK`
  );
  assertFiniteNumber(segment.thetaWMeanC, `${name}.thetaWMeanC`);
  assertFiniteNumber(segment.thetaWAmbientC, `${name}.thetaWAmbientC`);
  assertFiniteNonNegativeNumber(segment.lengthM, `${name}.lengthM`);
  assertFiniteNonNegativeNumber(
    segment.equivalentLengthM ?? 0,
    `${name}.equivalentLengthM`
  );
}

function pipeHeatLossRateW(segment, temperatureMode = "difference") {
  const temperatureTerm =
    temperatureMode === "sum"
      ? Number(segment.thetaWMeanC) + Number(segment.thetaWAmbientC)
      : Number(segment.thetaWMeanC) - Number(segment.thetaWAmbientC);
  return (
    Number(segment.linearTransmittanceWPerMK) *
    temperatureTerm *
    pipeLength(segment)
  );
}

export function calculateDhwMeanDistributionTemperature(input) {
  const { thetaWDistributionC, deltaThetaWLoopK } = input ?? {};

  assertFiniteNumber(thetaWDistributionC, "thetaWDistributionC");
  assertFiniteNonNegativeNumber(deltaThetaWLoopK, "deltaThetaWLoopK");

  const valueC = thetaWDistributionC - deltaThetaWLoopK / 2;
  const inputs = { thetaWDistributionC, deltaThetaWLoopK };

  return makeResult({
    value: valueC,
    valueKey: "valueC",
    unit: "degC",
    formulaId: "MC001_3_200_DHW_MEAN_DISTRIBUTION_TEMPERATURE",
    formulaText: "thetaW,mean = thetaW - deltaThetaW / 2",
    inputs,
    assumptions: [
      "delta_temperature_is_the_dhw_distribution_loop_temperature_difference"
    ]
  });
}

export function calculateDhwDistributionLossWithRecirculation(input) {
  const { pipeSegments, operationTimeHours } = input ?? {};

  assertNonEmptyArray(pipeSegments, "pipeSegments");
  assertFiniteNonNegativeNumber(operationTimeHours, "operationTimeHours");
  pipeSegments.forEach((segment, index) =>
    assertPipeLossSegment(segment, `pipeSegments[${index}]`)
  );

  const heatLossRateW = pipeSegments.reduce(
    (sum, segment) => sum + pipeHeatLossRateW(segment),
    0
  );
  const valueKWh = (heatLossRateW * operationTimeHours) / 1000;
  const inputs = { pipeSegments, operationTimeHours };

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_205_DHW_DISTRIBUTION_LOSS_WITH_RECIRCULATION",
    formulaText:
      "QW,dis,ls = (1 / 1000) * sum(Psi_j * (thetaW,mean - thetaW,amb,j) * (L + Lequip)_j * t)",
    inputs,
    assumptions: [
      "operation_time_hours_is_the_explicit_sum_of_tci_intervals",
      "pipe_lengths_and_equivalent_lengths_are_explicit"
    ]
  });
}

export function calculateDhwStubLossWithoutRecirculation(input) {
  const {
    pipeSegments,
    waterDensityKgPerM3,
    specificHeatKWhPerKgK,
    thetaWDistributionC,
    calculationIntervalHours
  } = input ?? {};

  assertNonEmptyArray(pipeSegments, "pipeSegments");
  assertFinitePositiveNumber(waterDensityKgPerM3, "waterDensityKgPerM3");
  assertFinitePositiveNumber(specificHeatKWhPerKgK, "specificHeatKWhPerKgK");
  assertFiniteNumber(thetaWDistributionC, "thetaWDistributionC");
  assertFiniteNonNegativeNumber(calculationIntervalHours, "calculationIntervalHours");
  pipeSegments.forEach((segment, index) => {
    assertFiniteNonNegativeNumber(segment.volumeM3, `pipeSegments[${index}].volumeM3`);
    assertFiniteNonNegativeNumber(
      segment.tapCountPerHour,
      `pipeSegments[${index}].tapCountPerHour`
    );
    assertFiniteNumber(segment.thetaWAmbientC, `pipeSegments[${index}].thetaWAmbientC`);
  });

  const valueKWh = pipeSegments.reduce(
    (sum, segment) =>
      sum +
      Number(segment.volumeM3) *
        waterDensityKgPerM3 *
        Number(segment.tapCountPerHour) *
        specificHeatKWhPerKgK *
        (thetaWDistributionC - Number(segment.thetaWAmbientC)) *
        calculationIntervalHours,
    0
  );
  const inputs = {
    pipeSegments,
    waterDensityKgPerM3,
    specificHeatKWhPerKgK,
    thetaWDistributionC,
    calculationIntervalHours
  };

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_206_DHW_STUB_LOSS_WITHOUT_RECIRCULATION",
    formulaText:
      "QW,dis,ls,stub = sum(Vstub,j * rhoW * ntap,j) * cW * (thetaW - thetaW,amb,j) * tci",
    inputs,
    assumptions: [
      "specific_heat_input_is_explicit",
      "tap_count_and_open_pipe_volume_are_explicit"
    ]
  });
}

export function calculateDhwRecirculationLossWithoutDrawOff(input) {
  const { pipeSegments, operationTimeHours } = input ?? {};

  assertNonEmptyArray(pipeSegments, "pipeSegments");
  assertFiniteNonNegativeNumber(operationTimeHours, "operationTimeHours");
  pipeSegments.forEach((segment, index) =>
    assertPipeLossSegment(segment, `pipeSegments[${index}]`)
  );

  const heatLossRateW = pipeSegments.reduce(
    (sum, segment) => sum + pipeHeatLossRateW(segment, "sum"),
    0
  );
  const valueKWh = (heatLossRateW * operationTimeHours) / 1000;
  const inputs = { pipeSegments, operationTimeHours };

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_207_DHW_RECIRCULATION_LOSS_WITHOUT_DRAWOFF",
    formulaText:
      "QW,dis,ls,nom = (1 / 1000) * sum(Psi_j * (thetaW,avg + thetaW,amb,j) * (L + Lequi)_j * t)",
    inputs,
    assumptions: [
      "source_extraction_preserves_visual_plus_sign_between_thetaWavg_and_thetaWamb",
      "operation_time_hours_is_the_explicit_sum_of_tci_intervals"
    ]
  });
}

export function calculateDhwSpecificLinearHeatLoss(input) {
  const { linearTransmittanceWPerMK, thetaWDistributionC, thetaWAmbientC } =
    input ?? {};

  assertFiniteNonNegativeNumber(
    linearTransmittanceWPerMK,
    "linearTransmittanceWPerMK"
  );
  assertFiniteNumber(thetaWDistributionC, "thetaWDistributionC");
  assertFiniteNumber(thetaWAmbientC, "thetaWAmbientC");

  const valueWPerM =
    linearTransmittanceWPerMK * (thetaWDistributionC - thetaWAmbientC);

  return makeResult({
    value: valueWPerM,
    valueKey: "valueWPerM",
    unit: "W/m",
    formulaId: "MC001_3_208_DHW_SPECIFIC_LINEAR_HEAT_LOSS",
    formulaText: "qi = Psi_i * (thetaW - thetaW,amb,j)",
    inputs: { linearTransmittanceWPerMK, thetaWDistributionC, thetaWAmbientC },
    assumptions: ["pipe_transmittance_and_temperatures_are_explicit"]
  });
}

export function calculateDhwExponentialCoefficient(input) {
  const {
    specificLinearHeatLossWPerM,
    pipeLengthM,
    waterSpecificHeatWhPerKgK,
    waterDensityKgPerM3,
    waterVolumeM3,
    pipeSpecificHeatWhPerKgK,
    pipeMassKg,
    nonUseIntervalHours,
    thetaWDistributionC,
    thetaWAmbientC
  } = input ?? {};

  assertFiniteNonNegativeNumber(specificLinearHeatLossWPerM, "specificLinearHeatLossWPerM");
  assertFiniteNonNegativeNumber(pipeLengthM, "pipeLengthM");
  assertFinitePositiveNumber(waterSpecificHeatWhPerKgK, "waterSpecificHeatWhPerKgK");
  assertFinitePositiveNumber(waterDensityKgPerM3, "waterDensityKgPerM3");
  assertFiniteNonNegativeNumber(waterVolumeM3, "waterVolumeM3");
  assertFiniteNonNegativeNumber(pipeSpecificHeatWhPerKgK, "pipeSpecificHeatWhPerKgK");
  assertFiniteNonNegativeNumber(pipeMassKg, "pipeMassKg");
  assertFiniteNonNegativeNumber(nonUseIntervalHours, "nonUseIntervalHours");
  assertFiniteNumber(thetaWDistributionC, "thetaWDistributionC");
  assertFiniteNumber(thetaWAmbientC, "thetaWAmbientC");

  const heatCapacityWhPerK =
    waterSpecificHeatWhPerKgK * waterDensityKgPerM3 * waterVolumeM3 +
    pipeSpecificHeatWhPerKgK * pipeMassKg;
  assertFinitePositiveNumber(heatCapacityWhPerK, "heatCapacityWhPerK");
  const temperatureDifferenceK = thetaWDistributionC - thetaWAmbientC;
  assertPositiveDenominator(
    temperatureDifferenceK,
    "MC001_3_209_DHW_EXPONENTIAL_COEFFICIENT"
  );

  const value =
    ((specificLinearHeatLossWPerM * pipeLengthM) / heatCapacityWhPerK) *
    (nonUseIntervalHours / temperatureDifferenceK);

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_209_DHW_EXPONENTIAL_COEFFICIENT",
    formulaText:
      "Ci = (qi * Li) / (cW * rhoW * Vi + cp * mp,i) * (tatap / (thetaW - thetaW,amb,i))",
    inputs: {
      specificLinearHeatLossWPerM,
      pipeLengthM,
      waterSpecificHeatWhPerKgK,
      waterDensityKgPerM3,
      waterVolumeM3,
      pipeSpecificHeatWhPerKgK,
      pipeMassKg,
      nonUseIntervalHours,
      thetaWDistributionC,
      thetaWAmbientC,
      heatCapacityWhPerK
    },
    assumptions: [
      "heat_capacity_inputs_are_explicit_in_Wh_per_K_for_dimensional_consistency"
    ]
  });
}

export function calculateDhwTemperatureAfterNonUseInterval(input) {
  const {
    thetaWAhC,
    thetaWAverageBeginC,
    thetaWAmbientC,
    exponentialCoefficient
  } = input ?? {};

  assertFiniteNumber(thetaWAhC, "thetaWAhC");
  assertFiniteNumber(thetaWAverageBeginC, "thetaWAverageBeginC");
  assertFiniteNumber(thetaWAmbientC, "thetaWAmbientC");
  assertFiniteNumber(exponentialCoefficient, "exponentialCoefficient");

  const valueC =
    thetaWAhC +
    (thetaWAverageBeginC - thetaWAmbientC) * Math.exp(-exponentialCoefficient);

  return makeResult({
    value: valueC,
    valueKey: "valueC",
    unit: "degC",
    formulaId: "MC001_3_210_DHW_TEMPERATURE_AFTER_NONUSE_INTERVAL",
    formulaText:
      "thetaW,dis,atap,i = thetaW,ah,j + (thetaWavg,begin - thetaW,amb,j) * e^(-Ci)",
    inputs: {
      thetaWAhC,
      thetaWAverageBeginC,
      thetaWAmbientC,
      exponentialCoefficient
    },
    assumptions: ["thetaWAhC_symbol_semantics_are_explicit_input"]
  });
}

export function calculateDhwAverageTemperatureFromProfile(input) {
  const { thetaWAverageBeginC, thetaWAfterNonUseC } = input ?? {};

  assertFiniteNumber(thetaWAverageBeginC, "thetaWAverageBeginC");
  assertFiniteNumber(thetaWAfterNonUseC, "thetaWAfterNonUseC");

  const valueC = (thetaWAverageBeginC + thetaWAfterNonUseC) / 2;

  return makeResult({
    value: valueC,
    valueKey: "valueC",
    unit: "degC",
    formulaId: "MC001_3_211_DHW_AVERAGE_TEMPERATURE_PROFILE",
    formulaText: "thetaW,avg = (thetaWavg,begin + thetaW,dis,atap) / 2",
    inputs: { thetaWAverageBeginC, thetaWAfterNonUseC },
    assumptions: ["consumption_profile_temperature_inputs_are_explicit"]
  });
}

export function calculateDhwAverageTemperatureSimplified(input) {
  const { linearTransmittanceWPerMK } = input ?? {};

  assertFinitePositiveNumber(linearTransmittanceWPerMK, "linearTransmittanceWPerMK");

  const valueC = 25 * linearTransmittanceWPerMK ** -0.2;

  return makeResult({
    value: valueC,
    valueKey: "valueC",
    unit: "degC",
    formulaId: "MC001_3_212_DHW_AVERAGE_TEMPERATURE_SIMPLIFIED",
    formulaText: "thetaW,avg = 25 * Psi^(-0.2)",
    inputs: { linearTransmittanceWPerMK },
    assumptions: ["simplified_hourly_timestep_temperature_method_selected_explicitly"]
  });
}

export function calculateDhwTotalDistributionLoss(input) {
  const {
    distributionLossKWh = 0,
    recirculationNoDrawLossKWh = 0,
    stubLossKWh = 0
  } = input ?? {};

  assertFiniteNonNegativeNumber(distributionLossKWh, "distributionLossKWh");
  assertFiniteNonNegativeNumber(
    recirculationNoDrawLossKWh,
    "recirculationNoDrawLossKWh"
  );
  assertFiniteNonNegativeNumber(stubLossKWh, "stubLossKWh");

  const valueKWh =
    distributionLossKWh + recirculationNoDrawLossKWh + stubLossKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_213_DHW_TOTAL_DISTRIBUTION_LOSS",
    formulaText:
      "QW,dis,ls,total = QW,dis,ls + QW,dis,ls,nom + QW,dis,ls,stub",
    inputs: { distributionLossKWh, recirculationNoDrawLossKWh, stubLossKWh },
    assumptions: ["distribution_loss_components_are_explicit_or_calculated_upstream"]
  });
}

export function calculateDhwRecoverableDistributionLoss(input) {
  const { pipeSegments, operationTimeHours } = input ?? {};

  assertNonEmptyArray(pipeSegments, "pipeSegments");
  assertFiniteNonNegativeNumber(operationTimeHours, "operationTimeHours");
  pipeSegments.forEach((segment, index) =>
    assertPipeLossSegment(segment, `pipeSegments[${index}]`)
  );

  const heatLossRateW = pipeSegments.reduce(
    (sum, segment) => sum + pipeHeatLossRateW(segment),
    0
  );
  const valueKWh = (heatLossRateW * operationTimeHours) / 1000;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_214_DHW_RECOVERABLE_DISTRIBUTION_LOSS",
    formulaText:
      "QW,dis,ls,condispace = (1 / 1000) * sum(Psi_j * (thetaW,mean - thetaW,amb,j) * (Lcondispace + Lequip)_j * t)",
    inputs: { pipeSegments, operationTimeHours },
    assumptions: [
      "pipe_segments_include_only_lengths_crossing_conditioned_spaces"
    ]
  });
}

export function calculateDhwDistributionRecoveryFactor(input) {
  const { recoverableDistributionLossKWh, totalDistributionLossKWh } = input ?? {};

  assertFiniteNonNegativeNumber(
    recoverableDistributionLossKWh,
    "recoverableDistributionLossKWh"
  );
  assertFinitePositiveNumber(totalDistributionLossKWh, "totalDistributionLossKWh");

  const value = recoverableDistributionLossKWh / totalDistributionLossKWh;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_215_DHW_RECOVERY_FACTOR",
    formulaText: "fW,dis,ls,rbl = QW,dis,ls,condispace / QW,dis,ls,total",
    inputs: { recoverableDistributionLossKWh, totalDistributionLossKWh },
    assumptions: ["total_distribution_loss_is_positive"]
  });
}

export function calculateDhwRecoveredDistributionHeat(input) {
  const { recoveryFactor, totalDistributionLossKWh } = input ?? {};

  assertFiniteNonNegativeNumber(recoveryFactor, "recoveryFactor");
  assertFiniteNonNegativeNumber(totalDistributionLossKWh, "totalDistributionLossKWh");

  const valueKWh = recoveryFactor * totalDistributionLossKWh;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_216_DHW_RECOVERED_DISTRIBUTION_HEAT",
    formulaText: "QW,dis,ls,rbl = fW,dis,ls,rbl * QW,dis,ls,total",
    inputs: { recoveryFactor, totalDistributionLossKWh },
    assumptions: ["recovery_destination_is_traced_outside_this_component"]
  });
}

export function calculateDhwInsulatedPipeLinearTransmittance(input) {
  const {
    innerDiameterM,
    outerDiameterM,
    insulationThermalConductivityWPerMK,
    externalHeatTransferCoefficientWPerM2K
  } = input ?? {};

  assertFinitePositiveNumber(innerDiameterM, "innerDiameterM");
  assertFinitePositiveNumber(outerDiameterM, "outerDiameterM");
  assertOuterDiameterGreaterThanInner(innerDiameterM, outerDiameterM);
  assertFinitePositiveNumber(
    insulationThermalConductivityWPerMK,
    "insulationThermalConductivityWPerMK"
  );
  assertFinitePositiveNumber(
    externalHeatTransferCoefficientWPerM2K,
    "externalHeatTransferCoefficientWPerM2K"
  );

  const denominator =
    (1 / (2 * insulationThermalConductivityWPerMK)) *
      Math.log(outerDiameterM / innerDiameterM) +
    1 / (externalHeatTransferCoefficientWPerM2K * outerDiameterM);
  assertPositiveDenominator(
    denominator,
    "MC001_3_201_DHW_LINEAR_TRANSMITTANCE_INSULATED_PIPE"
  );

  const valueWPerMK = Math.PI / denominator;
  const inputs = {
    innerDiameterM,
    outerDiameterM,
    insulationThermalConductivityWPerMK,
    externalHeatTransferCoefficientWPerM2K
  };

  return makeResult({
    value: valueWPerMK,
    valueKey: "valueWPerMK",
    unit: "W/(mK)",
    formulaId: "MC001_3_201_DHW_LINEAR_TRANSMITTANCE_INSULATED_PIPE",
    formulaText:
      "Psi = pi / ((1 / (2 * lambdaD)) * ln(da / di) + 1 / (ha * da))",
    inputs,
    assumptions: ["pipe_geometry_and_heat_transfer_coefficient_are_explicit"]
  });
}

export function calculateDhwPumpDesignPower(input) {
  const { pressureDropKPa, designFlowRateM3PerH } = input ?? {};

  assertFiniteNonNegativeNumber(pressureDropKPa, "pressureDropKPa");
  assertFiniteNonNegativeNumber(designFlowRateM3PerH, "designFlowRateM3PerH");

  const valueKW = (pressureDropKPa * designFlowRateM3PerH) / 3600;

  return makeResult({
    value: valueKW,
    valueKey: "valueKW",
    unit: "kW",
    formulaId: "MC001_3_217_DHW_PUMP_DESIGN_POWER",
    formulaText: "PW,hydr,des = deltaPW,des * VdotW,des / 3600",
    inputs: { pressureDropKPa, designFlowRateM3PerH },
    assumptions: ["pressure_drop_and_design_flow_are_explicit"]
  });
}

export function calculateDhwPressureDrop(input) {
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
    formulaId: "MC001_3_218_DHW_PRESSURE_DROP",
    formulaText: "deltaPW,des = (1 + fcomp) * RW,max * Lmax + deltaPW,add",
    inputs: {
      componentResistanceFactor,
      maxLinearPressureDropKPaPerM,
      maxCircuitLengthM,
      additionalPressureDropKPa
    },
    assumptions: ["hydraulic_inputs_are_explicit_or_sourced_upstream"]
  });
}

export function calculateDhwRecirculationPumpEnergy(input) {
  const {
    pumpDesignPowerKW,
    operationLoadFactor,
    annualOperationTimeHours,
    correctionFactor
  } = input ?? {};

  assertFiniteNonNegativeNumber(pumpDesignPowerKW, "pumpDesignPowerKW");
  assertFiniteNonNegativeNumber(operationLoadFactor, "operationLoadFactor");
  assertFiniteNonNegativeNumber(annualOperationTimeHours, "annualOperationTimeHours");
  assertFiniteNonNegativeNumber(correctionFactor, "correctionFactor");

  const valueKWh =
    pumpDesignPowerKW *
    operationLoadFactor *
    annualOperationTimeHours *
    correctionFactor;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_219_DHW_RECIRCULATION_PUMP_ENERGY",
    formulaText:
      "WW,dis,hydr,an = PW,hydr,des * betaW,dis * tW,op,an * fW,corr",
    inputs: {
      pumpDesignPowerKW,
      operationLoadFactor,
      annualOperationTimeHours,
      correctionFactor
    },
    assumptions: ["pump_operation_factors_are_explicit"]
  });
}

export function calculateDhwAuxiliaryDistributionEnergy(input) {
  const { recirculationPumpEnergyKWh, pumpEnergyUseFactor } = input ?? {};

  assertFiniteNonNegativeNumber(
    recirculationPumpEnergyKWh,
    "recirculationPumpEnergyKWh"
  );
  assertFiniteNonNegativeNumber(pumpEnergyUseFactor, "pumpEnergyUseFactor");

  const valueKWh = recirculationPumpEnergyKWh * pumpEnergyUseFactor;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_220_DHW_AUXILIARY_DISTRIBUTION_ENERGY",
    formulaText: "WW,dis,an = WW,dis,hydr,an * epsilonW,dis",
    inputs: { recirculationPumpEnergyKWh, pumpEnergyUseFactor },
    assumptions: ["pump_energy_use_factor_is_explicit_or_calculated_upstream"]
  });
}

export function calculateDhwPumpEnergyUseFactor(input) {
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
    formulaId: "MC001_3_221_DHW_PUMP_ENERGY_USE_FACTOR",
    formulaText:
      "epsilonW,dis = fW,e * (CP1 + CP2 * betaW,dis^-1) * EEI / 0.25",
    inputs: {
      pumpEfficiencyFactor,
      controlConstantCp1,
      controlConstantCp2,
      operationLoadFactor,
      energyEfficiencyIndex
    },
    assumptions: ["pump_control_constants_and_EEI_are_explicit"]
  });
}

export function calculateDhwPumpEfficiencyFactor(input) {
  const { referencePumpPowerKW, pumpDesignPowerKW } = input ?? {};

  assertFiniteNonNegativeNumber(referencePumpPowerKW, "referencePumpPowerKW");
  assertFinitePositiveNumber(pumpDesignPowerKW, "pumpDesignPowerKW");

  const value = referencePumpPowerKW / pumpDesignPowerKW;

  return makeResult({
    value,
    valueKey: "value",
    unit: "-",
    formulaId: "MC001_3_222_DHW_PUMP_EFFICIENCY_FACTOR",
    formulaText: "fW,e = PW,ref / PW,hydr,des",
    inputs: { referencePumpPowerKW, pumpDesignPowerKW },
    assumptions: ["reference_and_design_pump_power_are_explicit"]
  });
}

export function calculateDhwReferencePumpPower(input) {
  const { pumpDesignPowerKW } = input ?? {};

  assertFiniteNonNegativeNumber(pumpDesignPowerKW, "pumpDesignPowerKW");

  const valueKW =
    (1.7 * pumpDesignPowerKW +
      17 * (1 - Math.exp(-0.3 * pumpDesignPowerKW))) *
    10 ** -3;

  return makeResult({
    value: valueKW,
    valueKey: "valueKW",
    unit: "kW",
    formulaId: "MC001_3_223_DHW_REFERENCE_PUMP_POWER",
    formulaText:
      "PW,ref = (1.7 * PW,hydr,des + 17 * (1 - e^(-0.3 * PW,hydr,des))) * 10^-3",
    inputs: { pumpDesignPowerKW },
    assumptions: ["wet_running_recirculation_pump_applicability_checked_upstream"]
  });
}

export function calculateDhwHeatTracingAuxiliaryEnergy(input) {
  const { protectedPipeDistributionLossKWh } = input ?? {};

  assertFiniteNonNegativeNumber(
    protectedPipeDistributionLossKWh,
    "protectedPipeDistributionLossKWh"
  );

  return makeResult({
    value: protectedPipeDistributionLossKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_224_DHW_HEAT_TRACING_AUXILIARY_ENERGY",
    formulaText: "WW,dis,rib = QW,dis,ls",
    inputs: { protectedPipeDistributionLossKWh },
    assumptions: ["electric_heating_cable_selected_explicitly"]
  });
}

export function calculateDhwHeatTracingProtectedPipeLoss(input) {
  const { pipeSegments, operationTimeHours } = input ?? {};

  assertNonEmptyArray(pipeSegments, "pipeSegments");
  assertFiniteNonNegativeNumber(operationTimeHours, "operationTimeHours");
  pipeSegments.forEach((segment, index) =>
    assertPipeLossSegment(segment, `pipeSegments[${index}]`)
  );

  const heatLossRateW = pipeSegments.reduce(
    (sum, segment) => sum + pipeHeatLossRateW(segment),
    0
  );
  const valueKWh = (heatLossRateW * operationTimeHours) / 1000;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_225_DHW_HEAT_TRACING_PROTECTED_PIPE_LOSS",
    formulaText:
      "QW,dis,ls,rib = (1 / 1000) * sum(Psi_j * (thetaW,mean - thetaW,amb,j) * (L + Lequip)_j * t)",
    inputs: { pipeSegments, operationTimeHours },
    assumptions: [
      "pipe_segments_include_only_lengths_protected_by_electric_heat_tracing"
    ]
  });
}

export function calculateDhwRecoverableAuxiliaryDistributionEnergy(input) {
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
    formulaId: "MC001_3_226_DHW_RECOVERABLE_AUXILIARY_DISTRIBUTION_ENERGY",
    formulaText: "QW,dis,rbl = frbl,dis * WW,dis",
    inputs: { recoverableFraction, distributionAuxiliaryEnergyKWh },
    assumptions: ["recoverable_fraction_is_explicit_or_sourced_upstream"]
  });
}

export function calculateDhwRecoveredAuxiliaryDistributionEnergy(input) {
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
    formulaId: "MC001_3_227_DHW_RECOVERED_AUXILIARY_DISTRIBUTION_ENERGY",
    formulaText: "QW,dis,rvd = frbl,dis * WW,dis",
    inputs: { recoverableFraction, distributionAuxiliaryEnergyKWh },
    assumptions: [
      "MC001_page_266_displays_the_same_multiplier_as_relation_3_226",
      "destination_of_recovered_heat_is_traced_outside_this_component"
    ]
  });
}

export function calculateDhwStorageStandingLossSingleVolume(input) {
  const {
    accessibleStorageVolumeFactor,
    distributionStorageLossFactor,
    storageHeatTransferCoefficientWPerK,
    storageSetpointTemperatureC,
    storageAmbientTemperatureC,
    calculationHours
  } = input ?? {};

  assertFraction(accessibleStorageVolumeFactor, "accessibleStorageVolumeFactor");
  assertFinitePositiveNumber(distributionStorageLossFactor, "distributionStorageLossFactor");
  if (distributionStorageLossFactor > 5) {
    throw new Error("distributionStorageLossFactor must be less than or equal to 5");
  }
  assertFiniteNonNegativeNumber(
    storageHeatTransferCoefficientWPerK,
    "storageHeatTransferCoefficientWPerK"
  );
  assertFiniteNumber(storageSetpointTemperatureC, "storageSetpointTemperatureC");
  assertFiniteNumber(storageAmbientTemperatureC, "storageAmbientTemperatureC");
  assertFiniteNonNegativeNumber(calculationHours, "calculationHours");

  const valueKWh =
    accessibleStorageVolumeFactor *
    distributionStorageLossFactor *
    (storageHeatTransferCoefficientWPerK / 1000) *
    (storageSetpointTemperatureC - storageAmbientTemperatureC) *
    calculationHours;

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh",
    formulaId: "MC001_3_228_DHW_STORAGE_STANDING_LOSS_SINGLE_VOLUME",
    formulaText:
      "Qsto,ls,tot = fsto,bac,acc * fsto,dis,ls * (Hsto,ls / 1000) * (thetaSto,set - thetaSto,amb) * tci",
    inputs: {
      accessibleStorageVolumeFactor,
      distributionStorageLossFactor,
      storageHeatTransferCoefficientWPerK,
      storageSetpointTemperatureC,
      storageAmbientTemperatureC,
      calculationHours
    },
    assumptions: [
      "single_volume_storage_model_selected_explicitly",
      "storage_heat_transfer_coefficient_is_explicit_manufacturer_or_project_input"
    ]
  });
}

export function calculateDhwBuriedPipeLinearTransmittance(input) {
  const {
    innerDiameterM,
    outerDiameterM,
    insulationThermalConductivityWPerMK,
    burialMaterialThermalConductivityWPerMK,
    burialDepthM
  } = input ?? {};

  assertFinitePositiveNumber(innerDiameterM, "innerDiameterM");
  assertFinitePositiveNumber(outerDiameterM, "outerDiameterM");
  assertOuterDiameterGreaterThanInner(innerDiameterM, outerDiameterM);
  assertFinitePositiveNumber(
    insulationThermalConductivityWPerMK,
    "insulationThermalConductivityWPerMK"
  );
  assertFinitePositiveNumber(
    burialMaterialThermalConductivityWPerMK,
    "burialMaterialThermalConductivityWPerMK"
  );
  assertFinitePositiveNumber(burialDepthM, "burialDepthM");

  const burialLogArgument = (4 * burialDepthM) / outerDiameterM;
  assertFinitePositiveNumber(burialLogArgument, "burialLogArgument");

  const denominator =
    (1 / (2 * insulationThermalConductivityWPerMK)) *
      Math.log(outerDiameterM / innerDiameterM) +
    (1 / (2 * burialMaterialThermalConductivityWPerMK)) *
      Math.log(burialLogArgument);
  assertPositiveDenominator(
    denominator,
    "MC001_3_202_DHW_LINEAR_TRANSMITTANCE_BURIED_PIPE"
  );

  const valueWPerMK = Math.PI / denominator;
  const inputs = {
    innerDiameterM,
    outerDiameterM,
    insulationThermalConductivityWPerMK,
    burialMaterialThermalConductivityWPerMK,
    burialDepthM
  };

  return makeResult({
    value: valueWPerMK,
    valueKey: "valueWPerMK",
    unit: "W/(mK)",
    formulaId: "MC001_3_202_DHW_LINEAR_TRANSMITTANCE_BURIED_PIPE",
    formulaText:
      "Psiem = pi / ((1 / (2 * lambdaD)) * ln(da / di) + (1 / (2 * lambdaem)) * ln(4 * z / da))",
    inputs,
    assumptions: ["burial_depth_and_material_conductivity_are_explicit"]
  });
}

export function calculateDhwUninsulatedPipeLinearTransmittance(input) {
  const {
    innerDiameterM,
    outerDiameterM,
    pipeThermalConductivityWPerMK,
    externalHeatTransferCoefficientWPerM2K
  } = input ?? {};

  assertFinitePositiveNumber(innerDiameterM, "innerDiameterM");
  assertFinitePositiveNumber(outerDiameterM, "outerDiameterM");
  assertOuterDiameterGreaterThanInner(innerDiameterM, outerDiameterM);
  assertFinitePositiveNumber(
    pipeThermalConductivityWPerMK,
    "pipeThermalConductivityWPerMK"
  );
  assertFinitePositiveNumber(
    externalHeatTransferCoefficientWPerM2K,
    "externalHeatTransferCoefficientWPerM2K"
  );

  const denominator =
    (1 / (2 * pipeThermalConductivityWPerMK)) *
      Math.log(outerDiameterM / innerDiameterM) +
    1 / (externalHeatTransferCoefficientWPerM2K * outerDiameterM);
  assertPositiveDenominator(
    denominator,
    "MC001_3_203_DHW_LINEAR_TRANSMITTANCE_UNINSULATED_PIPE"
  );

  const valueWPerMK = Math.PI / denominator;
  const inputs = {
    innerDiameterM,
    outerDiameterM,
    pipeThermalConductivityWPerMK,
    externalHeatTransferCoefficientWPerM2K
  };

  return makeResult({
    value: valueWPerMK,
    valueKey: "valueWPerMK",
    unit: "W/(mK)",
    formulaId: "MC001_3_203_DHW_LINEAR_TRANSMITTANCE_UNINSULATED_PIPE",
    formulaText:
      "Psinon = pi / ((1 / (2 * lambdap)) * ln(dp,a / dp,i) + 1 / (ha * dp,a))",
    inputs,
    assumptions: ["uninsulated_pipe_geometry_and_material_are_explicit"]
  });
}

export function calculateDhwUninsulatedPipeApproxLinearTransmittance(input) {
  const { outerDiameterM, externalHeatTransferCoefficientWPerM2K } = input ?? {};

  assertFinitePositiveNumber(outerDiameterM, "outerDiameterM");
  assertFinitePositiveNumber(
    externalHeatTransferCoefficientWPerM2K,
    "externalHeatTransferCoefficientWPerM2K"
  );

  const valueWPerMK =
    externalHeatTransferCoefficientWPerM2K * Math.PI * outerDiameterM;
  const inputs = {
    outerDiameterM,
    externalHeatTransferCoefficientWPerM2K
  };

  return makeResult({
    value: valueWPerMK,
    valueKey: "valueWPerMK",
    unit: "W/(mK)",
    formulaId: "MC001_3_204_DHW_LINEAR_TRANSMITTANCE_UNINSULATED_APPROX",
    formulaText: "Psinon = ha * pi * dp,a",
    inputs,
    assumptions: ["source_explicitly_selected_uninsulated_pipe_approximation"]
  });
}
