/**
 * Uplata kroz MPT (S7, odluke 705–708): jedan put za webhook i pull.
 *
 * `primijeniDogadaj` je jedino mjesto koje mijenja `contributions`, `checkouts.intent_state`, `tips` i
 * `campaign_stats` zbog uplate. Webhook (`POST /webhooks/mpt`) mu daje događaj iz tijela, pull
 * (`uskladiIntent`) izvodi isti događaj iz stanja intenta na railu (`GET /v1/intents/:sid`).
 *
 * Idempotencija:
 *  - webhook: `webhook_receipts` `INSERT … ON CONFLICT(webhook_id) DO NOTHING`; ponovljeni `webhook-id` čija
 *    je obrada završena (`processed_at`) ne mijenja ništa;
 *  - prijelaz: svaki `UPDATE` ima uvjet na polazno stanje (`WHERE state = 'pending'` …), a `campaign_stats` se
 *    mijenja u ISTOM `db.batch` (transakcija), uvjetovan istim polaznim stanjem i izveden PRIJE `UPDATE`-a
 *    doprinosa. D1 izvodi batch serijski, pa od webhooka i pulla istog intenta statistiku mijenja samo prvi.
 *
 * Preslikavanje (odluka 707, docs/05 „Doprinos”):
 *
 *   događaj             doprinos (iz)              checkout/napojnica (iz)          stats
 *   intent.paid         paid (pending)             paid (open)                      da
 *   payment.late        paid (pending, expired)    late (open, expired)             da
 *   payment.underpaid   paid, underpaid=1 (pend.)  underpaid (open)                 da, primljeni iznos
 *   underpaid.expired*  paid, underpaid=1 (pend.)  underpaid_expired (open, underp.) da (ako već nije)
 *   payment.rejected    failed (pending)           rejected (open)                  ne
 *   intent.expired*     expired (pending)          expired (open)                   ne
 *   payment.received    —                          —                                ne (samo događaj)
 *   * samo iz pulla (rail nema taj webhook)
 *
 * Napojnica (odluka 708) piše samo u `tips`, nikad u `contributions` ni `campaign_stats`.
 *
 * Podržavatelj (`contributor_count`): doprinos je novi podržavatelj kampanje ako u njoj nema drugog
 * PLAĆENOG doprinosa s istim `payer_iban_hash` (kad su oba poznata), istom e-poštom checkouta (bez obzira
 * na velika slova) ili istim prijavljenim korisnikom. Seed broji po `payer_iban_hash` (scripts/seed.mjs).
 *
 * Sirovi IBAN uplatitelja se nikad ne sprema: `payer_iban_hash` je HMAC-SHA256 (s tajnom) ili SHA-256 s
 * prefiksom domene (bez tajne), hex.
 */
import { izjavePriPlacanju } from "./obavijesti";
import { dohvatiIntent, type DohvatFn, type MptFaza, type MptIntent, type MptKonfig } from "../mpt/klijent";

/** Vrste webhooka raila (CHECK u `webhook_receipts.event_type`). */
export const VRSTE_WEBHOOKA = [
  "payment.received",
  "intent.paid",
  "payment.late",
  "payment.underpaid",
  "payment.rejected",
  "contribution.sepa",
  "forward.blocked",
] as const;
export type VrstaWebhooka = (typeof VRSTE_WEBHOOKA)[number];

/** Uz webhook vrste, dvije koje izvodi samo pull. */
export type VrstaDogadaja = VrstaWebhooka | "intent.expired" | "underpaid.expired";

export interface DogadajUplate {
  vrsta: VrstaDogadaja;
  /** `webhook-id`; `null` za događaj izveden pullom. */
  webhookId: string | null;
  sid: string | null;
  moneriumOrderId: string | null;
  /** Primljeni iznos u centima, ako ga rail javlja. */
  primljenoCenti: number | null;
  /** ms od epohe. */
  placenoU: number | null;
  /** Samo za hash; nikad se ne sprema sirov. */
  senderIban: string | null;
  faza: MptFaza | null;
}

export type Ishod = "primijenjeno" | "bez_promjene" | "duplikat" | "nepoznat_sid" | "zabiljezeno";

