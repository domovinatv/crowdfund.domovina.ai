/**
 * Komentari (S6): pisanje na javnoj stranici kampanje i moderacija organizatora (`campaign.manage.comments`,
 * ekran 22). Javni prikaz je `komentariKampanje` u `kampanja.ts` (bez skrivenih i obrisanih).
 *
 * Pravila: komentira samo prijavljeni korisnik (mock prijava, odluka 15); `comments_mode = off` zatvara i
 * prikaz i pisanje; `contributors` dopušta korisniku s plaćenim doprinosom ovoj kampanji i članovima
 * organizacije kampanje; tijelo 1–2.500 znakova (javni pregled §4.3); jedna razina odgovora.
 */
import { obavijestiPratitelje } from "./novosti";
import { VIDLJIVA, uuid7 } from "./zajednicko";

export const NAJVISE_KOMENTARA = 2500;

export type PravoKomentara = "da" | "prijava" | "iskljuceni" | "samo_podrzavatelji" | "nema";

/** Smije li korisnik (null = neprijavljen) komentirati javno vidljivu kampanju. */
export async function pravoKomentara(db: D1Database, campaignId: string, userId: string | null): Promise<PravoKomentara> {
  const r = await db
    .prepare(
      `SELECT s.comments_mode,
              (?2 IS NOT NULL AND (c.created_by = ?2 OR EXISTS (SELECT 1 FROM memberships m JOIN organizations o ON o.id = m.organization_id
                 WHERE m.user_id = ?2 AND o.organizer_id = c.organizer_id AND o.deleted_at IS NULL))) AS organizator,
              (?2 IS NOT NULL AND EXISTS (SELECT 1 FROM contributions d
                 LEFT JOIN contribution_attributions a ON a.contribution_id = d.id
                 LEFT JOIN checkouts ch ON ch.id = a.checkout_id
                WHERE d.campaign_id = c.id AND d.state = 'paid' AND (a.user_id = ?2 OR ch.user_id = ?2))) AS podrzavatelj
         FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE c.id = ?1 AND ${VIDLJIVA}`,
    )
    .bind(campaignId, userId)
    .first<{ comments_mode: "off" | "contributors" | "everyone"; organizator: number; podrzavatelj: number }>();
  if (!r) return "nema";
  if (r.comments_mode === "off") return "iskljuceni";
  if (!userId) return "prijava";
  if (r.comments_mode === "contributors" && r.organizator !== 1 && r.podrzavatelj !== 1) return "samo_podrzavatelji";
  return "da";
}

export type GreskaKomentara = "obavezno" | "predugo" | "zabranjeno" | "nema_roditelja";

function provjeriTijelo(body: string): GreskaKomentara | null {
  const b = body.trim();
  if (!b) return "obavezno";
  if (b.length > NAJVISE_KOMENTARA) return "predugo";
  return null;
}

