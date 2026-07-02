import { buildMc001HtrNonHuNumericValueValidationReadiness } from "./mc001HtrNonHuNumericValueValidationReadiness.mjs";
import { buildMc001HtrTransmissionReadinessBridge } from "./mc001HtrTransmissionReadinessBridge.mjs";

export const MC001_HTR_TOTAL_INPUT_COMPOSITION_INPUT_SCHEMA_VERSION =
  "mc001-h11-htr-total-input-composition-input-v1";

export const MC001_HTR_TOTAL_INPUT_COMPOSITION_READINESS_SCHEMA_VERSION =
  "mc001-h11-htr-total-input-composition-readiness-v1";

export const H11_COMPOSITION_SET_CODES = Object.freeze([
  "mc001-htr-total-input-composition-v1"
]);

export const H11_COMPOSITION_MODES = Object.freeze([
  "compose_hu_bridge_and_validated_non_hu_values"
]);

export const H11_REQUIRED_INPUT_TYPES = Object.freeze([
  "hu_aggregated_transmission_contribution",
  "validated_non_hu_transmission_contributions"
]);

export const H11_CONTRIBUTION_TYPES = Object.freeze([
  "hu_aggregated_transmission_contribution",
  "thermal_bridge_transmission_contribution",
  "ground_transmission_contribution",
  "adjacent_space_transmission_contribution",
  "external_boundary_transmission_contribution"
]);

export const H11_COMPOSITION_STATUSES = Object.freeze([
  "composed_from_hu_bridge",
  "composed_from_validated_non_hu_value",
  "not_applicable_with_source"
]);

export const H11_MISSING_CODES = Object.freeze([
  "missing_htr_total_formula_execution_milestone",
  "missing_complete_htr_methodology_scope",
  "missing_qhnd_methodology_scope"
]);

export const H11_BLOCKER_CODES = Object.freeze([
  "blocked_invalid_h11_input",
  "blocked_raw_saved_analysis_input",
  "blocked_h10_values_not_ready",
  "blocked_h6_bridge_not_ready",
  "blocked_missing_composition_policy",
  "blocked_invalid_composition_policy",
  "blocked_missing_hu_bridge_input",
  "blocked_invalid_hu_bridge_contribution",
  "blocked_missing_validated_non_hu_values",
  "blocked_invalid_validated_non_hu_values",
  "blocked_missing_composed_input",
  "blocked_invalid_composed_input",
  "blocked_duplicate_composed_input",
  "blocked_unexpected_composed_input",
  "blocked_invalid_required_unit",
  "blocked_invalid_composition_status",
  "blocked_unsafe_private_identifier",
  "blocked_unsafe_private_content",
  "blocked_forbidden_physical_input_not_allowed",
  "blocked_precomputed_htr_not_allowed",
  "blocked_hidden_fallback_value_not_allowed",
  "blocked_htr_total_formula_execution_not_allowed"
]);

