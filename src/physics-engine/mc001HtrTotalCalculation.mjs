import { buildMc001HtrTotalInputCompositionReadiness } from "./mc001HtrTotalInputCompositionReadiness.mjs";

export const MC001_HTR_TOTAL_CALCULATION_INPUT_SCHEMA_VERSION =
  "mc001-h12-htr-total-calculation-input-v1";

export const MC001_HTR_TOTAL_CALCULATION_SCHEMA_VERSION =
  "mc001-h12-htr-total-calculation-v1";

export const H12_CALCULATION_SET_CODES = Object.freeze([
  "mc001-htr-total-calculation-v1"
]);

export const H12_FORMULA_CODES = Object.freeze([
  "MC001_HTR_TOTAL_SUM_COMPOSED_TRANSMISSION_INPUTS"
]);

export const H12_CALCULATION_MODES = Object.freeze([
  "calculate_htr_total_from_h11_composed_inputs"
]);

export const H12_REQUIRED_INPUT_SET_STATUSES = Object.freeze([
  "inputs_composed_not_htr_total_calculated"
]);

export const H12_RESULT_UNITS = Object.freeze(["W/K"]);

export const H12_CONTRIBUTION_TYPES = Object.freeze([
  "hu_aggregated_transmission_contribution",
  "thermal_bridge_transmission_contribution",
  "ground_transmission_contribution",
  "adjacent_space_transmission_contribution",
  "external_boundary_transmission_contribution"
]);

export const H12_COMPOSED_VALUE_STATUSES = Object.freeze([
  "composed_from_hu_bridge",
  "composed_from_validated_non_hu_value",
  "not_applicable_with_source"
]);

export const H12_CALCULATION_TERM_STATUSES = Object.freeze([
  "included_in_htr_total_calculation",
  "not_applicable_with_source"
]);

export const H12_CALCULATION_STATUSES = Object.freeze([
  "htr_total_calculated_not_qhnd_ready",
  "blocked"
]);

export const H12_MISSING_CODES = Object.freeze([
  "missing_qhnd_methodology_scope",
  "missing_monthly_heating_methodology_scope",
  "missing_ventilation_methodology_scope",
  "missing_gains_methodology_scope",
  "missing_systems_methodology_scope",
  "missing_final_primary_co2_methodology_scope"
]);

export const H12_BLOCKER_CODES = Object.freeze([
  "blocked_invalid_h12_input",
  "blocked_raw_saved_analysis_input",
  "blocked_h11_inputs_not_ready",
  "blocked_missing_calculation_policy",
  "blocked_invalid_calculation_policy",
  "blocked_missing_composed_inputs",
  "blocked_invalid_composed_inputs",
  "blocked_missing_hu_bridge_term",
  "blocked_invalid_hu_bridge_term",
  "blocked_missing_calculation_term",
  "blocked_invalid_calculation_term",
  "blocked_duplicate_calculation_term",
  "blocked_unexpected_calculation_term",
  "blocked_invalid_required_unit",
  "blocked_invalid_calculation_status",
  "blocked_invalid_formula_code",
  "blocked_invalid_calculation_mode",
  "blocked_invalid_result_unit",
  "blocked_unsafe_private_identifier",
  "blocked_unsafe_private_content",
  "blocked_forbidden_physical_input_not_allowed",
  "blocked_precomputed_result_not_allowed",
  "blocked_hidden_fallback_value_not_allowed",
  "blocked_methodology_scope_not_allowed"
]);

const CALCULATION_SET_CODE_SET = new Set(H12_CALCULATION_SET_CODES);
const FORMULA_CODE_SET = new Set(H12_FORMULA_CODES);
const CALCULATION_MODE_SET = new Set(H12_CALCULATION_MODES);
const REQUIRED_INPUT_SET_STATUS_SET =
  new Set(H12_REQUIRED_INPUT_SET_STATUSES);
