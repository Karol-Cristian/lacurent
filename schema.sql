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
