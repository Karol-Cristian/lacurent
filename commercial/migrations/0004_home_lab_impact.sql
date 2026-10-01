CREATE TABLE IF NOT EXISTS home_lab_impact_snapshots (
    project_id TEXT PRIMARY KEY,
    owner_user_id INTEGER NOT NULL,
    project_name TEXT NOT NULL,
    baseline_input_fingerprint TEXT,
    teo_input_fingerprint TEXT,
    calculation_model_version TEXT,
    methodology_version TEXT,
    heated_area_m2 REAL,
    baseline_final_energy_kwh REAL NOT NULL,
    optimized_final_energy_kwh REAL NOT NULL,
    baseline_annual_cost_lei REAL NOT NULL,
    optimized_annual_cost_lei REAL NOT NULL,
    potential_saving_kwh_year REAL NOT NULL,
    potential_saving_lei_year REAL NOT NULL,
    estimated_capex_lei REAL NOT NULL,
    simple_payback_years REAL,
    baseline_co2_kg_year REAL,
    optimized_co2_kg_year REAL,
    potential_co2_reduction_kg_year REAL,
    data_quality TEXT NOT NULL DEFAULT 'user_saved_modelled',
    source_json TEXT,
    saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS home_lab_impact_owner_idx
ON home_lab_impact_snapshots(owner_user_id, updated_at);

CREATE INDEX IF NOT EXISTS home_lab_impact_active_idx
ON home_lab_impact_snapshots(is_active, data_quality);
