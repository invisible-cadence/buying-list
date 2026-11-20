-- Phase 2: the full item model, and a table for links.
--
-- SQLite cannot add most kinds of rule to an existing table, so the items
-- table is rebuilt: a new table is created with every rule in place, the old
-- rows are copied across with their ids unchanged, and the old table is
-- dropped. Items added in Phase 1 survive and start as ideas.
--
-- Dates are written as YYYY-MM-DD and times as ISO 8601 in UTC, as text.
-- Money is a whole number of the smallest unit (cents), never a decimal.

CREATE TABLE items_new (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  notes        TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  status       TEXT NOT NULL DEFAULT 'idea'
               CHECK (status IN ('idea', 'researching', 'decided', 'waiting_for_money', 'ready_to_buy', 'bought')),
  type         TEXT NOT NULL DEFAULT 'one_off'
               CHECK (type IN ('one_off', 'restock', 'gift', 'seasonal')),
  priority     TEXT NOT NULL DEFAULT 'normal'
               CHECK (priority IN ('low', 'normal', 'high')),
  -- date() turns an impossible date such as 2026-02-30 into a different
  -- one, so comparing it with the original rejects those.
  needed_by    TEXT CHECK (needed_by IS NULL OR date(needed_by) = needed_by),
  budget_cents INTEGER CHECK (budget_cents IS NULL OR budget_cents >= 0),

  -- Bought details. The rule that ties them to the status is at the end.
  bought_on    TEXT CHECK (bought_on IS NULL OR date(bought_on) = bought_on),
  paid_cents   INTEGER CHECK (paid_cents IS NULL OR paid_cents >= 0),
  bought_from  TEXT NOT NULL DEFAULT '' CHECK (length(bought_from) <= 200),

  -- Phase 3 fills these in and enforces them. Nothing reads or sets them yet.
  added_by     TEXT,
  is_private   INTEGER NOT NULL DEFAULT 0 CHECK (is_private IN (0, 1)),

  -- Archived items are hidden from the list but keep their status.
  archived_at  TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  -- Rules that involve more than one column. SQLite wants these after the columns.
  -- Bought details exist exactly when the status is bought.
  CHECK (status = 'bought' OR (bought_on IS NULL AND paid_cents IS NULL AND bought_from = '')),
  CHECK (status <> 'bought' OR bought_on IS NOT NULL)
);

INSERT INTO items_new (id, title, created_at, updated_at)
SELECT id, title, created_at, created_at FROM items;

DROP TABLE items;
ALTER TABLE items_new RENAME TO items;

CREATE TABLE links (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Deleting an item deletes its links too.
  item_id    INTEGER NOT NULL REFERENCES items (id) ON DELETE CASCADE,
  url        TEXT NOT NULL
             CHECK (length(url) <= 2000 AND (url LIKE 'http://%' OR url LIKE 'https://%')),
  label      TEXT NOT NULL DEFAULT '' CHECK (length(label) <= 200),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Finding the links of one item is the common question.
CREATE INDEX links_item_id ON links (item_id);
