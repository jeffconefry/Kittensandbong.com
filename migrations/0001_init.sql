-- Photos pulled from Pexels. One row per photo ever shown (or considered).
CREATE TABLE photos (
  pexels_id        INTEGER PRIMARY KEY,
  kind             TEXT NOT NULL CHECK (kind IN ('cat', 'bong')),
  alt              TEXT NOT NULL DEFAULT '',
  width            INTEGER,
  height           INTEGER,
  avg_color        TEXT,
  photographer     TEXT NOT NULL,
  photographer_url TEXT NOT NULL,
  page_url         TEXT NOT NULL,
  src_medium       TEXT NOT NULL,
  src_large        TEXT NOT NULL,
  src_large2x      TEXT NOT NULL,
  blocked          INTEGER NOT NULL DEFAULT 0,  -- set to 1 to hide a photo everywhere
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX photos_kind ON photos (kind);

-- One row per published day (America/New_York calendar day, YYYY-MM-DD).
CREATE TABLE days (
  day        TEXT PRIMARY KEY,
  cat_id     INTEGER NOT NULL REFERENCES photos (pexels_id),
  bong_id    INTEGER NOT NULL REFERENCES photos (pexels_id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Mailing list. Double opt-in: 'pending' until the confirm link is used.
CREATE TABLE subscribers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  email            TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'unsubscribed')),
  token            TEXT NOT NULL UNIQUE,          -- capability for confirm + unsubscribe links
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  confirm_sent_at  TEXT,
  confirmed_at     TEXT,
  unsubscribed_at  TEXT,
  last_sent_day    TEXT                           -- last daily email delivered; makes sending resumable
);
CREATE INDEX subscribers_status ON subscribers (status, last_sent_day);
