/**
 * Načini prijave `/hr/postavke/prijava` (P, ekran 13 → odluka 208): bez lozinke; popis `auth_identities`
 * (kod, poveznica, Google) i uklanjanje, osim zadnjeg načina.
 */
import { natrag, okIz, poljaObrasca, prijavljeni } from "../../components/postavke/ucitavanje";
import { naciniPrijave, ukloniNacinPrijave, type NacinPrijave } from "../../lib/db/postavke";
import type { Ucitaj } from "../tipovi";

export interface PodaciNacinaPrijave {
  email: string;
  nacini: NacinPrijave[];
  greska: "zadnji" | "nema" | null;
  ok: string | null;
}

export const ucitaj: Ucitaj<PodaciNacinaPrijave> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  if (ctx.request.method === "POST") {
    const f = await poljaObrasca(ctx.request);
    const greska = await ukloniNacinPrijave(ctx.db, k.id, f.ukloni ?? "");
    if (!greska) return natrag(ctx, "settings.sign-in");
    return { podaci: { email: k.email, nacini: await naciniPrijave(ctx.db, k.id), greska, ok: null } };
  }
  return { podaci: { email: k.email, nacini: await naciniPrijave(ctx.db, k.id), greska: null, ok: okIz(ctx) } };
};
