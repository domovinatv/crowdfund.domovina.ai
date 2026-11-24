# campaign-core, zajedno i MPT: izvadak za domenski model crowdfunda (24. 11. 2026.)

Izvadak napravljen za specifikaciju D1/SQLite sheme crowdfund.domovina.ai. Sve je čitano
u izvornim repoima 24. 11. 2026. Putanje su apsolutne, a brojevi redaka odnose se na stanje
tog dana.

- campaign-core: `/Users/ms/git/domovinatv/campaign-core`, paket `@domovina/campaign-core` **v0.2.0**
  (tagovi v0.1.0, v0.1.1, v0.2.0). Zadnji commit je `0bc0069` (schema.dbml + PNG/SVG).
- energy docs/19 (izvor odluka za jezgru): `/Users/ms/git/domovinatv/energy.domovina.ai/docs/19-podatkovna-jezgra-kampanje.md`
- zajedno: `/Users/ms/git/domovinatv/zajedno.domovina.ai/docs/03|04|05-*.md`
- MPT: `/Users/ms/git/domovinatv/pay.domovina.ai` (`docs/integrations/sandbox-quickstart.md`, `docs/state-machines.md`, `backend/src/intents/*`)

---

## A. campaign-core: tablice, stupci, skupovi

### A.0 Konvencije (vrijede za svaku tablicu)

| pravilo | izvor |
|---|---|
| Skup = `TEXT` + `CHECK (x IN (…))`, nema ENUM-a; promjena skupa = migracija koja prepisuje tablicu | `src/sets.ts:1-9`, energy docs/19 §7 |
| Novac je u centima (`INTEGER`), vrijeme u **unix ms** (`INTEGER`) | `CLAUDE.md` pravilo 5 |
| JSON je `TEXT CHECK (json_valid(x))`, boolean je `INTEGER CHECK (x IN (0,1))` | `src/contract.ts:62-79` |
| ID je `TEXT` i generira ga Worker (UUIDv7) | energy docs/19 §7 |
| **Opis stupca nema polja `default`** (`Column` = sql, nullable, values, json, bool, pinka, ref, external, note). U ugovoru nijedan stupac nema DEFAULT, pa vrijednosti postavlja Worker. | `src/contract.ts:62-79` |
| FK-ovi postoje kao `ref` i u J2 postaju `REFERENCES`. `external` = pokazuje izvan baze (rail, lanac) i nije FK | `src/contract.ts:72-75` |
| Brisanje kampanje je soft delete (`deleted_at`); `ON DELETE CASCADE` samo za vertikalu | energy docs/19 §7 |
| `tenant_id` je u jezgri od prvog dana, jer se baza dijeli po tenantu | energy docs/19 §7 |
| Rail je izvor istine za novac, a knjiga doprinosa je projekcija koja se može ponovo izgraditi | `CLAUDE.md` pravilo 4 |
| Pravna granica: `tokenization`, `realestate`, `token_tranche`, pozicije i prinos **ne ulaze ni kao neaktivna vrijednost** | `CLAUDE.md` pravilo 1, `src/sets.ts:19-27` |

**Stanje J2 i J4:** migracije **ne postoje**. Repo nema `migrations/` ni `wrangler`.
Plan iz energy docs/19 §9 (r. 380-382) i §11.5 (r. 473-477):
- **J2:** `0001_core.sql` (jezgra) + `0002_energy.sql` (vertikala), izvedene iz `src/contract.ts`,
  plus test da je migrirana D1 shema jednaka opisu. „Gotovo kad” `wrangler d1 migrations apply --local`
  prođe, a `CHECK` odbije `tokenization`. Čeka zeleno svjetlo vlasnika.
- **J3:** seed tri beta elektrane.
- **J4:** Worker `campaign-core` s javnim `GET /campaigns`, `/campaigns/:slug` i `/campaigns/:slug/stats`
  kroz Cache API.
- D1 provodi FK. Triggeri `updated_at`, nepromjenjivi slug i `campaign_stats` mogu ostati triggeri (§7).
  `db.batch([...])` je atomaran, a interaktivnih transakcija nema.

### A.1 Jezgra i vertikale

`src/contract.ts:444-465`:
- `CORE_TABLES` (15 tablica, „ima je svaka kampanja”): campaigns, campaign_safes, organizers,
  campaign_subjects, campaign_tiers, budget_lines, milestones, payouts, timeline_steps,
  campaign_documents, contributions, contribution_events, contribution_profiles, campaign_stats,
  subscriptions.
- `VERTICAL_TABLES` (opcionalne, 1:1 ili 1:N uz kampanju): campaign_energy, campaign_community, members.

DBML grupe (`schema.dbml:484-511`) su **kampanja**, **isporuka**, **doprinosi** i **vertikale**.
Tablice su u `schema.dbml:149-454`, a veze (`Ref`) u r. 457-478.

### A.2 Stupci po tablicama

Legenda: NN = NOT NULL, N = nullable. Ni jedan stupac nema DEFAULT. Tip „skup” = TEXT + CHECK.

