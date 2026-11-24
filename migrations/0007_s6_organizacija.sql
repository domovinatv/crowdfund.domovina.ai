-- 0007_s6_organizacija.sql — organizacija i odobravanje (S6, agent C).
-- Ne mijenja 0001 (generira se iz campaign-corea) ni 0002–0004.

-- 1. Odbijena kampanja za organizaciju (tok 3, docs/05 „review → cancelled: organizacija odbila”): razlog i tko je
--    odbio. `campaigns.state = 'cancelled'` dolazi iz jezgre; razlog nema gdje drugdje (blocked_reason traži
--    blocked_at, a to je moderacija, ne odluka organizacije).
ALTER TABLE campaign_settings ADD COLUMN beneficiary_rejected_at INTEGER;
ALTER TABLE campaign_settings ADD COLUMN beneficiary_rejected_by TEXT REFERENCES users(id);
ALTER TABLE campaign_settings ADD COLUMN beneficiary_rejected_reason TEXT
  CHECK (beneficiary_rejected_reason IS NULL OR length(beneficiary_rejected_reason) BETWEEN 1 AND 500);

-- 2. Zastupnik u zahtjevu organizacije (korak „zastupnik”, ekrani 20 i 26): ime, prezime, funkcija i izjava o
--    ovlasti. Zastupnik je korisnik koji šalje zahtjev (`submitted_by`); ovdje je samo ono što unese.
ALTER TABLE organization_applications ADD COLUMN representative TEXT NOT NULL DEFAULT '{}'
  CHECK (json_valid(representative));
