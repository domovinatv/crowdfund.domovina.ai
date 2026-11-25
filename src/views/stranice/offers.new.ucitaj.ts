/**
 * Nova ponuda `/hr/ponude/nova` (pristup P, faza 2): neprijavljeni → 302 na prijavu s `?next=<trenutni put>`
 * (odluka 516, S6). Obrazac nabraja kampanje kojima korisnik smije dodati ponudu (vlastite i tuđe koje primaju
 * ponude), `?campaign=<javni ID>` ju predodabire. POST sprema samo NACRT (`offers.status = 'draft'`, S8-B);
 * ponuda na tuđoj kampanji je Founder's Offer i traži verificiranu osobu (obilazak 23). Kupnje i licitiranja nema.
 */
import { polje, porukaUspjeha } from "../../components/upravljanje/ucitavanje";
import { osobaVerificirana } from "../../lib/db/objava";
import {
  kampanjeZaPonudu, mojiNacrtiPonuda, spremiNacrtPonude, type GreskePonude, type KampanjaZaPonudu, type NacrtPonude, type PoljaPonude,
} from "../../lib/db/ponude";
import { zahtijevajPrijavu } from "../../lib/pristup";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export interface PodaciNovePonude {
  kampanje: KampanjaZaPonudu[];
  nacrti: NacrtPonude[];
  verificiran: boolean;
  polja: PoljaPonude;
  greske: GreskePonude;
  spremljeno: boolean;
}

const PRAZNO: PoljaPonude = {
  campaign: "", title: "", description: "", category: "", condition: "", mode: "buy_now", price: "", quantity: "1", days: "14",
  delivery: "",
};
const IMENA = Object.keys(PRAZNO) as (keyof PoljaPonude)[];

export const ucitaj: Ucitaj<PodaciNovePonude> = async (ctx) => {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  const verificiran = await osobaVerificirana(ctx.db, korisnik.id);
  let polja: PoljaPonude = { ...PRAZNO, campaign: ctx.url.searchParams.get("campaign")?.trim().toLowerCase() ?? "" };
  let greske: GreskePonude = {};
  if (ctx.request.method === "POST") {
    const f = await ctx.request.formData();
    polja = Object.fromEntries(IMENA.map((k) => [k, polje(f, k)])) as unknown as PoljaPonude;
    const r = await spremiNacrtPonude(ctx.db, korisnik.id, polja, verificiran, Date.now());
    if (r.ok) {
      return new Response(null, { status: 303, headers: { Location: `${url(ctx.lang, "offers.new")}?ok=spremljeno#nacrti` } });
    }
    greske = r.greske;
  }
  const [kampanje, nacrti] = await Promise.all([kampanjeZaPonudu(ctx.db, korisnik.id), mojiNacrtiPonuda(ctx.db, korisnik.id)]);
  return {
    podaci: { kampanje, nacrti, verificiran, polja, greske, spremljeno: porukaUspjeha(ctx.url, ["spremljeno"]) !== null },
  };
};
