export const MC001_READ_ONLY_DRY_RUN_DIAGNOSTIC_CONTRACT_SCHEMA_VERSION =
  "mc001-db4-read-only-dry-run-diagnostic-contract-v1";

const SAFE_PRIVACY_WARNING_CODES = Object.freeze([
  "source_context_sanitized",
  "source_identifiers_sanitized",
  "source_trace_sanitized",
  "diagnostic_content_sanitized"
]);

const SAFE_DIAGNOSTIC_CODES = Object.freeze([
  "blocked_missing_hu_component",
  "blocked_unexpected_hu_component",
  "blocked_ambiguous_hu_component_inventory",
  "blocked_missing_expected_hu_component",
  "blocked_not_mappable_for_hu_inventory_readiness",
  "blocked_invalid_dry_run_input",
  "blocked_missing_explicit_mc001_readiness_mapping",
  "blocked_missing_ztu_zone_mapping",
  "blocked_missing_hu_inventory_mapping",
  "blocked_missing_u_value_path",
  "blocked_missing_bztu_path",
  "hu_component_inventory_readiness_only",
  "unknown_blocker",
  "unknown_warning",
  "unknown_gap",
  "diagnostic_content_sanitized",
  "source_context_sanitized",
  "source_identifiers_sanitized",
  "source_trace_sanitized",
  "invalid_dry_run_input",
  "not_mappable",
  "blocked",
  "hu_inventory_ready",
  "diagnostics_only"
]);

const SAFE_MAPPER_STATUSES = Object.freeze([
  "not_run",
  "blocked",
  "ready_for_hu_inventory_readiness_input",
  "invalid_dry_run_input",
  "unknown_mapper_status"
]);