#### `campaigns` (`schema.dbml:149`, `contract.ts:111`), PK `id`, UNIQUE `(tenant_id, slug)`
| stupac | tip | null | FK / napomena |
|---|---|---|---|
| id | TEXT | PK | |
| tenant_id | TEXT | NN | external → pay.domovina.ai `tenants.id` |
| organizer_id | TEXT | NN | → organizers.id |
| slug | TEXT | NN | jedinstven po tenantu, nepromjenjiv nakon `active` |
| type | campaign_types | NN | |
| vertical | verticals | NN | |
| title | TEXT | NN | |
| description | TEXT | N | |
| goal_cents | INTEGER | N | |
| min_contribution_cents | INTEGER | N | |
| max_contributors | INTEGER | N | |
| currency | TEXT | NN | ISO 4217 |
| state | campaign_states | NN | os prikupljanja |
| visibility | visibilities | NN | |
| mode | campaign_modes | NN | integrated = Mod 1, byo = Mod 2 |
| rails | campaign_rails | NN | čiji su Monerium IBAN i Safe |
| starts_at, ends_at | INTEGER | N | unix ms |
| recurrence | recurrences | NN | |
| cover_image_url | TEXT | N | |
| lat, lng | REAL | N | |
| location_name | TEXT | N | |
| surplus_intent | TEXT | N | izjava o namjeni viška |
| demo | INTEGER bool | NN | |
| metadata | TEXT json | NN | „ništa o čemu ovisi novac” |
| created_by | TEXT | N | pinka `account_id` |
| created_at, updated_at | INTEGER | NN | |
| deleted_at | INTEGER | N | soft delete |

#### `organizers` (`schema.dbml:188`), PK `id`
| stupac | tip | null | napomena |
|---|---|---|---|
| id | TEXT | PK | pinka `organizer_records.account_id` |
| tenant_id | TEXT | NN | external → tenants.id |
| holder_type | holder_types | NN | |
| legal_name | TEXT | NN | |
| oib | TEXT | N | javan za pravne osobe; prikazuje se, ne pretražuje |
| address_line, city, postal_code | TEXT | N | |
| country_code | TEXT | NN | |
| contact_email | TEXT | N | |
| is_platform | INTEGER bool | NN | Mod 1 → objava sukoba interesa obavezna |
| created_at, updated_at | INTEGER | NN | |

#### `campaign_safes` (`schema.dbml:206`), PK `campaign_id` (1:1 → campaigns)
| stupac | tip | null | napomena |
|---|---|---|---|
| campaign_id | TEXT | PK | → campaigns.id |
| address | TEXT | NN | Safe na lancu |
| chain_id | INTEGER | NN | 100 Gnosis, 10200 Chiado |
| threshold | INTEGER | NN | M od M-od-N |
| owners | TEXT json | NN | niz adresa |
| platform_signer_count | INTEGER | NN | 2 × ovo ≤ threshold |
| deployed_at | INTEGER | N | |
| verified_at | INTEGER | N | zadnja provjera s lanca; bez nje nema uplata |

#### `campaign_subjects` (`schema.dbml:219`), PK `id`, UNIQUE `(campaign_id, subject_type, subject_ref)`
Stupci: `id` (TEXT, PK), `campaign_id` (TEXT, NN, → campaigns), `subject_type` (TEXT, NN),
`subject_ref` (TEXT, NN), `created_at` (INTEGER, NN). Polimorfna veza „na što se kampanja odnosi”, npr.
`plant:<id>`, `podcast_channel:<id>` ili `external:pinka:<id>`.

#### `campaign_tiers` (`schema.dbml:233`), PK `id`
| stupac | tip | null |
|---|---|---|
| id | TEXT | PK |
| campaign_id | TEXT | NN → campaigns |
| title | TEXT | NN |
| description | TEXT | N |
| kind | tier_kinds | NN |
| price_cents | INTEGER | N |
| inventory_total | INTEGER | N |
| inventory_claimed | INTEGER | NN (povećava ga upis doprinosa) |
| unit | TEXT | N |
| sort | INTEGER | NN |
| sale_start, sale_end | INTEGER | N |
| metadata | TEXT json | NN |
| created_at, updated_at | INTEGER | NN |

#### `budget_lines` (`schema.dbml:257`), PK `id`
`id` PK, `campaign_id` NN, `sort` INTEGER NN, `label` TEXT NN, `amount_cents` INTEGER NN,
`is_contractor_margin` bool NN. Razrada troška je javna **prije** uplate, a marža je zaseban red.

#### `milestones` (`schema.dbml:268`), PK `id`, UNIQUE `(campaign_id, key)`
`id` PK, `campaign_id` NN, `key` TEXT NN, `label` TEXT NN, `amount_cents` INTEGER NN, `sort` INTEGER NN.
Ovo je plan isplate; izvedba je `payouts`.

#### `payouts` (`schema.dbml:283`), PK `id`
| stupac | tip | null | FK |
|---|---|---|---|
| id | TEXT | PK | |
| campaign_id | TEXT | NN | → campaigns |
| milestone_id | TEXT | N | → milestones |
| amount_cents | INTEGER | NN | |
| destination | TEXT | NN | adresa primatelja |
| state | payout_states | NN | |
| safe_tx_hash | TEXT | N | prijedlog u Safeu |
| tx_hash | TEXT | N | |
| requested_by | TEXT | N | |
| created_at, updated_at | INTEGER | NN | |

#### `timeline_steps` (`schema.dbml:299`), PK `(campaign_id, key)`
`campaign_id` NN, `key` TEXT NN (ključeve određuje vertikala; **nema CHECK**, `ENERGY_TIMELINE_STEPS`
je samo konstanta), `sort` INTEGER NN, `planned` INTEGER N, `actual` INTEGER N, `note` TEXT N.

#### `campaign_documents` (`schema.dbml:314`), PK `id`
`id` PK, `campaign_id` NN, `kind` document_kinds NN, `label` TEXT NN, `url` TEXT N (NULL = nije priložen,
nikad placeholder), `issued_at` INTEGER N.

