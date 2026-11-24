/** Dijeljenja `/hr/postavke/linkovi/dijeljenje` (P, ekran 16): automatski `share_links` sa statistikom. */
import { prijavljeni } from "../../components/postavke/ucitavanje";
import { mojaDijeljenja, type MojeDijeljenje } from "../../lib/db/postavke";
import type { Ucitaj } from "../tipovi";

export interface PodaciDijeljenja {
  dijeljenja: MojeDijeljenje[];
}

export const ucitaj: Ucitaj<PodaciDijeljenja> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  return { podaci: { dijeljenja: await mojaDijeljenja(ctx.db, k.id) } };
};
