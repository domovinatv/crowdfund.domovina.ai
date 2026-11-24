/**
 * Popis ruta S5 i S6 s očekivanim statusom (odluka 503). Izvor je tablica `src/lib/rute.ts` (`faza`) i
 * `seed/primjeri.json` (primjeri parametara i demo sesije iz seeda), pa nova ruta u tablici bez pogleda ili
 * s krivim statusom pada u `scripts/provjera-ruta.ts` i u Playwright smokeu.
 *
 * Očekivani status se računa iz stupca `pristup` (docs/07 „Razine pristupa”):
 *   J, J*, T (i „T (+P za prihvat)”)  → 200 bez sesije (T s tokenom iz primjera)
 *   P, P+e, P+T, K, U:uloga           → 200 s demo sesijom organizatora, 302 bez nje (provjeravaju se oba)
 *   A (/admin/*, bez jezika)          → 200 s demo sesijom moderatora, 302 bez nje (prijavljen ne-moderator: 404)
 * Iznimke (namjerni 302, samo POST) su u `IZNIMKE`, izostavljene rute s razlogom u `IZOSTAVLJENE`.
 * `pogled: false` znači da ruta još nema stranicu (`src/views/stranice/<kljuc>.astro` ili `.ucitaj.ts`, odnosno
 * datoteku u `src/pages/`); skripta takve ispisuje kao zasebnu kategoriju „nema pogleda”.
 */
import { existsSync, readFileSync } from "node:fs";
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
  demoSad: string;
  demoRacuni: { organizator: string; moderator: string; novi: string };
  demoSesija: string;
  demoSesijaModerator: string;
  demoSesijaNovi: string;
  organizacijaOrganizatora: string;
  poveznicaPrijave: string;
  potvrdaRadnje: string;
  pozivnica: string;
  prijavaModeracije: string;
  korisnikSlug: string;
}

export type Sesija = "organizator" | "moderator";

export interface ProvjeraRute {
  put: string;
  status: number;
  opis: string;
  /** Zahtjev ide s kolačićem demo sesije (`sesija=<token iz primjeri.json>`). */
  sesija?: Sesija;
  /** Ključ rute iz `rute.ts` (za rubne slučajeve bez ključa: undefined). */
  kljuc?: string;
  /** Ruta ima stranicu u kodu. */
  pogled: boolean;
}

/** Ime kolačića sesije (src/lib/sesija.ts `KOLACIC_SESIJE`). */
export const KOLACIC_SESIJE = "sesija";

export const tokenSesije = (p: Primjeri, s: Sesija): string => (s === "moderator" ? p.demoSesijaModerator : p.demoSesija);

export const ucitajPrimjere = (): Primjeri =>
  JSON.parse(readFileSync(new URL("../seed/primjeri.json", import.meta.url), "utf8")) as Primjeri;

/** Rute koje se namjerno ne provjeravaju, s razlogom (ulaze u izvještaj skripte). */
export const IZOSTAVLJENE: Record<string, string> = {
  "campaign.support.checkout": "checkout korak 2 je S7 (MPT sandbox)",
  "campaign.support.checkout.tip": "checkout korak 3 je S7",
  "campaign.support.checkout.done": "potvrda uplate je S7",
  reminder: "podsjetnik ponavljanja otvara novi MPT intent i ima vlastiti token (S7, tok 10)",
};

/** Namjerni statusi koji odstupaju od pravila iz `pristup` (bez sesije / sa sesijom), s razlogom. */
export const IZNIMKE: Record<string, { bez: number; s: number; razlog: string }> = {
  "new-campaign": { bez: 302, s: 302, razlog: "302 na prvi nedovršeni korak nacrta (07)" },
  settings: { bez: 302, s: 302, razlog: "302 na postavke/podaci (07); bez sesije 302 na prijavu" },
};

const ROOT = new URL("../", import.meta.url);
const postoji = (put: string) => existsSync(new URL(put, ROOT));

/** Jezična ruta ima pogled ili samostalni učitavač (odluka 500, S6). */
const imaPogled = (kljuc: string) =>
  postoji(`src/views/stranice/${kljuc}.astro`) || postoji(`src/views/stranice/${kljuc}.ucitaj.ts`);

/** Ruta bez jezika ima Astro stranicu: `a/{b}` → `src/pages/a/[b].astro` ili `…/index.astro`. */
const imaStranicu = (put: string) => {
  const p = put.replace(/\{(\w+)\}/g, "[$1]");
  return postoji(`src/pages/${p}.astro`) || postoji(`src/pages/${p}/index.astro`);
};

