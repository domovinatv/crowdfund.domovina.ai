/**
 * Katalog kampanja, kategorije, brojači i urednički izbor naslovnice (S5, docs/07 „Javni dio”).
 * Skriveno ne izlazi iz upita (odluka 406), a redoslijed po iznosu ne smije odati skriveni iznos.
 */
import { ZADANI_REDOSLIJED, isRedoslijed, type Redoslijed } from "../redoslijedi";
import {
  DAN,
  FROM_KAMPANJE,
  JEDNAKI,
  ORG_VERIFICIRANA,
  PO_STRANICI,
  U_KATALOGU,
  VIDLJIVA,
  kartice,
  sadrzi,
  stranicaIz,
  type PunaKartica,
} from "./zajednicko";

export const VRSTE = ["one_time", "recurring", "for_organization"] as const;
export type Vrsta = (typeof VRSTE)[number];

/** Filtri kataloga; ključevi su ključevi URL-a (odluka 303). */
export interface FiltriKataloga {
  q?: string | null;
  category?: string | null;
  type?: string | null;
  verified?: boolean;
  moneyboxes?: boolean;
  ending?: boolean;
  successful?: boolean;
  near?: string | null;
  sort?: string | null;
  page?: number | string | null;
}

export interface RezultatKataloga {
  kartice: PunaKartica[];
  ukupno: number;
  /** Tražena stranica (≥ 1); može biti veća od `ukupnoStranica`, tada su kartice prazne (učitavač daje 404). */
  stranica: number;
  poStranici: number;
  /** Barem 1. */
  ukupnoStranica: number;
  /** Primijenjeni redoslijed (nevaljan → zadani). */
  sort: Redoslijed;
}

const DA = (v: string | null) => v !== null && !["0", "false", "off", "ne"].includes(v.toLowerCase());

/** Filtri iz `URLSearchParams` (boolean: prisutan i nije 0/false/off). */
export function filtriIzUrla(p: URLSearchParams): FiltriKataloga {
  return {
    q: p.get("q"),
    category: p.get("category"),
    type: p.get("type"),
    verified: DA(p.get("verified")),
    moneyboxes: DA(p.get("moneyboxes")),
    ending: DA(p.get("ending")),
    successful: DA(p.get("successful")),
    near: p.get("near"),
    sort: p.get("sort"),
    page: p.get("page"),
  };
}

/** Iznos u zadnja 24 h (redoslijed `popular`); parametar je granica u ms. */
const ZADNJA_24H = `(SELECT COALESCE(SUM(d.amount_received_cents), 0) FROM contributions d
   WHERE d.campaign_id = c.id AND d.state = 'paid' AND d.paid_at >= ?)`;
const ZADNJA_NOVOST = `(SELECT MAX(u.published_at) FROM campaign_updates u
   WHERE u.campaign_id = c.id AND u.deleted_at IS NULL AND u.tier_id IS NULL)`;
const PRIKUPLJENO = "COALESCE(st.raised_cents, 0)";
/** Iznos za poredak: skriveni su svi jednaki (0), pa ni poredak unutar skrivenih ne odaje iznos. */
const ZA_POREDAK = (izraz: string) => `CASE WHEN s.hide_raised = 1 THEN 0 ELSE ${izraz} END`;

/**
 * ORDER BY za svaki od 7 redoslijeda (odluka 501) i njegovi parametri.
 * Kampanje sa skrivenim iznosom (`hide_raised`) u `most`, `least` i `popular` idu na kraj, u redoslijedu za
 * jednake (i među sobom samo po njemu): inače bi mjesto u popisu odalo iznos koji je organizator sakrio
 * (odluka 406). `ending`: kampanje kojima je rok prošao idu na kraj zajedno s onima bez roka, po redu za jednake.
 */
