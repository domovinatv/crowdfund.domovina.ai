/**
 * Alatna traka opisa (S10, paritet A06): oznake gumba i kratka uputa za Markdown podskup koji renderira
 * `src/lib/opis.ts`. Uputa je vidljiva i bez JS-a (traka se tada ne prikazuje, polje ostaje obično).
 */
import type { Dvojezicno } from "./tipovi";

export interface TekstoviOpisa {
  traka: string;
  podebljano: string;
  kurziv: string;
  poveznica: string;
  popis: string;
  naslov: string;
  /** Tekst koji se umeće kad ništa nije označeno. */
  primjer: string;
  primjerNaslova: string;
  uputa: string;
}

export const OPIS_UREDIVAC: Dvojezicno<TekstoviOpisa> = {
  hr: {
    traka: "Oblikovanje opisa",
    podebljano: "Podebljano",
    kurziv: "Kurziv",
    poveznica: "Poveznica",
    popis: "Popis s grotičicama",
    naslov: "Podnaslov",
    primjer: "tekst",
    primjerNaslova: "Podnaslov",
    uputa: "Oblikovanje: **podebljano**, *kurziv*, [tekst](https://…), redak „- ” za popis, redak „## ” za podnaslov. Slike i HTML se ne prikazuju.",
  },
  en: {
    traka: "Description formatting",
    podebljano: "Bold",
    kurziv: "Italic",
    poveznica: "Link",
    popis: "Bulleted list",
    naslov: "Subheading",
    primjer: "text",
    primjerNaslova: "Subheading",
    uputa: "Formatting: **bold**, *italic*, [text](https://…), a line starting with “- ” for a list, “## ” for a subheading. Images and HTML are not shown.",
  },
};
