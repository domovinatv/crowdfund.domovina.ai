/**
 * Nacrt čarobnjaka kampanje (odluke 152, 211; docs/04 §3; obilazak 03–07 i 25).
 *
 * Nacrt je JSON istog oblika na oba mjesta: neprijavljenom u kolačiću ovog preglednika
 * (`components/carobnjak/kolacic.ts`), prijavljenom u `campaign_drafts`. Pri prvom ulasku prijavljenog u
 * čarobnjak lokalni nacrt prelazi na poslužitelj kao `source = 'local'` (odluka 152: jasna oznaka izvora).
 * Red u `campaigns` nastaje tek na „Objavi” (`objava.ts`).
 *
 * Validacija koraka je čista funkcija nad poljima obrasca: vraća novi nacrt i greške po polju (kodovi; tekst je
 * u `views/sadrzaj/carobnjak.ts`).
 */
import { uuid7 } from "./zajednicko";
import { parsirajVideo } from "../video";

export const KORACI = ["type", "goal", "media", "description", "preview"] as const;
export type Korak = (typeof KORACI)[number];

export const VRSTE_KAMPANJE = ["one_time", "recurring", "for_organization"] as const;
export type VrstaKampanje = (typeof VRSTE_KAMPANJE)[number];

/** Kategorije iz 0003 (odluka 216), istim redom. */
export const KATEGORIJE = ["charity", "culture", "projects", "needs", "sport", "animals", "travel", "other"] as const;

/** 15 tema naslovnice (CHECK `campaign_settings.cover_theme`, odluka 216). */
export const TEME = [
  "birthday", "charity", "general", "dream", "event", "gift", "memory", "needs",
  "animals", "project", "repairs", "school", "sports", "travel", "treatment",
] as const;

export const NASLOV_MAX = 60;
export const NASLOV_MIN = 3;
export const OPIS_MIN = 50;
/** Gornja granica opisa u prototipu (neprijavljenom nacrt stoji u kolačiću). */
export const OPIS_MAX = 5000;
export const CILJ_MIN = 100;
export const CILJ_MAX = 100_000_000;
/** Rok najviše dvije godine unaprijed. */
export const ROK_MAX_DANA = 730;

export type IzborOrganizacije =
  | { nacin: "moja"; orgId: string }
  | { nacin: "za"; orgId: string }
  | { nacin: "osobno" };

export interface Nacrt {
  vrsta?: VrstaKampanje;
  kategorija?: string;
  naslov?: string;
  /** null = bez cilja (dopušteno samo mjesečnoj). */
  ciljCenti?: number | null;
  /** `YYYY-MM-DD` ili null. */
  rok?: string | null;
  organizacija?: IzborOrganizacije | null;
  tema?: string;
  videoUrl?: string | null;
  /** Korak medija je potvrđen (može ostati bez videa: tema je dovoljna). */
  mediji?: boolean;
  opis?: string;
}

export type Greske = Record<string, string>;
export interface IshodKoraka {
  nacrt: Nacrt;
  greske: Greske;
}

const jeNiz = (x: unknown): x is string => typeof x === "string";
const ima = <T extends string>(lista: readonly T[], x: unknown): x is T => jeNiz(x) && (lista as readonly string[]).includes(x);

/** Nacrt iz nepouzdanog JSON-a (kolačić, stari red): samo poznata polja ispravnog tipa. */
export function ocistiNacrt(x: unknown): Nacrt {
  if (!x || typeof x !== "object") return {};
  const o = x as Record<string, unknown>;
  const n: Nacrt = {};
  if (ima(VRSTE_KAMPANJE, o.vrsta)) n.vrsta = o.vrsta;
  if (ima(KATEGORIJE, o.kategorija)) n.kategorija = o.kategorija;
  if (jeNiz(o.naslov)) n.naslov = o.naslov.slice(0, NASLOV_MAX);
  if (o.ciljCenti === null) n.ciljCenti = null;
  else if (typeof o.ciljCenti === "number" && Number.isInteger(o.ciljCenti) && o.ciljCenti >= CILJ_MIN && o.ciljCenti <= CILJ_MAX) n.ciljCenti = o.ciljCenti;
  if (o.rok === null) n.rok = null;
  else if (jeNiz(o.rok) && /^\d{4}-\d{2}-\d{2}$/.test(o.rok)) n.rok = o.rok;
  const org = o.organizacija as Record<string, unknown> | null | undefined;
  if (org === null) n.organizacija = null;
  else if (org && typeof org === "object") {
    if (org.nacin === "osobno") n.organizacija = { nacin: "osobno" };
    else if ((org.nacin === "moja" || org.nacin === "za") && jeNiz(org.orgId) && org.orgId.length <= 64) n.organizacija = { nacin: org.nacin, orgId: org.orgId };
  }
  if (ima(TEME, o.tema)) n.tema = o.tema;
  if (o.videoUrl === null) n.videoUrl = null;
  else if (jeNiz(o.videoUrl) && valjanVideoUrl(o.videoUrl)) n.videoUrl = o.videoUrl;
  if (o.mediji === true) n.mediji = true;
  if (jeNiz(o.opis)) n.opis = o.opis.slice(0, OPIS_MAX);
  return n;
}

