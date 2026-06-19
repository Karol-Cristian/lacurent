function assertNumeric(value, name) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${name} must be a numeric value`);
  }
}

function assertPositiveNumber(value, name) {
  assertNumeric(value, name);
  if (value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
}

function assertNonNegativeNumber(value, name) {
  assertNumeric(value, name);
  if (value < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
}

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
}

function hasValue(value) {
  return value !== undefined && value !== null;
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

export function calculateAirflowFromACH(input) {
  const { ach, volumeM3 } = input ?? {};

  assertNonNegativeNumber(ach, "ach");
  assertPositiveNumber(volumeM3, "volumeM3");

  const value = ach * volumeM3;
  const inputs = { ach, volumeM3 };

  return makeResult({
    value,
    unit: "m3/h",
    formulaId: "PHYSICS_AIRFLOW_FROM_ACH",
    formulaText: "qV,m3h = ACH * V",
    inputs,
    assumptions: ["airflow_from_explicit_ach_and_heated_volume"]
  });
}

export function calculateBve(input) {
  const { thetaInt, thetaSupply, thetaExternal } = input ?? {};

  assertNumeric(thetaInt, "thetaInt");
  assertNumeric(thetaSupply, "thetaSupply");
  assertNumeric(thetaExternal, "thetaExternal");

  const denominator = thetaInt - thetaExternal;
  if (denominator === 0) {
    throw new Error("thetaInt - thetaExternal must not be zero");
  }

  const assumptions = [];
  if (thetaSupply === thetaExternal) {
    assumptions.push("supply_air_equals_external_air_bve_expected_1");
  }

  const value = (thetaInt - thetaSupply) / denominator;
  const inputs = { thetaInt, thetaSupply, thetaExternal };

  return makeResult({
    value,
    unit: "-",
    formulaId: "MC001_2_31_BVE",
    formulaText: "bve,k = (thetaInt - thetaSupply,k) / (thetaInt - thetaExternal)",
    inputs,
    assumptions
  });
}

export function calculateBveFromUnconditionedZone(input) {
  const { bztu, source } = input ?? {};

  assertNumeric(bztu, "bztu");

  const warnings = [];
  if (!source) {
    warnings.push("bztu_source_missing");
  }

  const inputs = { bztu, source };

  return makeResult({
    value: bztu,
    unit: "-",
    formulaId: "MC001_2_32_BVE_UNCONDITIONED",
    formulaText: "bve,k = bztu,k",
    inputs,
    warnings,
    assumptions: ["bztu_explicitly_supplied_no_adjacent_zone_factor_invented"]
  });
}

export function calculateVentilationHeatTransferCoefficient(input) {
  const { rhoA, ca, flows } = input ?? {};

  assertPositiveNumber(rhoA, "rhoA");
  assertPositiveNumber(ca, "ca");
  assertArray(flows, "flows");

  const warnings = [];
  const assumptions = [];
  let value = 0;

  flows.forEach((flow, index) => {
    const hasM3h = hasValue(flow?.airflowM3h);
    const hasM3s = hasValue(flow?.airflowM3s);

    if (hasM3h === hasM3s) {
      throw new Error(`flows[${index}] must provide either airflowM3h or airflowM3s, not both`);
    }

    let airflowM3s;
    if (hasM3h) {
      assertNonNegativeNumber(flow.airflowM3h, `flows[${index}].airflowM3h`);
      airflowM3s = flow.airflowM3h / 3600;
      assumptions.push("airflow_m3h_converted_to_m3s");
    } else {
      assertNonNegativeNumber(flow.airflowM3s, `flows[${index}].airflowM3s`);
      airflowM3s = flow.airflowM3s;
    }

    assertNumeric(flow?.bve, `flows[${index}].bve`);

    let fveDyn = flow?.fveDyn;
    if (!hasValue(fveDyn)) {
      fveDyn = 1;
      warnings.push("fve_dyn_missing_defaulted_to_1");
    }
    assertNonNegativeNumber(fveDyn, `flows[${index}].fveDyn`);

    value += rhoA * ca * flow.bve * airflowM3s * fveDyn;
  });

  const inputs = { rhoA, ca, flows };

  return makeResult({
    value,
    unit: "W/K",
    formulaId: "MC001_2_30_HVE",
    formulaText: "Hve = rhoA * ca * sum(bve,k * qV,k * fve,dyn,k)",
    inputs,
    warnings,
    assumptions
  });
}

export function calculateVentilationHeatTransferCoefficientFromAirflowM3h(input) {
  const { airflowM3h, bve, fveDyn } = input ?? {};

  assertNonNegativeNumber(airflowM3h, "airflowM3h");

  const warnings = [];
  const assumptions = [
    "derived_0_34_constant_from_air_density_specific_heat_and_hour_conversion"
  ];

  let resolvedBve = bve;
  if (!hasValue(resolvedBve)) {
    resolvedBve = 1;
    warnings.push("bve_missing_defaulted_to_1_for_derived_helper");
  }
  assertNumeric(resolvedBve, "bve");

  let resolvedFveDyn = fveDyn;
  if (!hasValue(resolvedFveDyn)) {
    resolvedFveDyn = 1;
    warnings.push("fve_dyn_missing_defaulted_to_1");
  }
  assertNonNegativeNumber(resolvedFveDyn, "fveDyn");

  const value = 0.34 * airflowM3h * resolvedBve * resolvedFveDyn;
  const inputs = {
    airflowM3h,
    bve: hasValue(bve) ? bve : null,
    fveDyn: hasValue(fveDyn) ? fveDyn : null
  };

  return makeResult({
    value,
    unit: "W/K",
    formulaId: "PHYSICS_HVE_FROM_AIRFLOW_M3H_DERIVED",
    formulaText: "Hve = 0.34 * airflowM3h * bve * fveDyn",
    inputs,
    warnings,
    assumptions
  });
}

export function calculateMonthlyVentilationTransfer(input) {
  const {
    hve,
    thetaInt,
    thetaExternalMonthly,
    deltaHours,
    thetaExternalMonthlySource
  } = input ?? {};

  assertNonNegativeNumber(hve, "hve");
  assertNumeric(thetaInt, "thetaInt");
  assertNumeric(thetaExternalMonthly, "thetaExternalMonthly");
  assertPositiveNumber(deltaHours, "deltaHours");

  const warnings = [];
  if (!thetaExternalMonthlySource) {
    warnings.push("climate_source_missing_explicit_values_used");
  }

  const value = hve * (thetaInt - thetaExternalMonthly) * deltaHours * 0.001;
  const inputs = {
    hve,
    thetaInt,
    thetaExternalMonthly,
    deltaHours,
    thetaExternalMonthlySource
  };

  return makeResult({
    value,
    unit: "kWh",
    formulaId: "MC001_2_29_Q_VENTILATION_MONTHLY",
    formulaText: "Qve,m = Hve * (thetaInt - thetaExternalMonthly) * deltaTm * 0.001",
    inputs,
    warnings,
    assumptions: ["isolated_monthly_ventilation_transfer_not_qhnd_or_qcnd"]
  });
}
