/**
 * „Kamo ide novac” `/hr/{id}/upravljanje/novac` (K, ekrani 09 i 27, docs/08 §5.8): Safe kampanje, potpisnici
 * organizacije, 0 platformskih potpisnika, poveznica na explorer (Gnosis / Chiado po mreži). Isplate nema
 * (odluka 6): novac je već na Safeu organizacije.
 */
import { ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import { novacKampanje, type NovacUpravljanja } from "../../lib/db/upravljanje";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciNovca {
  u: Upravljanje;
  novac: NovacUpravljanja;
}

export const ucitaj: Ucitaj<PodaciNovca> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage.money");
  if (u instanceof Response) return u;
  const novac = await novacKampanje(ctx.db, u.k.id);
  return novac ? { podaci: { u, novac } } : nijePronadeno();
};