function redoslijedSql(sort: Redoslijed, sad: number): { sql: string; p: unknown[] } {
  switch (sort) {
    case "most":
      return { sql: `s.hide_raised ASC, ${ZA_POREDAK(PRIKUPLJENO)} DESC, ${JEDNAKI}`, p: [] };
    case "least":
      return { sql: `s.hide_raised ASC, ${ZA_POREDAK(PRIKUPLJENO)} ASC, ${JEDNAKI}`, p: [] };
    case "popular":
      return { sql: `s.hide_raised ASC, ${ZA_POREDAK(ZADNJA_24H)} DESC, ${JEDNAKI}`, p: [sad - DAN] };
    case "newest":
      return { sql: `COALESCE(c.starts_at, c.created_at) DESC, ${JEDNAKI}`, p: [] };
    case "oldest":
      return { sql: `COALESCE(c.starts_at, c.created_at) ASC, ${JEDNAKI}`, p: [] };
    case "ending":
      return { sql: `(c.ends_at IS NULL OR c.ends_at < ?) ASC, CASE WHEN c.ends_at >= ? THEN c.ends_at END ASC, ${JEDNAKI}`, p: [sad, sad] };
    case "updated":
      return { sql: `${ZADNJA_NOVOST} IS NULL ASC, ${ZADNJA_NOVOST} DESC, ${JEDNAKI}`, p: [] };
  }
}

/** WHERE kataloga i parametri. */
function uvjetiKataloga(f: FiltriKataloga, sad: number): { sql: string; p: unknown[] } {
  const u = [U_KATALOGU];
  const p: unknown[] = [];
  const q = f.q?.trim().slice(0, 100);
  if (q) {
    // LIKE u SQLiteu ne razlikuje velika i mala slova samo za ASCII (č/Č se razlikuju; D1 nema ICU).
    u.push(`(c.title LIKE ? ESCAPE '\\' OR c.description LIKE ? ESCAPE '\\')`);
    p.push(sadrzi(q), sadrzi(q));
  }
  if (f.category) {
    u.push("s.category_key = ?");
    p.push(f.category);
  }
  if (f.type && (VRSTE as readonly string[]).includes(f.type)) {
    u.push("s.kind = ?");
    p.push(f.type);
  }
  if (f.verified) u.push(`${ORG_VERIFICIRANA} = 1`);
  if (f.moneyboxes) {
    u.push(`s.allow_moneyboxes = 1 AND EXISTS (SELECT 1 FROM moneyboxes m WHERE m.campaign_id = c.id AND m.status = 'active')`);
  }
  if (f.ending) {
    u.push("c.ends_at >= ? AND c.ends_at <= ?");
    p.push(sad, sad + 7 * DAN);
  }
  // Uspješna = prikupljeno ≥ cilj. Skriveni iznos se isključuje, inače bi filtar odao odnos iznosa i cilja.
  if (f.successful) u.push(`s.hide_raised = 0 AND c.goal_cents IS NOT NULL AND ${PRIKUPLJENO} >= c.goal_cents`);
  const near = f.near?.trim().slice(0, 100);
  if (near) {
    // Shema ima lat/lng, ali ih seed ne puni; „u blizini” je zato tekstualno: mjesto kampanje ili grad organizatora.
    u.push(`(c.location_name LIKE ? ESCAPE '\\' OR g.city LIKE ? ESCAPE '\\')`);
    p.push(sadrzi(near), sadrzi(near));
  }
  return { sql: u.join("\n   AND "), p };
}

/**
 * Katalog `/hr/kampanje`: samo aktivne, javne, neblokirane i neisključene kampanje (kao `aktivneKampanje`);
 * isključena (`paused_at`) je dostupna poveznicom, ali ne ulazi u katalog jer ne prima uplate.
 */
export async function katalog(db: D1Database, filtri: FiltriKataloga = {}, sad: Date = new Date()): Promise<RezultatKataloga> {
  const sort: Redoslijed = isRedoslijed(filtri.sort) ? filtri.sort : ZADANI_REDOSLIJED;
  const stranica = stranicaIz(filtri.page);
  const t = sad.getTime();
  const w = uvjetiKataloga(filtri, t);
  const broj = await db
    .prepare(`SELECT count(*) AS n ${FROM_KAMPANJE}\n WHERE ${w.sql}`)
    .bind(...w.p)
    .first<{ n: number }>();
  const ukupno = broj?.n ?? 0;
  const r = redoslijedSql(sort, t);
  const lista = ukupno === 0 ? [] : await kartice(db, w.sql, [...w.p, ...r.p], r.sql, sad, PO_STRANICI, (stranica - 1) * PO_STRANICI);
  return { kartice: lista, ukupno, stranica, poStranici: PO_STRANICI, ukupnoStranica: Math.max(1, Math.ceil(ukupno / PO_STRANICI)), sort };
}

