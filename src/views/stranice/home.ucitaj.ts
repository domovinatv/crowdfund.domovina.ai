/** Naslovnica (docs/07 „Javni dio”): urednički izbor, brojači, kategorije s brojem aktivnih i najnovije aktivne. */
import { brojaciNaslovnice, katalog, kategorije, urednickiIzbor, type BrojaciNaslovnice, type Kategorija } from "../../lib/db/katalog";
import type { PunaKartica } from "../../lib/db/zajednicko";
import type { Ucitaj } from "../tipovi";

export interface PodaciNaslovnice {
  izbor: PunaKartica[];
  brojaci: BrojaciNaslovnice;
  kategorije: Kategorija[];
  aktivne: PunaKartica[];
}

export const ucitaj: Ucitaj<PodaciNaslovnice> = async ({ db }) => {
  const [izbor, brojaci, kat, najnovije] = await Promise.all([
    urednickiIzbor(db, 3),
    brojaciNaslovnice(db),
    kategorije(db),
    katalog(db, { sort: "newest" }),
  ]);
  return { podaci: { izbor, brojaci, kategorije: kat, aktivne: najnovije.kartice.slice(0, 6) } };
};
