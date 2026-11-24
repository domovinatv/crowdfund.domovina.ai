/**
 * Moderacija platforme (`/admin/*`, S6, A = `users.platform_role = moderator`): DSA red prijava i odluke s
 * obrazloženjem (docs/04 tok 8, docs/05 „Prijava”), zahtjevi organizacija i simulirana odluka EMI-ja o KYB-u
 * (docs/05 „Verifikacija”), verifikacije namjene iznad praga (odluka 18) i blokada kampanja (odluka 204).
 *
 * Svaka blokada i deblokada ostavlja `moderation_decisions` (DSA čl. 17: obrazloženje), i kad nije iz prijave
 * (`report_id IS NULL` = po službenoj dužnosti).
 */
import { DAN, uuid7 } from "./zajednicko";

export const STATUSI_PRIJAVE = ["received", "in_review", "decided", "appealed", "closed"] as const;
export type StatusPrijave = (typeof STATUSI_PRIJAVE)[number];
export const RADNJE = ["no_action", "hide_content", "restrict_feature", "block_campaign", "suspend_account"] as const;
export type Radnja = (typeof RADNJE)[number];

export const OBRAZLOZENJE_MIN = 20;
export const OBRAZLOZENJE_MAX = 2000;
/** `campaign_settings.blocked_reason` i razlozi odbijanja se skraćuju na ovoliko znakova. */
export const RAZLOG_MAX = 500;
/** Rok za dokumente namjene nakon blokade (docs/05 „requested → expired: 14 dana”). */
export const ROK_DOKUMENATA = 14 * DAN;

const promjena = (r: D1Result) => (r.meta as { changes?: number }).changes ?? 0;

/** Kratak opis cilja prijave za popis (naslov kampanje, isječak komentara, ime …). */
const OZNAKA_CILJA = `CASE r.target_type
  WHEN 'campaign' THEN (SELECT c.title || ' (' || s.public_id || ')' FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id WHERE c.id = r.target_id)
  WHEN 'comment' THEN (SELECT substr(k.body, 1, 80) FROM comments k WHERE k.id = r.target_id)
  WHEN 'update' THEN (SELECT COALESCE(n.title, substr(n.body, 1, 80)) FROM campaign_updates n WHERE n.id = r.target_id)
  WHEN 'moneybox' THEN (SELECT m.title || ' (' || m.alias || ')' FROM moneyboxes m WHERE m.id = r.target_id)
  WHEN 'user' THEN (SELECT COALESCE(u.display_name, u.email) FROM users u WHERE u.id = r.target_id)
  WHEN 'organization' THEN (SELECT o.display_name FROM organizations o WHERE o.id = r.target_id)
  ELSE NULL END`;

/** Kampanja na koju se prijava odnosi (izravno ili preko komentara, novosti, kasice), za poveznicu i blokadu. */
const KAMPANJA_CILJA = `CASE r.target_type
  WHEN 'campaign' THEN r.target_id
  WHEN 'comment' THEN (SELECT k.campaign_id FROM comments k WHERE k.id = r.target_id)
  WHEN 'update' THEN (SELECT n.campaign_id FROM campaign_updates n WHERE n.id = r.target_id)
  WHEN 'moneybox' THEN (SELECT m.campaign_id FROM moneyboxes m WHERE m.id = r.target_id)
  ELSE NULL END`;

export interface StavkaPrijave {
  id: string;
  vrsta: string;
  ciljId: string;
  oznaka: string | null;
  razlog: string;
  status: StatusPrijave;
  zaprimljena: number;
  azurirana: number;
}

