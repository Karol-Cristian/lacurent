CREATE TABLE IF NOT EXISTS household_profiles (
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

CREATE TABLE IF NOT EXISTS building_features (
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

CREATE TABLE IF NOT EXISTS envelope_profiles (
id INTEGER PRIMARY KEY AUTOINCREMENT,
house_id INTEGER,
wall_material TEXT,
wall_thickness REAL,
wall_insulation TEXT,
windows TEXT
);

CREATE TABLE IF NOT EXISTS green_mobility_profiles (
id INTEGER PRIMARY KEY AUTOINCREMENT,
house_id INTEGER,
solar_panels TEXT,
installed_power REAL,
electric_car TEXT
);

CREATE TABLE IF NOT EXISTS billing_documents (
id INTEGER PRIMARY KEY AUTOINCREMENT,
house_id INTEGER,
invoice_file_name TEXT
);

ALTER TABLE energy_profiles ADD COLUMN smart_thermostat TEXT;
