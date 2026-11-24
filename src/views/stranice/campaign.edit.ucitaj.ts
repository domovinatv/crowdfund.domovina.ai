/**
 * Uredi kampanju `/hr/{id}/uredi` (K (U:editor), javni pregled §4.2): naslov, cilj, rok, opis, lokacija,
 * min. iznos, vidljivost, popis uplata, skriveni iznos i broj, komentari, kasice, ponude, zahvala, slug.
 * Zaključavanje (docs/05): verificirana namjena → naslov, opis i cilj odbija poslužitelj; slug nakon `active`.
 */
import { kucica, nakon, polje, porukaUspjeha, ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import { spremiPostavke, ulazIzKampanje, type GreskePostavki, type UlazPostavki } from "../../lib/db/upravljanje";
import type { Ucitaj } from "../tipovi";

export interface PodaciUredi {
  u: Upravljanje;
  vrijednosti: UlazPostavki;
  greske: GreskePostavki;
  spremljeno: boolean;
}

export const ucitaj: Ucitaj<PodaciUredi> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.edit");
  if (u instanceof Response) return u;
  if (ctx.request.method === "POST") {
    const f = await ctx.request.formData();
    const vrijednosti: UlazPostavki = {
      title: polje(f, "title"),
      description: polje(f, "description"),
      goal: polje(f, "goal"),
      endsAt: polje(f, "endsAt"),
      locationName: polje(f, "locationName"),
      minAmount: polje(f, "minAmount"),
      visibility: polje(f, "visibility"),
      contributionsList: polje(f, "contributionsList"),
      contributionsSort: polje(f, "contributionsSort"),
      hideRaised: kucica(f, "hideRaised"),
      hideContributorCount: kucica(f, "hideContributorCount"),
      commentsMode: polje(f, "commentsMode"),
      allowMoneyboxes: kucica(f, "allowMoneyboxes"),
      allowOffers: kucica(f, "allowOffers"),
      thankYou: polje(f, "thankYou"),
      slug: polje(f, "slug"),
    };
    // Zaključana polja: read-only u obrascu ne šalje se uvijek (disabled); prazno znači „bez promjene”.
    if (u.k.zakljucano) {
      if (!f.has("title")) vrijednosti.title = u.k.title;
      if (!f.has("description")) vrijednosti.description = u.k.description ?? "";
      if (!f.has("goal")) vrijednosti.goal = ulazIzKampanje(u.k, ctx.lang).goal;
    }
    const r = await spremiPostavke(ctx.db, u.k, vrijednosti, Date.now());
    if (r.ok) return nakon(u.put, "spremljeno");
    return { podaci: { u, vrijednosti, greske: r.greske, spremljeno: false } };
  }
  return { podaci: { u, vrijednosti: ulazIzKampanje(u.k, ctx.lang), greske: {}, spremljeno: porukaUspjeha(ctx.url, ["spremljeno"]) !== null } };
};
