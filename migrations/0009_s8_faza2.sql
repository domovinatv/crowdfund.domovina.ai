-- 0009_s8_faza2.sql — ponude faze 2 (S8, agent B).
-- Ne mijenja 0001 (generira se iz campaign-corea) ni 0002–0008.
-- Ponude su faza 2 (odluka 8): obrazac `/hr/ponude/nova` sprema nacrt, kupnje i licitiranja nema.

-- 1. Kategorija ponude (javni pregled §3 „Polja ponude”, §8.3 katalog): vlastiti popis od 12 ključeva, ne kategorije
--    kampanja (`categories`), jer katalog ponuda filtrira po vrsti predmeta, a ne po namjeni kampanje.
ALTER TABLE offers ADD COLUMN category TEXT
  CHECK (category IS NULL OR category IN ('kids','fashion','books','art','home','tickets','autographs','sport',
                                          'electronics','experiences','thanks','other'));

-- 2. Stanje predmeta (novo / rabljeno); NULL za uslugu, doživljaj i digitalni sadržaj.
ALTER TABLE offers ADD COLUMN item_condition TEXT CHECK (item_condition IS NULL OR item_condition IN ('new','used'));

-- 3. Katalog `/hr/ponude` čita aktivne ponude od najnovije; licitacije ponude po iznosu.
CREATE INDEX offers_status_created ON offers (status, created_at DESC);
CREATE INDEX offers_campaign ON offers (campaign_id, status);
CREATE INDEX offer_bids_offer ON offer_bids (offer_id, amount_cents DESC);
