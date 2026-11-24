/**
 * Oblikovanje brojeva, iznosa i datuma za kartice i profile (S5). Hrvatska množina ima tri oblika
 * (1 dan, 2 dana, 5 dana; 21 dan), engleska dva; ključ rječnika nosi sufiks `.one`, `.few`, `.other`.
 */
import { LOCALE, prevoditelj, type KljucPrijevoda, type Lang } from "../../i18n";

export type OblikMnozine = "one" | "few" | "other";

export function oblikMnozine(lang: Lang, n: number): OblikMnozine {
  const a = Math.abs(Math.trunc(n));
  if (lang === "en") return a === 1 ? "one" : "other";
  const d = a % 10;
  const s = a % 100;
  if (d === 1 && s !== 11) return "one";
  if (d >= 2 && d <= 4 && (s < 12 || s > 14)) return "few";
  return "other";
}

type Osnova<K> = K extends `${infer O}.one` ? O : never;
/** Osnova ključa koji ima sva tri oblika (`card.daysLeft` za `card.daysLeft.one|few|other`). */
export type KljucMnozine = Osnova<KljucPrijevoda>;

/** Prevedeni tekst s brojem u pravom obliku: `brojem("hr", "card.daysLeft", 3)` → „Još 3 dana”. */
export function brojem(lang: Lang, osnova: KljucMnozine, n: number): string {
  const t = prevoditelj(lang);
  const kljuc = `${osnova}.${oblikMnozine(lang, n)}` as KljucPrijevoda;
  return t(kljuc).replace("{n}", new Intl.NumberFormat(LOCALE[lang]).format(n));
}

/** Iznos u centima kao valuta bez decimala (`1.250 €` / `€1,250`). */
export function iznos(lang: Lang, centi: number, valuta = "EUR"): string {
  return new Intl.NumberFormat(LOCALE[lang], { style: "currency", currency: valuta, maximumFractionDigits: 0 }).format(centi / 100);
}

export function broj(lang: Lang, n: number): string {
  return new Intl.NumberFormat(LOCALE[lang]).format(n);
}

/** Datum (unix ms) kao „20. studenoga 2026.” / „20 November 2026”, u zoni Europe/Zagreb. */
export function datum(lang: Lang, ms: number): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zagreb" }).format(ms);
}
