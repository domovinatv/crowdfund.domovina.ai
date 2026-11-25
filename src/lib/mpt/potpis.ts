/**
 * Potpis MPT webhooka (S7, odluka 706): Standard Webhooks, kao rail `pay.domovina.ai`
 * `backend/src/intents/outbox.ts` `signedPost`.
 *
 *   webhook-id:        npr. `int_<sid>`
 *   webhook-timestamp: Unix sekunde
 *   webhook-signature: `v1,<base64>` (može ih biti više, razmaknuti), base64 HMAC-SHA256 nad
 *                      `${id}.${timestamp}.${tijelo}`, ključ = base64 dekodiran dio iza `whsec_`.
 *
 * Usporedba ide kroz `crypto.subtle.verify` (WebCrypto uspoređuje MAC u konstantnom vremenu), pa se
 * očekivani potpis nikad ne uspoređuje kao string. Tolerancija vremena je 5 min u oba smjera.
 */

export const TOLERANCIJA_S = 5 * 60;

export type RazlogOdbijanja = "tajna" | "zaglavlja" | "vrijeme" | "potpis";
export type IshodPotpisa = { ok: true; id: string; timestamp: number } | { ok: false; razlog: RazlogOdbijanja };

const enc = new TextEncoder();

function izBase64(b64: string): Uint8Array | null {
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function uBase64(b: ArrayBuffer): string {
  let s = "";
  for (const x of new Uint8Array(b)) s += String.fromCharCode(x);
  return btoa(s);
}

/** `whsec_…` → bajtovi ključa; `null` za praznu ili neispravnu tajnu. */
export function kljucTajne(tajna: string): Uint8Array | null {
  const t = tajna.trim();
  if (!t) return null;
  const b = izBase64(t.startsWith("whsec_") ? t.slice("whsec_".length) : t);
  return b && b.length > 0 ? b : null;
}

async function hmacKljuc(bajtovi: Uint8Array, uporaba: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", bajtovi as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, [uporaba]);
}

/** Potpis za zaglavlje `webhook-signature` (`v1,<base64>`). Za testove i dvojnika raila. */
export async function potpisi(tajna: string, id: string, timestamp: number | string, tijelo: string): Promise<string> {
  const bajtovi = kljucTajne(tajna);
  if (!bajtovi) throw new Error("Neispravna tajna webhooka");
  const mac = await crypto.subtle.sign("HMAC", await hmacKljuc(bajtovi, "sign"), enc.encode(`${id}.${timestamp}.${tijelo}`));
  return `v1,${uBase64(mac)}`;
}

/** Sva tri zaglavlja Standard Webhooks za tijelo (timestamp iz `sadMs`). */
export async function potpisanaZaglavlja(
  tajna: string,
  id: string,
  tijelo: string,
  sadMs: number = Date.now(),
): Promise<Record<string, string>> {
  const timestamp = Math.floor(sadMs / 1000);
  return {
    "content-type": "application/json",
    "webhook-id": id,
    "webhook-timestamp": String(timestamp),
    "webhook-signature": await potpisi(tajna, id, timestamp, tijelo),
  };
}

/**
 * Provjera potpisa nad SIROVIM tijelom (prije `JSON.parse`). Prihvaća ako ijedan `v1,` potpis odgovara;
 * druge verzije (`v1a,` itd.) se preskaču.
 */
export async function provjeriPotpis(
  tajna: string,
  zaglavlja: Headers,
  tijelo: string,
  sadMs: number = Date.now(),
): Promise<IshodPotpisa> {
  const bajtovi = kljucTajne(tajna);
  if (!bajtovi) return { ok: false, razlog: "tajna" };
  const id = zaglavlja.get("webhook-id")?.trim() ?? "";
  const ts = zaglavlja.get("webhook-timestamp")?.trim() ?? "";
  const potpisi = zaglavlja.get("webhook-signature")?.trim() ?? "";
  if (!id || !ts || !potpisi) return { ok: false, razlog: "zaglavlja" };
  if (!/^\d{1,12}$/.test(ts)) return { ok: false, razlog: "zaglavlja" };
  const timestamp = Number(ts);
  if (Math.abs(Math.floor(sadMs / 1000) - timestamp) > TOLERANCIJA_S) return { ok: false, razlog: "vrijeme" };

  const kljuc = await hmacKljuc(bajtovi, "verify");
  const podatak = enc.encode(`${id}.${ts}.${tijelo}`);
  for (const dio of potpisi.split(/\s+/)) {
    const zarez = dio.indexOf(",");
    if (zarez < 0 || dio.slice(0, zarez) !== "v1") continue;
    const mac = izBase64(dio.slice(zarez + 1));
    if (!mac || mac.length !== 32) continue;
    if (await crypto.subtle.verify("HMAC", kljuc, mac as BufferSource, podatak)) return { ok: true, id, timestamp };
  }
  return { ok: false, razlog: "potpis" };
}
