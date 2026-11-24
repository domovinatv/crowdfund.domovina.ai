/**
 * Katalog kampanja (docs/07 „Javni dio”, odluka 501). GET obrazac bez JS-a šalje i prazna polja, pa se upit
 * prvo 302 čisti (bez praznih, bez `page=1`). Prevelik `page` daje praznu stranicu (200) s linkom na prvu.
 */
import { filtriIzUrla, katalog, kategorije, type FiltriKataloga, type Kategorija, type RezultatKataloga } from "../../lib/db/katalog";
import { ocisceniUpit, sUpitom } from "../../components/katalog/upit";
import type { Ucitaj } from "../tipovi";

export interface PodaciKataloga {
  filtri: FiltriKataloga;
  rezultat: RezultatKataloga;
  kategorije: Kategorija[];
  /** Upit stranice (za čipove, paginaciju i skrivena polja). */
  upit: string;
}

export const ucitaj: Ucitaj<PodaciKataloga> = async ({ url, db }) => {
  const cisto = ocisceniUpit(url.searchParams);
  if (cisto) return new Response(null, { status: 302, headers: { Location: sUpitom(url.pathname, cisto) } });
  const filtri = filtriIzUrla(url.searchParams);
  const [rezultat, kat] = await Promise.all([katalog(db, filtri), kategorije(db)]);
  return { podaci: { filtri, rezultat, kategorije: kat, upit: url.searchParams.toString() } };
};
