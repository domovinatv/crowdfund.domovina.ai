# Obilazak 4funda: polja po ekranu i domenski entiteti (24. 11. 2026.)

Ulaz za specifikaciju domenskog modela. Izvori: 27 ekrana `docs/research/obilazak/01–27`, javni pregled
`2026-11-24-4fund-javni-pregled.md` §2–§12 (dalje „JP §n”) i `forfund-route-templates.txt`.
Labele i vrijednosti opcija su **doslovne** (engleski, kako ih 4fund prikazuje). Ograničenja su ona viđena
na klijentu (HTML5 `maxlength`/`required`, brojači). Poslužiteljska validacija nije viđena: nijedan
obrazac nije poslan, osim company applicationa (26). Osobni podaci nisu zapisani.

Oznake: **R** = obavezno, „–” = nije viđeno ili nije zadano, `ime` = ime polja u HTML-u.

## 1. Ekran → entiteti → ključna polja

| # | ekran | entiteti | ključna polja i ograničenja |
|---|---|---|---|
| 01 | Registracija `/sign-up/user-data` | user, auth_identity*, consent*, verification(email) | `email` R email · `password` R (≥ 8, ≥ 1 veliko, ≥ 1 malo, ≥ 1 znamenka ili poseban znak) · `acceptTermsAndPrivacyPolicy` R · `subscribeNewsletter` opc. · `captcha` skriven · OAuth Facebook/Google · ulaz „company/organisation” → 20 · s `?company-application-chosen=1` labela „Your company/organisation e-mail” (26) |
| 02 | Verifikacija računa `/settings/verification/*` | verification(person_kyc), user | koraci: Create password → Account type (natural person / company) → Your data → (Onfido). Polja: `firstName` R ≤ 100 · `lastName` R ≤ 100 · `citizenship` R (194 države) · `country` (rođenja) R (194) · `birthDate` R date · `haveNationalIdentificationNumber` (zadano off) + `nationalIdentificationNumber` uvjetno ≤ 11 · `residenceCountry` R (30 EGP) · `identityDocumentType` R, zadano „ID Card” · `identityCardNumber` R · `identityCardExpirationDate` R + `…Unlimited` · `street` R ≤ 100 · `houseNumber` R ≤ 10 · `apartmentNumber` ≤ 10 · `postalCode` R ≤ 20 · `city` R ≤ 100 · `isPoliticallyExposedPerson` R radio · `pepOption` (3) · izjava o kaznenoj odgovornosti R uz PEP |
| 03 | Čarobnjak: tip | campaign_draft, campaign, category | tip R (3 kartice) · namjena R za one-time/recurring (8 čipova), skrivena za organisation · modal postojećeg nacrta „Start anew” / „Back to edit” |
| 04 | Čarobnjak: naslov i cilj | campaign_draft, campaign, organization (Fixed Beneficiary) | naslov R ≤ **60** (brojač n/60; 3 znaka prihvaćena) · „Total Amount” EUR R (one-time, organisation; „1” prihvaćen) · „Monthly target (optional)” (recurring) · „Chosen organisation” R autocomplete (samo organisation) · AI „Improve” (4 prijedloga, Cancel/Replace) |
| 05 | Čarobnjak: mediji | media, cover_theme | galerija ≤ **9** foto/video, preporuka ≥ 750 × 420 px, prva = profilna · „Choose cover” 1 od 15 · treba cover **ili** foto |
| 06 | Čarobnjak: opis | campaign | opis R rich text (Quill), **min. 50 znakova**; alati bold, italic, link, slika, video, poravnanje L/C/D, emoji · Publish moguć odavde |
| 07 | Čarobnjak: pregled | campaign, user (verification status) | prikaz naslova, organizatora + „Profile unverified”, cover/foto, opis; nema roka, lokacije, vidljivosti (to je „Edit”, nije viđen) |
| 08 | My fundraisers | campaign, contribution, moneybox, tracking_link | kartice Created by me / Donated by me / Donation boxes · filtri **Active / Disabled / Deleted** · 8 redoslijeda (§2.campaign) · kartica donacije: Verified, naslov, organizator, Created, Ends in, Goal, Your donation (iznos, datum), More: Open / Create a widget / Create a tracking link / Check and manage your donations |
| 09 | Isplata (neverificiran) | withdrawal* (nije naš), verification | samo poruka „you have to complete verification process” |
| 10 | Postavke: Edit details | user (profil) | Photo file · Name ≤ 255 · Surname ≤ 255 · About me textarea ≤ **3500** (zaključano do verifikacije) · E-mail samo prikaz · Website ≤ 255 (zaključano) · bočni izbornik 11 stavki |
| 11 | Postavke: telefon | user (phone) | dodavanje telefona traži verifikaciju |
| 12 | Postavke: profil | user_settings/profile_visibility, consent, user (brisanje) | 9 prekidača „Show in my public profile” + tutorial · `indexable` · `newsletter` · spremanje odmah · „Delete account” |
| 13 | Postavke: lozinka | user (credential) | Old password, New password (pravila kao 01) |
| 14 | Postavke: limiti i autentikacija | user_settings, sensitive_action_code | `additionalAuthorizationMethod` R: SMS message / Email message (6 znamenki) · `dailyWithdrawalLimit`: No limit / 100 / 500 / 1000 / 5000 / 10000 € · single payout limit 20.000 € (tekst) · `isDailyWithdrawalNotification` · `dailyWithdrawalNotificationAbove`: 100 / 500 / 1000 / 5000 / 10000 € |
| 15 | Postavke: verify fundraisers | verification(campaign_purpose), media(document) | obrazac tek uz kampanju (nije viđen); pravilo: nakon „verified” naslov i opis zaključani; dokumenti tek nakon KYC-a |
| 16 | Postavke: tracking / shared links | tracking_link, share_link | dva popisa: ručni (`/settings/reflinks`) i automatski („Shares”, `/settings/auto-reflinks`) |
| 17 | Postavke: recurring donations | recurring_pledge | popis podržavateljevih ponavljajućih donacija (prazno) |
| 18 | Postavke: login history | login_event | stupci Logged in date · Last activity date · IP address · Device |
| 19 | Checkout `/{id}/pay` | contribution, tip, consent, notification (observe), comment | valuta R (11, zadano EUR) · iznos R (predlošci + „Other amount”, zadano 100 „Most popular”) · `Your amount` · način plaćanja R (12) · napojnica range **0–30, korak 5, zadano 20** · 2× hide (off) · `messageToOrganizer` ≤ **300** · „Show message in comment section” (off) · 2× e-mail privola (off) · E-mail R, Donor · neprijavljen: First/Last name opc., „Donate as a company” → „Company name (Optional)”, Accept Terms + Privacy R · sažetak Organiser will receive / Support for team / Total donation |
| 20 | Company application koraci | organization, verification(org_kyb), user | 5 koraka (§3) · brojač „n / 5 steps completed” |
| 21 | Kontakt `/contact` | contact_message | `name` R · `email` R · `topic` R (10, zadano „Choose”) · `content` R textarea (bez limita) · reCAPTCHA · bez privitka |
| 22 | Kampanja: observe, report, komentari | observe, report, comment, contribution (popis), campaign_update, moneybox, translation* | Observe 3 prekidača (off) · Report: opis R **50–500** · telefon (pozivni ~45 zemalja, zadano +44) opc. · privitak jpg/jpeg/pdf/png ≤ **20 MB** opc. · GDPR pristanak R · komentar + Reply/Share · tabovi Updates/Description/Donation boxes/Donations/Comments · donacije Latest/Highest |
| 23 | Ponude: odabir kampanje, Founder's Offer | offer, campaign (`allow_external_offers`), verification | kartice Your fundraisers / Fundraisers from other organisers · pretraga · 6 sortova · Select → `/{id}#offers` · neverificiran → modal „Offers” · komentar `comment_create[body]` R ≤ **2500** |
| 24 | Kasica `/{id}/add-moneybox` | moneybox, consent | `title` R ≤ **60** · `alias` R (prefiks `4fund.com/s/`, predložen) · `amountToCollect` opc. EUR · `cover` opc. · `content` (predložak) · `acceptRules` R · `paymentNotifications` (zadano **on**) · `enablePaymentSuccessMessage` (off) → `paymentSuccessMessage` |
| 25 | Anonimni: prijava, kod, reset, nacrt | user, auth_identity*, login_code*, campaign_draft | Sign in modal: Facebook / Google / „Send login code to email” / Email + Password · reset lozinke (ne otkriva postojanje računa) · nacrt u `localStorage` `sbs-fundraiserState` |
| 26 | Company application: obrazac i poslano | organization, verification(org_kyb), consent | `companyName` R · `companyWebsite` R · `companyLegalForm` R (slobodan tekst) · `companyDescription` R · `projectDescription` R · `paymentsNumber`: 1-10 / 11-100 / 101-1000 / >1000 · `country` (EU/EGP, zadano iz računa) · `contactEmail` R zaključan · `socialMediaLinks[n]` R (prvi), više · uvjeti R · newsletter · gumb „Send message” |
| 27 | Isplata: dodatna autorizacija | sensitive_action_code | `/safety/additional-authorization/{token}` · „Enter code number 1” · 6-znamenkasti kod e-poštom · Verify · kod se šalje pri otvaranju ekrana |

