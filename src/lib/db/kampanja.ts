/**
 * Stranica kampanje `/hr/{id}` i njezine sekcije: novosti, komentari, uplate (S5, ekran 22).
 * Skriveno ne izlazi iz upita (odluka 406): skriveni iznos, broj, anonimno ime, skriveni iznos doprinosa.
 * E-pošta i drugi osobni podaci podržavatelja se nikad ne čitaju.
 */
import { canAcceptContributions } from "@domovina/campaign-core";
import {
  ORG_VERIFICIRANA,
  POPIS_SKRIVEN,
  PROFIL_JAVAN,
  VIDLJIVA,
  danaDoRoka,
  stanjeKampanje,
  type StanjeKampanje,
} from "./zajednicko";

/** Javni ID: 6 znakova Crockford base32 (odluka 212), čita se neovisno o veličini slova. */
export const JAVNI_ID = /^[0-9abcdefghjkmnpqrstvwxyz]{6}$/;

export function normalizirajJavniId(x: string): string | null {
  const id = x.trim().toLowerCase();
  return JAVNI_ID.test(id) ? id : null;
}

const MREZE: Record<number, string> = { 100: "Gnosis", 10200: "Chiado (testna mreža)" };

export type NacinKomentara = "off" | "contributors" | "everyone";

export interface StranicaKampanje {
  /** Interni ID (za novostiKampanje, komentariKampanje, uplateKampanje, kasiceKampanje). */
  id: string;
  publicId: string;
  title: string;
  description: string | null;
  type: "donation" | "membership" | "reward" | "tickets";
  kind: "one_time" | "recurring" | "for_organization";
  recurrence: string;
  category: { key: string; nameHr: string; nameEn: string } | null;
  coverTheme: string | null;
  coverImageUrl: string | null;
  /** Prvi video iz `campaign_media` kako ga je organizator upisao; prikazuje se tek kroz `parsirajVideo`. */
  videoUrl: string | null;
  locationName: string | null;
  currency: string;
  goalCents: number | null;
  minContributionCents: number | null;
  amountPresets: number[];
  startsAt: number | null;
  endsAt: number | null;
  daysLeft: number | null;
  /** Rok je prošao; kampanja i dalje može primati uplate (odluka 204). */
  rokIstekao: boolean;
  stanje: StanjeKampanje;
  /** Aktivna, nije isključena, Safe provjeren (campaign-core `canAcceptContributions`). */
  primaUplate: boolean;
  /** `unlisted` ili `indexable = 0`: stranica vraća 200 s `noindex`. */
  noindex: boolean;
  purposeVerified: boolean;
  demo: boolean;
  organizator: {
    name: string;
    organizationSlug: string | null;
    verified: boolean;
    legalForm: string | null;
    city: string | null;
  };
  /** Za kampanju za organizaciju: tko ju je pokrenuo (slug samo ako mu je profil javan). */
  autor: { name: string | null; profileSlug: string | null } | null;
  /** Kamo ide novac: Safe organizacije (odluka 203). */
  novac: { safeAddress: string; chainId: number; mreza: string; mode: "integrated" | "byo"; threshold: number; provjeren: boolean } | null;
  postavke: {
    komentari: NacinKomentara;
    kasiceDopustene: boolean;
    popisUplataVidljiv: boolean;
    redoslijedUplata: "latest" | "highest";
    ponudeDopustene: boolean;
  };
  statistika: {
    /** null kad je iznos skriven. */
    raisedCents: number | null;
    /** null kad je broj skriven. */
    contributorCount: number | null;
    contributionCount: number | null;
    /** Postotak cilja (cijeli broj), null bez cilja ili uz skriveni iznos. */
    posto: number | null;
  };
  /** Brojevi za kartice sekcija; `uplate` je null kad je popis skriven ili broj skriven. */
  brojevi: { novosti: number; kasice: number; uplate: number | null; komentari: number; ponude: number };
  razine: { id: string; title: string; description: string | null; kind: string; priceCents: number | null; preostalo: number | null }[];
}

