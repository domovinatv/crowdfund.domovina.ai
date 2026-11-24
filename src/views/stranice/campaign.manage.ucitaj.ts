/**
 * Nadzorna ploča kampanje `/hr/{id}/upravljanje` (K): brojke, doprinosi po danu (30 dana), izvori (kasice,
 * linkovi za praćenje, dijeljenje, izravno) i Isključi/Uključi (`paused_at`, POST, uloga ≥ editor).
 */
import { nakon, polje, porukaUspjeha, ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import { imaUlogu } from "../../lib/pristup";
import { nadzornaPloca, postaviIskljucenost, type NadzornaPloca } from "../../lib/db/upravljanje";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export const PORUKE_PLOCE = ["iskljucena", "ukljucena"] as const;

export interface PodaciPloce {
  u: Upravljanje;
  ploca: NadzornaPloca;
  /** Smije isključiti/uključiti (uloga ≥ editor). */
  smijeStanje: boolean;
  poruka: (typeof PORUKE_PLOCE)[number] | null;
  greska: boolean;
}

export const ucitaj: Ucitaj<PodaciPloce> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage");
  if (u instanceof Response) return u;
  const smijeStanje = imaUlogu(u.pristup.uloga, "editor");
  const sad = Date.now();
  let greska = false;
  if (ctx.request.method === "POST") {
    if (!smijeStanje) return nijePronadeno();
    const radnja = polje(await ctx.request.formData(), "akcija");
    if (radnja === "iskljuci" || radnja === "ukljuci") {
      if (await postaviIskljucenost(ctx.db, u.k.id, radnja === "iskljuci", sad)) return nakon(u.put, radnja === "iskljuci" ? "iskljucena" : "ukljucena");
    }
    greska = true;
  }
  return { podaci: { u, ploca: await nadzornaPloca(ctx.db, u.k.id, sad), smijeStanje, poruka: porukaUspjeha(ctx.url, PORUKE_PLOCE), greska } };
};
