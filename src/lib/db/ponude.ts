/**
 * Ponude kampanje za javnu stranicu (S5 upit premješten iz `campaign.ucitaj.ts` u S6). Ponude su faza 2
 * (odluka 8); prodavatelj se ne čita (osobni podatak).
 */
export interface Ponuda {
  id: string;
  title: string;
  description: string | null;
  mode: "buy_now" | "auction";
  priceCents: number;
  quantity: number;
  delivery: string;
  endsAt: number | null;
}

/** Aktivne ponude kampanje, od najnovije, najviše 12. */
export async function ponudeKampanje(db: D1Database, campaignId: string): Promise<Ponuda[]> {
  const { results } = await db
    .prepare(
      `SELECT id, title, description, mode, price_cents, quantity, delivery, ends_at
         FROM offers WHERE campaign_id = ? AND status = 'active' ORDER BY created_at DESC, id LIMIT 12`,
    )
    .bind(campaignId)
    .all<{ id: string; title: string; description: string | null; mode: Ponuda["mode"]; price_cents: number; quantity: number; delivery: string; ends_at: number | null }>();
  return results.map((r) => ({
    id: r.id, title: r.title, description: r.description, mode: r.mode, priceCents: r.price_cents,
    quantity: r.quantity, delivery: r.delivery, endsAt: r.ends_at,
  }));
}
