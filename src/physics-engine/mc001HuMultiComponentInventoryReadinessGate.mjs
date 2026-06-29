import {
  createMc001HuComponentContractReadinessGate,
  MC001_HU_COMPONENT_CONTRACT_READINESS_GATE_ID
} from "./mc001HuComponentContractReadinessGate.mjs";

export const MC001_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE_ID =
  "MC001_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE_PHASE_H2H";

export const HU_MULTI_COMPONENT_INVENTORY_ROOT = "huMultiComponentInventory";

const SOURCE_LOCATOR_FIELDS = Object.freeze([
  "document",
  "documentId",
  "file",
  "path",
  "page",
  "pageRange",
  "section",
  "table",
  "figure",
  "equation",
  "relation",
  "row",
  "annex",
  "locator"
]);

const RAW_HU_CONTAINERS = Object.freeze([
  "rawAuditorInput",
  "normalAuditorInput",
  "auditorInput",
  "rawInput"
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasRequiredString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function locatorFieldIsUseful(value) {
  return hasRequiredString(value) || (typeof value === "number" && Number.isFinite(value));
}

function locatorIsPresent(locator) {
  if (hasRequiredString(locator)) {
    return true;
  }

  if (!isObject(locator)) {
    return false;
  }

  return SOURCE_LOCATOR_FIELDS.some((field) => locatorFieldIsUseful(locator[field]));
}

function arrayHasRequiredStrings(value) {
  return Array.isArray(value) && value.length > 0 && value.every(hasRequiredString);
}

function sourceRefsFrom(value) {
  return value?.sourceRefs ?? value?.provenance?.sourceRefs ?? value?.sourceTrace?.sourceRefs;
}

function sourceLocatorFrom(value) {
  return (
    value?.sourceLocator ??
    value?.provenance?.sourceLocator ??
    value?.sourceTrace?.sourceLocator
  );
}

function sourceFrom(value) {
  return value?.source ?? value?.provenance?.source ?? value?.sourceTrace?.source;
}

function traceIdFrom(value) {
  return value?.traceId ?? value?.provenance?.traceId ?? value?.sourceTrace?.traceId;
}

function hasSourceProvenance(value) {
  return (
    isObject(value) &&
    hasRequiredString(sourceFrom(value)) &&
    arrayHasRequiredStrings(sourceRefsFrom(value)) &&
    locatorIsPresent(sourceLocatorFrom(value))
  );
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return [];
  }
  return [value];
}

function unique(values) {
  return Object.freeze([...new Set(values.filter(hasRequiredString))]);
}

function issue(status, code, message, extra = {}) {
  return {
    status,
    code,
    message,
    ...extra
  };
}

function diagnosticFromIssue(inventoryIssue) {
  return {
    level: inventoryIssue.status,
    code: inventoryIssue.code,
    message: inventoryIssue.message,
    path: inventoryIssue.path ?? HU_MULTI_COMPONENT_INVENTORY_ROOT
  };
}

function blockerFromIssue(inventoryIssue) {
  return {
    itemType: "hu_multi_component_inventory",
    status: inventoryIssue.code,
    readinessStatus: inventoryIssue.status,
    value: null,
    diagnosticCode: inventoryIssue.code,
    reason: inventoryIssue.message,
    path: inventoryIssue.path ?? HU_MULTI_COMPONENT_INVENTORY_ROOT,
    componentId: inventoryIssue.componentId ?? null,
    elementId: inventoryIssue.elementId ?? null,
    ztuZoneId: inventoryIssue.ztuZoneId ?? null,
    month: inventoryIssue.month ?? null
  };
}

function resultStatusFromIssues(issues) {
  if (issues.length === 0) {
    return "ready";
  }
  if (issues.some((inventoryIssue) => inventoryIssue.status === "rejected")) {
    return "rejected";
  }
  if (issues.some((inventoryIssue) => inventoryIssue.status === "ambiguous")) {
    return "ambiguous";
  }
  return "blocked";
}

function inventoryStatusFromIssues(issues) {
  if (issues.length === 0) {
    return "ready_hu_component_inventory";
  }
  return issues[0].code;
}

function monthIsValid(month) {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

function normalizeInventory(input) {
  const inventory =
    input?.[HU_MULTI_COMPONENT_INVENTORY_ROOT] ??
    input?.huInventory ??
    input?.huMultiComponentInventoryCandidate ??
    {};

  const componentCandidates =
    inventory.componentCandidates ??
    inventory.components ??
    inventory.actualComponents ??
    input?.huComponentCandidates ??
    [];
  const expectedComponents =
    inventory.expectedComponents ??
    inventory.expectedComponentCandidates ??
    input?.expectedHuComponents ??
    [];

  return {
    inventory,
    month: inventory.month ?? input?.month ?? null,
    conditionedZoneIds: unique([
      ...asArray(inventory.conditionedZoneIds),
      ...asArray(inventory.conditionedZoneId)
    ]),
    ztuZoneIds: unique([
      ...asArray(inventory.ztuZoneIds),
      ...asArray(inventory.ztuZoneId),
      ...asArray(inventory.unconditionedZoneIds),
      ...asArray(inventory.unconditionedZoneId)
    ]),
    componentCandidates,
    expectedComponents,
    distribution: inventory.distribution ?? inventory.distributionMetadata ?? null,
    sourceTrace: inventory.sourceTrace ?? inventory.provenance ?? null,
    readinessClaims: {
      ...(inventory.readinessClaims ?? {}),
      ...(input?.readinessClaims ?? {})
    }
  };
}

function componentMetadata(candidate = {}) {
  const element = candidate?.element ?? {};
  return {
    componentId:
      candidate?.componentId ??
      candidate?.huComponentId ??
      candidate?.id ??
      "hu_component_candidate",
    conditionedZoneId:
      candidate?.conditionedZoneId ??
      candidate?.ztcZoneId ??
      candidate?.conditionedZone?.zoneId ??
      null,
    ztuZoneId:
      candidate?.ztuZoneId ??
      candidate?.unconditionedZoneId ??
      candidate?.unconditionedZone?.zoneId ??
      candidate?.adjacentNonClimatizedZoneId ??
      null,
    month: candidate?.month,
    elementId: candidate?.elementId ?? element.elementId ?? element.id ?? null,
    boundaryRelation:
      candidate?.boundaryRelation ??
      candidate?.boundary?.relation ??
      candidate?.adjacentBoundaryRelation ??
      null
  };
}

function expectedComponentMetadata(expected = {}) {
  return {
    componentId:
      expected?.componentId ??
      expected?.huComponentId ??
      expected?.id ??
      null,
    conditionedZoneId:
      expected?.conditionedZoneId ??
      expected?.ztcZoneId ??
      expected?.conditionedZone?.zoneId ??
      null,
    ztuZoneId:
      expected?.ztuZoneId ??
      expected?.unconditionedZoneId ??
      expected?.unconditionedZone?.zoneId ??
      expected?.adjacentNonClimatizedZoneId ??
      null,
    month: expected?.month,
    elementId: expected?.elementId ?? expected?.element?.elementId ?? null
  };
}

function scopeKey(metadata) {
  return [
    metadata.conditionedZoneId ?? "missing_conditioned_zone",
    metadata.ztuZoneId ?? "missing_ztu_zone",
    metadata.month ?? "missing_month",
    metadata.elementId ?? "missing_element"
  ].join("::");
}

function componentMatchesExpected(component, expected) {
  if (
    hasRequiredString(expected.componentId) &&
    component.componentId === expected.componentId
  ) {
    return true;
  }
  return scopeKey(component) === scopeKey(expected);
}

function duplicateRecords(records, keyFn, code, reason) {
  const seen = new Map();
  const duplicates = [];
  for (const record of records) {
    const key = keyFn(record);
    if (!hasRequiredString(key)) {
      continue;
    }
    if (seen.has(key)) {
      duplicates.push({
        code,
        reason,
        key,
        first: seen.get(key),
        duplicate: record
      });
    } else {
      seen.set(key, record);
    }
  }
  return duplicates;
}

function distributionMetadataIsPresent(distribution) {
  return (
    isObject(distribution) &&
    (hasRequiredString(distribution.methodology) ||
      hasRequiredString(distribution.source) ||
      arrayHasRequiredStrings(distribution.sourceRefs) ||
      hasSourceProvenance(distribution))
  );
}

function rawHuWasSubmitted(input, inventory) {
  if (
    Object.hasOwn(inventory, "Hu") ||
    Object.hasOwn(inventory, "hu") ||
    Object.hasOwn(inventory, "huResult")
  ) {
    return true;
  }

  for (const containerName of RAW_HU_CONTAINERS) {
    const container = input?.[containerName];
    if (!isObject(container)) {
      continue;
    }
    if (
      Object.hasOwn(container, "Hu") ||
      Object.hasOwn(container, "hu") ||
      Object.hasOwn(container, "huComponent") ||
      Object.hasOwn(container, "heatTransferThroughUnconditionedZone")
    ) {
      return true;
    }
  }
  return false;
}

function fakeZeroClaimFor(input, componentName) {
  const claim =
    input?.transmissionComponentClaims?.[componentName] ??
    input?.htrComponentClaims?.[componentName] ??
    input?.claimedTransmissionComponents?.[componentName];

  return isObject(claim) && claim.value === 0 && claim.sourceBackedNonApplicability !== true;
}

function sourceTraceRecord(componentId, record) {
  return {
    componentId,
    source: sourceFrom(record) ?? null,
    sourceRefs: Object.freeze([...(sourceRefsFrom(record) ?? [])]),
    sourceLocator: sourceLocatorFrom(record) ?? null,
    traceId: traceIdFrom(record) ?? null
  };
}

function buildSourceTrace(inventorySourceTrace, componentReadiness) {
  const records = [];

  if (hasSourceProvenance(inventorySourceTrace)) {
    records.push(sourceTraceRecord("hu_multi_component_inventory", inventorySourceTrace));
  }

  for (const component of componentReadiness) {
    for (const record of component.sourceTrace?.records ?? []) {
      records.push({
        ...record,
        inventoryComponentId: component.componentId
      });
    }
  }

  return Object.freeze({
    records: Object.freeze(records)
  });
}

function evaluateComponent(input, candidate) {
  const metadata = componentMetadata(candidate);
  const result = createMc001HuComponentContractReadinessGate({
    ...input,
    huComponentCandidate: candidate
  });

  return {
    componentId: metadata.componentId,
    conditionedZoneId: metadata.conditionedZoneId,
    ztuZoneId: metadata.ztuZoneId,
    month: metadata.month,
    elementId: metadata.elementId,
    boundaryRelation: metadata.boundaryRelation,
    status: result.status,
    componentStatus: result.componentStatus,
    isHuComponentReady: result.readinessFlags.isHuComponentReady === true,
    diagnostics: result.diagnostics,
    blockers: result.blockedItems,
    sourceTrace: result.sourceTrace
  };
}

function detectInventoryIssues(input, normalized, componentMetadataRecords, componentReadiness) {
  const issues = [];
  const expectedMetadata = asArray(normalized.expectedComponents).map(
    expectedComponentMetadata
  );

  if (!Array.isArray(normalized.componentCandidates) || normalized.componentCandidates.length === 0) {
    issues.push(
      issue(
        "blocked",
        "blocked_empty_hu_component_inventory",
        "Hu inventory requires one or more component candidates"
      )
    );
  }

  if (!Array.isArray(normalized.expectedComponents) || normalized.expectedComponents.length === 0) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_expected_component_inventory",
        "Hu inventory requires expected component coverage metadata"
      )
    );
  }

  if (!monthIsValid(normalized.month)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_inventory_month",
        "Hu inventory requires one month as an integer from 1 to 12"
      )
    );
  }

  if (!hasSourceProvenance(normalized.sourceTrace)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_inventory_source",
        "Hu inventory coverage requires source/provenance"
      )
    );
  }

  const duplicateComponentIds = duplicateRecords(
    componentMetadataRecords,
    (record) => record.componentId,
    "blocked_duplicate_component_id",
    "Hu inventory component ids must be unique"
  );
  const duplicateScopes = duplicateRecords(
    componentMetadataRecords,
    scopeKey,
    "blocked_duplicate_element_scope",
    "Hu inventory element/month/zone tuples must be unique"
  );

  for (const duplicate of duplicateComponentIds) {
    issues.push(
      issue("blocked", duplicate.code, duplicate.reason, {
        componentId: duplicate.duplicate.componentId,
        path: `${HU_MULTI_COMPONENT_INVENTORY_ROOT}.componentCandidates`
      })
    );
  }
  for (const duplicate of duplicateScopes) {
    issues.push(
      issue("blocked", duplicate.code, duplicate.reason, {
        componentId: duplicate.duplicate.componentId,
        elementId: duplicate.duplicate.elementId,
        ztuZoneId: duplicate.duplicate.ztuZoneId,
        month: duplicate.duplicate.month,
        path: `${HU_MULTI_COMPONENT_INVENTORY_ROOT}.componentCandidates`
      })
    );
  }

  const missingComponents = expectedMetadata.filter(
    (expected) =>
      !componentMetadataRecords.some((component) =>
        componentMatchesExpected(component, expected)
      )
  );
  for (const missing of missingComponents) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_hu_component",
        "Expected Hu inventory component is missing",
        {
          componentId: missing.componentId,
          elementId: missing.elementId,
          ztuZoneId: missing.ztuZoneId,
          month: missing.month,
          path: `${HU_MULTI_COMPONENT_INVENTORY_ROOT}.expectedComponents`
        }
      )
    );
  }
  if (missingComponents.length > 0) {
    issues.push(
      issue(
        "blocked",
        "blocked_partial_inventory_escalation",
        "Partial Hu component inventory must not be treated as complete inventory"
      )
    );
  }

  const actualToExpectedMatches = componentMetadataRecords.map((component) => ({
    component,
    matches: expectedMetadata.filter((expected) =>
      componentMatchesExpected(component, expected)
    )
  }));
  const unexpectedComponents = actualToExpectedMatches
    .filter((entry) => entry.matches.length === 0)
    .map((entry) => entry.component);
  const ambiguousActualComponents = actualToExpectedMatches
    .filter((entry) => entry.matches.length > 1)
    .map((entry) => entry.component);

  for (const component of unexpectedComponents) {
    issues.push(
      issue(
        "blocked",
        "blocked_unexpected_hu_component",
        "Actual Hu inventory component is not listed in expected inventory",
        {
          componentId: component.componentId,
          elementId: component.elementId,
          ztuZoneId: component.ztuZoneId,
          month: component.month,
          path: `${HU_MULTI_COMPONENT_INVENTORY_ROOT}.componentCandidates`
        }
      )
    );
  }

  for (const component of ambiguousActualComponents) {
    issues.push(
      issue(
        "ambiguous",
        "blocked_ambiguous_hu_component_inventory",
        "Actual Hu inventory component maps to more than one expected component",
        {
          componentId: component.componentId,
          elementId: component.elementId,
          ztuZoneId: component.ztuZoneId,
          month: component.month,
          path: `${HU_MULTI_COMPONENT_INVENTORY_ROOT}.componentCandidates`
        }
      )
    );
  }

  const distinctMonths = new Set(
    componentMetadataRecords
      .map((record) => record.month)
      .filter((month) => month !== null && month !== undefined)
  );
  if (
    distinctMonths.size > 1 ||
    [...distinctMonths].some((month) => month !== normalized.month)
  ) {
    issues.push(
      issue(
        "blocked",
        "blocked_inconsistent_month_scope",
        "Hu inventory components must share the evaluated month"
      )
    );
  }

  const distinctZtuZones = new Set(
    componentMetadataRecords
      .map((record) => record.ztuZoneId)
      .filter(hasRequiredString)
  );
  if (
    distinctZtuZones.size > 1 ||
    (normalized.ztuZoneIds.length === 1 &&
      [...distinctZtuZones].some((ztuZoneId) => ztuZoneId !== normalized.ztuZoneIds[0]))
  ) {
    issues.push(
      issue(
        "blocked",
        "blocked_inconsistent_ztu_scope",
        "Hu inventory components must share the evaluated ztu scope"
      )
    );
  }

  const conditionedZoneIds = unique([
    ...normalized.conditionedZoneIds,
    ...componentMetadataRecords.map((record) => record.conditionedZoneId)
  ]);
  if (
    conditionedZoneIds.length > 1 &&
    !distributionMetadataIsPresent(normalized.distribution)
  ) {
    issues.push(
      issue(
        "ambiguous",
        "blocked_ambiguous_distribution",
        "Multiple conditioned zones adjacent to one ztu require source-backed distribution metadata"
      )
    );
  }

  for (const component of componentMetadataRecords) {
    if (!hasRequiredString(component.boundaryRelation)) {
      issues.push(
        issue(
          "ambiguous",
          "blocked_ambiguous_boundary_relation",
          "Hu inventory component boundary relation must be explicit",
          {
            componentId: component.componentId,
            elementId: component.elementId
          }
        )
      );
    }

    if (
      component.boundaryRelation === "ztu_to_ztu" ||
      component.boundaryRelation === "unconditioned_to_unconditioned"
    ) {
      issues.push(
        issue(
          "blocked",
          "blocked_unsupported_methodology",
          "Hu inventory does not support ztu-to-ztu paths",
          {
            componentId: component.componentId,
            elementId: component.elementId
          }
        )
      );
    }
  }

  if (rawHuWasSubmitted(input, normalized.inventory)) {
    issues.push(
      issue(
        "rejected",
        "rejected_hu_raw_auditor_input",
        "Hu is a derived readiness/output component and must not be normal raw auditor input"
      )
    );
  }

  if (normalized.readinessClaims.isHuInventoryReady === true) {
    issues.push(
      issue(
        "blocked",
        "blocked_hu_inventory_readiness_escalation",
        "Input cannot force Hu inventory readiness"
      )
    );
  }

  if (normalized.readinessClaims.isCompleteHuReady === true) {
    issues.push(
      issue(
        "blocked",
        "blocked_complete_hu_readiness_escalation",
        "H2H cannot claim complete Hu readiness"
      )
    );
  }

  if (normalized.readinessClaims.isCompleteHtrReady === true) {
    issues.push(
      issue(
        "blocked",
        "blocked_complete_htr_readiness_escalation",
        "H2H cannot claim complete Htr readiness"
      )
    );
  }

  for (const componentName of ["Hg", "Ha"]) {
    if (fakeZeroClaimFor(input, componentName)) {
      issues.push(
        issue(
          "blocked",
          "blocked_fake_zero_transmission_component",
          `${componentName} must not be treated as zero to complete Htr readiness`
        )
      );
    }
  }

  const blockedComponents = componentReadiness.filter(
    (component) => component.isHuComponentReady !== true
  );
  if (blockedComponents.length > 0) {
    issues.push(
      issue(
        "blocked",
        "blocked_partial_hu_component_inventory",
        "Every required Hu component candidate must be component-ready"
      )
    );
  }

  return {
    issues,
    expectedMetadata,
    missingComponents,
    unexpectedComponents,
    ambiguousActualComponents,
    duplicateComponentIds,
    duplicateScopes
  };
}

