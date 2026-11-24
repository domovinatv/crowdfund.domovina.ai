/**
 * Podaci `/hr/postavke/podaci` (P, ekran 10): ime, prezime, ime za prikaz; „o meni” i web tek uz verificiran
 * račun. E-pošta je samo za čitanje, fotografija je mock (spremište datoteka dolazi kasnije).
 */
import { natrag, okIz, poljaObrasca, prijavljeni } from "../../components/postavke/ucitavanje";
import { provjeriPodatke, racunKorisnika, spremiPodatke, type RacunKorisnika } from "../../lib/db/postavke";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciPodataka {
  racun: RacunKorisnika;
  vrijednosti: Record<string, string | null>;
  greske: Record<string, string>;
  ok: string | null;
}

export const ucitaj: Ucitaj<PodaciPodataka> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  const racun = await racunKorisnika(ctx.db, k.id);
  if (!racun) return nijePronadeno();
  const sada = { first_name: racun.firstName, last_name: racun.lastName, display_name: racun.displayName, about: racun.about, website: racun.website };
  if (ctx.request.method === "POST") {
    const f = await poljaObrasca(ctx.request);
    const { greske, vrijednosti } = provjeriPodatke(f, racun.verificiran);
    if (Object.keys(greske).length) return { podaci: { racun, vrijednosti: { ...sada, ...vrijednosti }, greske, ok: null } };
    await spremiPodatke(ctx.db, k.id, vrijednosti, Date.now());
    return natrag(ctx, "settings.details");
  }
  return { podaci: { racun, vrijednosti: sada, greske: {}, ok: okIz(ctx) } };
};
