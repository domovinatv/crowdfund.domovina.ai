/**
 * Kasice (`/s/{alias}`, tok 6) i linkovi za praćenje (`/z/{slug}`, tok 7). Kasica i link nemaju svoj
 * novac: zbrajaju doprinose kroz `contribution_attributions` (docs/03 pravilo 7).
 */
import { canAcceptContributions } from "@domovina/campaign-core";
import { MIN, PROFIL_JAVAN, VIDLJIVA, stanjeKampanje, uuid7, type StanjeKampanje } from "./zajednicko";

export interface Kasica {
  alias: string;
  title: string;
  description: string | null;
  goalCents: number | null;
  /** Zbroj plaćenih doprinosa kroz kasicu; null kad kampanja skriva prikupljeno. */
  raisedCents: number | null;
  /** Broj plaćenih doprinosa kroz kasicu; null kad kampanja skriva broj podržavatelja. */
  contributionCount: number | null;
  ownerName: string | null;
  /** Slug javnog profila vlasnika (users.id) ili null. */
  ownerProfileSlug: string | null;
  createdAt: number;
  /** Tema naslovnice kasice (S10, 0010), inače tema kampanje; null kad nema ni jedne. */
  coverTheme: string | null;
  /** Kategorija kampanje (ikona na naslovnici). */
  kategorija: string | null;
}

export interface KasicaSKampanjom extends Kasica {
  kampanja: {
    publicId: string;
    title: string;
    organizerName: string;
    organizationSlug: string | null;
    stanje: StanjeKampanje;
    primaUplate: boolean;
    noindex: boolean;
  };
}

interface RedakKasice {
  alias: string;
  title: string;
  description: string | null;
  goal_cents: number | null;
  raised: number;
  n: number;
  owner_name: string | null;
  owner_id: string;
  profil_javan: number;
  created_at: number;
  hide_raised: number;
  hide_contributor_count: number;
  cover_theme: string | null;
  category_key: string | null;
}

const SELECT_KASICE = `
SELECT m.alias, m.title, m.description, m.goal_cents, m.created_at,
       u.display_name AS owner_name, COALESCE(u.slug, u.id) AS owner_id, ${PROFIL_JAVAN} AS profil_javan,
       s.hide_raised, s.hide_contributor_count, COALESCE(m.cover_theme, s.cover_theme) AS cover_theme, s.category_key,
       (SELECT COALESCE(SUM(d.amount_received_cents), 0) FROM contribution_attributions a
          JOIN contributions d ON d.id = a.contribution_id
         WHERE a.moneybox_id = m.id AND d.state = 'paid') AS raised,
       (SELECT count(*) FROM contribution_attributions a JOIN contributions d ON d.id = a.contribution_id
         WHERE a.moneybox_id = m.id AND d.state = 'paid') AS n`;

function uKasicu(r: RedakKasice): Kasica {
  return {
    alias: r.alias,
    title: r.title,
    description: r.description,
    goalCents: r.goal_cents,
    raisedCents: r.hide_raised === 1 ? null : r.raised,
    contributionCount: r.hide_contributor_count === 1 ? null : r.n,
    ownerName: r.owner_name,
    ownerProfileSlug: r.profil_javan === 1 ? r.owner_id : null,
    createdAt: r.created_at,
    coverTheme: r.cover_theme,
    kategorija: r.category_key,
  };
}

/** Aktivne kasice javno vidljive kampanje koja dopušta kasice; od najveće (skriveni iznos: od najnovije). */
export async function kasiceKampanje(db: D1Database, campaignId: string): Promise<Kasica[]> {
  const { results } = await db
    .prepare(
      `${SELECT_KASICE}
         FROM moneyboxes m
         JOIN campaigns c ON c.id = m.campaign_id
         JOIN campaign_settings s ON s.campaign_id = c.id
         JOIN users u ON u.id = m.owner_user_id
         LEFT JOIN user_settings us ON us.user_id = u.id
        WHERE m.campaign_id = ? AND m.status = 'active' AND s.allow_moneyboxes = 1 AND ${VIDLJIVA}
        ORDER BY CASE WHEN s.hide_raised = 1 THEN 0 ELSE raised END DESC, m.created_at DESC, m.id`,
    )
    .bind(campaignId)
    .all<RedakKasice>();
  return results.map(uKasicu);
}

/**
 * Kasica po aliasu (bez obzira na veličinu slova) s podacima kampanje za „Podrži”
 * (`/hr/{id}/podrzi?s={alias}`). null = 404: nema je, nije aktivna, kampanja ne dopušta kasice ili nije vidljiva.
 */