const RESULT_UNIT_SET = new Set(H12_RESULT_UNITS);
const CONTRIBUTION_TYPE_SET = new Set(H12_CONTRIBUTION_TYPES);
const COMPOSED_VALUE_STATUS_SET = new Set(H12_COMPOSED_VALUE_STATUSES);
const CALCULATION_TERM_STATUS_SET = new Set(H12_CALCULATION_TERM_STATUSES);
const MISSING_CODE_SET = new Set(H12_MISSING_CODES);
const BLOCKER_CODE_SET = new Set(H12_BLOCKER_CODES);

const HU_CONTRIBUTION_TYPE = "hu_aggregated_transmission_contribution";
const NON_HU_CONTRIBUTION_TYPES = Object.freeze(
  H12_CONTRIBUTION_TYPES.filter((type) => type !== HU_CONTRIBUTION_TYPE)
);
const NON_HU_CONTRIBUTION_TYPE_SET = new Set(NON_HU_CONTRIBUTION_TYPES);
const INCLUDED_TERM_STATUS = "included_in_htr_total_calculation";
const NOT_APPLICABLE_STATUS = "not_applicable_with_source";

const RAW_SNAPSHOT_KEYS = Object.freeze([
  "analysis",
  "building",
  "answers",
  "profiles",
  "sourceContext",
  "mc001Readiness",
  "savedAnalysis",
  "dbRow",
  "uiPayload"
]);

const PRECOMPUTED_RESULT_KEYS = Object.freeze([
  "huAggregation",
  "componentTerms",
  "htrComponents",
  "htrResult",
  "htrTotal",
  "htrValue",
  "totalHtr",
  "nonHuTransmissionValues",
  "htrFormulaResult",
  "formulaResult",
  "formulaResults",
  "resultValue",
  "calculatedHtr",
  "htrTotalResult",
  "calculatedTotal",
  "completeHtr",
  "QHnd",
  "monthly",
  "finalEnergy",
  "primaryEnergy",
  "CO2"
]);

const FORBIDDEN_PHYSICAL_INPUT_KEYS = Object.freeze([
  "area",
  "thermalTransmittance",
  "U",
  "bztu",
  "psi",
  "chi",
  "length",
  "surface",
  "coefficient",
  "temperature",
  "deltaT"
]);

const FORBIDDEN_H12_NUMERIC_KEYS = Object.freeze([
  "htrTotalInputs",
  "composedInputs",
  "htrInputValues",
  "huContributionValue",
  "nonHuContributionValues",
  "inputAmount",
  "total",
  "sum",
  "htrTotalResult",
  "calculatedTotal"
]);

const PRECOMPUTED_RESULT_KEY_SET = new Set(PRECOMPUTED_RESULT_KEYS);
const FORBIDDEN_PHYSICAL_INPUT_KEY_SET =
  new Set(FORBIDDEN_PHYSICAL_INPUT_KEYS);
const FORBIDDEN_H12_NUMERIC_KEY_SET = new Set(FORBIDDEN_H12_NUMERIC_KEYS);
const PRIVATE_CONTENT_PATTERN =
  /(@|\+40722111222|person@example\.com|john|doe|strada|owner|private|person|record-JohnDoe|record-001|owner-snapshot|private-note|person-name|free text note|sourceContext|sourceTrace|sourceLocator|sourceRefs|sourceRecordId)/i;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.hasOwn(value, key);
}

function rawSavedAnalysisLike(input) {
  return isObject(input) && RAW_SNAPSHOT_KEYS.some((key) => hasOwn(input, key));
}

function containsPrivateContent(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return PRIVATE_CONTENT_PATTERN.test(value) || value.length > 120;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(containsPrivateContent);
  }
  if (!isObject(value)) {
    return true;
  }
  return Object.entries(value).some(([key, child]) => (
    PRIVATE_CONTENT_PATTERN.test(key) || containsPrivateContent(child)
  ));
}

function h12OwnedLocalInput(htrCalculationInput) {
  return Object.fromEntries(
    Object.entries(htrCalculationInput).filter(([key]) => key !== "compositionInput")
  );
}

