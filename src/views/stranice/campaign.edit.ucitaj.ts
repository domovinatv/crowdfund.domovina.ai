/**
 * Uredi kampanju `/hr/{id}/uredi` (K (U:editor), javni pregled §4.2): naslov, cilj, rok, opis, lokacija,
 * min. iznos, vidljivost, popis uplata, skriveni iznos i broj, komentari, kasice, ponude, zahvala, slug; od S10
 * (paritet B01) i kategorija, tema naslovnice, video i „dopusti mjesečne doprinose” (`recurrence`, odluka 815).
 * Zaključavanje (docs/05): verificirana namjena → naslov, opis i cilj odbija poslužitelj; slug nakon `active`.
 */
import { kucica, nakon, polje, porukaUspjeha, ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import { kategorije } from "../../lib/db/katalog";
import { spremiPostavke, ulazIzKampanje, type GreskePostavki, type UlazPostavki } from "../../lib/db/upravljanje";
import type { Ucitaj } from "../tipovi";

export interface PodaciUredi {
  u: Upravljanje;
  vrijednosti: UlazPostavki;
  greske: GreskePostavki;
  spremljeno: boolean;
  /** Kategorije kampanja (isti izbor kao korak vrste u čarobnjaku). */
  kategorije: { key: string; hr: string; en: string }[];
}

export const ucitaj: Ucitaj<PodaciUredi> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.edit");
  if (u instanceof Response) return u;
  const kat = (await kategorije(ctx.db)).map((c) => ({ key: c.key, hr: c.nameHr, en: c.nameEn }));
  const sada = ulazIzKampanje(u.k, ctx.lang);
  // Polja S10 koja obrazac ne pošalje (stariji obrazac, test) ostaju kakva jesu; kućica šalje samo „1”.
  const iliSada = (f: FormData, p: "category" | "coverTheme" | "videoUrl") => (f.has(p) ? polje(f, p) : sada[p]);
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
      category: iliSada(f, "category"),
      coverTheme: iliSada(f, "coverTheme"),
      videoUrl: iliSada(f, "videoUrl"),
      allowMonthly: kucica(f, "allowMonthly"),
    };
    // Zaključana polja: read-only u obrascu ne šalje se uvijek (disabled); prazno znači „bez promjene”.
    if (u.k.zakljucano) {
      if (!f.has("title")) vrijednosti.title = u.k.title;
      if (!f.has("description")) vrijednosti.description = u.k.description ?? "";
      if (!f.has("goal")) vrijednosti.goal = sada.goal;
    }
    const r = await spremiPostavke(ctx.db, u.k, vrijednosti, Date.now());
    if (r.ok) return nakon(u.put, "spremljeno");
    return { podaci: { u, vrijednosti, greske: r.greske, spremljeno: false, kategorije: kat } };
  }
  return { podaci: { u, vrijednosti: sada, greske: {}, spremljeno: porukaUspjeha(ctx.url, ["spremljeno"]) !== null, kategorije: kat } };
};
