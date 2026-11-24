/**
 * QR kod kao SVG niz, generiran na poslužitelju (`uqr`, čisti JS bez nativnih dijelova, radi u Workeru).
 * Jedan `<path>` za sve tamne module, tiha zona 4 modula (ISO/IEC 18004), bez vanjskih resursa.
 */
import { encode } from "uqr";

export interface OpcijeQr {
  /** Tekst za `<title>` i `aria-label` (pristupačnost i preuzeta datoteka). */
  naslov?: string;
  /** Razina ispravka pogrešaka; zadano `M` (15 %), dovoljno i za ispisani plakat. */
  ecc?: "L" | "M" | "Q" | "H";
  /** Dodatni atributi korijena, npr. `class="h-48 w-48"`. */
  atributi?: string;
}

export const TIHA_ZONA = 4;

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Matrica modula (`true` = tamno), bez tihe zone. */
export function qrMatrica(tekst: string, ecc: OpcijeQr["ecc"] = "M"): boolean[][] {
  return encode(tekst, { ecc, border: 0 }).data;
}

export function qrSvg(tekst: string, { naslov, ecc = "M", atributi = "" }: OpcijeQr = {}): string {
  const m = qrMatrica(tekst, ecc);
  const n = m.length + 2 * TIHA_ZONA;
  let d = "";
  m.forEach((red, y) =>
    red.forEach((tamno, x) => {
      if (tamno) d += `M${x + TIHA_ZONA} ${y + TIHA_ZONA}h1v1h-1z`;
    }),
  );
  const oznaka = xml(naslov ?? tekst);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" role="img" aria-label="${oznaka}" shape-rendering="crispEdges"${atributi ? ` ${atributi}` : ""}>` +
    `<title>${oznaka}</title><rect width="${n}" height="${n}" fill="#ffffff"/><path fill="#000000" d="${d}"/></svg>`
  );
}
