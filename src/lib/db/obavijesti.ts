/**
 * Posljedice prijelaza doprinosa u `paid` (S8): poruka kao komentar i mock e-poruka organizatoru.
 *
 * Izjave idu u ISTI `db.batch` kao prijelaz (`src/lib/db/uplate.ts`), ispred `UPDATE contributions`, i
 * uvjetovane su istim polaznim stanjem doprinosa, kao `campaign_stats` (odluka 712): webhook i pull istog intenta
 * upišu ih jednom. Dodatno `NOT EXISTS` čuva od drugog komentara za isti doprinos.
 *
 * - **Komentar:** samo ako je podržavatelj označio „prikaži poruku kao komentar”, poruka postoji i nije skrivena,
 *   a kampanja ne isključuje komentare. Autor je korisnik iz atribucije (neprijavljeni: NULL, prikaz kao doprinos).
 * - **Obavijest organizatoru:** `notifications(kind = contribution_received, campaign_id)` autoru kampanje
 *   (`campaign_settings.created_by_user_id`) ako kampanja ima uključene obavijesti o uplatama. Payload nosi samo
 *   kampanju i iznos, bez imena, e-pošte ili IBAN-a podržavatelja. Prototip ništa ne šalje (`sent_at` NULL).
 */
import { uuid7 } from "./zajednicko";

export function izjavePriPlacanju(
  db: D1Database,
  doprinosId: string,
  izStanja: readonly string[],
  primljenoCenti: number,
  sad: number,
): D1PreparedStatement[] {
  const iz = izStanja.map((x) => `'${x.replace(/'/g, "")}'`).join(",");
  return [
    db
      .prepare(
        `INSERT INTO comments (id, campaign_id, update_id, parent_id, author_id, contribution_id, body, hidden_at, hidden_by, created_at, deleted_at)
         SELECT ?1, d.campaign_id, NULL, NULL, a.user_id, d.id, trim(p.message), NULL, NULL, ?2, NULL
           FROM contributions d
           JOIN contribution_attributions a ON a.contribution_id = d.id
           JOIN contribution_profiles p ON p.contribution_id = d.id
           JOIN campaign_settings s ON s.campaign_id = d.campaign_id
          WHERE d.id = ?3 AND d.state IN (${iz})
            AND a.show_message_as_comment = 1 AND p.message IS NOT NULL AND length(trim(p.message)) > 0 AND p.message_hidden = 0
            AND s.comments_mode <> 'off'
            AND NOT EXISTS (SELECT 1 FROM comments k WHERE k.contribution_id = d.id)`,
      )
      .bind(uuid7(sad), sad, doprinosId),
    db
      .prepare(
        `INSERT INTO notifications (id, user_id, email, kind, payload, created_at, sent_at, campaign_id)
         SELECT ?1, u.id, u.email, 'contribution_received',
                json_object('kampanja', s.public_id, 'naslov', c.title, 'iznosCenti', ?2, 'doprinos', d.id), ?3, NULL, d.campaign_id
           FROM contributions d
           JOIN campaigns c ON c.id = d.campaign_id
           JOIN campaign_settings s ON s.campaign_id = d.campaign_id
           JOIN users u ON u.id = s.created_by_user_id
          WHERE d.id = ?4 AND d.state IN (${iz}) AND s.contribution_notifications = 1 AND u.deleted_at IS NULL`,
      )
      .bind(uuid7(sad), primljenoCenti, sad, doprinosId),
  ];
}

export interface MockPoruka {
  id: string;
  email: string;
  iznosCenti: number;
  poslano: number;
}

/** Zadnje mock e-poruke organizatoru o novim doprinosima za kampanju (upravljanje → obavijesti). */
export async function porukeOUplatama(db: D1Database, campaignId: string, n = 10): Promise<MockPoruka[]> {
  const { results } = await db
    .prepare(
      `SELECT id, email, CAST(json_extract(payload, '$.iznosCenti') AS INTEGER) AS iznos, created_at FROM notifications
        WHERE campaign_id = ? AND kind = 'contribution_received' ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .bind(campaignId, n)
    .all<{ id: string; email: string; iznos: number; created_at: number }>();
  return results.map((r) => ({ id: r.id, email: r.email, iznosCenti: r.iznos, poslano: r.created_at }));
}