const SAFE_ORCHESTRATOR_STATUSES = Object.freeze([
  "not_run",
  "ready",
  "blocked",
  "partial",
  "completed",
  "complete",
  "unknown_orchestrator_status"
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function codeIsAllowlisted(value) {
  return SAFE_DIAGNOSTIC_CODES.includes(value);
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function pushUnique(array, value) {
  if (!array.includes(value)) {
    array.push(value);
  }
}

function firstSafeCode(entry) {
  if (typeof entry === "string" && codeIsAllowlisted(entry)) {
    return entry;
  }

  if (!isPlainObject(entry)) {
    return null;
  }

  for (const field of ["code", "diagnosticCode", "status"]) {
    if (codeIsAllowlisted(entry[field])) {
      return entry[field];
    }
  }

  return null;
}

function sanitizeDiagnosticEntries(entries, fallbackCode, privacyWarnings) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.map((entry) => {
    const code = firstSafeCode(entry);
    if (code) {
      return Object.freeze({ code });
    }

    pushUnique(privacyWarnings, "diagnostic_content_sanitized");
    return Object.freeze({ code: fallbackCode });
  });
}

function sanitizePrivacyWarnings(entries, privacyWarnings) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const sanitized = [];
  for (const entry of entries) {
    const code = firstSafeCode(entry);
    if (code && SAFE_PRIVACY_WARNING_CODES.includes(code)) {
      pushUnique(sanitized, code);
      continue;
    }

    pushUnique(privacyWarnings, "diagnostic_content_sanitized");
    pushUnique(sanitized, "diagnostic_content_sanitized");
  }

  return sanitized.map((code) => Object.freeze({ code }));
}

function sanitizeStatus(value, allowedStatuses, fallback, privacyWarnings) {
  if (allowedStatuses.includes(value)) {
    return value;
  }

  if (value !== undefined && value !== null) {
    pushUnique(privacyWarnings, "diagnostic_content_sanitized");
  }

  return fallback;
}

function orchestratorRan(dryRunResult) {
  const status = dryRunResult?.orchestratorStatus;
  return SAFE_ORCHESTRATOR_STATUSES.includes(status) && status !== "not_run";
}

function hasBlockers(dryRunResult) {
  return Array.isArray(dryRunResult?.blockers) && dryRunResult.blockers.length > 0;
}

function statusFromDryRun(dryRunResult) {
  if (!isPlainObject(dryRunResult) || dryRunResult.isReadOnlyDryRun !== true) {
    return "invalid_dry_run_input";
  }

  if (dryRunResult.isMappableForHuInventoryReadiness !== true) {
    return dryRunResult.status === "blocked" ? "blocked" : "not_mappable";
  }

  if (hasBlockers(dryRunResult)) {
    return "blocked";
  }

  if (dryRunResult.readinessFlags?.isHuInventoryReady === true) {
    return "hu_inventory_ready";
  }

  return "diagnostics_only";
}

function invalidContract() {
  return Object.freeze({
    schemaVersion: MC001_READ_ONLY_DRY_RUN_DIAGNOSTIC_CONTRACT_SCHEMA_VERSION,
    isReadOnlyDiagnosticContract: true,
    status: "invalid_dry_run_input",
    pipeline: Object.freeze({
      mapper: Object.freeze({
        status: "invalid_dry_run_input",
        isMappableForHuInventoryReadiness: false
      }),
      orchestrator: Object.freeze({
        ran: false,
        status: "not_run"
      })
    }),
    readiness: Object.freeze({
      isHuInventoryReady: false,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      hasHuResult: false,
      hasHtrResult: false,
      downstreamReadiness: false
    }),
    diagnostics: Object.freeze({
      blockers: Object.freeze([
        Object.freeze({ code: "invalid_dry_run_input" })
      ]),
      warnings: Object.freeze([]),
      gaps: Object.freeze([
        Object.freeze({ code: "invalid_dry_run_input" })
      ])
    }),
    privacy: Object.freeze({
      warnings: Object.freeze([]),
      sanitized: true
    }),
    counts: Object.freeze({
      blockers: 1,
      warnings: 0,
      gaps: 1
    }),
    contractScope: Object.freeze({
      diagnosticsOnly: true,
      noDbRead: true,
      noDbWrite: true,
      noApiOrWorkerCall: true,
      noProductOrReportOutput: true,
      noNumericalHuOrHtr: true
    })
  });
}

export function buildMc001ReadOnlyDryRunDiagnosticContract(
  dryRunResult,
  options = {}
) {
  void options;

  if (!isPlainObject(dryRunResult) || dryRunResult.isReadOnlyDryRun !== true) {
    return invalidContract();
  }

  const privacyWarningCodes = [];
  const mapperStatus = sanitizeStatus(
    dryRunResult.mapperStatus,
    SAFE_MAPPER_STATUSES,
    "unknown_mapper_status",
    privacyWarningCodes
  );
  const orchestratorStatus = sanitizeStatus(
    dryRunResult.orchestratorStatus,
    SAFE_ORCHESTRATOR_STATUSES,
    "not_run",
    privacyWarningCodes
  );

  const blockers = sanitizeDiagnosticEntries(
    dryRunResult.blockers,
    "unknown_blocker",
    privacyWarningCodes
  );
  const warnings = sanitizePrivacyWarnings(
    dryRunResult.privacyWarnings,
    privacyWarningCodes
  );
  const gaps = sanitizeDiagnosticEntries(
    dryRunResult.diagnostics,
    "unknown_gap",
    privacyWarningCodes
  );

  for (const code of privacyWarningCodes) {
    if (SAFE_PRIVACY_WARNING_CODES.includes(code)) {
      pushUnique(
        warnings,
        Object.freeze({
          code
        })
      );
    }
  }

  const status = statusFromDryRun(dryRunResult);
  const readinessFlags = dryRunResult.readinessFlags ?? {};

  return Object.freeze({
    schemaVersion: MC001_READ_ONLY_DRY_RUN_DIAGNOSTIC_CONTRACT_SCHEMA_VERSION,
    isReadOnlyDiagnosticContract: true,
    status,
    pipeline: Object.freeze({
      mapper: Object.freeze({
        status: mapperStatus,
        isMappableForHuInventoryReadiness:
          dryRunResult.isMappableForHuInventoryReadiness === true
      }),
      orchestrator: Object.freeze({
        ran: orchestratorRan(dryRunResult),
        status: orchestratorStatus
      })
    }),
    readiness: Object.freeze({
      isHuInventoryReady:
        status === "hu_inventory_ready" &&
        readinessFlags.isHuInventoryReady === true,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      hasHuResult: false,
      hasHtrResult: false,
      downstreamReadiness: false
    }),
    diagnostics: Object.freeze({
      blockers: Object.freeze(blockers),
      warnings: Object.freeze(warnings),
      gaps: Object.freeze(gaps)
    }),
    privacy: Object.freeze({
      warnings: Object.freeze(warnings.map((entry) => clonePlain(entry))),
      sanitized: true
    }),
    counts: Object.freeze({
      blockers: blockers.length,
      warnings: warnings.length,
      gaps: gaps.length
    }),
    contractScope: Object.freeze({
      diagnosticsOnly: true,
      noDbRead: true,
      noDbWrite: true,
      noApiOrWorkerCall: true,
      noProductOrReportOutput: true,
      noNumericalHuOrHtr: true
    })
  });
}
