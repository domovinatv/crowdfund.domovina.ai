/**
 * Ponude i aukcije (faza 2, odluka 8): katalog `/hr/ponude`, stranica ponude `/hr/ponude/{offer}`, sekcija `#ponude`
 * na stranici kampanje i obrazac `/hr/ponude/nova`. Kupnje i licitiranja nema (fiskalizacija, DAC7): obrazac sprema
 * samo NACRT (`status = 'draft'`), a `offer_bids` puni seed. Prodavatelj i licitanti se ne čitaju po imenu (osobni
 * podaci); javno je samo je li ponuda organizatorova ili Founder's Offer.
 *
 * Ponuda je javna kad je `active`, `sold` ili `ended`, a kampanja je vidljiva (`VIDLJIVA`) i dopušta ponude
 * (`campaign_settings.allow_external_offers`, ista zastavica kao u `campaign.edit`). U katalogu su samo aktivne
 * ponude kampanja iz kataloga kampanja (`U_KATALOGU`).
 */
import { PO_STRANICI, U_KATALOGU, VIDLJIVA, stranicaIz, uuid7 } from "./zajednicko";

/** Kategorije ponude (migracija 0009, javni pregled §8.3); redoslijed je redoslijed u obrascu i filtru. */
export const KATEGORIJE_PONUDA = [
  "kids", "fashion", "books", "art", "home", "tickets", "autographs", "sport", "electronics", "experiences", "thanks", "other",
] as const;
export type KategorijaPonude = (typeof KATEGORIJE_PONUDA)[number];
export const NACINI_PONUDE = ["buy_now", "auction"] as const;
export type NacinPonude = (typeof NACINI_PONUDE)[number];
export const DOSTAVE = ["in_person", "post", "email"] as const;
export type Dostava = (typeof DOSTAVE)[number];
export type StanjePredmeta = "new" | "used";
export type StatusPonude = "draft" | "active" | "sold" | "ended" | "cancelled";

/** Granice obrasca (najmanji iznos 1 € je i CHECK u 0002). */
export const GRANICE_PONUDE = {
  naslov: { min: 3, max: 120 },
  opis: { min: 20, max: 2000 },
  cijenaCenti: { min: 100, max: 10_000_000 },
  kolicina: { min: 1, max: 999 },
  trajanjeDana: { min: 1, max: 60 },
} as const;

export interface Ponuda {
  id: string;
  title: string;
  description: string | null;
  mode: NacinPonude;
  priceCents: number;
  quantity: number;
  delivery: Dostava;
  endsAt: number | null;
  category: KategorijaPonude | null;
  condition: StanjePredmeta | null;
  status: StatusPonude;
  /** Founder's Offer: nudi podržavatelj, a ne organizator (organizator je prihvatio). */
  founder: boolean;
  /** Najviša licitacija (aukcija), null bez licitacija. */
  topBidCents: number | null;
  bids: number;
}

export interface KarticaPonude extends Ponuda {
  campaign: { publicId: string; title: string };
}

export interface Licitacija {
  /** Redni broj licitanta u ovoj aukciji (1 = prvi koji je licitirao); ime se ne prikazuje. */
  licitant: number;
  amountCents: number;
  createdAt: number;
}

export interface DetaljPonude extends KarticaPonude {
  createdAt: number;
  licitacije: Licitacija[];
  campaign: KarticaPonude["campaign"] & { organizerName: string; currency: string };
}

interface RedakPonude {
  id: string;
  title: string;
  description: string | null;
  mode: NacinPonude;
  price_cents: number;
  quantity: number;
  delivery: Dostava;
  ends_at: number | null;
  category: KategorijaPonude | null;
  item_condition: StanjePredmeta | null;
  status: StatusPonude;
  is_founder: number;
  top_bid: number | null;
  n_bids: number;
}

const STUPCI = `o.id, o.title, o.description, o.mode, o.price_cents, o.quantity, o.delivery, o.ends_at, o.category,
  o.item_condition, o.status, o.is_founder,
  (SELECT max(b.amount_cents) FROM offer_bids b WHERE b.offer_id = o.id) AS top_bid,
  (SELECT count(*) FROM offer_bids b WHERE b.offer_id = o.id) AS n_bids`;

/** Javna ponuda: nije nacrt ni otkazana, Founder's Offer samo prihvaćen. */
const JAVNA_PONUDA = `o.status IN ('active','sold','ended') AND (o.is_founder = 0 OR o.founder_status = 'accepted')`;

