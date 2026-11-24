/**
 * Vrsta računa `/hr/postavke/verifikacija/vrsta` (P, ekran 02 korak 2): fizička osoba → obrazac podataka;
 * organizacija → zahtjev organizacije s KYB-om (`organisation.new`). Bez koraka lozinke (odluka 208).
 */
import { prijavljeni } from "../../components/postavke/ucitavanje";
import { verifikacijaOsobe, type StanjeKyc } from "../../lib/db/postavke";
import type { Ucitaj } from "../tipovi";

export interface PodaciVrsteVerifikacije {
  stanje: StanjeKyc | null;
}

export const ucitaj: Ucitaj<PodaciVrsteVerifikacije> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  return { podaci: { stanje: (await verifikacijaOsobe(ctx.db, k.id))?.status ?? null } };
};
