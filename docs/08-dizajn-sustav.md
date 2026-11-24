# 08 — Dizajn sustav

Tokeni, komponente i žičani okviri za prototip (S4–S8). Vlastiti identitet (odluka 3): raspored ekrana smije biti
blizak 4fundu, ali boje, ilustracije, ikone i tekstovi su naši. Mobilno prvo (375 px), pa 768 i 1280 px.
Rute su u [07](07-rute.md). Odluke 305–308 i 311 u [decisions](decisions.md).

## 1. Brend: privremeno

Ime i brend odlučuje korisnik (vrata S3, vrh [S4](handoffs/S4.md)). Do odluke vrijedi **radno ime
`crowdfund.domovina.ai` i DOMOVINA paleta** (navy `#002F6C`, crvena `#FF0000`) (odluka 305). Zato je sustav
građen u dva sloja:

- **brend tokeni** (`--brand-*`) su jedino mjesto gdje stoje navy i crvena;
- **semantički tokeni** (`--action`, `--progress`, `--danger` …) pokazuju na brend tokene.

Promjena brenda = zamjena 6 brend tokena, logotipa i imena u `src/i18n/*`; nijedna komponenta ne zna za navy.

## 2. Tokeni

CSS varijable s **RGB kanalima** (`--brand-navy: 0 47 108`), ne hex, da Tailwind v4 modifikatori prozirnosti
(`bg-action/10`) rade. Pouka iz energy [09-dizajn-sustav](../../energy.domovina.ai/docs/09-dizajn-sustav.md) §4.
Samo svijetla tema u prototipu (odluka 306).

### 2.1 Boje

| Token | Vrijednost | Uloga |
|---|---|---|
| `--brand-navy` | `#002F6C` | primarna boja brenda |
| `--brand-navy-deep` | `#00224F` | hover/pritisnuto |
| `--brand-red` | `#FF0000` | akcent brenda, **samo dekor** (vidi kontrast) |
| `--brand-red-text` | `#C8102E` | crvena kad nosi tekst ili ikonu |
| `--paper` | `#FFFFFF` | pozadina |
| `--mist` | `#F3F5F9` | sekundarna ploha (kartice na sivom, trake) |
| `--line` | navy 14 % | rubovi, razdjelnici |
| `--ink` | `#0B1B33` | tekst |
| `--ink-soft` | `#3B4A61` | sekundarni tekst |
| `--ink-muted` | `#5B6678` | pomoćni tekst, metapodaci |
| `--success` | `#15693E` na `#E8F5EE` | uplaćeno, verificirano |
| `--warning` | `#8A5300` na `#FFF4DC` | čeka, ispod iznosa, prag verifikacije |
| `--danger` | `#B42318` na `#FDECEA` | greška, odbijeno, blokirano |
| `--action` | → `--brand-navy` | primarni gumb, poveznica, fokus |
| `--progress` | → `--brand-navy` | traka napretka |
| `--accent` | → `--brand-red` | tanka linija ispod logotipa, oznaka „uživo” (točka) |

**Kontrast** (WCAG 2.x, izračunato `node -e` formulom relativne svjetline, 24. 11. 2026.):

| Par | Omjer | Smije |
|---|---|---|
| navy na bijelom | 12,94 | sve |
| navy na `--mist` | 11,85 | sve |
| bijelo na navy-deep | 15,65 | sve |
| **crvena `#FF0000` na bijelom** | **4,00** | samo tekst ≥ 24 px ili ≥ 18,7 px bold, ikone, dekor; **nikad gumb s bijelim tekstom** |
| `#C8102E` na bijelom | 5,88 | sve |
| `--ink-muted` na bijelom / `--mist` | 5,81 / 5,32 | sve |
| `--success` na svojoj podlozi | 6,00 | sve |
| `--warning` na svojoj podlozi | 5,79 | sve |
| `--danger` na svojoj podlozi | 5,75 | sve |

Pravila (preuzeta iz energy §6 i prilagođena): nikad hex u komponenti; boja nikad nije jedini nosač značenja
(status ima i tekst ili ikonu); crvena nije boja greške (greška je `--danger`), da se brend i upozorenje ne miješaju.

### 2.2 Tipografija

