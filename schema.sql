CREATE TABLE users (

id INTEGER PRIMARY KEY AUTOINCREMENT,

email TEXT,

name TEXT,

created_at DATETIME DEFAULT CURRENT_TIMESTAMP

);

CREATE TABLE houses (

id INTEGER PRIMARY KEY AUTOINCREMENT,

user_id INTEGER,

house_type TEXT,

surface REAL,

rooms INTEGER,

year INTEGER,

city TEXT

);

CREATE TABLE energy_profiles (

id INTEGER PRIMARY KEY AUTOINCREMENT,

house_id INTEGER,

heating TEXT,

temperature_day REAL,

temperature_night REAL,

provider TEXT,

monthly_bill REAL,

monthly_kwh REAL

);

CREATE TABLE appliances (

id INTEGER PRIMARY KEY AUTOINCREMENT,

house_id INTEGER,

fridge_class TEXT,

washer_class TEXT,

dryer INTEGER,

dishwasher INTEGER

);

CREATE TABLE recommendations (

id INTEGER PRIMARY KEY AUTOINCREMENT,

house_id INTEGER,

title TEXT,

estimated_savings REAL,

roi REAL

);