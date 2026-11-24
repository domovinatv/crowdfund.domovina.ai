/** Zajedničke klase obrazaca i tablica upravljanja (docs/08 §3.5 Field, Button), da pogledi ostanu kratki. */
export const POLJE = "mt-1.5 block w-full rounded-sm border bg-paper px-3 py-2.5 text-base text-ink placeholder:text-ink-muted read-only:bg-mist read-only:text-ink-soft";
export const rub = (greska: unknown): string => (greska ? "border-danger ring-1 ring-danger" : "border-ink-muted/60");
export const OZNAKA = "font-semibold text-ink";
export const POMOC = "mt-1.5 text-sm text-ink-muted";
export const GRESKA = "mt-1 text-sm font-medium text-danger";
export const GUMB = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-action px-5 font-semibold text-paper hover:bg-action-strong";
export const GUMB_DRUGI = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 font-semibold text-action ring-1 ring-action/30 hover:bg-mist";
export const GUMB_MALI = "inline-flex min-h-9 items-center justify-center gap-1 rounded-md px-3 text-sm font-semibold text-action ring-1 ring-action/30 hover:bg-mist";
export const GUMB_OPASNI = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-danger px-5 font-semibold text-paper hover:opacity-90";
export const KARTICA = "rounded-md bg-paper p-4 shadow-card";
export const H2 = "text-xl font-semibold text-ink";
export const TABLICA = "w-full min-w-[36rem] text-left text-sm";
export const TH = "border-b border-line px-2 py-2 font-semibold text-ink";
export const TD = "border-b border-line px-2 py-2 align-top text-ink-soft";