#### `contributions` (`schema.dbml:329`, `contract.ts:300`), PK `id`
| stupac | tip | null | napomena |
|---|---|---|---|
| id | TEXT | PK | |
| campaign_id | TEXT | NN | → campaigns |
| tier_id | TEXT | N | → campaign_tiers |
| quantity | INTEGER | NN | |
| amount_cents | INTEGER | NN | traženo |
| amount_received_cents | INTEGER | N | stiglo |
| currency | TEXT | NN | |
| state | contribution_states | NN | |
| payment_rail | payment_rails | NN | |
| payment_intent_sid | TEXT | N | external → rail `payment_intents.sid` |
| monerium_order_id | TEXT | N | |
| tx_hash | TEXT | N | pinka `forward_tx_hash` |
| log_index | INTEGER | N | |
| onchain_from | TEXT | N | |
| external_payment_ref | TEXT | N | |
| payer_iban_hash | TEXT | N | HMAC IBAN-a; sam IBAN se ne sprema |
| underpaid | INTEGER bool | NN | |
| created_at | INTEGER | NN | |
| paid_at | INTEGER | N | |
| updated_at | INTEGER | NN | |

Djelomični UNIQUE indeksi (idempotentni upis, **ne smiju se uklanjati**):
`(payment_intent_sid) WHERE … IS NOT NULL`, `(monerium_order_id) WHERE … IS NOT NULL`,
`(tx_hash, log_index) WHERE log_index IS NOT NULL` i
`(payment_rail, external_payment_ref) WHERE external_payment_ref IS NOT NULL`.

#### `contribution_events` (`schema.dbml:361`), PK `id` INTEGER (rastući)
`contribution_id` NN → contributions, `campaign_id` NN → campaigns, `event_type` TEXT NN (**slobodan
tekst, bez CHECK**), `payload` TEXT json NN, `created_at` NN. Tablica je samo za dodavanje: nikad
UPDATE ni DELETE.

#### `contribution_profiles` (`schema.dbml:372`), PK `contribution_id` (1:1)
`anonymous` bool NN, `display_name` TEXT N, `display_name_verified` bool NN (ime potvrđeno s banke),
`message` TEXT N, `message_hidden` bool NN, `link_url` TEXT N, `bank_verified` bool NN, `updated_at` NN.
Pinka stupci `link_preview`, `contributor_verified` i `identity_double_verified` nisu preneseni
(docs/19 §6.2).

#### `campaign_stats` (`schema.dbml:386`), PK `campaign_id` (1:1)
`raised_cents` NN, `contribution_count` NN, `contributor_count` NN, `last_contribution_at` N, `updated_at` NN.

#### `subscriptions` (`schema.dbml:397`), PK `id`
`campaign_id` NN → campaigns, `payer_iban_hash` TEXT NN, `status` subscription_statuses NN,
`interval_days` INTEGER N, `contribution_count` NN, `total_cents` NN, `first_contribution_at` N,
`last_contribution_at` N, `next_expected_at` N, `cancelled_at` N, `created_at` NN, `updated_at` NN.
Ponavljanje se prepoznaje **po HMAC-u IBAN-a**, ne po korisničkom računu.

#### Vertikale (opcionalne)
| tablica | stupci |
|---|---|
| `campaign_energy` (`schema.dbml:419`), PK `campaign_id` 1:1 | plant_id TEXT N · power_kw REAL NN · connections INTEGER NN · grid_status TEXT N · site_right site_rights NN · site_right_document_id TEXT N → campaign_documents · gnosis_node bool NN · contractor TEXT N |
| `campaign_community` (`:433`), PK `campaign_id` 1:1 | legal_form community_legal_forms NN · registration_state community_registration_states NN · statute_document_id TEXT N → campaign_documents |
| `members` (`:442`), PK `id` | campaign_id NN → campaigns · person_ref TEXT NN (osoba izvan baze) · role member_roles NN · share_basis_points INTEGER NN (10000 = 100 %, udio u energiji i glasu, nikad u dobiti) · joined_at NN |

### A.3 Skupovi (`src/sets.ts`), budući `CHECK`ovi

| konstanta (redak) | DBML enum | vrijednosti |
|---|---|---|
| `CAMPAIGN_TYPES` (19) | campaign_types | `donation`, `membership`, `reward`, `tickets` |
| `REJECTED_PINKA_CAMPAIGN_TYPES` (26) | — | `tokenization`, `realestate` (mapper ih odbija) |
| `REJECTED_PINKA_TIER_KINDS` (27) | — | `token_tranche` |
| `CAMPAIGN_STATES` (33) | campaign_states | `draft`, `review`, `active`, `funded`, `closed`, `cancelled` |
| `VISIBILITIES` (43) | visibilities | `private`, `unlisted`, `public` |
| `CAMPAIGN_MODES` (47) | campaign_modes | `integrated`, `byo` |
| `CAMPAIGN_RAILS` (51) | campaign_rails | `platform`, `client` |
| `VERTICALS` (55) | verticals | `none`, `energy`, `community` |
| `RECURRENCES` (58) | recurrences | `none`, `monthly`, `quarterly`, `yearly` |
| `HOLDER_TYPES` (62) | holder_types | `association`, `cooperative`, `municipality`, `company`, `person`, `community` |
| `TIER_KINDS` (72) | tier_kinds | `reward`, `ticket`, `none` |
| `PAYMENT_RAILS` (76) | payment_rails | `sepa`, `onchain`, `card` |
| `CONTRIBUTION_STATES` (80) | contribution_states | `pending`, `paid`, `failed`, `refunded`, `expired` |
| `PAYOUT_STATES` (84) | payout_states | `requested`, `approved`, `submitted`, `confirmed`, `failed` |
| `SUBSCRIPTION_STATUSES` (87) | subscription_statuses | `active`, `cancelled` |
| `DOCUMENT_KINDS` (91) | document_kinds | `site_right`, `statute`, `contractor_quote`, `grid_decision`, `contract`, `other` |
| `ENERGY_TIMELINE_STEPS` (102) | — (nije CHECK) | `submitted`, `funded`, `signed`, `ordered`, `mounted`, `connected` |
| `SITE_RIGHTS` (113) | site_rights | `owner`, `co_owner_consent`, `building_right`, `lease` |
| `COMMUNITY_LEGAL_FORMS` (117) | community_legal_forms | `association`, `cooperative`, `not_yet_registered` |
| `COMMUNITY_REGISTRATION_STATES` (120) | community_registration_states | `idea`, `preparing`, `filed`, `registered` |
| `MEMBER_ROLES` (123) | member_roles | `member`, `board`, `signer` |