\* Novi entiteti, obrazloženi u §2.

## 2. Entiteti: konsolidirana polja

Imena entiteta su naša. Stupac „izvor” su brojevi ekrana ili JP §.

### user

| polje | ograničenje / vrijednosti | izvor |
|---|---|---|
| email | R, email; promjena samo preko podrške | 01, 10, JP §2.2 |
| password_hash | opc. (OAuth račun nema lozinku); pravila: ≥ 8, veliko, malo, znamenka ili poseban znak | 01, 02, 13 |
| first_name, last_name | ≤ 255 u postavkama; ≤ 100 u KYC-u | 10, 02 |
| avatar | file | 10 |
| about_me | ≤ 3500; uređivo tek uz verified | 10 |
| website | ≤ 255; uređivo tek uz verified | 10 |
| phone | dodaje se tek uz verified; služi SMS kodu | 11, 14 |
| country (boravka) | javno uz ime | JP §2.2 |
| is_verified | izvedeno iz verification(person_kyc) | 02, 07, 19 |
| account_type | person / company (company iz company applicationa) | 02, 20, 26 |
| registered_at | javno ako je uključeno | 12 |
| deleted_at | brisanje gasi kampanje i verifikacije; kod 4funda saldo mora biti 0 | 12, JP §6 |

Pravila: jedna osoba = jedan račun, nema prijenosa (JP §2.2); organizator kampanje se ne mijenja.

