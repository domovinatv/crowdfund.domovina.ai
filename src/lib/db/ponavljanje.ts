/**
 * Mjesečna podrška (S8, odluka 14, tok 10): obećanje (`recurring_pledges`), prvi mjesec kroz `stvoriCheckout`
 * s `recurring_pledge_id`, mjesečni podsjetnik s tokenom (`recurring_reminders`, migracija 0008) i mock e-pošta
 * (`notifications`, ništa se ne šalje).
 *
 * Monerium nema SEPA izravno terećenje, pa ništa ne naplaćujemo sami: način `reminder` = svaki mjesec poveznica
 * `/hr/podsjetnik/{token}` (T), s koje podržavatelj otvara novi intent za taj mjesec; način `standing_order` =
 * uputa za trajni nalog u banci, bez podsjetnika. Intent se ne stvara unaprijed (tok 10 ga crta u Cron petlji):
 * nastaje tek na „Plati ovaj mjesec”, pa neotvoreni podsjetnik ne troši intent i ne istječe na railu.
 *
 * `dospjeliPodsjetnici(db, sada)` je jedini ulaz za generiranje: bez mreže, deterministički za dani `sada`
 * (osim nasumičnog tokena). Cron Trigger nije podešen; poziva ga test i gumb simulacije u postavkama.
 */
import { DAN, uuid7 } from "./zajednicko";
import { hashTokena, noviToken } from "../sesija";
import { stvoriCheckout, type CistiCheckout, type RezultatCheckouta } from "./checkout";
import type { DohvatFn, MptKonfig } from "../mpt/klijent";

// --- Pravila -------------------------------------------------------------------------------------------

export const NACINI = ["reminder", "standing_order"] as const;
export type Nacin = (typeof NACINI)[number];
export type StanjeObecanja = "active" | "paused" | "cancelled";

/** Rok poveznice podsjetnika: 7 dana (intent otvoren s nje vrijedi 24 h, `ROK_INTENTA_S`). */
export const ROK_PODSJETNIKA = 7 * DAN;
/** Nakon toliko neplaćenih podsjetnika zaredom obećanje se samo pauzira (stranica „Mjesečne kampanje”). */
export const NEPLACENIH_DO_PAUZE = 3;
/** Podsjetnik stiže u 7:00 UTC odabranog dana (8:00 ili 9:00 po hrvatskom vremenu). */
const SAT_UTC = 7;

/**
 * Mjesečna opcija u checkoutu: kampanja vrste `recurring` (čarobnjak) ili s `recurrence = monthly` (jezgra).
 * Jednokratna kampanja s ciljem i rokom nema smisla mjesečno; kvartalno i godišnje prototip ne nudi.
 */
export const mjesecnoDopusteno = (k: { kind: string; recurrence: string }): boolean => k.kind === "recurring" || k.recurrence === "monthly";

/** Razdoblje `YYYY-MM` (UTC) za trenutak u ms. */
export const razdoblje = (ms: number): string => new Date(ms).toISOString().slice(0, 7);

/**
 * Sljedeći termin podsjetnika: dan `dan` u 7:00 UTC, strogo nakon `sad`, u mjesecu nakon `pokriven`
 * (zadnji mjesec koji je već plaćen ili podsjetnik za koji već postoji).
 */
export function sljedeciTermin(dan: number, sad: number, pokriven: string | null): number {
  const d = new Date(sad);
  for (let i = 0; i < 14; i++) {
    const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, dan, SAT_UTC);
    if (t > sad && (pokriven === null || razdoblje(t) > pokriven)) return t;
  }
  throw new Error("sljedeciTermin: nema termina");
}

export interface UlazPonavljanja {
  /** „jednom” (zadano) ili „mjesecno”. */
  ucestalost: string;
  dan: string;
  nacin: string;
}
export type PoljePonavljanja = "ucestalost" | "dan" | "nacin";
export type GreskaPonavljanja = "prijava" | "nedopusteno" | "nevaljan";
export type GreskePonavljanja = Partial<Record<PoljePonavljanja, GreskaPonavljanja>>;