interface RedakKampanje {
  id: string;
  public_id: string;
  title: string;
  description: string | null;
  type: StranicaKampanje["type"];
  kind: StranicaKampanje["kind"];
  recurrence: string;
  category_key: string | null;
  name_hr: string | null;
  name_en: string | null;
  cover_theme: string | null;
  cover_image_url: string | null;
  location_name: string | null;
  currency: string;
  goal_cents: number | null;
  min_contribution_cents: number | null;
  amount_presets: string;
  starts_at: number | null;
  ends_at: number | null;
  state: "active" | "closed";
  visibility: "public" | "unlisted";
  paused_at: number | null;
  indexable: number;
  purpose_verified: number;
  demo: number;
  organizer_name: string;
  organization_slug: string | null;
  verified: number;
  legal_form: string | null;
  city: string | null;
  autor_ime: string | null;
  autor_slug: string | null;
  address: string | null;
  chain_id: number | null;
  threshold: number | null;
  owners: string | null;
  platform_signer_count: number | null;
  verified_at: number | null;
  mode: "integrated" | "byo";
  comments_mode: NacinKomentara;
  allow_moneyboxes: number;
  popis_skriven: number;
  contributions_sort: "latest" | "highest";
  allow_external_offers: number;
  hide_raised: number;
  hide_contributor_count: number;
  raised_cents: number | null;
  contributor_count: number | null;
  contribution_count: number | null;
  n_novosti: number;
  n_kasice: number;
  n_uplate: number;
  n_komentari: number;
  n_ponude: number;
  video_url: string | null;
}

/**
 * Sve za stranicu kampanje po javnom ID-u (bez obzira na veličinu slova). `null` = 404: ne postoji,
 * `draft`, `review`, `cancelled`, `private`, obrisana ili blokirana (docs/07 „Razine pristupa”).
 */
