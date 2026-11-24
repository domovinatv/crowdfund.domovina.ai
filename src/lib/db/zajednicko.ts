/**
 * Zajedničko za upite javnog dijela (S5): uvjeti vidljivosti, upit kartice kampanje i pomoćnici.
 * Sve funkcije primaju `D1Database`, pa ih test zove nad sqliteom (test/pomoc/baza.ts).
 */
import type { KarticaKampanje } from "./kampanje";

export const MIN = 60_000;
export const SAT = 60 * MIN;
export const DAN = 24 * SAT;
export const PO_STRANICI = 12;

/**
 * Javno vidljiva kampanja (docs/05, docs/07): `active` ili `closed`, `public` ili `unlisted`, nije obrisana ni
 * blokirana. Isključena (`paused_at`) je vidljiva, ali ne prima uplate. `draft`, `review`, `cancelled`,
 * `private` i `blocked_at` su 404. Aliasi: `c` = campaigns, `s` = campaign_settings.
 */
export const VIDLJIVA = `c.state IN ('active','closed') AND c.visibility IN ('public','unlisted')
   AND c.deleted_at IS NULL AND s.blocked_at IS NULL`;

/** Vidljiva i `public`: smije se nabrojati na profilu osobe ili organizacije (unlisted ne smije). */
export const U_POPISU = `${VIDLJIVA} AND c.visibility = 'public'`;

/** Ulazi u katalog i brojače „aktivnih”: `active` + `public`, nije isključena (isto kao aktivneKampanje). */
export const U_KATALOGU = `c.state = 'active' AND c.visibility = 'public' AND c.deleted_at IS NULL
   AND s.blocked_at IS NULL AND s.paused_at IS NULL`;

/** Organizacija `o` je verificirana: zadnja `org_kyb` verifikacija je `approved`. */
export const ORG_VERIFICIRANA = `COALESCE((SELECT v.status = 'approved' FROM verifications v
   WHERE v.kind = 'org_kyb' AND v.subject_type = 'organization' AND v.subject_id = o.id
   ORDER BY v.requested_at DESC LIMIT 1), 0)`;

/**
 * Profil osobe `u` (uz `user_settings us`, LEFT JOIN) je javan: korisnik nije obrisan i ima uključen barem
 * jedan od 9 prekidača vidljivosti (ekran 12). Bez reda postavki vrijede zadane vrijednosti (javan).
 */
export const PROFIL_JAVAN = `(u.deleted_at IS NULL AND (us.user_id IS NULL OR
   us.show_email + us.show_avatar + us.show_phone + us.show_total_raised + us.show_registered_date +
   us.show_promoted + us.show_owned + us.show_donated + us.show_for_organization > 0))`;

/** Popis uplata skriven: shema nema stupac, platformska postavka je u `campaigns.metadata` (vidi seed). */
export const POPIS_SKRIVEN = `COALESCE(json_extract(c.metadata, '$.contributions_list') = 'hidden', 0)`;

export type StanjeKampanje = "active" | "paused" | "closed";

/** Stanje za prikaz: zatvorena > isključena > aktivna. Nakon roka kampanja ostaje `active` (odluka 204). */
export function stanjeKampanje(state: string, pausedAt: number | null): StanjeKampanje {
  if (state === "closed") return "closed";
  return pausedAt !== null ? "paused" : "active";
}

/** Dana do roka (zaokruženo gore), 0 kad je rok prošao, `null` bez roka. */
export function danaDoRoka(endsAt: number | null, sad: Date): number | null {
  if (endsAt === null) return null;
  return Math.max(0, Math.ceil((endsAt - sad.getTime()) / DAN));
}

