/**
 * DSA prijava sadržaja `/hr/prijavi-sadrzaj` (tok 8, ekran 22): validacija i upis u `reports` + privola
 * `report_gdpr` u `consents`. Ruta nema sesiju u S5, pa je e-pošta obavezna.
 */
import { normalizirajJavniId } from "./kampanja";
import { VIDLJIVA, uuid7 } from "./zajednicko";

export const CILJEVI_PRIJAVE = ["campaign", "comment", "update", "moneybox", "offer", "user", "organization"] as const;
export const RAZLOZI_PRIJAVE = ["fraud", "illegal", "hate", "violence", "privacy", "intellectual_property", "spam", "other"] as const;
export type CiljPrijave = (typeof CILJEVI_PRIJAVE)[number];
export type RazlogPrijave = (typeof RAZLOZI_PRIJAVE)[number];

/** Verzija teksta privole za obradu podataka iz prijave (consents.text_version). */
export const VERZIJA_PRIVOLE_PRIJAVE = "report-2026-11";

export interface UlazPrijave {
  targetType: string;
  /** Kampanja: javni ID ili interni; kasica: id ili alias; organizacija: id ili slug; ostalo: id. */
  targetId: string;
  reason: string;
  description: string;
  email: string;
  phone?: string | null;
  /** Privola za obradu podataka iz prijave. */
  privola: boolean;
}

export type GreskaPrijave = "obavezno" | "nevaljano" | "prekratko" | "predugo" | "ne_postoji";
export type PoljePrijave = "targetType" | "targetId" | "reason" | "description" | "email" | "phone" | "privola";

export type RezultatPrijave =
  | { ok: true; id: string }
  | { ok: false; greske: Partial<Record<PoljePrijave, GreskaPrijave>> };

export const OPIS_MIN = 50;
export const OPIS_MAX = 500;
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFON = /^[+0-9 ()/-]{6,30}$/;

/** Interni id cilja ili null; skriveni (npr. draft, blokirana kampanja) se ponaša kao nepostojeći. */
async function razrijesiCilj(db: D1Database, tip: CiljPrijave, id: string): Promise<string | null> {
  const x = id.trim();
  if (!x || x.length > 64) return null;
  const prvi = async (sql: string, ...p: unknown[]) => (await db.prepare(sql).bind(...p).first<{ id: string }>())?.id ?? null;
  switch (tip) {
    case "campaign":
      return prvi(
        `SELECT c.id FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
          WHERE (s.public_id = ? OR c.id = ?) AND ${VIDLJIVA}`,
        normalizirajJavniId(x) ?? "", x.toLowerCase(),
      );
    case "comment":
      return prvi("SELECT id FROM comments WHERE id = ? AND deleted_at IS NULL", x);
    case "update":
      return prvi("SELECT id FROM campaign_updates WHERE id = ? AND deleted_at IS NULL", x);
    case "moneybox":
      return prvi("SELECT id FROM moneyboxes WHERE (id = ? OR alias = ?) AND status != 'deleted'", x, x.toLowerCase());
    case "offer":
      return prvi("SELECT id FROM offers WHERE id = ?", x);
    case "user":
      return prvi("SELECT id FROM users WHERE id = ? AND deleted_at IS NULL", x.toLowerCase());
    case "organization":
      return prvi("SELECT id FROM organizations WHERE (id = ? OR slug = ?) AND deleted_at IS NULL", x, x.toLowerCase());
  }
}

export async function spremiPrijavu(db: D1Database, ulaz: UlazPrijave, sad: Date = new Date()): Promise<RezultatPrijave> {
  const greske: Partial<Record<PoljePrijave, GreskaPrijave>> = {};
  const tip = ulaz.targetType?.trim();
  const valjanTip = (CILJEVI_PRIJAVE as readonly string[]).includes(tip);
  if (!tip) greske.targetType = "obavezno";
  else if (!valjanTip) greske.targetType = "nevaljano";
  if (!ulaz.targetId?.trim()) greske.targetId = "obavezno";

  const razlog = ulaz.reason?.trim();
  if (!razlog) greske.reason = "obavezno";
  else if (!(RAZLOZI_PRIJAVE as readonly string[]).includes(razlog)) greske.reason = "nevaljano";

  const opis = (ulaz.description ?? "").trim();
  if (!opis) greske.description = "obavezno";
  else if (opis.length < OPIS_MIN) greske.description = "prekratko";
  else if (opis.length > OPIS_MAX) greske.description = "predugo";

  const email = (ulaz.email ?? "").trim();
  if (!email) greske.email = "obavezno";
  else if (email.length > 254 || !EPOSTA.test(email)) greske.email = "nevaljano";

  const telefon = ulaz.phone?.trim() || null;
  if (telefon && !TELEFON.test(telefon)) greske.phone = "nevaljano";

  if (ulaz.privola !== true) greske.privola = "obavezno";

  let cilj: string | null = null;
  if (valjanTip && !greske.targetId) {
    cilj = await razrijesiCilj(db, tip as CiljPrijave, ulaz.targetId);
    if (!cilj) greske.targetId = "ne_postoji";
  }
  if (Object.keys(greske).length > 0 || !cilj) return { ok: false, greske };

  const t = sad.getTime();
  const id = uuid7(t);
  await db
    .prepare(
      `INSERT INTO reports (id, target_type, target_id, reason, description, reporter_user_id, reporter_email, phone,
                            attachment_file_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL, 'received', ?, ?)`,
    )
    .bind(id, tip, cilj, razlog, opis, email, telefon, t, t)
    .run();
  await db
    .prepare(
      `INSERT INTO consents (id, user_id, email, kind, text_version, granted, created_at)
       VALUES (?, NULL, ?, 'report_gdpr', ?, 1, ?)`,
    )
    .bind(uuid7(t), email, VERZIJA_PRIVOLE_PRIJAVE, t)
    .run();
  return { ok: true, id };
}
