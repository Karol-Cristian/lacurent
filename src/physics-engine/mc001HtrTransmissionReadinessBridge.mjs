import {
  aggregateMc001HuComponentTerms,
  MC001_HU_AGGREGATION_FORMULA_CODE
} from "./mc001HuAggregation.mjs";

export const MC001_HTR_TRANSMISSION_READINESS_BRIDGE_SCHEMA_VERSION =
  "mc001-h6-htr-transmission-readiness-bridge-v1";

export const MC001_H5_HU_AGGREGATION_BRIDGE_CODE =
  "MC001_H5_HU_AGGREGATION_BRIDGED_FOR_FUTURE_HTR";

export const H6_BRIDGE_CODES = Object.freeze([
  MC001_H5_HU_AGGREGATION_BRIDGE_CODE
]);

export const H6_REFERENCED_FORMULA_CODES = Object.freeze([
  MC001_HU_AGGREGATION_FORMULA_CODE,
  "MC001_HU_COMPONENT_TERM_A_U_BZTU"
]);

export const H6_MISSING_CODES = Object.freeze([
  "missing_non_hu_transmission_components",
  "missing_complete_htr_methodology_components"
]);

export const H6_BLOCKER_CODES = Object.freeze([
  "blocked_invalid_h6_input",
  "blocked_raw_saved_analysis_input",
  "blocked_h5_hu_aggregation_not_ready",
  "blocked_missing_h5_hu_aggregation",
  "blocked_invalid_h5_hu_aggregation",
  "blocked_non_finite_hu_bridge_contribution",
  "blocked_unsafe_private_identifier",
  "blocked_unsafe_private_content"
]);

const BLOCKER_CODE_SET = new Set(H6_BLOCKER_CODES);
const MISSING_CODE_SET = new Set(H6_MISSING_CODES);
const BRIDGE_CODE_SET = new Set(H6_BRIDGE_CODES);
const REFERENCED_FORMULA_CODE_SET = new Set(H6_REFERENCED_FORMULA_CODES);
const RAW_SNAPSHOT_KEYS = Object.freeze([
  "analysis",
  "building",
  "answers",
  "profiles",
  "sourceContext",
  "mc001Readiness"
]);
const PRIVATE_CONTENT_PATTERN =
  /(@|\+40722111222|person@example\.com|john|doe|strada|owner|private|person|record-JohnDoe|record-001|owner-snapshot|private-note|person-name|free text note|sourceContext|sourceTrace|sourceLocator|sourceRefs)/i;

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

function blocker(code) {
  const safeCode = BLOCKER_CODE_SET.has(code) ? code : "blocked_invalid_h6_input";
  return Object.freeze({
    code: safeCode,
    severity: "blocking"
  });
}

function missingEntryForCompleteHtr(code) {
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

function blockedBridge() {
  return Object.freeze({
    status: "blocked",
    missingForCompleteHtr: Object.freeze([])
  });
}

function emptyResult({
  status = "blocked",
  h5Result = null,
  htrTransmissionBridge = null,
  blockers = []
} = {}) {
  const isReady = status === "ready";
  const safeBlockers = uniqueByCode(blockers);
  const bridge = htrTransmissionBridge ?? blockedBridge();
  const missing = Array.isArray(bridge.missingForCompleteHtr)
    ? bridge.missingForCompleteHtr
    : [];
  const hasContribution = Boolean(bridge.huContribution);

  return Object.freeze({
    schemaVersion: MC001_HTR_TRANSMISSION_READINESS_BRIDGE_SCHEMA_VERSION,
    isMc001HtrTransmissionReadinessBridge: true,
    status,
    readiness: Object.freeze({
      isHuInventoryReady: h5Result?.readiness?.isHuInventoryReady === true,
      isHuComponentTermCalculationReady:
        h5Result?.readiness?.isHuComponentTermCalculationReady === true,
      areHuComponentTermsCalculated:
        h5Result?.readiness?.areHuComponentTermsCalculated === true,
      isHuAggregationReady: h5Result?.readiness?.isHuAggregationReady === true,
      hasHuAggregationResult: h5Result?.readiness?.hasHuAggregationResult === true,
      isHuAggregationAvailableForHtr: isReady,
      isHtrTransmissionBridgeReady: isReady,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      hasHuResult: false,
      hasHtrResult: false,
      downstreamReadiness: false
    }),
    htrTransmissionBridge: bridge,
    blockers: safeBlockers,
    counts: Object.freeze({
      bridgeContributions: hasContribution ? 1 : 0,
      missingForCompleteHtr: missing.length,
      blockers: safeBlockers.length
    })
  });
}

function h6BlockerForBlockedH5(input, h5Result) {
  if (rawSavedAnalysisLike(input)) {
    return blocker("blocked_raw_saved_analysis_input");
  }
  if (h5Result?.blockers?.some((entry) => entry.code === "blocked_invalid_h5_input")) {
    return blocker("blocked_invalid_h6_input");
  }
  return blocker("blocked_h5_hu_aggregation_not_ready");
}

function h5AggregationIssue(h5Result) {
  const aggregation = h5Result?.huAggregation;
  if (!isObject(aggregation)) {
    return blocker("blocked_missing_h5_hu_aggregation");
  }
  if (containsPrivateContent(aggregation)) {
    return blocker("blocked_unsafe_private_content");
  }
  if (
    aggregation.status !== "calculated" ||
    h5Result?.readiness?.hasHuAggregationResult !== true ||
    typeof aggregation.value !== "number" ||
    aggregation.value < 0 ||
    aggregation.unit !== "W/K" ||
    aggregation.formulaCode !== MC001_HU_AGGREGATION_FORMULA_CODE ||
    !REFERENCED_FORMULA_CODE_SET.has(aggregation.formulaCode)
  ) {
    return blocker("blocked_invalid_h5_hu_aggregation");
  }
  if (!Number.isFinite(aggregation.value)) {
    return blocker("blocked_non_finite_hu_bridge_contribution");
  }
  return null;
}

function bridgeFromH5Aggregation(aggregation) {
  const missingForCompleteHtr = Object.freeze([
    missingEntryForCompleteHtr("missing_non_hu_transmission_components")
  ]);

  return Object.freeze({
    status: "ready",
    huContribution: Object.freeze({
      contributionType: "hu_aggregated_transmission_contribution",
      value: aggregation.value,
      unit: "W/K",
      sourceFormulaCode: MC001_HU_AGGREGATION_FORMULA_CODE,
      bridgeCode: BRIDGE_CODE_SET.has(MC001_H5_HU_AGGREGATION_BRIDGE_CODE)
        ? MC001_H5_HU_AGGREGATION_BRIDGE_CODE
        : "MC001_H5_HU_AGGREGATION_BRIDGED_FOR_FUTURE_HTR"
    }),
    missingForCompleteHtr
  });
}

export function buildMc001HtrTransmissionReadinessBridge(bridgeInput, options = {}) {
  void options;

  const h5Result = aggregateMc001HuComponentTerms(bridgeInput);

  if (
    h5Result.status !== "ready" ||
    h5Result.readiness?.hasHuAggregationResult !== true
  ) {
    return emptyResult({
      h5Result,
      blockers: [h6BlockerForBlockedH5(bridgeInput, h5Result)]
    });
  }

  const issue = h5AggregationIssue(h5Result);
  if (issue) {
    return emptyResult({
      h5Result,
      blockers: [issue]
    });
  }

  return emptyResult({
    status: "ready",
    h5Result,
    htrTransmissionBridge: bridgeFromH5Aggregation(h5Result.huAggregation)
  });
}