Pomoćnik je `isOneOf(set, value)` (`sets.ts:126`). Redoslijed u nizu je redoslijed prikaza, ne
značenje. Novi član skupa traži odluku u energy docs/19 §6.

### A.4 Invarijante (`src/invariants.ts`) i mapiranje (`src/mapping.ts`)

| funkcija | pravilo |
|---|---|
| `isUsableAddress` | adresa mora biti valjan `0x…40` i ne smije biti nulta (nulta = spaljen novac) |
| `violatesConflictInvariant` | `platform_signer_count * 2 > threshold` → zabranjeno (P7: platforma nikad nema većinu potpisa) |
| `violatesModeSigners` | `mode = byo` ⇒ `platform_signer_count = 0` |
| `isValidThreshold` | `1 ≤ threshold ≤ owners.length` |
| `canAcceptContributions` | `state = active`, Safe postoji i adresa je upotrebljiva, prag je valjan, nema sukoba interesa i `verified_at` nije NULL |
| `currentDeliveryStep` | zadnji `timeline_steps` po `sort` koji ima `actual` |

Mapiranje (`mapping.ts:26-124`):
- pinka `crowdfund` → `reward`; `tokenization`, `realestate` i `token_tranche` vraćaju
  `{ok:false, reason}` (nikad tiho prevođenje).
- `review` ne postoji u pinki, pa se tamo prikazuje kao `draft`. `membership` nema pinka parnjak.
- Lanac: `gnosis` → 100, `chiado` → 10200.
- Stari energy model: `expired` → `closed`, a `building`/`completed` → `funded`.

Otvorena odluka **D5** (energy docs/19 §10): računi doprinositelja zasad **ne postoje**, a identitet je
`payer_iban_hash` ili adresa. D7: ulaze li pinka kampanje (slotovi, ulaznice) kasnije kao vertikale.
`auth.users` i `accounts` iz pinke u D1 nemaju parnjaka (§7).

---

## B. Što jezgra pokriva, a što 4fund-klon mora dodati

| koncept | campaign-core | ocjena i prijedlog za platformske tablice |
|---|---|---|
| korisnici (računi, prijava) | ✗ nema; `created_by` i `requested_by` su slobodan TEXT; D5 = „bez računa” | **nedostaje**: `users` (+ sesije ili passkey, OAuth). `campaigns.created_by` → users.id kao platformska veza |
| organizacije | ~ `organizers` (pravni nositelj, `holder_type`, OIB, adresa, `is_platform`) | djelomično. Nedostaju javni profil (logo, opis, slug), status verifikacije i veza na MPT tenant po organizaciji. Proširiti tablicom 1:1 `organizer_profiles` |
| članstva i uloge | ✗ (`members` je vertikala zajednice s udjelom u energiji, nije uloga na platformi) | **nedostaje**: `organizer_members(user_id, organizer_id, role)` i `campaign_collaborators`. Uzor: zajedno `CLANSTVO` s `UNIQUE(osoba, organizacija)` |
| verifikacija / KYC / KYB | ✗ (samo `contribution_profiles.bank_verified` i `display_name_verified`, a `campaign_safes.verified_at` znači verifikaciju Safea, ne osobe) | **nedostaje**: `verifications(subject, kind kyc/kyb, provider monerium/certilia, status, checked_at)`. KYB radi Monerium preko MPT tenanta |
| kategorije | ✗ | **nedostaje**: `categories` + `campaign_categories` (ili `category_id` u platformskoj tablici 1:1) |
| mediji (galerija, video) | ~ samo `cover_image_url`; `campaign_documents` su dokazi, ne galerija | **nedostaje**: `campaign_media(kind image/video/embed, url, sort)` |
| objave / novosti | ✗ (`timeline_steps` je isporuka s planom i ostvarenjem, ne blog) | **nedostaje**: `campaign_updates` |
| komentari | ~ `contribution_profiles.message` i `message_hidden` (poruka uz doprinos) | samostalni komentari **nedostaju**: `comments` s moderacijom |
| doprinosi i plaćanja | ✓ `contributions` (knjiga, idempotentni ključevi), `contribution_events`, `contribution_profiles`, `campaign_stats` | pokriveno. Platforma treba `checkout_sessions`/`payment_intents_local`: veza checkout → sid (i napojnica) prije nego što red doprinosa postoji |
| napojnica | ✗ | **nedostaje**. Po pravilu crowdfund repoa je napojnica zaseban intent, pa treba tablica `tips(sid, contribution_id?, amount_cents, state)` ili kampanja platforme kao primatelj |
| kasica (pod-kampanja koja uplaćuje u glavnu) | ✗ (`campaign_subjects` nije hijerarhija) | **nedostaje**: `moneyboxes(id, parent_campaign_id, owner_user_id, goal_cents, slug)`. Uplata ide na Safe **glavne** kampanje, a atribucija ide preko `metadata` intenta |
| tracking linkovi / referral | ✗ | **nedostaje**: `tracking_links(campaign_id, code, label)` + atribucija u `contributions` preko platformske tablice ili `metadata` intenta |
| ponude / aukcije | ✗ (tier je fiksna cijena) | **nedostaje**: `offers`, `bids`. Pazi na pravnu granicu (reward ≠ prinos) |
| razine nagrada | ✓ `campaign_tiers` (`kind` reward/ticket/none, zaliha, prodajni prozor) | pokriveno |
| pretplate / ponavljanje | ~ `campaigns.recurrence`, `subscriptions` (po `payer_iban_hash`, bez računa) | djelomično. SEPA nema pull, pa je ponavljanje samo prepoznato, ne naplaćeno. Platforma treba podsjetnike i vezu na korisnika |
| prijave zloupotrebe / moderacija | ✗ (`state = review` postoji, `message_hidden` postoji) | **nedostaje**: `abuse_reports`, `moderation_actions` |
| vanjske kampanje (link na drugu platformu) | ~ `campaign_subjects` s `external:<origin>:<id>` služi za projekcije pinke, ne za tuđe platforme | **nedostaje** kao koncept: `external_url` u platformskoj tablici 1:1 ili `subject_type = 'external'` |
| povrati | ~ `contribution_states.refunded`; MPT nema refund API (samo `payment.rejected`, kad Monerium vrati novac). Povrat je Safe transakcija (zajedno 05) | djelomično. Treba `refunds(contribution_id, safe_tx_hash, state)` ili `payouts` s odredištem na IBAN uplatitelja |
| oznake uplatitelja | ✗ u jezgri; MPT ima `GET /api/payers/:address` (opt-in `tenants.public_payer_tags`) | nije tablica, nego čitanje s raila. Najviše zastavica po kampanji |
| praćenje kampanje | ✗ | **nedostaje**: `campaign_follows(user_id, campaign_id)` |
| isplata | ✓ `payouts` + `milestones` (Safe prijedlog → potpisi → tx) | pokriveno. 4fund-ova „isplata s kodom” nije prenosiva, jer novac nikad nije kod platforme |
| sukob interesa, Safe, prag | ✓ `campaign_safes` + invarijante | pokriveno; 4fund to nema |

