/** Kampanje organizacije `/hr/o/{slug}/kampanje` (U:viewer): vlastite i tuđe za nju, sa stanjima i preklopima. */
import { organizacijaRute } from "../../components/organizacija/ucitavanje";
import { kampanjeOrganizacije, type KampanjaOrganizacije } from "../../lib/db/organizacija";
import type { OrganizacijaPristupa, Uloga } from "../../lib/pristup";
import type { Ucitaj } from "../tipovi";

export interface PodaciKampanjaOrganizacije {
  organizacija: OrganizacijaPristupa;
  uloga: Uloga;
  kampanje: KampanjaOrganizacije[];
}

export const ucitaj: Ucitaj<PodaciKampanjaOrganizacije> = async (ctx) => {
  const p = await organizacijaRute(ctx, "viewer");
  if (p instanceof Response) return p;
  return { podaci: { organizacija: p.organizacija, uloga: p.uloga, kampanje: await kampanjeOrganizacije(ctx.db, p.organizacija.id) } };
};