function h12OwnedForbiddenPayloadIssue(value) {
  if (Array.isArray(value)) {
    for (const child of value) {
      const issue = h12OwnedForbiddenPayloadIssue(child);
      if (issue) {
        return issue;
      }
    }
    return null;
  }

  if (!isObject(value)) {
    if (typeof value === "number") {
      return blocker("blocked_hidden_fallback_value_not_allowed");
    }
    return null;
  }

  for (const [key, child] of Object.entries(value)) {
    if (PRECOMPUTED_RESULT_KEY_SET.has(key)) {
      return blocker("blocked_precomputed_result_not_allowed");
    }
    if (FORBIDDEN_PHYSICAL_INPUT_KEY_SET.has(key)) {
      return blocker("blocked_forbidden_physical_input_not_allowed");
    }
    if (FORBIDDEN_H12_NUMERIC_KEY_SET.has(key)) {
      return blocker("blocked_hidden_fallback_value_not_allowed");
    }
    const issue = h12OwnedForbiddenPayloadIssue(child);
    if (issue) {
      return issue;
    }
  }
  return null;
}

function blocker(code) {
  const safeCode = BLOCKER_CODE_SET.has(code)
    ? code
    : "blocked_invalid_h12_input";
  return Object.freeze({
    code: safeCode,
    severity: "blocking"
  });
}

function missingEntry(code) {
  const safeCode = MISSING_CODE_SET.has(code)
    ? code
    : "missing_qhnd_methodology_scope";
  return Object.freeze({
    code: safeCode,
    severity: "blocking"
  });
}

function uniqueByCode(entries) {
  const seen = new Set();
  return Object.freeze(
    entries.filter((entry) => {
      if (seen.has(entry.code)) {
        return false;
      }
      seen.add(entry.code);
      return true;
    })
  );
}

function blockedHtrTotalCalculation(h11Result) {
  return Object.freeze({
    status: "blocked",
    h11CompositionStatus: h11Result?.status === "ready" ? "ready" : "blocked",
    calculationSetCode: null,
    formulaCode: null,
    calculationMode: null,
    calculationTerms: Object.freeze([]),
    missingForNextMethodologyScope: Object.freeze([])
  });
}

function readinessFromH11(h11Result, isCalculated) {
  return Object.freeze({
    isHuInventoryReady: h11Result?.readiness?.isHuInventoryReady === true,
    isHuComponentTermCalculationReady:
      h11Result?.readiness?.isHuComponentTermCalculationReady === true,
    areHuComponentTermsCalculated:
      h11Result?.readiness?.areHuComponentTermsCalculated === true,
    isHuAggregationReady: h11Result?.readiness?.isHuAggregationReady === true,
    hasHuAggregationResult: h11Result?.readiness?.hasHuAggregationResult === true,
    isHuAggregationAvailableForHtr:
      h11Result?.readiness?.isHuAggregationAvailableForHtr === true,
    isHtrTransmissionBridgeReady:
      h11Result?.readiness?.isHtrTransmissionBridgeReady === true,
    areNonHuHtrPrerequisitesMapped:
      h11Result?.readiness?.areNonHuHtrPrerequisitesMapped === true,
    isHtrTotalCalculationScopeMapped:
      h11Result?.readiness?.isHtrTotalCalculationScopeMapped === true,
    areNonHuHtrNumericContributionContractsMapped:
      h11Result?.readiness?.areNonHuHtrNumericContributionContractsMapped === true,
    areNonHuHtrNumericValuesValidated:
      h11Result?.readiness?.areNonHuHtrNumericValuesValidated === true,
    areHtrTotalInputsComposed:
      h11Result?.readiness?.areHtrTotalInputsComposed === true,
    areHtrTotalInputsNumericallyReady:
      h11Result?.readiness?.areHtrTotalInputsNumericallyReady === true,
    isHtrTotalCalculationReady: isCalculated,
    hasHtrResult: isCalculated,
    isCompleteHuReady: false,
    isCompleteHtrReady: false,
    hasHuResult: false,
    downstreamReadiness: false
  });
}

