/** Povijest prijava `/hr/postavke/povijest-prijava` (P, ekran 18): zadnjih 50 `login_events`, IP skraćen. */
import { prijavljeni } from "../../components/postavke/ucitavanje";
import { povijestPrijava, type Prijava } from "../../lib/db/postavke";
import type { Ucitaj } from "../tipovi";

export interface PodaciPovijesti {
  prijave: Prijava[];
}

export const ucitaj: Ucitaj<PodaciPovijesti> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  return { podaci: { prijave: await povijestPrijava(ctx.db, k.id) } };
};
