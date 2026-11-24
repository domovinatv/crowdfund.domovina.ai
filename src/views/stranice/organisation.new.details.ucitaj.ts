/**
 * Korak 1 „podaci” (`/hr/organizacija/nova/podaci`, P): naziv, adresa profila, pravni oblik, OIB, web, mreže,
 * opis, kategorija, sjedište. POST stvara ili mijenja nacrt u bazi (src/lib/db/organizacija.ts) → 303 na
 * zastupnika; greška → 200 s porukom uz polje.
 */
import { obrazac, polje, preusmjeri303, retci } from "../../components/organizacija/ucitavanje";
import { kategorije, type Kategorija } from "../../lib/db/katalog";
import { nacrtZahtjeva, predloziSlug, spremiPodatke, type Greske, type PoljePodataka, type UlazPodataka } from "../../lib/db/organizacija";
import { zahtijevajPrijavu } from "../../lib/pristup";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export interface PodaciKorakaPodaci {
  vrijednosti: UlazPodataka;
  greske: Greske<PoljePodataka>;
  kategorije: Kategorija[];
  imaNacrt: boolean;
}

const PRAZNO: UlazPodataka = { naziv: "", slug: "", pravniOblik: "", oib: "", web: "", mreze: [], opis: "", kategorija: "", adresa: "", grad: "", postanski: "" };

export const ucitaj: Ucitaj<PodaciKorakaPodaci> = async (ctx) => {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  const kat = await kategorije(ctx.db);
  const n = await nacrtZahtjeva(ctx.db, korisnik.id);
  const f = await obrazac(ctx);
  if (!f) {
    const vrijednosti: UlazPodataka = n
      ? { naziv: n.naziv, slug: n.slug, pravniOblik: n.pravniOblik, oib: n.oib, web: n.web, mreze: n.mreze, opis: n.opis, kategorija: n.kategorija ?? "", adresa: n.adresa, grad: n.grad, postanski: n.postanski }
      : PRAZNO;
    return { podaci: { vrijednosti, greske: {}, kategorije: kat, imaNacrt: !!n } };
  }
  const naziv = polje(f, "naziv");
  const u: UlazPodataka = {
    naziv,
    slug: (polje(f, "slug") || predloziSlug(naziv)).toLowerCase(),
    pravniOblik: polje(f, "pravniOblik"),
    oib: polje(f, "oib").replace(/\s/g, ""),
    web: polje(f, "web"),
    mreze: retci(polje(f, "mreze")),
    opis: polje(f, "opis"),
    kategorija: polje(f, "kategorija"),
    adresa: polje(f, "adresa"),
    grad: polje(f, "grad"),
    postanski: polje(f, "postanski"),
  };
  const r = await spremiPodatke(ctx.db, korisnik, u, kat.map((k) => k.key));
  if (r.ok) return preusmjeri303(url(ctx.lang, "organisation.new.representative"));
  return { podaci: { vrijednosti: u, greske: r.greske, kategorije: kat, imaNacrt: !!n } };
};
