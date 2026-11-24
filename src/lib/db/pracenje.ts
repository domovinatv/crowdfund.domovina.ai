/**
 * Praćenje kampanje (ekran 22 „Observe”): spremanje s javne stranice (S6) i poveznica u e-pošti
 * `/hr/pracenje/{token}` i `/hr/pracenje/{token}/odjava` (odluka 502).
 *
 * Dvije vrste tokena:
 * - **potpisan** (prijavljeni pratitelj, S5): `{user_id}.{campaign_id}.{HMAC-SHA256(tajna, "user_id.campaign_id")
 *   base64url}`. Isti format generira `scripts/seed.mjs` (`tokenPracenja`). Tajna u Workeru dolazi iz okoline;
 *   `DEMO_TAJNA_PRACENJA` je samo lokalna.
 * - **spremljen** (neprijavljeni pratitelj, migracija 0004, odluka 508): slučajni token od 32 bajta (bez točke) u
 *   poveznici, u bazi samo `token_hash = SHA-256(token)`. Praćenje vrijedi tek nakon potvrde poveznicom
 *   (`confirmed_at`); prototip „poveznicu” prikazuje u demo okviru (odluka 15).
 */
import { hashTokena, noviToken, normalizirajEmail, valjanEmail } from "../sesija";
import { VIDLJIVA } from "./zajednicko";

export const DEMO_TAJNA_PRACENJA = "demo-tajna-pracenja-samo-lokalno";