const uPonudu = (r: RedakPonude): Ponuda => ({
  id: r.id, title: r.title, description: r.description, mode: r.mode, priceCents: r.price_cents, quantity: r.quantity,
  delivery: r.delivery, endsAt: r.ends_at, category: r.category, condition: r.item_condition, status: r.status,
  founder: r.is_founder === 1, topBidCents: r.top_bid, bids: r.n_bids,
});

/** Aktivne ponude kampanje (sekcija `#ponude`), od najnovije, najviše 12. */
export async function ponudeKampanje(db: D1Database, campaignId: string): Promise<Ponuda[]> {
  const { results } = await db
    .prepare(
      `SELECT ${STUPCI} FROM offers o
        WHERE o.campaign_id = ? AND o.status = 'active' AND (o.is_founder = 0 OR o.founder_status = 'accepted')
        ORDER BY o.created_at DESC, o.id LIMIT 12`,
    )
    .bind(campaignId)
    .all<RedakPonude>();
  return results.map(uPonudu);
}

export interface FiltriPonuda {
  mode?: string | null;
  category?: string | null;
  page?: number | string | null;
}

export interface KatalogPonuda {
  kartice: KarticaPonude[];
  mode: NacinPonude | null;
  category: KategorijaPonude | null;
  ukupno: number;
  stranica: number;
  ukupnoStranica: number;
}

const jeNacin = (x: unknown): x is NacinPonude => NACINI_PONUDE.includes(x as NacinPonude);
const jeKategorija = (x: unknown): x is KategorijaPonude => KATEGORIJE_PONUDA.includes(x as KategorijaPonude);

/**
 * Katalog `/hr/ponude`: aktivne javne ponude kampanja iz kataloga koje dopuštaju ponude; filtar vrste (kupnja /
 * aukcija) i kategorije; od najnovije. Nepoznat filtar znači „sve” (kao katalog kampanja).
 */
export async function katalogPonuda(db: D1Database, f: FiltriPonuda = {}): Promise<KatalogPonuda> {
  const mode = jeNacin(f.mode) ? f.mode : null;
  const category = jeKategorija(f.category) ? f.category : null;
  const stranica = stranicaIz(f.page);
  const uvjeti = [`o.status = 'active'`, `(o.is_founder = 0 OR o.founder_status = 'accepted')`, U_KATALOGU, "s.allow_external_offers = 1"];
  const p: string[] = [];
  if (mode) uvjeti.push("o.mode = ?"), p.push(mode);
  if (category) uvjeti.push("o.category = ?"), p.push(category);
  const od = `FROM offers o JOIN campaigns c ON c.id = o.campaign_id JOIN campaign_settings s ON s.campaign_id = c.id
    WHERE ${uvjeti.join(" AND ")}`;
  const n = await db.prepare(`SELECT count(*) AS n ${od}`).bind(...p).first<{ n: number }>();
  const ukupno = n?.n ?? 0;
  const { results } = await db
    .prepare(`SELECT ${STUPCI}, s.public_id, c.title AS campaign_title ${od} ORDER BY o.created_at DESC, o.id LIMIT ? OFFSET ?`)
    .bind(...p, PO_STRANICI, (stranica - 1) * PO_STRANICI)
    .all<RedakPonude & { public_id: string; campaign_title: string }>();
  return {
    kartice: results.map((r) => ({ ...uPonudu(r), campaign: { publicId: r.public_id, title: r.campaign_title } })),
    mode, category, ukupno, stranica, ukupnoStranica: Math.max(1, Math.ceil(ukupno / PO_STRANICI)),
  };
}

/** Stranica ponude: javna ponuda na vidljivoj kampanji koja dopušta ponude, s licitacijama (bez imena); inače null. */
export async function ponudaPoId(db: D1Database, id: string): Promise<DetaljPonude | null> {
  const r = await db
    .prepare(
      `SELECT ${STUPCI}, o.created_at, s.public_id, c.title AS campaign_title, c.currency, g.legal_name AS organizer_name
         FROM offers o JOIN campaigns c ON c.id = o.campaign_id JOIN campaign_settings s ON s.campaign_id = c.id
         JOIN organizers g ON g.id = c.organizer_id
        WHERE o.id = ? AND ${JAVNA_PONUDA} AND ${VIDLJIVA} AND s.allow_external_offers = 1`,
    )
    .bind(id)
    .first<RedakPonude & { created_at: number; public_id: string; campaign_title: string; currency: string; organizer_name: string }>();
  if (!r) return null;
  const { results } = await db
    .prepare("SELECT user_id, amount_cents, created_at FROM offer_bids WHERE offer_id = ? ORDER BY created_at, id")
    .bind(id)
    .all<{ user_id: string; amount_cents: number; created_at: number }>();
  const redni = new Map<string, number>();
  for (const b of results) if (!redni.has(b.user_id)) redni.set(b.user_id, redni.size + 1);
  return {
    ...uPonudu(r),
    createdAt: r.created_at,
    campaign: { publicId: r.public_id, title: r.campaign_title, organizerName: r.organizer_name, currency: r.currency },
    licitacije: results
      .map((b) => ({ licitant: redni.get(b.user_id)!, amountCents: b.amount_cents, createdAt: b.created_at }))
      .reverse(),
  };
}

