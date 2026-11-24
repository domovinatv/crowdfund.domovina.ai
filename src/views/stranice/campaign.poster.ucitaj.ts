/** Plakat za ispis `/hr/{id}/plakat`: A4, naslov, kratki opis, QR kratkog linka, adresa. */
import type { StranicaKampanje } from "../../lib/db/kampanja";
import { kratkiLink, ucitajKampanju } from "../../components/kampanja/ucitavanje";
import type { Ucitaj } from "../tipovi";

export interface PodaciPlakata {
  k: StranicaKampanje;
  cilj: string;
}

export const ucitaj: Ucitaj<PodaciPlakata> = async (ctx) => {
  const k = await ucitajKampanju(ctx, "campaign.poster");
  if (k instanceof Response) return k;
  return { podaci: { k, cilj: kratkiLink(ctx, k.publicId) } };
};