export const prazan = (n: Nacrt): boolean => Object.keys(n).length === 0;

/** Je li korak dovršen (po podacima nacrta). */
export function korakDovrsen(n: Nacrt, k: Korak): boolean {
  switch (k) {
    case "type":
      return !!n.vrsta && (n.vrsta === "for_organization" || !!n.kategorija);
    case "goal": {
      if (!n.naslov || n.naslov.trim().length < NASLOV_MIN) return false;
      if (n.ciljCenti === undefined || (n.ciljCenti === null && n.vrsta !== "recurring")) return false;
      return n.vrsta === "for_organization" ? n.organizacija?.nacin === "za" : n.organizacija !== undefined;
    }
    case "media":
      return !!n.mediji && !!n.tema;
    case "description":
      return !!n.opis && duljinaOpisa(n.opis) >= OPIS_MIN && zabranjeneRijeci(n.opis).length === 0;
    case "preview":
      return false;
  }
}

/** Prvi nedovršeni korak (302 s `/nova-kampanja`, docs/07); sve gotovo → pregled. */
export function prviNedovrseni(n: Nacrt): Korak {
  return KORACI.find((k) => !korakDovrsen(n, k)) ?? "preview";
}

/** Broj koraka 1–5 (stupac `campaign_drafts.step`). */
export const brojKoraka = (k: Korak): number => KORACI.indexOf(k) + 1;

export const duljinaOpisa = (opis: string): number => opis.trim().length;

/**
 * Zabranjene riječi u opisu i naslovu: kampanja je donacija, ne ulaganje (copy pravilo, CLAUDE.md; odluka 8).
 * Korijeni se traže na početku riječi, pa „doprinos” ne pada na „prinos”. Vraća pronađene riječi (bez ponavljanja).
 */
const ZABRANJENO = /(?<![\p{L}\p{N}])(invest\p{L}*|ula[gž]\p{L}*|ulož\p{L}*|dionic\p{L}*|dividend\p{L}*|kamat\p{L}*|prinos\p{L}*|equity|shareholder\p{L}*|kriptovalut\p{L}*|zajam\p{L}*|zajm\p{L}*)/giu;

export function zabranjeneRijeci(tekst: string): string[] {
  const nadjeno = new Set<string>();
  for (const m of tekst.matchAll(ZABRANJENO)) nadjeno.add(m[0].toLowerCase());
  return [...nadjeno];
}

