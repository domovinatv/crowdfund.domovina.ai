/**
 * „Podrži” `/hr/{id}/podrzi` (J*), stub do S7: sažetak kampanje i poruka da uplata kroz MPT sandbox dolazi
 * u S7. `?s={alias}` prikazuje kasicu ako pripada ovoj kampanji (inače se zanemaruje). Kampanja koja ne
 * prima uplate (isključena, završena, Safe neprovjeren) vraća 200 s obaviješću i bez obrasca, `noindex`.
 */
import type { StranicaKampanje } from "../../lib/db/kampanja";
import { kasicaPoAliasu, type KasicaSKampanjom } from "../../lib/db/kasice";
import { ucitajKampanju } from "../../components/kampanja/ucitavanje";
import type { Ucitaj } from "../tipovi";

export interface PodaciPodrske {
  k: StranicaKampanje;
  kasica: KasicaSKampanjom | null;
}

export const ucitaj: Ucitaj<PodaciPodrske> = async (ctx) => {
  const k = await ucitajKampanju(ctx, "campaign.support");
  if (k instanceof Response) return k;
  const alias = ctx.url.searchParams.get("s");
  const nadjena = alias ? await kasicaPoAliasu(ctx.db, alias) : null;
  return { podaci: { k, kasica: nadjena && nadjena.kampanja.publicId === k.publicId ? nadjena : null } };
};
