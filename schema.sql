CREATE TABLE users (

id INTEGER PRIMARY KEY AUTOINCREMENT,

email TEXT,

name TEXT,

password_hash TEXT,

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
