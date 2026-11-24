/**
 * Hash posjetitelja za `/z/{slug}` (docs/04 tok 7): HMAC-SHA256(tajna, dan + IP + User-Agent) u hex.
 * Dan (UTC) u poruci znači da se isti posjetitelj ne može povezati preko dana; sirovi IP i UA se nikad
 * ne spremaju. Tajna u Workeru dolazi iz okoline (`TAJNA_POSJETA`); demo vrijednost je samo lokalna.
 */
export const DEMO_TAJNA_POSJETA = "demo-tajna-posjeta-samo-lokalno";

export async function hashPosjetitelja(
  ulaz: { ip: string; userAgent: string; sad?: Date },
  tajna: string = DEMO_TAJNA_POSJETA,
): Promise<string> {
  const dan = (ulaz.sad ?? new Date()).toISOString().slice(0, 10);
  const enc = new TextEncoder();
  const kljuc = await crypto.subtle.importKey("raw", enc.encode(tajna), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const potpis = await crypto.subtle.sign("HMAC", kljuc, enc.encode(`${dan}\n${ulaz.ip}\n${ulaz.userAgent}`));
  return [...new Uint8Array(potpis)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Kolačić atribucije s linka za praćenje: id linka, 30 dana (docs/07). Čita ga checkout (S7). */
export const KOLACIC_ATRIBUCIJE = "atribucija";
export const ATRIBUCIJA_S = 30 * 24 * 60 * 60;
