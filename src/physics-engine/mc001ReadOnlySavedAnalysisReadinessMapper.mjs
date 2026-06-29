export const MC001_READ_ONLY_SAVED_ANALYSIS_READINESS_MAPPER_ID =
  "MC001_READ_ONLY_SAVED_ANALYSIS_READINESS_MAPPER_PHASE_DB2";

const MAPPER_ROOT = "mc001Readiness";
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

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasRequiredString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function hasRequiredArray(value) {
  return Array.isArray(value) && value.length > 0;
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

function clonePlain(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
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
  const sourceRefs = sourceRefsFrom(value);
  return (
    isObject(value) &&
    hasRequiredString(sourceFrom(value)) &&
    Array.isArray(sourceRefs) &&
    sourceRefs.length > 0 &&
    sourceRefs.every(hasRequiredString) &&
    locatorIsPresent(sourceLocatorFrom(value))
  );
}

function issue(status, code, message, extra = {}) {
  return {
    status,
    code,
    message,
    ...extra
  };
}

function diagnosticFromIssue(mappingIssue) {
  return {
    level: mappingIssue.status,
    code: mappingIssue.code,
    message: mappingIssue.message,
    path: mappingIssue.path ?? MAPPER_ROOT
  };
}

function blockerFromIssue(mappingIssue) {
  return {
    itemType: "read_only_saved_analysis_mapping",
    status: mappingIssue.code,
    readinessStatus: mappingIssue.status,
    value: null,
    diagnosticCode: mappingIssue.code,
    reason: mappingIssue.message,
    path: mappingIssue.path ?? MAPPER_ROOT
  };
}

function statusFromIssues(issues) {
  if (issues.length === 0) {
    return "ready_for_hu_inventory_readiness_input";
  }
  if (issues.some((mappingIssue) => mappingIssue.status === "rejected")) {
    return "rejected";
  }
  return "blocked";
}

function sourceTraceRecord(label, value) {
  return {
    sourceType: label,
    source: sourceFrom(value) ?? null,
    sourceRefs: Object.freeze([...(sourceRefsFrom(value) ?? [])]),
    sourceLocator: sourceLocatorFrom(value) ?? null,
    traceId: traceIdFrom(value) ?? null
  };
}

function snapshotLineageRecord(snapshot) {
  return {
    sourceType: "saved_analysis_snapshot",
    analysisId: snapshot?.analysis?.id ?? snapshot?.analysisId ?? null,
    buildingId: snapshot?.building?.id ?? snapshot?.buildingId ?? null,
    houseId: snapshot?.house?.id ?? snapshot?.houseId ?? null,
    sourceContext: clonePlain(snapshot?.sourceContext ?? null)
  };
}

function sourceTraceFrom(snapshot, explicitMapping, issues) {
  const records = [snapshotLineageRecord(snapshot)];

  if (hasSourceProvenance(explicitMapping?.sourceTrace)) {
    records.push(sourceTraceRecord("explicit_mc001_readiness_mapping", explicitMapping.sourceTrace));
  }

  if (hasSourceProvenance(explicitMapping?.huMultiComponentInventory?.sourceTrace)) {
    records.push(
      sourceTraceRecord(
        "explicit_hu_multi_component_inventory",
        explicitMapping.huMultiComponentInventory.sourceTrace
      )
    );
  }

  if (Array.isArray(explicitMapping?.sourceTrace?.records)) {
    for (const record of explicitMapping.sourceTrace.records) {
      records.push(clonePlain(record));
    }
  }

  return Object.freeze({
    records: Object.freeze(records),
    diagnosticCodes: Object.freeze(issues.map((mappingIssue) => mappingIssue.code))
  });
}

function selectedAnalysisIdFrom(snapshot, explicitMapping) {
  return (
    explicitMapping?.selectedAnalysisId ??
    explicitMapping?.analysisId ??
    snapshot?.analysis?.id ??
    snapshot?.analysisId ??
    null
  );
}

function selectedBuildingIdFrom(snapshot, explicitMapping) {
  return (
    explicitMapping?.selectedBuildingId ??
    explicitMapping?.buildingId ??
    snapshot?.building?.id ??
    snapshot?.buildingId ??
    null
  );
}

function snapshotTimestampFrom(snapshot, explicitMapping) {
  return (
    explicitMapping?.snapshotTimestamp ??
    explicitMapping?.sourceTimestamp ??
    explicitMapping?.readOnlySnapshotTimestamp ??
    snapshot?.snapshotTimestamp ??
    snapshot?.sourceContext?.snapshotTimestamp ??
    null
  );
}

function zoneIdFrom(zone) {
  if (hasRequiredString(zone)) {
    return zone;
  }
  return zone?.zoneId ?? zone?.conditionedZoneId ?? zone?.ztuZoneId ?? zone?.id ?? null;
}

function hasZoneMapping(zones) {
  return asArray(zones).some((zone) => hasRequiredString(zoneIdFrom(zone)));
}

function zoneMappingFrom(explicitMapping, readinessInput) {
  const zoneMapping = explicitMapping?.zoneMapping ?? {};
  const inventory =
    explicitMapping?.huMultiComponentInventory ??
    readinessInput?.huMultiComponentInventory ??
    {};

  return {
    conditionedZones:
      explicitMapping?.conditionedZones ??
      zoneMapping.conditionedZones ??
      zoneMapping.conditionedZoneCandidates ??
      inventory.conditionedZoneIds ??
      [],
    ztuZones:
      explicitMapping?.ztuZones ??
      explicitMapping?.unconditionedZones ??
      zoneMapping.ztuZones ??
      zoneMapping.unconditionedZones ??
      zoneMapping.unconditionedZoneCandidates ??
      inventory.ztuZoneIds ??
      inventory.unconditionedZoneIds ??
      []
  };
}

function inventoryFrom(explicitMapping, readinessInput) {
  return (
    explicitMapping?.huMultiComponentInventory ??
    explicitMapping?.huInventory ??
    explicitMapping?.huMultiComponentInventoryCandidate ??
    readinessInput?.huMultiComponentInventory ??
    null
  );
}

function bztuDirectInputsFrom(explicitMapping, readinessInput) {
  return (
    explicitMapping?.bztuDirectInputs ??
    explicitMapping?.bztuMapping?.bztuDirectInputs ??
    readinessInput?.bztuDirectInputs ??
    []
  );
}

function readinessInputFrom(explicitMapping, inventory, bztuDirectInputs) {
  const input =
    explicitMapping?.readinessInput ??
    explicitMapping?.inputPack ??
    explicitMapping?.orchestratorInput ??
    null;

  if (isObject(input)) {
    const clonedInput = clonePlain(input);
    if (clonedInput.huMultiComponentInventory === undefined && isObject(inventory)) {
      clonedInput.huMultiComponentInventory = clonePlain(inventory);
    }
    if (clonedInput.bztuDirectInputs === undefined && hasRequiredArray(bztuDirectInputs)) {
      clonedInput.bztuDirectInputs = clonePlain(bztuDirectInputs);
    }
    return clonedInput;
  }

  if (isObject(inventory) || hasRequiredArray(bztuDirectInputs)) {
    return {
      huMultiComponentInventory: clonePlain(inventory),
      bztuDirectInputs: clonePlain(bztuDirectInputs)
    };
  }

  return null;
}

function hasOrchestratorInputBasics(readinessInput) {
  return (
    isObject(readinessInput?.contractMetadata) &&
    isObject(readinessInput?.buildingClassification?.primaryCategoryKey) &&
    Array.isArray(readinessInput?.sourceTrace?.documents)
  );
}

function huOrHtrResultIsPresent(value) {
  if (!isObject(value)) {
    return false;
  }

  return (
    Object.hasOwn(value, "huResult") ||
    Object.hasOwn(value, "htrResult") ||
    Object.hasOwn(value, "Hu") ||
    Object.hasOwn(value, "Htr")
  );
}

function componentHasRequiredPath(component, pathName) {
  return isObject(component?.[pathName]);
}

function componentHasSourceTrace(component) {
  return hasSourceProvenance(component?.sourceTrace ?? component?.provenance);
}

function validateComponentCandidates(inventory, issues) {
  const components = inventory?.componentCandidates ?? inventory?.components ?? [];

  components.forEach((component, index) => {
    const path = `${MAPPER_ROOT}.huMultiComponentInventory.componentCandidates[${index}]`;
    if (!componentHasRequiredPath(component, "uValuePath")) {
      issues.push(
        issue(
          "blocked",
          "blocked_missing_u_value_path",
          "Explicit MC001 mapping must provide a U-value or corrected U-value path for each Hu component",
          { path: `${path}.uValuePath` }
        )
      );
    } else if (!hasSourceProvenance(component.uValuePath)) {
      issues.push(
        issue(
          "blocked",
          "blocked_missing_u_value_source_provenance",
          "Explicit U-value paths require source/provenance",
          { path: `${path}.uValuePath` }
        )
      );
    }

    if (!componentHasRequiredPath(component, "bztuPath")) {
      issues.push(
        issue(
          "blocked",
          "blocked_missing_bztu_path",
          "Explicit MC001 mapping must provide a BZTU path for each Hu component",
          { path: `${path}.bztuPath` }
        )
      );
    }

    if (!componentHasSourceTrace(component)) {
      issues.push(
        issue(
          "blocked",
          "blocked_missing_component_source_provenance",
          "Explicit Hu components require source/provenance",
          { path: `${path}.sourceTrace` }
        )
      );
    }

    if (!isObject(component?.applicability)) {
      issues.push(
        issue(
          "blocked",
          "blocked_missing_applicability_metadata",
          "Explicit Hu components require applicability metadata",
          { path: `${path}.applicability` }
        )
      );
    }
  });
}

function validateNoForbiddenOutputs(explicitMapping, readinessInput, issues) {
  if (huOrHtrResultIsPresent(explicitMapping) || huOrHtrResultIsPresent(readinessInput)) {
    issues.push(
      issue(
        "blocked",
        "blocked_forbidden_hu_htr_result",
        "DB2 mapping must not expose Hu or Htr results",
        { path: MAPPER_ROOT }
      )
    );
  }

  const readinessClaims = {
    ...(explicitMapping?.readinessClaims ?? {}),
    ...(readinessInput?.readinessClaims ?? {}),
    ...(readinessInput?.huMultiComponentInventory?.readinessClaims ?? {})
  };

  if (readinessClaims.isCompleteHuReady === true) {
    issues.push(
      issue(
        "blocked",
        "blocked_complete_hu_readiness_escalation",
        "DB2 cannot claim complete Hu readiness",
        { path: `${MAPPER_ROOT}.readinessClaims.isCompleteHuReady` }
      )
    );
  }

  if (readinessClaims.isCompleteHtrReady === true) {
    issues.push(
      issue(
        "blocked",
        "blocked_complete_htr_readiness_escalation",
        "DB2 cannot claim complete Htr readiness",
        { path: `${MAPPER_ROOT}.readinessClaims.isCompleteHtrReady` }
      )
    );
  }
}

function detectExplicitMappingIssues(snapshot, explicitMapping) {
  const issues = [];
  const inventory = inventoryFrom(explicitMapping, explicitMapping?.readinessInput);
  const bztuDirectInputs = bztuDirectInputsFrom(
    explicitMapping,
    explicitMapping?.readinessInput
  );
  const readinessInput = readinessInputFrom(explicitMapping, inventory, bztuDirectInputs);
  const zones = zoneMappingFrom(explicitMapping, readinessInput);

  if (!hasRequiredString(String(selectedAnalysisIdFrom(snapshot, explicitMapping) ?? ""))) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_selected_analysis",
        "Read-only MC001 mapping requires a selected analysis identifier",
        { path: `${MAPPER_ROOT}.selectedAnalysisId` }
      )
    );
  }

  if (!hasRequiredString(String(selectedBuildingIdFrom(snapshot, explicitMapping) ?? ""))) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_selected_building",
        "Read-only MC001 mapping requires a selected building identifier",
        { path: `${MAPPER_ROOT}.selectedBuildingId` }
      )
    );
  }

  if (!hasRequiredString(snapshotTimestampFrom(snapshot, explicitMapping))) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_read_only_snapshot_timestamp",
        "Read-only MC001 mapping requires a snapshot/source timestamp",
        { path: `${MAPPER_ROOT}.snapshotTimestamp` }
      )
    );
  }

  if (!hasZoneMapping(zones.conditionedZones)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_conditioned_zone_mapping",
        "Read-only MC001 mapping requires explicit conditioned-zone mapping",
        { path: `${MAPPER_ROOT}.zoneMapping.conditionedZones` }
      )
    );
  }

  if (!hasZoneMapping(zones.ztuZones)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_ztu_zone_mapping",
        "Read-only MC001 mapping requires explicit unconditioned ztu-zone mapping",
        { path: `${MAPPER_ROOT}.zoneMapping.ztuZones` }
      )
    );
  }

  if (!isObject(inventory)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_hu_inventory_mapping",
        "Read-only MC001 mapping requires explicit Hu inventory mapping",
        { path: `${MAPPER_ROOT}.huMultiComponentInventory` }
      )
    );
  } else {
    if (!hasRequiredArray(inventory.expectedComponents)) {
      issues.push(
        issue(
          "blocked",
          "blocked_missing_expected_hu_component_inventory",
          "Read-only MC001 mapping requires expected Hu component coverage",
          { path: `${MAPPER_ROOT}.huMultiComponentInventory.expectedComponents` }
        )
      );
    }

    if (!hasRequiredArray(inventory.componentCandidates)) {
      issues.push(
        issue(
          "blocked",
          "blocked_missing_actual_hu_component_inventory",
          "Read-only MC001 mapping requires actual Hu component candidates",
          { path: `${MAPPER_ROOT}.huMultiComponentInventory.componentCandidates` }
        )
      );
    }

    if (!hasSourceProvenance(inventory.sourceTrace ?? inventory.provenance)) {
      issues.push(
        issue(
          "blocked",
          "blocked_missing_hu_inventory_source_provenance",
          "Read-only MC001 Hu inventory mapping requires source/provenance",
          { path: `${MAPPER_ROOT}.huMultiComponentInventory.sourceTrace` }
        )
      );
    }

    validateComponentCandidates(inventory, issues);
  }

  if (!hasRequiredArray(bztuDirectInputs)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_bztu_path",
        "Read-only MC001 mapping requires an explicit H1-compatible BZTU path",
        { path: `${MAPPER_ROOT}.bztuDirectInputs` }
      )
    );
  }

  if (!hasSourceProvenance(explicitMapping?.sourceTrace)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_source_provenance",
        "Read-only MC001 mapping requires explicit source/provenance metadata",
        { path: `${MAPPER_ROOT}.sourceTrace` }
      )
    );
  }

  if (!hasOrchestratorInputBasics(readinessInput)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_orchestrator_readiness_input",
        "Read-only MC001 mapping requires an explicit orchestrator-compatible readiness input pack",
        { path: `${MAPPER_ROOT}.readinessInput` }
      )
    );
  }

  validateNoForbiddenOutputs(explicitMapping, readinessInput, issues);

  return {
    issues,
    inventory,
    bztuDirectInputs,
    readinessInput,
    zones
  };
}

