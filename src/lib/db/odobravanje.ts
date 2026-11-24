/**
 * Odobravanje tuđih kampanja za organizaciju (S6, tok 3, docs/05 „review → active | cancelled”, ekran 20
 * „Fixed Beneficiary”). Kampanja drugog korisnika za organizaciju ima `kind = for_organization`,
 * `beneficiary_organization_id` i `state = review`; admin organizacije je odobri ili odbije s razlogom.
 *
 * Odobri: `beneficiary_approved_at/by`, `state = active`, `starts_at`, pa mock MPT registracija kampanje
 * (`campaign_safes.verified_at`; pravi poziv `tenant_campaigns` je S7). Odbij: `state = cancelled` i razlog u
 * `campaign_settings.beneficiary_rejected_*` (migracija 0007).
 */
export const RAZLOG_MIN = 10;
export const RAZLOG_MAX = 500;

export interface KampanjaZaOdobrenje {
  id: string;
  publicId: string;
  naslov: string;
  opis: string | null;
  autor: string;
  autorEmail: string;
  ciljCenti: number | null;
  valuta: string;
  kategorija: string | null;
  stvorena: number;
}

/** Kampanje drugih koje čekaju odluku ove organizacije, najstarije prve (red čekanja). */
export async function kampanjeZaOdobrenje(db: D1Database, orgId: string): Promise<KampanjaZaOdobrenje[]> {
  const { results } = await db
    .prepare(
      `SELECT c.id, s.public_id, c.title, c.description, c.goal_cents, c.currency, s.category_key, c.created_at,
              COALESCE(u.display_name, u.email) AS autor, u.email
         FROM campaign_settings s
         JOIN campaigns c ON c.id = s.campaign_id
         JOIN users u ON u.id = s.created_by_user_id
        WHERE s.beneficiary_organization_id = ? AND s.kind = 'for_organization' AND c.state = 'review'
          AND c.deleted_at IS NULL AND s.beneficiary_approved_at IS NULL
        ORDER BY c.created_at ASC, c.id`,
    )
    .bind(orgId)
    .all<{
      id: string;
      public_id: string;
      title: string;
      description: string | null;
      goal_cents: number | null;
      currency: string;
      category_key: string | null;
      created_at: number;
      autor: string;
      email: string;
    }>();
  return results.map((r) => ({
    id: r.id,
    publicId: r.public_id,
    naslov: r.title,
    opis: r.description,
    autor: r.autor,
    autorEmail: r.email,
    ciljCenti: r.goal_cents,
    valuta: r.currency,
    kategorija: r.category_key,
    stvorena: r.created_at,
  }));
}

export interface OdlucenaKampanja {
  publicId: string;
  naslov: string;
  autor: string;
  odluka: "odobrena" | "odbijena";
  kada: number;
  razlog: string | null;
}

/** Zadnje odluke organizacije (odobrene i odbijene), najnovije prve. */
export async function odluceneKampanje(db: D1Database, orgId: string, limit = 20): Promise<OdlucenaKampanja[]> {
  const { results } = await db
    .prepare(
      `SELECT s.public_id, c.title, COALESCE(u.display_name, u.email) AS autor,
              s.beneficiary_approved_at, s.beneficiary_rejected_at, s.beneficiary_rejected_reason
         FROM campaign_settings s
         JOIN campaigns c ON c.id = s.campaign_id
         JOIN users u ON u.id = s.created_by_user_id
        WHERE s.beneficiary_organization_id = ? AND s.kind = 'for_organization'
          AND (s.beneficiary_approved_at IS NOT NULL OR s.beneficiary_rejected_at IS NOT NULL)
        ORDER BY COALESCE(s.beneficiary_rejected_at, s.beneficiary_approved_at) DESC, c.id
        LIMIT ?`,
    )
    .bind(orgId, limit)
    .all<{
      public_id: string;
      title: string;
      autor: string;
      beneficiary_approved_at: number | null;
      beneficiary_rejected_at: number | null;
      beneficiary_rejected_reason: string | null;
    }>();
  return results.map((r) => ({
    publicId: r.public_id,
    naslov: r.title,
    autor: r.autor,
    odluka: r.beneficiary_rejected_at !== null ? "odbijena" : "odobrena",
    kada: (r.beneficiary_rejected_at ?? r.beneficiary_approved_at)!,
    razlog: r.beneficiary_rejected_reason,
  }));
}

export type GreskaOdobravanja = "nema" | "stanje" | "organizacija" | "safe" | "razlog_prazan" | "razlog_kratak" | "razlog_dug";

interface RedakOdluke {
  id: string;
  public_id: string;
  state: string;
  org_status: string;
  safe_address: string | null;
  safe_chain_id: number | null;
  ima_safe: number;
}

