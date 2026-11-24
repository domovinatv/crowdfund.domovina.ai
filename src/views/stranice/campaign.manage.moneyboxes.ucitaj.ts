/**
 * Kasice kampanje `/hr/{id}/upravljanje/kasice` (K, ekran 24): iznos i broj doprinosa po kasici (stvarni),
 * isključi/uključi (uloga ≥ editor). Kasice se otvaraju na `campaign.moneybox.new`.
 */
import { nakon, polje, porukaUspjeha, ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import { imaUlogu } from "../../lib/pristup";
import { kasiceZaUpravljanje, postaviStatusKasice, type KasicaUpravljanja } from "../../lib/db/upravljanje";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export const PORUKE_KASICA = ["iskljucena", "ukljucena"] as const;

export interface PodaciKasica {
  u: Upravljanje;
  kasice: KasicaUpravljanja[];
  smijeMijenjati: boolean;
  poruka: (typeof PORUKE_KASICA)[number] | null;
}

export const ucitaj: Ucitaj<PodaciKasica> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage.moneyboxes");
  if (u instanceof Response) return u;
  const smijeMijenjati = imaUlogu(u.pristup.uloga, "editor");
  if (ctx.request.method === "POST") {
    if (!smijeMijenjati) return nijePronadeno();
    const f = await ctx.request.formData();
    const status = polje(f, "akcija") === "ukljuci" ? "active" : "disabled";
    if (!(await postaviStatusKasice(ctx.db, u.k.id, polje(f, "id"), status, Date.now()))) return nijePronadeno();
    return nakon(u.put, status === "active" ? "ukljucena" : "iskljucena");
  }
  return { podaci: { u, kasice: await kasiceZaUpravljanje(ctx.db, u.k.id), smijeMijenjati, poruka: porukaUspjeha(ctx.url, PORUKE_KASICA) } };
};
