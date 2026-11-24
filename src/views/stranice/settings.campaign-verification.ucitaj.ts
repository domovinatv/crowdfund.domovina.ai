/**
 * Verifikacija kampanja `/hr/postavke/verifikacija-kampanja` (P, ekran 15, odluka 18): moje kampanje i
 * kampanje mojih organizacija (uloga ≥ editor) s pragom (`pragovi.ts`) i stanjem dokaza namjene; dokazi se
 * šalju na `campaign.manage.verification`.
 */
import { prijavljeni } from "../../components/postavke/ucitavanje";
import { kampanjeZaVerifikaciju, type KampanjaZaVerifikaciju } from "../../lib/db/postavke";
import type { Ucitaj } from "../tipovi";

export interface PodaciVerifikacijeKampanja {
  kampanje: KampanjaZaVerifikaciju[];
  sad: number;
}

export const ucitaj: Ucitaj<PodaciVerifikacijeKampanja> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  const sad = Date.now();
  return { podaci: { kampanje: await kampanjeZaVerifikaciju(ctx.db, k.id, sad), sad } };
};
