/**
 * Mjesečne donacije `/hr/postavke/ponavljajuce` (P, ekran 17, odluka 215): moja `recurring_pledges`; pauza,
 * nastavak, otkaz (konačan) i dan u mjesecu 1–28. Samo vlastita obećanja; uplata kroz podsjetnik je S7–S8.
 */
import { natrag, okIz, poljaObrasca, prijavljeni } from "../../components/postavke/ucitavanje";
import { mojaPonavljanja, promijeniPonavljanje, type Ponavljanje, type RadnjaPonavljanja } from "../../lib/db/postavke";
import type { Ucitaj } from "../tipovi";

export interface PodaciPonavljanja {
  ponavljanja: Ponavljanje[];
  greska: boolean;
  ok: string | null;
}

const RADNJE: readonly RadnjaPonavljanja[] = ["pause", "resume", "cancel", "day"];

export const ucitaj: Ucitaj<PodaciPonavljanja> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  if (ctx.request.method === "POST") {
    const f = await poljaObrasca(ctx.request);
    const radnja = (RADNJE as readonly string[]).includes(f.radnja ?? "") ? (f.radnja as RadnjaPonavljanja) : null;
    const dan = /^\d{1,2}$/.test(f.dan ?? "") ? Number(f.dan) : null;
    if (radnja && (await promijeniPonavljanje(ctx.db, k.id, f.id ?? "", radnja, dan, Date.now()))) return natrag(ctx, "settings.recurring");
    return { podaci: { ponavljanja: await mojaPonavljanja(ctx.db, k.id), greska: true, ok: null } };
  }
  return { podaci: { ponavljanja: await mojaPonavljanja(ctx.db, k.id), greska: false, ok: okIz(ctx) } };
};
