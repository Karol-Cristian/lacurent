export const MC001_READ_ONLY_DIAGNOSTIC_TAXONOMY_SCHEMA_VERSION =
  "mc001-db7-read-only-diagnostic-taxonomy-v1";

export const MC001_READ_ONLY_DIAGNOSTIC_TAXONOMY_SOURCE_SCHEMA_VERSION =
  "mc001-db4-read-only-dry-run-diagnostic-contract-v1";

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

const SAFE_PRIVACY_WARNING_CODES = Object.freeze([
  "source_context_sanitized",
  "source_identifiers_sanitized",
  "source_trace_sanitized",
  "diagnostic_content_sanitized"
]);

const SAFE_STATUSES = Object.freeze([
  "invalid_dry_run_input",
  "not_mappable",
  "blocked",
  "hu_inventory_ready",
  "diagnostics_only"
]);

const SAFE_CATEGORIES = Object.freeze([
  "invalid_diagnostic_input",
  "not_mappable_saved_analysis",
  "missing_hu_component_inventory",
  "missing_source_provenance",
  "ambiguous_component_mapping",
  "unexpected_component",
  "readiness_blocked",
  "privacy_sanitized",
  "unknown_diagnostic",
  "diagnostics_only"
]);

const SAFE_SEVERITIES = Object.freeze(["info", "warning", "blocking"]);

const SAFE_ACTION_CODES = Object.freeze([
  "provide_mc001_readiness_mapping",
  "complete_hu_component_inventory",
  "provide_source_provenance",
  "resolve_component_ambiguity",
  "remove_unexpected_component",
  "review_privacy_sanitized_fields",
  "review_unknown_diagnostic",
  "no_action_required"
]);

