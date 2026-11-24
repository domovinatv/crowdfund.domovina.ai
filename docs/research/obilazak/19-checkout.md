# 19 — Checkout (tuđa kampanja)

- **URL:** `/{id}/pay` (viđeno na javnoj kampanji iz javnog pregleda, `72wbb3`). Prijavljen korisnik.
- **Grupa:** 10 · naslov „Donate to fundraiser”, ispod ime organizatora, zastava države i „Profile verified”.
  Desno kartica kampanje (slika, naslov, iznos „od” cilja, postotak).
- **Ništa nije plaćeno:** „Donate €…” nije kliknut, pa ekran PayU/ZEN nije viđen.

## Polja

| polje | tip | obavezno | ograničenja | napomena |
|---|---|---|---|---|
| Valuta | gumbi | da | **11:** EUR, USD, GBP, PLN, CHF, CZK, NOK, SEK, DKK, RON, HUF; zadano EUR; „Show all available currencies” | – |
| Iznos | gumbi | da | €1,000 · €500 · €300 · **€100 „Most popular”** (zadano) · €70 · €50 · €20 · „Other amount” | iznosi su po kampanji (javni pregled §5) |
| „Your amount” | text | da uz „Other amount” | prazno = ukupno €0 i gumb „Donate €0” | minimum nije provjeren |
| Način plaćanja | mreža gumba | da | **12:** Visa/Mastercard („Pay by Visa or Mastercard”), Revolut, N26, ZEN.COM, Wero, Bancontact, MB WAY, Multibanco, eps, Apple Pay, Google Pay, Skrill | „Hide other payment methods” skuplja na samo karticu |
| Napojnica „Support 4fund.com team” | `input[type=range]` | – | **min 0, max 30, korak 5, zadano 20**; oznake 0 % i 30 % | tekst: nema obavezne naknade, zadano 20 %, „you can modify it as you wish” |
| Hide my details in the public list of donations | checkbox | – | isključeno | sekcija „Visibility of Your Data” |
| Hide the donation amount in the public list | checkbox | – | isključeno | – |
| Message to organiser | textarea `messageToOrganizer` | – | **300**, brojač „0/300” | – |
| Show message in the fundraiser comment section | checkbox | – | isključeno | poruka postaje komentar |
| Email notifications: About latest updates for this fundraiser | checkbox | – | isključeno | – |
| Email notifications: About latest news … directly in your inbox | checkbox | – | isključeno | marketinški pristanak, odvojen |
| E-mail, Donor | text | da | **prijavljenom popunjeno iz računa** | u sekciji „Summary” |

„Additional payment settings” je sklopiva sekcija („Expand section”/„Collapse section”) s objašnjenjem što sadrži.

## Sažetak

„Summary”: E-mail, Donor, „Total costs”: **Organiser will receive** €X · **Support for the 4fund.com team** €Y ·
**Total donation** €X+Y; gumb **„Donate €X+Y”**. Ispod: „4fund is operated by EU licensed payment service provider (PSP).”

## Napojnica na nuli

Povlačenje klizača na 0 % radi bez modala i bez dodatnog pitanja; oznaka iznad ručke postaje „0%”, a u sažetku se
uz „Support for the 4fund.com team” pojavi link **„(change)”**. Zadano je ipak 20 %, pa je 0 aktivna radnja
(UOKiK slučaj, odluka 7).

## „Donate as a company”

Na 4fundu **nije prikazano**. U konfiguraciji portala u HTML-u stranice stoji
`features.user.invoices.allowed_for_companies: false` i `user.type.organization: false`
(dohvat bez kolačića). To je funkcija Zrzutke.pl koja je na 4fundu isključena; polja (naziv, porezni broj) nisu viđena.

## „Donated by me” i potvrda

Kartica doniranog i njen „More” su u [08](08-moje-kampanje.md). PDF potvrda se ne preuzima (osobni podaci).

## Za nas

Polja preuzimamo polje po polje (odluka 6): valuta samo EUR, iznosi po kampanji, poruka 300 znakova, dvije
oznake skrivanja, odvojen marketinški pristanak. Plaćanje je jedan način (MPT intent: QR, IBAN, referenca), a
napojnica zaseban intent sa **zadanih 0** ili s ravnopravnim izborom bez zadanog (odluka 7). „Kao tvrtka”
radimo kao polje za R1 podatke (naziv, OIB) jer HR udruge to traže za knjiženje, s oznakom „faza 2”.
