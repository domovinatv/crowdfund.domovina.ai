/**
 * Financije `/hr/{id}/upravljanje/financije` (U:viewer, javni pregled §6, ekran 08): svi doprinosi (i anonimni,
 * s imenom i e-poštom iz checkouta), stanje doprinosa i MPT intenta, izvor, povrat. `?state=` filtrira
 * (engleski ključ, odluka 303); CSV je `…/financije.csv` s istim filtrom.
 */
import { ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import { FILTRI_STANJA, financijeKampanje, zbrojFinancija, type FiltarStanja, type RedakFinancija } from "../../lib/db/financije";
import type { Ucitaj } from "../tipovi";

export interface PodaciFinancija {
  u: Upravljanje;
  redovi: RedakFinancija[];
  zbroj: ReturnType<typeof zbrojFinancija>;
  filtar: FiltarStanja;
}

export const filtarIz = (x: string | null): FiltarStanja => ((FILTRI_STANJA as readonly string[]).includes(x ?? "") ? (x as FiltarStanja) : "all");

export const ucitaj: Ucitaj<PodaciFinancija> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage.finances");
  if (u instanceof Response) return u;
  const filtar = filtarIz(ctx.url.searchParams.get("state"));
  const [redovi, svi] = await Promise.all([financijeKampanje(ctx.db, u.k.id, filtar), financijeKampanje(ctx.db, u.k.id)]);
  return { podaci: { u, redovi, zbroj: zbrojFinancija(svi), filtar } };
};