Zaključak: jezgra pokriva **kampanju, novac (projekciju), pakete i isporuku**. Sve što je
„društveno” ili „platformsko” (korisnici, uloge, verifikacija, kategorije, mediji, objave, komentari,
napojnica, kasica, referral, ponude, prijave, praćenje) treba ići u platformske tablice uz jezgru.
Vertikala je predviđena za specifičnu vrstu projekta, ne za platformske funkcije, pa novi stupci u
`campaigns` nisu potrebni. Iznimka je proširenje `CAMPAIGN_TYPES` ili `HOLDER_TYPES`, koje traži
odluku u energy docs/19 §6 i novu verziju paketa.

Usklađivanje stanja: `contribution_states` (`pending`, `paid`, `failed`, `refunded`, `expired`) nema
`underpaid` ni `late`. Rail za to ima zastavicu `contributions.underpaid` i `paid_at`, pa platforma
logičko stanje intenta mora preslikati (vidi D.3).

---

## C. zajedno.domovina.ai 03/04/05: struktura i konvencije

| doc | sadržaj | konvencija vrijedna kopiranja |
|---|---|---|
| `docs/03-domenski-model.md` (114 r.) | uvodni odlomak s glavnom tezom („podrška visi na osobi i projektu, članstvo je kontekst”), zatim **tablica entiteta** sa stupcima `Entitet \| Kardinalnost \| Značenje \| U MPT railu`, numerirana **Ograničenja** (1–5, npr. „saldo projekta je saldo Safea, baza ga čita i kešira”, „`UNIQUE(osoba_id, organizacija_id)`”), bilješka o planiranim entitetima koji „još nisu u dijagramu” te **mermaid `erDiagram`** | stupac „U MPT railu” uz svaki entitet. ER kardinalnosti s hrvatskim oznakama (`"član je u (0..N)"`), entiteti VELIKIM SLOVIMA bez dijakritika (`OSOBA`, `PODRSKA`, `TROSAK`), atributi `tip ime PK/FK "komentar"`, enumi kao `enum vrsta "zupa, skola, …"` |
| `docs/04-tokovi.md` (78 r.) | tri toka (organizacija otvara projekt, podrška, trošenje), svaki je odlomak + **`sequenceDiagram`** | `actor` za ljude, `participant` s kraticom (`MPT`, `MON`, `S`). Poruke nose stvarni endpoint (`POST /api/intents (iznos, kampanja)`). U porukama nema `;` (u sequenceDiagramu je to kraj naredbe; koristi zarez ili `#59;`) |
| `docs/05-zivotni-ciklus.md` (44 r.) | **`stateDiagram-v2`** za projekt i podršku, uz rečenicu „stanja podrške preslikavaju stanja MPT intenta (`pay.domovina.ai/docs/state-machines.md`)” | stanja su CamelCase bez dijakritika (`CiljDosegnut`, `RokIstekao`, `RucnoUparena`), a prijelaz nosi okidač (`Otvoren --> CiljDosegnut: saldo Safea >= cilj`) |

**Veza s campaign-core:** zajedno 03/04/05 **ne spominju** campaign-core (grep prazan) i koriste
vlastiti model (`PROJEKT`, `PODRSKA`, `UPLATA`, `TROSAK`) s `decimal cilj_eur`, a ne s centima.
Konceptualno odgovaraju ovome:

| zajedno | campaign-core | MPT |
|---|---|---|
| PROJEKT | campaigns + campaign_safes | kampanja na railu (`tenant_campaigns`) |
| POTPISNIK | campaign_safes.owners | — |
| PODRSKA | contributions (+ profiles) | payment intent `sid` + `short_ref` |
| UPLATA | contributions.monerium_order_id, tx_hash | Monerium order + EURe tx |
| TROSAK | payouts | Safe tx (redeem) |
| ORGANIZACIJA | organizers | MPT tenant (KYB) |

Zajedno model podrške (`Kreirana → Primljena → Placena`, `Kreirana → Istekla`, `RucnoUparena`,
`Placena → Vracena`) korisno je preslikati na intent stanja iz D.3.

