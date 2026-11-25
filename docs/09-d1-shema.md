# 09 — Nacrt D1 sheme

Nacrt migracija za S4. Entiteti i razlozi su u [03](03-domenski-model.md), stanja u
[05](05-zivotni-ciklus.md). Konvencije iz campaign-corea: ID `TEXT` (UUIDv7 iz Workera), novac u centima,
vrijeme unix ms, skup = `CHECK (x IN (…))`, boolean `CHECK (x IN (0,1))`, JSON `CHECK (json_valid(x))`.

## Migracije

| datoteka | sadržaj | izvor |
|---|---|---|
| `migrations/0001_core.sql` | 15 tablica jezgre (`CORE_TABLES`), bez vertikala | **generira se** iz `@domovina/campaign-core` (`contract.ts`, skupovi iz `sets.ts`) skriptom u S4; J2 u campaign-coreu još ne postoji |
| `migrations/0002_platform.sql` | platformske tablice ispod | ovaj dokument |
| `migrations/0003_seed_reference.sql` | kategorije | ovaj dokument |
| `migrations/0004_s6.sql` | `users.slug`, `campaign_settings.contributions_list`, `campaign_follows` s e-poštom i tokenom, indeksi prijave | §0004 ispod (S6) |
| `migrations/0007_s6_organizacija.sql` | odbijanje kampanje za organizaciju (`campaign_settings.beneficiary_rejected_*`), zastupnik u `organization_applications.representative` | §0007 ispod (S6) |
| `migrations/0008_s8_vanjske_ponavljanje.sql` | kratki opis vanjske kampanje, `recurring_reminders` (mjesečni podsjetnik s tokenom), `notifications.campaign_id` | §0008 ispod (S8) |
| `migrations/0009_s8_faza2.sql` | ponude faze 2: `offers.category`, `offers.item_condition`, indeksi kataloga ponuda i licitacija | §0009 ispod (S8) |

S4 ima test koji uspoređuje `0001_core.sql` s opisom iz paketa (kao planirani J2 test u campaign-coreu), pa
nova verzija paketa ruši build dok se migracija ne obnovi. Vertikale (`campaign_energy`,
`campaign_community`, `members`) se ne stvaraju.

Iz jezgre platforma koristi: `organizers`, `campaigns`, `campaign_safes`, `campaign_tiers`,
`campaign_documents`, `contributions`, `contribution_events`, `contribution_profiles`, `campaign_stats`,
`subscriptions`. Ostale tablice jezgre (`campaign_subjects`, `budget_lines`, `milestones`, `payouts`,
`timeline_steps`) postoje, ali ih prototip ne puni (osim `budget_lines` za troškovnik iznad 35.000 €).

## 0002_platform.sql

