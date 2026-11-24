-- GENERIRANO: ne uređivati ručno.
-- Izvor: @domovina/campaign-core `contract.CORE_TABLES` (odluka 200).
-- Obnova: npm run db:gen-core
CREATE TABLE campaigns (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  organizer_id TEXT NOT NULL REFERENCES organizers(id),
  slug TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('donation', 'membership', 'reward', 'tickets')),
  vertical TEXT NOT NULL CHECK (vertical IN ('none', 'energy', 'community')),
  title TEXT NOT NULL,
  description TEXT,
  goal_cents INTEGER,
  min_contribution_cents INTEGER,
  max_contributors INTEGER,
  currency TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('draft', 'review', 'active', 'funded', 'closed', 'cancelled')),
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'unlisted', 'public')),
  mode TEXT NOT NULL CHECK (mode IN ('integrated', 'byo')),
  rails TEXT NOT NULL CHECK (rails IN ('platform', 'client')),
  starts_at INTEGER,
  ends_at INTEGER,
  recurrence TEXT NOT NULL CHECK (recurrence IN ('none', 'monthly', 'quarterly', 'yearly')),
  cover_image_url TEXT,
  lat REAL,
  lng REAL,
  location_name TEXT,
  surplus_intent TEXT,
  demo INTEGER NOT NULL CHECK (demo IN (0, 1)),
  metadata TEXT NOT NULL CHECK (json_valid(metadata)),
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (id),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE campaign_safes (
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  owners TEXT NOT NULL CHECK (json_valid(owners)),
  platform_signer_count INTEGER NOT NULL,
  deployed_at INTEGER,
  verified_at INTEGER,
  PRIMARY KEY (campaign_id)
);

CREATE TABLE organizers (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  holder_type TEXT NOT NULL CHECK (holder_type IN ('association', 'cooperative', 'municipality', 'company', 'person', 'community')),
  legal_name TEXT NOT NULL,
  oib TEXT,
  address_line TEXT,
  city TEXT,
  postal_code TEXT,
  country_code TEXT NOT NULL,
  contact_email TEXT,
  is_platform INTEGER NOT NULL CHECK (is_platform IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE campaign_subjects (
  id TEXT NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  subject_type TEXT NOT NULL,
  subject_ref TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (campaign_id, subject_type, subject_ref)
);

CREATE TABLE campaign_tiers (
  id TEXT NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('reward', 'ticket', 'none')),
  price_cents INTEGER,
  inventory_total INTEGER,
  inventory_claimed INTEGER NOT NULL,
  unit TEXT,
  sort INTEGER NOT NULL,
  sale_start INTEGER,
  sale_end INTEGER,
  metadata TEXT NOT NULL CHECK (json_valid(metadata)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE budget_lines (
  id TEXT NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  sort INTEGER NOT NULL,
  label TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  is_contractor_margin INTEGER NOT NULL CHECK (is_contractor_margin IN (0, 1)),
  PRIMARY KEY (id)
);

CREATE TABLE milestones (
  id TEXT NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  sort INTEGER NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (campaign_id, key)
);

CREATE TABLE payouts (
  id TEXT NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  milestone_id TEXT REFERENCES milestones(id),
  amount_cents INTEGER NOT NULL,
  destination TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('requested', 'approved', 'submitted', 'confirmed', 'failed')),
  safe_tx_hash TEXT,
  tx_hash TEXT,
  requested_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE timeline_steps (
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  key TEXT NOT NULL,
  sort INTEGER NOT NULL,
  planned INTEGER,
  actual INTEGER,
  note TEXT,
  PRIMARY KEY (campaign_id, key)
);

CREATE TABLE campaign_documents (
  id TEXT NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  kind TEXT NOT NULL CHECK (kind IN ('site_right', 'statute', 'contractor_quote', 'grid_decision', 'contract', 'other')),
  label TEXT NOT NULL,
  url TEXT,
  issued_at INTEGER,
  PRIMARY KEY (id)
);

CREATE TABLE contributions (
  id TEXT NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  tier_id TEXT REFERENCES campaign_tiers(id),
  quantity INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  amount_received_cents INTEGER,
  currency TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'paid', 'failed', 'refunded', 'expired')),
  payment_rail TEXT NOT NULL CHECK (payment_rail IN ('sepa', 'onchain', 'card')),
  payment_intent_sid TEXT,
  monerium_order_id TEXT,
  tx_hash TEXT,
  log_index INTEGER,
  onchain_from TEXT,
  external_payment_ref TEXT,
  payer_iban_hash TEXT,
  underpaid INTEGER NOT NULL CHECK (underpaid IN (0, 1)),
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX contributions_payment_intent_sid_uq ON contributions (payment_intent_sid) WHERE payment_intent_sid IS NOT NULL;
CREATE UNIQUE INDEX contributions_monerium_order_id_uq ON contributions (monerium_order_id) WHERE monerium_order_id IS NOT NULL;
CREATE UNIQUE INDEX contributions_tx_hash_log_index_uq ON contributions (tx_hash, log_index) WHERE log_index IS NOT NULL;
CREATE UNIQUE INDEX contributions_payment_rail_external_payment_ref_uq ON contributions (payment_rail, external_payment_ref) WHERE external_payment_ref IS NOT NULL;

CREATE TABLE contribution_events (
  id INTEGER NOT NULL,
  contribution_id TEXT NOT NULL REFERENCES contributions(id),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE contribution_profiles (
  contribution_id TEXT NOT NULL REFERENCES contributions(id),
  anonymous INTEGER NOT NULL CHECK (anonymous IN (0, 1)),
  display_name TEXT,
  display_name_verified INTEGER NOT NULL CHECK (display_name_verified IN (0, 1)),
  message TEXT,
  message_hidden INTEGER NOT NULL CHECK (message_hidden IN (0, 1)),
  link_url TEXT,
  bank_verified INTEGER NOT NULL CHECK (bank_verified IN (0, 1)),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (contribution_id)
);

CREATE TABLE campaign_stats (
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  raised_cents INTEGER NOT NULL,
  contribution_count INTEGER NOT NULL,
  contributor_count INTEGER NOT NULL,
  last_contribution_at INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (campaign_id)
);

CREATE TABLE subscriptions (
  id TEXT NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  payer_iban_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled')),
  interval_days INTEGER,
  contribution_count INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  first_contribution_at INTEGER,
  last_contribution_at INTEGER,
  next_expected_at INTEGER,
  cancelled_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (id)
);
