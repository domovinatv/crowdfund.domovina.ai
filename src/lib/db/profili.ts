/**
 * Javni profili: osoba `/hr/u/{slug}`, organizacija `/hr/o/{slug}`, katalog organizacija i vanjska 4fund
 * kampanja `/hr/vanjska/{id}` (S5).
 *
 * Shema nema `users.slug`, pa je slug profila osobe njezin `users.id` (UUIDv7, ne da se nabrojati).
 * Profil osobe je javan dok je uključen barem jedan od 9 prekidača vidljivosti (ekran 12, `PROFIL_JAVAN`).
 */
import {
  JEDNAKI,
  ORG_VERIFICIRANA,
  PO_STRANICI,
  PROFIL_JAVAN,
  U_KATALOGU,
  U_POPISU,
  kartice,
  stranicaIz,
  type PunaKartica,
} from "./zajednicko";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Redoslijed kampanja na profilima: aktivne prije isključenih i zatvorenih, pa novije. */
const NA_PROFILU = `(c.state = 'closed') ASC, (s.paused_at IS NOT NULL) ASC, ${JEDNAKI}`;
const NAJVISE_NA_PROFILU = 48;

export interface ProfilKorisnika {
  slug: string;
  displayName: string | null;
  about: string | null;
  website: string | null;
  /** Samo uz `show_avatar`. */
  avatarFileId: string | null;
  /** Samo uz `show_email` (vlasnik profila je sam odlučio). */
  email: string | null;
  /** Samo uz `show_phone`. */
  phone: string | null;
  /** Samo uz `show_registered_date`. */
  registeredAt: number | null;
  /** Samo uz `show_total_raised`: zbroj prikupljenog na njegovim javnim kampanjama bez skrivenog iznosa. */
  totalRaisedCents: number | null;
  noindex: boolean;
  /** null = prekidač isključen (sekcija se ne prikazuje); [] = uključen, ali prazno. */
  kampanje: {
    vlastite: PunaKartica[] | null;
    zaOrganizacije: PunaKartica[] | null;
    podrzane: PunaKartica[] | null;
    promovirane: PunaKartica[] | null;
  };
}

interface RedakProfila {
  id: string;
  display_name: string | null;
  about: string | null;
  website: string | null;
  avatar_file_id: string | null;
  email: string;
  phone: string | null;
  created_at: number;
  javan: number;
  show_email: number;
  show_avatar: number;
  show_phone: number;
  show_total_raised: number;
  show_registered_date: number;
  show_promoted: number;
  show_owned: number;
  show_donated: number;
  show_for_organization: number;
  indexable: number;
}

/** Javni profil osobe; null = 404 (nema je, obrisana ili su svi prekidači vidljivosti isključeni). */
export async function profilKorisnika(db: D1Database, slug: string, sad: Date = new Date()): Promise<ProfilKorisnika | null> {
  const id = slug.trim().toLowerCase();
  if (!UUID.test(id)) return null;
  // Bez reda u user_settings vrijede zadane vrijednosti sheme.
  const r = await db
    .prepare(
      `SELECT u.id, u.display_name, u.about, u.website, u.avatar_file_id, u.email, u.phone, u.created_at,
              ${PROFIL_JAVAN} AS javan,
              COALESCE(us.show_email, 0) AS show_email, COALESCE(us.show_avatar, 1) AS show_avatar,
              COALESCE(us.show_phone, 0) AS show_phone, COALESCE(us.show_total_raised, 0) AS show_total_raised,
              COALESCE(us.show_registered_date, 1) AS show_registered_date,
              COALESCE(us.show_promoted, 1) AS show_promoted, COALESCE(us.show_owned, 1) AS show_owned,
              COALESCE(us.show_donated, 1) AS show_donated, COALESCE(us.show_for_organization, 1) AS show_for_organization,
              COALESCE(us.indexable, 1) AS indexable
         FROM users u LEFT JOIN user_settings us ON us.user_id = u.id
        WHERE u.id = ?`,
    )
    .bind(id)
    .first<RedakProfila>();
  if (!r || r.javan !== 1) return null;

  // Svaki `?` u uvjetu je id korisnika.
  const popis = (uvjet: string) =>
    kartice(db, `${U_POPISU} AND ${uvjet}`, Array(uvjet.split("?").length - 1).fill(r.id), NA_PROFILU, sad, NAJVISE_NA_PROFILU);
  const [vlastite, zaOrganizacije, podrzane, promovirane] = await Promise.all([
    r.show_owned ? popis("s.created_by_user_id = ? AND s.kind != 'for_organization'") : null,
    r.show_for_organization ? popis("s.created_by_user_id = ? AND s.kind = 'for_organization'") : null,
    // Samo neanonimni plaćeni doprinosi prijavljenog korisnika (atribucija nosi user_id).
    r.show_donated
      ? popis(`EXISTS (SELECT 1 FROM contribution_attributions a JOIN contributions d ON d.id = a.contribution_id
                        JOIN contribution_profiles cp ON cp.contribution_id = d.id
                       WHERE a.user_id = ? AND d.campaign_id = c.id AND d.state = 'paid' AND cp.anonymous = 0)`)
      : null,
    r.show_promoted
      ? popis(`c.id IN (SELECT m.campaign_id FROM moneyboxes m WHERE m.owner_user_id = ? AND m.status = 'active'
                        UNION SELECT l.campaign_id FROM tracking_links l WHERE l.owner_user_id = ? AND l.status = 'active')`)
      : null,
  ]);

  let totalRaisedCents: number | null = null;
  if (r.show_total_raised) {
    const t = await db
      .prepare(
        `SELECT COALESCE(SUM(st.raised_cents), 0) AS n
           FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
           JOIN campaign_stats st ON st.campaign_id = c.id
          WHERE s.created_by_user_id = ? AND s.hide_raised = 0 AND ${U_POPISU}`,
      )
      .bind(r.id)
      .first<{ n: number }>();
    totalRaisedCents = t?.n ?? 0;
  }

  return {
    slug: r.id,
    displayName: r.display_name,
    about: r.about,
    website: r.website,
    avatarFileId: r.show_avatar ? r.avatar_file_id : null,
    email: r.show_email ? r.email : null,
    phone: r.show_phone ? r.phone : null,
    registeredAt: r.show_registered_date ? r.created_at : null,
    totalRaisedCents,
    noindex: r.indexable === 0,
    kampanje: { vlastite, zaOrganizacije, podrzane, promovirane },
  };
}