```sql
-- Identitet ---------------------------------------------------------------

CREATE TABLE users (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name      TEXT CHECK (display_name IS NULL OR length(display_name) <= 255),
  first_name        TEXT CHECK (first_name IS NULL OR length(first_name) <= 255),
  last_name         TEXT CHECK (last_name IS NULL OR length(last_name) <= 255),
  about             TEXT CHECK (about IS NULL OR length(about) <= 3500),
  website           TEXT CHECK (website IS NULL OR length(website) <= 255),
  phone             TEXT,
  country_code      TEXT NOT NULL DEFAULT 'HR',
  avatar_file_id    TEXT REFERENCES files(id),
  locale            TEXT NOT NULL DEFAULT 'hr' CHECK (locale IN ('hr','en')),
  email_verified_at INTEGER,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  deleted_at        INTEGER
);

CREATE TABLE auth_identities (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  provider    TEXT NOT NULL CHECK (provider IN ('email_link','email_code','google','certilia')),
  subject     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  last_used_at INTEGER,
  UNIQUE (provider, subject)
);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,            -- hash tokena iz kolačića
  user_id     TEXT NOT NULL REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  revoked_at  INTEGER
);

CREATE TABLE login_events (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id),
  session_id       TEXT REFERENCES sessions(id),
  logged_in_at     INTEGER NOT NULL,
  last_activity_at INTEGER,
  ip_prefix        TEXT,                    -- /24 ili /48, ne puna adresa
  device           TEXT
);
CREATE INDEX login_events_user ON login_events (user_id, logged_in_at DESC);

CREATE TABLE one_time_codes (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users(id),
  email        TEXT NOT NULL COLLATE NOCASE,
  purpose      TEXT NOT NULL CHECK (purpose IN ('login','email_verify','step_up')),
  action       TEXT,                        -- za step_up: npr. refund, delete_campaign, member_role
  code_hash    TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,
  used_at      INTEGER
);
CREATE INDEX one_time_codes_email ON one_time_codes (email, purpose, created_at DESC);

CREATE TABLE user_settings (
  user_id               TEXT PRIMARY KEY REFERENCES users(id),
  show_email            INTEGER NOT NULL DEFAULT 0 CHECK (show_email IN (0,1)),
  show_avatar           INTEGER NOT NULL DEFAULT 1 CHECK (show_avatar IN (0,1)),
  show_phone            INTEGER NOT NULL DEFAULT 0 CHECK (show_phone IN (0,1)),
  show_total_raised     INTEGER NOT NULL DEFAULT 0 CHECK (show_total_raised IN (0,1)),
  show_registered_date  INTEGER NOT NULL DEFAULT 1 CHECK (show_registered_date IN (0,1)),
  show_promoted         INTEGER NOT NULL DEFAULT 1 CHECK (show_promoted IN (0,1)),
  show_owned            INTEGER NOT NULL DEFAULT 1 CHECK (show_owned IN (0,1)),
  show_donated          INTEGER NOT NULL DEFAULT 1 CHECK (show_donated IN (0,1)),
  show_for_organization INTEGER NOT NULL DEFAULT 1 CHECK (show_for_organization IN (0,1)),
  indexable             INTEGER NOT NULL DEFAULT 1 CHECK (indexable IN (0,1)),
  step_up_channel       TEXT NOT NULL DEFAULT 'email' CHECK (step_up_channel IN ('email')),
  updated_at            INTEGER NOT NULL
);

CREATE TABLE consents (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id),
  email         TEXT COLLATE NOCASE,          -- neprijavljeni podržavatelj
  kind          TEXT NOT NULL CHECK (kind IN ('terms_privacy','newsletter','moneybox_rules','report_gdpr','campaign_terms')),
  text_version  TEXT NOT NULL,
  granted       INTEGER NOT NULL CHECK (granted IN (0,1)),
  created_at    INTEGER NOT NULL,
  CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

CREATE TABLE files (
  id           TEXT PRIMARY KEY,
  r2_key       TEXT NOT NULL UNIQUE,
  purpose      TEXT NOT NULL CHECK (purpose IN ('media','cover','avatar','logo','purpose_evidence','report_attachment')),
  mime         TEXT NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/gif','image/webp','application/pdf')),
  size_bytes   INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520),
  uploaded_by  TEXT REFERENCES users(id),
  created_at   INTEGER NOT NULL
);

-- Organizacije --------------------------------------------------------------

CREATE TABLE organizations (
  id                    TEXT PRIMARY KEY,
  organizer_id          TEXT NOT NULL UNIQUE REFERENCES organizers(id),
  slug                  TEXT NOT NULL UNIQUE CHECK (slug NOT GLOB '*[^a-z0-9-]*' AND length(slug) BETWEEN 3 AND 40),
  kind                  TEXT NOT NULL DEFAULT 'legal' CHECK (kind IN ('legal','personal')),
  legal_form            TEXT NOT NULL CHECK (legal_form IN ('udruga','zaklada','ustanova','vjerska_zajednica','zadruga','jls','doo','obrt','osoba')),
  display_name          TEXT NOT NULL,
  description           TEXT,
  website               TEXT,
  social_links          TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(social_links)),
  logo_file_id          TEXT REFERENCES files(id),
  category_key          TEXT REFERENCES categories(key),
  safe_address          TEXT,                 -- Safe organizacije (setup dApp), 0 platformskih potpisnika
  safe_chain_id         INTEGER CHECK (safe_chain_id IS NULL OR safe_chain_id IN (100, 10200)),
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','closed')),
  is_fixed_beneficiary  INTEGER NOT NULL DEFAULT 0 CHECK (is_fixed_beneficiary IN (0,1)),
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  deleted_at            INTEGER
);

CREATE TABLE memberships (
  user_id          TEXT NOT NULL REFERENCES users(id),
  organization_id  TEXT NOT NULL REFERENCES organizations(id),
  role             TEXT NOT NULL CHECK (role IN ('owner','admin','editor','viewer')),
  invited_by       TEXT REFERENCES users(id),
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  PRIMARY KEY (user_id, organization_id)
);
CREATE INDEX memberships_org ON memberships (organization_id, role);

CREATE TABLE membership_invites (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT NOT NULL REFERENCES organizations(id),
  email            TEXT NOT NULL COLLATE NOCASE,
  role             TEXT NOT NULL CHECK (role IN ('owner','admin','editor','viewer')),
  token_hash       TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  invited_by       TEXT NOT NULL REFERENCES users(id),
  created_at       INTEGER NOT NULL,
  expires_at       INTEGER NOT NULL
);

CREATE TABLE organization_applications (
  id                   TEXT PRIMARY KEY,
  organization_id      TEXT NOT NULL REFERENCES organizations(id),
  submitted_by         TEXT NOT NULL REFERENCES users(id),
  project_description  TEXT NOT NULL,
  expected_payments    TEXT NOT NULL CHECK (expected_payments IN ('1-10','11-100','101-1000','>1000')),
  step                 INTEGER NOT NULL DEFAULT 3 CHECK (step BETWEEN 1 AND 5),
  status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  reason               TEXT,
  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL
);

CREATE TABLE verifications (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('person_kyc','org_kyb','campaign_purpose','email')),
  subject_type  TEXT NOT NULL CHECK (subject_type IN ('user','organization','campaign')),
  subject_id    TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('requested','submitted','in_review','approved','rejected','expired')),
  provider      TEXT NOT NULL CHECK (provider IN ('platform','monerium','swan','mock')),
  provider_ref  TEXT,
  trigger       TEXT CHECK (trigger IS NULL OR trigger IN ('user','threshold_campaign','threshold_organizer','report','risk')),
  reason        TEXT,
  requested_at  INTEGER NOT NULL,
  decided_at    INTEGER,
  due_at        INTEGER,                      -- 14 dana za dokumente namjene
  CHECK ((kind = 'person_kyc' AND subject_type = 'user')
      OR (kind = 'org_kyb' AND subject_type = 'organization')
      OR (kind = 'campaign_purpose' AND subject_type = 'campaign')
      OR (kind = 'email' AND subject_type = 'user'))
);
CREATE INDEX verifications_subject ON verifications (subject_type, subject_id, kind, requested_at DESC);

-- Kampanja ------------------------------------------------------------------

CREATE TABLE categories (
  key     TEXT PRIMARY KEY,
  sort    INTEGER NOT NULL,
  name_hr TEXT NOT NULL,
  name_en TEXT NOT NULL
);

CREATE TABLE campaign_settings (
  campaign_id                  TEXT PRIMARY KEY REFERENCES campaigns(id),
  public_id                    TEXT NOT NULL UNIQUE CHECK (length(public_id) = 6),
  kind                         TEXT NOT NULL CHECK (kind IN ('one_time','recurring','for_organization')),
  category_key                 TEXT REFERENCES categories(key),
  cover_theme                  TEXT CHECK (cover_theme IS NULL OR cover_theme IN ('birthday','charity','general','dream','event','gift','memory','needs','animals','project','repairs','school','sports','travel','treatment')),
  created_by_user_id           TEXT NOT NULL REFERENCES users(id),
  beneficiary_organization_id  TEXT REFERENCES organizations(id),
  beneficiary_approved_at      INTEGER,
  beneficiary_approved_by      TEXT REFERENCES users(id),
  amount_presets               TEXT NOT NULL DEFAULT '[2000,5000,10000,30000,50000]' CHECK (json_valid(amount_presets)),
  indexable                    INTEGER NOT NULL DEFAULT 1 CHECK (indexable IN (0,1)),
  hide_raised                  INTEGER NOT NULL DEFAULT 0 CHECK (hide_raised IN (0,1)),
  hide_contributor_count       INTEGER NOT NULL DEFAULT 0 CHECK (hide_contributor_count IN (0,1)),
  contributions_sort           TEXT NOT NULL DEFAULT 'latest' CHECK (contributions_sort IN ('latest','highest')),
  comments_mode                TEXT NOT NULL DEFAULT 'everyone' CHECK (comments_mode IN ('off','contributors','everyone')),
  allow_moneyboxes             INTEGER NOT NULL DEFAULT 1 CHECK (allow_moneyboxes IN (0,1)),
  allow_external_offers        INTEGER NOT NULL DEFAULT 0 CHECK (allow_external_offers IN (0,1)),
  contribution_notifications   INTEGER NOT NULL DEFAULT 1 CHECK (contribution_notifications IN (0,1)),
  thank_you_message            TEXT CHECK (thank_you_message IS NULL OR length(thank_you_message) <= 1000),
  purpose_verified             INTEGER NOT NULL DEFAULT 0 CHECK (purpose_verified IN (0,1)),
  paused_at                    INTEGER,
  blocked_at                   INTEGER,
  blocked_reason               TEXT,
  updated_at                   INTEGER NOT NULL,
  CHECK ((kind = 'for_organization') = (beneficiary_organization_id IS NOT NULL)),
  CHECK (blocked_at IS NULL OR blocked_reason IS NOT NULL)
);
CREATE INDEX campaign_settings_category ON campaign_settings (category_key);

CREATE TABLE campaign_drafts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  source      TEXT NOT NULL CHECK (source IN ('local','server')),
  step        INTEGER NOT NULL DEFAULT 1 CHECK (step BETWEEN 1 AND 5),
  data        TEXT NOT NULL CHECK (json_valid(data)),
  campaign_id TEXT REFERENCES campaigns(id),     -- popunjeno nakon „Objavi”
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE campaign_media (
  id          TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  kind        TEXT NOT NULL CHECK (kind IN ('image','video')),
  file_id     TEXT REFERENCES files(id),
  video_url   TEXT,
  position    INTEGER NOT NULL CHECK (position BETWEEN 0 AND 8),
  created_at  INTEGER NOT NULL,
  UNIQUE (campaign_id, position),
  CHECK ((kind = 'image' AND file_id IS NOT NULL AND video_url IS NULL)
      OR (kind = 'video' AND video_url IS NOT NULL AND file_id IS NULL))
);

CREATE TABLE campaign_updates (
  id           TEXT PRIMARY KEY,
  campaign_id  TEXT NOT NULL REFERENCES campaigns(id),
  author_id    TEXT NOT NULL REFERENCES users(id),
  title        TEXT CHECK (title IS NULL OR length(title) <= 120),
  body         TEXT NOT NULL,
  tier_id      TEXT REFERENCES campaign_tiers(id),    -- faza 2: samo za razinu
  published_at INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  deleted_at   INTEGER
);
CREATE INDEX campaign_updates_campaign ON campaign_updates (campaign_id, published_at DESC);

CREATE TABLE comments (
  id              TEXT PRIMARY KEY,
  campaign_id     TEXT NOT NULL REFERENCES campaigns(id),
  update_id       TEXT REFERENCES campaign_updates(id),
  parent_id       TEXT REFERENCES comments(id),
  author_id       TEXT REFERENCES users(id),
  contribution_id TEXT REFERENCES contributions(id),  -- poruka iz checkouta prikazana kao komentar
  body            TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2500),
  hidden_at       INTEGER,
  hidden_by       TEXT REFERENCES users(id),
  created_at      INTEGER NOT NULL,
  deleted_at      INTEGER,
  CHECK (author_id IS NOT NULL OR contribution_id IS NOT NULL)
);
CREATE INDEX comments_campaign ON comments (campaign_id, created_at DESC);

CREATE TABLE campaign_follows (
  user_id          TEXT NOT NULL REFERENCES users(id),
  campaign_id      TEXT NOT NULL REFERENCES campaigns(id),
  notify_comments  INTEGER NOT NULL DEFAULT 0 CHECK (notify_comments IN (0,1)),
  notify_updates   INTEGER NOT NULL DEFAULT 0 CHECK (notify_updates IN (0,1)),
  notify_end       INTEGER NOT NULL DEFAULT 0 CHECK (notify_end IN (0,1)),
  created_at       INTEGER NOT NULL,
  PRIMARY KEY (user_id, campaign_id)
);

-- Novac (projekcija MPT-a) --------------------------------------------------

CREATE TABLE moneyboxes (
  id                     TEXT PRIMARY KEY,
  campaign_id            TEXT NOT NULL REFERENCES campaigns(id),
  owner_user_id          TEXT NOT NULL REFERENCES users(id),
  alias                  TEXT NOT NULL UNIQUE CHECK (alias NOT GLOB '*[^a-z0-9-]*' AND length(alias) BETWEEN 3 AND 60),
  title                  TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 60),
  description            TEXT,
  goal_cents             INTEGER CHECK (goal_cents IS NULL OR goal_cents > 0),
  cover_file_id          TEXT REFERENCES files(id),
  payment_notifications  INTEGER NOT NULL DEFAULT 1 CHECK (payment_notifications IN (0,1)),
  thank_you_message      TEXT CHECK (thank_you_message IS NULL OR length(thank_you_message) <= 1000),
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','deleted')),
  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL
);
CREATE INDEX moneyboxes_campaign ON moneyboxes (campaign_id);

CREATE TABLE tracking_links (
  id             TEXT PRIMARY KEY,
  campaign_id    TEXT NOT NULL REFERENCES campaigns(id),
  owner_user_id  TEXT NOT NULL REFERENCES users(id),
  slug           TEXT NOT NULL UNIQUE CHECK (slug NOT GLOB '*[^a-z0-9-]*' AND length(slug) BETWEEN 3 AND 60),
  label          TEXT,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at     INTEGER NOT NULL
);

CREATE TABLE share_links (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  campaign_id  TEXT NOT NULL REFERENCES campaigns(id),
  code         TEXT NOT NULL UNIQUE,
  created_at   INTEGER NOT NULL,
  UNIQUE (user_id, campaign_id)
);

CREATE TABLE link_visits (
  id                TEXT PRIMARY KEY,
  tracking_link_id  TEXT REFERENCES tracking_links(id),
  share_link_id     TEXT REFERENCES share_links(id),
  moneybox_id       TEXT REFERENCES moneyboxes(id),
  visitor_hash      TEXT NOT NULL,          -- HMAC(IP + UA + dan), bez sirovih podataka
  visited_at        INTEGER NOT NULL,
  CHECK ((tracking_link_id IS NOT NULL) + (share_link_id IS NOT NULL) + (moneybox_id IS NOT NULL) = 1)
);
CREATE INDEX link_visits_tracking ON link_visits (tracking_link_id, visited_at);

CREATE TABLE checkouts (
  id                 TEXT PRIMARY KEY,
  campaign_id        TEXT NOT NULL REFERENCES campaigns(id),
  contribution_sid   TEXT NOT NULL UNIQUE CHECK (length(contribution_sid) BETWEEN 6 AND 32),
  amount_cents       INTEGER NOT NULL CHECK (amount_cents >= 100 AND amount_cents <= 1000000),
  tip_cents          INTEGER NOT NULL DEFAULT 0 CHECK (tip_cents >= 0),
  intent_state       TEXT NOT NULL DEFAULT 'open' CHECK (intent_state IN ('open','underpaid','paid','expired','late','underpaid_expired','rejected')),
  user_id            TEXT REFERENCES users(id),
  email              TEXT NOT NULL COLLATE NOCASE,
  first_name         TEXT CHECK (first_name IS NULL OR length(first_name) <= 100),
  last_name          TEXT CHECK (last_name IS NULL OR length(last_name) <= 100),
  as_company         INTEGER NOT NULL DEFAULT 0 CHECK (as_company IN (0,1)),
  company_name       TEXT,
  company_oib        TEXT CHECK (company_oib IS NULL OR (length(company_oib) = 11 AND company_oib NOT GLOB '*[^0-9]*')),
  recurring_pledge_id TEXT REFERENCES recurring_pledges(id),
  moneybox_id        TEXT REFERENCES moneyboxes(id),
  tracking_link_id   TEXT REFERENCES tracking_links(id),
  share_link_id      TEXT REFERENCES share_links(id),
  offer_id           TEXT REFERENCES offers(id),
  short_ref          TEXT,
  expires_at         INTEGER NOT NULL,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);
CREATE INDEX checkouts_campaign ON checkouts (campaign_id, created_at DESC);

CREATE TABLE contribution_attributions (
  contribution_id   TEXT PRIMARY KEY REFERENCES contributions(id),
  checkout_id       TEXT REFERENCES checkouts(id),   -- NULL za contribution.sepa (trajni QR)
  user_id           TEXT REFERENCES users(id),
  moneybox_id       TEXT REFERENCES moneyboxes(id),
  tracking_link_id  TEXT REFERENCES tracking_links(id),
  share_link_id     TEXT REFERENCES share_links(id),
  offer_id          TEXT REFERENCES offers(id),
  amount_hidden     INTEGER NOT NULL DEFAULT 0 CHECK (amount_hidden IN (0,1)),
  show_message_as_comment INTEGER NOT NULL DEFAULT 0 CHECK (show_message_as_comment IN (0,1)),
  source            TEXT NOT NULL CHECK (source IN ('checkout','campaign_qr','moneybox_qr'))
);
CREATE INDEX attributions_moneybox ON contribution_attributions (moneybox_id) WHERE moneybox_id IS NOT NULL;
CREATE INDEX attributions_tracking ON contribution_attributions (tracking_link_id) WHERE tracking_link_id IS NOT NULL;
CREATE INDEX attributions_user ON contribution_attributions (user_id) WHERE user_id IS NOT NULL;

CREATE TABLE tips (
  id            TEXT PRIMARY KEY,
  checkout_id   TEXT NOT NULL UNIQUE REFERENCES checkouts(id),
  sid           TEXT NOT NULL UNIQUE CHECK (length(sid) BETWEEN 6 AND 32),
  amount_cents  INTEGER NOT NULL CHECK (amount_cents > 0),
  intent_state  TEXT NOT NULL DEFAULT 'open' CHECK (intent_state IN ('open','underpaid','paid','expired','late','underpaid_expired','rejected')),
  amount_received_cents INTEGER,
  created_at    INTEGER NOT NULL,
  paid_at       INTEGER,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE webhook_receipts (
  webhook_id    TEXT PRIMARY KEY,            -- rcv_, int_, late_, undp_, rej_, cmp_, blk_
  event_type    TEXT NOT NULL CHECK (event_type IN ('payment.received','intent.paid','payment.late','payment.underpaid','payment.rejected','contribution.sepa','forward.blocked')),
  sid           TEXT,
  monerium_order_id TEXT,
  received_at   INTEGER NOT NULL,
  processed_at  INTEGER,
  error         TEXT
);

CREATE TABLE refunds (
  id               TEXT PRIMARY KEY,
  contribution_id  TEXT NOT NULL REFERENCES contributions(id),
  amount_cents     INTEGER NOT NULL CHECK (amount_cents > 0),
  method           TEXT NOT NULL CHECK (method IN ('safe_tx','bank_transfer')),
  safe_tx_hash     TEXT,
  bank_reference   TEXT,
  status           TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','confirmed')),
  recorded_by      TEXT NOT NULL REFERENCES users(id),
  created_at       INTEGER NOT NULL,
  confirmed_at     INTEGER,
  CHECK ((method = 'safe_tx' AND safe_tx_hash IS NOT NULL) OR (method = 'bank_transfer' AND bank_reference IS NOT NULL))
);

CREATE TABLE recurring_pledges (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id),
  campaign_id      TEXT NOT NULL REFERENCES campaigns(id),
  tier_id          TEXT REFERENCES campaign_tiers(id),
  amount_cents     INTEGER NOT NULL CHECK (amount_cents >= 100),
  day_of_month     INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 28),
  mode             TEXT NOT NULL DEFAULT 'reminder' CHECK (mode IN ('reminder','standing_order')),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  subscription_id  TEXT REFERENCES subscriptions(id),
  missed_count     INTEGER NOT NULL DEFAULT 0,
  next_reminder_at INTEGER,
  created_at       INTEGER NOT NULL,
  cancelled_at     INTEGER,
  updated_at       INTEGER NOT NULL
);
CREATE INDEX recurring_pledges_due ON recurring_pledges (status, next_reminder_at);

-- Faza 2 (samo UI) ------------------------------------------------------------

CREATE TABLE offers (
  id             TEXT PRIMARY KEY,
  campaign_id    TEXT NOT NULL REFERENCES campaigns(id),
  seller_user_id TEXT NOT NULL REFERENCES users(id),
  is_founder     INTEGER NOT NULL DEFAULT 0 CHECK (is_founder IN (0,1)),
  founder_status TEXT CHECK (founder_status IS NULL OR founder_status IN ('pending','accepted','rejected')),
  title          TEXT NOT NULL CHECK (length(title) <= 120),
  description    TEXT,
  mode           TEXT NOT NULL CHECK (mode IN ('buy_now','auction')),
  price_cents    INTEGER NOT NULL CHECK (price_cents >= 100),
  quantity       INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  delivery       TEXT NOT NULL CHECK (delivery IN ('in_person','post','email')),
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','sold','ended','cancelled')),
  ends_at        INTEGER,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE TABLE offer_bids (
  id           TEXT PRIMARY KEY,
  offer_id     TEXT NOT NULL REFERENCES offers(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  created_at   INTEGER NOT NULL
);

-- Moderacija, vanjsko, kontakt, obavijesti ------------------------------------

CREATE TABLE reports (
  id              TEXT PRIMARY KEY,
  target_type     TEXT NOT NULL CHECK (target_type IN ('campaign','comment','update','moneybox','offer','user','organization')),
  target_id       TEXT NOT NULL,
  reason          TEXT NOT NULL CHECK (reason IN ('fraud','illegal','hate','violence','privacy','intellectual_property','spam','other')),
  description     TEXT NOT NULL CHECK (length(description) BETWEEN 50 AND 500),
  reporter_user_id TEXT REFERENCES users(id),
  reporter_email  TEXT COLLATE NOCASE,
  phone           TEXT,
  attachment_file_id TEXT REFERENCES files(id),
  status          TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','in_review','decided','appealed','closed')),
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  CHECK (reporter_user_id IS NOT NULL OR reporter_email IS NOT NULL)
);
CREATE INDEX reports_target ON reports (target_type, target_id);
CREATE INDEX reports_status ON reports (status, created_at);

CREATE TABLE moderation_decisions (
  id            TEXT PRIMARY KEY,
  report_id     TEXT REFERENCES reports(id),     -- NULL = odluka po službenoj dužnosti
  target_type   TEXT NOT NULL,
  target_id     TEXT NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('no_action','hide_content','restrict_feature','block_campaign','suspend_account')),
  statement     TEXT NOT NULL,                   -- obrazloženje (DSA čl. 17)
  is_appeal     INTEGER NOT NULL DEFAULT 0 CHECK (is_appeal IN (0,1)),
  decided_by    TEXT NOT NULL REFERENCES users(id),
  decided_at    INTEGER NOT NULL
);

CREATE TABLE external_campaigns (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT NOT NULL REFERENCES organizations(id),
  platform         TEXT NOT NULL DEFAULT '4fund' CHECK (platform IN ('4fund')),
  external_id      TEXT NOT NULL,
  url              TEXT NOT NULL,
  title            TEXT NOT NULL CHECK (length(title) <= 120),
  image_url        TEXT,
  category_key     TEXT REFERENCES categories(key),
  verify_code      TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','removed')),
  verified_at      INTEGER,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  UNIQUE (platform, external_id)
);

CREATE TABLE contact_messages (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL CHECK (length(name) <= 255),
  email       TEXT NOT NULL COLLATE NOCASE,
  topic       TEXT NOT NULL CHECK (topic IN ('account_verification','campaign_verification','email_change','safe_or_account','account_block','report_abuse','offers','promotion','suggestion','other')),
  content     TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 5000),
  user_id     TEXT REFERENCES users(id),
  created_at  INTEGER NOT NULL
);

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id),
  email       TEXT NOT NULL COLLATE NOCASE,
  kind        TEXT NOT NULL CHECK (kind IN ('login_code','invite','contribution_received','contribution_thanks','moneybox_payment','campaign_comment','campaign_update','campaign_end','recurring_reminder','report_received','moderation_decision','refund_requested','refund_confirmed','verification_result')),
  payload     TEXT NOT NULL CHECK (json_valid(payload)),
  created_at  INTEGER NOT NULL,
  sent_at     INTEGER                          -- prototip: nikad, prikaz u /dev/posta
);
CREATE INDEX notifications_user ON notifications (user_id, created_at DESC);
```

