/**
 * Linkovi za praćenje `/hr/{id}/upravljanje/linkovi` (K, ekran 16, tok 7): posjeti, jedinstveni posjetitelji,
 * broj i iznos doprinosa po linku, novi link (vlastiti ili nasumični slug), isključi/uključi (vlasnik linka
 * ili uloga ≥ editor).
 */
import { nakon, polje, porukaUspjeha, ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import { imaUlogu } from "../../lib/pristup";
import { linkoviZaUpravljanje, postaviStatusLinka, stvoriLink, type GreskeLinka, type LinkUpravljanja } from "../../lib/db/upravljanje";
import { apsolutno } from "../../components/kampanja/ucitavanje";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export const PORUKE_LINKOVA = ["stvoren", "iskljucen", "ukljucen"] as const;

export interface PodaciLinkova {
  u: Upravljanje;
  linkovi: LinkUpravljanja[];
  /** Apsolutni prefiks kratkog linka (`https://…/z/`). */
  prefiks: string;
  vrijednosti: { slug: string; label: string };
  greske: GreskeLinka;
  smijeSve: boolean;
  korisnikId: string;
  poruka: (typeof PORUKE_LINKOVA)[number] | null;
}

export const ucitaj: Ucitaj<PodaciLinkova> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage.links");
  if (u instanceof Response) return u;
  const sad = Date.now();
  const smijeSve = imaUlogu(u.pristup.uloga, "editor");
  let vrijednosti = { slug: "", label: "" };
  let greske: GreskeLinka = {};
  const linkovi = await linkoviZaUpravljanje(ctx.db, u.k.id);
  if (ctx.request.method === "POST") {
    const f = await ctx.request.formData();
    const akcija = polje(f, "akcija");
    if (akcija === "iskljuci" || akcija === "ukljuci") {
      const id = polje(f, "id");
      const link = linkovi.find((l) => l.id === id);
      if (!link || !(smijeSve || link.ownerId === u.korisnik.id)) return nijePronadeno();
      await postaviStatusLinka(ctx.db, u.k.id, id, akcija === "ukljuci" ? "active" : "disabled");
      return nakon(u.put, akcija === "ukljuci" ? "ukljucen" : "iskljucen");
    }
    vrijednosti = { slug: polje(f, "slug"), label: polje(f, "label") };
    const r = await stvoriLink(ctx.db, { campaignId: u.k.id, ownerId: u.korisnik.id }, vrijednosti, sad);
    if (r.ok) return nakon(u.put, "stvoren");
    greske = r.greske;
  }
  return {
    podaci: {
      u, linkovi, prefiks: apsolutno(ctx, "/z/"), vrijednosti, greske, smijeSve, korisnikId: u.korisnik.id,
      poruka: porukaUspjeha(ctx.url, PORUKE_LINKOVA),
    },
  };
};