export interface IshodPrimjene {
  ishod: Ishod;
  cilj: "doprinos" | "napojnica" | null;
  /** Je li ovaj poziv doprinos preveo u `paid` (i promijenio `campaign_stats`). */
  prijelazUPlaceno: boolean;
}

export interface OpcijeUplate {
  /** Tajna za HMAC IBAN-a; bez nje SHA-256 s prefiksom domene. */
  ibanTajna?: string;
}

// ---------------------------------------------------------------- izvođenje događaja

const broj = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const tekst = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/** Vrijeme iz raila: ISO string ili Unix sekunde (red intenta) ili ms → ms. */
export function vrijemeRaila(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v < 1e12 ? v * 1000 : v;
  if (typeof v === "string" && v) {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

/** Tijelo webhooka → događaj; `null` za vrstu koju ne poznajemo. */
export function dogadajIzWebhooka(webhookId: string, tijelo: unknown): DogadajUplate | null {
  const j = (tijelo && typeof tijelo === "object" ? tijelo : {}) as Record<string, unknown>;
  const vrsta = tekst(j.type);
  if (!vrsta || !(VRSTE_WEBHOOKA as readonly string[]).includes(vrsta)) return null;
  return {
    vrsta: vrsta as VrstaWebhooka,
    webhookId,
    sid: tekst(j.sid),
    moneriumOrderId: tekst(j.monerium_order_id),
    primljenoCenti: broj(j.amount_received_cents) ?? broj(j.received_cents),
    placenoU: vrijemeRaila(j.paid_at),
    senderIban: tekst(j.sender_iban),
    faza: null,
  };
}

/**
 * Stanje intenta na railu → događaj koji bi webhook javio (pull). `null` kad nema što primijeniti
 * (čeka uplatu ili je novac tek primljen).
 */
export function dogadajIzIntenta(i: MptIntent): DogadajUplate | null {
  const baza = {
    webhookId: null,
    sid: i.sid,
    moneriumOrderId: null,
    primljenoCenti: i.amountReceivedCents,
    placenoU: i.paidAt,
    senderIban: null,
    faza: i.stage,
  };
  const primljeno = i.amountReceivedCents ?? 0;
  if (i.stage === "rejected") return { ...baza, vrsta: "payment.rejected" };
  if (i.state === "paid") {
    const kasno = i.paidAt !== null && i.expiresAt !== null && i.paidAt > i.expiresAt;
    return { ...baza, vrsta: kasno ? "payment.late" : "intent.paid" };
  }
  if (i.state === "expired" || i.state === "cancelled") {
    if (i.paidAt !== null) return { ...baza, vrsta: "payment.late" };
    if (primljeno > 0) return { ...baza, vrsta: "underpaid.expired" };
    return { ...baza, vrsta: "intent.expired" };
  }
  if (i.amountReceivedCents !== null && i.amountReceivedCents < i.amountCents) return { ...baza, vrsta: "payment.underpaid" };
  return null;
}

// ---------------------------------------------------------------- IBAN

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

/** Normalizirani IBAN → hex HMAC-SHA256 (s tajnom) ili SHA-256 (`crowdfund:iban:v1:` + IBAN). */
export async function hashIbana(iban: string, tajna?: string): Promise<string | null> {
  const n = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(n)) return null;
  if (tajna) {
    const k = await crypto.subtle.importKey("raw", enc.encode(tajna), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return hex(await crypto.subtle.sign("HMAC", k, enc.encode(n)));
  }
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(`crowdfund:iban:v1:${n}`)));
}

// ---------------------------------------------------------------- primjena

interface Prijelaz {
  /** Stanje intenta checkouta/napojnice nakon događaja i stanja iz kojih se smije prijeći. */
  intent: { u: string; iz: readonly string[] };
  /** Stanje doprinosa nakon događaja; `null` = doprinos se ne mijenja. */
  doprinos: { u: "paid" | "failed" | "expired"; iz: readonly string[]; underpaid: 0 | 1 } | null;
}

