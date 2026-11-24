# Mapa ponovne upotrebe: što već postoji u našim repoima (24. 11. 2026.)

Izvještaj Explore agenta nad `~/git/domovinatv/*` (pay.domovina.ai, campaign-core,
energy.domovina.ai, mpt-landing, zajedno.domovina.ai, domovina-api, Astro aplikacije).
Ostavljen na engleskom kako je nastao; zaključci su prevedeni u `docs/06-arhitektura.md`.

**Ukratko:** plaćanje se ne gradi ponovno (zove se MPT API kao tenant), D1 shema već je
opisana u `campaign-core` (nova platforma = koraci J2–J8 iz energy `docs/19`), a UI kod za
novac postoji u dvije kopije (energy `/beta`, mpt-landing `/support`) i treba ga izvući u
zajednički paket umjesto treće kopije.

## 1. pay.domovina.ai — MPT rail (live) → call as API
- Worker (Hono, TS) `backend/`, D1 `pay_domovina`, DO `INTENT_STREAM` (SSE). Hosts `api.mpt.hr`, `pay.mpt.hr`.
- `POST /v1/intents` (`sk_` server / `pk_` browser): `target_address, amount_eur, label, metadata, expires_in_seconds, return_url` (only `sk_`), `provider` → `sid`, `checkout_url`, `iban`, `epc_qr_data`, `hub3_data`, short reference.
- `GET /v1/intents/:sid`, `GET /v1/intents/:sid/stream` (SSE), `GET /v1/intents` (list, `sk_`), `GET /v1/intents/stats`.
- `GET /api/intents/campaign-qr?target=&id=&label=` — permanent campaign QR, no intent row; each payment → `contribution.sepa` webhook; campaign must be in `tenant_campaigns` (`POST /admin/api/tenants/:id/campaigns`).
- `GET /api/payers/:address` (payer tags, ADR 0029/0030), `/api/activity`, `/api/receipts`.
- Hosted checkout `GET /checkout/:sid` → back with `?mpt_sid=&mpt_status=` (UI hint only).
- Sandbox: `POST /api/sandbox/tenants` (`sbx-…`, `sk_test_`, `pk_test_`, `whsec_`), `GET /api/sandbox/me`, `PUT /api/sandbox/webhook`, `POST /api/intents/:sid/simulate {outcome}`.
- Intent states (`backend/src/intents/intentStates.ts`): `open, underpaid, paid, expired, late, underpaid_expired`.
- Webhooks (`backend/src/intents/outbound.ts`, `outbox.ts`, Standard Webhooks HMAC): `payment.received, intent.paid, payment.underpaid, payment.late, payment.rejected, contribution.sepa, forward.blocked`.
- Best single spec: `docs/integrations/sandbox-quickstart.md`; also `docs/reference/paid-on-confirmed-settlement.md`, `docs/state-machines.md`.
- ADRs: 0017 multi-tenant, 0021 mpt.hr/v1, 0022/0023 receipts, 0024 sandbox, 0026 ProjectRouter, 0027 setup dApp, 0028 short ref, 0029/0030 payer tags, 0031 PIS (proposed), 0032 multi-provider (Swan, inbox).
- Per-project Safe tooling: `tools/funding/` (`deploy-safe.mjs`, `deploy-roles.mjs`, `link-safe.mjs`, `router-scope.mjs`, `simulate-payment.mjs`), `docs/2026-10-11-funding-po-projektu.md`.
- **Plug-in:** platform = MPT tenant (`sbx-` for dev). Intents server-side with `sk_`. Own webhook receiver, dedupe on `webhook-id`, idempotent on `sid`. Each campaign Safe must be a `tenant_campaigns` row + ProjectRouter whitelist (ADR 0026) + setup dApp (ADR 0027). Never touch rail D1.

