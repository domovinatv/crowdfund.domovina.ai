# 02 — Funkcije 4funda preslikane na MPT

Izvor funkcija: [javni pregled](research/2026-11-24-4fund-javni-pregled.md) (sekcija u zagradi).
Prijavljeni obilazak (S1, S1b) dopunjava ovu tablicu; tada se stupac „Prototip” potvrđuje.

Oznake: **=** isto · **≈** isto ponašanje, drukčiji mehanizam · **✗** ne radimo (razlog) ·
**faza 2** u UI-ju postoji, označeno.
Stupac „Ekran (S8)”: ruta u prototipu koja pokriva red (`src/lib/rute.ts`, `npm run routes`) ili ✗ s razlogom.

| 4fund funkcija (§) | Kako kod nas | Oznaka | Prototip | Ekran (S8) |
|---|---|---|---|---|
| Registracija e-poštom (§2) | e-pošta + magic link; kasnije Certilia (zajedno `docs/11`) | ≈ | mock prijava | `/hr/registracija`, `/hr/prijava`, `/hr/prijava/kod` |
| Verifikacija osobe: obrazac, PEP izjava, Onfido (§2) | KYC radi EMI (Monerium/Swan) pri otvaranju računa; mi čuvamo samo status i referencu | ≈ | obrazac + status | `/hr/postavke/verifikacija` (vrsta, podaci, pregled) |
| Organizacija: company application, ručno 2 dana (§2) | KYB kod EMI-ja + MPT tenant/kampanja + setup dApp (ADR 0027) | ≈ | čarobnjak organizacije | `/hr/organizacija/nova` (5 koraka), `/hr/o/{slug}/zahtjev` |
| Fixed Beneficiary: tuđe kampanje u ime organizacije, organizacija odobrava (§2, §3) | kampanja s `target` = Safe organizacije, odobrenje organizacije prije objave | ≈ | da | `/hr/nova-kampanja/vrsta?za={org}`, `/hr/o/{slug}/odobravanje` |
| Jednokratna kampanja (§3) | `campaigns.type = donation`, Safe ili račun organizatora | = | da | `/hr/nova-kampanja`, `/hr/{id}` |
| Kampanja za sebe / obitelj (§3) | organizator fizička osoba | faza 2 | da, označeno | `/hr/nova-kampanja/vrsta` (osobno + oznaka), `/hr/{id}` osobne kampanje s oznakom |
| Ponavljajuće (recurring), samo kartica (§3, §5) | nema SEPA DD kroz Monerium → mjesečni podsjetnik + QR, ili trajni nalog u banci | ≈ | da | `/hr/{id}/podrzi` (mjesečno), `/hr/podsjetnik/{token}`, `/hr/postavke/ponavljajuce`, `/hr/mjesecne` |
| Kasica (moneybox) `/s/{alias}`, bez verifikacije, novac u glavnu kampanju (§3) | intent s `metadata.moneybox`, isti target | = | da | `/hr/{id}/kasica/nova`, `/hr/s/{alias}`, `/hr/moje/kasice` |
| Link za praćenje `/z/{slug}`, statistika, atribucija 30 dana (§4) | `metadata.tracking` na intentu + kolačić 30 dana | = | da | `/hr/{id}/upravljanje/linkovi`, `/z/{slug}` |
| Ponude, aukcije, tuđe ponude na kampanji (§3) | prodaja = fiskalizacija + DAC7 | faza 2 | da, označeno | `/hr/ponude`, `/hr/ponude/{offer}`, `/hr/ponude/nova`, `/hr/{id}#ponude` |
| Razine podrške s ekskluzivnim postovima (§3) | `campaign_tiers` + `subscriptions` | faza 2 | da, označeno | `/hr/{id}#razine`, `/hr/{id}/upravljanje/razine` |
| Cilj, rok, „zadrži sve što skupiš”, otvoreno nakon roka (§4) | isto; novac je odmah kod organizatora pa all-or-nothing ni ne postoji | = | da | `/hr/nova-kampanja/cilj`, `/hr/{id}/uredi`, `/hr/{id}/upravljanje/zatvori` |
| Ažuriranja, komentari, popis uplatitelja, anonimnost (§4) | isto; popis uplatitelja iz MPT payer tagova (ADR 0029) | = | da | `/hr/{id}/upravljanje/novosti`, `/hr/{id}/upravljanje/komentari`, `/hr/{id}#uplate` |
| Checkout: iznosi, poruka 300 zn, skrij ime/iznos, e-pošta, „kao tvrtka” (§5) | isto polje po polje, plaćanje = MPT intent (QR, IBAN, referenca) | ≈ | da | `/hr/{id}/podrzi`, `/hr/{id}/podrzi/{checkout}` |
| Napojnica 20 % na klizaču (§5, §7) | zaseban intent na ITalk; zadano 0 ili jednako istaknuto 0 (UOKiK slučaj) | ≈ | da | `/hr/{id}/podrzi/{checkout}/napojnica` |
| Metode: kartice, Apple Pay, Revolut… (§5) | SEPA Instant QR; PIS (ADR 0031) kasnije | ✗ kartice | – | ✗ kartice: samo SEPA kroz MPT (odluka 6) |
| Isplata na karticu/IBAN, 0,10 € potvrda, limit 20.000 €, kod (§6) | ne postoji: novac je već kod organizatora; iz Safea troši 2-od-3 potpisnika | ✗ | ekran „Kamo ide novac” | `/hr/{id}/upravljanje/novac`, `/hr/moje/novac` („Kamo ide novac”) |
| Povrat 0,50 € (§6, §7) | povrat = odlazni prijenos iz Safea/računa organizatora, platforma samo bilježi | ≈ | zapis povrata | `/hr/{id}/upravljanje/povrati` |
| Verifikacija namjene iznad 5.000 € / 12.500 € (§6) | isti pragovi → zastava i ručni pregled, bez blokade (nemamo isplatu) | ≈ | da | `/hr/{id}/upravljanje/verifikacija`, `/hr/postavke/verifikacija-kampanja` |
| Zaključavanje naslova/opisa/cilja nakon verifikacije (§6) | isto | = | da | `/hr/{id}/uredi` (zaključana polja) |
| Katalog samo verificiranih, 7 javnih redoslijeda (§8) | isto; redoslijedi javno opisani (DSA) | = | da | `/hr/kampanje`, `/hr/pravila-prikaza` |
| Promocija, alias 1–3 € (§7) | premium, fakturira ITalk | faza 2 | označeno | `/hr/{id}/upravljanje/promocija` |
| Prijava sadržaja, moderacija komentara 14 dana, žalba (§9) | DSA čl. 16–17: prijava, obrazložena odluka | = | obrazac | `/hr/prijavi-sadrzaj`, `/admin/prijave` |
| QR, widget, poster (S1 popis) | QR = MPT `campaign-qr` (trajni), widget = iframe | = | da | `/hr/{id}/qr`, `/hr/{id}/widget`, `/hr/{id}/plakat`, `/embed/{id}` |
| Financije: popis uplata, XLS izvoz (S1 popis) | iz `contributions` (webhook MPT) + CSV | = | da | `/hr/{id}/upravljanje/financije`, `financije.csv` |
| Javni API, 10.000 zahtjeva/h (§10) | javni read API (campaign-core J4) | = | kasnije | ✗ u prototipu: javni read API je campaign-core J4, izvan ovog plana |
| Hibrid: kampanja s 4funda | vanjska kampanja, gumb vodi na 4fund `/pay` | novo | da | `/hr/o/{slug}/vanjske`, `/hr/vanjska/{id}`, `/hr/moje/vanjske`, odjeljak u `/hr/kampanje` (odluke 800–802) |
| Čarobnjak 5 koraka, nacrt se pamti, „Start anew” (S1 [03](research/obilazak/03-carobnjak-tip.md)) | isto; nacrt u D1 po korisniku | = | da | `/hr/nova-kampanja/{vrsta,cilj,mediji,opis,pregled}` |
| AI „Improve” naslova, 4 prijedloga (S1 [04](research/obilazak/04-carobnjak-naslov-cilj.md)) | prijedlog kroz LLM, opcionalan | faza 2 | označeno | `/hr/nova-kampanja/cilj` (onemogućen „Predloži naslov” s oznakom) |
| Gotove naslovnice, 15 tema (S1 [05](research/obilazak/05-carobnjak-mediji.md)) | naše ilustracije, iste teme | = | da | `/hr/nova-kampanja/mediji` |
| PEP izjava s 3 podvrste i izjavom o kaznenoj odgovornosti (S1 [02](research/obilazak/02-verifikacija-racuna.md)) | dio KYC-a kod EMI-ja; mi samo status | ≈ | obrazac | `/hr/postavke/verifikacija/podaci` |
| Dodatna autentikacija: 6-znamenkasti kod SMS/e-pošta (S1 [14](research/obilazak/14-postavke-limiti.md)) | kod e-poštom za osjetljive radnje organizatora | ≈ | mock | `/hr/potvrda-radnje/{token}`, `/hr/prijava/kod` |
| Dnevni limit isplate i SMS obavijest (S1 [14](research/obilazak/14-postavke-limiti.md)) | nema isplate | ✗ | – | ✗ nema isplate (novac je kod organizatora) |
| Vidljivost profila, 9 prekidača + indeksiranje (S1 [12](research/obilazak/12-postavke-profil.md); 10. 4fundov prekidač je „završeni vodiči”, ne vidljivost) | isto | = | da | `/hr/postavke/profil` |
| Automatski linkovi dijeljenja (S1 [16](research/obilazak/16-postavke-linkovi.md)) | `?ref=` po korisniku + popis | = | da | `/hr/postavke/linkovi`, `/hr/postavke/linkovi/dijeljenje` |
| Povijest prijava (S1 [18](research/obilazak/18-postavke-povijest-prijava.md)) | tek uz pravi login | ≈ | statično | `/hr/postavke/povijest-prijava` |
| Brisanje računa vraća buduće donacije (S1 [12](research/obilazak/12-postavke-profil.md)) | brisanje gasi kampanje; novac nije kod nas | ≈ | da | `/hr/postavke/profil` (S9: ispravljeno s `sigurnost`) |
| Valute: 11 (EUR, USD, GBP, PLN, CHF…) u checkoutu (S1b [19](research/obilazak/19-checkout.md)) | samo EUR (SEPA) | ✗ ostale valute | – | ✗ ostale valute: SEPA je samo EUR |
| 12 načina plaćanja (kartica, Revolut, N26, ZEN, Wero, Bancontact, MB WAY, Multibanco, eps, Apple/Google Pay, Skrill) (S1b [19](research/obilazak/19-checkout.md)) | jedan: MPT intent (QR EPC/HUB3, IBAN, referenca) | ≈ | da | `/hr/{id}/podrzi/{checkout}` (QR, IBAN, referenca) |
| Napojnica: klizač 0–30 %, korak 5, zadano 20 %, „(change)” na nuli (S1b [19](research/obilazak/19-checkout.md)) | zaseban intent, zadano 0 ili bez zadanog (odluka 7) | ≈ | da | `/hr/{id}/podrzi/{checkout}/napojnica` (0 prvi, ništa predodabrano) |
| „Donate as a company” (S1b [19](research/obilazak/19-checkout.md)): na 4fundu isključeno u konfiguraciji | R1 podaci (naziv, OIB) za udruge | faza 2 | da, označeno | `/hr/{id}/podrzi` (kućica „kao tvrtka”, naziv, OIB; R1 račun faza 2) |
| Observe: obavijesti o komentarima, novostima, kraju (S1b [22](research/obilazak/22-observe-prijava-komentari.md)) | isto, e-poštom | = | mock | `/hr/pracenje/{token}`, `/hr/{id}/upravljanje/obavijesti` |
| Report abuse: opis 50–500, telefon, privitak 20 MB, GDPR pristanak (S1b [22](research/obilazak/22-observe-prijava-komentari.md)) | DSA čl. 16 obrazac + potvrda primitka; privitak tek s R2 (S9) | ≈ | obrazac bez privitka | `/hr/prijavi-sadrzaj` |
| Komentari do 2500 znakova, odgovori, dijeljenje (S1b [23](research/obilazak/23-ponude-founders-offer.md)) | isto | = | da | `/hr/{id}#komentari` |
| Streaming widget (S1b [22](research/obilazak/22-observe-prijava-komentari.md)) | prikaz napretka za stream (iframe) | faza 2 | označeno | `/embed/{id}/stream` |
| Strojni prijevod opisa kampanje (S1b [22](research/obilazak/22-observe-prijava-komentari.md)) | hr/en ručno; strojni prijevod kasnije | faza 2 | – | ✗ u prototipu: opis hr/en piše organizator; strojni prijevod tek u fazi 2 |
| Founder's Offer samo za verificiranog ponuđača i kampanju koja to dopušta (S1b [23](research/obilazak/23-ponude-founders-offer.md)) | isto pravilo | faza 2 | označeno | `/hr/ponude/nova` (tuđa kampanja → Founder's Offer, `pending`) |
| Obrazac kasice: naslov 60, alias predložen, cilj neobavezan, prihvat pravila, zahvala (S1b [24](research/obilazak/24-kasica-obrazac.md)) | isto | = | da | `/hr/{id}/kasica/nova` |
| Company application, 5 koraka, obrazac tek nakon verifikacije osobe (S1b [20](research/obilazak/20-organizacija.md)) | KYB kod EMI-ja + MPT tenant | ≈ | čarobnjak organizacije | `/hr/organizacija/nova/*` |
| Kontakt obrazac, 10 tema, reCAPTCHA (S1b [21](research/obilazak/21-kontakt.md)) | isto, naše teme, Turnstile | = | da | `/hr/kontakt` |
