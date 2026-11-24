/**
 * Pozivnica `/hr/pozivnica/{token}` (T, prihvat P, odluka 150): GET prikazuje organizaciju, ulogu, tko poziva i
 * rok (nepoznat token 404). POST `radnja=prihvati|odbij` traži prijavu (302 na prijavu s `next`) i istu e-poštu;
 * prihvat → 303 na kampanje organizacije, odbijanje → 303 na istu stranicu.
 */
import { obrazac, polje, preusmjeri303 } from "../../components/organizacija/ucitavanje";
import { odbijPozivnicu, pozivnicaPoTokenu, prihvatiPozivnicu, type IshodPozivnice, type PozivnicaPoTokenu } from "../../lib/db/clanovi";
import { zahtijevajPrijavu, type Korisnik } from "../../lib/pristup";
import { url } from "../../lib/rute";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciPozivnice {
  token: string;
  pozivnica: PozivnicaPoTokenu;
  korisnik: Korisnik | null;
  ishod: IshodPozivnice | null;
}

export const ucitaj: Ucitaj<PodaciPozivnice> = async (ctx) => {
  const token = ctx.params.token ?? "";
  const sad = Date.now();
  const p = await pozivnicaPoTokenu(ctx.db, token, sad);
  if (!p) return nijePronadeno();
  const f = await obrazac(ctx);
  let ishod: IshodPozivnice | null = null;
  if (f) {
    const korisnik = zahtijevajPrijavu(ctx);
    if (korisnik instanceof Response) return korisnik;
    const radnja = polje(f, "radnja");
    ishod = radnja === "prihvati" ? await prihvatiPozivnicu(ctx.db, token, korisnik, sad) : await odbijPozivnicu(ctx.db, token, korisnik, sad);
    if (ishod === "prihvacena" || ishod === "vec_clan") return preusmjeri303(url(ctx.lang, "org.campaigns", { slug: p.organizacija.slug }));
    if (ishod === "odbijena") return preusmjeri303(`${url(ctx.lang, "invite", { token })}?odbijena=1`);
  }
  const svjeze = (await pozivnicaPoTokenu(ctx.db, token, sad))!;
  return { podaci: { token, pozivnica: svjeze, korisnik: ctx.korisnik, ishod: ishod ?? (ctx.url.searchParams.get("odbijena") === "1" ? "odbijena" : null) } };
};
