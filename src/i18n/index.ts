import { en } from "./en";
import { hr, type KljucPrijevoda, type Rjecnik } from "./hr";

export const LANGS = ["hr", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "hr";

const rjecnici: Record<Lang, Rjecnik> = { hr, en };

export const isLang = (x: unknown): x is Lang => x === "hr" || x === "en";

/** Prevoditelj za jezik: `const t = prevoditelj("en"); t("nav.campaigns")`. */
export function prevoditelj(lang: Lang) {
  const r = rjecnici[lang];
  return (kljuc: KljucPrijevoda): string => r[kljuc];
}

/** BCP 47 oznaka za Intl (iznosi, datumi). */
export const LOCALE: Record<Lang, string> = { hr: "hr-HR", en: "en-IE" };

/**
 * Jezik za preusmjeravanje s `/` i kratkih linkova (odluka 300, 301):
 * kolačić `lang`, pa `Accept-Language` po težini, zadano `hr`.
 */
export function odaberiJezik(kolacic: string | undefined, acceptLanguage: string | null): Lang {
  if (isLang(kolacic)) return kolacic;
  if (acceptLanguage) {
    const ponude = acceptLanguage
      .split(",")
      .map((dio, i) => {
        const [oznaka = "", ...param] = dio.trim().split(";");
        const q = param.map((p) => p.trim()).find((p) => p.startsWith("q="));
        return { jezik: oznaka.toLowerCase().split("-")[0], q: q ? Number(q.slice(2)) : 1, i };
      })
      .filter((p) => p.q > 0)
      .sort((a, b) => b.q - a.q || a.i - b.i);
    for (const p of ponude) if (isLang(p.jezik)) return p.jezik;
  }
  return DEFAULT_LANG;
}

export type { KljucPrijevoda, Rjecnik };
