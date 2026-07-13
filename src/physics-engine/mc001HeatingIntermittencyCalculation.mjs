const MODE = "heating_intermittency_explicit_v1";
const SCOPE = "heating_intermittency_explicit_input_only_not_full_QHnd";
const SOURCE_PACK_CODE =
  "MC001_R11_HEATING_INTERMITTENCY_RELATIONS_2_59_TO_2_73_SOURCE_PACK";
const FORMULA_REFERENCES = [
  SOURCE_PACK_CODE,
  "MC001_R11_RELATION_2_59_HEATING_CORRECTED_SETPOINT",
  "MC001_R11_RELATION_2_60_COMBINED_INTERMITTENCY_REDUCTION",
  "MC001_R11_RELATION_2_61_PERIOD_REDUCTION_FACTOR",
  "MC001_R11_RELATION_2_62_PERIOD_TIME_FRACTION",
  "MC001_R11_RELATIONS_2_63_TO_2_65_REDUCED_SETPOINT_RATIO",
  "MC001_R11_RELATIONS_2_66_TO_2_67_FREE_FLOAT_RATIO",
  "MC001_R11_RELATIONS_2_68_TO_2_71_LOW_SETPOINT_DURATION_FRACTION",
  "MC001_R11_RELATIONS_2_72_TO_2_73_MEAN_TEMPERATURE_DIFFERENCE_REDUCTION"
];
const QHHT_FORMULA_CODE =
  "MC001_R11_HEATING_INTERMITTENCY_QHHT_FROM_CORRECTED_SETPOINT";
