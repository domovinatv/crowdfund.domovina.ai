/**
 * Zajedničko učitavanje stranica upravljanja kampanjom (`campaign.edit`, `campaign.manage*`): pristup iz stupca
 * `pristup` u `src/lib/rute.ts` kroz `zahtijevajKampanju`, pa kampanja za upravljanje (i nejavna).
 *
 * - „K” i „K (U:editor)”: `zahtijevajKampanju` (uloga ≥ najmanja, autor dok čeka odobrenje, moderator).
 * - „U:uloga”: samo član organizacije s tom ulogom; moderator i autor bez uloge ne prolaze (docs/07).
 * Neprijavljeni → 302 na prijavu, bez prava → 404. P+e se traži tek u POST grani pojedine stranice.
 */
import { imaUlogu, zahtijevajKampanju, type Korisnik, type PristupKampanji, type Uloga } from "../../lib/pristup";
import { kampanjaZaUpravljanje, type KampanjaUpravljanja } from "../../lib/db/upravljanje";
import { RUTE, url } from "../../lib/rute";
import { nijePronadeno, type KontekstStranice } from "../../views/tipovi";

/** Stranice upravljanja redom kao u izborniku (`ManageNav`). */
export const STRANICE_UPRAVLJANJA = [
  "campaign.manage",
  "campaign.edit",
  "campaign.manage.finances",
  "campaign.manage.refunds",
  "campaign.manage.updates",
  "campaign.manage.comments",
  "campaign.manage.moneyboxes",
  "campaign.manage.links",
  "campaign.manage.notifications",
  "campaign.manage.verification",
  "campaign.manage.money",
  "campaign.manage.close",
] as const;
export type StranicaUpravljanja = (typeof STRANICE_UPRAVLJANJA)[number] | "campaign.manage.finances.csv";

export interface PraviloPristupa {
  najmanje: Uloga;
  /** „U:uloga”: traži stvarnu ulogu u organizaciji (bez moderatora i autora bez uloge). */
  samoUloga: boolean;
}

/** Pravilo iz doslovnog stupca `pristup` rute (npr. „K (U:editor)”, „U:admin, P+e”). */
export function praviloIzPristupa(pristup: string): PraviloPristupa {
  const uloga = pristup.match(/U:(viewer|editor|admin|owner)/)?.[1] as Uloga | undefined;
  return { najmanje: uloga ?? "viewer", samoUloga: pristup.trim().startsWith("U:") };
}

const PRISTUP = new Map<string, string>(RUTE.map((r) => [r.kljuc, r.pristup]));

export function pravilo(kljuc: StranicaUpravljanja): PraviloPristupa {
  return praviloIzPristupa(PRISTUP.get(kljuc) ?? "U:owner");
}

/** Smije li korisnik s ovim pristupom otvoriti stranicu (izbornik skriva ostale). */
export function smije(p: PristupKampanji, kljuc: StranicaUpravljanja): boolean {
  const pr = pravilo(kljuc);
  if (imaUlogu(p.uloga, pr.najmanje)) return true;
  return !pr.samoUloga && (p.moderator || p.autorCeka);
}

export interface Upravljanje {
  korisnik: Korisnik;
  pristup: PristupKampanji;
  k: KampanjaUpravljanja;
  /** Stranice iz izbornika koje ovaj korisnik smije otvoriti. */
  dopustene: StranicaUpravljanja[];
  /** `/hr/{id}/…` ove stranice (POST ide na nju). */
  put: string;
}

export async function ucitajUpravljanje(ctx: KontekstStranice, kljuc: StranicaUpravljanja): Promise<Response | Upravljanje> {
  const pr = pravilo(kljuc);
  const p = await zahtijevajKampanju(ctx, ctx.params.id ?? "", { najmanje: pr.najmanje });
  if (p instanceof Response) return p;
  if (!smije(p.kampanja, kljuc)) return nijePronadeno();
  const k = await kampanjaZaUpravljanje(ctx.db, p.kampanja.campaignId);
  if (!k) return nijePronadeno();
  return {
    korisnik: p.korisnik,
    pristup: p.kampanja,
    k,
    dopustene: STRANICE_UPRAVLJANJA.filter((s) => smije(p.kampanja, s)),
    put: url(ctx.lang, kljuc, { id: k.publicId }),
  };
}

/** 303 na `put` s porukom u upitu (`?ok=<kljuc>`), PRG nakon uspješnog POST-a. */
export function nakon(put: string, ok: string, sidro = ""): Response {
  return new Response(null, { status: 303, headers: { Location: `${put}?ok=${encodeURIComponent(ok)}${sidro ? `#${sidro}` : ""}` } });
}

/** Tekstualno polje obrasca ili "" (FormData). */
export const polje = (f: FormData, ime: string): string => {
  const x = f.get(ime);
  return typeof x === "string" ? x : "";
};

/** Kućica obrasca: poslana = uključena. */
export const kucica = (f: FormData, ime: string): boolean => f.get(ime) !== null && f.get(ime) !== "0";

/** Poruka uspjeha iz `?ok=` (samo poznati ključevi, inače null). */
export function porukaUspjeha<T extends string>(adresa: URL, dopusteni: readonly T[]): T | null {
  const x = adresa.searchParams.get("ok");
  return x && (dopusteni as readonly string[]).includes(x) ? (x as T) : null;
}
