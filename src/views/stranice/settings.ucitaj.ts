/** Postavke `/hr/postavke` (P): 302 na `/hr/postavke/podaci` (docs/07 „Moje i postavke”). */
import { prijavljeni } from "../../components/postavke/ucitavanje";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export const ucitaj: Ucitaj = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  return new Response(null, { status: 302, headers: { Location: url(ctx.lang, "settings.details"), "Cache-Control": "private, no-store" } });
};
