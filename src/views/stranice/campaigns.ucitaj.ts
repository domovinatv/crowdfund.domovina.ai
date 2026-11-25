/**
 * Katalog kampanja (docs/07 „Javni dio”, odluka 501). GET obrazac bez JS-a šalje i prazna polja, pa se upit
 * prvo 302 čisti (bez praznih, bez `page=1`). Prevelik `page` daje praznu stranicu (200) s linkom na prvu.
 */
import { filtriIzUrla, katalog, kategorije, type FiltriKataloga, type Kategorija, type RezultatKataloga } from "../../lib/db/katalog";
import { ocisceniUpit, sUpitom } from "../../components/katalog/upit";
import { vanjskeUKatalogu, type VanjskaKartica } from "../../lib/db/profili";
import type { Ucitaj } from "../tipovi";

export interface PodaciKataloga {
  filtri: FiltriKataloga;
  rezultat: RezultatKataloga;
  kategorije: Kategorija[];
  /** Upit stranice (za čipove, paginaciju i skrivena polja). */
  upit: string;
  /** Vanjske 4fund kampanje (tok 9): samo prva stranica i samo uz filtre `q`/`category`, zaseban odjeljak. */
  vanjske: (VanjskaKartica & { organizacija: string })[];
}

/** Filtri koje vanjska kampanja ne može zadovoljiti (nema iznos, vrstu, kasice ni rok kod nas). */
const SAMO_NASE = ["type", "verified", "moneyboxes", "ending", "successful", "near"] as const;

export const ucitaj: Ucitaj<PodaciKataloga> = async ({ url, db }) => {
  const cisto = ocisceniUpit(url.searchParams);
  if (cisto) return new Response(null, { status: 302, headers: { Location: sUpitom(url.pathname, cisto) } });
  const filtri = filtriIzUrla(url.searchParams);
  const sVanjskima = !url.searchParams.has("page") && !SAMO_NASE.some((k) => url.searchParams.has(k));
  const [rezultat, kat, vanjske] = await Promise.all([
    katalog(db, filtri),
    kategorije(db),
    sVanjskima ? vanjskeUKatalogu(db, { q: filtri.q, category: filtri.category }) : Promise.resolve([]),
  ]);
  return { podaci: { filtri, rezultat, kategorije: kat, upit: url.searchParams.toString(), vanjske } };
};
