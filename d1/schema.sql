-- votes: one row per (creator, browser)
CREATE TABLE IF NOT EXISTS votes (
  slug TEXT NOT NULL,
  voter TEXT NOT NULL,
  dir INTEGER NOT NULL CHECK (dir IN (-1, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (slug, voter)
);
