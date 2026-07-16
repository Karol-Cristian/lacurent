CREATE TABLE users (

id INTEGER PRIMARY KEY AUTOINCREMENT,

email TEXT,

name TEXT,

password_hash TEXT,

role TEXT DEFAULT 'residential',

account_type TEXT DEFAULT 'registered',

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

);

CREATE UNIQUE INDEX users_email_unique ON users(email);

CREATE TABLE user_sessions (

id INTEGER PRIMARY KEY AUTOINCREMENT,

user_id INTEGER,

token_hash TEXT,

expires_at DATETIME,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

);

CREATE INDEX user_sessions_token_hash_idx ON user_sessions(token_hash);

CREATE TABLE password_reset_tokens (

id INTEGER PRIMARY KEY AUTOINCREMENT,

user_id INTEGER,

token_hash TEXT,

expires_at DATETIME,

used_at DATETIME,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

);

CREATE INDEX password_reset_tokens_token_hash_idx ON password_reset_tokens(token_hash);

CREATE TABLE houses (

id INTEGER PRIMARY KEY AUTOINCREMENT,

user_id INTEGER,

house_type TEXT,

surface REAL,

rooms INTEGER,

year INTEGER,

city TEXT

,
display_name TEXT
,
active INTEGER DEFAULT 1
,
archived_at DATETIME
,
analysis_purpose TEXT

);

CREATE TABLE household_profiles (

id INTEGER PRIMARY KEY AUTOINCREMENT,

house_id INTEGER,

consumer_type TEXT,

people_count INTEGER,

children_count INTEGER,

senior_count INTEGER,

work_from_home TEXT,

work_from_home_days INTEGER,

occupancy_pattern TEXT,

frequent_travel TEXT

);

CREATE TABLE building_features (

id INTEGER PRIMARY KEY AUTOINCREMENT,

house_id INTEGER,

built_surface REAL,

floors INTEGER,

bathrooms INTEGER,

ceiling_height REAL,

basement TEXT,

attic TEXT,

mansard TEXT,

garage TEXT

);

CREATE TABLE envelope_profiles (

id INTEGER PRIMARY KEY AUTOINCREMENT,

house_id INTEGER,

wall_material TEXT,

wall_thickness REAL,

wall_insulation TEXT,

windows TEXT

);

CREATE TABLE energy_profiles (

id INTEGER PRIMARY KEY AUTOINCREMENT,

house_id INTEGER,

heating TEXT,

temperature_day REAL,

temperature_night REAL,

smart_thermostat TEXT,

provider TEXT,

monthly_bill REAL,

monthly_kwh REAL

);

CREATE TABLE billing_documents (

id INTEGER PRIMARY KEY AUTOINCREMENT,

house_id INTEGER,

invoice_file_name TEXT

);

CREATE TABLE appliances (

id INTEGER PRIMARY KEY AUTOINCREMENT,

house_id INTEGER,

fridge_class TEXT,

washer_class TEXT,

dryer INTEGER,

dishwasher INTEGER

);

CREATE TABLE green_mobility_profiles (

id INTEGER PRIMARY KEY AUTOINCREMENT,

house_id INTEGER,

solar_panels TEXT,

installed_power REAL,

electric_car TEXT

);

CREATE TABLE recommendations (

id INTEGER PRIMARY KEY AUTOINCREMENT,

house_id INTEGER,

title TEXT,

estimated_savings REAL,

roi REAL

);

