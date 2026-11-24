/**
 * Korak 3 „projekt” (`/hr/organizacija/nova/projekt`, P): opis projekta i očekivani mjesečni broj uplata
 * (4fund `projectDescription`, `paymentsNumber`). POST → 303 na KYB.
 */
import { obrazac, polje, preusmjeri303 } from "../../components/organizacija/ucitavanje";
import { nacrtZahtjeva, spremiProjekt, type Greske, type PoljeProjekta } from "../../lib/db/organizacija";
import { zahtijevajPrijavu } from "../../lib/pristup";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export interface PodaciKorakaProjekt {
  nacrt: { naziv: string } | null;
  vrijednosti: { opisProjekta: string; ocekivaneUplate: string };
  greske: Greske<PoljeProjekta>;
}

export const ucitaj: Ucitaj<PodaciKorakaProjekt> = async (ctx) => {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  const n = await nacrtZahtjeva(ctx.db, korisnik.id);
  const f = await obrazac(ctx);
  if (!f) {
    return { podaci: { nacrt: n && { naziv: n.naziv }, vrijednosti: { opisProjekta: n?.opisProjekta ?? "", ocekivaneUplate: n?.projekt ? n.ocekivaneUplate : "" }, greske: {} } };
  }
  const u = { opisProjekta: polje(f, "opisProjekta"), ocekivaneUplate: polje(f, "ocekivaneUplate") };
  const r = await spremiProjekt(ctx.db, korisnik.id, u);
  if (r.ok) return preusmjeri303(url(ctx.lang, "organisation.new.kyb"));
  return { podaci: { nacrt: n && { naziv: n.naziv }, vrijednosti: u, greske: r.greske } };
};