## 0003_seed_reference.sql

```sql
INSERT INTO categories (key, sort, name_hr, name_en) VALUES
  ('charity',  1, 'Dobrotvorno', 'Charity'),
  ('culture',  2, 'Kultura',     'Culture'),
  ('projects', 3, 'Projekti',    'Projects'),
  ('needs',    4, 'Potrebe',     'Needs'),
  ('sport',    5, 'Sport',       'Sport'),
  ('animals',  6, 'Životinje',   'Animals'),
  ('travel',   7, 'Putovanja',   'Travel'),
  ('other',    8, 'Ostalo',      'Other');
```

## 0004_s6.sql

S6 (prijedlozi S5, odluke 507–509). Datoteka je izvor istine; ovdje su promjene sheme za provjeru nacrta.

- **`users.slug`** (nullable, UNIQUE djelomičnim indeksom): isti uzorak kao `organizations.slug` i ne smije
  izgledati kao UUID, jer `/hr/u/{slug}` prihvaća i `users.id`.
- **`campaign_settings.contributions_list`** (`visible` | `hidden`, zadano `visible`) umjesto
  `campaigns.metadata.contributions_list`; migracija prepisuje postojeće `hidden` i briše ključ iz `metadata`.
- **`campaign_follows`** se gradi iznova: `user_id` postaje nullable, dodani su `email` (neprijavljeni pratitelj),
  `token_hash` (SHA-256 tokena iz poveznice) i `confirmed_at` (potvrda poveznicom; prijavljeni = `created_at`).
  Primarni ključ `(user_id, campaign_id)` zamjenjuju djelomični UNIQUE indeksi.

