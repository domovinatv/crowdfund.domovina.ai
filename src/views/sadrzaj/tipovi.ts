/**
 * Oblik tekstova statičnih stranica (S5). Tekst stoji uz pogled, ne u `src/i18n/` (dijeljeno):
 * svaki modul izvozi `{ hr, en }` istog oblika, a test drži oba jezika jednako strukturirana.
 * Tekstovi su naši; 4fundov javni pregled služi samo kao popis tema (odluka 3).
 */
import type { Lang } from "../../i18n";
import type { KljucRute } from "../../lib/rute";

export type Dvojezicno<T> = Record<Lang, T>;

export interface Veza {
  kljuc: KljucRute;
  tekst: string;
  params?: Record<string, string>;
  /** Upitni dio bez `?`, npr. `tema=offers`. */
  upit?: string;
  /** Sidro bez `#`. */
  sidro?: string;
}

export interface Definicija {
  pojam: string;
  opis: string;
}

/** Jedan odjeljak s `h2`. Redoslijed crtanja: tekst, koraci, popis, definicije, veze. */
export interface Odjeljak {
  /** Sidro (`#id`), isto u oba jezika. */
  id: string;
  naslov: string;
  /** Oznaka „nije u fazi 1” uz naslov odjeljka (odluka 8). */
  faza2?: boolean;
  tekst?: string[];
  koraci?: string[];
  popis?: string[];
  definicije?: Definicija[];
  veze?: Veza[];
}

export interface SadrzajStranice {
  naslov: string;
  uvod: string;
  /** Meta opis (`<meta name="description">`). */
  opis: string;
  /** Cijela stranica je izvan faze 1 (PhaseBadge uz naslov). */
  faza2?: boolean;
  /** Istaknuta napomena ispod uvoda (npr. „nacrt prototipa”). */
  napomena?: string;
  odjeljci: Odjeljak[];
}
