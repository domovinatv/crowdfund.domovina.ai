/**
 * Mjesečne donacije `/hr/postavke/ponavljajuce` (P, ekran 17, odluke 14, 215): moja `recurring_pledges`; pauza,
 * nastavak, otkaz (konačan) i dan u mjesecu 1–28. Samo vlastita obećanja (V). S8: zadnji podsjetnik kao mock
 * e-poruka s poveznicom na `/hr/podsjetnik/{token}` i gumb simulacije „pošalji sljedeći podsjetnik sada”
 * (`posaljiPodsjetnik`, isti put kao `dospjeliPodsjetnici`; Cron Trigger nije podešen).
 */
import { natrag, okIz, poljaObrasca, prijavljeni } from "../../components/postavke/ucitavanje";
import { mojaPonavljanja, promijeniPonavljanje, type Ponavljanje, type RadnjaPonavljanja } from "../../lib/db/postavke";
import { posaljiPodsjetnik, zadnjiPodsjetnici, type MockPodsjetnik } from "../../lib/db/ponavljanje";
import { mptKonfig } from "../../lib/mpt/klijent";
import type { Ucitaj } from "../tipovi";

export interface PodaciPonavljanja {
  ponavljanja: Ponavljanje[];
  /** Zadnja mock e-poruka podsjetnika po ID-u obećanja. */
  podsjetnici: Record<string, MockPodsjetnik>;
  /** Testni MPT ključ (sandbox): uputa za trajni nalog to kaže. */
  sandbox: boolean;
  greska: boolean;
  ok: string | null;
}

const RADNJE: readonly RadnjaPonavljanja[] = ["pause", "resume", "cancel", "day"];

export const ucitaj: Ucitaj<PodaciPonavljanja> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  const podaci = async (greska: boolean, ok: string | null): Promise<{ podaci: PodaciPonavljanja }> => ({
    podaci: {
      ponavljanja: await mojaPonavljanja(ctx.db, k.id),
      podsjetnici: Object.fromEntries(await zadnjiPodsjetnici(ctx.db, k.id)),
      sandbox: mptKonfig(ctx.env)?.secretKey.startsWith("sk_test_") ?? true,
      greska,
      ok,
    },
  });
  if (ctx.request.method === "POST") {
    const f = await poljaObrasca(ctx.request);
    const id = f.id ?? "";
    if (f.radnja === "podsjetnik") {
      // Simulacija Cron Triggera za jedno vlastito obećanje: sljedeći podsjetnik odmah.
      const moje = (await mojaPonavljanja(ctx.db, k.id)).some((r) => r.id === id);
      if (moje && (await posaljiPodsjetnik(ctx.db, id, Date.now()))?.ishod === "poslan") return natrag(ctx, "settings.recurring", "podsjetnik");
      return podaci(true, null);
    }
    const radnja = (RADNJE as readonly string[]).includes(f.radnja ?? "") ? (f.radnja as RadnjaPonavljanja) : null;
    const dan = /^\d{1,2}$/.test(f.dan ?? "") ? Number(f.dan) : null;
    if (radnja && (await promijeniPonavljanje(ctx.db, k.id, id, radnja, dan, Date.now()))) return natrag(ctx, "settings.recurring");
    return podaci(true, null);
  }
  return podaci(false, okIz(ctx));
};