```sql
ALTER TABLE users ADD COLUMN slug TEXT
  CHECK (slug IS NULL OR (slug NOT GLOB '*[^a-z0-9-]*' AND length(slug) BETWEEN 3 AND 40
                          AND slug NOT GLOB '????????-????-????-????-????????????'));
CREATE UNIQUE INDEX users_slug ON users (slug) WHERE slug IS NOT NULL;

ALTER TABLE campaign_settings ADD COLUMN contributions_list TEXT NOT NULL DEFAULT 'visible'
  CHECK (contributions_list IN ('visible','hidden'));

CREATE TABLE campaign_follows_s6 (
  user_id          TEXT REFERENCES users(id),
  email            TEXT COLLATE NOCASE,
  campaign_id      TEXT NOT NULL REFERENCES campaigns(id),
  notify_comments  INTEGER NOT NULL DEFAULT 0 CHECK (notify_comments IN (0,1)),
  notify_updates   INTEGER NOT NULL DEFAULT 0 CHECK (notify_updates IN (0,1)),
  notify_end       INTEGER NOT NULL DEFAULT 0 CHECK (notify_end IN (0,1)),
  token_hash       TEXT,
  confirmed_at     INTEGER,
  created_at       INTEGER NOT NULL,
  CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);
DROP TABLE campaign_follows;
ALTER TABLE campaign_follows_s6 RENAME TO campaign_follows;
CREATE UNIQUE INDEX campaign_follows_user ON campaign_follows (user_id, campaign_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX campaign_follows_email ON campaign_follows (email, campaign_id) WHERE user_id IS NULL;
CREATE UNIQUE INDEX campaign_follows_token ON campaign_follows (token_hash) WHERE token_hash IS NOT NULL;

CREATE INDEX one_time_codes_step_up ON one_time_codes (user_id, purpose, action, used_at);
CREATE INDEX sessions_user ON sessions (user_id, revoked_at);
```

