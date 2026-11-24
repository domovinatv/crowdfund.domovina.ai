/**
 * Praćenje kampanje iz poveznice u e-pošti: `/hr/pracenje/{token}` i `/hr/pracenje/{token}/odjava` (odluka 502).
 *
 * `campaign_follows` nema stupac tokena, pa je token potpisan, a ne spremljen:
 * `{user_id}.{campaign_id}.{HMAC-SHA256(tajna, "user_id.campaign_id") base64url}`. Isti format generira
 * `scripts/seed.mjs` (`tokenPracenja`). Tajna u Workeru dolazi iz okoline; `DEMO_TAJNA_PRACENJA` je samo lokalna.
 */
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
}

/**
 * Praćenje po tokenu; null = 404 (token neispravan ili praćenja nema). Ne vraća e-poštu ni ime pratitelja.
 * Vraća se i za kampanju koja više nije vidljiva, da se pratitelj uvijek može odjaviti.
 */
export async function pracenjePoTokenu(db: D1Database, token: string, tajna: string = DEMO_TAJNA_PRACENJA): Promise<Pracenje | null> {
  const t = await procitajTokenPracenja(token, tajna);
  if (!t) return null;
  const r = await db
    .prepare(
      `SELECT f.campaign_id, s.public_id, c.title, f.notify_comments, f.notify_updates, f.notify_end,
              (${VIDLJIVA}) AS vidljiva
         FROM campaign_follows f
         JOIN campaigns c ON c.id = f.campaign_id
         JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE f.user_id = ? AND f.campaign_id = ?`,
    )
    .bind(t.userId, t.campaignId)
    .first<{ campaign_id: string; public_id: string; title: string; notify_comments: number; notify_updates: number; notify_end: number; vidljiva: number }>();
  if (!r) return null;
  const obavijesti = { komentari: r.notify_comments === 1, novosti: r.notify_updates === 1, kraj: r.notify_end === 1 };
  return {
    campaignId: r.campaign_id,
    publicId: r.public_id,
    title: r.title,
    kampanjaVidljiva: r.vidljiva === 1,
    obavijesti,
    aktivno: obavijesti.komentari || obavijesti.novosti || obavijesti.kraj,
  };
}

/**
 * Odjava (`POST …/odjava`): isključuje sve tri obavijesti, red ostaje (ponovljena odjava je bezopasna).
 * Shema nema stupac vremena odjave. Vraća false za neispravan token ili nepostojeće praćenje.
 */
export async function odjaviPracenje(db: D1Database, token: string, tajna: string = DEMO_TAJNA_PRACENJA): Promise<boolean> {
  const t = await procitajTokenPracenja(token, tajna);
  if (!t) return false;
  const r = await db
    .prepare(
      `UPDATE campaign_follows SET notify_comments = 0, notify_updates = 0, notify_end = 0
        WHERE user_id = ? AND campaign_id = ?`,
    )
    .bind(t.userId, t.campaignId)
    .run();
  return (r.meta.changes ?? 0) > 0;
}
