import { stableFingerprint, stableNormalize } from "./buildingPlatformFingerprints.mjs";

export const BUILDING_PLATFORM_OPERATIONAL_POLICY_VERSION =
  "building_platform_operational_policy_p3e_b_v1";

export const BUILDING_PLATFORM_RETENTION_POLICY = Object.freeze({
  permanent: Object.freeze([
    "building_platform_projects",
    "building_dna_versions",
    "building_platform_analysis_versions",
    "building_platform_report_versions",
    "building_platform_climate_profile_versions",
    "building_platform_audit_events",
    "building_platform_export_manifests"
  ]),
  temporary: Object.freeze([
    "building_platform_project_drafts",
    "calculation_preview_logs",
    "failed_transient_requests",
    "browser_session_cache"
  ]),
  draftRetentionDays: 90,
  automaticPermanentCompaction: false,
  annualFullExportRetention: "permanent",
  monthlyExportRetentionMonths: 12
});

export const BUILDING_PLATFORM_EXPORT_SCHEMA_VERSION =
  "building_platform_annual_export_manifest_v1";

export const BUILDING_PLATFORM_EXPORT_TABLES = Object.freeze([
  "building_platform_projects",
  "building_dna_versions",
  "building_platform_analysis_versions",
  "building_platform_report_versions",
  "building_platform_climate_profile_versions",
  "building_platform_project_drafts",
  "building_platform_scenarios",
  "building_platform_audit_events",
  "building_platform_idempotency_keys",
  "building_platform_reprocessing_jobs",
  "building_platform_export_manifests"
]);

function rowFingerprint(row) {
  return stableFingerprint(stableNormalize(row), "row");
}

export function createBuildingPlatformExportManifest({
  exportId,
  createdAt,
  createdBy = null,
  exportKind = "annual_full_export",
  tables = {}
} = {}) {
  const tableManifest = BUILDING_PLATFORM_EXPORT_TABLES.map((tableName) => {
    const rows = Array.isArray(tables[tableName]) ? tables[tableName] : [];
    return {
      tableName,
      rowCount: rows.length,
      tableChecksum: stableFingerprint({
        tableName,
        rows: rows.map(rowFingerprint).sort()
      }, "table")
    };
  });
  const totalRowCount = tableManifest.reduce((sum, table) => sum + table.rowCount, 0);
  const manifest = {
    exportId: exportId ?? stableFingerprint({ createdAt, tableManifest }, "export"),
    schemaVersion: BUILDING_PLATFORM_EXPORT_SCHEMA_VERSION,
    operationalPolicyVersion: BUILDING_PLATFORM_OPERATIONAL_POLICY_VERSION,
    createdBy,
    createdAt,
    exportScope: "building_platform_versioned_backend",
    exportKind,
    tableManifest,
    totalRowCount,
    manifestChecksum: stableFingerprint({
      schemaVersion: BUILDING_PLATFORM_EXPORT_SCHEMA_VERSION,
      exportKind,
      tableManifest,
      totalRowCount
    }, "manifest"),
    privacy: {
      containsUserProjectData: true,
      publicUrlAllowed: false,
      administratorOnly: true
    }
  };
  return manifest;
}

export function verifyBuildingPlatformExportRestore(manifest, restoredTables = {}) {
  const restored = createBuildingPlatformExportManifest({
    exportId: manifest?.exportId,
    createdAt: manifest?.createdAt,
    createdBy: manifest?.createdBy,
    exportKind: manifest?.exportKind,
    tables: restoredTables
  });
  const tableMismatches = [];
  const expectedByTable = new Map((manifest?.tableManifest ?? []).map((table) => [table.tableName, table]));
  for (const actual of restored.tableManifest) {
    const expected = expectedByTable.get(actual.tableName);
    if (!expected) continue;
    if (
      expected.rowCount !== actual.rowCount ||
      expected.tableChecksum !== actual.tableChecksum
    ) {
      tableMismatches.push({
        tableName: actual.tableName,
        expectedRowCount: expected.rowCount,
        actualRowCount: actual.rowCount,
        expectedTableChecksum: expected.tableChecksum,
        actualTableChecksum: actual.tableChecksum
      });
    }
  }
  return {
    ok: tableMismatches.length === 0 &&
      manifest?.manifestChecksum === restored.manifestChecksum,
    schemaVersion: BUILDING_PLATFORM_EXPORT_SCHEMA_VERSION,
    expectedManifestChecksum: manifest?.manifestChecksum ?? null,
    restoredManifestChecksum: restored.manifestChecksum,
    tableMismatches
  };
}

export function summarizeBuildingPlatformDatabaseGrowth(tables = {}) {
  const payloadSizes = (rows) => rows.map((row) => JSON.stringify(stableNormalize(row)).length);
  function average(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }
  return {
    schemaVersion: "building_platform_database_growth_metrics_v1",
    projectCount: tables.building_platform_projects?.length ?? 0,
    permanentVersionCount: tables.building_dna_versions?.length ?? 0,
    analysisVersionCount: tables.building_platform_analysis_versions?.length ?? 0,
    reportVersionCount: tables.building_platform_report_versions?.length ?? 0,
    activeDraftCount: (tables.building_platform_project_drafts ?? [])
      .filter((draft) => draft.draft_status === "active").length,
    averageBuildingDnaPayloadBytes: average(payloadSizes(tables.building_dna_versions ?? [])),
    averageAnalysisPayloadBytes: average(payloadSizes(tables.building_platform_analysis_versions ?? [])),
    averageReportPayloadBytes: average(payloadSizes(tables.building_platform_report_versions ?? [])),
    exportManifestCount: tables.building_platform_export_manifests?.length ?? 0,
    reprocessingJobCount: tables.building_platform_reprocessing_jobs?.length ?? 0
  };
}