Prijava (S6, `src/lib/sesija.ts`) koristi postojeće tablice: `one_time_codes` (kod: `code_hash = SHA-256("{id}:{kod}")`;
poveznica: zaseban red iste svrhe s `action = 'link'` i `code_hash = SHA-256(token)`; dodatna potvrda: `step_up` s
radnjom u `action`), `sessions.id = SHA-256(token iz kolačića)`, `login_events` s `/24` ili `/48` prefiksom,
`auth_identities` (`email_code`, `email_link`, `google` sa subjectom `mock-google:{e-pošta}`), `consents`
(`terms_privacy`, `newsletter`, verzija `uvjeti-2026-11`). Token pozivnice: `membership_invites.token_hash = SHA-256(token)`.

## 0007_s6_organizacija.sql

S6, organizacija i odobravanje (tok 2 i tok 3). Samo `ALTER TABLE ... ADD COLUMN`; 0001–0004 se ne mijenjaju.
Brojevi 0005 i 0006 rezervirani su za druge dijelove S6 (čarobnjak i upravljanje kampanjom), pa postoje samo ako
su ti dijelovi trebali shemu.

- **`campaign_settings.beneficiary_rejected_at` / `_by` / `_reason`**: organizacija odbija tuđu kampanju za sebe
  (`review → cancelled`, docs/05). Stanje `cancelled` dolazi iz jezgre; razlog (1–500 znakova u bazi, 10–500 u
  `src/lib/db/odobravanje.ts`) i tko je odbio nemaju drugo mjesto, jer `blocked_reason` pripada moderaciji i traži
  `blocked_at`. Odobrenje koristi postojeće `beneficiary_approved_at` / `_by`.
