function assertNumeric(value, name) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${name} must be a numeric value`);
  }
}

function assertNonNegativeNumber(value, name) {
  assertNumeric(value, name);
  if (value < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
}

function assertPositiveNumber(value, name) {
  assertNumeric(value, name);
  if (value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
}

function makeResult({
  value,
  unit,
  formulaId,
  formulaText,
  inputs,
  warnings = [],
  assumptions = []
}) {
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

export function calculateMonthlyTransmissionTransfer(input) {
  const {
    htrExcludingGround,
    hgrAnnual,
    thetaInt,
    thetaExternalMonthly,
    thetaExternalAnnual,
    deltaHours,
    mode,
    climateSource
  } = input ?? {};

  assertNonNegativeNumber(htrExcludingGround, "htrExcludingGround");
  assertNonNegativeNumber(hgrAnnual, "hgrAnnual");
  assertNumeric(thetaInt, "thetaInt");
  assertNumeric(thetaExternalMonthly, "thetaExternalMonthly");
  assertNumeric(thetaExternalAnnual, "thetaExternalAnnual");
  assertPositiveNumber(deltaHours, "deltaHours");

  if (mode !== undefined && mode !== "heating" && mode !== "cooling") {
    throw new Error('mode must be "heating" or "cooling" when supplied');
  }

  const warnings = [];
  if (!climateSource) {
    warnings.push("climate_source_missing_explicit_values_used");
  }

  const value = (
    htrExcludingGround * (thetaInt - thetaExternalMonthly)
    + hgrAnnual * (thetaInt - thetaExternalAnnual)
  ) * 0.001 * deltaHours;

  const inputs = {
    htrExcludingGround,
    hgrAnnual,
    thetaInt,
    thetaExternalMonthly,
    thetaExternalAnnual,
    deltaHours,
    mode,
    climateSource
  };

  return makeResult({
    value,
    unit: "kWh",
    formulaId: "MC001_2_FIG_2_11_MONTHLY_TRANSMISSION_TRANSFER",
    formulaText: "Qtr = (HtrExcludingGround * (thetaInt - thetaExternalMonthly) + HgrAnnual * (thetaInt - thetaExternalAnnual)) * 0.001 * deltaHours",
    inputs,
    warnings,
    assumptions: ["figure_2_11_ground_term_uses_annual_external_temperature"]
  });
}

export function calculateMonthlyTransmissionTransferHeating(input) {
  return calculateMonthlyTransmissionTransfer({
    ...(input ?? {}),
    mode: "heating"
  });
}

export function calculateMonthlyTransmissionTransferCooling(input) {
  return calculateMonthlyTransmissionTransfer({
    ...(input ?? {}),
    mode: "cooling"
  });
}
