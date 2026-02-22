-- Run: wrangler d1 execute <DB_NAME> --file=./schema.sql

CREATE TABLE IF NOT EXISTS yubikeys (
    yubikey_id TEXT PRIMARY KEY,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_layouts (
    user_id TEXT PRIMARY KEY,
    layout TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS market_hours (
    date TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