**Validacija mermaida** (zajedno `CLAUDE.md`, „Pravila”): repo nema build, pa se prije commita
dijagrami parsiraju mermaidom iz `stadion-maksimir-natjecaj-2026/web/node_modules` uz `jsdom` u
privremenoj mapi. Skripta je u
`/Users/ms/git/stadion-maksimir/stadion-maksimir-natjecaj-2026/docs/2026-09-25-regresijske-provjere.md:157-167`
(u CLAUDE.md zajedna put nema prefiks `stadion-maksimir/`):

```js
// node check-mermaid.mjs $(grep -rl '```mermaid' docs research *.md)   — jsdom instaliraj u privremenu mapu
import fs from "fs"; import { JSDOM } from "jsdom";
const w = new JSDOM("").window; globalThis.window = w; globalThis.document = w.document;
const { default: mermaid } = await import("<repo>/web/node_modules/mermaid/dist/mermaid.core.mjs");
for (const f of process.argv.slice(2))
  for (const [i, b] of [...fs.readFileSync(f, "utf8").matchAll(/```mermaid\n([\s\S]*?)```/g)].entries())
    await mermaid.parse(b[1]).catch((e) => console.log(f, i, e.message.split("\n")[0]));
```

`mermaid.core.mjs` postoji na
`/Users/ms/git/stadion-maksimir/stadion-maksimir-natjecaj-2026/web/node_modules/mermaid/dist/mermaid.core.mjs`.
`jsdom` je potreban jer flowcharti trebaju DOMPurify; bez `window` parse javlja lažnu grešku
„DOMPurify.addHook is not a function”.

campaign-core koristi drugi alat za ER: `schema.dbml`, generiran iz `contract.ts`
(`npm run dbml`, test ruši build pri razilaženju), i prikaz u open-diagramu s pogledima
`jezgra`, `novac` i `vertikale`.

---

## D. MPT (pay.domovina.ai): intent API, stanja, webhookovi

### D.1 Hostovi i autentikacija
- `MPT_API_URL` = `https://mpt.domovina.ai`, uz kasniji trajni alias `https://api.mpt.hr` (ADR 0021).
  Isti handleri su na `/api/intents` i `/v1/intents` (`backend/src/index.ts:254-256`).
- Ključ se šalje kao `authorization: Bearer <key>` ili `x-mpt-key: <key>`
  (`backend/src/tenants/auth.ts:32-41`). Ključevi su `sk_…`/`pk_…` (produkcija) i `sk_test_…`/`pk_test_…`
  (sandbox). `pk_` je javan, a `return_url` i popis intenta traže **secret** ključ.
- Sandbox tenant: `POST /api/sandbox/tenants` `{name, webhook_url?}` → `tenant_id` (`sbx-…`),
  `secret_key`, `public_key`, `webhook_secret` (`whsec_…`), `demo_target_address`, `expires_at`.
  Ključevi se pokazuju **jednom**. Webhook se mijenja kroz `PUT /api/sandbox/webhook`
  `{webhook_url, rotate_secret}`. Ograničenja: 5 tenanta po IP-u na dan, a tenant istječe nakon
  90 dana neaktivnosti.

### D.2 Endpointi intenta (`backend/src/intents/api.ts`)

| metoda i put | svrha |
|---|---|
| `POST /api/intents` | kreira intent |
| `GET /api/intents/:sid` | status (polling, sid je capability) |
| `GET /api/intents/:sid/stream` | SSE status (kad je `INTENT_SSE=1`) |
| `GET /api/intents?state=paid&limit=50` | popis vlastitih intenta, najnoviji prvi, `next_cursor`/`has_more` (samo secret) |
| `GET /api/intents/stats?created_from=…` | zbrojevi po ishodu: `paid`, `late`, `underpaid`, `pending`, `expired` (samo secret) |
| `GET /api/intents/campaign-qr?target=0x…&id=<campaignId>&label=&amount=` | **trajni QR kampanje** (`cmp:` protokol), bez reda u bazi. Kampanja mora biti registrirana u `tenant_campaigns` (admin `POST /admin/api/tenants/:id/campaigns`), a `id` ~ `^[A-Za-z0-9_-]{6,64}$`. Vraća `memo = cmp:<safe>?id=<id>`, `epc_qr_data`, `iban`, `bic`, `beneficiary_name`, a `amount` je samo prefill |
| `POST /api/intents/:sid/simulate` | samo sandbox (D.6) |
| `POST /api/intents/:sid/receipt-intent` | potvrda o uplati (ADR 0022) |
| `GET /api/payers/:address` | javne oznake uplatitelja (D.7) |
| `GET /checkout/:sid` | hostani checkout |

**Tijelo `POST /api/intents`** (`CreateIntentBody`, `api.ts:59-75`):

| polje | tip | pravilo |
|---|---|---|
| `target_address` | string | `0x…40`. U direct modu mora biti registrirani Safe kampanje tenanta (`target_not_campaign` 403), inače mora biti na whitelisti (`target_not_whitelisted` 403). Fiat provider ga ignorira |
| `amount_eur` | string \| number | `"9.90"`. U bazi postaje `amount_cents`; mora biti > 0 i ≤ `MAX_AMOUNT_CENTS = 1_000_000` (10.000 €) |
| `label` | string? | opis za admin i checkout |
| `metadata` | object? | slobodan JSON (`metadata_json`). Vraća se u odgovoru i **u webhookovima `intent.paid`, `payment.late` i `payment.underpaid`** |
| `expires_in_seconds` | number? | zadano 900 (15 min), raspon 60 do 86.400 |
| `sid` | string? | ID koji zadaje klijent, `^[A-Za-z0-9_-]{6,32}$` (≤ 32 jer ide on-chain kao bytes32) |
| `return_url` | string? | samo sa secret ključem i samo https (u sandboxu je dopušten localhost). Povratak nosi `?mpt_sid=&mpt_status=paid\|expired\|cancelled`, a to je samo nagovještaj za UI |
| `provider` | string? | `monerium` \| `swan` (migracija 0035), zadano je ono što tenant ima |

