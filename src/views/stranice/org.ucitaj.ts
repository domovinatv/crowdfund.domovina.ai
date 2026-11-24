/** Javni profil organizacije `/hr/o/{slug}`: nema je, obrisana ili nije `active` → 404. Uz nju nazivi kategorija za vanjske kartice. */
import { kategorije, type Kategorija } from "../../lib/db/katalog";
import { organizacijaPoSlugu, type ProfilOrganizacije } from "../../lib/db/profili";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciOrganizacije {
  o: ProfilOrganizacije;
  kategorije: Kategorija[];
}

export const ucitaj: Ucitaj<PodaciOrganizacije> = async ({ params, db }) => {
  const o = await organizacijaPoSlugu(db, params.slug ?? "");
  if (!o) return nijePronadeno();
  return { podaci: { o, kategorije: o.vanjske.length > 0 ? await kategorije(db) : [] } };
};
