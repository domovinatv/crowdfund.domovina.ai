/**
 * QR kampanje `/hr/{id}/qr`: QR kratkog linka `/{id}` (jezik bira posjetitelj, odluka 301) kao inline SVG.
 * `?format=svg` vraća samu datoteku (`image/svg+xml`, `Content-Disposition: attachment`).
 */
import type { StranicaKampanje } from "../../lib/db/kampanja";
import { kratkiLink, ucitajKampanju } from "../../components/kampanja/ucitavanje";
import { qrSvg } from "../../components/kampanja/qr";
import type { Ucitaj } from "../tipovi";

export interface PodaciQr {
  k: StranicaKampanje;
  /** Adresa koju QR kodira. */
  cilj: string;
}

export const ucitaj: Ucitaj<PodaciQr> = async (ctx) => {
  const k = await ucitajKampanju(ctx, "campaign.qr");
  if (k instanceof Response) return k;
  const cilj = kratkiLink(ctx, k.publicId);
  if (ctx.url.searchParams.get("format") === "svg") {
    return new Response(qrSvg(cilj, { naslov: `${k.title} · ${cilj}` }), {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="qr-${k.publicId}.svg"`,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return { podaci: { k, cilj } };
};
