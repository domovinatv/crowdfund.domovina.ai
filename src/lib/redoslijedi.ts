/**
 * Sedam javno opisanih redoslijeda kataloga (odluka 501, DSA čl. 27; uzor pregled §8.1).
 * Isti popis koriste upit kataloga (`src/lib/db/`), `SortSelect` i stranica `/hr/pravila-prikaza`.
 * Jednaki rezultati: novija kampanja (po `created_at`) ide prva, pa `id`.
 */
export const REDOSLIJEDI = ["most", "popular", "least", "newest", "oldest", "ending", "updated"] as const;
export type Redoslijed = (typeof REDOSLIJEDI)[number];
export const ZADANI_REDOSLIJED: Redoslijed = "most";

export const isRedoslijed = (x: unknown): x is Redoslijed => REDOSLIJEDI.includes(x as Redoslijed);

/** Naziv i javni opis kriterija (prikazuje se u katalogu i na stranici pravila prikaza). */
export const OPIS_REDOSLIJEDA: Record<Redoslijed, { hr: { naziv: string; opis: string }; en: { naziv: string; opis: string } }> = {
  most: {
    hr: { naziv: "Najviše prikupljeno", opis: "Ukupno prikupljeni iznos, od najvećeg. Zadani redoslijed." },
    en: { naziv: "Most raised", opis: "Total amount raised, highest first. The default order." },
  },
  popular: {
    hr: { naziv: "Popularno danas", opis: "Iznos plaćenih doprinosa u zadnja 24 sata, od najvećeg." },
    en: { naziv: "Popular today", opis: "Amount of paid contributions in the last 24 hours, highest first." },
  },
  least: {
    hr: { naziv: "Najmanje prikupljeno", opis: "Ukupno prikupljeni iznos, od najmanjeg." },
    en: { naziv: "Least raised", opis: "Total amount raised, lowest first." },
  },
  newest: {
    hr: { naziv: "Najnovije", opis: "Datum objave kampanje, od najnovije." },
    en: { naziv: "Newest", opis: "Campaign publication date, newest first." },
  },
  oldest: {
    hr: { naziv: "Najstarije", opis: "Datum objave kampanje, od najstarije." },
    en: { naziv: "Oldest", opis: "Campaign publication date, oldest first." },
  },
  ending: {
    hr: { naziv: "Uskoro završava", opis: "Rok kampanje, od najbližeg; kampanje bez roka idu na kraj." },
    en: { naziv: "Ending soon", opis: "Campaign end date, soonest first; campaigns without an end date go last." },
  },
  updated: {
    hr: { naziv: "Nedavno ažurirano", opis: "Datum zadnje objavljene novosti organizatora, od najnovije." },
    en: { naziv: "Recently updated", opis: "Date of the organiser's latest published update, newest first." },
  },
};