export async function kampanjaPoJavnomId(db: D1Database, publicId: string, sad: Date = new Date()): Promise<StranicaKampanje | null> {
  const pid = normalizirajJavniId(publicId);
  if (!pid) return null;
  const r = await db
    .prepare(
      `SELECT c.id, s.public_id, c.title, c.description, c.type, s.kind, c.recurrence,
              s.category_key, k.name_hr, k.name_en, s.cover_theme, c.cover_image_url, c.location_name,
              c.currency, c.goal_cents, c.min_contribution_cents, s.amount_presets, c.starts_at, c.ends_at,
              c.state, c.visibility, s.paused_at, s.indexable, s.purpose_verified, c.demo, c.mode,
              COALESCE(o.display_name, g.legal_name) AS organizer_name, o.slug AS organization_slug,
              ${ORG_VERIFICIRANA} AS verified, o.legal_form, g.city,
              CASE WHEN s.kind = 'for_organization' THEN u.display_name END AS autor_ime,
              CASE WHEN s.kind = 'for_organization' AND ${PROFIL_JAVAN} THEN COALESCE(u.slug, u.id) END AS autor_slug,
              f.address, f.chain_id, f.threshold, f.owners, f.platform_signer_count, f.verified_at,
              s.comments_mode, s.allow_moneyboxes, ${POPIS_SKRIVEN} AS popis_skriven, s.contributions_sort,
              s.allow_external_offers, s.hide_raised, s.hide_contributor_count,
              st.raised_cents, st.contributor_count, st.contribution_count,
              (SELECT count(*) FROM campaign_updates x WHERE x.campaign_id = c.id AND x.deleted_at IS NULL AND x.tier_id IS NULL) AS n_novosti,
              (SELECT count(*) FROM moneyboxes x WHERE x.campaign_id = c.id AND x.status = 'active') AS n_kasice,
              (SELECT count(*) FROM contributions x WHERE x.campaign_id = c.id AND x.state = 'paid') AS n_uplate,
              (SELECT count(*) FROM comments x LEFT JOIN comments p ON p.id = x.parent_id
                WHERE x.campaign_id = c.id AND x.hidden_at IS NULL AND x.deleted_at IS NULL
                  AND (x.parent_id IS NULL OR (p.hidden_at IS NULL AND p.deleted_at IS NULL))) AS n_komentari,
              (SELECT count(*) FROM offers x WHERE x.campaign_id = c.id AND x.status = 'active') AS n_ponude,
              (SELECT m.video_url FROM campaign_media m WHERE m.campaign_id = c.id AND m.kind = 'video'
                ORDER BY m.position, m.id LIMIT 1) AS video_url
         FROM campaigns c
         JOIN campaign_settings s ON s.campaign_id = c.id
         JOIN organizers g        ON g.id = c.organizer_id
         LEFT JOIN organizations o ON o.organizer_id = c.organizer_id AND o.deleted_at IS NULL
         LEFT JOIN campaign_stats st ON st.campaign_id = c.id
         LEFT JOIN categories k   ON k.key = s.category_key
         LEFT JOIN campaign_safes f ON f.campaign_id = c.id
         LEFT JOIN users u        ON u.id = s.created_by_user_id
         LEFT JOIN user_settings us ON us.user_id = u.id
        WHERE s.public_id = ? AND ${VIDLJIVA}`,
    )
    .bind(pid)
    .first<RedakKampanje>();
  if (!r) return null;

  const stanje = stanjeKampanje(r.state, r.paused_at);
  const safe = r.address === null ? null : {
    address: r.address as `0x${string}`,
    threshold: r.threshold ?? 0,
    owners: JSON.parse(r.owners ?? "[]") as `0x${string}`[],
    platform_signer_count: r.platform_signer_count ?? 0,
    verified_at: r.verified_at,
  };
  const skrivenIznos = r.hide_raised === 1;
  const skrivenBroj = r.hide_contributor_count === 1;
  const popisVidljiv = r.popis_skriven !== 1;
  const raised = skrivenIznos ? null : (r.raised_cents ?? 0);
  const komentari = r.comments_mode;

  const { results: razine } = await db
    .prepare(
      `SELECT id, title, description, kind, price_cents, inventory_total, inventory_claimed
         FROM campaign_tiers WHERE campaign_id = ? ORDER BY sort, id`,
    )
    .bind(r.id)
    .all<{ id: string; title: string; description: string | null; kind: string; price_cents: number | null; inventory_total: number | null; inventory_claimed: number }>();

  return {
    id: r.id,
    publicId: r.public_id,
    title: r.title,
    description: r.description,
    type: r.type,
    kind: r.kind,
    recurrence: r.recurrence,
    category: r.category_key ? { key: r.category_key, nameHr: r.name_hr ?? "", nameEn: r.name_en ?? "" } : null,
    coverTheme: r.cover_theme,
    coverImageUrl: r.cover_image_url,
    videoUrl: r.video_url,
    locationName: r.location_name,
    currency: r.currency,
    goalCents: r.goal_cents,
    minContributionCents: r.min_contribution_cents,
    amountPresets: JSON.parse(r.amount_presets) as number[],
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    daysLeft: danaDoRoka(r.ends_at, sad),
    rokIstekao: r.ends_at !== null && r.ends_at < sad.getTime(),
    stanje,
    primaUplate: stanje === "active" && canAcceptContributions({ state: r.state, visibility: r.visibility }, safe),
    noindex: r.visibility === "unlisted" || r.indexable === 0,
    purposeVerified: r.purpose_verified === 1,
    demo: r.demo === 1,
    organizator: {
      name: r.organizer_name,
      organizationSlug: r.organization_slug,
      verified: r.verified === 1,
      legalForm: r.legal_form,
      city: r.city,
    },
    autor: r.kind === "for_organization" ? { name: r.autor_ime, profileSlug: r.autor_slug } : null,
    novac: safe && r.chain_id !== null
      ? { safeAddress: safe.address, chainId: r.chain_id, mreza: MREZE[r.chain_id] ?? String(r.chain_id), mode: r.mode, threshold: safe.threshold, provjeren: safe.verified_at !== null }
      : null,
    postavke: {
      komentari,
      kasiceDopustene: r.allow_moneyboxes === 1,
      popisUplataVidljiv: popisVidljiv,
      redoslijedUplata: r.contributions_sort,
      ponudeDopustene: r.allow_external_offers === 1,
    },
    statistika: {
      raisedCents: raised,
      contributorCount: skrivenBroj ? null : (r.contributor_count ?? 0),
      contributionCount: skrivenBroj ? null : (r.contribution_count ?? 0),
      posto: raised !== null && r.goal_cents ? Math.floor((raised * 100) / r.goal_cents) : null,
    },
    brojevi: {
      novosti: r.n_novosti,
      kasice: r.allow_moneyboxes === 1 ? r.n_kasice : 0,
      uplate: popisVidljiv && !skrivenBroj ? r.n_uplate : null,
      komentari: komentari === "off" ? 0 : r.n_komentari,
      ponude: r.allow_external_offers === 1 ? r.n_ponude : 0,
    },
    razine: razine.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      kind: t.kind,
      priceCents: t.price_cents,
      preostalo: t.inventory_total === null ? null : Math.max(0, t.inventory_total - t.inventory_claimed),
    })),
  };
}