function emptyResult({
  status = "blocked",
  h11Result = null,
  htrTotalCalculation = null,
  blockers = []
} = {}) {
  const safeBlockers = uniqueByCode(blockers);
  const isReady = status === "ready";
  const calculation =
    htrTotalCalculation ?? blockedHtrTotalCalculation(h11Result);
  const calculationTerms = Array.isArray(calculation.calculationTerms)
    ? calculation.calculationTerms
    : [];

  return Object.freeze({
    schemaVersion: MC001_HTR_TOTAL_CALCULATION_SCHEMA_VERSION,
    isMc001HtrTotalCalculation: true,
    status,
    readiness: readinessFromH11(h11Result, isReady),
    htrTotalCalculation: calculation,
    blockers: safeBlockers,
    counts: Object.freeze({
      calculationTerms: calculationTerms.length,
      huTerms: calculationTerms.filter((entry) => (
        entry.contributionType === HU_CONTRIBUTION_TYPE
      )).length,
      nonHuTerms: calculationTerms.filter((entry) => (
        NON_HU_CONTRIBUTION_TYPE_SET.has(entry.contributionType)
      )).length,
      blockers: safeBlockers.length
    })
  });
}

function h11InputsAreReady(h11Result) {
  return (
    h11Result?.status === "ready" &&
    h11Result?.readiness?.areHtrTotalInputsComposed === true &&
    h11Result?.readiness?.areHtrTotalInputsNumericallyReady === true &&
    h11Result?.readiness?.areNonHuHtrNumericValuesValidated === true &&
    h11Result?.readiness?.areNonHuHtrNumericContributionContractsMapped === true &&
    h11Result?.readiness?.isHtrTotalCalculationScopeMapped === true &&
    h11Result?.readiness?.areNonHuHtrPrerequisitesMapped === true &&
    h11Result?.readiness?.isHtrTransmissionBridgeReady === true &&
    h11Result?.readiness?.isHuAggregationAvailableForHtr === true
  );
}

function calculationPolicyIssue(policy) {
  if (!isObject(policy)) {
    return blocker("blocked_missing_calculation_policy");
  }
  if (containsPrivateContent(policy)) {
    return blocker("blocked_unsafe_private_content");
  }
  const forbiddenPayloadIssue = h12OwnedForbiddenPayloadIssue(policy);
  if (forbiddenPayloadIssue) {
    return forbiddenPayloadIssue;
  }
  if (!CALCULATION_SET_CODE_SET.has(policy.calculationSetCode)) {
    return blocker("blocked_invalid_calculation_policy");
  }
  if (!FORMULA_CODE_SET.has(policy.formulaCode)) {
    return blocker("blocked_invalid_formula_code");
  }
  if (!CALCULATION_MODE_SET.has(policy.calculationMode)) {
    return blocker("blocked_invalid_calculation_mode");
  }
  if (!REQUIRED_INPUT_SET_STATUS_SET.has(policy.requiredInputSetStatus)) {
    return blocker("blocked_invalid_calculation_status");
  }
  if (!RESULT_UNIT_SET.has(policy.resultUnit)) {
    return blocker("blocked_invalid_result_unit");
  }
  return null;
}

function h11ComposedInputs(h11Result) {
  const refs =
    h11Result?.htrTotalInputCompositionReadiness?.composedInputs;
  return Array.isArray(refs) ? refs : [];
}