- **`organization_applications.representative`** (JSON, zadano `{}`): ono što zastupnik unese u koraku
  „zastupnik” (`ime`, `prezime`, `funkcija`, `ovlast`). Zastupnik je korisnik iz `submitted_by`.

```sql
ALTER TABLE campaign_settings ADD COLUMN beneficiary_rejected_at INTEGER;
ALTER TABLE campaign_settings ADD COLUMN beneficiary_rejected_by TEXT REFERENCES users(id);
ALTER TABLE campaign_settings ADD COLUMN beneficiary_rejected_reason TEXT
  CHECK (beneficiary_rejected_reason IS NULL OR length(beneficiary_rejected_reason) BETWEEN 1 AND 500);
ALTER TABLE organization_applications ADD COLUMN representative TEXT NOT NULL DEFAULT '{}'
  CHECK (json_valid(representative));
```

Organizacija (S6, `src/lib/db/{organizacija,clanovi,odobravanje}.ts`) inače koristi postojeće tablice:
`organizations` (`status`, `safe_address`, `safe_chain_id`, `is_fixed_beneficiary`), `organization_applications`
(`status`, `step`, `reason`), `verifications` (`org_kyb`, mock pružatelj), `memberships` (barem jedan `owner`),
`membership_invites` (7 dana, `token_hash = SHA-256(token)`, istek se računa iz `expires_at` bez zapisa) i
`external_campaigns` (kod vlasništva, mock provjera).