/** Postavke prikaza kampanje koje trebaju sekcije; null kad kampanja nije javno vidljiva. */
async function postavkePrikaza(db: D1Database, campaignId: string) {
  return db
    .prepare(
      `SELECT c.organizer_id, s.created_by_user_id, s.hide_raised, s.hide_contributor_count, s.comments_mode,
              s.contributions_sort, ${POPIS_SKRIVEN} AS popis_skriven
         FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE c.id = ? AND ${VIDLJIVA}`,
    )
    .bind(campaignId)
    .first<{
      organizer_id: string;
      created_by_user_id: string;
      hide_raised: number;
      hide_contributor_count: number;
      comments_mode: NacinKomentara;
      contributions_sort: "latest" | "highest";
      popis_skriven: number;
    }>();
}

export interface Novost {
  id: string;
  title: string | null;
  body: string;
  publishedAt: number;
  authorName: string | null;
  brojKomentara: number;
}

/** Novosti (ažuriranja) kampanje, od najnovije; bez obrisanih i bez onih samo za razinu (faza 2). */
export async function novostiKampanje(db: D1Database, campaignId: string): Promise<Novost[]> {
  if (!(await postavkePrikaza(db, campaignId))) return [];
  const { results } = await db
    .prepare(
      `SELECT x.id, x.title, x.body, x.published_at, u.display_name,
              (SELECT count(*) FROM comments k WHERE k.update_id = x.id AND k.hidden_at IS NULL AND k.deleted_at IS NULL) AS n
         FROM campaign_updates x LEFT JOIN users u ON u.id = x.author_id
        WHERE x.campaign_id = ? AND x.deleted_at IS NULL AND x.tier_id IS NULL
        ORDER BY x.published_at DESC, x.id`,
    )
    .bind(campaignId)
    .all<{ id: string; title: string | null; body: string; published_at: number; display_name: string | null; n: number }>();
  return results.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    publishedAt: r.published_at,
    authorName: r.display_name,
    brojKomentara: r.n,
  }));
}

export interface AutorKomentara {
  /** null za anonimni doprinos. */
  name: string | null;
  anonymous: boolean;
  /** Slug javnog profila (users.id) ili null. */
  profileSlug: string | null;
  /** Član organizacije kampanje ili autor kampanje (odgovor organizatora). */
  organizator: boolean;
}

export interface Komentar {
  id: string;
  body: string;
  createdAt: number;
  /** Komentar ispod novosti. */
  updateId: string | null;
  autor: AutorKomentara;
  /** Iznos doprinosa uz poruku iz checkouta; null kad je skriven, anoniman ili kampanja skriva iznos. */
  amountCents: number | null;
  odgovori: Komentar[];
}

