/**
 * Odobravanje `/hr/o/{slug}/odobravanje` (U:admin, tok 3, ekran 20 „Fixed Beneficiary”): kampanje drugih koje
 * čekaju odluku i zadnje odluke. POST `radnja=odobri|odbij`, `kampanja` (javni ID), `razlog` → 303 s porukom;
 * greška → 200 s porukom uz kampanju. Logika: src/lib/db/odobravanje.ts.
 */
import { obrazac, organizacijaRute, polje, preusmjeri303 } from "../../components/organizacija/ucitavanje";
import { kampanjeZaOdobrenje, odbijKampanju, odluceneKampanje, odobriKampanju, type GreskaOdobravanja, type KampanjaZaOdobrenje, type OdlucenaKampanja } from "../../lib/db/odobravanje";
import type { OrganizacijaPristupa, Uloga } from "../../lib/pristup";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export interface PodaciOdobravanja {
  organizacija: OrganizacijaPristupa;
  uloga: Uloga;
  naCekanju: KampanjaZaOdobrenje[];
  odluke: OdlucenaKampanja[];
  greska: { kampanja: string; greska: GreskaOdobravanja; razlog: string } | null;
  poruka: { odluka: "odobrena" | "odbijena"; kampanja: string } | null;
}

export const ucitaj: Ucitaj<PodaciOdobravanja> = async (ctx) => {
  const p = await organizacijaRute(ctx, "admin");
  if (p instanceof Response) return p;
  const orgId = p.organizacija.id;
  const ovdje = url(ctx.lang, "org.approvals", { slug: p.organizacija.slug });
  const f = await obrazac(ctx);
  let greska: PodaciOdobravanja["greska"] = null;
  if (f) {
    const kampanja = polje(f, "kampanja").toLowerCase();
    const razlog = polje(f, "razlog");
    const r =
      polje(f, "radnja") === "odobri"
        ? await odobriKampanju(ctx.db, { orgId, campaignId: kampanja, userId: p.korisnik.id })
        : await odbijKampanju(ctx.db, { orgId, campaignId: kampanja, userId: p.korisnik.id, razlog });
    if (r.ok) return preusmjeri303(`${ovdje}?${polje(f, "radnja") === "odobri" ? "odobrena" : "odbijena"}=${r.publicId}`);
    greska = { kampanja, greska: r.greska, razlog };
  }
  const q = ctx.url.searchParams;
  const odobrena = q.get("odobrena");
  const odbijena = q.get("odbijena");
  return {
    podaci: {
      organizacija: p.organizacija,
      uloga: p.uloga,
      naCekanju: await kampanjeZaOdobrenje(ctx.db, orgId),
      odluke: await odluceneKampanje(ctx.db, orgId),
      greska,
      poruka: !f && odobrena ? { odluka: "odobrena", kampanja: odobrena } : !f && odbijena ? { odluka: "odbijena", kampanja: odbijena } : null,
    },
  };
};
