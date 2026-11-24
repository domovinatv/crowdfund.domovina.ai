/**
 * Oblikovanje za stranicu kampanje i njezine podrute (S5): novac, datumi, Safe adresa, kanonski ID.
 * Čista logika bez baze, pa je pokrivena testom `test/kampanja-stranica.test.ts`.
 */
import { LOCALE, type Lang } from "../../i18n";
import { normalizirajJavniId } from "../../lib/db/kampanja";

/** Iznos u centima → „1.250 €”; decimale samo kad iznos nije cijeli. */
export function formatNovca(lang: Lang, currency = "EUR"): (centi: number) => string {
  const cijeli = new Intl.NumberFormat(LOCALE[lang], { style: "currency", currency, maximumFractionDigits: 0 });
  const decimalni = new Intl.NumberFormat(LOCALE[lang], { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (c) => (c % 100 === 0 ? cijeli : decimalni).format(c / 100);
}

export function formatDatuma(lang: Lang, ms: number): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zagreb" }).format(ms);
}

/** „prije 3 dana” / „3 days ago”; za starije od 30 dana puni datum. */
export function relativnoVrijeme(lang: Lang, ms: number, sad: number = Date.now()): string {
  const s = Math.round((ms - sad) / 1000);
  const abs = Math.abs(s);
  if (abs >= 30 * 86400) return formatDatuma(lang, ms);
  const rtf = new Intl.RelativeTimeFormat(LOCALE[lang], { numeric: "auto" });
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

/** `0xde5afe…` → `0xde5a…9f3c` (prvih 6 i zadnja 4 znaka). */
export function skratiAdresu(adresa: string): string {
  return adresa.length <= 12 ? adresa : `${adresa.slice(0, 6)}…${adresa.slice(-4)}`;
}

/**
 * Kanonski oblik javnog ID-a iz puta: `null` kad oblik nije valjan (404 bez upita),
 * `preusmjeri` kad je ID valjan, ali nije pisan malim slovima (301 na kanonski).
 */
export function kanonskiJavniId(sirovi: string): { id: string | null; preusmjeri: boolean } {
  const id = normalizirajJavniId(sirovi);
  return { id, preusmjeri: id !== null && id !== sirovi };
}
