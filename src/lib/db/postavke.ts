/**
 * Postavke računa (S6, docs/07 „Moje i postavke”, obilazak 02 i 10–18, odluke 6, 208).
 * Upiti i čiste provjere obrazaca: podaci, telefon (samo verificiran), profil (9 prekidača + indeksiranje + slug,
 * odluka 507), brisanje računa, načini prijave bez lozinke, sigurnost (sesije), verifikacija osobe (mock EMI),
 * verifikacija kampanja (pragovi), linkovi za praćenje i dijeljenja, ponavljajuće, povijest prijava.
 */
import { hashTokena, zapisiPrivolu } from "../sesija";
import { stanjePraga, type StanjePraga } from "./pragovi";
import { VIDLJIVA, uuid7 } from "./zajednicko";
import { preracunajTermin } from "./ponavljanje";

type Greske = Record<string, string>;
type Polja = Record<string, string>;
const p = (f: Polja, k: string) => (f[k] ?? "").trim();
const promjena = (r: { meta: unknown }) => ((r.meta as { changes?: number }).changes ?? 0) > 0;

// --- Podaci (ekran 10) --------------------------------------------------------------------------------

export interface RacunKorisnika {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  about: string | null;
  website: string | null;
  phone: string | null;
  slug: string | null;
  createdAt: number;
  verificiran: boolean;
  /** Stanje zadnje `person_kyc` verifikacije ili null. */
  kyc: StanjeKyc | null;
}

export type StanjeKyc = "requested" | "submitted" | "in_review" | "approved" | "rejected" | "expired";