const PERIOD_IDS = ["day", "night", "wknd"];
const METHODOLOGY_LIMITS = [
  "heating_intermittency_explicit_input_only",
  "heating_useful_demand_support_only",
  "not_full_QHnd",
  "not_QCnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "no_hidden_defaults",
  "no_default_schedules",
  "no_default_setpoints",
  "no_default_durations",
  "no_default_occupancy",
  "no_system_losses"
];
const EXCLUDED_CALCULATIONS = [
  "cooling_QCnd",
  "final_energy",
  "primary_energy",
  "CO2",
  "certificate",
  "system_losses",
  "fan_electricity",
  "air_treatment_energy"
];
const FORBIDDEN_DERIVED_KEYS = new Set([
  "heatingIntermittencyResult",
  "qHht",
  "qHhtOrigin",
  "thetaIntCalcH",
  "aHred",
  "periodResults",
  "caseResults",
  "summary",
  "result",
  "formulaCode",
  "formulaReferences",
  "heatingIntermittencyFormulaCode",
  "heatingIntermittencySourcePackCode"
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeCode(value, maxLength = 96) {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[a-zA-Z0-9_.:-]+$/.test(value);
}

function safeNotes(value) {
  return value === undefined ||
    (
      typeof value === "string" &&
      value.length <= 160 &&
      !/[<>{}]/.test(value)
    );
}

function hasInputValue(value, key) {
  return value[key] !== undefined && value[key] !== null;
}

function hasForbiddenDerivedInput(value) {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(hasForbiddenDerivedInput);
  }
  if (!isPlainObject(value)) {
    return true;
  }
  return Object.entries(value).some(([key, child]) =>
    FORBIDDEN_DERIVED_KEYS.has(key) || hasForbiddenDerivedInput(child)
  );
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function blocked(code) {
  return {
    status: "blocked",
    scope: SCOPE,
    formulaReferences: [...FORMULA_REFERENCES],
    caseResults: [],
    summary: {
      caseCount: 0
    },
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedCalculations: [...EXCLUDED_CALCULATIONS]
    }
  };
}

function validateSource(source) {
  if (!isPlainObject(source) || !safeCode(source.reference, 96)) {
    return { ok: false, code: "heating_intermittency_missing_explicit_source" };
  }
  if (!safeNotes(source.notes)) {
    return { ok: false, code: "heating_intermittency_invalid_source_notes" };
  }
  return { ok: true };
}

function validateFinitePositive(value, codeMissing, codeInvalid) {
  const number = finiteNumber(value);
  if (number === null) {
    return { ok: false, code: codeMissing };
  }
  if (number <= 0) {
    return { ok: false, code: codeInvalid };
  }
  return { ok: true, value: number };
}

function validateReductionPeriods(periods) {
  if (!Array.isArray(periods) || periods.length !== PERIOD_IDS.length) {
    return { ok: false, code: "missing_explicit_heating_intermittency_periods" };
  }
  const ids = new Set();
  for (const period of periods) {
    if (!isPlainObject(period) || !PERIOD_IDS.includes(period.periodId)) {
      return { ok: false, code: "invalid_heating_intermittency_period_identifier" };
    }
    if (ids.has(period.periodId)) {
      return { ok: false, code: "duplicate_heating_intermittency_period_identifier" };
    }
    ids.add(period.periodId);
  }
  if (ids.size !== PERIOD_IDS.length) {
    return { ok: false, code: "missing_explicit_heating_intermittency_periods" };
  }
  return { ok: true };
}

function dThetaSetLowForPeriod(period, thetaIntSetH, thetaExternal) {
  const thetaIntSetHLow = finiteNumber(period.thetaIntSetHLow);
  if (thetaIntSetHLow === null) {
    return { ok: false, code: "missing_explicit_heating_low_setpoint" };
  }
  const normalDelta = thetaIntSetH - thetaExternal;
  const lowDelta = thetaIntSetHLow - thetaExternal;
  if (normalDelta <= 0) {
    return {
      ok: true,
      value: {
        thetaIntSetHLow,
        dThetaSetLow: 1,
        dThetaSetLowBranch: "relation_2_63_no_heating_temperature_difference",
        dThetaSetLowFormulaCode: "MC001_R11_RELATION_2_63_REDUCED_SETPOINT_RATIO_NO_HEATING"
      }
    };
  }
  if (lowDelta <= 0) {
    return {
      ok: true,
      value: {
        thetaIntSetHLow,
        dThetaSetLow: 0,
        dThetaSetLowBranch: "relation_2_64_low_setpoint_below_exterior",
        dThetaSetLowFormulaCode:
          "MC001_R11_RELATION_2_64_REDUCED_SETPOINT_RATIO_LOW_BELOW_EXTERIOR"
      }
    };
  }
  return {
    ok: true,
    value: {
      thetaIntSetHLow,
      dThetaSetLow: lowDelta / normalDelta,
      dThetaSetLowBranch: "relation_2_65_low_setpoint_ratio",
      dThetaSetLowFormulaCode: "MC001_R11_RELATION_2_65_REDUCED_SETPOINT_RATIO"
    }
  };
}

function dThetaFloatForCase(inputCase, values) {
  const normalDelta = values.thetaIntSetH - values.thetaExternal;
  if (normalDelta <= 0) {
    return {
      ok: true,
      value: {
        dThetaFloat: 1,
        dThetaFloatBranch: "relation_2_67_no_heating_temperature_difference",
        dThetaFloatFormulaCode: "MC001_R11_RELATION_2_67_FREE_FLOAT_RATIO_FROM_GAINS"
      }
    };
  }

  if (hasInputValue(inputCase, "thetaIntFloat")) {
    const thetaIntFloat = finiteNumber(inputCase.thetaIntFloat);
    if (thetaIntFloat === null) {
      return { ok: false, code: "invalid_explicit_heating_float_temperature" };
    }
    const raw = (thetaIntFloat - values.thetaExternal) / normalDelta;
    if (!Number.isFinite(raw)) {
      return { ok: false, code: "invalid_heating_intermittency_float_ratio" };
    }
    return {
      ok: true,
      value: {
        thetaIntFloat,
        dThetaFloat: Math.min(1, Math.max(0, raw)),
        dThetaFloatBranch: "relation_2_66_explicit_float_temperature_ratio",
        dThetaFloatFormulaCode:
          "MC001_R11_RELATION_2_66_FREE_FLOAT_RATIO_FROM_EXPLICIT_TEMPERATURE"
      }
    };
  }

  const denominator = (values.transmissionHeatTransferCoefficientWK +
      values.ventilationHeatTransferCoefficientWK) *
    normalDelta *
    values.calculationDurationHours;
  if (denominator <= 0) {
    return { ok: false, code: "invalid_heating_intermittency_float_ratio_denominator" };
  }
  const raw = (values.qHgn * 1000) / denominator;
  if (!Number.isFinite(raw)) {
    return { ok: false, code: "invalid_heating_intermittency_float_ratio" };
  }
  return {
    ok: true,
    value: {
      dThetaFloat: Math.min(1, Math.max(0, raw)),
      dThetaFloatBranch: "relation_2_67_free_float_ratio_from_explicit_gains",
      dThetaFloatFormulaCode: "MC001_R11_RELATION_2_67_FREE_FLOAT_RATIO_FROM_GAINS"
    }
  };
}

function calculatePeriod(period, values, dThetaFloatResult) {
  const reductionDurationHours = finiteNumber(period.reductionDurationHours);
  if (reductionDurationHours === null) {
    return { ok: false, code: "missing_explicit_heating_reduction_duration" };
  }
  if (reductionDurationHours < 0) {
    return { ok: false, code: "invalid_explicit_heating_reduction_duration" };
  }
  const repetitionCount = finiteNumber(period.repetitionCount);
  if (repetitionCount === null) {
    return { ok: false, code: "missing_explicit_heating_reduction_repetition_count" };
  }
  if (repetitionCount < 0) {
    return { ok: false, code: "invalid_explicit_heating_reduction_repetition_count" };
  }
  const dThetaSetLow = dThetaSetLowForPeriod(period, values.thetaIntSetH, values.thetaExternal);
  if (!dThetaSetLow.ok) return dThetaSetLow;

  const fHred = (reductionDurationHours * repetitionCount) / (24 * 7);
  if (!Number.isFinite(fHred) || fHred < 0 || fHred > 1) {
    return { ok: false, code: "invalid_heating_intermittency_time_fraction" };
  }
  if (fHred === 0) {
    return {
      ok: true,
      value: {
        periodId: period.periodId,
        thetaIntSetHLow: dThetaSetLow.value.thetaIntSetHLow,
        reductionDurationHours,
        repetitionCount,
        fHred,
        dThetaSetLow: dThetaSetLow.value.dThetaSetLow,
        dThetaSetLowBranch: dThetaSetLow.value.dThetaSetLowBranch,
        dThetaSetLowFormulaCode: dThetaSetLow.value.dThetaSetLowFormulaCode,
        dThetaFloat: dThetaFloatResult.dThetaFloat,
        dThetaFloatBranch: dThetaFloatResult.dThetaFloatBranch,
        dThetaFloatFormulaCode: dThetaFloatResult.dThetaFloatFormulaCode,
        dThetaRedMean: 1,
        aHredPeriod: 1,
        fHredFormulaCode: "MC001_R11_RELATION_2_62_PERIOD_TIME_FRACTION",
        aHredPeriodFormulaCode: "MC001_R11_RELATION_2_61_PERIOD_REDUCTION_FACTOR",
        periodBranch: "explicit_zero_reduction_time"
      }
    };
  }

  const durationOverTau = reductionDurationHours / values.tauH;
  if (!Number.isFinite(durationOverTau) || durationOverTau <= 0) {
    return { ok: false, code: "invalid_heating_intermittency_duration_tau_ratio" };
  }

  let fHredLow;
  let fHredLowBranch;
  let fHredLowFormulaCode;
  let deltaTimeLowOverTau;
  if (period.heatingOff === true ||
      dThetaSetLow.value.dThetaSetLow - dThetaFloatResult.dThetaFloat <= 0) {
    fHredLow = 1;
    fHredLowBranch = "relation_2_68_low_setpoint_reached_or_heating_off";
    fHredLowFormulaCode = "MC001_R11_RELATION_2_68_LOW_SETPOINT_DURATION_FULL";
  } else if (dThetaFloatResult.dThetaFloat === 1) {
    fHredLow = 0;
    fHredLowBranch = "relation_2_69_free_float_equals_normal_setpoint";
    fHredLowFormulaCode = "MC001_R11_RELATION_2_69_LOW_SETPOINT_DURATION_ZERO";
  } else {
    const logArgument = (
      dThetaSetLow.value.dThetaSetLow - dThetaFloatResult.dThetaFloat
    ) / (1 - dThetaFloatResult.dThetaFloat);
    if (!Number.isFinite(logArgument) || logArgument <= 0) {
      return { ok: false, code: "invalid_heating_intermittency_low_duration_log_argument" };
    }
    deltaTimeLowOverTau = -Math.log(logArgument);
    if (!Number.isFinite(deltaTimeLowOverTau) || deltaTimeLowOverTau < 0) {
      return { ok: false, code: "invalid_heating_intermittency_low_duration_result" };
    }
    fHredLow = deltaTimeLowOverTau / durationOverTau;
    fHredLowBranch = "relation_2_70_low_setpoint_duration_fraction";
    fHredLowFormulaCode = "MC001_R11_RELATION_2_70_LOW_SETPOINT_DURATION_FRACTION";
  }
  if (!Number.isFinite(fHredLow)) {
    return { ok: false, code: "invalid_heating_intermittency_low_duration_fraction" };
  }

  let dThetaRedMean;
  let dThetaRedMeanBranch;
  let dThetaRedMeanFormulaCode;
  if (fHredLow >= 1) {
    dThetaRedMean = dThetaFloatResult.dThetaFloat +
      ((1 - dThetaFloatResult.dThetaFloat) / durationOverTau) *
        (1 - Math.exp(-durationOverTau));
    dThetaRedMeanBranch = "relation_2_72_low_setpoint_not_reached_within_period";
    dThetaRedMeanFormulaCode =
      "MC001_R11_RELATION_2_72_MEAN_TEMPERATURE_DIFFERENCE_REDUCTION_FULL";
  } else {
    dThetaRedMean = ((1 - dThetaSetLow.value.dThetaSetLow) / durationOverTau) +
      (fHredLow * dThetaFloatResult.dThetaFloat) +
      ((1 - fHredLow) * dThetaSetLow.value.dThetaSetLow);
    dThetaRedMeanBranch = "relation_2_73_low_setpoint_reached_within_period";
    dThetaRedMeanFormulaCode =
      "MC001_R11_RELATION_2_73_MEAN_TEMPERATURE_DIFFERENCE_REDUCTION_PARTIAL";
  }
  if (!Number.isFinite(dThetaRedMean) || dThetaRedMean < 0) {
    return { ok: false, code: "invalid_heating_intermittency_mean_reduction_result" };
  }

  const aHredPeriod = 1 - fHred + (fHred * dThetaRedMean);
  if (!Number.isFinite(aHredPeriod) || aHredPeriod < 0 || aHredPeriod > 1) {
    return { ok: false, code: "invalid_heating_intermittency_period_reduction_factor" };
  }

  return {
    ok: true,
    value: {
      periodId: period.periodId,
      thetaIntSetHLow: dThetaSetLow.value.thetaIntSetHLow,
      reductionDurationHours,
      repetitionCount,
      heatingOff: period.heatingOff === true,
      fHred,
      dThetaSetLow: dThetaSetLow.value.dThetaSetLow,
      dThetaSetLowBranch: dThetaSetLow.value.dThetaSetLowBranch,
      dThetaSetLowFormulaCode: dThetaSetLow.value.dThetaSetLowFormulaCode,
      dThetaFloat: dThetaFloatResult.dThetaFloat,
      dThetaFloatBranch: dThetaFloatResult.dThetaFloatBranch,
      dThetaFloatFormulaCode: dThetaFloatResult.dThetaFloatFormulaCode,
      durationOverTau,
      ...(deltaTimeLowOverTau === undefined ? {} : { deltaTimeLowOverTau }),
      fHredLow,
      fHredLowBranch,
      fHredLowFormulaCode,
      dThetaRedMean,
      dThetaRedMeanBranch,
      dThetaRedMeanFormulaCode,
      aHredPeriod,
      fHredFormulaCode: "MC001_R11_RELATION_2_62_PERIOD_TIME_FRACTION",
      aHredPeriodFormulaCode: "MC001_R11_RELATION_2_61_PERIOD_REDUCTION_FACTOR"
    }
  };
}

function validateCase(inputCase) {
  if (!isPlainObject(inputCase)) {
    return { ok: false, code: "heating_intermittency_invalid_case" };
  }
  if (hasForbiddenDerivedInput(inputCase)) {
    return { ok: false, code: "heating_intermittency_client_supplied_derived_result" };
  }
  if (!safeCode(inputCase.caseId, 96)) {
    return { ok: false, code: "heating_intermittency_invalid_case_id" };
  }
  const source = validateSource(inputCase.source);
  if (!source.ok) return source;

  const thetaIntSetH = finiteNumber(inputCase.thetaIntSetH);
  if (thetaIntSetH === null) {
    return { ok: false, code: "missing_explicit_heating_normal_setpoint" };
  }
  const thetaExternal = finiteNumber(inputCase.thetaExternal);
  if (thetaExternal === null) {
    return { ok: false, code: "missing_explicit_heating_external_temperature" };
  }
  const qHgn = finiteNumber(inputCase.qHgn);
  if (qHgn === null) {
    return { ok: false, code: "missing_explicit_heating_gains_for_intermittency" };
  }
  if (qHgn < 0) {
    return { ok: false, code: "invalid_explicit_heating_gains_for_intermittency" };
  }

  const transmission = validateFinitePositive(
    inputCase.transmissionHeatTransferCoefficientWK,
    "missing_explicit_heating_transmission_coefficient_for_intermittency",
    "invalid_explicit_heating_transmission_coefficient_for_intermittency"
  );
  if (!transmission.ok) return transmission;
  const ventilation = validateFinitePositive(
    inputCase.ventilationHeatTransferCoefficientWK,
    "missing_explicit_heating_ventilation_coefficient_for_intermittency",
    "invalid_explicit_heating_ventilation_coefficient_for_intermittency"
  );
  if (!ventilation.ok) return ventilation;
  const duration = validateFinitePositive(
    inputCase.calculationDurationHours,
    "missing_explicit_heating_duration_for_intermittency",
    "invalid_explicit_heating_duration_for_intermittency"
  );
  if (!duration.ok) return duration;
  const tauH = validateFinitePositive(
    inputCase.tauH,
    "missing_explicit_tauH_for_intermittency",
    "invalid_explicit_tauH_for_intermittency"
  );
  if (!tauH.ok) return tauH;
  const periods = validateReductionPeriods(inputCase.reductionPeriods);
  if (!periods.ok) return periods;

  const values = {
    thetaIntSetH,
    thetaExternal,
    qHgn,
    transmissionHeatTransferCoefficientWK: transmission.value,
    ventilationHeatTransferCoefficientWK: ventilation.value,
    calculationDurationHours: duration.value,
    tauH: tauH.value
  };
  const dThetaFloat = dThetaFloatForCase(inputCase, values);
  if (!dThetaFloat.ok) return dThetaFloat;

  const byId = new Map(inputCase.reductionPeriods.map((period) => [period.periodId, period]));
  const periodResults = [];
  for (const periodId of PERIOD_IDS) {
    const period = calculatePeriod(byId.get(periodId), values, dThetaFloat.value);
    if (!period.ok) return period;
    periodResults.push(period.value);
  }

  const byPeriod = new Map(periodResults.map((period) => [period.periodId, period]));
  const aHred = 1 -
    (1 - byPeriod.get("day").aHredPeriod) -
    (1 - byPeriod.get("night").aHredPeriod) -
    (1 - byPeriod.get("wknd").aHredPeriod);
  if (!Number.isFinite(aHred) || aHred < 0 || aHred > 1) {
    return { ok: false, code: "invalid_heating_intermittency_combined_reduction_factor" };
  }

  const thetaIntCalcH = aHred * (thetaIntSetH - thetaExternal) + thetaExternal;
  if (!Number.isFinite(thetaIntCalcH)) {
    return { ok: false, code: "invalid_heating_intermittency_corrected_setpoint" };
  }
  const totalHeatTransferCoefficientWK = transmission.value + ventilation.value;
  const qHht = totalHeatTransferCoefficientWK *
    Math.max(0, thetaIntCalcH - thetaExternal) *
    duration.value /
    1000;
  if (!Number.isFinite(qHht) || qHht < 0) {
    return { ok: false, code: "invalid_heating_intermittency_QHht_result" };
  }

  return {
    ok: true,
    value: {
      caseId: inputCase.caseId,
      qHgn,
      thetaIntSetH,
      thetaExternal,
      transmissionHeatTransferCoefficientWK: transmission.value,
      ventilationHeatTransferCoefficientWK: ventilation.value,
      totalHeatTransferCoefficientWK,
      calculationDurationHours: duration.value,
      tauH: tauH.value,
      ...(dThetaFloat.value.thetaIntFloat === undefined
        ? {}
        : { thetaIntFloat: dThetaFloat.value.thetaIntFloat }),
      dThetaFloat: dThetaFloat.value.dThetaFloat,
      dThetaFloatBranch: dThetaFloat.value.dThetaFloatBranch,
      dThetaFloatFormulaCode: dThetaFloat.value.dThetaFloatFormulaCode,
      periodResults,
      aHred,
      aHredFormulaCode: "MC001_R11_RELATION_2_60_COMBINED_INTERMITTENCY_REDUCTION",
      thetaIntCalcH,
      thetaIntCalcHFormulaCode: "MC001_R11_RELATION_2_59_HEATING_CORRECTED_SETPOINT",
      qHht,
      qHhtOrigin: "calculated_from_explicit_heating_intermittency_correction",
      qHhtSourceScope: SCOPE,
      qHhtSourceSymbol: "QH;ht;ztc;m",
      heatingIntermittencyFormulaCode: QHHT_FORMULA_CODE,
      heatingIntermittencySourcePackCode: SOURCE_PACK_CODE,
      sourceReference: inputCase.source.reference,
      scope: SCOPE
    }
  };
}

export function calculateMc001HeatingIntermittencyExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("heating_intermittency_invalid_mode");
  }
  if (hasForbiddenDerivedInput(input)) {
    return blocked("heating_intermittency_client_supplied_derived_result");
  }
  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    return blocked("missing_heating_intermittency_cases");
  }

  const caseResults = [];
  for (const inputCase of input.cases) {
    const result = validateCase(inputCase);
    if (!result.ok) {
      return blocked(result.code);
    }
    caseResults.push({
      ...result.value,
      formulaCode: QHHT_FORMULA_CODE
    });
  }

  return {
    status: "ready",
    scope: SCOPE,
    formulaReferences: [...FORMULA_REFERENCES],
    caseResults,
    summary: {
      caseCount: caseResults.length
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedCalculations: [...EXCLUDED_CALCULATIONS]
    }
  };
}
