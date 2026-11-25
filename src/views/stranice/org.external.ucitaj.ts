/**
 * Vanjske 4fund kampanje `/hr/o/{slug}/vanjske` (U:editor, tok 9, odluke 209, 800–802): dodaj (URL + naslov +
 * kratki opis + kategorija → `pending` s kodom za opis na 4fundu), uredi (naslov, opis, kategorija), „Provjeri”
 * (mock: ništa se ne dohvaća s 4funda) i ukloni. POST → 303; greška → 200 s obrascem i greškama uz polja.
 */
import { obrazac, organizacijaRute, polje, preusmjeri303 } from "../../components/organizacija/ucitavanje";
import { kategorije, type Kategorija } from "../../lib/db/katalog";
import {
  dodajVanjsku,
  potvrdiVanjsku,
  ukloniVanjsku,
  urediVanjsku,
  vanjskeOrganizacije,
  type Greske,
  type PoljeVanjske,
  type VanjskaOrganizacije,
} from "../../lib/db/organizacija";
import type { OrganizacijaPristupa, Uloga } from "../../lib/pristup";
import { url } from "../../lib/rute";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciVanjskih {
  organizacija: OrganizacijaPristupa;
  uloga: Uloga;
  vanjske: VanjskaOrganizacije[];
  kategorije: Kategorija[];
  vrijednosti: { url: string; naslov: string; opis: string; kategorija: string };
  greske: Greske<PoljeVanjske>;
  /** Uređivanje koje nije prošlo provjeru: ID kampanje, upisane vrijednosti i greške. */
  uredivanje: { id: string; naslov: string; opis: string; kategorija: string; greske: Greske<PoljeVanjske> } | null;
  poruka: "dodana" | "spremljeno" | null;
}

export const ucitaj: Ucitaj<PodaciVanjskih> = async (ctx) => {
  const p = await organizacijaRute(ctx, "editor");
  if (p instanceof Response) return p;
  const orgId = p.organizacija.id;
  const ovdje = url(ctx.lang, "org.external", { slug: p.organizacija.slug });
  const kat = await kategorije(ctx.db);
  const f = await obrazac(ctx);
  let vrijednosti = { url: "", naslov: "", opis: "", kategorija: "" };
  let greske: Greske<PoljeVanjske> = {};
  let uredivanje: PodaciVanjskih["uredivanje"] = null;
  if (f) {
    const radnja = polje(f, "radnja");
    if (radnja === "dodaj") {
      vrijednosti = { url: polje(f, "url"), naslov: polje(f, "naslov"), opis: polje(f, "opis"), kategorija: polje(f, "kategorija") };
      const r = await dodajVanjsku(ctx.db, orgId, vrijednosti, kat.map((k) => k.key));
      if (r.ok) return preusmjeri303(`${ovdje}?dodana=1`);
      greske = r.greske;
    } else if (radnja === "uredi") {
      const u = { id: polje(f, "id"), naslov: polje(f, "naslov"), opis: polje(f, "opis"), kategorija: polje(f, "kategorija") };
      const r = await urediVanjsku(ctx.db, orgId, u.id, u, kat.map((k) => k.key));
      if (r.ok) return preusmjeri303(`${ovdje}?spremljeno=1`);
      uredivanje = { ...u, greske: r.greske };
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
      uredivanje,
      poruka: f ? null : q.get("dodana") === "1" ? "dodana" : q.get("spremljeno") === "1" ? "spremljeno" : null,
    },
  };
};