// --- Obrazac nove ponude (P) ---------------------------------------------------------------------------------------

export interface KampanjaZaPonudu {
  publicId: string;
  title: string;
  /** Korisnik je član organizacije kampanje (urednik ili više): ponuda organizatora, ne Founder's Offer. */
  vlastita: boolean;
}

/**
 * Kampanje kojima korisnik smije dodati ponudu: aktivne kampanje njegovih organizacija (uloga ≥ editor) i aktivne
 * kampanje drugih iz kataloga koje dopuštaju tuđe ponude (obilazak 23, „Fundraisers from other organisers”).
 */
export async function kampanjeZaPonudu(db: D1Database, userId: string): Promise<KampanjaZaPonudu[]> {
  const { results } = await db
    .prepare(
      `SELECT s.public_id, c.title,
              EXISTS (SELECT 1 FROM memberships m JOIN organizations og ON og.id = m.organization_id
                       WHERE og.organizer_id = c.organizer_id AND m.user_id = ?1 AND m.role IN ('editor','admin','owner')) AS vlastita
         FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE c.state = 'active' AND c.deleted_at IS NULL AND s.blocked_at IS NULL
          AND (EXISTS (SELECT 1 FROM memberships m JOIN organizations og ON og.id = m.organization_id
                        WHERE og.organizer_id = c.organizer_id AND m.user_id = ?1 AND m.role IN ('editor','admin','owner'))
               OR (s.allow_external_offers = 1 AND ${U_KATALOGU}))
        ORDER BY vlastita DESC, c.title COLLATE NOCASE, s.public_id`,
    )
    .bind(userId)
    .all<{ public_id: string; title: string; vlastita: number }>();
  return results.map((r) => ({ publicId: r.public_id, title: r.title, vlastita: r.vlastita === 1 }));
}

export interface NacrtPonude {
  id: string;
  title: string;
  mode: NacinPonude;
  priceCents: number;
  founder: boolean;
  campaign: { publicId: string; title: string };
  createdAt: number;
}

/** Nacrti ponuda korisnika (obrazac ih nabraja ispod sebe), od najnovijeg. */
export async function mojiNacrtiPonuda(db: D1Database, userId: string): Promise<NacrtPonude[]> {
  const { results } = await db
    .prepare(
      `SELECT o.id, o.title, o.mode, o.price_cents, o.is_founder, o.created_at, s.public_id, c.title AS campaign_title
         FROM offers o JOIN campaigns c ON c.id = o.campaign_id JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE o.seller_user_id = ? AND o.status = 'draft' ORDER BY o.created_at DESC, o.id LIMIT 20`,
    )
    .bind(userId)
    .all<{ id: string; title: string; mode: NacinPonude; price_cents: number; is_founder: number; created_at: number; public_id: string; campaign_title: string }>();
  return results.map((r) => ({
    id: r.id, title: r.title, mode: r.mode, priceCents: r.price_cents, founder: r.is_founder === 1,
    campaign: { publicId: r.public_id, title: r.campaign_title }, createdAt: r.created_at,
  }));
}

export interface PoljaPonude {
  campaign: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  mode: string;
  /** Iznos u eurima kako ga je korisnik upisao (`12`, `12,50`, `12.50`). */
  price: string;
  quantity: string;
  days: string;
  delivery: string;
}

export type GreskaPolja = "obavezno" | "nevaljano" | "prekratko" | "predugo" | "premalo" | "previse" | "nedostupna" | "neverificiran";
export type GreskePonude = Partial<Record<keyof PoljaPonude, GreskaPolja>>;