| Token | Vrijednost |
|---|---|
| `--font-sans` | Inter (samohostan, `woff2`, podskup latin + latin-ext), pa `system-ui` |
| `--font-mono` | `ui-monospace` (IBAN, referenca, kratki kod) |
| brojke | `font-variant-numeric: tabular-nums` za iznose i postotke |

Ljestvica (px, `rem` u kodu): 12 · 14 · 16 (tijelo) · 18 · 20 · 24 · 30 · 36; naslov stranice
`clamp(1.5rem, 4vw, 2.25rem)`. Visina retka 1,5 za tijelo, 1,2 za naslove. Bez Google Fonts CDN-a (GDPR).

### 2.3 Razmaci, oblik, raspored

- Razmak: baza 4 px; koraci 1, 2, 3, 4, 6, 8, 12, 16 (= 4 … 64 px).
- Radijus: `sm` 6 px (polja, oznake), `md` 10 px (gumbi, kartice), `lg` 16 px (paneli, modal), `full` (avatar).
- Sjena: `card` (1 px rub + blaga sjena), `raised` (otvoren izbornik, ljepljiva traka).
- Prijelomi: `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Sadržaj najviše 1200 px; tekst opisa najviše 70 znakova.
- Dodirna meta ≥ 44 × 44 px; razmak između meta ≥ 8 px.
- Fokus: 2 px `--action` prsten s 2 px bijelog odmaka, uvijek vidljiv (`:focus-visible`).
- Pokret: 150–200 ms; `prefers-reduced-motion` gasi animacije (osim promjene stanja uplate, koja je tekst).

### 2.4 Ikone i slike

- Ikone: jedan skup linijskih ikona (Lucide, MIT), 20/24 px, `currentColor`. Bez emojija u sučelju (energy §6).
- 15 tema naslovnice (odluka 216) su **naše** ilustracije: geometrijske plohe u brend bojama + jedna ikona
  kategorije; generiraju se kao SVG, ne crtaju se po 4fundovim temama.
- Demo oznaka je dio dizajna: traka na vrhu („Prototip — uplate su testne”) i oznaka na svakoj kartici s `demo = 1`.

## 3. Komponente

Svaka komponenta je `.astro` (bez stanja) ili React otok (stanje). Stupac „Ekrani” su ekrani obilaska ([03](03-domenski-model.md),
„Pokrivenost ekrana obilaska”) i javne rute iz [07](07-rute.md).

### 3.1 Okvir i navigacija

| Komponenta | Vrsta | Opis | Ekrani / rute |
|---|---|---|---|
| `SiteHeader` | astro + otok izbornika | logo, „Kampanje”, „Organizacije”, „Pokreni kampanju”, prijava ili izbornik računa, jezik | sve |
| `AccountMenu` | otok | Moje kampanje, Moje donacije, Kasice, Postavke, organizacije (prebacivanje), Odjava | 08, 10 |
| `OrgSwitcher` | otok | organizacija u čije ime radim (GitHub uzor, odluka 150) | 08, 20 |
| `SiteFooter` | astro | statične stranice, impresum (ITalk), jezik | sve |
| `DemoBar` | astro | traka prototipa | sve |
| `LanguageSwitcher` | astro | hr/en, čuva put (`hreflang` par) | sve |
| `SettingsNav` | astro | bočni izbornik postavki (na mobitelu popis → stranica) | 10–18 |
| `ManageNav` | astro | kartice upravljanja kampanjom | `/hr/{id}/upravljanje/*` |
| `Breadcrumbs` | astro | samo u upravljanju i postavkama | 10–18 |
| `PhaseBadge` | astro | oznaka „nije u fazi 1” (odluka 8) | 23, kako-radi/za-druge, ponude |

### 3.2 Kampanja

| Komponenta | Vrsta | Opis | Ekrani / rute |
|---|---|---|---|
| `CampaignCard` | astro | naslovna slika ili tema, kategorija, naslov (2 retka), organizator + oznaka verifikacije, `ProgressBar`, iznos, % i dani do kraja; mjesečna: „€ mjesečno · € ukupno · podržavatelja” | katalog, naslovnica, profil, 08 |
| `ExternalCampaignCard` | astro | kao kartica + oznaka „na 4fundu”, bez našeg iznosa ako uvjeti ne dopuštaju | tok 9 |
| `ProgressBar` | astro | traka s `role="progressbar"`, iznad 100 % puna + tekst „premašen cilj” | kartica, stranica, kasica |
| `CampaignStats` | astro | prikupljeno, cilj, %, podržavatelja, dani; skrivanje po postavkama | 22 |
| `CampaignGallery` | otok | do 9 medija, `1/9`, video poveznica, swipe | 05, 22 |
| `CampaignHeader` | astro | naslov, organizator, oznake (verificirana namjena, za organizaciju, mjesečna, isključena) | 22 |
| `CampaignTabs` | astro | sidra Novosti · Opis · Kasice · Uplate · Komentari (s brojem) | 22 |
| `SupportBar` | astro | ljepljiva donja traka na mobitelu: „Podrži”, „Podijeli”; na desktopu bočni panel | 22 |
| `ShareSheet` | otok | kopiraj link (s `?ref=`), e-pošta, WhatsApp, Facebook, LinkedIn, QR | 16, 22 |
| `PromoTools` | astro | QR, plakat, widget, link za praćenje | pregled §4.4 |
| `UpdateList`, `UpdateItem` | astro | datum, tekst, slike, komentari na novosti | 22 |
| `ContributorList` | astro | „Najnovije / Najveće”, red: vrijeme, ime ili „Anonimno”, iznos ili „skriven” (ograničenje 10 u 03) | 22 |
| `CommentThread`, `CommentForm` | otok | ≤ 2.500 znakova, brojač, jedna razina odgovora, iznos uz komentar donatora, prijavi | 22 |
| `FollowButton` | otok | 3 prekidača (komentari, novosti, kraj); neprijavljeni: e-pošta | 19, 22 |
| `ReportForm` | astro | DSA: razlog, opis 50–500, privitak ≤ 20 MB, e-pošta, izjava | 22 |
| `MoneyboxCard` | astro | naslov, iznos, %, podržavatelja, autor | 22, 24 |
| `MoneyDestination` | astro | „Kamo ide novac”: Safe adresa (skraćena), potpisnici, 0 platformskih, poveznica na explorer, EMI | 09 |
| `PausedNotice`, `BlockedNotice` | astro | isključena (vidljiva, ne prima) i blokirana | 05-zivotni-ciklus |

### 3.3 Uplata

| Komponenta | Vrsta | Opis | Ekrani / rute |
|---|---|---|---|
| `CheckoutPanel` | otok | iznos (prijedlozi + svoj), min. iznos kampanje, ime ili anonimno, skrij iznos, poruka, e-pošta (neprijavljeni), „kao tvrtka”, privole, sažetak; samo EUR | 19, 25 |
| `AmountPicker` | otok | 4 prijedloga + polje, `inputmode="decimal"`, hr format | 19, 24, kasica |
| `TipPicker` | otok | 0 · 1 · 2 · 5 € · svoj; ništa unaprijed odabrano; „0” jednako velik i prvi (odluke 7, 207) | 19 |
| `QrPanel` | otok | QR (HUB3 za HR IBAN / EPC), IBAN, primatelj, referenca s kopiranjem, kratki kod; na desktopu QR, na mobitelu prvo „Otvori u bankarskoj aplikaciji” | 19, tok 4, 12 |
| `PaymentStatus` | otok | SSE: čeka → djelomično → uplaćeno → isteklo/odbijeno; tekst + ikona, `role="status"` | 19, tok 4 |
| `CheckoutSteps` | astro | 1 Podaci · 2 Uplata · 3 Napojnica · 4 Potvrda | 19 |
| `ReceiptCard` | astro | potvrda: iznos, kampanja, vrijeme, sid, poveznica na tx | 19 |
| `RecurringChoice` | otok | jednokratno / mjesečno (podsjetnik + QR ili trajni nalog) | 17, tok 10 |

### 3.4 Organizator

| Komponenta | Vrsta | Opis | Ekrani / rute |
|---|---|---|---|
| `WizardSteps` | astro | 5 koraka s natpisima, napredak, „Spremljeno lokalno / na računu” (odluka 152) | 03–07 |
| `TypePicker` | astro | 3 vrste kampanje kao velike radio kartice | 03 |
| `CategoryPicker` | astro | 8 kategorija, radio mreža s ikonama | 03 |
| `GoalFields` | otok | naslov ≤ 60 s brojačem, cilj, rok, organizacija (moja / za koju prikupljam) | 04 |
| `MediaUploader` | otok | do 9, redoslijed povlačenjem i tipkama, naslovna = prva, video URL, teme naslovnice | 05 |
| `RichTextEditor` | otok | opis s naslovima, popisima, poveznicama, slikama; provjera zabranjenih riječi | 06 |
| `CampaignPreview` | astro | kampanja kako će izgledati + popis što nedostaje + „Objavi” | 07 |
| `DashboardStats` | astro | brojke i graf po danu (SVG, bez knjižnice), izvori: kasice, linkovi, dijeljenje | upravljanje |
| `ContributionsTable` | astro | stupci: vrijeme, ime, e-pošta (samo U:viewer+), iznos, stanje, izvor; filtar, CSV | 08, financije |
| `RefundForm` | astro | odabrani doprinosi, Safe tx ili bankovna referenca, potvrda kodom | tok 11 |
| `ToggleRow` | astro | prekidač s opisom (postavke kampanje, profila, praćenja) | 12, 19, uredi |
| `VerificationStatus` | astro | stanje (nije pokrenuto, u pregledu, odobreno, odbijeno), pružatelj, što slijedi | 02, 15, 20, 26 |
| `DocumentUpload` | otok | dokazi namjene: vrsta, datoteka, opis | 15 |
| `ApplicationSteps` | astro | zahtjev organizacije, 5 koraka, „3 / 5” | 20, 26 |
| `MemberList`, `InviteForm` | otok | članovi s ulogom, promjena uloge, pozivnica (e-pošta + uloga, 7 dana) | odluka 150 |
| `ApprovalQueue` | astro | kampanje za organizaciju: autor, iznos, odobri / odbij s razlogom | 20 |
| `LinkTable` | astro | linkovi za praćenje: slug, posjeti, broj i iznos doprinosa, kopiraj, isključi | 16 |
| `MoneyboxForm` | astro | naslov ≤ 60, alias, cilj, opis s predloškom, pravila | 24 |
| `OfferForm` | astro | ponuda („nije u fazi 1”), uvjet verifikacije | 23 |
| `ExternalCampaignForm` | astro | 4fund URL, kod za opis, provjera vlasništva | tok 9 |

### 3.5 Račun i opće

| Komponenta | Vrsta | Opis | Ekrani / rute |
|---|---|---|---|
| `SignInForm` | astro | e-pošta → „pošalji kod” ili „pošalji poveznicu” | 01, 25 |
| `CodeInput` | otok | 6 znamenki, `autocomplete="one-time-code"`, lijepljenje, ponovno slanje nakon 60 s | 14, 25, 27 |
| `SignInMethods` | astro | popis načina prijave, dodaj/ukloni (zadnji se ne može ukloniti) | 13 |
| `LoginHistoryTable` | astro | vrijeme, uređaj, skraćena IP | 18 |
| `RecurringList` | astro | obećanja: kampanja, iznos, dan, stanje, pauza/otkaz | 17 |
| `DangerZone` | astro | brisanje računa / kampanje uz potvrdu kodom | 12, zatvori |
| `ContactForm` | astro | 10 tema, poruka, Turnstile | 21 |
| `FilterBar` | otok | katalog: pretraga, kategorija, vrsta, verificirano, kasice, završava; na mobitelu u ladici; zbroj aktivnih | katalog, 08 |
| `SortSelect` | astro | 7 redoslijeda kataloga (pregled §8.1) | katalog, 08 |
| `Pagination` | astro | stranice + „Učitaj još” (otok) | katalog |
| `EmptyState` | astro | ilustracija + jedna rečenica + radnja | sve liste |
| `Field`, `TextArea`, `Select`, `Checkbox`, `Radio`, `Switch` | astro | labela iznad, pomoć ispod, greška `--danger` s `aria-describedby`, brojač znakova | svi obrasci |
| `Button` | astro | `primary` (navy), `secondary` (rub), `ghost`, `danger`; veličine `md` 44 px, `lg` 52 px | sve |
| `Badge` | astro | status i oznake (verificirano, demo, faza 2, isključeno) | sve |
| `Alert`, `Toast` | astro / otok | info, uspjeh, upozorenje, greška | sve |
| `Modal`, `Drawer` | otok | `<dialog>`, zatvaranje Esc, fokus zarobljen; na mobitelu ladica odozdo | filtri, dijeljenje |
| `Avatar`, `OrgLogo` | astro | inicijali kad nema slike | profili |
| `CopyField` | otok | vrijednost + kopiraj (IBAN, referenca, link, kod widgeta) | 16, 19, widget |

**Pokrivenost:** svaki od 27 ekrana obilaska ima barem jednu komponentu u stupcu „Ekrani” (01, 25 `SignInForm`;
02 `VerificationStatus`; 03 `TypePicker`; 04 `GoalFields`; 05 `MediaUploader`; 06 `RichTextEditor`; 07
`CampaignPreview`; 08 `CampaignCard`, `FilterBar`; 09 `MoneyDestination`; 10 `SettingsNav`; 11, 12 `Field`,
`ToggleRow`, `DangerZone`; 13 `SignInMethods`; 14, 27 `CodeInput`; 15 `DocumentUpload`; 16 `LinkTable`; 17
`RecurringList`; 18 `LoginHistoryTable`; 19 `CheckoutPanel`, `QrPanel`, `TipPicker`; 20, 26 `ApplicationSteps`;
21 `ContactForm`; 22 `CampaignTabs`, `CommentThread`, `ReportForm`; 23 `OfferForm`; 24 `MoneyboxForm`).

## 4. Što se uzima iz postojećih repoa

Stack energyja je Next.js + React, mpt-landinga React; mi smo Astro s React otocima (odluka 5). React komponente
se prenose kao otoci, a one bez stanja postaju `.astro`. Kopija nosi izvorni repo i commit u zaglavlju (odluka 11).
Provjereno 24. 11. 2026. (energy `94335d7`, mpt-landing `cc4cff3`).

| Izvor | Postaje | Promjena |
|---|---|---|
| energy `components/project-card.tsx` (`ProgressBar`) | `ProgressBar`, `CampaignCard` | tokeni, `role="progressbar"`, mjesečna varijanta |
| energy `components/badges.tsx` (`StatusBadge`) | `Badge` | stanja kampanje i doprinosa iz [05](05-zivotni-ciklus.md) |
| energy `components/demo-bar.tsx` | `DemoBar` | tekst |
| energy `components/language-switcher.tsx` | `LanguageSwitcher` | prevedeni segmenti ruta (07) |
| energy `components/site-header.tsx`, `site-footer.tsx` | `SiteHeader`, `SiteFooter` | izbornik računa, organizacije |
| energy `components/registry-filters.tsx`, `registry-stats.tsx` | `FilterBar`, brojači naslovnice | filtri kataloga |
| energy `components/new-project-wizard.tsx` | `WizardSteps` i koraci | 5 koraka 4funda, lokalni nacrt |
| energy `components/contribute-flow.tsx` | `CheckoutPanel` | polja 4funda (19), napojnica kao zaseban korak |
| energy `components/money-flow-mermaid.tsx` | `MoneyDestination` (dijagram na `/hr/sigurnost`) | bez energetskih čvorova |
| mpt-landing `src/components/beta/intent-panel.tsx` (`IntentPanel`, `StageBanner`) | `QrPanel`, `PaymentStatus` | HUB3/EPC kartice, kratka referenca, stanja intenta |
| mpt-landing `src/components/beta/receipt-page.tsx` | `ReceiptCard`, `/potvrda` | bez energetskog teksta |
| mpt-landing `src/components/beta/my-receipts.tsx` | `/hr/moje/donacije` | izvor iz `contributions` umjesto lokalnog spremišta |
| mpt-landing `src/components/beta/verify-page.tsx` | ✗ u prototipu | provjera potvrde nije u paketu S5–S8 |

Tokeni se **ne** preuzimaju iz energyja (pinka cream/forest, odluka energyja 09 §1): crowdfund ima svoj brend.

## 5. Žičani okviri

Mobitel 375 px, osim gdje piše drugačije. `[ ]` gumb, `( )` radio, `[x]` kućica, `▓░` traka napretka.

### 5.1 Stranica kampanje `/hr/{id}`

```
┌─────────────────────────────────────┐
│ PROTOTIP · uplate su testne         │
│ ≡  crowdfund            HR  Prijava │
├─────────────────────────────────────┤
│ [      galerija 1/9      ]   ‹ ›    │
│ Kultura · id k7m2qp                 │
│ Obnova krova dvorane KUD-a          │
│ KUD Primjer ✓ verificirana udruga   │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  62 %            │
│ 6.240 € od 10.000 €                 │
│ 87 podržavatelja · još 23 dana      │
│ [ Prati ]  [ Podijeli ]  [ Kasica ] │
├─────────────────────────────────────┤
│ Novosti 2 · Opis · Kasice 3 ·       │
│ Uplate 87 · Komentari 12            │
├─────────────────────────────────────┤
│ Opis … [Pročitaj više]              │
│ Kamo ide novac → Safe udruge, 0     │
│ potpisnika platforme                │
│ Uplate: Najnovije | Najveće         │
│  2 h   Ana K.            50 €       │
│  5 h   Anonimno          skriven    │
├─────────────────────────────────────┤
│ [        Podrži kampanju        ]   │  ← ljepljivo
└─────────────────────────────────────┘
```

Desktop 1280: dva stupca, lijevo galerija + kartice sekcija, desno ljepljivi panel s brojkama i „Podrži”.

### 5.2 Checkout korak 1 `/hr/{id}/podrzi`

```
┌─────────────────────────────────────┐
│ ‹ Obnova krova dvorane KUD-a        │
│ 1 Podaci · 2 Uplata · 3 Napojnica   │
├─────────────────────────────────────┤
│ Iznos                               │
│ [ 10 € ][ 25 € ][ 50 € ][ 100 € ]   │
│ [ svoj iznos             € ]        │
│ Ime na popisu  [ Ana K.          ]  │
│ [ ] Podrži anonimno                 │
│ [ ] Sakrij iznos                    │
│ Poruka (neobavezno)  0/2500         │
│ [                               ]   │
│ E-pošta za potvrdu [            ]   │
│ [x] Prihvaćam uvjete                │
│ [ ] Prati kampanju                  │
├─────────────────────────────────────┤
│ Kampanji: 25,00 €                   │
│ Provizija platforme: 0 €            │
│ [       Nastavi na uplatu       ]   │
└─────────────────────────────────────┘
```

### 5.3 Checkout korak 2 `/hr/{id}/podrzi/{checkout}`

```
┌─────────────────────────────────────┐
│ 1 Podaci · 2 Uplata · 3 Napojnica   │
├─────────────────────────────────────┤
│ Uplatite 25,00 € s bilo koje banke  │
│ [ Otvori bankarsku aplikaciju ]     │
│ [ HUB3 | EPC ]                      │
│ ┌───────────┐                       │
│ │  QR kod   │                       │
│ └───────────┘                       │
│ IBAN      HR12 3456 …     [kopiraj] │
│ Primatelj KUD Primjer     [kopiraj] │
│ Referenca HR00 7Q4K…      [kopiraj] │
│ Upišite referencu točno.            │
├─────────────────────────────────────┤
│ ● Čekamo uplatu…                    │  ← PaymentStatus
│   (SEPA: do 1 radnog dana)          │
└─────────────────────────────────────┘
```

Stanje „uplaćeno” mijenja panel u zelenu potvrdu i vodi na korak 3.

### 5.4 Checkout korak 3, napojnica

```
┌─────────────────────────────────────┐
│ ✓ Uplata kampanji je primljena      │
├─────────────────────────────────────┤
│ Platforma ne uzima proviziju. Ako   │
│ želite, podržite njezin rad.        │
│ ( ) 0 €   ( ) 1 €   ( ) 2 €         │
│ ( ) 5 €   ( ) svoj iznos            │
│ [   Nastavi   ]                     │
└─────────────────────────────────────┘
```

Svi izbori iste veličine i boje, ništa unaprijed odabrano, „0 €” prvi; iznos > 0 otvara drugi QR (odluka 207).

### 5.5 Katalog `/hr/kampanje`

```
┌─────────────────────────────────────┐
│ [ Pretraži kampanje              ] │
│ [ Filtri (2) ]  [ Najviše novca ▾ ] │
│ Kultura ✕   Verificirane ✕          │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ [ slika ]                       │ │
│ │ Kultura                         │ │
│ │ Obnova krova dvorane KUD-a      │ │
│ │ KUD Primjer ✓                   │ │
│ │ ▓▓▓▓▓▓▓░░░  62 % · 6.240 €      │ │
│ │ još 23 dana                     │ │
│ └─────────────────────────────────┘ │
│ … (1 stupac; 2 na md; 3 na lg)      │
│ [ Učitaj još ]                      │
└─────────────────────────────────────┘
```

### 5.6 Čarobnjak, korak 2 `/hr/nova-kampanja/cilj`

```
┌─────────────────────────────────────┐
│ ‹ Natrag            Korak 2 od 5    │
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░░░                │
│ Spremljeno u ovom pregledniku       │
├─────────────────────────────────────┤
│ Naslov                     18/60    │
│ [ Obnova krova dvorane    ]         │
│ Cilj                                │
│ [ 10.000            € ]             │
│ Završava                            │
│ [ 31. 3. 2027.       ]              │
│ Tko prikuplja                       │
│ (•) KUD Primjer (moja organizacija) │
│ ( ) Za drugu organizaciju …         │
├─────────────────────────────────────┤
│ [          Sljedeći korak       ]   │
└─────────────────────────────────────┘
```

### 5.7 Članovi organizacije `/hr/o/{slug}/clanovi`

```
┌─────────────────────────────────────┐
│ KUD Primjer · Članovi               │
├─────────────────────────────────────┤
│ (AK) Ana K.        owner      ⋯     │
│ (MP) Marko P.      admin   [ ▾ ]    │
│ (IV) Iva V.        editor  [ ▾ ]    │
│ Pozivnice na čekanju                │
│ ivan@… · viewer · još 5 dana  [✕]   │
├─────────────────────────────────────┤
│ Pozovi člana                        │
│ [ e-pošta         ] [ editor ▾ ]    │
│ [ Pošalji pozivnicu ]               │
│ Promjena uloge traži kod e-poštom.  │
└─────────────────────────────────────┘
```

### 5.8 Kamo ide novac `/hr/{id}/upravljanje/novac`

```
┌─────────────────────────────────────┐
│ Kamo ide novac                      │
├─────────────────────────────────────┤
│ Uplate idu izravno na račun udruge. │
│ Platforma ne drži novac i nema      │
│ isplatu.                            │
│ Safe udruge   0x7a3…c91   [explorer]│
│ Potpisnici    2 od 3 (udruga)       │
│ Platforma     0 potpisnika          │
│ Pružatelj     Monerium (EMI)        │
│ KYB           ✓ odobren             │
│ Na računu     6.240,00 €            │
└─────────────────────────────────────┘
```

## 6. Ime i brend: prijedlozi (vrata)

Dostupnost provjerena 24. 11. 2026. `whois` (`whois.dns.hr`, `whois.eu`, verisign) i `dig NS`; **ništa nije
kupljeno ni rezervirano**, a provjera žiga (DZIV, EUIPO) nije rađena.

| # | Ime | `.hr` | `.eu` | `.com` | Zašto |
|---|---|---|---|---|---|
| a | **Skupimo** | slobodna | slobodna | zauzeta (2026-08) | glagol u 1. l. množine, poziv na zajedničku akciju; kratko |
| b | **Doprinos** | slobodna | slobodna | slobodna | točno ime za ono što podržavatelj radi (copy pravilo „doprinosi”), ozbiljno |
| c | **Darujmo** | slobodna | slobodna | zauzeta (Cloudflare NS) | toplo, humanitarno; manje prikladno za kulturu i projekte |
| d | **Podrži** | slobodna | slobodna | zauzeta | isto kao glavni gumb; bez dijakritika u domeni `podrzi.hr` |
| e | radno ime **crowdfund.domovina.ai** | — | — | — | bez troška, u obitelji `*.domovina.ai`; engleska riječ |

Zauzeto i odbačeno: `pomozimo.hr`, `sloga.hr`.
