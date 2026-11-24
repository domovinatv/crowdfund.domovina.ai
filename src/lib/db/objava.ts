/**
 * „Objavi” iz čarobnjaka (docs/04 §3, docs/05 §Kampanja, odluke 8, 18, 201, 203, 211, 212).
 *
 * Pravila:
 * - obavezna polja nacrta (`nedostaje`);
 * - u ime organizacije: uloga ≥ admin i organizacija `active` (KYB odobren, faza 1 = pravne osobe);
 * - za tuđu organizaciju (Fixed Beneficiary): samo prijava; kampanja ide u `review` dok je organizacija ne odobri
 *   (odobravanje je `org.approvals`); admin te organizacije objavljuje odmah (`active`, odobreno njime);
 * - osobno (fizička osoba, „nije u fazi 1”): verificirana osoba (`person_kyc approved`); organizacija
 *   `kind = personal`, `legal_form = osoba` nastaje pri prvoj objavi (odluka 201);
 * - prag 5.000 € / 12.500 € (`pragovi.ts`) → `verifications(campaign_purpose, requested)`, zastava, ne blokada.
 *
 * MPT registracija kampanje je S7: ovdje je mock (Safe organizacije se upisuje, `verified_at` = sada za `active`).
 */
import type { Korisnik } from "../sesija";
import { pragVerifikacije, zbrojAktivnihCiljeva, ROK_DOKAZA, type OkidacPraga } from "./pragovi";
import {
  NASLOV_MIN,
  OPIS_MIN,
  TEMA_KATEGORIJE,
  duljinaOpisa,
  krajDana,
  zabranjeneRijeci,
  zatvoriNacrt,
  type Nacrt,
} from "./nacrti";
import { uuid7 } from "./zajednicko";

/** Jedan MPT tenant platforme (odluka 203); isti kao seed. S7 ga čita iz okoline. */
export const TENANT = "sbx-crowdfund-demo";
/** Chiado (testna mreža) za mock Safe dok ga organizacija nema (S7: setup dApp). */
export const MOCK_LANAC = 10200;

const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";

/** Javni ID kampanje: 6 znakova Crockford base32, mala slova (odluka 212). */
export function noviJavniId(): string {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return [...b].map((x) => CROCKFORD[x & 31]).join("");
}

/** Slug jezgre iz naslova (kao seed): ASCII, crtice, ≤ 60. */
export function slugIzNaslova(s: string): string {
  const t = s
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "");
  return t || "kampanja";
}

