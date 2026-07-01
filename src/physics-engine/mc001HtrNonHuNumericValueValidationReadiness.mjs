import { buildMc001HtrNonHuNumericContributionContractsReadiness } from "./mc001HtrNonHuNumericContributionContractsReadiness.mjs";

export const MC001_HTR_NON_HU_NUMERIC_VALUE_VALIDATION_INPUT_SCHEMA_VERSION =
  "mc001-h10-htr-non-hu-numeric-value-validation-input-v1";

export const MC001_HTR_NON_HU_NUMERIC_VALUE_VALIDATION_READINESS_SCHEMA_VERSION =
  "mc001-h10-htr-non-hu-numeric-value-validation-readiness-v1";

export const H10_VALUE_SET_CODES = Object.freeze([
  "mc001-htr-non-hu-numeric-contribution-values-v1"
]);

export const H10_CONTRIBUTION_TYPES = Object.freeze([
  "thermal_bridge_transmission_contribution",
  "ground_transmission_contribution",
  "adjacent_space_transmission_contribution",
  "external_boundary_transmission_contribution"
]);

export const H10_VALUE_STATUSES = Object.freeze([
  "explicit_source_backed_value",
  "not_applicable_with_source",
  "missing_value",
  "not_ready"
]);

export const H10_VALIDATED_VALUE_STATUSES = Object.freeze([
  "validated_source_backed_numeric_value",
  "not_applicable_with_source"
]);

export const H10_SOURCE_TYPES = Object.freeze([
  "calculation_record",
  "validation_fixture_import",
  "expert_override_with_source",
  "methodological_direct_input",
  "upstream_calculation_output"
]);

export const H10_REQUIRED_UNITS = Object.freeze(["W/K"]);

export const H10_MISSING_CODES = Object.freeze([
  "missing_htr_total_input_composition_milestone",
  "missing_htr_total_formula_execution_milestone",
  "missing_complete_htr_methodology_scope"
]);

export const H10_BLOCKER_CODES = Object.freeze([
  "blocked_invalid_h10_input",
  "blocked_raw_saved_analysis_input",
  "blocked_h9_contracts_not_ready",
  "blocked_missing_non_hu_numeric_values",
  "blocked_invalid_non_hu_numeric_values",
  "blocked_missing_contribution_value",
  "blocked_unexpected_contribution_value",
  "blocked_duplicate_contribution_value",
  "blocked_hu_contribution_value_not_allowed",
  "blocked_missing_numeric_value",
  "blocked_invalid_numeric_value",
  "blocked_invalid_value_status",
  "blocked_invalid_value_set_code",
  "blocked_invalid_required_unit",
  "blocked_missing_value_source",
  "blocked_invalid_value_source",
  "blocked_unsafe_private_identifier",
  "blocked_unsafe_private_content",
  "blocked_forbidden_physical_input_not_allowed",
  "blocked_precomputed_htr_not_allowed",
  "blocked_contract_value_mismatch",
  "blocked_hidden_fallback_value_not_allowed"
]);

const VALUE_SET_CODE_SET = new Set(H10_VALUE_SET_CODES);
const CONTRIBUTION_TYPE_SET = new Set(H10_CONTRIBUTION_TYPES);
const VALUE_STATUS_SET = new Set(H10_VALUE_STATUSES);
const SOURCE_TYPE_SET = new Set(H10_SOURCE_TYPES);
const REQUIRED_UNIT_SET = new Set(H10_REQUIRED_UNITS);
const MISSING_CODE_SET = new Set(H10_MISSING_CODES);
const BLOCKER_CODE_SET = new Set(H10_BLOCKER_CODES);
const HU_CONTRIBUTION_TYPE = "hu_aggregated_transmission_contribution";
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
const FORBIDDEN_VALUE_LIKE_KEYS = Object.freeze([
  "amount",
  "numericValue",
  "calculatedValue",
  "nonHuTransmissionValue",
  "htrValue",
  "htrTotal",
  "htrResult",
  "htrFormulaResult",
  "formulaResult",
  "resultValue",
  "total",
  "totalHtr",
  "calculatedHtr"
]);
const PRECOMPUTED_HTR_KEY_SET = new Set(PRECOMPUTED_HTR_KEYS);
const FORBIDDEN_PHYSICAL_INPUT_KEY_SET =
  new Set(FORBIDDEN_PHYSICAL_INPUT_KEYS);