export interface Kategorija {
  key: string;
  sort: number;
  nameHr: string;
  nameEn: string;
  /** Broj kampanja u katalogu (aktivne, javne, neisključene). */
  brojAktivnih: number;
}

export async function kategorije(db: D1Database): Promise<Kategorija[]> {
  const { results } = await db
    .prepare(
      `SELECT k.key, k.sort, k.name_hr, k.name_en,
              (SELECT count(*) FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
                WHERE s.category_key = k.key AND ${U_KATALOGU}) AS n
         FROM categories k ORDER BY k.sort`,
    )
    .all<{ key: string; sort: number; name_hr: string; name_en: string; n: number }>();
  return results.map((r) => ({ key: r.key, sort: r.sort, nameHr: r.name_hr, nameEn: r.name_en, brojAktivnih: r.n }));
}

export interface BrojaciNaslovnice {
  /** Kampanje u katalogu. */
  aktivnihKampanja: number;
  /** Plaćeni doprinosi na javno vidljivim kampanjama (uključuje i one sa skrivenim brojem: zbroj ne otkriva pojedinu). */
  placenihDoprinosa: number;
  /** Zbroj prikupljenog na javno vidljivim kampanjama BEZ skrivenog iznosa (hide_raised se ne zbraja). */
  prikupljenoCents: number;
  /** Plaćeni doprinosi u zadnjih 30 dana (po `paid_at`). */
  doprinosaZadnjih30Dana: number;
}

export async function brojaciNaslovnice(db: D1Database, sad: Date = new Date()): Promise<BrojaciNaslovnice> {
  const r = await db
    .prepare(
      `SELECT
         (SELECT count(*) FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id WHERE ${U_KATALOGU}) AS aktivnih,
         (SELECT count(*) FROM contributions d JOIN campaigns c ON c.id = d.campaign_id
            JOIN campaign_settings s ON s.campaign_id = c.id WHERE d.state = 'paid' AND ${VIDLJIVA}) AS placenih,
         (SELECT COALESCE(SUM(st.raised_cents), 0) FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
            JOIN campaign_stats st ON st.campaign_id = c.id WHERE s.hide_raised = 0 AND ${VIDLJIVA}) AS prikupljeno,
         (SELECT count(*) FROM contributions d JOIN campaigns c ON c.id = d.campaign_id
            JOIN campaign_settings s ON s.campaign_id = c.id
           WHERE d.state = 'paid' AND d.paid_at >= ? AND ${VIDLJIVA}) AS zadnjih30`,
    )
    .bind(sad.getTime() - 30 * DAN)
    .first<{ aktivnih: number; placenih: number; prikupljeno: number; zadnjih30: number }>();
  return {
    aktivnihKampanja: r?.aktivnih ?? 0,
    placenihDoprinosa: r?.placenih ?? 0,
    prikupljenoCents: r?.prikupljeno ?? 0,
    doprinosaZadnjih30Dana: r?.zadnjih30 ?? 0,
  };
}

/**
 * Urednički izbor naslovnice. Shema nema stupac „istaknuto”, pa vrijedi pravilo: kampanja je u katalogu,
 * organizacija je verificirana, opis nije prazan; redom po prikupljenom (skriveni iznos na kraju).
 */
export async function urednickiIzbor(db: D1Database, n = 6, sad: Date = new Date()): Promise<PunaKartica[]> {
  return kartice(
    db,
    `${U_KATALOGU} AND ${ORG_VERIFICIRANA} = 1 AND length(trim(COALESCE(c.description, ''))) > 0`,
    [],
    `s.hide_raised ASC, ${ZA_POREDAK(PRIKUPLJENO)} DESC, ${JEDNAKI}`,
    sad,
    n,
  );
}
