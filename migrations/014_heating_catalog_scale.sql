CREATE TABLE IF NOT EXISTS heating_product_certification (
    product_id TEXT PRIMARY KEY,
    manufacturer TEXT,
    model TEXT,
    certification_body TEXT,
    certificate_registration_number TEXT,
    heat_pump_type TEXT,
    refrigerant TEXT,
    quality_tier TEXT NOT NULL DEFAULT 'C',
    source_url TEXT,
    observed_on TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS heating_product_certification_quality_idx
ON heating_product_certification(quality_tier, certification_body);

CREATE TABLE IF NOT EXISTS heating_product_offers (
    offer_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    supplier TEXT NOT NULL,
    sku TEXT,
    price_lei REAL NOT NULL CHECK(price_lei >= 0),
    vat_included INTEGER NOT NULL DEFAULT 1,
    stock_status TEXT,
    source_url TEXT,
    observed_on TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS heating_product_offers_product_active_idx
ON heating_product_offers(product_id, active, observed_on);

CREATE TABLE IF NOT EXISTS heating_catalog_import_batches (
    batch_id TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_url TEXT,
    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    product_count INTEGER NOT NULL DEFAULT 0,
    performance_point_count INTEGER NOT NULL DEFAULT 0,
    seasonal_point_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT ''
);
