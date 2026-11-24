/** Katalog organizacija (docs/07, pregled §8.4): filtar kategorije (`category`), paginacija (`page`). */
import { kategorije, type Kategorija } from "../../lib/db/katalog";
import { katalogOrganizacija, type KatalogOrganizacija } from "../../lib/db/profili";
import { ocisceniUpit, sUpitom } from "../../components/katalog/upit";
import type { Ucitaj } from "../tipovi";

export interface PodaciOrganizacija {
  katalog: KatalogOrganizacija;
  kategorije: Kategorija[];
  kategorija: string | null;
  upit: string;
}

export const ucitaj: Ucitaj<PodaciOrganizacija> = async ({ url, db }) => {
  const cisto = ocisceniUpit(url.searchParams);
  if (cisto) return new Response(null, { status: 302, headers: { Location: sUpitom(url.pathname, cisto) } });
  const kategorija = url.searchParams.get("category");
  const [kat, svi] = await Promise.all([katalogOrganizacija(db, { category: kategorija, page: url.searchParams.get("page") }), kategorije(db)]);
  return { podaci: { katalog: kat, kategorije: svi, kategorija, upit: url.searchParams.toString() } };
};
