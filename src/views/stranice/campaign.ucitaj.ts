/**
 * Stranica kampanje `/hr/{id}` (ekran 22, docs/08 §5.1). Kampanja koja nije javno vidljiva → 404,
 * ID velikim slovima → 301 na mala. `?contributions=latest|highest` i `?contributions_page=N` (popis uplata bez JS-a),
 * POST „Prati” → 303 `?prati=s6#prati` (spremanje praćenja je S6, ništa se ne zapisuje).
 */
import { komentariKampanje, novostiKampanje, uplateKampanje, type KomentariKampanje, type Novost, type StranicaKampanje, type UplateKampanje } from "../../lib/db/kampanja";
import { kasiceKampanje, type Kasica } from "../../lib/db/kasice";
import { url } from "../../lib/rute";
import { stranicaIz } from "../../lib/db/zajednicko";
import { apsolutno, ucitajKampanju } from "../../components/kampanja/ucitavanje";
import type { Ucitaj } from "../tipovi";

/** Uplata po stranici popisa; „Prikaži još” dodaje sljedećih toliko (docs/08 §3.2: 10). */
export const UPLATA_PO_STRANICI = 10;

export interface Ponuda {
  id: string;
  title: string;
  description: string | null;
  mode: "buy_now" | "auction";
  priceCents: number;
  quantity: number;
  delivery: string;
  endsAt: number | null;
}

export interface PodaciKampanje {
  k: StranicaKampanje;
  novosti: Novost[];
  kasice: Kasica[];
  uplate: UplateKampanje;
  stranicaUplata: number;
  josUplata: boolean;
  komentari: KomentariKampanje;
  ponude: Ponuda[];
  adresa: string;
  pracenjePoslano: boolean;
}

/**
 * Aktivne ponude kampanje. Podatkovni sloj (`src/lib/db`) još nema funkciju za to, pa je upit ovdje;
 * prodavatelj se ne čita (osobni podatak, ponude su faza 2).
 */
async function ponudeKampanje(db: D1Database, campaignId: string): Promise<Ponuda[]> {
  const { results } = await db
    .prepare(
      `SELECT id, title, description, mode, price_cents, quantity, delivery, ends_at
         FROM offers WHERE campaign_id = ? AND status = 'active' ORDER BY created_at DESC, id LIMIT 12`,
    )
    .bind(campaignId)
    .all<{ id: string; title: string; description: string | null; mode: Ponuda["mode"]; price_cents: number; quantity: number; delivery: string; ends_at: number | null }>();
  return results.map((r) => ({
    id: r.id, title: r.title, description: r.description, mode: r.mode, priceCents: r.price_cents,
    quantity: r.quantity, delivery: r.delivery, endsAt: r.ends_at,
  }));
}

export const ucitaj: Ucitaj<PodaciKampanje> = async (ctx) => {
  const k = await ucitajKampanju(ctx, "campaign");
  if (k instanceof Response) return k;
  const put = url(ctx.lang, "campaign", { id: k.publicId });

  if (ctx.request.method === "POST") {
    // Jedina radnja u S5 je „Prati”; e-pošta se ne sprema dok ne postoji potvrda praćenja (S6).
    return new Response(null, { status: 303, headers: { Location: `${put}?prati=s6#prati` } });
  }

  const q = ctx.url.searchParams;
  const sort = q.get("contributions");
  const stranicaUplata = Math.min(stranicaIz(q.get("contributions_page")), 9);
  const limit = UPLATA_PO_STRANICI * stranicaUplata;
  const [novosti, kasice, uplateSve, komentari, ponude] = await Promise.all([
    novostiKampanje(ctx.db, k.id),
    k.postavke.kasiceDopustene ? kasiceKampanje(ctx.db, k.id) : Promise.resolve([]),
    uplateKampanje(ctx.db, k.id, { sort: sort === "highest" || sort === "latest" ? sort : undefined, limit: limit + 1 }),
    komentariKampanje(ctx.db, k.id),
    k.brojevi.ponude > 0 ? ponudeKampanje(ctx.db, k.id) : Promise.resolve([]),
  ]);
  const josUplata = uplateSve.uplate.length > limit;
  const uplate = { ...uplateSve, uplate: uplateSve.uplate.slice(0, limit) };

  return {
    podaci: {
      k,
      novosti,
      kasice,
      uplate,
      stranicaUplata,
      josUplata,
      komentari,
      ponude,
      adresa: apsolutno(ctx, put),
      pracenjePoslano: q.get("prati") === "s6",
    },
  };
};