export interface KomentariKampanje {
  nacin: NacinKomentara;
  /** `comments_mode = off`: sekcija se ne prikazuje, komentari su prazni. */
  iskljuceni: boolean;
  komentari: Komentar[];
}

interface RedakKomentara {
  id: string;
  parent_id: string | null;
  update_id: string | null;
  body: string;
  created_at: number;
  author_id: string | null;
  autor_slug: string | null;
  autor_ime: string | null;
  profil_javan: number;
  contribution_id: string | null;
  anonymous: number | null;
  cp_ime: string | null;
  amount_cents: number | null;
  amount_hidden: number | null;
  organizator: number;
}

/**
 * Komentari kampanje: bez sakrivenih i obrisanih, jedna razina odgovora (odgovori na sakriveni komentar
 * se ne prikazuju). Vrh od najnovijeg, odgovori kronološki.
 */
export async function komentariKampanje(db: D1Database, campaignId: string): Promise<KomentariKampanje> {
  const p = await postavkePrikaza(db, campaignId);
  if (!p) return { nacin: "off", iskljuceni: true, komentari: [] };
  if (p.comments_mode === "off") return { nacin: "off", iskljuceni: true, komentari: [] };
  const { results } = await db
    .prepare(
      `SELECT x.id, x.parent_id, x.update_id, x.body, x.created_at, x.author_id, COALESCE(u.slug, u.id) AS autor_slug,
              u.display_name AS autor_ime, COALESCE(${PROFIL_JAVAN}, 0) AS profil_javan,
              x.contribution_id, cp.anonymous, cp.display_name AS cp_ime,
              d.amount_received_cents AS amount_cents, a.amount_hidden,
              (x.author_id IS NOT NULL AND (x.author_id = ?2 OR EXISTS (
                 SELECT 1 FROM memberships m JOIN organizations o ON o.id = m.organization_id
                  WHERE m.user_id = x.author_id AND o.organizer_id = ?3))) AS organizator
         FROM comments x
         LEFT JOIN users u ON u.id = x.author_id
         LEFT JOIN user_settings us ON us.user_id = u.id
         LEFT JOIN contribution_profiles cp ON cp.contribution_id = x.contribution_id
         LEFT JOIN contributions d ON d.id = x.contribution_id AND d.state = 'paid'
         LEFT JOIN contribution_attributions a ON a.contribution_id = x.contribution_id
        WHERE x.campaign_id = ?1 AND x.hidden_at IS NULL AND x.deleted_at IS NULL
        ORDER BY x.created_at, x.id`,
    )
    .bind(campaignId, p.created_by_user_id, p.organizer_id)
    .all<RedakKomentara>();

  const uKomentar = (r: RedakKomentara): Komentar => {
    const izDoprinosa = r.contribution_id !== null;
    // Poruka iz checkouta bez profila doprinosa prikazuje se kao anonimna (sigurnija strana).
    const anon = izDoprinosa && r.anonymous !== 0;
    const iznosVidljiv = izDoprinosa && !anon && r.amount_hidden !== 1 && p.hide_raised !== 1 && r.amount_cents !== null;
    return {
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      updateId: r.update_id,
      autor: {
        name: anon ? null : (izDoprinosa ? (r.cp_ime ?? r.autor_ime) : r.autor_ime),
        anonymous: anon,
        profileSlug: !anon && r.author_id && r.profil_javan === 1 ? r.autor_slug : null,
        organizator: !anon && r.organizator === 1,
      },
      amountCents: iznosVidljiv ? r.amount_cents : null,
      odgovori: [],
    };
  };
  const vrh = new Map<string, Komentar>();
  for (const r of results) if (r.parent_id === null) vrh.set(r.id, uKomentar(r));
  for (const r of results) if (r.parent_id !== null) vrh.get(r.parent_id)?.odgovori.push(uKomentar(r));
  const komentari = [...vrh.values()].sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
  return { nacin: p.comments_mode, iskljuceni: false, komentari };
}

