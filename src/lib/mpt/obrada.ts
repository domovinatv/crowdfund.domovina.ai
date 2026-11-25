/**
 * Obrada MPT ruta bez jezika (S7), odvojena od `src/pages/` da je unit testovi zovu bez Workera:
 *
 *   POST /webhooks/mpt                  `obradiWebhook`   pristup „potpis” (bez sesije i CSRF-a)
 *   GET  /api/checkouts/{id}/events     `odgovorStanja`   pristup T (ID checkouta)
 *   POST /api/checkouts/{id}/simulate   `obradiSimulaciju` pristup T, samo sandbox intent
 *
 * Sve vraćaju `Cache-Control: no-store`.
 */
import { MptGreska, dohvatiIntent, simulirajUplatu, type DohvatFn, type IshodSimulacije, type MptKonfig } from "./klijent";
import { provjeriPotpis } from "./potpis";
import { dogadajIzWebhooka, primijeniDogadaj, stanjeCheckouta, uskladiCheckout, type OpcijeUplate } from "../db/uplate";

const NO_STORE = { "Cache-Control": "no-store" };

export const jsonOdgovor = (status: number, tijelo: unknown, zaglavlja: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(tijelo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...NO_STORE, ...zaglavlja },
  });

/**
 * Webhook raila. 401 bez/krivog potpisa ili izvan 5 min; 400 za tijelo koje nije JSON; 503 bez
 * `MPT_WEBHOOK_SECRET`. Inače 200 (i za ponovljeni `webhook-id`, nepoznat sid ili nepoznatu vrstu), da rail
 * ne ponavlja isporuku koju ionako ne možemo primijeniti.
 */
export async function obradiWebhook(
  zahtjev: Request,
  db: D1Database,
  tajna: string,
  sad: number = Date.now(),
  opcije: OpcijeUplate = {},
): Promise<Response> {
  if (!tajna) return jsonOdgovor(503, { ok: false, greska: "webhook_nije_konfiguriran" });
  const tijelo = await zahtjev.text();
  const potpis = await provjeriPotpis(tajna, zahtjev.headers, tijelo, sad);
  if (!potpis.ok) return jsonOdgovor(401, { ok: false, greska: `potpis_${potpis.razlog}` });
  let j: unknown;
  try {
    j = JSON.parse(tijelo);
  } catch {
    return jsonOdgovor(400, { ok: false, greska: "tijelo" });
  }
  const d = dogadajIzWebhooka(potpis.id, j);
  if (!d) return jsonOdgovor(200, { ok: true, ishod: "nepoznata_vrsta" });
  const r = await primijeniDogadaj(db, d, sad, opcije);
  return jsonOdgovor(200, { ok: true, ishod: r.ishod });
}

/** `GET /api/checkouts/{id}/events`: pull (ako je MPT konfiguriran) i stanje; 404 za nepoznat checkout. */
export async function odgovorStanja(
  db: D1Database,
  k: MptKonfig | null,
  checkoutId: string,
  dohvat: DohvatFn = fetch,
  sad: number = Date.now(),
  opcije: OpcijeUplate = {},
): Promise<Response> {
  const s = k ? await uskladiCheckout(db, k, checkoutId, dohvat, sad, opcije) : await stanjeCheckouta(db, checkoutId);
  return s ? jsonOdgovor(200, s) : jsonOdgovor(404, { greska: "nepoznat_checkout" });
}

export const ISHODI_SIMULACIJE: readonly IshodSimulacije[] = ["paid", "received", "underpaid", "late", "rejected"];

async function poljaZahtjeva(zahtjev: Request): Promise<{ polja: Record<string, string>; obrazac: boolean }> {
  const vrsta = zahtjev.headers.get("content-type") ?? "";
  if (vrsta.includes("application/json")) {
    const j = (await zahtjev.json().catch(() => ({}))) as Record<string, unknown>;
    const polja: Record<string, string> = {};
    for (const [k, v] of Object.entries(j ?? {})) if (typeof v === "string") polja[k] = v;
    return { polja, obrazac: false };
  }
  if (vrsta.includes("application/x-www-form-urlencoded") || vrsta.includes("multipart/form-data")) {
    const f = await zahtjev.formData().catch(() => null);
    const polja: Record<string, string> = {};
    f?.forEach((v, k) => {
      if (typeof v === "string") polja[k] = v;
    });
    return { polja, obrazac: true };
  }
  return { polja: {}, obrazac: false };
}

/** Referer istog origina kao zahtjev (za 303 nakon obrasca bez JS-a); inače `null`. */
function povratak(zahtjev: Request): string | null {
  const ref = zahtjev.headers.get("referer");
  if (!ref) return null;
  try {
    const r = new URL(ref);
    return r.origin === new URL(zahtjev.url).origin ? r.pathname + r.search : null;
  } catch {
    return null;
  }
}

/**
 * `POST /api/checkouts/{id}/simulate` (samo sandbox, odluka 704): `ishod` (paid|received|underpaid|late|
 * rejected, zadano paid) i `cilj` (doprinos|napojnica, zadano doprinos), JSON ili obrazac. 404 kad MPT nije
 * konfiguriran, checkout ne postoji ili intent nije sandbox. Nakon simulacije isti pull kao `events`.
 * Obrazac s Refererom istog origina → 303 natrag; inače JSON stanja.
 */
export async function obradiSimulaciju(
  zahtjev: Request,
  db: D1Database,
  k: MptKonfig | null,
  checkoutId: string,
  dohvat: DohvatFn = fetch,
  sad: number = Date.now(),
  opcije: OpcijeUplate = {},
): Promise<Response> {
  const { polja, obrazac } = await poljaZahtjeva(zahtjev);
  const ishod = (polja.ishod || "paid") as IshodSimulacije;
  const cilj = polja.cilj || "doprinos";
  if (!ISHODI_SIMULACIJE.includes(ishod) || (cilj !== "doprinos" && cilj !== "napojnica")) {
    return jsonOdgovor(400, { greska: "neispravan_zahtjev" });
  }
  // Dvostruka provjera: sandbox ključ i sandbox intent (produkcijski ključ nikad ne simulira).
  if (!k || !k.secretKey.startsWith("sk_test_")) return jsonOdgovor(404, { greska: "nije_sandbox" });
  const s = await stanjeCheckouta(db, checkoutId);
  if (!s) return jsonOdgovor(404, { greska: "nepoznat_checkout" });
  const sid = cilj === "napojnica" ? s.napojnica?.sid : s.doprinos.sid;
  if (!sid) return jsonOdgovor(404, { greska: "nema_napojnice" });

  let greska: string | null = null;
  try {
    const intent = await dohvatiIntent(k, sid, dohvat);
    if (!intent || !intent.sandbox) return jsonOdgovor(404, { greska: "nije_sandbox" });
    await simulirajUplatu(k, sid, ishod, dohvat);
  } catch (e) {
    if (!(e instanceof MptGreska)) throw e;
    // already_settled / already_rejected (409) nije greška stanja: pull ispod pokaže pravo stanje.
    greska = e.kod;
  }
  const stanje = await uskladiCheckout(db, k, checkoutId, dohvat, sad, opcije);
  const natrag = obrazac ? povratak(zahtjev) : null;
  if (natrag) return new Response(null, { status: 303, headers: { Location: natrag, ...NO_STORE } });
  return jsonOdgovor(greska ? 409 : 200, greska ? { ...stanje, greska } : stanje);
}
