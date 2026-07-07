import { calculateMc001HeatingGainUtilizationFactor } from "./mc001HeatingGainUtilizationFactorCalculation.mjs";

const MODE = "restricted_heating_qhnd_explicit_v1";
const SCOPE = "restricted_heating_qhnd_explicit_input_only_not_full_mc001";
const FORMULA_REFERENCES = [
  "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH",
  "MC001_R8_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_SOURCE_PACK",
  "MC001_R8_AH_PARAMETER_RELATION_2_55",
  "MC001_R8_TAU_H_DEPENDENCY_RELATION_2_57"
];
const FORMULA_CODE = "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH";
const AH_FORMULA_CODE = "MC001_R8_AH_PARAMETER_RELATION_2_55";
const TAUH_FORMULA_CODE = "MC001_R8_TAU_H_DEPENDENCY_RELATION_2_57";
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
  "aH_calculated_from_explicit_tauH_dependencies_when_aH_missing",
  "tauH_calculated_from_explicit_capacity_and_heat_transfer_coefficient",
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
  "aHOrigin",
  "aHFormulaCode",
  "tauH",
  "tauHFormulaCode",
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

function calculateAHFromExplicitUtilizationDependencies(inputCase) {
  const dependencies = inputCase.utilizationDependencies;
  if (!isPlainObject(dependencies)) {
    return { ok: false, code: "missing_explicit_utilization_dependencies_for_aH" };
  }

  const effectiveInternalHeatCapacityJPerK = finiteNumber(dependencies.effectiveInternalHeatCapacityJPerK);
  if (effectiveInternalHeatCapacityJPerK === null) {
    return { ok: false, code: "missing_explicit_capacity_for_tauH" };
  }
  if (effectiveInternalHeatCapacityJPerK <= 0) {
    return { ok: false, code: "invalid_explicit_capacity_for_tauH" };
  }

  const heatTransferCoefficientWK = finiteNumber(dependencies.heatTransferCoefficientWK);
  if (heatTransferCoefficientWK === null) {
    return { ok: false, code: "missing_explicit_heat_transfer_coefficient_for_tauH" };
  }
  if (heatTransferCoefficientWK <= 0) {
    return { ok: false, code: "invalid_explicit_heat_transfer_coefficient_for_tauH" };
  }

  const aH0 = finiteNumber(dependencies.aH0);
  if (aH0 === null) {
    return { ok: false, code: "missing_explicit_aH0_for_aH" };
  }
  if (aH0 < 0) {
    return { ok: false, code: "invalid_explicit_aH0_for_aH" };
  }

  const tauH0 = finiteNumber(dependencies.tauH0);
  if (tauH0 === null) {
    return { ok: false, code: "missing_explicit_tauH0_for_aH" };
  }
  if (tauH0 <= 0) {
    return { ok: false, code: "invalid_explicit_tauH0_for_aH" };
  }

  const tauH = (effectiveInternalHeatCapacityJPerK / 3600) / heatTransferCoefficientWK;
  if (!Number.isFinite(tauH) || tauH <= 0) {
    return { ok: false, code: "invalid_explicit_tauH_result" };
  }

  const aH = aH0 + (tauH / tauH0);
  if (!Number.isFinite(aH) || aH <= 0) {
    return { ok: false, code: "invalid_explicit_aH_result" };
  }

  return {
    ok: true,
    value: {
      effectiveInternalHeatCapacityJPerK,
      heatTransferCoefficientWK,
      tauH,
      tauH0,
      aH0,
      aH,
      aHOrigin: "calculated_from_explicit_tauH_dependencies",
      tauHFormulaCode: TAUH_FORMULA_CODE,
      aHFormulaCode: AH_FORMULA_CODE
    }
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
  const hasUtilizationDependencies = hasInputValue(inputCase, "utilizationDependencies");
  const utilizationPathCount = [hasEtaHgn, hasAH, hasUtilizationDependencies].filter(Boolean).length;
  if (hasEtaHgn && hasAH && !hasUtilizationDependencies) {
    return { ok: false, code: "etaHgn_and_aH_are_mutually_exclusive_in_c7c" };
  }
  if (utilizationPathCount > 1) {
    return { ok: false, code: "etaHgn_aH_and_utilization_dependencies_are_mutually_exclusive_in_c6g" };
  }
  if (utilizationPathCount === 0) {
    return { ok: false, code: "etaHgn_aH_or_utilization_dependencies_required" };
  }

  let etaHgn;
  let etaHgnOrigin;
  let aH;
  let etaHgnFormulaCode;
  let utilizationDependencyResult;

  if (hasEtaHgn) {
    etaHgn = finiteNumber(inputCase.etaHgn);
    if (etaHgn === null) {
      return { ok: false, code: "restricted_qhnd_missing_etaHgn" };
    }
    if (etaHgn < 0) {
      return { ok: false, code: "restricted_qhnd_invalid_etaHgn" };
    }
    etaHgnOrigin = "explicit_input";
  } else if (hasAH) {
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
  } else {
    const calculatedAH = calculateAHFromExplicitUtilizationDependencies(inputCase);
    if (!calculatedAH.ok) return calculatedAH;
    utilizationDependencyResult = calculatedAH.value;
    aH = utilizationDependencyResult.aH;
    const calculatedEta = calculateEtaHgnFromExplicitAH({
      ...inputCase,
      aH
    });
    if (!calculatedEta.ok) return calculatedEta;
    etaHgn = calculatedEta.value.etaHgn;
    etaHgnFormulaCode = calculatedEta.value.formulaCode;
    etaHgnOrigin = "calculated_from_explicit_time_constant_dependencies";
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
      ...(utilizationDependencyResult === undefined ? {} : utilizationDependencyResult),
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
