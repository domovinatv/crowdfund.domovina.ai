/**
 * „Moje” (S6, docs/07 „Moje i postavke”, obilazak 08 i 09): moje kampanje, doprinosi, kasice, „Kamo ide novac”
 * i vanjske kampanje mojih organizacija. Sve funkcije primaju `D1Database` (test/moje.test.ts nad sqliteom).
 *
 * „Moje kampanje” = kampanje organizacija u kojima sam član (bilo koja uloga, uključujući osobnu organizaciju)
 * i kampanje koje sam pokrenuo za tuđu organizaciju (autor). Obrisane se ne vide. Koje poveznice smijem otvoriti
 * računa isto pravilo kao upravljanje (`smije` iz `components/upravljanje/ucitavanje.ts`).
 */
import type { PristupKampanji, Uloga } from "../pristup";
import { VIDLJIVA } from "./zajednicko";

// --- Moje kampanje ----------------------------------------------------------------------------------------

/** Stanje za popis: zatvorena uključuje `funded`; blokirana i isključena su preklopi iznad osnovnog stanja. */
export const STANJA_MOJE = ["active", "paused", "review", "draft", "closed", "cancelled", "blocked"] as const;
export type StanjeMoje = (typeof STANJA_MOJE)[number];
export const isStanjeMoje = (x: unknown): x is StanjeMoje => STANJA_MOJE.includes(x as StanjeMoje);

export function stanjeMoje(state: string, pausedAt: number | null, blockedAt: number | null): StanjeMoje {
  if (blockedAt !== null) return "blocked";
  if (state === "closed" || state === "funded") return "closed";
  if (state === "active") return pausedAt !== null ? "paused" : "active";
  return isStanjeMoje(state) ? state : "draft";
}

/** Redoslijedi (obilazak 08 bez „iznosa za isplatu”: isplate nema, odluka 6). */
export const REDOSLIJEDI_MOJE = ["newest", "oldest", "most", "least", "most_payments", "least_payments"] as const;
export type RedoslijedMoje = (typeof REDOSLIJEDI_MOJE)[number];
export const isRedoslijedMoje = (x: unknown): x is RedoslijedMoje => REDOSLIJEDI_MOJE.includes(x as RedoslijedMoje);

export interface MojaKampanja {
  id: string;
  publicId: string;
  naslov: string;
  stanje: StanjeMoje;
  vrsta: "one_time" | "recurring" | "for_organization";
  /** Organizacija organizatora (za kampanju za organizaciju to je primatelj). */
  organizacija: { id: string; slug: string; naziv: string; osobna: boolean } | null;
  /** Moja uloga u toj organizaciji; null kad sam samo autor kampanje za tuđu organizaciju. */
  uloga: Uloga | null;
  autor: boolean;
  /** Autor kampanje za organizaciju koja još čeka odobrenje (K iz `pristup.ts`). */
  autorCeka: boolean;
  razlogOdbijanja: string | null;
  prikupljenoCenti: number;
  ciljCenti: number | null;
  brojDoprinosa: number;
  stvorena: number;
  rok: number | null;
}

interface RedakMoje {
  id: string;
  public_id: string;
  title: string;
  state: string;
  paused_at: number | null;
  blocked_at: number | null;
  kind: MojaKampanja["vrsta"];
  goal_cents: number | null;
  created_at: number;
  ends_at: number | null;
  autor: number;
  beneficiary_approved_at: number | null;
  razlog: string | null;
  org_id: string | null;
  slug: string | null;
  naziv: string | null;
  org_kind: string | null;
  uloga: Uloga | null;
  raised: number;
  broj: number;
}