## 0008_s8_vanjske_ponavljanje.sql

S8, vanjska kampanja (tok 9, odluke 800–802) i ponavljanje (tok 10, odluka 14). 0001–0007 se ne mijenjaju.

- **`external_campaigns.description`** (1–300 znakova ili NULL): kratki opis koji organizator unosi ručno, jer s
  4funda ništa ne preuzimamo (odluka 800). Provjera u `src/lib/vanjske.ts` broji znakove, ne bajtove.
- **`recurring_reminders`**: jedan red po obećanju i mjesecu (`period` = `YYYY-MM`, UNIQUE s `pledge_id`, pa
  ponovljeno generiranje ne udvostručuje podsjetnik). Token iz poveznice `/hr/podsjetnik/{token}` se ne sprema,
  samo `token_hash = SHA-256(token)` (kao pozivnice); `expires_at` je rok poveznice. `checkout_id` nastaje tek kad
  podržavatelj klikne „Plati ovaj mjesec” (intent se ne stvara unaprijed), `notification_id` je mock e-poruka.
- **`notifications.campaign_id`**: mock pošta organizatora po kampanji (obavijest o novom doprinosu); podsjetnik
  podržavatelju je red s `user_id` i `kind = 'recurring_reminder'`. Prototip ništa ne šalje (`sent_at` NULL).

