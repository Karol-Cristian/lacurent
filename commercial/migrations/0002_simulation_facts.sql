CREATE TABLE IF NOT EXISTS simulation_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fact_key TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    search_question TEXT NOT NULL,
    claim TEXT NOT NULL,
    context TEXT NOT NULL,
    locality TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    scenario_label TEXT NOT NULL,
    metric_label TEXT NOT NULL,
    metric_unit TEXT NOT NULL,
    baseline_value REAL NOT NULL,
    scenario_value REAL NOT NULL,
    change_percent REAL NOT NULL,
    baseline_json TEXT NOT NULL,
    scenario_json TEXT NOT NULL,
    metrics_json TEXT NOT NULL,
    methodology_version TEXT NOT NULL,
    ai_model TEXT,
    generated_at TEXT NOT NULL,
    published_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published'
);

CREATE INDEX IF NOT EXISTS simulation_facts_status_date_idx
ON simulation_facts(status, published_at DESC);
