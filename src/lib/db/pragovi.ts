/**
 * Pragovi verifikacije namjene (odluka 18, docs/04 §3, docs/05 §Verifikacija): cilj kampanje ≥ 5.000 € ili
 * zbroj ciljeva aktivnih kampanja organizatora ≥ 12.500 € → `verifications(campaign_purpose, requested)` s rokom
 * od 14 dana za dokaze. Zastava i ručni pregled, ne blokada: kampanja se objavljuje svejedno.
 *
 * `pragVerifikacije` je čista funkcija (čitaju je objava, upravljanje kampanjom i moderacija); `zbrojAktivnihCiljeva`
 * i `stanjePraga` su upiti nad D1.
 */
import { DAN } from "./zajednicko";

/** 5.000 € u centima: prag jedne kampanje. */
export const PRAG_KAMPANJE = 500_000;
/** 12.500 € u centima: prag zbroja ciljeva aktivnih kampanja organizatora. */
export const PRAG_ORGANIZATORA = 1_250_000;
/** Rok za dokumente namjene (`verifications.due_at`). */
export const ROK_DOKAZA = 14 * DAN;

export type OkidacPraga = "threshold_campaign" | "threshold_organizer";

/**
 * Koji prag kampanja prelazi, ili null. `ciljCenti` je cilj te kampanje (mjesečna bez cilja = null),
 * `zbrojOstalihCenti` zbroj ciljeva ostalih aktivnih kampanja istog organizatora (bez nje).
 * Prag kampanje ima prednost jer je uži razlog.
 */
export function pragVerifikacije(ciljCenti: number | null, zbrojOstalihCenti: number): OkidacPraga | null {
  const cilj = ciljCenti !== null && Number.isFinite(ciljCenti) && ciljCenti > 0 ? ciljCenti : 0;
  if (cilj >= PRAG_KAMPANJE) return "threshold_campaign";
  if (cilj + Math.max(0, zbrojOstalihCenti) >= PRAG_ORGANIZATORA) return "threshold_organizer";
  return null;
}

/** Zbroj `goal_cents` aktivnih (neobrisanih) kampanja organizatora, po želji bez jedne kampanje. */
export async function zbrojAktivnihCiljeva(db: D1Database, organizerId: string, osim: string | null = null): Promise<number> {
  const r = await db
    .prepare(
      `SELECT COALESCE(SUM(goal_cents), 0) AS zbroj FROM campaigns
        WHERE organizer_id = ? AND state = 'active' AND deleted_at IS NULL AND id IS NOT ?`,
    )
    .bind(organizerId, osim)
    .first<{ zbroj: number }>();
  return Number(r?.zbroj ?? 0);
}

export type StanjeDokaza = "nije_potrebno" | "requested" | "submitted" | "in_review" | "approved" | "rejected" | "expired";

export interface StanjePraga {
  /** Prag koji kampanja danas prelazi (null = ne prelazi). */
  prag: OkidacPraga | null;
  /** Zadnja `campaign_purpose` verifikacija ili „nije_potrebno” kad je nema. */
  stanje: StanjeDokaza;
  /** Okidač zapisan na verifikaciji (može se razlikovati od današnjeg praga). */
  okidac: string | null;
  dueAt: number | null;
  /** Rok je prošao, a dokazi nisu poslani. */
  kasni: boolean;
}

/** Stanje praga i dokaza namjene jedne kampanje (`campaigns.id`). null kad kampanje nema. */
export async function stanjePraga(db: D1Database, campaignId: string, sad: number = Date.now()): Promise<StanjePraga | null> {
  const k = await db
    .prepare("SELECT organizer_id, goal_cents FROM campaigns WHERE id = ?")
    .bind(campaignId)
    .first<{ organizer_id: string; goal_cents: number | null }>();
  if (!k) return null;
  const ostali = await zbrojAktivnihCiljeva(db, k.organizer_id, campaignId);
  const v = await db
    .prepare(
      `SELECT status, trigger, due_at FROM verifications
        WHERE kind = 'campaign_purpose' AND subject_type = 'campaign' AND subject_id = ?
        ORDER BY requested_at DESC LIMIT 1`,
    )
    .bind(campaignId)
    .first<{ status: Exclude<StanjeDokaza, "nije_potrebno">; trigger: string | null; due_at: number | null }>();
  return {
    prag: pragVerifikacije(k.goal_cents, ostali),
    stanje: v?.status ?? "nije_potrebno",
    okidac: v?.trigger ?? null,
    dueAt: v?.due_at ?? null,
    kasni: v?.status === "requested" && v.due_at !== null && v.due_at < sad,
  };
}
