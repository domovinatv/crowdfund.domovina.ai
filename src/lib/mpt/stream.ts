/**
 * Pravi SSE statusa plaćanja (S11, TODO F3; mijenja odluku 728 u dijelu o pregledniku).
 *
 *   GET /api/checkouts/{id}/stream?cilj=doprinos|napojnica   pristup T (ID checkouta)
 *
 * Preglednik ne smije otvoriti MPT `status_stream_url` izravno (rail ne šalje `Access-Control-Allow-Origin`
 * za naš origin), pa ga Worker proxyja s istog origina. Proxy ne prosljeđuje sirovi payload raila: svaki
 * `event: stage` prevodi u `event: stanje` s `{ state, faza }` (bez iznosa, adresa, hasheva i ID-a narudžbe).
 *
 * Stream je samo signal. Stanje u bazi i dalje mijenja samo webhook ili pull (`GET …/events`): klijent na
 * promjenu stanja ili završnu fazu zove pull i ponovno učita stranicu. Rail zatvara stream nakon završne faze
 * ili 30 min (pay.domovina.ai `backend/src/intents/stream.ts`); klijent tada prelazi na pull svake 3 s.
 * Kad stream s raila nije dostupan (404 `sse_not_yet_implemented_use_polling`, 429, pad mreže, drugi oblik), proxy
 * vraća 204 s `x-stream: nedostupan`: `EventSource` se na 204 zatvara bez ponovnog spajanja i bez greške u konzoli,
 * a klijent odmah radi pull.
 */
import type { DohvatFn, MptKonfig } from "./klijent";
import { jsonOdgovor } from "./obrada";
import { stanjeCheckouta } from "../db/uplate";

export type CiljStreama = "doprinos" | "napojnica";

/** Završne faze raila: nakon njih stream se zatvara i klijent više ne sluša. */
export const ZAVRSNE_FAZE: readonly string[] = ["settled", "rejected", "expired"];

export const SSE_ZAGLAVLJA = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-store",
  "x-accel-buffering": "no",
} as const;

/** Jedan SSE okvir raila (`event: stage`) → naš okvir ili `null` (preskače se). */
export function prevediOkvir(okvir: string): string | null {
  let dogadaj = "message";
  const podaci: string[] = [];
  const izlaz: string[] = [];
  for (const red of okvir.split("\n")) {
    if (red === "") continue;
    if (red.startsWith(":")) {
      izlaz.push(": ping");
      continue;
    }
    const i = red.indexOf(":");
    const polje = i === -1 ? red : red.slice(0, i);
    const vrijednost = i === -1 ? "" : red.slice(i + 1).replace(/^ /, "");
    if (polje === "event") dogadaj = vrijednost;
    else if (polje === "data") podaci.push(vrijednost);
    else if (polje === "retry" && /^\d{1,6}$/.test(vrijednost)) izlaz.push(`retry: ${vrijednost}`);
  }
  if (dogadaj === "stage" && podaci.length) {
    try {
      const j = JSON.parse(podaci.join("\n")) as { state?: unknown; status?: { stage?: unknown } };
      const state = typeof j.state === "string" ? j.state : null;
      const faza = typeof j.status?.stage === "string" ? j.status.stage : null;
      if (state || faza) izlaz.push("event: stanje", `data: ${JSON.stringify({ state, faza })}`);
    } catch {
      /* neispravan JSON raila: okvir se preskače */
    }
  }
  return izlaz.length ? `${izlaz.join("\n")}\n\n` : null;
}

/** TransformStream koji tekst SSE-a raila reže na okvire (prazan red) i prevodi ih `prevediOkvir`. */
export function prevoditeljSse(): TransformStream<Uint8Array, Uint8Array> {
  const dekoder = new TextDecoder();
  const koder = new TextEncoder();
  let ostatak = "";
  const isprazni = (ctl: TransformStreamDefaultController<Uint8Array>, kraj: boolean) => {
    ostatak = ostatak.replace(/\r\n?/g, "\n");
    let i: number;
    while ((i = ostatak.indexOf("\n\n")) !== -1) {
      const okvir = prevediOkvir(ostatak.slice(0, i));
      ostatak = ostatak.slice(i + 2);
      if (okvir) ctl.enqueue(koder.encode(okvir));
    }
    if (kraj && ostatak.trim()) {
      const okvir = prevediOkvir(ostatak);
      ostatak = "";
      if (okvir) ctl.enqueue(koder.encode(okvir));
    }
  };
  return new TransformStream({
    transform(dio, ctl) {
      ostatak += dekoder.decode(dio, { stream: true });
      // Zaštita od raila koji ne šalje prazne redove: okvir veći od 64 KiB se odbacuje.
      if (ostatak.length > 65_536 && ostatak.indexOf("\n\n") === -1) ostatak = "";
      isprazni(ctl, false);
    },
    flush(ctl) {
      ostatak += dekoder.decode();
      isprazni(ctl, true);
    },
  });
}

const nedostupan = () => new Response(null, { status: 204, headers: { "cache-control": "no-store", "x-stream": "nedostupan" } });

/** `GET /api/checkouts/{id}/stream`: proxy MPT SSE-a za intent doprinosa ili napojnice tog checkouta. */
export async function odgovorStreama(
  db: D1Database,
  k: MptKonfig | null,
  checkoutId: string,
  cilj: string | null,
  dohvat: DohvatFn = fetch,
  signal?: AbortSignal,
): Promise<Response> {
  const c: CiljStreama | null = cilj === null || cilj === "" || cilj === "doprinos" ? "doprinos" : cilj === "napojnica" ? "napojnica" : null;
  if (!c) return jsonOdgovor(400, { greska: "neispravan_cilj" });
  if (!k) return nedostupan();
  // Samo baza: učitavanje stranice je već povuklo stanje s raila, stream je jedini sljedeći poziv.
  const s = await stanjeCheckouta(db, checkoutId);
  if (!s) return jsonOdgovor(404, { greska: "nepoznat_checkout" });
  const sid = c === "napojnica" ? s.napojnica?.sid : s.doprinos.sid;
  if (!sid) return jsonOdgovor(404, { greska: "nema_intenta" });

  let r: Response;
  try {
    r = await dohvat(`${k.apiUrl}/v1/intents/${encodeURIComponent(sid)}/stream`, {
      method: "GET",
      headers: { accept: "text/event-stream" },
      signal,
    });
  } catch {
    return nedostupan();
  }
  const vrsta = r.headers.get("content-type") ?? "";
  if (!r.ok || !r.body || !vrsta.startsWith("text/event-stream")) {
    await r.body?.cancel().catch(() => {});
    return nedostupan();
  }
  return new Response(r.body.pipeThrough(prevoditeljSse()), { status: 200, headers: SSE_ZAGLAVLJA });
}
