ALTER TABLE houses ADD COLUMN active INTEGER DEFAULT 1;
ALTER TABLE houses ADD COLUMN archived_at DATETIME;
ALTER TABLE houses ADD COLUMN analysis_purpose TEXT;

CREATE TABLE savings_events (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
house_id INTEGER,
event_type TEXT,
amount_ron REAL,
source TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX savings_events_user_house_idx
ON savings_events(user_id, house_id);
