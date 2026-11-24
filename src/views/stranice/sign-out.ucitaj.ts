/**
 * Odjava `/hr/odjava` (P): GET prikazuje gumb (obrazac), POST opoziva sesiju (`revoked_at`), briše kolačić
 * i vodi 303 na naslovnicu. POST bez važeće sesije samo briše kolačić (odjava je idempotentna).
 */
import { preusmjeri303 } from "../../components/prijava/ucitavanje";
import { zahtijevajPrijavu } from "../../lib/pristup";
import { url } from "../../lib/rute";
import { KOLACIC_SESIJE, obrisiSesiju, opozoviSesiju, type Korisnik } from "../../lib/sesija";
import type { Ucitaj } from "../tipovi";

export const ucitaj: Ucitaj<{ korisnik: Korisnik }> = async (ctx) => {
  if (ctx.request.method === "POST") {
    await opozoviSesiju(ctx.db, ctx.cookies.get(KOLACIC_SESIJE)?.value, Date.now());
    obrisiSesiju(ctx.cookies);
    return preusmjeri303(url(ctx.lang, "home"));
  }
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  return { podaci: { korisnik } };
};
