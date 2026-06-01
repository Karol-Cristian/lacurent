CREATE TABLE house_monthly_bills (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
house_id INTEGER,
billing_month TEXT,
electricity_cost_ron REAL DEFAULT 0,
gas_cost_ron REAL DEFAULT 0,
wood_cost_ron REAL DEFAULT 0,
pellets_cost_ron REAL DEFAULT 0,
other_cost_ron REAL DEFAULT 0,
notes TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX house_monthly_bills_user_house_idx
ON house_monthly_bills(user_id, house_id, billing_month);

CREATE TABLE house_change_log (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
house_id INTEGER,
change_type TEXT,
summary TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX house_change_log_user_house_idx
ON house_change_log(user_id, house_id);