/** Red prijava: otvorene prvo (received, appealed, in_review), pa po vremenu primitka (najstarija prva). */
export async function redPrijava(db: D1Database, status: StatusPrijave | null = null): Promise<StavkaPrijave[]> {
  const { results } = await db
    .prepare(
      `SELECT r.id, r.target_type, r.target_id, ${OZNAKA_CILJA} AS oznaka, r.reason, r.status, r.created_at, r.updated_at
         FROM reports r
        WHERE ?1 IS NULL OR r.status = ?1
        ORDER BY CASE r.status WHEN 'received' THEN 0 WHEN 'appealed' THEN 1 WHEN 'in_review' THEN 2 WHEN 'decided' THEN 3 ELSE 4 END,
                 r.created_at ASC, r.id
        LIMIT 200`,
    )
    .bind(status)
    .all<{ id: string; target_type: string; target_id: string; oznaka: string | null; reason: string; status: StatusPrijave; created_at: number; updated_at: number }>();
  return results.map((r) => ({
    id: r.id,
    vrsta: r.target_type,
    ciljId: r.target_id,
    oznaka: r.oznaka,
    razlog: r.reason,
    status: r.status,
    zaprimljena: r.created_at,
    azurirana: r.updated_at,
  }));
}

export interface OdlukaModeracije {
  id: string;
  radnja: Radnja;
  obrazlozenje: string;
  zalba: boolean;
  moderator: string;
  kada: number;
}

export interface DetaljPrijave extends StavkaPrijave {
  opis: string;
  prijavitelj: string | null;
  telefon: string | null;
  privitak: boolean;
  kampanja: { id: string; publicId: string; naslov: string; blokirana: boolean } | null;
  odluke: OdlukaModeracije[];
}

export async function prijava(db: D1Database, id: string): Promise<DetaljPrijave | null> {
  const r = await db
    .prepare(
      `SELECT r.id, r.target_type, r.target_id, ${OZNAKA_CILJA} AS oznaka, r.reason, r.status, r.created_at, r.updated_at,
              r.description, COALESCE(u.email, r.reporter_email) AS prijavitelj, r.phone, r.attachment_file_id,
              ${KAMPANJA_CILJA} AS kampanja_id
         FROM reports r LEFT JOIN users u ON u.id = r.reporter_user_id
        WHERE r.id = ?`,
    )
    .bind(id)
    .first<{
      id: string;
      target_type: string;
      target_id: string;
      oznaka: string | null;
      reason: string;
      status: StatusPrijave;
      created_at: number;
      updated_at: number;
      description: string;
      prijavitelj: string | null;
      phone: string | null;
      attachment_file_id: string | null;
      kampanja_id: string | null;
    }>();
  if (!r) return null;
  const k = r.kampanja_id
    ? await db
        .prepare("SELECT c.id, s.public_id, c.title, s.blocked_at FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id WHERE c.id = ?")
        .bind(r.kampanja_id)
        .first<{ id: string; public_id: string; title: string; blocked_at: number | null }>()
    : null;
  const { results } = await db
    .prepare(
      `SELECT d.id, d.action, d.statement, d.is_appeal, COALESCE(u.display_name, u.email) AS moderator, d.decided_at
         FROM moderation_decisions d JOIN users u ON u.id = d.decided_by
        WHERE d.report_id = ? ORDER BY d.decided_at, d.id`,
    )
    .bind(id)
    .all<{ id: string; action: Radnja; statement: string; is_appeal: number; moderator: string; decided_at: number }>();
  return {
    id: r.id,
    vrsta: r.target_type,
    ciljId: r.target_id,
    oznaka: r.oznaka,
    razlog: r.reason,
    status: r.status,
    zaprimljena: r.created_at,
    azurirana: r.updated_at,
    opis: r.description,
    prijavitelj: r.prijavitelj,
    telefon: r.phone,
    privitak: r.attachment_file_id !== null,
    kampanja: k && { id: k.id, publicId: k.public_id, naslov: k.title, blokirana: k.blocked_at !== null },
    odluke: results.map((d) => ({ id: d.id, radnja: d.action, obrazlozenje: d.statement, zalba: d.is_appeal === 1, moderator: d.moderator, kada: d.decided_at })),
  };
}

/** Moderator preuzima prijavu: `received → in_review`. */
export async function preuzmiPrijavu(db: D1Database, id: string, sad: number = Date.now()): Promise<boolean> {
  return promjena(await db.prepare("UPDATE reports SET status = 'in_review', updated_at = ? WHERE id = ? AND status = 'received'").bind(sad, id).run()) === 1;
}

/** Rok za žalbu je prošao: `decided → closed`. */
export async function zatvoriPrijavu(db: D1Database, id: string, sad: number = Date.now()): Promise<boolean> {
  return promjena(await db.prepare("UPDATE reports SET status = 'closed', updated_at = ? WHERE id = ? AND status = 'decided'").bind(sad, id).run()) === 1;
}

