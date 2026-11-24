/**
 * Povrati `/hr/{id}/upravljanje/povrati` (U:admin, P+e; odluka 210, docs/04 tok 11). Platforma ništa ne vraća:
 * organizator zapisuje svoju transakciju (Safe tx hash ili bankovnu referencu), pa potvrđuje zapis (mock
 * provjere lanca) i tek tada doprinos postaje `refunded`. Svaki POST traži svježu dodatnu potvrdu kodom.
 */
import { nakon, polje, porukaUspjeha, ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import { zahtijevajSvjezuPotvrdu } from "../../lib/pristup";
import { financijeKampanje, potvrdiPovrat, povratiKampanje, zapisiPovrat, type GreskePovrata, type Povrat, type RedakFinancija } from "../../lib/db/financije";
import type { Ucitaj } from "../tipovi";

export const PORUKE_POVRATA = ["zapisan", "potvrden"] as const;

export interface PodaciPovrata {
  u: Upravljanje;
  povrati: Povrat[];
  /** Plaćeni doprinosi bez povrata (kandidati za novi zapis). */
  placeni: RedakFinancija[];
  vrijednosti: { contribution: string; method: string; reference: string };
  greske: GreskePovrata;
  poruka: (typeof PORUKE_POVRATA)[number] | null;
  greskaPotvrde: boolean;
}

export const ucitaj: Ucitaj<PodaciPovrata> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage.refunds");
  if (u instanceof Response) return u;
  const sad = Date.now();
  let vrijednosti = { contribution: ctx.url.searchParams.get("contribution") ?? "", method: "safe_tx", reference: "" };
  let greske: GreskePovrata = {};
  let greskaPotvrde = false;
  if (ctx.request.method === "POST") {
    const potvrda = await zahtijevajSvjezuPotvrdu(ctx, "refund", sad);
    if (potvrda) return potvrda;
    const f = await ctx.request.formData();
    if (polje(f, "akcija") === "potvrdi") {
      if (await potvrdiPovrat(ctx.db, u.k.id, polje(f, "refund"), sad)) return nakon(u.put, "potvrden");
      greskaPotvrde = true;
    } else {
      vrijednosti = { contribution: polje(f, "contribution"), method: polje(f, "method"), reference: polje(f, "reference") };
      const r = await zapisiPovrat(ctx.db, u.k.id, u.korisnik.id, { contributionId: vrijednosti.contribution, method: vrijednosti.method, reference: vrijednosti.reference }, sad);
      if (r.ok) return nakon(u.put, "zapisan");
      greske = r.greske;
    }
  }
  const [povrati, placeni] = await Promise.all([povratiKampanje(ctx.db, u.k.id), financijeKampanje(ctx.db, u.k.id, "paid")]);
  return {
    podaci: {
      u, povrati, placeni: placeni.filter((r) => !r.povrat), vrijednosti, greske,
      poruka: porukaUspjeha(ctx.url, PORUKE_POVRATA), greskaPotvrde,
    },
  };
};
