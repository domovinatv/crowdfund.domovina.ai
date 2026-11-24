/** Praćenje kampanje iz e-pošte `/hr/pracenje/{token}` (T, odluka 508): neispravan token → 404. */
import { pracenjePoTokenu, type Pracenje } from "../../lib/db/pracenje";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciPracenja {
  p: Pracenje;
  token: string;
}

export const ucitaj: Ucitaj<PodaciPracenja> = async (ctx) => {
  const token = ctx.params.token ?? "";
  const p = await pracenjePoTokenu(ctx.db, token);
  return p ? { podaci: { p, token } } : nijePronadeno();
};
