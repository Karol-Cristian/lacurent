CREATE TABLE IF NOT EXISTS building_platform_projects (
  project_id TEXT PRIMARY KEY,
  owner_user_id INTEGER NOT NULL,
  project_name TEXT NOT NULL,
  project_status TEXT NOT NULL,
  current_building_dna_version_id TEXT,
  current_analysis_version_id TEXT,
  current_report_version_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT,
  legacy_source_id TEXT,
  schema_version TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS building_platform_projects_owner_idx
ON building_platform_projects(owner_user_id, updated_at);

CREATE INDEX IF NOT EXISTS building_platform_projects_current_versions_idx
ON building_platform_projects(current_building_dna_version_id, current_analysis_version_id);

CREATE TABLE IF NOT EXISTS building_dna_versions (
  building_dna_version_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_building_dna_version_id TEXT,
  schema_version TEXT NOT NULL,
  complete_building_dna_json TEXT NOT NULL,
  source_json TEXT,
  assumptions_json TEXT,
  confirmations_json TEXT,
  unresolved_uncertainties_json TEXT,
  interventions_json TEXT,
  engineering_overrides_json TEXT,
  catalogue_versions_json TEXT,
  climate_profile_id TEXT,
  climate_profile_version TEXT,
  creation_reason TEXT NOT NULL,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  building_dna_fingerprint TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES building_platform_projects(project_id)
);

CREATE INDEX IF NOT EXISTS building_dna_versions_project_idx
ON building_dna_versions(project_id, created_at);

CREATE INDEX IF NOT EXISTS building_dna_versions_fingerprint_idx
ON building_dna_versions(building_dna_fingerprint);

CREATE INDEX IF NOT EXISTS building_dna_versions_climate_idx
ON building_dna_versions(climate_profile_id, climate_profile_version);

CREATE TABLE IF NOT EXISTS building_platform_analysis_versions (
  analysis_version_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  building_dna_version_id TEXT NOT NULL,
  parent_analysis_version_id TEXT,
  adapter_version TEXT NOT NULL,
  physics_engine_version TEXT NOT NULL,
  normative_registry_version TEXT NOT NULL,
  climate_profile_id TEXT,
  climate_profile_version TEXT,
  explicit_engine_input_json TEXT NOT NULL,
  complete_engine_output_json TEXT NOT NULL,
  monthly_qhnd_json TEXT,
  monthly_qcnd_json TEXT,
  annual_qhnd REAL,
  annual_qcnd REAL,
  supported_latent_outputs_json TEXT,
  diagnostics_json TEXT,
  calculation_status TEXT NOT NULL,
  calculation_fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  execution_metadata_json TEXT,
  failure_metadata_json TEXT,
  schema_version TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES building_platform_projects(project_id),
  FOREIGN KEY(building_dna_version_id) REFERENCES building_dna_versions(building_dna_version_id)
);

CREATE INDEX IF NOT EXISTS building_platform_analysis_versions_project_idx
ON building_platform_analysis_versions(project_id, created_at);

CREATE INDEX IF NOT EXISTS building_platform_analysis_versions_dna_idx
ON building_platform_analysis_versions(building_dna_version_id);

CREATE INDEX IF NOT EXISTS building_platform_analysis_versions_fingerprint_idx
ON building_platform_analysis_versions(calculation_fingerprint);

CREATE INDEX IF NOT EXISTS building_platform_analysis_versions_climate_idx
ON building_platform_analysis_versions(climate_profile_id, climate_profile_version);

CREATE TABLE IF NOT EXISTS building_platform_report_versions (
  technical_report_version_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  analysis_version_id TEXT NOT NULL,
  building_dna_version_id TEXT NOT NULL,
  report_schema_version TEXT NOT NULL,
  structured_report_model_json TEXT NOT NULL,
  traceability_model_json TEXT,
  calculation_fingerprint TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  report_status TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES building_platform_projects(project_id),
  FOREIGN KEY(analysis_version_id) REFERENCES building_platform_analysis_versions(analysis_version_id),
  FOREIGN KEY(building_dna_version_id) REFERENCES building_dna_versions(building_dna_version_id)
);

CREATE INDEX IF NOT EXISTS building_platform_report_versions_analysis_idx
ON building_platform_report_versions(analysis_version_id);

CREATE INDEX IF NOT EXISTS building_platform_report_versions_project_idx
ON building_platform_report_versions(project_id, generated_at);

CREATE TABLE IF NOT EXISTS building_platform_climate_profile_versions (
  climate_profile_id TEXT NOT NULL,
  climate_profile_version TEXT NOT NULL,
  profile_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_references_json TEXT,
  locality_metadata_json TEXT,
  monthly_records_json TEXT NOT NULL,
  provenance_json TEXT,
  confidence TEXT,
  verification_status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  profile_fingerprint TEXT NOT NULL,
  publication_status TEXT NOT NULL DEFAULT 'published',
  PRIMARY KEY(climate_profile_id, climate_profile_version)
);

CREATE INDEX IF NOT EXISTS building_platform_climate_profile_versions_fingerprint_idx
ON building_platform_climate_profile_versions(profile_fingerprint);

CREATE INDEX IF NOT EXISTS building_platform_climate_profile_versions_status_idx
ON building_platform_climate_profile_versions(source_type, verification_status, publication_status);

CREATE TABLE IF NOT EXISTS building_platform_scenarios (
  scenario_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scenario_name TEXT NOT NULL,
  base_building_dna_version_id TEXT NOT NULL,
  derived_building_dna_version_id TEXT,
  intervention_set_json TEXT,
  current_analysis_version_id TEXT,
  comparison_metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT,
  schema_version TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES building_platform_projects(project_id)
);

CREATE INDEX IF NOT EXISTS building_platform_scenarios_project_idx
ON building_platform_scenarios(project_id, updated_at);

CREATE TABLE IF NOT EXISTS building_platform_audit_events (
  event_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  building_dna_version_id TEXT,
  analysis_version_id TEXT,
  technical_report_version_id TEXT,
  actor_user_id INTEGER,
  action TEXT NOT NULL,
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES building_platform_projects(project_id)
);

CREATE INDEX IF NOT EXISTS building_platform_audit_events_project_idx
ON building_platform_audit_events(project_id, created_at);

CREATE INDEX IF NOT EXISTS building_platform_audit_events_action_idx
ON building_platform_audit_events(action, created_at);

CREATE TABLE IF NOT EXISTS building_platform_idempotency_keys (
  idempotency_key TEXT NOT NULL,
  owner_user_id INTEGER NOT NULL,
  request_fingerprint TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(idempotency_key, owner_user_id)
);

CREATE INDEX IF NOT EXISTS building_platform_idempotency_owner_idx
ON building_platform_idempotency_keys(owner_user_id, created_at);
