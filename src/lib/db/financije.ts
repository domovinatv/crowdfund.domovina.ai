/**
 * Financije kampanje (S6, `campaign.manage.finances`, `…/financije.csv`, `campaign.manage.refunds`).
 * Pristup je U:viewer i više, pa organizator vidi i anonimne doprinose s imenom i e-poštom iz checkouta
 * (kao 4fund izvoz, javni pregled §4.4). IBAN uplatitelja platforma nema (samo HMAC), pa ga nema ni ovdje.
 *
 * Povrat (odluka 210, docs/04 tok 11): platforma ništa ne vraća. Organizator zapisuje svoju odlaznu transakciju
 * (Safe tx ili bankovnu referencu), a kad je zapis potvrđen doprinos postaje `refunded` i `campaign_stats` se
 * umanjuje. U prototipu potvrda je ručna (mock provjere lanca).
 */
import { uuid7 } from "./zajednicko";

export type StanjeDoprinosa = "pending" | "paid" | "failed" | "refunded" | "expired";
export type StanjeIntenta = "open" | "underpaid" | "paid" | "expired" | "late" | "underpaid_expired" | "rejected";

export interface RedakFinancija {
  id: string;
  createdAt: number;
  paidAt: number | null;
  /** Ime iz profila doprinosa (ili checkouta); organizator ga vidi i kad je doprinos javno anoniman. */
  ime: string | null;
  anonimno: boolean;
  tvrtka: string | null;
  email: string | null;
  amountCents: number;
  receivedCents: number | null;
  stanje: StanjeDoprinosa;
  /** Logičko stanje MPT intenta iz checkouta; null za trajni QR (`contribution.sepa`). */
  stanjeIntenta: StanjeIntenta | null;
  underpaid: boolean;
  kanal: "sepa" | "onchain" | "card";
  izvor: "checkout" | "campaign_qr" | "moneybox_qr" | null;
  kasica: string | null;
  link: string | null;
  dijeljenje: boolean;
  poruka: string | null;
  referenca: string | null;
  povrat: { id: string; status: "recorded" | "confirmed" } | null;
}

export const FILTRI_STANJA = ["all", "paid", "pending", "refunded", "other"] as const;
export type FiltarStanja = (typeof FILTRI_STANJA)[number];

/** Svi doprinosi kampanje, od najnovijeg; `filtar` sužava po stanju (`other` = failed + expired). */
export async function financijeKampanje(db: D1Database, campaignId: string, filtar: FiltarStanja = "all"): Promise<RedakFinancija[]> {
  const uvjet = {
    all: "",
    paid: "AND d.state = 'paid'",
    pending: "AND d.state = 'pending'",
    refunded: "AND d.state = 'refunded'",
    other: "AND d.state IN ('failed','expired')",
  }[filtar];
  const { results } = await db
    .prepare(
      `SELECT d.id, d.created_at, d.paid_at, d.amount_cents, d.amount_received_cents, d.state, d.underpaid, d.payment_rail,
              cp.anonymous, cp.display_name, cp.message, ch.email, ch.first_name, ch.last_name, ch.as_company, ch.company_name,
              ch.intent_state, ch.short_ref, a.source, m.alias AS kasica, l.slug AS link, a.share_link_id,
              (SELECT r.id FROM refunds r WHERE r.contribution_id = d.id ORDER BY r.created_at DESC LIMIT 1) AS povrat_id,
              (SELECT r.status FROM refunds r WHERE r.contribution_id = d.id ORDER BY r.created_at DESC LIMIT 1) AS povrat_status
         FROM contributions d
         LEFT JOIN contribution_profiles cp ON cp.contribution_id = d.id
         LEFT JOIN contribution_attributions a ON a.contribution_id = d.id
         LEFT JOIN checkouts ch ON ch.id = a.checkout_id
         LEFT JOIN moneyboxes m ON m.id = a.moneybox_id
         LEFT JOIN tracking_links l ON l.id = a.tracking_link_id
        WHERE d.campaign_id = ? ${uvjet}
        ORDER BY COALESCE(d.paid_at, d.created_at) DESC, d.id`,
    )
    .bind(campaignId)
    .all<{
      id: string; created_at: number; paid_at: number | null; amount_cents: number; amount_received_cents: number | null;
      state: StanjeDoprinosa; underpaid: number; payment_rail: RedakFinancija["kanal"]; anonymous: number | null; display_name: string | null;
      message: string | null; email: string | null; first_name: string | null; last_name: string | null; as_company: number | null;
      company_name: string | null; intent_state: StanjeIntenta | null; short_ref: string | null; source: RedakFinancija["izvor"];
      kasica: string | null; link: string | null; share_link_id: string | null; povrat_id: string | null; povrat_status: "recorded" | "confirmed" | null;
    }>();
  return results.map((r) => {
    const izCheckouta = [r.first_name, r.last_name].filter(Boolean).join(" ") || null;
    return {
      id: r.id,
      createdAt: r.created_at,
      paidAt: r.paid_at,
      ime: r.display_name ?? izCheckouta,
      anonimno: r.anonymous !== 0,
      tvrtka: r.as_company === 1 ? r.company_name : null,
      email: r.email,
      amountCents: r.amount_cents,
      receivedCents: r.amount_received_cents,
      stanje: r.state,
      stanjeIntenta: r.intent_state,
      underpaid: r.underpaid === 1,
      kanal: r.payment_rail,
      izvor: r.source,
      kasica: r.kasica,
      link: r.link,
      dijeljenje: r.share_link_id !== null,
      poruka: r.message,
      referenca: r.short_ref,
      povrat: r.povrat_id ? { id: r.povrat_id, status: r.povrat_status! } : null,
    };
  });
}