### auth_identity (novo)

Opravdanje: račun otvoren Googleom nema lozinku (01, 02) i prijava ima tri puta (lozinka, OAuth, kod
e-poštom; 25). Polja: user_id, provider (`password` / `google` / `facebook` / `email_code`), subject, created_at.

### consent (novo)

Opravdanje: na pet ekrana postoje odvojene privole s različitim pravnim osnovama, a newsletter je uvijek zaseban.

| vrsta | gdje | zadano |
|---|---|---|
| terms_and_privacy | 01 R, 19 R (samo neprijavljen), 26 R | off |
| newsletter / marketing | 01, 12 `newsletter`, 19 („latest news … inbox”), 26 | off |
| moneybox_rules | 24 `acceptRules` R | off |
| report_gdpr (čl. 6(1)(c)) | 22 R | off |
| pep_criminal_liability | 02 R uz „I am a PEP” | off |

### verification

Jedan entitet s `kind`, jer sva tri imaju dokumente, stanje i blokiraju radnje.

| polje | vrijednosti | izvor |
|---|---|---|
| kind | `person_kyc` / `org_kyb` / `campaign_purpose` (+ `email` potvrda kodom, JP §2.2) | 02, 15, 20 |
| subject | user / organization / campaign | – |
| status | vidi §3 | 02, 07, 19, 26 |
| provider_ref | Onfido kod 4funda; kod nas EMI | 02, JP §2.3 |
| locked_after_save | podaci KYC-a se nakon spremanja ne mijenjaju | JP §2.3 |

`person_kyc` podaci (02): first_name R ≤ 100, last_name R ≤ 100, citizenship R (194), birth_country R (194),
birth_date R, national_id_number uvjetno ≤ 11 (PESEL; kod nas OIB), has_national_id (zadano off),
residence_country R (30 EGP: EU + IS, LI, NO), id_document_type R ∈ {ID Card (zadano), Passport, Passport Card
(Ireland), Residence Card, Polish temporary ID}, id_document_number R, id_document_expiry R ili
`unlimited`, street R ≤ 100, house_number R ≤ 10, apartment_number ≤ 10, postal_code R ≤ 20, city R ≤ 100,
is_pep R ∈ {I am not a PEP, I am a PEP}, pep_option ∈ {sam PEP, član obitelji PEP-a, bliski suradnik PEP-a},
pep_liability_ack R uz PEP. Uvjet: ≥ 18 godina (JP §2.3).

