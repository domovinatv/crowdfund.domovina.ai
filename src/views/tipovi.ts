/**
 * Ugovor stranice (odluka 500). Svaka ruta iz `src/lib/rute.ts` s jezičnim prefiksom ima pogled
 * `src/views/stranice/<kljuc>.astro` (npr. `campaign.qr.astro`) i po želji učitavač
 * `src/views/stranice/<kljuc>.ucitaj.ts` koji izvozi `ucitaj`.
 *
 * Učitavač radi prije crtanja: vrati `Response` (404, 302, …) ili `{ podaci }` koji pogled
 * dobije kao prop. Pogled sam ne mijenja status; zato upiti i provjere idu u učitavač.
 * Ruta smije imati samo učitavač bez pogleda (npr. CSV ili samo POST): njegov `Response` se vraća,
 * a `{ podaci }` bez pogleda je 404 (S6).
 */
import type { AstroCookies } from "astro";
import type { Lang } from "../i18n";
import type { Korisnik } from "../lib/sesija";

export interface KontekstStranice {
  lang: Lang;
  /** Dinamički segmenti rute (`{id}`, `{slug}`, …). */
  params: Record<string, string>;
  url: URL;
  request: Request;
  cookies: AstroCookies;
  db: D1Database;
  /** Prijavljeni korisnik (middleware, kolačić `sesija`) ili null. Pristup: src/lib/pristup.ts. */
  korisnik: Korisnik | null;
  /** Okolina Workera (`.dev.vars` lokalno), npr. za `mptKonfig(env)` (S7). U testovima po želji. */
  env?: unknown;
}

export type RezultatUcitavanja<T = unknown> = Response | { podaci: T };

export type Ucitaj<T = unknown> = (ctx: KontekstStranice) => Promise<RezultatUcitavanja<T>>;

/** Props svakog pogleda u `src/views/stranice/`. */
export interface PropsStranice<T = unknown> {
  lang: Lang;
  params: Record<string, string>;
  podaci: T;
}

/** 404 bez tijela; dispečer ga pretvara u stranicu „nije pronađeno”. */
export const nijePronadeno = (): Response => new Response(null, { status: 404 });
