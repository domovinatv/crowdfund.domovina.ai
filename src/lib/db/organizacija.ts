/**
 * Organizacija (S6, tok 2 u docs/04, ekrani 20 i 26, odluke 150 i 202): zahtjev u 5 koraka, stanje zahtjeva i
 * KYB-a, Safe organizacije, postavke javnog profila, kampanje organizacije i vanjske 4fund kampanje.
 *
 * Nacrt zahtjeva je u bazi od prvog koraka: `organizers` (jezgra) + `organizations(pending)` +
 * `memberships(owner)` + `organization_applications(draft, step 2)`. Korak KYB upisuje
 * `verifications(org_kyb, requested, mock)`, a slanje ih prebacuje u `submitted` (zahtjev `step 3`).
 * Odluku EMI-ja simulira moderator (`src/lib/db/moderacija.ts`). Sve funkcije primaju `D1Database`.
 */
import { DAN, uuid7 } from "./zajednicko";

// --- Pravila polja ------------------------------------------------------------------------------------

/** Pravni oblici iz `organizations.legal_form` (CHECK u 0002). `osoba` je faza 2 (odluka 8). */
export const PRAVNI_OBLICI = ["udruga", "zaklada", "ustanova", "vjerska_zajednica", "zadruga", "jls", "doo", "obrt", "osoba"] as const;
export type PravniOblik = (typeof PRAVNI_OBLICI)[number];
export const isPravniOblik = (x: unknown): x is PravniOblik => PRAVNI_OBLICI.includes(x as PravniOblik);

/** Pravni oblik → `organizers.holder_type` jezgre (HOLDER_TYPES nema zakladu ni ustanovu, odluka 213). */
export const VRSTA_NOSITELJA: Record<PravniOblik, string> = {
  udruga: "association",
  zaklada: "association",
  vjerska_zajednica: "association",
  ustanova: "community",
  zadruga: "cooperative",
  jls: "municipality",
  doo: "company",
  obrt: "company",
  osoba: "person",
};

/** Procijenjeni mjesečni broj uplata (4fund `paymentsNumber`, CHECK u 0002). */
export const OCEKIVANE_UPLATE = ["1-10", "11-100", "101-1000", ">1000"] as const;
export type OcekivaneUplate = (typeof OCEKIVANE_UPLATE)[number];

export const NAJVISE = { naziv: 120, web: 200, mreza: 200, opis: 2000, projekt: 2000, ime: 80, funkcija: 80, adresa: 120, grad: 80 } as const;
export const MREZA_NAJVISE = 3;
export const OPIS_PROJEKTA_MIN = 30;

/** OIB: 11 znamenki, kontrolna znamenka po ISO 7064 MOD 11,10. */
export function kontrolnaZnamenkaOib(prvih10: string): number {
  let a = 10;
  for (const z of prvih10) {
    a = (a + Number(z)) % 10;
    if (a === 0) a = 10;
    a = (a * 2) % 11;
  }
  const k = 11 - a;
  return k === 10 ? 0 : k;
}

export function valjanOib(oib: string): boolean {
  return /^\d{11}$/.test(oib) && kontrolnaZnamenkaOib(oib.slice(0, 10)) === Number(oib[10]);
}

/** Slug organizacije (`/hr/o/{slug}`): isto pravilo kao CHECK u 0002 + bez crtice na rubu. */
export function valjanSlug(s: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(s);
}