`campaign_purpose` (15, JP §9): dokumenti JPG/JPEG/GIF/PDF/PNG ≤ 20 MB, ≤ 10 po slanju; vrsta: medicinski
(organizator / osoba na skrbi / druga osoba) ili ostali; rok za dokumente 14 dana; pregled ≤ 2 radna dana;
obavezno iznad 5.000 € (kampanja) ili 12.500 € (organizator), nakon prijave ili po riziku; nakon „verified”
naslov, opis i cilj zaključani; ne može se odustati; dokumenti tek nakon person_kyc.

`org_kyb`: vidi organization_application.

### organization

| polje | ograničenje | izvor |
|---|---|---|
| name | R | 26 `companyName` |
| website | R | 26 |
| legal_form | R, slobodan tekst (kod nas enum: udruga, d.o.o., zaklada…) | 26 |
| description | R, bez limita | 26 |
| country | EU/EGP | 26 |
| contact_email | R, = e-pošta računa | 26 |
| social_links[] | ≥ 1 | 26 |
| logo | prikaz u autocompleteu | 04 |
| is_fixed_beneficiary | bool; tek nakon koraka 5 | 20, JP §2.4 |
| profile slug | `/profile/{id}` (16 znakova), `/o/{org}` | JP §2.5, rute |
| category (katalog) | All, Charity, Projects, Needs, Sport, Culture, Animals, Travel | JP §3.2 |

### organization_application (novo, ili `verification(org_kyb)` s podacima)

Opravdanje: zahtjev ima polja koja nisu svojstva organizacije (projekt, procjena volumena) i vlastiti tok
od 5 koraka. Polja: project_description R, payments_number ∈ {1-10, 11-100, 101-1000, >1000},
steps (§3), submitted_at, status. Izvor 20, 26.

### membership

Na 4fundu nije viđena: račun organizacije = jedan zastupnik (verificiran kao osoba, 20 korak 2). JP §2.4
spominje punomoć zaposleniku kao dokument. Kod nas uvodimo (odluka 150): user_id, organization_id, role.

### campaign

| polje | ograničenje / vrijednosti | izvor |
|---|---|---|
| public_id | 6 znakova, URL `/{id}` | JP §4.3 |
| type | `default` „One-time fundraiser” / `recurring` „Recurring fundraiser” / `patronized` „Fundraiser for organisation”; mijenja samo podrška | 03, JP §3.1 |
| category | R za default/recurring (8, vidi category) | 03 |
| beneficiary_organization_id | R za patronized (Fixed Beneficiary) | 04 |
| title | R, ≤ 60 | 04 |
| goal_amount_eur | R za default/patronized; opc. „Monthly target” za recurring | 04 |
| description | R, rich text, min. 50 znakova; > 35.000 € traži troškovnik | 06, JP §4.1 |
| cover_theme / media | cover ili ≥ 1 foto | 05 |
| end_date | samo u „Edit”; nakon datuma kampanja ostaje aktivna | 07, JP §4.5 |
| location | „Edit”: pretraga ili pin | JP §4.2 |
| min_amount_eur | ≥ 1 | JP §4.2 |
| amount_presets[] | po kampanji; one-time 1000/500/300/100/70/50/20 (100 popular); recurring 200/100/50/30/20/10/5 (30 popular) | 19, JP §5 |
| indexable | katalog + tražilice | JP §4.2 |
| hide_amounts, hide_donor_count | bool | JP §4.2 |
| donations_sort / hide_amounts / hide_names / allow_recurring | postavke popisa donacija | JP §4.2 |
| comments_mode | isključeni / samo donatori / svi | JP §4.2 |
| thank_you_message | personalizirana zahvala | JP §4.2 |
| allow_moneyboxes, allow_external_offers | bool; „public” status pristupa za tuđe ponude | 23, JP §4.2 |
| donation_notifications | bool | JP §4.2 |
| purpose_verified | oznaka „Verified” | 08, 22 |
| status | vidi §3 | 08, JP §4.5 |
| created_at, ends_in | prikaz na karticama | 08, 23 |