/** Mock Safe adresa (`0xde5afe…` kao seed, odluka 405), slučajni ostatak. */
export function mockSafeAdresa(): string {
  const b = new Uint8Array(17);
  crypto.getRandomValues(b);
  return `0xde5afe${[...b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export interface MojaOrganizacija {
  id: string;
  slug: string;
  naziv: string;
  status: "pending" | "active" | "suspended" | "closed";
  uloga: "admin" | "owner";
}

/** Moje pravne organizacije s ulogom ≥ admin (izbor „u ime organizacije”). */
export async function mojeOrganizacijeZaObjavu(db: D1Database, userId: string): Promise<MojaOrganizacija[]> {
  const { results } = await db
    .prepare(
      `SELECT o.id, o.slug, o.display_name AS naziv, o.status, m.role AS uloga
         FROM memberships m JOIN organizations o ON o.id = m.organization_id
        WHERE m.user_id = ? AND m.role IN ('admin','owner') AND o.deleted_at IS NULL AND o.kind = 'legal'
        ORDER BY o.display_name`,
    )
    .bind(userId)
    .all<MojaOrganizacija>();
  return results;
}

export interface Primatelj {
  id: string;
  slug: string;
  naziv: string;
}

/** Organizacije koje primaju kampanje drugih (Fixed Beneficiary, `active`). */
export async function primatelji(db: D1Database): Promise<Primatelj[]> {
  const { results } = await db
    .prepare(
      `SELECT id, slug, display_name AS naziv FROM organizations
        WHERE is_fixed_beneficiary = 1 AND status = 'active' AND deleted_at IS NULL ORDER BY display_name`,
    )
    .all<Primatelj>();
  return results;
}

/** Ima li korisnik odobrenu verifikaciju osobe (zadnja `person_kyc` je `approved`). */
export async function osobaVerificirana(db: D1Database, userId: string): Promise<boolean> {
  const r = await db
    .prepare(
      `SELECT status FROM verifications WHERE kind = 'person_kyc' AND subject_type = 'user' AND subject_id = ?
        ORDER BY requested_at DESC LIMIT 1`,
    )
    .bind(userId)
    .first<{ status: string }>();
  return r?.status === "approved";
}

export type Nedostaje =
  | "vrsta"
  | "kategorija"
  | "naslov"
  | "cilj"
  | "organizacija"
  | "tema"
  | "opis"
  | "zabranjeno";

/** Što nacrtu nedostaje za objavu (popis u pregledu, docs/08 `CampaignPreview`). */
export function nedostaje(n: Nacrt): Nedostaje[] {
  const out: Nedostaje[] = [];
  if (!n.vrsta) out.push("vrsta");
  if (n.vrsta !== "for_organization" && !n.kategorija) out.push("kategorija");
  if (!n.naslov || n.naslov.trim().length < NASLOV_MIN) out.push("naslov");
  if (n.ciljCenti === undefined || (n.ciljCenti === null && n.vrsta !== "recurring")) out.push("cilj");
  if (!n.organizacija || (n.vrsta === "for_organization") !== (n.organizacija.nacin === "za")) out.push("organizacija");
  if (!n.tema && !(n.kategorija && TEMA_KATEGORIJE[n.kategorija])) out.push("tema");
  if (!n.opis || duljinaOpisa(n.opis) < OPIS_MIN) out.push("opis");
  if (zabranjeneRijeci(`${n.naslov ?? ""} ${n.opis ?? ""}`).length) out.push("zabranjeno");
  return out;
}

export type GreskaObjave =
  | "nedostaje"
  | "uloga"
  | "organizacija_neaktivna"
  | "primatelj"
  | "osoba_neverificirana"
  | "rok_prosao";

export type IshodObjave =
  | { ok: true; campaignId: string; publicId: string; state: "active" | "review"; prag: OkidacPraga | null }
  | { ok: false; greska: GreskaObjave; nedostaje: Nedostaje[] };

interface Org {
  id: string;
  organizer_id: string;
  status: string;
  is_fixed_beneficiary: number;
  safe_address: string | null;
  safe_chain_id: number | null;
  category_key: string | null;
}

async function org(db: D1Database, id: string): Promise<Org | null> {
  return db
    .prepare(
      `SELECT id, organizer_id, status, is_fixed_beneficiary, safe_address, safe_chain_id, category_key
         FROM organizations WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(id)
    .first<Org>();
}

async function uloga(db: D1Database, userId: string, orgId: string): Promise<string | null> {
  const r = await db.prepare("SELECT role FROM memberships WHERE user_id = ? AND organization_id = ?").bind(userId, orgId).first<{ role: string }>();
  return r?.role ?? null;
}

/** Izvrši izjave atomarno kad baza ima `batch` (D1), inače redom (test nad sqliteom). */
async function izvrsi(db: D1Database, izjave: D1PreparedStatement[]): Promise<void> {
  if (typeof (db as { batch?: unknown }).batch === "function") {
    await db.batch(izjave);
    return;
  }
  for (const s of izjave) await s.run();
}

