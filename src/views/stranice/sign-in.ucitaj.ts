/**
 * Prijava `/hr/prijava` (J, odluke 15 i 208, docs/04 §1): e-pošta → kod i poveznica (mock, prikazani na
 * sljedećem ekranu) → 303 na `/hr/prijava/kod?next=…`. Nepoznata e-pošta: ponuda računa na istom ekranu;
 * uz kvačicu uvjeta račun nastaje tiho (04 §1: „users + auth_identities ako ne postoji”), bez nje 200 s ponudom.
 */
import { nextIz, niz, posaljiKod, preusmjeri303, upitNext } from "../../components/prijava/ucitavanje";
import { url } from "../../lib/rute";
import { korisnikPoEmailu, normalizirajEmail, stvoriKorisnika, valjanEmail, type Korisnik } from "../../lib/sesija";
import type { Ucitaj } from "../tipovi";

export type GreskaPrijave = "email_prazno" | "email_neispravan" | "obrisan" | "uvjeti";

export interface PodaciPrijave {
  email: string;
  next: string;
  greska: GreskaPrijave | null;
  /** E-pošta nema račun: prikaži kvačicu uvjeta i poveznicu na registraciju. */
  nepoznata: boolean;
  korisnik: Korisnik | null;
}

export const ucitaj: Ucitaj<PodaciPrijave> = async (ctx) => {
  const sad = Date.now();
  if (ctx.request.method !== "POST") {
    return {
      podaci: {
        email: ctx.url.searchParams.get("email") ?? "",
        next: nextIz(ctx.url.searchParams.get("next"), ctx.lang),
        greska: null,
        nepoznata: false,
        korisnik: ctx.korisnik,
      },
    };
  }
  const f = await ctx.request.formData();
  const email = normalizirajEmail(niz(f.get("email")));
  const next = nextIz(niz(f.get("next")) || ctx.url.searchParams.get("next"), ctx.lang);
  const uvjeti = niz(f.get("uvjeti")) === "1";
  const vrati = (greska: GreskaPrijave | null, nepoznata = false) => ({ podaci: { email, next, greska, nepoznata, korisnik: ctx.korisnik } });

  if (!email) return vrati("email_prazno");
  if (!valjanEmail(email)) return vrati("email_neispravan");
  let k = await korisnikPoEmailu(ctx.db, email);
  if (k?.obrisan) return vrati("obrisan");
  let userId = k?.id ?? null;
  if (!userId) {
    if (!uvjeti) return vrati(niz(f.get("nepoznata")) === "1" ? "uvjeti" : null, true);
    userId = await stvoriKorisnika(ctx.db, { email, locale: ctx.lang }, sad);
  }
  await posaljiKod(ctx, { email, userId, svrha: "login", next, sad });
  return preusmjeri303(url(ctx.lang, "sign-in.code") + upitNext(next));
};
