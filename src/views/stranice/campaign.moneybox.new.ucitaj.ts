/**
 * Nova kasica `/hr/{id}/kasica/nova` (pristup P, odluka 516): do S6 svi su neprijavljeni → 302 na prijavu
 * s `?next=<trenutni put>`. Obrazac (naslov ≤ 60, alias, cilj, opis, pravila; ekran 24) dolazi sa S6.
 */
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export const ucitaj: Ucitaj = async ({ lang, url: adresa }) => {
  const prijavljen = false; // S6: provjera sesije
  if (!prijavljen) {
    const next = encodeURIComponent(adresa.pathname + adresa.search);
    return new Response(null, { status: 302, headers: { Location: `${url(lang, "sign-in")}?next=${next}` } });
  }
  return { podaci: null };
};