/** Prijedlog sluga iz naziva: mala slova bez dijakritike, crtice, najviše 40 znakova. */
export function predloziSlug(naziv: string): string {
  return naziv
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** Javna poveznica: samo http(s), bez razmaka. */
export function valjanUrl(u: string, najvise: number = NAJVISE.web): boolean {
  if (u.length > najvise || /\s/.test(u)) return false;
  try {
    const x = new URL(u);
    return (x.protocol === "https:" || x.protocol === "http:") && x.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Safe organizacije (tok 2): adresa iz setup dAppa, Gnosis (100) ili Chiado (10200). Ništa se ne poziva. */
export const LANCI = [100, 10200] as const;
export const valjanaAdresa = (a: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(a);

// --- Zahtjev organizacije ------------------------------------------------------------------------------

export type Greske<P extends string> = Partial<Record<P, string>>;
export type Ishod<P extends string, T = object> = ({ ok: true } & T) | { ok: false; greske: Greske<P> };

export interface Zastupnik {
  ime: string;
  prezime: string;
  funkcija: string;
  ovlast: boolean;
}

export interface NacrtZahtjeva {
  applicationId: string;
  organizationId: string;
  organizerId: string;
  slug: string;
  naziv: string;
  pravniOblik: PravniOblik;
  oib: string;
  web: string;
  mreze: string[];
  opis: string;
  kategorija: string | null;
  adresa: string;
  grad: string;
  postanski: string;
  zastupnik: Zastupnik | null;
  opisProjekta: string;
  ocekivaneUplate: OcekivaneUplate;
  /** Projekt je spremljen (opis projekta nije prazan). */
  projekt: boolean;
  /** Privola za KYB dana: postoji `verifications(org_kyb, requested)`. */
  kyb: boolean;
}

interface RedakNacrta {
  application_id: string;
  organization_id: string;
  organizer_id: string;
  slug: string;
  display_name: string;
  legal_form: PravniOblik;
  oib: string | null;
  website: string | null;
  social_links: string;
  description: string | null;
  category_key: string | null;
  address_line: string | null;
  city: string | null;
  postal_code: string | null;
  representative: string;
  project_description: string;
  expected_payments: OcekivaneUplate;
  kyb: number;
}

const SELECT_NACRTA = `
SELECT a.id AS application_id, o.id AS organization_id, g.id AS organizer_id, o.slug, o.display_name, o.legal_form,
       g.oib, o.website, o.social_links, o.description, o.category_key, g.address_line, g.city, g.postal_code,
       a.representative, a.project_description, a.expected_payments,
       EXISTS (SELECT 1 FROM verifications v WHERE v.kind = 'org_kyb' AND v.subject_type = 'organization'
                AND v.subject_id = o.id) AS kyb
  FROM organization_applications a
  JOIN organizations o ON o.id = a.organization_id AND o.deleted_at IS NULL
  JOIN organizers g ON g.id = o.organizer_id`;

function mrezeIz(json: string): string[] {
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function zastupnikIz(json: string): Zastupnik | null {
  try {
    const v = JSON.parse(json) as Partial<Zastupnik>;
    return v && typeof v.ime === "string" && v.ime
      ? { ime: v.ime, prezime: v.prezime ?? "", funkcija: v.funkcija ?? "", ovlast: v.ovlast === true }
      : null;
  } catch {
    return null;
  }
}

/** Otvoreni nacrt zahtjeva korisnika (zadnji `draft`), ili null. */
export async function nacrtZahtjeva(db: D1Database, userId: string): Promise<NacrtZahtjeva | null> {
  const r = await db
    .prepare(`${SELECT_NACRTA} WHERE a.submitted_by = ? AND a.status = 'draft' ORDER BY a.created_at DESC, a.id DESC LIMIT 1`)
    .bind(userId)
    .first<RedakNacrta>();
  if (!r) return null;
  return {
    applicationId: r.application_id,
    organizationId: r.organization_id,
    organizerId: r.organizer_id,
    slug: r.slug,
    naziv: r.display_name,
    pravniOblik: r.legal_form,
    oib: r.oib ?? "",
    web: r.website ?? "",
    mreze: mrezeIz(r.social_links),
    opis: r.description ?? "",
    kategorija: r.category_key,
    adresa: r.address_line ?? "",
    grad: r.city ?? "",
    postanski: r.postal_code ?? "",
    zastupnik: zastupnikIz(r.representative),
    opisProjekta: r.project_description,
    ocekivaneUplate: r.expected_payments,
    projekt: r.project_description.trim().length > 0,
    kyb: r.kyb === 1,
  };
}

export interface UlazPodataka {
  naziv: string;
  slug: string;
  pravniOblik: string;
  oib: string;
  web: string;
  mreze: string[];
  opis: string;
  kategorija: string;
  adresa: string;
  grad: string;
  postanski: string;
}
export type PoljePodataka = "naziv" | "slug" | "pravniOblik" | "oib" | "web" | "mreze" | "opis" | "kategorija" | "adresa" | "grad" | "postanski";

/** Provjera koraka „podaci” bez baze (osim jedinstvenosti sluga, koju radi `spremiPodatke`). */
export function provjeriPodatke(u: UlazPodataka, kategorije: readonly string[]): Greske<PoljePodataka> {
  const g: Greske<PoljePodataka> = {};
  if (!u.naziv) g.naziv = "obavezno";
  else if (u.naziv.length > NAJVISE.naziv) g.naziv = "predugo";
  if (!u.slug) g.slug = "obavezno";
  else if (!valjanSlug(u.slug)) g.slug = "neispravno";
  if (!u.pravniOblik) g.pravniOblik = "obavezno";
  else if (!isPravniOblik(u.pravniOblik)) g.pravniOblik = "neispravno";
  else if (u.pravniOblik === "osoba") g.pravniOblik = "faza2";
  if (!u.oib) g.oib = "obavezno";
  else if (!valjanOib(u.oib)) g.oib = "neispravno";
  if (!u.web) g.web = "obavezno";
  else if (!valjanUrl(u.web)) g.web = "neispravno";
  if (u.mreze.length > MREZA_NAJVISE || u.mreze.some((m) => !valjanUrl(m, NAJVISE.mreza))) g.mreze = "neispravno";
  if (!u.opis) g.opis = "obavezno";
  else if (u.opis.length > NAJVISE.opis) g.opis = "predugo";
  if (u.kategorija && !kategorije.includes(u.kategorija)) g.kategorija = "neispravno";
  if (u.adresa.length > NAJVISE.adresa) g.adresa = "predugo";
  if (u.grad.length > NAJVISE.grad) g.grad = "predugo";
  if (u.postanski && !/^\d{5}$/.test(u.postanski)) g.postanski = "neispravno";
  return g;
}

/**
 * Korak „podaci”: stvara nacrt (organizer + organizacija `pending` + owner + zahtjev `draft`) ili ga mijenja.
 * Slug se smije mijenjati dok je zahtjev nacrt; zauzet slug je greška polja.
 */
export async function spremiPodatke(
  db: D1Database,
  korisnik: { id: string; email: string },
  u: UlazPodataka,
  kategorije: readonly string[],
  sad: number = Date.now(),
): Promise<Ishod<PoljePodataka, { slug: string }>> {
  const greske = provjeriPodatke(u, kategorije);
  if (Object.keys(greske).length) return { ok: false, greske };
  const oblik = u.pravniOblik as PravniOblik;
  const nacrt = await nacrtZahtjeva(db, korisnik.id);
  const zauzet = await db
    .prepare("SELECT id FROM organizations WHERE slug = ? AND id IS NOT ?")
    .bind(u.slug, nacrt?.organizationId ?? null)
    .first<{ id: string }>();
  if (zauzet) return { ok: false, greske: { slug: "zauzet" } };
  const mreze = JSON.stringify(u.mreze);
  const kategorija = u.kategorija || null;
  const nula = (s: string) => s || null;

  if (nacrt) {
    await db
      .prepare(
        `UPDATE organizers SET holder_type = ?, legal_name = ?, oib = ?, address_line = ?, city = ?, postal_code = ?, updated_at = ?
          WHERE id = ?`,
      )
      .bind(VRSTA_NOSITELJA[oblik], u.naziv, u.oib, nula(u.adresa), nula(u.grad), nula(u.postanski), sad, nacrt.organizerId)
      .run();
    await db
      .prepare(
        `UPDATE organizations SET slug = ?, legal_form = ?, display_name = ?, description = ?, website = ?, social_links = ?,
                category_key = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(u.slug, oblik, u.naziv, u.opis, u.web, mreze, kategorija, sad, nacrt.organizationId)
      .run();
    await db.prepare("UPDATE organization_applications SET updated_at = ? WHERE id = ?").bind(sad, nacrt.applicationId).run();
    return { ok: true, slug: u.slug };
  }

  const organizerId = uuid7(sad);
  const orgId = uuid7(sad);
  await db
    .prepare(
      `INSERT INTO organizers (id, tenant_id, holder_type, legal_name, oib, address_line, city, postal_code, country_code,
                               contact_email, is_platform, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'HR', ?, 0, ?, ?)`,
    )
    .bind(organizerId, TENANT, VRSTA_NOSITELJA[oblik], u.naziv, u.oib, nula(u.adresa), nula(u.grad), nula(u.postanski), korisnik.email, sad, sad)
    .run();
  await db
    .prepare(
      `INSERT INTO organizations (id, organizer_id, slug, kind, legal_form, display_name, description, website, social_links,
                                  category_key, status, is_fixed_beneficiary, created_at, updated_at)
       VALUES (?, ?, ?, 'legal', ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
    )
    .bind(orgId, organizerId, u.slug, oblik, u.naziv, u.opis, u.web, mreze, kategorija, sad, sad)
    .run();
  await db
    .prepare("INSERT INTO memberships (user_id, organization_id, role, invited_by, created_at, updated_at) VALUES (?, ?, 'owner', NULL, ?, ?)")
    .bind(korisnik.id, orgId, sad, sad)
    .run();
  await db
    .prepare(
      `INSERT INTO organization_applications (id, organization_id, submitted_by, project_description, expected_payments, step,
                                              status, reason, created_at, updated_at, representative)
       VALUES (?, ?, ?, '', '1-10', 2, 'draft', NULL, ?, ?, '{}')`,
    )
    .bind(uuid7(sad), orgId, korisnik.id, sad, sad)
    .run();
  return { ok: true, slug: u.slug };
}

/** Tenant platforme u MPT-u (odluka 203); isti kao u seedu. */
export const TENANT = "sbx-crowdfund-demo";

export type PoljeZastupnika = "ime" | "prezime" | "funkcija" | "ovlast" | "nacrt";

export async function spremiZastupnika(db: D1Database, userId: string, z: Zastupnik, sad: number = Date.now()): Promise<Ishod<PoljeZastupnika>> {
  const g: Greske<PoljeZastupnika> = {};
  for (const p of ["ime", "prezime", "funkcija"] as const) {
    if (!z[p]) g[p] = "obavezno";
    else if (z[p].length > (p === "funkcija" ? NAJVISE.funkcija : NAJVISE.ime)) g[p] = "predugo";
  }
  if (!z.ovlast) g.ovlast = "obavezno";
  const nacrt = await nacrtZahtjeva(db, userId);
  if (!nacrt) g.nacrt = "nema";
  if (Object.keys(g).length || !nacrt) return { ok: false, greske: g };
  await db
    .prepare("UPDATE organization_applications SET representative = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(z), sad, nacrt.applicationId)
    .run();
  return { ok: true };
}

export type PoljeProjekta = "opisProjekta" | "ocekivaneUplate" | "nacrt";

export async function spremiProjekt(
  db: D1Database,
  userId: string,
  u: { opisProjekta: string; ocekivaneUplate: string },
  sad: number = Date.now(),
): Promise<Ishod<PoljeProjekta>> {
  const g: Greske<PoljeProjekta> = {};
  if (!u.opisProjekta) g.opisProjekta = "obavezno";
  else if (u.opisProjekta.length < OPIS_PROJEKTA_MIN) g.opisProjekta = "prekratko";
  else if (u.opisProjekta.length > NAJVISE.projekt) g.opisProjekta = "predugo";
  if (!OCEKIVANE_UPLATE.includes(u.ocekivaneUplate as OcekivaneUplate)) g.ocekivaneUplate = "obavezno";
  const nacrt = await nacrtZahtjeva(db, userId);
  if (!nacrt) g.nacrt = "nema";
  if (Object.keys(g).length || !nacrt) return { ok: false, greske: g };
  await db
    .prepare("UPDATE organization_applications SET project_description = ?, expected_payments = ?, updated_at = ? WHERE id = ?")
    .bind(u.opisProjekta, u.ocekivaneUplate, sad, nacrt.applicationId)
    .run();
  return { ok: true };
}

export type PoljeKyb = "privola" | "nacrt";

/** Korak KYB: privola da EMI (mock) provede KYB → `verifications(org_kyb, requested, mock)`, jednom po nacrtu. */
export async function spremiKyb(db: D1Database, userId: string, privola: boolean, sad: number = Date.now()): Promise<Ishod<PoljeKyb>> {
  const nacrt = await nacrtZahtjeva(db, userId);
  if (!nacrt) return { ok: false, greske: { nacrt: "nema" } };
  if (!privola) return { ok: false, greske: { privola: "obavezno" } };
  if (!nacrt.kyb) {
    await db
      .prepare(
        `INSERT INTO verifications (id, kind, subject_type, subject_id, status, provider, provider_ref, trigger, reason, requested_at)
         VALUES (?, 'org_kyb', 'organization', ?, 'requested', 'mock', NULL, 'user', NULL, ?)`,
      )
      .bind(uuid7(sad), nacrt.organizationId, sad)
      .run();
  }
  return { ok: true };
}

/** Koraci čarobnjaka zahtjeva redom (ključevi ruta `organisation.new.*`). */
export const KORACI_ZAHTJEVA = ["details", "representative", "project", "kyb", "review"] as const;
export type KorakZahtjeva = (typeof KORACI_ZAHTJEVA)[number];

/** Prvi korak koji nacrt još nema (za „Nastavi”); `review` kad je sve ispunjeno. */
export function prviNedovrseni(n: NacrtZahtjeva | null): KorakZahtjeva {
  if (!n) return "details";
  if (!n.zastupnik) return "representative";
  if (!n.projekt) return "project";
  if (!n.kyb) return "kyb";
  return "review";
}

export type GreskaSlanja = "nema" | "nedovrsen" | "uvjeti";

/**
 * Pošalji zahtjev: nacrt mora imati sve korake i prihvaćene uvjete. Zahtjev → `submitted` (step 3), KYB →
 * `submitted` (pružatelj `mock`). Organizacija ostaje `pending` dok EMI (moderator, simulacija) ne odluči.
 */
export async function posaljiZahtjev(
  db: D1Database,
  userId: string,
  uvjeti: boolean,
  sad: number = Date.now(),
): Promise<{ ok: true; slug: string } | { ok: false; greska: GreskaSlanja }> {
  const n = await nacrtZahtjeva(db, userId);
  if (!n) return { ok: false, greska: "nema" };
  if (prviNedovrseni(n) !== "review") return { ok: false, greska: "nedovrsen" };
  if (!uvjeti) return { ok: false, greska: "uvjeti" };
  await db
    .prepare("UPDATE organization_applications SET status = 'submitted', step = 3, updated_at = ? WHERE id = ?")
    .bind(sad, n.applicationId)
    .run();
  await db
    .prepare(
      `UPDATE verifications SET status = 'submitted', provider_ref = ?
        WHERE kind = 'org_kyb' AND subject_type = 'organization' AND subject_id = ? AND status = 'requested'`,
    )
    .bind(`MOCK-KYB-${n.slug}`, n.organizationId)
    .run();
  return { ok: true, slug: n.slug };
}

// --- Stanje zahtjeva (org.application) --------------------------------------------------------------------

export type StatusOrganizacije = "pending" | "active" | "suspended" | "closed";
export type StatusZahtjeva = "draft" | "submitted" | "approved" | "rejected";
export type StatusVerifikacije = "requested" | "submitted" | "in_review" | "approved" | "rejected" | "expired";

export interface StanjeZahtjeva {
  organizacija: {
    id: string;
    slug: string;
    naziv: string;
    status: StatusOrganizacije;
    pravniOblik: PravniOblik;
    oib: string | null;
    safeAdresa: string | null;
    safeLanac: number | null;
    primaKampanjeDrugih: boolean;
  };
  zahtjev: {
    id: string;
    status: StatusZahtjeva;
    korak: number;
    razlog: string | null;
    poslan: number;
    azuriran: number;
    opisProjekta: string;
    ocekivaneUplate: OcekivaneUplate;
    zastupnik: Zastupnik | null;
  } | null;
  kyb: { status: StatusVerifikacije; pruzatelj: string; razlog: string | null; zatrazeno: number; odluceno: number | null } | null;
  /** „N / 5” (docs/05 „Manji entiteti”): 1 račun · 2 zastupnik · 3 obrazac poslan · 4 KYB odobren · 5 prima kampanje drugih. */
  korak: number;
}

/**
 * Korak „N / 5” iz stanja: nacrt = 2, poslan = 3, organizacija `active` (KYB odobren) = 4, uz „prima kampanje
 * drugih” = 5. Organizacija bez zahtjeva (seed) računa se samo iz statusa.
 */
export function korakZahtjeva(s: { status: StatusOrganizacije; zahtjev: StatusZahtjeva | null; primaKampanjeDrugih: boolean }): number {
  if (s.status === "active" || s.zahtjev === "approved") return s.primaKampanjeDrugih ? 5 : 4;
  if (s.zahtjev === "submitted" || s.zahtjev === "rejected") return 3;
  return 2;
}

export async function stanjeZahtjeva(db: D1Database, orgId: string): Promise<StanjeZahtjeva | null> {
  const o = await db
    .prepare(
      `SELECT o.id, o.slug, o.display_name, o.status, o.legal_form, g.oib, o.safe_address, o.safe_chain_id, o.is_fixed_beneficiary
         FROM organizations o JOIN organizers g ON g.id = o.organizer_id WHERE o.id = ? AND o.deleted_at IS NULL`,
    )
    .bind(orgId)
    .first<{
      id: string;
      slug: string;
      display_name: string;
      status: StatusOrganizacije;
      legal_form: PravniOblik;
      oib: string | null;
      safe_address: string | null;
      safe_chain_id: number | null;
      is_fixed_beneficiary: number;
    }>();
  if (!o) return null;
  const a = await db
    .prepare(
      `SELECT id, status, step, reason, created_at, updated_at, project_description, expected_payments, representative
         FROM organization_applications WHERE organization_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    )
    .bind(orgId)
    .first<{
      id: string;
      status: StatusZahtjeva;
      step: number;
      reason: string | null;
      created_at: number;
      updated_at: number;
      project_description: string;
      expected_payments: OcekivaneUplate;
      representative: string;
    }>();
  const v = await db
    .prepare(
      `SELECT status, provider, reason, requested_at, decided_at FROM verifications
        WHERE kind = 'org_kyb' AND subject_type = 'organization' AND subject_id = ? ORDER BY requested_at DESC, id DESC LIMIT 1`,
    )
    .bind(orgId)
    .first<{ status: StatusVerifikacije; provider: string; reason: string | null; requested_at: number; decided_at: number | null }>();
  const primaKampanjeDrugih = o.is_fixed_beneficiary === 1;
  return {
    organizacija: {
      id: o.id,
      slug: o.slug,
      naziv: o.display_name,
      status: o.status,
      pravniOblik: o.legal_form,
      oib: o.oib,
      safeAdresa: o.safe_address,
      safeLanac: o.safe_chain_id,
      primaKampanjeDrugih,
    },
    zahtjev: a && {
      id: a.id,
      status: a.status,
      korak: a.step,
      razlog: a.reason,
      poslan: a.created_at,
      azuriran: a.updated_at,
      opisProjekta: a.project_description,
      ocekivaneUplate: a.expected_payments,
      zastupnik: zastupnikIz(a.representative),
    },
    kyb: v && { status: v.status, pruzatelj: v.provider, razlog: v.reason, zatrazeno: v.requested_at, odluceno: v.decided_at },
    korak: korakZahtjeva({ status: o.status, zahtjev: a?.status ?? null, primaKampanjeDrugih }),
  };
}

export type PoljeSafea = "adresa" | "lanac" | "stanje";

/**
 * Safe organizacije (tok 2): vlasnik upisuje adresu koju je dobio u setup dAppu; samo `active` organizacija
 * (nakon KYB-a). Provjera je oblik adrese i lanac; ništa se ne poziva (MPT `isUsableAddress` je S7).
 */
export async function spremiSafe(
  db: D1Database,
  orgId: string,
  u: { adresa: string; lanac: string },
  sad: number = Date.now(),
): Promise<Ishod<PoljeSafea>> {
  const g: Greske<PoljeSafea> = {};
  if (!u.adresa) g.adresa = "obavezno";
  else if (!valjanaAdresa(u.adresa)) g.adresa = "neispravno";
  const lanac = Number(u.lanac);
  if (!LANCI.includes(lanac as (typeof LANCI)[number])) g.lanac = "neispravno";
  const o = await db.prepare("SELECT status FROM organizations WHERE id = ? AND deleted_at IS NULL").bind(orgId).first<{ status: string }>();
  if (!o || o.status !== "active") g.stanje = "nije_aktivna";
  if (Object.keys(g).length) return { ok: false, greske: g };
  await db
    .prepare("UPDATE organizations SET safe_address = ?, safe_chain_id = ?, updated_at = ? WHERE id = ?")
    .bind(u.adresa.toLowerCase(), lanac, sad, orgId)
    .run();
  return { ok: true };
}

/** Ponovno slanje nakon odbijenog KYB-a: novi `verifications(org_kyb, submitted)`, zahtjev opet `submitted`. */
export async function ponovnoPosalji(db: D1Database, orgId: string, sad: number = Date.now()): Promise<boolean> {
  const s = await stanjeZahtjeva(db, orgId);
  if (!s?.zahtjev || s.zahtjev.status !== "rejected" || s.organizacija.status !== "pending") return false;
  await db
    .prepare("UPDATE organization_applications SET status = 'submitted', step = 3, reason = NULL, updated_at = ? WHERE id = ?")
    .bind(sad, s.zahtjev.id)
    .run();
  await db
    .prepare(
      `INSERT INTO verifications (id, kind, subject_type, subject_id, status, provider, provider_ref, trigger, reason, requested_at)
       VALUES (?, 'org_kyb', 'organization', ?, 'submitted', 'mock', ?, 'user', NULL, ?)`,
    )
    .bind(uuid7(sad), orgId, `MOCK-KYB-${s.organizacija.slug}`, sad)
    .run();
  return true;
}

/** Organizacije korisnika s ulogom (uvod čarobnjaka, poveznice na zahtjev i postavke). */
export async function organizacijeKorisnika(
  db: D1Database,
  userId: string,
): Promise<{ slug: string; naziv: string; status: StatusOrganizacije; uloga: string; zahtjev: StatusZahtjeva | null }[]> {
  const { results } = await db
    .prepare(
      `SELECT o.slug, o.display_name AS naziv, o.status, m.role AS uloga,
              (SELECT a.status FROM organization_applications a WHERE a.organization_id = o.id
                ORDER BY a.created_at DESC, a.id DESC LIMIT 1) AS zahtjev
         FROM memberships m JOIN organizations o ON o.id = m.organization_id AND o.deleted_at IS NULL
        WHERE m.user_id = ? ORDER BY o.display_name, o.slug`,
    )
    .bind(userId)
    .all<{ slug: string; naziv: string; status: StatusOrganizacije; uloga: string; zahtjev: StatusZahtjeva | null }>();
  return results;
}

// --- Postavke (org.settings) -----------------------------------------------------------------------------

export interface PostavkeOrganizacije {
  naziv: string;
  opis: string;
  web: string;
  mreze: string[];
  kategorija: string | null;
  primaKampanjeDrugih: boolean;
  status: StatusOrganizacije;
}

export async function postavkeOrganizacije(db: D1Database, orgId: string): Promise<PostavkeOrganizacije | null> {
  const r = await db
    .prepare(
      `SELECT display_name, description, website, social_links, category_key, is_fixed_beneficiary, status
         FROM organizations WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(orgId)
    .first<{
      display_name: string;
      description: string | null;
      website: string | null;
      social_links: string;
      category_key: string | null;
      is_fixed_beneficiary: number;
      status: StatusOrganizacije;
    }>();
  return (
    r && {
      naziv: r.display_name,
      opis: r.description ?? "",
      web: r.website ?? "",
      mreze: mrezeIz(r.social_links),
      kategorija: r.category_key,
      primaKampanjeDrugih: r.is_fixed_beneficiary === 1,
      status: r.status,
    }
  );
}

export type PoljePostavki = "naziv" | "opis" | "web" | "mreze" | "kategorija" | "primaKampanjeDrugih";

/**
 * Spremi javni profil. „Prima kampanje drugih” (`is_fixed_beneficiary`) smije uključiti samo `active`
 * organizacija; uključivanje pomiče zahtjev na korak 5 (docs/04 tok 2, opt „Fixed Beneficiary”).
 */
export async function spremiPostavke(
  db: D1Database,
  orgId: string,
  u: Omit<PostavkeOrganizacije, "status" | "kategorija"> & { kategorija: string },
  kategorije: readonly string[],
  sad: number = Date.now(),
): Promise<Ishod<PoljePostavki>> {
  const prije = await postavkeOrganizacije(db, orgId);
  if (!prije) return { ok: false, greske: { naziv: "nema" } };
  const g: Greske<PoljePostavki> = {};
  if (!u.naziv) g.naziv = "obavezno";
  else if (u.naziv.length > NAJVISE.naziv) g.naziv = "predugo";
  if (u.opis.length > NAJVISE.opis) g.opis = "predugo";
  if (u.web && !valjanUrl(u.web)) g.web = "neispravno";
  if (u.mreze.length > MREZA_NAJVISE || u.mreze.some((m) => !valjanUrl(m, NAJVISE.mreza))) g.mreze = "neispravno";
  if (u.kategorija && !kategorije.includes(u.kategorija)) g.kategorija = "neispravno";
  if (u.primaKampanjeDrugih && !prije.primaKampanjeDrugih && prije.status !== "active") g.primaKampanjeDrugih = "nije_aktivna";
  if (Object.keys(g).length) return { ok: false, greske: g };
  await db
    .prepare(
      `UPDATE organizations SET display_name = ?, description = ?, website = ?, social_links = ?, category_key = ?,
              is_fixed_beneficiary = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(u.naziv, u.opis || null, u.web || null, JSON.stringify(u.mreze), u.kategorija || null, u.primaKampanjeDrugih ? 1 : 0, sad, orgId)
    .run();
  if (u.primaKampanjeDrugih !== prije.primaKampanjeDrugih) {
    await db
      .prepare(
        `UPDATE organization_applications SET step = ?, updated_at = ?
          WHERE organization_id = ? AND status = 'approved'`,
      )
      .bind(u.primaKampanjeDrugih ? 5 : 4, sad, orgId)
      .run();
  }
  return { ok: true };
}

// --- Kampanje organizacije (org.campaigns) --------------------------------------------------------------

export interface KampanjaOrganizacije {
  id: string;
  publicId: string;
  naslov: string;
  state: string;
  pauzirana: boolean;
  blokirana: boolean;
  vrsta: "one_time" | "recurring" | "for_organization";
  /** Kampanja drugog korisnika za ovu organizaciju (Fixed Beneficiary). */
  zaOrganizaciju: boolean;
  autor: string | null;
  prikupljenoCenti: number;
  ciljCenti: number | null;
  brojDoprinosa: number;
  stvorena: number;
}

/** Sve kampanje organizacije (vlastite i tuđe za nju), bez obrisanih; najnovije prve. */
export async function kampanjeOrganizacije(db: D1Database, orgId: string): Promise<KampanjaOrganizacije[]> {
  const { results } = await db
    .prepare(
      `SELECT c.id, s.public_id, c.title, c.state, s.paused_at, s.blocked_at, s.kind, c.goal_cents, c.created_at,
              COALESCE(u.display_name, u.email) AS autor,
              COALESCE(st.raised_cents, 0) AS raised, COALESCE(st.contribution_count, 0) AS broj
         FROM organizations o
         JOIN campaigns c ON c.organizer_id = o.organizer_id
         JOIN campaign_settings s ON s.campaign_id = c.id
         LEFT JOIN users u ON u.id = s.created_by_user_id
         LEFT JOIN campaign_stats st ON st.campaign_id = c.id
        WHERE o.id = ? AND c.deleted_at IS NULL
        ORDER BY c.created_at DESC, c.id`,
    )
    .bind(orgId)
    .all<{
      id: string;
      public_id: string;
      title: string;
      state: string;
      paused_at: number | null;
      blocked_at: number | null;
      kind: KampanjaOrganizacije["vrsta"];
      goal_cents: number | null;
      created_at: number;
      autor: string | null;
      raised: number;
      broj: number;
    }>();
  return results.map((r) => ({
    id: r.id,
    publicId: r.public_id,
    naslov: r.title,
    state: r.state,
    pauzirana: r.paused_at !== null,
    blokirana: r.blocked_at !== null,
    vrsta: r.kind,
    zaOrganizaciju: r.kind === "for_organization",
    autor: r.autor,
    prikupljenoCenti: r.raised,
    ciljCenti: r.goal_cents,
    brojDoprinosa: r.broj,
    stvorena: r.created_at,
  }));
}

// --- Vanjske kampanje (org.external, tok 9, odluka 209) --------------------------------------------------

export interface VanjskaOrganizacije {
  id: string;
  url: string;
  externalId: string;
  naslov: string;
  kod: string;
  status: "pending" | "active" | "removed";
  provjerena: number | null;
}

/** URL 4fund kampanje: `https://4fund.com/{6 znakova}` (s `www.` ili bez, s kosom crtom na kraju ili bez). */
export function idVanjske(u: string): string | null {
  const m = u.trim().match(/^https:\/\/(?:www\.)?4fund\.com\/([a-zA-Z0-9]{6})\/?$/);
  return m ? m[1]!.toLowerCase() : null;
}

export async function vanjskeOrganizacije(db: D1Database, orgId: string): Promise<VanjskaOrganizacije[]> {
  const { results } = await db
    .prepare(
      `SELECT id, url, external_id, title, verify_code, status, verified_at FROM external_campaigns
        WHERE organization_id = ? AND status <> 'removed' ORDER BY created_at DESC, id`,
    )
    .bind(orgId)
    .all<{ id: string; url: string; external_id: string; title: string; verify_code: string; status: VanjskaOrganizacije["status"]; verified_at: number | null }>();
  return results.map((r) => ({ id: r.id, url: r.url, externalId: r.external_id, naslov: r.title, kod: r.verify_code, status: r.status, provjerena: r.verified_at }));
}

/** Kod za opis 4fund kampanje (dokaz vlasništva): `DOMOVINA-` + 8 znakova bez zbunjujućih slova. */
export function noviKodVanjske(): string {
  const abeceda = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(8));
  return `DOMOVINA-${[...b].map((x) => abeceda[x % abeceda.length]).join("")}`;
}

export type PoljeVanjske = "url" | "naslov" | "kategorija";

export async function dodajVanjsku(
  db: D1Database,
  orgId: string,
  u: { url: string; naslov: string; kategorija: string },
  kategorije: readonly string[],
  sad: number = Date.now(),
): Promise<Ishod<PoljeVanjske, { id: string; kod: string }>> {
  const g: Greske<PoljeVanjske> = {};
  const ext = idVanjske(u.url);
  if (!u.url) g.url = "obavezno";
  else if (!ext) g.url = "neispravno";
  if (!u.naslov) g.naslov = "obavezno";
  else if (u.naslov.length > 120) g.naslov = "predugo";
  if (u.kategorija && !kategorije.includes(u.kategorija)) g.kategorija = "neispravno";
  if (!g.url && ext) {
    const postoji = await db.prepare("SELECT 1 AS da FROM external_campaigns WHERE platform = '4fund' AND external_id = ?").bind(ext).first();
    if (postoji) g.url = "zauzet";
  }
  if (Object.keys(g).length || !ext) return { ok: false, greske: g };
  const id = uuid7(sad);
  const kod = noviKodVanjske();
  await db
    .prepare(
      `INSERT INTO external_campaigns (id, organization_id, platform, external_id, url, title, image_url, category_key, verify_code,
                                       status, verified_at, created_at, updated_at)
       VALUES (?, ?, '4fund', ?, ?, ?, NULL, ?, ?, 'pending', NULL, ?, ?)`,
    )
    .bind(id, orgId, ext, `https://4fund.com/${ext}`, u.naslov, u.kategorija || null, kod, sad, sad)
    .run();
  return { ok: true, id, kod };
}

/**
 * Mock provjere vlasništva: u prototipu se 4fund stranica ne dohvaća (tok 9, S8), pa gumb „provjeri” samo
 * aktivira kampanju. Vraća false kad kampanja nije `pending` ove organizacije.
 */
export async function potvrdiVanjsku(db: D1Database, orgId: string, id: string, sad: number = Date.now()): Promise<boolean> {
  const r = await db
    .prepare("UPDATE external_campaigns SET status = 'active', verified_at = ?, updated_at = ? WHERE id = ? AND organization_id = ? AND status = 'pending'")
    .bind(sad, sad, id, orgId)
    .run();
  return (r.meta as { changes?: number }).changes === 1;
}

export async function ukloniVanjsku(db: D1Database, orgId: string, id: string, sad: number = Date.now()): Promise<boolean> {
  const r = await db
    .prepare("UPDATE external_campaigns SET status = 'removed', updated_at = ? WHERE id = ? AND organization_id = ? AND status <> 'removed'")
    .bind(sad, id, orgId)
    .run();
  return (r.meta as { changes?: number }).changes === 1;
}

/** Rok pozivnice (docs/05 „Manji entiteti”): 7 dana. */
export const TRAJANJE_POZIVNICE = 7 * DAN;
