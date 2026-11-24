/**
 * Registar pogleda po ključu rute (odluka 500): naziv datoteke u `stranice/` je ključ rute.
 * Bez ručnog popisa, pa agenti i sesije dodaju stranice bez izmjene zajedničke datoteke.
 */
import type { Ucitaj } from "./tipovi";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Komponenta = (props: any) => unknown;

const komponente = import.meta.glob<{ default: Komponenta }>("./stranice/*.astro", { eager: true });
const ucitavaci = import.meta.glob<{ ucitaj: Ucitaj }>("./stranice/*.ucitaj.ts", { eager: true });

const kljuc = (put: string) => put.replace(/^\.\/stranice\//, "").replace(/(\.ucitaj)?\.(astro|ts)$/, "");

const POGLEDI = new Map(Object.entries(komponente).map(([p, m]) => [kljuc(p), m.default]));
const UCITAVACI = new Map(Object.entries(ucitavaci).map(([p, m]) => [kljuc(p), m.ucitaj]));

export const pogled = (k: string): Komponenta | undefined => POGLEDI.get(k);
export const ucitavac = (k: string): Ucitaj | undefined => UCITAVACI.get(k);
export const kljuceviPogleda = (): string[] => [...POGLEDI.keys()];
