/**
 * Vanjske 4fund kampanje `/hr/o/{slug}/vanjske` (U:editor, tok 9, odluka 209): dodaj (URL + naslov + kategorija →
 * `pending` s kodom za opis), „Provjeri” (mock: ništa se ne dohvaća s 4funda) i ukloni. POST → 303; greška → 200.
 */
import { obrazac, organizacijaRute, polje, preusmjeri303 } from "../../components/organizacija/ucitavanje";
import { kategorije, type Kategorija } from "../../lib/db/katalog";
import { dodajVanjsku, potvrdiVanjsku, ukloniVanjsku, vanjskeOrganizacije, type Greske, type PoljeVanjske, type VanjskaOrganizacije } from "../../lib/db/organizacija";
import type { OrganizacijaPristupa, Uloga } from "../../lib/pristup";
import { url } from "../../lib/rute";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciVanjskih {
  organizacija: OrganizacijaPristupa;
  uloga: Uloga;
  vanjske: VanjskaOrganizacije[];
  kategorije: Kategorija[];
  vrijednosti: { url: string; naslov: string; kategorija: string };
  greske: Greske<PoljeVanjske>;
  poruka: "dodana" | "spremljeno" | null;
}

export const ucitaj: Ucitaj<PodaciVanjskih> = async (ctx) => {
  const p = await organizacijaRute(ctx, "editor");
  if (p instanceof Response) return p;
  const orgId = p.organizacija.id;
  const ovdje = url(ctx.lang, "org.external", { slug: p.organizacija.slug });
  const kat = await kategorije(ctx.db);
  const f = await obrazac(ctx);
  let vrijednosti = { url: "", naslov: "", kategorija: "" };
  let greske: Greske<PoljeVanjske> = {};
  if (f) {
    const radnja = polje(f, "radnja");
    if (radnja === "dodaj") {
      vrijednosti = { url: polje(f, "url"), naslov: polje(f, "naslov"), kategorija: polje(f, "kategorija") };
      const r = await dodajVanjsku(ctx.db, orgId, vrijednosti, kat.map((k) => k.key));
      if (r.ok) return preusmjeri303(`${ovdje}?dodana=1`);
      greske = r.greske;
    } else if (radnja === "provjeri" || radnja === "ukloni") {
      const id = polje(f, "id");
      await (radnja === "provjeri" ? potvrdiVanjsku(ctx.db, orgId, id) : ukloniVanjsku(ctx.db, orgId, id));
      return preusmjeri303(`${ovdje}?spremljeno=1`);
    } else return nijePronadeno();
  }
  const q = ctx.url.searchParams;
  return {
    podaci: {
      organizacija: p.organizacija,
      uloga: p.uloga,
      vanjske: await vanjskeOrganizacije(ctx.db, orgId),
      kategorije: kat,
      vrijednosti,
      greske,
      poruka: f ? null : q.get("dodana") === "1" ? "dodana" : q.get("spremljeno") === "1" ? "spremljeno" : null,
    },
  };
};
