/**
 * Odjava praćenja `/hr/pracenje/{token}/odjava` (odluka 502): GET prikazuje potvrdu s gumbom (GET ne
 * mijenja stanje, docs/07 konvencija 5), POST → `odjaviPracenje` → 303 `?odjavljeno=1`.
 */
import { odjaviPracenje, pracenjePoTokenu, type Pracenje } from "../../lib/db/pracenje";
import { url } from "../../lib/rute";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciOdjave {
  p: Pracenje;
  token: string;
  odjavljeno: boolean;
}

export const ucitaj: Ucitaj<PodaciOdjave> = async (ctx) => {
  const token = ctx.params.token ?? "";
  if (ctx.request.method === "POST") {
    if (!(await odjaviPracenje(ctx.db, token))) return nijePronadeno();
    return new Response(null, { status: 303, headers: { Location: `${url(ctx.lang, "follow.unsubscribe", { token })}?odjavljeno=1` } });
  }
  const p = await pracenjePoTokenu(ctx.db, token);
  if (!p) return nijePronadeno();
  return { podaci: { p, token, odjavljeno: ctx.url.searchParams.get("odjavljeno") === "1" } };
};
