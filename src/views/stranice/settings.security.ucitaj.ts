/**
 * Sigurnost `/hr/postavke/sigurnost` (P, ekran 14): dodatna potvrda e-poštom za osjetljive radnje
 * (`RADNJE_POTVRDE`), bez limita isplate (platforma ne isplaćuje, odluka 6), broj aktivnih prijava i
 * „odjavi sve ostale uređaje” (ova sesija ostaje).
 */
import { natrag, okIz, poljaObrasca, prijavljeni } from "../../components/postavke/ucitavanje";
import { aktivneSesije, odjaviOstaleSesije } from "../../lib/db/postavke";
import { KOLACIC_SESIJE } from "../../lib/sesija";
import type { Ucitaj } from "../tipovi";

export interface PodaciSigurnosti {
  sesija: number;
  /** Broj upravo odjavljenih uređaja (iz `?ok=`), ili null. */
  odjavljeno: number | null;
}

export const ucitaj: Ucitaj<PodaciSigurnosti> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  const sad = Date.now();
  if (ctx.request.method === "POST") {
    const f = await poljaObrasca(ctx.request);
    if (f.akcija === "odjavi_ostale") {
      const n = await odjaviOstaleSesije(ctx.db, k.id, ctx.cookies.get(KOLACIC_SESIJE)?.value, sad);
      return natrag(ctx, "settings.security", String(n));
    }
  }
  const ok = okIz(ctx);
  const odjavljeno = ok !== null && /^\d+$/.test(ok) ? Number(ok) : null;
  return { podaci: { sesija: await aktivneSesije(ctx.db, k.id, sad), odjavljeno } };
};