export interface VanjskaKartica {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  categoryKey: string | null;
  platform: string;
}

export interface ProfilOrganizacije {
  slug: string;
  displayName: string;
  description: string | null;
  website: string | null;
  socialLinks: unknown[];
  legalForm: string;
  kind: "legal" | "personal";
  category: { key: string; nameHr: string; nameEn: string } | null;
  city: string | null;
  verified: boolean;
  fixedBeneficiary: boolean;
  logoFileId: string | null;
  /** Safe organizacije (kamo ide novac) ili null. */
  safe: { address: string; chainId: number } | null;
  /** Javne kampanje organizacije (aktivne, isključene i zatvorene; bez unlisted). */
  kampanje: PunaKartica[];
  vanjske: VanjskaKartica[];
}

/** Javni profil organizacije; null = 404 (nema je, obrisana, ili status nije `active`). */
export async function organizacijaPoSlugu(db: D1Database, slug: string, sad: Date = new Date()): Promise<ProfilOrganizacije | null> {
  const sl = slug.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,40}$/.test(sl)) return null;
  const r = await db
    .prepare(
      `SELECT o.id, o.organizer_id, o.slug, o.display_name, o.description, o.website, o.social_links, o.legal_form,
              o.kind, o.category_key, k.name_hr, k.name_en, g.city, ${ORG_VERIFICIRANA} AS verified,
              o.is_fixed_beneficiary, o.logo_file_id, o.safe_address, o.safe_chain_id
         FROM organizations o
         JOIN organizers g ON g.id = o.organizer_id
         LEFT JOIN categories k ON k.key = o.category_key
        WHERE o.slug = ? AND o.deleted_at IS NULL AND o.status = 'active'`,
    )
    .bind(sl)
    .first<{
      id: string;
      organizer_id: string;
      slug: string;
      display_name: string;
      description: string | null;
      website: string | null;
      social_links: string;
      legal_form: string;
      kind: "legal" | "personal";
      category_key: string | null;
      name_hr: string | null;
      name_en: string | null;
      city: string | null;
      verified: number;
      is_fixed_beneficiary: number;
      logo_file_id: string | null;
      safe_address: string | null;
      safe_chain_id: number | null;
    }>();
  if (!r) return null;
  const [kamp, { results: vanjske }] = await Promise.all([
    kartice(db, `${U_POPISU} AND c.organizer_id = ?`, [r.organizer_id], NA_PROFILU, sad, NAJVISE_NA_PROFILU),
    db
      .prepare(
        `SELECT id, title, url, image_url, category_key, platform FROM external_campaigns
          WHERE organization_id = ? AND status = 'active' ORDER BY created_at DESC, id`,
      )
      .bind(r.id)
      .all<{ id: string; title: string; url: string; image_url: string | null; category_key: string | null; platform: string }>(),
  ]);
  return {
    slug: r.slug,
    displayName: r.display_name,
    description: r.description,
    website: r.website,
    socialLinks: JSON.parse(r.social_links) as unknown[],
    legalForm: r.legal_form,
    kind: r.kind,
    category: r.category_key ? { key: r.category_key, nameHr: r.name_hr ?? "", nameEn: r.name_en ?? "" } : null,
    city: r.city,
    verified: r.verified === 1,
    fixedBeneficiary: r.is_fixed_beneficiary === 1,
    logoFileId: r.logo_file_id,
    safe: r.safe_address && r.safe_chain_id ? { address: r.safe_address, chainId: r.safe_chain_id } : null,
    kampanje: kamp,
    vanjske: vanjske.map((v) => ({ id: v.id, title: v.title, url: v.url, imageUrl: v.image_url, categoryKey: v.category_key, platform: v.platform })),
  };
}

