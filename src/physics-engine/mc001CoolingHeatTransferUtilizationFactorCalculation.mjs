const MODE = "restricted_cooling_etaCht_explicit_v1";
const SCOPE = "restricted_cooling_etaCht_explicit_input_only_not_full_QCnd";
const GAMMA_EQUALITY_TOLERANCE = 1e-12;
const FORMULA_REFERENCES = [
  "MC001_R13_COOLING_UTILIZATION_FACTOR_SOURCE_PACK",
  "MC001_FIGURE_2_15_COOLING_HEAT_TRANSFER_UTILIZATION_FACTOR",
  "MC001_2_56_COOLING_UTILIZATION_PARAMETER",
  "MC001_2_58_COOLING_TIME_CONSTANT"
];
const FORMULA_CODE = "MC001_FIGURE_2_15_COOLING_HEAT_TRANSFER_UTILIZATION_FACTOR";
const METHODOLOGY_LIMITS = [
  "restricted_cooling_only",
  "explicit_input_only",
  "etaCht_only",
  "not_full_QCnd",
  "not_QHnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "no_hidden_defaults",
  "no_default_aC0",
  "no_default_tauC0",
  "no_default_tauC",
  "no_default_capacity",
  "no_default_gains",
  "no_default_solar_data",
  "no_default_schedules"
];
const EXCLUDED_BRANCHES = [
  "heating_QHnd",
  "long_unoccupied_periods",
  "intermittency",
  "final_energy",
  "primary_energy",
  "CO2",
  "certificate"
];
const FORBIDDEN_INPUT_KEYS = new Set([
  "etaCht",
  "annualEtaCht",
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
    return { ok: false, code: "restricted_etaCht_missing_explicit_source" };
  }
  if (!safeNotes(source.notes)) {
    return { ok: false, code: "restricted_etaCht_invalid_source_notes" };
  }
  return { ok: true };
}

function resolveGammaC(inputCase) {
  if (inputCase.gammaC !== undefined && inputCase.gammaC !== null) {
    const gammaC = finiteNumber(inputCase.gammaC);
    if (gammaC === null) {
      return { ok: false, code: "restricted_etaCht_invalid_gammaC" };
    }
    return { ok: true, gammaC };
  }

  if (inputCase.qCgn === undefined || inputCase.qCgn === null ||
    inputCase.qCht === undefined || inputCase.qCht === null) {
    return { ok: false, code: "restricted_etaCht_missing_gammaC_or_heat_balance_pair" };
  }

  const qCht = finiteNumber(inputCase.qCht);
  if (qCht === null || qCht <= 0) {
    return { ok: false, code: "restricted_etaCht_invalid_qCht" };
  }

  const qCgn = finiteNumber(inputCase.qCgn);
  if (qCgn === null || qCgn < 0) {
    return { ok: false, code: "restricted_etaCht_invalid_qCgn" };
  }

  return { ok: true, gammaC: qCgn / qCht };
}

function calculateEtaCht(gammaC, aC) {
  if (gammaC <= 0) {
    return {
      branch: "gammaC_less_or_equal_zero",
      etaCht: 1
    };
  }

  if (Math.abs(gammaC - 1) <= GAMMA_EQUALITY_TOLERANCE) {
    return {
      branch: "gammaC_equals_one",
      etaCht: aC / (aC + 1)
    };
  }

  return {
    branch: "gammaC_not_equal_one",
    etaCht: (1 - gammaC ** (-aC)) / (1 - gammaC ** (-(aC + 1)))
  };
}

function validateCase(inputCase) {
  if (!isPlainObject(inputCase)) {
    return { ok: false, code: "restricted_etaCht_invalid_case" };
  }
  if (hasForbiddenDerivedInput(inputCase)) {
    return { ok: false, code: "restricted_etaCht_client_supplied_derived_result" };
  }
  if (!safeCode(inputCase.caseId, 96)) {
    return { ok: false, code: "restricted_etaCht_invalid_case_id" };
  }

  const source = validateSource(inputCase.source);
  if (!source.ok) return source;

  const aC = finiteNumber(inputCase.aC);
  if (aC === null) {
    return { ok: false, code: "restricted_etaCht_missing_aC" };
  }
  if (aC <= 0) {
    return { ok: false, code: "restricted_etaCht_invalid_aC" };
  }

  const gamma = resolveGammaC(inputCase);
  if (!gamma.ok) return gamma;

  const { branch, etaCht } = calculateEtaCht(gamma.gammaC, aC);
  if (!Number.isFinite(etaCht)) {
    return { ok: false, code: "restricted_etaCht_invalid_result" };
  }
  if (etaCht < 0) {
    return { ok: false, code: "restricted_etaCht_negative_result_outside_cooling_scope" };
  }

  return {
    ok: true,
    value: {
      caseId: inputCase.caseId,
      gammaC: gamma.gammaC,
      aC,
      etaCht,
      branch,
      sourceReference: inputCase.source.reference
    }
  };
}

export function calculateMc001CoolingHeatTransferUtilizationFactor(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("restricted_etaCht_invalid_mode");
  }
  if (hasForbiddenDerivedInput(input)) {
    return blocked("restricted_etaCht_client_supplied_derived_result");
  }
  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    return blocked("restricted_etaCht_missing_cases");
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
