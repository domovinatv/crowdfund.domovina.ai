/**
 * Zatvori ili obriši `/hr/{id}/upravljanje/zatvori` (U:owner, P+e; javni pregled §4.5, docs/05):
 * ručno zatvaranje `active → closed` i ponovno otvaranje, brisanje = soft delete (`deleted_at`,
 * `state = cancelled`, kasice `deleted`). Svaki POST traži svježu dodatnu potvrdu kodom; brisanje i upis
 * javnog ID-a kampanje (zaštita od slučajnog klika).
 */
import { nakon, polje, porukaUspjeha, ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import { zahtijevajSvjezuPotvrdu } from "../../lib/pristup";
import { obrisiKampanju, promijeniStanje } from "../../lib/db/upravljanje";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export const PORUKE_ZATVARANJA = ["zatvorena", "otvorena"] as const;

export interface PodaciZatvaranja {
  u: Upravljanje;
  greska: "potvrda_id" | "stanje" | null;
  poruka: (typeof PORUKE_ZATVARANJA)[number] | null;
}

export const ucitaj: Ucitaj<PodaciZatvaranja> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage.close");
  if (u instanceof Response) return u;
  const sad = Date.now();
  let greska: PodaciZatvaranja["greska"] = null;
  if (ctx.request.method === "POST") {
    const f = await ctx.request.formData();
    const akcija = polje(f, "akcija");
    const potvrda = await zahtijevajSvjezuPotvrdu(ctx, akcija === "obrisi" ? "delete_campaign" : "close_campaign", sad);
    if (potvrda) return potvrda;
    if (akcija === "obrisi") {
      if (polje(f, "potvrdaId").trim().toLowerCase() !== u.k.publicId) greska = "potvrda_id";
      else if (await obrisiKampanju(ctx.db, u.k.id, sad)) {
        return new Response(null, { status: 303, headers: { Location: `${url(ctx.lang, "my.campaigns")}?obrisana=${u.k.publicId}` } });
      } else greska = "stanje";
    } else if (akcija === "zatvori" || akcija === "otvori") {
      if (await promijeniStanje(ctx.db, u.k.id, akcija, sad)) return nakon(u.put, akcija === "zatvori" ? "zatvorena" : "otvorena");
      greska = "stanje";
    } else greska = "stanje";
  }
  return { podaci: { u, greska, poruka: porukaUspjeha(ctx.url, PORUKE_ZATVARANJA) } };
};
