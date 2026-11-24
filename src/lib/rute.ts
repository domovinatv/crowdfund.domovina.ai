/**
 * Tablica ruta iz docs/07-rute.md kao podatak (S4).
 *
 * `hr` i `en` su put BEZ jezičnog prefiksa i bez vodeće kose crte ("" = naslovnica);
 * dinamički segmenti su `{id}` (javni ID kampanje), `{checkout}`, `{slug}`, `{alias}`, `{token}`.
 * `pristup` je doslovno stupac „Pristup” iz 07 (razine J, J*, P, P+e, U:uloga, K, V, T, A).
 * Implementirane su samo `/`, `/hr`, `/en` (S4); ostalo dolazi u S5/S6.
 *
 * Retci su prepisani iz 07 (sve rute s izričitim hr i en oblikom). S5 je dodao en oblik za
 * `pracenje/{token}/odjava` i `cesta-pitanja/{category}` (odluka 502); podkoraci S6
 * (`organizacija/nova/…`, `postavke/verifikacija/…`) dolaze sa S6.
 */
import type { Lang } from "../i18n";

export type Faza = "S4" | "S5" | "S6";

export interface Ruta {
  readonly kljuc: string;
  readonly hr: string;
  readonly en: string;
  readonly pristup: string;
  readonly faza: Faza;
}

