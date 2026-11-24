/**
 * Kontekst učitavača za testove (S6): lažni `AstroCookies` nad mapom i `KontekstStranice` s bazom,
 * kolačićima i (opcionalno) prijavljenim korisnikom. Prijavljenog iz seeda daje
 * `korisnikSesije(db, primjeri.demoSesija, Date.now())`.
 */
import type { AstroCookies } from "astro";
import type { Korisnik } from "../../src/lib/sesija";
import type { KontekstStranice } from "../../src/views/tipovi";

export type LaziKolacici = AstroCookies & { mapa: Map<string, string> };

export function laziKolacici(pocetni: Record<string, string> = {}): LaziKolacici {
  const mapa = new Map(Object.entries(pocetni));
  return {
    mapa,
    get: (k: string) => (mapa.has(k) ? { value: mapa.get(k)! } : undefined),
    has: (k: string) => mapa.has(k),
    set: (k: string, v: string | Record<string, unknown>) => void mapa.set(k, typeof v === "string" ? v : JSON.stringify(v)),
    delete: (k: string) => void mapa.delete(k),
  } as unknown as LaziKolacici;
}

export interface OpcijeKonteksta {
  params?: Record<string, string>;
  /** Polja obrasca: zahtjev postaje POST (application/x-www-form-urlencoded). */
  obrazac?: Record<string, string>;
  korisnik?: Korisnik | null;
  kolacici?: LaziKolacici;
}

export function kontekst(db: D1Database, put: string, o: OpcijeKonteksta = {}): KontekstStranice & { cookies: LaziKolacici } {
  const url = new URL(put, "http://localhost:8798");
  const request = o.obrazac
    ? new Request(url, { method: "POST", body: new URLSearchParams(o.obrazac), headers: { "user-agent": "Mozilla/5.0 (Macintosh; Mac OS X) Chrome/140", "cf-connecting-ip": "203.0.113.77" } })
    : new Request(url);
  return {
    lang: url.pathname.startsWith("/en") ? "en" : "hr",
    params: o.params ?? {},
    url,
    request,
    cookies: o.kolacici ?? laziKolacici(),
    db,
    korisnik: o.korisnik ?? null,
  };
}