function ambiguousComponentsFrom(componentReadiness, componentMetadataRecords, issues) {
  const ambiguousIds = new Set();

  for (const component of componentReadiness) {
    if (
      component.status === "ambiguous" ||
      component.diagnostics.some((entry) => entry.level === "ambiguous")
    ) {
      ambiguousIds.add(component.componentId);
    }
  }

  for (const inventoryIssue of issues) {
    if (inventoryIssue.status === "ambiguous" && hasRequiredString(inventoryIssue.componentId)) {
      ambiguousIds.add(inventoryIssue.componentId);
    }
  }

  return Object.freeze(
    componentMetadataRecords.filter((component) => ambiguousIds.has(component.componentId))
  );
}

function distributionBlockersFrom(issues) {
  return Object.freeze(
    issues
      .filter((inventoryIssue) => inventoryIssue.code === "blocked_ambiguous_distribution")
      .map(blockerFromIssue)
  );
}

export function createMc001HuMultiComponentInventoryReadinessGate(input = {}) {
  const normalized = normalizeInventory(input);
  const componentCandidates = Array.isArray(normalized.componentCandidates)
    ? normalized.componentCandidates
    : [];
  const componentMetadataRecords = componentCandidates.map(componentMetadata);
  const componentReadiness = componentCandidates.map((candidate) =>
    evaluateComponent(input, candidate)
  );
  const {
    issues: inventoryIssues,
    missingComponents,
    unexpectedComponents,
    duplicateComponentIds,
    duplicateScopes
  } = detectInventoryIssues(
    input,
    normalized,
    componentMetadataRecords,
    componentReadiness
  );

  const inventoryDiagnostics = inventoryIssues.map(diagnosticFromIssue);
  const componentDiagnostics = componentReadiness.flatMap((component) =>
    component.diagnostics.map((entry) => ({
      ...entry,
      upstreamGate: MC001_HU_COMPONENT_CONTRACT_READINESS_GATE_ID,
      inventoryComponentId: component.componentId
    }))
  );
  const diagnostics = Object.freeze([...inventoryDiagnostics, ...componentDiagnostics]);
  const inventoryBlockers = inventoryIssues.map(blockerFromIssue);
  const componentBlockers = componentReadiness.flatMap((component) =>
    component.blockers.map((blocker) => ({
      ...blocker,
      upstreamGate: MC001_HU_COMPONENT_CONTRACT_READINESS_GATE_ID,
      inventoryComponentId: component.componentId
    }))
  );
  const blockers = Object.freeze([...inventoryBlockers, ...componentBlockers]);
  const status = resultStatusFromIssues(inventoryIssues);
  const inventoryStatus = inventoryStatusFromIssues(inventoryIssues);
  const readyComponentCount = componentReadiness.filter(
    (component) => component.isHuComponentReady === true
  ).length;
  const blockedComponentCount = componentReadiness.length - readyComponentCount;
  const isHuInventoryReady =
    status === "ready" &&
    componentReadiness.length > 0 &&
    componentReadiness.every((component) => component.isHuComponentReady === true);
  const sourceTrace = buildSourceTrace(normalized.sourceTrace, componentReadiness);
  const conditionedZoneIds = unique([
    ...normalized.conditionedZoneIds,
    ...componentMetadataRecords.map((record) => record.conditionedZoneId)
  ]);
  const ztuZoneIds = unique([
    ...normalized.ztuZoneIds,
    ...componentMetadataRecords.map((record) => record.ztuZoneId)
  ]);
  const duplicateComponents = Object.freeze([
    ...duplicateComponentIds,
    ...duplicateScopes
  ]);
  const ambiguousComponents = ambiguousComponentsFrom(
    componentReadiness,
    componentMetadataRecords,
    inventoryIssues
  );
  const distributionBlockers = distributionBlockersFrom(inventoryIssues);
  const readinessFlags = {
    isHuInventoryReady,
    isCompleteHuReady: false,
    isCompleteHtrReady: false,
    isMonthlyHeatingReady: false,
    isQhndReady: false,
    isLevel2AuditorReady: false,
    isCpeReady: false
  };

  const huMultiComponentInventoryReadiness = {
    status,
    inventoryStatus,
    month: normalized.month,
    conditionedZoneIds,
    unconditionedZoneIds: ztuZoneIds,
    ztuZoneIds,
    componentCount: componentReadiness.length,
    readyComponentCount,
    blockedComponentCount,
    componentReadiness: Object.freeze(componentReadiness),
    missingComponents: Object.freeze(missingComponents),
    unexpectedComponents: Object.freeze(unexpectedComponents),
    duplicateComponents,
    ambiguousComponents,
    distributionBlockers,
    sourceTrace,
    diagnostics,
    blockers,
    isHuInventoryReady,
    isCompleteHuReady: false,
    isCompleteHtrReady: false
  };

  return {
    gateId: MC001_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE_ID,
    status,
    inventoryStatus,
    huMultiComponentInventoryReadiness,
    month: normalized.month,
    conditionedZoneIds,
    unconditionedZoneIds: ztuZoneIds,
    ztuZoneIds,
    componentCount: componentReadiness.length,
    readyComponentCount,
    blockedComponentCount,
    componentReadiness: Object.freeze(componentReadiness),
    missingComponents: Object.freeze(missingComponents),
    unexpectedComponents: Object.freeze(unexpectedComponents),
    duplicateComponents,
    ambiguousComponents,
    distributionBlockers,
    sourceTrace,
    diagnostics,
    blockedItems: blockers,
    blockers,
    readinessFlags,
    nextRequiredStep: isHuInventoryReady
      ? "KEEP_COMPLETE_HU_AND_COMPLETE_HTR_BLOCKED_UNTIL_NUMERICAL_METHOD_AND_FULL_TRANSMISSION_READINESS_ARE_PROVEN"
      : "PROVIDE_COMPLETE_SOURCE_BACKED_UNAMBIGUOUS_HU_COMPONENT_INVENTORY"
  };
}
