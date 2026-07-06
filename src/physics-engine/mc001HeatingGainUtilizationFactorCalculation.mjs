const MODE = "restricted_heating_etaHgn_explicit_v1";
const SCOPE = "restricted_heating_etaHgn_explicit_input_only_not_full_QHnd";
const GAMMA_EQUALITY_TOLERANCE = 1e-12;
const FORMULA_REFERENCES = [
  "MC001_R8_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_SOURCE_PACK",
  "MC001_2_55_HEATING_UTILIZATION_PARAMETER",
  "MC001_FIGURE_2_14_HEATING_GAIN_UTILIZATION_FACTOR"
];
const FORMULA_CODE = "MC001_FIGURE_2_14_HEATING_GAIN_UTILIZATION_FACTOR";
const METHODOLOGY_LIMITS = [
  "restricted_heating_only",
  "explicit_input_only",
  "etaHgn_only",
  "not_full_QHnd",
  "not_QCnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "no_hidden_defaults",
  "no_default_aH0",
  "no_default_tauH0",
  "no_default_tauH",
  "no_default_capacity",
  "no_default_gains",
  "no_default_solar_data",
  "no_default_schedules"
];
const EXCLUDED_BRANCHES = [
  "gammaH_less_or_equal_zero",
  "gammaH_greater_than_two",
  "cooling_QCnd",
  "long_unoccupied_periods",
  "intermittency"
];
const FORBIDDEN_INPUT_KEYS = new Set([
  "etaHgn",
  "annualEtaHgn",
  "caseResults",
  "summary",
  "result",
  "results",
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
      caseCount: 0
    },
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedBranches: [...EXCLUDED_BRANCHES]
    }
  };
}

function validateSource(source) {
  if (!isPlainObject(source) || !safeCode(source.reference, 96)) {
    return { ok: false, code: "restricted_etaHgn_missing_explicit_source" };
  }
  if (!safeNotes(source.notes)) {
    return { ok: false, code: "restricted_etaHgn_invalid_source_notes" };
  }
  return { ok: true };
}

function resolveGammaH(inputCase) {
  if (inputCase.gammaH !== undefined && inputCase.gammaH !== null) {
    const gammaH = finiteNumber(inputCase.gammaH);
    if (gammaH === null) {
      return { ok: false, code: "restricted_etaHgn_invalid_gammaH" };
    }
    return { ok: true, gammaH };
  }

  if (inputCase.qHgn === undefined || inputCase.qHgn === null ||
    inputCase.qHht === undefined || inputCase.qHht === null) {
    return { ok: false, code: "restricted_etaHgn_missing_gammaH_or_heat_balance_pair" };
  }

  const qHht = finiteNumber(inputCase.qHht);
  if (qHht === null || qHht <= 0) {
    return { ok: false, code: "restricted_etaHgn_invalid_qHht" };
  }

  const qHgn = finiteNumber(inputCase.qHgn);
  if (qHgn === null || qHgn < 0) {
    return { ok: false, code: "restricted_etaHgn_invalid_qHgn" };
  }

  return { ok: true, gammaH: qHgn / qHht };
}

function calculateEtaHgn(gammaH, aH) {
  if (Math.abs(gammaH - 1) <= GAMMA_EQUALITY_TOLERANCE) {
    return {
      branch: "gammaH_equals_one",
      etaHgn: aH / (aH + 1)
    };
  }

  return {
    branch: "gammaH_not_equal_one",
    etaHgn: (1 - gammaH ** aH) / (1 - gammaH ** (aH + 1))
  };
}

function validateCase(inputCase) {
  if (!isPlainObject(inputCase)) {
    return { ok: false, code: "restricted_etaHgn_invalid_case" };
  }
  if (hasForbiddenDerivedInput(inputCase)) {
    return { ok: false, code: "restricted_etaHgn_client_supplied_derived_result" };
  }
  if (!safeCode(inputCase.caseId, 96)) {
    return { ok: false, code: "restricted_etaHgn_invalid_case_id" };
  }

  const source = validateSource(inputCase.source);
  if (!source.ok) return source;

  const aH = finiteNumber(inputCase.aH);
  if (aH === null) {
    return { ok: false, code: "restricted_etaHgn_missing_aH" };
  }
  if (aH <= 0) {
    return { ok: false, code: "restricted_etaHgn_invalid_aH" };
  }

  const gamma = resolveGammaH(inputCase);
  if (!gamma.ok) return gamma;

  if (gamma.gammaH <= 0) {
    return { ok: false, code: "restricted_etaHgn_gammaH_less_or_equal_zero" };
  }
  if (gamma.gammaH > 2) {
    return { ok: false, code: "restricted_etaHgn_gammaH_greater_than_two" };
  }

  const { branch, etaHgn } = calculateEtaHgn(gamma.gammaH, aH);
  if (!Number.isFinite(etaHgn)) {
    return { ok: false, code: "restricted_etaHgn_invalid_result" };
  }
  if (etaHgn < 0) {
    return { ok: false, code: "restricted_etaHgn_negative_result_outside_c7b_scope" };
  }

  return {
    ok: true,
    value: {
      caseId: inputCase.caseId,
      gammaH: gamma.gammaH,
      aH,
      etaHgn,
      branch,
      sourceReference: inputCase.source.reference
    }
  };
}

export function calculateMc001HeatingGainUtilizationFactor(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("restricted_etaHgn_invalid_mode");
  }
  if (hasForbiddenDerivedInput(input)) {
    return blocked("restricted_etaHgn_client_supplied_derived_result");
  }
  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    return blocked("restricted_etaHgn_missing_cases");
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
      caseCount: caseResults.length
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedBranches: [...EXCLUDED_BRANCHES]
    }
  };
}
