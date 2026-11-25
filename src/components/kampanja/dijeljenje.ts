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

/** Veličina widgeta (S10, B09): `?size=`; dimenzije iframea u kodu i pregledu. `medium` je zadana (S5). */
export const VELICINE_WIDGETA = { small: { w: 300, h: 340 }, medium: { w: 360, h: 420 }, large: { w: 480, h: 480 } } as const;
export type VelicinaWidgeta = keyof typeof VELICINE_WIDGETA;
export const isVelicinaWidgeta = (x: unknown): x is VelicinaWidgeta => x === "small" || x === "medium" || x === "large";

/** Izgled widgeta (S10, B09): `?theme=light|dark`; tamni preslikava iste semantičke tokene na tamnu podlogu. */
export const IZGLEDI_WIDGETA = ["light", "dark"] as const;
export type IzgledWidgeta = (typeof IZGLEDI_WIDGETA)[number];
export const isIzgledWidgeta = (x: unknown): x is IzgledWidgeta => x === "light" || x === "dark";

export interface OpcijeWidgeta {
  velicina?: VelicinaWidgeta;
  izgled?: IzgledWidgeta;
}

/** Parametri widgeta iz upita: sve izvan whiteliste pada na zadano (nikad se ne prenosi dalje). */
export function opcijeWidgetaIz(q: URLSearchParams): { target: CiljWidgeta; velicina: VelicinaWidgeta; izgled: IzgledWidgeta } {
  const t = q.get("target");
  const v = q.get("size");
  const i = q.get("theme");
  return {
    target: isCiljWidgeta(t) ? t : "campaign",
    velicina: isVelicinaWidgeta(v) ? v : "medium",
    izgled: isIzgledWidgeta(i) ? i : "light",
  };
}

/** Put ugradive kartice: `/embed/{id}?lang=…&target=…&size=…&theme=…` (zadane vrijednosti se izostavljaju). */
export function putUgradnje(publicId: string, lang: Lang, target: CiljWidgeta, o: OpcijeWidgeta = {}): string {
  const q = new URLSearchParams();
  if (lang !== "hr") q.set("lang", lang);
  if (target !== "campaign") q.set("target", target);
  if (o.velicina && o.velicina !== "medium") q.set("size", o.velicina);
  if (o.izgled && o.izgled !== "light") q.set("theme", o.izgled);
  const s = q.toString();
  return `/embed/${publicId}${s ? `?${s}` : ""}`;
}

/** HTML kod za kopiranje; `origin` je adresa platforme (npr. `https://crowdfund.domovina.ai`). */
export function kodWidgeta(origin: string, publicId: string, lang: Lang, target: CiljWidgeta, naslov: string, o: OpcijeWidgeta = {}): string {
  const src = new URL(putUgradnje(publicId, lang, target, o), origin).href.replace(/&/g, "&amp;");
  const t = naslov.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const { w, h } = VELICINE_WIDGETA[o.velicina ?? "medium"];
  return `<iframe src="${src}" title="${t}" width="${w}" height="${h}" style="border:0;max-width:100%" loading="lazy"></iframe>`;
}

/** Adresa overlaya za stream (`/embed/{id}/stream`, izvor preglednika u OBS-u i sličnim alatima). */
export function putStreama(origin: string, publicId: string, lang: Lang): string {
  return new URL(`/embed/${publicId}/stream${lang !== "hr" ? `?lang=${lang}` : ""}`, origin).href;
}