export interface KarticaOrganizacije {
  slug: string;
  displayName: string;
  description: string | null;
  categoryKey: string | null;
  categoryHr: string | null;
  categoryEn: string | null;
  city: string | null;
  verified: boolean;
  logoFileId: string | null;
  /** Kampanje u katalogu (aktivne, javne, neisključene). */
  brojAktivnihKampanja: number;
}

export interface KatalogOrganizacija {
  organizacije: KarticaOrganizacije[];
  ukupno: number;
  stranica: number;
  poStranici: number;
  ukupnoStranica: number;
}

/** Katalog `/hr/organizacije`: aktivne organizacije, filtar kategorije, abecedno (neutralan redoslijed). */
export async function katalogOrganizacija(
  db: D1Database,
  { category = null, page = 1 }: { category?: string | null; page?: number | string | null } = {},
): Promise<KatalogOrganizacija> {
  const stranica = stranicaIz(page);
  const uvjet = `o.deleted_at IS NULL AND o.status = 'active'${category ? " AND o.category_key = ?" : ""}`;
  const p = category ? [category] : [];
  const n = await db.prepare(`SELECT count(*) AS n FROM organizations o WHERE ${uvjet}`).bind(...p).first<{ n: number }>();
  const ukupno = n?.n ?? 0;
  const { results } = await db
    .prepare(
      `SELECT o.slug, o.display_name, o.description, o.category_key, k.name_hr, k.name_en, g.city,
              ${ORG_VERIFICIRANA} AS verified, o.logo_file_id,
              (SELECT count(*) FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
                WHERE c.organizer_id = o.organizer_id AND ${U_KATALOGU}) AS aktivnih
         FROM organizations o
         JOIN organizers g ON g.id = o.organizer_id
         LEFT JOIN categories k ON k.key = o.category_key
        WHERE ${uvjet}
        ORDER BY o.display_name COLLATE NOCASE, o.id
        LIMIT ? OFFSET ?`,
    )
    .bind(...p, PO_STRANICI, (stranica - 1) * PO_STRANICI)
    .all<{
      slug: string;
      display_name: string;
      description: string | null;
      category_key: string | null;
      name_hr: string | null;
      name_en: string | null;
      city: string | null;
      verified: number;
      logo_file_id: string | null;
      aktivnih: number;
    }>();
  return {
    organizacije: results.map((r) => ({
      slug: r.slug,
      displayName: r.display_name,
      description: r.description,
      categoryKey: r.category_key,
      categoryHr: r.name_hr,
      categoryEn: r.name_en,
      city: r.city,
      verified: r.verified === 1,
      logoFileId: r.logo_file_id,
      brojAktivnihKampanja: r.aktivnih,
    })),
    ukupno,
    stranica,
    poStranici: PO_STRANICI,
    ukupnoStranica: Math.max(1, Math.ceil(ukupno / PO_STRANICI)),
  };
}

export interface VanjskaKampanja extends VanjskaKartica {
  externalId: string;
  verifiedAt: number | null;
  category: { key: string; nameHr: string; nameEn: string } | null;
  organizacija: { slug: string; displayName: string; verified: boolean };
}

/** Vanjska 4fund kampanja (tok 9, odluka 209); null = 404 (nema je, nije `active`, organizacija nije aktivna). */
export async function vanjskaKampanja(db: D1Database, id: string): Promise<VanjskaKampanja | null> {
  const eid = id.trim().toLowerCase();
  if (!UUID.test(eid)) return null;
  const r = await db
    .prepare(
      `SELECT e.id, e.title, e.url, e.image_url, e.category_key, e.platform, e.external_id, e.verified_at,
              k.name_hr, k.name_en, o.slug, o.display_name, ${ORG_VERIFICIRANA} AS verified
         FROM external_campaigns e
         JOIN organizations o ON o.id = e.organization_id
         LEFT JOIN categories k ON k.key = e.category_key
        WHERE e.id = ? AND e.status = 'active' AND o.deleted_at IS NULL AND o.status = 'active'`,
    )
    .bind(eid)
    .first<{
      id: string;
      title: string;
      url: string;
      image_url: string | null;
      category_key: string | null;
      platform: string;
      external_id: string;
      verified_at: number | null;
      name_hr: string | null;
      name_en: string | null;
      slug: string;
      display_name: string;
      verified: number;
    }>();
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    url: r.url,
    imageUrl: r.image_url,
    categoryKey: r.category_key,
    platform: r.platform,
    externalId: r.external_id,
    verifiedAt: r.verified_at,
    category: r.category_key ? { key: r.category_key, nameHr: r.name_hr ?? "", nameEn: r.name_en ?? "" } : null,
    organizacija: { slug: r.slug, displayName: r.display_name, verified: r.verified === 1 },
  };
}
