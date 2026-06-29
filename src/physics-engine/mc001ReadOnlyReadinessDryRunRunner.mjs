import { createMc001AuditorCoreReadinessOrchestrator } from "./mc001AuditorCoreReadinessOrchestrator.mjs";
import {
  mapSavedAnalysisSnapshotToMc001ReadinessInput,
  MC001_READ_ONLY_SAVED_ANALYSIS_READINESS_MAPPER_ID
} from "./mc001ReadOnlySavedAnalysisReadinessMapper.mjs";

export const MC001_READ_ONLY_READINESS_DRY_RUN_RUNNER_ID =
  "MC001_READ_ONLY_READINESS_DRY_RUN_RUNNER_PHASE_DB3";

const SAFE_SOURCE_CONTEXT_FIELDS = Object.freeze([
  "analysisId",
  "buildingId",
  "houseId",
  "snapshotId",
  "sourceType",
  "sourceTable",
  "sourceField",
  "sourceRecordId",
  "recordId",
  "traceId",
  "componentId",
  "inventoryComponentId",
  "ztuZoneId",
  "sourceIdentifier",
  "timestamp",
  "snapshotTimestamp",
  "sourceTimestamp",
  "sourceIdentifiers"
]);

const SAFE_SOURCE_TRACE_SCALAR_FIELDS = Object.freeze([
  "sourceType",
  "analysisId",
  "buildingId",
  "snapshotId",
  "sourceTable",
  "sourceField",
  "sourceRecordId",
  "timestamp",
  "traceId",
  "componentId",
  "inventoryComponentId",
  "recordId",
  "ztuZoneId",
  "month"
]);

const SAFE_SOURCE_LOCATOR_FIELDS = Object.freeze([
  "document",
  "documentId",
  "section",
  "page",
  "figure",
  "table",
  "clause",
  "field",
  "path"
]);

const SAFE_SOURCE_TYPES = Object.freeze([
  "saved_analysis_snapshot",
  "explicit_mc001_readiness_mapping",
  "validation_fixture_import",
  "expert_override_with_source",
  "read_only_dry_run",
  "mc001_readiness_snapshot"
]);

const SAFE_SOURCE_TABLES = Object.freeze([
  "houses",
  "sites",
  "buildings",
  "analyses",
  "analysis_answers",
  "building_features",
  "envelope_profiles",
  "energy_profiles",
  "house_monthly_bills",
  "scores",
  "benchmark_results",
  "reports",
  "report_snapshots",
  "algorithm_insights",
  "mc001_readiness_snapshot"
]);

const SAFE_SOURCE_FIELDS = Object.freeze([
  "mc001Readiness",
  "conditionedZones",
  "ztuZones",
  "expectedHuComponents",
  "actualHuComponents",
  "uValuePath",
  "correctedUValuePath",
  "bztuPath",
  "sourceTrace",
  "sourceProvenance",
  "applicability",
  "methodologyStatus"
]);

