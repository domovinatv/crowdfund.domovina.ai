/**
 * Zajedničko učitavačima „Moje” (S6): stavke kartica, izbornik po kampanji (iste provjere kao upravljanje) i
 * čitanje obrasca.
 */
import { imaUlogu } from "../../lib/pristup";
import { javnaMoja, pristupRetka, type MojaKampanja } from "../../lib/db/moje";
import { url, type KljucRute } from "../../lib/rute";
import type { Lang } from "../../i18n";
import { smije, type StranicaUpravljanja } from "../upravljanje/ucitavanje";

export { preusmjeri303 } from "../prijava/ucitavanje";

export const STAVKE_MOJE = ["my.campaigns", "my.donations", "my.moneyboxes", "my.money", "my.external"] as const satisfies readonly KljucRute[];
export type StavkaMoje = (typeof STAVKE_MOJE)[number];

export type Radnja = "otvori" | "uredi" | "upravljaj" | "financije" | "csv" | "obavijesti" | "linkovi" | "qr" | "widget" | "plakat" | "iskljuci";

export interface StavkaIzbornika {
  radnja: Radnja;
  href: string;
}

/**
 * Izbornik kampanje na „Moje kampanje” (obilazak 08 „More”): javne poveznice samo za javno vidljivu kampanju,
 * poveznice upravljanja samo kad ih korisnik smije otvoriti (`smije`, isto pravilo kao `ManageNav`).
 * „Isključi” vodi na ploču upravljanja (POST je tamo, uloga ≥ editor).
 */
export function izbornik(lang: Lang, k: MojaKampanja): StavkaIzbornika[] {
  const p = pristupRetka(k);
  const id = { id: k.publicId };
  const out: StavkaIzbornika[] = [];
  const javna = javnaMoja(k);
  const dodaj = (radnja: Radnja, kljuc: KljucRute) => out.push({ radnja, href: url(lang, kljuc, id) });
  const ako = (radnja: Radnja, kljuc: StranicaUpravljanja) => {
    if (smije(p, kljuc)) dodaj(radnja, kljuc);
  };
  if (javna) dodaj("otvori", "campaign");
  ako("uredi", "campaign.edit");
  ako("upravljaj", "campaign.manage");
  ako("financije", "campaign.manage.finances");
  ako("csv", "campaign.manage.finances.csv");
  ako("obavijesti", "campaign.manage.notifications");
  ako("linkovi", "campaign.manage.links");
  if (javna && k.stanje !== "closed") {
    dodaj("qr", "campaign.qr");
    dodaj("widget", "campaign.widget");
    dodaj("plakat", "campaign.poster");
  }
  if ((k.stanje === "active" || k.stanje === "paused") && imaUlogu(k.uloga, "editor")) dodaj("iskljuci", "campaign.manage");
  return out;
}

export async function poljaObrasca(request: Request): Promise<Record<string, string>> {
  const f = await request.formData();
  const out: Record<string, string> = {};
  for (const [k, v] of f.entries()) if (typeof v === "string") out[k] = v.trim();
  return out;
}
