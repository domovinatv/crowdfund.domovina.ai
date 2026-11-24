/**
 * Verifikacija namjene `/hr/{id}/upravljanje/verifikacija` (K (U:editor), ekran 15, odluka 18): stanje zadnje
 * `verifications(campaign_purpose)`, prag 5.000 € (zastava, ne blokada), dokumenti (`campaign_documents`).
 * Upload je mock bez R2: zapisuju se samo metapodaci datoteke. „Pošalji na pregled” → `submitted`.
 * Odobrena namjena zaključava naslov, opis i cilj (docs/05).
 */
import { nakon, polje, porukaUspjeha, ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import {
  PRAG_NAMJENE_CENTI, dodajDokument, dokumentiKampanje, posaljiNaPregled, smijeDodatiDokument,
  type DokumentKampanje, type GreskeDokumenta,
} from "../../lib/db/upravljanje";
import type { Ucitaj } from "../tipovi";

export const PORUKE_VERIFIKACIJE = ["dodan", "poslano"] as const;

export interface PodaciVerifikacije {
  u: Upravljanje;
  dokumenti: DokumentKampanje[];
  pragCenti: number;
  iznadPraga: boolean;
  smijeDodati: boolean;
  vrijednosti: { kind: string; label: string };
  greske: GreskeDokumenta;
  greskaSlanja: "nema_dokumenata" | "stanje" | null;
  poruka: (typeof PORUKE_VERIFIKACIJE)[number] | null;
}

export const ucitaj: Ucitaj<PodaciVerifikacije> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage.verification");
  if (u instanceof Response) return u;
  const sad = Date.now();
  let vrijednosti = { kind: "other", label: "" };
  let greske: GreskeDokumenta = {};
  let greskaSlanja: PodaciVerifikacije["greskaSlanja"] = null;
  if (ctx.request.method === "POST") {
    const f = await ctx.request.formData();
    if (polje(f, "akcija") === "posalji") {
      const r = await posaljiNaPregled(ctx.db, u.k.id, sad);
      if (r === "ok") return nakon(u.put, "poslano");
      greskaSlanja = r;
    } else {
      vrijednosti = { kind: polje(f, "kind"), label: polje(f, "label") };
      const d = f.get("file");
      const datoteka = d && typeof d !== "string" ? { name: d.name, size: d.size, type: d.type } : null;
      const r = await dodajDokument(ctx.db, u.k.id, u.korisnik.id, { ...vrijednosti, datoteka }, sad);
      if (r.ok) return nakon(u.put, "dodan");
      greske = r.greske;
    }
  }
  // Pragove računa src/lib/db/pragovi.ts (agent A); ova stranica prikazuje stanje iz `verifications` (zastava).
  return {
    podaci: {
      u,
      dokumenti: await dokumentiKampanje(ctx.db, u.k.id),
      pragCenti: PRAG_NAMJENE_CENTI,
      iznadPraga: u.k.prikupljenoCents >= PRAG_NAMJENE_CENTI || (u.k.goalCents ?? 0) >= PRAG_NAMJENE_CENTI,
      smijeDodati: smijeDodatiDokument(u.k.verifikacija),
      vrijednosti, greske, greskaSlanja,
      poruka: porukaUspjeha(ctx.url, PORUKE_VERIFIKACIJE),
    },
  };
};