Sort u „My fundraisers” (08): Oldest, Newest, Least collected, Most collected, Least payments, Most payments,
Smallest amount available for withdrawal, Largest amount available for withdrawal.
Filtri u „My fundraisers”: Active / Disabled / Deleted.
Sort pri odabiru za ponudu (23): Most donated, Least donated, Newest, Oldest, Last updated, Most accurate.
Sort kataloga (JP §8.1): Popular Today, Most Funds (zadano), Least Funds, Newest, Oldest, Ending Soon, Based on
Latest Updates. Filtri kataloga: `term`, `categories`, `countries`, `recurring`, `patronized`, `awarded`,
`chipBox`, `verified`, `ongoing`, `ending`, `successful`, `almostSuccessful`, `dateCreated`, `gathered`,
`paidIn`, `glat`/`glng`/`radius` (zadano 10), `sort`, `page`.

### category

Pri stvaranju (03): **Charity, Culture, Projects, Needs, Sport, Animals, Travels, Other** (8, bez potkategorija).
Katalog organizacija (JP §3.2): All, Charity, Projects, Needs, Sport, Culture, Animals, Travel (bez Other;
„Travel” ≠ „Travels”). Marketinške namjene (nisu enum u modelu): Project, Gift, Medical Treatment, Animals,
Your Idea, Fire.

### media

campaign_id, kind (photo / video; video samo URL YouTube/Vimeo, JP §4.1), position (0 = profilna), file/url.
≤ 9 po kampanji, preporuka ≥ 750 × 420 px (≈ 16:9); upload, crop, rotacija, redoslijed (JP §4.2). Izvor 05.
Ista tablica može nositi privitke prijave (22) i dokumente verifikacije (15) uz `purpose`.

### cover_theme

Statički enum od 15 (05): Birthday, Charity, General, Dream, Event, Gift, In Memory, Needs, Animals, Project,
Repairs, School, Sports, Travel, Treatment. Kod nas vlastite ilustracije.

### campaign_draft

Izvor 03, 25. Ključ `localStorage` `sbs-fundraiserState`, polja: `entryUrl`, `fundraiserType`, `fundraiserTitle`,
`fundraiserGoal`, `fundraiserContent` (HTML), `fundraiserFiles[]`, `fundraiserCover`, `fundraiserCategory`,
`uuid`, `hasVisitedAddMedia`, `redirectedToLogin`, `saveFundraiserInitiated`, `isImageUploadingInDescription`.
Jedan nacrt po pregledniku; „Start anew” briše sve. Wizard koraci: Choose fundraiser type → Enter title and
goal → Add photos or videos → Add fundraiser description → Fundraiser preview.

### campaign_update

campaign_id, created_at, body (tekst, slike, video), comments. Tab „Updates (n)” (22, JP §4.3). Obrazac nije viđen.

### comment

| polje | ograničenje | izvor |
|---|---|---|
| body | R, ≤ 2500 (`comment_create[body]`) | 23, JP §4.3 |
| parent_id | odgovori (organizatorovi ugniježđeni); „Reply”, „Share” | 22 |
| target | campaign ili campaign_update | JP §11 |
| contribution_id | poruka iz checkouta (≤ 300) postaje komentar, prikazuje iznos | 19 |
| author / anonymous | „Anonymous user” | JP §4.3 |
| moderation | skrivanje (organizator), automatsko brisanje vulgarizama i linkova; odluka ≤ 14 dana, žalba 14 dana | 22, JP §9 |

### contribution

| polje | vrijednosti | izvor |
|---|---|---|
| campaign_id, moneybox_id?, tracking_link_id?, offer_id? | atribucija | 19, JP §11 |
| amount | > 0; minimum kampanje, globalno 1 € | 19, JP §5 |
| currency | EUR, USD, GBP, PLN, CHF, CZK, NOK, SEK, DKK, RON, HUF (+ „Show all”); kod nas samo EUR | 19 |
| payment_method | Visa/Mastercard, Revolut, N26, ZEN.COM, Wero, Bancontact, MB WAY, Multibanco, eps, Apple Pay, Google Pay, Skrill (12); kod nas MPT intent | 19 |
| frequency | Single / Recurring (samo recurring kampanja) | JP §5 |
| type | `single` (API), kupnja ponude, kasica, recurring | JP §10 |
| email | R | 19 |
| donor_name | prijavljen: iz računa; neprijavljen: First/Last name opc. | 19 |
| as_company, company_name | „Donate as a company” → samo „Company name (Optional)” | 19 |
| hide_identity, hide_amount | bool, zadano off | 19 |
| message_to_organizer | ≤ 300 | 19 |
| show_message_as_comment | bool, off | 19 |
| notify_updates | bool, off (= observe „News from the Organiser”) | 19 |
| created_at | – | 08 |

