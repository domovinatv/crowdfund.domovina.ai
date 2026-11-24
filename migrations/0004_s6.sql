-- 0004_s6.sql — prijedlozi S5 (odluke 507, 508, 509), docs/09 §0004.
-- Ne mijenja 0001 (generira se iz campaign-corea) ni 0002/0003.

-- 1. Javni slug profila osobe (`/hr/u/{slug}`; profil i dalje prihvaća users.id).
--    Isti uzorak kao organizations.slug, ali ne smije izgledati kao UUID (id i slug dijele put).
ALTER TABLE users ADD COLUMN slug TEXT
  CHECK (slug IS NULL OR (slug NOT GLOB '*[^a-z0-9-]*' AND length(slug) BETWEEN 3 AND 40
                          AND slug NOT GLOB '????????-????-????-????-????????????'));
CREATE UNIQUE INDEX users_slug ON users (slug) WHERE slug IS NOT NULL;

-- 2. Popis uplata skriven kao stupac umjesto campaigns.metadata.contributions_list (odluka 509).
ALTER TABLE campaign_settings ADD COLUMN contributions_list TEXT NOT NULL DEFAULT 'visible'
  CHECK (contributions_list IN ('visible','hidden'));
UPDATE campaign_settings SET contributions_list = 'hidden'
 WHERE campaign_id IN (SELECT id FROM campaigns WHERE json_extract(metadata, '$.contributions_list') = 'hidden');
UPDATE campaigns SET metadata = json_remove(metadata, '$.contributions_list')
 WHERE json_extract(metadata, '$.contributions_list') IS NOT NULL;

-- 3. Praćenje bez prijave (odluka 508): e-pošta + token poveznice (spremljen samo hash) + potvrda.
--    user_id postaje nullable, pa se tablica gradi iznova (SQLite ne mijenja NOT NULL ni PRIMARY KEY).
CREATE TABLE campaign_follows_s6 (
  user_id          TEXT REFERENCES users(id),
  email            TEXT COLLATE NOCASE,                 -- neprijavljeni pratitelj
  campaign_id      TEXT NOT NULL REFERENCES campaigns(id),
  notify_comments  INTEGER NOT NULL DEFAULT 0 CHECK (notify_comments IN (0,1)),
  notify_updates   INTEGER NOT NULL DEFAULT 0 CHECK (notify_updates IN (0,1)),
  notify_end       INTEGER NOT NULL DEFAULT 0 CHECK (notify_end IN (0,1)),
  token_hash       TEXT,                                -- SHA-256 tokena iz poveznice u e-pošti
  confirmed_at     INTEGER,                             -- neprijavljeni potvrđuje poveznicom; prijavljeni = created_at
  created_at       INTEGER NOT NULL,
  CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);
INSERT INTO campaign_follows_s6 (user_id, email, campaign_id, notify_comments, notify_updates, notify_end, token_hash, confirmed_at, created_at)
  SELECT user_id, NULL, campaign_id, notify_comments, notify_updates, notify_end, NULL, created_at, created_at FROM campaign_follows;
DROP TABLE campaign_follows;
ALTER TABLE campaign_follows_s6 RENAME TO campaign_follows;
CREATE UNIQUE INDEX campaign_follows_user ON campaign_follows (user_id, campaign_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX campaign_follows_email ON campaign_follows (email, campaign_id) WHERE user_id IS NULL;
CREATE UNIQUE INDEX campaign_follows_token ON campaign_follows (token_hash) WHERE token_hash IS NOT NULL;

-- 4. Brzi upiti prijave (S6): svježa dodatna potvrda po korisniku i radnji.
CREATE INDEX one_time_codes_step_up ON one_time_codes (user_id, purpose, action, used_at);
CREATE INDEX sessions_user ON sessions (user_id, revoked_at);
