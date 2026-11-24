/**
 * Nacrt neprijavljenog u ovom pregledniku (odluka 152): JSON kao base64url u kolačićima `nacrt0`…`nacrt3`
 * (do ~3.800 znakova po kolačiću, ukupno ~11 kB JSON-a). Kolačić radi bez JS-a; HttpOnly, 30 dana.
 * Pri prvom ulasku prijavljenog u čarobnjak nacrt prelazi u `campaign_drafts` (source local) i kolačići se brišu.
 */
import type { AstroCookies } from "astro";
import { ocistiNacrt, type Nacrt } from "../../lib/db/nacrti";

export const KOLACIC_NACRTA = "nacrt";
export const DIJELOVA = 4;
const DIO = 3800;
const TRAJANJE = 30 * 24 * 3600;

const ime = (i: number) => `${KOLACIC_NACRTA}${i}`;

function base64url(bajtovi: Uint8Array): string {
  let s = "";
  for (const b of bajtovi) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function izBase64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export const kodiraj = (n: Nacrt): string => base64url(new TextEncoder().encode(JSON.stringify(n)));

export function dekodiraj(s: string): Nacrt | null {
  try {
    return ocistiNacrt(JSON.parse(new TextDecoder().decode(izBase64url(s))));
  } catch {
    return null;
  }
}

/** Nacrt iz kolačića ili null (nema ga, oštećen). */
export function citajLokalniNacrt(cookies: AstroCookies): Nacrt | null {
  let s = "";
  for (let i = 0; i < DIJELOVA; i++) {
    const v = cookies.get(ime(i))?.value;
    if (!v) break;
    s += v;
  }
  return s ? dekodiraj(s) : null;
}

/** Spremi nacrt; false kad je prevelik za kolačiće (opis predug za nacrt u pregledniku). */
export function spremiLokalniNacrt(cookies: AstroCookies, url: URL, n: Nacrt): boolean {
  const s = kodiraj(n);
  if (s.length > DIO * DIJELOVA) return false;
  const opcije = { path: "/", httpOnly: true, sameSite: "lax" as const, secure: url.protocol === "https:", maxAge: TRAJANJE };
  for (let i = 0; i < DIJELOVA; i++) {
    const dio = s.slice(i * DIO, (i + 1) * DIO);
    if (dio) cookies.set(ime(i), dio, opcije);
    else cookies.delete(ime(i), { path: "/" });
  }
  return true;
}

export function obrisiLokalniNacrt(cookies: AstroCookies): void {
  for (let i = 0; i < DIJELOVA; i++) cookies.delete(ime(i), { path: "/" });
}
