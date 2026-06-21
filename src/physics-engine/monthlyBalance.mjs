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

function assertMode(mode) {
  if (mode !== undefined && mode !== "heating" && mode !== "cooling") {
    throw new Error('mode must be "heating" or "cooling" when supplied');
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

function assertTwelveMonthlyValues(monthlyValues) {
  if (!Array.isArray(monthlyValues)) {
    throw new Error("monthlyValues must be an array");
  }

  if (monthlyValues.length !== 12) {
    throw new Error("monthlyValues must contain exactly 12 values");
  }

  monthlyValues.forEach((value, index) => {
    assertNonNegativeNumber(value, `monthlyValues[${index}]`);
  });
}

function clampNegativeToZero(value, warnings, warningCode) {
  if (value < 0) {
    warnings.push(warningCode);
    return 0;
  }

  return value;
}

export function calculateMonthlyTotalHeatTransfer(input) {
  const { qtrMonthly, qveMonthly, mode } = input ?? {};

  assertNonNegativeNumber(qtrMonthly, "qtrMonthly");
  assertNonNegativeNumber(qveMonthly, "qveMonthly");
  assertMode(mode);

  const value = qtrMonthly + qveMonthly;
  const inputs = { qtrMonthly, qveMonthly, mode };

  return makeResult({
    value,
    unit: "kWh",
    formulaId: "MC001_MONTHLY_TOTAL_HEAT_TRANSFER",
    formulaText: "Qht = Qtr + Qve",
    inputs,
    assumptions: ["combines_already_calculated_monthly_transmission_and_ventilation"]
  });
}

export function calculateMonthlyTotalGains(input) {
  const { qintMonthly, qsolMonthly, mode } = input ?? {};

  assertNonNegativeNumber(qintMonthly, "qintMonthly");
  assertNonNegativeNumber(qsolMonthly, "qsolMonthly");
  assertMode(mode);

  const value = qintMonthly + qsolMonthly;
  const inputs = { qintMonthly, qsolMonthly, mode };

  return makeResult({
    value,
    unit: "kWh",
    formulaId: "MC001_MONTHLY_TOTAL_GAINS",
    formulaText: "Qgn = Qint + Qsol",
    inputs,
    assumptions: ["combines_explicit_monthly_internal_and_solar_gains"]
  });
}

export function calculateMonthlyHeatingNeed(input) {
  const {
    gammaH,
    qHhtMonthly,
    etaHgnMonthly,
    qHgnMonthly
  } = input ?? {};

  assertNumeric(gammaH, "gammaH");
  assertNonNegativeNumber(qHhtMonthly, "qHhtMonthly");
  assertNumeric(etaHgnMonthly, "etaHgnMonthly");
  assertNonNegativeNumber(qHgnMonthly, "qHgnMonthly");

  const warnings = [];
  const assumptions = [];
  let rawValue;

  if (gammaH <= 0 && qHgnMonthly > 0) {
    rawValue = 0;
    assumptions.push("heating_branch_gamma_non_positive_with_gains");
  } else if (gammaH > 2.0) {
    rawValue = 0;
    assumptions.push("heating_branch_gamma_above_2");
  } else {
    rawValue = qHhtMonthly - etaHgnMonthly * qHgnMonthly;
    assumptions.push("heating_branch_standard_balance");
  }

  const value = clampNegativeToZero(
    rawValue,
    warnings,
    "monthly_heating_need_negative_clamped_to_zero"
  );
  const inputs = { gammaH, qHhtMonthly, etaHgnMonthly, qHgnMonthly };

  return makeResult({
    value,
    unit: "kWh",
    formulaId: "MC001_MONTHLY_HEATING_NEED",
    formulaText: "QHnd = 0 when gammaH <= 0 and QHgn > 0; QHnd = 0 when gammaH > 2.0; otherwise QHnd = QHht - etaHgn * QHgn",
    inputs,
    warnings,
    assumptions
  });
}

export function calculateMonthlyCoolingNeed(input) {
  const {
    gammaC,
    qChtMonthly,
    etaChtMonthly,
    qCgnMonthly,
    aCredMonthly
  } = input ?? {};

  assertNumeric(gammaC, "gammaC");
  if (gammaC === 0) {
    throw new Error("gammaC must not be zero");
  }
  assertNonNegativeNumber(qChtMonthly, "qChtMonthly");
  assertNumeric(etaChtMonthly, "etaChtMonthly");
  assertNonNegativeNumber(qCgnMonthly, "qCgnMonthly");
  assertNonNegativeNumber(aCredMonthly, "aCredMonthly");

  const warnings = [];
  const assumptions = [];
  let rawValue;

  if ((1 / gammaC) > 2.0) {
    rawValue = 0;
    assumptions.push("cooling_branch_inverse_gamma_above_2");
  } else {
    rawValue = aCredMonthly * (qCgnMonthly - etaChtMonthly * qChtMonthly);
    assumptions.push("cooling_branch_standard_balance");
  }

  const value = clampNegativeToZero(
    rawValue,
    warnings,
    "monthly_cooling_need_negative_clamped_to_zero"
  );
  const inputs = {
    gammaC,
    qChtMonthly,
    etaChtMonthly,
    qCgnMonthly,
    aCredMonthly
  };

  return makeResult({
    value,
    unit: "kWh",
    formulaId: "MC001_MONTHLY_COOLING_NEED",
    formulaText: "QCnd = 0 when (1 / gammaC) > 2.0; otherwise QCnd = aCred * (QCgn - etaCht * QCht)",
    inputs,
    warnings,
    assumptions
  });
}

export function calculateAnnualHeatingNeedSum(input) {
  const { monthlyValues } = input ?? {};

  assertTwelveMonthlyValues(monthlyValues);

  const value = monthlyValues.reduce((sum, monthlyValue) => sum + monthlyValue, 0);
  const inputs = { monthlyValues };

  return makeResult({
    value,
    unit: "kWh/an",
    formulaId: "MC001_ANNUAL_HEATING_NEED_SUM",
    formulaText: "QHndAnnual = sum(QHndMonthly)",
    inputs,
    assumptions: ["annual_heating_need_is_sum_of_12_monthly_values"]
  });
}

export function calculateAnnualCoolingNeedSum(input) {
  const { monthlyValues } = input ?? {};

  assertTwelveMonthlyValues(monthlyValues);

  const value = monthlyValues.reduce((sum, monthlyValue) => sum + monthlyValue, 0);
  const inputs = { monthlyValues };

  return makeResult({
    value,
    unit: "kWh/an",
    formulaId: "MC001_ANNUAL_COOLING_NEED_SUM",
    formulaText: "QCndAnnual = sum(QCndMonthly)",
    inputs,
    assumptions: ["annual_cooling_need_is_sum_of_12_monthly_values"]
  });
}