function parametri(kljuc: string, p: Primjeri): Record<string, string> {
  const id = kljuc === "external.campaign" ? p.vanjska : p.kampanja.aktivna!;
  const slug = kljuc === "user" ? p.korisnik.javni : kljuc.startsWith("org.") ? p.organizacijaOrganizatora : p.organizacija;
  const token = kljuc === "confirm-action" ? p.potvrdaRadnje : kljuc === "invite" ? p.pozivnica : p.pracenjeToken;
  return { id, slug, alias: p.kasica, token, category: p.faqKategorija ?? "donating" };
}

const popuni = (uzorak: string, params: Record<string, string>) =>
  uzorak.replace(/\{(\w+)\}/g, (m, k: string) => params[k] ?? m);

/**
 * Očekivanja iz stupca `pristup`: status bez sesije i (ako treba) status s kojom sesijom.
 * `org` stranica je J (javni profil), a `org.*` su U:uloga.
 */
export function ocekivanja(pristup: string): { bez: number; s?: { sesija: Sesija; status: number } } {
  const p = pristup.trim();
  if (p === "A") return { bez: 302, s: { sesija: "moderator", status: 200 } };
  if (p.startsWith("J") || p.startsWith("T")) return { bez: 200 };
  // P, P+e, P+T, K…, U:…
  return { bez: 302, s: { sesija: "organizator", status: 200 } };
}

function provjere(put: string, opis: string, kljuc: string, pristup: string, pogled: boolean): ProvjeraRute[] {
  const izn = IZNIMKE[kljuc];
  const o = ocekivanja(pristup);
  const out: ProvjeraRute[] = [{ put, status: izn?.bez ?? o.bez, opis, kljuc, pogled }];
  if (o.s) out.push({ put, status: izn?.s ?? o.s.status, opis: `${opis} (sesija ${o.s.sesija})`, kljuc, pogled, sesija: o.s.sesija });
  return out;
}

export function javneRute(p: Primjeri): ProvjeraRute[] {
  const out: ProvjeraRute[] = [{ put: "/", status: 302, opis: "korijen → jezik", pogled: true }];
  for (const r of RUTE) {
    if ((r.faza !== "S5" && r.faza !== "S6") || r.kljuc in IZOSTAVLJENE) continue;
    const params = parametri(r.kljuc, p);
    const pogled = imaPogled(r.kljuc);
    for (const lang of ["hr", "en"] as const) {
      const put = popuni(r[lang], params);
      out.push(...provjere(put ? `/${lang}/${put}` : `/${lang}`, r.kljuc, r.kljuc, r.pristup, pogled));
    }
  }
  for (const r of RUTE_BEZ_JEZIKA) {
    if (r.faza !== "S5" && r.faza !== "S6") continue;
    const token = r.kljuc === "auth.link" ? p.poveznicaPrijave : "";
    const id = r.kljuc === "admin.report" ? p.prijavaModeracije : p.kampanja.aktivna!;
    const put = "/" + popuni(r.put, { id, alias: p.kasica, slug: p.linkZaPracenje, token });
    const pogled = imaStranicu(r.put);
    if (r.kljuc.startsWith("short.")) out.push({ put, status: 302, opis: r.kljuc, kljuc: r.kljuc, pogled });
    else out.push(...provjere(put, r.kljuc, r.kljuc, r.pristup, pogled));
  }
  // Rubni slučajevi vidljivosti (docs/07 „Razine pristupa”, odluka 406).
  const k = p.kampanja;
  for (const [vrsta, status] of [
    ["unlisted", 200], ["paused", 200], ["zavrsena", 200], ["skrivenIznos", 200], ["draft404", 404], ["blokirana404", 404],
  ] as const) {
    if (k[vrsta]) out.push({ put: `/hr/${k[vrsta]}`, status, opis: `campaign (${vrsta})`, pogled: true });
  }
  out.push({ put: `/hr/u/${p.korisnik.privatni404}`, status: 404, opis: "user (privatan profil)", pogled: true });
  out.push({ put: `/hr/u/${p.korisnikSlug}`, status: 200, opis: "user (slug, 0004)", pogled: true });
  out.push({ put: "/hr/zzzzzz", status: 404, opis: "campaign (nepostojeći ID)", pogled: true });
  out.push({ put: `/hr/kampanje?category=${p.kategorija}&sort=newest&page=2`, status: 200, opis: "campaigns (filtar)", pogled: true });
  // Prijava (S6): nepoznata poveznica 404; A za prijavljenog ne-moderatora 404 (moderacija se ne otkriva).
  out.push({ put: "/auth/link/demo-nepostojeca", status: 404, opis: "auth.link (nepoznat token)", pogled: true });
  if (imaStranicu("admin/prijave")) {
    out.push({ put: "/admin/prijave", status: 404, opis: "admin.reports (organizator nije moderator)", sesija: "organizator", pogled: true });
  }
  return out;
}