const PRIJELAZI: Partial<Record<VrstaDogadaja, Prijelaz>> = {
  "intent.paid": { intent: { u: "paid", iz: ["open"] }, doprinos: { u: "paid", iz: ["pending"], underpaid: 0 } },
  "payment.late": { intent: { u: "late", iz: ["open", "expired"] }, doprinos: { u: "paid", iz: ["pending", "expired"], underpaid: 0 } },
  "payment.underpaid": { intent: { u: "underpaid", iz: ["open"] }, doprinos: { u: "paid", iz: ["pending"], underpaid: 1 } },
  "underpaid.expired": {
    intent: { u: "underpaid_expired", iz: ["open", "underpaid"] },
    doprinos: { u: "paid", iz: ["pending"], underpaid: 1 },
  },
  "payment.rejected": { intent: { u: "rejected", iz: ["open"] }, doprinos: { u: "failed", iz: ["pending"], underpaid: 0 } },
  "intent.expired": { intent: { u: "expired", iz: ["open"] }, doprinos: { u: "expired", iz: ["pending"], underpaid: 0 } },
};

const u = (stanja: readonly string[]) => stanja.map((s) => `'${s}'`).join(", ");

interface RedDoprinosa {
  id: string;
  campaign_id: string;
  amount_cents: number;
  checkout_id: string | null;
  email: string | null;
  user_id: string | null;
}

interface RedNapojnice {
  id: string;
  amount_cents: number;
}

async function zavrsiPotvrdu(db: D1Database, webhookId: string | null, sad: number, greska: string | null): Promise<void> {
  if (!webhookId) return;
  await db.prepare("UPDATE webhook_receipts SET processed_at = ?, error = ? WHERE webhook_id = ?").bind(sad, greska, webhookId).run();
}

const promjene = (r: D1Result | undefined): number => Number((r?.meta as { changes?: number } | undefined)?.changes ?? 0);

/**
 * Primijeni događaj uplate (webhook ili pull). `sad` je ms od epohe.
 * Nepoznat sid: webhook se bilježi s `error = 'nepoznat_sid'` (rail dobiva 200, ne ponavlja).
 */
export async function primijeniDogadaj(
  db: D1Database,
  d: DogadajUplate,
  sad: number,
  opcije: OpcijeUplate = {},
): Promise<IshodPrimjene> {
  const nista = (ishod: Ishod, cilj: IshodPrimjene["cilj"] = null): IshodPrimjene => ({ ishod, cilj, prijelazUPlaceno: false });

  if (d.webhookId) {
    const upis = await db
      .prepare(
        `INSERT INTO webhook_receipts (webhook_id, event_type, sid, monerium_order_id, received_at)
         VALUES (?, ?, ?, ?, ?) ON CONFLICT(webhook_id) DO NOTHING`,
      )
      .bind(d.webhookId, d.vrsta, d.sid, d.moneriumOrderId, sad)
      .run();
    if (promjene(upis) === 0) {
      // Ponovljeni webhook. Ako prethodna obrada nije završila (pad između zapisa i batcha), ponovi je:
      // prijelazi su uvjetni, pa ponavljanje ne duplicira.
      const bio = await db.prepare("SELECT processed_at FROM webhook_receipts WHERE webhook_id = ?").bind(d.webhookId).first<{ processed_at: number | null }>();
      if (bio?.processed_at != null) return nista("duplikat");
    }
  }

  // Trajni QR (contribution.sepa) i blokirano prosljeđivanje nisu S7: samo zapis.
  if (d.vrsta === "contribution.sepa" || d.vrsta === "forward.blocked") {
    await zavrsiPotvrdu(db, d.webhookId, sad, null);
    return nista("zabiljezeno");
  }
  if (!d.sid) {
    await zavrsiPotvrdu(db, d.webhookId, sad, "bez_sida");
    return nista("nepoznat_sid");
  }

  const doprinos = await db
    .prepare(
      `SELECT d.id, d.campaign_id, d.amount_cents, ch.id AS checkout_id, ch.email, ch.user_id
         FROM contributions d LEFT JOIN checkouts ch ON ch.contribution_sid = d.payment_intent_sid
        WHERE d.payment_intent_sid = ?`,
    )
    .bind(d.sid)
    .first<RedDoprinosa>();
  if (doprinos) return primijeniNaDoprinos(db, d, doprinos, sad, opcije);

  const napojnica = await db.prepare("SELECT id, amount_cents FROM tips WHERE sid = ?").bind(d.sid).first<RedNapojnice>();
  if (napojnica) return primijeniNaNapojnicu(db, d, napojnica, sad);

  await zavrsiPotvrdu(db, d.webhookId, sad, "nepoznat_sid");
  return nista("nepoznat_sid");
}

