/**
 * Nova ponuda (pristup P): neprijavljeni → 302 na prijavu s `?next=<trenutni put>` (odluka 516, S6).
 */
import { zahtijevajPrijavu } from "../../lib/pristup";
import type { Ucitaj } from "../tipovi";

export const ucitaj: Ucitaj = async (ctx) => {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  return { podaci: null };
};
