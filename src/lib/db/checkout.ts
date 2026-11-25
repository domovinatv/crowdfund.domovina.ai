/**
 * Checkout (S7, tok 4 i 5, odluke 703, 707, 708): obrazac „Podrži” → redovi u bazi → MPT intent.
 *
 * Redoslijed (odluka 703): naš `sid` nastaje prije poziva raila, pa `checkouts(open)` i
 * `contributions(pending, payment_intent_sid = sid)` postoje kad stigne webhook ili pull
 * (`src/lib/db/uplate.ts` traži doprinos po `payment_intent_sid`, napojnicu po `tips.sid`).
 * Stanje nakon toga mijenja samo webhook ili pull (odluka 705), nikad ova datoteka.
 *
 * Metadata intenta nosi samo ID-eve (checkout, kampanja, kasica, link, dijeljenje), nikad e-poštu ni ime.
 * Iznos nikad ne nosi identitet: veza uplate i osobe je referenca intenta (CLAUDE.md).
 */
import { iznosUCente } from "./upravljanje";
import { kampanjaPoJavnomId } from "./kampanja";
import { uuid7 } from "./zajednicko";
import { MptGreska, noviSid, stvoriIntent, type DohvatFn, type MptIntent, type MptKonfig } from "../mpt/klijent";

// --- Granice -------------------------------------------------------------------------------------------

/** Najmanji i najveći doprinos (1 € – 10.000 €, `checkouts.amount_cents` CHECK). */
export const NAJMANJE_CENTI = 100;
export const NAJVISE_CENTI = 1_000_000;
/** Napojnica: svoj iznos 1 € – 1.000 €. */
export const NAPOJNICA_NAJVISE_CENTI = 100_000;
export const PORUKA_NAJVISE = 300;
export const IME_NAJVISE = 100;
export const TVRTKA_NAJVISE = 200;
/** Rok intenta: 24 h (zadatak S7, isti broj šaljemo railu). */
export const ROK_INTENTA_S = 86_400;
/** Brzi izbori iznosa kad kampanja nema vlastite (`amount_presets` prazan). */
export const ZADANI_IZNOSI = [1000, 2500, 5000, 10000];
/** Izbori napojnice (odluka 708): 0 prvi, ništa predodabrano. */
export const IZBORI_NAPOJNICE = [0, 100, 200, 500] as const;

// --- Obrazac -------------------------------------------------------------------------------------------

/** Sirove vrijednosti obrasca (vraćaju se u obrazac kod greške). */
export interface ObrazacCheckouta {
  /** Odabrani brzi iznos u centima kao tekst, ili „svoj”. */
  izbor: string;
  svojIznos: string;
  poruka: string;
  skrijIme: boolean;
  skrijIznos: boolean;
  email: string;
  ime: string;
  prezime: string;
  kaoTvrtka: boolean;
  tvrtka: string;
  oib: string;
  uvjeti: boolean;
}

export const prazanObrazac = (): ObrazacCheckouta => ({
  izbor: "", svojIznos: "", poruka: "", skrijIme: false, skrijIznos: false,
  email: "", ime: "", prezime: "", kaoTvrtka: false, tvrtka: "", oib: "", uvjeti: false,
});

export type PoljeCheckouta = "iznos" | "poruka" | "email" | "ime" | "prezime" | "tvrtka" | "oib" | "uvjeti";
export type GreskaCheckouta = "obavezno" | "nevaljan" | "premalo" | "previse" | "predugo" | "email" | "oib";
export type GreskeCheckouta = Partial<Record<PoljeCheckouta, GreskaCheckouta>>;