## 2. campaign-core (library v0.2.0) → reuse as library
- `npm i github:domovinatv/campaign-core#v0.2.0`; `src/sets.ts`, `types.ts`, `contract.ts`, `invariants.ts`, `mapping.ts`, `dbml.ts`, `schema.dbml`.
- 18 tables: campaign (`campaigns, organizers, campaign_safes, campaign_subjects, campaign_tiers`), delivery (`budget_lines, milestones, payouts, timeline_steps, campaign_documents`), contributions (`contributions, contribution_events, contribution_profiles, campaign_stats, subscriptions`), verticals (`campaign_energy, campaign_community, members`).
- Sets: type `donation|membership|reward|tickets`; state `draft→review→active→funded→closed|cancelled`; visibility `private|unlisted|public`; mode `integrated|byo`; payment_rail `sepa|onchain|card`; contribution `pending|paid|failed|refunded|expired`; payout `requested|approved|submitted|confirmed|failed`; recurrence `none|monthly|quarterly|yearly`; tier `reward|ticket|none`.
- Plan in `energy.domovina.ai/docs/19-podatkovna-jezgra-kampanje.md` §8–11: J1 done; J2 D1 migrations from `contract.ts`, J3 seed, J4 public read Worker, J5 ledger from webhook_outbox, J8 wizard. Decisions D1–D7 §10 (D2 separate D1+Worker, D5 no contributor accounts for now).

## 3. energy.domovina.ai (Next.js 16) → port lib, reference UI
- Mockups `app/(prototip)/` (`/`, `/karta`, `/projekt`, `/novi-projekt`); components `new-project-wizard.tsx`, `contribute-flow.tsx`, `fee-calculator.tsx`, `money-flow*.tsx`, `project-card/detail.tsx`.
- Live `app/beta/[slug]`, `app/beta/potvrda`, `app/beta/provjera`; sandbox `app/sandbox/[slug]` (tenant `italk-sandbox`, Chiado, `docs/17`).
- Libs: `lib/mpt-intent.ts`, `rail-profile.ts`, `safe-rpc.ts`, `beta-chain.ts`, `payer-tags.ts`, `pending-*.ts`, `receipt-*.ts`, `verify-pdf.ts`, `forbidden-words.ts` (copy says „doprinos”, never „ulaganje”), `fees.ts`; `components/beta/intent-panel.tsx`.
- Docs: `docs/10-reuse-mapa.md`, `03`, `04`, `05`, `14`, `16`, `18`, `19`.

## 4. mpt-landing (Next.js 16, OpenNext, mpt.hr) → reference, deduplicate
- `/[locale]/support` (+ `sandbox`, `potvrda`, `provjera`) = copy of energy `/beta` (`src/components/beta/*`, `src/lib/*`).
- Campaign Safes: `mpt-crowdfunding-prod` (Gnosis), `mpt-crowdfunding` (Chiado). First real payment: `docs/2026-11-10-prva-uplata-podrzi-mpt.md`.
- Pricing `src/lib/mpt-pricing.ts`: hosted free to €2,500/month, then 1 %; self-hosted free.

## 5. zajedno.domovina.ai (docs only) → spec input
- `docs/03-domenski-model.md` (Person, Organisation = MPT tenant with own KYB, Membership, Project with own Safe, Signer, Support = intent, Payment, Expense); `docs/04-tokovi.md`; `docs/05-zivotni-ciklus.md` (no all-or-nothing, money lands in Safe immediately); `docs/07-pravni-okvir.md`; `docs/11-certilia-identitet.md`.

## 6. pay.domovina-energy-sandbox → ignore (worktree of pay.domovina.ai)

## 7. domovina-api pinka_finance (Supabase) → map only via campaign-core `mapping.ts`
- `supabase/migrations/*pinka*` (~24); tokenization excluded by design.

## 8. Astro on Cloudflare already in use (Astro 7.x, @astrojs/cloudflare 14.x)
- **`domovina-ulaznice/web`** — closest template: `output: "server"`, SSR calls API Worker via service binding (`web/wrangler.jsonc`, `src/lib/api-ssr.ts`); API Worker `worker/` owns D1; has `web/TODO.md` + plan chain. (Pays via Stripe Connect.)
- `omm.domovina.ai` — Astro SSR + D1 in one Worker. `listici.domovina.ai` — SSR, imageService passthrough, avoids SESSION KV.
