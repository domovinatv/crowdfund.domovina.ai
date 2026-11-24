# 22 — Observe, Report abuse, komentari (tuđa kampanja)

- **URL:** `/{id}` (javna kampanja `72wbb3`, prijavljen korisnik). **Grupa:** 9.
- Desni stupac ispod „Donate”/„Share”: **Create donation box**, **Observe**, **Promotional materials** (padajući:
  Poster, QR code, Widget, **Streaming widget „New”**, Statistics). Ispod: „We take safety seriously. If you have
  any concerns, please report this fundraiser using the form.” (link „form”).
- Kartice sadržaja: Updates (n) · Description · Donation boxes · Donations (n) · Comments (n). Donacije imaju
  redoslijed **Latest / Highest** i „See more”. Strani opis ima „Original … text translated into English” s
  gumbom „Show original … text” (strojni prijevod).

## Observe („Observe this fundraiser”)

„We will send notifications to your email address. Notify me about:” tri checkboxa, sva isključena:

| opcija | podnaslov |
|---|---|
| New comments | Follow the discussion around the fundraiser |
| News from the Organiser | Stay up to date with the fundraiser's progress |
| Fundraiser end | Get notified when the fundraiser comes to an end |

Gumb „Save changes” (nije kliknut).

## Report abuse (modal)

| polje | tip | obavezno | ograničenja |
|---|---|---|---|
| Detailed description of the abuse | textarea | da | **min. 50, max. 500** znakova, brojač |
| Phone number | pozivni broj (select, ~45 europskih zemalja, zadano En +44) + broj | ne (nije označeno) | – |
| Add a file documenting the abuse | upload | ne | jpg, jpeg, pdf, png; **najviše 20 MB** |
| Pristanak na obradu osobnih podataka (GDPR, čl. 6(1)(c) i RODO) | checkbox | da | dugi pravni tekst |

Desno: „What do we check in 4fund.com, or when to report a suspicious fundraiser?” s linkom na članak.
Gumbi „Cancel” / „Report abuse” (nije kliknut).

## Komentari

Polje „Add comment...” i gumb „Comment”; svaki komentar ima „Reply” i „Share”, organizatorovi odgovori
su ugniježđeni. Moderacija (skrivanje, 14 dana) je na strani organizatora (javni pregled §9).

## Za nas

Observe = pretplata e-poštom s tri prekidača (od S6 mock). Prijava je DSA čl. 16 obrazac: opis 50–500,
neobavezan kontakt, privitak, pristanak; potvrda primitka i obrazložena odluka (čl. 17). Strojni prijevod
opisa je faza 2. „Streaming widget” (prikaz za stream) je novo od S0 i dodaje se u 02.
