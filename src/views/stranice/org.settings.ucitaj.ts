/**
 * Postavke organizacije `/hr/o/{slug}/postavke` (U:admin): naziv, opis, web, mreže, kategorija i „prima kampanje
 * drugih” (`is_fixed_beneficiary`, samo `active` organizacija). POST → 303 `?spremljeno=1`; greška → 200.
 */
import { obrazac, organizacijaRute, polje, preusmjeri303, retci } from "../../components/organizacija/ucitavanje";
import { kategorije, type Kategorija } from "../../lib/db/katalog";
import { postavkeOrganizacije, spremiPostavke, type Greske, type PoljePostavki, type PostavkeOrganizacije } from "../../lib/db/organizacija";
import type { OrganizacijaPristupa, Uloga } from "../../lib/pristup";
import { url } from "../../lib/rute";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export interface PodaciPostavkiOrganizacije {
  organizacija: OrganizacijaPristupa;
  uloga: Uloga;
  vrijednosti: PostavkeOrganizacije;
  greske: Greske<PoljePostavki>;
  kategorije: Kategorija[];
  spremljeno: boolean;
}

export const ucitaj: Ucitaj<PodaciPostavkiOrganizacije> = async (ctx) => {
  const p = await organizacijaRute(ctx, "admin");
  if (p instanceof Response) return p;
  const prije = await postavkeOrganizacije(ctx.db, p.organizacija.id);
  if (!prije) return nijePronadeno();
  const kat = await kategorije(ctx.db);
  const f = await obrazac(ctx);
  const osnova = { organizacija: p.organizacija, uloga: p.uloga, kategorije: kat };
  if (!f) return { podaci: { ...osnova, vrijednosti: prije, greske: {}, spremljeno: ctx.url.searchParams.get("spremljeno") === "1" } };
  const u = {
    naziv: polje(f, "naziv"),
    opis: polje(f, "opis"),
    web: polje(f, "web"),
    mreze: retci(polje(f, "mreze")),
    kategorija: polje(f, "kategorija"),
    primaKampanjeDrugih: polje(f, "primaKampanjeDrugih") === "1",
  };
  const r = await spremiPostavke(ctx.db, p.organizacija.id, u, kat.map((k) => k.key));
  if (r.ok) return preusmjeri303(`${url(ctx.lang, "org.settings", { slug: p.organizacija.slug })}?spremljeno=1`);
  return { podaci: { ...osnova, vrijednosti: { ...u, kategorija: u.kategorija || null, status: prije.status }, greske: r.greske, spremljeno: false } };
};
