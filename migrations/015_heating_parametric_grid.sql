CREATE TABLE IF NOT EXISTS heating_parametric_grids (
    catalog_signature TEXT PRIMARY KEY,
    node_count INTEGER NOT NULL CHECK(node_count > 0),
    nodes_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
