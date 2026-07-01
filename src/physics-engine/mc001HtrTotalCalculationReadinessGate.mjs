import { buildMc001HtrNonHuPrerequisitesReadiness } from "./mc001HtrNonHuPrerequisitesReadiness.mjs";

export const MC001_HTR_TOTAL_CALCULATION_READINESS_INPUT_SCHEMA_VERSION =
  "mc001-h8-htr-total-calculation-readiness-input-v1";

export const MC001_HTR_TOTAL_CALCULATION_READINESS_GATE_SCHEMA_VERSION =
  "mc001-h8-htr-total-calculation-readiness-gate-v1";

export const H8_SCOPE_CODES = Object.freeze([
  "mc001-htr-total-calculation-scope-v1"
]);

export const H8_CONTRIBUTION_TYPES = Object.freeze([
  "hu_aggregated_transmission_contribution",
  "thermal_bridge_transmission_contribution",
  "ground_transmission_contribution",
  "adjacent_space_transmission_contribution",
  "external_boundary_transmission_contribution"
]);

export const H8_REQUIREMENT_STATUSES = Object.freeze([
  "available_from_hu_bridge",
  "missing_numeric_calculation",
  "not_applicable_with_source",
  "not_ready"
]);

export const H8_SOURCE_TYPES = Object.freeze([
  "calculation_record",
  "validation_fixture_import",
  "expert_override_with_source",
  "methodological_direct_input"
]);

export const H8_MISSING_CODES = Object.freeze([
  "missing_numeric_non_hu_transmission_contributions",
  "missing_numeric_htr_contribution_contracts",
  "missing_htr_total_formula_execution_milestone",
  "missing_complete_htr_methodology_scope"
]);

export const H8_BLOCKER_CODES = Object.freeze([
  "blocked_invalid_h8_input",
  "blocked_raw_saved_analysis_input",
  "blocked_h7_prerequisites_not_ready",
  "blocked_missing_htr_total_scope",
  "blocked_invalid_htr_total_scope",
  "blocked_missing_contribution_requirement",
  "blocked_invalid_contribution_requirement",
  "blocked_duplicate_contribution_requirement",
  "blocked_missing_contribution_source",
  "blocked_invalid_contribution_source",
  "blocked_unsafe_private_identifier",
  "blocked_unsafe_private_content",
  "blocked_numeric_contribution_value_not_allowed",
  "blocked_precomputed_htr_not_allowed"
]);

const SCOPE_CODE_SET = new Set(H8_SCOPE_CODES);
const CONTRIBUTION_TYPE_SET = new Set(H8_CONTRIBUTION_TYPES);
const REQUIREMENT_STATUS_SET = new Set(H8_REQUIREMENT_STATUSES);
const SOURCE_TYPE_SET = new Set(H8_SOURCE_TYPES);
const MISSING_CODE_SET = new Set(H8_MISSING_CODES);
const BLOCKER_CODE_SET = new Set(H8_BLOCKER_CODES);
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
  "htrFormulaResult"
]);
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