/** Provjereni podaci obrasca (bez sesije i atribucije). */
export interface CistiCheckout {
  iznosCenti: number;
  poruka: string | null;
  skrijIme: boolean;
  skrijIznos: boolean;
  email: string;
  ime: string | null;
  prezime: string | null;
  kaoTvrtka: boolean;
  tvrtka: string | null;
  oib: string | null;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

/** OIB: 11 znamenki i kontrolna znamenka (ISO 7064, MOD 11,10). */
export function oibIspravan(oib: string): boolean {
  if (!/^\d{11}$/.test(oib)) return false;
  let a = 10;
  for (let i = 0; i < 10; i++) {
    a = (a + Number(oib[i])) % 10;
    if (a === 0) a = 10;
    a = (a * 2) % 11;
  }
  const k = (11 - a) % 10;
  return k === Number(oib[10]);
}

/** Iznos izbora: brzi iznos (centi kao tekst) ili „svoj” iz polja. null kad ništa nije odabrano. */
export function iznosIzbora(izbor: string, svoj: string): number | "nevaljan" | null {
  if (izbor === "svoj" || (!izbor && svoj.trim())) {
    if (!svoj.trim()) return null;
    return iznosUCente(svoj) ?? "nevaljan";
  }
  if (!izbor) return null;
  return /^\d{1,9}$/.test(izbor) ? Number(izbor) : "nevaljan";
}

/**
 * Validacija obrasca (odluka 153): neprijavljeni upisuje e-poštu (obavezno), ime i prezime neobavezno,
 * „kao tvrtka” s nazivom i neobaveznim OIB-om, obavezno prihvaća uvjete. Prijavljenom se e-pošta uzima iz
 * sesije, „kao tvrtka” i uvjeti se ne nude (prihvatio ih je pri registraciji), pa se ta polja zanemaruju.
 */
export function provjeriObrazac(
  o: ObrazacCheckouta,
  opcije: { prijavljen: { email: string } | null; najmanjeCenti?: number | null },
): { ok: true; cisto: CistiCheckout } | { ok: false; greske: GreskeCheckouta } {
  const greske: GreskeCheckouta = {};
  const najmanje = Math.max(NAJMANJE_CENTI, opcije.najmanjeCenti ?? 0);
  const iznos = iznosIzbora(o.izbor, o.svojIznos);
  if (iznos === null) greske.iznos = "obavezno";
  else if (iznos === "nevaljan") greske.iznos = "nevaljan";
  else if (iznos < najmanje) greske.iznos = "premalo";
  else if (iznos > NAJVISE_CENTI) greske.iznos = "previse";

  const poruka = o.poruka.trim();
  if ([...poruka].length > PORUKA_NAJVISE) greske.poruka = "predugo";

  const prijavljen = opcije.prijavljen;
  const email = (prijavljen ? prijavljen.email : o.email).trim();
  const kaoTvrtka = !prijavljen && o.kaoTvrtka;
  const ime = kaoTvrtka || prijavljen ? "" : o.ime.trim();
  const prezime = kaoTvrtka || prijavljen ? "" : o.prezime.trim();
  const tvrtka = kaoTvrtka ? o.tvrtka.trim() : "";
  const oib = kaoTvrtka ? o.oib.replace(/\s/g, "") : "";
  if (!prijavljen) {
    if (!email) greske.email = "obavezno";
    else if (!EMAIL.test(email) || email.length > 254) greske.email = "email";
    if (ime.length > IME_NAJVISE) greske.ime = "predugo";
    if (prezime.length > IME_NAJVISE) greske.prezime = "predugo";
    if (kaoTvrtka && !tvrtka) greske.tvrtka = "obavezno";
    else if (tvrtka.length > TVRTKA_NAJVISE) greske.tvrtka = "predugo";
    if (oib && !oibIspravan(oib)) greske.oib = "oib";
    if (!o.uvjeti) greske.uvjeti = "obavezno";
  }
  if (Object.keys(greske).length) return { ok: false, greske };
  return {
    ok: true,
    cisto: {
      iznosCenti: iznos as number,
      poruka: poruka || null,
      skrijIme: o.skrijIme,
      skrijIznos: o.skrijIznos,
      email,
      ime: ime || null,
      prezime: prezime || null,
      kaoTvrtka,
      tvrtka: tvrtka || null,
      oib: oib || null,
    },
  };
}

// --- ID-evi ----------------------------------------------------------------------------------------------

/** ID checkouta: 128 bita base64url (22 znaka); jedini ključ T rute, pa mora biti nepogodiv. */
export function noviIdCheckouta(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Oblik ID-a checkouta u ruti (naši tokeni i UUID-ovi iz seeda). */
export const idCheckoutaIspravan = (id: string): boolean => /^[A-Za-z0-9_-]{16,40}$/.test(id);

// --- Stvaranje -------------------------------------------------------------------------------------------

export interface NoviCheckout {
  /** Javni ID kampanje. */
  publicId: string;
  podaci: CistiCheckout;
  korisnik: { id: string; email: string; ime: string } | null;
  /** Alias kasice iz `?s=`; vrijedi samo aktivna kasica ove kampanje. */
  kasica?: string | null;
  /** Vrijednost kolačića atribucije (`atribucija`): ID linka za praćenje ili dijeljenja. */
  atribucija?: string | null;
  /** `?ref={code}` dijeljenja; ima prednost pred kolačićem (zadnji klik, tok 7). */
  ref?: string | null;
  /** Apsolutni URL stranice plaćanja za `return_url` intenta. */
  povratniUrl: (checkoutId: string) => string;
  sad?: number;
}

export type RezultatCheckouta =
  | { ok: true; checkoutId: string; intent: MptIntent }
  | { ok: false; razlog: "nema" | "ne_prima" | "bez_safea" | "mpt"; kod?: string };

interface Atribucija {
  moneyboxId: string | null;
  kasicaAlias: string | null;
  trackingLinkId: string | null;
  shareLinkId: string | null;
}

/** Kasica, link za praćenje i dijeljenje koji stvarno pripadaju ovoj kampanji (ostalo se zanemaruje). */
async function atribucija(db: D1Database, campaignId: string, n: NoviCheckout): Promise<Atribucija> {
  const a: Atribucija = { moneyboxId: null, kasicaAlias: null, trackingLinkId: null, shareLinkId: null };
  const alias = n.kasica?.trim().toLowerCase();
  if (alias && /^[a-z0-9-]{3,60}$/.test(alias)) {
    const m = await db
      .prepare("SELECT id, alias FROM moneyboxes WHERE alias = ? AND campaign_id = ? AND status = 'active'")
      .bind(alias, campaignId)
      .first<{ id: string; alias: string }>();
    if (m) {
      a.moneyboxId = m.id;
      a.kasicaAlias = m.alias;
    }
  }
  const ref = n.ref?.trim();
  if (ref && /^[A-Za-z0-9_-]{3,64}$/.test(ref)) {
    const s = await db.prepare("SELECT id FROM share_links WHERE code = ? AND campaign_id = ?").bind(ref, campaignId).first<{ id: string }>();
    if (s) a.shareLinkId = s.id;
  }
  const kolacic = n.atribucija?.trim();
  if (!a.shareLinkId && kolacic && kolacic.length <= 64) {
    const t = await db
      .prepare("SELECT id FROM tracking_links WHERE id = ? AND campaign_id = ? AND status = 'active'")
      .bind(kolacic, campaignId)
      .first<{ id: string }>();
    if (t) a.trackingLinkId = t.id;
    else {
      const s = await db.prepare("SELECT id FROM share_links WHERE id = ? AND campaign_id = ?").bind(kolacic, campaignId).first<{ id: string }>();
      if (s) a.shareLinkId = s.id;
    }
  }
  return a;
}

/** Ime na popisu podržavatelja: prijavljeni → ime računa, tvrtka → naziv, inače ime i prezime. */
export function imeZaPopis(c: CistiCheckout, korisnik: { ime: string } | null): string | null {
  if (c.skrijIme) return null;
  if (korisnik) return korisnik.ime || null;
  if (c.kaoTvrtka) return c.tvrtka;
  const ime = [c.ime, c.prezime].filter(Boolean).join(" ").trim();
  return ime || null;
}

/**
 * Checkout doprinosa: provjera da kampanja prima uplate, redovi u jednom `db.batch`, pa intent na Safe kampanje.
 * Ako MPT padne, doprinos prelazi u `failed`, a checkout u `expired` s rokom „sad”: redovi ostaju za trag
 * (ako je rail ipak stvorio intent s našim sidom, webhook ga i dalje nađe), a korisnik dobiva poruku.
 */
export async function stvoriCheckout(db: D1Database, k: MptKonfig, n: NoviCheckout, dohvat?: DohvatFn): Promise<RezultatCheckouta> {
  const sad = n.sad ?? Date.now();
  const kampanja = await kampanjaPoJavnomId(db, n.publicId, new Date(sad));
  if (!kampanja) return { ok: false, razlog: "nema" };
  if (!kampanja.primaUplate) return { ok: false, razlog: "ne_prima" };
  const safe = await db.prepare("SELECT address FROM campaign_safes WHERE campaign_id = ?").bind(kampanja.id).first<{ address: string }>();
  if (!safe?.address) return { ok: false, razlog: "bez_safea" };

  const c = n.podaci;
  const a = await atribucija(db, kampanja.id, n);
  const checkoutId = noviIdCheckouta();
  const sid = noviSid();
  const doprinosId = uuid7(sad);
  const rok = sad + ROK_INTENTA_S * 1000;
  const userId = n.korisnik?.id ?? null;

  await db.batch([
    db
      .prepare(
        `INSERT INTO checkouts (id, campaign_id, contribution_sid, amount_cents, tip_cents, intent_state, user_id, email,
                                first_name, last_name, as_company, company_name, company_oib, moneybox_id, tracking_link_id,
                                share_link_id, short_ref, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      )
      .bind(
        checkoutId, kampanja.id, sid, c.iznosCenti, userId, n.korisnik?.email ?? c.email,
        c.ime, c.prezime, c.kaoTvrtka ? 1 : 0, c.tvrtka, c.oib, a.moneyboxId, a.trackingLinkId, a.shareLinkId,
        rok, sad, sad,
      ),
    db
      .prepare(
        `INSERT INTO contributions (id, campaign_id, tier_id, quantity, amount_cents, amount_received_cents, currency, state,
                                    payment_rail, payment_intent_sid, underpaid, created_at, updated_at)
         VALUES (?, ?, NULL, 1, ?, NULL, ?, 'pending', 'sepa', ?, 0, ?, ?)`,
      )
      .bind(doprinosId, kampanja.id, c.iznosCenti, kampanja.currency || "EUR", sid, sad, sad),
    db
      .prepare(
        `INSERT INTO contribution_profiles (contribution_id, anonymous, display_name, display_name_verified, message,
                                            message_hidden, link_url, bank_verified, updated_at)
         VALUES (?, ?, ?, 0, ?, 0, NULL, 0, ?)`,
      )
      .bind(doprinosId, c.skrijIme ? 1 : 0, imeZaPopis(c, n.korisnik), c.poruka, sad),
    db
      .prepare(
        `INSERT INTO contribution_attributions (contribution_id, checkout_id, user_id, moneybox_id, tracking_link_id,
                                                share_link_id, offer_id, amount_hidden, show_message_as_comment, source)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0, 'checkout')`,
      )
      .bind(doprinosId, checkoutId, userId, a.moneyboxId, a.trackingLinkId, a.shareLinkId, c.skrijIznos ? 1 : 0),
  ]);

  const metadata: Record<string, string> = { checkout: checkoutId, kampanja: kampanja.publicId, vrsta: "doprinos" };
  if (a.moneyboxId) metadata.kasica = a.moneyboxId;
  if (a.trackingLinkId) metadata.link = a.trackingLinkId;
  if (a.shareLinkId) metadata.dijeljenje = a.shareLinkId;

  let intent: MptIntent;
  try {
    intent = await stvoriIntent(
      k,
      {
        sid,
        targetAddress: safe.address,
        amountCents: c.iznosCenti,
        label: kampanja.title,
        metadata,
        expiresInSeconds: ROK_INTENTA_S,
        returnUrl: n.povratniUrl(checkoutId),
      },
      dohvat,
    );
  } catch (e) {
    await db.batch([
      db.prepare("UPDATE contributions SET state = 'failed', updated_at = ? WHERE id = ? AND state = 'pending'").bind(sad, doprinosId),
      db.prepare("UPDATE checkouts SET intent_state = 'expired', expires_at = ?, updated_at = ? WHERE id = ? AND intent_state = 'open'").bind(sad, sad, checkoutId),
    ]);
    return { ok: false, razlog: "mpt", kod: e instanceof MptGreska ? e.kod : "mreza" };
  }
  await db
    .prepare("UPDATE checkouts SET short_ref = ?, expires_at = ?, updated_at = ? WHERE id = ?")
    .bind(intent.shortRef, intent.expiresAt ?? rok, sad, checkoutId)
    .run();
  return { ok: true, checkoutId, intent };
}

// --- Čitanje -------------------------------------------------------------------------------------------

export type StanjeIntenta = "open" | "underpaid" | "paid" | "expired" | "late" | "underpaid_expired" | "rejected";
export type StanjeDoprinosa = "pending" | "paid" | "failed" | "refunded" | "expired";

export interface Checkout {
  id: string;
  campaignId: string;
  sid: string;
  iznosCenti: number;
  napojnicaCenti: number;
  stanje: StanjeIntenta;
  shortRef: string | null;
  rok: number;
  stvoren: number;
  userId: string | null;
  kasicaAlias: string | null;
  doprinos: { id: string; stanje: StanjeDoprinosa; primljenoCenti: number | null; manjak: boolean; placen: number | null } | null;
  napojnica: { id: string; sid: string; iznosCenti: number; stanje: StanjeIntenta; primljenoCenti: number | null; placena: number | null } | null;
}

/** Checkout s doprinosom i napojnicom; null kad ne postoji ili ne pripada kampanji. */
export async function checkoutKampanje(db: D1Database, checkoutId: string, campaignId: string): Promise<Checkout | null> {
  if (!idCheckoutaIspravan(checkoutId)) return null;
  const r = await db
    .prepare(
      `SELECT ch.id, ch.campaign_id, ch.contribution_sid, ch.amount_cents, ch.tip_cents, ch.intent_state, ch.short_ref,
              ch.expires_at, ch.created_at, ch.user_id, mb.alias AS kasica,
              d.id AS d_id, d.state AS d_state, d.amount_received_cents AS d_primljeno, d.underpaid AS d_manjak, d.paid_at AS d_placen,
              t.id AS t_id, t.sid AS t_sid, t.amount_cents AS t_iznos, t.intent_state AS t_stanje,
              t.amount_received_cents AS t_primljeno, t.paid_at AS t_placena
         FROM checkouts ch
         LEFT JOIN moneyboxes mb ON mb.id = ch.moneybox_id
         LEFT JOIN contributions d ON d.payment_intent_sid = ch.contribution_sid
         LEFT JOIN tips t ON t.checkout_id = ch.id
        WHERE ch.id = ? AND ch.campaign_id = ?`,
    )
    .bind(checkoutId, campaignId)
    .first<{
      id: string; campaign_id: string; contribution_sid: string; amount_cents: number; tip_cents: number; intent_state: StanjeIntenta;
      short_ref: string | null; expires_at: number; created_at: number; user_id: string | null; kasica: string | null;
      d_id: string | null; d_state: StanjeDoprinosa | null; d_primljeno: number | null; d_manjak: number | null; d_placen: number | null;
      t_id: string | null; t_sid: string | null; t_iznos: number | null; t_stanje: StanjeIntenta | null; t_primljeno: number | null; t_placena: number | null;
    }>();
  if (!r) return null;
  return {
    id: r.id,
    campaignId: r.campaign_id,
    sid: r.contribution_sid,
    iznosCenti: r.amount_cents,
    napojnicaCenti: r.tip_cents,
    stanje: r.intent_state,
    shortRef: r.short_ref,
    rok: r.expires_at,
    stvoren: r.created_at,
    userId: r.user_id,
    kasicaAlias: r.kasica,
    doprinos: r.d_id
      ? { id: r.d_id, stanje: r.d_state!, primljenoCenti: r.d_primljeno, manjak: r.d_manjak === 1, placen: r.d_placen }
      : null,
    napojnica: r.t_id
      ? { id: r.t_id, sid: r.t_sid!, iznosCenti: r.t_iznos!, stanje: r.t_stanje!, primljenoCenti: r.t_primljeno, placena: r.t_placena }
      : null,
  };
}

/** Doprinos je plaćen (uključuje kasnu i manju uplatu, odluka 707). */
export const doprinosPlacen = (c: Checkout): boolean => c.doprinos?.stanje === "paid" || c.doprinos?.stanje === "refunded";

/** Checkout je završio bez uplate: istekao, odbijen ili MPT greška pri stvaranju. */
/** Napojnica je stigla (kasna i manja se priznaju kao kod doprinosa, odluka 707). */
export const napojnicaPlacena = (c: Checkout): boolean =>
  c.napojnica?.stanje === "paid" || c.napojnica?.stanje === "late" || c.napojnica?.stanje === "underpaid";

/** Napojnica je istekla ili odbijena. */
export const napojnicaNeuspjela = (c: Checkout): boolean =>
  c.napojnica?.stanje === "expired" || c.napojnica?.stanje === "rejected" || c.napojnica?.stanje === "underpaid_expired";

export const doprinosNeuspio = (c: Checkout): boolean =>
  !doprinosPlacen(c) && (c.doprinos?.stanje === "failed" || c.doprinos?.stanje === "expired" || c.stanje === "expired" || c.stanje === "rejected" || c.stanje === "underpaid_expired");

// --- Napojnica -------------------------------------------------------------------------------------------

export type RezultatNapojnice =
  | { ok: true; nula: true }
  | { ok: true; nula: false; sid: string; intent: MptIntent | null }
  | { ok: false; razlog: "nema" | "nije_placeno" | "iznos" | "mpt"; kod?: string };

/**
 * Napojnica (odluka 708): zaseban intent na `k.tipTarget` (Safe platforme), metadata samo `{ checkout, vrsta }`.
 * Nikad ne dira `contributions` ni `campaign_stats`. 0 € samo bilježi `tip_cents = 0`. Postojeća napojnica se
 * vraća (jedna po checkoutu, `tips.checkout_id` UNIQUE). Ponuđena je tek nakon plaćenog doprinosa.
 * Ako MPT padne, red napojnice se briše (nikad nije postojao intent), pa korisnik može pokušati ponovo.
 */
export async function stvoriNapojnicu(
  db: D1Database,
  k: MptKonfig | null,
  checkoutId: string,
  iznosCenti: number,
  dohvat?: DohvatFn,
  opcije: { povratniUrl?: string; sad?: number } = {},
): Promise<RezultatNapojnice> {
  const sad = opcije.sad ?? Date.now();
  if (!idCheckoutaIspravan(checkoutId)) return { ok: false, razlog: "nema" };
  const ch = await db
    .prepare(
      `SELECT ch.id, ch.campaign_id, d.state AS d_state, t.sid AS t_sid
         FROM checkouts ch
         LEFT JOIN contributions d ON d.payment_intent_sid = ch.contribution_sid
         LEFT JOIN tips t ON t.checkout_id = ch.id
        WHERE ch.id = ?`,
    )
    .bind(checkoutId)
    .first<{ id: string; campaign_id: string; d_state: string | null; t_sid: string | null }>();
  if (!ch) return { ok: false, razlog: "nema" };
  if (ch.d_state !== "paid" && ch.d_state !== "refunded") return { ok: false, razlog: "nije_placeno" };
  if (ch.t_sid) return { ok: true, nula: false, sid: ch.t_sid, intent: null };
  if (!Number.isSafeInteger(iznosCenti) || iznosCenti < 0 || iznosCenti > NAPOJNICA_NAJVISE_CENTI || (iznosCenti > 0 && iznosCenti < 100)) {
    return { ok: false, razlog: "iznos" };
  }
  if (iznosCenti === 0) {
    await db.prepare("UPDATE checkouts SET tip_cents = 0, updated_at = ? WHERE id = ?").bind(sad, checkoutId).run();
    return { ok: true, nula: true };
  }
  if (!k) return { ok: false, razlog: "mpt", kod: "bez_konfiguracije" };
  const sid = noviSid();
  const tipId = uuid7(sad);
  await db.batch([
    db
      .prepare("INSERT INTO tips (id, checkout_id, sid, amount_cents, intent_state, created_at, updated_at) VALUES (?, ?, ?, ?, 'open', ?, ?)")
      .bind(tipId, checkoutId, sid, iznosCenti, sad, sad),
    db.prepare("UPDATE checkouts SET tip_cents = ?, updated_at = ? WHERE id = ?").bind(iznosCenti, sad, checkoutId),
  ]);
  try {
    const intent = await stvoriIntent(
      k,
      {
        sid,
        targetAddress: k.tipTarget,
        amountCents: iznosCenti,
        label: "Napojnica platformi",
        metadata: { checkout: checkoutId, vrsta: "napojnica" },
        expiresInSeconds: ROK_INTENTA_S,
        ...(opcije.povratniUrl ? { returnUrl: opcije.povratniUrl } : {}),
      },
      dohvat,
    );
    return { ok: true, nula: false, sid, intent };
  } catch (e) {
    await db.batch([
      db.prepare("DELETE FROM tips WHERE id = ?").bind(tipId),
      db.prepare("UPDATE checkouts SET tip_cents = 0, updated_at = ? WHERE id = ?").bind(sad, checkoutId),
    ]);
    return { ok: false, razlog: "mpt", kod: e instanceof MptGreska ? e.kod : "mreza" };
  }
}

/** Iznos napojnice iz obrasca: „0”, „100”, „200”, „500” ili „svoj” uz polje. */
export function iznosNapojnice(izbor: string, svoj: string): number | "obavezno" | "nevaljan" {
  if (!izbor) return "obavezno";
  if (izbor === "svoj") {
    if (!svoj.trim()) return "obavezno";
    const c = iznosUCente(svoj);
    if (c === null || c < 100 || c > NAPOJNICA_NAJVISE_CENTI) return "nevaljan";
    return c;
  }
  const c = Number(izbor);
  return (IZBORI_NAPOJNICE as readonly number[]).includes(c) ? c : "nevaljan";
}

// --- API napojnice -----------------------------------------------------------------------------------------

const JSON_ZAGLAVLJA = { "content-type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (status: number, tijelo: unknown): Response => new Response(JSON.stringify(tijelo), { status, headers: JSON_ZAGLAVLJA });

/**
 * `POST /api/checkouts/{id}/tip` (pristup T, JSON): `{ "iznosCenti": 0 | 100–100000 }`, isto što i obrazac
 * stranice napojnice. Samo `application/json` (obrazac s tuđeg origina ne može poslati JSON bez CORS-a).
 * 200 `{ ok, nula, napojnica }`; 400 iznos ili tijelo; 404 nepoznat checkout; 409 doprinos nije plaćen;
 * 415 drugi Content-Type; 502 MPT ne odgovara.
 */
export async function odgovorNapojnice(
  zahtjev: Request,
  db: D1Database,
  k: MptKonfig | null,
  checkoutId: string,
  dohvat?: DohvatFn,
): Promise<Response> {
  if (!(zahtjev.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return json(415, { ok: false, greska: "content_type" });
  }
  let tijelo: unknown;
  try {
    tijelo = await zahtjev.json();
  } catch {
    return json(400, { ok: false, greska: "tijelo" });
  }
  const iznos = (tijelo as { iznosCenti?: unknown } | null)?.iznosCenti;
  if (typeof iznos !== "number") return json(400, { ok: false, greska: "iznos" });
  const r = await stvoriNapojnicu(db, k, checkoutId, iznos, dohvat);
  if (!r.ok) {
    const status = r.razlog === "nema" ? 404 : r.razlog === "nije_placeno" ? 409 : r.razlog === "iznos" ? 400 : 502;
    return json(status, { ok: false, greska: r.razlog });
  }
  if (r.nula) return json(200, { ok: true, nula: true, napojnica: null });
  const i = r.intent;
  return json(200, {
    ok: true,
    nula: false,
    napojnica: {
      sid: r.sid,
      shortRef: i?.shortRef ?? null,
      memo: i?.memo ?? null,
      checkoutUrl: i?.checkoutUrl ?? null,
      statusStreamUrl: i?.statusStreamUrl ?? null,
      sandbox: i?.sandbox ?? null,
    },
  });
}
