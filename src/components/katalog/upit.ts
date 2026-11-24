/**
 * Gradnja URL-a kataloga bez JS-a (S5): čipovi aktivnih filtara, paginacija, skrivena polja obrazaca.
 * Ključevi upita su engleski u oba jezika (odluka 303), pa isti upit vrijedi na /hr i /en.
 */
import { VRSTE, filtriIzUrla } from "../../lib/db/katalog";

export type Parovi = [string, string][];

/** Filtri kataloga kampanja redom kojim se prikazuju čipovi. */
export const FILTRI = ["q", "category", "type", "verified", "moneyboxes", "ending", "successful", "near"] as const;
export type Filtar = (typeof FILTRI)[number];

/** Parovi upita bez praznih vrijednosti i bez ključeva iz `bez`. */
export function parovi(p: URLSearchParams, bez: readonly string[] = []): Parovi {
  const r: Parovi = [];
  for (const [k, v] of p) if (v.trim() !== "" && !bez.includes(k)) r.push([k, v]);
  return r;
}

/** Put s upitom; bez parova vraća sam put. */
export function sUpitom(put: string, p: Parovi): string {
  if (p.length === 0) return put;
  return `${put}?${new URLSearchParams(p).toString()}`;
}

/** Link čipa ✕: isti upit bez tog filtra; stranica se vraća na prvu. */
export function bezFiltra(put: string, p: URLSearchParams, kljuc: string): string {
  return sUpitom(put, parovi(p, [kljuc, "page"]));
}

/** Link na stranicu `n` uz isti upit; prva stranica nema `page`. */
export function naStranicu(put: string, p: URLSearchParams, n: number): string {
  const r = parovi(p, ["page"]);
  if (n > 1) r.push(["page", String(n)]);
  return sUpitom(put, r);
}

/**
 * Brojevi u paginaciji: prva, zadnja, trenutna i `okolo` susjeda; `null` je izostavljeni raspon („…”).
 * Trenutna izvan raspona (prevelik `page`) se ne ubacuje.
 */
export function brojeviStranica(trenutna: number, ukupno: number, okolo = 1): (number | null)[] {
  const skup = new Set<number>([1, ukupno]);
  for (let i = trenutna - okolo; i <= trenutna + okolo; i++) if (i >= 1 && i <= ukupno) skup.add(i);
  const redom = [...skup].filter((n) => n >= 1 && n <= ukupno).sort((a, b) => a - b);
  const r: (number | null)[] = [];
  for (const n of redom) {
    const zadnji = r[r.length - 1];
    if (typeof zadnji === "number" && n - zadnji === 2) r.push(zadnji + 1);
    else if (typeof zadnji === "number" && n - zadnji > 2) r.push(null);
    r.push(n);
  }
  return r;
}

/**
 * Aktivni filtri za čipove, istim pravilima kao upit (`filtriIzUrla`): boolean je aktivan kad je prisutan
 * i nije 0/false/off; nevaljana vrsta se u upitu ignorira, pa nema ni čipa.
 */
export function aktivniFiltri(p: URLSearchParams): { kljuc: Filtar; vrijednost: string }[] {
  const f = filtriIzUrla(p);
  const r: { kljuc: Filtar; vrijednost: string }[] = [];
  for (const k of FILTRI) {
    const v = f[k];
    if (typeof v === "boolean") {
      if (v) r.push({ kljuc: k, vrijednost: "1" });
    } else if (typeof v === "string" && v.trim() !== "") {
      if (k === "type" && !(VRSTE as readonly string[]).includes(v)) continue;
      r.push({ kljuc: k, vrijednost: v.trim() });
    }
  }
  return r;
}

/**
 * Očišćen upit kataloga (bez praznih polja, bez `page=1`, nevaljan `page` maknut) ili null kad je već čist.
 * GET obrazac bez JS-a šalje i prazna polja; učitavač na čisti oblik preusmjerava 302.
 */
export function ocisceniUpit(p: URLSearchParams): Parovi | null {
  const r: Parovi = [];
  for (const [k, v] of p) {
    if (v.trim() === "") continue;
    if (k === "page" && !/^[1-9]\d*$/.test(v)) continue;
    if (k === "page" && v === "1") continue;
    r.push([k, v]);
  }
  const prije = [...p].length;
  return r.length === prije ? null : r;
}
