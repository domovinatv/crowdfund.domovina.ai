/**
 * Mock prijava bez lozinke (odluke 15, 208; docs/04 §1): jednokratni kod i poveznica „e-poštom”,
 * sesija u kolačiću. Ništa se ne šalje: „pošta” je kolačić `demo_posta` koji stranice prikazuju u
 * jasno označenom demo okviru (`DemoPosta.astro`).
 *
 * - Kod: 6 znamenki, 5 minuta, najviše 5 pokušaja, `code_hash = SHA-256("{id}:{kod}")`.
 * - Poveznica: zaseban red iste svrhe s `action = 'link'`, `code_hash = SHA-256(token)`; token je u URL-u.
 * - Sesija: `sessions.id = SHA-256(token)`, token samo u kolačiću `sesija` (HttpOnly, Lax, Secure na https,
 *   30 dana). Opoziv = `revoked_at`.
 *
 * Sve funkcije primaju `D1Database` i `sad` (ms), pa ih test zove nad sqliteom (test/pomoc/baza.ts).
 */
import type { AstroCookies } from "astro";
import type { Lang } from "../i18n";
import { DAN, MIN, uuid7 } from "./db/zajednicko";

export const KOLACIC_SESIJE = "sesija";
/** Id retka `one_time_codes` čiji se kod upisuje na `/prijava/kod` ili `/registracija/potvrda`. */
export const KOLACIC_PRIJAVE = "prijava";
/** Mock pretinac: zadnja „poslana” poruka (kod i poveznica) za ovaj preglednik. */
export const KOLACIC_DEMO_POSTE = "demo_posta";

export const TRAJANJE_SESIJE = 30 * DAN;
export const TRAJANJE_KODA = 5 * MIN;
export const NAJVISE_POKUSAJA = 5;
/** Dodatna potvrda (P+e) vrijedi 10 minuta od upisa koda (docs/07 „Razine pristupa”). */
export const SVJEZA_POTVRDA = 10 * MIN;
/** Verzija teksta uvjeta i privatnosti za `consents.text_version`. */
export const VERZIJA_UVJETA = "uvjeti-2026-11";

export type Svrha = "login" | "email_verify" | "step_up";
export type PlatformRole = "user" | "moderator";

/** Prijavljeni korisnik u `Astro.locals.korisnik` i `KontekstStranice.korisnik`. */
export interface Korisnik {
  id: string;
  email: string;
  /** Ime za prikaz: display_name, pa ime i prezime, pa dio e-pošte prije `@`. */
  ime: string;
  platformRole: PlatformRole;
}

/** Demo računi iz seeda (seed/primjeri.json `demoRacuni`); prikazuju se na mock Google ekranu. */
export const DEMO_RACUNI = [
  { email: "ivana.testic@demo.invalid", uloga: "organizator" },
  { email: "filip.moderovic@demo.invalid", uloga: "moderator" },
  { email: "novi@demo.invalid", uloga: "novi" },
] as const;

// --- Kriptografija ---------------------------------------------------------------------------------

