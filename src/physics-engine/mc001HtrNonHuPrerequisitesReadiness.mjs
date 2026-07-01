import { buildMc001HtrTransmissionReadinessBridge } from "./mc001HtrTransmissionReadinessBridge.mjs";

export const MC001_HTR_NON_HU_PREREQUISITES_INPUT_SCHEMA_VERSION =
  "mc001-h7-htr-non-hu-prerequisites-input-v1";

export const MC001_HTR_NON_HU_PREREQUISITES_READINESS_SCHEMA_VERSION =
  "mc001-h7-htr-non-hu-prerequisites-readiness-v1";

export const H7_PREREQUISITE_TYPES = Object.freeze([
  "non_hu_transmission_component_inventory",
  "thermal_bridge_transmission_inventory",
  "ground_transmission_inventory",
  "adjacent_space_transmission_inventory",
  "external_boundary_transmission_inventory"
]);

export const H7_APPLICABILITY_VALUES = Object.freeze([
  "required",
  "not_applicable_with_source"
]);

export const H7_READINESS_STATUS_VALUES = Object.freeze([
  "metadata_ready",
  "not_ready"
]);

export const H7_SOURCE_TYPES = Object.freeze([
  "calculation_record",
  "validation_fixture_import",
  "expert_override_with_source",
  "methodological_direct_input"
]);

export const H7_MISSING_CODES = Object.freeze([
  "missing_non_hu_numeric_transmission_calculations",
  "missing_complete_htr_formula_scope",
  "missing_complete_htr_methodology_components"
]);

export const H7_BLOCKER_CODES = Object.freeze([
  "blocked_invalid_h7_input",
  "blocked_raw_saved_analysis_input",
  "blocked_h6_bridge_not_ready",
  "blocked_missing_non_hu_prerequisites",
  "blocked_invalid_non_hu_prerequisite",
  "blocked_missing_prerequisite_source",
  "blocked_invalid_prerequisite_source",
  "blocked_unsafe_private_identifier",
  "blocked_unsafe_private_content",
  "blocked_non_hu_numeric_value_not_allowed",
  "blocked_precomputed_htr_not_allowed"
]);

const PREREQUISITE_TYPE_SET = new Set(H7_PREREQUISITE_TYPES);
const APPLICABILITY_SET = new Set(H7_APPLICABILITY_VALUES);
const READINESS_STATUS_SET = new Set(H7_READINESS_STATUS_VALUES);
const SOURCE_TYPE_SET = new Set(H7_SOURCE_TYPES);
const MISSING_CODE_SET = new Set(H7_MISSING_CODES);
const BLOCKER_CODE_SET = new Set(H7_BLOCKER_CODES);
const RAW_SNAPSHOT_KEYS = Object.freeze([
  "analysis",
  "building",
  "answers",
  "profiles",
  "sourceContext",
  "mc001Readiness"
]);
const PRECOMPUTED_HTR_KEYS = Object.freeze([
  "htrResult",
  "htrTotal",
  "htrComponents"
]);
const PRIVATE_CONTENT_PATTERN =
  /(@|\+40722111222|person@example\.com|john|doe|strada|owner|private|person|record-JohnDoe|record-001|owner-snapshot|private-note|person-name|free text note|sourceContext|sourceTrace|sourceLocator|sourceRefs)/i;
const PREREQUISITE_ID_PATTERN =
  /^htr-prerequisite:[a-z0-9][a-z0-9_.:/-]{0,79}$/;
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