/** Rute s jezičnim prefiksom (`/hr/…`, `/en/…`). */
export const RUTE = [
{ kljuc: "home", hr: "", en: "", pristup: "J", faza: "S5" },
  { kljuc: "campaigns", hr: "kampanje", en: "campaigns", pristup: "J", faza: "S5" },
  { kljuc: "organisations", hr: "organizacije", en: "organisations", pristup: "J", faza: "S5" },
  { kljuc: "for-organisations", hr: "za-organizaciju", en: "for-organisations", pristup: "J", faza: "S5" },
  { kljuc: "monthly", hr: "mjesecne", en: "monthly", pristup: "J", faza: "S5" },
  { kljuc: "offers", hr: "ponude", en: "offers", pristup: "J", faza: "S5" },
  { kljuc: "offers.new", hr: "ponude/nova", en: "offers/new", pristup: "P", faza: "S5" },
  { kljuc: "campaign", hr: "{id}", en: "{id}", pristup: "J", faza: "S5" },
  { kljuc: "campaign.qr", hr: "{id}/qr", en: "{id}/qr", pristup: "J", faza: "S5" },
  { kljuc: "campaign.poster", hr: "{id}/plakat", en: "{id}/poster", pristup: "J", faza: "S5" },
  { kljuc: "campaign.widget", hr: "{id}/widget", en: "{id}/widget", pristup: "J", faza: "S5" },
  { kljuc: "campaign.support", hr: "{id}/podrzi", en: "{id}/support", pristup: "J*", faza: "S5" },
  { kljuc: "campaign.support.checkout", hr: "{id}/podrzi/{checkout}", en: "{id}/support/{checkout}", pristup: "T (ID checkouta)", faza: "S5" },
  { kljuc: "campaign.support.checkout.tip", hr: "{id}/podrzi/{checkout}/napojnica", en: "{id}/support/{checkout}/tip", pristup: "T", faza: "S5" },
  { kljuc: "campaign.support.checkout.done", hr: "{id}/podrzi/{checkout}/potvrda", en: "{id}/support/{checkout}/done", pristup: "T", faza: "S5" },
  { kljuc: "campaign.moneybox.new", hr: "{id}/kasica/nova", en: "{id}/moneybox/new", pristup: "P", faza: "S5" },
  { kljuc: "moneybox", hr: "s/{alias}", en: "s/{alias}", pristup: "J", faza: "S5" },
  { kljuc: "user", hr: "u/{slug}", en: "u/{slug}", pristup: "J", faza: "S5" },
  { kljuc: "org", hr: "o/{slug}", en: "o/{slug}", pristup: "J", faza: "S5" },
  { kljuc: "external.campaign", hr: "vanjska/{id}", en: "external/{id}", pristup: "J", faza: "S5" },
  { kljuc: "report", hr: "prijavi-sadrzaj", en: "report", pristup: "J*", faza: "S5" },
  { kljuc: "follow", hr: "pracenje/{token}", en: "follow/{token}", pristup: "T", faza: "S5" },
  { kljuc: "follow.unsubscribe", hr: "pracenje/{token}/odjava", en: "follow/{token}/unsubscribe", pristup: "T", faza: "S5" },
  { kljuc: "how-it-works", hr: "kako-radi", en: "how-it-works", pristup: "J", faza: "S5" },
  { kljuc: "how-it-works.for-others", hr: "kako-radi/za-druge", en: "how-it-works/for-others", pristup: "J", faza: "S5" },
  { kljuc: "how-it-works.donate", hr: "kako-radi/doniranje", en: "how-it-works/donate", pristup: "J", faza: "S5" },
  { kljuc: "how-it-works.moneyboxes", hr: "kako-radi/kasice", en: "how-it-works/moneyboxes", pristup: "J", faza: "S5" },
  { kljuc: "how-it-works.sharing", hr: "kako-radi/dijeljenje", en: "how-it-works/sharing", pristup: "J", faza: "S5" },
  { kljuc: "how-it-works.offers", hr: "kako-radi/ponude", en: "how-it-works/offers", pristup: "J", faza: "S5" },
  { kljuc: "costs", hr: "troskovi", en: "costs", pristup: "J", faza: "S5" },
  { kljuc: "faq", hr: "cesta-pitanja", en: "faq", pristup: "J", faza: "S5" },
  { kljuc: "faq.category", hr: "cesta-pitanja/{category}", en: "faq/{category}", pristup: "J", faza: "S5" },
  { kljuc: "safety", hr: "sigurnost", en: "security", pristup: "J", faza: "S5" },
  { kljuc: "terms", hr: "uvjeti", en: "terms", pristup: "J", faza: "S5" },
  { kljuc: "privacy", hr: "privatnost", en: "privacy", pristup: "J", faza: "S5" },
  { kljuc: "ranking", hr: "pravila-prikaza", en: "ranking", pristup: "J", faza: "S5" },
  { kljuc: "about", hr: "o-nama", en: "about", pristup: "J", faza: "S5" },
  { kljuc: "contact", hr: "kontakt", en: "contact", pristup: "J*", faza: "S5" },
  { kljuc: "sign-in", hr: "prijava", en: "sign-in", pristup: "J", faza: "S6" },
  { kljuc: "sign-in.code", hr: "prijava/kod", en: "sign-in/code", pristup: "J", faza: "S6" },
  { kljuc: "sign-up", hr: "registracija", en: "sign-up", pristup: "J", faza: "S6" },
  { kljuc: "sign-up.confirm", hr: "registracija/potvrda", en: "sign-up/confirm", pristup: "J", faza: "S6" },
  { kljuc: "sign-out", hr: "odjava", en: "sign-out", pristup: "P", faza: "S6" },
  { kljuc: "confirm-action", hr: "potvrda-radnje/{token}", en: "confirm-action/{token}", pristup: "P+T", faza: "S6" },
  { kljuc: "invite", hr: "pozivnica/{token}", en: "invite/{token}", pristup: "T (+P za prihvat)", faza: "S6" },
  { kljuc: "reminder", hr: "podsjetnik/{token}", en: "reminder/{token}", pristup: "T", faza: "S6" },
  { kljuc: "new-campaign", hr: "nova-kampanja", en: "new-campaign", pristup: "J", faza: "S6" },
  { kljuc: "new-campaign.type", hr: "nova-kampanja/vrsta", en: "new-campaign/type", pristup: "J", faza: "S6" },
  { kljuc: "new-campaign.goal", hr: "nova-kampanja/cilj", en: "new-campaign/goal", pristup: "J", faza: "S6" },
  { kljuc: "new-campaign.media", hr: "nova-kampanja/mediji", en: "new-campaign/media", pristup: "J (upload P)", faza: "S6" },
  { kljuc: "new-campaign.description", hr: "nova-kampanja/opis", en: "new-campaign/description", pristup: "J", faza: "S6" },
  { kljuc: "new-campaign.preview", hr: "nova-kampanja/pregled", en: "new-campaign/preview", pristup: "J (objava P + U:admin ili K)", faza: "S6" },
  { kljuc: "campaign.edit", hr: "{id}/uredi", en: "{id}/edit", pristup: "K (U:editor)", faza: "S6" },
  { kljuc: "campaign.manage", hr: "{id}/upravljanje", en: "{id}/manage", pristup: "K", faza: "S6" },
  { kljuc: "campaign.manage.finances", hr: "{id}/upravljanje/financije", en: "{id}/manage/finances", pristup: "U:viewer", faza: "S6" },
  { kljuc: "campaign.manage.refunds", hr: "{id}/upravljanje/povrati", en: "{id}/manage/refunds", pristup: "U:admin, P+e", faza: "S6" },
  { kljuc: "campaign.manage.updates", hr: "{id}/upravljanje/novosti", en: "{id}/manage/updates", pristup: "K (U:editor)", faza: "S6" },
  { kljuc: "campaign.manage.comments", hr: "{id}/upravljanje/komentari", en: "{id}/manage/comments", pristup: "K (U:editor)", faza: "S6" },
  { kljuc: "campaign.manage.moneyboxes", hr: "{id}/upravljanje/kasice", en: "{id}/manage/moneyboxes", pristup: "K", faza: "S6" },
  { kljuc: "campaign.manage.links", hr: "{id}/upravljanje/linkovi", en: "{id}/manage/links", pristup: "K", faza: "S6" },
  { kljuc: "campaign.manage.notifications", hr: "{id}/upravljanje/obavijesti", en: "{id}/manage/notifications", pristup: "K", faza: "S6" },
  { kljuc: "campaign.manage.verification", hr: "{id}/upravljanje/verifikacija", en: "{id}/manage/verification", pristup: "K (U:editor)", faza: "S6" },
  { kljuc: "campaign.manage.money", hr: "{id}/upravljanje/novac", en: "{id}/manage/money", pristup: "K", faza: "S6" },
  { kljuc: "campaign.manage.close", hr: "{id}/upravljanje/zatvori", en: "{id}/manage/close", pristup: "U:owner, P+e", faza: "S6" },
  { kljuc: "my.campaigns", hr: "moje/kampanje", en: "my/campaigns", pristup: "P", faza: "S6" },
  { kljuc: "my.donations", hr: "moje/donacije", en: "my/donations", pristup: "P", faza: "S6" },
  { kljuc: "my.moneyboxes", hr: "moje/kasice", en: "my/moneyboxes", pristup: "P", faza: "S6" },
  { kljuc: "my.money", hr: "moje/novac", en: "my/money", pristup: "P", faza: "S6" },
  { kljuc: "my.external", hr: "moje/vanjske", en: "my/external", pristup: "P", faza: "S6" },
  { kljuc: "settings", hr: "postavke", en: "settings", pristup: "P", faza: "S6" },
  { kljuc: "settings.details", hr: "postavke/podaci", en: "settings/details", pristup: "P", faza: "S6" },
  { kljuc: "settings.phone", hr: "postavke/telefon", en: "settings/phone", pristup: "P", faza: "S6" },
  { kljuc: "settings.profile", hr: "postavke/profil", en: "settings/profile", pristup: "P (brisanje P+e)", faza: "S6" },
  { kljuc: "settings.sign-in", hr: "postavke/prijava", en: "settings/sign-in", pristup: "P", faza: "S6" },
  { kljuc: "settings.security", hr: "postavke/sigurnost", en: "settings/security", pristup: "P", faza: "S6" },
  { kljuc: "settings.verification", hr: "postavke/verifikacija", en: "settings/verification", pristup: "P", faza: "S6" },
  { kljuc: "settings.campaign-verification", hr: "postavke/verifikacija-kampanja", en: "settings/campaign-verification", pristup: "P", faza: "S6" },
  { kljuc: "settings.links", hr: "postavke/linkovi", en: "settings/links", pristup: "P", faza: "S6" },
  { kljuc: "settings.recurring", hr: "postavke/ponavljajuce", en: "settings/recurring", pristup: "P", faza: "S6" },
  { kljuc: "settings.sign-in-history", hr: "postavke/povijest-prijava", en: "settings/sign-in-history", pristup: "P", faza: "S6" },
  { kljuc: "organisation.new", hr: "organizacija/nova", en: "organisation/new", pristup: "P", faza: "S6" },
  { kljuc: "org.application", hr: "o/{slug}/zahtjev", en: "o/{slug}/application", pristup: "U:owner", faza: "S6" },
  { kljuc: "org.settings", hr: "o/{slug}/postavke", en: "o/{slug}/settings", pristup: "U:admin", faza: "S6" },
  { kljuc: "org.members", hr: "o/{slug}/clanovi", en: "o/{slug}/members", pristup: "U:owner (popis U:viewer)", faza: "S6" },
  { kljuc: "org.approvals", hr: "o/{slug}/odobravanje", en: "o/{slug}/approvals", pristup: "U:admin", faza: "S6" },
  { kljuc: "org.campaigns", hr: "o/{slug}/kampanje", en: "o/{slug}/campaigns", pristup: "U:viewer", faza: "S6" },
  { kljuc: "org.external", hr: "o/{slug}/vanjske", en: "o/{slug}/external", pristup: "U:editor", faza: "S6" },
] as const satisfies readonly Ruta[];

