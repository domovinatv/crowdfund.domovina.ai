/**
 * Telefon `/hr/postavke/telefon` (P, ekran 11): dodavanje i promjena samo uz verificiran račun (`person_kyc
 * approved`); neverificiran vidi poziv na verifikaciju, a POST mu vraća grešku. Uklanjanje je uvijek dopušteno.
 */
import { natrag, okIz, poljaObrasca, prijavljeni } from "../../components/postavke/ucitavanje";
import { normalizirajTelefon, racunKorisnika, spremiTelefon } from "../../lib/db/postavke";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciTelefona {
  verificiran: boolean;
  telefon: string | null;
  unos: string;
  greska: "neispravno" | "verifikacija" | null;
  ok: string | null;
}

export const ucitaj: Ucitaj<PodaciTelefona> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  const racun = await racunKorisnika(ctx.db, k.id);
  if (!racun) return nijePronadeno();
  const osnova = { verificiran: racun.verificiran, telefon: racun.phone };
  if (ctx.request.method === "POST") {
    const f = await poljaObrasca(ctx.request);
    if (f.akcija === "ukloni") {
      await spremiTelefon(ctx.db, k.id, null, Date.now());
      return natrag(ctx, "settings.phone");
    }
    const unos = (f.phone ?? "").trim();
    if (!racun.verificiran) return { podaci: { ...osnova, unos, greska: "verifikacija", ok: null } };
    const t = normalizirajTelefon(unos);
    if (t === false || t === null) return { podaci: { ...osnova, unos, greska: "neispravno", ok: null } };
    await spremiTelefon(ctx.db, k.id, t, Date.now());
    return natrag(ctx, "settings.phone");
  }
  return { podaci: { ...osnova, unos: racun.phone ?? "", greska: null, ok: okIz(ctx) } };
};
