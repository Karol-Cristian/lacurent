ALTER TABLE users ADD COLUMN password_hash TEXT;

CREATE UNIQUE INDEX users_email_unique ON users(email);

CREATE TABLE user_sessions (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
token_hash TEXT,
expires_at DATETIME,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX user_sessions_token_hash_idx ON user_sessions(token_hash);

CREATE TABLE password_reset_tokens (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
token_hash TEXT,
expires_at DATETIME,
used_at DATETIME,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX password_reset_tokens_token_hash_idx ON password_reset_tokens(token_hash);
