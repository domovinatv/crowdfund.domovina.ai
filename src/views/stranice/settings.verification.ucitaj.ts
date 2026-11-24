/**
 * Verifikacija računa `/hr/postavke/verifikacija` (P, ekran 02, docs/04 §1): stanje zadnje `person_kyc`
 * verifikacije i sljedeći korak (vrsta → podaci → pregled). KYC radi EMI; platforma drži samo stanje (odluka 6).
 */
import { prijavljeni } from "../../components/postavke/ucitavanje";
import { verifikacijaOsobe, type VerifikacijaOsobe } from "../../lib/db/postavke";
import type { Ucitaj } from "../tipovi";

export interface PodaciVerifikacije {
  verifikacija: VerifikacijaOsobe | null;
}

export const ucitaj: Ucitaj<PodaciVerifikacije> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  return { podaci: { verifikacija: await verifikacijaOsobe(ctx.db, k.id) } };
};