function genericMissingMappingIssues() {
  return [
    issue(
      "blocked",
      "blocked_missing_explicit_mc001_readiness_mapping",
      "Saved application data is not mapped unless snapshot.mc001Readiness is explicitly provided",
      { path: MAPPER_ROOT }
    ),
    issue(
      "blocked",
      "blocked_missing_ztu_zone_mapping",
      "Generic saved answers must not be inferred into ztu-zone readiness",
      { path: "answers" }
    ),
    issue(
      "blocked",
      "blocked_missing_hu_inventory_mapping",
      "Generic saved answers must not be inferred into Hu inventory readiness",
      { path: "answers" }
    ),
    issue(
      "blocked",
      "blocked_missing_u_value_path",
      "Generic saved envelope hints must not be inferred into source-backed U-value paths",
      { path: "profiles.envelope_profiles" }
    ),
    issue(
      "blocked",
      "blocked_missing_bztu_path",
      "Generic saved application data does not provide an H1-compatible BZTU path",
      { path: "mc001Readiness.bztuDirectInputs" }
    ),
    issue(
      "blocked",
      "blocked_missing_source_provenance",
      "Generic saved application data lacks MC001 source/provenance mapping",
      { path: "mc001Readiness.sourceTrace" }
    )
  ];
}

function resultFrom({
  snapshot,
  explicitMapping,
  issues,
  readinessInput = null,
  isMappableForHuInventoryReadiness = false,
  nextRequiredStep
}) {
  const diagnostics = Object.freeze(issues.map(diagnosticFromIssue));
  const blockers = Object.freeze(issues.map(blockerFromIssue));

  return Object.freeze({
    mapperId: MC001_READ_ONLY_SAVED_ANALYSIS_READINESS_MAPPER_ID,
    status: statusFromIssues(issues),
    isMappableForHuInventoryReadiness,
    readinessInput: isMappableForHuInventoryReadiness ? clonePlain(readinessInput) : null,
    diagnostics,
    blockers,
    sourceTrace: sourceTraceFrom(snapshot, explicitMapping, issues),
    readinessFlags: Object.freeze({
      isHuInventoryReady: false,
      isHuComponentReady: false,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      isMonthlyHeatingReady: false,
      isQhndReady: false,
      isLevel2AuditorReady: false,
      isCpeReady: false
    }),
    nextRequiredStep
  });
}

