# Prijavljeni obilazak 4fund.com

Obilazak sučelja 4funda korisnikovim računom (Brave, profil iz globalnog CLAUDE.md), samo čitanjem (odluka 4).
Snimke ekrana su samo lokalno u `snimke/` (gitignore). Osobni podaci korisnika i drugih ljudi nisu zapisani.

**S1b, 24. 11. 2026.:** checkout tuđe kampanje, organizacija, kontakt, Observe/Report, ponude, kasica, anonimni dio C (nakon odjave), te račun pravne osobe ITalk d.o.o. koji je korisnik otvorio sam: company application poslan, čeka 4fund (3/5). MPT kampanja nije objavljena; nacrt je u localStorageu preglednika.

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
| 19 | Checkout tuđe kampanje (valute, iznosi, 12 metoda, napojnica 0–30 %, skrivanje, poruka, sažetak) | `/{id}/pay` | 10 | [19-checkout](19-checkout.md) |
| 20 | Company application (5 koraka), Fixed Beneficiary (nedostupno) | `/company-application/steps` | 11 | [20-organizacija](20-organizacija.md) |
| 21 | Kontakt obrazac (10 tema) | `/contact` | 12 | [21-kontakt](21-kontakt.md) |
| 22 | Observe, Report abuse, komentari na tuđoj kampanji | `/{id}` | 9 | [22-observe-prijava-komentari](22-observe-prijava-komentari.md) |
| 23 | Ponude: odabir kampanje, Founder's Offer traži verifikaciju | `/whip-rounds/add-awards`, `…/award-access-status/public/add-awards` | 8 | [23-ponude-founders-offer](23-ponude-founders-offer.md) |
| 24 | Kasica: obrazac | `/{id}/add-moneybox` | 9 | [24-kasica-obrazac](24-kasica-obrazac.md) |
| 25 | Anonimno: Sign in, kod e-poštom, reset lozinke, čarobnjak i checkout bez prijave | modal, `/fundraiser/create/*`, `/{id}/pay` | 1, 2, 10 | [25-anonimni](25-anonimni.md) |
| 26 | Company application: obrazac tvrtke, stanje „3 / 5” nakon slanja | `/company-application/{form,steps}` | 11 | [26-company-application-poslano](26-company-application-poslano.md) |
| 27 | Isplata: dodatna autorizacija kodom e-poštom (verificiran račun) | `/safety/additional-authorization/{token}` | 5 | [27-isplata-dodatna-autorizacija](27-isplata-dodatna-autorizacija.md) |

**Broj ekrana:** 27 datoteka (S1: 18, S1b: 9) (`ls docs/research/obilazak/[0-9]*.md | wc -l`). U njima je opisano 21 ruta.

## Nije viđeno nakon S1b (čeka odobrenje ITalka na 4fundu)

| ekran | grupa | zašto | do tada |
|---|---|---|---|
| „Edit” kampanje (sve opcije), „More” vlastite kampanje (Finances, Notifications, Tracking link, QR, Widget, Poster, Turn off, Delete), „Statistics” | 2–3 | treba objavljena vlastita kampanja; s osobnog računa se ne objavljuje (odluka 151) | javni pregled §4 |
| Finances: popis uplata, stupci XLS izvoza, „Return selected” | 4 | isto | javni pregled §6, S1 popis |
| Isplata: kartica, IBAN, 0,10 €, limiti, povijest | 5 | traži kod e-poštom ([27](27-isplata-dodatna-autorizacija.md)) i saldo | javni pregled §6 |
| Promote, delegirane zahvale, razine podrške, kasica i tracking link vlastite kampanje (statistika, stranica `+`) | 7–9 | treba objavljena kampanja | javni pregled §3–4, [24](24-kasica-obrazac.md), [16](16-postavke-linkovi.md) |
| Obrazac Founder's Offer | 8 | traži verificiran profil ([23](23-ponude-founders-offer.md)); sad moguće na računu ITalka, nije obiđeno | javni pregled §3 |
| Fixed Beneficiary pogled (odobravanje tuđih kampanja), korak 4–5 company application | 11 | čeka ručni pregled 4funda ([26](26-company-application-poslano.md)) | javni pregled §2.4 |
| „Verify fundraisers” obrazac s dokumentima | 6 | treba kampanja | [15](15-postavke-verifikacija-kampanja.md) |
| Ekran PayU/ZEN, potvrda uplate i PDF | 10 | bi pokrenulo uplatu | javni pregled §5 |
| Onfido, potvrda e-pošte | 1 | osobni podaci, pošta | javni pregled §2 |

## Metoda

`get_page_text` za tekst, JS popis polja (`name`, `type`, `maxlength`, `required`, labela, **bez vrijednosti**),
dohvat bez kolačića za anonimne stranice. Zamka: 404 stranica 4funda uvijek pokazuje anonimno zaglavlje, pa je
prvo izgledalo da korisnik nije prijavljen. Prijava se provjerava izbornikom računa na stvarnoj stranici.
