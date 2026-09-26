CREATE TABLE IF NOT EXISTS heating_parametric_nodes (
    id TEXT PRIMARY KEY,
    technology_id TEXT NOT NULL,
    technology_label TEXT NOT NULL,
    required_power_kw REAL NOT NULL CHECK(required_power_kw > 0),
    planning_capex_lei REAL NOT NULL CHECK(planning_capex_lei >= 0),
    source_product_count INTEGER NOT NULL CHECK(source_product_count > 0),
    min_source_power_kw REAL NOT NULL CHECK(min_source_power_kw > 0),
    max_source_power_kw REAL NOT NULL CHECK(max_source_power_kw > 0),
    interpolation_kind TEXT NOT NULL,
    catalog_signature TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS heating_parametric_nodes_technology_power_idx
ON heating_parametric_nodes(technology_id, required_power_kw);

CREATE INDEX IF NOT EXISTS heating_parametric_nodes_signature_idx
ON heating_parametric_nodes(catalog_signature);