const FORBIDDEN_VALUE_LIKE_KEY_SET = new Set(FORBIDDEN_VALUE_LIKE_KEYS);
const PRIVATE_CONTENT_PATTERN =
  /(@|\+40722111222|person@example\.com|john|doe|strada|owner|private|person|record-JohnDoe|record-001|owner-snapshot|private-note|person-name|free text note|sourceContext|sourceTrace|sourceLocator|sourceRefs)/i;
const RECORD_ID_PATTERN = /^record:[a-z0-9][a-z0-9_.:/-]{0,79}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.hasOwn(value, key);
}

function hasRequiredString(value) {
  return typeof value === "string" && value.trim() !== "";
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

function sourceRecordIdLooksSafe(value) {
  return (
    hasRequiredString(value) &&
    !PRIVATE_CONTENT_PATTERN.test(value) &&
    !/[{}\[\]"'<>\s@]/.test(value) &&
    value.length <= 96 &&
    (RECORD_ID_PATTERN.test(value) || UUID_PATTERN.test(value))
  );
}

function allowedAmountPath(path) {
  return (
    path.length === 5 &&
    path[0] === "nonHuNumericContributionValues" &&
    path[1] === "contributionValues" &&
    path[3] === "contributionValue" &&
    path[4] === "amount"
  );
}

function allowedUnitPath(path) {
  return (
    path.length === 5 &&
    path[0] === "nonHuNumericContributionValues" &&
    path[1] === "contributionValues" &&
    path[3] === "contributionValue" &&
    path[4] === "unit"
  );
}

function h10OwnedForbiddenPayloadIssue(value, path = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const issue = h10OwnedForbiddenPayloadIssue(
        value[index],
        [...path, String(index)]
      );
      if (issue) {
        return issue;
      }
    }
    return null;
  }

  if (!isObject(value)) {
    if (typeof value === "number" && !allowedAmountPath(path)) {
      return blocker("blocked_hidden_fallback_value_not_allowed");
    }
    return null;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key];
    if (PRECOMPUTED_HTR_KEY_SET.has(key)) {
      return blocker("blocked_precomputed_htr_not_allowed");
    }
    if (FORBIDDEN_PHYSICAL_INPUT_KEY_SET.has(key)) {
      return blocker("blocked_forbidden_physical_input_not_allowed");
    }
    if (
      FORBIDDEN_VALUE_LIKE_KEY_SET.has(key) &&
      !allowedAmountPath(childPath)
    ) {
      return blocker("blocked_hidden_fallback_value_not_allowed");
    }
    if (key === "unit" && !allowedUnitPath(childPath)) {
      return blocker("blocked_invalid_required_unit");
    }
    const issue = h10OwnedForbiddenPayloadIssue(child, childPath);
    if (issue) {
      return issue;
    }
  }
  return null;
}

function h10OwnedLocalInput(valueInput) {
  return Object.fromEntries(
    Object.entries(valueInput).filter(([key]) => key !== "contractReadinessInput")
  );
}