export function mapSavedAnalysisSnapshotToMc001ReadinessInput(snapshot, options = {}) {
  void options;

  if (!isObject(snapshot)) {
    const issues = [
      issue(
        "blocked",
        "blocked_missing_saved_analysis_snapshot",
        "A read-only saved-analysis snapshot object is required",
        { path: "snapshot" }
      )
    ];
    return resultFrom({
      snapshot: null,
      explicitMapping: null,
      issues,
      nextRequiredStep:
        "SUPPLY_READ_ONLY_SAVED_ANALYSIS_SNAPSHOT_WITH_EXPLICIT_MC001_READINESS_MAPPING"
    });
  }

  const explicitMapping = snapshot.mc001Readiness;
  if (!isObject(explicitMapping)) {
    const issues = genericMissingMappingIssues();
    return resultFrom({
      snapshot,
      explicitMapping: null,
      issues,
      nextRequiredStep:
        "ADD_EXPLICIT_SOURCE_BACKED_MC001_READINESS_MAPPING_TO_SNAPSHOT"
    });
  }

  const {
    issues,
    readinessInput
  } = detectExplicitMappingIssues(snapshot, explicitMapping);
  const isMappableForHuInventoryReadiness = issues.length === 0;

  return resultFrom({
    snapshot,
    explicitMapping,
    issues,
    readinessInput,
    isMappableForHuInventoryReadiness,
    nextRequiredStep: isMappableForHuInventoryReadiness
      ? "PASS_READINESS_INPUT_TO_EXISTING_MC001_ORCHESTRATOR_FOR_DIAGNOSTICS_ONLY"
      : "COMPLETE_EXPLICIT_MC001_READINESS_MAPPING_WITHOUT_INFERENCE_OR_FALLBACKS"
  });
}
