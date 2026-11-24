/**
 * Podaci za verifikaciju osobe `/hr/postavke/verifikacija/podaci` (P, ekran 02 korak 3): obrazac bez Onfida.
 * POST: validacija (`provjeriObrazacKyc`) → 200 s greškama uz polja, ili nova `verifications(person_kyc,
 * submitted, provider mock)` i 303 na pregled. Dok je zadnja poslana, u pregledu ili odobrena, obrazac se ne
 * nudi (POST → 303 na pregled). Podaci obrasca idu EMI-ju i ne spremaju se; ime i prezime se upisuju u račun.
 */
import { poljaObrasca, prijavljeni } from "../../components/postavke/ucitavanje";
import { posaljiVerifikaciju, provjeriObrazacKyc, racunKorisnika, verifikacijaOsobe, type StanjeKyc } from "../../lib/db/postavke";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export interface PodaciObrascaKyc {
  /** Stanje zadnje verifikacije; `submitted`/`in_review`/`approved` = obrazac zaključan. */
  stanje: StanjeKyc | null;
  vrijednosti: Record<string, string>;
  greske: Record<string, string>;
}

export const zakljucanKyc = (s: StanjeKyc | null | undefined): boolean => s === "submitted" || s === "in_review" || s === "approved";

const naPregled = (ctx: Parameters<Ucitaj>[0]) =>
  new Response(null, { status: 303, headers: { Location: url(ctx.lang, "settings.verification.review"), "Cache-Control": "private, no-store" } });

export const ucitaj: Ucitaj<PodaciObrascaKyc> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  const sad = Date.now();
  const stanje = (await verifikacijaOsobe(ctx.db, k.id))?.status ?? null;
  if (ctx.request.method === "POST") {
    if (zakljucanKyc(stanje)) return naPregled(ctx);
    const f = await poljaObrasca(ctx.request);
    const greske = provjeriObrazacKyc(f, sad);
    if (Object.keys(greske).length) return { podaci: { stanje, vrijednosti: f, greske } };
    await posaljiVerifikaciju(ctx.db, k.id, f, sad);
    return naPregled(ctx);
  }
  const r = await racunKorisnika(ctx.db, k.id);
  const vrijednosti: Record<string, string> = {
    first_name: r?.firstName ?? "", last_name: r?.lastName ?? "", citizenship: "HR", birth_country: "HR", residence_country: "HR", document_type: "id_card",
  };
  return { podaci: { stanje, vrijednosti, greske: {} } };
};
