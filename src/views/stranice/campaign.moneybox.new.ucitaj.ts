/**
 * Nova kasica `/hr/{id}/kasica/nova` (pristup P, odluka 516): neprijavljeni → 302 na prijavu s
 * `?next=<trenutni put>` (S6). Obrazac (naslov ≤ 60, alias, cilj, opis, pravila; ekran 24) dolazi sa S6.
 */
import { zahtijevajPrijavu } from "../../lib/pristup";
import type { Ucitaj } from "../tipovi";

export const ucitaj: Ucitaj = async (ctx) => {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  return { podaci: null };
};
