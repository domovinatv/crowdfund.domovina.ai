/**
 * Upiti nad kampanjama. Primaju `D1Database`, da ih test može zvati nad lokalnom bazom
 * (miniflare ili sqlite) bez Astra.
 */

/** Kartica kampanje na naslovnici i u katalogu (docs/08 §3.2). */
export interface KarticaKampanje {
  publicId: string;
  title: string;
  organizerName: string;
  organizationSlug: string | null;
  /** null kad organizator skriva iznos (hide_raised): skriveno se ne vraća iz upita. */
  raisedCents: number | null;
  goalCents: number | null;
  currency: string;
  /** null kad organizator skriva broj podržavatelja. */
  contributorCount: number | null;
  categoryKey: string | null;
  categoryHr: string | null;
  categoryEn: string | null;
  hideRaised: boolean;
  hideContributorCount: boolean;
  demo: boolean;
  // Polja ispod puni katalog (S5, src/lib/db/katalog.ts); aktivneKampanje() ih ne puni.
  /** Vrsta kampanje (campaign_settings.kind). */
  kind?: "one_time" | "recurring" | "for_organization";
  /** Organizacija ima odobren KYB (zadnja `org_kyb` verifikacija `approved`). */
  verified?: boolean;
  /** Rok (unix ms) ili null bez roka. */
  endsAt?: number | null;
  /** Dana do roka (gore), 0 nakon roka, null bez roka. */
  daysLeft?: number | null;
  /** Tema naslovnice (galerija se u prototipu ne seeda). */
  coverTheme?: string | null;
  coverImageUrl?: string | null;
  /** Mjesečne kampanje: plaćeno u zadnjih 30 dana; null kad nije mjesečna ili je iznos skriven. */
  monthlyCents?: number | null;
  locationName?: string | null;
  /** Stanje za prikaz (zatvorena > isključena > aktivna). */
  state?: "active" | "paused" | "closed";
}

interface Redak {
  public_id: string;
  title: string;
  organizer_name: string;
  organization_slug: string | null;
  raised_cents: number;
  goal_cents: number | null;
  currency: string;
  contributor_count: number;
  category_key: string | null;
  name_hr: string | null;
  name_en: string | null;
  hide_raised: number;
  hide_contributor_count: number;
  demo: number;
}

/**
 * Javno vidljive aktivne kampanje: `state = active`, `visibility = public` (unlisted ne ulazi
 * u popise, docs/07), nije obrisana, blokirana ni isključena (`paused_at`, odluka 204).
 * Redoslijed: zadnja aktivnost (zadnji doprinos, inače zadnja izmjena), pa prikupljeni iznos.
 */
export const SQL_AKTIVNE_KAMPANJE = `
SELECT s.public_id,
       c.title,
       COALESCE(o.display_name, g.legal_name) AS organizer_name,
       o.slug                                 AS organization_slug,
       COALESCE(st.raised_cents, 0)           AS raised_cents,
       c.goal_cents,
       c.currency,
       COALESCE(st.contributor_count, 0)      AS contributor_count,
       s.category_key,
       k.name_hr,
       k.name_en,
       s.hide_raised,
       s.hide_contributor_count,
       c.demo
  FROM campaigns c
  JOIN campaign_settings s ON s.campaign_id = c.id
  JOIN organizers g        ON g.id = c.organizer_id
  LEFT JOIN organizations o ON o.organizer_id = c.organizer_id AND o.deleted_at IS NULL
  LEFT JOIN campaign_stats st ON st.campaign_id = c.id
  LEFT JOIN categories k   ON k.key = s.category_key
 WHERE c.state = 'active'
   AND c.visibility = 'public'
   AND c.deleted_at IS NULL
   AND s.blocked_at IS NULL
   AND s.paused_at IS NULL
 ORDER BY COALESCE(st.last_contribution_at, c.updated_at) DESC,
          COALESCE(st.raised_cents, 0) DESC,
          c.id
 LIMIT ?1`;

export async function aktivneKampanje(db: D1Database, limit = 12): Promise<KarticaKampanje[]> {
  const { results } = await db.prepare(SQL_AKTIVNE_KAMPANJE).bind(limit).all<Redak>();
  return results.map((r) => ({
    publicId: r.public_id,
    title: r.title,
    organizerName: r.organizer_name,
    organizationSlug: r.organization_slug,
    raisedCents: r.hide_raised === 1 ? null : r.raised_cents,
    goalCents: r.goal_cents,
    currency: r.currency,
    contributorCount: r.hide_contributor_count === 1 ? null : r.contributor_count,
    categoryKey: r.category_key,
    categoryHr: r.name_hr,
    categoryEn: r.name_en,
    hideRaised: r.hide_raised === 1,
    hideContributorCount: r.hide_contributor_count === 1,
    demo: r.demo === 1,
  }));
}