/** Iznos u eurima iz obrasca („10.000”, „10 000”, „10000,50”, „10000.5”) → centi, ili null kad nije broj. */
export function parsirajIznos(s: string): number | null {
  let t = s.replace(/[\s €]/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/** Datum `YYYY-MM-DD` (UTC dan). */
export const danUtc = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** Kraj dana roka u ms (23:59:59.999 UTC), za `campaigns.ends_at`. */
export const krajDana = (rok: string): number => Date.parse(`${rok}T23:59:59.999Z`);

/** Samo URL koji stranica kampanje zna prikazati (`parsirajVideo`, S11): YouTube ili Vimeo sa strogim ID-om. */
export function valjanVideoUrl(s: string): boolean {
  return parsirajVideo(s) !== null;
}

type Polja = Record<string, string>;
const polje = (f: Polja, k: string) => (f[k] ?? "").trim();

/** Korak 1: vrsta i kategorija; `za` (org id iz `?za=`) bira organizaciju za koju se prikuplja. */
export function korakVrsta(n: Nacrt, f: Polja): IshodKoraka {
  const greske: Greske = {};
  const vrsta = polje(f, "vrsta");
  const kategorija = polje(f, "kategorija");
  const novi: Nacrt = { ...n };
  if (!ima(VRSTE_KAMPANJE, vrsta)) greske.vrsta = "obavezno";
  else {
    if (novi.vrsta && novi.vrsta !== vrsta && (novi.vrsta === "for_organization" || vrsta === "for_organization")) delete novi.organizacija;
    if (novi.vrsta === "recurring" && vrsta !== "recurring" && novi.ciljCenti === null) delete novi.ciljCenti;
    novi.vrsta = vrsta;
  }
  if (vrsta !== "for_organization") {
    if (!ima(KATEGORIJE, kategorija)) greske.kategorija = "obavezno";
    else novi.kategorija = kategorija;
  }
  const za = polje(f, "za");
  if (vrsta === "for_organization" && za) novi.organizacija = { nacin: "za", orgId: za };
  if (novi.kategorija && !novi.tema) novi.tema = TEMA_KATEGORIJE[novi.kategorija];
  return { nacrt: novi, greske };
}

/** Teme po kategoriji (isto kao seed i `components/katalog/teme.ts`). */
export const TEMA_KATEGORIJE: Record<string, string> = {
  charity: "charity", culture: "event", projects: "project", needs: "needs",
  sport: "sports", animals: "animals", travel: "travel", other: "general",
};

export interface OpcijeOrganizacije {
  /** Moje organizacije s ulogom ≥ admin (id → može objaviti, tj. `status = active`). */
  moje: { id: string }[];
  /** Organizacije koje primaju kampanje drugih (Fixed Beneficiary, aktivne). */
  primatelji: { id: string }[];
  /** Neprijavljeni bira organizaciju nakon prijave. */
  prijavljen: boolean;
}

/** Korak 2: naslov, cilj, rok i tko prikuplja (`organizacija` = `moja:<id>`, `za:<id>`, `osobno` ili prazno). */
export function korakCilj(n: Nacrt, f: Polja, o: OpcijeOrganizacije, sad: number): IshodKoraka {
  const greske: Greske = {};
  const novi: Nacrt = { ...n };
  const naslov = polje(f, "naslov").replace(/\s+/g, " ");
  novi.naslov = naslov;
  if (!naslov) greske.naslov = "obavezno";
  else if (naslov.length < NASLOV_MIN) greske.naslov = "prekratko";
  else if (naslov.length > NASLOV_MAX) greske.naslov = "predugo";
  else if (zabranjeneRijeci(naslov).length) greske.naslov = "zabranjeno";

  const ciljTekst = polje(f, "cilj");
  if (!ciljTekst) {
    if (n.vrsta === "recurring") novi.ciljCenti = null;
    else greske.cilj = "obavezno";
  } else {
    const c = parsirajIznos(ciljTekst);
    if (c === null) greske.cilj = "neispravno";
    else if (c < CILJ_MIN) greske.cilj = "premalo";
    else if (c > CILJ_MAX) greske.cilj = "previse";
    else novi.ciljCenti = c;
  }

  const rok = polje(f, "rok");
  if (!rok || n.vrsta === "recurring") novi.rok = null;
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(rok) || Number.isNaN(Date.parse(`${rok}T00:00:00Z`))) greske.rok = "neispravno";
  else if (rok <= danUtc(sad)) greske.rok = "proslost";
  else if (rok > danUtc(sad + ROK_MAX_DANA * 86_400_000)) greske.rok = "predaleko";
  else novi.rok = rok;

  const org = polje(f, "organizacija");
  const [nacin, orgId = ""] = org.split(":");
  if (n.vrsta === "for_organization") {
    if (nacin === "za" && o.primatelji.some((p) => p.id === orgId)) novi.organizacija = { nacin: "za", orgId };
    else greske.organizacija = "obavezno_primatelj";
  } else if (nacin === "moja" && o.moje.some((m) => m.id === orgId)) novi.organizacija = { nacin: "moja", orgId };
  else if (nacin === "osobno") novi.organizacija = { nacin: "osobno" };
  else if (!org && !o.prijavljen) novi.organizacija = null;
  else greske.organizacija = "obavezno";
  return { nacrt: novi, greske };
}

/** Korak 3: tema naslovnice i video (slike su mock dok nema R2). */
export function korakMediji(n: Nacrt, f: Polja): IshodKoraka {
  const greske: Greske = {};
  const novi: Nacrt = { ...n };
  const tema = polje(f, "tema");
  if (!ima(TEME, tema)) greske.tema = "obavezno";
  else novi.tema = tema;
  const video = polje(f, "video");
  if (!video) novi.videoUrl = null;
  else if (!valjanVideoUrl(video)) greske.video = "neispravno";
  else novi.videoUrl = video;
  if (!Object.keys(greske).length) novi.mediji = true;
  return { nacrt: novi, greske };
}

/** Korak 4: opis ≥ 50 znakova, bez zabranjenih riječi. */
export function korakOpis(n: Nacrt, f: Polja): IshodKoraka {
  const greske: Greske = {};
  const opis = (f.opis ?? "").replace(/\r\n/g, "\n").trim();
  const novi: Nacrt = { ...n, opis: opis.slice(0, OPIS_MAX) };
  if (!opis) greske.opis = "obavezno";
  else if (duljinaOpisa(opis) < OPIS_MIN) greske.opis = "prekratko";
  else if (opis.length > OPIS_MAX) greske.opis = "predugo";
  else if (zabranjeneRijeci(opis).length) greske.opis = "zabranjeno";
  return { nacrt: novi, greske };
}

// --- campaign_drafts --------------------------------------------------------------------------------

export interface RedNacrta {
  id: string;
  source: "local" | "server";
  step: number;
  nacrt: Nacrt;
  campaignId: string | null;
  createdAt: number;
  updatedAt: number;
}

interface SirovRed {
  id: string;
  source: "local" | "server";
  step: number;
  data: string;
  campaign_id: string | null;
  created_at: number;
  updated_at: number;
}

const izReda = (r: SirovRed): RedNacrta => {
  let data: unknown = {};
  try {
    data = JSON.parse(r.data);
  } catch {
    data = {};
  }
  return { id: r.id, source: r.source, step: r.step, nacrt: ocistiNacrt(data), campaignId: r.campaign_id, createdAt: r.created_at, updatedAt: r.updated_at };
};

/** Trenutni nacrt korisnika: zadnji mijenjan, još neobjavljen. */
export async function trenutniNacrt(db: D1Database, userId: string): Promise<RedNacrta | null> {
  const r = await db
    .prepare(
      `SELECT id, source, step, data, campaign_id, created_at, updated_at FROM campaign_drafts
        WHERE user_id = ? AND campaign_id IS NULL ORDER BY updated_at DESC, id DESC LIMIT 1`,
    )
    .bind(userId)
    .first<SirovRed>();
  return r ? izReda(r) : null;
}

/** Svi neobjavljeni nacrti korisnika (moje kampanje). */
export async function nacrtiKorisnika(db: D1Database, userId: string): Promise<RedNacrta[]> {
  const { results } = await db
    .prepare(
      `SELECT id, source, step, data, campaign_id, created_at, updated_at FROM campaign_drafts
        WHERE user_id = ? AND campaign_id IS NULL ORDER BY updated_at DESC, id DESC`,
    )
    .bind(userId)
    .all<SirovRed>();
  return results.map(izReda);
}

/** Novi nacrt na poslužitelju. `source = local` kad dolazi iz preglednika (odluka 152). */
export async function stvoriNacrt(db: D1Database, userId: string, n: Nacrt, source: "local" | "server", sad: number): Promise<string> {
  const id = uuid7(sad);
  await db
    .prepare("INSERT INTO campaign_drafts (id, user_id, source, step, data, campaign_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)")
    .bind(id, userId, source, brojKoraka(prviNedovrseni(n)), JSON.stringify(n), sad, sad)
    .run();
  return id;
}

/** Spremi nacrt (samo vlasnikov i neobjavljen). Vraća false kad reda nema. */
export async function spremiNacrt(db: D1Database, userId: string, id: string, n: Nacrt, sad: number): Promise<boolean> {
  const r = await db
    .prepare("UPDATE campaign_drafts SET data = ?, step = ?, updated_at = ? WHERE id = ? AND user_id = ? AND campaign_id IS NULL")
    .bind(JSON.stringify(n), brojKoraka(prviNedovrseni(n)), sad, id, userId)
    .run();
  return (r.meta as { changes?: number }).changes !== 0;
}

/** „Nastavi” s popisa nacrta: postaje trenutni (najnoviji `updated_at`). */
export async function oznaciTrenutnim(db: D1Database, userId: string, id: string, sad: number): Promise<boolean> {
  const r = await db
    .prepare("UPDATE campaign_drafts SET updated_at = ? WHERE id = ? AND user_id = ? AND campaign_id IS NULL")
    .bind(sad, id, userId)
    .run();
  return (r.meta as { changes?: number }).changes !== 0;
}

/** Obriši neobjavljeni nacrt („Počni ispočetka”, „Obriši nacrt”). */
export async function obrisiNacrt(db: D1Database, userId: string, id: string): Promise<boolean> {
  const r = await db.prepare("DELETE FROM campaign_drafts WHERE id = ? AND user_id = ? AND campaign_id IS NULL").bind(id, userId).run();
  return (r.meta as { changes?: number }).changes !== 0;
}

/** Nacrt je objavljen: veza na kampanju. */
export async function zatvoriNacrt(db: D1Database, id: string, campaignId: string, sad: number): Promise<void> {
  await db.prepare("UPDATE campaign_drafts SET campaign_id = ?, step = 5, updated_at = ? WHERE id = ?").bind(campaignId, sad, id).run();
}
