import { buildMc001HuHtrCalculationReadinessGate } from "./mc001HuHtrCalculationReadinessGate.mjs";

export const MC001_HU_COMPONENT_TERM_CALCULATION_SCHEMA_VERSION =
  "mc001-h4-hu-component-term-calculation-v1";

export const MC001_HU_COMPONENT_TERM_FORMULA_CODE =
  "MC001_HU_COMPONENT_TERM_A_U_BZTU";

export const H4_BLOCKER_CODES = Object.freeze([
  "blocked_invalid_h4_input",
  "blocked_raw_saved_analysis_input",
  "blocked_h3_calculation_readiness_not_ready",
  "blocked_missing_h3_ready_component",
  "blocked_component_term_calculation_failed",
  "blocked_non_finite_component_term",
  "blocked_unsafe_private_identifier",
  "blocked_unsafe_private_content"
]);

const BLOCKER_CODE_SET = new Set(H4_BLOCKER_CODES);
const RAW_SNAPSHOT_KEYS = Object.freeze([
  "analysis",
  "building",
  "answers",
  "profiles",
  "sourceContext",
  "mc001Readiness"
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.hasOwn(value, key);
}

function rawSavedAnalysisLike(input) {
  return isObject(input) && RAW_SNAPSHOT_KEYS.some((key) => hasOwn(input, key));
}

function blocker(code) {
  const safeCode = BLOCKER_CODE_SET.has(code) ? code : "blocked_invalid_h4_input";
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

function thermalTransmittanceFrom(component) {
  return (
    component?.thermalTransmittance ??
    component?.correctedThermalTransmittance ??
    component?.correctedUValue ??
    component?.uValue ??
    null
  );
}

function componentCountFrom(h3Readiness, componentTerms) {
  return h3Readiness?.counts?.components ?? componentTerms.length;
}

function emptyResult({
  status = "blocked",
  h3Readiness = null,
  componentTerms = [],
  blockers = []
} = {}) {
  const safeBlockers = uniqueBlockers(blockers);
  const calculatedComponents = componentTerms.filter(
    (entry) => entry.status === "calculated"
  ).length;
  const componentCount = componentCountFrom(h3Readiness, componentTerms);

  return Object.freeze({
    schemaVersion: MC001_HU_COMPONENT_TERM_CALCULATION_SCHEMA_VERSION,
    isMc001HuComponentTermCalculation: true,
    status,
    readiness: Object.freeze({
      isHuInventoryReady: h3Readiness?.readiness?.isHuInventoryReady === true,
      isHuComponentTermCalculationReady:
        h3Readiness?.readiness?.isHuComponentTermCalculationReady === true,
      areHuComponentTermsCalculated: status === "ready",
      isHuAggregationReady: false,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      hasHuResult: false,
      hasHtrResult: false,
      downstreamReadiness: false
    }),
    componentTerms: Object.freeze(componentTerms),
    blockers: safeBlockers,
    counts: Object.freeze({
      components: componentCount,
      calculatedComponents,
      blockedComponents: componentCount - calculatedComponents,
      blockers: safeBlockers.length
    })
  });
}

function h4BlockerForBlockedH3(input, h3Readiness) {
  if (rawSavedAnalysisLike(input)) {
    return blocker("blocked_raw_saved_analysis_input");
  }
  if (h3Readiness?.blockers?.some((entry) => entry.code === "blocked_invalid_h3_input")) {
    return blocker("blocked_invalid_h4_input");
  }
  return blocker("blocked_h3_calculation_readiness_not_ready");
}

function blockedComponentTerm(componentReadiness, component) {
  return Object.freeze({
    componentId: componentReadiness?.componentId ?? null,
    ztuZoneId: component?.ztuZoneId ?? null,
    adjacentZoneId: component?.adjacentZoneId ?? null,
    status: "blocked"
  });
}

function calculatedComponentTerm(componentReadiness, component, value) {
  return Object.freeze({
    componentId: componentReadiness.componentId,
    ztuZoneId: component.ztuZoneId,
    adjacentZoneId: component.adjacentZoneId,
    status: "calculated",
    value,
    unit: "W/K",
    formulaCode: MC001_HU_COMPONENT_TERM_FORMULA_CODE
  });
}

function calculateComponentTerm(component, componentReadiness) {
  if (componentReadiness?.status !== "ready" || !componentReadiness.componentId) {
    return {
      componentTerm: blockedComponentTerm(componentReadiness, component),
      blocker: blocker("blocked_missing_h3_ready_component")
    };
  }

  const area = component?.area;
  const thermalTransmittance = thermalTransmittanceFrom(component);
  const bztu = component?.bztu;
  const value = area?.value * thermalTransmittance?.value * bztu?.value;

  if (!Number.isFinite(value)) {
    return {
      componentTerm: blockedComponentTerm(componentReadiness, component),
      blocker: blocker("blocked_non_finite_component_term")
    };
  }

  return {
    componentTerm: calculatedComponentTerm(componentReadiness, component, value),
    blocker: null
  };
}

export function calculateMc001HuComponentTerms(calculationInput, options = {}) {
  void options;

  const h3Readiness = buildMc001HuHtrCalculationReadinessGate(calculationInput);

  if (
    h3Readiness.status !== "ready" ||
    h3Readiness.readiness?.isHuComponentTermCalculationReady !== true
  ) {
    return emptyResult({
      h3Readiness,
      blockers: [h4BlockerForBlockedH3(calculationInput, h3Readiness)]
    });
  }

  try {
    const components = Array.isArray(calculationInput?.components)
      ? calculationInput.components
      : [];
    const decisions = components.map((component, index) =>
      calculateComponentTerm(component, h3Readiness.componentReadiness[index])
    );
    const componentTerms = decisions.map((decision) => decision.componentTerm);
    const blockers = decisions
      .map((decision) => decision.blocker)
      .filter(Boolean);
    const status = blockers.length === 0 ? "ready" : "blocked";

    return emptyResult({
      status,
      h3Readiness,
      componentTerms,
      blockers
    });
  } catch {
    return emptyResult({
      h3Readiness,
      blockers: [blocker("blocked_component_term_calculation_failed")]
    });
  }
}