function payloadDogadaja(d: DogadajUplate): string {
  return JSON.stringify({
    izvor: d.webhookId ? "webhook" : "pull",
    webhook_id: d.webhookId,
    monerium_order_id: d.moneriumOrderId,
    amount_received_cents: d.primljenoCenti,
    paid_at: d.placenoU,
    stage: d.faza,
  });
}

async function primijeniNaDoprinos(
  db: D1Database,
  d: DogadajUplate,
  r: RedDoprinosa,
  sad: number,
  opcije: OpcijeUplate,
): Promise<IshodPrimjene> {
  const p = PRIJELAZI[d.vrsta];
  const izjave: D1PreparedStatement[] = [];
  const pull = d.webhookId === null;

  // Događaj: webhook uvijek (dedupe je na webhook_receipts); pull samo kad nešto prelazi.
  const uvjetDogadaja = !p
    ? "1"
    : pull
      ? `(EXISTS (SELECT 1 FROM contributions WHERE id = ?1 AND state IN (${u(p.doprinos?.iz ?? [])}))
          OR EXISTS (SELECT 1 FROM checkouts WHERE id = ?2 AND intent_state IN (${u(p.intent.iz)})))`
      : "1";
  if (!pull || p) {
    izjave.push(
      db
        .prepare(
          `INSERT INTO contribution_events (contribution_id, campaign_id, event_type, payload, created_at)
           SELECT ?1, ?3, ?4, ?5, ?6 WHERE ${uvjetDogadaja}`,
        )
        .bind(r.id, r.checkout_id, r.campaign_id, d.vrsta, payloadDogadaja(d), sad),
    );
  }

  let indeksDoprinosa = -1;
  if (p?.doprinos) {
    const dp = p.doprinos;
    if (dp.u === "paid") {
      const primljeno = d.primljenoCenti ?? r.amount_cents;
      const placeno = d.placenoU ?? sad;
      const ibanHash = d.senderIban ? await hashIbana(d.senderIban, opcije.ibanTajna) : null;
      // Statistika PRIJE prijelaza i pod istim uvjetom (doprinos još u polaznom stanju).
      izjave.push(
        db
          .prepare(
            `INSERT INTO campaign_stats (campaign_id, raised_cents, contribution_count, contributor_count, last_contribution_at, updated_at)
             VALUES (?, 0, 0, 0, NULL, ?) ON CONFLICT(campaign_id) DO NOTHING`,
          )
          .bind(r.campaign_id, sad),
        db
          .prepare(
            `UPDATE campaign_stats
                SET raised_cents = raised_cents + ?1,
                    contribution_count = contribution_count + 1,
                    contributor_count = contributor_count + (CASE WHEN EXISTS (
                      SELECT 1 FROM contributions d2 LEFT JOIN checkouts c2 ON c2.contribution_sid = d2.payment_intent_sid
                       WHERE d2.campaign_id = ?2 AND d2.state = 'paid' AND d2.id <> ?3
                         AND ((?4 IS NOT NULL AND d2.payer_iban_hash = ?4)
                           OR (?5 IS NOT NULL AND c2.email = ?5 COLLATE NOCASE)
                           OR (?6 IS NOT NULL AND c2.user_id = ?6))) THEN 0 ELSE 1 END),
                    last_contribution_at = max(COALESCE(last_contribution_at, 0), ?7),
                    updated_at = ?8
              WHERE campaign_id = ?2
                AND EXISTS (SELECT 1 FROM contributions WHERE id = ?3 AND state IN (${u(dp.iz)}))`,
          )
          .bind(primljeno, r.campaign_id, r.id, ibanHash, r.email, r.user_id, placeno, sad),
        // S8: komentar iz poruke i mock e-poruka organizatoru, pod istim uvjetom (doprinos još u polaznom stanju).
        ...izjavePriPlacanju(db, r.id, dp.iz, primljeno, sad),
      );
      indeksDoprinosa = izjave.length;
      izjave.push(
        db
          .prepare(
            `UPDATE contributions
                SET state = 'paid', amount_received_cents = ?, underpaid = ?, paid_at = ?,
                    monerium_order_id = COALESCE(monerium_order_id, ?),
                    payer_iban_hash = COALESCE(payer_iban_hash, ?), updated_at = ?
              WHERE id = ? AND state IN (${u(dp.iz)})`,
          )
          .bind(primljeno, dp.underpaid, placeno, d.moneriumOrderId, ibanHash, sad, r.id),
      );
    } else {
      indeksDoprinosa = izjave.length;
      izjave.push(
        db
          .prepare(`UPDATE contributions SET state = ?, updated_at = ? WHERE id = ? AND state IN (${u(dp.iz)})`)
          .bind(dp.u, sad, r.id),
      );
    }
  }

  let indeksCheckouta = -1;
  if (p && r.checkout_id) {
    indeksCheckouta = izjave.length;
    izjave.push(
      db
        .prepare(`UPDATE checkouts SET intent_state = ?, updated_at = ? WHERE id = ? AND intent_state IN (${u(p.intent.iz)})`)
        .bind(p.intent.u, sad, r.checkout_id),
    );
  }
  if (d.webhookId) {
    izjave.push(db.prepare("UPDATE webhook_receipts SET processed_at = ?, error = NULL WHERE webhook_id = ?").bind(sad, d.webhookId));
  }

  const rez = izjave.length ? await db.batch(izjave) : [];
  const doprinosPromijenjen = indeksDoprinosa >= 0 && promjene(rez[indeksDoprinosa]) > 0;
  const checkoutPromijenjen = indeksCheckouta >= 0 && promjene(rez[indeksCheckouta]) > 0;
  return {
    ishod: doprinosPromijenjen || checkoutPromijenjen ? "primijenjeno" : "bez_promjene",
    cilj: "doprinos",
    prijelazUPlaceno: doprinosPromijenjen && p?.doprinos?.u === "paid",
  };
}