const COMPOSITION_SET_CODE_SET = new Set(H11_COMPOSITION_SET_CODES);
const COMPOSITION_MODE_SET = new Set(H11_COMPOSITION_MODES);
const REQUIRED_INPUT_TYPE_SET = new Set(H11_REQUIRED_INPUT_TYPES);
const CONTRIBUTION_TYPE_SET = new Set(H11_CONTRIBUTION_TYPES);
const COMPOSITION_STATUS_SET = new Set(H11_COMPOSITION_STATUSES);
const MISSING_CODE_SET = new Set(H11_MISSING_CODES);
const BLOCKER_CODE_SET = new Set(H11_BLOCKER_CODES);
const HU_CONTRIBUTION_TYPE = "hu_aggregated_transmission_contribution";
const NON_HU_CONTRIBUTION_TYPES = Object.freeze(
  H11_CONTRIBUTION_TYPES.filter((type) => type !== HU_CONTRIBUTION_TYPE)
);
const NON_HU_CONTRIBUTION_TYPE_SET = new Set(NON_HU_CONTRIBUTION_TYPES);
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
const PRECOMPUTED_HTR_KEYS = Object.freeze([
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
  "resultValue",
  "calculatedHtr",
  "completeHtr",
  "formulaResults",
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
const FORBIDDEN_H11_NUMERIC_KEYS = Object.freeze([
  "htrTotalInputs",
  "composedInputs",
  "htrInputValues",
  "huContributionValue",
  "nonHuContributionValues",
  "inputAmount",
  "total",
  "sum"
]);
const PRECOMPUTED_HTR_KEY_SET = new Set(PRECOMPUTED_HTR_KEYS);
const FORBIDDEN_PHYSICAL_INPUT_KEY_SET =
  new Set(FORBIDDEN_PHYSICAL_INPUT_KEYS);
const FORBIDDEN_H11_NUMERIC_KEY_SET = new Set(FORBIDDEN_H11_NUMERIC_KEYS);
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

function h11OwnedLocalInput(compositionInput) {
  return Object.fromEntries(
    Object.entries(compositionInput).filter(([key]) => key !== "valueValidationInput")
  );
}

function h11OwnedForbiddenPayloadIssue(value) {
  if (Array.isArray(value)) {
    for (const child of value) {
      const issue = h11OwnedForbiddenPayloadIssue(child);
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
    if (PRECOMPUTED_HTR_KEY_SET.has(key)) {
      return blocker("blocked_precomputed_htr_not_allowed");
    }
    if (FORBIDDEN_PHYSICAL_INPUT_KEY_SET.has(key)) {
      return blocker("blocked_forbidden_physical_input_not_allowed");
    }
    if (FORBIDDEN_H11_NUMERIC_KEY_SET.has(key)) {
      return blocker("blocked_hidden_fallback_value_not_allowed");
    }
    const issue = h11OwnedForbiddenPayloadIssue(child);
    if (issue) {
      return issue;
    }
  }
  return null;
}

function blocker(code) {
  const safeCode = BLOCKER_CODE_SET.has(code) ? code : "blocked_invalid_h11_input";
  return Object.freeze({
    code: safeCode,
    severity: "blocking"
  });
}

function missingEntry(code) {
  const safeCode = MISSING_CODE_SET.has(code)
    ? code
    : "missing_complete_htr_methodology_scope";
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

function blockedCompositionReadiness(h10Result, h6Result) {
  return Object.freeze({
    status: "blocked",
    h10ValueValidationStatus: h10Result?.status === "ready" ? "ready" : "blocked",
    h6BridgeStatus: h6Result?.status === "ready" ? "ready" : "blocked",
    compositionSetCode: null,
    compositionMode: null,
    composedInputs: Object.freeze([]),
    missingForHtrTotalCalculation: Object.freeze([])
  });
}

function readinessFromGuards(h10Result, areInputsComposed) {
  return Object.freeze({
    isHuInventoryReady: h10Result?.readiness?.isHuInventoryReady === true,
    isHuComponentTermCalculationReady:
      h10Result?.readiness?.isHuComponentTermCalculationReady === true,
    areHuComponentTermsCalculated:
      h10Result?.readiness?.areHuComponentTermsCalculated === true,
    isHuAggregationReady: h10Result?.readiness?.isHuAggregationReady === true,
    hasHuAggregationResult: h10Result?.readiness?.hasHuAggregationResult === true,
    isHuAggregationAvailableForHtr:
      h10Result?.readiness?.isHuAggregationAvailableForHtr === true,
    isHtrTransmissionBridgeReady:
      h10Result?.readiness?.isHtrTransmissionBridgeReady === true,
    areNonHuHtrPrerequisitesMapped:
      h10Result?.readiness?.areNonHuHtrPrerequisitesMapped === true,
    isHtrTotalCalculationScopeMapped:
      h10Result?.readiness?.isHtrTotalCalculationScopeMapped === true,
    areNonHuHtrNumericContributionContractsMapped:
      h10Result?.readiness?.areNonHuHtrNumericContributionContractsMapped === true,
    areNonHuHtrNumericValuesValidated:
      h10Result?.readiness?.areNonHuHtrNumericValuesValidated === true,
    areHtrTotalInputsComposed: areInputsComposed,
    areHtrTotalInputsNumericallyReady: areInputsComposed,
    isHtrTotalCalculationReady: false,
    isCompleteHuReady: false,
    isCompleteHtrReady: false,
    hasHuResult: false,
    hasHtrResult: false,
    downstreamReadiness: false
  });
}

function emptyResult({
  status = "blocked",
  h10Result = null,
  h6Result = null,
  compositionReadiness = null,
  blockers = []
} = {}) {
  const safeBlockers = uniqueByCode(blockers);
  const isReady = status === "ready";
  const readiness =
    compositionReadiness ?? blockedCompositionReadiness(h10Result, h6Result);
  const composedInputs = Array.isArray(readiness.composedInputs)
    ? readiness.composedInputs
    : [];

  return Object.freeze({
    schemaVersion: MC001_HTR_TOTAL_INPUT_COMPOSITION_READINESS_SCHEMA_VERSION,
    isMc001HtrTotalInputCompositionReadiness: true,
    status,
    readiness: readinessFromGuards(h10Result, isReady),
    htrTotalInputCompositionReadiness: readiness,
    blockers: safeBlockers,
    counts: Object.freeze({
      composedInputs: composedInputs.length,
      huInputs: composedInputs.filter((entry) => (
        entry.contributionType === HU_CONTRIBUTION_TYPE
      )).length,
      nonHuInputs: composedInputs.filter((entry) => (
        NON_HU_CONTRIBUTION_TYPE_SET.has(entry.contributionType)
      )).length,
      blockers: safeBlockers.length
    })
  });
}

function h10ValuesAreReady(h10Result) {
  return (
    h10Result?.status === "ready" &&
    h10Result?.readiness?.areNonHuHtrNumericValuesValidated === true &&
    h10Result?.readiness?.areNonHuHtrNumericContributionContractsMapped === true &&
    h10Result?.readiness?.isHtrTotalCalculationScopeMapped === true &&
    h10Result?.readiness?.areNonHuHtrPrerequisitesMapped === true &&
    h10Result?.readiness?.isHtrTransmissionBridgeReady === true &&
    h10Result?.readiness?.isHuAggregationAvailableForHtr === true
  );
}

function derivedHuBridgeInput(valueValidationInput) {
  return valueValidationInput?.contractReadinessInput
    ?.htrTotalReadinessInput
    ?.htrPrerequisitesInput
    ?.huBridgeInput;
}

function h6BridgeIsReady(h6Result) {
  return (
    h6Result?.status === "ready" &&
    h6Result?.readiness?.isHtrTransmissionBridgeReady === true &&
    h6Result?.readiness?.isHuAggregationAvailableForHtr === true
  );
}

function compositionPolicyIssue(policy) {
  if (!isObject(policy)) {
    return blocker("blocked_missing_composition_policy");
  }
  if (containsPrivateContent(policy)) {
    return blocker("blocked_unsafe_private_content");
  }
  const forbiddenPayloadIssue = h11OwnedForbiddenPayloadIssue(policy);
  if (forbiddenPayloadIssue) {
    return forbiddenPayloadIssue;
  }
  if (!COMPOSITION_SET_CODE_SET.has(policy.compositionSetCode)) {
    return blocker("blocked_invalid_composition_policy");
  }
  if (!COMPOSITION_MODE_SET.has(policy.compositionMode)) {
    return blocker("blocked_invalid_composition_policy");
  }
  if (
    !Array.isArray(policy.requiredInputTypes) ||
    policy.requiredInputTypes.length !== H11_REQUIRED_INPUT_TYPES.length
  ) {
    return blocker("blocked_invalid_composition_policy");
  }
  const seen = new Set();
  for (const inputType of policy.requiredInputTypes) {
    if (!REQUIRED_INPUT_TYPE_SET.has(inputType) || seen.has(inputType)) {
      return blocker("blocked_invalid_composition_policy");
    }
    seen.add(inputType);
  }
  for (const required of H11_REQUIRED_INPUT_TYPES) {
    if (!seen.has(required)) {
      return blocker("blocked_invalid_composition_policy");
    }
  }
  return null;
}

function huBridgeContributionIssue(h6Result) {
  const huContribution = h6Result?.htrTransmissionBridge?.huContribution;
  if (!isObject(huContribution)) {
    return blocker("blocked_invalid_hu_bridge_contribution");
  }
  if (containsPrivateContent(huContribution)) {
    return blocker("blocked_unsafe_private_content");
  }
  if (
    huContribution.contributionType !== HU_CONTRIBUTION_TYPE ||
    typeof huContribution.value !== "number" ||
    !Number.isFinite(huContribution.value) ||
    huContribution.unit !== "W/K"
  ) {
    return blocker("blocked_invalid_hu_bridge_contribution");
  }
  return null;
}

function h10ValidatedValueRefs(h10Result) {
  const refs =
    h10Result?.htrNonHuNumericValueValidationReadiness?.validatedContributionValues;
  return Array.isArray(refs) ? refs : [];
}

function validatedNonHuValueIssue(valueRefs) {
  if (!Array.isArray(valueRefs) || valueRefs.length === 0) {
    return blocker("blocked_missing_validated_non_hu_values");
  }
  const seen = new Set();
  for (const valueRef of valueRefs) {
    if (!isObject(valueRef)) {
      return blocker("blocked_invalid_validated_non_hu_values");
    }
    if (containsPrivateContent(valueRef)) {
      return blocker("blocked_unsafe_private_content");
    }
    if (valueRef.contributionType === HU_CONTRIBUTION_TYPE) {
      return blocker("blocked_unexpected_composed_input");
    }
    if (!NON_HU_CONTRIBUTION_TYPE_SET.has(valueRef.contributionType)) {
      return blocker("blocked_unexpected_composed_input");
    }
    if (seen.has(valueRef.contributionType)) {
      return blocker("blocked_duplicate_composed_input");
    }
    seen.add(valueRef.contributionType);
    if (valueRef.valueStatus === "validated_source_backed_numeric_value") {
      if (!COMPOSITION_STATUS_SET.has("composed_from_validated_non_hu_value")) {
        return blocker("blocked_invalid_composition_status");
      }
      if (
        !isObject(valueRef.contributionValue) ||
        typeof valueRef.contributionValue.amount !== "number" ||
        !Number.isFinite(valueRef.contributionValue.amount)
      ) {
        return blocker("blocked_invalid_validated_non_hu_values");
      }
      if (valueRef.contributionValue.unit !== "W/K") {
        return blocker("blocked_invalid_required_unit");
      }
      continue;
    }
    if (valueRef.valueStatus === "not_applicable_with_source") {
      if (hasOwn(valueRef, "contributionValue")) {
        return blocker("blocked_invalid_validated_non_hu_values");
      }
      continue;
    }
    return blocker("blocked_invalid_composition_status");
  }
  return null;
}

function composedInputIssue(composedInputs) {
  if (!Array.isArray(composedInputs) || composedInputs.length === 0) {
    return blocker("blocked_missing_composed_input");
  }
  const seen = new Set();
  let huInputs = 0;
  for (const entry of composedInputs) {
    if (!isObject(entry)) {
      return blocker("blocked_invalid_composed_input");
    }
    if (!CONTRIBUTION_TYPE_SET.has(entry.contributionType)) {
      return blocker("blocked_unexpected_composed_input");
    }
    if (seen.has(entry.contributionType)) {
      return blocker("blocked_duplicate_composed_input");
    }
    seen.add(entry.contributionType);
    if (!COMPOSITION_STATUS_SET.has(entry.valueStatus)) {
      return blocker("blocked_invalid_composition_status");
    }
    if (entry.contributionType === HU_CONTRIBUTION_TYPE) {
      huInputs += 1;
      if (entry.valueStatus !== "composed_from_hu_bridge") {
        return blocker("blocked_invalid_composition_status");
      }
    }
    if (NON_HU_CONTRIBUTION_TYPE_SET.has(entry.contributionType)) {
      if (
        entry.valueStatus !== "composed_from_validated_non_hu_value" &&
        entry.valueStatus !== "not_applicable_with_source"
      ) {
        return blocker("blocked_invalid_composition_status");
      }
    }
    if (entry.valueStatus === "not_applicable_with_source") {
      if (hasOwn(entry, "contributionValue")) {
        return blocker("blocked_invalid_composed_input");
      }
      continue;
    }
    if (
      !isObject(entry.contributionValue) ||
      typeof entry.contributionValue.amount !== "number" ||
      !Number.isFinite(entry.contributionValue.amount)
    ) {
      return blocker("blocked_invalid_composed_input");
    }
    if (entry.contributionValue.unit !== "W/K") {
      return blocker("blocked_invalid_required_unit");
    }
  }
  if (huInputs !== 1) {
    return blocker("blocked_invalid_hu_bridge_contribution");
  }
  return null;
}

function missingForHtrTotalCalculation() {
  return Object.freeze([
    missingEntry("missing_htr_total_formula_execution_milestone"),
    missingEntry("missing_complete_htr_methodology_scope")
  ]);
}

function composedInputFromHuBridge(huContribution) {
  return Object.freeze({
    contributionType: HU_CONTRIBUTION_TYPE,
    valueStatus: "composed_from_hu_bridge",
    contributionValue: Object.freeze({
      amount: huContribution.value,
      unit: "W/K"
    })
  });
}

function composedInputFromValidatedNonHuValue(valueRef) {
  if (valueRef.valueStatus === "not_applicable_with_source") {
    return Object.freeze({
      contributionType: valueRef.contributionType,
      valueStatus: "not_applicable_with_source"
    });
  }
  return Object.freeze({
    contributionType: valueRef.contributionType,
    valueStatus: "composed_from_validated_non_hu_value",
    contributionValue: Object.freeze({
      amount: valueRef.contributionValue.amount,
      unit: "W/K"
    })
  });
}

function readyCompositionReadiness(policy, h10Result, h6Result) {
  const huInput = composedInputFromHuBridge(
    h6Result.htrTransmissionBridge.huContribution
  );
  const nonHuInputs = Object.freeze(
    h10ValidatedValueRefs(h10Result).map(composedInputFromValidatedNonHuValue)
  );
  const composedInputs = Object.freeze([huInput, ...nonHuInputs]);

  return Object.freeze({
    status: "inputs_composed_not_htr_total_calculated",
    h10ValueValidationStatus: "ready",
    h6BridgeStatus: "ready",
    compositionSetCode: policy.compositionSetCode,
    compositionMode: policy.compositionMode,
    composedInputs,
    missingForHtrTotalCalculation: missingForHtrTotalCalculation()
  });
}

export function buildMc001HtrTotalInputCompositionReadiness(
  compositionInput,
  options = {}
) {
  void options;

  if (!isObject(compositionInput)) {
    return emptyResult({
      blockers: [blocker("blocked_invalid_h11_input")]
    });
  }

  if (rawSavedAnalysisLike(compositionInput)) {
    return emptyResult({
      blockers: [blocker("blocked_raw_saved_analysis_input")]
    });
  }

  if (
    compositionInput.schemaVersion !==
      MC001_HTR_TOTAL_INPUT_COMPOSITION_INPUT_SCHEMA_VERSION ||
    compositionInput.isMc001HtrTotalInputCompositionInput !== true
  ) {
    return emptyResult({
      blockers: [blocker("blocked_invalid_h11_input")]
    });
  }

  const localInput = h11OwnedLocalInput(compositionInput);
  if (containsPrivateContent(localInput)) {
    return emptyResult({
      blockers: [blocker("blocked_unsafe_private_content")]
    });
  }

  const forbiddenPayloadIssue = h11OwnedForbiddenPayloadIssue(localInput);
  if (forbiddenPayloadIssue) {
    return emptyResult({
      blockers: [forbiddenPayloadIssue]
    });
  }

  const h10Result = buildMc001HtrNonHuNumericValueValidationReadiness(
    compositionInput.valueValidationInput
  );

  if (!h10ValuesAreReady(h10Result)) {
    return emptyResult({
      h10Result,
      blockers: [blocker("blocked_h10_values_not_ready")]
    });
  }

  const policyIssue = compositionPolicyIssue(
    compositionInput.htrTotalInputCompositionPolicy
  );
  if (policyIssue) {
    return emptyResult({
      h10Result,
      blockers: [policyIssue]
    });
  }

  const huBridgeInput = derivedHuBridgeInput(compositionInput.valueValidationInput);
  if (!isObject(huBridgeInput)) {
    return emptyResult({
      h10Result,
      blockers: [blocker("blocked_missing_hu_bridge_input")]
    });
  }

  const h6Result = buildMc001HtrTransmissionReadinessBridge(huBridgeInput);
  if (!h6BridgeIsReady(h6Result)) {
    return emptyResult({
      h10Result,
      h6Result,
      blockers: [blocker("blocked_h6_bridge_not_ready")]
    });
  }

  const huIssue = huBridgeContributionIssue(h6Result);
  if (huIssue) {
    return emptyResult({
      h10Result,
      h6Result,
      blockers: [huIssue]
    });
  }

  const nonHuValueRefs = h10ValidatedValueRefs(h10Result);
  const nonHuIssue = validatedNonHuValueIssue(nonHuValueRefs);
  if (nonHuIssue) {
    return emptyResult({
      h10Result,
      h6Result,
      blockers: [nonHuIssue]
    });
  }

  const compositionReadiness = readyCompositionReadiness(
    compositionInput.htrTotalInputCompositionPolicy,
    h10Result,
    h6Result
  );
  const composedIssue = composedInputIssue(compositionReadiness.composedInputs);
  if (composedIssue) {
    return emptyResult({
      h10Result,
      h6Result,
      blockers: [composedIssue]
    });
  }

  return emptyResult({
    status: "ready",
    h10Result,
    h6Result,
    compositionReadiness
  });
}
