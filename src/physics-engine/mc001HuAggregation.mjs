import {
  calculateMc001HuComponentTerms,
  MC001_HU_COMPONENT_TERM_FORMULA_CODE
} from "./mc001HuComponentTermCalculation.mjs";

export const MC001_HU_AGGREGATION_SCHEMA_VERSION =
  "mc001-h5-hu-aggregation-v1";

export const MC001_HU_AGGREGATION_FORMULA_CODE =
  "MC001_HU_AGGREGATION_SUM_COMPONENT_TERMS";

export const H5_FORMULA_CODES = Object.freeze([
  MC001_HU_AGGREGATION_FORMULA_CODE,
  MC001_HU_COMPONENT_TERM_FORMULA_CODE
]);

export const H5_BLOCKER_CODES = Object.freeze([
  "blocked_invalid_h5_input",
  "blocked_raw_saved_analysis_input",
  "blocked_h4_component_terms_not_ready",
  "blocked_missing_component_terms",
  "blocked_invalid_component_term",
  "blocked_non_finite_hu_aggregation",
  "blocked_unsafe_private_identifier",
  "blocked_unsafe_private_content"
]);

const BLOCKER_CODE_SET = new Set(H5_BLOCKER_CODES);
const FORMULA_CODE_SET = new Set(H5_FORMULA_CODES);
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
const COMPONENT_ID_PATTERN =
  /^(component|hu-component|inventory-component):[a-z0-9][a-z0-9_.:/-]{0,79}$/;
const ZTU_ID_PATTERN = /^ztu:[a-z0-9][a-z0-9_.:/-]{0,79}$/;
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

