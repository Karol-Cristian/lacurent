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
  return {
    status: STATUS_CALCULATED,
    value,
    [valueKey]: value,
    unit,
    formulaId,
    inputs,
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