function composedInputIssue(composedInputs) {
  if (!Array.isArray(composedInputs) || composedInputs.length === 0) {
    return blocker("blocked_missing_composed_inputs");
  }

  const seen = new Set();
  let huInputs = 0;
  for (const entry of composedInputs) {
    if (!isObject(entry)) {
      return blocker("blocked_invalid_composed_inputs");
    }
    if (containsPrivateContent(entry)) {
      return blocker("blocked_unsafe_private_content");
    }
    if (!CONTRIBUTION_TYPE_SET.has(entry.contributionType)) {
      return blocker("blocked_unexpected_calculation_term");
    }
    if (seen.has(entry.contributionType)) {
      return blocker("blocked_duplicate_calculation_term");
    }
    seen.add(entry.contributionType);
    if (!COMPOSED_VALUE_STATUS_SET.has(entry.valueStatus)) {
      return blocker("blocked_invalid_calculation_status");
    }
    if (entry.contributionType === HU_CONTRIBUTION_TYPE) {
      huInputs += 1;
      if (entry.valueStatus !== "composed_from_hu_bridge") {
        return blocker("blocked_invalid_hu_bridge_term");
      }
    }
    if (
      NON_HU_CONTRIBUTION_TYPE_SET.has(entry.contributionType) &&
      entry.valueStatus === "composed_from_hu_bridge"
    ) {
      return blocker("blocked_invalid_calculation_status");
    }
    if (entry.valueStatus === NOT_APPLICABLE_STATUS) {
      if (hasOwn(entry, "contributionValue")) {
        return blocker("blocked_invalid_calculation_term");
      }
      continue;
    }
    if (
      !isObject(entry.contributionValue) ||
      typeof entry.contributionValue.amount !== "number" ||
      !Number.isFinite(entry.contributionValue.amount)
    ) {
      return entry.contributionType === HU_CONTRIBUTION_TYPE
        ? blocker("blocked_invalid_hu_bridge_term")
        : blocker("blocked_invalid_calculation_term");
    }
    if (entry.contributionValue.unit !== "W/K") {
      return blocker("blocked_invalid_required_unit");
    }
  }
  if (huInputs === 0) {
    return blocker("blocked_missing_hu_bridge_term");
  }
  if (huInputs !== 1) {
    return blocker("blocked_invalid_hu_bridge_term");
  }
  return null;
}

function calculationTermFromComposedInput(entry) {
  if (entry.valueStatus === NOT_APPLICABLE_STATUS) {
    return Object.freeze({
      contributionType: entry.contributionType,
      termStatus: NOT_APPLICABLE_STATUS
    });
  }
  return Object.freeze({
    contributionType: entry.contributionType,
    termStatus: INCLUDED_TERM_STATUS,
    contributionValue: Object.freeze({
      amount: entry.contributionValue.amount,
      unit: "W/K"
    })
  });
}

function calculationTermIssue(calculationTerms) {
  if (!Array.isArray(calculationTerms) || calculationTerms.length === 0) {
    return blocker("blocked_missing_calculation_term");
  }
  const seen = new Set();
  let huTerms = 0;
  for (const term of calculationTerms) {
    if (!isObject(term)) {
      return blocker("blocked_invalid_calculation_term");
    }
    if (!CONTRIBUTION_TYPE_SET.has(term.contributionType)) {
      return blocker("blocked_unexpected_calculation_term");
    }
    if (seen.has(term.contributionType)) {
      return blocker("blocked_duplicate_calculation_term");
    }
    seen.add(term.contributionType);
    if (!CALCULATION_TERM_STATUS_SET.has(term.termStatus)) {
      return blocker("blocked_invalid_calculation_status");
    }
    if (term.contributionType === HU_CONTRIBUTION_TYPE) {
      huTerms += 1;
      if (term.termStatus !== INCLUDED_TERM_STATUS) {
        return blocker("blocked_invalid_hu_bridge_term");
      }
    }
    if (term.termStatus === NOT_APPLICABLE_STATUS) {
      if (hasOwn(term, "contributionValue")) {
        return blocker("blocked_invalid_calculation_term");
      }
      continue;
    }
    if (
      !isObject(term.contributionValue) ||
      typeof term.contributionValue.amount !== "number" ||
      !Number.isFinite(term.contributionValue.amount)
    ) {
      return term.contributionType === HU_CONTRIBUTION_TYPE
        ? blocker("blocked_invalid_hu_bridge_term")
        : blocker("blocked_invalid_calculation_term");
    }
    if (term.contributionValue.unit !== "W/K") {
      return blocker("blocked_invalid_required_unit");
    }
  }
  if (huTerms === 0) {
    return blocker("blocked_missing_hu_bridge_term");
  }
  if (huTerms !== 1) {
    return blocker("blocked_invalid_hu_bridge_term");
  }
  return null;
}

function htrTotalAmountFromCalculationTerms(calculationTerms) {
  let htrTotalAmount = 0;
  for (const term of calculationTerms) {
    if (term.termStatus === INCLUDED_TERM_STATUS) {
      htrTotalAmount += term.contributionValue.amount;
    }
  }
  return htrTotalAmount;
}