/** Osobna organizacija korisnika (odluka 201): postojeća ili nova, s organizatorom jezgre i članstvom owner. */
async function osobnaOrganizacija(db: D1Database, k: Korisnik, sad: number): Promise<Org> {
  const postojeca = await db
    .prepare(
      `SELECT o.id FROM organizations o JOIN memberships m ON m.organization_id = o.id AND m.user_id = ? AND m.role = 'owner'
        WHERE o.kind = 'personal' AND o.deleted_at IS NULL LIMIT 1`,
    )
    .bind(k.id)
    .first<{ id: string }>();
  if (postojeca) return (await org(db, postojeca.id))!;
  const u = await db
    .prepare("SELECT first_name, last_name, display_name FROM users WHERE id = ?")
    .bind(k.id)
    .first<{ first_name: string | null; last_name: string | null; display_name: string | null }>();
  const ime = [u?.first_name, u?.last_name].filter(Boolean).join(" ") || u?.display_name || k.ime;
  const organizerId = uuid7(sad);
  const orgId = uuid7(sad);
  const sufiks = orgId.replace(/-/g, "").slice(-6);
  const slug = `osoba-${slugIzNaslova(ime).slice(0, 26)}-${sufiks}`.replace(/--+/g, "-");
  await izvrsi(db, [
    db
      .prepare(
        `INSERT INTO organizers (id, tenant_id, holder_type, legal_name, oib, address_line, city, postal_code, country_code,
           contact_email, is_platform, created_at, updated_at)
         VALUES (?, ?, 'person', ?, NULL, NULL, NULL, NULL, 'HR', ?, 0, ?, ?)`,
      )
      .bind(organizerId, TENANT, ime, k.email, sad, sad),
    db
      .prepare(
        `INSERT INTO organizations (id, organizer_id, slug, kind, legal_form, display_name, safe_address, safe_chain_id, status,
           is_fixed_beneficiary, created_at, updated_at)
         VALUES (?, ?, ?, 'personal', 'osoba', ?, ?, ?, 'active', 0, ?, ?)`,
      )
      .bind(orgId, organizerId, slug, ime, mockSafeAdresa(), MOCK_LANAC, sad, sad),
    db
      .prepare("INSERT INTO memberships (user_id, organization_id, role, invited_by, created_at, updated_at) VALUES (?, ?, 'owner', NULL, ?, ?)")
      .bind(k.id, orgId, sad, sad),
  ]);
  return (await org(db, orgId))!;
}

async function slobodanSlug(db: D1Database, osnova: string): Promise<string> {
  for (let i = 1; i < 1000; i++) {
    const s = i === 1 ? osnova : `${osnova.slice(0, 55)}-${i}`;
    const r = await db.prepare("SELECT 1 AS da FROM campaigns WHERE tenant_id = ? AND slug = ?").bind(TENANT, s).first();
    if (!r) return s;
  }
  return `${osnova.slice(0, 50)}-${Date.now().toString(36)}`;
}

async function slobodanJavniId(db: D1Database): Promise<string> {
  for (;;) {
    const id = noviJavniId();
    const r = await db.prepare("SELECT 1 AS da FROM campaign_settings WHERE public_id = ?").bind(id).first();
    if (!r) return id;
  }
}

/**
 * Objavi nacrt. `nacrtId` (red u `campaign_drafts`) se zatvara vezom na kampanju. Ne mijenja ništa kad
 * provjera ne prođe.
 */
