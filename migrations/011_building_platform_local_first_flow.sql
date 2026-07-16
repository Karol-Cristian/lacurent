CREATE TABLE IF NOT EXISTS building_platform_project_drafts (
  draft_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  owner_user_id INTEGER NOT NULL,
  base_building_dna_version_id TEXT,
  editable_building_dna_json TEXT NOT NULL,
  climate_profile_id TEXT,
  climate_profile_version TEXT,
  draft_fingerprint TEXT NOT NULL,
  concurrency_token TEXT NOT NULL,
  draft_status TEXT NOT NULL,
  last_calculation_fingerprint TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  UNIQUE(project_id, owner_user_id),
  FOREIGN KEY(project_id) REFERENCES building_platform_projects(project_id)
);

CREATE INDEX IF NOT EXISTS building_platform_project_drafts_owner_idx
ON building_platform_project_drafts(owner_user_id, updated_at);

CREATE INDEX IF NOT EXISTS building_platform_project_drafts_project_idx
ON building_platform_project_drafts(project_id, updated_at);

CREATE INDEX IF NOT EXISTS building_platform_project_drafts_expiry_idx
ON building_platform_project_drafts(expires_at);
