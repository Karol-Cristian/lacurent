-- Home Lab account + project persistence contract for the current Editorial app.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'residential',
  account_type TEXT NOT NULL DEFAULT 'registered',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_token_hash_unique ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions(user_id, expires_at);

CREATE TABLE IF NOT EXISTS building_platform_projects (
  project_id TEXT PRIMARY KEY,
  owner_user_id INTEGER NOT NULL,
  project_name TEXT NOT NULL,
  project_status TEXT NOT NULL DEFAULT 'active',
  current_building_dna_version_id TEXT,
  current_analysis_version_id TEXT,
  current_report_version_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT,
  legacy_source_id TEXT,
  schema_version TEXT NOT NULL DEFAULT 'home_lab_editorial_project_v1'
);
CREATE INDEX IF NOT EXISTS building_platform_projects_owner_idx
ON building_platform_projects(owner_user_id, updated_at);

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
  draft_status TEXT NOT NULL DEFAULT 'saved',
  last_calculation_fingerprint TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  UNIQUE(project_id, owner_user_id),
  FOREIGN KEY(project_id) REFERENCES building_platform_projects(project_id)
);
CREATE INDEX IF NOT EXISTS building_platform_project_drafts_owner_idx
ON building_platform_project_drafts(owner_user_id, updated_at);
