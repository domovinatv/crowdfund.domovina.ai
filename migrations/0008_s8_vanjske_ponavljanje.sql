-- 0008_s8_vanjske_ponavljanje.sql — vanjska kampanja i ponavljanje (S8, agent A).
-- Ne mijenja 0001 (generira se iz campaign-corea) ni 0002–0007.

-- 1. Kratki opis vanjske kampanje (tok 9, odluka 800): organizator ga unosi ručno, jer 4fundove podatke ne čitamo.
ALTER TABLE external_campaigns ADD COLUMN description TEXT
  CHECK (description IS NULL OR length(description) BETWEEN 1 AND 300);

-- 2. Mjesečni podsjetnik (tok 10, odluka 14): jedan red po obećanju i mjesecu. Token iz poveznice (ruta T
--    `/hr/podsjetnik/{token}`) se ne sprema, samo SHA-256 (kao pozivnice). Intent nastaje tek kad podržavatelj
--    klikne „Plati ovaj mjesec” (`checkout_id`), pa podsjetnik koji nitko ne otvori ne troši intent.
CREATE TABLE recurring_reminders (
  id               TEXT PRIMARY KEY,
  pledge_id        TEXT NOT NULL REFERENCES recurring_pledges(id),
  period           TEXT NOT NULL CHECK (length(period) = 7 AND period GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  token_hash       TEXT NOT NULL UNIQUE,
  expires_at       INTEGER NOT NULL,
  checkout_id      TEXT REFERENCES checkouts(id),
  notification_id  TEXT REFERENCES notifications(id),
  created_at       INTEGER NOT NULL,
  UNIQUE (pledge_id, period)
);
CREATE INDEX recurring_reminders_pledge ON recurring_reminders (pledge_id, created_at DESC);

-- 3. Mock pošta organizatora po kampanji (obavijest o novom doprinosu): `notifications` nema kampanju.
ALTER TABLE notifications ADD COLUMN campaign_id TEXT REFERENCES campaigns(id);
CREATE INDEX notifications_campaign ON notifications (campaign_id, created_at DESC) WHERE campaign_id IS NOT NULL;
