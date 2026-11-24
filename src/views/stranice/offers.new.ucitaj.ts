/**
 * Nova ponuda (pristup P): neprijavljeni → 302 na prijavu s `?next=<trenutni put>`.
 * Auth je S6 (odluka 15, mock); dok ne postoji sesija, svi su neprijavljeni.
 */
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export const ucitaj: Ucitaj = async ({ lang, url: adresa }) => {
  const prijavljen = false; // S6: provjera mock sesije iz kolačića
  if (!prijavljen) {
    const next = encodeURIComponent(adresa.pathname + adresa.search);
    return new Response(null, { status: 302, headers: { Location: `${url(lang, "sign-in")}?next=${next}` } });
  }
  return { podaci: null };
};