function blocker(code) {
  const safeCode = BLOCKER_CODE_SET.has(code) ? code : "blocked_invalid_h10_input";
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

function blockedValueValidationReadiness(h9Result) {
  return Object.freeze({
    status: "blocked",
    h9ContractStatus: h9Result?.status === "ready" ? "ready" : "blocked",
    valueSetCode: null,
    validatedContributionValues: Object.freeze([]),
    missingForHtrTotalCalculation: Object.freeze([])
  });
}

function readinessFromH9(h9Result, areNonHuHtrNumericValuesValidated) {
  return Object.freeze({
    isHuInventoryReady: h9Result?.readiness?.isHuInventoryReady === true,
    isHuComponentTermCalculationReady:
      h9Result?.readiness?.isHuComponentTermCalculationReady === true,
    areHuComponentTermsCalculated:
      h9Result?.readiness?.areHuComponentTermsCalculated === true,
    isHuAggregationReady: h9Result?.readiness?.isHuAggregationReady === true,
    hasHuAggregationResult: h9Result?.readiness?.hasHuAggregationResult === true,
    isHuAggregationAvailableForHtr:
      h9Result?.readiness?.isHuAggregationAvailableForHtr === true,
    isHtrTransmissionBridgeReady:
      h9Result?.readiness?.isHtrTransmissionBridgeReady === true,
    areNonHuHtrPrerequisitesMapped:
      h9Result?.readiness?.areNonHuHtrPrerequisitesMapped === true,
    isHtrTotalCalculationScopeMapped:
      h9Result?.readiness?.isHtrTotalCalculationScopeMapped === true,
    areNonHuHtrNumericContributionContractsMapped:
      h9Result?.readiness?.areNonHuHtrNumericContributionContractsMapped === true,
    areNonHuHtrNumericValuesValidated,
    areHtrTotalInputsNumericallyReady: false,
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
  h9Result = null,
  valueValidationReadiness = null,
  blockers = [],
  counts = null
} = {}) {
  const safeBlockers = uniqueByCode(blockers);
  const isReady = status === "ready";
  const readiness =
    valueValidationReadiness ?? blockedValueValidationReadiness(h9Result);
  const validatedValues = Array.isArray(readiness.validatedContributionValues)
    ? readiness.validatedContributionValues
    : [];
  const resolvedCounts = counts ?? Object.freeze({
    contributionValues: validatedValues.length,
    validatedValues: validatedValues.filter((valueRef) => (
      valueRef.valueStatus === "validated_source_backed_numeric_value"
    )).length,
    notApplicableValues: validatedValues.filter((valueRef) => (
      valueRef.valueStatus === "not_applicable_with_source"
    )).length,
    missingValues: 0,
    blockers: safeBlockers.length
  });

  return Object.freeze({
    schemaVersion:
      MC001_HTR_NON_HU_NUMERIC_VALUE_VALIDATION_READINESS_SCHEMA_VERSION,
    isMc001HtrNonHuNumericValueValidationReadiness: true,
    status,
    readiness: readinessFromH9(h9Result, isReady),
    htrNonHuNumericValueValidationReadiness: readiness,
    blockers: safeBlockers,
    counts: Object.freeze({
      contributionValues:
        resolvedCounts.contributionValues ?? validatedValues.length,
      validatedValues: resolvedCounts.validatedValues ?? 0,
      notApplicableValues: resolvedCounts.notApplicableValues ?? 0,
      missingValues: resolvedCounts.missingValues ?? 0,
      blockers: safeBlockers.length
    })
  });
}

function h9ContractsAreReady(h9Result) {
  return (
    h9Result?.status === "ready" &&
    h9Result?.readiness?.areNonHuHtrNumericContributionContractsMapped === true &&
    h9Result?.readiness?.isHtrTotalCalculationScopeMapped === true &&
    h9Result?.readiness?.areNonHuHtrPrerequisitesMapped === true &&
    h9Result?.readiness?.isHtrTransmissionBridgeReady === true &&
    h9Result?.readiness?.isHuAggregationAvailableForHtr === true
  );
}

function sourceIssue(source, required) {
  if (!isObject(source)) {
    return required ? blocker("blocked_missing_value_source") : null;
  }
  if (containsPrivateContent(source)) {
    return blocker("blocked_unsafe_private_content");
  }
  if (!SOURCE_TYPE_SET.has(source.sourceType)) {
    return blocker("blocked_invalid_value_source");
  }
  if (!sourceRecordIdLooksSafe(source.sourceRecordId)) {
    return blocker("blocked_invalid_value_source");
  }
  return null;
}

function contractRefsFromH9(h9Result) {
  const refs =
    h9Result?.htrNonHuNumericContributionContractsReadiness?.contributionContracts;
  return Array.isArray(refs) ? refs : [];
}

function contributionContractByType(h9Result) {
  const contracts = new Map();
  for (const contractRef of contractRefsFromH9(h9Result)) {
    if (isObject(contractRef) && hasRequiredString(contractRef.contributionType)) {
      contracts.set(contractRef.contributionType, contractRef);
    }
  }
  return contracts;
}

function duplicateValueIssue(values) {
  const seen = new Set();
  for (const valueEntry of values) {
    if (!isObject(valueEntry)) {
      continue;
    }
    if (seen.has(valueEntry.contributionType)) {
      return blocker("blocked_duplicate_contribution_value");
    }
    seen.add(valueEntry.contributionType);
  }
  return null;
}

function explicitValueIssue(valueEntry, contractRef) {
  if (
    contractRef.contractStatus !== "numeric_contract_mapped" ||
    contractRef.valueAvailabilityStatus !== "source_backed_value_available"
  ) {
    return blocker("blocked_contract_value_mismatch");
  }
  if (!isObject(valueEntry.contributionValue)) {
    return blocker("blocked_missing_numeric_value");
  }
  if (
    !hasOwn(valueEntry.contributionValue, "amount") ||
    typeof valueEntry.contributionValue.amount !== "number"
  ) {
    return blocker("blocked_missing_numeric_value");
  }
  if (!Number.isFinite(valueEntry.contributionValue.amount)) {
    return blocker("blocked_invalid_numeric_value");
  }
  if (valueEntry.contributionValue.unit !== "W/K") {
    return blocker("blocked_invalid_required_unit");
  }
  return sourceIssue(valueEntry.source, true);
}

function notApplicableValueIssue(valueEntry, contractRef) {
  if (
    contractRef.contractStatus !== "not_applicable_with_source" ||
    contractRef.valueAvailabilityStatus !== "not_applicable_with_source"
  ) {
    return blocker("blocked_contract_value_mismatch");
  }
  if (hasOwn(valueEntry, "contributionValue")) {
    return blocker("blocked_contract_value_mismatch");
  }
  return sourceIssue(valueEntry.source, true);
}

function contributionValueIssue(valueEntry, contractsByType) {
  if (!isObject(valueEntry)) {
    return blocker("blocked_invalid_non_hu_numeric_values");
  }
  if (containsPrivateContent(valueEntry)) {
    return blocker("blocked_unsafe_private_content");
  }
  const forbiddenPayloadIssue = h10OwnedForbiddenPayloadIssue({
    nonHuNumericContributionValues: {
      contributionValues: [valueEntry]
    }
  });
  if (forbiddenPayloadIssue) {
    return forbiddenPayloadIssue;
  }
  if (valueEntry.contributionType === HU_CONTRIBUTION_TYPE) {
    return blocker("blocked_hu_contribution_value_not_allowed");
  }
  if (!CONTRIBUTION_TYPE_SET.has(valueEntry.contributionType)) {
    return blocker("blocked_invalid_non_hu_numeric_values");
  }
  const contractRef = contractsByType.get(valueEntry.contributionType);
  if (!contractRef) {
    return blocker("blocked_unexpected_contribution_value");
  }
  if (!VALUE_STATUS_SET.has(valueEntry.valueStatus)) {
    return blocker("blocked_invalid_value_status");
  }
  if (valueEntry.valueStatus === "explicit_source_backed_value") {
    return explicitValueIssue(valueEntry, contractRef);
  }
  if (valueEntry.valueStatus === "not_applicable_with_source") {
    return notApplicableValueIssue(valueEntry, contractRef);
  }
  if (
    valueEntry.valueStatus === "missing_value" ||
    valueEntry.valueStatus === "not_ready"
  ) {
    if (hasOwn(valueEntry, "contributionValue")) {
      return blocker("blocked_contract_value_mismatch");
    }
    return blocker("blocked_missing_numeric_value");
  }
  return blocker("blocked_invalid_value_status");
}

function valueSetIssue(valueSet, contractsByType) {
  if (!isObject(valueSet)) {
    return blocker("blocked_missing_non_hu_numeric_values");
  }
  if (containsPrivateContent(valueSet)) {
    return blocker("blocked_unsafe_private_content");
  }
  const forbiddenPayloadIssue = h10OwnedForbiddenPayloadIssue({
    nonHuNumericContributionValues: valueSet
  });
  if (forbiddenPayloadIssue) {
    return forbiddenPayloadIssue;
  }
  if (!VALUE_SET_CODE_SET.has(valueSet.valueSetCode)) {
    return blocker("blocked_invalid_value_set_code");
  }
  const values = valueSet.contributionValues;
  if (!Array.isArray(values) || values.length === 0) {
    return blocker("blocked_missing_contribution_value");
  }
  const duplicateBlocker = duplicateValueIssue(values);
  if (duplicateBlocker) {
    return duplicateBlocker;
  }
  for (const valueEntry of values) {
    const issue = contributionValueIssue(valueEntry, contractsByType);
    if (issue) {
      return issue;
    }
  }
  for (const contractType of contractsByType.keys()) {
    const matchingValue = values.find((valueEntry) => (
      isObject(valueEntry) && valueEntry.contributionType === contractType
    ));
    if (!matchingValue) {
      return blocker("blocked_missing_contribution_value");
    }
  }
  return null;
}

function validatedContributionValueRefFrom(valueEntry) {
  if (valueEntry.valueStatus === "not_applicable_with_source") {
    return Object.freeze({
      contributionType: valueEntry.contributionType,
      valueStatus: "not_applicable_with_source"
    });
  }
  return Object.freeze({
    contributionType: valueEntry.contributionType,
    valueStatus: "validated_source_backed_numeric_value",
    contributionValue: Object.freeze({
      amount: valueEntry.contributionValue.amount,
      unit: "W/K"
    })
  });
}

function missingForHtrTotalCalculation() {
  return Object.freeze([
    missingEntry("missing_htr_total_input_composition_milestone"),
    missingEntry("missing_htr_total_formula_execution_milestone")
  ]);
}

function readyValueValidationReadiness(valueSet) {
  return Object.freeze({
    status: "values_validated_not_htr_total_inputs_composed",
    h9ContractStatus: "ready",
    valueSetCode: "mc001-htr-non-hu-numeric-contribution-values-v1",
    validatedContributionValues: Object.freeze(
      valueSet.contributionValues.map(validatedContributionValueRefFrom)
    ),
    missingForHtrTotalCalculation: missingForHtrTotalCalculation()
  });
}

function countsFromValueSet(valueSet, blockers = 0) {
  const values = Array.isArray(valueSet?.contributionValues)
    ? valueSet.contributionValues.filter(isObject)
    : [];
  return Object.freeze({
    contributionValues: Array.isArray(valueSet?.contributionValues)
      ? valueSet.contributionValues.length
      : 0,
    validatedValues: values.filter((valueEntry) => (
      valueEntry.valueStatus === "explicit_source_backed_value"
    )).length,
    notApplicableValues: values.filter((valueEntry) => (
      valueEntry.valueStatus === "not_applicable_with_source"
    )).length,
    missingValues: values.filter((valueEntry) => (
      valueEntry.valueStatus === "missing_value" ||
      valueEntry.valueStatus === "not_ready"
    )).length,
    blockers
  });
}

export function buildMc001HtrNonHuNumericValueValidationReadiness(
  valueInput,
  options = {}
) {
  void options;

  if (!isObject(valueInput)) {
    return emptyResult({
      blockers: [blocker("blocked_invalid_h10_input")]
    });
  }

  if (rawSavedAnalysisLike(valueInput)) {
    return emptyResult({
      blockers: [blocker("blocked_raw_saved_analysis_input")]
    });
  }

  if (
    valueInput.schemaVersion !==
      MC001_HTR_NON_HU_NUMERIC_VALUE_VALIDATION_INPUT_SCHEMA_VERSION ||
    valueInput.isMc001HtrNonHuNumericValueValidationInput !== true
  ) {
    return emptyResult({
      blockers: [blocker("blocked_invalid_h10_input")]
    });
  }

  const localInput = h10OwnedLocalInput(valueInput);
  const localPayloadIssue = h10OwnedForbiddenPayloadIssue(localInput);
  if (localPayloadIssue) {
    return emptyResult({
      blockers: [localPayloadIssue]
    });
  }

  const h9Result = buildMc001HtrNonHuNumericContributionContractsReadiness(
    valueInput.contractReadinessInput
  );

  if (!h9ContractsAreReady(h9Result)) {
    return emptyResult({
      h9Result,
      blockers: [blocker("blocked_h9_contracts_not_ready")]
    });
  }

  const contractsByType = contributionContractByType(h9Result);
  const valueSet = valueInput.nonHuNumericContributionValues;
  const issue = valueSetIssue(valueSet, contractsByType);
  if (issue) {
    return emptyResult({
      h9Result,
      blockers: [issue],
      counts: countsFromValueSet(valueSet, 1)
    });
  }

  const valueValidationReadiness = readyValueValidationReadiness(valueSet);
  return emptyResult({
    status: "ready",
    h9Result,
    valueValidationReadiness,
    counts: Object.freeze({
      contributionValues:
        valueValidationReadiness.validatedContributionValues.length,
      validatedValues:
        valueValidationReadiness.validatedContributionValues.filter((valueRef) => (
          valueRef.valueStatus === "validated_source_backed_numeric_value"
        )).length,
      notApplicableValues:
        valueValidationReadiness.validatedContributionValues.filter((valueRef) => (
          valueRef.valueStatus === "not_applicable_with_source"
        )).length,
      missingValues: 0,
      blockers: 0
    })
  });
}
