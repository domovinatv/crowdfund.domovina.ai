/**
 * Nova kasica `/hr/{id}/kasica/nova` (P, ekran 24, tok 6): naslov ≤ 60, alias predložen iz naslova kampanje,
 * cilj neobavezan, opis s predloškom, prihvat pravila (`consents.moneybox_rules`), obavijesti zadano uključene,
 * zahvala neobavezna. Neprijavljeni → 302 na prijavu (odluka 516). Kampanja koja nije javno vidljiva → 404;
 * ako ne prima kasice (isključene, zatvorena, ne prima uplate) obrazac se ne prikazuje. Uspjeh → 303 na `/s/{alias}`.
 */
import { kucica, polje } from "../../components/upravljanje/ucitavanje";
import { ucitajKampanju } from "../../components/kampanja/ucitavanje";
import { zahtijevajPrijavu } from "../../lib/pristup";
import { predloziAlias, stvoriKasicu, type GreskeKasice, type UlazKasice } from "../../lib/db/upravljanje";
import type { StranicaKampanje } from "../../lib/db/kampanja";
import { url } from "../../lib/rute";
import { UPRAVLJANJE } from "../sadrzaj/upravljanje";
import type { Ucitaj } from "../tipovi";

export interface PodaciNoveKasice {
  k: StranicaKampanje;
  /** Kasica se ne može otvoriti: kampanja ne dopušta kasice ili ne prima uplate. */
  zatvoreno: "kasice" | "uplate" | null;
  vrijednosti: UlazKasice;
  greske: GreskeKasice;
}

export const ucitaj: Ucitaj<PodaciNoveKasice> = async (ctx) => {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  const k = await ucitajKampanju(ctx, "campaign.moneybox.new");
  if (k instanceof Response) return k;
  const zatvoreno = !k.postavke.kasiceDopustene ? "kasice" : !k.primaUplate ? "uplate" : null;
  const T = UPRAVLJANJE[ctx.lang].novaKasica;
  let vrijednosti: UlazKasice = {
    title: "",
    alias: await predloziAlias(ctx.db, k.title),
    goal: "",
    description: T.predlozak,
    rules: false,
    notifications: true,
    thankYouOn: false,
    thankYou: "",
  };
  let greske: GreskeKasice = {};
  if (ctx.request.method === "POST" && !zatvoreno) {
    const f = await ctx.request.formData();
    vrijednosti = {
      title: polje(f, "title"), alias: polje(f, "alias"), goal: polje(f, "goal"), description: polje(f, "description"),
      rules: kucica(f, "rules"), notifications: kucica(f, "notifications"), thankYouOn: kucica(f, "thankYouOn"), thankYou: polje(f, "thankYou"),
    };
    const r = await stvoriKasicu(ctx.db, { campaignId: k.id, ownerId: korisnik.id }, vrijednosti, Date.now());
    if (r.ok) return new Response(null, { status: 303, headers: { Location: `${url(ctx.lang, "moneybox", { alias: r.alias })}?nova=1` } });
    greske = r.greske;
  }
  return { podaci: { k, zatvoreno, vrijednosti, greske } };
};