export type KljucRute = (typeof RUTE)[number]["kljuc"];

/** Rute bez jezika (kratki linkovi, ugradnja, auth, moderacija, API, sustav), docs/07. */
export interface RutaBezJezika {
  readonly kljuc: string;
  /** Put bez vodeće kose crte. */
  readonly put: string;
  readonly pristup: string;
  readonly faza: Faza;
}

export const RUTE_BEZ_JEZIKA = [
  { kljuc: "short.campaign", put: "{id}", pristup: "J", faza: "S5" },
  { kljuc: "short.moneybox", put: "s/{alias}", pristup: "J", faza: "S5" },
  { kljuc: "short.tracking", put: "z/{slug}", pristup: "J", faza: "S5" },
  { kljuc: "embed", put: "embed/{id}", pristup: "J", faza: "S5" },
  { kljuc: "embed.stream", put: "embed/{id}/stream", pristup: "J", faza: "S5" },
  { kljuc: "auth.link", put: "auth/link/{token}", pristup: "T", faza: "S6" },
  { kljuc: "auth.google", put: "auth/google", pristup: "J", faza: "S6" },
  { kljuc: "admin.reports", put: "admin/prijave", pristup: "A", faza: "S6" },
  { kljuc: "admin.report", put: "admin/prijave/{id}", pristup: "A", faza: "S6" },
  { kljuc: "admin.organisations", put: "admin/organizacije", pristup: "A", faza: "S6" },
  { kljuc: "admin.verifications", put: "admin/verifikacije", pristup: "A", faza: "S6" },
  { kljuc: "admin.campaigns", put: "admin/kampanje", pristup: "A", faza: "S6" },
  { kljuc: "api.checkouts", put: "api/checkouts", pristup: "J*", faza: "S4" },
  { kljuc: "api.checkout.events", put: "api/checkouts/{id}/events", pristup: "T", faza: "S4" },
  { kljuc: "api.checkout.tip", put: "api/checkouts/{id}/tip", pristup: "T", faza: "S4" },
  { kljuc: "webhooks.mpt", put: "webhooks/mpt", pristup: "potpis", faza: "S4" },
  { kljuc: "api.campaign.follow", put: "api/campaigns/{id}/follow", pristup: "J*", faza: "S4" },
  { kljuc: "api.drafts", put: "api/drafts", pristup: "P", faza: "S4" },
  { kljuc: "api.files", put: "api/files", pristup: "P", faza: "S4" },
  { kljuc: "sitemap", put: "sitemap.xml", pristup: "J", faza: "S4" },
  { kljuc: "robots", put: "robots.txt", pristup: "J", faza: "S4" },
] as const satisfies readonly RutaBezJezika[];

