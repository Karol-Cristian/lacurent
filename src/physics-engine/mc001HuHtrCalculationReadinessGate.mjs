export const MC001_HU_HTR_CALCULATION_READINESS_GATE_ID =
  "MC001_HU_HTR_CALCULATION_READINESS_GATE_PHASE_H3";

export const MC001_HU_HTR_CALCULATION_READINESS_INPUT_SCHEMA_VERSION =
  "mc001-h3-hu-htr-calculation-readiness-input-v1";

export const MC001_HU_HTR_CALCULATION_READINESS_GATE_SCHEMA_VERSION =
  "mc001-h3-hu-htr-calculation-readiness-gate-v1";

export const H3_BLOCKER_CODES = Object.freeze([
  "blocked_invalid_h3_input",
  "blocked_raw_saved_analysis_input",
  "blocked_hu_inventory_not_ready",
  "blocked_missing_component_identity",
  "blocked_invalid_component_identity",
  "blocked_missing_zone_identity",
  "blocked_invalid_zone_identity",
  "blocked_missing_component_area",
  "blocked_invalid_component_area",
  "blocked_missing_thermal_transmittance",
  "blocked_invalid_thermal_transmittance",
  "blocked_missing_bztu",
  "blocked_invalid_bztu",
  "blocked_missing_source_provenance",
  "blocked_invalid_source_provenance",
  "blocked_unsafe_private_identifier",
  "blocked_unsafe_private_content"
]);

const BLOCKER_CODE_SET = new Set(H3_BLOCKER_CODES);
const AREA_UNITS = new Set(["m2"]);
const THERMAL_TRANSMITTANCE_UNITS = new Set(["W/(m2*K)"]);
const BZTU_UNITS = new Set(["dimensionless"]);
const SOURCE_TYPES = new Set([
  "calculation_record",
  "methodological_direct_input",
  "validation_fixture_import",
  "expert_override_with_source",
  "mc001_readiness_snapshot",
  "explicit_mc001_calculation_readiness_input"
]);
const RAW_SNAPSHOT_KEYS = Object.freeze([
  "analysis",
  "building",
  "answers",
  "profiles",
  "sourceContext",
  "mc001Readiness"
]);
const FORBIDDEN_OUTPUT_KEYS = Object.freeze([
  "sourceContext",
  "sourceTrace",
  "sourceLocator",
  "sourceRefs"
]);
const PRIVATE_CONTENT_PATTERN =
  /(@|\+40722111222|person@example\.com|john|doe|strada|owner|private|person|record-JohnDoe|record-001|owner-snapshot|private-note|person-name|free text note|sourceContext|sourceTrace|sourceLocator|sourceRefs)/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TECHNICAL_ID_PATTERN =
  /^(analysis|building|house|snapshot|record|trace|component|hu-component|inventory-component|ztu):[a-z0-9][a-z0-9_.:/-]{0,79}$/;
const TABLE_ID_PATTERN =
  /^table:[a-z][a-z0-9_]{0,63}:[a-z0-9][a-z0-9_.:/-]{0,79}$/;
const COMPONENT_ID_PATTERN =
  /^(component|hu-component|inventory-component):[a-z0-9][a-z0-9_.:/-]{0,79}$/;
const ZTU_ID_PATTERN = /^ztu:[a-z0-9][a-z0-9_.:/-]{0,79}$/;
const RECORD_ID_PATTERN = /^record:[a-z0-9][a-z0-9_.:/-]{0,79}$/;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.hasOwn(value, key);
}

function hasRequiredString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function blocker(code) {
  const safeCode = BLOCKER_CODE_SET.has(code) ? code : "blocked_invalid_h3_input";
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
    FORBIDDEN_OUTPUT_KEYS.includes(key) ||
    PRIVATE_CONTENT_PATTERN.test(key) ||
    containsPrivateContent(child)
  ));
}