/** 1-based stranica iz bilo čega (nevaljano → 1). */
export function stranicaIz(x: unknown): number {
  const n = typeof x === "number" ? x : Number.parseInt(String(x ?? ""), 10);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** LIKE uzorak „sadrži” s escapeom `%`, `_` i `\` (uz `ESCAPE '\'`). */
export function sadrzi(q: string): string {
  return `%${q.replace(/[\\%_]/g, (z) => `\\${z}`)}%`;
}

/** UUIDv7 (odluka 212): 48 bita vremena u ms + slučajni dio. */
export function uuid7(ms: number): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  const t = ms.toString(16).padStart(12, "0");
  for (let i = 0; i < 6; i++) b[i] = Number.parseInt(t.slice(i * 2, i * 2 + 2), 16);
  b[6] = 0x70 | (b[6] & 0x0f);
  b[8] = 0x80 | (b[8] & 0x3f);
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Proširena kartica: sva opcionalna polja iz `KarticaKampanje` su popunjena. */
export type PunaKartica = KarticaKampanje & Required<Pick<KarticaKampanje,
  "kind" | "verified" | "endsAt" | "daysLeft" | "coverTheme" | "coverImageUrl" | "monthlyCents" | "locationName" | "state">>;

interface RedakKartice {
  id: string;
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
  kind: "one_time" | "recurring" | "for_organization";
  verified: number;
  ends_at: number | null;
  cover_theme: string | null;
  cover_image_url: string | null;
  location_name: string | null;
  recurrence: string;
  state: string;
  paused_at: number | null;
  zadnjih_30: number;
}

/**
 * SELECT kartice; prvi parametar je granica „zadnjih 30 dana” (ms). Iza njega dolazi `WHERE` pozivatelja.
 * Joinovi: c, s, g (organizers), o (organizations), st (campaign_stats), k (categories).
 */
export const SELECT_KARTICE = `
SELECT c.id, s.public_id, c.title,
       COALESCE(o.display_name, g.legal_name) AS organizer_name,
       o.slug AS organization_slug,
       COALESCE(st.raised_cents, 0) AS raised_cents,
       c.goal_cents, c.currency,
       COALESCE(st.contributor_count, 0) AS contributor_count,
       s.category_key, k.name_hr, k.name_en,
       s.hide_raised, s.hide_contributor_count, c.demo,
       s.kind, ${ORG_VERIFICIRANA} AS verified,
       c.ends_at, s.cover_theme, c.cover_image_url, c.location_name, c.recurrence, c.state, s.paused_at,
       (SELECT COALESCE(SUM(d.amount_received_cents), 0) FROM contributions d
         WHERE d.campaign_id = c.id AND d.state = 'paid' AND d.paid_at >= ?) AS zadnjih_30
  FROM campaigns c
  JOIN campaign_settings s ON s.campaign_id = c.id
  JOIN organizers g        ON g.id = c.organizer_id
  LEFT JOIN organizations o ON o.organizer_id = c.organizer_id AND o.deleted_at IS NULL
  LEFT JOIN campaign_stats st ON st.campaign_id = c.id
  LEFT JOIN categories k   ON k.key = s.category_key`;

export const FROM_KAMPANJE = `
  FROM campaigns c
  JOIN campaign_settings s ON s.campaign_id = c.id
  JOIN organizers g        ON g.id = c.organizer_id
  LEFT JOIN organizations o ON o.organizer_id = c.organizer_id AND o.deleted_at IS NULL
  LEFT JOIN campaign_stats st ON st.campaign_id = c.id`;

/** Zadnji dio redoslijeda za jednake: novija kampanja, pa id (odluka 501). */
export const JEDNAKI = "c.created_at DESC, c.id ASC";

function uKarticu(r: RedakKartice, sad: Date): PunaKartica {
  const skrivenIznos = r.hide_raised === 1;
  return {
    publicId: r.public_id,
    title: r.title,
    organizerName: r.organizer_name,
    organizationSlug: r.organization_slug,
    raisedCents: skrivenIznos ? null : r.raised_cents,
    goalCents: r.goal_cents,
    currency: r.currency,
    contributorCount: r.hide_contributor_count === 1 ? null : r.contributor_count,
    categoryKey: r.category_key,
    categoryHr: r.name_hr,
    categoryEn: r.name_en,
    hideRaised: skrivenIznos,
    hideContributorCount: r.hide_contributor_count === 1,
    demo: r.demo === 1,
    kind: r.kind,
    verified: r.verified === 1,
    endsAt: r.ends_at,
    daysLeft: danaDoRoka(r.ends_at, sad),
    coverTheme: r.cover_theme,
    coverImageUrl: r.cover_image_url,
    monthlyCents: r.recurrence === "monthly" && !skrivenIznos ? r.zadnjih_30 : null,
    locationName: r.location_name,
    state: stanjeKampanje(r.state, r.paused_at),
  };
}

/** Kartice za proizvoljan `WHERE … ORDER BY … LIMIT …` (bez ključne riječi WHERE u `uvjet`). */
export async function kartice(
  db: D1Database,
  uvjet: string,
  parametri: unknown[],
  redoslijed: string,
  sad: Date,
  limit = PO_STRANICI,
  offset = 0,
): Promise<PunaKartica[]> {
  const sql = `${SELECT_KARTICE}\n WHERE ${uvjet}\n ORDER BY ${redoslijed}\n LIMIT ? OFFSET ?`;
  const { results } = await db
    .prepare(sql)
    .bind(sad.getTime() - 30 * DAN, ...parametri, limit, offset)
    .all<RedakKartice>();
  return results.map((r) => uKarticu(r, sad));
}
