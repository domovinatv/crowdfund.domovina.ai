/**
 * Novosti (ažuriranja) kampanje za organizatora (S6, `campaign.manage.updates`): popis, nova, uredi, obriši (soft).
 * Javni prikaz je `novostiKampanje` u `kampanja.ts` (bez obrisanih, bez novosti samo za razinu).
 * Nova novost stvara obavijesti potvrđenim pratiteljima s uključenim „novosti” (`notifications`, mock bez slanja).
 */
import { uuid7 } from "./zajednicko";

export const NAJVISE_NOVOSTI = { title: 120, body: 10000 } as const;

export interface NovostUpravljanja {
  id: string;
  title: string | null;
  body: string;
  publishedAt: number;
  updatedAt: number;
  authorName: string | null;
  brojKomentara: number;
}

export async function novostiZaUpravljanje(db: D1Database, campaignId: string): Promise<NovostUpravljanja[]> {
  const { results } = await db
    .prepare(
      `SELECT x.id, x.title, x.body, x.published_at, x.updated_at, u.display_name,
              (SELECT count(*) FROM comments k WHERE k.update_id = x.id AND k.deleted_at IS NULL) AS n
         FROM campaign_updates x LEFT JOIN users u ON u.id = x.author_id
        WHERE x.campaign_id = ? AND x.deleted_at IS NULL
        ORDER BY x.published_at DESC, x.id`,
    )
    .bind(campaignId)
    .all<{ id: string; title: string | null; body: string; published_at: number; updated_at: number; display_name: string | null; n: number }>();
  return results.map((r) => ({
    id: r.id, title: r.title, body: r.body, publishedAt: r.published_at, updatedAt: r.updated_at, authorName: r.display_name, brojKomentara: r.n,
  }));
}

export type GreskeNovosti = Partial<Record<"title" | "body", "obavezno" | "predugo">>;

/** Nova novost (bez `id`) ili izmjena postojeće neobrisane novosti iste kampanje. */
export async function spremiNovost(
  db: D1Database,
  campaignId: string,
  authorId: string,
  u: { id?: string; title: string; body: string },
  sad: number,
): Promise<{ ok: true; id: string } | { ok: false; greske: GreskeNovosti } | { ok: false; nema: true }> {
  const title = u.title.trim();
  const body = u.body.trim();
  const g: GreskeNovosti = {};
  if (title.length > NAJVISE_NOVOSTI.title) g.title = "predugo";
  if (!body) g.body = "obavezno";
  else if (body.length > NAJVISE_NOVOSTI.body) g.body = "predugo";
  if (Object.keys(g).length > 0) return { ok: false, greske: g };
  if (u.id) {
    const r = await db
      .prepare("UPDATE campaign_updates SET title = ?, body = ?, updated_at = ? WHERE id = ? AND campaign_id = ? AND deleted_at IS NULL")
      .bind(title || null, body, sad, u.id, campaignId)
      .run();
    return (r.meta.changes ?? 0) > 0 ? { ok: true, id: u.id } : { ok: false, nema: true };
  }
  const id = uuid7(sad);
  await db
    .prepare("INSERT INTO campaign_updates (id, campaign_id, author_id, title, body, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, campaignId, authorId, title || null, body, sad, sad)
    .run();
  await obavijestiPratitelje(db, campaignId, "campaign_update", { update_id: id }, sad);
  return { ok: true, id };
}

export async function obrisiNovost(db: D1Database, campaignId: string, id: string, sad: number): Promise<boolean> {
  const r = await db
    .prepare("UPDATE campaign_updates SET deleted_at = ?, updated_at = ? WHERE id = ? AND campaign_id = ? AND deleted_at IS NULL")
    .bind(sad, sad, id, campaignId)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

/**
 * Obavijest potvrđenim pratiteljima (`notifications`, prototip ne šalje). `campaign_update` ide onima s
 * `notify_updates`, `campaign_comment` onima s `notify_comments`; autor radnje se preskače.
 */
export async function obavijestiPratitelje(
  db: D1Database,
  campaignId: string,
  kind: "campaign_update" | "campaign_comment",
  payload: Record<string, string>,
  sad: number,
  osimKorisnika: string | null = null,
): Promise<void> {
  const stupac = kind === "campaign_update" ? "notify_updates" : "notify_comments";
  const { results } = await db
    .prepare(
      `SELECT f.user_id, COALESCE(u.email, f.email) AS email FROM campaign_follows f LEFT JOIN users u ON u.id = f.user_id
        WHERE f.campaign_id = ? AND f.${stupac} = 1 AND f.confirmed_at IS NOT NULL AND (f.user_id IS NULL OR f.user_id <> ?)`,
    )
    .bind(campaignId, osimKorisnika ?? "")
    .all<{ user_id: string | null; email: string | null }>();
  const tekst = JSON.stringify({ campaign_id: campaignId, ...payload });
  for (const r of results) {
    if (!r.email) continue;
    await db
      .prepare("INSERT INTO notifications (id, user_id, email, kind, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(uuid7(sad), r.user_id, r.email, kind, tekst, sad)
      .run();
  }
}
