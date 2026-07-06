const MODE = "monthly_heat_gains_explicit_v1";
const SCOPE = "monthly_heat_gains_explicit_input_only_not_full_QHnd";
const FORMULA_CODE = "MC001_EXPLICIT_MONTHLY_HEAT_GAINS_SUM";
const FORMULA_REFERENCES = [
  "MC001_R6_GAINS_CAPACITY_TIMECONSTANT_READINESS_SOURCE_PACK",
  "MC001_2_7_2_TOTAL_HEAT_GAINS_AND_INTERNAL_GAINS",
  "MC001_2_7_3_SOLAR_GAINS"
];
const MONTHS = new Set([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
]);
const METHODOLOGY_LIMITS = [
  "explicit_input_only",
  "heat_gains_sum_only",
  "not_full_QHnd",
  "not_QCnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "no_hidden_defaults",
  "no_default_internal_gains",
  "no_default_solar_gains",
  "no_default_occupancy",
  "no_default_schedules",
  "no_default_climate_data",
  "no_default_window_orientation_shading_data"
];
const EXCLUDED_CALCULATIONS = [
  "internal_gains_from_occupancy_or_equipment",
  "solar_gains_from_geometry_or_radiation",
  "utilization_factor",
  "QHnd",
  "QCnd",
  "system_losses",
  "final_energy",
  "primary_energy",
  "CO2",
  "certificate"
];
const FORBIDDEN_INPUT_KEYS = new Set([
  "qHgn",
  "annualQHgn",
  "caseResults",
  "summary",
  "result",
  "results",
  "totalGains",
  "heatGainsResult",
  "formulaCode",
  "formulaReferences"
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
  return Object.entries(value).some(([key, child]) => (
    FORBIDDEN_INPUT_KEYS.has(key) || hasForbiddenDerivedInput(child)
  ));
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
      annualQHgn: 0,
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
    return { ok: false, code: "monthly_heat_gains_missing_explicit_source" };
  }
  if (!safeNotes(source.notes)) {
    return { ok: false, code: "monthly_heat_gains_invalid_source_notes" };
  }
  return { ok: true };
}

function validateCase(inputCase) {
  if (!isPlainObject(inputCase)) {
    return { ok: false, code: "monthly_heat_gains_invalid_case" };
  }
  if (hasForbiddenDerivedInput(inputCase)) {
    return { ok: false, code: "monthly_heat_gains_client_supplied_derived_result" };
  }
  if (!safeCode(inputCase.caseId, 96)) {
    return { ok: false, code: "monthly_heat_gains_invalid_case_id" };
  }
  if (!MONTHS.has(inputCase.month)) {
    return { ok: false, code: "monthly_heat_gains_invalid_month" };
  }

  const source = validateSource(inputCase.source);
  if (!source.ok) return source;

  const internalGains = finiteNumber(inputCase.internalGains);
  if (internalGains === null) {
    return { ok: false, code: "monthly_heat_gains_missing_internal_gains" };
  }
  if (internalGains < 0) {
    return { ok: false, code: "monthly_heat_gains_negative_internal_gains" };
  }

  const solarGains = finiteNumber(inputCase.solarGains);
  if (solarGains === null) {
    return { ok: false, code: "monthly_heat_gains_missing_solar_gains" };
  }
  if (solarGains < 0) {
    return { ok: false, code: "monthly_heat_gains_negative_solar_gains" };
  }

  return {
    ok: true,
    value: {
      caseId: inputCase.caseId,
      month: inputCase.month,
      internalGains,
      solarGains,
      qHgn: internalGains + solarGains,
      sourceReference: inputCase.source.reference
    }
  };
}

export function calculateMc001MonthlyHeatGainsExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("monthly_heat_gains_invalid_mode");
  }
  if (hasForbiddenDerivedInput(input)) {
    return blocked("monthly_heat_gains_client_supplied_derived_result");
  }
  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    return blocked("monthly_heat_gains_missing_cases");
  }

  const caseResults = [];

  for (const inputCase of input.cases) {
    const validation = validateCase(inputCase);
    if (!validation.ok) return blocked(validation.code);
    caseResults.push({
      ...validation.value,
      formulaCode: FORMULA_CODE,
      scope: SCOPE
    });
  }

  return {
    status: "ready",
    scope: SCOPE,
    formulaReferences: [...FORMULA_REFERENCES],
    caseResults,
    summary: {
      annualQHgn: caseResults.reduce((sum, result) => sum + result.qHgn, 0),
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
