import { buildMc001HtrTotalCalculationReadinessGate } from "./mc001HtrTotalCalculationReadinessGate.mjs";

export const MC001_HTR_NON_HU_NUMERIC_CONTRIBUTION_CONTRACTS_INPUT_SCHEMA_VERSION =
  "mc001-h9-htr-non-hu-numeric-contribution-contracts-input-v1";

export const MC001_HTR_NON_HU_NUMERIC_CONTRIBUTION_CONTRACTS_READINESS_SCHEMA_VERSION =
  "mc001-h9-htr-non-hu-numeric-contribution-contracts-readiness-v1";

export const H9_CONTRACT_SET_CODES = Object.freeze([
  "mc001-htr-non-hu-numeric-contribution-contracts-v1"
]);

export const H9_CONTRIBUTION_TYPES = Object.freeze([
  "thermal_bridge_transmission_contribution",
  "ground_transmission_contribution",
  "adjacent_space_transmission_contribution",
  "external_boundary_transmission_contribution"
]);

export const H9_CONTRACT_STATUSES = Object.freeze([
  "numeric_contract_mapped",
  "not_applicable_with_source",
  "not_ready"
]);

export const H9_VALUE_AVAILABILITY_STATUSES = Object.freeze([
  "source_backed_value_available",
  "missing_numeric_value",
  "not_applicable_with_source",
  "not_ready"
]);

export const H9_SOURCE_TYPES = Object.freeze([
  "calculation_record",
  "validation_fixture_import",
  "expert_override_with_source",
  "methodological_direct_input",
  "upstream_calculation_output"
]);

export const H9_REQUIRED_UNITS = Object.freeze(["W/K"]);

export const H9_MISSING_CODES = Object.freeze([
  "missing_numeric_value_ingestion_and_validation_milestone",
  "missing_htr_total_input_composition_milestone",
  "missing_htr_total_formula_execution_milestone",
  "missing_complete_htr_methodology_scope"
]);

export const H9_BLOCKER_CODES = Object.freeze([
  "blocked_invalid_h9_input",
  "blocked_raw_saved_analysis_input",
  "blocked_h8_total_scope_not_ready",
  "blocked_missing_non_hu_numeric_contracts",
  "blocked_invalid_non_hu_numeric_contracts",
  "blocked_missing_contribution_contract",
  "blocked_invalid_contribution_contract",
  "blocked_duplicate_contribution_contract",
  "blocked_hu_contribution_contract_not_allowed",
  "blocked_missing_contract_source",
  "blocked_invalid_contract_source",
  "blocked_invalid_contract_status",
  "blocked_invalid_value_availability_status",
  "blocked_invalid_required_unit",
  "blocked_unsafe_private_identifier",
  "blocked_unsafe_private_content",
  "blocked_numeric_contribution_value_not_allowed",
  "blocked_precomputed_htr_not_allowed"
]);

const CONTRACT_SET_CODE_SET = new Set(H9_CONTRACT_SET_CODES);
const CONTRIBUTION_TYPE_SET = new Set(H9_CONTRIBUTION_TYPES);
const CONTRACT_STATUS_SET = new Set(H9_CONTRACT_STATUSES);
const VALUE_AVAILABILITY_STATUS_SET = new Set(H9_VALUE_AVAILABILITY_STATUSES);
const SOURCE_TYPE_SET = new Set(H9_SOURCE_TYPES);
const REQUIRED_UNIT_SET = new Set(H9_REQUIRED_UNITS);
const MISSING_CODE_SET = new Set(H9_MISSING_CODES);
const BLOCKER_CODE_SET = new Set(H9_BLOCKER_CODES);
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
  "nonHuTransmissionValues",
  "htrFormulaResult",
  "contributionValues",
  "numericValues",
  "calculatedValues",
  "formulaResults"
]);
const FORBIDDEN_VALUE_LIKE_KEYS = Object.freeze([
  "value",
  "amount",
  "numericValue",
  "calculatedValue",
  "contributionValue",
  "nonHuTransmissionValue",
  "htrValue",
  "htrTotal",
  "htrResult",
  "htrFormulaResult",
  "formulaResult",
  "resultValue",
  "total",
  "coefficient",
  "psi",
  "chi",
  "U",
  "area",
  "bztu"
]);
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

function containsNumber(value) {
  if (typeof value === "number") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(containsNumber);
  }
  if (!isObject(value)) {
    return false;
  }
  return Object.values(value).some(containsNumber);
}

function containsForbiddenValueLikeKey(value) {
  if (Array.isArray(value)) {
    return value.some(containsForbiddenValueLikeKey);
  }
  if (!isObject(value)) {
    return false;
  }
  return Object.entries(value).some(([key, child]) => (
    FORBIDDEN_VALUE_LIKE_KEY_SET.has(key) || containsForbiddenValueLikeKey(child)
  ));
}

