/**
 * Razine podrške `/hr/{id}/upravljanje/razine` (K, faza 2, S8-B): razine kampanje (`campaign_tiers`) s brojem
 * ekskluzivnih novosti i onemogućen obrazac nove razine. Ništa ne zapisuje: razina s iznosom je nagrada ili prodaja
 * (odluka 8), a odabira razine pri podršci u prvoj fazi nema.
 */
import { ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import { razineZaUpravljanje, type RazinaUpravljanja } from "../../lib/db/razine";
import type { Ucitaj } from "../tipovi";

export interface PodaciRazina {
  u: Upravljanje;
  razine: RazinaUpravljanja[];
}

export const ucitaj: Ucitaj<PodaciRazina> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage.tiers");
  if (u instanceof Response) return u;
  return { podaci: { u, razine: await razineZaUpravljanje(ctx.db, u.k.id) } };
};