function base64url(b: ArrayBuffer): string {
  let s = "";
  for (const x of new Uint8Array(b)) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function potpis(poruka: string, tajna: string): Promise<string> {
  const enc = new TextEncoder();
  const kljuc = await crypto.subtle.importKey("raw", enc.encode(tajna), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(await crypto.subtle.sign("HMAC", kljuc, enc.encode(poruka)));
}

/** Usporedba u stalnom vremenu (duljina nije tajna). */
function jednako(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function tokenPracenja(userId: string, campaignId: string, tajna: string = DEMO_TAJNA_PRACENJA): Promise<string> {
  const p = `${userId}.${campaignId}`;
  return `${p}.${await potpis(p, tajna)}`;
}

/** Provjeren token → { userId, campaignId }; null za neispravan ili krivotvoren. */
export async function procitajTokenPracenja(token: string, tajna: string = DEMO_TAJNA_PRACENJA): Promise<{ userId: string; campaignId: string } | null> {
  const dijelovi = token.trim().split(".");
  if (dijelovi.length !== 3 || dijelovi.some((d) => d.length === 0 || d.length > 64)) return null;
  const [userId, campaignId, sig] = dijelovi as [string, string, string];
  return jednako(sig, await potpis(`${userId}.${campaignId}`, tajna)) ? { userId, campaignId } : null;
}

export interface Pracenje {
  campaignId: string;
  publicId: string;
  title: string;
  /** Kampanja je još javno vidljiva (poveznica na nju ima smisla). */
  kampanjaVidljiva: boolean;
  obavijesti: { komentari: boolean; novosti: boolean; kraj: boolean };
  /** Barem jedna obavijest uključena; false nakon odjave. */
  aktivno: boolean;
  /** Neprijavljeni pratitelj je potvrdio poveznicom (prijavljeni je uvijek potvrđen). */
  potvrdeno: boolean;
}

/** Spremljeni token je base64url bez točke; potpisani ima dvije točke. */
const jeSpremljeni = (token: string) => /^[A-Za-z0-9_-]{20,64}$/.test(token);

/** Uvjet retka po tokenu: `[sql, parametri]` ili null za neispravan token. */
async function uvjetTokena(token: string, tajna: string): Promise<[string, string[]] | null> {
  const t = token.trim();
  if (jeSpremljeni(t)) return ["f.token_hash = ?", [await hashTokena(t)]];
  const p = await procitajTokenPracenja(t, tajna);
  return p ? ["f.user_id = ? AND f.campaign_id = ?", [p.userId, p.campaignId]] : null;
}

/**
 * Praćenje po tokenu; null = 404 (token neispravan ili praćenja nema). Ne vraća e-poštu ni ime pratitelja.
 * Vraća se i za kampanju koja više nije vidljiva, da se pratitelj uvijek može odjaviti.
 */
export async function pracenjePoTokenu(db: D1Database, token: string, tajna: string = DEMO_TAJNA_PRACENJA): Promise<Pracenje | null> {
  const u = await uvjetTokena(token, tajna);
  if (!u) return null;
  const r = await db
    .prepare(
      `SELECT f.campaign_id, s.public_id, c.title, f.notify_comments, f.notify_updates, f.notify_end, f.confirmed_at,
              (${VIDLJIVA}) AS vidljiva
         FROM campaign_follows f
         JOIN campaigns c ON c.id = f.campaign_id
         JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE ${u[0]}`,
    )
    .bind(...u[1])
    .first<{ campaign_id: string; public_id: string; title: string; notify_comments: number; notify_updates: number; notify_end: number; confirmed_at: number | null; vidljiva: number }>();
  if (!r) return null;
  const obavijesti = { komentari: r.notify_comments === 1, novosti: r.notify_updates === 1, kraj: r.notify_end === 1 };
  return {
    campaignId: r.campaign_id,
    publicId: r.public_id,
    title: r.title,
    kampanjaVidljiva: r.vidljiva === 1,
    obavijesti,
    aktivno: obavijesti.komentari || obavijesti.novosti || obavijesti.kraj,
    potvrdeno: r.confirmed_at !== null,
  };
}

/**
 * Odjava (`POST …/odjava`): isključuje sve tri obavijesti, red ostaje (ponovljena odjava je bezopasna).
 * Shema nema stupac vremena odjave. Vraća false za neispravan token ili nepostojeće praćenje.
 */
export async function odjaviPracenje(db: D1Database, token: string, tajna: string = DEMO_TAJNA_PRACENJA): Promise<boolean> {
  const u = await uvjetTokena(token, tajna);
  if (!u) return false;
  const r = await db
    .prepare(`UPDATE campaign_follows AS f SET notify_comments = 0, notify_updates = 0, notify_end = 0 WHERE ${u[0]}`)
    .bind(...u[1])
    .run();
  return (r.meta.changes ?? 0) > 0;
}

/** Potvrda neprijavljenog pratitelja poveznicom (`POST /hr/pracenje/{token}`). Idempotentno; false za nepoznat token. */
export async function potvrdiPracenje(db: D1Database, token: string, sad: number): Promise<boolean> {
  const t = token.trim();
  if (!jeSpremljeni(t)) return false;
  const h = await hashTokena(t);
  await db.prepare("UPDATE campaign_follows SET confirmed_at = ? WHERE token_hash = ? AND confirmed_at IS NULL").bind(sad, h).run();
  return !!(await db.prepare("SELECT 1 AS da FROM campaign_follows WHERE token_hash = ?").bind(h).first());
}

export interface ObavijestiPracenja {
  komentari: boolean;
  novosti: boolean;
  kraj: boolean;
}

/** Praćenje prijavljenog korisnika (za predpopunjene prekidače na stranici kampanje); null bez reda. */
export async function pracenjeKorisnika(db: D1Database, campaignId: string, userId: string): Promise<ObavijestiPracenja | null> {
  const r = await db
    .prepare("SELECT notify_comments, notify_updates, notify_end FROM campaign_follows WHERE campaign_id = ? AND user_id = ?")
    .bind(campaignId, userId)
    .first<{ notify_comments: number; notify_updates: number; notify_end: number }>();
  return r ? { komentari: r.notify_comments === 1, novosti: r.notify_updates === 1, kraj: r.notify_end === 1 } : null;
}

export type IshodPracenja =
  | { ok: true; vrsta: "prijavljen"; aktivno: boolean }
  | { ok: true; vrsta: "potvrda"; token: string; email: string }
  | { ok: false; greska: "email" | "nista" | "kampanja" };

/**
 * „Prati” s javne stranice kampanje (ekran 22: tri prekidača, sva zadano isključena).
 * Prijavljeni: red s `user_id`, potvrđen odmah (`confirmed_at = created_at`); sva tri isključena = prestanak
 * praćenja (red ostaje, kao odjava). Neprijavljeni: e-pošta + novi token (spremljen samo hash) i potvrda
 * poveznicom; bez ijedne uključene obavijesti greška `nista`. Kod potvrđenog praćenja iste e-pošte prekidači
 * se ne mijenjaju bez poveznice (tuđa e-pošta ne može promijeniti tuđe praćenje), samo se izda nova poveznica.
 */
export async function pratiKampanju(
  db: D1Database,
  campaignId: string,
  tko: { userId: string } | { email: string },
  o: ObavijestiPracenja,
  sad: number,
): Promise<IshodPracenja> {
  const vidljiva = await db
    .prepare(`SELECT 1 AS da FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id WHERE c.id = ? AND ${VIDLJIVA}`)
    .bind(campaignId)
    .first();
  if (!vidljiva) return { ok: false, greska: "kampanja" };
  const [k, n, e] = [o.komentari ? 1 : 0, o.novosti ? 1 : 0, o.kraj ? 1 : 0];
  if ("userId" in tko) {
    await db
      .prepare(
        `INSERT INTO campaign_follows (user_id, email, campaign_id, notify_comments, notify_updates, notify_end, token_hash, confirmed_at, created_at)
         VALUES (?1, NULL, ?2, ?3, ?4, ?5, NULL, ?6, ?6)
         ON CONFLICT (user_id, campaign_id) WHERE user_id IS NOT NULL
         DO UPDATE SET notify_comments = excluded.notify_comments, notify_updates = excluded.notify_updates,
                       notify_end = excluded.notify_end, confirmed_at = COALESCE(confirmed_at, excluded.confirmed_at)`,
      )
      .bind(tko.userId, campaignId, k, n, e, sad)
      .run();
    return { ok: true, vrsta: "prijavljen", aktivno: k + n + e > 0 };
  }
  const email = normalizirajEmail(tko.email);
  if (!valjanEmail(email)) return { ok: false, greska: "email" };
  if (k + n + e === 0) return { ok: false, greska: "nista" };
  const token = noviToken();
  const h = await hashTokena(token);
  await db
    .prepare(
      `INSERT INTO campaign_follows (user_id, email, campaign_id, notify_comments, notify_updates, notify_end, token_hash, confirmed_at, created_at)
       VALUES (NULL, ?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7)
       ON CONFLICT (email, campaign_id) WHERE user_id IS NULL
       DO UPDATE SET token_hash = excluded.token_hash,
         notify_comments = CASE WHEN confirmed_at IS NULL THEN excluded.notify_comments ELSE notify_comments END,
         notify_updates  = CASE WHEN confirmed_at IS NULL THEN excluded.notify_updates  ELSE notify_updates END,
         notify_end      = CASE WHEN confirmed_at IS NULL THEN excluded.notify_end      ELSE notify_end END`,
    )
    .bind(email, campaignId, k, n, e, h, sad)
    .run();
  return { ok: true, vrsta: "potvrda", token, email };
}
