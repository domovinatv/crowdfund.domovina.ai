/**
 * Upravljanje kampanjom (S6, `/hr/{id}/uredi` i `/hr/{id}/upravljanje/*`): kampanja bez obzira na javnu
 * vidljivost (pristup već provjeren u `src/lib/pristup.ts`), postavke s validacijom i zaključavanjem,
 * nadzorna ploča, isključi/uključi, zatvaranje i brisanje, kasice, linkovi za praćenje, obavijesti,
 * verifikacija namjene i „Kamo ide novac”.
 *
 * Organizator vidi stvarne brojke (i kad ih javno skriva). Sve funkcije primaju `D1Database` i `sad` (ms),
 * pa ih test zove nad sqliteom (test/upravljanje.test.ts).
 */
import { DAN, ORG_VERIFICIRANA, uuid7 } from "./zajednicko";

// --- Pomoćnici unosa ------------------------------------------------------------------------------------

/**
 * Iznos iz obrasca u cente: „1.234,56”, „1234,5”, „1234.56”, „1 234 €”. Točka s točno tri znamenke iza
 * (i bez zareza) je razdjelnik tisućica. null za prazno ili nevaljano, ne provjerava granice.
 */
export function iznosUCente(x: string): number | null {
  let s = x.replace(/[\s €]/g, "").replace(/eur$/i, "");
  if (!s) return null;
  const zarez = s.lastIndexOf(",");
  const tocka = s.lastIndexOf(".");
  if (zarez >= 0 && tocka >= 0) {
    const decimalni = zarez > tocka ? "," : ".";
    const tisucice = decimalni === "," ? "." : ",";
    s = s.split(tisucice).join("").replace(decimalni, ".");
  } else if (zarez >= 0) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) && s.split(",").length > 2 ? s.split(",").join("") : s.replace(",", ".");
  } else if (tocka >= 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.split(".").join("");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [cijeli, dec = ""] = s.split(".");
  const c = Number(cijeli) * 100 + Number(dec.padEnd(2, "0"));
  return Number.isSafeInteger(c) ? c : null;
}

/** Cente u vrijednost polja obrasca („1234,50” / „1234.50”, bez razdjelnika tisućica). */
export function centiUPolje(c: number | null, lang: "hr" | "en"): string {
  if (c === null) return "";
  const s = c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2);
  return lang === "hr" ? s.replace(".", ",") : s;
}

/**
 * Rok iz `<input type="date">` (`YYYY-MM-DD`) u ms: 21:59:59.999 UTC, pa je to isti kalendarski dan u UTC-u i u
 * Zagrebu (zimi 22:59, ljeti 23:59). null za prazno, `undefined` za nevaljan datum.
 */
