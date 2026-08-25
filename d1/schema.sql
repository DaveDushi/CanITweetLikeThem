-- votes: one row per (creator, browser)
CREATE TABLE IF NOT EXISTS votes (
  slug TEXT NOT NULL,
  voter TEXT NOT NULL,
  dir INTEGER NOT NULL CHECK (dir IN (-1, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (slug, voter)
);

-- posts generated through the API, one counter per creator
CREATE TABLE IF NOT EXISTS generation_counts (
  slug TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
