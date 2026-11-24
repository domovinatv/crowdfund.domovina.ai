/**
 * Linkovi za praćenje `/hr/postavke/linkovi` (P, ekran 16): moji `tracking_links` sa statistikom (posjeti,
 * plaćeni doprinosi), novi link za javno vidljivu kampanju (`/z/{slug}`), uključi / isključi vlastiti link.
 */
import { natrag, okIz, poljaObrasca, prijavljeni } from "../../components/postavke/ucitavanje";
import { mojiLinkovi, statusLinka, stvoriLink, type MojLink } from "../../lib/db/postavke";
import type { Ucitaj } from "../tipovi";

export interface PodaciLinkova {
  linkovi: MojLink[];
  vrijednosti: Record<string, string>;
  greske: Record<string, string>;
  ok: string | null;
}

export const ucitaj: Ucitaj<PodaciLinkova> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  const sad = Date.now();
  if (ctx.request.method === "POST") {
    const f = await poljaObrasca(ctx.request);
    if (f.akcija === "iskljuci" || f.akcija === "ukljuci") {
      await statusLinka(ctx.db, k.id, f.id ?? "", f.akcija === "iskljuci" ? "disabled" : "active");
      return natrag(ctx, "settings.links");
    }
    const r = await stvoriLink(ctx.db, k.id, f, sad);
    if ("id" in r) return natrag(ctx, "settings.links", "stvoren");
    return { podaci: { linkovi: await mojiLinkovi(ctx.db, k.id), vrijednosti: f, greske: r.greske, ok: null } };
  }
  const kampanja = ctx.url.searchParams.get("kampanja") ?? "";
  return { podaci: { linkovi: await mojiLinkovi(ctx.db, k.id), vrijednosti: { campaign: kampanja }, greske: {}, ok: okIz(ctx) } };
};
