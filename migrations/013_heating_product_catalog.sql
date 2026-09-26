CREATE TABLE IF NOT EXISTS heating_products (
    id TEXT PRIMARY KEY,
    external_id TEXT,
    technology_id TEXT NOT NULL,
    technology_label TEXT NOT NULL,
    label TEXT NOT NULL,
    system_type TEXT NOT NULL,
    generator_type TEXT NOT NULL,
    carrier TEXT NOT NULL,
    cost_profile TEXT NOT NULL,
    rated_power_kw REAL NOT NULL CHECK(rated_power_kw > 0),
    efficiency REAL,
    scop REAL,
    equipment_price_lei REAL NOT NULL CHECK(equipment_price_lei >= 0),
    installation_allowance_lei REAL NOT NULL CHECK(installation_allowance_lei >= 0),
    source_kind TEXT NOT NULL,
    source_url TEXT,
    confidence TEXT NOT NULL,
    requires_hydronic INTEGER NOT NULL DEFAULT 1,
    requires_existing_gas INTEGER NOT NULL DEFAULT 0,
    requires_existing_high_power_electric INTEGER NOT NULL DEFAULT 0,
    requires_existing_biomass_infrastructure INTEGER NOT NULL DEFAULT 0,
    capacity_basis TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    catalog_version TEXT NOT NULL,
    observed_on TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS heating_products_active_technology_power_idx
ON heating_products(active, technology_id, rated_power_kw);

CREATE INDEX IF NOT EXISTS heating_products_external_id_idx
ON heating_products(external_id);

CREATE TABLE IF NOT EXISTS heat_pump_performance_points (
    product_id TEXT NOT NULL,
    outdoor_temperature_c REAL NOT NULL,
    flow_temperature_c REAL NOT NULL,
    return_temperature_c REAL,
    delta_t_k REAL,
    heating_capacity_kw REAL,
    cop REAL NOT NULL CHECK(cop > 1),
    test_standard TEXT,
    source_kind TEXT NOT NULL,
    source_url TEXT,
    note TEXT NOT NULL DEFAULT '',
    catalog_version TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(product_id, outdoor_temperature_c, flow_temperature_c)
);

CREATE INDEX IF NOT EXISTS heat_pump_performance_product_idx
ON heat_pump_performance_points(product_id, outdoor_temperature_c, flow_temperature_c);

CREATE TABLE IF NOT EXISTS heat_pump_seasonal_performance (
    product_id TEXT NOT NULL,
    climate TEXT NOT NULL,
    application_temperature_c REAL NOT NULL,
    scop REAL NOT NULL CHECK(scop > 1),
    design_load_kw REAL,
    source_kind TEXT NOT NULL,
    source_url TEXT,
    test_standard TEXT,
    catalog_version TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(product_id, climate, application_temperature_c)
);

CREATE INDEX IF NOT EXISTS heat_pump_seasonal_product_idx
ON heat_pump_seasonal_performance(product_id, climate, application_temperature_c);