export async function objavi(db: D1Database, k: Korisnik, n: Nacrt, nacrtId: string | null, sad: number = Date.now()): Promise<IshodObjave> {
  const fali = nedostaje(n);
  if (fali.length) return { ok: false, greska: "nedostaje", nedostaje: fali };
  if (n.rok && krajDana(n.rok) <= sad) return { ok: false, greska: "rok_prosao", nedostaje: [] };
  const izbor = n.organizacija!;
  const ne = (greska: GreskaObjave): IshodObjave => ({ ok: false, greska, nedostaje: [] });

  let o: Org | null;
  let state: "active" | "review" = "active";
  let odobrioPrimatelj = false;
  if (izbor.nacin === "moja") {
    o = await org(db, izbor.orgId);
    const u = o && (await uloga(db, k.id, o.id));
    if (!o || (u !== "admin" && u !== "owner")) return ne("uloga");
    if (o.status !== "active") return ne("organizacija_neaktivna");
  } else if (izbor.nacin === "za") {
    o = await org(db, izbor.orgId);
    if (!o || o.is_fixed_beneficiary !== 1 || o.status !== "active") return ne("primatelj");
    const u = await uloga(db, k.id, o.id);
    odobrioPrimatelj = u === "admin" || u === "owner";
    state = odobrioPrimatelj ? "active" : "review";
  } else {
    if (!(await osobaVerificirana(db, k.id))) return ne("osoba_neverificirana");
    o = await osobnaOrganizacija(db, k, sad);
  }

  const id = uuid7(sad);
  const publicId = await slobodanJavniId(db);
  const slug = await slobodanSlug(db, slugIzNaslova(n.naslov!));
  const vrsta = n.vrsta!;
  const cilj = n.ciljCenti ?? null;
  const kategorija = vrsta === "for_organization" ? (n.kategorija ?? o.category_key) : n.kategorija!;
  const tema = n.tema ?? TEMA_KATEGORIJE[kategorija ?? "other"] ?? "general";
  const aktivna = state === "active";
  const prag = pragVerifikacije(cilj, await zbrojAktivnihCiljeva(db, o.organizer_id));

  let safe = o.safe_address;
  let lanac = o.safe_chain_id ?? MOCK_LANAC;
  if (!safe) {
    // Organizacija još nema Safe iz setup dAppa: mock adresa do S7, zapisana i na organizaciji.
    safe = mockSafeAdresa();
    lanac = MOCK_LANAC;
    await db.prepare("UPDATE organizations SET safe_address = ?, safe_chain_id = ?, updated_at = ? WHERE id = ?").bind(safe, lanac, sad, o.id).run();
  }

  const izjave: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO campaigns (id, tenant_id, organizer_id, slug, type, vertical, title, description, goal_cents,
           min_contribution_cents, max_contributors, currency, state, visibility, mode, rails, starts_at, ends_at, recurrence,
           cover_image_url, lat, lng, location_name, surplus_intent, demo, metadata, created_by, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, 'donation', 'none', ?, ?, ?, 100, NULL, 'EUR', ?, 'public', 'byo', 'platform', ?, ?, ?,
           NULL, NULL, NULL, NULL, NULL, 0, ?, ?, ?, ?, NULL)`,
      )
      .bind(
        id, TENANT, o.organizer_id, slug, n.naslov!.trim(), n.opis!.trim(), cilj,
        state, aktivna ? sad : null, n.rok && vrsta !== "recurring" ? krajDana(n.rok) : null,
        vrsta === "recurring" ? "monthly" : "none",
        JSON.stringify({ izvor: "carobnjak", mpt: "mock-s7" }), k.id, sad, sad,
      ),
    db
      .prepare(
        `INSERT INTO campaign_settings (campaign_id, public_id, kind, category_key, cover_theme, created_by_user_id,
           beneficiary_organization_id, beneficiary_approved_at, beneficiary_approved_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id, publicId, vrsta, kategorija ?? null, tema, k.id,
        vrsta === "for_organization" ? o.id : null,
        odobrioPrimatelj ? sad : null, odobrioPrimatelj ? k.id : null, sad,
      ),
    db
      .prepare(
        `INSERT INTO campaign_safes (campaign_id, address, chain_id, threshold, owners, platform_signer_count, deployed_at, verified_at)
         VALUES (?, ?, ?, 1, '[]', 0, NULL, ?)`,
      )
      .bind(id, safe, lanac, aktivna ? sad : null),
    db
      .prepare("INSERT INTO campaign_stats (campaign_id, raised_cents, contribution_count, contributor_count, last_contribution_at, updated_at) VALUES (?, 0, 0, 0, NULL, ?)")
      .bind(id, sad),
  ];
  if (n.videoUrl) {
    izjave.push(
      db
        .prepare("INSERT INTO campaign_media (id, campaign_id, kind, file_id, video_url, position, created_at) VALUES (?, ?, 'video', NULL, ?, 0, ?)")
        .bind(uuid7(sad), id, n.videoUrl, sad),
    );
  }
  if (prag) {
    izjave.push(
      db
        .prepare(
          `INSERT INTO verifications (id, kind, subject_type, subject_id, status, provider, provider_ref, trigger, reason, requested_at, decided_at, due_at)
           VALUES (?, 'campaign_purpose', 'campaign', ?, 'requested', 'platform', NULL, ?, NULL, ?, NULL, ?)`,
        )
        .bind(uuid7(sad), id, prag, sad, sad + ROK_DOKAZA),
    );
  }
  await izvrsi(db, izjave);
  if (nacrtId) await zatvoriNacrt(db, nacrtId, id, sad);
  return { ok: true, campaignId: id, publicId, state, prag };
}