function componentIdLooksSafe(value) {
  return (
    hasRequiredString(value) &&
    !PRIVATE_CONTENT_PATTERN.test(value) &&
    !/[{}\[\]"'<>\s@]/.test(value) &&
    value.length <= 96 &&
    (COMPONENT_ID_PATTERN.test(value) || UUID_PATTERN.test(value))
  );
}

function ztuIdLooksSafe(value) {
  return (
    hasRequiredString(value) &&
    !PRIVATE_CONTENT_PATTERN.test(value) &&
    !/[{}\[\]"'<>\s@]/.test(value) &&
    value.length <= 96 &&
    (ZTU_ID_PATTERN.test(value) || UUID_PATTERN.test(value))
  );
}

function blocker(code) {
  const safeCode = BLOCKER_CODE_SET.has(code) ? code : "blocked_invalid_h5_input";
  return Object.freeze({
    code: safeCode,
    severity: "blocking"
  });
}

function uniqueBlockers(blockers) {
  const seen = new Set();
  return Object.freeze(
    blockers.filter((entry) => {
      if (seen.has(entry.code)) {
        return false;
      }
      seen.add(entry.code);
      return true;
    })
  );
}

function componentCountFrom(h4Result, componentTermRefs) {
  return h4Result?.counts?.components ?? componentTermRefs.length;
}

function emptyResult({
  status = "blocked",
  h4Result = null,
  huAggregation = null,
  componentTermRefs = [],
  blockers = []
} = {}) {
  const safeBlockers = uniqueBlockers(blockers);
  const isReady = status === "ready";
  const safeHuAggregation = isReady
    ? huAggregation
    : Object.freeze({ status: "blocked" });

  return Object.freeze({
    schemaVersion: MC001_HU_AGGREGATION_SCHEMA_VERSION,
    isMc001HuAggregation: true,
    status,
    readiness: Object.freeze({
      isHuInventoryReady: h4Result?.readiness?.isHuInventoryReady === true,
      isHuComponentTermCalculationReady:
        h4Result?.readiness?.isHuComponentTermCalculationReady === true,
      areHuComponentTermsCalculated:
        h4Result?.readiness?.areHuComponentTermsCalculated === true,
      isHuAggregationReady: isReady,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      hasHuAggregationResult: isReady,
      hasHuResult: false,
      hasHtrResult: false,
      downstreamReadiness: false
    }),
    huAggregation: safeHuAggregation,
    componentTermRefs: Object.freeze(componentTermRefs),
    blockers: safeBlockers,
    counts: Object.freeze({
      components: componentCountFrom(h4Result, componentTermRefs),
      componentTerms: componentTermRefs.length,
      blockers: safeBlockers.length
    })
  });
}

function h5BlockerForBlockedH4(input, h4Result) {
  if (rawSavedAnalysisLike(input)) {
    return blocker("blocked_raw_saved_analysis_input");
  }
  if (h4Result?.blockers?.some((entry) => entry.code === "blocked_invalid_h4_input")) {
    return blocker("blocked_invalid_h5_input");
  }
  return blocker("blocked_h4_component_terms_not_ready");
}

function componentTermIssue(componentTerm) {
  if (!isObject(componentTerm)) {
    return blocker("blocked_invalid_component_term");
  }
  if (containsPrivateContent(componentTerm)) {
    return blocker("blocked_unsafe_private_content");
  }
  if (
    !componentIdLooksSafe(componentTerm.componentId) ||
    !ztuIdLooksSafe(componentTerm.ztuZoneId) ||
    !ztuIdLooksSafe(componentTerm.adjacentZoneId)
  ) {
    return blocker("blocked_unsafe_private_identifier");
  }
  if (
    componentTerm.status !== "calculated" ||
    typeof componentTerm.value !== "number" ||
    !Number.isFinite(componentTerm.value) ||
    componentTerm.value < 0 ||
    componentTerm.unit !== "W/K" ||
    !FORMULA_CODE_SET.has(componentTerm.formulaCode) ||
    componentTerm.formulaCode !== MC001_HU_COMPONENT_TERM_FORMULA_CODE
  ) {
    return blocker("blocked_invalid_component_term");
  }
  return null;
}

function componentTermRefFrom(componentTerm) {
  return Object.freeze({
    componentId: componentTerm.componentId,
    ztuZoneId: componentTerm.ztuZoneId,
    adjacentZoneId: componentTerm.adjacentZoneId,
    value: componentTerm.value,
    unit: "W/K",
    formulaCode: MC001_HU_COMPONENT_TERM_FORMULA_CODE
  });
}

function aggregateComponentTerms(componentTerms) {
  return componentTerms.reduce(
    (sum, componentTerm) => sum + componentTerm.value,
    0
  );
}

export function aggregateMc001HuComponentTerms(aggregationInput, options = {}) {
  void options;

  const h4Result = calculateMc001HuComponentTerms(aggregationInput);

  if (
    h4Result.status !== "ready" ||
    h4Result.readiness?.areHuComponentTermsCalculated !== true
  ) {
    return emptyResult({
      h4Result,
      blockers: [h5BlockerForBlockedH4(aggregationInput, h4Result)]
    });
  }

  try {
    const componentTerms = Array.isArray(h4Result.componentTerms)
      ? h4Result.componentTerms
      : [];
    if (
      componentTerms.length === 0 ||
      componentTerms.length !== h4Result.counts?.components
    ) {
      return emptyResult({
        h4Result,
        blockers: [blocker("blocked_missing_component_terms")]
      });
    }

    const blockers = componentTerms
      .map(componentTermIssue)
      .filter(Boolean);
    if (blockers.length > 0) {
      return emptyResult({
        h4Result,
        blockers
      });
    }

    const value = aggregateComponentTerms(componentTerms);
    if (!Number.isFinite(value)) {
      return emptyResult({
        h4Result,
        blockers: [blocker("blocked_non_finite_hu_aggregation")]
      });
    }

    const componentTermRefs = componentTerms.map(componentTermRefFrom);
    return emptyResult({
      status: "ready",
      h4Result,
      huAggregation: Object.freeze({
        status: "calculated",
        value,
        unit: "W/K",
        formulaCode: MC001_HU_AGGREGATION_FORMULA_CODE,
        componentCount: componentTermRefs.length
      }),
      componentTermRefs
    });
  } catch {
    return emptyResult({
      h4Result,
      blockers: [blocker("blocked_invalid_h5_input")]
    });
  }
}