function base64url(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256 kao hex (sesije, poveznice, pozivnice, kodovi). Isto računa `scripts/seed.mjs`. */
export async function hashTokena(token: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Slučajni token od 32 bajta (base64url, 43 znaka). */
export function noviToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

/** Slučajni 6-znamenkasti kod, ravnomjerno (odbacivanje iznad najvećeg višekratnika od 10^6). */
export function noviKod(): string {
  const granica = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  const b = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(b);
    if (b[0]! < granica) return String(b[0]! % 1_000_000).padStart(6, "0");
  }
}

const hashKoda = (id: string, kod: string) => hashTokena(`${id}:${kod}`);

// --- E-pošta i korisnici ----------------------------------------------------------------------------

export const normalizirajEmail = (e: string): string => e.trim().toLowerCase();

/** Dovoljna provjera za prototip: jedan `@`, točka u domeni, bez razmaka, ≤ 254 znaka. */
export function valjanEmail(e: string): boolean {
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

interface RedakKorisnika {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  platform_role: PlatformRole;
  deleted_at: number | null;
}

function korisnikIz(r: RedakKorisnika): Korisnik {
  const puno = [r.first_name, r.last_name].filter(Boolean).join(" ");
  return { id: r.id, email: r.email, ime: r.display_name || puno || r.email.split("@")[0]!, platformRole: r.platform_role };
}

/** Korisnik po e-pošti (i obrisan, s `obrisan: true`), ili null. */
export async function korisnikPoEmailu(db: D1Database, email: string): Promise<(Korisnik & { obrisan: boolean }) | null> {
  const r = await db
    .prepare("SELECT id, email, display_name, first_name, last_name, platform_role, deleted_at FROM users WHERE email = ?")
    .bind(normalizirajEmail(email))
    .first<RedakKorisnika>();
  return r ? { ...korisnikIz(r), obrisan: r.deleted_at !== null } : null;
}

export interface NoviKorisnik {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  locale?: Lang;
}

/** Upiše korisnika (e-pošta nije potvrđena dok se ne upiše kod) i privolu uvjeta; vraća id. */
export async function stvoriKorisnika(db: D1Database, n: NoviKorisnik, sad: number, newsletter?: boolean): Promise<string> {
  const id = uuid7(sad);
  const ime = n.firstName?.trim() || null;
  const prezime = n.lastName?.trim() || null;
  const prikaz = [ime, prezime].filter(Boolean).join(" ") || null;
  await db
    .prepare(
      `INSERT INTO users (id, email, display_name, first_name, last_name, locale, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, normalizirajEmail(n.email), prikaz, ime, prezime, n.locale ?? "hr", sad, sad)
    .run();
  await zapisiPrivolu(db, id, "terms_privacy", true, sad);
  if (newsletter !== undefined) await zapisiPrivolu(db, id, "newsletter", newsletter, sad);
  return id;
}

export async function zapisiPrivolu(db: D1Database, userId: string, kind: "terms_privacy" | "newsletter", granted: boolean, sad: number): Promise<void> {
  await db
    .prepare("INSERT INTO consents (id, user_id, email, kind, text_version, granted, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)")
    .bind(uuid7(sad), userId, kind, VERZIJA_UVJETA, granted ? 1 : 0, sad)
    .run();
}

// --- Jednokratni kodovi i poveznice -----------------------------------------------------------------

export interface IzdaniKod {
  /** Id retka koda (kolačić `prijava`; za step_up i token rute `potvrda-radnje/{token}`). */
  id: string;
  kod: string;
  /** Token poveznice (`/auth/link/{token}`); samo za login i email_verify. */
  link: string | null;
  istjece: number;
}

/**
 * Izda novi kod (i poveznicu, osim za step_up). Prethodni neiskorišteni kodovi iste svrhe (i radnje)
 * za istu e-poštu prestaju vrijediti, pa vrijedi samo zadnji poslani.
 */
export async function izdajKod(
  db: D1Database,
  o: { email: string; userId: string | null; svrha: Svrha; action?: string | null; sad: number },
): Promise<IzdaniKod> {
  const email = normalizirajEmail(o.email);
  const action = o.svrha === "step_up" ? (o.action ?? null) : null;
  await db
    .prepare(
      `UPDATE one_time_codes SET expires_at = ?
        WHERE email = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?
          AND (? IS NULL OR action = ?)`,
    )
    .bind(o.sad, email, o.svrha, o.sad, action, action)
    .run();
  const istjece = o.sad + TRAJANJE_KODA;
  const id = uuid7(o.sad);
  const kod = noviKod();
  await db
    .prepare(
      `INSERT INTO one_time_codes (id, user_id, email, purpose, action, code_hash, attempts, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    )
    .bind(id, o.userId, email, o.svrha, action, await hashKoda(id, kod), o.sad, istjece)
    .run();
  let link: string | null = null;
  if (o.svrha !== "step_up") {
    link = noviToken();
    await db
      .prepare(
        `INSERT INTO one_time_codes (id, user_id, email, purpose, action, code_hash, attempts, created_at, expires_at)
         VALUES (?, ?, ?, ?, 'link', ?, 0, ?, ?)`,
      )
      .bind(uuid7(o.sad), o.userId, email, o.svrha, await hashTokena(link), o.sad, istjece)
      .run();
  }
  return { id, kod, link, istjece };
}

export type RazlogNeuspjeha = "nema" | "istekao" | "iskoristen" | "pokusaji" | "pogresan";
export type IshodKoda =
  | { ok: true; userId: string | null; email: string; svrha: Svrha; action: string | null }
  | { ok: false; razlog: RazlogNeuspjeha; preostalo?: number };

interface RedakKoda {
  id: string;
  user_id: string | null;
  email: string;
  purpose: Svrha;
  action: string | null;
  code_hash: string;
  attempts: number;
  expires_at: number;
  used_at: number | null;
}

const KOLONE_KODA = "id, user_id, email, purpose, action, code_hash, attempts, expires_at, used_at";

export type StanjeKoda = "vrijedi" | "istekao" | "iskoristen" | "pokusaji";

function stanjeRetka(r: RedakKoda, sad: number): StanjeKoda {
  if (r.used_at !== null) return "iskoristen";
  if (r.attempts >= NAJVISE_POKUSAJA) return "pokusaji";
  if (r.expires_at <= sad) return "istekao";
  return "vrijedi";
}

/** Red koda po id-u (bez provjere koda), za prikaz stanja na stranici unosa. */
export async function kodPoId(
  db: D1Database,
  id: string,
  sad: number,
): Promise<{ id: string; email: string; userId: string | null; svrha: Svrha; action: string | null; stanje: StanjeKoda; istjece: number } | null> {
  const r = await db.prepare(`SELECT ${KOLONE_KODA} FROM one_time_codes WHERE id = ? AND (action IS NULL OR action != 'link')`).bind(id).first<RedakKoda>();
  return r && { id: r.id, email: r.email, userId: r.user_id, svrha: r.purpose, action: r.action, stanje: stanjeRetka(r, sad), istjece: r.expires_at };
}

/** Iskoristi red (samo ako još nije) i poništi ostale neiskorištene iste svrhe za tu e-poštu. */
async function iskoristi(db: D1Database, r: RedakKoda, sad: number): Promise<boolean> {
  const u = await db.prepare("UPDATE one_time_codes SET used_at = ? WHERE id = ? AND used_at IS NULL").bind(sad, r.id).run();
  if ((u.meta.changes ?? 0) !== 1) return false;
  if (r.purpose !== "step_up") {
    await db
      .prepare("UPDATE one_time_codes SET expires_at = ? WHERE email = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?")
      .bind(sad, r.email, r.purpose, sad)
      .run();
  }
  return true;
}

/**
 * Provjeri upisani kod za red `id`. Pogrešan kod troši pokušaj; peti pogrešan zaključava red.
 * `svrha` i (za step_up) `userId` moraju odgovarati retku, inače „nema”.
 */
export async function provjeriKod(
  db: D1Database,
  o: { id: string; kod: string; svrha: Svrha; userId?: string; sad: number },
): Promise<IshodKoda> {
  const r = await db
    .prepare(`SELECT ${KOLONE_KODA} FROM one_time_codes WHERE id = ? AND purpose = ? AND (action IS NULL OR action != 'link')`)
    .bind(o.id, o.svrha)
    .first<RedakKoda>();
  if (!r || (o.userId !== undefined && r.user_id !== o.userId)) return { ok: false, razlog: "nema" };
  const stanje = stanjeRetka(r, o.sad);
  if (stanje !== "vrijedi") return { ok: false, razlog: stanje };
  const kod = o.kod.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(kod) || (await hashKoda(r.id, kod)) !== r.code_hash) {
    const pokusaji = r.attempts + 1;
    await db.prepare("UPDATE one_time_codes SET attempts = ? WHERE id = ?").bind(pokusaji, r.id).run();
    return pokusaji >= NAJVISE_POKUSAJA
      ? { ok: false, razlog: "pokusaji" }
      : { ok: false, razlog: "pogresan", preostalo: NAJVISE_POKUSAJA - pokusaji };
  }
  if (!(await iskoristi(db, r, o.sad))) return { ok: false, razlog: "iskoristen" };
  return { ok: true, userId: r.user_id, email: r.email, svrha: r.purpose, action: r.action };
}

async function redPoveznice(db: D1Database, token: string): Promise<RedakKoda | null> {
  if (!token || token.length > 128) return null;
  return db
    .prepare(`SELECT ${KOLONE_KODA} FROM one_time_codes WHERE code_hash = ? AND action = 'link' AND purpose IN ('login','email_verify')`)
    .bind(await hashTokena(token))
    .first<RedakKoda>();
}

/** Stanje poveznice za GET (ne troši je; GET ne mijenja stanje, docs/07 konvencija 5). null = 404. */
export async function stanjePoveznice(db: D1Database, token: string, sad: number): Promise<{ email: string; stanje: StanjeKoda } | null> {
  const r = await redPoveznice(db, token);
  return r && { email: r.email, stanje: stanjeRetka(r, sad) };
}

/** Iskoristi poveznicu (POST s gumba na stranici poveznice). */
export async function iskoristiPoveznicu(db: D1Database, token: string, sad: number): Promise<IshodKoda> {
  const r = await redPoveznice(db, token);
  if (!r) return { ok: false, razlog: "nema" };
  const stanje = stanjeRetka(r, sad);
  if (stanje !== "vrijedi") return { ok: false, razlog: stanje };
  if (!(await iskoristi(db, r, sad))) return { ok: false, razlog: "iskoristen" };
  return { ok: true, userId: r.user_id, email: r.email, svrha: r.purpose, action: null };
}

// --- Sesije -----------------------------------------------------------------------------------------

export type NacinPrijave = "email_code" | "email_link" | "google";

/** IPv4 → /24, IPv6 → /48; puna adresa se ne sprema (docs/09 login_events). */
export function ipPrefiks(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/);
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0/24`;
  if (ip.includes(":")) {
    const dijelovi = ip.split("::")[0]!.split(":").filter(Boolean).slice(0, 3);
    while (dijelovi.length < 3) dijelovi.push("0");
    return `${dijelovi.join(":")}::/48`;
  }
  return null;
}

/** Grubi opis uređaja iz User-Agenta (preglednik i sustav), bez punog niza. */
export function opisUredaja(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const preglednik = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /curl\//.test(ua) ? "curl" : "preglednik";
  const sustav = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : null;
  return sustav ? `${preglednik}, ${sustav}` : preglednik;
}

export interface NovaSesija {
  token: string;
  id: string;
  istjece: number;
}

/**
 * Prijavi korisnika: potvrđena e-pošta, `auth_identities` (provider + subject), sesija, `login_events`.
 * Google je mock: subject `mock-google:{e-pošta}`.
 */
export async function prijavi(
  db: D1Database,
  o: { userId: string; email: string; nacin: NacinPrijave; sad: number; ip?: string | null; userAgent?: string | null },
): Promise<NovaSesija> {
  const email = normalizirajEmail(o.email);
  const subject = o.nacin === "google" ? `mock-google:${email}` : email;
  await db
    .prepare("UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?")
    .bind(o.sad, o.sad, o.userId)
    .run();
  await db
    .prepare(
      `INSERT INTO auth_identities (id, user_id, provider, subject, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (provider, subject) DO UPDATE SET last_used_at = excluded.last_used_at`,
    )
    .bind(uuid7(o.sad), o.userId, o.nacin, subject, o.sad, o.sad)
    .run();
  const token = noviToken();
  const id = await hashTokena(token);
  const istjece = o.sad + TRAJANJE_SESIJE;
  await db.prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(id, o.userId, o.sad, istjece).run();
  await db
    .prepare(
      `INSERT INTO login_events (id, user_id, session_id, logged_in_at, last_activity_at, ip_prefix, device)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(uuid7(o.sad), o.userId, id, o.sad, o.sad, ipPrefiks(o.ip), opisUredaja(o.userAgent))
    .run();
  return { token, id, istjece };
}

/** Korisnik iz tokena kolačića: sesija postoji, nije opozvana ni istekla, korisnik nije obrisan. */
export async function korisnikSesije(db: D1Database, token: string | undefined, sad: number): Promise<Korisnik | null> {
  if (!token || token.length > 128) return null;
  const r = await db
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.first_name, u.last_name, u.platform_role, u.deleted_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.id = ? AND s.revoked_at IS NULL AND s.expires_at > ? AND u.deleted_at IS NULL`,
    )
    .bind(await hashTokena(token), sad)
    .first<RedakKorisnika>();
  return r ? korisnikIz(r) : null;
}

/** Opozovi sesiju tokena (odjava). Vraća true ako je sesija bila aktivna. */
export async function opozoviSesiju(db: D1Database, token: string | undefined, sad: number): Promise<boolean> {
  if (!token) return false;
  const r = await db
    .prepare("UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL")
    .bind(sad, await hashTokena(token))
    .run();
  return (r.meta.changes ?? 0) > 0;
}

// --- Kolačići ---------------------------------------------------------------------------------------

const osnovno = (url: URL) => ({ path: "/", httpOnly: true, sameSite: "lax" as const, secure: url.protocol === "https:" });

export function postaviSesiju(cookies: AstroCookies, url: URL, s: NovaSesija): void {
  cookies.set(KOLACIC_SESIJE, s.token, { ...osnovno(url), maxAge: TRAJANJE_SESIJE / 1000 });
  cookies.delete(KOLACIC_PRIJAVE, { path: "/" });
  cookies.delete(KOLACIC_DEMO_POSTE, { path: "/" });
}

export function obrisiSesiju(cookies: AstroCookies): void {
  cookies.delete(KOLACIC_SESIJE, { path: "/" });
}

/** Zapamti red koda koji se upisuje na sljedećem ekranu (10 minuta). */
export function postaviPrijavu(cookies: AstroCookies, url: URL, id: string): void {
  cookies.set(KOLACIC_PRIJAVE, id, { ...osnovno(url), maxAge: 600 });
}

export interface DemoPoruka {
  /** Id retka koda na koji se poruka odnosi. */
  id: string;
  email: string;
  kod: string;
  /** Put poveznice (`/auth/link/{token}?next=…`) ili null. */
  link: string | null;
}

/** Mock slanja e-pošte: poruka ide u kolačić ovog preglednika i prikazuje se u demo okviru. */
export function posaljiDemoPostu(cookies: AstroCookies, url: URL, p: DemoPoruka): void {
  cookies.set(KOLACIC_DEMO_POSTE, JSON.stringify(p), { ...osnovno(url), maxAge: 600 });
}

/** Demo poruka za red `id`, ili null (drugi preglednik, istekao kolačić, druga poruka). */
export function procitajDemoPostu(cookies: AstroCookies, id: string): DemoPoruka | null {
  try {
    const p = JSON.parse(cookies.get(KOLACIC_DEMO_POSTE)?.value ?? "null") as DemoPoruka | null;
    return p && p.id === id && typeof p.kod === "string" ? p : null;
  } catch {
    return null;
  }
}

// --- Preusmjeravanje --------------------------------------------------------------------------------

/**
 * `next` nakon prijave: samo relativni put na isti origin (`/…`, ne `//…` ni `/\…`), bez kontrolnih
 * znakova; inače naslovnica jezika.
 */
export function sigurniNext(next: string | null | undefined, lang: Lang): string {
  const naslovnica = `/${lang}`;
  if (!next || next.length > 2048 || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return naslovnica;
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return naslovnica;
  try {
    const u = new URL(next, "http://isti.invalid");
    if (u.origin !== "http://isti.invalid") return naslovnica;
    return u.pathname + u.search + u.hash;
  } catch {
    return naslovnica;
  }
}

/** Jezik iz `next` (`/en/…` → en), inače zadani. */
export function jezikIzPuta(put: string, zadani: Lang): Lang {
  const m = put.match(/^\/(hr|en)(?:[/?#]|$)/);
  return m ? (m[1] as Lang) : zadani;
}