export interface Uplata {
  paidAt: number;
  /** null za anonimni doprinos. */
  name: string | null;
  anonymous: boolean;
  nameVerified: boolean;
  /** null kad podržavatelj skriva iznos ili kampanja skriva prikupljeno (inače bi se dao zbrojiti). */
  amountCents: number | null;
  message: string | null;
  tierTitle: string | null;
  quantity: number;
}

export interface UplateKampanje {
  /** Popis je skriven (postavka kampanje) ili kampanja nije javno vidljiva: `uplate` prazne. */
  skriveno: boolean;
  sort: "latest" | "highest";
  /** null kad je popis skriven ili kampanja skriva broj podržavatelja. */
  ukupno: number | null;
  uplate: Uplata[];
}

/**
 * Javni popis uplata: samo `paid`. `highest`: vidljivi iznosi od najvećeg, skriveni na kraju (po vremenu);
 * kampanja sa skrivenim iznosom uvijek ide po vremenu, jer bi poredak po iznosu odao iznose.
 */
export async function uplateKampanje(
  db: D1Database,
  campaignId: string,
  opcije: { sort?: "latest" | "highest"; limit?: number; offset?: number } = {},
): Promise<UplateKampanje> {
  const p = await postavkePrikaza(db, campaignId);
  const sortZadani = p?.contributions_sort ?? "latest";
  const trazeni = opcije.sort === "latest" || opcije.sort === "highest" ? opcije.sort : sortZadani;
  if (!p || p.popis_skriven === 1) return { skriveno: true, sort: trazeni, ukupno: null, uplate: [] };
  const skrivenIznos = p.hide_raised === 1;
  const sort = skrivenIznos ? "latest" : trazeni;
  const limit = Math.min(Math.max(1, Math.floor(opcije.limit ?? 20)), 100);
  const offset = Math.max(0, Math.floor(opcije.offset ?? 0));
  const redoslijed = sort === "highest"
    ? "COALESCE(a.amount_hidden, 0) ASC, d.amount_received_cents DESC, d.paid_at DESC, d.id"
    : "d.paid_at DESC, d.id";
  const { results } = await db
    .prepare(
      `SELECT d.paid_at, d.amount_received_cents, d.quantity, cp.anonymous, cp.display_name, cp.display_name_verified,
              cp.message, cp.message_hidden, a.amount_hidden, t.title AS tier_title
         FROM contributions d
         LEFT JOIN contribution_profiles cp ON cp.contribution_id = d.id
         LEFT JOIN contribution_attributions a ON a.contribution_id = d.id
         LEFT JOIN campaign_tiers t ON t.id = d.tier_id
        WHERE d.campaign_id = ? AND d.state = 'paid'
        ORDER BY ${redoslijed}
        LIMIT ? OFFSET ?`,
    )
    .bind(campaignId, limit, offset)
    .all<{
      paid_at: number;
      amount_received_cents: number;
      quantity: number;
      anonymous: number | null;
      display_name: string | null;
      display_name_verified: number | null;
      message: string | null;
      message_hidden: number | null;
      amount_hidden: number | null;
      tier_title: string | null;
    }>();
  let ukupno: number | null = null;
  if (p.hide_contributor_count !== 1) {
    const n = await db
      .prepare("SELECT count(*) AS n FROM contributions WHERE campaign_id = ? AND state = 'paid'")
      .bind(campaignId)
      .first<{ n: number }>();
    ukupno = n?.n ?? 0;
  }
  return {
    skriveno: false,
    sort,
    ukupno,
    uplate: results.map((r) => {
      // Bez profila (ne bi se smjelo dogoditi) doprinos se prikazuje kao anoniman.
      const anon = r.anonymous !== 0;
      return {
        paidAt: r.paid_at,
        name: anon ? null : r.display_name,
        anonymous: anon,
        nameVerified: !anon && r.display_name_verified === 1,
        amountCents: skrivenIznos || r.amount_hidden === 1 ? null : r.amount_received_cents,
        message: r.message_hidden === 1 ? null : r.message,
        tierTitle: r.tier_title,
        quantity: r.quantity,
      };
    }),
  };
}