Prikaz na kampanji: sort Latest / Highest, „Hidden data”, „hidden” (22, JP §4.3). Potvrda: PDF u „Donated by me”.

### tip

Zaseban iznos uz contribution: slider `input[type=range]` min 0, max 30, korak 5, **zadano 20 %**; na 0 se u
sažetku pojavi „(change)”; recurring se ponavlja (19, JP §5). Kod nas zaseban intent, zadano 0 (odluka 7).
4fund ima i napojnicu pri isplati (checkbox) – kod nas ne postoji.

### moneybox

| polje | ograničenje | izvor |
|---|---|---|
| campaign_id | tuđa ili vlastita kampanja | 24 |
| owner_user_id | ne treba verifikaciju | JP §2.1 |
| title | R ≤ 60 | 24 |
| alias | R, `/s/{alias}`, predložen | 24 |
| goal_amount | opc. EUR | 24 |
| cover | opc. file | 24 |
| description | predložak | 24 |
| payment_notifications | zadano on | 24 |
| thank_you_enabled / thank_you_message | off / tekst | 24 |
| status | Active / Disabled / Deleted (08); briše se s kampanjom | 08, JP §4.5 |

### tracking_link

campaign_id, owner_user_id, slug (`/z/{slug}`, vlastiti ili „Random”), statistika `/z/{slug}+` (posjeti,
broj i iznos donacija), atribucija 30 dana, posjet jednom u 10 min. Stvara ga i donator (08 „Create a tracking
link”). Izvor 08, 16, JP §4.4.

### share_link (auto reflink)

Automatski link po korisniku i kampanji kad korisnik dijeli; popis „Shares” s učinkom. Kanali dijeljenja:
Facebook, LinkedIn, Twitter, Messenger, e-mail, copy (JP §4.4). Izvor 16.

### offer, offer_bid

offer (JP §3.3, 23): campaign_id, seller_user_id (organizator ili Founder; Founder mora biti verificiran),
title, description, category/subcategory (~15), condition (new / used), images, mode (Buy now / Auction),
price (min. donacija), quantity, duration, delivery (osobno / pošta / e-mail), digital attachments,
phone, seller TIN + adresa (DAC7), founder_status (organizator prihvaća/odbija). Obrazac **nije viđen**.
offer_bid: offer_id, user_id, amount; ≥ 2.500 € samo verificirani; ne povlači se; pobjednik 24 h.
Katalog ponuda sort: Popular, Most expensive, Cheapest, Newest, Oldest.

### tier, recurring_pledge

tier (JP §3.3): campaign_id (recurring), title, amount, description; postovi „za svaku razinu” / „za ovu i više”;
pristup dok traje pretplata + 32 dana; ne briše se nakon prve kupnje. Nije viđen.
recurring_pledge (17, JP §5): user_id (prijava obavezna), campaign_id, tier_id?, amount, tip (ponavlja se),
status, otkaz iz „Settings → Recurring donations”. Neuspjela naplata: preskok ili 3 pokušaja.

### report (abuse)

| polje | ograničenje | izvor |
|---|---|---|
| campaign_id | gumb na svakoj kampanji | 22 |
| description | R, 50–500 | 22 |
| phone_country_code + phone | opc., ~45 europskih, zadano +44 | 22 |
| attachment | opc., jpg/jpeg/pdf/png ≤ 20 MB | 22 |
| gdpr_consent | R | 22 |
| reporter | prijavljen (anonimno nije provjereno) | 22 |

Posljedice (JP §9): ozbiljna prijava → verifikacija + blokada isplata; odluka ≤ 14 dana i obavijest.

### observe / follow

user_id, campaign_id, `new_comments`, `organiser_news`, `fundraiser_end` (sva zadano off), „Save changes”. Izvor 22.

### external_campaign

Na ekranima nije viđen ovakav entitet. Najbliže: „Fundraisers from other organisers” (23) su obične kampanje
s `allow_external_offers` = public, pa im ne treba zaseban entitet. Ako se misli na kampanju za drugu osobu
(beneficiary ≠ organizator), to je atribut kampanje + suglasnost korisnika (JP §3.2).

### refund

contribution_id, amount, fee 0,50 € (tko plaća: organizator / donator), način „Return selected” ili cijeli
saldo, redoslijed od najnovije uplate (JP §6). Nije viđen na ekranu. Kod nas: novac ne držimo, povrat je
zahtjev prema organizatoru.

### contact_message