**Idempotentnost kreiranja:** nema `Idempotency-Key` headera. Idempotentnost daje **sid koji zadaje
klijent**: duplikat vraća `409 {error:"sid_already_exists"}`, a druge greške vraćaju 500 (klijent
ponavlja). Bez sida server generira jedinstven sid. Ostale greške: `invalid_amount_eur`,
`amount_out_of_range`, `invalid_sid`, `too_many_open_intents` (429, SR-01 kapica za javni ključ na
nepouzdanom odredištu), `return_url_requires_secret_key`, `provider_not_available`.

**Odgovor** (`intentResponseJson`, `api.ts:445-497`): `sid`, `state`, `amount_eur`, `amount_cents`,
`currency`, `provider`, `target_address`, `label`, `metadata`, `memo`, `iban`, `beneficiary_name`,
`bic`, `epc_qr_data`, `hub3_data`, `tenant_id`, `checkout_url`, `status_url`, `status_stream_url`,
`created_at`, `expires_at`, `paid_at` (ISO), `monerium_order_id`, `forward_tx_hash`,
`amount_received_cents`, `return_url`, `short_ref` i `status` (faza checkouta iz `computeStage`).
Sandbox dodaje `sandbox: true` i `simulate_url`, a `iban`, `epc_qr_data` i `hub3_data` su `null`.

**Referenca (memo):** `mpt:<target>?sid=<sid>` u forward modu, `<chain>:<target> sid:<sid>` u direct
modu i `sid:<sid>` za Swan (`tenants/rail.ts:261-294`). Trajni QR kampanje je `cmp:<safe>?id=<campaignId>`.
**`short_ref`** (ADR 0028) ima 3 znamenke + 1 kontrolnu (npr. `0071`), jedinstven je među živim
intentima tenanta i služi kad Revolut ispusti opis. **Iznos nikad ne nosi identitet** (ADR 0028,
„Odbačeno: mijenjanje iznosa”).

Rail tablica `payment_intents` (`backend/migrations/0007_payment_intents.sql:13`): `sid` PK,
`target_address`, `amount_cents`, `currency` DEFAULT `'eur'`, `label`, `metadata_json`, `state`
(`pending|paid|expired`), `created_at`, `expires_at`, `paid_at`, `monerium_order_id`, `forward_id`,
`forward_tx_hash`, `amount_received_cents`, a kasnije i `tenant_id`, `short_ref`, `return_url` i
`provider`. **Vrijeme u railu je u unix sekundama**, campaign-core koristi unix ms, a webhookovi i
odgovori nose ISO stringove. Konverzija je na platformi.

### D.3 Stanja intenta (`backend/src/intents/intentStates.ts:11-52`, `docs/state-machines.md:84-118`)

DB `state` ima tri vrijednosti (`pending`, `paid`, `expired`). Zajedno s `monerium_order_id` i
`paid_at` one daju šest **logičkih** stanja (`logicalIntentState`):

| logičko | DB | terminalno | značenje |
|---|---|---|---|
| `open` | `pending`, bez ordera | ne | čeka uplatu |
| `underpaid` | `pending`, s orderom | ne | stiglo manje od traženog (BW-01) → `payment.underpaid` |
| `paid` | `paid` | da | plaćeno u cijelosti (preplata je i dalje `paid`, uz `overpaid_cents` > 0) |
| `expired` | `expired`, bez ordera | **ne** | isteklo bez uplate |
| `late` | `expired`, s orderom i `paid_at` | da | stiglo nakon isteka → `payment.late` |
| `underpaid_expired` | `expired`, s orderom, bez `paid_at` | da | manje od traženog, pa isteklo |

Prijelazi (`INTENT_TRANSITIONS`): `[*] → open` (`POST /api/intents`), `open → paid` (`settle_full`),
`underpaid → paid` (`settle_full`), `open → underpaid` (`settle_short`), `open → expired` (`ttl_sweep`),
`underpaid → underpaid_expired` (`ttl_sweep`), `expired → late` (`settle_late`).
Faza na checkoutu (`awaiting_payment` … `settled`) nije spremljeno stanje; računa je `computeStage`.

Prijedlog preslikavanja na `contribution_states`: open → `pending`; paid → `paid`; late → `paid`
(ako platforma prima kasni novac, inače se odluka bilježi); underpaid → `pending` + `underpaid=1`;
underpaid_expired → `paid` ili `failed` + `underpaid=1` (novac **jest** na Safeu, `funds_location:
recipient`); expired → `expired`; `payment.rejected` → `failed`; `refunded` je samo platformski
(Safe povrat). Ovo preslikavanje treba potvrditi odlukom.

### D.4 Webhook događaji (`backend/src/intents/outbound.ts:7-35`)

| `type` | `webhook-id` | kad | posebna polja payloada |
|---|---|---|---|
| `payment.received` | `rcv_<orderId>` | Monerium drži SEPA sredstva (~1 s); „autorizacija”, smije se prikazati „plaćeno” | `sid`, `campaign_id`, `monerium_order_id`, `amount_received_cents`, `currency`, `funds_location:"monerium"`, `settlement:"pending"`, `review_expected` (prva uplata s novog IBAN-a ide na ručni pregled, 1 min do 8 h) |
| `intent.paid` | `int_<sid>` | EURe mintan, proslijeđen i potvrđen on-chain | settled polja (ispod) |
| `payment.late` | `late_<sid>` | isto kao `intent.paid`, ali intent je već istekao | settled polja |
| `payment.underpaid` | `undp_<sid>` | settled za manje od traženog; nikad `intent.paid` | settled polja + `expected_cents`, `received_cents`, `delta_cents`, `funds_location:"recipient"` |
| `payment.rejected` | `rej_<orderId>` | Monerium odbio nalog, novac se vraća uplatitelju | `sid`, `campaign_id`, `monerium_order_id`, `amount_received_cents`, `currency`, `reason`, `funds_location:"returned_to_payer"` |
| `contribution.sepa` | `cmp_<orderId>` | uplata na **trajni QR kampanje** (`cmp:`), bez intenta; svaka uplata je zaseban doprinos | `campaign_id`, `monerium_order_id`, `amount_received_cents`, `currency`, `target_address`, `forward_tx_hash`, `sender_iban`, `sender_name` |
| `forward.blocked` | `blk_<orderId>` | whitelist odbio odredište; novac stoji u MPT Safeu | `reason`, `monerium_order_id`, `sid`, `campaign_id`, `target_address`, `amount_cents`, `tenant_id`, `funds_location:"mpt_safe"` (bez PII) |

