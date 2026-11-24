/**
 * Ugovor stranice (odluka 500). Svaka ruta iz `src/lib/rute.ts` s jezičnim prefiksom ima pogled
 * `src/views/stranice/<kljuc>.astro` (npr. `campaign.qr.astro`) i po želji učitavač
 * `src/views/stranice/<kljuc>.ucitaj.ts` koji izvozi `ucitaj`.
 *
 * Učitavač radi prije crtanja: vrati `Response` (404, 302, …) ili `{ podaci }` koji pogled
 * dobije kao prop. Pogled sam ne mijenja status; zato upiti i provjere idu u učitavač.
 */
import type { AstroCookies } from "astro";
import type { Lang } from "../i18n";

export interface KontekstStranice {
  lang: Lang;
  /** Dinamički segmenti rute (`{id}`, `{slug}`, …). */
  params: Record<string, string>;
  url: URL;
  request: Request;
  cookies: AstroCookies;
  db: D1Database;
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
