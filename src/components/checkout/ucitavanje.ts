/**
 * Zajedničko učitavanje koraka checkouta (`campaign.support.checkout*`, pristup T: ID checkouta je token).
 * Kampanja mora biti javno vidljiva (kao `campaign.support`), a checkout mora pripadati baš njoj, inače 404.
 * Stanje u bazi mijenja samo webhook ili pull (odluka 705): učitavač zove `uskladiCheckout` (pull agenta A) i
 * zatim čita bazu; prikazni podaci intenta (QR, `checkout_url`, `status_stream_url`) dolaze `dohvatiIntent`.
 */
import { ucitajKampanju } from "../kampanja/ucitavanje";
import { checkoutKampanje, type Checkout } from "../../lib/db/checkout";
import { uskladiCheckout } from "../../lib/db/uplate";
import { dohvatiIntent, mptKonfig, type MptIntent, type MptKonfig } from "../../lib/mpt/klijent";
import type { StranicaKampanje } from "../../lib/db/kampanja";
import type { KljucRute } from "../../lib/rute";
import { nijePronadeno, type KontekstStranice } from "../../views/tipovi";

export interface UcitaniCheckout {
  k: StranicaKampanje;
  ch: Checkout;
  konfig: MptKonfig | null;
}

/** Tajna za `payer_iban_hash` (kao `events` i `simulate` agenta A). */
const tajnaIbana = (env: unknown): string | undefined => {
  const t = (env as Record<string, unknown> | undefined)?.TAJNA_IBANA;
  return typeof t === "string" && t ? t : undefined;
};

export const konfigIzKonteksta = (ctx: KontekstStranice): MptKonfig | null => mptKonfig(ctx.env);

/** Kampanja + checkout; `uskladi` prvo povuče stanje s raila (GET stranice = „Osvježi stanje” bez JS-a). */
export async function ucitajCheckout(ctx: KontekstStranice, kljuc: KljucRute, uskladi = true): Promise<Response | UcitaniCheckout> {
  const k = await ucitajKampanju(ctx, kljuc);
  if (k instanceof Response) return k;
  const id = ctx.params.checkout ?? "";
  const konfig = konfigIzKonteksta(ctx);
  let ch = await checkoutKampanje(ctx.db, id, k.id);
  if (!ch) return nijePronadeno();
  if (uskladi && konfig) {
    try {
      await uskladiCheckout(ctx.db, konfig, ch.id, fetch, Date.now(), { ibanTajna: tajnaIbana(ctx.env) });
      ch = (await checkoutKampanje(ctx.db, id, k.id)) ?? ch;
    } catch {
      /* rail ne odgovara: prikazuje se zadnje stanje iz baze */
    }
  }
  return { k, ch, konfig };
}

/** Intent s raila za prikaz; null bez konfiguracije, za nepoznat sid (npr. seed) ili kad rail ne odgovara. */
export async function intentZaPrikaz(konfig: MptKonfig | null, sid: string): Promise<MptIntent | null> {
  if (!konfig) return null;
  try {
    return await dohvatiIntent(konfig, sid);
  } catch {
    return null;
  }
}

/** Sandbox: rail kaže `sandbox`, ili (bez intenta) ključ je testni. */
export const jeSandbox = (konfig: MptKonfig | null, intent: MptIntent | null): boolean =>
  intent ? intent.sandbox : (konfig?.secretKey.startsWith("sk_test_") ?? false);