const DIAGNOSTIC_CODE_TAXONOMY = Object.freeze({
  blocked_missing_hu_component: Object.freeze({
    category: "missing_hu_component_inventory",
    severity: "blocking",
    actionCode: "complete_hu_component_inventory"
  }),
  blocked_missing_expected_hu_component: Object.freeze({
    category: "missing_hu_component_inventory",
    severity: "blocking",
    actionCode: "complete_hu_component_inventory"
  }),
  blocked_missing_hu_inventory_mapping: Object.freeze({
    category: "missing_hu_component_inventory",
    severity: "blocking",
    actionCode: "complete_hu_component_inventory"
  }),
  blocked_unexpected_hu_component: Object.freeze({
    category: "unexpected_component",
    severity: "blocking",
    actionCode: "remove_unexpected_component"
  }),
  blocked_ambiguous_hu_component_inventory: Object.freeze({
    category: "ambiguous_component_mapping",
    severity: "blocking",
    actionCode: "resolve_component_ambiguity"
  }),
  blocked_missing_explicit_mc001_readiness_mapping: Object.freeze({
    category: "not_mappable_saved_analysis",
    severity: "blocking",
    actionCode: "provide_mc001_readiness_mapping"
  }),
  blocked_missing_ztu_zone_mapping: Object.freeze({
    category: "not_mappable_saved_analysis",
    severity: "blocking",
    actionCode: "provide_mc001_readiness_mapping"
  }),
  blocked_not_mappable_for_hu_inventory_readiness: Object.freeze({
    category: "not_mappable_saved_analysis",
    severity: "blocking",
    actionCode: "provide_mc001_readiness_mapping"
  }),
  blocked_missing_u_value_path: Object.freeze({
    category: "missing_source_provenance",
    severity: "blocking",
    actionCode: "provide_source_provenance"
  }),
  blocked_missing_bztu_path: Object.freeze({
    category: "missing_source_provenance",
    severity: "blocking",
    actionCode: "provide_source_provenance"
  }),
  blocked_invalid_dry_run_input: Object.freeze({
    category: "invalid_diagnostic_input",
    severity: "blocking",
    actionCode: "provide_mc001_readiness_mapping"
  }),
  invalid_dry_run_input: Object.freeze({
    category: "invalid_diagnostic_input",
    severity: "blocking",
    actionCode: "provide_mc001_readiness_mapping"
  }),
  unknown_blocker: Object.freeze({
    category: "unknown_diagnostic",
    severity: "blocking",
    actionCode: "review_unknown_diagnostic"
  }),
  unknown_warning: Object.freeze({
    category: "unknown_diagnostic",
    severity: "warning",
    actionCode: "review_unknown_diagnostic"
  }),
  unknown_gap: Object.freeze({
    category: "unknown_diagnostic",
    severity: "warning",
    actionCode: "review_unknown_diagnostic"
  }),
  diagnostic_content_sanitized: Object.freeze({
    category: "privacy_sanitized",
    severity: "warning",
    actionCode: "review_privacy_sanitized_fields"
  }),
  source_context_sanitized: Object.freeze({
    category: "privacy_sanitized",
    severity: "warning",
    actionCode: "review_privacy_sanitized_fields"
  }),
  source_identifiers_sanitized: Object.freeze({
    category: "privacy_sanitized",
    severity: "warning",
    actionCode: "review_privacy_sanitized_fields"
  }),
  source_trace_sanitized: Object.freeze({
    category: "privacy_sanitized",
    severity: "warning",
    actionCode: "review_privacy_sanitized_fields"
  }),
  blocked: Object.freeze({
    category: "readiness_blocked",
    severity: "blocking",
    actionCode: "review_unknown_diagnostic"
  }),
  not_mappable: Object.freeze({
    category: "not_mappable_saved_analysis",
    severity: "blocking",
    actionCode: "provide_mc001_readiness_mapping"
  }),
  hu_component_inventory_readiness_only: Object.freeze({
    category: "diagnostics_only",
    severity: "info",
    actionCode: "no_action_required"
  }),
  hu_inventory_ready: Object.freeze({
    category: "diagnostics_only",
    severity: "info",
    actionCode: "no_action_required"
  }),
  diagnostics_only: Object.freeze({
    category: "diagnostics_only",
    severity: "info",
    actionCode: "no_action_required"
  })
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pushUnique(array, value) {
  if (!array.includes(value)) {
    array.push(value);
  }
}

function codeIsSafe(value) {
  return SAFE_DIAGNOSTIC_CODES.includes(value);
}

function firstSafeCode(entry) {
  if (typeof entry === "string" && codeIsSafe(entry)) {
    return entry;
  }

  if (!isPlainObject(entry)) {
    return null;
  }

  for (const field of ["code", "diagnosticCode", "status"]) {
    if (codeIsSafe(entry[field])) {
      return entry[field];
    }
  }

  return null;
}

function statusFromContract(diagnosticContract, privacyWarnings) {
  if (SAFE_STATUSES.includes(diagnosticContract?.status)) {
    return diagnosticContract.status;
  }

  if (diagnosticContract?.status !== undefined) {
    pushUnique(privacyWarnings, "diagnostic_content_sanitized");
  }

  return "blocked";
}

function fallbackCodeForSection(section) {
  if (section === "blockers") {
    return "unknown_blocker";
  }

  if (section === "warnings") {
    return "unknown_warning";
  }

  return "unknown_gap";
}

function addCategory(categoryMap, code, section, privacyWarnings) {
  const safeCode = codeIsSafe(code) ? code : fallbackCodeForSection(section);
  const mapping =
    DIAGNOSTIC_CODE_TAXONOMY[safeCode] ??
    DIAGNOSTIC_CODE_TAXONOMY[fallbackCodeForSection(section)];

  if (!SAFE_CATEGORIES.includes(mapping.category)) {
    pushUnique(privacyWarnings, "diagnostic_content_sanitized");
    return;
  }

  if (!SAFE_SEVERITIES.includes(mapping.severity)) {
    pushUnique(privacyWarnings, "diagnostic_content_sanitized");
    return;
  }

  if (!SAFE_ACTION_CODES.includes(mapping.actionCode)) {
    pushUnique(privacyWarnings, "diagnostic_content_sanitized");
    return;
  }

  const key = `${mapping.category}|${mapping.severity}|${mapping.actionCode}`;
  const existing =
    categoryMap.get(key) ??
    {
      category: mapping.category,
      severity: mapping.severity,
      actionCode: mapping.actionCode,
      diagnosticCodes: [],
      count: 0
    };

  pushUnique(existing.diagnosticCodes, safeCode);
  existing.count += 1;
  categoryMap.set(key, existing);
}

function addDiagnosticEntries(categoryMap, entries, section, privacyWarnings) {
  if (!Array.isArray(entries)) {
    return;
  }

  for (const entry of entries) {
    const code = firstSafeCode(entry);
    if (code) {
      addCategory(categoryMap, code, section, privacyWarnings);
      continue;
    }

    pushUnique(privacyWarnings, "diagnostic_content_sanitized");
    addCategory(categoryMap, fallbackCodeForSection(section), section, privacyWarnings);
  }
}

function addPrivacyWarnings(categoryMap, entries, privacyWarnings) {
  if (!Array.isArray(entries)) {
    return;
  }

  for (const entry of entries) {
    const code = firstSafeCode(entry);
    if (code && SAFE_PRIVACY_WARNING_CODES.includes(code)) {
      pushUnique(privacyWarnings, code);
      addCategory(categoryMap, code, "warnings", privacyWarnings);
      continue;
    }

    pushUnique(privacyWarnings, "diagnostic_content_sanitized");
    addCategory(
      categoryMap,
      "diagnostic_content_sanitized",
      "warnings",
      privacyWarnings
    );
  }
}

function sanitizeReadiness(diagnosticContract, status) {
  const readiness = diagnosticContract?.readiness;

  return Object.freeze({
    isHuInventoryReady:
      status === "hu_inventory_ready" && readiness?.isHuInventoryReady === true,
    isCompleteHuReady: false,
    isCompleteHtrReady: false,
    hasHuResult: false,
    hasHtrResult: false,
    downstreamReadiness: false
  });
}

function freezeCategories(categoryMap) {
  return Object.freeze(
    [...categoryMap.values()].map((entry) =>
      Object.freeze({
        category: entry.category,
        severity: entry.severity,
        actionCode: entry.actionCode,
        diagnosticCodes: Object.freeze([...entry.diagnosticCodes].sort()),
        count: entry.count
      })
    )
  );
}

function buildContract({
  status,
  readiness,
  categories,
  privacyWarnings
}) {
  const diagnosticCodeCount = categories.reduce(
    (count, entry) => count + entry.diagnosticCodes.length,
    0
  );

  return Object.freeze({
    schemaVersion: MC001_READ_ONLY_DIAGNOSTIC_TAXONOMY_SCHEMA_VERSION,
    isReadOnlyDiagnosticTaxonomy: true,
    sourceSchemaVersion: MC001_READ_ONLY_DIAGNOSTIC_TAXONOMY_SOURCE_SCHEMA_VERSION,
    status,
    readiness,
    taxonomy: Object.freeze({
      categories
    }),
    privacy: Object.freeze({
      sanitized: true,
      warnings: Object.freeze(
        privacyWarnings.map((code) =>
          Object.freeze({
            code
          })
        )
      )
    }),
    counts: Object.freeze({
      categories: categories.length,
      diagnosticCodes: diagnosticCodeCount,
      privacyWarnings: privacyWarnings.length
    }),
    contractScope: Object.freeze({
      taxonomyOnly: true,
      readOnly: true,
      noDbRead: true,
      noDbWrite: true,
      noApiOrWorkerCall: true,
      noProductOrReportOutput: true,
      noUserFacingCopy: true,
      noNumericalHuOrHtr: true
    })
  });
}

function invalidTaxonomy() {
  const categoryMap = new Map();
  const privacyWarnings = [];

  addCategory(
    categoryMap,
    "invalid_dry_run_input",
    "blockers",
    privacyWarnings
  );

  return buildContract({
    status: "invalid_diagnostic_input",
    readiness: sanitizeReadiness(null, "invalid_diagnostic_input"),
    categories: freezeCategories(categoryMap),
    privacyWarnings
  });
}

export function buildMc001ReadOnlyDiagnosticTaxonomy(
  diagnosticContract,
  options = {}
) {
  void options;

  if (
    !isPlainObject(diagnosticContract) ||
    diagnosticContract.isReadOnlyDiagnosticContract !== true
  ) {
    return invalidTaxonomy();
  }

  const privacyWarnings = [];
  const status = statusFromContract(diagnosticContract, privacyWarnings);
  const categoryMap = new Map();

  addDiagnosticEntries(
    categoryMap,
    diagnosticContract.diagnostics?.blockers,
    "blockers",
    privacyWarnings
  );
  addDiagnosticEntries(
    categoryMap,
    diagnosticContract.diagnostics?.warnings,
    "warnings",
    privacyWarnings
  );
  addDiagnosticEntries(
    categoryMap,
    diagnosticContract.diagnostics?.gaps,
    "gaps",
    privacyWarnings
  );
  addPrivacyWarnings(categoryMap, diagnosticContract.privacy?.warnings, privacyWarnings);

  if (status === "not_mappable" && categoryMap.size === 0) {
    addCategory(categoryMap, "not_mappable", "blockers", privacyWarnings);
  }

  if (status === "blocked" && categoryMap.size === 0) {
    addCategory(categoryMap, "blocked", "blockers", privacyWarnings);
  }

  if (
    (status === "hu_inventory_ready" || status === "diagnostics_only") &&
    categoryMap.size === 0
  ) {
    addCategory(categoryMap, status, "warnings", privacyWarnings);
  }

  return buildContract({
    status,
    readiness: sanitizeReadiness(diagnosticContract, status),
    categories: freezeCategories(categoryMap),
    privacyWarnings
  });
}