export const praznoPonavljanje = (): UlazPonavljanja => ({ ucestalost: "jednom", dan: "", nacin: "reminder" });

/** Mjesečno samo za prijavljene (V pristup obećanju, docs/07) i samo gdje je dopušteno; dan 1–28; način iz popisa. */
export function provjeriPonavljanje(
  u: UlazPonavljanja,
  o: { prijavljen: boolean; dopusteno: boolean },
): { ok: true; mjesecno: { dan: number; nacin: Nacin } | null } | { ok: false; greske: GreskePonavljanja } {
  if (u.ucestalost !== "mjesecno") return { ok: true, mjesecno: null };
  const g: GreskePonavljanja = {};
  if (!o.dopusteno) g.ucestalost = "nedopusteno";
  else if (!o.prijavljen) g.ucestalost = "prijava";
  const dan = /^\d{1,2}$/.test(u.dan.trim()) ? Number(u.dan.trim()) : NaN;
  if (!(dan >= 1 && dan <= 28)) g.dan = "nevaljan";
  if (!(NACINI as readonly string[]).includes(u.nacin)) g.nacin = "nevaljan";
  if (Object.keys(g).length) return { ok: false, greske: g };
  return { ok: true, mjesecno: { dan, nacin: u.nacin as Nacin } };
}

// --- Obećanje ------------------------------------------------------------------------------------------

/** Novo aktivno obećanje; prvi mjesec je checkout koji slijedi, pa prvi podsjetnik ide idući mjesec. */
export async function stvoriObecanje(
  db: D1Database,
  n: { userId: string; campaignId: string; iznosCenti: number; dan: number; nacin: Nacin; sad: number },
): Promise<string> {
  const id = uuid7(n.sad);
  const termin = n.nacin === "reminder" ? sljedeciTermin(n.dan, n.sad, razdoblje(n.sad)) : null;
  await db
    .prepare(
      `INSERT INTO recurring_pledges (id, user_id, campaign_id, tier_id, amount_cents, day_of_month, mode, status, subscription_id,
                                      missed_count, next_reminder_at, created_at, cancelled_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, 'active', NULL, 0, ?, ?, NULL, ?)`,
    )
    .bind(id, n.userId, n.campaignId, n.iznosCenti, n.dan, n.nacin, termin, n.sad, n.sad)
    .run();
  return id;
}

/** Prvi checkout nije uspio (MPT): obećanje se otkazuje (checkout ga i dalje referencira, pa se ne briše). */
export async function otkaziObecanje(db: D1Database, id: string, sad: number): Promise<void> {
  await db
    .prepare("UPDATE recurring_pledges SET status = 'cancelled', cancelled_at = ?, next_reminder_at = NULL, updated_at = ? WHERE id = ? AND status <> 'cancelled'")
    .bind(sad, sad, id)
    .run();
}

/** Zadnji „pokriveni” mjesec: mjesec nastanka obećanja ili zadnjeg podsjetnika, što je kasnije. */
async function pokrivenMjesec(db: D1Database, pledgeId: string, createdAt: number): Promise<string> {
  const r = await db
    .prepare("SELECT max(period) AS p FROM recurring_reminders WHERE pledge_id = ?")
    .bind(pledgeId)
    .first<{ p: string | null }>();
  const nastanak = razdoblje(createdAt);
  return r?.p && r.p > nastanak ? r.p : nastanak;
}

/** Nakon promjene dana ili nastavka: novi `next_reminder_at` (samo aktivno obećanje s podsjetnikom). */
export async function preracunajTermin(db: D1Database, pledgeId: string, sad: number): Promise<void> {
  const p = await db
    .prepare("SELECT day_of_month, mode, status, created_at FROM recurring_pledges WHERE id = ?")
    .bind(pledgeId)
    .first<{ day_of_month: number; mode: Nacin; status: StanjeObecanja; created_at: number }>();
  if (!p) return;
  const termin = p.status === "active" && p.mode === "reminder" ? sljedeciTermin(p.day_of_month, sad, await pokrivenMjesec(db, pledgeId, p.created_at)) : null;
  await db.prepare("UPDATE recurring_pledges SET next_reminder_at = ?, updated_at = ? WHERE id = ?").bind(termin, sad, pledgeId).run();
}

