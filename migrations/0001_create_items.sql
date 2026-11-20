-- The first, thinnest version of the items table. Phase 2 adds the rest of the
-- fields (status, notes, type and so on) in a later migration.
CREATE TABLE items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
