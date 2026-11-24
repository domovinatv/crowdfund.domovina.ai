/**
 * Korak 5 „pregled” (`/hr/organizacija/nova/pregled`, P): sažetak nacrta i slanje uz prihvat uvjeta → zahtjev
 * `submitted` (step 3), KYB `submitted`; 303 na `/hr/o/{slug}/zahtjev?poslano=1`.
 */
import { obrazac, polje, preusmjeri303 } from "../../components/organizacija/ucitavanje";
import { kategorije, type Kategorija } from "../../lib/db/katalog";
import { nacrtZahtjeva, posaljiZahtjev, prviNedovrseni, type GreskaSlanja, type KorakZahtjeva, type NacrtZahtjeva } from "../../lib/db/organizacija";
import { zahtijevajPrijavu } from "../../lib/pristup";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export interface PodaciKorakaPregled {
  nacrt: NacrtZahtjeva | null;
  nedovrseni: KorakZahtjeva;
  kategorije: Kategorija[];
  greska: GreskaSlanja | null;
}

export const ucitaj: Ucitaj<PodaciKorakaPregled> = async (ctx) => {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  const f = await obrazac(ctx);
  let greska: GreskaSlanja | null = null;
  if (f) {
    const r = await posaljiZahtjev(ctx.db, korisnik.id, polje(f, "uvjeti") === "1");
    if (r.ok) return preusmjeri303(`${url(ctx.lang, "org.application", { slug: r.slug })}?poslano=1`);
    greska = r.greska;
  }
  const n = await nacrtZahtjeva(ctx.db, korisnik.id);
  return { podaci: { nacrt: n, nedovrseni: prviNedovrseni(n), kategorije: await kategorije(ctx.db), greska } };
};