CREATE TABLE recommendation_actions (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
house_id INTEGER,
recommendation_id TEXT,
status TEXT DEFAULT 'implemented',
notes TEXT,
implemented_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX recommendation_actions_user_house_idx
ON recommendation_actions(user_id, house_id);

CREATE TABLE savings_events (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
house_id INTEGER,
event_type TEXT,
amount_ron REAL,
source TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX savings_events_user_house_idx
ON savings_events(user_id, house_id);

CREATE TABLE house_monthly_bills (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
house_id INTEGER,
billing_month TEXT,
electricity_cost_ron REAL DEFAULT 0,
gas_cost_ron REAL DEFAULT 0,
wood_cost_ron REAL DEFAULT 0,
pellets_cost_ron REAL DEFAULT 0,
other_cost_ron REAL DEFAULT 0,
reading_type TEXT DEFAULT 'actual',
is_regularization INTEGER DEFAULT 0,
notes TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX house_monthly_bills_user_house_idx
ON house_monthly_bills(user_id, house_id, billing_month);

CREATE TABLE house_change_log (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
house_id INTEGER,
change_type TEXT,
summary TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX house_change_log_user_house_idx
ON house_change_log(user_id, house_id);

CREATE TABLE service_providers (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
company_name TEXT,
provider_type TEXT,
service_area TEXT,
certifications TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX service_providers_user_idx
ON service_providers(user_id);

CREATE TABLE provider_offers (
id INTEGER PRIMARY KEY AUTOINCREMENT,
provider_id INTEGER,
house_id INTEGER,
recommendation_id TEXT,
offer_amount_ron REAL,
estimated_duration_days INTEGER,
message TEXT,
status TEXT DEFAULT 'submitted',
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX provider_offers_house_idx
ON provider_offers(house_id, recommendation_id);

CREATE TABLE organizations (
id INTEGER PRIMARY KEY AUTOINCREMENT,
owner_user_id INTEGER,
name TEXT,
organization_type TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sites (
id INTEGER PRIMARY KEY AUTOINCREMENT,
organization_id INTEGER,
user_id INTEGER,
name TEXT,
city TEXT,
address TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE buildings (
id INTEGER PRIMARY KEY AUTOINCREMENT,
site_id INTEGER,
house_id INTEGER,
building_type TEXT,
area REAL,
construction_year INTEGER,
heating_type TEXT,
climate_region TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analyses (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
organization_id INTEGER,
site_id INTEGER,
building_id INTEGER,
house_id INTEGER,
analysis_type TEXT,
status TEXT DEFAULT 'completed',
completed_at DATETIME,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analysis_answers (
id INTEGER PRIMARY KEY AUTOINCREMENT,
analysis_id INTEGER,
question_key TEXT,
answer_value TEXT,
answer_group TEXT
);

CREATE TABLE scores (
id INTEGER PRIMARY KEY AUTOINCREMENT,
analysis_id INTEGER,
overall_score REAL,
building_efficiency REAL,
consumption_efficiency REAL,
behavior REAL,
equipment REAL,
green_energy REAL,
smart_optimization REAL,
estimated_energy_class TEXT,
disclaimer TEXT,
calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE benchmark_groups (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_type TEXT,
building_type TEXT,
area_min REAL,
area_max REAL,
occupants_min INTEGER,
occupants_max INTEGER,
climate_region TEXT,
heating_type TEXT,
construction_period TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE benchmark_results (
id INTEGER PRIMARY KEY AUTOINCREMENT,
analysis_id INTEGER,
benchmark_group_id INTEGER,
percentile REAL,
cluster_average REAL,
score_comparison REAL,
calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reports (
id INTEGER PRIMARY KEY AUTOINCREMENT,
analysis_id INTEGER,
report_type TEXT,
status TEXT DEFAULT 'planned',
file_url TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE report_snapshots (
id INTEGER PRIMARY KEY AUTOINCREMENT,
home_id INTEGER,
analysis_id INTEGER,
generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
energy_score REAL,
estimated_energy_class TEXT,
main_conclusion TEXT,
estimated_consumption_kwh_m2_year REAL,
estimated_annual_cost_ron REAL,
estimated_co2_kg_m2_year REAL,
confidence_level TEXT,
top_problems_json TEXT,
static_recommendations_json TEXT,
technical_details_json TEXT
);

CREATE INDEX report_snapshots_home_idx
ON report_snapshots(home_id, generated_at);

CREATE TABLE algorithm_insights (
id INTEGER PRIMARY KEY AUTOINCREMENT,
home_id INTEGER,
analysis_id INTEGER,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
insight_type TEXT,
title TEXT,
priority TEXT,
estimated_score_impact REAL,
estimated_savings_ron_year_min REAL,
estimated_savings_ron_year_max REAL,
estimated_cost_ron_min REAL,
estimated_cost_ron_max REAL,
estimated_payback_years_min REAL,
estimated_payback_years_max REAL,
confidence_percent REAL,
based_on_json TEXT,
explanation TEXT,
next_action_label TEXT
);

CREATE INDEX algorithm_insights_home_idx
ON algorithm_insights(home_id, updated_at);

CREATE TABLE auditors (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
certification TEXT,
location TEXT,
specialties TEXT,
contact_email TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auditor_clients (
id INTEGER PRIMARY KEY AUTOINCREMENT,
auditor_id INTEGER,
client_user_id INTEGER,
organization_id INTEGER,
status TEXT DEFAULT 'lead',
notes TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE building_platform_projects (
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

CREATE INDEX building_platform_projects_owner_idx
ON building_platform_projects(owner_user_id, updated_at);

CREATE INDEX building_platform_projects_current_versions_idx
ON building_platform_projects(current_building_dna_version_id, current_analysis_version_id);

CREATE TABLE building_platform_project_drafts (
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
UNIQUE(project_id, owner_user_id)
);

CREATE INDEX building_platform_project_drafts_owner_idx
ON building_platform_project_drafts(owner_user_id, updated_at);

CREATE INDEX building_platform_project_drafts_project_idx
ON building_platform_project_drafts(project_id, updated_at);

CREATE INDEX building_platform_project_drafts_expiry_idx
ON building_platform_project_drafts(expires_at);

CREATE TABLE building_dna_versions (
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
building_dna_fingerprint TEXT NOT NULL
);

CREATE INDEX building_dna_versions_project_idx
ON building_dna_versions(project_id, created_at);

CREATE INDEX building_dna_versions_fingerprint_idx
ON building_dna_versions(building_dna_fingerprint);

CREATE INDEX building_dna_versions_climate_idx
ON building_dna_versions(climate_profile_id, climate_profile_version);

CREATE TABLE building_platform_analysis_versions (
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
schema_version TEXT NOT NULL
);

CREATE INDEX building_platform_analysis_versions_project_idx
ON building_platform_analysis_versions(project_id, created_at);

CREATE INDEX building_platform_analysis_versions_dna_idx
ON building_platform_analysis_versions(building_dna_version_id);

CREATE INDEX building_platform_analysis_versions_fingerprint_idx
ON building_platform_analysis_versions(calculation_fingerprint);

CREATE INDEX building_platform_analysis_versions_climate_idx
ON building_platform_analysis_versions(climate_profile_id, climate_profile_version);

CREATE TABLE building_platform_report_versions (
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
schema_version TEXT NOT NULL
);

CREATE INDEX building_platform_report_versions_analysis_idx
ON building_platform_report_versions(analysis_version_id);

CREATE INDEX building_platform_report_versions_project_idx
ON building_platform_report_versions(project_id, generated_at);

CREATE TABLE building_platform_climate_profile_versions (
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

CREATE INDEX building_platform_climate_profile_versions_fingerprint_idx
ON building_platform_climate_profile_versions(profile_fingerprint);

CREATE INDEX building_platform_climate_profile_versions_status_idx
ON building_platform_climate_profile_versions(source_type, verification_status, publication_status);

CREATE TABLE building_platform_scenarios (
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
schema_version TEXT NOT NULL
);

CREATE INDEX building_platform_scenarios_project_idx
ON building_platform_scenarios(project_id, updated_at);

CREATE TABLE building_platform_audit_events (
event_id TEXT PRIMARY KEY,
project_id TEXT NOT NULL,
building_dna_version_id TEXT,
analysis_version_id TEXT,
technical_report_version_id TEXT,
actor_user_id INTEGER,
action TEXT NOT NULL,
reason TEXT,
metadata_json TEXT,
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX building_platform_audit_events_project_idx
ON building_platform_audit_events(project_id, created_at);

CREATE INDEX building_platform_audit_events_action_idx
ON building_platform_audit_events(action, created_at);

CREATE TABLE building_platform_idempotency_keys (
idempotency_key TEXT NOT NULL,
owner_user_id INTEGER NOT NULL,
request_fingerprint TEXT NOT NULL,
response_json TEXT NOT NULL,
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY(idempotency_key, owner_user_id)
);

CREATE INDEX building_platform_idempotency_owner_idx
ON building_platform_idempotency_keys(owner_user_id, created_at);
