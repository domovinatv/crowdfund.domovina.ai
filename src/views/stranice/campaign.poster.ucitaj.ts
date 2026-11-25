/**
 * Plakat za ispis `/hr/{id}/plakat`: A4, naslov, kratki opis, QR kratkog linka, adresa.
 * S10 (B08): `?varijanta=cestitka` je „Čestitka zahvale” s javnim popisom podržavatelja (`uplateKampanje`, isti
 * filtri kao na stranici kampanje: skriven popis, anonimni bez imena, iznos samo kad ga ni podržavatelj ni kampanja
 * ne skrivaju). Nepoznata varijanta pada na plakat.
 */
import type { StranicaKampanje } from "../../lib/db/kampanja";
import { uplateKampanje, type UplateKampanje } from "../../lib/db/kampanja";
import { kratkiLink, ucitajKampanju } from "../../components/kampanja/ucitavanje";
import type { Ucitaj } from "../tipovi";

export const VARIJANTE_PLAKATA = ["plakat", "cestitka"] as const;
export type VarijantaPlakata = (typeof VARIJANTE_PLAKATA)[number];
export const isVarijantaPlakata = (x: unknown): x is VarijantaPlakata => x === "plakat" || x === "cestitka";

/** Najviše imena na čestitki (A4 u tri stupca); ostatak je „i još N”. */
export const IMENA_NA_CESTITKI = 90;

export interface PopisCestitke {
  skriveno: boolean;
  /** Podržavatelji s imenom, najnoviji prvi; iznos null kad je skriven. */
  imena: { ime: string; iznosCenti: number | null }[];
  anonimnih: number;
  /** Plaćenih doprinosa koji nisu na čestitki (iznad granice ili izvan dohvaćenih 100); null kad kampanja skriva broj. */
  jos: number | null;
}

export interface PodaciPlakata {
  k: StranicaKampanje;
  cilj: string;
  varijanta: VarijantaPlakata;
  cestitka: PopisCestitke | null;
}

/** Čestitka iz javnog popisa uplata (čista funkcija, testirana). */
export function popisCestitke(u: UplateKampanje, najvise = IMENA_NA_CESTITKI): PopisCestitke {
  if (u.skriveno) return { skriveno: true, imena: [], anonimnih: 0, jos: null };
  const s = u.uplate.filter((x) => !x.anonymous && x.name);
  const imena = s.slice(0, najvise).map((x) => ({ ime: x.name!, iznosCenti: x.amountCents }));
  const anonimnih = u.uplate.filter((x) => x.anonymous || !x.name).length;
  const jos = u.ukupno === null ? null : Math.max(0, u.ukupno - imena.length - anonimnih);
  return { skriveno: false, imena, anonimnih, jos };
}

export const ucitaj: Ucitaj<PodaciPlakata> = async (ctx) => {
  const k = await ucitajKampanju(ctx, "campaign.poster");
  if (k instanceof Response) return k;
  const v = ctx.url.searchParams.get("varijanta");
  const varijanta: VarijantaPlakata = isVarijantaPlakata(v) ? v : "plakat";
  const cestitka = varijanta === "cestitka" ? popisCestitke(await uplateKampanje(ctx.db, k.id, { sort: "latest", limit: 100 })) : null;
  return { podaci: { k, cilj: kratkiLink(ctx, k.publicId), varijanta, cestitka } };
};
