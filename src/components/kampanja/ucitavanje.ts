/**
 * Zajedničko učitavanje kampanje za `campaign` i njezine podrute (`qr`, `plakat`, `widget`, `podrzi`).
 * ID se čita bez obzira na veličinu slova; ne-kanonski oblik → 301 na mala slova (isti upit),
 * nevaljan oblik ili kampanja koja nije javno vidljiva → 404 (docs/07 „Razine pristupa”).
 */
import { kampanjaPoJavnomId, type StranicaKampanje } from "../../lib/db/kampanja";
import { url, type KljucRute } from "../../lib/rute";
import type { KontekstStranice } from "../../views/tipovi";
import { nijePronadeno } from "../../views/tipovi";
import { kanonskiJavniId } from "./format";

export async function ucitajKampanju(ctx: KontekstStranice, kljuc: KljucRute): Promise<Response | StranicaKampanje> {
  const { id, preusmjeri } = kanonskiJavniId(ctx.params.id ?? "");
  if (!id) return nijePronadeno();
  const k = await kampanjaPoJavnomId(ctx.db, id);
  if (!k) return nijePronadeno();
  if (preusmjeri) {
    return new Response(null, { status: 301, headers: { Location: url(ctx.lang, kljuc, { ...ctx.params, id }) + ctx.url.search } });
  }
  return k;
}

/** Apsolutna adresa na istom originu kao zahtjev (QR, dijeljenje, widget rade i lokalno). */
export const apsolutno = (ctx: { url: URL }, put: string): string => new URL(put, ctx.url.origin).href;

/** Kratki link kampanje bez jezika (`/{id}`): kraći QR, jezik bira posjetitelj (odluka 301). */
export const kratkiLink = (ctx: { url: URL }, publicId: string): string => apsolutno(ctx, `/${publicId}`);
