/**
 * Katalog ponuda `/hr/ponude` (J, faza 2, docs/07): aktivne ponude i aukcije kampanja iz kataloga, filtar vrste
 * (`?mode=buy_now|auction`) i kategorije (`?category=`), 12 po stranici (`?page=`). Kupnje i licitiranja nema.
 */
import { katalogPonuda, type KatalogPonuda } from "../../lib/db/ponude";
import type { Ucitaj } from "../tipovi";

export type PodaciKatalogaPonuda = KatalogPonuda;

export const ucitaj: Ucitaj<PodaciKatalogaPonuda> = async (ctx) => {
  const q = ctx.url.searchParams;
  return { podaci: await katalogPonuda(ctx.db, { mode: q.get("mode"), category: q.get("category"), page: q.get("page") }) };
};
