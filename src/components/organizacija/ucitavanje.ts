/**
 * Zajedničko učitavačima organizacije i moderacije (S6): pristup po slugu iz rute, čitanje obrasca, 303,
 * klase polja i `aria-describedby`.
 */
import { zahtijevajOrganizaciju, type Uloga } from "../../lib/pristup";
import type { KontekstStranice } from "../../views/tipovi";

export { niz, preusmjeri303 } from "../prijava/ucitavanje";

/** U:uloga za `{slug}` iz rute (302 na prijavu, 404 bez uloge). */
export const organizacijaRute = (ctx: KontekstStranice, najmanje: Uloga) => zahtijevajOrganizaciju(ctx, ctx.params.slug ?? "", najmanje);

/** Obrazac POST-a ili null za GET. */
export async function obrazac(ctx: { request: Request }): Promise<FormData | null> {
  return ctx.request.method === "POST" ? ctx.request.formData() : null;
}

/** Vrijednost polja kao očišćen niz. */
export const polje = (f: FormData | null, k: string): string => {
  const v = f?.get(k);
  return typeof v === "string" ? v.trim() : "";
};

/** Retci tekstnog polja (mreže): bez praznih. */
export const retci = (s: string): string[] =>
  s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

export const KLASA_POLJA = "mt-1.5 block w-full rounded-sm border bg-paper px-3 py-2.5 text-base text-ink placeholder:text-ink-muted";
export const rub = (greska: unknown) => (greska ? "border-danger ring-1 ring-danger" : "border-ink-muted/60");

/** `aria-describedby` za `Polje.astro`. */
export function opisano(id: string, pomoc: boolean, greska: unknown): string | undefined {
  const d = [pomoc ? `${id}-pomoc` : "", greska ? `${id}-greska` : ""].filter(Boolean).join(" ");
  return d || undefined;
}

export const GUMB = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-action px-5 font-semibold text-paper hover:bg-action-strong";
export const GUMB_RUB = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ink-muted/60 px-4 font-medium text-ink hover:bg-mist";
export const GUMB_OPASNO = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-danger/50 px-4 font-medium text-danger hover:bg-danger-bg";

/** Datum za prikaz (dd. mm. gggg.), UTC kao u seedu. */
export function datum(ms: number, lang: "hr" | "en"): string {
  return new Intl.DateTimeFormat(lang === "hr" ? "hr-HR" : "en-GB", { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" }).format(ms);
}

export function iznos(centi: number, lang: "hr" | "en", valuta = "EUR"): string {
  return new Intl.NumberFormat(lang === "hr" ? "hr-HR" : "en-GB", { style: "currency", currency: valuta, maximumFractionDigits: 0 }).format(centi / 100);
}