export type GreskaOdluke = "nema" | "stanje" | "radnja" | "radnja_cilj" | "obrazlozenje_kratko" | "obrazlozenje_dugo";

export function provjeriObrazlozenje(s: string): GreskaOdluke | null {
  const t = s.trim();
  if (t.length < OBRAZLOZENJE_MIN) return "obrazlozenje_kratko";
  if (t.length > OBRAZLOZENJE_MAX) return "obrazlozenje_dugo";
  return null;
}

async function zapisiOdluku(
  db: D1Database,
  o: { reportId: string | null; vrsta: string; ciljId: string; radnja: Radnja; obrazlozenje: string; zalba: boolean; moderatorId: string },
  sad: number,
): Promise<string> {
  const id = uuid7(sad);
  await db
    .prepare(
      `INSERT INTO moderation_decisions (id, report_id, target_type, target_id, action, statement, is_appeal, decided_by, decided_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, o.reportId, o.vrsta, o.ciljId, o.radnja, o.obrazlozenje, o.zalba ? 1 : 0, o.moderatorId, sad)
    .run();
  return id;
}

/** Blokada kampanje (preklop `blocked_at`) + zahtjev za dokumente namjene ako ga nema otvorenog (tok 8). */
async function blokiraj(db: D1Database, campaignId: string, razlog: string, sad: number, trigger: "report" | "risk"): Promise<void> {
  await db
    .prepare("UPDATE campaign_settings SET blocked_at = ?, blocked_reason = ?, updated_at = ? WHERE campaign_id = ?")
    .bind(sad, razlog.trim().slice(0, RAZLOG_MAX), sad, campaignId)
    .run();
  const otvorena = await db
    .prepare(
      `SELECT 1 AS da FROM verifications WHERE kind = 'campaign_purpose' AND subject_type = 'campaign' AND subject_id = ?
          AND status IN ('requested','submitted','in_review')`,
    )
    .bind(campaignId)
    .first();
  if (!otvorena) {
    await db
      .prepare(
        `INSERT INTO verifications (id, kind, subject_type, subject_id, status, provider, provider_ref, trigger, reason, requested_at, due_at)
         VALUES (?, 'campaign_purpose', 'campaign', ?, 'requested', 'platform', NULL, ?, NULL, ?, ?)`,
      )
      .bind(uuid7(sad), campaignId, trigger, sad, sad + ROK_DOKUMENATA)
      .run();
  }
}

const odblokiraj = async (db: D1Database, campaignId: string, sad: number) =>
  promjena(
    await db
      .prepare("UPDATE campaign_settings SET blocked_at = NULL, blocked_reason = NULL, updated_at = ? WHERE campaign_id = ? AND blocked_at IS NOT NULL")
      .bind(sad, campaignId)
      .run(),
  ) === 1;

/**
 * Odluka o prijavi s obrazloženjem (DSA čl. 17). Iz `received`/`in_review` → `decided`; iz `appealed` je odluka o
 * žalbi (`is_appeal = 1`) → `closed`. Posljedice: `block_campaign` (samo kad se prijava odnosi na kampanju, izravno
 * ili preko komentara, novosti, kasice) postavlja `blocked_at`; `hide_content` na komentaru postavlja `hidden_at`;
 * `no_action` u žalbi deblokira kampanju (docs/05: „žalba u korist organizatora”). Ostale radnje se samo bilježe.
 */
export async function odluciOPrijavi(
  db: D1Database,
  o: { reportId: string; radnja: string; obrazlozenje: string; moderatorId: string },
  sad: number = Date.now(),
): Promise<{ ok: true; id: string } | { ok: false; greska: GreskaOdluke }> {
  if (!RADNJE.includes(o.radnja as Radnja)) return { ok: false, greska: "radnja" };
  const g = provjeriObrazlozenje(o.obrazlozenje);
  if (g) return { ok: false, greska: g };
  const p = await prijava(db, o.reportId);
  if (!p) return { ok: false, greska: "nema" };
  if (p.status === "decided" || p.status === "closed") return { ok: false, greska: "stanje" };
  const radnja = o.radnja as Radnja;
  if (radnja === "block_campaign" && !p.kampanja) return { ok: false, greska: "radnja_cilj" };
  const zalba = p.status === "appealed";
  const obrazlozenje = o.obrazlozenje.trim();
  const id = await zapisiOdluku(db, { reportId: p.id, vrsta: p.vrsta, ciljId: p.ciljId, radnja, obrazlozenje, zalba, moderatorId: o.moderatorId }, sad);
  if (radnja === "block_campaign" && p.kampanja && !p.kampanja.blokirana) await blokiraj(db, p.kampanja.id, obrazlozenje, sad, "report");
  if (radnja === "hide_content" && p.vrsta === "comment") {
    await db.prepare("UPDATE comments SET hidden_at = ?, hidden_by = ? WHERE id = ? AND hidden_at IS NULL").bind(sad, o.moderatorId, p.ciljId).run();
  }
  if (radnja === "no_action" && zalba && p.kampanja?.blokirana) await odblokiraj(db, p.kampanja.id, sad);
  await db.prepare("UPDATE reports SET status = ?, updated_at = ? WHERE id = ?").bind(zalba ? "closed" : "decided", sad, p.id).run();
  return { ok: true, id };
}

// --- Organizacije i KYB (simulacija odluke EMI-ja) ------------------------------------------------------

export interface ZahtjevOrganizacije {
  orgId: string;
  slug: string;
  naziv: string;
  pravniOblik: string;
  oib: string | null;
  status: string;
  zahtjev: { status: string; korak: number; razlog: string | null; poslan: number; opisProjekta: string; ocekivaneUplate: string; podnositelj: string } | null;
  kyb: { status: string; pruzatelj: string; razlog: string | null; zatrazeno: number } | null;
}

/** Organizacije sa zahtjevom ili KYB-om koji nije nacrt; otvorene (`submitted`, `in_review`) prve. */
export async function zahtjeviOrganizacija(db: D1Database): Promise<ZahtjevOrganizacije[]> {
  const { results } = await db
    .prepare(
      `SELECT o.id, o.slug, o.display_name, o.legal_form, g.oib, o.status,
              a.status AS a_status, a.step, a.reason AS a_reason, a.created_at AS a_created, a.project_description, a.expected_payments,
              COALESCE(u.display_name, u.email) AS podnositelj,
              v.status AS v_status, v.provider, v.reason AS v_reason, v.requested_at
         FROM organizations o
         JOIN organizers g ON g.id = o.organizer_id
         LEFT JOIN organization_applications a ON a.id = (SELECT a2.id FROM organization_applications a2 WHERE a2.organization_id = o.id
                                                           ORDER BY a2.created_at DESC, a2.id DESC LIMIT 1)
         LEFT JOIN users u ON u.id = a.submitted_by
         LEFT JOIN verifications v ON v.id = (SELECT v2.id FROM verifications v2 WHERE v2.kind = 'org_kyb' AND v2.subject_type = 'organization'
                                              AND v2.subject_id = o.id ORDER BY v2.requested_at DESC, v2.id DESC LIMIT 1)
        WHERE o.deleted_at IS NULL AND (a.status IS NULL OR a.status <> 'draft')
        ORDER BY CASE WHEN v.status IN ('submitted','in_review') THEN 0 WHEN o.status = 'pending' THEN 1 ELSE 2 END,
                 COALESCE(v.requested_at, o.created_at) DESC, o.id`,
    )
    .all<{
      id: string;
      slug: string;
      display_name: string;
      legal_form: string;
      oib: string | null;
      status: string;
      a_status: string | null;
      step: number | null;
      a_reason: string | null;
      a_created: number | null;
      project_description: string | null;
      expected_payments: string | null;
      podnositelj: string | null;
      v_status: string | null;
      provider: string | null;
      v_reason: string | null;
      requested_at: number | null;
    }>();
  return results.map((r) => ({
    orgId: r.id,
    slug: r.slug,
    naziv: r.display_name,
    pravniOblik: r.legal_form,
    oib: r.oib,
    status: r.status,
    zahtjev: r.a_status
      ? {
          status: r.a_status,
          korak: r.step ?? 3,
          razlog: r.a_reason,
          poslan: r.a_created ?? 0,
          opisProjekta: r.project_description ?? "",
          ocekivaneUplate: r.expected_payments ?? "",
          podnositelj: r.podnositelj ?? "",
        }
      : null,
    kyb: r.v_status ? { status: r.v_status, pruzatelj: r.provider ?? "", razlog: r.v_reason, zatrazeno: r.requested_at ?? 0 } : null,
  }));
}

export type GreskaKyb = "nema" | "stanje" | "razlog";

/**
 * Simulirana odluka EMI-ja o KYB-u (prototip, docs/05). Zadnja `org_kyb` mora biti `submitted` ili `in_review`.
 * Odobri: verifikacija `approved`, organizacija `active`, zahtjev `approved` (korak 4, ili 5 kad već prima kampanje
 * drugih). Odbij (razlog obavezan): verifikacija i zahtjev `rejected` s razlogom; organizacija ostaje `pending`.
 */
export async function odluciKyb(
  db: D1Database,
  o: { orgId: string; odobri: boolean; razlog: string },
  sad: number = Date.now(),
): Promise<{ ok: true } | { ok: false; greska: GreskaKyb }> {
  const v = await db
    .prepare(
      `SELECT id, status FROM verifications WHERE kind = 'org_kyb' AND subject_type = 'organization' AND subject_id = ?
        ORDER BY requested_at DESC, id DESC LIMIT 1`,
    )
    .bind(o.orgId)
    .first<{ id: string; status: string }>();
  if (!v) return { ok: false, greska: "nema" };
  if (v.status !== "submitted" && v.status !== "in_review") return { ok: false, greska: "stanje" };
  const razlog = o.razlog.trim().slice(0, RAZLOG_MAX);
  if (!o.odobri && !razlog) return { ok: false, greska: "razlog" };
  await db
    .prepare("UPDATE verifications SET status = ?, reason = ?, decided_at = ? WHERE id = ?")
    .bind(o.odobri ? "approved" : "rejected", o.odobri ? null : razlog, sad, v.id)
    .run();
  if (o.odobri) {
    await db.prepare("UPDATE organizations SET status = 'active', updated_at = ? WHERE id = ? AND status = 'pending'").bind(sad, o.orgId).run();
    await db
      .prepare(
        `UPDATE organization_applications SET status = 'approved', reason = NULL, updated_at = ?,
                step = CASE WHEN (SELECT is_fixed_beneficiary FROM organizations WHERE id = ?) = 1 THEN 5 ELSE 4 END
          WHERE organization_id = ? AND status IN ('submitted','rejected')`,
      )
      .bind(sad, o.orgId, o.orgId)
      .run();
  } else {
    await db
      .prepare("UPDATE organization_applications SET status = 'rejected', reason = ?, updated_at = ? WHERE organization_id = ? AND status = 'submitted'")
      .bind(razlog, sad, o.orgId)
      .run();
  }
  return { ok: true };
}

// --- Verifikacije namjene -----------------------------------------------------------------------------

export interface VerifikacijaNamjene {
  id: string;
  status: string;
  povod: string | null;
  razlog: string | null;
  zatrazeno: number;
  rok: number | null;
  odluceno: number | null;
  kampanja: { id: string; publicId: string; naslov: string; organizacija: string; prikupljenoCenti: number; blokirana: boolean };
}

/** Verifikacije namjene: otvorene (requested, submitted, in_review) prve, pa zadnje odlučene. */
export async function verifikacijeNamjene(db: D1Database): Promise<VerifikacijaNamjene[]> {
  const { results } = await db
    .prepare(
      `SELECT v.id, v.status, v.trigger, v.reason, v.requested_at, v.due_at, v.decided_at,
              c.id AS c_id, s.public_id, c.title, COALESCE(o.display_name, g.legal_name) AS organizacija,
              COALESCE(st.raised_cents, 0) AS raised, s.blocked_at
         FROM verifications v
         JOIN campaigns c ON c.id = v.subject_id
         JOIN campaign_settings s ON s.campaign_id = c.id
         JOIN organizers g ON g.id = c.organizer_id
         LEFT JOIN organizations o ON o.organizer_id = c.organizer_id
         LEFT JOIN campaign_stats st ON st.campaign_id = c.id
        WHERE v.kind = 'campaign_purpose' AND v.subject_type = 'campaign' AND c.deleted_at IS NULL
        ORDER BY CASE WHEN v.status IN ('submitted','in_review') THEN 0 WHEN v.status = 'requested' THEN 1 ELSE 2 END,
                 COALESCE(v.decided_at, v.requested_at) DESC, v.id
        LIMIT 100`,
    )
    .all<{
      id: string;
      status: string;
      trigger: string | null;
      reason: string | null;
      requested_at: number;
      due_at: number | null;
      decided_at: number | null;
      c_id: string;
      public_id: string;
      title: string;
      organizacija: string;
      raised: number;
      blocked_at: number | null;
    }>();
  return results.map((r) => ({
    id: r.id,
    status: r.status,
    povod: r.trigger,
    razlog: r.reason,
    zatrazeno: r.requested_at,
    rok: r.due_at,
    odluceno: r.decided_at,
    kampanja: { id: r.c_id, publicId: r.public_id, naslov: r.title, organizacija: r.organizacija, prikupljenoCenti: r.raised, blokirana: r.blocked_at !== null },
  }));
}

export type GreskaNamjene = "nema" | "stanje" | "razlog";

/**
 * Odluka o namjeni: samo `submitted`/`in_review` (dokumenti su poslani). Odobri: `approved` + `purpose_verified = 1`
 * (zaključava naslov, opis i cilj, docs/05). Odbij (razlog obavezan): `rejected` + blokada kampanje i odluka
 * moderacije po službenoj dužnosti s istim obrazloženjem (docs/05 „Verifikacija”).
 */
export async function odluciNamjenu(
  db: D1Database,
  o: { id: string; odobri: boolean; razlog: string; moderatorId: string },
  sad: number = Date.now(),
): Promise<{ ok: true } | { ok: false; greska: GreskaNamjene }> {
  const v = await db
    .prepare("SELECT id, status, subject_id FROM verifications WHERE id = ? AND kind = 'campaign_purpose'")
    .bind(o.id)
    .first<{ id: string; status: string; subject_id: string }>();
  if (!v) return { ok: false, greska: "nema" };
  if (v.status !== "submitted" && v.status !== "in_review") return { ok: false, greska: "stanje" };
  const razlog = o.razlog.trim().slice(0, RAZLOG_MAX);
  if (!o.odobri && razlog.length < OBRAZLOZENJE_MIN) return { ok: false, greska: "razlog" };
  await db
    .prepare("UPDATE verifications SET status = ?, reason = ?, decided_at = ? WHERE id = ?")
    .bind(o.odobri ? "approved" : "rejected", o.odobri ? null : razlog, sad, v.id)
    .run();
  if (o.odobri) {
    await db.prepare("UPDATE campaign_settings SET purpose_verified = 1, updated_at = ? WHERE campaign_id = ?").bind(sad, v.subject_id).run();
  } else {
    await db
      .prepare("UPDATE campaign_settings SET blocked_at = COALESCE(blocked_at, ?), blocked_reason = COALESCE(blocked_reason, ?), updated_at = ? WHERE campaign_id = ?")
      .bind(sad, razlog, sad, v.subject_id)
      .run();
    await zapisiOdluku(db, { reportId: null, vrsta: "campaign", ciljId: v.subject_id, radnja: "block_campaign", obrazlozenje: razlog, zalba: false, moderatorId: o.moderatorId }, sad);
  }
  return { ok: true };
}

// --- Kampanje: blokada i deblokada -------------------------------------------------------------------------

export interface KampanjaModeracije {
  id: string;
  publicId: string;
  naslov: string;
  organizacija: string;
  state: string;
  blokirana: number | null;
  razlogBlokade: string | null;
  prijava: number;
}

/**
 * Kampanje za moderaciju: blokirane prve, pa one s otvorenim prijavama, pa ostale po vremenu. `q` traži po naslovu
 * ili javnom ID-u. Obrisane se ne prikazuju.
 */
export async function kampanjeZaModeraciju(db: D1Database, q = ""): Promise<KampanjaModeracije[]> {
  const uzorak = q.trim() ? `%${q.trim().replace(/[\\%_]/g, (z) => `\\${z}`)}%` : null;
  const { results } = await db
    .prepare(
      `SELECT c.id, s.public_id, c.title, COALESCE(o.display_name, g.legal_name) AS organizacija, c.state, s.blocked_at, s.blocked_reason,
              (SELECT count(*) FROM reports r WHERE r.target_type = 'campaign' AND r.target_id = c.id
                  AND r.status IN ('received','in_review','appealed')) AS prijava
         FROM campaigns c
         JOIN campaign_settings s ON s.campaign_id = c.id
         JOIN organizers g ON g.id = c.organizer_id
         LEFT JOIN organizations o ON o.organizer_id = c.organizer_id
        WHERE c.deleted_at IS NULL AND c.state IN ('active','closed','review')
          AND (?1 IS NULL OR c.title LIKE ?1 ESCAPE '\\' OR s.public_id LIKE ?1 ESCAPE '\\')
        ORDER BY (s.blocked_at IS NULL), prijava DESC, c.created_at DESC, c.id
        LIMIT 100`,
    )
    .bind(uzorak)
    .all<{ id: string; public_id: string; title: string; organizacija: string; state: string; blocked_at: number | null; blocked_reason: string | null; prijava: number }>();
  return results.map((r) => ({
    id: r.id,
    publicId: r.public_id,
    naslov: r.title,
    organizacija: r.organizacija,
    state: r.state,
    blokirana: r.blocked_at,
    razlogBlokade: r.blocked_reason,
    prijava: r.prijava,
  }));
}

export type GreskaBlokade = "nema" | "stanje" | "razlog";

/** Blokada po službenoj dužnosti (A): `blocked_at` + razlog + odluka moderacije (`block_campaign`). */
export async function blokirajKampanju(
  db: D1Database,
  o: { campaignId: string; razlog: string; moderatorId: string },
  sad: number = Date.now(),
): Promise<{ ok: true } | { ok: false; greska: GreskaBlokade }> {
  const razlog = o.razlog.trim();
  if (razlog.length < OBRAZLOZENJE_MIN || razlog.length > OBRAZLOZENJE_MAX) return { ok: false, greska: "razlog" };
  const k = await db
    .prepare("SELECT s.blocked_at FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id WHERE c.id = ? AND c.deleted_at IS NULL")
    .bind(o.campaignId)
    .first<{ blocked_at: number | null }>();
  if (!k) return { ok: false, greska: "nema" };
  if (k.blocked_at !== null) return { ok: false, greska: "stanje" };
  await blokiraj(db, o.campaignId, razlog, sad, "risk");
  await zapisiOdluku(db, { reportId: null, vrsta: "campaign", ciljId: o.campaignId, radnja: "block_campaign", obrazlozenje: razlog, zalba: false, moderatorId: o.moderatorId }, sad);
  return { ok: true };
}

/** Deblokada (A) s obrazloženjem: `blocked_at = NULL` + odluka moderacije `no_action`. */
export async function deblokirajKampanju(
  db: D1Database,
  o: { campaignId: string; razlog: string; moderatorId: string },
  sad: number = Date.now(),
): Promise<{ ok: true } | { ok: false; greska: GreskaBlokade }> {
  const razlog = o.razlog.trim();
  if (razlog.length < OBRAZLOZENJE_MIN || razlog.length > OBRAZLOZENJE_MAX) return { ok: false, greska: "razlog" };
  const k = await db.prepare("SELECT 1 AS da FROM campaigns WHERE id = ? AND deleted_at IS NULL").bind(o.campaignId).first();
  if (!k) return { ok: false, greska: "nema" };
  if (!(await odblokiraj(db, o.campaignId, sad))) return { ok: false, greska: "stanje" };
  await zapisiOdluku(db, { reportId: null, vrsta: "campaign", ciljId: o.campaignId, radnja: "no_action", obrazlozenje: razlog, zalba: false, moderatorId: o.moderatorId }, sad);
  return { ok: true };
}
