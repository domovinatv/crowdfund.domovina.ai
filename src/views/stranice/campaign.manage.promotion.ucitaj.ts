/**
 * Promocija `/hr/{id}/upravljanje/promocija` (K, faza 2, S8-B): kratka adresa (alias) i isticanje u katalogu kao
 * premium usluga koju fakturira ITalk (javni pregled §7). Obrazac je onemogućen, ništa se ne zapisuje ni naplaćuje.
 * Prijedlog aliasa je slug kampanje skraćen na 40 znakova (`/{alias}` dijeli prostor s ID-om, docs/07).
 */
import { ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import type { Ucitaj } from "../tipovi";

export interface PodaciPromocije {
  u: Upravljanje;
  prijedlogAliasa: string;
}

/** Prijedlog aliasa iz naslova: mala slova bez dijakritika, crtice, 3–40 znakova. */
export function prijedlogAliasa(naslov: string): string {
  const s = naslov
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/, "");
  return s.length >= 3 ? s : `kampanja-${s}`.replace(/-$/, "");
}

export const ucitaj: Ucitaj<PodaciPromocije> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage.promotion");
  if (u instanceof Response) return u;
  return { podaci: { u, prijedlogAliasa: prijedlogAliasa(u.k.title) } };
};
