import assert from "node:assert/strict";
import {
  BUILDING_PLATFORM_EXPORT_TABLES,
  BUILDING_PLATFORM_RETENTION_POLICY,
  createBuildingPlatformExportManifest,
  summarizeBuildingPlatformDatabaseGrowth,
  verifyBuildingPlatformExportRestore
} from "../index.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function sampleTables() {
  return {
    building_platform_projects: [{
      project_id: "bp-project-1",
      owner_user_id: 1,
      project_name: "Export test",
      current_building_dna_version_id: "dna-version-1"
    }],
    building_dna_versions: [{
      building_dna_version_id: "dna-version-1",
      project_id: "bp-project-1",
      complete_building_dna_json: "{\"schema\":\"building_dna_v1\"}",
      building_dna_fingerprint: "dna_1"
    }],
    building_platform_analysis_versions: [{
      analysis_version_id: "analysis-version-1",
      project_id: "bp-project-1",
      building_dna_version_id: "dna-version-1",
      annual_qhnd: 1000,
      annual_qcnd: 100,
      calculation_fingerprint: "analysis_1"
    }],
    building_platform_report_versions: [{
      technical_report_version_id: "report-version-1",
      project_id: "bp-project-1",
      analysis_version_id: "analysis-version-1",
      calculation_fingerprint: "analysis_1"
    }],
    building_platform_project_drafts: [{
      draft_id: "draft-1",
      project_id: "bp-project-1",
      owner_user_id: 1,
      draft_status: "active"
    }],
    building_platform_reprocessing_jobs: [{
      reprocessing_job_id: "reprocess-1",
      project_id: "bp-project-1",
      owner_user_id: 1,
      status: "completed"
    }],
    building_platform_export_manifests: []
  };
}

test("retention policy separates permanent engineering records from temporary drafts", () => {
  assert.equal(BUILDING_PLATFORM_RETENTION_POLICY.permanent.includes("building_dna_versions"), true);
  assert.equal(BUILDING_PLATFORM_RETENTION_POLICY.temporary.includes("building_platform_project_drafts"), true);
  assert.equal(BUILDING_PLATFORM_RETENTION_POLICY.automaticPermanentCompaction, false);
  assert.equal(BUILDING_PLATFORM_RETENTION_POLICY.draftRetentionDays, 90);
});

test("annual export manifest is deterministic and restore-verifiable", () => {
  const tables = sampleTables();
  const manifest = createBuildingPlatformExportManifest({
    exportId: "export-2026",
    createdAt: "2026-12-31T00:00:00.000Z",
    createdBy: 1,
    tables
  });
  const replay = createBuildingPlatformExportManifest({
    exportId: "export-2026",
    createdAt: "2026-12-31T00:00:00.000Z",
    createdBy: 1,
    tables
  });

  assert.equal(BUILDING_PLATFORM_EXPORT_TABLES.includes("building_platform_projects"), true);
  assert.equal(manifest.manifestChecksum, replay.manifestChecksum);
  assert.equal(manifest.totalRowCount, 6);
  assert.equal(manifest.privacy.publicUrlAllowed, false);

  const verified = verifyBuildingPlatformExportRestore(manifest, tables);
  assert.equal(verified.ok, true);
  assert.equal(verified.tableMismatches.length, 0);

  const tampered = verifyBuildingPlatformExportRestore(manifest, {
    ...tables,
    building_platform_projects: []
  });
  assert.equal(tampered.ok, false);
  assert.equal(tampered.tableMismatches[0].tableName, "building_platform_projects");
});

test("database growth summary exposes cost-safe operational counts without user payloads", () => {
  const metrics = summarizeBuildingPlatformDatabaseGrowth(sampleTables());

  assert.equal(metrics.projectCount, 1);
  assert.equal(metrics.permanentVersionCount, 1);
  assert.equal(metrics.analysisVersionCount, 1);
  assert.equal(metrics.reportVersionCount, 1);
  assert.equal(metrics.activeDraftCount, 1);
  assert.equal(metrics.reprocessingJobCount, 1);
  assert.equal(metrics.averageBuildingDnaPayloadBytes > 0, true);
});
