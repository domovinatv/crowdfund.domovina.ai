/**
 * Korak 4 „KYB” (`/hr/organizacija/nova/kyb`, P): KYB organizacije provodi institucija za e-novac (mock); privola →
 * `verifications(org_kyb, requested, mock)`. POST → 303 na pregled.
 */
import { obrazac, polje, preusmjeri303 } from "../../components/organizacija/ucitavanje";
import { nacrtZahtjeva, spremiKyb, type Greske, type PoljeKyb } from "../../lib/db/organizacija";
import { zahtijevajPrijavu } from "../../lib/pristup";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export interface PodaciKorakaKyb {
  nacrt: { naziv: string; kyb: boolean } | null;
  greske: Greske<PoljeKyb>;
}

export const ucitaj: Ucitaj<PodaciKorakaKyb> = async (ctx) => {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  const n = await nacrtZahtjeva(ctx.db, korisnik.id);
  const f = await obrazac(ctx);
  if (f) {
    const r = await spremiKyb(ctx.db, korisnik.id, polje(f, "privola") === "1");
    if (r.ok) return preusmjeri303(url(ctx.lang, "organisation.new.review"));
    return { podaci: { nacrt: n && { naziv: n.naziv, kyb: n.kyb }, greske: r.greske } };
  }
  return { podaci: { nacrt: n && { naziv: n.naziv, kyb: n.kyb }, greske: {} } };
};