/** Zbroj za zaglavlje financija (stvarni, bez skrivanja). */
export function zbrojFinancija(redovi: RedakFinancija[]): { placeno: number; brojPlacenih: number; vraceno: number; naCekanju: number } {
  let placeno = 0, brojPlacenih = 0, vraceno = 0, naCekanju = 0;
  for (const r of redovi) {
    if (r.stanje === "paid") { placeno += r.receivedCents ?? 0; brojPlacenih++; }
    else if (r.stanje === "refunded") vraceno += r.receivedCents ?? 0;
    else if (r.stanje === "pending") naCekanju++;
  }
  return { placeno, brojPlacenih, vraceno, naCekanju };
}

// --- CSV ------------------------------------------------------------------------------------------------

/**
 * Polje CSV-a (RFC 4180): navodnici oko polja sa zarezom, točkom-zarezom, navodnikom ili novim redom, navodnik
 * udvostručen. Polje koje počinje s `= + - @` ili tabom dobiva vodeći apostrof (CSV injection u Excelu);
 * brojevi se ne diraju.
 */
export function csvPolje(x: string | number | null | undefined): string {
  if (x === null || x === undefined) return "";
  if (typeof x === "number") return String(x);
  let s = x;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",;\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 BOM, da Excel prepozna kodiranje (hrvatski znakovi). */
export const BOM = "﻿";

export interface ZaglavljaCsv {
  id: string; vrijeme: string; placeno: string; ime: string; anonimno: string; tvrtka: string; email: string;
  iznos: string; primljeno: string; valuta: string; stanje: string; intent: string; nedovoljno: string; kanal: string;
  izvor: string; kasica: string; link: string; referenca: string; poruka: string; povrat: string; da: string; ne: string;
}

const iso = (ms: number | null) => (ms === null ? "" : new Date(ms).toISOString());
const euri = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2));

/** CSV financija: BOM + zaglavlje + redak po doprinosu, CRLF (Excel), iznosi u eurima s točkom. */
export function csvFinancija(redovi: RedakFinancija[], z: ZaglavljaCsv, currency = "EUR"): string {
  const stupci = [z.id, z.vrijeme, z.placeno, z.ime, z.anonimno, z.tvrtka, z.email, z.iznos, z.primljeno, z.valuta, z.stanje,
    z.intent, z.nedovoljno, z.kanal, z.izvor, z.kasica, z.link, z.referenca, z.poruka, z.povrat];
  const linije = [stupci.map(csvPolje).join(",")];
  for (const r of redovi) {
    linije.push([
      r.id, iso(r.createdAt), iso(r.paidAt), r.ime, r.anonimno ? z.da : z.ne, r.tvrtka, r.email, euri(r.amountCents),
      euri(r.receivedCents), currency, r.stanje, r.stanjeIntenta, r.underpaid ? z.da : z.ne, r.kanal, r.izvor, r.kasica, r.link,
      r.referenca, r.poruka, r.povrat?.status ?? null,
    ].map(csvPolje).join(","));
  }
  return BOM + linije.join("\r\n") + "\r\n";
}

// --- Povrati --------------------------------------------------------------------------------------------

export interface Povrat {
  id: string;
  contributionId: string;
  amountCents: number;
  method: "safe_tx" | "bank_transfer";
  safeTxHash: string | null;
  bankReference: string | null;
  status: "recorded" | "confirmed";
  recordedBy: string | null;
  createdAt: number;
  confirmedAt: number | null;
  ime: string | null;
}

export async function povratiKampanje(db: D1Database, campaignId: string): Promise<Povrat[]> {
  const { results } = await db
    .prepare(
      `SELECT r.id, r.contribution_id, r.amount_cents, r.method, r.safe_tx_hash, r.bank_reference, r.status, r.created_at,
              r.confirmed_at, u.display_name AS recorded_by, cp.display_name AS ime
         FROM refunds r JOIN contributions d ON d.id = r.contribution_id
         LEFT JOIN users u ON u.id = r.recorded_by
         LEFT JOIN contribution_profiles cp ON cp.contribution_id = d.id
        WHERE d.campaign_id = ? ORDER BY r.created_at DESC, r.id`,
    )
    .bind(campaignId)
    .all<{ id: string; contribution_id: string; amount_cents: number; method: Povrat["method"]; safe_tx_hash: string | null; bank_reference: string | null; status: Povrat["status"]; created_at: number; confirmed_at: number | null; recorded_by: string | null; ime: string | null }>();
  return results.map((r) => ({
    id: r.id, contributionId: r.contribution_id, amountCents: r.amount_cents, method: r.method, safeTxHash: r.safe_tx_hash,
    bankReference: r.bank_reference, status: r.status, recordedBy: r.recorded_by, createdAt: r.created_at, confirmedAt: r.confirmed_at, ime: r.ime,
  }));
}