Svaki payload ima `type`, `event_id` (= webhook-id) i `occurred_at` (ISO).
**Settled polja** (`settledIntentFields`, `outbound.ts:109-134`): `sid`, `state`, `amount_cents`,
`amount_received_cents`, `overpaid_cents`, `currency`, `target_address`, `monerium_order_id`,
`forward_tx_hash`, `paid_at`, `sender_iban`, `sender_name` (PII, **ne smije se javno izložiti**;
služi za izvođenje `bank_verified` i podudaranja imena) i `metadata` (ono što je poslano pri kreiranju).

Simulacija u sandboxu (`sandbox-quickstart.md` §3):

| `outcome` | događaji | DB `state` |
|---|---|---|
| `paid` (zadano) | `payment.received` → `intent.paid` | `paid` |
| `received` | `payment.received` | `pending` |
| `underpaid` | `payment.received` → `payment.underpaid` (1 € manje, ili `amount_eur`) | `pending` |
| `late` | `payment.received` → `payment.late` | `expired` |
| `rejected` | `payment.received` → `payment.rejected` | `pending` |

### D.5 Potpis, isporuka, idempotentnost

- **Standard Webhooks (svix)**. Headeri su `webhook-id`, `webhook-timestamp` (unix s) i
  `webhook-signature: v1,<base64>`.
- Potpis je `base64(HMAC-SHA256(key, "${webhook-id}.${webhook-timestamp}.${rawBody}"))`, a `key` je
  base64-dekodirani dio iza `whsec_` (`outbox.ts:250-266`). Potpis se računa pri slanju sa svježim
  timestampom, a primatelj odbija timestamp izvan tolerancije.
- Isporuka ide kroz trajni `webhook_outbox` (PK = webhook-id, pa je ponovljeni enqueue no-op).
  Odmah ide jedan pokušaj, zatim retry na `RETRY_DELAYS_S = [60, 300, 900, 3600, 3h, 6h, 12h, 24h]`,
  što je 9 pokušaja u ~47 h. 2xx = isporučeno; 408, 429, 5xx i mrežna greška = retry; ostali 4xx =
  odmah `failed` + alarm. Timeout je 10 s.
- **Primatelj deduplicira na `webhook-id`**, a upis mora biti idempotentan i na `sid`
  (`contributions.payment_intent_sid` UNIQUE) te na `monerium_order_id` (za `contribution.sepa`).
- Pravilo: doprinos se odobrava **samo iz webhooka ili iz statusa koji je platforma sama pročitala**,
  nikad iz `mpt_status` u `return_url`.

### D.6 Simulate
`POST /api/intents/:sid/simulate` (`backend/src/sandbox/api.ts:178`) s tijelom
`{"outcome":"paid|received|underpaid|late|rejected","amount_eur"?}`. Ne treba ključ (sid je
capability) i radi samo za sandbox tenant (inače `intent_not_found` 404). Najviše
`SIM_PER_TENANT_PER_DAY = 100` simulacija dnevno (429 `rate_limited`) i jedan settlement po intentu.
Odgovor: `{ok, outcome, simulated_order_id, sid, …}`.

### D.7 Oznake uplatitelja (`backend/src/payers/api.ts`, ADR 0029)
`GET /api/payers/:address` vraća do 50 `PayerTag` zapisa: `initials` („M. S.”, pravni oblici poput
d.o.o. se preskaču), `iban_last4`, `amount_cents`, `received_at` (ISO, Monerium `placedAt`),
`state` (`received` \| `minted`), `tx_hashes[]` i `ref` (prvih 16 hex znakova SHA-256(sid), da
uplatiteljev preglednik prepozna svoj red bez objave sida). Uključuje se po tenantu
(`tenants.public_payer_tags`, migracija 0032, zadano 0) i ide kroz edge cache (`max-age=5`).
Puno ime, IBAN i sid ne napuštaju rail.

### D.8 Posljedice za crowdfund shemu
1. **Dva načina uplate:** intent po doprinosu (`POST /api/intents` → `intent.paid`, ključ je `sid`)
   i trajni QR kampanje (`campaign-qr` → `contribution.sepa`, ključ je `monerium_order_id`). Kampanja
   mora biti registrirana u railu (`tenant_campaigns`: `campaign_id` PK, `tenant_id`, `safe_address`,
   `label`, `created_at`, `created_by`, `revoked_at`), a `campaigns.id` jezgre treba odgovarati
   `^[A-Za-z0-9_-]{6,64}$`.
2. **Metadata nosi atribuciju** (moneybox, tracking link, tier, napojnica: da/ne, user_id), jer se
   vraća u webhooku. Identitet ne smije ići u iznos.
3. **Napojnica = drugi intent** (drugi sid), a sidove doprinosa i napojnice veže platformska tablica
   checkouta.
4. `sender_iban` → odmah HMAC u `payer_iban_hash`; `sender_name` → `display_name_verified` /
   `bank_verified` u `contribution_profiles`. Sirovi IBAN se ne sprema.
5. Rail nema refund API. Povrat je Safe transakcija organizatora (zajedno 05), a platforma ga samo
   bilježi.
