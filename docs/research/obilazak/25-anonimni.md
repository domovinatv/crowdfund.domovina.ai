# 25 — Anonimni obilazak: prijava, kod e-poštom, reset lozinke, čarobnjak bez prijave

- **Dio C**, nakon odjave korisnika (zahtjev korisnika kroz orkestratora). Ništa nije poslano.
- Neprijavljeno zaglavlje: umjesto imena ikona osobe, izbornik **Sign in** / **Create an account**.
  Hash `#log-in` se pri otvaranju modala ne postavlja (modal je čisto klijentski).

## Modal „Sign in”

Lijevo citat korisnika s imenom i dobi (marketinški), desno:

- „Don't have an account? Sign up”
- **Continue with Facebook**, **Continue with Google**, **Send login code to email**
- „Or” → Email, Password (s gumbom za prikaz), „I forgot my password”, **Sign in**

## „Send login code to email”

„Enter your email address” · „We will send a sign-in code to this address” · Email · **Send code**.
Prijava bez lozinke kodom (nije poslano, pa ekran unosa koda nije viđen).

## „Reset password”

„Enter your email address. If it is associated with an account, we'll send you a link to reset your password.”
· Email · **Send password reset link**. Tekst ne otkriva postoji li račun (dobra praksa).

## Potvrda e-pošte

Nije viđena: traži novu registraciju i poštu (odluka 4). Rute `/sign-up/confirm`, `/register/confirm` i slične
vraćaju 404; tok je link iz e-pošte. Registracija je u [01](01-registracija.md).

## Čarobnjak bez prijave

- `/fundraiser/create/choose-type` i `set-goal` rade bez prijave (kao u S1 [03](03-carobnjak-tip.md)).
- **Nacrt je u `localStorage` preglednika, ključ `sbs-fundraiserState`**, ne na poslužitelju: nakon odjave je u
  čarobnjaku i dalje stajao nacrt iz prijavljenog računa. Polja stanja: `entryUrl`, `fundraiserType`,
  `fundraiserTitle`, `fundraiserGoal`, `fundraiserContent` (HTML), `fundraiserFiles[]`, `fundraiserCover`,
  `fundraiserCategory`, `uuid`, `hasVisitedAddMedia`, **`redirectedToLogin`**, `saveFundraiserInitiated`,
  `isImageUploadingInDescription`.
- `redirectedToLogin` i `saveFundraiserInitiated` pokazuju tok: neprijavljeni prođe cijeli čarobnjak, „Publish”
  ga šalje na prijavu, a nakon prijave se nacrt sprema na poslužitelj. (Zaključak iz imena polja; „Publish” nije kliknut.)
- Posljedica: nacrt prelazi na **bilo koji** račun koji se sljedeći prijavi u istom pregledniku. To ispravlja
  odluku 102 („nacrt ostaje u korisnikovom računu”).

## Checkout bez prijave

U [19](19-checkout.md): e-pošta obavezna, ime i prezime neobavezni, „Donate as a company” (samo naziv tvrtke),
obavezan prihvat uvjeta i politike privatnosti.

## Za nas

Prijava: magic link / kod e-poštom kao primarni put (odluka 15, mock), bez društvenih gumba na početku.
Reset lozinke ne trebamo ako nema lozinke. Nacrt kampanje: **lokalno do prijave, pa na poslužitelj**, uz
izričit prikaz „nacrt iz ovog preglednika” kad se prijavi drugi račun (da nacrt ne prijeđe nenamjerno).