async function primijeniNaNapojnicu(db: D1Database, d: DogadajUplate, t: RedNapojnice, sad: number): Promise<IshodPrimjene> {
  const p = PRIJELAZI[d.vrsta];
  const izjave: D1PreparedStatement[] = [];
  let indeks = -1;
  if (p) {
    const placeno = p.doprinos?.u === "paid";
    indeks = 0;
    izjave.push(
      db
        .prepare(
          `UPDATE tips SET intent_state = ?, amount_received_cents = COALESCE(?, amount_received_cents),
                  paid_at = COALESCE(paid_at, ?), updated_at = ?
            WHERE id = ? AND intent_state IN (${u(p.intent.iz)})`,
        )
        .bind(
          p.intent.u,
          placeno ? (d.primljenoCenti ?? t.amount_cents) : null,
          placeno ? (d.placenoU ?? sad) : null,
          sad,
          t.id,
        ),
    );
  }
  if (d.webhookId) {
    izjave.push(db.prepare("UPDATE webhook_receipts SET processed_at = ?, error = NULL WHERE webhook_id = ?").bind(sad, d.webhookId));
  }
  const rez = izjave.length ? await db.batch(izjave) : [];
  return { ishod: indeks >= 0 && promjene(rez[indeks]) > 0 ? "primijenjeno" : "bez_promjene", cilj: "napojnica", prijelazUPlaceno: false };
}

// ---------------------------------------------------------------- pull i stanje

