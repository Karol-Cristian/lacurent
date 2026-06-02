CREATE TABLE IF NOT EXISTS report_snapshots (
id INTEGER PRIMARY KEY AUTOINCREMENT,
home_id INTEGER,
analysis_id INTEGER,
generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
energy_score REAL,
estimated_energy_class TEXT,
main_conclusion TEXT,
estimated_consumption_kwh_m2_year REAL,
estimated_annual_cost_ron REAL,
estimated_co2_kg_m2_year REAL,
confidence_level TEXT,
top_problems_json TEXT,
static_recommendations_json TEXT,
technical_details_json TEXT
);

CREATE INDEX IF NOT EXISTS report_snapshots_home_idx
ON report_snapshots(home_id, generated_at);

CREATE TABLE IF NOT EXISTS algorithm_insights (
id INTEGER PRIMARY KEY AUTOINCREMENT,
home_id INTEGER,
analysis_id INTEGER,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
insight_type TEXT,
title TEXT,
priority TEXT,
estimated_score_impact REAL,
estimated_savings_ron_year_min REAL,
estimated_savings_ron_year_max REAL,
estimated_cost_ron_min REAL,
estimated_cost_ron_max REAL,
estimated_payback_years_min REAL,
estimated_payback_years_max REAL,
confidence_percent REAL,
based_on_json TEXT,
explanation TEXT,
next_action_label TEXT
);

CREATE INDEX IF NOT EXISTS algorithm_insights_home_idx
ON algorithm_insights(home_id, updated_at);