function prerequisiteIdLooksSafe(value) {
  return (
    hasRequiredString(value) &&
    !PRIVATE_CONTENT_PATTERN.test(value) &&
    !/[{}\[\]"'<>\s@]/.test(value) &&
    value.length <= 96 &&
    (PREREQUISITE_ID_PATTERN.test(value) || UUID_PATTERN.test(value))
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
  const safeCode = BLOCKER_CODE_SET.has(code) ? code : "blocked_invalid_h7_input";
  return Object.freeze({
    code: safeCode,
    severity: "blocking"
  });
}

function missingEntry(code) {
  const safeCode = MISSING_CODE_SET.has(code)
    ? code
    : "missing_complete_htr_methodology_components";
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

function blockedPrerequisitesReadiness(h6Result) {
  return Object.freeze({
    status: "blocked",
    huBridgeStatus: h6Result?.status === "ready" ? "ready" : "blocked",
    nonHuPrerequisitesStatus: "not_ready",
    prerequisiteRefs: Object.freeze([]),
    missingForCompleteHtr: Object.freeze([])
  });
}

function readinessFromH6(h6Result, areNonHuHtrPrerequisitesMapped) {
  return Object.freeze({
    isHuInventoryReady: h6Result?.readiness?.isHuInventoryReady === true,
    isHuComponentTermCalculationReady:
      h6Result?.readiness?.isHuComponentTermCalculationReady === true,
    areHuComponentTermsCalculated:
      h6Result?.readiness?.areHuComponentTermsCalculated === true,
    isHuAggregationReady: h6Result?.readiness?.isHuAggregationReady === true,
    hasHuAggregationResult: h6Result?.readiness?.hasHuAggregationResult === true,
    isHuAggregationAvailableForHtr:
      h6Result?.readiness?.isHuAggregationAvailableForHtr === true,
    isHtrTransmissionBridgeReady:
      h6Result?.readiness?.isHtrTransmissionBridgeReady === true,
    areNonHuHtrPrerequisitesMapped,
    isCompleteHuReady: false,
    isCompleteHtrReady: false,
    hasHuResult: false,
    hasHtrResult: false,
    downstreamReadiness: false
  });
}

function emptyResult({
  status = "blocked",
  h6Result = null,
  htrPrerequisitesReadiness = null,
  blockers = [],
  counts = null
} = {}) {
  const safeBlockers = uniqueByCode(blockers);
  const isReady = status === "ready";
  const readiness = htrPrerequisitesReadiness ?? blockedPrerequisitesReadiness(h6Result);
  const prerequisiteRefs = Array.isArray(readiness.prerequisiteRefs)
    ? readiness.prerequisiteRefs
    : [];
  const resolvedCounts = counts ?? Object.freeze({
    prerequisites: 0,
    readyPrerequisites: 0,
    notApplicablePrerequisites: 0,
    blockers: safeBlockers.length
  });

  return Object.freeze({
    schemaVersion: MC001_HTR_NON_HU_PREREQUISITES_READINESS_SCHEMA_VERSION,
    isMc001HtrNonHuPrerequisitesReadiness: true,
    status,
    readiness: readinessFromH6(h6Result, isReady),
    htrPrerequisitesReadiness: readiness,
    blockers: safeBlockers,
    counts: Object.freeze({
      prerequisites: resolvedCounts.prerequisites ?? prerequisiteRefs.length,
      readyPrerequisites: resolvedCounts.readyPrerequisites ?? 0,
      notApplicablePrerequisites: resolvedCounts.notApplicablePrerequisites ?? 0,
      blockers: safeBlockers.length
    })
  });
}

function h6BridgeIsReady(h6Result) {
  const contribution = h6Result?.htrTransmissionBridge?.huContribution;
  return (
    h6Result?.status === "ready" &&
    h6Result?.readiness?.isHtrTransmissionBridgeReady === true &&
    h6Result?.readiness?.isHuAggregationAvailableForHtr === true &&
    isObject(contribution) &&
    contribution.contributionType === "hu_aggregated_transmission_contribution" &&
    typeof contribution.value === "number" &&
    Number.isFinite(contribution.value) &&
    contribution.value >= 0 &&
    contribution.unit === "W/K" &&
    contribution.sourceFormulaCode === "MC001_HU_AGGREGATION_SUM_COMPONENT_TERMS" &&
    contribution.bridgeCode === "MC001_H5_HU_AGGREGATION_BRIDGED_FOR_FUTURE_HTR"
  );
}

function sourceIssue(source) {
  if (!isObject(source)) {
    return blocker("blocked_missing_prerequisite_source");
  }
  if (containsPrivateContent(source)) {
    return blocker("blocked_unsafe_private_content");
  }
  if (!SOURCE_TYPE_SET.has(source.sourceType)) {
    return blocker("blocked_invalid_prerequisite_source");
  }
  if (!sourceRecordIdLooksSafe(source.sourceRecordId)) {
    return blocker("blocked_invalid_prerequisite_source");
  }
  return null;
}

function prerequisiteIssue(prerequisite) {
  if (!isObject(prerequisite)) {
    return blocker("blocked_invalid_non_hu_prerequisite");
  }
  if (containsPrivateContent(prerequisite)) {
    return blocker("blocked_unsafe_private_content");
  }
  if (containsNumber(prerequisite)) {
    return blocker("blocked_non_hu_numeric_value_not_allowed");
  }
  if (!prerequisiteIdLooksSafe(prerequisite.prerequisiteId)) {
    return blocker("blocked_unsafe_private_identifier");
  }
  if (!PREREQUISITE_TYPE_SET.has(prerequisite.prerequisiteType)) {
    return blocker("blocked_invalid_non_hu_prerequisite");
  }
  if (!APPLICABILITY_SET.has(prerequisite.applicability)) {
    return blocker("blocked_invalid_non_hu_prerequisite");
  }
  if (!READINESS_STATUS_SET.has(prerequisite.readinessStatus)) {
    return blocker("blocked_invalid_non_hu_prerequisite");
  }
  const sourceBlocker = sourceIssue(prerequisite.source);
  if (sourceBlocker) {
    return sourceBlocker;
  }
  if (
    prerequisite.applicability === "required" &&
    prerequisite.readinessStatus !== "metadata_ready"
  ) {
    return blocker("blocked_invalid_non_hu_prerequisite");
  }
  return null;
}

function prerequisiteRefFrom(prerequisite) {
  return Object.freeze({
    prerequisiteId: prerequisite.prerequisiteId,
    prerequisiteType: prerequisite.prerequisiteType,
    applicability: prerequisite.applicability,
    readinessStatus: prerequisite.readinessStatus
  });
}

function countsFromPrerequisites(prerequisites, blockers) {
  let readyPrerequisites = 0;
  let notApplicablePrerequisites = 0;
  for (const prerequisite of prerequisites) {
    if (prerequisite.applicability === "not_applicable_with_source") {
      notApplicablePrerequisites += 1;
    } else if (prerequisite.readinessStatus === "metadata_ready") {
      readyPrerequisites += 1;
    }
  }
  return Object.freeze({
    prerequisites: prerequisites.length,
    readyPrerequisites,
    notApplicablePrerequisites,
    blockers: blockers.length
  });
}

function readyPrerequisitesReadiness(prerequisites) {
  return Object.freeze({
    status: "ready",
    huBridgeStatus: "ready",
    nonHuPrerequisitesStatus: "metadata_ready",
    prerequisiteRefs: Object.freeze(prerequisites.map(prerequisiteRefFrom)),
    missingForCompleteHtr: Object.freeze([
      missingEntry("missing_non_hu_numeric_transmission_calculations")
    ])
  });
}

export function buildMc001HtrNonHuPrerequisitesReadiness(
  prerequisitesInput,
  options = {}
) {
  void options;

  if (!isObject(prerequisitesInput)) {
    return emptyResult({
      blockers: [blocker("blocked_invalid_h7_input")]
    });
  }

  if (rawSavedAnalysisLike(prerequisitesInput)) {
    return emptyResult({
      blockers: [blocker("blocked_raw_saved_analysis_input")]
    });
  }

  if (
    prerequisitesInput.schemaVersion !==
      MC001_HTR_NON_HU_PREREQUISITES_INPUT_SCHEMA_VERSION ||
    prerequisitesInput.isMc001HtrNonHuPrerequisitesInput !== true
  ) {
    return emptyResult({
      blockers: [blocker("blocked_invalid_h7_input")]
    });
  }

  if (hasPrecomputedHtr(prerequisitesInput)) {
    return emptyResult({
      blockers: [blocker("blocked_precomputed_htr_not_allowed")]
    });
  }

  const h6Result = buildMc001HtrTransmissionReadinessBridge(
    prerequisitesInput.huBridgeInput
  );

  if (!h6BridgeIsReady(h6Result)) {
    return emptyResult({
      h6Result,
      blockers: [blocker("blocked_h6_bridge_not_ready")]
    });
  }

  const prerequisites = prerequisitesInput.htrNonHuPrerequisites?.expectedPrerequisites;
  if (!Array.isArray(prerequisites) || prerequisites.length === 0) {
    return emptyResult({
      h6Result,
      blockers: [blocker("blocked_missing_non_hu_prerequisites")]
    });
  }

  const blockers = prerequisites
    .map(prerequisiteIssue)
    .filter(Boolean);
  if (blockers.length > 0) {
    return emptyResult({
      h6Result,
      blockers,
      counts: countsFromPrerequisites(prerequisites, blockers)
    });
  }

  return emptyResult({
    status: "ready",
    h6Result,
    htrPrerequisitesReadiness: readyPrerequisitesReadiness(prerequisites),
    counts: countsFromPrerequisites(prerequisites, blockers)
  });
}