/** Kampanja za ovu organizaciju po javnom ID-u ili id-u, s onim što odluka treba. */
async function kampanjaZaOdluku(db: D1Database, orgId: string, campaignId: string): Promise<RedakOdluke | null> {
  return db
    .prepare(
      `SELECT c.id, s.public_id, c.state, o.status AS org_status, o.safe_address, o.safe_chain_id,
              EXISTS (SELECT 1 FROM campaign_safes cs WHERE cs.campaign_id = c.id) AS ima_safe
         FROM campaign_settings s
         JOIN campaigns c ON c.id = s.campaign_id
         JOIN organizations o ON o.id = s.beneficiary_organization_id AND o.deleted_at IS NULL
        WHERE s.beneficiary_organization_id = ? AND s.kind = 'for_organization' AND c.deleted_at IS NULL
          AND (c.id = ? OR s.public_id = ?)`,
    )
    .bind(orgId, campaignId, campaignId)
    .first<RedakOdluke>();
}

/**
 * Mock MPT registracije kampanje (S7 zove `tenant_campaigns` s `campaign_id` i `safe_address`). Ovdje: Safe
 * kampanje je Safe organizacije (odluka 203); ako red ne postoji, nastaje (`byo`, 0 platformskih potpisnika), a
 * `verified_at` se postavlja. Vraća oznaku registracije za prikaz.
 */
async function mockRegistracijaMpt(db: D1Database, k: RedakOdluke, sad: number): Promise<string> {
  if (k.ima_safe) {
    await db.prepare("UPDATE campaign_safes SET verified_at = COALESCE(verified_at, ?) WHERE campaign_id = ?").bind(sad, k.id).run();
  } else {
    await db
      .prepare(
        `INSERT INTO campaign_safes (campaign_id, address, chain_id, threshold, owners, platform_signer_count, deployed_at, verified_at)
         VALUES (?, ?, ?, 1, '[]', 0, NULL, ?)`,
      )
      .bind(k.id, k.safe_address, k.safe_chain_id, sad)
      .run();
  }
  return `mock-mpt-${k.public_id}`;
}

/**
 * Odobri (U:admin): kampanja mora biti `review` za ovu organizaciju, organizacija `active` i sa Safeom.
 * Kampanja postaje `active` (od sada), s oznakom odobrenja i mock MPT registracijom.
 */
export async function odobriKampanju(
  db: D1Database,
  o: { orgId: string; campaignId: string; userId: string },
  sad: number = Date.now(),
): Promise<{ ok: true; publicId: string; mpt: string } | { ok: false; greska: GreskaOdobravanja }> {
  const k = await kampanjaZaOdluku(db, o.orgId, o.campaignId);
  if (!k) return { ok: false, greska: "nema" };
  if (k.state !== "review") return { ok: false, greska: "stanje" };
  if (k.org_status !== "active") return { ok: false, greska: "organizacija" };
  if (!k.ima_safe && (!k.safe_address || !k.safe_chain_id)) return { ok: false, greska: "safe" };
  await db
    .prepare("UPDATE campaign_settings SET beneficiary_approved_at = ?, beneficiary_approved_by = ?, updated_at = ? WHERE campaign_id = ?")
    .bind(sad, o.userId, sad, k.id)
    .run();
  const mpt = await mockRegistracijaMpt(db, k, sad);
  await db
    .prepare("UPDATE campaigns SET state = 'active', starts_at = COALESCE(starts_at, ?), updated_at = ? WHERE id = ? AND state = 'review'")
    .bind(sad, sad, k.id)
    .run();
  return { ok: true, publicId: k.public_id, mpt };
}

export function provjeriRazlog(razlog: string): GreskaOdobravanja | null {
  const r = razlog.trim();
  if (!r) return "razlog_prazan";
  if (r.length < RAZLOG_MIN) return "razlog_kratak";
  if (r.length > RAZLOG_MAX) return "razlog_dug";
  return null;
}

/** Odbij s razlogom (U:admin): `review` → `cancelled`, razlog i tko je odbio u `campaign_settings` (0007). */
export async function odbijKampanju(
  db: D1Database,
  o: { orgId: string; campaignId: string; userId: string; razlog: string },
  sad: number = Date.now(),
): Promise<{ ok: true; publicId: string } | { ok: false; greska: GreskaOdobravanja }> {
  const g = provjeriRazlog(o.razlog);
  if (g) return { ok: false, greska: g };
  const k = await kampanjaZaOdluku(db, o.orgId, o.campaignId);
  if (!k) return { ok: false, greska: "nema" };
  if (k.state !== "review") return { ok: false, greska: "stanje" };
  await db
    .prepare(
      `UPDATE campaign_settings SET beneficiary_rejected_at = ?, beneficiary_rejected_by = ?, beneficiary_rejected_reason = ?, updated_at = ?
        WHERE campaign_id = ?`,
    )
    .bind(sad, o.userId, o.razlog.trim(), sad, k.id)
    .run();
  await db.prepare("UPDATE campaigns SET state = 'cancelled', updated_at = ? WHERE id = ? AND state = 'review'").bind(sad, k.id).run();
  return { ok: true, publicId: k.public_id };
}
