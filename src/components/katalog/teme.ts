/**
 * Tema naslovnice po kategoriji (isto preslikavanje kao seed, odluka 216). Kampanja nosi vlastitu temu
 * (`cover_theme`); vanjska kampanja je nema, pa se tema izvodi iz kategorije.
 */
export const TEMA_KATEGORIJE: Readonly<Record<string, string>> = {
  charity: "charity",
  culture: "event",
  projects: "project",
  needs: "needs",
  sport: "sports",
  animals: "animals",
  travel: "travel",
  other: "general",
};

export const temaKategorije = (kategorija: string | null): string | null => TEMA_KATEGORIJE[kategorija ?? ""] ?? null;
