/**
 * Komentari `/hr/{id}/upravljanje/komentari` (K (U:editor), ekran 22): svi komentari (i skriveni),
 * sakrij/prikaži, odgovor organizatora (jedna razina). Skriveni se ne prikazuju na javnoj stranici.
 */
import { nakon, polje, porukaUspjeha, ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import { komentariZaUpravljanje, odgovoriOrganizatora, postaviSkrivenost, type GreskaKomentara, type KomentarUpravljanja } from "../../lib/db/komentari";
import type { Ucitaj } from "../tipovi";

export const PORUKE_KOMENTARA = ["skriven", "prikazan", "odgovoreno"] as const;

export interface PodaciKomentara {
  u: Upravljanje;
  komentari: KomentarUpravljanja[];
  /** Greška odgovora uz komentar `za`. */
  greska: { za: string; greska: GreskaKomentara; body: string } | null;
  poruka: (typeof PORUKE_KOMENTARA)[number] | null;
}

export const ucitaj: Ucitaj<PodaciKomentara> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage.comments");
  if (u instanceof Response) return u;
  const sad = Date.now();
  let greska: PodaciKomentara["greska"] = null;
  if (ctx.request.method === "POST") {
    const f = await ctx.request.formData();
    const id = polje(f, "id");
    const akcija = polje(f, "akcija");
    if (akcija === "sakrij" || akcija === "prikazi") {
      if (await postaviSkrivenost(ctx.db, u.k.id, id, akcija === "sakrij", u.korisnik.id, sad)) return nakon(u.put, akcija === "sakrij" ? "skriven" : "prikazan", `k-${id}`);
      greska = { za: id, greska: "nema_roditelja", body: "" };
    } else {
      const body = polje(f, "body");
      const r = await odgovoriOrganizatora(ctx.db, u.k.id, id, u.korisnik.id, body, sad);
      if (r.ok) return nakon(u.put, "odgovoreno", `k-${id}`);
      greska = { za: id, greska: r.greska, body };
    }
  }
  return { podaci: { u, komentari: await komentariZaUpravljanje(ctx.db, u.k.id), greska, poruka: porukaUspjeha(ctx.url, PORUKE_KOMENTARA) } };
};
