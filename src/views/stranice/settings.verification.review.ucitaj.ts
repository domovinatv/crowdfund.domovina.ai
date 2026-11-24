/**
 * Pregled verifikacije osobe `/hr/postavke/verifikacija/pregled` (P, ekran 02 korak 4): stanje, referenca
 * mock pružatelja, razlog odbijanja. Gumbi „simuliraj odluku EMI-ja” (POST `odluka=approved|rejected`) su
 * jasno označen mock (nema pravog EMI-ja do S7); rade samo dok verifikacija čeka odluku.
 */
import { natrag, okIz, poljaObrasca, prijavljeni } from "../../components/postavke/ucitavanje";
import { simulirajOdluku, verifikacijaOsobe, type VerifikacijaOsobe } from "../../lib/db/postavke";
import type { Ucitaj } from "../tipovi";

export interface PodaciPregledaKyc {
  verifikacija: VerifikacijaOsobe | null;
  greska: "stanje" | null;
  ok: string | null;
}

export const ucitaj: Ucitaj<PodaciPregledaKyc> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  if (ctx.request.method === "POST") {
    const f = await poljaObrasca(ctx.request);
    const odluka = f.odluka === "approved" || f.odluka === "rejected" ? f.odluka : null;
    if (odluka && (await simulirajOdluku(ctx.db, k.id, odluka, Date.now()))) return natrag(ctx, "settings.verification.review", "odluceno");
    return { podaci: { verifikacija: await verifikacijaOsobe(ctx.db, k.id), greska: "stanje", ok: null } };
  }
  return { podaci: { verifikacija: await verifikacijaOsobe(ctx.db, k.id), greska: null, ok: okIz(ctx) } };
};
