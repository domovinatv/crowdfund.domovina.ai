/**
 * Stranica ponude `/hr/ponude/{offer}` (J, faza 2, S8-B): javna ponuda (aktivna, prodana ili završena) na vidljivoj
 * kampanji koja dopušta ponude, s licitacijama bez imena. Nacrt, otkazana ili nepoznata ponuda je 404.
 */
import { ponudaPoId, type DetaljPonude } from "../../lib/db/ponude";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export type PodaciPonude = DetaljPonude;

export const ucitaj: Ucitaj<PodaciPonude> = async (ctx) => {
  const id = ctx.params.offer ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return nijePronadeno();
  const p = await ponudaPoId(ctx.db, id);
  return p ? { podaci: p } : nijePronadeno();
};
