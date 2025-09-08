export const CREATE_FLIPS_TABLE = `
  CREATE TABLE IF NOT EXISTS flips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER,
    make TEXT,
    model TEXT,
    vin TEXT,
    miles INTEGER,
    buy_price REAL NOT NULL,
    sell_price REAL,
    sold_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const CREATE_LINE_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flip_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT,
    date TEXT,
    receipt_uri TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (flip_id) REFERENCES flips (id) ON DELETE CASCADE
  );
`;

export const CREATE_LINE_ITEMS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_line_items_flip_id ON line_items(flip_id);
`;

export const ADD_RECEIPT_COLUMN = `
  ALTER TABLE line_items ADD COLUMN receipt_uri TEXT;
`;

export const MIGRATIONS = [
  CREATE_FLIPS_TABLE,
  CREATE_LINE_ITEMS_TABLE,
  CREATE_LINE_ITEMS_INDEX,
];

export const SCHEMA_UPDATES = [
  ADD_RECEIPT_COLUMN,
];