function hasPrecomputedHtr(value) {
  if (!isObject(value)) {
    return false;
  }
  return PRECOMPUTED_HTR_KEYS.some((key) => hasOwn(value, key));
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
  const safeCode = BLOCKER_CODE_SET.has(code) ? code : "blocked_invalid_h8_input";
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

function blockedCalculationReadiness(h7Result) {
  return Object.freeze({
    status: "blocked",
    h7PrerequisitesStatus: h7Result?.status === "ready" ? "ready" : "blocked",
    scopeCode: null,
    contributionRequirements: Object.freeze([]),
    missingForHtrTotalCalculation: Object.freeze([])
  });
}

function readinessFromH7(h7Result, isHtrTotalCalculationScopeMapped) {
  return Object.freeze({
    isHuInventoryReady: h7Result?.readiness?.isHuInventoryReady === true,
    isHuComponentTermCalculationReady:
      h7Result?.readiness?.isHuComponentTermCalculationReady === true,
    areHuComponentTermsCalculated:
      h7Result?.readiness?.areHuComponentTermsCalculated === true,
    isHuAggregationReady: h7Result?.readiness?.isHuAggregationReady === true,
    hasHuAggregationResult: h7Result?.readiness?.hasHuAggregationResult === true,
    isHuAggregationAvailableForHtr:
      h7Result?.readiness?.isHuAggregationAvailableForHtr === true,
    isHtrTransmissionBridgeReady:
      h7Result?.readiness?.isHtrTransmissionBridgeReady === true,
    areNonHuHtrPrerequisitesMapped:
      h7Result?.readiness?.areNonHuHtrPrerequisitesMapped === true,
    isHtrTotalCalculationScopeMapped,
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
  h7Result = null,
  htrTotalCalculationReadiness = null,
  blockers = [],
  counts = null
} = {}) {
  const safeBlockers = uniqueByCode(blockers);
  const isReady = status === "ready";
  const readiness =
    htrTotalCalculationReadiness ?? blockedCalculationReadiness(h7Result);
  const contributionRequirements = Array.isArray(readiness.contributionRequirements)
    ? readiness.contributionRequirements
    : [];
  const missing = Array.isArray(readiness.missingForHtrTotalCalculation)
    ? readiness.missingForHtrTotalCalculation
    : [];
  const resolvedCounts = counts ?? Object.freeze({
    contributionRequirements: contributionRequirements.length,
    missingForHtrTotalCalculation: missing.length,
    blockers: safeBlockers.length
  });

  return Object.freeze({
    schemaVersion: MC001_HTR_TOTAL_CALCULATION_READINESS_GATE_SCHEMA_VERSION,
    isMc001HtrTotalCalculationReadinessGate: true,
    status,
    readiness: readinessFromH7(h7Result, isReady),
    htrTotalCalculationReadiness: readiness,
    blockers: safeBlockers,
    counts: Object.freeze({
      contributionRequirements:
        resolvedCounts.contributionRequirements ?? contributionRequirements.length,
      missingForHtrTotalCalculation:
        resolvedCounts.missingForHtrTotalCalculation ?? missing.length,
      blockers: safeBlockers.length
    })
  });
}

function h7PrerequisitesAreReady(h7Result) {
  return (
    h7Result?.status === "ready" &&
    h7Result?.readiness?.areNonHuHtrPrerequisitesMapped === true &&
    h7Result?.readiness?.isHtrTransmissionBridgeReady === true &&
    h7Result?.readiness?.isHuAggregationAvailableForHtr === true
  );
}

function sourceIssue(source) {
  if (!isObject(source)) {
    return blocker("blocked_missing_contribution_source");
  }
  if (containsPrivateContent(source)) {
    return blocker("blocked_unsafe_private_content");
  }
  if (!SOURCE_TYPE_SET.has(source.sourceType)) {
    return blocker("blocked_invalid_contribution_source");
  }
  if (!sourceRecordIdLooksSafe(source.sourceRecordId)) {
    return blocker("blocked_invalid_contribution_source");
  }
  return null;
}

function contributionRequirementIssue(contribution) {
  if (!isObject(contribution)) {
    return blocker("blocked_invalid_contribution_requirement");
  }
  if (hasPrecomputedHtr(contribution)) {
    return blocker("blocked_precomputed_htr_not_allowed");
  }
  if (containsPrivateContent(contribution)) {
    return blocker("blocked_unsafe_private_content");
  }
  if (containsNumber(contribution)) {
    return blocker("blocked_numeric_contribution_value_not_allowed");
  }
  if (!CONTRIBUTION_TYPE_SET.has(contribution.contributionType)) {
    return blocker("blocked_invalid_contribution_requirement");
  }
  if (!REQUIREMENT_STATUS_SET.has(contribution.requirementStatus)) {
    return blocker("blocked_invalid_contribution_requirement");
  }
  if (
    contribution.contributionType === HU_CONTRIBUTION_TYPE &&
    contribution.requirementStatus !== "available_from_hu_bridge"
  ) {
    return blocker("blocked_invalid_contribution_requirement");
  }
  if (
    contribution.contributionType !== HU_CONTRIBUTION_TYPE &&
    contribution.requirementStatus === "available_from_hu_bridge"
  ) {
    return blocker("blocked_invalid_contribution_requirement");
  }
  const sourceBlocker = sourceIssue(contribution.source);
  if (sourceBlocker) {
    return sourceBlocker;
  }
  return null;
}

function duplicateContributionIssue(contributions) {
  const seen = new Set();
  for (const contribution of contributions) {
    if (!isObject(contribution)) {
      continue;
    }
    if (seen.has(contribution.contributionType)) {
      return blocker("blocked_duplicate_contribution_requirement");
    }
    seen.add(contribution.contributionType);
  }
  return null;
}

function contributionRequirementRefFrom(contribution) {
  return Object.freeze({
    contributionType: contribution.contributionType,
    requirementStatus: contribution.requirementStatus
  });
}

function scopeIssue(scope) {
  if (!isObject(scope)) {
    return blocker("blocked_missing_htr_total_scope");
  }
  if (hasPrecomputedHtr(scope)) {
    return blocker("blocked_precomputed_htr_not_allowed");
  }
  if (containsPrivateContent(scope)) {
    return blocker("blocked_unsafe_private_content");
  }
  if (!SCOPE_CODE_SET.has(scope.scopeCode)) {
    return blocker("blocked_invalid_htr_total_scope");
  }
  const contributions = scope.expectedContributions;
  if (!Array.isArray(contributions) || contributions.length === 0) {
    return blocker("blocked_missing_contribution_requirement");
  }
  const duplicateBlocker = duplicateContributionIssue(contributions);
  if (duplicateBlocker) {
    return duplicateBlocker;
  }
  const hasHuContribution = contributions.some((contribution) => (
    isObject(contribution) &&
    contribution.contributionType === HU_CONTRIBUTION_TYPE
  ));
  if (!hasHuContribution) {
    return blocker("blocked_invalid_htr_total_scope");
  }
  for (const contribution of contributions) {
    const issue = contributionRequirementIssue(contribution);
    if (issue) {
      return issue;
    }
  }
  return null;
}

function missingForHtrTotalCalculation() {
  return Object.freeze([
    missingEntry("missing_numeric_non_hu_transmission_contributions"),
    missingEntry("missing_htr_total_formula_execution_milestone")
  ]);
}

function readyCalculationReadiness(scope) {
  return Object.freeze({
    status: "scope_mapped_not_calculation_ready",
    h7PrerequisitesStatus: "ready",
    scopeCode: "mc001-htr-total-calculation-scope-v1",
    contributionRequirements: Object.freeze(
      scope.expectedContributions.map(contributionRequirementRefFrom)
    ),
    missingForHtrTotalCalculation: missingForHtrTotalCalculation()
  });
}

export function buildMc001HtrTotalCalculationReadinessGate(
  htrReadinessInput,
  options = {}
) {
  void options;

  if (!isObject(htrReadinessInput)) {
    return emptyResult({
      blockers: [blocker("blocked_invalid_h8_input")]
    });
  }

  if (rawSavedAnalysisLike(htrReadinessInput)) {
    return emptyResult({
      blockers: [blocker("blocked_raw_saved_analysis_input")]
    });
  }

  if (
    htrReadinessInput.schemaVersion !==
      MC001_HTR_TOTAL_CALCULATION_READINESS_INPUT_SCHEMA_VERSION ||
    htrReadinessInput.isMc001HtrTotalCalculationReadinessInput !== true
  ) {
    return emptyResult({
      blockers: [blocker("blocked_invalid_h8_input")]
    });
  }

  if (hasPrecomputedHtr(htrReadinessInput)) {
    return emptyResult({
      blockers: [blocker("blocked_precomputed_htr_not_allowed")]
    });
  }

  const h7Result = buildMc001HtrNonHuPrerequisitesReadiness(
    htrReadinessInput.htrPrerequisitesInput
  );

  if (!h7PrerequisitesAreReady(h7Result)) {
    return emptyResult({
      h7Result,
      blockers: [blocker("blocked_h7_prerequisites_not_ready")]
    });
  }

  const scope = htrReadinessInput.htrTotalCalculationScope;
  const issue = scopeIssue(scope);
  if (issue) {
    return emptyResult({
      h7Result,
      blockers: [issue],
      counts: Object.freeze({
        contributionRequirements: Array.isArray(scope?.expectedContributions)
          ? scope.expectedContributions.length
          : 0,
        missingForHtrTotalCalculation: 0,
        blockers: 1
      })
    });
  }

  const htrTotalCalculationReadiness = readyCalculationReadiness(scope);
  return emptyResult({
    status: "ready",
    h7Result,
    htrTotalCalculationReadiness,
    counts: Object.freeze({
      contributionRequirements:
        htrTotalCalculationReadiness.contributionRequirements.length,
      missingForHtrTotalCalculation:
        htrTotalCalculationReadiness.missingForHtrTotalCalculation.length,
      blockers: 0
    })
  });
}