const poKljucu = new Map<string, Ruta>(RUTE.map((r) => [r.kljuc, r]));

/** Popuni `{param}` u uzorku; nepoznat parametar ostaje doslovno (vidljivo u testu). */
function popuni(uzorak: string, params: Record<string, string>): string {
  return uzorak.replace(/\{(\w+)\}/g, (m, k: string) => params[k] ?? m);
}

/** Apsolutni put rute na jeziku, npr. `url("hr", "campaigns")` → `/hr/kampanje`. */
export function url(lang: Lang, kljuc: KljucRute, params: Record<string, string> = {}): string {
  const r = poKljucu.get(kljuc);
  if (!r) throw new Error(`Nepoznata ruta: ${kljuc}`);
  const put = popuni(r[lang], params);
  return put ? `/${lang}/${put}` : `/${lang}`;
}

const segmenti = (put: string) => (put ? put.split("/") : []);

/**
 * Prepoznaj put na jeziku: vraća rutu i parametre ili null.
 * Statični segment ima prednost pred `{id}` (javni ID se ne sudara sa segmentima, odluka 302).
 */
export function prepoznaj(lang: Lang, put: string): { ruta: Ruta; params: Record<string, string> } | null {
  const dijelovi = segmenti(put.replace(/^\/+|\/+$/g, ""));
  let najbolja: { ruta: Ruta; params: Record<string, string>; staticnih: number } | null = null;
  for (const ruta of RUTE) {
    const uzorak = segmenti(ruta[lang]);
    if (uzorak.length !== dijelovi.length) continue;
    const params: Record<string, string> = {};
    let staticnih = 0;
    let ok = true;
    for (let i = 0; i < uzorak.length; i++) {
      const u = uzorak[i]!;
      const d = dijelovi[i]!;
      const p = u.match(/^\{(\w+)\}$/);
      if (p) params[p[1]!] = d;
      else if (u === d) staticnih++;
      else {
        ok = false;
        break;
      }
    }
    if (ok && (!najbolja || staticnih > najbolja.staticnih)) najbolja = { ruta, params, staticnih };
  }
  return najbolja && { ruta: najbolja.ruta, params: najbolja.params };
}

/**
 * Isti put na drugom jeziku (za LanguageSwitcher i hreflang). Ulaz je puni put
 * (`/hr/kampanje?q=x`); upitni dio se čuva jer su ključevi isti na oba jezika (odluka 303).
 * Nepoznat put vodi na naslovnicu ciljnog jezika.
 */
export function prevediPut(puniPut: string, cilj: Lang): string {
  const u = new URL(puniPut, "http://x");
  const m = u.pathname.match(/^\/(hr|en)(?:\/(.*))?$/);
  const sufiks = u.search;
  if (!m) return `/${cilj}`;
  const izvor = m[1] as Lang;
  const nadjeno = prepoznaj(izvor, m[2] ?? "");
  if (!nadjeno) return `/${cilj}`;
  const cilj_put = popuni(nadjeno.ruta[cilj], nadjeno.params);
  return (cilj_put ? `/${cilj}/${cilj_put}` : `/${cilj}`) + sufiks;
}
