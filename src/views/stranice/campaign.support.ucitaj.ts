/**
 * „Podrži” `/hr/{id}/podrzi` (J*, checkout korak 1, docs/08 §5.2, obilazak 19 i 25). GET: obrazac; POST:
 * provjera, `stvoriCheckout` (redovi + MPT intent) i 303 na stranicu plaćanja. Bez JS-a: greške uz polja.
 * Prijavljenom se e-pošta uzima iz sesije, a „kao tvrtka” i prihvat uvjeta se ne nude (odluka 153).
 * `?s={alias}` kasica i `?ref={code}` dijeljenja putuju skrivenim poljima; atribucija linka iz kolačića.
 * Kampanja koja ne prima uplate vraća 200 s obaviješću i bez obrasca, `noindex` (kao stub S5).
 * CSRF: Astro `security.checkOrigin` (zadano uključen) odbija POST obrasca s tuđeg origina, kao ostale stranice.
 */
import type { StranicaKampanje } from "../../lib/db/kampanja";
import { kasicaPoAliasu, type KasicaSKampanjom } from "../../lib/db/kasice";
import {
  NAJMANJE_CENTI,
  ZADANI_IZNOSI,
  prazanObrazac,
  provjeriObrazac,
  stvoriCheckout,
  type GreskeCheckouta,
  type ObrazacCheckouta,
} from "../../lib/db/checkout";
import { ucitajKampanju, apsolutno } from "../../components/kampanja/ucitavanje";
import { konfigIzKonteksta } from "../../components/checkout/ucitavanje";
import { KOLACIC_ATRIBUCIJE } from "../../components/kampanja/posjetitelj";
import { kucica, polje } from "../../components/upravljanje/ucitavanje";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export interface PodaciPodrske {
  k: StranicaKampanje;
  kasica: KasicaSKampanjom | null;
  ref: string | null;
  iznosi: number[];
  najmanjeCenti: number;
  vrijednosti: ObrazacCheckouta;
  greske: GreskeCheckouta;
  /** Greška pri pripremi uplate (MPT ne odgovara ili nema ključeva). */
  greskaUplate: "mpt" | "konfig" | null;
}

/** Obrazac iz FormData (imena polja su ugovor s pogledom i e2e testom). */
export function obrazacIzForme(f: FormData): ObrazacCheckouta {
  return {
    izbor: polje(f, "izbor"),
    svojIznos: polje(f, "svojIznos"),
    poruka: polje(f, "poruka"),
    skrijIme: kucica(f, "skrijIme"),
    skrijIznos: kucica(f, "skrijIznos"),
    email: polje(f, "email"),
    ime: polje(f, "ime"),
    prezime: polje(f, "prezime"),
    kaoTvrtka: kucica(f, "kaoTvrtka"),
    tvrtka: polje(f, "tvrtka"),
    oib: polje(f, "oib"),
    uvjeti: kucica(f, "uvjeti"),
  };
}

export const ucitaj: Ucitaj<PodaciPodrske> = async (ctx) => {
  const k = await ucitajKampanju(ctx, "campaign.support");
  if (k instanceof Response) return k;
  const post = ctx.request.method === "POST";
  const f = post ? await ctx.request.formData() : null;
  const alias = (f ? polje(f, "s") : ctx.url.searchParams.get("s")) || null;
  const nadjena = alias ? await kasicaPoAliasu(ctx.db, alias) : null;
  const kasica = nadjena && nadjena.kampanja.publicId === k.publicId ? nadjena : null;
  const refUlaz = (f ? polje(f, "ref") : ctx.url.searchParams.get("ref")) || null;
  const ref = refUlaz && /^[A-Za-z0-9_-]{3,64}$/.test(refUlaz) ? refUlaz : null;
  const iznosi = k.amountPresets.length ? k.amountPresets.slice(0, 6) : ZADANI_IZNOSI;
  const najmanjeCenti = Math.max(NAJMANJE_CENTI, k.minContributionCents ?? 0);

  let vrijednosti = prazanObrazac();
  let greske: GreskeCheckouta = {};
  let greskaUplate: PodaciPodrske["greskaUplate"] = null;

  if (f && k.primaUplate) {
    vrijednosti = obrazacIzForme(f);
    const korisnik = ctx.korisnik;
    const r = provjeriObrazac(vrijednosti, { prijavljen: korisnik, najmanjeCenti });
    if (!r.ok) greske = r.greske;
    else {
      const konfig = konfigIzKonteksta(ctx);
      if (!konfig) greskaUplate = "konfig";
      else {
        const lang = ctx.lang;
        const rez = await stvoriCheckout(ctx.db, konfig, {
          publicId: k.publicId,
          podaci: r.cisto,
          korisnik: korisnik ? { id: korisnik.id, email: korisnik.email, ime: korisnik.ime } : null,
          kasica: kasica?.alias ?? null,
          atribucija: ctx.cookies.get(KOLACIC_ATRIBUCIJE)?.value ?? null,
          ref,
          povratniUrl: (checkout) => apsolutno(ctx, url(lang, "campaign.support.checkout", { id: k.publicId, checkout })),
        });
        if (rez.ok) {
          return new Response(null, {
            status: 303,
            headers: { Location: url(lang, "campaign.support.checkout", { id: k.publicId, checkout: rez.checkoutId }) },
          });
        }
        // Kampanja je u međuvremenu prestala primati uplate: obrazac nestaje, obavijest ostaje (kao GET).
        if (rez.razlog === "nema") return new Response(null, { status: 404 });
        greskaUplate = "mpt";
      }
    }
  }
  return { podaci: { k, kasica, ref, iznosi, najmanjeCenti, vrijednosti, greske, greskaUplate } };
};
