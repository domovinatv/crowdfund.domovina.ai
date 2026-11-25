# 10 — Paritet s 4fundom, ekran po ekran

Tablica uspoređuje svaki ekran 4funda iz prijavljenog obilaska ([obilazak](research/obilazak/README.md)) s našom
rutom i kaže koliko je blizu. Oznake stanja: **=** isto · **≈** isto ponašanje, drukčiji mehanizam ·
**faza 2** UI postoji s oznakom, bez novca · **✗** ne radimo (razlog) · **djelomično** nešto nedostaje (navedeno).
Provjera: elementi su traženi u kodu (`src/views/stranice/<ključ rute>.astro`, komponente, `src/lib/db/*`) po
`name` atributima i konstantama; postojanje svih ruta potvrđuje `npm run routes` (335 / 335 na seedu, S8, commit
`a7f1ddc`); e2e tokovi su u `e2e/*.spec.ts`, jedinični testovi u `test/*.test.ts`. Stanje je od 25. 11. 2026.

## Tablica A — 27 ekrana obilaska

| # | Ekran 4funda | Ključni elementi 4funda | Naša ruta | Stanje | Razlike i provjera |
|---|---|---|---|---|---|
| 01 | [Registracija](research/obilazak/01-registracija.md) | e-pošta, lozinka s pravilima, uvjeti, newsletter odvojeno, nevidljiva captcha; Google, Facebook; poveznica „račun organizacije” | `/hr/registracija` | **djelomično** | Ima: ime, prezime, e-pošta, `uvjeti`, `newsletter` (`sign-up.astro`). Lozinka ✗ (odluka 208), Facebook ✗. Nedostaje: gumb Google na samoj registraciji (postoji samo na `/hr/prijava`), vidljiva poveznica „račun organizacije” (postoji samo parametar `?organizacija=1`, nitko ga ne linka), captcha. e2e `organizator.spec.ts`, `test/prijava.test.ts` |
| 02 | [Verifikacija računa](research/obilazak/02-verifikacija-racuna.md) | koraci lozinka → vrsta → podaci → Onfido; polja identiteta, dokumenta, adrese; rezidentnost EGP; PEP s 3 podvrste i izjavom o odgovornosti | `/hr/postavke/verifikacija` (`/vrsta`, `/podaci`, `/pregled`) | **≈** | Polja `first_name`…`city`, `citizenship`, `birth_country`, `residence_country` (EGP), `document_type`, `no_expiry`, `pep`, `pep_kind`, `accuracy`; OIB umjesto PESEL-a. KYC radi EMI (mock, `MockOznaka` na pregledu). Korak „Create password” ✗ (odluka 208); vrsta „organizacija” vodi na `/hr/organizacija/nova`. e2e `organizator.spec.ts`, `test/postavke.test.ts` |
| 03 | [Čarobnjak: tip](research/obilazak/03-carobnjak-tip.md) | 3 vrste, 8 namjena, napomena za organizaciju, nastavak nacrta / „Start anew” | `/hr/nova-kampanja/vrsta` | **=** | `vrsta`, `kategorija` (8, odluka 216), `za`, `akcija=ispocetka`; okvir umjesto modala (radi bez JS-a). Osobna kampanja s oznakom faze 2. `test/carobnjak.test.ts`, e2e `organizator.spec.ts` |
| 04 | [Čarobnjak: naslov i cilj](research/obilazak/04-carobnjak-naslov-cilj.md) | naslov ≤ 60 s brojačem, cilj (neobavezan za recurring), organizacija iz kataloga, AI „Improve”, savjeti | `/hr/nova-kampanja/cilj` | **djelomično** | Ima: `naslov` (`NASLOV_MAX = 60`, brojač), `cilj` (`required` osim mjesečne), `organizacija` (izbor + poveznica na katalog), `rok` (dodatno), onemogućen AI s `PhaseBadge`. Nedostaje: harmonika savjeta. Organizacija je izbor, ne autocomplete (≈) |
| 05 | [Čarobnjak: mediji](research/obilazak/05-carobnjak-mediji.md) | do 9 fotografija/videa, 15 gotovih naslovnica, savjeti | `/hr/nova-kampanja/mediji` | **djelomično** | Ima: `tema` (15, `TEME` u `lib/db/nacrti.ts`, naše ilustracije), `video` (URL). Nedostaje: stvarni prijenos fotografija (`input type=file` je `disabled`, mock, nema R2) i savjeti |
| 06 | [Čarobnjak: opis](research/obilazak/06-carobnjak-opis.md) | rich text (bold, italic, link, slika, video, poravnanje, emoji), min 50 s brojačem, savjeti, „Publish” izravno | `/hr/nova-kampanja/opis` | **djelomično** | Ima: `opis` (`OPIS_MIN = 50`, `OPIS_MAX = 5000`), broj znakova, savjeti (`<details>`). Nedostaje: alatna traka (obična `textarea`) i objava izravno s ovog koraka (samo „Dalje” na pregled) |
| 07 | [Čarobnjak: pregled](research/obilazak/07-carobnjak-pregled.md) | naslov, organizator s oznakom „unverified”, naslovnica, opis; „Back to edit”, „Publish” | `/hr/nova-kampanja/pregled` | **≈** | Oznaka neverificiranog i poveznica na verifikaciju, `akcija=objavi`. Objava traži prijavu i verificiranu organizaciju (odluka 8), 4fund objavljuje i neverificiranom. `test/objava.test.ts`, e2e `organizator.spec.ts` |
| 08 | [My fundraisers](research/obilazak/08-moje-kampanje.md) | kartice Created / Donated / Donation boxes; filtri Active/Disabled/Deleted; 8 redoslijeda; „More” na doniranoj (Open, widget, tracking link, donacije) | `/hr/moje/kampanje`, `/hr/moje/donacije`, `/hr/moje/kasice` | **djelomično** | Ima: `state` (7 stanja, `STANJA_MOJE`), `sort` (6, `REDOSLIJEDI_MOJE`; 2 redoslijeda po iznosu za isplatu ✗ jer nema isplate), na doniranoj Otvori, Widget, Potvrda, Podrži. Nedostaje: „Create tracking link” s kartice donirane kampanje; filtar stanja kasica (postoji samo isključi/uključi). `test/moje.test.ts` |
| 09 | [Withdraw funds](research/obilazak/09-isplata-popis.md) | popis kampanja za isplatu, poruka o verifikaciji | `/hr/moje/novac` | **≈** | Isplate nema (odluka 6): ekran „Kamo ide novac” s oznakom faze. `my.money.astro` |
| 10 | [Edit details](research/obilazak/10-postavke-podaci.md) | fotografija, ime, prezime, O meni (3500, zaključano), e-pošta, web (zaključano) | `/hr/postavke/podaci` | **=** | `first_name`, `last_name`, `display_name` (dodatno), `about` (3500), `website`; zaključano dok račun nije verificiran; fotografija mock. Bočni izbornik u `components/postavke/OkvirPostavki.astro`. `test/postavke.test.ts` |
| 11 | [Phone number](research/obilazak/11-postavke-telefon.md) | samo uz verifikaciju | `/hr/postavke/telefon` | **=** | `phone` samo uz verificiran račun, `akcija=ukloni`. SMS kodovi ✗ (kodovi samo e-poštom). `test/postavke.test.ts` |
| 12 | [Profile settings](research/obilazak/12-postavke-profil.md) | 10 prekidača vidljivosti, indeksiranje, newsletter, Delete account | `/hr/postavke/profil` | **≈** | 9 prekidača u kodu (`settings.profile.astro`), `indexable`, `newsletter`, `slug`, `akcija=obrisi`. Brisanje gasi kampanje, novac se ne vraća jer nije kod nas. `test/postavke.test.ts` |
| 13 | [Change password](research/obilazak/13-postavke-lozinka.md) | stara i nova lozinka | `/hr/postavke/prijava` | **≈** | Bez lozinke (odluka 208): „Načini prijave” s uklanjanjem načina (`ukloni`). `test/postavke.test.ts` |
| 14 | [Limits and authentications](research/obilazak/14-postavke-limiti.md) | način dodatne potvrde SMS / e-pošta, dnevni limit isplate, SMS iznad iznosa | `/hr/postavke/sigurnost` | **≈** | `kanal`: e-pošta (SMS onemogućen), odjava ostalih sesija. Limiti i SMS obavijest ✗ (nema isplate). `test/postavke.test.ts` |
| 15 | [Verify fundraisers](research/obilazak/15-postavke-verifikacija-kampanja.md) | uvod, popis kampanja, obrazac s dokumentima | `/hr/postavke/verifikacija-kampanja` | **≈** | Tablica kampanja s poveznicom na `/hr/{id}/upravljanje/verifikacija` (obrazac s `file`, `kind`). Pragovi samo označavaju, bez blokade isplate (docs/02). `test/postavke.test.ts` |
| 16 | [Tracking links, Shared links](research/obilazak/16-postavke-linkovi.md) | ručni linkovi, automatski linkovi dijeljenja | `/hr/postavke/linkovi`, `/hr/postavke/linkovi/dijeljenje` | **=** | `campaign`, `label`, `slug`, `akcija=stvori`; tablica dijeljenja. `test/postavke.test.ts` |
| 17 | [Recurring donations](research/obilazak/17-postavke-ponavljajuce.md) | popis ponavljajućih kartičnih donacija | `/hr/postavke/ponavljajuce` | **≈** | Mjesečni podsjetnici i trajni nalozi (`dan`, `radnja=cancel`), `MockOznaka`. Nema SEPA DD (docs/02). `test/ponavljanje.test.ts` |
| 18 | [Login history](research/obilazak/18-postavke-povijest-prijava.md) | stupci prijava, aktivnost, IP, uređaj | `/hr/postavke/povijest-prijava` | **≈** | Isti stupci (`P.stupci`); sesije iz mock prijave. `test/postavke.test.ts` |
| 19 | [Checkout](research/obilazak/19-checkout.md) | 11 valuta, iznosi po kampanji, svoj iznos, 12 metoda, napojnica 0–30 % (zadano 20), skrij ime/iznos, poruka 300, poruka kao komentar, 2 kvačice obavijesti, e-pošta/ime/„kao tvrtka”, uvjeti | `/hr/{id}/podrzi`, `/{checkout}`, `/napojnica`, `/potvrda` | **djelomično** | Ima: `izbor` + `svojIznos`, `skrijIme`, `skrijIznos`, `poruka` (`PORUKA_NAJVISE = 300`), `komentar`, `email`, `ime`, `prezime`, `kaoTvrtka` + `tvrtka` + `oib` (faza 2), `uvjeti`, `ucestalost` (dodatno). Valute ✗ (samo EUR), metode ≈ (MPT QR/IBAN/referenca), napojnica ≈ (zaseban korak, `IZBORI_NAPOJNICE` 0 / 1 / 2 / 5 €, ništa predodabrano, odluka 7). Nedostaje: kvačice obavijesti e-poštom (novosti kampanje, marketinški pristanak). e2e `uplata.spec.ts`, `test/checkout.test.ts` |
| 20 | [Company application](research/obilazak/20-organizacija.md) | 5 koraka s brojačem, verifikacija zastupnika, obrazac tvrtke, Fixed Beneficiary | `/hr/organizacija/nova` (`/podaci`, `/zastupnik`, `/projekt`, `/kyb`, `/pregled`) | **≈** | Pet koraka; KYB kod EMI-ja (mock, `privola`), zastupnik je obrazac (`ime`, `prezime`, `funkcija`, `ovlast`). `test/organizacija.test.ts` |
| 21 | [Kontakt](research/obilazak/21-kontakt.md) | ime, e-pošta, 10 tema, poruka, reCAPTCHA | `/hr/kontakt` | **=** | `name`, `email`, `topic` (10, `TEME_KONTAKTA`, „blokada isplate” → `account_block`), `content`, Turnstile. `test/kontakt.test.ts` |
| 22 | [Observe, Report, komentari](research/obilazak/22-observe-prijava-komentari.md) | Observe 3 prekidača; Report: opis 50–500, telefon, privitak 20 MB, privola; komentari s odgovorom i dijeljenjem; promo izbornik (Poster, QR, Widget, Streaming, Statistics); strojni prijevod | `/hr/{id}`, `/hr/prijavi-sadrzaj`, `/hr/pracenje/{token}` | **djelomično** | Ima: `FollowButton` (komentari, novosti, kraj), prijava (`description` 50–500, `phone`, `email`, `izjava`, `privola`), komentari (`NAJVISE_KOMENTARA = 2500`, jedna razina odgovora), `PromoTools` (QR, plakat, widget). Nedostaje: privitak u prijavi, dijeljenje pojedinog komentara, Streaming widget u promo izborniku (ruta `/embed/{id}/stream` postoji). Strojni prijevod faza 2, nije u UI-ju. `test/kampanja-stranica.test.ts`, `test/pracenje-s6.test.ts`, `test/komentari.test.ts` |
| 23 | [Ponude, Founder's Offer](research/obilazak/23-ponude-founders-offer.md) | odabir vlastite ili tuđe kampanje (pretraga, 6 redoslijeda, „Select”), modal verifikacije | `/hr/ponude/nova` | **faza 2** | `campaign` kao izbor s grupama „vlastite” / „tuđe”, napomena o verifikaciji uz poveznicu, obrazac ponude (`title`, `price`, `mode`, `quantity`, `days`, `delivery`…); sprema se samo nacrt. Pretrage i redoslijeda kampanja nema. `test/ponude.test.ts` |
| 24 | [Kasica: obrazac](research/obilazak/24-kasica-obrazac.md) | naslov 60, alias s prijedlogom, cilj, naslovnica, opis s predloškom, pravila, obavijesti (zadano uključeno), zahvala | `/hr/{id}/kasica/nova` | **djelomično** | Ima: `title` (60), `alias`, `goal`, `description`, `rules`, `notifications`, `thankYouOn` + `thankYou`. Nedostaje: naslovnica kasice. `test/pristup.test.ts` |
| 25 | [Anonimni dio](research/obilazak/25-anonimni.md) | modal prijave (Google, Facebook, kod e-poštom, lozinka, reset), čarobnjak i checkout bez prijave | `/hr/prijava`, `/hr/prijava/kod`, `/hr/nova-kampanja/*`, `/hr/{id}/podrzi` | **≈** | Prijava kodom (`email`, `UnosKoda`), Google mock (`/auth/google`); Facebook, lozinka i reset ✗ (odluka 208). Nacrt neprijavljenog u kolačiću umjesto `localStorage`, prelazi na poslužitelj s oznakom izvora (`components/carobnjak/kolacic.ts`, odluka 152). Checkout bez prijave kao 19. `test/prijava.test.ts`, `test/carobnjak.test.ts` |
| 26 | [Company application poslano](research/obilazak/26-company-application-poslano.md) | obrazac tvrtke (naziv, web, pravni oblik, opisi, broj uplata, država, e-pošta, mreže, uvjeti), stanje „3 / 5” | `/hr/organizacija/nova/podaci`, `/hr/o/{slug}/zahtjev` | **≈** | `naziv`, `web`, `pravniOblik`, `opis`, `mreze`, `oib`, `adresa`, `postanski`, `grad`, `kategorija`, `slug`; `ocekivaneUplate` i `opisProjekta` na koraku projekt. Stanje zahtjeva vidljivo u sučelju (`org.application.astro`), umjesto pisma. `test/organizacija.test.ts` |
| 27 | [Isplata: dodatna autorizacija](research/obilazak/27-isplata-dodatna-autorizacija.md) | 6-znamenkasti kod e-poštom, šalje se pri otvaranju | `/hr/potvrda-radnje/{token}` | **≈** | Kod e-poštom za osjetljive radnje (povrati, zatvaranje, brisanje), ne za isplatu; šalje se na klik. `UnosKoda`, `DemoPosta`. `test/upravljanje.test.ts`, `test/financije.test.ts` |

## Tablica B — funkcije bez viđenog ekrana

Izvor: „Nije viđeno” u [obilasku](research/obilazak/README.md) i „Funkcije 4funda bez viđene rute” u [07](07-rute.md);
opis 4funda je iz [javnog pregleda](research/2026-11-24-4fund-javni-pregled.md) (§ u stupcu).

| # | Ekran 4funda | Ključni elementi 4funda | Naša ruta | Stanje | Razlike i provjera |
|---|---|---|---|---|---|
| B01 | Edit kampanje (§4.2) | naslov, cilj, kategorija, rok, opis, galerija, lokacija, min. iznos, vidljivost, sakrij prikupljeno / broj donatora, postavke popisa uplata, dopusti ponavljajuće, komentari, zahvala, kasice, tuđe ponude, obavijesti, Pixel/GA | `/hr/{id}/uredi` | **djelomično** | Ima: `title`, `goal`, `endsAt`, `description`, `locationName`, `minAmount`, `visibility`, `hideRaised`, `hideContributorCount`, `contributionsList`, `contributionsSort`, `commentsMode`, `thankYou`, `allowMoneyboxes`, `allowOffers`, `slug`; zaključavanje nakon verifikacije. Nedostaje: kategorija, galerija i naslovnica, „dopusti ponavljajuće”. Obavijesti su na `/upravljanje/obavijesti`. Pixel/GA ✗ (bez praćenja trećih strana). `test/pristup.test.ts`, `test/moje.test.ts` |
| B02 | Statistics (§4.4) | brojke i grafovi kampanje | `/hr/{id}/upravljanje` | **=** | Brojke, SVG stupci po danu s tablicom za čitače, izvori doprinosa. e2e `odobravanje.spec.ts`, `test/upravljanje.test.ts` |
| B03 | Finances, Export XLS (§4.4, §6) | popis uplata, izvoz | `/hr/{id}/upravljanje/financije`, `…/financije.csv` | **≈** | Filtar `state`, zbroj, tablica s e-poštom (U:viewer+), CSV umjesto XLS. `test/financije.test.ts` |
| B04 | Return selected (§6) | povrat odabranih, 0,50 € po povratu | `/hr/{id}/upravljanje/povrati` | **≈** | Zapis povrata (`refund`, `method`, `reference`) i potvrda; prijenos radi organizator iz Safea / računa, naknade povrata nema. Kod e-poštom. `test/financije.test.ts`, `test/povrat-podrzavatelj.test.ts` |
| B05 | Notifications (§4.2) | obavijesti o novim donacijama | `/hr/{id}/upravljanje/obavijesti` | **≈** | Nove uplate (postavka kampanje), komentari i kraj (osobno); `MockOznaka` (e-pošta mock). `test/upravljanje.test.ts` |
| B06 | Tracking link kampanje i `/z/{slug}+` (§4.4) | više linkova, statistika posjeta i donacija, 30 dana | `/hr/{id}/upravljanje/linkovi`, `/z/{slug}` | **=** | `label`, `slug`, tablica posjeta i doprinosa, isključi/uključi. Statistika samo vlasniku i K (odluka 304). `test/upravljanje.test.ts` |
| B07 | QR code (§4.4) | QR na kampanju ili na uplatu | `/hr/{id}/qr` | **=** | QR kampanje + SVG; uplatni QR je u checkoutu (EPC iz MPT-a). `test/kampanja-stranica.test.ts` |
| B08 | Poster (§4.4) | plakat jednim klikom; čestitka s popisom donatora | `/hr/{id}/plakat` | **djelomično** | A4 plakat za ispis (`@media print`). Nedostaje: čestitka s popisom podržavatelja. `test/moje.test.ts` |
| B09 | Widget (§4.4) | HTML kod, veličina i izgled, cilj klika kampanja/uplata | `/hr/{id}/widget`, `/embed/{id}` | **djelomično** | `lang`, `target` (`campaign` / `support`), kod i pregled iframea. Nedostaje: izbor veličine i izgleda. `test/kampanja-stranica.test.ts` |
| B10 | Streaming widget (§4.4, obilazak 22) | overlay za OBS: napredak, obavijesti o donacijama, ljestvica, QR | `/embed/{id}/stream` | **faza 2** | Samo naslov i napredak, s oznakom. Nema poveznice iz `PromoTools`. `test/rute.test.ts` |
| B11 | Turn off (§4.5) | isključi / uključi primanje uplata | `POST /hr/{id}/upravljanje` | **=** | `akcija=iskljuci` / `ukljuci` (`paused_at`). `test/upravljanje.test.ts` |
| B12 | Delete (§4.5) | brisanje kampanje | `/hr/{id}/upravljanje/zatvori` | **=** | `zatvori`, `otvori`, `obrisi` s upisom ID-a i kodom e-poštom. `test/upravljanje.test.ts` |
| B13 | Promote, isticanje, alias (§4.4, §7) | plaćena promocija, alias 1–3 € | `/hr/{id}/upravljanje/promocija` | **faza 2** | `alias` + `PhaseBadge`; fakturira ITalk tek u fazi 2. `test/ponude.test.ts` |
| B14 | Delegirane zahvale (§4.4) | premium zahvale od 50 donatora | – | **✗** | Premium nije u fazi 1; zahvala organizatora je `thankYou` u `/hr/{id}/uredi` |
| B15 | Razine podrške (§3) | razine s ekskluzivnim postovima | `/hr/{id}/upravljanje/razine`, `/hr/{id}#razine` | **faza 2** | `title`, `description`, `price`, `inventory` + `PhaseBadge`. `test/kampanja.test.ts` |
| B16 | Kasica vlastite kampanje (§3, obilazak 24) | popis kasica kampanje i njihova statistika | `/hr/{id}/upravljanje/kasice` | **=** | Zbroj i broj doprinosa po kasici, isključi/uključi. `test/upravljanje.test.ts` |
| B17 | Isplata: kartica, IBAN, 0,10 €, limiti, povijest (§6) | „Pay out”, verifikacija kartice/računa, kod | `/hr/{id}/upravljanje/novac` | **✗** | Nema isplate (odluka 6): novac je već na Safeu ili računu organizatora; ekran „Kamo ide novac” |
| B18 | Founder's Offer obrazac (§3) | naziv, cijena, aukcija, količina, TIN/DAC7 | `/hr/ponude/nova` | **faza 2** | Isti obrazac kao 23; tuđa kampanja → ponuda `pending`. DAC7 tek s prodajom. `test/ponude.test.ts` |
| B19 | Fixed Beneficiary pogled (§2.4) | organizacija odobrava ili odbija kampanje u svoje ime | `/hr/o/{slug}/odobravanje` | **≈** | `odobri` / `odbij` s `razlog` (500); novac ide na Safe organizacije. e2e `odobravanje.spec.ts`, `test/odobravanje.test.ts` |
| B20 | Company application korak 4–5 (§2.4) | ručna obrada ~2 dana, postati Fixed Beneficiary | `/hr/organizacija/nova/kyb`, `/hr/organizacija/nova/pregled`, `/hr/o/{slug}/zahtjev` | **≈** | KYB kod EMI-ja (mock), stanje zahtjeva u sučelju, Safe (`lanac`, `adresa`). `test/organizacija.test.ts` |
| B21 | Verify fundraisers obrazac s dokumentima (§6) | dokumenti o namjeni, pragovi 5.000 / 12.500 € | `/hr/{id}/upravljanje/verifikacija` | **≈** | `kind`, `label`, `file`; pragovi daju zastavu i ručni pregled, bez blokade. `test/upravljanje.test.ts`, `test/moderacija.test.ts` |
| B22 | PayU/ZEN, potvrda uplate, PDF (§5) | ekran pružatelja plaćanja, potvrda, PDF | `/hr/{id}/podrzi/{checkout}`, `…/potvrda` | **≈** | QR/IBAN/referenca iz MPT intenta (sandbox: simulacija), potvrda sa stanjem i referencom. PDF potvrda u sandboxu ne postoji (odluka 711). e2e `uplata.spec.ts` |
| B23 | Onfido, potvrda e-pošte (§2.3) | provjera dokumenta i lica; link iz e-pošte | `/hr/postavke/verifikacija/pregled`, `/hr/registracija/potvrda`, `/auth/link/{token}` | **≈** | KYC kod EMI-ja (mock odluka na pregledu); potvrda e-pošte je ista poveznica kao prijava. `test/prijava.test.ts` |
| B24 | Reset lozinke (obilazak 25) | poveznica za novu lozinku | – | **✗** | Bez lozinke (odluka 208) |

## Tablica C — javne stranice iz mape stranice 4funda

Svedeno iz [07](07-rute.md#iz-mape-stranice); rute su potvrđene u `src/lib/rute.ts` i `npm run routes`.

| 4fund | Naša ruta | Stanje | Napomena |
|---|---|---|---|
| `/{lang}` | `/hr`, `/en` | **=** | |
| `/{lang}/catalog` | `/hr/kampanje` | **≈** | naši filtri; „Countries” ✗ (samo HR) |
| `/{campaign}` | `/{id}` → `/hr/{id}` | **=** | 6 znakova |
| `/{campaign}/pay` | `/hr/{id}/podrzi` | **≈** | MPT intent umjesto 12 metoda (A19) |
| `/{lang}/profile/{slug}` | `/hr/u/{slug}`, `/hr/o/{slug}` | **≈** | osoba i organizacija razdvojene |
| `/profile/{slug}` | isto | **≈** | |
| `/{lang}/o/{org}` | `/hr/o/{slug}` | **=** | |
| `/{lang}/how-it-works` | `/hr/kako-radi` | **=** | |
| `/{lang}/how-it-works/collect/for-yourself` | `/hr/kako-radi` | **≈** | faza 1: organizacije |
| `/{lang}/how-it-works/collect/for-family-and-friends` | `/hr/kako-radi/za-druge` | **faza 2** | fizičke osobe |
| `/{lang}/how-it-works/support/donate` | `/hr/kako-radi/doniranje` | **=** | |
| `/{lang}/how-it-works/support/buy` | `/hr/kako-radi/ponude` | **faza 2** | |
| `/{lang}/how-it-works/support/sell` | `/hr/kako-radi/ponude#prodaja` | **faza 2** | |
| `/{lang}/how-it-works/support/share` | `/hr/kako-radi/dijeljenje` | **=** | |
| `/{lang}/how-it-works/support/moneybox` | `/hr/kako-radi/kasice` | **=** | |
| `/{lang}/how-it-works/why-us` | – | **✗** | nema stvarnih brojki ni studija slučaja |
| `/{lang}/costs` | `/hr/troskovi` | **=** | |
| `/{lang}/faq` | `/hr/cesta-pitanja` | **=** | |
| `/{lang}/safety` | `/hr/sigurnost` | **≈** | sadržaj: MPT, Safe, EMI |
| `/{lang}/terms` | `/hr/uvjeti` | **=** | |
| `/{lang}/privacy` | `/hr/privatnost` | **=** | |
| `/{lang}/content-display-policy` | `/hr/pravila-prikaza` | **=** | |
| `/{lang}/ue-brochure` | – | **✗** | veže platnu instituciju; platni subjekt je EMI (odluka 6) |
| `/{lang}/about-us` | `/hr/o-nama` | **=** | |
| `/{lang}/media` | – | **✗** | press kit tek uz ime i brend |
| `/{lang}/blog` | – | **✗** | vodiči su u `/hr/kako-radi` i FAQ-u |
| `/blog/{id}/{slug}` | – | **✗** | isto |
| `/{lang}/feedback` | `/hr/kontakt?tema=prijedlog` | **≈** | tema kontakta |
| `/{lang}/recurring` | `/hr/mjesecne` | **≈** | podsjetnik i trajni nalog umjesto kartice |
| `/recurring` | `/hr/mjesecne` | **≈** | isto |
| `/{lang}/patron-catalog` | `/hr/organizacije` | **=** | |
| `/{lang}/patronized-fundraising` | `/hr/za-organizaciju` | **=** | |
| `/{lang}/awards/catalog` | `/hr/ponude` | **faza 2** | |
| `/{lang}/creators/catalog` | – | **✗** | 4fundu 404; kreatori nisu u fazi 1 |
| `/{lang}/company-application/steps` | `/hr/organizacija/nova`, `/hr/o/{slug}/zahtjev` | **≈** | KYB kod EMI-ja (A20) |
| `/{lang}/sign-up/user-data` | `/hr/registracija` | **≈** | bez lozinke (A01) |

## Sažetak

Brojanje (stupac stanja je 6. u A i B, 4. u C):

```bash
awk -F'|' '/^## /{t=""} /^## Tablica/{t=substr($0,12,1)} t!="" && /^\| (B?[0-9]{2}|`)/{c=(t=="C")?4:6; s=$c; gsub(/^ +| +$|\*/,"",s); n[t" "s]++} END{for(k in n) print k, n[k]}' docs/10-paritet.md | sort
```

| Tablica | redova | = | ≈ | faza 2 | ✗ | djelomično |
|---|---|---|---|---|---|---|
| A (obilazak) | 27 | 5 | 13 | 1 | 0 | 8 |
| B (bez ekrana) | 24 | 6 | 8 | 4 | 3 | 3 |
| C (mapa stranice) | 36 | 15 | 11 | 4 | 6 | 0 |
| ukupno | 87 | 26 | 32 | 9 | 9 | 11 |

### Djelomično: kandidati za popravak

| # | Što nedostaje | Procjena |
|---|---|---|
| A01 | gumb Google i poveznica „račun organizacije” (`?organizacija=1`) na registraciji; captcha | sitno (captcha srednje) |
| A04 | harmonika savjeta na koraku cilja | sitno |
| A05 | prijenos fotografija (mock, nema R2); savjeti | srednje (savjeti sitno) |
| A06 | alatna traka opisa; objava izravno s koraka opisa | srednje (objava sitno) |
| A08 | „Link za praćenje” s kartice donirane kampanje; filtar stanja kasica | sitno |
| A19 | dvije kvačice obavijesti e-poštom u checkoutu (praćenje kampanje, marketinški pristanak) | sitno |
| A22 | privitak u prijavi sadržaja; dijeljenje komentara; Streaming widget u `PromoTools` | srednje (privitak) / sitno (ostalo) |
| A24 | naslovnica kasice | sitno (mock kao u čarobnjaku) |
| B01 | kategorija, galerija i naslovnica, „dopusti ponavljajuće” u uređivanju | srednje |
| B08 | čestitka s popisom podržavatelja na plakatu | sitno |
| B09 | veličina i izgled widgeta | sitno |

### ✗ s razlogom

- **Nema isplate, novac nije kod nas (odluka 6):** isplata, limiti, 0,10 € potvrda (B17), `ue-brochure`.
- **Bez lozinke (odluka 208):** reset lozinke (B24); i unutar redova A01, A02, A13, A25.
- **Premium nije u fazi 1:** delegirane zahvale (B14).
- **Sadržaj i brend:** `why-us`, `media`, `blog` (2 rute), `creators/catalog`.
- **Unutar redova s drugim stanjem:** valute osim EUR i kartične metode (A19), Facebook prijava (A01, A25),
  SMS kodovi (A11, A14), Pixel/GA (B01), redoslijedi po iznosu za isplatu (A08), strojni prijevod (A22, faza 2).

## Pregled u pregledniku (S9, Claude in Chrome)

25. 11. 2026., Brave, `astro dev` nad lokalnim D1 nakon `npm run db:seed:local`. Brave ne smanjuje viewport ispod
~606 px, pa je 375 px provjereno u iframeu te širine unutar iste stranice.

- **Automatski sken svih 200-ruta iz `e2e/javne-rute.ts`** (213 jedinstvenih: 108 bez sesije, 100 s demo
  organizatorom, 5 s demo moderatorom; 2 CSV izvoza preskočena jer su preuzimanje) na 375 i 1280 px: 0 stranica s
  vodoravnim preljevom (`scrollWidth` > širina), 0 slomljenih slika, 0 `img` bez `alt`.
- **Vizualno:** naslovnica, katalog, stranica kampanje, checkout korak 1 (1280 i ~606 px), upravljanje kampanjom,
  čarobnjak i „moje kampanje” (375 px). Izbornik se na uskom ekranu sklapa u gumb, kartice idu u jedan stupac,
  kartice upravljanja se lome u dva stupca, trake s karticama (tabovi) se pomiču vodoravno unutar sebe.
- **Nađeno i popravljeno:** postotak cilja zaokruživao se naviše na kartici i stranici kampanje (44 %), a naniže u
  upravljanju (43 %) za isti iznos; sad svugdje naniže (`ProgressBar.astro`, odluka 904).
- **Nije greška:** „10 podržavatelja” na javnoj stranici i „13 doprinosa” u upravljanju su različite brojke jezgre
  (`contributor_count` i `contribution_count`).
- Axe (WCAG 2.1 AA) na istim širinama: `e2e/a11y.spec.ts`, brojke u „Stanju lanca” S9.