```sql
ALTER TABLE external_campaigns ADD COLUMN description TEXT
  CHECK (description IS NULL OR length(description) BETWEEN 1 AND 300);
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
ALTER TABLE notifications ADD COLUMN campaign_id TEXT REFERENCES campaigns(id);
CREATE INDEX notifications_campaign ON notifications (campaign_id, created_at DESC) WHERE campaign_id IS NOT NULL;
```

## 0009_s8_faza2.sql

S8 (agent B), ponude i aukcije kao UI faze 2 (odluka 8): obrazac `/hr/ponude/nova` sprema **nacrt** (`offers.status =
'draft'`), katalog `/hr/ponude` i stranica ponude `/hr/ponude/{offer}` čitaju aktivne ponude. Kupnje ni licitiranja
nema (fiskalizacija, DAC7), pa `offer_bids` puni samo seed. Samo `ALTER TABLE ... ADD COLUMN` i indeksi.

- **`offers.category`**: vlastitih 12 ključeva (`kids`, `fashion`, `books`, `art`, `home`, `tickets`, `autographs`,
  `sport`, `electronics`, `experiences`, `thanks`, `other`) po uzoru na ~15 kategorija 4fundova kataloga (javni
  pregled §8.3). Nisu `categories` kampanja: katalog ponuda filtrira po vrsti predmeta, a ne po namjeni kampanje.
- **`offers.item_condition`**: `new` / `used`, NULL za uslugu, doživljaj i digitalni sadržaj (javni pregled §3 „Polja
  ponude”).
- Za kupnju odmah `price_cents` je **najmanji iznos** (kupac smije dati više), za aukciju **početna cijena**;
  `ends_at` je kraj trajanja (obje vrste). Founder's Offer = `is_founder = 1`, `founder_status = 'pending'` dok
  organizator ne prihvati; ponuđač mora imati `person_kyc approved` (obilazak 23).

```sql
ALTER TABLE offers ADD COLUMN category TEXT
  CHECK (category IS NULL OR category IN ('kids','fashion','books','art','home','tickets','autographs','sport',
                                          'electronics','experiences','thanks','other'));
ALTER TABLE offers ADD COLUMN item_condition TEXT CHECK (item_condition IS NULL OR item_condition IN ('new','used'));
CREATE INDEX offers_status_created ON offers (status, created_at DESC);
CREATE INDEX offers_campaign ON offers (campaign_id, status);
CREATE INDEX offer_bids_offer ON offer_bids (offer_id, amount_cents DESC);
```

Razine podrške (`campaign_tiers`, ekskluzivne novosti `campaign_updates.tier_id`) i promocija ne traže shemu: razine
i novosti razine već postoje, a ekran promocije (`/hr/{id}/upravljanje/promocija`) ništa ne zapisuje (premium
fakturira ITalk, faza 2).

## Napomene za S4

- **Redoslijed:** `files` i `categories` moraju postojati prije `users` i `organizations`; u SQLiteu
  `REFERENCES` na tablicu koja još ne postoji prolazi pri `CREATE`, ali D1 migracija ide u jednoj
  transakciji, pa je redoslijed iznad dovoljan uz `PRAGMA foreign_keys` koji D1 drži uključenim.
- **Idempotentni upis doprinosa** ostaje na djelomičnim UNIQUE indeksima jezgre
  (`payment_intent_sid`, `monerium_order_id`); `webhook_receipts` je prva brana (`INSERT … ON CONFLICT
  DO NOTHING`, pa ako nije upisano, 200 bez obrade). Upis = jedan `db.batch([...])`.
- **`campaign_stats`** se računa u istom `batch`u kao promjena doprinosa (ne trigger), da test vidi
  jednu istinu; triggeri su opcija iz energy docs/19 §7.
- **Unix ms:** webhook `occurred_at` i `paid_at` (ISO) → `Date.parse`; rail `created_at` (s) × 1000.
- Provjera nacrta: SQL ovog dokumenta izvršen je u `sqlite3` nad minimalnim stubovima tablica jezgre
  (`scripts/provjera-docs.sh`, odluka 214); konačna provjera je `wrangler d1 migrations apply --local` u S4.
