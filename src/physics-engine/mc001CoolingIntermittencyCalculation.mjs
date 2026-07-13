const MODE = "cooling_intermittency_explicit_v1";
const SCOPE = "cooling_intermittency_explicit_input_only_not_full_QCnd";
const SOURCE_PACK_CODE =
  "MC001_R14_COOLING_INTERMITTENCY_RELATIONS_2_74_TO_2_75_SOURCE_PACK";
const FORMULA_REFERENCES = [
  SOURCE_PACK_CODE,
  "MC001_R14_RELATION_2_74_COOLING_INTERMITTENCY_REDUCTION_FACTOR",
  "MC001_R14_RELATION_2_75_COOLING_INTERMITTENCY_WEEK_FRACTION"
];
const FORMULA_CODE = "MC001_R14_RELATION_2_74_COOLING_INTERMITTENCY_REDUCTION_FACTOR";
const WEEK_FRACTION_FORMULA_CODE =
  "MC001_R14_RELATION_2_75_COOLING_INTERMITTENCY_WEEK_FRACTION";
const HOURS_PER_WEEK = 24 * 7;
const MINIMUM_WEEKEND_REDUCTION_HOURS = 48;
const METHODOLOGY_LIMITS = [
  "cooling_intermittency_explicit_input_only",
  "cooling_useful_demand_support_only",
  "not_full_QCnd",
  "not_QHnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "no_hidden_defaults",
  "no_default_weekend_reduction_duration",
  "no_default_weekend_repetition_count",
  "no_default_bCredWknd",
  "no_default_schedules",
  "no_default_setpoints",
  "no_system_losses"
];
const EXCLUDED_CALCULATIONS = [
  "heating_QHnd",
  "final_energy",
  "primary_energy",
  "CO2",
  "certificate",
  "system_losses",
  "fan_electricity",
  "air_treatment_energy"
];
const FORBIDDEN_DERIVED_KEYS = new Set([
  "coolingIntermittencyResult",
  "aCred",
  "aCredOrigin",
  "fCredWknd",
  "caseResults",
  "summary",
  "result",
  "formulaCode",
  "formulaReferences",
  "coolingIntermittencyFormulaCode",
  "coolingIntermittencySourcePackCode"
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
    FORBIDDEN_DERIVED_KEYS.has(key) || hasForbiddenDerivedInput(child)
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
    return { ok: false, code: "cooling_intermittency_missing_explicit_source" };
  }
  if (!safeNotes(source.notes)) {
    return { ok: false, code: "cooling_intermittency_invalid_source_notes" };
  }
  return { ok: true };
}

function validateCase(inputCase) {
  if (!isPlainObject(inputCase)) {
    return { ok: false, code: "cooling_intermittency_invalid_case" };
  }
  if (hasForbiddenDerivedInput(inputCase)) {
    return { ok: false, code: "cooling_intermittency_client_supplied_derived_result" };
  }
  if (!safeCode(inputCase.caseId, 96)) {
    return { ok: false, code: "cooling_intermittency_invalid_case_id" };
  }

  const source = validateSource(inputCase.source);
  if (!source.ok) return source;

  const weekendReductionDurationHours = finiteNumber(inputCase.weekendReductionDurationHours);
  const weekendReductionRepetitionCount = finiteNumber(inputCase.weekendReductionRepetitionCount);
  if (weekendReductionDurationHours === null) {
    return { ok: false, code: "cooling_intermittency_missing_weekend_reduction_duration" };
  }
  if (weekendReductionDurationHours < 0 || weekendReductionDurationHours > HOURS_PER_WEEK) {
    return { ok: false, code: "cooling_intermittency_invalid_weekend_reduction_duration" };
  }
  if (weekendReductionRepetitionCount === null) {
    return { ok: false, code: "cooling_intermittency_missing_weekend_repetition_count" };
  }
  if (![0, 1].includes(weekendReductionRepetitionCount)) {
    return { ok: false, code: "cooling_intermittency_invalid_weekend_repetition_count" };
  }

  if (weekendReductionRepetitionCount === 0) {
    if (weekendReductionDurationHours !== 0) {
      return { ok: false, code: "cooling_intermittency_ambiguous_weekend_reduction_inputs" };
    }
    return {
      ok: true,
      value: {
        caseId: inputCase.caseId,
        weekendReductionDurationHours,
        weekendReductionRepetitionCount,
        fCredWknd: 0,
        aCred: 1,
        aCredOrigin: "explicit_no_weekend_reduction",
        branch: "no_weekend_reduction",
        sourceReference: inputCase.source.reference
      }
    };
  }

  if (weekendReductionDurationHours < MINIMUM_WEEKEND_REDUCTION_HOURS) {
    return {
      ok: true,
      value: {
        caseId: inputCase.caseId,
        weekendReductionDurationHours,
        weekendReductionRepetitionCount,
        fCredWknd: 0,
        aCred: 1,
        aCredOrigin: "weekend_reduction_minimum_not_met_no_reduction",
        branch: "weekend_reduction_minimum_not_met",
        sourceReference: inputCase.source.reference
      }
    };
  }

  const bCredWknd = finiteNumber(inputCase.bCredWknd);
  if (bCredWknd === null) {
    return { ok: false, code: "cooling_intermittency_missing_bCredWknd" };
  }
  if (bCredWknd < 0) {
    return { ok: false, code: "cooling_intermittency_invalid_bCredWknd" };
  }

  const fCredWknd = (weekendReductionDurationHours * weekendReductionRepetitionCount) /
    HOURS_PER_WEEK;
  const aCred = (1 - fCredWknd) + bCredWknd * fCredWknd;
  if (!Number.isFinite(fCredWknd) || fCredWknd < 0 || fCredWknd > 1) {
    return { ok: false, code: "cooling_intermittency_invalid_week_fraction_result" };
  }
  if (!Number.isFinite(aCred) || aCred < 0) {
    return { ok: false, code: "cooling_intermittency_invalid_reduction_factor_result" };
  }

  return {
    ok: true,
    value: {
      caseId: inputCase.caseId,
      weekendReductionDurationHours,
      weekendReductionRepetitionCount,
      bCredWknd,
      fCredWknd,
      aCred,
      aCredOrigin: "calculated_from_explicit_weekend_cooling_reduction",
      branch: "weekend_reduction_relation_2_74",
      sourceReference: inputCase.source.reference
    }
  };
}

export function calculateMc001CoolingIntermittencyExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("cooling_intermittency_invalid_mode");
  }
  if (hasForbiddenDerivedInput(input)) {
    return blocked("cooling_intermittency_client_supplied_derived_result");
  }
  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    return blocked("cooling_intermittency_missing_cases");
  }

  const caseResults = [];

  for (const inputCase of input.cases) {
    const validation = validateCase(inputCase);
    if (!validation.ok) return blocked(validation.code);
    caseResults.push({
      ...validation.value,
      formulaCode: FORMULA_CODE,
      weekFractionFormulaCode: WEEK_FRACTION_FORMULA_CODE,
      coolingIntermittencySourcePackCode: SOURCE_PACK_CODE,
      scope: SCOPE
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
