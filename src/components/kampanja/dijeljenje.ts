/**
 * Poveznice za dijeljenje (obični `<a>`, bez vanjskih skripti) i HTML kod widgeta za ugradnju.
 */
import type { Lang } from "../../i18n";

export interface PoveznicaDijeljenja {
  kljuc: "email" | "whatsapp" | "facebook" | "linkedin";
  href: string;
}

export function poveznice(adresa: string, naslov: string): PoveznicaDijeljenja[] {
  const u = encodeURIComponent(adresa);
  return [
    { kljuc: "email", href: `mailto:?subject=${encodeURIComponent(naslov)}&body=${encodeURIComponent(`${naslov}\n${adresa}`)}` },
    { kljuc: "whatsapp", href: `https://wa.me/?text=${encodeURIComponent(`${naslov} ${adresa}`)}` },
    { kljuc: "facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { kljuc: "linkedin", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  ];
}

export const CILJEVI_WIDGETA = ["campaign", "support"] as const;
export type CiljWidgeta = (typeof CILJEVI_WIDGETA)[number];
export const isCiljWidgeta = (x: unknown): x is CiljWidgeta => x === "campaign" || x === "support";

/** Put ugradive kartice: `/embed/{id}?lang=…&target=…` (hr i campaign su zadani i izostavljaju se). */
export function putUgradnje(publicId: string, lang: Lang, target: CiljWidgeta): string {
  const q = new URLSearchParams();
  if (lang !== "hr") q.set("lang", lang);
  if (target !== "campaign") q.set("target", target);
  const s = q.toString();
  return `/embed/${publicId}${s ? `?${s}` : ""}`;
}

/** HTML kod za kopiranje; `origin` je adresa platforme (npr. `https://crowdfund.domovina.ai`). */
export function kodWidgeta(origin: string, publicId: string, lang: Lang, target: CiljWidgeta, naslov: string): string {
  const src = new URL(putUgradnje(publicId, lang, target), origin).href.replace(/&/g, "&amp;");
  const t = naslov.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<iframe src="${src}" title="${t}" width="360" height="420" style="border:0;max-width:100%" loading="lazy"></iframe>`;
}
