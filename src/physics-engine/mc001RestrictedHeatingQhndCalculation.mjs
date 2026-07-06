import { calculateMc001HeatingGainUtilizationFactor } from "./mc001HeatingGainUtilizationFactorCalculation.mjs";

const MODE = "restricted_heating_qhnd_explicit_v1";
const SCOPE = "restricted_heating_qhnd_explicit_input_only_not_full_mc001";
const FORMULA_REFERENCES = [
  "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH"
];
const FORMULA_CODE = "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH";
const ALLOWED_MONTHS = [
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
];
const METHODOLOGY_LIMITS = [
  "restricted_heating_only",
  "explicit_input_only",
  "not_full_QHnd",
  "not_QCnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "no_system_losses",
  "no_long_unoccupied_periods",
  "no_hidden_defaults",
  "etaHgn_calculated_from_explicit_aH_when_etaHgn_missing",
  "no_default_aH0",
  "no_default_tauH0",
  "no_default_tauH",
  "no_default_capacity"
];
const EXCLUDED_BRANCHES = [
  "gammaH_less_or_equal_zero",
  "gammaH_greater_than_two",
  "cooling_QCnd",
  "long_unoccupied_periods",
  "intermittency"
];
const FORBIDDEN_INPUT_KEYS = new Set([
  "restrictedHeatingQhndResult",
  "qHnd",
  "annualQHnd",
  "caseResults",
  "summary",
  "result",
  "results",
  "etaHgnOrigin",
  "etaHgnFormulaCode",
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
      annualQHnd: 0,
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
    return { ok: false, code: "restricted_qhnd_missing_explicit_source" };
  }
  if (!safeNotes(source.notes)) {
    return { ok: false, code: "restricted_qhnd_invalid_source_notes" };
  }
  return { ok: true };
}

function hasInputValue(inputCase, key) {
  return inputCase[key] !== undefined && inputCase[key] !== null;
}

function calculateEtaHgnFromExplicitAH(inputCase) {
  const etaResult = calculateMc001HeatingGainUtilizationFactor({
    mode: "restricted_heating_etaHgn_explicit_v1",
    cases: [
      {
        caseId: inputCase.caseId,
        gammaH: hasInputValue(inputCase, "gammaH") ? inputCase.gammaH : undefined,
        qHgn: inputCase.qHgn,
        qHht: inputCase.qHht,
        aH: inputCase.aH,
        source: {
          reference: inputCase.source.reference,
          notes: inputCase.source.notes
        }
      }
    ]
  });

  if (etaResult.status !== "ready" || etaResult.caseResults.length !== 1) {
    const etaCode = etaResult.diagnostics?.blockers?.[0]?.code || "unknown_etaHgn_blocker";
    return {
      ok: false,
      code: `restricted_qhnd_etaHgn_calculation_failed_${etaCode}`
    };
  }

  return {
    ok: true,
    value: etaResult.caseResults[0]
  };
}

function validateCase(inputCase) {
  if (!isPlainObject(inputCase)) {
    return { ok: false, code: "restricted_qhnd_invalid_case" };
  }
  if (hasForbiddenDerivedInput(inputCase)) {
    return { ok: false, code: "restricted_qhnd_client_supplied_derived_result" };
  }
  if (!safeCode(inputCase.caseId, 96)) {
    return { ok: false, code: "restricted_qhnd_invalid_case_id" };
  }
  if (!ALLOWED_MONTHS.includes(inputCase.month)) {
    return { ok: false, code: "restricted_qhnd_invalid_month" };
  }
  const source = validateSource(inputCase.source);
  if (!source.ok) return source;

  const qHht = finiteNumber(inputCase.qHht);
  if (qHht === null || qHht <= 0) {
    return { ok: false, code: "restricted_qhnd_invalid_qHht" };
  }
  const qHgn = finiteNumber(inputCase.qHgn);
  if (qHgn === null || qHgn < 0) {
    return { ok: false, code: "restricted_qhnd_invalid_qHgn" };
  }
  const gammaH = inputCase.gammaH === undefined || inputCase.gammaH === null
    ? qHgn / qHht
    : finiteNumber(inputCase.gammaH);
  if (gammaH === null || gammaH <= 0) {
    return { ok: false, code: "restricted_qhnd_gammaH_less_or_equal_zero" };
  }
  if (gammaH > 2) {
    return { ok: false, code: "restricted_qhnd_gammaH_greater_than_two" };
  }

  const hasEtaHgn = hasInputValue(inputCase, "etaHgn");
  const hasAH = hasInputValue(inputCase, "aH");
  if (hasEtaHgn && hasAH) {
    return { ok: false, code: "etaHgn_and_aH_are_mutually_exclusive_in_c7c" };
  }
  if (!hasEtaHgn && !hasAH) {
    return { ok: false, code: "etaHgn_or_aH_required" };
  }

  let etaHgn;
  let etaHgnOrigin;
  let aH;
  let etaHgnFormulaCode;

  if (hasEtaHgn) {
    etaHgn = finiteNumber(inputCase.etaHgn);
    if (etaHgn === null) {
      return { ok: false, code: "restricted_qhnd_missing_etaHgn" };
    }
    if (etaHgn < 0) {
      return { ok: false, code: "restricted_qhnd_invalid_etaHgn" };
    }
    etaHgnOrigin = "explicit_input";
  } else {
    aH = finiteNumber(inputCase.aH);
    if (aH === null) {
      return { ok: false, code: "restricted_qhnd_missing_aH" };
    }
    if (aH <= 0) {
      return { ok: false, code: "restricted_qhnd_invalid_aH" };
    }
    const calculatedEta = calculateEtaHgnFromExplicitAH(inputCase);
    if (!calculatedEta.ok) return calculatedEta;
    etaHgn = calculatedEta.value.etaHgn;
    aH = calculatedEta.value.aH;
    etaHgnFormulaCode = calculatedEta.value.formulaCode;
    etaHgnOrigin = "calculated_from_explicit_aH";
  }

  const qHnd = qHht - etaHgn * qHgn;
  if (!Number.isFinite(qHnd)) {
    return { ok: false, code: "restricted_qhnd_invalid_result" };
  }
  if (qHnd < 0) {
    return { ok: false, code: "restricted_qhnd_negative_result_outside_c6f_scope" };
  }
  return {
    ok: true,
    value: {
      caseId: inputCase.caseId,
      month: inputCase.month,
      qHht,
      qHgn,
      gammaH,
      etaHgn,
      etaHgnOrigin,
      ...(aH === undefined ? {} : { aH }),
      ...(etaHgnFormulaCode === undefined ? {} : { etaHgnFormulaCode }),
      qHnd,
      sourceReference: inputCase.source.reference
    }
  };
}

export function calculateMc001RestrictedHeatingQhndExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("restricted_qhnd_invalid_mode");
  }
  if (hasForbiddenDerivedInput(input)) {
    return blocked("restricted_qhnd_client_supplied_derived_result");
  }
  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    return blocked("restricted_qhnd_missing_cases");
  }

  const caseResults = [];
  let annualQHnd = 0;

  for (const inputCase of input.cases) {
    const validation = validateCase(inputCase);
    if (!validation.ok) return blocked(validation.code);
    annualQHnd += validation.value.qHnd;
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
      annualQHnd,
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
