/**
 * Dodatna potvrda `/hr/potvrda-radnje/{token}` (P+T, odluka 208): token je id retka `one_time_codes`
 * (`purpose = step_up`) prijavljenog korisnika; tuđi ili nepoznat token → 404. GET prikazuje stanje koda i
 * demo pretinac; POST `kod` → `used_at` i 303 na `next` (tamo `zahtijevajSvjezuPotvrdu` sada prolazi 10 min);
 * POST `ponovo=1` → novi kod za istu radnju i 303 na njegovu stranicu. Kodove izdaje `zahtijevajSvjezuPotvrdu`.
 */
import { nextIz, niz, preusmjeri303, upitNext } from "../../components/prijava/ucitavanje";
import { zahtijevajPrijavu } from "../../lib/pristup";
import { url } from "../../lib/rute";
import {
  izdajKod,
  kodPoId,
  posaljiDemoPostu,
  procitajDemoPostu,
  provjeriKod,
  sigurniNext,
  type DemoPoruka,
  type RazlogNeuspjeha,
  type StanjeKoda,
} from "../../lib/sesija";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciPotvrdeRadnje {
  token: string;
  action: string | null;
  email: string;
  stanje: StanjeKoda;
  demo: DemoPoruka | null;
  next: string;
  greska: RazlogNeuspjeha | null;
  preostalo: number | null;
}

export const ucitaj: Ucitaj<PodaciPotvrdeRadnje> = async (ctx) => {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  const sad = Date.now();
  const token = ctx.params.token ?? "";
  const red = await kodPoId(ctx.db, token, sad);
  if (!red || red.svrha !== "step_up" || red.userId !== korisnik.id) return nijePronadeno();

  let next = nextIz(ctx.url.searchParams.get("next"), ctx.lang);
  let greska: RazlogNeuspjeha | null = null;
  let preostalo: number | null = null;
  if (ctx.request.method === "POST") {
    const f = await ctx.request.formData();
    next = nextIz(niz(f.get("next")) || ctx.url.searchParams.get("next"), ctx.lang);
    if (niz(f.get("ponovo")) === "1") {
      const k = await izdajKod(ctx.db, { email: korisnik.email, userId: korisnik.id, svrha: "step_up", action: red.action, sad });
      posaljiDemoPostu(ctx.cookies, ctx.url, { id: k.id, email: korisnik.email, kod: k.kod, link: null });
      return preusmjeri303(url(ctx.lang, "confirm-action", { token: k.id }) + upitNext(next));
    }
    const ishod = await provjeriKod(ctx.db, { id: token, kod: niz(f.get("kod")), svrha: "step_up", userId: korisnik.id, sad });
    if (ishod.ok) return preusmjeri303(sigurniNext(next, ctx.lang));
    greska = ishod.razlog;
    preostalo = ishod.preostalo ?? null;
  }
  const sada = (await kodPoId(ctx.db, token, sad))!;
  return {
    podaci: {
      token,
      action: red.action,
      email: korisnik.email,
      stanje: sada.stanje,
      demo: procitajDemoPostu(ctx.cookies, token),
      next,
      greska,
      preostalo,
    },
  };
};