const TECHNICAL_SOURCE_IDENTIFIER_PATTERNS = Object.freeze([
  /^(trace|component|hu-component|inventory-component|record|ztu|analysis|building|house|snapshot):[A-Za-z0-9_.:/-]{1,96}$/,
  /^table:[A-Za-z][A-Za-z0-9_]{0,63}:[A-Za-z0-9_.:/-]{1,96}$/,
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clonePlain(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

function diagnostic(level, code, message, extra = {}) {
  return {
    level,
    code,
    message,
    ...extra
  };
}

function blocker(status, reason, extra = {}) {
  return {
    itemType: "read_only_readiness_dry_run",
    status,
    value: null,
    diagnosticCode: status,
    reason,
    ...extra
  };
}

function noOrchestratorFlags(mapperResult) {
  return {
    isMappableForHuInventoryReadiness:
      mapperResult?.isMappableForHuInventoryReadiness === true,
    isBztuDirectInputReady: false,
    isHuComponentReady: false,
    isHuInventoryReady: false,
    isCompleteHuReady: false,
    isCompleteHtrReady: false,
    isHeatLossReady: false,
    isMonthlyHeatingReady: false,
    isQhndReady: false,
    isLevel2AuditorReady: false,
    isCpeReady: false,
    isProductionIntegrationReady: false
  };
}

function dryRunFlagsFrom(orchestratorResult, mapperResult) {
  return {
    isMappableForHuInventoryReadiness:
      mapperResult?.isMappableForHuInventoryReadiness === true,
    isBztuDirectInputReady:
      orchestratorResult?.readinessFlags?.isBztuDirectInputReady === true,
    isHuComponentReady:
      orchestratorResult?.readinessFlags?.isHuComponentReady === true,
    isHuInventoryReady:
      orchestratorResult?.readinessFlags?.isHuInventoryReady === true,
    isCompleteHuReady: false,
    isCompleteHtrReady: false,
    isHeatLossReady: false,
    isMonthlyHeatingReady: false,
    isQhndReady: false,
    isLevel2AuditorReady: false,
    isCpeReady: false,
    isProductionIntegrationReady: false
  };
}

function sourceIdentifierLooksSafe(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (trimmed !== value || trimmed.length === 0 || trimmed.length > 120) {
    return false;
  }

  if (/[\s@{}\[\]"'`<>]/.test(trimmed)) {
    return false;
  }

  if (/^\+?\d[\d(). -]{6,}$/.test(trimmed)) {
    return false;
  }

  return TECHNICAL_SOURCE_IDENTIFIER_PATTERNS.some((pattern) =>
    pattern.test(trimmed)
  );
}

function locatorValueLooksSafe(field, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (
    trimmed !== value ||
    trimmed.length === 0 ||
    trimmed.length > 120 ||
    /[@{}\[\]"'`<>]/.test(trimmed)
  ) {
    return false;
  }

  if (field === "field") {
    return /^[A-Za-z][A-Za-z0-9_.:/-]{0,80}$/.test(trimmed);
  }

  if (/^(Figure|Table|Section|Clause|Page)\s+[A-Za-z0-9_.:/-]{1,80}$/.test(trimmed)) {
    return true;
  }

  return !/\s/.test(trimmed) && /[0-9_.:/-]/.test(trimmed);
}

function diagnosticCodeLooksSafe(value) {
  return typeof value === "string" && /^[a-z0-9_:-]{1,120}$/.test(value);
}

function timestampLooksSafe(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  );
}

function sourceRecordIdLooksSafe(value) {
  return sourceIdentifierLooksSafe(value);
}

function monthLooksSafe(value) {
  return Number.isInteger(value) && value >= 1 && value <= 12;
}

function sanitizeSourceTraceScalarField(field, value, warnings, sanitized) {
  if (field === "sourceType" && SAFE_SOURCE_TYPES.includes(value)) {
    sanitized.sourceType = value;
    return;
  }

  if (field === "sourceTable" && SAFE_SOURCE_TABLES.includes(value)) {
    sanitized.sourceTable = value;
    return;
  }

  if (field === "sourceField" && SAFE_SOURCE_FIELDS.includes(value)) {
    sanitized.sourceField = value;
    return;
  }

  if (field === "sourceRecordId" && sourceRecordIdLooksSafe(value)) {
    sanitized.sourceRecordId = value;
    return;
  }

  if (field === "timestamp" && timestampLooksSafe(value)) {
    sanitized.timestamp = value;
    return;
  }

  if (field === "month" && monthLooksSafe(value)) {
    sanitized.month = value;
    return;
  }

  if (
    [
      "traceId",
      "componentId",
      "inventoryComponentId",
      "recordId",
      "ztuZoneId",
      "analysisId",
      "buildingId",
      "snapshotId"
    ].includes(field) &&
    sourceIdentifierLooksSafe(value)
  ) {
    sanitized[field] = value;
    return;
  }

  pushSourceTraceSanitizedWarning(warnings, {
    omittedFieldCount: 1,
    sourceType: sanitized.sourceType ?? null
  });
}

function pushSourceContextSanitizedWarning(warnings, extra = {}) {
  warnings.push(
    diagnostic(
      "warning",
      "source_context_sanitized",
      "Raw source context fields were omitted from the DB3 dry-run output",
      extra
    )
  );
}

function sanitizeSourceContextScalarField(field, value, warnings, sanitized) {
  if (field === "sourceType" && SAFE_SOURCE_TYPES.includes(value)) {
    sanitized.sourceType = value;
    return;
  }

  if (field === "sourceTable" && SAFE_SOURCE_TABLES.includes(value)) {
    sanitized.sourceTable = value;
    return;
  }

  if (field === "sourceField" && SAFE_SOURCE_FIELDS.includes(value)) {
    sanitized.sourceField = value;
    return;
  }

  if (
    ["timestamp", "snapshotTimestamp", "sourceTimestamp"].includes(field) &&
    timestampLooksSafe(value)
  ) {
    sanitized.timestamp = value;
    return;
  }

  if (
    [
      "analysisId",
      "buildingId",
      "houseId",
      "snapshotId",
      "sourceRecordId",
      "recordId",
      "traceId",
      "componentId",
      "inventoryComponentId",
      "ztuZoneId",
      "sourceIdentifier"
    ].includes(field) &&
    sourceIdentifierLooksSafe(value)
  ) {
    sanitized[field] = value;
    return;
  }

  pushSourceContextSanitizedWarning(warnings, {
    omittedFieldCount: 1
  });
}

function sanitizeSourceIdentifiers(sourceIdentifiers, warnings) {
  if (!Array.isArray(sourceIdentifiers)) {
    warnings.push(
      diagnostic(
        "warning",
        "source_identifiers_sanitized",
        "Source identifiers were omitted from the DB3 dry-run output because they were not a technical identifier list"
      )
    );
    return undefined;
  }

  const sanitized = sourceIdentifiers.filter(sourceIdentifierLooksSafe);
  const omittedIdentifierCount = sourceIdentifiers.length - sanitized.length;
  if (omittedIdentifierCount > 0) {
    warnings.push(
      diagnostic(
        "warning",
        "source_identifiers_sanitized",
        "Potentially sensitive source identifiers were omitted from the DB3 dry-run output",
        {
          omittedIdentifierCount
        }
      )
    );
  }

  return sanitized.length > 0 ? sanitized : undefined;
}

function pushSourceTraceSanitizedWarning(warnings, extra = {}) {
  warnings.push(
    diagnostic(
      "warning",
      "source_trace_sanitized",
      "Raw source trace fields were omitted from the DB3 dry-run output",
      extra
    )
  );
}

function sanitizeSourceLocator(sourceLocator, warnings) {
  if (!isObject(sourceLocator)) {
    if (sourceLocator !== undefined) {
      pushSourceTraceSanitizedWarning(warnings, {
        omittedFieldCount: 1
      });
    }
    return undefined;
  }

  const sanitized = {};
  let omittedFieldCount = 0;
  for (const [field, value] of Object.entries(sourceLocator)) {
    if (
      !SAFE_SOURCE_LOCATOR_FIELDS.includes(field) ||
      !locatorValueLooksSafe(field, value)
    ) {
      omittedFieldCount += 1;
      continue;
    }
    sanitized[field] = clonePlain(value);
  }

  if (omittedFieldCount > 0) {
    pushSourceTraceSanitizedWarning(warnings, {
      omittedFieldCount
    });
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeSourceRefs(sourceRefs, warnings) {
  if (!Array.isArray(sourceRefs)) {
    if (sourceRefs !== undefined) {
      pushSourceTraceSanitizedWarning(warnings, {
        omittedFieldCount: 1
      });
    }
    return undefined;
  }

  const sanitized = sourceRefs.filter(sourceIdentifierLooksSafe);
  const omittedFieldCount = sourceRefs.length - sanitized.length;
  if (omittedFieldCount > 0) {
    pushSourceTraceSanitizedWarning(warnings, {
      omittedFieldCount
    });
  }

  return sanitized.length > 0 ? sanitized : undefined;
}

function sanitizeDiagnosticCodes(diagnosticCodes, warnings) {
  if (!Array.isArray(diagnosticCodes)) {
    return [];
  }

  const sanitized = diagnosticCodes.filter(diagnosticCodeLooksSafe);
  const omittedFieldCount = diagnosticCodes.length - sanitized.length;
  if (omittedFieldCount > 0) {
    pushSourceTraceSanitizedWarning(warnings, {
      omittedFieldCount
    });
  }

  return sanitized;
}

function sanitizeSourceContext(sourceContext, warnings) {
  if (!isObject(sourceContext)) {
    return {};
  }

  const sanitized = {};
  for (const field of SAFE_SOURCE_CONTEXT_FIELDS) {
    if (!(field in sourceContext)) {
      continue;
    }
    if (field === "sourceIdentifiers") {
      sanitized.sourceIdentifiers = sanitizeSourceIdentifiers(
        sourceContext.sourceIdentifiers,
        warnings
      );
      continue;
    }
    sanitizeSourceContextScalarField(
      field,
      sourceContext[field],
      warnings,
      sanitized
    );
  }

  const omittedFields = Object.keys(sourceContext).filter(
    (field) => !SAFE_SOURCE_CONTEXT_FIELDS.includes(field)
  );
  if (omittedFields.length > 0) {
    pushSourceContextSanitizedWarning(warnings, {
      omittedFieldCount: omittedFields.length
    });
  }

  return compactObject(sanitized);
}

function sanitizeSourceTraceRecord(record, warnings) {
  if (!isObject(record)) {
    return null;
  }

  const sanitized = {};
  for (const field of SAFE_SOURCE_TRACE_SCALAR_FIELDS) {
    if (field in record) {
      sanitizeSourceTraceScalarField(field, record[field], warnings, sanitized);
    }
  }

  if ("sourceIdentifier" in record) {
    if (sourceIdentifierLooksSafe(record.sourceIdentifier)) {
      sanitized.sourceIdentifier = record.sourceIdentifier;
    } else {
      pushSourceTraceSanitizedWarning(warnings, {
        omittedFieldCount: 1,
        sourceType: sanitized.sourceType ?? null
      });
    }
  }

  if ("sourceRefs" in record) {
    sanitized.sourceRefs = sanitizeSourceRefs(record.sourceRefs, warnings);
  }

  if ("sourceLocator" in record) {
    sanitized.sourceLocator = sanitizeSourceLocator(record.sourceLocator, warnings);
  }

  if (isObject(record.sourceContext)) {
    const sanitizedContext = sanitizeSourceContext(record.sourceContext, warnings);
    Object.assign(sanitized, sanitizedContext);
  }

  const omittedFields = Object.keys(record).filter(
    (field) =>
      !SAFE_SOURCE_TRACE_SCALAR_FIELDS.includes(field) &&
      !["sourceIdentifier", "sourceRefs", "sourceLocator", "sourceContext"].includes(
        field
      )
  );
  if (omittedFields.length > 0) {
    pushSourceTraceSanitizedWarning(warnings, {
      omittedFieldCount: omittedFields.length,
      sourceType: sanitized.sourceType ?? null
    });
  }

  return compactObject(sanitized);
}

function sanitizeSourceTrace(sourceTrace, warnings) {
  if (!isObject(sourceTrace)) {
    return {
      records: Object.freeze([])
    };
  }

  const records = Array.isArray(sourceTrace.records)
    ? sourceTrace.records
        .map((record) => sanitizeSourceTraceRecord(record, warnings))
        .filter(Boolean)
    : [];

  return Object.freeze({
    records: Object.freeze(records),
    diagnosticCodes: Object.freeze(
      sanitizeDiagnosticCodes(sourceTrace.diagnosticCodes, warnings)
    )
  });
}

function sanitizeOrchestratorSourceTrace(orchestratorResult, warnings) {
  if (!isObject(orchestratorResult?.sourceTrace)) {
    return null;
  }

  const huInventoryTrace = sanitizeSourceTrace(
    orchestratorResult.sourceTrace.huMultiComponentInventory,
    warnings
  );
  const bztuTrace = sanitizeSourceTrace(orchestratorResult.sourceTrace.bztu, warnings);

  return Object.freeze({
    inputDocuments: Object.freeze(
      sanitizeSourceIdentifiers(
        orchestratorResult.sourceTrace.input?.documents ?? [],
        warnings
      ) ?? []
    ),
    bztu: bztuTrace,
    huMultiComponentInventory: huInventoryTrace
  });
}

function summarizeHuInventoryReadiness(orchestratorResult) {
  const readiness =
    orchestratorResult?.huMultiComponentInventoryReadiness
      ?.huMultiComponentInventoryReadiness ?? {};

  return {
    status: readiness.status ?? orchestratorResult?.huMultiComponentInventoryReadiness?.status ?? null,
    inventoryStatus:
      readiness.inventoryStatus ??
      orchestratorResult?.huMultiComponentInventoryReadiness?.inventoryStatus ??
      null,
    componentCount: readiness.componentCount ?? 0,
    readyComponentCount: readiness.readyComponentCount ?? 0,
    blockedComponentCount: readiness.blockedComponentCount ?? 0,
    isHuInventoryReady: readiness.isHuInventoryReady === true,
    isCompleteHuReady: false,
    isCompleteHtrReady: false
  };
}

function summarizeOrchestrator(orchestratorResult) {
  if (!orchestratorResult) {
    return null;
  }

  return {
    status: orchestratorResult.status,
    inputGateStatus: orchestratorResult.inputGateStatus,
    bztuDirectInputReadiness: {
      status: orchestratorResult.bztuDirectInputReadiness?.status ?? null,
      isBztuDirectInputReady:
        orchestratorResult.readinessFlags?.isBztuDirectInputReady === true
    },
    huMultiComponentInventoryReadiness:
      summarizeHuInventoryReadiness(orchestratorResult),
    downstreamReadiness: {
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      isHeatLossReady: false,
      isMonthlyHeatingReady: false,
      isQhndReady: false,
      isLevel2AuditorReady: false,
      isCpeReady: false
    }
  };
}

function downstreamReadinessWasReported(orchestratorResult) {
  const flags = orchestratorResult?.readinessFlags ?? {};
  return (
    flags.isCompleteHuReady === true ||
    flags.isCompleteHtrReady === true ||
    flags.isHeatLossReady === true ||
    flags.isMonthlyHeatingReady === true ||
    flags.isQhndReady === true ||
    flags.isLevel2AuditorReady === true ||
    flags.isCpeReady === true
  );
}

function combineDiagnostics(mapperResult, orchestratorResult, runnerDiagnostics) {
  return Object.freeze([
    ...(mapperResult?.diagnostics ?? []).map((entry) => ({
      ...entry,
      source: MC001_READ_ONLY_SAVED_ANALYSIS_READINESS_MAPPER_ID
    })),
    ...(orchestratorResult?.diagnostics ?? []).map((entry) => ({
      ...entry,
      source: "MC001_AUDITOR_CORE_READINESS_ORCHESTRATOR"
    })),
    ...runnerDiagnostics
  ]);
}

function combineBlockers(mapperResult, orchestratorResult, runnerBlockers) {
  return Object.freeze([
    ...(mapperResult?.blockers ?? []).map((entry) => ({
      ...entry,
      source: MC001_READ_ONLY_SAVED_ANALYSIS_READINESS_MAPPER_ID,
      value: null
    })),
    ...(orchestratorResult?.blockedItems ?? []).map((entry) => ({
      ...entry,
      source: "MC001_AUDITOR_CORE_READINESS_ORCHESTRATOR",
      value: null
    })),
    ...runnerBlockers
  ]);
}

function dryRunStatusFrom({ mapperResult, orchestratorResult, runnerBlockers }) {
  if (!mapperResult?.isMappableForHuInventoryReadiness) {
    return "blocked_mapping_not_mappable";
  }
  if (runnerBlockers.length > 0) {
    return "blocked_orchestrator_execution";
  }
  if ((orchestratorResult?.blockedItems ?? []).length > 0) {
    return "completed_with_blockers";
  }
  return "completed_readiness_diagnostics";
}

function dryRunStatusLevel(dryRunStatus) {
  if (dryRunStatus.startsWith("blocked")) {
    return "blocked";
  }
  return "completed";
}

function buildReport({
  mapperResult,
  orchestratorResult = null,
  runnerDiagnostics = [],
  runnerBlockers = [],
  privacyWarnings = []
}) {
  const dryRunStatus = dryRunStatusFrom({
    mapperResult,
    orchestratorResult,
    runnerBlockers
  });
  const status = dryRunStatusLevel(dryRunStatus);
  const diagnostics = combineDiagnostics(
    mapperResult,
    orchestratorResult,
    runnerDiagnostics
  );
  const blockers = combineBlockers(mapperResult, orchestratorResult, runnerBlockers);
  const sourceWarnings = [...privacyWarnings];

  const sourceTrace = Object.freeze({
    mapper: sanitizeSourceTrace(mapperResult?.sourceTrace, sourceWarnings),
    orchestrator: sanitizeOrchestratorSourceTrace(orchestratorResult, sourceWarnings)
  });

  return Object.freeze({
    runnerId: MC001_READ_ONLY_READINESS_DRY_RUN_RUNNER_ID,
    status,
    dryRunStatus,
    isReadOnlyDryRun: true,
    mapperStatus: mapperResult?.status ?? "not_run",
    isMappableForHuInventoryReadiness:
      mapperResult?.isMappableForHuInventoryReadiness === true,
    orchestratorStatus: orchestratorResult?.status ?? "not_run",
    orchestratorReadiness: summarizeOrchestrator(orchestratorResult),
    readinessFlags: orchestratorResult
      ? dryRunFlagsFrom(orchestratorResult, mapperResult)
      : noOrchestratorFlags(mapperResult),
    diagnostics: Object.freeze([...diagnostics, ...sourceWarnings]),
    blockers,
    sourceTrace,
    privacyWarnings: Object.freeze(sourceWarnings),
    reportScope: Object.freeze({
      diagnosticsOnly: true,
      noDbRead: true,
      noDbWrite: true,
      noApiOrWorkerCall: true,
      noProductOrReportOutput: true,
      noNumericalHuOrHtr: true
    }),
    nextRequiredStep:
      status === "completed"
        ? "REVIEW_READINESS_DIAGNOSTICS_WITHOUT_TREATING_DRY_RUN_AS_NUMERICAL_MC001_RESULT"
        : "COMPLETE_EXPLICIT_MC001_READINESS_MAPPING_WITHOUT_INFERENCE_OR_FALLBACKS"
  });
}

export function runMc001ReadOnlyReadinessDryRun(snapshot, options = {}) {
  const mapperResult = mapSavedAnalysisSnapshotToMc001ReadinessInput(
    snapshot,
    options.mapperOptions ?? options
  );

  if (mapperResult.isMappableForHuInventoryReadiness !== true) {
    return buildReport({
      mapperResult
    });
  }

  const runnerDiagnostics = [];
  const runnerBlockers = [];
  let orchestratorResult = null;

  try {
    orchestratorResult = createMc001AuditorCoreReadinessOrchestrator(
      mapperResult.readinessInput,
      {
        ...(options.orchestratorOptions ?? {}),
        registry: options.registry ?? options.orchestratorOptions?.registry
      }
    );
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : "Existing MC001 readiness orchestrator failed during DB3 dry run";
    runnerDiagnostics.push(
      diagnostic(
        "blocked",
        "blocked_orchestrator_execution_failed",
        "DB3 could not run the existing MC001 readiness orchestrator",
        {
          reason
        }
      )
    );
    runnerBlockers.push(
      blocker("blocked_orchestrator_execution_failed", reason, {
        path: "orchestrator"
      })
    );
  }

  if (downstreamReadinessWasReported(orchestratorResult)) {
    runnerDiagnostics.push(
      diagnostic(
        "blocked",
        "blocked_downstream_readiness_not_exposed",
        "DB3 dry-run output does not expose downstream Hu/Htr, heat-loss, monthly, Level 2, or CPE readiness"
      )
    );
    runnerBlockers.push(
      blocker(
        "blocked_downstream_readiness_not_exposed",
        "DB3 dry-run output is readiness diagnostics only and must not promote downstream readiness",
        {
          path: "readinessFlags"
        }
      )
    );
  }

  return buildReport({
    mapperResult,
    orchestratorResult,
    runnerDiagnostics,
    runnerBlockers
  });
}
