# Prijavljeni obilazak 4fund.com

Obilazak sučelja 4funda korisnikovim računom (Brave, profil iz globalnog CLAUDE.md), samo čitanjem (odluka 4).
Snimke ekrana su samo lokalno u `snimke/` (gitignore). Osobni podaci korisnika i drugih ljudi nisu zapisani.

**S1, 24. 11. 2026.:** račun prijavljen preko Googlea, neverificiran, bez vlastitih kampanja, s jednom donacijom.
Čarobnjak je prijeđen izmišljenim podacima do pregleda, a „Publish fundraiser” nije kliknut.

## Inventar

| # | ekran | URL predložak | grupa §12 | datoteka |
|---|---|---|---|---|
| 01 | Registracija | `/sign-up/user-data` | 1 | [01-registracija](01-registracija.md) |
| 02 | Verifikacija računa (lozinka, tip, podaci, PEP) | `/settings/verification/{create-password,type,data}` | 1 | [02-verifikacija-racuna](02-verifikacija-racuna.md) |
| 03 | Čarobnjak: tip i namjena | `/fundraiser/create/choose-type` | 2 | [03-carobnjak-tip](03-carobnjak-tip.md) |
| 04 | Čarobnjak: naslov, cilj, organizacija, AI Improve | `/fundraiser/create/set-goal` | 2 | [04-carobnjak-naslov-cilj](04-carobnjak-naslov-cilj.md) |
| 05 | Čarobnjak: mediji i naslovnice | `/fundraiser/create/add-multimedia` | 2 | [05-carobnjak-mediji](05-carobnjak-mediji.md) |
| 06 | Čarobnjak: opis | `/fundraiser/create/add-description` | 2 | [06-carobnjak-opis](06-carobnjak-opis.md) |
| 07 | Čarobnjak: pregled | `/fundraiser/create/fundraiser-preview` | 2 | [07-carobnjak-pregled](07-carobnjak-pregled.md) |
| 08 | My fundraisers (3 kartice, filtri, redoslijedi, More na doniranoj) | `/user/whip-rounds/{active,paid}`, `/user/whip-round-box` | 3 | [08-moje-kampanje](08-moje-kampanje.md) |
| 09 | Withdraw funds (ulaz) | `/user/withdraw/list` | 3/5 | [09-isplata-popis](09-isplata-popis.md) |
| 10 | Settings: Edit details + izbornik | `/settings/edit` | 6 | [10-postavke-podaci](10-postavke-podaci.md) |
| 11 | Settings: Phone number | `/settings/phone-number` | 6 | [11-postavke-telefon](11-postavke-telefon.md) |
| 12 | Settings: Profile settings + Delete account | `/settings/profile` | 6 | [12-postavke-profil](12-postavke-profil.md) |
| 13 | Settings: Change password | `/settings/change-password` | 6 | [13-postavke-lozinka](13-postavke-lozinka.md) |
| 14 | Settings: Limits and authentications | `/settings/limits` | 6 | [14-postavke-limiti](14-postavke-limiti.md) |
| 15 | Settings: Verify fundraisers | `/settings/whip-rounds-verification` | 6 | [15-postavke-verifikacija-kampanja](15-postavke-verifikacija-kampanja.md) |
| 16 | Settings: Tracking links, Shared links | `/settings/{reflinks,auto-reflinks}` | 6 | [16-postavke-linkovi](16-postavke-linkovi.md) |
| 17 | Settings: Recurring donations | `/settings/recurring-payments` | 6 | [17-postavke-ponavljajuce](17-postavke-ponavljajuce.md) |
| 18 | Settings: Login history | `/settings/login-history` | 6 | [18-postavke-povijest-prijava](18-postavke-povijest-prijava.md) |

**Broj ekrana:** 18 datoteka (`ls docs/research/obilazak/[0-9]*.md | wc -l`). U njima je opisano 21 ruta.

## Nije viđeno u S1 (prenosi se u S1b)

| ekran | zašto | gdje |
|---|---|---|
| „Edit” kampanje (vidljivost, skrivanje iznosa, minimum, zahvala, kasice, tuđe ponude, recurring, lokacija, datum) | treba objavljena kampanja | vrata na vrhu `S1b.md` |
| „More” vlastite kampanje (Finances, Notifications, Tracking link, QR, Widget, Poster, Turn off, Delete), „Statistics” | isto | isto |
| Obrazac „Verify fundraisers” s dokumentima | isto | isto |
| Onfido korak verifikacije | traži spremanje obrasca s pravim podacima | ostaje iz javnog pregleda §2 |
| Modal prijave, potvrda e-pošte, reset lozinke | korisnik je prijavljen; modal je klijentski | anonimni obilazak (S1b dio C) |
| Invoices, Become a Fixed Beneficiary u postavkama | nema u izborniku ovog računa | S1b grupa 11 |

## Metoda

`get_page_text` za tekst, JS popis polja (`name`, `type`, `maxlength`, `required`, labela, **bez vrijednosti**),
dohvat bez kolačića za anonimne stranice. Zamka: 404 stranica 4funda uvijek pokazuje anonimno zaglavlje, pa je
prvo izgledalo da korisnik nije prijavljen. Prijava se provjerava izbornikom računa na stvarnoj stranici.