export async function racunKorisnika(db: D1Database, userId: string): Promise<RacunKorisnika | null> {
  const r = await db
    .prepare(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.display_name, u.about, u.website, u.phone, u.slug, u.created_at,
              (SELECT v.status FROM verifications v WHERE v.kind = 'person_kyc' AND v.subject_type = 'user' AND v.subject_id = u.id
                ORDER BY v.requested_at DESC LIMIT 1) AS kyc
         FROM users u WHERE u.id = ? AND u.deleted_at IS NULL`,
    )
    .bind(userId)
    .first<{
      id: string; email: string; first_name: string | null; last_name: string | null; display_name: string | null; about: string | null;
      website: string | null; phone: string | null; slug: string | null; created_at: number; kyc: StanjeKyc | null;
    }>();
  if (!r) return null;
  return {
    id: r.id, email: r.email, firstName: r.first_name, lastName: r.last_name, displayName: r.display_name, about: r.about,
    website: r.website, phone: r.phone, slug: r.slug, createdAt: r.created_at, verificiran: r.kyc === "approved", kyc: r.kyc,
  };
}

const valjanUrl = (s: string) => {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

/** Ime, prezime, ime za prikaz; „o meni” i web samo verificiranom (ekran 10: zaključano do verifikacije). */
export function provjeriPodatke(f: Polja, verificiran: boolean): { greske: Greske; vrijednosti: Record<string, string | null> } {
  const greske: Greske = {};
  const v: Record<string, string | null> = {};
  for (const k of ["first_name", "last_name", "display_name"] as const) {
    const x = p(f, k);
    if (x.length > 255) greske[k] = "predugo";
    v[k] = x || null;
  }
  if (verificiran) {
    const about = p(f, "about");
    if (about.length > 3500) greske.about = "predugo";
    v.about = about || null;
    const web = p(f, "website");
    if (web.length > 255) greske.website = "predugo";
    else if (web && !valjanUrl(web)) greske.website = "neispravno";
    v.website = web || null;
  }
  return { greske, vrijednosti: v };
}

export async function spremiPodatke(db: D1Database, userId: string, v: Record<string, string | null>, sad: number): Promise<void> {
  const stupci = Object.keys(v).filter((k) => ["first_name", "last_name", "display_name", "about", "website"].includes(k));
  await db
    .prepare(`UPDATE users SET ${stupci.map((s) => `${s} = ?`).join(", ")}, updated_at = ? WHERE id = ?`)
    .bind(...stupci.map((s) => v[s] ?? null), sad, userId)
    .run();
}

// --- Telefon (ekran 11) --------------------------------------------------------------------------------

/** Telefon u međunarodnom obliku: `+` i 8–15 znamenki (razmaci dopušteni). null = brisanje. */
export function normalizirajTelefon(s: string): string | null | false {
  const t = s.replace(/[\s()-]/g, "");
  if (!t) return null;
  return /^\+[1-9]\d{7,14}$/.test(t) ? t : false;
}

export async function spremiTelefon(db: D1Database, userId: string, telefon: string | null, sad: number): Promise<void> {
  await db.prepare("UPDATE users SET phone = ?, updated_at = ? WHERE id = ?").bind(telefon, sad, userId).run();
}

// --- Profil (ekran 12) --------------------------------------------------------------------------------

export const PREKIDACI = [
  "show_email", "show_avatar", "show_phone", "show_total_raised", "show_registered_date",
  "show_promoted", "show_owned", "show_donated", "show_for_organization",
] as const;
export type Prekidac = (typeof PREKIDACI)[number];

/** Zadane vrijednosti iz 0002 (`user_settings` DEFAULT). */
export const ZADANO: Record<Prekidac | "indexable", 0 | 1> = {
  show_email: 0, show_avatar: 1, show_phone: 0, show_total_raised: 0, show_registered_date: 1,
  show_promoted: 1, show_owned: 1, show_donated: 1, show_for_organization: 1, indexable: 1,
};

export interface PostavkeProfila {
  prekidaci: Record<Prekidac | "indexable", boolean>;
  slug: string | null;
  newsletter: boolean;
}

export async function postavkeProfila(db: D1Database, userId: string): Promise<PostavkeProfila> {
  const r = await db.prepare("SELECT * FROM user_settings WHERE user_id = ?").bind(userId).first<Record<string, number>>();
  const u = await db.prepare("SELECT slug FROM users WHERE id = ?").bind(userId).first<{ slug: string | null }>();
  const n = await db
    .prepare("SELECT granted FROM consents WHERE user_id = ? AND kind = 'newsletter' ORDER BY created_at DESC, id DESC LIMIT 1")
    .bind(userId)
    .first<{ granted: number }>();
  const prekidaci = Object.fromEntries(
    ([...PREKIDACI, "indexable"] as const).map((k) => [k, (r ? r[k] : ZADANO[k]) === 1]),
  ) as PostavkeProfila["prekidaci"];
  return { prekidaci, slug: u?.slug ?? null, newsletter: n?.granted === 1 };
}

/** Slug profila (0004): `a-z0-9-`, 3–40, ne smije izgledati kao UUID. */
export function provjeriSlug(s: string): string | null {
  if (!/^[a-z0-9-]{3,40}$/.test(s)) return "neispravno";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)) return "neispravno";
  return null;
}

export async function spremiProfil(db: D1Database, userId: string, f: Polja, sad: number): Promise<Greske> {
  const greske: Greske = {};
  const slug = p(f, "slug").toLowerCase();
  if (slug) {
    const g = provjeriSlug(slug);
    if (g) greske.slug = g;
    else {
      const zauzet = await db.prepare("SELECT 1 AS da FROM users WHERE slug = ? AND id <> ?").bind(slug, userId).first();
      if (zauzet) greske.slug = "zauzet";
    }
  }
  if (Object.keys(greske).length) return greske;
  const v = ([...PREKIDACI, "indexable"] as const).map((k) => (f[k] === "1" ? 1 : 0));
  await db
    .prepare(
      `INSERT INTO user_settings (user_id, ${PREKIDACI.join(", ")}, indexable, updated_at) VALUES (?, ${PREKIDACI.map(() => "?").join(", ")}, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET ${PREKIDACI.map((k) => `${k} = excluded.${k}`).join(", ")}, indexable = excluded.indexable, updated_at = excluded.updated_at`,
    )
    .bind(userId, ...v, sad)
    .run();
  await db.prepare("UPDATE users SET slug = ?, updated_at = ? WHERE id = ?").bind(slug || null, sad, userId).run();
  const newsletter = f.newsletter === "1";
  const sada = await postavkeProfila(db, userId);
  if (sada.newsletter !== newsletter) await zapisiPrivolu(db, userId, "newsletter", newsletter, sad);
  return {};
}

export type GreskaBrisanja = "jedini_vlasnik";

/**
 * Brisanje računa (P+e, ekran 12): odbija se dok je korisnik jedini vlasnik pravne organizacije (prvo prenese
 * vlasništvo). Inače: korisnik `deleted_at`, sve sesije opozvane, osobna organizacija i njezine kampanje obrisane
 * (soft), članstva uklonjena, nacrti obrisani, kasice i linkovi isključeni, ponavljanja otkazana. Novac se ne
 * vraća jer ga platforma ne drži (odluka 6).
 */
export async function obrisiRacun(db: D1Database, userId: string, sad: number): Promise<GreskaBrisanja | null> {
  const jedini = await db
    .prepare(
      `SELECT 1 AS da FROM memberships m JOIN organizations o ON o.id = m.organization_id
        WHERE m.user_id = ? AND m.role = 'owner' AND o.kind = 'legal' AND o.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM memberships m2 WHERE m2.organization_id = o.id AND m2.role = 'owner' AND m2.user_id <> m.user_id)
        LIMIT 1`,
    )
    .bind(userId)
    .first();
  if (jedini) return "jedini_vlasnik";
  const osobne = `SELECT o.organizer_id FROM organizations o JOIN memberships m ON m.organization_id = o.id
                   WHERE m.user_id = ? AND o.kind = 'personal'`;
  const izjave = [
    db.prepare(`UPDATE campaigns SET state = 'cancelled', deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL AND organizer_id IN (${osobne})`).bind(sad, sad, userId),
    db.prepare(`UPDATE organizations SET deleted_at = ?, status = 'closed', updated_at = ? WHERE kind = 'personal' AND id IN (SELECT organization_id FROM memberships WHERE user_id = ?)`).bind(sad, sad, userId),
    db.prepare("DELETE FROM memberships WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM campaign_drafts WHERE user_id = ? AND campaign_id IS NULL").bind(userId),
    db.prepare("UPDATE moneyboxes SET status = 'deleted', updated_at = ? WHERE owner_user_id = ? AND status <> 'deleted'").bind(sad, userId),
    db.prepare("UPDATE tracking_links SET status = 'disabled' WHERE owner_user_id = ?").bind(userId),
    db.prepare("UPDATE recurring_pledges SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE user_id = ? AND status <> 'cancelled'").bind(sad, sad, userId),
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").bind(sad, userId),
    db.prepare("UPDATE users SET deleted_at = ?, phone = NULL, about = NULL, website = NULL, slug = NULL, updated_at = ? WHERE id = ?").bind(sad, sad, userId),
  ];
  if (typeof (db as { batch?: unknown }).batch === "function") await db.batch(izjave);
  else for (const s of izjave) await s.run();
  return null;
}

// --- Načini prijave (ekran 13 → odluka 208) i sigurnost (ekran 14) ------------------------------------

export interface NacinPrijave {
  id: string;
  provider: "email_link" | "email_code" | "google" | "certilia";
  createdAt: number;
  lastUsedAt: number | null;
}

export async function naciniPrijave(db: D1Database, userId: string): Promise<NacinPrijave[]> {
  const { results } = await db
    .prepare("SELECT id, provider, created_at, last_used_at FROM auth_identities WHERE user_id = ? ORDER BY created_at, id")
    .bind(userId)
    .all<{ id: string; provider: NacinPrijave["provider"]; created_at: number; last_used_at: number | null }>();
  return results.map((r) => ({ id: r.id, provider: r.provider, createdAt: r.created_at, lastUsedAt: r.last_used_at }));
}

/** Ukloni način prijave; zadnji se ne može ukloniti (docs/08 `SignInMethods`). */
export async function ukloniNacinPrijave(db: D1Database, userId: string, id: string): Promise<"zadnji" | "nema" | null> {
  const svi = await naciniPrijave(db, userId);
  if (!svi.some((n) => n.id === id)) return "nema";
  if (svi.length <= 1) return "zadnji";
  await db.prepare("DELETE FROM auth_identities WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return null;
}

export async function aktivneSesije(db: D1Database, userId: string, sad: number): Promise<number> {
  const r = await db
    .prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?")
    .bind(userId, sad)
    .first<{ n: number }>();
  return Number(r?.n ?? 0);
}

/** Odjavi sve ostale sesije (osim ove u kolačiću). Vraća broj opozvanih. */
export async function odjaviOstaleSesije(db: D1Database, userId: string, token: string | undefined, sad: number): Promise<number> {
  const ova = token ? await hashTokena(token) : "";
  const r = await db
    .prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL AND id <> ?")
    .bind(sad, userId, ova)
    .run();
  return Number((r.meta as { changes?: number }).changes ?? 0);
}

// --- Povijest prijava (ekran 18) -----------------------------------------------------------------------

export interface Prijava {
  loggedInAt: number;
  lastActivityAt: number | null;
  ipPrefix: string | null;
  device: string | null;
}

export async function povijestPrijava(db: D1Database, userId: string, limit = 50): Promise<Prijava[]> {
  const { results } = await db
    .prepare("SELECT logged_in_at, last_activity_at, ip_prefix, device FROM login_events WHERE user_id = ? ORDER BY logged_in_at DESC LIMIT ?")
    .bind(userId, limit)
    .all<{ logged_in_at: number; last_activity_at: number | null; ip_prefix: string | null; device: string | null }>();
  return results.map((r) => ({ loggedInAt: r.logged_in_at, lastActivityAt: r.last_activity_at, ipPrefix: r.ip_prefix, device: r.device }));
}

// --- Verifikacija osobe (ekran 02, tok 1) -------------------------------------------------------------

/** EGP: 27 članica EU + Island, Lihtenštajn, Norveška (rezidentnost je uvjet, ekran 02). */
export const EGP = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU",
  "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
] as const;
/** Državljanstvo i država rođenja: EGP + susjedi i česti slučajevi (prototip, ne svih 194). */
export const DRZAVE = [...EGP, "AL", "BA", "CH", "GB", "ME", "MK", "RS", "UA", "US"] as const;
export const DOKUMENTI = ["id_card", "passport", "residence_card"] as const;
export const PEP_VRSTE = ["self", "family", "associate"] as const;

/** OIB: 11 znamenki, kontrolna po ISO 7064 MOD 11,10. */
export function valjanOib(oib: string): boolean {
  if (!/^\d{11}$/.test(oib)) return false;
  let a = 10;
  for (let i = 0; i < 10; i++) {
    a = (a + Number(oib[i])) % 10;
    if (a === 0) a = 10;
    a = (a * 2) % 11;
  }
  const k = 11 - a === 10 ? 0 : 11 - a;
  return k === Number(oib[10]);
}

const datum = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? Date.parse(`${s}T00:00:00Z`) : null);

/**
 * Obrazac verifikacije osobe (polja s ekrana 02; OIB umjesto PESEL-a, rezidentnost u EGP-u). Podaci idu EMI-ju;
 * platforma sprema samo stanje (docs/04 §1), ime i prezime upisuje u račun.
 */
export function provjeriObrazacKyc(f: Polja, sad: number): Greske {
  const g: Greske = {};
  const ima = <T extends string>(l: readonly T[], x: string) => (l as readonly string[]).includes(x);
  for (const [k, max] of [["first_name", 100], ["last_name", 100], ["street", 100], ["house_number", 10], ["postal_code", 20], ["city", 100], ["document_number", 30]] as const) {
    const v = p(f, k);
    if (!v) g[k] = "obavezno";
    else if (v.length > max) g[k] = "predugo";
  }
  if (p(f, "apartment").length > 10) g.apartment = "predugo";
  if (!ima(DRZAVE, p(f, "citizenship"))) g.citizenship = "obavezno";
  if (!ima(DRZAVE, p(f, "birth_country"))) g.birth_country = "obavezno";
  if (!ima(EGP, p(f, "residence_country"))) g.residence_country = "egp";
  const rodjen = datum(p(f, "birth_date"));
  if (rodjen === null) g.birth_date = "obavezno";
  else {
    const d = new Date(sad);
    const punoljetan = Date.UTC(d.getUTCFullYear() - 18, d.getUTCMonth(), d.getUTCDate());
    if (rodjen > punoljetan) g.birth_date = "maloljetan";
  }
  const oib = p(f, "oib");
  if (oib && !valjanOib(oib)) g.oib = "neispravno";
  if (!ima(DOKUMENTI, p(f, "document_type"))) g.document_type = "obavezno";
  if (f.no_expiry !== "1") {
    const istek = datum(p(f, "document_expiry"));
    if (istek === null) g.document_expiry = "obavezno";
    else if (istek < sad) g.document_expiry = "istekao";
  }
  const pep = p(f, "pep");
  if (pep !== "no" && pep !== "yes") g.pep = "obavezno";
  else if (pep === "yes") {
    if (!ima(PEP_VRSTE, p(f, "pep_kind"))) g.pep_kind = "obavezno";
    if (f.pep_statement !== "1") g.pep_statement = "obavezno";
  }
  if (f.accuracy !== "1") g.accuracy = "obavezno";
  return g;
}

export interface VerifikacijaOsobe {
  id: string;
  status: StanjeKyc;
  provider: string;
  providerRef: string | null;
  reason: string | null;
  requestedAt: number;
  decidedAt: number | null;
}

export async function verifikacijaOsobe(db: D1Database, userId: string): Promise<VerifikacijaOsobe | null> {
  const r = await db
    .prepare(
      `SELECT id, status, provider, provider_ref, reason, requested_at, decided_at FROM verifications
        WHERE kind = 'person_kyc' AND subject_type = 'user' AND subject_id = ? ORDER BY requested_at DESC, id DESC LIMIT 1`,
    )
    .bind(userId)
    .first<{ id: string; status: StanjeKyc; provider: string; provider_ref: string | null; reason: string | null; requested_at: number; decided_at: number | null }>();
  return r
    ? { id: r.id, status: r.status, provider: r.provider, providerRef: r.provider_ref, reason: r.reason, requestedAt: r.requested_at, decidedAt: r.decided_at }
    : null;
}

/** Pošalji obrazac: nova `person_kyc` (submitted, provider mock). Odobrenu ne zamjenjuje (vraća false). */
export async function posaljiVerifikaciju(db: D1Database, userId: string, f: Polja, sad: number): Promise<boolean> {
  const zadnja = await verifikacijaOsobe(db, userId);
  if (zadnja && (zadnja.status === "approved" || zadnja.status === "submitted" || zadnja.status === "in_review")) return false;
  const id = uuid7(sad);
  await db
    .prepare(
      `INSERT INTO verifications (id, kind, subject_type, subject_id, status, provider, provider_ref, trigger, reason, requested_at, decided_at, due_at)
       VALUES (?, 'person_kyc', 'user', ?, 'submitted', 'mock', ?, 'user', NULL, ?, NULL, NULL)`,
    )
    .bind(id, userId, `MOCK-KYC-${id.slice(-8).toUpperCase()}`, sad)
    .run();
  await db.prepare("UPDATE users SET first_name = ?, last_name = ?, updated_at = ? WHERE id = ?").bind(p(f, "first_name"), p(f, "last_name"), sad, userId).run();
  return true;
}

/** Mock odluka EMI-ja („simuliraj”): samo za poslanu ili verifikaciju u pregledu. */
export async function simulirajOdluku(db: D1Database, userId: string, odluka: "approved" | "rejected", sad: number): Promise<boolean> {
  const zadnja = await verifikacijaOsobe(db, userId);
  if (!zadnja || (zadnja.status !== "submitted" && zadnja.status !== "in_review")) return false;
  const r = await db
    .prepare("UPDATE verifications SET status = ?, decided_at = ?, reason = ? WHERE id = ?")
    .bind(odluka, sad, odluka === "rejected" ? "Simulirana odluka EMI-ja (mock): dokument nije čitljiv." : null, zadnja.id)
    .run();
  return promjena(r);
}

// --- Verifikacija kampanja (ekran 15) -----------------------------------------------------------------

export interface KampanjaZaVerifikaciju {
  campaignId: string;
  publicId: string;
  naslov: string;
  goalCents: number | null;
  state: string;
  organizacija: string | null;
  prag: StanjePraga;
}

/** Kampanje mojih organizacija (uloga ≥ editor) i moje kampanje za organizacije, s pragom i stanjem dokaza. */
export async function kampanjeZaVerifikaciju(db: D1Database, userId: string, sad: number): Promise<KampanjaZaVerifikaciju[]> {
  const { results } = await db
    .prepare(
      `SELECT c.id, s.public_id, c.title, c.goal_cents, c.state, o.display_name
         FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
         LEFT JOIN organizations o ON o.organizer_id = c.organizer_id
        WHERE c.deleted_at IS NULL AND c.state IN ('review','active','funded','closed')
          AND (c.created_by = ? OR EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = ? AND m.organization_id = o.id AND m.role IN ('editor','admin','owner')))
        ORDER BY c.created_at DESC`,
    )
    .bind(userId, userId)
    .all<{ id: string; public_id: string; title: string; goal_cents: number | null; state: string; display_name: string | null }>();
  const out: KampanjaZaVerifikaciju[] = [];
  for (const r of results) {
    const prag = (await stanjePraga(db, r.id, sad))!;
    out.push({ campaignId: r.id, publicId: r.public_id, naslov: r.title, goalCents: r.goal_cents, state: r.state, organizacija: r.display_name, prag });
  }
  return out;
}

// --- Linkovi za praćenje i dijeljenja (ekran 16) ------------------------------------------------------

/** Plaćeni doprinosi pripisani izvoru (isto kao statistika izvora u upravljanju kampanjom). */
const ZBROJ = (uvjet: string) => `(SELECT COALESCE(SUM(d.amount_received_cents), 0) FROM contribution_attributions a
   JOIN contributions d ON d.id = a.contribution_id WHERE ${uvjet} AND d.state = 'paid')`;
const BROJ = (uvjet: string) => `(SELECT COUNT(*) FROM contribution_attributions a
   JOIN contributions d ON d.id = a.contribution_id WHERE ${uvjet} AND d.state = 'paid')`;

export interface MojLink {
  id: string;
  slug: string;
  label: string | null;
  status: "active" | "disabled";
  publicId: string;
  naslov: string;
  posjeti: number;
  doprinosa: number;
  iznosCenti: number;
  createdAt: number;
}

export async function mojiLinkovi(db: D1Database, userId: string): Promise<MojLink[]> {
  const { results } = await db
    .prepare(
      `SELECT t.id, t.slug, t.label, t.status, t.created_at, s.public_id, c.title,
              (SELECT COUNT(*) FROM link_visits v WHERE v.tracking_link_id = t.id) AS posjeti,
              ${BROJ("a.tracking_link_id = t.id")} AS doprinosa, ${ZBROJ("a.tracking_link_id = t.id")} AS iznos
         FROM tracking_links t JOIN campaigns c ON c.id = t.campaign_id JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE t.owner_user_id = ? ORDER BY t.created_at DESC`,
    )
    .bind(userId)
    .all<{ id: string; slug: string; label: string | null; status: MojLink["status"]; created_at: number; public_id: string; title: string; posjeti: number; doprinosa: number; iznos: number }>();
  return results.map((r) => ({
    id: r.id, slug: r.slug, label: r.label, status: r.status, publicId: r.public_id, naslov: r.title,
    posjeti: Number(r.posjeti), doprinosa: Number(r.doprinosa), iznosCenti: Number(r.iznos), createdAt: r.created_at,
  }));
}

/** Novi link za praćenje javno vidljive kampanje (`/z/{slug}`). Vraća greške po polju ili id. */
export async function stvoriLink(db: D1Database, userId: string, f: Polja, sad: number): Promise<{ greske: Greske } | { id: string }> {
  const greske: Greske = {};
  const javniId = p(f, "campaign").toLowerCase();
  const slug = p(f, "slug").toLowerCase();
  const label = p(f, "label");
  const k = /^[0-9a-z]{6}$/.test(javniId)
    ? await db
        .prepare(`SELECT c.id FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id WHERE s.public_id = ? AND ${VIDLJIVA}`)
        .bind(javniId)
        .first<{ id: string }>()
    : null;
  if (!k) greske.campaign = javniId ? "nema" : "obavezno";
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) greske.slug = slug ? "neispravno" : "obavezno";
  else if (await db.prepare("SELECT 1 AS da FROM tracking_links WHERE slug = ?").bind(slug).first()) greske.slug = "zauzet";
  if (label.length > 100) greske.label = "predugo";
  if (Object.keys(greske).length || !k) return { greske };
  const id = uuid7(sad);
  await db
    .prepare("INSERT INTO tracking_links (id, campaign_id, owner_user_id, slug, label, status, created_at) VALUES (?, ?, ?, ?, ?, 'active', ?)")
    .bind(id, k.id, userId, slug, label || null, sad)
    .run();
  return { id };
}

/** Uključi / isključi vlastiti link (V). */
export async function statusLinka(db: D1Database, userId: string, id: string, status: "active" | "disabled"): Promise<boolean> {
  return promjena(await db.prepare("UPDATE tracking_links SET status = ? WHERE id = ? AND owner_user_id = ?").bind(status, id, userId).run());
}

export interface MojeDijeljenje {
  code: string;
  publicId: string;
  naslov: string;
  posjeti: number;
  doprinosa: number;
  iznosCenti: number;
  createdAt: number;
}

export async function mojaDijeljenja(db: D1Database, userId: string): Promise<MojeDijeljenje[]> {
  const { results } = await db
    .prepare(
      `SELECT l.code, l.created_at, s.public_id, c.title,
              (SELECT COUNT(*) FROM link_visits v WHERE v.share_link_id = l.id) AS posjeti,
              ${BROJ("a.share_link_id = l.id")} AS doprinosa, ${ZBROJ("a.share_link_id = l.id")} AS iznos
         FROM share_links l JOIN campaigns c ON c.id = l.campaign_id JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE l.user_id = ? ORDER BY l.created_at DESC`,
    )
    .bind(userId)
    .all<{ code: string; created_at: number; public_id: string; title: string; posjeti: number; doprinosa: number; iznos: number }>();
  return results.map((r) => ({ code: r.code, publicId: r.public_id, naslov: r.title, posjeti: Number(r.posjeti), doprinosa: Number(r.doprinosa), iznosCenti: Number(r.iznos), createdAt: r.created_at }));
}

// --- Ponavljajuće (ekran 17, odluka 215) --------------------------------------------------------------

export interface Ponavljanje {
  id: string;
  publicId: string;
  naslov: string;
  amountCents: number;
  dayOfMonth: number;
  mode: "reminder" | "standing_order";
  status: "active" | "paused" | "cancelled";
  nextReminderAt: number | null;
  createdAt: number;
}

export async function mojaPonavljanja(db: D1Database, userId: string): Promise<Ponavljanje[]> {
  const { results } = await db
    .prepare(
      `SELECT r.id, s.public_id, c.title, r.amount_cents, r.day_of_month, r.mode, r.status, r.next_reminder_at, r.created_at
         FROM recurring_pledges r JOIN campaigns c ON c.id = r.campaign_id JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE r.user_id = ? ORDER BY (r.status = 'cancelled'), r.created_at DESC`,
    )
    .bind(userId)
    .all<{ id: string; public_id: string; title: string; amount_cents: number; day_of_month: number; mode: Ponavljanje["mode"]; status: Ponavljanje["status"]; next_reminder_at: number | null; created_at: number }>();
  return results.map((r) => ({
    id: r.id, publicId: r.public_id, naslov: r.title, amountCents: r.amount_cents, dayOfMonth: r.day_of_month, mode: r.mode,
    status: r.status, nextReminderAt: r.next_reminder_at, createdAt: r.created_at,
  }));
}

export type RadnjaPonavljanja = "pause" | "resume" | "cancel" | "day";

/**
 * Pauza, nastavak, otkaz (konačan) i dan u mjesecu 1–28; samo vlastito obećanje (V). Nastavak i promjena dana
 * preračunavaju sljedeći podsjetnik (S8, `src/lib/db/ponavljanje.ts`).
 */
export async function promijeniPonavljanje(db: D1Database, userId: string, id: string, radnja: RadnjaPonavljanja, dan: number | null, sad: number): Promise<boolean> {
  if (radnja === "pause")
    return promjena(await db.prepare("UPDATE recurring_pledges SET status = 'paused', updated_at = ? WHERE id = ? AND user_id = ? AND status = 'active'").bind(sad, id, userId).run());
  if (radnja === "resume") {
    const ok = promjena(await db.prepare("UPDATE recurring_pledges SET status = 'active', missed_count = 0, updated_at = ? WHERE id = ? AND user_id = ? AND status = 'paused'").bind(sad, id, userId).run());
    if (ok) await preracunajTermin(db, id, sad);
    return ok;
  }
  if (radnja === "cancel")
    return promjena(await db.prepare("UPDATE recurring_pledges SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status <> 'cancelled'").bind(sad, sad, id, userId).run());
  if (dan === null || !Number.isInteger(dan) || dan < 1 || dan > 28) return false;
  const ok = promjena(await db.prepare("UPDATE recurring_pledges SET day_of_month = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status <> 'cancelled'").bind(dan, sad, id, userId).run());
  if (ok) await preracunajTermin(db, id, sad);
  return ok;
}
