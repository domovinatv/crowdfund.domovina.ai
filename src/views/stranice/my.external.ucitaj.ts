/** Vanjske kampanje mojih organizacija `/hr/moje/vanjske` (P, tok 9): popis i poveznica na `org.external` (U:editor). */
import { mojeVanjske, type MojaVanjska } from "../../lib/db/moje";
import { zahtijevajPrijavu } from "../../lib/pristup";
import type { Ucitaj } from "../tipovi";

export interface PodaciMojihVanjskih {
  vanjske: MojaVanjska[];
}

export const ucitaj: Ucitaj<PodaciMojihVanjskih> = async (ctx) => {
  const k = zahtijevajPrijavu(ctx);
  if (k instanceof Response) return k;
  return { podaci: { vanjske: await mojeVanjske(ctx.db, k.id) } };
};
