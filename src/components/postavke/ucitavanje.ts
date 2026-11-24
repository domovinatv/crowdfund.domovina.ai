/** Zajedničko učitavačima postavki (S6): popis stavki izbornika, P provjera, polja obrasca, 303 s porukom. */
import { zahtijevajPrijavu, type Korisnik } from "../../lib/pristup";
import { url, type KljucRute } from "../../lib/rute";
import type { KontekstStranice } from "../../views/tipovi";

export const STAVKE_POSTAVKI = [
  "settings.details",
  "settings.phone",
  "settings.profile",
  "settings.sign-in",
  "settings.security",
  "settings.verification",
  "settings.campaign-verification",
  "settings.links",
  "settings.links.sharing",
  "settings.recurring",
  "settings.sign-in-history",
] as const satisfies readonly KljucRute[];
export type StavkaPostavki = (typeof STAVKE_POSTAVKI)[number];

/** P: prijavljeni ili 302 na prijavu. */
export const prijavljeni = (ctx: KontekstStranice): Korisnik | Response => zahtijevajPrijavu(ctx);

export async function poljaObrasca(request: Request): Promise<Record<string, string>> {
  const f = await request.formData();
  const out: Record<string, string> = {};
  for (const [k, v] of f.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

/** 303 na rutu s `?ok=<poruka>` (PRG; pogled pokazuje poruku o uspjehu). */
export function natrag(ctx: KontekstStranice, kljuc: KljucRute, ok = "1", params: Record<string, string> = {}): Response {
  return new Response(null, { status: 303, headers: { Location: `${url(ctx.lang, kljuc, params)}?ok=${encodeURIComponent(ok)}`, "Cache-Control": "private, no-store" } });
}

export const okIz = (ctx: KontekstStranice): string | null => ctx.url.searchParams.get("ok");