/** Euri iz obrasca u cente (do 2 decimale, zarez ili točka); null kad nije iznos. */
export function centiIzEura(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/** Cijeli broj iz obrasca ili null. */
const cijeli = (s: string): number | null => (/^\d{1,4}$/.test(s.trim()) ? Number(s.trim()) : null);

/**
 * Provjera obrasca bez baze (osim kampanja koje su ponuđene i verifikacije osobe, koje dolaze kao argumenti).
 * Aukcija ima količinu 1; stanje predmeta je neobavezno.
 */
export function provjeriPonudu(
  f: PoljaPonude,
  kampanje: KampanjaZaPonudu[],
  osobaVerificirana: boolean,
): { greske: GreskePonude; kampanja: KampanjaZaPonudu | null; cijenaCenti: number | null; kolicina: number | null; dana: number | null } {
  const G = GRANICE_PONUDE;
  const g: GreskePonude = {};
  const kampanja = kampanje.find((k) => k.publicId === f.campaign.trim()) ?? null;
  if (!f.campaign.trim()) g.campaign = "obavezno";
  else if (!kampanja) g.campaign = "nedostupna";
  else if (!kampanja.vlastita && !osobaVerificirana) g.campaign = "neverificiran";
  const naslov = f.title.trim();
  if (!naslov) g.title = "obavezno";
  else if (naslov.length < G.naslov.min) g.title = "prekratko";
  else if (naslov.length > G.naslov.max) g.title = "predugo";
  const opis = f.description.trim();
  if (!opis) g.description = "obavezno";
  else if (opis.length < G.opis.min) g.description = "prekratko";
  else if (opis.length > G.opis.max) g.description = "predugo";
  if (!f.category) g.category = "obavezno";
  else if (!jeKategorija(f.category)) g.category = "nevaljano";
  if (f.condition && f.condition !== "new" && f.condition !== "used") g.condition = "nevaljano";
  if (!f.mode) g.mode = "obavezno";
  else if (!jeNacin(f.mode)) g.mode = "nevaljano";
  const cijenaCenti = centiIzEura(f.price);
  if (!f.price.trim()) g.price = "obavezno";
  else if (cijenaCenti === null) g.price = "nevaljano";
  else if (cijenaCenti < G.cijenaCenti.min) g.price = "premalo";
  else if (cijenaCenti > G.cijenaCenti.max) g.price = "previse";
  let kolicina = f.mode === "auction" ? 1 : cijeli(f.quantity || "1");
  if (kolicina === null) g.quantity = "nevaljano";
  else if (kolicina < G.kolicina.min) g.quantity = "premalo";
  else if (kolicina > G.kolicina.max) g.quantity = "previse";
  if (g.quantity) kolicina = null;
  const dana = cijeli(f.days);
  if (!f.days.trim()) g.days = "obavezno";
  else if (dana === null) g.days = "nevaljano";
  else if (dana < G.trajanjeDana.min) g.days = "premalo";
  else if (dana > G.trajanjeDana.max) g.days = "previse";
  if (!f.delivery) g.delivery = "obavezno";
  else if (!DOSTAVE.includes(f.delivery as Dostava)) g.delivery = "nevaljano";
  return { greske: g, kampanja, cijenaCenti, kolicina, dana };
}

/**
 * Spremi NACRT ponude (faza 2: ne objavljuje se). Ponuda na tuđoj kampanji je Founder's Offer (`is_founder = 1`,
 * `founder_status = 'pending'`) i traži verificiranu osobu. Vraća id nacrta ili greške.
 */
export async function spremiNacrtPonude(
  db: D1Database,
  userId: string,
  f: PoljaPonude,
  osobaVerificirana: boolean,
  sad: number,
): Promise<{ ok: true; id: string } | { ok: false; greske: GreskePonude }> {
  const kampanje = await kampanjeZaPonudu(db, userId);
  const p = provjeriPonudu(f, kampanje, osobaVerificirana);
  if (Object.keys(p.greske).length > 0 || !p.kampanja) return { ok: false, greske: p.greske };
  const c = await db.prepare("SELECT campaign_id FROM campaign_settings WHERE public_id = ?").bind(p.kampanja.publicId).first<{ campaign_id: string }>();
  if (!c) return { ok: false, greske: { campaign: "nedostupna" } };
  const id = uuid7(sad);
  const founder = !p.kampanja.vlastita;
  await db
    .prepare(
      `INSERT INTO offers (id, campaign_id, seller_user_id, is_founder, founder_status, title, description, mode, price_cents,
         quantity, delivery, status, ends_at, created_at, updated_at, category, item_condition)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
    )
    .bind(
      id, c.campaign_id, userId, founder ? 1 : 0, founder ? "pending" : null, f.title.trim(), f.description.trim(), f.mode,
      p.cijenaCenti, p.kolicina, f.delivery, sad + p.dana! * 86_400_000, sad, sad, f.category, f.condition || null,
    )
    .run();
  return { ok: true, id };
}