export async function kasicaPoAliasu(db: D1Database, alias: string): Promise<KasicaSKampanjom | null> {
  const a = alias.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,60}$/.test(a)) return null;
  const r = await db
    .prepare(
      `${SELECT_KASICE},
              s.public_id, c.title AS kampanja_title, COALESCE(o.display_name, g.legal_name) AS organizer_name,
              o.slug AS organization_slug, c.state, c.visibility, s.paused_at, s.indexable,
              f.address, f.threshold, f.owners, f.platform_signer_count, f.verified_at
         FROM moneyboxes m
         JOIN campaigns c ON c.id = m.campaign_id
         JOIN campaign_settings s ON s.campaign_id = c.id
         JOIN organizers g ON g.id = c.organizer_id
         LEFT JOIN organizations o ON o.organizer_id = c.organizer_id AND o.deleted_at IS NULL
         LEFT JOIN campaign_safes f ON f.campaign_id = c.id
         JOIN users u ON u.id = m.owner_user_id
         LEFT JOIN user_settings us ON us.user_id = u.id
        WHERE m.alias = ? AND m.status = 'active' AND s.allow_moneyboxes = 1 AND ${VIDLJIVA}`,
    )
    .bind(a)
    .first<RedakKasice & {
      public_id: string;
      kampanja_title: string;
      organizer_name: string;
      organization_slug: string | null;
      state: "active" | "closed";
      visibility: "public" | "unlisted";
      paused_at: number | null;
      indexable: number;
      address: string | null;
      threshold: number | null;
      owners: string | null;
      platform_signer_count: number | null;
      verified_at: number | null;
    }>();
  if (!r) return null;
  const stanje = stanjeKampanje(r.state, r.paused_at);
  const safe = r.address === null ? null : {
    address: r.address as `0x${string}`,
    threshold: r.threshold ?? 0,
    owners: JSON.parse(r.owners ?? "[]") as `0x${string}`[],
    platform_signer_count: r.platform_signer_count ?? 0,
    verified_at: r.verified_at,
  };
  return {
    ...uKasicu(r),
    kampanja: {
      publicId: r.public_id,
      title: r.kampanja_title,
      organizerName: r.organizer_name,
      organizationSlug: r.organization_slug,
      stanje,
      primaUplate: stanje === "active" && canAcceptContributions({ state: r.state, visibility: r.visibility }, safe),
      noindex: r.visibility === "unlisted" || r.indexable === 0,
    },
  };
}

export interface LinkZaPracenje {
  id: string;
  slug: string;
  campaignId: string;
  /** Kamo `/z/{slug}` preusmjerava: `/{lang}/{publicId}`. */
  publicId: string;
}

/** Aktivni link za praćenje javno vidljive kampanje (slug bez obzira na veličinu slova); null = 404. */
export async function linkZaPracenje(db: D1Database, slug: string): Promise<LinkZaPracenje | null> {
  const sl = slug.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,60}$/.test(sl)) return null;
  const r = await db
    .prepare(
      `SELECT l.id, l.slug, l.campaign_id, s.public_id
         FROM tracking_links l
         JOIN campaigns c ON c.id = l.campaign_id
         JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE l.slug = ? AND l.status = 'active' AND ${VIDLJIVA}`,
    )
    .bind(sl)
    .first<{ id: string; slug: string; campaign_id: string; public_id: string }>();
  return r ? { id: r.id, slug: r.slug, campaignId: r.campaign_id, publicId: r.public_id } : null;
}

/** Razmak u kojem se isti posjetitelj istog linka broji jednom (docs/04 tok 7). */
export const RAZMAK_POSJETA = 10 * MIN;

/**
 * Bilježi posjet linku ako isti posjetitelj (`posjetiteljHash` = HMAC(IP + UA + dan), bez sirovih podataka)
 * nije zabilježen u zadnjih 10 minuta. Vraća true ako je posjet upisan.
 */
export async function zabiljeziPosjet(db: D1Database, linkId: string, posjetiteljHash: string, sad: Date = new Date()): Promise<boolean> {
  const t = sad.getTime();
  const r = await db
    .prepare(
      `INSERT INTO link_visits (id, tracking_link_id, share_link_id, moneybox_id, visitor_hash, visited_at)
       SELECT ?1, ?2, NULL, NULL, ?3, ?4
        WHERE NOT EXISTS (SELECT 1 FROM link_visits
                           WHERE tracking_link_id = ?2 AND visitor_hash = ?3 AND visited_at > ?4 - ?5 AND visited_at <= ?4)`,
    )
    .bind(uuid7(t), linkId, posjetiteljHash, t, RAZMAK_POSJETA)
    .run();
  return (r.meta.changes ?? 0) > 0;
}
