/**
 * Praćenje kampanje iz e-pošte `/hr/pracenje/{token}` (T, odluka 508): neispravan token → 404.
 * Neprijavljeni pratitelj potvrđuje praćenje gumbom (POST → `confirmed_at` → 303 `?potvrdeno=1`); GET ne mijenja
 * stanje (docs/07 konvencija 5).
 */
import { potvrdiPracenje, pracenjePoTokenu, type Pracenje } from "../../lib/db/pracenje";
import { url } from "../../lib/rute";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciPracenja {
  p: Pracenje;
  token: string;
  potvrdeno: boolean;
}

export const ucitaj: Ucitaj<PodaciPracenja> = async (ctx) => {
  const token = ctx.params.token ?? "";
  if (ctx.request.method === "POST") {
    if (!(await potvrdiPracenje(ctx.db, token, Date.now()))) return nijePronadeno();
    return new Response(null, { status: 303, headers: { Location: `${url(ctx.lang, "follow", { token })}?potvrdeno=1` } });
  }
  const p = await pracenjePoTokenu(ctx.db, token);
  return p ? { podaci: { p, token, potvrdeno: ctx.url.searchParams.get("potvrdeno") === "1" } } : nijePronadeno();
};
