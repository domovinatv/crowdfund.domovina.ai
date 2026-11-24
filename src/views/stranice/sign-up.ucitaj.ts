/**
 * Registracija `/hr/registracija` (J, ekran 01): ime, prezime, e-pošta, privola uvjeta (obavezna,
 * `consents.terms_privacy`) i novosti (`consents.newsletter`, granted 0/1). Uspjeh → kod za potvrdu e-pošte
 * (mock) i 303 na `/hr/registracija/potvrda`. `?organizacija=1` nakon potvrde vodi na `organisation.new`.
 */
import { nextIz, niz, posaljiKod, preusmjeri303, upitNext } from "../../components/prijava/ucitavanje";
import { url } from "../../lib/rute";
import { korisnikPoEmailu, normalizirajEmail, stvoriKorisnika, valjanEmail, type Korisnik } from "../../lib/sesija";
import type { Ucitaj } from "../tipovi";

export type PoljeRegistracije = "ime" | "prezime" | "email" | "uvjeti";
export type GreskeRegistracije = Partial<Record<PoljeRegistracije, "ime" | "prezime" | "email_prazno" | "email_neispravan" | "email_postoji" | "obrisan" | "uvjeti">>;

export interface PodaciRegistracije {
  vrijednosti: { ime: string; prezime: string; email: string; newsletter: boolean };
  greske: GreskeRegistracije;
  next: string;
  organizacija: boolean;
  korisnik: Korisnik | null;
}

const NAJVISE_IMENA = 255;

export const ucitaj: Ucitaj<PodaciRegistracije> = async (ctx) => {
  const sad = Date.now();
  const organizacija = ctx.url.searchParams.get("organizacija") === "1";
  // Nakon potvrde: zahtjev organizacije (07) ima prednost pred `next`.
  const next = organizacija ? url(ctx.lang, "organisation.new") : nextIz(ctx.url.searchParams.get("next"), ctx.lang);
  const prazno = { ime: "", prezime: "", email: ctx.url.searchParams.get("email") ?? "", newsletter: false };
  if (ctx.request.method !== "POST") {
    return { podaci: { vrijednosti: prazno, greske: {}, next, organizacija, korisnik: ctx.korisnik } };
  }
  const f = await ctx.request.formData();
  const v = {
    ime: niz(f.get("ime")).trim(),
    prezime: niz(f.get("prezime")).trim(),
    email: normalizirajEmail(niz(f.get("email"))),
    newsletter: niz(f.get("newsletter")) === "1",
  };
  const greske: GreskeRegistracije = {};
  if (!v.ime || v.ime.length > NAJVISE_IMENA) greske.ime = "ime";
  if (!v.prezime || v.prezime.length > NAJVISE_IMENA) greske.prezime = "prezime";
  if (!v.email) greske.email = "email_prazno";
  else if (!valjanEmail(v.email)) greske.email = "email_neispravan";
  if (niz(f.get("uvjeti")) !== "1") greske.uvjeti = "uvjeti";
  if (!greske.email) {
    const postoji = await korisnikPoEmailu(ctx.db, v.email);
    if (postoji) greske.email = postoji.obrisan ? "obrisan" : "email_postoji";
  }
  if (Object.keys(greske).length) return { podaci: { vrijednosti: v, greske, next, organizacija, korisnik: ctx.korisnik } };

  const userId = await stvoriKorisnika(ctx.db, { email: v.email, firstName: v.ime, lastName: v.prezime, locale: ctx.lang }, sad, v.newsletter);
  await posaljiKod(ctx, { email: v.email, userId, svrha: "email_verify", next, sad });
  return preusmjeri303(url(ctx.lang, "sign-up.confirm") + upitNext(next));
};
