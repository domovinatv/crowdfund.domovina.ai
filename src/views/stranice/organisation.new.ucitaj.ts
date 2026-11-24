/**
 * Uvod zahtjeva organizacije `/hr/organizacija/nova` (P, ekrani 20 i 26): pet koraka, nastavak nacrta i
 * popis organizacija korisnika s poveznicom na stanje zahtjeva.
 */
import { zahtijevajPrijavu } from "../../lib/pristup";
import { nacrtZahtjeva, organizacijeKorisnika, prviNedovrseni, type KorakZahtjeva } from "../../lib/db/organizacija";
import type { Ucitaj } from "../tipovi";

export interface PodaciUvodaZahtjeva {
  nacrt: { naziv: string; korak: KorakZahtjeva } | null;
  organizacije: Awaited<ReturnType<typeof organizacijeKorisnika>>;
}

export const ucitaj: Ucitaj<PodaciUvodaZahtjeva> = async (ctx) => {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  const n = await nacrtZahtjeva(ctx.db, korisnik.id);
  return {
    podaci: {
      nacrt: n && { naziv: n.naziv, korak: prviNedovrseni(n) },
      organizacije: (await organizacijeKorisnika(ctx.db, korisnik.id)).filter((o) => o.zahtjev !== "draft"),
    },
  };
};