/** Sve moje kampanje (bez filtra), najnovije prve. */
export async function mojeKampanje(db: D1Database, userId: string): Promise<MojaKampanja[]> {
  const { results } = await db
    .prepare(
      `SELECT c.id, s.public_id, c.title, c.state, s.paused_at, s.blocked_at, s.kind, c.goal_cents, c.created_at, c.ends_at,
              (s.created_by_user_id = ?1 OR c.created_by = ?1) AS autor, s.beneficiary_approved_at,
              s.beneficiary_rejected_reason AS razlog,
              o.id AS org_id, o.slug, o.display_name AS naziv, o.kind AS org_kind, m.role AS uloga,
              COALESCE(st.raised_cents, 0) AS raised, COALESCE(st.contribution_count, 0) AS broj
         FROM campaigns c
         JOIN campaign_settings s ON s.campaign_id = c.id
         LEFT JOIN organizations o ON o.organizer_id = c.organizer_id AND o.deleted_at IS NULL
         LEFT JOIN memberships m ON m.organization_id = o.id AND m.user_id = ?1
         LEFT JOIN campaign_stats st ON st.campaign_id = c.id
        WHERE c.deleted_at IS NULL AND (m.user_id IS NOT NULL OR s.created_by_user_id = ?1 OR c.created_by = ?1)
        ORDER BY c.created_at DESC, c.id`,
    )
    .bind(userId)
    .all<RedakMoje>();
  return results.map((r) => {
    const autor = r.autor === 1;
    return {
      id: r.id,
      publicId: r.public_id,
      naslov: r.title,
      stanje: stanjeMoje(r.state, r.paused_at, r.blocked_at),
      vrsta: r.kind,
      organizacija: r.org_id ? { id: r.org_id, slug: r.slug!, naziv: r.naziv!, osobna: r.org_kind === "personal" } : null,
      uloga: r.uloga,
      autor,
      autorCeka: autor && r.kind === "for_organization" && r.beneficiary_approved_at === null && (r.state === "draft" || r.state === "review"),
      razlogOdbijanja: r.razlog,
      prikupljenoCenti: r.raised,
      ciljCenti: r.goal_cents,
      brojDoprinosa: r.broj,
      stvorena: r.created_at,
      rok: r.ends_at,
    };
  });
}

/** `PristupKampanji` za retke popisa (isti oblik kao `pristupKampanji`, bez moderatora: ovo je osobni popis). */
export function pristupRetka(k: MojaKampanja): PristupKampanji {
  return {
    campaignId: k.id,
    publicId: k.publicId,
    organizationId: k.organizacija?.id ?? null,
    organizationSlug: k.organizacija?.slug ?? null,
    uloga: k.uloga,
    autor: k.autor,
    autorCeka: k.autorCeka,
    k: k.uloga !== null || k.autorCeka,
    moderator: false,
  };
}

/** Javno vidljiva (QR, widget, plakat i javna stranica imaju smisla). */
export const javnaMoja = (k: MojaKampanja): boolean => k.stanje === "active" || k.stanje === "paused" || k.stanje === "closed";

export interface FiltarMoje {
  stanje?: StanjeMoje | null;
  /** Slug organizacije. */
  organizacija?: string | null;
  redoslijed?: RedoslijedMoje | null;
}

const USPOREDBE: Record<RedoslijedMoje, (a: MojaKampanja, b: MojaKampanja) => number> = {
  newest: (a, b) => b.stvorena - a.stvorena,
  oldest: (a, b) => a.stvorena - b.stvorena,
  most: (a, b) => b.prikupljenoCenti - a.prikupljenoCenti,
  least: (a, b) => a.prikupljenoCenti - b.prikupljenoCenti,
  most_payments: (a, b) => b.brojDoprinosa - a.brojDoprinosa,
  least_payments: (a, b) => a.brojDoprinosa - b.brojDoprinosa,
};