function technicalIdLooksSafe(value) {
  return (
    hasRequiredString(value) &&
    !PRIVATE_CONTENT_PATTERN.test(value) &&
    !/[{}\[\]"'<>\s@]/.test(value) &&
    value.length <= 96 &&
    (TECHNICAL_ID_PATTERN.test(value) || TABLE_ID_PATTERN.test(value) || UUID_PATTERN.test(value))
  );
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

function sourceRecordIdLooksSafe(value) {
  return (
    hasRequiredString(value) &&
    !PRIVATE_CONTENT_PATTERN.test(value) &&
    !/[{}\[\]"'<>\s@]/.test(value) &&
    value.length <= 96 &&
    (RECORD_ID_PATTERN.test(value) || UUID_PATTERN.test(value))
  );
}

function rawSavedAnalysisLike(input) {
  return isObject(input) && RAW_SNAPSHOT_KEYS.some((key) => hasOwn(input, key));
}

function primitiveValue(primitive) {
  return primitive?.value;
}

function primitiveUnit(primitive) {
  return primitive?.unit;
}

function primitiveIsPositiveFinite(primitive) {
  const value = primitiveValue(primitive);
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function bztuIsFiniteRange(primitive) {
  const value = primitiveValue(primitive);
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function sourceFromPrimitive(primitive) {
  return primitive?.source ?? primitive?.provenance ?? null;
}

function sourceIssues(source) {
  if (!isObject(source)) {
    return [blocker("blocked_missing_source_provenance")];
  }

  const issues = [];
  if (containsPrivateContent(source)) {
    issues.push(blocker("blocked_unsafe_private_content"));
  }

  if (!SOURCE_TYPES.has(source.sourceType)) {
    issues.push(blocker("blocked_invalid_source_provenance"));
  }

  const sourceRecordId = source.sourceRecordId ?? source.recordId ?? source.sourceIdentifier;
  if (!sourceRecordIdLooksSafe(sourceRecordId)) {
    issues.push(
      hasRequiredString(sourceRecordId)
        ? blocker("blocked_unsafe_private_identifier")
        : blocker("blocked_invalid_source_provenance")
    );
  }

  if (
    hasRequiredString(source.analysisId) &&
    !technicalIdLooksSafe(source.analysisId)
  ) {
    issues.push(blocker("blocked_unsafe_private_identifier"));
  }
  if (
    hasRequiredString(source.buildingId) &&
    !technicalIdLooksSafe(source.buildingId)
  ) {
    issues.push(blocker("blocked_unsafe_private_identifier"));
  }

  return issues;
}

function validateComponentIdentity(component) {
  if (!hasRequiredString(component?.componentId)) {
    return {
      componentId: null,
      blockers: [blocker("blocked_missing_component_identity")]
    };
  }
  if (!componentIdLooksSafe(component.componentId)) {
    return {
      componentId: null,
      blockers: [
        blocker(
          containsPrivateContent(component.componentId)
            ? "blocked_unsafe_private_identifier"
            : "blocked_invalid_component_identity"
        )
      ]
    };
  }
  return {
    componentId: component.componentId,
    blockers: []
  };
}

function validateZoneIdentity(component) {
  const issues = [];
  if (!hasRequiredString(component?.ztuZoneId) || !hasRequiredString(component?.adjacentZoneId)) {
    issues.push(blocker("blocked_missing_zone_identity"));
    return issues;
  }
  if (!ztuIdLooksSafe(component.ztuZoneId) || !ztuIdLooksSafe(component.adjacentZoneId)) {
    issues.push(
      blocker(
        containsPrivateContent(component.ztuZoneId) ||
          containsPrivateContent(component.adjacentZoneId)
          ? "blocked_unsafe_private_identifier"
          : "blocked_invalid_zone_identity"
      )
    );
  }
  return issues;
}

function validateArea(area) {
  if (!isObject(area)) {
    return [blocker("blocked_missing_component_area")];
  }
  if (!primitiveIsPositiveFinite(area) || !AREA_UNITS.has(primitiveUnit(area))) {
    return [blocker("blocked_invalid_component_area")];
  }
  return [];
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

function validateThermalTransmittance(thermalTransmittance) {
  if (!isObject(thermalTransmittance)) {
    return [blocker("blocked_missing_thermal_transmittance")];
  }
  if (
    !primitiveIsPositiveFinite(thermalTransmittance) ||
    !THERMAL_TRANSMITTANCE_UNITS.has(primitiveUnit(thermalTransmittance))
  ) {
    return [blocker("blocked_invalid_thermal_transmittance")];
  }
  return [];
}

function validateBztu(bztu) {
  if (!isObject(bztu)) {
    return [blocker("blocked_missing_bztu")];
  }
  if (!bztuIsFiniteRange(bztu) || !BZTU_UNITS.has(primitiveUnit(bztu))) {
    return [blocker("blocked_invalid_bztu")];
  }
  return [];
}

function sourceProvenanceIssuesFor(component) {
  return [
    ...sourceIssues(sourceFromPrimitive(component?.area)),
    ...sourceIssues(sourceFromPrimitive(thermalTransmittanceFrom(component))),
    ...sourceIssues(sourceFromPrimitive(component?.bztu))
  ];
}

function sourceProvenanceReadyFor(component) {
  return sourceProvenanceIssuesFor(component).length === 0;
}

function componentReadinessFrom(component) {
  const identity = validateComponentIdentity(component);
  const zoneBlockers = validateZoneIdentity(component);
  const areaBlockers = validateArea(component?.area);
  const thermalTransmittance = thermalTransmittanceFrom(component);
  const thermalTransmittanceBlockers =
    validateThermalTransmittance(thermalTransmittance);
  const bztuBlockers = validateBztu(component?.bztu);
  const sourceBlockers = sourceProvenanceIssuesFor(component);
  const blockers = uniqueBlockers([
    ...identity.blockers,
    ...zoneBlockers,
    ...areaBlockers,
    ...thermalTransmittanceBlockers,
    ...bztuBlockers,
    ...sourceBlockers
  ]);

  return Object.freeze({
    componentId: identity.componentId,
    status: blockers.length === 0 ? "ready" : "blocked",
    blockers,
    requiredInputs: Object.freeze({
      zoneIdentity: zoneBlockers.length === 0,
      area: areaBlockers.length === 0,
      thermalTransmittance: thermalTransmittanceBlockers.length === 0,
      bztu: bztuBlockers.length === 0,
      sourceProvenance: sourceProvenanceReadyFor(component)
    })
  });
}

function emptyResult({
  status = "blocked",
  isHuInventoryReady = false,
  componentReadiness = [],
  blockers = []
} = {}) {
  const readyComponents = componentReadiness.filter((entry) => entry.status === "ready").length;
  const blockedComponents = componentReadiness.length - readyComponents;
  const safeBlockers = uniqueBlockers(blockers);

  return Object.freeze({
    gateId: MC001_HU_HTR_CALCULATION_READINESS_GATE_ID,
    schemaVersion: MC001_HU_HTR_CALCULATION_READINESS_GATE_SCHEMA_VERSION,
    isMc001HuHtrCalculationReadinessGate: true,
    status,
    readiness: Object.freeze({
      isHuInventoryReady,
      isHuComponentTermCalculationReady: status === "ready",
      isHuAggregationReady: false,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      hasHuResult: false,
      hasHtrResult: false,
      downstreamReadiness: false
    }),
    componentReadiness: Object.freeze(componentReadiness),
    blockers: safeBlockers,
    counts: Object.freeze({
      components: componentReadiness.length,
      readyComponents,
      blockedComponents,
      blockers: safeBlockers.length
    })
  });
}

function inputEnvelopeIsValid(input) {
  return (
    isObject(input) &&
    input.schemaVersion === MC001_HU_HTR_CALCULATION_READINESS_INPUT_SCHEMA_VERSION &&
    input.isMc001HuHtrCalculationReadinessInput === true
  );
}

export function buildMc001HuHtrCalculationReadinessGate(
  calculationReadinessInput,
  options = {}
) {
  void options;

  if (rawSavedAnalysisLike(calculationReadinessInput)) {
    return emptyResult({
      blockers: [blocker("blocked_raw_saved_analysis_input")]
    });
  }

  if (!inputEnvelopeIsValid(calculationReadinessInput)) {
    return emptyResult({
      blockers: [blocker("blocked_invalid_h3_input")]
    });
  }

  const input = calculationReadinessInput;
  const inputBlockers = [];
  const isHuInventoryReady = input.inventoryReadiness?.isHuInventoryReady === true;
  if (!isHuInventoryReady) {
    inputBlockers.push(blocker("blocked_hu_inventory_not_ready"));
  }

  const components = Array.isArray(input.components) ? input.components : [];
  if (components.length === 0) {
    inputBlockers.push(blocker("blocked_invalid_h3_input"));
  }

  const componentReadiness = components.map(componentReadinessFrom);
  const componentBlockers = componentReadiness.flatMap((entry) => entry.blockers);
  const blockers = uniqueBlockers([...inputBlockers, ...componentBlockers]);
  const status = blockers.length === 0 ? "ready" : "blocked";

  return emptyResult({
    status,
    isHuInventoryReady,
    componentReadiness,
    blockers
  });
}
