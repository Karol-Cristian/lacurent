-- Product catalog foundation for the Commercial Python Worker.
-- This migration is intentionally not wired into commercial/cloudflare-worker/wrangler.toml
-- until a dedicated D1 database/binding is provisioned for the commercial runtime.

CREATE TABLE IF NOT EXISTS product_catalog_items (
    product_id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    technical_json TEXT NOT NULL,
    technical_source_urls_json TEXT NOT NULL,
    catalog_version TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS product_catalog_items_category_idx
ON product_catalog_items(category, active);

CREATE TABLE IF NOT EXISTS product_catalog_offers (
    offer_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    price_lei REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'RON',
    vat_included INTEGER NOT NULL DEFAULT 1,
    stock_status TEXT NOT NULL DEFAULT 'unknown',
    product_url TEXT NOT NULL,
    observed_on TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES product_catalog_items(product_id)
);

CREATE INDEX IF NOT EXISTS product_catalog_offers_product_idx
ON product_catalog_offers(product_id, observed_on);

CREATE INDEX IF NOT EXISTS product_catalog_offers_stock_price_idx
ON product_catalog_offers(stock_status, price_lei);
