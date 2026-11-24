/** Stranica kasice `/hr/s/{alias}` (ekran 24, tok 6): neaktivna kasica ili nevidljiva kampanja → 404. */
import { kasicaPoAliasu, type KasicaSKampanjom } from "../../lib/db/kasice";
import { url } from "../../lib/rute";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciKasice {
  kasica: KasicaSKampanjom;
}

export const ucitaj: Ucitaj<PodaciKasice> = async (ctx) => {
  const sirovi = ctx.params.alias ?? "";
  const kasica = await kasicaPoAliasu(ctx.db, sirovi);
  if (!kasica) return nijePronadeno();
  if (sirovi !== kasica.alias) {
    return new Response(null, { status: 301, headers: { Location: url(ctx.lang, "moneybox", { alias: kasica.alias }) + ctx.url.search } });
  }
  return { podaci: { kasica } };
};