/** Novi komentar s javne stranice (vrh, ne odgovor). Pravo se provjerava na poslužitelju. */
export async function dodajKomentar(
  db: D1Database,
  campaignId: string,
  userId: string | null,
  body: string,
  sad: number,
): Promise<{ ok: true; id: string } | { ok: false; greska: GreskaKomentara; pravo?: PravoKomentara }> {
  const pravo = await pravoKomentara(db, campaignId, userId);
  if (pravo !== "da" || !userId) return { ok: false, greska: "zabranjeno", pravo };
  const g = provjeriTijelo(body);
  if (g) return { ok: false, greska: g };
  const id = uuid7(sad);
  await db
    .prepare("INSERT INTO comments (id, campaign_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, campaignId, userId, body.trim(), sad)
    .run();
  await obavijestiPratitelje(db, campaignId, "campaign_comment", { comment_id: id }, sad, userId);
  return { ok: true, id };
}

// --- Moderacija organizatora ------------------------------------------------------------------------------

export interface KomentarUpravljanja {
  id: string;
  parentId: string | null;
  updateId: string | null;
  body: string;
  createdAt: number;
  hiddenAt: number | null;
  hiddenByName: string | null;
  /** Ime autora ili profila doprinosa (organizator vidi ime i kod javno anonimnog). */
  autor: string | null;
  anonimno: boolean;
  izDoprinosa: boolean;
  odgovori: KomentarUpravljanja[];
}

/** Svi neobrisani komentari kampanje (i skriveni), vrh od najnovijeg, odgovori kronološki. */
export async function komentariZaUpravljanje(db: D1Database, campaignId: string): Promise<KomentarUpravljanja[]> {
  const { results } = await db
    .prepare(
      `SELECT x.id, x.parent_id, x.update_id, x.body, x.created_at, x.hidden_at, h.display_name AS skrio,
              COALESCE(cp.display_name, u.display_name) AS autor, x.contribution_id, cp.anonymous
         FROM comments x
         LEFT JOIN users u ON u.id = x.author_id
         LEFT JOIN users h ON h.id = x.hidden_by
         LEFT JOIN contribution_profiles cp ON cp.contribution_id = x.contribution_id
        WHERE x.campaign_id = ? AND x.deleted_at IS NULL
        ORDER BY x.created_at, x.id`,
    )
    .bind(campaignId)
    .all<{ id: string; parent_id: string | null; update_id: string | null; body: string; created_at: number; hidden_at: number | null; skrio: string | null; autor: string | null; contribution_id: string | null; anonymous: number | null }>();
  const u = (r: (typeof results)[number]): KomentarUpravljanja => ({
    id: r.id, parentId: r.parent_id, updateId: r.update_id, body: r.body, createdAt: r.created_at, hiddenAt: r.hidden_at,
    hiddenByName: r.skrio, autor: r.autor, anonimno: r.contribution_id !== null && r.anonymous !== 0, izDoprinosa: r.contribution_id !== null, odgovori: [],
  });
  const vrh = new Map<string, KomentarUpravljanja>();
  for (const r of results) if (r.parent_id === null) vrh.set(r.id, u(r));
  for (const r of results) if (r.parent_id !== null) vrh.get(r.parent_id)?.odgovori.push(u(r));
  return [...vrh.values()].sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}

/** Sakrij (`hidden_at`, `hidden_by`) ili ponovno prikaži komentar ove kampanje. */
export async function postaviSkrivenost(db: D1Database, campaignId: string, id: string, sakrij: boolean, userId: string, sad: number): Promise<boolean> {
  const r = sakrij
    ? await db
        .prepare("UPDATE comments SET hidden_at = ?, hidden_by = ? WHERE id = ? AND campaign_id = ? AND hidden_at IS NULL AND deleted_at IS NULL")
        .bind(sad, userId, id, campaignId)
        .run()
    : await db
        .prepare("UPDATE comments SET hidden_at = NULL, hidden_by = NULL WHERE id = ? AND campaign_id = ? AND hidden_at IS NOT NULL AND deleted_at IS NULL")
        .bind(id, campaignId)
        .run();
  return (r.meta.changes ?? 0) > 0;
}

/** Odgovor organizatora na komentar vrha (jedna razina); odgovor na odgovor ide na njegov vrh. */
export async function odgovoriOrganizatora(
  db: D1Database,
  campaignId: string,
  parentId: string,
  userId: string,
  body: string,
  sad: number,
): Promise<{ ok: true; id: string } | { ok: false; greska: GreskaKomentara }> {
  const g = provjeriTijelo(body);
  if (g) return { ok: false, greska: g };
  const p = await db
    .prepare("SELECT id, parent_id, update_id FROM comments WHERE id = ? AND campaign_id = ? AND deleted_at IS NULL")
    .bind(parentId, campaignId)
    .first<{ id: string; parent_id: string | null; update_id: string | null }>();
  if (!p) return { ok: false, greska: "nema_roditelja" };
  const id = uuid7(sad);
  await db
    .prepare("INSERT INTO comments (id, campaign_id, update_id, parent_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, campaignId, p.update_id, p.parent_id ?? p.id, userId, body.trim(), sad)
    .run();
  return { ok: true, id };
}
