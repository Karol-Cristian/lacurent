CREATE TABLE IF NOT EXISTS service_providers (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
company_name TEXT,
provider_type TEXT,
service_area TEXT,
certifications TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS service_providers_user_idx
ON service_providers(user_id);

CREATE TABLE IF NOT EXISTS provider_offers (
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

CREATE INDEX IF NOT EXISTS provider_offers_house_idx
ON provider_offers(house_id, recommendation_id);
