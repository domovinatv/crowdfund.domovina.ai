/**
 * Korak 2 „zastupnik” (`/hr/organizacija/nova/zastupnik`, P): ime, prezime, funkcija i izjava o ovlasti osobe koja
 * šalje zahtjev. Bez nacrta: 200 s uputom na prvi korak. POST → 303 na projekt.
 */
import { obrazac, polje, preusmjeri303 } from "../../components/organizacija/ucitavanje";
import { nacrtZahtjeva, spremiZastupnika, type Greske, type PoljeZastupnika, type Zastupnik } from "../../lib/db/organizacija";
import { zahtijevajPrijavu } from "../../lib/pristup";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export interface PodaciKorakaZastupnik {
  nacrt: { naziv: string } | null;
  vrijednosti: Zastupnik;
  greske: Greske<PoljeZastupnika>;
}

export const ucitaj: Ucitaj<PodaciKorakaZastupnik> = async (ctx) => {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  const n = await nacrtZahtjeva(ctx.db, korisnik.id);
  const f = await obrazac(ctx);
  if (!f) {
    const ja = await ctx.db.prepare("SELECT first_name, last_name FROM users WHERE id = ?").bind(korisnik.id).first<{ first_name: string | null; last_name: string | null }>();
    const vrijednosti = n?.zastupnik ?? { ime: ja?.first_name ?? "", prezime: ja?.last_name ?? "", funkcija: "", ovlast: false };
    return { podaci: { nacrt: n && { naziv: n.naziv }, vrijednosti, greske: {} } };
  }
  const z: Zastupnik = { ime: polje(f, "ime"), prezime: polje(f, "prezime"), funkcija: polje(f, "funkcija"), ovlast: polje(f, "ovlast") === "1" };
  const r = await spremiZastupnika(ctx.db, korisnik.id, z);
  if (r.ok) return preusmjeri303(url(ctx.lang, "organisation.new.project"));
  return { podaci: { nacrt: n && { naziv: n.naziv }, vrijednosti: z, greske: r.greske } };
};