name R, email R, topic R, content R (bez limita), captcha, bez privitka (21). Topic (10): Account
verification · Fundraiser verification · Email address change · Bank account change · Account or withdrawal
blockage · Reporting abuse · Auctions, offers · Fundraiser promotion · Report suggestion · Other (zadano „Choose”).

### login_event

user_id, logged_in_at, last_activity_at, ip_address, device (18).

### user_settings / profile_visibility

| polje | zadano (viđeni račun) | izvor |
|---|---|---|
| show_email (`email`) | off | 12 |
| show_avatar (`avatar`) | on | 12 |
| show_phone (`phone`) | off | 12 |
| show_total_raised (`amountGathered`) | off | 12 |
| show_registered_date (`dateRegistered`) | on | 12 |
| show_promoted (`chipins`) | on | 12 |
| show_owned (`chipinsPrivate`) | on | 12 |
| show_donated (`chipinsParticipated`) | on | 12 |
| show_on_behalf_of_org (`chipinsUnderPatronage`) | on | 12 |
| tutorials[] (`tutorialType`: Fundraiser edit) | off | 12 |
| indexable | učinak tek uz verified | 12 |
| newsletter | – | 12 |
| additional_authorization_method | R: SMS message / Email message | 14 |
| daily_withdrawal_limit | No limit / 100 / 500 / 1000 / 5000 / 10000 € | 14 |
| sms_high_payout_notification + threshold | 100 / 500 / 1000 / 5000 / 10000 € | 14 |

Spremanje odmah, bez „Save” (12).

### sensitive_action_code (step-up)

user_id, action (withdraw…), channel (email / sms), code 6 znamenki, valjanost 5 min (JP §2.2), sequence
(„code number 1”, moguć drugi), token u URL-u `/safety/additional-authorization/{token}`, sent_at (4fund šalje
pri otvaranju). Izvor 14, 27. SCA i za trusted recipient, povrate, povijest isplata (JP §6).

### login_code (novo; ili ista tablica sa sensitive_action_code, `purpose = login`)

„Send login code to email” (25) i potvrda e-pošte brojčanim kodom (JP §2.2). email, code, expires_at.

### notification

Kanali viđeni: e-mail i SMS. Izvori postavki: observe (22), checkout „latest updates” (19), moneybox
`paymentNotifications` (24), kampanja „obavijesti o novim donacijama” (JP §4.2), SMS za visoke isplate (14),
upozorenje na nadmašenu licitaciju i 1 h prije kraja (JP §3.3). „Manage notifications” je po kampanji (12).
Obrazac obavijesti vlastite kampanje („More → Notifications”, 08) nije viđen.

## 3. Stanja i statusne riječi

| entitet | stanja (doslovno gdje je viđeno) | izvor |
|---|---|---|
| user / verifikacija osobe | „Profile unverified” · „Profile verified” · „Verified”; koraci Create password · Account type · Your data · Your saved data · Upload documents · Apply for company account (+ „Apply for a fixed beneficiary account”); nakon spremanja provjera (automatski „u nekoliko minuta” ili ručno) | 02, 07, 19, 26, JP §2.3 |
| verifikacija osobe (JP) | razlozi odbijanja: nepodudaranje, istekli/nepodržan dokument, loša slika/video; „30 dana” aktivne kampanje nakon obrasca (nesklad izvora) | JP §2.3 |
| company application | koraci 1 Sign Up · 2 Verification · 3 Company form · 4 Completing of the process · 5 Become a Fixed Beneficiary* (*Optional); stanja koraka „Completed” / „Go to verification” / zaključano / bez radnje; brojač „1 / 5”, „3 / 5 steps completed”; poruka „Your request has been sent. Please wait for information about the next steps.”; ručni pregled ~2 radna dana | 20, 26, JP §2.4 |
| campaign (My fundraisers) | **Active / Disabled / Deleted**; brojač „Active fundraisers n” | 08 |
| campaign (životni ciklus) | nacrt · čeka odobrenje organizacije (patronized; odbijanje = brisanje) · aktivna · nakon roka i dalje aktivna („Ends in” nestaje) · neindeksirana/privatna · isplate blokirane · privremeno blokirana · isključena („Turn off”, vraća se) · obrisana (nepovratno, s kasicama) · zaustavljena uz povrat | JP §4.5 |
| campaign (oznake) | „Verified” / „Verified fundraiser” (svrha) · „New” (streaming widget, nije stanje) · „€… total” + „Donate your way” (bez roka i cilja) | 08, 22, 23 |
| campaign_draft | postoji / nema; „Start anew” / „Back to edit”; `redirectedToLogin`, `saveFundraiserInitiated` | 03, 25 |
| verifikacija svrhe | pokrenuta (ne može se odustati) · čeka dokumente (14 dana) · u pregledu (≤ 2 radna dana) · verified (zaključan naslov/opis/cilj) · neuspjela → zaustavljanje i povrat | 15, JP §9 |
| moneybox | Active / Disabled / Deleted | 08 |
| contribution | prikaz „Hidden data” / „hidden”; knjiženje do 5 min; „paid” u ruti `/user/whip-rounds/paid` znači „Donated by me”, **nije** stanje kampanje | 08, 22, JP §5 |
| recurring_pledge | aktivna / otkazana; neuspjela naplata (preskok ili 3 pokušaja) | 17, JP §5 |
| offer / Founder's Offer | Buy now / Auction; organizator prihvaća / odbija; status pristupa kampanje „public”; pobjednik 24 h | 23, JP §3.3 |
| report / moderacija | primljena → odluka ≤ 14 dana → žalba 14 dana → odluka ≤ 14 dana; komentar skriven | JP §9 |
| fixed beneficiary odobrenje | 4fund: odobri / odbij (pogled nije viđen); naš prijedlog: čeka / odobreno / odbijeno + obrazloženje | 20 |
| sensitive_action_code | poslan · upisan · „Any problems with the code?” | 27 |
| withdrawal (nije naš) | „To withdraw funds… complete verification process” · zahtijeva kod | 09, 27 |