/** Pull jednog intenta: pročitaj rail, izvedi događaj i primijeni ga. Vraća intent (ili `null` za 404). */
export async function uskladiIntent(
  db: D1Database,
  k: MptKonfig,
  sid: string,
  dohvat: DohvatFn = fetch,
  sad: number = Date.now(),
  opcije: OpcijeUplate = {},
): Promise<MptIntent | null> {
  const intent = await dohvatiIntent(k, sid, dohvat);
  if (!intent) return null;
  const d = dogadajIzIntenta(intent);
  if (d) await primijeniDogadaj(db, d, sad, opcije);
  return intent;
}

export type StanjeIntenta = "open" | "underpaid" | "paid" | "expired" | "late" | "underpaid_expired" | "rejected";

export interface StanjeCheckouta {
  checkout: { id: string; state: StanjeIntenta };
  /** `state` je `contributions.state` (pending/paid/failed/expired/refunded). */
  doprinos: { sid: string; state: string; faza: MptFaza | null };
  /** `state` je `tips.intent_state` (kao `checkout.state`). */
  napojnica: { sid: string; state: StanjeIntenta; faza: MptFaza | null } | null;
}

/** Stanje intenta koje se više ne mijenja (pull ga ne treba). */
export const ZAVRSNA_STANJA: readonly StanjeIntenta[] = ["paid", "late", "underpaid_expired", "rejected"];

/** Faza koja se iz baze zna sigurno (završna stanja); inače `null`. */
function fazaIzBaze(s: StanjeIntenta): MptFaza | null {
  if (s === "paid" || s === "late" || s === "underpaid_expired") return "settled";
  if (s === "rejected") return "rejected";
  return null;
}

/** Stanje checkouta, doprinosa i napojnice iz baze; `null` za nepoznat checkout. */
export async function stanjeCheckouta(db: D1Database, checkoutId: string): Promise<StanjeCheckouta | null> {
  const r = await db
    .prepare(
      `SELECT ch.id, ch.intent_state, ch.contribution_sid, d.state AS d_state, t.sid AS t_sid, t.intent_state AS t_state
         FROM checkouts ch
         LEFT JOIN contributions d ON d.payment_intent_sid = ch.contribution_sid
         LEFT JOIN tips t ON t.checkout_id = ch.id
        WHERE ch.id = ?`,
    )
    .bind(checkoutId)
    .first<{ id: string; intent_state: StanjeIntenta; contribution_sid: string; d_state: string | null; t_sid: string | null; t_state: StanjeIntenta | null }>();
  if (!r) return null;
  return {
    checkout: { id: r.id, state: r.intent_state },
    doprinos: { sid: r.contribution_sid, state: r.d_state ?? "pending", faza: fazaIzBaze(r.intent_state) },
    napojnica: r.t_sid && r.t_state ? { sid: r.t_sid, state: r.t_state, faza: fazaIzBaze(r.t_state) } : null,
  };
}

/**
 * Pull za doprinos i napojnicu koji nisu u završnom stanju, pa stanje iz baze s fazama s raila.
 * Greška raila (mreža, 5xx) ne ruši odgovor: ostaje stanje iz baze.
 */
export async function uskladiCheckout(
  db: D1Database,
  k: MptKonfig,
  checkoutId: string,
  dohvat: DohvatFn = fetch,
  sad: number = Date.now(),
  opcije: OpcijeUplate = {},
): Promise<StanjeCheckouta | null> {
  const prije = await stanjeCheckouta(db, checkoutId);
  if (!prije) return null;
  const pull = async (sid: string, stanje: StanjeIntenta): Promise<MptFaza | null> => {
    if (ZAVRSNA_STANJA.includes(stanje)) return null;
    try {
      return (await uskladiIntent(db, k, sid, dohvat, sad, opcije))?.stage ?? null;
    } catch {
      return null;
    }
  };
  const fazaDoprinosa = await pull(prije.doprinos.sid, prije.checkout.state);
  const fazaNapojnice = prije.napojnica ? await pull(prije.napojnica.sid, prije.napojnica.state) : null;
  const poslije = (await stanjeCheckouta(db, checkoutId))!;
  if (fazaDoprinosa) poslije.doprinos.faza = fazaDoprinosa;
  if (poslije.napojnica && fazaNapojnice) poslije.napojnica.faza = fazaNapojnice;
  return poslije;
}
