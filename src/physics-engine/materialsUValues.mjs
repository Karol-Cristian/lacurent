function assertPositiveNumber(value, name) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
}

function assertNonNegativeNumber(value, name) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
}

function assertNonNegativeNumberArray(values, name) {
  if (!Array.isArray(values)) {
    throw new Error(`${name} must be an array`);
  }

  values.forEach((value, index) => {
    assertNonNegativeNumber(value, `${name}[${index}]`);
  });
}

function makeResult({ value, unit, formulaId, formulaText, inputs, warnings = [], assumptions = [] }) {
  return {
    value,
    unit,
    formulaId,
    inputs,
    warnings,
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

export function calculateLambdaCorrected(input) {
  const {
    lambdaNormat,
    correctionCoefficientA,
    materialId,
    source
  } = input ?? {};

  assertPositiveNumber(lambdaNormat, "lambdaNormat");

  const warnings = [];
  const assumptions = [];
  const hasCorrectionCoefficient =
    correctionCoefficientA !== undefined && correctionCoefficientA !== null;

  if (hasCorrectionCoefficient) {
    assertPositiveNumber(correctionCoefficientA, "correctionCoefficientA");
  } else {
    warnings.push("lambda_correction_coefficient_missing_using_normative_lambda");
    assumptions.push("lambda_normat_used_without_correction_coefficient_a");
  }

  const coefficient = hasCorrectionCoefficient ? correctionCoefficientA : 1;
  const value = coefficient * lambdaNormat;
  const inputs = {
    lambdaNormat,
    correctionCoefficientA: hasCorrectionCoefficient ? correctionCoefficientA : null,
    materialId,
    source
  };

  return makeResult({
    value,
    unit: "W/mK",
    formulaId: "MC001_2_3_LAMBDA_CORRECTED",
    formulaText: "lambda = a * lambda_normat",
    inputs,
    warnings,
    assumptions
  });
}

export function calculateLayerResistance(input) {
  const { thicknessM, lambdaWmK } = input ?? {};

  assertPositiveNumber(thicknessM, "thicknessM");
  assertPositiveNumber(lambdaWmK, "lambdaWmK");

  const value = thicknessM / lambdaWmK;
  const inputs = { thicknessM, lambdaWmK };

  return makeResult({
    value,
    unit: "m2K/W",
    formulaId: "PHYSICS_LAYER_R",
    formulaText: "Rj = dj / lambdaJ",
    inputs
  });
}

export function calculateTotalResistance(input) {
  const {
    rsi,
    layersR,
    airLayersR = [],
    rse
  } = input ?? {};

  assertNonNegativeNumber(rsi, "rsi");
  assertNonNegativeNumber(rse, "rse");
  assertNonNegativeNumberArray(layersR, "layersR");
  assertNonNegativeNumberArray(airLayersR, "airLayersR");

  const layerSum = layersR.reduce((sum, value) => sum + value, 0);
  const airLayerSum = airLayersR.reduce((sum, value) => sum + value, 0);
  const value = rsi + layerSum + airLayerSum + rse;
  const inputs = { rsi, layersR, airLayersR, rse };

  return makeResult({
    value,
    unit: "m2K/W",
    formulaId: "MC001_2_6_R_TOTAL",
    formulaText: "R = Rsi + sum(Rj) + sum(Ra) + Rse",
    inputs,
    assumptions: ["rsi_rse_supplied_by_caller_no_surface_resistance_constants_hardcoded"]
  });
}

export function calculateUValue(input) {
  const { totalResistance } = input ?? {};

  assertPositiveNumber(totalResistance, "totalResistance");

  const warnings = ["plain_U_not_corrected_for_thermal_bridges"];
  const value = 1 / totalResistance;
  const inputs = { totalResistance };

  return makeResult({
    value,
    unit: "W/m2K",
    formulaId: "MC001_2_7_U_VALUE",
    formulaText: "U = 1 / R",
    inputs,
    warnings,
    assumptions: ["plain_u_value_only_thermal_bridges_outside_calculator"]
  });
}
