/** Javni profil osobe `/hr/u/{slug}`: nema ga, obrisan ili privatan (svi prekidači isključeni) → 404. */
import { profilKorisnika, type ProfilKorisnika } from "../../lib/db/profili";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export const ucitaj: Ucitaj<ProfilKorisnika> = async ({ params, db }) => {
  const p = await profilKorisnika(db, params.slug ?? "");
  return p ? { podaci: p } : nijePronadeno();
};
