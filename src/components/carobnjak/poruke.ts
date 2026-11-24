/** Tekst greške polja čarobnjaka iz koda (`nacrti.ts`) i sadržaja; `{rijeci}` = pronađene zabranjene riječi. */
import type { Lang } from "../../i18n";
import { zabranjeneRijeci, type Greske } from "../../lib/db/nacrti";
import { CAROBNJAK } from "../../views/sadrzaj/carobnjak";

type Polje = keyof (typeof CAROBNJAK)["hr"]["greske"];

export function porukaPolja(lang: Lang, greske: Greske, polje: Polje, vrijednost = ""): string | null {
  const kod = greske[polje];
  if (!kod) return null;
  const tekst = (CAROBNJAK[lang].greske[polje] as Record<string, string>)[kod];
  return tekst ? tekst.replace("{rijeci}", zabranjeneRijeci(vrijednost).join(", ")) : null;
}

/** Klase polja obrasca (labela iznad, greška crveno, docs/08 `Field`). */
export const POLJE = "mt-1.5 block w-full rounded-sm border bg-paper px-3 py-2.5 text-base text-ink placeholder:text-ink-muted";
export const rubPolja = (greska: string | null) => (greska ? "border-danger ring-1 ring-danger" : "border-ink-muted/60");