export function rokIzDatuma(x: string): number | null | undefined {
  const s = x.trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const [g, mj, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(g, mj - 1, d, 21, 59, 59, 999);
  const prov = new Date(t);
  return prov.getUTCFullYear() === g && prov.getUTCMonth() === mj - 1 && prov.getUTCDate() === d ? t : undefined;
}

/** ms roka → `YYYY-MM-DD` za `<input type="date">` (obrat `rokIzDatuma`). */
export const datumIzRoka = (ms: number | null): string => (ms === null ? "" : new Date(ms).toISOString().slice(0, 10));

const SLUG = /^[a-z0-9-]{3,60}$/;

/** Prijedlog sluga iz naslova: mala slova, bez dijakritika, crtice (najviše 40 znakova). */
export function slugIzNaslova(naslov: string): string {
  return naslov
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** Nasumični slug od 8 znakova (link „nasumično”, kao 4fund „Random”). */
export function nasumicniSlug(): string {
  const abc = "abcdefghjkmnpqrstvwxyz23456789";
  const b = crypto.getRandomValues(new Uint8Array(8));
  return [...b].map((x) => abc[x % abc.length]).join("");
}

// --- Kampanja za upravljanje ----------------------------------------------------------------------------

export type NacinKomentara = "off" | "contributors" | "everyone";
export type StanjeVerifikacije = "requested" | "submitted" | "in_review" | "approved" | "rejected" | "expired";

export interface VerifikacijaNamjene {
  id: string;
  status: StanjeVerifikacije;
  trigger: string | null;
  reason: string | null;
  requestedAt: number;
  decidedAt: number | null;
  dueAt: number | null;
}

export interface KampanjaUpravljanja {
  id: string;
  publicId: string;
  slug: string;
  title: string;
  description: string | null;
  goalCents: number | null;
  minContributionCents: number | null;
  endsAt: number | null;
  locationName: string | null;
  currency: string;
  state: "draft" | "review" | "active" | "funded" | "closed" | "cancelled";
  visibility: "private" | "unlisted" | "public";
  kind: "one_time" | "recurring" | "for_organization";
  categoryKey: string | null;
  pausedAt: number | null;
  blockedAt: number | null;
  blockedReason: string | null;
  /** Javno vidljiva (stranica `/hr/{id}` radi). */
  javna: boolean;
  postavke: {
    popisUplata: "visible" | "hidden";
    hideRaised: boolean;
    hideContributorCount: boolean;
    komentari: NacinKomentara;
    redoslijedUplata: "latest" | "highest";
    kasiceDopustene: boolean;
    ponudeDopustene: boolean;
    zahvala: string | null;
    obavijestiUplate: boolean;
  };
  organizacija: { id: string; slug: string; name: string } | null;
  verifikacija: VerifikacijaNamjene | null;
  /** Naslov, opis i cilj su zaključani (verifikacija namjene `approved`, docs/05). */
  zakljucano: boolean;
  /** `slug` jezgre se ne mijenja nakon `active` (docs/05). */
  slugZakljucan: boolean;
  /** Stvarne brojke (organizator ih vidi i kad su javno skrivene). */
  prikupljenoCents: number;
  brojDoprinosa: number;
}

const POSLJEDNJA_VERIFIKACIJA = `SELECT v.id, v.status, v.trigger, v.reason, v.requested_at, v.decided_at, v.due_at
  FROM verifications v WHERE v.kind = 'campaign_purpose' AND v.subject_type = 'campaign' AND v.subject_id = ?
  ORDER BY v.requested_at DESC, v.id DESC LIMIT 1`;

/** Zadnja verifikacija namjene kampanje ili null. */
export async function verifikacijaNamjene(db: D1Database, campaignId: string): Promise<VerifikacijaNamjene | null> {
  const r = await db.prepare(POSLJEDNJA_VERIFIKACIJA).bind(campaignId).first<{
    id: string; status: StanjeVerifikacije; trigger: string | null; reason: string | null; requested_at: number; decided_at: number | null; due_at: number | null;
  }>();
  return r ? { id: r.id, status: r.status, trigger: r.trigger, reason: r.reason, requestedAt: r.requested_at, decidedAt: r.decided_at, dueAt: r.due_at } : null;
}

/** Kampanja po internom ID-u za upravljanje (i nejavna); null kad je obrisana ili ne postoji. */
export async function kampanjaZaUpravljanje(db: D1Database, campaignId: string): Promise<KampanjaUpravljanja | null> {
  const r = await db
    .prepare(
      `SELECT c.id, s.public_id, c.slug, c.title, c.description, c.goal_cents, c.min_contribution_cents, c.ends_at,
              c.location_name, c.currency, c.state, c.visibility, s.kind, s.category_key, s.paused_at, s.blocked_at,
              s.blocked_reason, s.contributions_list, s.hide_raised, s.hide_contributor_count, s.comments_mode,
              s.contributions_sort, s.allow_moneyboxes, s.allow_external_offers, s.thank_you_message,
              s.contribution_notifications, s.purpose_verified, o.id AS org_id, o.slug AS org_slug, o.display_name AS org_name,
              (SELECT COALESCE(SUM(d.amount_received_cents), 0) FROM contributions d WHERE d.campaign_id = c.id AND d.state = 'paid') AS prikupljeno,
              (SELECT count(*) FROM contributions d WHERE d.campaign_id = c.id AND d.state = 'paid') AS n
         FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
         LEFT JOIN organizations o ON o.organizer_id = c.organizer_id AND o.deleted_at IS NULL
        WHERE c.id = ? AND c.deleted_at IS NULL`,
    )
    .bind(campaignId)
    .first<{
      id: string; public_id: string; slug: string; title: string; description: string | null; goal_cents: number | null;
      min_contribution_cents: number | null; ends_at: number | null; location_name: string | null; currency: string;
      state: KampanjaUpravljanja["state"]; visibility: KampanjaUpravljanja["visibility"]; kind: KampanjaUpravljanja["kind"];
      category_key: string | null; paused_at: number | null; blocked_at: number | null; blocked_reason: string | null;
      contributions_list: "visible" | "hidden"; hide_raised: number; hide_contributor_count: number; comments_mode: NacinKomentara;
      contributions_sort: "latest" | "highest"; allow_moneyboxes: number; allow_external_offers: number; thank_you_message: string | null;
      contribution_notifications: number; purpose_verified: number; org_id: string | null; org_slug: string | null; org_name: string | null;
      prikupljeno: number; n: number;
    }>();
  if (!r) return null;
  const verifikacija = await verifikacijaNamjene(db, r.id);
  return {
    id: r.id,
    publicId: r.public_id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    goalCents: r.goal_cents,
    minContributionCents: r.min_contribution_cents,
    endsAt: r.ends_at,
    locationName: r.location_name,
    currency: r.currency,
    state: r.state,
    visibility: r.visibility,
    kind: r.kind,
    categoryKey: r.category_key,
    pausedAt: r.paused_at,
    blockedAt: r.blocked_at,
    blockedReason: r.blocked_reason,
    javna: (r.state === "active" || r.state === "closed") && r.visibility !== "private" && r.blocked_at === null,
    postavke: {
      popisUplata: r.contributions_list,
      hideRaised: r.hide_raised === 1,
      hideContributorCount: r.hide_contributor_count === 1,
      komentari: r.comments_mode,
      redoslijedUplata: r.contributions_sort,
      kasiceDopustene: r.allow_moneyboxes === 1,
      ponudeDopustene: r.allow_external_offers === 1,
      zahvala: r.thank_you_message,
      obavijestiUplate: r.contribution_notifications === 1,
    },
    organizacija: r.org_id ? { id: r.org_id, slug: r.org_slug!, name: r.org_name! } : null,
    verifikacija,
    // Zastava u postavkama i zadnja verifikacija: zaključava bilo koja (sigurnija strana).
    zakljucano: verifikacija?.status === "approved" || r.purpose_verified === 1,
    slugZakljucan: !(r.state === "draft" || r.state === "review"),
    prikupljenoCents: r.prikupljeno,
    brojDoprinosa: r.n,
  };
}

// --- Postavke (`campaign.edit`) -------------------------------------------------------------------------

export const NAJVISE = { title: 60, description: 20000, locationName: 120, thankYou: 1000 } as const;
/** Najmanji doprinos je 1 € (globalni minimum, javni pregled §4.2); cilj najviše 10 milijuna €. */
export const MIN_DOPRINOS_CENTI = 100;
export const NAJVECI_CILJ_CENTI = 1_000_000_000;

export interface UlazPostavki {
  title: string;
  description: string;
  goal: string;
  endsAt: string;
  locationName: string;
  minAmount: string;
  visibility: string;
  contributionsList: string;
  contributionsSort: string;
  hideRaised: boolean;
  hideContributorCount: boolean;
  commentsMode: string;
  allowMoneyboxes: boolean;
  allowOffers: boolean;
  thankYou: string;
  slug: string;
}

export type PoljePostavki = keyof UlazPostavki;
export type GreskaPostavki = "obavezno" | "predugo" | "nevaljano" | "zakljucano" | "zauzeto" | "prosao";
export type GreskePostavki = Partial<Record<PoljePostavki, GreskaPostavki>>;

/** Vrijednosti obrasca iz postojeće kampanje (GET `campaign.edit`). */
export function ulazIzKampanje(k: KampanjaUpravljanja, lang: "hr" | "en"): UlazPostavki {
  return {
    title: k.title,
    description: k.description ?? "",
    goal: centiUPolje(k.goalCents, lang),
    endsAt: datumIzRoka(k.endsAt),
    locationName: k.locationName ?? "",
    minAmount: centiUPolje(k.minContributionCents, lang),
    visibility: k.visibility === "unlisted" ? "unlisted" : "public",
    contributionsList: k.postavke.popisUplata,
    contributionsSort: k.postavke.redoslijedUplata,
    hideRaised: k.postavke.hideRaised,
    hideContributorCount: k.postavke.hideContributorCount,
    commentsMode: k.postavke.komentari,
    allowMoneyboxes: k.postavke.kasiceDopustene,
    allowOffers: k.postavke.ponudeDopustene,
    thankYou: k.postavke.zahvala ?? "",
    slug: k.slug,
  };
}

const jedanOd = <T extends string>(x: string, dopusteno: readonly T[]): x is T => (dopusteno as readonly string[]).includes(x);

/**
 * Spremi postavke kampanje. Poslužitelj odbija promjenu naslova, opisa i cilja zaključane kampanje i sluga
 * nakon `active` (greška `zakljucano`), čak i kad obrazac pošalje drugu vrijednost. Rok se smije ukloniti ili
 * produžiti; novi rok ne smije biti u prošlosti.
 */
export async function spremiPostavke(
  db: D1Database,
  k: KampanjaUpravljanja,
  u: UlazPostavki,
  sad: number,
): Promise<{ ok: true } | { ok: false; greske: GreskePostavki }> {
  const g: GreskePostavki = {};
  const title = u.title.trim();
  const description = u.description.trim();
  if (!title) g.title = "obavezno";
  else if (title.length > NAJVISE.title) g.title = "predugo";
  if (description.length > NAJVISE.description) g.description = "predugo";

  const goalCents = u.goal.trim() ? iznosUCente(u.goal) : null;
  if (u.goal.trim() && (goalCents === null || goalCents < 100 || goalCents > NAJVECI_CILJ_CENTI)) g.goal = "nevaljano";
  const minCents = u.minAmount.trim() ? iznosUCente(u.minAmount) : null;
  if (u.minAmount.trim() && (minCents === null || minCents < MIN_DOPRINOS_CENTI || minCents > 1_000_000)) g.minAmount = "nevaljano";

  const endsAt = rokIzDatuma(u.endsAt);
  if (endsAt === undefined) g.endsAt = "nevaljano";
  else if (endsAt !== null && endsAt !== k.endsAt && endsAt < sad) g.endsAt = "prosao";

  const locationName = u.locationName.trim();
  if (locationName.length > NAJVISE.locationName) g.locationName = "predugo";
  const thankYou = u.thankYou.trim();
  if (thankYou.length > NAJVISE.thankYou) g.thankYou = "predugo";
  if (!jedanOd(u.visibility, ["public", "unlisted"] as const)) g.visibility = "nevaljano";
  if (!jedanOd(u.contributionsList, ["visible", "hidden"] as const)) g.contributionsList = "nevaljano";
  if (!jedanOd(u.contributionsSort, ["latest", "highest"] as const)) g.contributionsSort = "nevaljano";
  if (!jedanOd(u.commentsMode, ["off", "contributors", "everyone"] as const)) g.commentsMode = "nevaljano";

  if (k.zakljucano) {
    if (title !== k.title) g.title = "zakljucano";
    if (description !== (k.description ?? "").trim()) g.description = "zakljucano";
    if (!g.goal && goalCents !== k.goalCents) g.goal = "zakljucano";
  }
  const slug = u.slug.trim().toLowerCase() || k.slug;
  if (slug !== k.slug) {
    if (k.slugZakljucan) g.slug = "zakljucano";
    else if (!SLUG.test(slug)) g.slug = "nevaljano";
    else {
      const zauzet = await db
        .prepare("SELECT 1 AS da FROM campaigns WHERE slug = ? AND id <> ? AND tenant_id = (SELECT tenant_id FROM campaigns WHERE id = ?)")
        .bind(slug, k.id, k.id)
        .first<{ da: number }>();
      if (zauzet) g.slug = "zauzeto";
    }
  }
  if (Object.keys(g).length > 0) return { ok: false, greske: g };

  await db
    .prepare(
      `UPDATE campaigns SET title = ?, description = ?, goal_cents = ?, min_contribution_cents = ?, ends_at = ?,
              location_name = ?, visibility = ?, slug = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(title, description || null, goalCents, minCents, endsAt ?? null, locationName || null, u.visibility, slug, sad, k.id)
    .run();
  await db
    .prepare(
      `UPDATE campaign_settings SET contributions_list = ?, contributions_sort = ?, hide_raised = ?, hide_contributor_count = ?,
              comments_mode = ?, allow_moneyboxes = ?, allow_external_offers = ?, thank_you_message = ?, indexable = ?, updated_at = ?
        WHERE campaign_id = ?`,
    )
    .bind(
      u.contributionsList, u.contributionsSort, u.hideRaised ? 1 : 0, u.hideContributorCount ? 1 : 0, u.commentsMode,
      u.allowMoneyboxes ? 1 : 0, u.allowOffers ? 1 : 0, thankYou || null, u.visibility === "public" ? 1 : 0, sad, k.id,
    )
    .run();
  return { ok: true };
}

// --- Stanje: isključi/uključi, zatvori, ponovno otvori, obriši ------------------------------------------

/** Isključi (`paused_at`) ili uključi aktivnu kampanju (4fund „Turn off”). false kad prijelaz nije dopušten. */
export async function postaviIskljucenost(db: D1Database, campaignId: string, iskljuci: boolean, sad: number): Promise<boolean> {
  const r = await db
    .prepare(
      `UPDATE campaign_settings SET paused_at = ?, updated_at = ?
        WHERE campaign_id = ? AND (paused_at IS NULL) = ?
          AND EXISTS (SELECT 1 FROM campaigns c WHERE c.id = campaign_id AND c.state = 'active' AND c.deleted_at IS NULL)`,
    )
    .bind(iskljuci ? sad : null, sad, campaignId, iskljuci ? 1 : 0)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

/** Ručno zatvaranje `active → closed` i ponovno otvaranje `closed → active` (docs/05). */
export async function promijeniStanje(db: D1Database, campaignId: string, radnja: "zatvori" | "otvori", sad: number): Promise<boolean> {
  const [iz, u] = radnja === "zatvori" ? ["active", "closed"] : ["closed", "active"];
  const r = await db
    .prepare("UPDATE campaigns SET state = ?, updated_at = ? WHERE id = ? AND state = ? AND deleted_at IS NULL")
    .bind(u, sad, campaignId, iz)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

/** Brisanje (soft): `deleted_at` + `state = cancelled`, kasice kampanje `deleted` (docs/05). */
export async function obrisiKampanju(db: D1Database, campaignId: string, sad: number): Promise<boolean> {
  const r = await db
    .prepare("UPDATE campaigns SET state = 'cancelled', deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
    .bind(sad, sad, campaignId)
    .run();
  if ((r.meta.changes ?? 0) === 0) return false;
  await db.prepare("UPDATE moneyboxes SET status = 'deleted', updated_at = ? WHERE campaign_id = ? AND status <> 'deleted'").bind(sad, campaignId).run();
  await db.prepare("UPDATE tracking_links SET status = 'disabled' WHERE campaign_id = ?").bind(campaignId).run();
  return true;
}

// --- Nadzorna ploča (`campaign.manage`) ------------------------------------------------------------------

export interface DanStatistike {
  /** `YYYY-MM-DD` (UTC). */
  dan: string;
  cents: number;
  n: number;
}

export interface IzvorKasica { alias: string; title: string; status: string; cents: number; n: number }
export interface IzvorLinka { slug: string; label: string | null; status: string; posjeti: number; cents: number; n: number }

export interface NadzornaPloca {
  prikupljenoCents: number;
  brojDoprinosa: number;
  /** Prosjek plaćenog doprinosa (zaokružen na cent), null bez doprinosa. */
  prosjekCents: number | null;
  /** Doprinosi koji čekaju uplatu (`pending`). */
  naCekanju: number;
  poDanu: DanStatistike[];
  izvori: {
    kasice: IzvorKasica[];
    linkovi: IzvorLinka[];
    dijeljenje: { cents: number; n: number; linkova: number };
    izravno: { cents: number; n: number };
  };
}

const ZBROJ_ATRIBUCIJE = (uvjet: string) => `(SELECT COALESCE(SUM(d.amount_received_cents), 0) FROM contribution_attributions a
   JOIN contributions d ON d.id = a.contribution_id WHERE ${uvjet} AND d.state = 'paid')`;
const BROJ_ATRIBUCIJE = (uvjet: string) => `(SELECT count(*) FROM contribution_attributions a
   JOIN contributions d ON d.id = a.contribution_id WHERE ${uvjet} AND d.state = 'paid')`;

/** Brojke, doprinosi po danu za zadnjih `dana` dana (uključujući današnji) i izvori doprinosa. */
export async function nadzornaPloca(db: D1Database, campaignId: string, sad: number, dana = 30): Promise<NadzornaPloca> {
  const zbroj = await db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN state = 'paid' THEN amount_received_cents END), 0) AS cents,
              count(CASE WHEN state = 'paid' THEN 1 END) AS n, count(CASE WHEN state = 'pending' THEN 1 END) AS cekaju
         FROM contributions WHERE campaign_id = ?`,
    )
    .bind(campaignId)
    .first<{ cents: number; n: number; cekaju: number }>();
  const danas = new Date(sad);
  const pocetak = Date.UTC(danas.getUTCFullYear(), danas.getUTCMonth(), danas.getUTCDate()) - (dana - 1) * DAN;
  const { results: dani } = await db
    .prepare(
      `SELECT strftime('%Y-%m-%d', paid_at / 1000, 'unixepoch') AS dan, SUM(amount_received_cents) AS cents, count(*) AS n
         FROM contributions WHERE campaign_id = ? AND state = 'paid' AND paid_at >= ? AND paid_at <= ?
        GROUP BY dan ORDER BY dan`,
    )
    .bind(campaignId, pocetak, sad)
    .all<DanStatistike>();
  const poKljucu = new Map(dani.map((d) => [d.dan, d]));
  const poDanu: DanStatistike[] = [];
  for (let i = 0; i < dana; i++) {
    const dan = new Date(pocetak + i * DAN).toISOString().slice(0, 10);
    const d = poKljucu.get(dan);
    poDanu.push({ dan, cents: d?.cents ?? 0, n: d?.n ?? 0 });
  }

  const { results: kasice } = await db
    .prepare(
      `SELECT m.alias, m.title, m.status, ${ZBROJ_ATRIBUCIJE("a.moneybox_id = m.id")} AS cents, ${BROJ_ATRIBUCIJE("a.moneybox_id = m.id")} AS n
         FROM moneyboxes m WHERE m.campaign_id = ? AND m.status <> 'deleted' ORDER BY cents DESC, m.created_at, m.id`,
    )
    .bind(campaignId)
    .all<IzvorKasica>();
  const { results: linkovi } = await db
    .prepare(
      `SELECT l.slug, l.label, l.status, (SELECT count(*) FROM link_visits v WHERE v.tracking_link_id = l.id) AS posjeti,
              ${ZBROJ_ATRIBUCIJE("a.tracking_link_id = l.id")} AS cents, ${BROJ_ATRIBUCIJE("a.tracking_link_id = l.id")} AS n
         FROM tracking_links l WHERE l.campaign_id = ? ORDER BY cents DESC, l.created_at, l.id`,
    )
    .bind(campaignId)
    .all<IzvorLinka>();
  const dijeljenje = await db
    .prepare(
      `SELECT COALESCE(SUM(d.amount_received_cents), 0) AS cents, count(d.id) AS n,
              (SELECT count(*) FROM share_links x WHERE x.campaign_id = ?1) AS linkova
         FROM contribution_attributions a JOIN contributions d ON d.id = a.contribution_id
        WHERE d.campaign_id = ?1 AND d.state = 'paid' AND a.share_link_id IS NOT NULL`,
    )
    .bind(campaignId)
    .first<{ cents: number; n: number; linkova: number }>();
  const izravno = await db
    .prepare(
      `SELECT COALESCE(SUM(d.amount_received_cents), 0) AS cents, count(d.id) AS n
         FROM contributions d LEFT JOIN contribution_attributions a ON a.contribution_id = d.id
        WHERE d.campaign_id = ? AND d.state = 'paid'
          AND a.moneybox_id IS NULL AND a.tracking_link_id IS NULL AND a.share_link_id IS NULL`,
    )
    .bind(campaignId)
    .first<{ cents: number; n: number }>();
  const n = zbroj?.n ?? 0;
  return {
    prikupljenoCents: zbroj?.cents ?? 0,
    brojDoprinosa: n,
    prosjekCents: n > 0 ? Math.round((zbroj?.cents ?? 0) / n) : null,
    naCekanju: zbroj?.cekaju ?? 0,
    poDanu,
    izvori: {
      kasice,
      linkovi,
      dijeljenje: dijeljenje ?? { cents: 0, n: 0, linkova: 0 },
      izravno: izravno ?? { cents: 0, n: 0 },
    },
  };
}

// --- Kasice kampanje (`campaign.manage.moneyboxes`, `campaign.moneybox.new`) -----------------------------

export interface KasicaUpravljanja {
  id: string;
  alias: string;
  title: string;
  status: "active" | "disabled";
  goalCents: number | null;
  cents: number;
  n: number;
  ownerName: string | null;
  createdAt: number;
}

/** Sve neobrisane kasice kampanje sa stvarnim zbrojem i brojem (bez obzira na skrivanje). */
export async function kasiceZaUpravljanje(db: D1Database, campaignId: string): Promise<KasicaUpravljanja[]> {
  const { results } = await db
    .prepare(
      `SELECT m.id, m.alias, m.title, m.status, m.goal_cents, m.created_at, u.display_name AS owner_name,
              ${ZBROJ_ATRIBUCIJE("a.moneybox_id = m.id")} AS cents, ${BROJ_ATRIBUCIJE("a.moneybox_id = m.id")} AS n
         FROM moneyboxes m JOIN users u ON u.id = m.owner_user_id
        WHERE m.campaign_id = ? AND m.status <> 'deleted'
        ORDER BY m.status = 'active' DESC, cents DESC, m.created_at DESC, m.id`,
    )
    .bind(campaignId)
    .all<{ id: string; alias: string; title: string; status: "active" | "disabled"; goal_cents: number | null; created_at: number; owner_name: string | null; cents: number; n: number }>();
  return results.map((r) => ({
    id: r.id, alias: r.alias, title: r.title, status: r.status, goalCents: r.goal_cents, cents: r.cents, n: r.n,
    ownerName: r.owner_name, createdAt: r.created_at,
  }));
}

/** Isključi ili ponovno uključi kasicu kampanje (organizator kampanje, ekran 24). */
export async function postaviStatusKasice(db: D1Database, campaignId: string, kasicaId: string, status: "active" | "disabled", sad: number): Promise<boolean> {
  const r = await db
    .prepare("UPDATE moneyboxes SET status = ?, updated_at = ? WHERE id = ? AND campaign_id = ? AND status IN ('active','disabled') AND status <> ?")
    .bind(status, sad, kasicaId, campaignId, status)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

export const VERZIJA_PRAVILA_KASICE = "kasica-2026-11";

export interface UlazKasice {
  title: string;
  alias: string;
  goal: string;
  description: string;
  rules: boolean;
  notifications: boolean;
  thankYouOn: boolean;
  thankYou: string;
}
export type PoljeKasice = "title" | "alias" | "goal" | "description" | "rules" | "thankYou";
export type GreskaKasice = "obavezno" | "predugo" | "nevaljano" | "zauzeto";
export type GreskeKasice = Partial<Record<PoljeKasice, GreskaKasice>>;

/** Nova kasica (tok 6): naslov ≤ 60, alias `[a-z0-9-]{3,60}` jedinstven, cilj neobavezan, pravila obavezna. */
export async function stvoriKasicu(
  db: D1Database,
  o: { campaignId: string; ownerId: string },
  u: UlazKasice,
  sad: number,
): Promise<{ ok: true; alias: string } | { ok: false; greske: GreskeKasice }> {
  const g: GreskeKasice = {};
  const title = u.title.trim();
  const alias = u.alias.trim().toLowerCase();
  const description = u.description.trim();
  const thankYou = u.thankYouOn ? u.thankYou.trim() : "";
  if (!title) g.title = "obavezno";
  else if (title.length > 60) g.title = "predugo";
  if (!alias) g.alias = "obavezno";
  else if (!SLUG.test(alias)) g.alias = "nevaljano";
  else if (await db.prepare("SELECT 1 AS da FROM moneyboxes WHERE alias = ?").bind(alias).first()) g.alias = "zauzeto";
  const goal = u.goal.trim() ? iznosUCente(u.goal) : null;
  if (u.goal.trim() && (goal === null || goal < 100 || goal > NAJVECI_CILJ_CENTI)) g.goal = "nevaljano";
  if (description.length > 5000) g.description = "predugo";
  if (u.thankYouOn && !thankYou) g.thankYou = "obavezno";
  else if (thankYou.length > NAJVISE.thankYou) g.thankYou = "predugo";
  if (!u.rules) g.rules = "obavezno";
  if (Object.keys(g).length > 0) return { ok: false, greske: g };
  await db
    .prepare(
      `INSERT INTO moneyboxes (id, campaign_id, owner_user_id, alias, title, description, goal_cents, payment_notifications,
                               thank_you_message, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    )
    .bind(uuid7(sad), o.campaignId, o.ownerId, alias, title, description || null, goal, u.notifications ? 1 : 0, thankYou || null, sad, sad)
    .run();
  await db
    .prepare("INSERT INTO consents (id, user_id, email, kind, text_version, granted, created_at) VALUES (?, ?, NULL, 'moneybox_rules', ?, 1, ?)")
    .bind(uuid7(sad), o.ownerId, VERZIJA_PRAVILA_KASICE, sad)
    .run();
  return { ok: true, alias };
}

/** Slobodan alias za prijedlog: slug naslova (ili `kasica`), uz broj kad je zauzet. */
export async function predloziAlias(db: D1Database, naslov: string): Promise<string> {
  let osnova = slugIzNaslova(naslov);
  if (osnova.length < 3) osnova = `kasica-${osnova}`.replace(/-+$/, "");
  for (let i = 1; i < 50; i++) {
    const a = i === 1 ? osnova : `${osnova}-${i}`;
    if (!(await db.prepare("SELECT 1 AS da FROM moneyboxes WHERE alias = ?").bind(a).first())) return a;
  }
  return `${osnova}-${nasumicniSlug()}`;
}

// --- Linkovi za praćenje (`campaign.manage.links`) -------------------------------------------------------

export interface LinkUpravljanja extends IzvorLinka {
  id: string;
  ownerId: string;
  ownerName: string | null;
  createdAt: number;
  /** Jedinstveni posjetitelji (različiti hash posjetitelja). */
  jedinstveni: number;
}

export async function linkoviZaUpravljanje(db: D1Database, campaignId: string): Promise<LinkUpravljanja[]> {
  const { results } = await db
    .prepare(
      `SELECT l.id, l.slug, l.label, l.status, l.created_at, l.owner_user_id, u.display_name AS owner_name,
              (SELECT count(*) FROM link_visits v WHERE v.tracking_link_id = l.id) AS posjeti,
              (SELECT count(DISTINCT v.visitor_hash) FROM link_visits v WHERE v.tracking_link_id = l.id) AS jedinstveni,
              ${ZBROJ_ATRIBUCIJE("a.tracking_link_id = l.id")} AS cents, ${BROJ_ATRIBUCIJE("a.tracking_link_id = l.id")} AS n
         FROM tracking_links l JOIN users u ON u.id = l.owner_user_id
        WHERE l.campaign_id = ? ORDER BY l.status = 'active' DESC, l.created_at DESC, l.id`,
    )
    .bind(campaignId)
    .all<{ id: string; slug: string; label: string | null; status: string; created_at: number; owner_user_id: string; owner_name: string | null; posjeti: number; jedinstveni: number; cents: number; n: number }>();
  return results.map((r) => ({
    id: r.id, slug: r.slug, label: r.label, status: r.status, createdAt: r.created_at, ownerId: r.owner_user_id, ownerName: r.owner_name,
    posjeti: r.posjeti, jedinstveni: r.jedinstveni, cents: r.cents, n: r.n,
  }));
}

export type GreskeLinka = Partial<Record<"slug" | "label", "nevaljano" | "zauzeto" | "predugo">>;

/** Novi link za praćenje; prazan slug = nasumičan (4fund „Random”). */
export async function stvoriLink(
  db: D1Database,
  o: { campaignId: string; ownerId: string },
  u: { slug: string; label: string },
  sad: number,
): Promise<{ ok: true; slug: string } | { ok: false; greske: GreskeLinka }> {
  const label = u.label.trim();
  let slug = u.slug.trim().toLowerCase();
  const g: GreskeLinka = {};
  if (label.length > 80) g.label = "predugo";
  if (slug && !SLUG.test(slug)) g.slug = "nevaljano";
  else if (slug && (await db.prepare("SELECT 1 AS da FROM tracking_links WHERE slug = ?").bind(slug).first())) g.slug = "zauzeto";
  if (Object.keys(g).length > 0) return { ok: false, greske: g };
  if (!slug) {
    do slug = nasumicniSlug();
    while (await db.prepare("SELECT 1 AS da FROM tracking_links WHERE slug = ?").bind(slug).first());
  }
  await db
    .prepare("INSERT INTO tracking_links (id, campaign_id, owner_user_id, slug, label, status, created_at) VALUES (?, ?, ?, ?, ?, 'active', ?)")
    .bind(uuid7(sad), o.campaignId, o.ownerId, slug, label || null, sad)
    .run();
  return { ok: true, slug };
}

export async function postaviStatusLinka(db: D1Database, campaignId: string, linkId: string, status: "active" | "disabled"): Promise<boolean> {
  const r = await db
    .prepare("UPDATE tracking_links SET status = ? WHERE id = ? AND campaign_id = ? AND status <> ?")
    .bind(status, linkId, campaignId, status)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

// --- Obavijesti (`campaign.manage.notifications`) --------------------------------------------------------

/**
 * Obavijesti organizatora: o uplatama je postavka kampanje (`campaign_settings.contribution_notifications`,
 * javni pregled §4.2), o komentarima i kraju je osobno praćenje člana (`campaign_follows` s `user_id`).
 */
export interface ObavijestiUpravljanja {
  uplate: boolean;
  komentari: boolean;
  kraj: boolean;
}

export async function obavijestiUpravljanja(db: D1Database, campaignId: string, userId: string): Promise<ObavijestiUpravljanja> {
  const r = await db
    .prepare(
      `SELECT s.contribution_notifications AS uplate, f.notify_comments AS komentari, f.notify_end AS kraj
         FROM campaign_settings s LEFT JOIN campaign_follows f ON f.campaign_id = s.campaign_id AND f.user_id = ?
        WHERE s.campaign_id = ?`,
    )
    .bind(userId, campaignId)
    .first<{ uplate: number; komentari: number | null; kraj: number | null }>();
  return { uplate: r?.uplate === 1, komentari: r?.komentari === 1, kraj: r?.kraj === 1 };
}

/** Spremi obavijesti; `uplate` mijenja samo član s ulogom ≥ editor (`smijeKampanju`). */
export async function spremiObavijesti(
  db: D1Database,
  campaignId: string,
  userId: string,
  o: ObavijestiUpravljanja,
  smijeKampanju: boolean,
  sad: number,
): Promise<void> {
  if (smijeKampanju) {
    await db.prepare("UPDATE campaign_settings SET contribution_notifications = ?, updated_at = ? WHERE campaign_id = ?").bind(o.uplate ? 1 : 0, sad, campaignId).run();
  }
  await db
    .prepare(
      `INSERT INTO campaign_follows (user_id, email, campaign_id, notify_comments, notify_updates, notify_end, token_hash, confirmed_at, created_at)
       VALUES (?1, NULL, ?2, ?3, 0, ?4, NULL, ?5, ?5)
       ON CONFLICT (user_id, campaign_id) WHERE user_id IS NOT NULL
       DO UPDATE SET notify_comments = excluded.notify_comments, notify_end = excluded.notify_end`,
    )
    .bind(userId, campaignId, o.komentari ? 1 : 0, o.kraj ? 1 : 0, sad)
    .run();
}

// --- Verifikacija namjene (`campaign.manage.verification`) -----------------------------------------------

/** Prag verifikacije namjene po kampanji (odluka 18): 5.000 €. Zastava, ne blokada. */
export const PRAG_NAMJENE_CENTI = 500_000;
export const VRSTE_DOKUMENATA = ["site_right", "statute", "contractor_quote", "grid_decision", "contract", "other"] as const;
export type VrstaDokumenta = (typeof VRSTE_DOKUMENATA)[number];
export const MIME_DOKAZA = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"] as const;
export const NAJVECA_DATOTEKA = 20 * 1024 * 1024;

export interface DokumentKampanje {
  id: string;
  kind: VrstaDokumenta;
  label: string;
  /** `r2:{ključ}` (mock: datoteka nije spremljena, samo metapodaci) ili vanjska poveznica. */
  url: string | null;
  issuedAt: number | null;
}

export async function dokumentiKampanje(db: D1Database, campaignId: string): Promise<DokumentKampanje[]> {
  const { results } = await db
    .prepare("SELECT id, kind, label, url, issued_at FROM campaign_documents WHERE campaign_id = ? ORDER BY issued_at DESC, id")
    .bind(campaignId)
    .all<{ id: string; kind: VrstaDokumenta; label: string; url: string | null; issued_at: number | null }>();
  return results.map((r) => ({ id: r.id, kind: r.kind, label: r.label, url: r.url, issuedAt: r.issued_at }));
}

/** Dokumenti se dodaju dok verifikacija nije poslana na pregled ili odlučena (nema reda, `requested`, `rejected`). */
export const smijeDodatiDokument = (v: VerifikacijaNamjene | null): boolean => !v || v.status === "requested" || v.status === "rejected" || v.status === "expired";

export type GreskeDokumenta = Partial<Record<"kind" | "label" | "file", "obavezno" | "nevaljano" | "predugo" | "prevelika" | "zakljucano">>;

/**
 * Dokaz namjene (mock bez R2, odluka 15): zapisuje metapodatke datoteke u `files` (`purpose_evidence`,
 * ključ `mock/…`) i red u `campaign_documents` s `url = r2:{ključ}`. Sadržaj datoteke se ne sprema.
 */
export async function dodajDokument(
  db: D1Database,
  campaignId: string,
  userId: string,
  u: { kind: string; label: string; datoteka: { name: string; size: number; type: string } | null },
  sad: number,
): Promise<{ ok: true } | { ok: false; greske: GreskeDokumenta }> {
  const g: GreskeDokumenta = {};
  if (!smijeDodatiDokument(await verifikacijaNamjene(db, campaignId))) return { ok: false, greske: { file: "zakljucano" } };
  const label = u.label.trim();
  if (!jedanOd(u.kind, VRSTE_DOKUMENATA)) g.kind = "nevaljano";
  if (!label) g.label = "obavezno";
  else if (label.length > 120) g.label = "predugo";
  const d = u.datoteka;
  if (!d || d.size <= 0) g.file = "obavezno";
  else if (!jedanOd(d.type, MIME_DOKAZA)) g.file = "nevaljano";
  else if (d.size > NAJVECA_DATOTEKA) g.file = "prevelika";
  if (Object.keys(g).length > 0 || !d) return { ok: false, greske: g };
  const fileId = uuid7(sad);
  const ime = d.name.normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(-80) || "datoteka";
  const kljuc = `mock/purpose_evidence/${campaignId}/${fileId}/${ime}`;
  await db
    .prepare("INSERT INTO files (id, r2_key, purpose, mime, size_bytes, uploaded_by, created_at) VALUES (?, ?, 'purpose_evidence', ?, ?, ?, ?)")
    .bind(fileId, kljuc, d.type, d.size, userId, sad)
    .run();
  await db
    .prepare("INSERT INTO campaign_documents (id, campaign_id, kind, label, url, issued_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(uuid7(sad), campaignId, u.kind, label, `r2:${kljuc}`, sad)
    .run();
  return { ok: true };
}

/**
 * „Pošalji na pregled”: `requested`/`rejected`/`expired` → `submitted`; bez reda organizator sam pokreće
 * verifikaciju (`trigger = user`, `provider = platform`). Traži barem jedan dokument. Vraća razlog odbijanja.
 */
export async function posaljiNaPregled(db: D1Database, campaignId: string, sad: number): Promise<"ok" | "nema_dokumenata" | "stanje"> {
  const v = await verifikacijaNamjene(db, campaignId);
  if (!smijeDodatiDokument(v)) return "stanje";
  const n = await db.prepare("SELECT count(*) AS n FROM campaign_documents WHERE campaign_id = ?").bind(campaignId).first<{ n: number }>();
  if (!n?.n) return "nema_dokumenata";
  if (v) {
    await db.prepare("UPDATE verifications SET status = 'submitted', decided_at = NULL, reason = NULL WHERE id = ?").bind(v.id).run();
  } else {
    await db
      .prepare(
        `INSERT INTO verifications (id, kind, subject_type, subject_id, status, provider, trigger, requested_at, due_at)
         VALUES (?, 'campaign_purpose', 'campaign', ?, 'submitted', 'platform', 'user', ?, NULL)`,
      )
      .bind(uuid7(sad), campaignId, sad)
      .run();
  }
  return "ok";
}

// --- Kamo ide novac (`campaign.manage.money`) -------------------------------------------------------------

export interface NovacUpravljanja {
  safe: {
    address: string;
    chainId: number;
    threshold: number;
    owners: string[];
    platformSignerCount: number;
    deployedAt: number | null;
    verifiedAt: number | null;
  } | null;
  /** Safe iz postavki organizacije kad kampanja još nema svoj red (npr. nacrt). */
  safeOrganizacije: { address: string; chainId: number } | null;
  mode: "integrated" | "byo";
  kybOdobren: boolean;
  prikupljenoCents: number;
}

export async function novacKampanje(db: D1Database, campaignId: string): Promise<NovacUpravljanja | null> {
  const r = await db
    .prepare(
      `SELECT c.mode, f.address, f.chain_id, f.threshold, f.owners, f.platform_signer_count, f.deployed_at, f.verified_at,
              o.safe_address, o.safe_chain_id, ${ORG_VERIFICIRANA} AS kyb,
              (SELECT COALESCE(SUM(d.amount_received_cents), 0) FROM contributions d WHERE d.campaign_id = c.id AND d.state = 'paid') AS prikupljeno
         FROM campaigns c LEFT JOIN campaign_safes f ON f.campaign_id = c.id
         LEFT JOIN organizations o ON o.organizer_id = c.organizer_id AND o.deleted_at IS NULL
        WHERE c.id = ? AND c.deleted_at IS NULL`,
    )
    .bind(campaignId)
    .first<{
      mode: "integrated" | "byo"; address: string | null; chain_id: number | null; threshold: number | null; owners: string | null;
      platform_signer_count: number | null; deployed_at: number | null; verified_at: number | null; safe_address: string | null;
      safe_chain_id: number | null; kyb: number; prikupljeno: number;
    }>();
  if (!r) return null;
  return {
    safe: r.address && r.chain_id !== null
      ? {
          address: r.address, chainId: r.chain_id, threshold: r.threshold ?? 0, owners: JSON.parse(r.owners ?? "[]") as string[],
          platformSignerCount: r.platform_signer_count ?? 0, deployedAt: r.deployed_at, verifiedAt: r.verified_at,
        }
      : null,
    safeOrganizacije: r.safe_address && r.safe_chain_id !== null ? { address: r.safe_address, chainId: r.safe_chain_id } : null,
    mode: r.mode,
    kybOdobren: r.kyb === 1,
    prikupljenoCents: r.prikupljeno,
  };
}

/** Preglednik blokova po mreži Safea (Gnosis i Chiado, `safe_chain_id`). */
export const EXPLORER: Record<number, { ime: string; adresa: string }> = {
  100: { ime: "Gnosis", adresa: "https://gnosisscan.io/address/" },
  10200: { ime: "Chiado", adresa: "https://gnosis-chiado.blockscout.com/address/" },
};
