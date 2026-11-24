/**
 * Stanje zahtjeva organizacije `/hr/o/{slug}/zahtjev` (U:owner, ekran 26): „N / 5”, KYB (mock pružatelj; odluku
 * simulira moderator na `/admin/organizacije`), Safe organizacije nakon KYB-a (tok 2) i ponovno slanje nakon
 * odbijanja. POST `radnja=safe|ponovno` → 303 na istu stranicu.
 */
import { obrazac, organizacijaRute, polje, preusmjeri303 } from "../../components/organizacija/ucitavanje";
import { ponovnoPosalji, spremiSafe, stanjeZahtjeva, type Greske, type PoljeSafea, type StanjeZahtjeva } from "../../lib/db/organizacija";
import type { OrganizacijaPristupa, Uloga } from "../../lib/pristup";
import { url } from "../../lib/rute";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciZahtjeva {
  organizacija: OrganizacijaPristupa;
  uloga: Uloga;
  stanje: StanjeZahtjeva;
  safe: { adresa: string; lanac: string; greske: Greske<PoljeSafea> };
  poruka: "poslano" | "spremljeno" | null;
  imaNacrt: boolean;
}

export const ucitaj: Ucitaj<PodaciZahtjeva> = async (ctx) => {
  const p = await organizacijaRute(ctx, "owner");
  if (p instanceof Response) return p;
  const ovdje = url(ctx.lang, "org.application", { slug: p.organizacija.slug });
  const f = await obrazac(ctx);
  let safe = { adresa: "", lanac: "", greske: {} as Greske<PoljeSafea> };
  if (f) {
    const radnja = polje(f, "radnja");
    if (radnja === "ponovno") {
      await ponovnoPosalji(ctx.db, p.organizacija.id);
      return preusmjeri303(`${ovdje}?poslano=1`);
    }
    if (radnja === "safe") {
      safe = { adresa: polje(f, "adresa"), lanac: polje(f, "lanac"), greske: {} };
      const r = await spremiSafe(ctx.db, p.organizacija.id, safe);
      if (r.ok) return preusmjeri303(`${ovdje}?spremljeno=1`);
      safe.greske = r.greske;
    }
  }
  const stanje = await stanjeZahtjeva(ctx.db, p.organizacija.id);
  if (!stanje) return nijePronadeno();
  if (!f) safe = { adresa: stanje.organizacija.safeAdresa ?? "", lanac: String(stanje.organizacija.safeLanac ?? 10200), greske: {} };
  const q = ctx.url.searchParams;
  return {
    podaci: {
      organizacija: p.organizacija,
      uloga: p.uloga,
      stanje,
      safe,
      poruka: q.get("poslano") === "1" ? "poslano" : q.get("spremljeno") === "1" ? "spremljeno" : null,
      imaNacrt: stanje.zahtjev?.status === "draft",
    },
  };
};
