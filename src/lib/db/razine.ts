/**
 * Razine podrške (faza 2, odluka 8): `campaign_tiers` i ekskluzivne novosti razine (`campaign_updates.tier_id`).
 * Javno se od novosti razine vidi samo naslov, razina i datum (zaključan pregled), nikad tekst. Odabira razine pri
 * podršci u prvoj fazi nema, pa ni upisa razina iz organizatorskog dijela.
 */

export interface NovostRazine {
  id: string;
  title: string | null;
  tierTitle: string;
  publishedAt: number;
}

/** Zaključan pregled ekskluzivnih novosti razine (bez teksta), od najnovije, najviše 10. */
export async function novostiRazina(db: D1Database, campaignId: string): Promise<NovostRazine[]> {
  const { results } = await db
    .prepare(
      `SELECT u.id, u.title, u.published_at, t.title AS tier_title
         FROM campaign_updates u JOIN campaign_tiers t ON t.id = u.tier_id AND t.campaign_id = u.campaign_id
        WHERE u.campaign_id = ? AND u.deleted_at IS NULL
        ORDER BY u.published_at DESC, u.id LIMIT 10`,
    )
    .bind(campaignId)
    .all<{ id: string; title: string | null; published_at: number; tier_title: string }>();
  return results.map((r) => ({ id: r.id, title: r.title, tierTitle: r.tier_title, publishedAt: r.published_at }));
}

export interface RazinaUpravljanja {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  priceCents: number | null;
  inventoryTotal: number | null;
  inventoryClaimed: number;
  /** Broj neobrisanih novosti samo za ovu razinu. */
  novosti: number;
}

/** Razine kampanje za organizatorski pregled `/hr/{id}/upravljanje/razine`, redom `sort`. */
export async function razineZaUpravljanje(db: D1Database, campaignId: string): Promise<RazinaUpravljanja[]> {
  const { results } = await db
    .prepare(
      `SELECT t.id, t.title, t.description, t.kind, t.price_cents, t.inventory_total, t.inventory_claimed,
              (SELECT count(*) FROM campaign_updates u WHERE u.tier_id = t.id AND u.deleted_at IS NULL) AS n
         FROM campaign_tiers t WHERE t.campaign_id = ? ORDER BY t.sort, t.id`,
    )
    .bind(campaignId)
    .all<{ id: string; title: string; description: string | null; kind: string; price_cents: number | null; inventory_total: number | null; inventory_claimed: number; n: number }>();
  return results.map((r) => ({
    id: r.id, title: r.title, description: r.description, kind: r.kind, priceCents: r.price_cents,
    inventoryTotal: r.inventory_total, inventoryClaimed: r.inventory_claimed, novosti: r.n,
  }));
}
