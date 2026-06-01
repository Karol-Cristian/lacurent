ALTER TABLE houses ADD COLUMN display_name TEXT;

CREATE TABLE recommendation_actions (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
house_id INTEGER,
recommendation_id TEXT,
status TEXT DEFAULT 'implemented',
notes TEXT,
implemented_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX recommendation_actions_user_house_idx
ON recommendation_actions(user_id, house_id);
