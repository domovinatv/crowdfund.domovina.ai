# 02 — Funkcije 4funda preslikane na MPT

Izvor funkcija: [javni pregled](research/2026-11-24-4fund-javni-pregled.md) (sekcija u zagradi).
Prijavljeni obilazak (S1, S1b) dopunjava ovu tablicu; tada se stupac „Prototip” potvrđuje.

Oznake: **=** isto · **≈** isto ponašanje, drukčiji mehanizam · **✗** ne radimo (razlog) ·
**faza 2** u UI-ju postoji, označeno.

| 4fund funkcija (§) | Kako kod nas | Oznaka | Prototip |
|---|---|---|---|
| Registracija e-poštom (§2) | e-pošta + magic link; kasnije Certilia (zajedno `docs/11`) | ≈ | mock prijava |
| Verifikacija osobe: obrazac, PEP izjava, Onfido (§2) | KYC radi EMI (Monerium/Swan) pri otvaranju računa; mi čuvamo samo status i referencu | ≈ | obrazac + status |
| Organizacija: company application, ručno 2 dana (§2) | KYB kod EMI-ja + MPT tenant/kampanja + setup dApp (ADR 0027) | ≈ | čarobnjak organizacije |
| Fixed Beneficiary: tuđe kampanje u ime organizacije, organizacija odobrava (§2, §3) | kampanja s `target` = Safe organizacije, odobrenje organizacije prije objave | ≈ | da |
| Jednokratna kampanja (§3) | `campaigns.type = donation`, Safe ili račun organizatora | = | da |
| Kampanja za sebe / obitelj (§3) | organizator fizička osoba | faza 2 | da, označeno |
| Ponavljajuće (recurring), samo kartica (§3, §5) | nema SEPA DD kroz Monerium → mjesečni podsjetnik + QR, ili trajni nalog u banci | ≈ | da |
| Kasica (moneybox) `/s/{alias}`, bez verifikacije, novac u glavnu kampanju (§3) | intent s `metadata.moneybox`, isti target | = | da |
| Link za praćenje `/z/{slug}`, statistika, atribucija 30 dana (§4) | `metadata.tracking` na intentu + kolačić 30 dana | = | da |
| Ponude, aukcije, tuđe ponude na kampanji (§3) | prodaja = fiskalizacija + DAC7 | faza 2 | da, označeno |
| Razine podrške s ekskluzivnim postovima (§3) | `campaign_tiers` + `subscriptions` | faza 2 | da, označeno |
| Cilj, rok, „zadrži sve što skupiš”, otvoreno nakon roka (§4) | isto; novac je odmah kod organizatora pa all-or-nothing ni ne postoji | = | da |
| Ažuriranja, komentari, popis uplatitelja, anonimnost (§4) | isto; popis uplatitelja iz MPT payer tagova (ADR 0029) | = | da |
| Checkout: iznosi, poruka 300 zn, skrij ime/iznos, e-pošta, „kao tvrtka” (§5) | isto polje po polje, plaćanje = MPT intent (QR, IBAN, referenca) | ≈ | da |
| Napojnica 20 % na klizaču (§5, §7) | zaseban intent na ITalk; zadano 0 ili jednako istaknuto 0 (UOKiK slučaj) | ≈ | da |
| Metode: kartice, Apple Pay, Revolut… (§5) | SEPA Instant QR; PIS (ADR 0031) kasnije | ✗ kartice | – |
| Isplata na karticu/IBAN, 0,10 € potvrda, limit 20.000 €, kod (§6) | ne postoji: novac je već kod organizatora; iz Safea troši 2-od-3 potpisnika | ✗ | ekran „Kamo ide novac” |
| Povrat 0,50 € (§6, §7) | povrat = odlazni prijenos iz Safea/računa organizatora, platforma samo bilježi | ≈ | zapis povrata |
| Verifikacija namjene iznad 5.000 € / 12.500 € (§6) | isti pragovi → zastava i ručni pregled, bez blokade (nemamo isplatu) | ≈ | da |
| Zaključavanje naslova/opisa/cilja nakon verifikacije (§6) | isto | = | da |
| Katalog samo verificiranih, 7 javnih redoslijeda (§8) | isto; redoslijedi javno opisani (DSA) | = | da |
| Promocija, alias 1–3 € (§7) | premium, fakturira ITalk | faza 2 | označeno |
| Prijava sadržaja, moderacija komentara 14 dana, žalba (§9) | DSA čl. 16–17: prijava, obrazložena odluka | = | obrazac |
| QR, widget, poster (S1 popis) | QR = MPT `campaign-qr` (trajni), widget = iframe | = | da |
| Financije: popis uplata, XLS izvoz (S1 popis) | iz `contributions` (webhook MPT) + CSV | = | da |
| Javni API, 10.000 zahtjeva/h (§10) | javni read API (campaign-core J4) | = | kasnije |
| Hibrid: kampanja s 4funda | vanjska kampanja, gumb vodi na 4fund `/pay` | novo | da |
| Čarobnjak 5 koraka, nacrt se pamti, „Start anew” (S1 [03](research/obilazak/03-carobnjak-tip.md)) | isto; nacrt u D1 po korisniku | = | da |
| AI „Improve” naslova, 4 prijedloga (S1 [04](research/obilazak/04-carobnjak-naslov-cilj.md)) | prijedlog kroz LLM, opcionalan | faza 2 | označeno |
| Gotove naslovnice, 15 tema (S1 [05](research/obilazak/05-carobnjak-mediji.md)) | naše ilustracije, iste teme | = | da |
| PEP izjava s 3 podvrste i izjavom o kaznenoj odgovornosti (S1 [02](research/obilazak/02-verifikacija-racuna.md)) | dio KYC-a kod EMI-ja; mi samo status | ≈ | obrazac |
| Dodatna autentikacija: 6-znamenkasti kod SMS/e-pošta (S1 [14](research/obilazak/14-postavke-limiti.md)) | kod e-poštom za osjetljive radnje organizatora | ≈ | mock |
| Dnevni limit isplate i SMS obavijest (S1 [14](research/obilazak/14-postavke-limiti.md)) | nema isplate | ✗ | – |
| Vidljivost profila, 10 prekidača + indeksiranje (S1 [12](research/obilazak/12-postavke-profil.md)) | isto | = | da |
| Automatski linkovi dijeljenja (S1 [16](research/obilazak/16-postavke-linkovi.md)) | `?ref=` po korisniku + popis | = | da |
| Povijest prijava (S1 [18](research/obilazak/18-postavke-povijest-prijava.md)) | tek uz pravi login | ≈ | statično |
| Brisanje računa vraća buduće donacije (S1 [12](research/obilazak/12-postavke-profil.md)) | brisanje gasi kampanje; novac nije kod nas | ≈ | da |