## 4. Praznine: što ne pristaje u postojeće entitete

| što | gdje | prijedlog |
|---|---|---|
| Rute i interni nazivi (`whip-round`, `chip`, `chip_box`, `award`) | 08, 23, 24 | samo rječnik, ne entitet |
| Promotional materials: Poster, QR code, Widget, Streaming widget, Statistics | 08, 22 | izvedeni pogledi; `widget_config` tek ako se pamte postavke (veličina, cilj klika) |
| Strojni prijevod opisa („Show original … text”, `/hu/{id}`) | 22 | `campaign_translation` (faza 2) |
| AI „Improve” naslova (4 prijedloga) | 04 | bez entiteta; eventualno log |
| Isplata, kartica/IBAN, limiti, napojnica pri isplati, 0,10 € potvrda | 09, 14, 27 | izvan modela (odluka 6); limiti iz 14 se ne prenose |
| Premium (alias, promocija, isticanje) i fakture za premium | JP §7 | `premium_purchase` (kasnije); `/settings/invoices` = 404 |
| Content Creator status, katalog kreatora (404) | JP §2.1 | atribut user/organization, kasnije |
| Postovi za ponude i za razine (tier posts, offer posts) | JP §3.3 | `content_post` (faza 2+) |
| Suglasnost korisnika za kampanju za drugu osobu (+ sken osobne) | JP §3.2 | dokument uz `verification(campaign_purpose)` ili `beneficiary_consent` |
| Fixed Beneficiary odobravanje tuđe kampanje | 20, JP §4.5 | `campaign.beneficiary_approval_status` + razlog |
| Tutoriali (`tutorials[0][tutorialType]`) | 12 | user_settings, nebitno |
| Captcha (`user_data[captcha]`, reCAPTCHA) | 01, 21 | infrastruktura (Turnstile) |
| Javni profil (`/profile/{slug}`, 462 URL-a u mapi) i „Send message” organizaciji | rute, JP §2.5 | prikaz user/organization; poruka = contact_message s primateljem? (nije viđeno) |
| Facebook Pixel, Google Analytics po kampanji | JP §4.2 | polja kampanje, vjerojatno ne prenosimo |
| Brisanje računa (vraćanje novijih donacija) | 12 | kod nas samo gašenje kampanja |
| PDF potvrda donacije, potvrda za porezni odbitak | JP §5 | izvedeni dokument iz contribution |
| Valute osim EUR, 12 načina plaćanja | 19 | ne prenosimo (MPT, EUR) |
| Polja „Edit” kampanje (rok, lokacija, vidljivost, minimum) | 07 | poznata samo iz JP §4.2; ekran nije viđen |
| Statistika kasice, tracking linka i kampanje | 08, 16, 24 | izvedeno iz contribution + posjeta (`link_visit` ako brojimo posjete) |
