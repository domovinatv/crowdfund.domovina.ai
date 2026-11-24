/**
 * Popis javnih ruta S5 s očekivanim statusom (odluka 503). Izvor je tablica `src/lib/rute.ts`
 * (`faza: "S5"`) i `seed/primjeri.json` (primjeri parametara iz seeda), pa nova ruta u tablici
 * bez pogleda ili s krivim statusom pada u `scripts/provjera-ruta.ts` i u Playwright smokeu.
 */
import { readFileSync } from "node:fs";
import { RUTE, RUTE_BEZ_JEZIKA } from "../src/lib/rute.ts";

export interface Primjeri {
  kampanja: Record<string, string>;
  korisnik: { javni: string; privatni404: string };
  organizacija: string;
  kasica: string;
  linkZaPracenje: string;
  vanjska: string;
  pracenjeToken: string;
  kategorija: string;
  faqKategorija?: string;
}

export interface ProvjeraRute {
  put: string;
  status: number;
  opis: string;
}

export const ucitajPrimjere = (): Primjeri =>
  JSON.parse(readFileSync(new URL("../seed/primjeri.json", import.meta.url), "utf8")) as Primjeri;

/** Rute S5 koje ova sesija namjerno ne služi, s razlogom (ulaze u izvještaj skripte). */
export const IZOSTAVLJENE: Record<string, string> = {
  "campaign.support.checkout": "checkout korak 2 je S7 (MPT sandbox)",
  "campaign.support.checkout.tip": "checkout korak 3 je S7",
  "campaign.support.checkout.done": "potvrda uplate je S7",
};

function parametri(kljuc: string, p: Primjeri): Record<string, string> {
  const id = kljuc === "external.campaign" ? p.vanjska : p.kampanja.aktivna!;
  const slug = kljuc === "user" ? p.korisnik.javni : p.organizacija;
  return { id, slug, alias: p.kasica, token: p.pracenjeToken, category: p.faqKategorija ?? "donating" };
}

const popuni = (uzorak: string, params: Record<string, string>) =>
  uzorak.replace(/\{(\w+)\}/g, (m, k: string) => params[k] ?? m);

function ocekivaniStatus(pristup: string): number {
  if (pristup.startsWith("P")) return 302; // prijava je S6: preusmjerenje na /{lang}/prijava?next=
  return 200; // J, J*, T (token iz seeda)
}

export function javneRute(p: Primjeri): ProvjeraRute[] {
  const out: ProvjeraRute[] = [{ put: "/", status: 302, opis: "korijen → jezik" }];
  for (const r of RUTE) {
    if (r.faza !== "S5" || r.kljuc in IZOSTAVLJENE) continue;
    const params = parametri(r.kljuc, p);
    for (const lang of ["hr", "en"] as const) {
      const put = popuni(r[lang], params);
      out.push({ put: put ? `/${lang}/${put}` : `/${lang}`, status: ocekivaniStatus(r.pristup), opis: r.kljuc });
    }
  }
  for (const r of RUTE_BEZ_JEZIKA) {
    if (r.faza !== "S5") continue;
    const put = "/" + popuni(r.put, { id: p.kampanja.aktivna!, alias: p.kasica, slug: p.linkZaPracenje });
    out.push({ put, status: r.kljuc.startsWith("short.") ? 302 : 200, opis: r.kljuc });
  }
  // Rubni slučajevi vidljivosti (docs/07 „Razine pristupa”, odluka 406).
  const k = p.kampanja;
  for (const [vrsta, status] of [
    ["unlisted", 200], ["paused", 200], ["zavrsena", 200], ["skrivenIznos", 200], ["draft404", 404], ["blokirana404", 404],
  ] as const) {
    if (k[vrsta]) out.push({ put: `/hr/${k[vrsta]}`, status, opis: `campaign (${vrsta})` });
  }
  out.push({ put: `/hr/u/${p.korisnik.privatni404}`, status: 404, opis: "user (privatan profil)" });
  out.push({ put: "/hr/zzzzzz", status: 404, opis: "campaign (nepostojeći ID)" });
  out.push({ put: `/hr/kampanje?category=${p.kategorija}&sort=newest&page=2`, status: 200, opis: "campaigns (filtar)" });
  return out;
}