function hasPrecomputedHtr(value) {
  if (!isObject(value)) {
    return false;
  }
  return PRECOMPUTED_HTR_KEYS.some((key) => hasOwn(value, key));
}

function h9OwnedPrecomputedHtr(input) {
  if (!isObject(input)) {
    return false;
  }
  const localInput = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== "htrTotalReadinessInput")
  );
  return hasPrecomputedHtr(localInput) || hasPrecomputedHtr(input.nonHuNumericContributionContracts);
}

function h9OwnedNumericValuePayload(input) {
  if (!isObject(input)) {
    return false;
  }
  const localInput = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== "htrTotalReadinessInput")
  );
  return (
    containsNumber(localInput) ||
    containsForbiddenValueLikeKey(localInput)
  );
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

function blocker(code) {
  const safeCode = BLOCKER_CODE_SET.has(code) ? code : "blocked_invalid_h9_input";
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

function blockedContractsReadiness(h8Result) {
  return Object.freeze({
    status: "blocked",
    h8ReadinessStatus: h8Result?.status === "ready" ? "ready" : "blocked",
    contractSetCode: null,
    contributionContracts: Object.freeze([]),
    missingForHtrTotalCalculation: Object.freeze([])
  });
}

function readinessFromH8(h8Result, areNonHuHtrNumericContributionContractsMapped) {
  return Object.freeze({
    isHuInventoryReady: h8Result?.readiness?.isHuInventoryReady === true,
    isHuComponentTermCalculationReady:
      h8Result?.readiness?.isHuComponentTermCalculationReady === true,
    areHuComponentTermsCalculated:
      h8Result?.readiness?.areHuComponentTermsCalculated === true,
    isHuAggregationReady: h8Result?.readiness?.isHuAggregationReady === true,
    hasHuAggregationResult: h8Result?.readiness?.hasHuAggregationResult === true,
    isHuAggregationAvailableForHtr:
      h8Result?.readiness?.isHuAggregationAvailableForHtr === true,
    isHtrTransmissionBridgeReady:
      h8Result?.readiness?.isHtrTransmissionBridgeReady === true,
    areNonHuHtrPrerequisitesMapped:
      h8Result?.readiness?.areNonHuHtrPrerequisitesMapped === true,
    isHtrTotalCalculationScopeMapped:
      h8Result?.readiness?.isHtrTotalCalculationScopeMapped === true,
    areNonHuHtrNumericContributionContractsMapped,
    areNonHuHtrNumericValuesValidated: false,
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
  h8Result = null,
  contractsReadiness = null,
  blockers = [],
  counts = null
} = {}) {
  const safeBlockers = uniqueByCode(blockers);
  const isReady = status === "ready";
  const readiness =
    contractsReadiness ?? blockedContractsReadiness(h8Result);
  const contracts = Array.isArray(readiness.contributionContracts)
    ? readiness.contributionContracts
    : [];
  const missing = Array.isArray(readiness.missingForHtrTotalCalculation)
    ? readiness.missingForHtrTotalCalculation
    : [];
  const resolvedCounts = counts ?? Object.freeze({
    contributionContracts: contracts.length,
    mappedContracts: contracts.filter((contract) => (
      contract.contractStatus === "numeric_contract_mapped"
    )).length,
    notApplicableContracts: contracts.filter((contract) => (
      contract.contractStatus === "not_applicable_with_source"
    )).length,
    notReadyContracts: contracts.filter((contract) => (
      contract.contractStatus === "not_ready"
    )).length,
    missingForHtrTotalCalculation: missing.length,
    blockers: safeBlockers.length
  });

  return Object.freeze({
    schemaVersion:
      MC001_HTR_NON_HU_NUMERIC_CONTRIBUTION_CONTRACTS_READINESS_SCHEMA_VERSION,
    isMc001HtrNonHuNumericContributionContractsReadiness: true,
    status,
    readiness: readinessFromH8(h8Result, isReady),
    htrNonHuNumericContributionContractsReadiness: readiness,
    blockers: safeBlockers,
    counts: Object.freeze({
      contributionContracts:
        resolvedCounts.contributionContracts ?? contracts.length,
      mappedContracts: resolvedCounts.mappedContracts ?? 0,
      notApplicableContracts: resolvedCounts.notApplicableContracts ?? 0,
      notReadyContracts: resolvedCounts.notReadyContracts ?? 0,
      missingForHtrTotalCalculation:
        resolvedCounts.missingForHtrTotalCalculation ?? missing.length,
      blockers: safeBlockers.length
    })
  });
}

function h8TotalScopeIsReady(h8Result) {
  return (
    h8Result?.status === "ready" &&
    h8Result?.readiness?.isHtrTotalCalculationScopeMapped === true &&
    h8Result?.readiness?.isHtrTransmissionBridgeReady === true &&
    h8Result?.readiness?.isHuAggregationAvailableForHtr === true &&
    h8Result?.readiness?.areNonHuHtrPrerequisitesMapped === true
  );
}

function sourceIssue(source, required) {
  if (!isObject(source)) {
    return required ? blocker("blocked_missing_contract_source") : null;
  }
  if (containsPrivateContent(source)) {
    return blocker("blocked_unsafe_private_content");
  }
  if (!SOURCE_TYPE_SET.has(source.sourceType)) {
    return blocker("blocked_invalid_contract_source");
  }
  if (!sourceRecordIdLooksSafe(source.sourceRecordId)) {
    return blocker("blocked_invalid_contract_source");
  }
  return null;
}

function requiredUnitIssue(contract, required) {
  if (!hasOwn(contract, "requiredUnit")) {
    return required ? blocker("blocked_invalid_required_unit") : null;
  }
  if (!REQUIRED_UNIT_SET.has(contract.requiredUnit)) {
    return blocker("blocked_invalid_required_unit");
  }
  return null;
}

function contractRuleIssue(contract) {
  if (contract.contractStatus === "numeric_contract_mapped") {
    if (contract.valueAvailabilityStatus !== "source_backed_value_available") {
      return blocker("blocked_invalid_value_availability_status");
    }
    const unitBlocker = requiredUnitIssue(contract, true);
    if (unitBlocker) {
      return unitBlocker;
    }
    return sourceIssue(contract.source, true);
  }

  if (contract.contractStatus === "not_applicable_with_source") {
    if (contract.valueAvailabilityStatus !== "not_applicable_with_source") {
      return blocker("blocked_invalid_value_availability_status");
    }
    const unitBlocker = requiredUnitIssue(contract, false);
    if (unitBlocker) {
      return unitBlocker;
    }
    return sourceIssue(contract.source, true);
  }

  if (contract.contractStatus === "not_ready") {
    if (
      contract.valueAvailabilityStatus !== "missing_numeric_value" &&
      contract.valueAvailabilityStatus !== "not_ready"
    ) {
      return blocker("blocked_invalid_value_availability_status");
    }
    const unitBlocker = requiredUnitIssue(contract, false);
    if (unitBlocker) {
      return unitBlocker;
    }
    return sourceIssue(contract.source, false);
  }

  return blocker("blocked_invalid_contract_status");
}

function contributionContractIssue(contract) {
  if (!isObject(contract)) {
    return blocker("blocked_invalid_contribution_contract");
  }
  if (hasPrecomputedHtr(contract)) {
    return blocker("blocked_precomputed_htr_not_allowed");
  }
  if (containsPrivateContent(contract)) {
    return blocker("blocked_unsafe_private_content");
  }
  if (containsNumber(contract) || containsForbiddenValueLikeKey(contract)) {
    return blocker("blocked_numeric_contribution_value_not_allowed");
  }
  if (contract.contributionType === HU_CONTRIBUTION_TYPE) {
    return blocker("blocked_hu_contribution_contract_not_allowed");
  }
  if (!CONTRIBUTION_TYPE_SET.has(contract.contributionType)) {
    return blocker("blocked_invalid_contribution_contract");
  }
  if (!CONTRACT_STATUS_SET.has(contract.contractStatus)) {
    return blocker("blocked_invalid_contract_status");
  }
  if (!VALUE_AVAILABILITY_STATUS_SET.has(contract.valueAvailabilityStatus)) {
    return blocker("blocked_invalid_value_availability_status");
  }
  return contractRuleIssue(contract);
}

function duplicateContractIssue(contracts) {
  const seen = new Set();
  for (const contract of contracts) {
    if (!isObject(contract)) {
      continue;
    }
    if (seen.has(contract.contributionType)) {
      return blocker("blocked_duplicate_contribution_contract");
    }
    seen.add(contract.contributionType);
  }
  return null;
}

function contributionContractRefFrom(contract) {
  const ref = {
    contributionType: contract.contributionType,
    contractStatus: contract.contractStatus,
    valueAvailabilityStatus: contract.valueAvailabilityStatus
  };
  if (hasOwn(contract, "requiredUnit")) {
    ref.requiredUnit = contract.requiredUnit;
  }
  return Object.freeze(ref);
}

function contractsSetIssue(contractSet) {
  if (!isObject(contractSet)) {
    return blocker("blocked_missing_non_hu_numeric_contracts");
  }
  if (hasPrecomputedHtr(contractSet)) {
    return blocker("blocked_precomputed_htr_not_allowed");
  }
  if (containsPrivateContent(contractSet)) {
    return blocker("blocked_unsafe_private_content");
  }
  if (containsNumber(contractSet) || containsForbiddenValueLikeKey(contractSet)) {
    return blocker("blocked_numeric_contribution_value_not_allowed");
  }
  if (!CONTRACT_SET_CODE_SET.has(contractSet.contractSetCode)) {
    return blocker("blocked_invalid_non_hu_numeric_contracts");
  }
  const contracts = contractSet.contributionContracts;
  if (!Array.isArray(contracts) || contracts.length === 0) {
    return blocker("blocked_missing_contribution_contract");
  }
  const duplicateBlocker = duplicateContractIssue(contracts);
  if (duplicateBlocker) {
    return duplicateBlocker;
  }
  for (const contract of contracts) {
    const issue = contributionContractIssue(contract);
    if (issue) {
      return issue;
    }
  }
  return null;
}

function missingForHtrTotalCalculation() {
  return Object.freeze([
    missingEntry("missing_numeric_value_ingestion_and_validation_milestone"),
    missingEntry("missing_htr_total_input_composition_milestone"),
    missingEntry("missing_htr_total_formula_execution_milestone")
  ]);
}

function readyContractsReadiness(contractSet) {
  return Object.freeze({
    status: "contracts_mapped_not_values_validated",
    h8ReadinessStatus: "ready",
    contractSetCode: "mc001-htr-non-hu-numeric-contribution-contracts-v1",
    contributionContracts: Object.freeze(
      contractSet.contributionContracts.map(contributionContractRefFrom)
    ),
    missingForHtrTotalCalculation: missingForHtrTotalCalculation()
  });
}

function countsFromContractSet(contractSet, blockers = 0) {
  const contracts = Array.isArray(contractSet?.contributionContracts)
    ? contractSet.contributionContracts.filter(isObject)
    : [];
  return Object.freeze({
    contributionContracts: Array.isArray(contractSet?.contributionContracts)
      ? contractSet.contributionContracts.length
      : 0,
    mappedContracts: contracts.filter((contract) => (
      contract.contractStatus === "numeric_contract_mapped"
    )).length,
    notApplicableContracts: contracts.filter((contract) => (
      contract.contractStatus === "not_applicable_with_source"
    )).length,
    notReadyContracts: contracts.filter((contract) => (
      contract.contractStatus === "not_ready"
    )).length,
    missingForHtrTotalCalculation: 0,
    blockers
  });
}

export function buildMc001HtrNonHuNumericContributionContractsReadiness(
  contractInput,
  options = {}
) {
  void options;

  if (!isObject(contractInput)) {
    return emptyResult({
      blockers: [blocker("blocked_invalid_h9_input")]
    });
  }

  if (rawSavedAnalysisLike(contractInput)) {
    return emptyResult({
      blockers: [blocker("blocked_raw_saved_analysis_input")]
    });
  }

  if (
    contractInput.schemaVersion !==
      MC001_HTR_NON_HU_NUMERIC_CONTRIBUTION_CONTRACTS_INPUT_SCHEMA_VERSION ||
    contractInput.isMc001HtrNonHuNumericContributionContractsInput !== true
  ) {
    return emptyResult({
      blockers: [blocker("blocked_invalid_h9_input")]
    });
  }

  if (h9OwnedPrecomputedHtr(contractInput)) {
    return emptyResult({
      blockers: [blocker("blocked_precomputed_htr_not_allowed")]
    });
  }

  if (h9OwnedNumericValuePayload(contractInput)) {
    return emptyResult({
      blockers: [blocker("blocked_numeric_contribution_value_not_allowed")]
    });
  }

  const h8Result = buildMc001HtrTotalCalculationReadinessGate(
    contractInput.htrTotalReadinessInput
  );

  if (!h8TotalScopeIsReady(h8Result)) {
    return emptyResult({
      h8Result,
      blockers: [blocker("blocked_h8_total_scope_not_ready")]
    });
  }

  const contractSet = contractInput.nonHuNumericContributionContracts;
  const issue = contractsSetIssue(contractSet);
  if (issue) {
    return emptyResult({
      h8Result,
      blockers: [issue],
      counts: countsFromContractSet(contractSet, 1)
    });
  }

  const contractsReadiness = readyContractsReadiness(contractSet);
  return emptyResult({
    status: "ready",
    h8Result,
    contractsReadiness,
    counts: Object.freeze({
      contributionContracts: contractsReadiness.contributionContracts.length,
      mappedContracts: contractsReadiness.contributionContracts.filter((contract) => (
        contract.contractStatus === "numeric_contract_mapped"
      )).length,
      notApplicableContracts: contractsReadiness.contributionContracts.filter((contract) => (
        contract.contractStatus === "not_applicable_with_source"
      )).length,
      notReadyContracts: contractsReadiness.contributionContracts.filter((contract) => (
        contract.contractStatus === "not_ready"
      )).length,
      missingForHtrTotalCalculation:
        contractsReadiness.missingForHtrTotalCalculation.length,
      blockers: 0
    })
  });
}