export type GreskePovrata = Partial<Record<"contribution" | "method" | "reference", "obavezno" | "nevaljano" | "vec_postoji">>;

const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

/**
 * Zapis povrata (`refunds.status = recorded`). Samo za plaćeni doprinos ove kampanje bez postojećeg povrata;
 * iznos je uvijek cijeli primljeni iznos (djelomični povrat nije u prototipu).
 */
export async function zapisiPovrat(
  db: D1Database,
  campaignId: string,
  userId: string,
  u: { contributionId: string; method: string; reference: string },
  sad: number,
): Promise<{ ok: true; id: string } | { ok: false; greske: GreskePovrata }> {
  const g: GreskePovrata = {};
  const d = u.contributionId
    ? await db
        .prepare(
          `SELECT d.amount_received_cents, d.state, (SELECT count(*) FROM refunds r WHERE r.contribution_id = d.id) AS povrata
             FROM contributions d WHERE d.id = ? AND d.campaign_id = ?`,
        )
        .bind(u.contributionId, campaignId)
        .first<{ amount_received_cents: number | null; state: StanjeDoprinosa; povrata: number }>()
    : null;
  if (!u.contributionId) g.contribution = "obavezno";
  else if (!d || d.state !== "paid" || !d.amount_received_cents) g.contribution = "nevaljano";
  else if (d.povrata > 0) g.contribution = "vec_postoji";
  const ref = u.reference.trim();
  if (u.method !== "safe_tx" && u.method !== "bank_transfer") g.method = "nevaljano";
  else if (!ref) g.reference = "obavezno";
  else if (u.method === "safe_tx" && !TX_HASH.test(ref)) g.reference = "nevaljano";
  else if (u.method === "bank_transfer" && (ref.length > 64 || /[\u0000-\u001f]/.test(ref))) g.reference = "nevaljano";
  if (Object.keys(g).length > 0 || !d) return { ok: false, greske: g };
  const id = uuid7(sad);
  await db
    .prepare(
      `INSERT INTO refunds (id, contribution_id, amount_cents, method, safe_tx_hash, bank_reference, status, recorded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'recorded', ?, ?)`,
    )
    .bind(id, u.contributionId, d.amount_received_cents, u.method, u.method === "safe_tx" ? ref.toLowerCase() : null, u.method === "bank_transfer" ? ref : null, userId, sad)
    .run();
  return { ok: true, id };
}

/**
 * Potvrda povrata (mock provjere transakcije): `refunds.confirmed`, doprinos `refunded`, `campaign_stats` umanjen
 * za primljeni iznos i jedan doprinos, obavijest podržavatelju (ako je e-pošta poznata). false kad zapis ne
 * postoji, nije ove kampanje ili je već potvrđen.
 */
export async function potvrdiPovrat(db: D1Database, campaignId: string, refundId: string, sad: number): Promise<boolean> {
  const r = await db
    .prepare(
      `SELECT r.contribution_id, d.amount_received_cents, d.state, ch.email, ch.user_id
         FROM refunds r JOIN contributions d ON d.id = r.contribution_id
         LEFT JOIN contribution_attributions a ON a.contribution_id = d.id
         LEFT JOIN checkouts ch ON ch.id = a.checkout_id
        WHERE r.id = ? AND d.campaign_id = ? AND r.status = 'recorded'`,
    )
    .bind(refundId, campaignId)
    .first<{ contribution_id: string; amount_received_cents: number | null; state: StanjeDoprinosa; email: string | null; user_id: string | null }>();
  if (!r) return false;
  await db.prepare("UPDATE refunds SET status = 'confirmed', confirmed_at = ? WHERE id = ?").bind(sad, refundId).run();
  if (r.state === "paid") {
    await db.prepare("UPDATE contributions SET state = 'refunded', updated_at = ? WHERE id = ?").bind(sad, r.contribution_id).run();
    await db
      .prepare(
        `UPDATE campaign_stats SET raised_cents = max(0, raised_cents - ?), contribution_count = max(0, contribution_count - 1),
                contributor_count = max(0, contributor_count - 1), updated_at = ? WHERE campaign_id = ?`,
      )
      .bind(r.amount_received_cents ?? 0, sad, campaignId)
      .run();
  }
  if (r.email) {
    await db
      .prepare("INSERT INTO notifications (id, user_id, email, kind, payload, created_at) VALUES (?, ?, ?, 'refund_confirmed', ?, ?)")
      .bind(uuid7(sad), r.user_id, r.email, JSON.stringify({ refund_id: refundId, campaign_id: campaignId }), sad)
      .run();
  }
  return true;
}