/** Filtar i redoslijed nad popisom (jednaki: novija pa id, kao odluka 501). Čista funkcija. */
export function filtriraj(sve: MojaKampanja[], f: FiltarMoje): MojaKampanja[] {
  const usp = USPOREDBE[f.redoslijed ?? "newest"];
  return sve
    .filter((k) => (!f.stanje || k.stanje === f.stanje) && (!f.organizacija || k.organizacija?.slug === f.organizacija))
    .sort((a, b) => usp(a, b) || b.stvorena - a.stvorena || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Broj kampanja po stanju (brojači uz filtar). */
export function brojPoStanju(sve: MojaKampanja[]): Record<StanjeMoje, number> {
  const out = Object.fromEntries(STANJA_MOJE.map((s) => [s, 0])) as Record<StanjeMoje, number>;
  for (const k of sve) out[k.stanje]++;
  return out;
}

/** Organizacije za filtar: one koje se pojavljuju na popisu, abecedno. */
export function organizacijeFiltra(sve: MojaKampanja[]): { slug: string; naziv: string }[] {
  const m = new Map<string, string>();
  for (const k of sve) if (k.organizacija) m.set(k.organizacija.slug, k.organizacija.naziv);
  return [...m].map(([slug, naziv]) => ({ slug, naziv })).sort((a, b) => a.naziv.localeCompare(b.naziv, "hr") || a.slug.localeCompare(b.slug));
}

/**
 * Kampanja za obavijest iz upita (`?objavljeno={id}`, `?obrisana={id}`): naslov i stanje, i obrisana, ali samo
 * ako je moja (član organizacije ili autor). Inače null (tuđi ID ne otkriva naslov).
 */
export async function kampanjaZaObavijest(
  db: D1Database,
  userId: string,
  publicId: string,
): Promise<{ naslov: string; stanje: StanjeMoje; obrisana: boolean; organizacija: string | null } | null> {
  const id = publicId.trim().toLowerCase();
  if (!/^[0-9a-z]{6}$/.test(id)) return null;
  const r = await db
    .prepare(
      `SELECT c.title, c.state, s.paused_at, s.blocked_at, c.deleted_at, o.display_name AS naziv
         FROM campaign_settings s JOIN campaigns c ON c.id = s.campaign_id
         LEFT JOIN organizations o ON o.organizer_id = c.organizer_id
         LEFT JOIN memberships m ON m.organization_id = o.id AND m.user_id = ?1
        WHERE s.public_id = ?2 AND (m.user_id IS NOT NULL OR s.created_by_user_id = ?1 OR c.created_by = ?1)`,
    )
    .bind(userId, id)
    .first<{ title: string; state: string; paused_at: number | null; blocked_at: number | null; deleted_at: number | null; naziv: string | null }>();
  if (!r) return null;
  return { naslov: r.title, stanje: stanjeMoje(r.state, r.paused_at, r.blocked_at), obrisana: r.deleted_at !== null, organizacija: r.naziv };
}

// --- Moje donacije ----------------------------------------------------------------------------------------

export type StanjeDonacije = "open" | "underpaid" | "paid" | "expired" | "late" | "underpaid_expired" | "rejected" | "refunded";

export interface MojaDonacija {
  checkoutId: string;
  /** Referenca intenta (kratki kod ili ID checkouta); iznos nikad ne nosi identitet. */
  referenca: string;
  iznosCenti: number;
  napojnicaCenti: number;
  stanje: StanjeDonacije;
  stvorena: number;
  placena: number | null;
  kasica: string | null;
  /** Slug mog najnovijeg aktivnog linka za praćenje te kampanje (`/z/{slug}`), ili null (obilazak 08 „Tracking link”). */
  mojLink: string | null;
  kampanja: { publicId: string; naslov: string; organizator: string; organizacijaSlug: string | null; vidljiva: boolean; cilj: number | null; rok: number | null };
}

/** Moji doprinosi: checkouti po `user_id` ili po mojoj e-pošti (doprinos prije registracije), najnoviji prvi. */
export async function mojeDonacije(db: D1Database, userId: string, email: string): Promise<MojaDonacija[]> {
  const { results } = await db
    .prepare(
      `SELECT ch.id, COALESCE(ch.short_ref, ch.contribution_sid) AS referenca, ch.amount_cents, ch.tip_cents, ch.intent_state,
              ch.created_at, mb.alias AS kasica,
              (SELECT d.state FROM contribution_attributions a JOIN contributions d ON d.id = a.contribution_id
                WHERE a.checkout_id = ch.id ORDER BY d.created_at DESC, d.id LIMIT 1) AS d_state,
              (SELECT d.paid_at FROM contribution_attributions a JOIN contributions d ON d.id = a.contribution_id
                WHERE a.checkout_id = ch.id ORDER BY d.created_at DESC, d.id LIMIT 1) AS paid_at,
              s.public_id, c.title, COALESCE(o.display_name, g.legal_name) AS organizator, o.slug AS org_slug,
              (${VIDLJIVA}) AS vidljiva, c.goal_cents, c.ends_at,
              (SELECT l.slug FROM tracking_links l WHERE l.owner_user_id = ?1 AND l.campaign_id = c.id AND l.status = 'active'
                ORDER BY l.created_at DESC, l.id LIMIT 1) AS moj_link
         FROM checkouts ch
         JOIN campaigns c ON c.id = ch.campaign_id
         JOIN campaign_settings s ON s.campaign_id = c.id
         JOIN organizers g ON g.id = c.organizer_id
         LEFT JOIN organizations o ON o.organizer_id = c.organizer_id AND o.deleted_at IS NULL
         LEFT JOIN moneyboxes mb ON mb.id = ch.moneybox_id
        WHERE ch.user_id = ?1 OR ch.email = ?2
        ORDER BY ch.created_at DESC, ch.id`,
    )
    .bind(userId, email)
    .all<{
      id: string; referenca: string; amount_cents: number; tip_cents: number; intent_state: StanjeDonacije; created_at: number;
      d_state: string | null; paid_at: number | null; kasica: string | null; public_id: string; title: string; organizator: string;
      org_slug: string | null; vidljiva: number; goal_cents: number | null; ends_at: number | null; moj_link: string | null;
    }>();
  return results.map((r) => ({
    checkoutId: r.id,
    referenca: r.referenca,
    iznosCenti: r.amount_cents,
    napojnicaCenti: r.tip_cents,
    stanje: r.d_state === "refunded" ? "refunded" : r.intent_state,
    stvorena: r.created_at,
    placena: r.paid_at,
    kasica: r.kasica,
    mojLink: r.moj_link,
    kampanja: {
      publicId: r.public_id,
      naslov: r.title,
      organizator: r.organizator,
      organizacijaSlug: r.org_slug,
      vidljiva: r.vidljiva === 1,
      cilj: r.goal_cents,
      rok: r.ends_at,
    },
  }));
}

/** Zbroj plaćenih (bez napojnice i vraćenih). */
export const ukupnoDonirano = (d: MojaDonacija[]): number => d.filter((x) => x.stanje === "paid").reduce((s, x) => s + x.iznosCenti, 0);

// --- Moje kasice ------------------------------------------------------------------------------------------

export const STATUSI_KASICE = ["active", "disabled", "deleted"] as const;
export type StatusKasice = (typeof STATUSI_KASICE)[number];
export const isStatusKasice = (x: unknown): x is StatusKasice => STATUSI_KASICE.includes(x as StatusKasice);

export interface MojaKasica {
  alias: string;
  naslov: string;
  status: StatusKasice;
  ciljCenti: number | null;
  /** null kad kampanja skriva prikupljeno (vlasnik kasice nije organizator). */
  prikupljenoCenti: number | null;
  brojDoprinosa: number | null;
  stvorena: number;
  kampanja: { publicId: string; naslov: string; vidljiva: boolean; dopustaKasice: boolean };
}

/** Moje kasice (V: `owner_user_id`), sve tri skupine; najnovije prve. */
export async function mojeKasice(db: D1Database, userId: string): Promise<MojaKasica[]> {
  const { results } = await db
    .prepare(
      `SELECT m.alias, m.title, m.status, m.goal_cents, m.created_at, s.public_id, c.title AS kampanja, s.hide_raised,
              s.hide_contributor_count, s.allow_moneyboxes, (${VIDLJIVA}) AS vidljiva,
              (SELECT COALESCE(SUM(d.amount_received_cents), 0) FROM contribution_attributions a
                 JOIN contributions d ON d.id = a.contribution_id WHERE a.moneybox_id = m.id AND d.state = 'paid') AS raised,
              (SELECT count(*) FROM contribution_attributions a
                 JOIN contributions d ON d.id = a.contribution_id WHERE a.moneybox_id = m.id AND d.state = 'paid') AS n
         FROM moneyboxes m
         JOIN campaigns c ON c.id = m.campaign_id
         JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE m.owner_user_id = ?
        ORDER BY m.created_at DESC, m.id`,
    )
    .bind(userId)
    .all<{
      alias: string; title: string; status: StatusKasice; goal_cents: number | null; created_at: number; public_id: string; kampanja: string;
      hide_raised: number; hide_contributor_count: number; allow_moneyboxes: number; vidljiva: number; raised: number; n: number;
    }>();
  return results.map((r) => ({
    alias: r.alias,
    naslov: r.title,
    status: r.status,
    ciljCenti: r.goal_cents,
    prikupljenoCenti: r.hide_raised === 1 ? null : r.raised,
    brojDoprinosa: r.hide_contributor_count === 1 ? null : r.n,
    stvorena: r.created_at,
    kampanja: { publicId: r.public_id, naslov: r.kampanja, vidljiva: r.vidljiva === 1, dopustaKasice: r.allow_moneyboxes === 1 },
  }));
}

/**
 * Isključi ili uključi svoju kasicu (V). Obrisana se ne vraća. Vraća false kad kasica nije moja ili nije u
 * stanju iz kojeg se prelazi.
 */
export async function postaviKasicu(db: D1Database, userId: string, alias: string, ukljuci: boolean, sad: number = Date.now()): Promise<boolean> {
  const r = await db
    .prepare("UPDATE moneyboxes SET status = ?, updated_at = ? WHERE alias = ? AND owner_user_id = ? AND status = ?")
    .bind(ukljuci ? "active" : "disabled", sad, alias.trim().toLowerCase(), userId, ukljuci ? "disabled" : "active")
    .run();
  return (r.meta as { changes?: number }).changes !== 0;
}

// --- Kamo ide novac ---------------------------------------------------------------------------------------

export const LANCI_MOJE: Record<number, { ime: string; explorer: string }> = {
  100: { ime: "Gnosis", explorer: "https://gnosisscan.io/address/" },
  10200: { ime: "Gnosis Chiado (test)", explorer: "https://gnosis-chiado.blockscout.com/address/" },
};

export interface NovacKampanje {
  kampanja: MojaKampanja;
  safe: string | null;
  lanac: number | null;
  imeLanca: string | null;
  explorer: string | null;
  potpisi: number | null;
  /** Safe provjeren (MPT registracija u S7; do tada mock). */
  provjeren: boolean;
}

export interface NovacOrganizacije {
  organizacija: { slug: string; naziv: string; osobna: boolean } | null;
  ukupnoCenti: number;
  kampanje: NovacKampanje[];
}

/**
 * „Kamo ide novac” za sve moje kampanje (osim nacrta, odbijenih i otkazanih), po organizaciji. Nema isplate
 * (odluka 6): uplate idu izravno na Safe organizacije, a platforma nema potpisnika.
 */
export async function mojNovac(db: D1Database, userId: string): Promise<NovacOrganizacije[]> {
  const kampanje = (await mojeKampanje(db, userId)).filter((k) => k.stanje !== "draft" && k.stanje !== "cancelled");
  if (!kampanje.length) return [];
  const { results } = await db
    .prepare(
      `SELECT campaign_id, address, chain_id, threshold, verified_at FROM campaign_safes
        WHERE campaign_id IN (${kampanje.map(() => "?").join(",")})`,
    )
    .bind(...kampanje.map((k) => k.id))
    .all<{ campaign_id: string; address: string; chain_id: number; threshold: number; verified_at: number | null }>();
  const safeovi = new Map(results.map((r) => [r.campaign_id, r]));
  const skupine = new Map<string, NovacOrganizacije>();
  for (const k of kampanje) {
    const s = safeovi.get(k.id);
    const lanac = s ? (LANCI_MOJE[s.chain_id] ?? null) : null;
    const kljuc = k.organizacija?.slug ?? "";
    const g = skupine.get(kljuc) ?? { organizacija: k.organizacija ? { slug: k.organizacija.slug, naziv: k.organizacija.naziv, osobna: k.organizacija.osobna } : null, ukupnoCenti: 0, kampanje: [] };
    g.ukupnoCenti += k.prikupljenoCenti;
    g.kampanje.push({
      kampanja: k,
      safe: s?.address ?? null,
      lanac: s?.chain_id ?? null,
      imeLanca: lanac?.ime ?? null,
      explorer: s && lanac ? `${lanac.explorer}${s.address}` : null,
      potpisi: s?.threshold ?? null,
      provjeren: !!s?.verified_at,
    });
    skupine.set(kljuc, g);
  }
  return [...skupine.values()].sort((a, b) => (a.organizacija?.naziv ?? "").localeCompare(b.organizacija?.naziv ?? "", "hr"));
}

// --- Vanjske kampanje mojih organizacija ------------------------------------------------------------------

export interface MojaVanjska {
  id: string;
  url: string;
  naslov: string;
  status: "pending" | "active";
  provjerena: number | null;
  organizacija: { slug: string; naziv: string };
  uloga: Uloga;
}

/** Vanjske (4fund) kampanje organizacija u kojima sam član, bez uklonjenih; po organizaciji pa najnovije. */
export async function mojeVanjske(db: D1Database, userId: string): Promise<MojaVanjska[]> {
  const { results } = await db
    .prepare(
      `SELECT e.id, e.url, e.title, e.status, e.verified_at, o.slug, o.display_name AS naziv, m.role
         FROM external_campaigns e
         JOIN organizations o ON o.id = e.organization_id AND o.deleted_at IS NULL
         JOIN memberships m ON m.organization_id = o.id AND m.user_id = ?
        WHERE e.status <> 'removed'
        ORDER BY o.display_name, e.created_at DESC, e.id`,
    )
    .bind(userId)
    .all<{ id: string; url: string; title: string; status: "pending" | "active"; verified_at: number | null; slug: string; naziv: string; role: Uloga }>();
  return results.map((r) => ({
    id: r.id,
    url: r.url,
    naslov: r.title,
    status: r.status,
    provjerena: r.verified_at,
    organizacija: { slug: r.slug, naziv: r.naziv },
    uloga: r.role,
  }));
}