// --- Podsjetnik ----------------------------------------------------------------------------------------

export interface IshodPodsjetnika {
  pledgeId: string;
  ishod: "poslan" | "pauzirano" | "vec_postoji";
  period: string;
  /** Token poveznice; samo za `poslan` (u bazi je samo hash). */
  token?: string;
}

interface RedObecanja {
  id: string;
  user_id: string;
  email: string;
  locale: string;
  campaign_id: string;
  public_id: string;
  title: string;
  amount_cents: number;
  day_of_month: number;
  missed_count: number;
  next_reminder_at: number | null;
  created_at: number;
}

/**
 * Podsjetnik za sljedeći termin obećanja (aktivno, način `reminder`), odmah: upis u `recurring_reminders`, mock
 * e-poruka u `notifications` (`recurring_reminder`, payload s tokenom jer je to sadržaj e-poruke) i novi termin.
 * Ako prethodni podsjetnik nije plaćen, raste `missed_count`; na `NEPLACENIH_DO_PAUZE` obećanje se pauzira.
 * null = obećanje ne postoji, nije aktivno ili nije način podsjetnika.
 */
export async function posaljiPodsjetnik(db: D1Database, pledgeId: string, sad: number): Promise<IshodPodsjetnika | null> {
  const p = await db
    .prepare(
      `SELECT r.id, r.user_id, u.email, u.locale, r.campaign_id, s.public_id, c.title, r.amount_cents, r.day_of_month, r.missed_count,
              r.next_reminder_at, r.created_at
         FROM recurring_pledges r JOIN users u ON u.id = r.user_id
         JOIN campaigns c ON c.id = r.campaign_id JOIN campaign_settings s ON s.campaign_id = r.campaign_id
        WHERE r.id = ? AND r.status = 'active' AND r.mode = 'reminder' AND u.deleted_at IS NULL`,
    )
    .bind(pledgeId)
    .first<RedObecanja>();
  if (!p) return null;
  const termin = p.next_reminder_at ?? sljedeciTermin(p.day_of_month, sad, await pokrivenMjesec(db, p.id, p.created_at));
  const period = razdoblje(termin);
  const iduci = sljedeciTermin(p.day_of_month, Math.max(sad, termin), period);

  const postoji = await db.prepare("SELECT 1 AS da FROM recurring_reminders WHERE pledge_id = ? AND period = ?").bind(p.id, period).first();
  if (postoji) {
    await db.prepare("UPDATE recurring_pledges SET next_reminder_at = ?, updated_at = ? WHERE id = ?").bind(iduci, sad, p.id).run();
    return { pledgeId: p.id, ishod: "vec_postoji", period };
  }

  // Je li prethodni podsjetnik plaćen (doprinos njegova checkouta `paid`/`refunded`)?
  const prethodni = await db
    .prepare(
      `SELECT x.id, EXISTS (SELECT 1 FROM checkouts ch JOIN contributions d ON d.payment_intent_sid = ch.contribution_sid
                            WHERE ch.id = x.checkout_id AND d.state IN ('paid','refunded')) AS placen
         FROM recurring_reminders x WHERE x.pledge_id = ? ORDER BY x.period DESC LIMIT 1`,
    )
    .bind(p.id)
    .first<{ id: string; placen: number }>();
  const propusteno = prethodni && !prethodni.placen ? p.missed_count + 1 : 0;
  if (propusteno >= NEPLACENIH_DO_PAUZE) {
    await db
      .prepare("UPDATE recurring_pledges SET status = 'paused', missed_count = ?, next_reminder_at = NULL, updated_at = ? WHERE id = ? AND status = 'active'")
      .bind(propusteno, sad, p.id)
      .run();
    return { pledgeId: p.id, ishod: "pauzirano", period };
  }

  const token = noviToken();
  const obavijestId = uuid7(sad);
  const podsjetnikId = uuid7(sad);
  const payload = JSON.stringify({
    token,
    kampanja: p.public_id,
    naslov: p.title,
    iznosCenti: p.amount_cents,
    period,
    jezik: p.locale === "en" ? "en" : "hr",
    rok: sad + ROK_PODSJETNIKA,
  });
  await db.batch([
    db
      .prepare(
        `INSERT INTO notifications (id, user_id, email, kind, payload, created_at, sent_at, campaign_id)
         VALUES (?, ?, ?, 'recurring_reminder', ?, ?, NULL, ?)`,
      )
      .bind(obavijestId, p.user_id, p.email, payload, sad, p.campaign_id),
    db
      .prepare(
        `INSERT INTO recurring_reminders (id, pledge_id, period, token_hash, expires_at, checkout_id, notification_id, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
      )
      .bind(podsjetnikId, p.id, period, await hashTokena(token), sad + ROK_PODSJETNIKA, obavijestId, sad),
    db
      .prepare("UPDATE recurring_pledges SET next_reminder_at = ?, missed_count = ?, updated_at = ? WHERE id = ?")
      .bind(iduci, propusteno, sad, p.id),
  ]);
  return { pledgeId: p.id, ishod: "poslan", period, token };
}

/**
 * Svi dospjeli podsjetnici u trenutku `sada` (aktivna obećanja načina `reminder` s `next_reminder_at <= sada`),
 * najviše `najvise` po pozivu. Ponovljeni poziv za isti mjesec ne stvara drugi podsjetnik (UNIQUE pledge, period).
 */
export async function dospjeliPodsjetnici(db: D1Database, sada: number, najvise = 100): Promise<IshodPodsjetnika[]> {
  const { results } = await db
    .prepare(
      `SELECT id FROM recurring_pledges
        WHERE status = 'active' AND mode = 'reminder' AND next_reminder_at IS NOT NULL AND next_reminder_at <= ?
        ORDER BY next_reminder_at, id LIMIT ?`,
    )
    .bind(sada, najvise)
    .all<{ id: string }>();
  const out: IshodPodsjetnika[] = [];
  for (const r of results) {
    const i = await posaljiPodsjetnik(db, r.id, sada);
    if (i) out.push(i);
  }
  return out;
}

// --- Stranica podsjetnika (T) ----------------------------------------------------------------------------

export interface Podsjetnik {
  id: string;
  period: string;
  rok: number;
  istekao: boolean;
  checkoutId: string | null;
  obecanje: {
    id: string;
    status: StanjeObecanja;
    nacin: Nacin;
    dan: number;
    iznosCenti: number;
    sljedeci: number | null;
    userId: string;
    email: string;
    ime: string;
  };
  kampanja: { id: string; publicId: string; naslov: string };
}

/** Podsjetnik po tokenu iz poveznice; null = nepoznat token. Istekli se vraća s `istekao` (stranica to kaže). */
export async function podsjetnikPoTokenu(db: D1Database, token: string, sad: number): Promise<Podsjetnik | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const r = await db
    .prepare(
      `SELECT x.id, x.period, x.expires_at, x.checkout_id, r.id AS pid, r.status, r.mode, r.day_of_month, r.amount_cents, r.next_reminder_at,
              r.user_id, u.email, COALESCE(u.display_name, '') AS ime, c.id AS cid, s.public_id, c.title
         FROM recurring_reminders x JOIN recurring_pledges r ON r.id = x.pledge_id JOIN users u ON u.id = r.user_id
         JOIN campaigns c ON c.id = r.campaign_id JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE x.token_hash = ?`,
    )
    .bind(await hashTokena(token))
    .first<{
      id: string; period: string; expires_at: number; checkout_id: string | null; pid: string; status: StanjeObecanja; mode: Nacin;
      day_of_month: number; amount_cents: number; next_reminder_at: number | null; user_id: string; email: string; ime: string;
      cid: string; public_id: string; title: string;
    }>();
  if (!r) return null;
  return {
    id: r.id,
    period: r.period,
    rok: r.expires_at,
    istekao: r.expires_at <= sad,
    checkoutId: r.checkout_id,
    obecanje: {
      id: r.pid, status: r.status, nacin: r.mode, dan: r.day_of_month, iznosCenti: r.amount_cents, sljedeci: r.next_reminder_at,
      userId: r.user_id, email: r.email, ime: r.ime,
    },
    kampanja: { id: r.cid, publicId: r.public_id, naslov: r.title },
  };
}

export type RadnjaPodsjetnika = "pauza" | "nastavak" | "odjava";

/** Pauza, nastavak i odjava s poveznice (vrijede i nakon roka poveznice: odjava ne smije ovisiti o roku). */
export async function promijeniPoTokenu(db: D1Database, token: string, radnja: RadnjaPodsjetnika, sad: number): Promise<boolean> {
  const p = await podsjetnikPoTokenu(db, token, sad);
  if (!p) return false;
  const id = p.obecanje.id;
  const sql = {
    pauza: "UPDATE recurring_pledges SET status = 'paused', next_reminder_at = NULL, updated_at = ?1 WHERE id = ?2 AND status = 'active'",
    nastavak: "UPDATE recurring_pledges SET status = 'active', missed_count = 0, updated_at = ?1 WHERE id = ?2 AND status = 'paused'",
    odjava: "UPDATE recurring_pledges SET status = 'cancelled', cancelled_at = ?1, next_reminder_at = NULL, updated_at = ?1 WHERE id = ?2 AND status <> 'cancelled'",
  }[radnja];
  const r = await db.prepare(sql).bind(sad, id).run();
  const promijenjeno = Number((r.meta as { changes?: number }).changes ?? 0) > 0;
  if (promijenjeno && radnja === "nastavak") await preracunajTermin(db, id, sad);
  return promijenjeno;
}

export type RezultatPlacanja =
  | { ok: true; checkoutId: string; publicId: string }
  | { ok: false; razlog: "istekao" | "otkazano" | Extract<RezultatCheckouta, { ok: false }>["razlog"] };

/**
 * „Plati ovaj mjesec”: postojeći otvoreni checkout ovog podsjetnika (isti intent, rok nije prošao) ili novi
 * intent istim klijentom kao checkout (`stvoriCheckout` s `recurring_pledge_id`). Prikaz na popisu podržavatelja
 * (ime, iznos) preuzima se iz prvog checkouta obećanja.
 */
export async function platiPodsjetnik(
  db: D1Database,
  k: MptKonfig,
  token: string,
  povratniUrl: (checkoutId: string, publicId: string) => string,
  sad: number,
  dohvat?: DohvatFn,
): Promise<RezultatPlacanja | null> {
  const p = await podsjetnikPoTokenu(db, token, sad);
  if (!p) return null;
  if (p.istekao) return { ok: false, razlog: "istekao" };
  if (p.obecanje.status === "cancelled") return { ok: false, razlog: "otkazano" };
  if (p.checkoutId) {
    const otvoren = await db
      .prepare(
        `SELECT 1 AS da FROM checkouts ch JOIN contributions d ON d.payment_intent_sid = ch.contribution_sid
          WHERE ch.id = ? AND ((ch.intent_state = 'open' AND ch.expires_at > ?) OR d.state IN ('paid','refunded'))`,
      )
      .bind(p.checkoutId, sad)
      .first();
    if (otvoren) return { ok: true, checkoutId: p.checkoutId, publicId: p.kampanja.publicId };
  }
  const prikaz = await db
    .prepare(
      `SELECT COALESCE(cp.anonymous, 0) AS anonimno, COALESCE(a.amount_hidden, 0) AS skriven
         FROM checkouts ch JOIN contributions d ON d.payment_intent_sid = ch.contribution_sid
         LEFT JOIN contribution_profiles cp ON cp.contribution_id = d.id
         LEFT JOIN contribution_attributions a ON a.contribution_id = d.id
        WHERE ch.recurring_pledge_id = ? ORDER BY ch.created_at LIMIT 1`,
    )
    .bind(p.obecanje.id)
    .first<{ anonimno: number; skriven: number }>();
  const podaci: CistiCheckout = {
    iznosCenti: p.obecanje.iznosCenti,
    poruka: null,
    prikaziKaoKomentar: false,
    skrijIme: prikaz?.anonimno === 1,
    skrijIznos: prikaz?.skriven === 1,
    email: p.obecanje.email,
    ime: null,
    prezime: null,
    kaoTvrtka: false,
    tvrtka: null,
    oib: null,
  };
  const r = await stvoriCheckout(
    db,
    k,
    {
      publicId: p.kampanja.publicId,
      podaci,
      korisnik: { id: p.obecanje.userId, email: p.obecanje.email, ime: p.obecanje.ime },
      ponavljanjeId: p.obecanje.id,
      povratniUrl: (id) => povratniUrl(id, p.kampanja.publicId),
      sad,
    },
    dohvat,
  );
  if (!r.ok) return { ok: false, razlog: r.razlog };
  await db.prepare("UPDATE recurring_reminders SET checkout_id = ? WHERE id = ?").bind(r.checkoutId, p.id).run();
  return { ok: true, checkoutId: r.checkoutId, publicId: p.kampanja.publicId };
}

// --- Prikaz (postavke, checkout) -------------------------------------------------------------------------

export interface MockPodsjetnik {
  pledgeId: string;
  token: string;
  period: string;
  poslano: number;
  rok: number;
}

/** Zadnja mock e-poruka podsjetnika po obećanju (za postavke): token je u payloadu poruke. */
export async function zadnjiPodsjetnici(db: D1Database, userId: string): Promise<Map<string, MockPodsjetnik>> {
  const { results } = await db
    .prepare(
      `SELECT x.pledge_id, x.period, x.expires_at, n.payload, n.created_at
         FROM recurring_reminders x JOIN notifications n ON n.id = x.notification_id
         JOIN recurring_pledges r ON r.id = x.pledge_id
        WHERE r.user_id = ? ORDER BY x.period DESC, x.created_at DESC`,
    )
    .bind(userId)
    .all<{ pledge_id: string; period: string; expires_at: number; payload: string; created_at: number }>();
  const out = new Map<string, MockPodsjetnik>();
  for (const r of results) {
    if (out.has(r.pledge_id)) continue;
    const token = (JSON.parse(r.payload) as { token?: string }).token;
    if (token) out.set(r.pledge_id, { pledgeId: r.pledge_id, token, period: r.period, poslano: r.created_at, rok: r.expires_at });
  }
  return out;
}

export interface ObecanjeCheckouta {
  id: string;
  nacin: Nacin;
  dan: number;
  iznosCenti: number;
  status: StanjeObecanja;
  sljedeci: number | null;
}

/** Obećanje kojem pripada checkout (stranica plaćanja prikazuje način i uputu za trajni nalog). */
export async function obecanjeCheckouta(db: D1Database, checkoutId: string): Promise<ObecanjeCheckouta | null> {
  const r = await db
    .prepare(
      `SELECT r.id, r.mode, r.day_of_month, r.amount_cents, r.status, r.next_reminder_at
         FROM checkouts ch JOIN recurring_pledges r ON r.id = ch.recurring_pledge_id WHERE ch.id = ?`,
    )
    .bind(checkoutId)
    .first<{ id: string; mode: Nacin; day_of_month: number; amount_cents: number; status: StanjeObecanja; next_reminder_at: number | null }>();
  return r ? { id: r.id, nacin: r.mode, dan: r.day_of_month, iznosCenti: r.amount_cents, status: r.status, sljedeci: r.next_reminder_at } : null;
}
