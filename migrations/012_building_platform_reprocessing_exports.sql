CREATE TABLE IF NOT EXISTS building_platform_reprocessing_jobs (
  reprocessing_job_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  owner_user_id INTEGER NOT NULL,
  source_analysis_version_id TEXT,
  source_building_dna_version_id TEXT,
  target_adapter_version TEXT,
  target_physics_engine_version TEXT,
  target_normative_registry_version TEXT,
  target_climate_profile_id TEXT,
  target_climate_profile_version TEXT,
  resulting_analysis_version_id TEXT,
  resulting_report_version_id TEXT,
  status TEXT NOT NULL,
  reason TEXT,
  dry_run_json TEXT,
  comparison_json TEXT,
  failure_diagnostic_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY(project_id) REFERENCES building_platform_projects(project_id)
);

CREATE INDEX IF NOT EXISTS building_platform_reprocessing_jobs_owner_idx
ON building_platform_reprocessing_jobs(owner_user_id, created_at);

CREATE INDEX IF NOT EXISTS building_platform_reprocessing_jobs_project_idx
ON building_platform_reprocessing_jobs(project_id, created_at);

CREATE INDEX IF NOT EXISTS building_platform_reprocessing_jobs_status_idx
ON building_platform_reprocessing_jobs(status, created_at);

CREATE TABLE IF NOT EXISTS building_platform_export_manifests (
  export_id TEXT PRIMARY KEY,
  created_by INTEGER,
  export_scope TEXT NOT NULL,
  export_kind TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  table_manifest_json TEXT NOT NULL,
  total_row_count INTEGER NOT NULL,
  manifest_checksum TEXT NOT NULL,
  restore_verification_status TEXT NOT NULL,
  restore_verification_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS building_platform_export_manifests_created_idx
ON building_platform_export_manifests(created_at);

CREATE INDEX IF NOT EXISTS building_platform_export_manifests_checksum_idx
ON building_platform_export_manifests(manifest_checksum);