function missingForNextMethodologyScope() {
  return Object.freeze([
    missingEntry("missing_qhnd_methodology_scope"),
    missingEntry("missing_monthly_heating_methodology_scope"),
    missingEntry("missing_final_primary_co2_methodology_scope")
  ]);
}

function readyHtrTotalCalculation(policy, h11Result) {
  const calculationTerms = Object.freeze(
    h11ComposedInputs(h11Result).map(calculationTermFromComposedInput)
  );
  const htrTotalAmount = htrTotalAmountFromCalculationTerms(calculationTerms);
  return Object.freeze({
    status: "htr_total_calculated_not_qhnd_ready",
    h11CompositionStatus: "ready",
    calculationSetCode: policy.calculationSetCode,
    formulaCode: policy.formulaCode,
    calculationMode: policy.calculationMode,
    calculationTerms,
    htrTotalResult: Object.freeze({
      amount: htrTotalAmount,
      unit: policy.resultUnit
    }),
    missingForNextMethodologyScope: missingForNextMethodologyScope()
  });
}

export function calculateMc001HtrTotal(htrCalculationInput, options = {}) {
  void options;

  if (!isObject(htrCalculationInput)) {
    return emptyResult({
      blockers: [blocker("blocked_invalid_h12_input")]
    });
  }

  if (rawSavedAnalysisLike(htrCalculationInput)) {
    return emptyResult({
      blockers: [blocker("blocked_raw_saved_analysis_input")]
    });
  }

  if (
    htrCalculationInput.schemaVersion !==
      MC001_HTR_TOTAL_CALCULATION_INPUT_SCHEMA_VERSION ||
    htrCalculationInput.isMc001HtrTotalCalculationInput !== true
  ) {
    return emptyResult({
      blockers: [blocker("blocked_invalid_h12_input")]
    });
  }

  const localInput = h12OwnedLocalInput(htrCalculationInput);
  if (containsPrivateContent(localInput)) {
    return emptyResult({
      blockers: [blocker("blocked_unsafe_private_content")]
    });
  }

  const forbiddenPayloadIssue = h12OwnedForbiddenPayloadIssue(localInput);
  if (forbiddenPayloadIssue) {
    return emptyResult({
      blockers: [forbiddenPayloadIssue]
    });
  }

  const h11Result = buildMc001HtrTotalInputCompositionReadiness(
    htrCalculationInput.compositionInput
  );
  if (!h11InputsAreReady(h11Result)) {
    return emptyResult({
      h11Result,
      blockers: [blocker("blocked_h11_inputs_not_ready")]
    });
  }

  const policyIssue = calculationPolicyIssue(
    htrCalculationInput.htrTotalCalculationPolicy
  );
  if (policyIssue) {
    return emptyResult({
      h11Result,
      blockers: [policyIssue]
    });
  }

  const composedInputs = h11ComposedInputs(h11Result);
  const composedIssue = composedInputIssue(composedInputs);
  if (composedIssue) {
    return emptyResult({
      h11Result,
      blockers: [composedIssue]
    });
  }

  const htrTotalCalculation = readyHtrTotalCalculation(
    htrCalculationInput.htrTotalCalculationPolicy,
    h11Result
  );
  const termIssue = calculationTermIssue(htrTotalCalculation.calculationTerms);
  if (termIssue) {
    return emptyResult({
      h11Result,
      blockers: [termIssue]
    });
  }

  if (
    !isObject(htrTotalCalculation.htrTotalResult) ||
    typeof htrTotalCalculation.htrTotalResult.amount !== "number" ||
    !Number.isFinite(htrTotalCalculation.htrTotalResult.amount) ||
    htrTotalCalculation.htrTotalResult.unit !== "W/K"
  ) {
    return emptyResult({
      h11Result,
      blockers: [blocker("blocked_invalid_calculation_term")]
    });
  }

  return emptyResult({
    status: "ready",
    h11Result,
    htrTotalCalculation
  });
}
