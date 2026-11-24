# crowdfund.domovina.ai — pravni i poslovni okvir (istraživanje, 24. 11. 2026.)

> **Ovo nije pravni savjet.** Ovo je istraživačka bilješka za dizajn proizvoda i popis pitanja
> za odvjetnika i poreznog savjetnika. Svaka tvrdnja ima izvor (URL ili internu putanju).
> Što nije provjereno u primarnom izvoru, označeno je **„nije provjereno"**.

**Radna pretpostavka modela:** funkcionalno kao 4fund.com, ali bez kartica. Podržavatelj plaća
SEPA uplatom na IBAN kod Moneriuma (EMI, EURe na Gnosisu) ili Swana (francuski EMI). MPT
(ITalk d.o.o., `pay.domovina.ai`) uparuje uplatu s payment intentom i sredstva završavaju u
Safeu kampanje. Platforma nikad ne drži novac i ne naplaćuje proviziju.

## 0. Što je već utvrđeno interno (ne ponavlja se ovdje)

| Tema | Gdje | Zaključak |
|---|---|---|
| Nekustodijalni softver izvan PSD2/MiCA/AMLD5/ZSPNFT | `pay.domovina.ai/docs/compliance/README.md` §3–§6 | ITalk ne treba licencu dok ne dira novac ni ključeve; tripwire: pooling / collect-and-forward = money remittance |
| Monerium ToS §16 (primanje „u ime trećih") | `pay.domovina.ai/docs/compliance/INTERNO-monerium-tos-analiza.md`, `pay.domovina.ai/docs/2026-10-11-funding-po-projektu.md` | svaki primatelj ima **vlastiti** Monerium račun (KYB) i vlastitog MPT tenanta |
| Donacijski/nagradni model izvan ECSP; povratna uplata = bankovna djelatnost | `energy.domovina.ai/docs/03-pravni-okvir.md` §2–§3, `zajedno.domovina.ai/docs/07-pravni-okvir.md` | ne smije se obećati prinos, udio ni prenosivost s tržišnom cijenom |
| Zakon o humanitarnoj pomoći (NN 156/23), porez na dohodak primatelja, donacija vs. sponzorstvo, nagradni model = predprodaja, fiskalizacija | `pinka-finance/landing/docs/pravni-okvir-primanja-sredstava.md` §1–§5 | glavna matrica „tko prima → svrha → što treba"; čl. 23 ZHP zabranjuje FO akciju za sebe/srodnike do 2. stupnja |

**Ispravak polazne pretpostavke iz zadatka:** Zakon o humanitarnoj djelatnosti NN 102/15 (i
izmjene 98/19) **više ne vrijedi**. Od 1. 1. 2024. vrijedi Zakon o humanitarnoj pomoći,
[NN 156/23](https://narodne-novine.nn.hr/clanci/sluzbeni/2023_12_156_2384.html); zakon.hr ga
vodi kao važeći s bazom ažuriranom do NN 104/26, bez kasnijih izmjena
([zakon.hr/z/418](https://www.zakon.hr/z/418/zakon-o-humanitarnoj-pomo%C4%87i)).

---

## 1. 4fund.com / Zrzutka.pl

### 1.1 Pravna osoba i licenca

| | Podatak | Izvor |
|---|---|---|
| Operator | Zrzutka.pl sp. z o.o., al. Karkonoska 59, 53-015 Wrocław; KRS 0000634168; NIP 8992796896; temeljni kapital 550.000 PLN | [4fund.com/safety](https://4fund.com/safety) (podnožje) |
| Licenca | **Krajowa instytucja płatnicza** (puna platna institucija po PSD2, ne „mała"), odobrenje KNF-a od 14. 10. 2019., registar IP48/2019 | [zrzutka.pl/safety](https://zrzutka.pl/safety), [4fund.com/safety](https://4fund.com/safety) |
| EU putovnica | „We have reported the intention to provide our payment services in all of the EEA countries on a cross-border basis … No authority objected" → pruža platne usluge u cijelom EGP-u bez podružnice | [4fund.com/safety](https://4fund.com/safety) |
| Što je licencirana usluga | „Our payment services are limited to providing Fundraisers' Accounts and processing withdrawals from them" — **platni računi kampanja** | [4fund.com/terms](https://4fund.com/terms) §2.7 |
| Pay-in | uplate procesiraju **PayU S.A.** (PL) ili **UAB ZEN.COM** (LT) | [4fund.com/terms](https://4fund.com/terms) §2.7 |
| Zaštita sredstava | sredstva na računima kampanja odvojena od vlastitih (safeguarding po poljskom zakonu o platnim uslugama iz 2011.) | [4fund.com/terms](https://4fund.com/terms) §9.4 |
| DAC7 | Zrzutka se izjašnjava kao **„platform operator"** po Direktivi (EU) 2021/514 (DAC7) zbog „Offers" (prodaja predmeta/usluga uz donaciju); traži TIN, blokira isplate dok ga nema | [4fund.com/terms](https://4fund.com/terms) §8.25–8.29 |

**Bitno za nas:** 4fund je **skrbnik** sredstava. Upravo zato mu treba licenca platne
institucije i upravo zato smije držati novac na „računu kampanje" i isplaćivati ga kasnije. Naš
model to izbjegava arhitekturom (sredstva idu izravno na račun primatelja kod EMI-ja), pa ga 4fund
ne može kopirati 1:1 — i ne treba.

### 1.2 Poslovni model i prihodi

- **Nula obveznih naknada** za uplatu i isplatu; podržavatelj i organizator mogu dobrovoljno
  „podržati 4fund" (klizač pri uplati, checkbox pri isplati)
  ([4fund.com/costs](https://4fund.com/costs)).
- **Premium usluge** organizatoru: alias URL 1–3 €, promocija 5–15 €, isticanje 8–24 €, paket
  9–27 € (za 7/14/30 dana; promocija i isticanje označeni „coming soon"); povrat (refund) 0,50 €
  po transakciji ([4fund.com/costs](https://4fund.com/costs)).
- ToS zabranjuje organizatoru da poziva podržavatelje da **ne** daju napojnicu platformi
  ([4fund.com/terms](https://4fund.com/terms) §4, odredba o opisu kampanje).
- **Financije Zrzutka.pl sp. z o.o. za 2024.:** prihodi od prodaje 435 tis. PLN, **prihodi od
  darovanja (dobrovoljne podrške) 15,7 mil. PLN**, **prihodi od kamata 3,1 mil. PLN**, neto dobit
  4,4 mil. PLN (2023.: 1,9 mil.), 23 zaposlena u prosjeku
  ([press.pl, 25. 3. 2025.](https://www.press.pl/tresc/86568,wlasciciel-serwisu-zrzutka_pl-zakonczyl-2024-rok-z-4_4-mln-zl-zysku_-mial-wiecej-srodkow-z-darowizn)).
  Ukupni prihodi 19,8 mil. PLN ([bizraport.pl](https://www.bizraport.pl/krs/0000634168/zrzutkapl-spolka-z-ograniczona-odpowiedzialnoscia)).

**Zaključak o modelu:** „zero fee" financiraju ~80 % **napojnice** i ~16 % **kamata na float**
(novac koji čeka na računima kampanja). **Mi floata nemamo** (ne držimo novac) — taj izvor nam
je strukturno nedostupan. Ostaju napojnica (zasebna uplata platformi) i premium usluge.

### 1.3 Veličina

| Metrika | Vrijednost | Izvor |
|---|---|---|
| Zrzutka.pl 2024. | >250 mil. PLN, 194 tis. novih zbiórki | [zrzutka.pl blog 416](https://zrzutka.pl/blog/416/jak-polacy-pomagali-w-2024-roku-rekordy-nowosci-i-najwazniejsze-wydarzenia-na-zrzutka-pl) |
| Zrzutka.pl 2025. | 197,2 mil. PLN, 85.017 novih zbiórki, >2,3 mil. uplata, prosjek 84,6 PLN | [xyz.pl](https://xyz.pl/dzieje-sie/zrzutka-pl-w-liczbach-podsumowanie-2025-roku-2369) (sekundarno; pad u odnosu na 2024. nije objašnjen — **nije provjereno**) |
| 4fund.com 2025. | 3,52 mil. € (2024.: 1,65 mil. €, +114 %) | [4fund blog 2152](https://4fund.com/blog/2152/fundraising-statistics-2025) (preko sažetka pretrage, **nije provjereno** u izvorniku) |
| 4fund + Zrzutka 2025. | 58,4 mil. € ukupno | isto |

4fund je dakle **mali** (~6 % grupe) — EU verzija nije osvojila tržište. 4fund ima hrvatsku
lokalizaciju (`sitemap_hr.xml` u [robots.txt](https://4fund.com/robots.txt)).

### 1.4 KYC i isplate

- Račun otvara samo fizička osoba standardnom registracijom; pravne osobe posebnim postupkom
  ([terms, uvodni sažetak](https://4fund.com/terms)).
- „Verified User": osobni podaci + **Onfido** (dokument + selfie); isplata na **VISA/Mastercard**
  karticu (provjera mikro-terećenjem) ili na **bankovni račun** uz uplatu 0,10 € koja se vraća
  ([terms §3.3, §4.13–4.14](https://4fund.com/terms)).
- **Obvezna verifikacija svrhe** kad kampanja prijeđe **5.000 €** ili zbroj svih kampanja
  korisnika **12.500 €**; isplate se automatski blokiraju dok verifikacija traje; 14 dana za
  dokumente ([terms §5](https://4fund.com/terms)).
- Kampanje za područja oružanog sukoba trebaju prethodnu suglasnost platforme
  ([terms §12.4](https://4fund.com/terms)).
- Zabranjeno: nezakonita svrha u državi korisnika **ili u Poljskoj**, kazne/jamčevine iz kaznenog
  postupka, oružje, projekti koji traže dozvolu koju organizator nema
  ([terms, sažetak i §4](https://4fund.com/terms)).

### 1.5 Regulatorni incidenti

- **UOKiK (studeni 2024.)**: optužnica protiv Zrzutka.pl zbog povrede kolektivnih interesa
  potrošača — sučelje sugerira da je dobrovoljna naknada obvezna, a pop-up s „tužnom mačkom" pri
  odbijanju napojnice ocijenjen je kao emocionalni pritisak; istraga i nad Pomagam.pl i
  Siepomaga.pl; moguća kazna do 10 % prometa
  ([UOKiK](https://uokik.gov.pl/en/crowdfunding-website-practices-under-scrutiny-of-the-president-of-uokik),
  [money.pl](https://www.money.pl/gospodarka/zrzutka-pl-z-zarzutami-pod-lupa-takze-inne-serwisy-jest-pierwsza-reakcja-7089372796000992a.html)).
  Ishod postupka: **nije provjereno**.
- KNF mjere protiv Zrzutka.pl: ništa nije nađeno (**nije provjereno** u registru KNF-a).

**Pouka:** napojnica smije biti samo stvarno dobrovoljna, s **0 kao zadanom ili jednako
istaknutom** opcijom. Direktiva o nepoštenoj poslovnoj praksi (2005/29/EZ) vrijedi za nas bez
obzira na veličinu.

---

## 2. Usporedive platforme

| Platforma | Model | Naknade | Regulacija / tko drži novac |
|---|---|---|---|
| **4fund / Zrzutka** (PL) | P2P, bilo koja svrha | 0 % + dobrovoljna napojnica; premium 1–27 € | sama je PI (KNF IP48/2019), drži novac — §1 |
| **Zeffy** (CA/US) | samo neprofitne org. | 0 % platforma i procesiranje; jedini prihod dobrovoljni doprinos donatora (navodno ~60–67 % donatora daje, prosjek ~4 %) | procesor plaćanja (Stripe) — **nije provjereno**; [zeffy.com/pricing](https://www.zeffy.com/pricing), [support.zeffy.com](https://support.zeffy.com/how-is-zeffy-free); kritika skrivenog „0" kod napojnice: [Donorbox blog](https://donorbox.org/nonprofit-blog/zeffy-alternatives) |
| **GoFundMe** (EU) | P2P + dobrotvorne | 0 % platforma; transakcijska naknada 2,9 % + 0,25 € (euro); dobrovoljna napojnica | ugovorna strana izvan UK: GoFundMe Ireland Limited ([terms](https://www.gofundme.com/en-ie/c/terms)); vlastita EU licenca **nije provjerena** (koristi procesore) — [pricing](https://www.gofundme.com/en-ie/c/pricing) |
| **Leetchi** (FR) | cagnotte, P2P | povijesno 0 % do 100 €, zatim ~6 % / 1,5 %; izvori proturječni — **nije provjereno** | novac kroz Mangopay (EMI, CSSF Luxembourg) ([Wikipedia](https://en.wikipedia.org/wiki/Mangopay)); je li Leetchi agent Mangopaya — **nije provjereno** |
| **Donorbox** (US) | alat za neprofitne | 2,95 % (Standard, 0 $/mj.), 1,75 % (Pro ~150 $/mj.) + Stripe/PayPal | procesor; [donorbox.org/pricing](https://donorbox.org/pricing) |
| **Patronite** (PL) | pretplate za kreatore | ~6,5 % + PDV na proviziju (izvor konkurent BuyCoffee) — **nije provjereno** | PI za pay-in **nije provjerena**; [poradnikprzedsiebiorcy.pl](https://poradnikprzedsiebiorcy.pl/-wplaty-na-konto-patronite-jak-opodatkowac) |
| **Hrvatske** | — | — | Nije nađena aktivna hrvatska P2P donacijska platforma usporediva s 4fundom. Katalog [thecrowdspace — HR donation](https://thecrowdspace.com/directory/donation-crowdfunding-platforms-in-croatia) ne daje imena u izvodu; CroEnergy je Interreg projekt, ne platforma ([interregeurope.eu](https://interregeurope.eu/good-practices/croenergyeu)). Hrvati danas koriste GoFundMe, 4fund i izravne IBAN-e udruga — **nije provjereno** sustavno. |

**Što iz tablice slijedi:** svi „zero fee" modeli žive od napojnice (Zeffy, 4fund) ili od kamata
na float (4fund). Nijedan nije nekustodijalan. Naša prednost nije cijena (svi već tvrde 0 %),
nego **(a)** nema kartične naknade jer nema kartice, **(b)** novac je odmah na računu primatelja
(nema blokade isplate kao kod 4funda iznad 5.000 €), **(c)** javno provjerljiv trag (on-chain +
potvrde ADR 0022/0023).

---

## 3. Hrvatsko pravo: tko smije skupljati i kako se oporezuje

Glavnu matricu (ZHP, porez na dohodak, donacija vs. sponzorstvo, predprodaja, fiskalizacija) daje
`pinka-finance/landing/docs/pravni-okvir-primanja-sredstava.md` §1–§5. Ovdje su dopune koje tamo
nedostaju i raspored po tipovima kampanja.

### 3.1 Dopuna A — porez na darove (lokalni porez)

Pinkin dokument pokriva samo porez na dohodak. Postoji i **porez na nasljedstva i darove**:

- obveznik je **primatelj** dara u novcu, novčanim tražbinama, vrijednosnim papirima i
  pokretninama; stopa **4 %**; prag **6.700 €** Porezna uprava navodi **samo za pokretnine**
  (pojedinačna tržišna vrijednost), ne za novac
  ([Porezna uprava](https://porezna-uprava.gov.hr/hr/nasljednik-i-daroprimatelj-gotovine-novcane-trazbine-vrijednosnog-papira-i-pokretnine/4445));
- oslobođeni su: bračni drug, potomci, preci, posvojenici/posvojitelji; RH i JLS; javne
  ustanove, vjerske zajednice, zaklade, Crveni križ, neprofitne organizacije upisane za
  humanitarnu pomoć; te **„fizičke i pravne osobe koje primaju donacije za namjene utvrđene
  posebnim propisima"** (isto);
- ako je na isti primitak plaćen drugi porez, ovaj se ne plaća (isto, sažetak pretrage).

Zakonska osnova je Zakon o lokalnim porezima — čl. i rok prijave (vjerojatno 15 dana od primitka)
**nije provjereno**. **Posljedica:** FO koja skupi novac za rođendanski poklon kolegi ili za
vlastiti projekt (ne humanitarna, ne „javno oglašena akcija" iz ZPD čl. 8) potencijalno duguje
4 % na primljeni novac od ne-srodnika. Kako se to primjenjuje na stotine malih uplata različitih
darovatelja — pitanje za poreznog savjetnika (§7).

### 3.2 Dopuna B — fiskalizacija nagradnih kampanja

Od **1. 1. 2026.** računi krajnjim potrošačima (B2C) fiskaliziraju se **bez obzira na način
plaćanja**, uključujući **transakcijski račun**
([Porezna uprava — B2C](https://porezna-uprava.gov.hr/hr/fiskalizacija-racuna-u-krajnjoj-potrosnji-b2c-poslovanje-azurirano-5-1-2026/8033)).
Dakle: obrt ili d.o.o. koji na našoj platformi „prodaje" nagradu za SEPA uplatu **mora izdati
fiskalizirani račun**, iako novac nije prošao kroz blagajnu ni karticu. Ranije (Fiskalizacija
1.0) plaćanje transakcijskim računom nije se fiskaliziralo — taj izlaz više ne postoji. Tko u tom
odnosu izdaje račun: **organizator**, ne platforma (platforma nije prodavatelj).

### 3.3 Dopuna C — tipovi kampanja izvan dosega

| Tip | Zašto ga isključiti u fazi 1 | Izvor |
|---|---|---|
| Politička kampanja / stranka / kandidat | poseban režim donacija (Zakon o financiranju političkih aktivnosti, izborne promidžbe i referenduma): limiti, zabrana anonimnih donacija, posebni račun — detalji **nije provjereno** | [zakon.hr — pretraga](https://www.zakon.hr/) |
| Tombola, lutrija, nagradna igra uz uplatu | priređivanje igara na sreću traži odobrenje (Zakon o igrama na sreću) — **nije provjereno** za male tombole udruga | — |
| Prikupljanje za kazne / jamčevine | 4fund to zabranjuje; mi bismo slijedili isto zbog reputacijskog rizika | [4fund terms, sažetak](https://4fund.com/terms) |
| Bilo što s prinosom, kamatom, udjelom ili obećanjem povrata | ECSP / ZKI / prospekt | `energy.domovina.ai/docs/03-pravni-okvir.md` §2–§3 |

### 3.4 Raspored tipova kampanja po režimu

| # | Tip kampanje | Organizator | Režim | Platforma traži |
|---|---|---|---|---|
| K1 | Udruga za vlastitu statutarnu djelatnost (oprema, projekt) | udruga / zaklada | Zakon o udrugama + neprofitno računovodstvo; **nije** ZHP | OIB, RNO broj, statut (svrha), ovlaštena osoba; KYB kod EMI-ja |
| K2 | Humanitarna akcija za treću osobu | udruga, d.o.o. ili FO **izvan** kruga srodstva | ZHP: **rješenje prije početka**, max 90 (+90) dana, zaseban račun, izvješće u 30 dana | upload rješenja + broj/QR akcije; rok kampanje = rok iz rješenja |
| K3 | Stalni prikupljač humanitarne pomoći | neprofitna PO s rješenjem | ZHP stalni prikupljač | rješenje o statusu |
| K4 | FO za sebe ili srodnika do 2. st. „u potrebi" | FO | **zabranjeno kao humanitarna akcija** (ZHP čl. 23); moguće samo kao **javno oglašena akcija** iz ZPD čl. 8 (općekorisno, dokaziva potrebitost, javno objavljen račun **osobe u potrebi**) | ne u fazi 1 — vidi §6 |
| K5 | FO skuplja s prijateljima (poklon, izlet, zajednički trošak) | FO | nije humanitarno; darovanje → moguć porez na darove (§3.1) | KYC kod EMI-ja; upozorenje o porezu |
| K6 | Nagradna / predprodajna kampanja | obrt, d.o.o., udruga s gospodarskom djelatnošću | prodaja: račun, PDV ako je u sustavu, **fiskalizacija** (§3.2); DAC7 (§4.5); potrošačko pravo (pravo na odustanak) | OIB/TIN, podaci trgovca (DSA čl. 30 ako nismo mikro/mali), izjava o izdavanju računa |
| K7 | Donacija d.o.o.-u / obrtu za poslovanje | d.o.o., obrt | oporezivi prihod primatelja | KYB |
| K8 | Sponzorstvo (logo, vidljivost) | bilo tko | usluga → račun + PDV | označiti kao sponzorstvo, ne donaciju |
| K9 | JLS, škola, javna ustanova | javni subjekt | proračunska pravila | izvan faze 1 (EMI račun javnog subjekta — **nije provjereno** da je dopušten) |

---

## 4. EU okvir

### 4.1 ECSP (Uredba 2020/1503) — donacije i nagrade izvan dosega

„Usluga skupnog financiranja" definirana je kao spajanje poslovnih interesa financiranja putem
**zajmova** ili **plasmana prenosivih vrijednosnih papira / instrumenata dopuštenih za skupno
financiranje** (čl. 2. st. 1. t. (a)); uredba se ne primjenjuje ni na projekte čiji su nositelji
potrošači (čl. 1. st. 2. t. (a))
([EUR-Lex 32020R1503](https://eur-lex.europa.eu/eli/reg/2020/1503/oj)). Donacijski i nagradni
model nisu obuhvaćeni — interno potvrđeno u `energy.domovina.ai/docs/03-pravni-okvir.md` §3 i
[HANFA](https://www.hanfa.hr/podrucja-nadzora/trziste-kapitala/skupno-financiranje-crowdfunding/).
Non-custody nas **ne** štiti od ECSP-a; štiti nas samo vrsta instrumenta (isto, §2.1).

### 4.2 PSD2 → PSD3/PSR: treba li orkestratoru licenca?

- **Danas (PSD2):** platforma koja ni u jednom trenutku ne ulazi u posjed sredstava pada pod
  čl. 3. t. (j) (tehnički pružatelj usluge) — razrađeno u
  `pay.domovina.ai/docs/compliance/README.md` §4. Tripwire: ako ITalk ikad primi uplatu na svoj
  račun i proslijedi je kampanji → **novčana pošiljka** (Prilog I. t. 6) → licenca HNB-a.
- **Iznimka trgovačkog zastupnika** (čl. 3. t. (b)) **nam ne treba** i ne treba je tražiti: ona
  služi platformama koje **primaju** novac u ime jedne strane. Mi ne primamo ništa.
- **PSD3/PSR:** privremeni politički dogovor Vijeća i Parlamenta **27. 11. 2025.**; iznimka
  trgovačkog zastupnika **sužava se** (samo kad zastupnik djeluje za jednu stranu i ima stvarnu
  ovlast pregovaranja), EBA izdaje smjernice; tehnički pružatelji ostaju izvan licence, ali PSR
  im navodno uvodi neke obveze i ograničenu odgovornost za štetu
  ([Hogan Lovells](https://www.hoganlovells.com/en/publications/final-texts-for-psd3-and-psr-awaited-as-european-parliament-and-council-of-eu-announce-provisional),
  [Taylor Wessing](https://www.taylorwessing.com/zh-hant/insights-and-events/insights/2025/11/eu-lawmakers-strike-a-deal-on-payments-reforms),
  [EP legislative train](https://www.europarl.europa.eu/legislative-train/theme-an-economy-that-works-for-people/file-payment-services-and-electronic-money-services-(directive))).
  Konačni tekst, objava u SL i datum primjene: **nije provjereno**. Za nas je bitno da sužavanje
  iznimke trgovačkog zastupnika pogađa 4fund-like kustodijalne konkurente, ne nas.
- **Verification of Payee** (Uredba 2024/886, od 9. 10. 2025.): banka podržavatelja provjerava
  podudara li se ime primatelja s IBAN-om. Ime vlasnika EMI računa mora biti **ime organizatora**
  kampanje, ne „DOMOVINA crowdfund" — inače podržavatelj vidi upozorenje o nepodudaranju. To je
  dodatni razlog za model „račun je organizatorov" (**nije provjereno** kako Monerium/Swan vraćaju
  ime za vIBAN).

### 4.3 Model računa: tko je vlasnik IBAN-a

Ovo je **najveće praktično ograničenje** modela:

- **Monerium:** primanje „u ime trećih" kroz platformin račun nije dopušteno (ToS §16) → svaki
  organizator treba **vlastiti** Monerium račun
  (`pay.domovina.ai/docs/compliance/INTERNO-monerium-tos-analiza.md`). Od **30. 10. 2026.**
  Monerium **ne prima fizičke osobe** kroz monerium.app, samo kroz partnere Bleap/Rebind, koji nemaju
  API/webhookove i zabranjuju poslovnu upotrebu (interna memorija projekta,
  `reference_monerium_individual_via_partners`). → **FO organizator ne može kroz Monerium.**
- **Swan:** model „organizator = account holder, MPT = partner/projekt" radi u sandboxu; produkcija
  traži ugovor i odobrenje projekta od Swanovog compliancea; cijena i obveze partnera nepoznate
  (`pay.domovina.ai/docs/research/provideri/swan.md` G7/G8). Smije li account holder biti FO
  rezident RH i prihvaća li Swan crowdfunding kao use case: **nije provjereno**.

### 4.4 AML: AMLR uvodi „crowdfunding intermediary" — **novi rizik**

Interni dokument `pay.domovina.ai/docs/compliance/README.md` §4 zaključuje da ITalk nije obveznik
po AMLR-u — ali to vrijedi za **wallet**, ne za crowdfunding platformu. AMLR
(Uredba (EU) 2024/1624) među obveznike (čl. 3. t. 3. podtočka 8.) uvodi **„crowdfunding service
providers and crowdfunding intermediaries"**, a „crowdfunding intermediary" definira (čl. 2.
st. 1. t. 16.) kao:

> „an undertaking other than a crowdfunding service provider the business of which is to match or
> facilitate the matching, through an internet-based information system open to the public …, of
> project owners … **including fundraising for a particular cause or event** … and funders …
> contributing … through loans … **or donations, including where such donations entitle the donor
> to a non-material benefit**"

([springlex — čl. 2](https://www.springlex.eu/en/packages/aml/amlr-regulation/article-2/),
[čl. 3](https://www.springlex.eu/en/packages/aml/amlr-regulation/article-3/),
[EUR-Lex 2024/1624](https://eur-lex.europa.eu/eli/reg/2024/1624/oj)).

**Čitanje:** definicija **ne traži** držanje sredstava — dovoljno je spajanje. crowdfund.domovina.ai
je, po svemu sudeći, **crowdfunding intermediary** i od primjene AMLR-a (**10. 7. 2027.**, opći
datum primjene — datum za ovu kategoriju **nije provjereno** posebno) postaje **obveznik AML-a**:
procjena rizika, dubinska analiza stranaka (barem organizatora), praćenje, prijave FIU-u (u RH
Ured za sprječavanje pranja novca), čuvanje podataka. Napomene:

- donacije uz **materijalnu** nagradu (čista predprodaja) možda su izvan definicije („non-material
  benefit") — **nije provjereno**, pitanje za pravnika;
- KYC koji obavlja EMI (Monerium/Swan) nad organizatorom vjerojatno se može koristiti kao
  **oslanjanje na treću stranu** (AMLR odredbe o reliance) — **nije provjereno**;
- danas (ZSPNFT) crowdfunding platforme nisu na listi obveznika — **nije provjereno** u
  pročišćenom tekstu.

Ovo mijenja dizajn: platforma mora od prvog dana biti građena tako da može postati obveznik
(identifikacija organizatora, evidencija, monitoring neobičnih obrazaca), čak i ako u fazi 1 to
zakonski još ne mora.

### 4.5 DSA i DAC7

| Obveza | Tko | Primjena na nas | Izvor |
|---|---|---|---|
| Notice & action (čl. 16), obrazloženje odluke (čl. 17), kontakt točke (čl. 11–12), uvjeti (čl. 14) | **svi** pružatelji usluge smještaja informacija | ✅ odmah — kampanje su korisnički sadržaj | [DSA, EUR-Lex 2022/2065](https://eur-lex.europa.eu/eli/reg/2022/2065/oj) |
| Interni sustav prigovora, izvansudsko rješavanje, zabrana dark patterns (čl. 25), oglašavanje | online platforme (Odjeljak 3) | ❌ izuzeti dok smo **mikro ili malo poduzeće** (čl. 19) | isto |
| Sljedivost trgovaca (čl. 30), dizajn za usklađenost (čl. 31) | platforme koje omogućuju potrošačima sklapanje ugovora na daljinu s trgovcima (Odjeljak 4) | ❌ izuzeti kao mikro/malo (čl. 29); relevantno za K6 kad narastemo | isto |
| DAC7 izvještavanje | „platform operator" koji omogućuje **prodaju robe** ili osobne usluge | ⚠️ K6 (nagrade) vjerojatno okida DAC7 — 4fund se tako izjašnjava; isključen je prodavatelj s <30 prodaja i ≤2.000 € godišnje; izuzeće za platformu bez naknade **nije provjereno** | [Direktiva 2021/514](https://eur-lex.europa.eu/eli/dir/2021/514/oj), [4fund terms §8.25](https://4fund.com/terms) |

Napomena: izuzeće iz DSA Odjeljka 3 ne skida obveze iz Direktive o nepoštenoj poslovnoj praksi
(UOKiK slučaj, §1.5) ni iz potrošačkog prava za K6.

---

## 5. Hibridni model: 4fund kampanje na našoj platformi s vanjskim linkom

| Pitanje | Nalaz | Izvor |
|---|---|---|
| Zabranjuje li 4fund ToS linkanje, scraping ili embed? | U ToS-u nije nađena izričita odredba o scrapingu, crawlingu, embedanju ni linkanju (pretraga pojmova *scrap, crawl, robot, embed, widget, link, affiliate, partner*) | [4fund.com/terms](https://4fund.com/terms) |
| robots.txt | dopušta gotovo sve; zabranjeni samo `/ajax/profile/*/sendMail` i katalog kreatora; objavljuje sitemape po jeziku, uključujući `sitemap_hr.xml` | [4fund.com/robots.txt](https://4fund.com/robots.txt) |
| Intelektualno vlasništvo | „The name of the Website, our logo, graphic design, software, Website code and **database** are subject to legal protection" (čl. 13.1) | [4fund.com/terms](https://4fund.com/terms) |
| Pravo baze podataka | sustavno preuzimanje i ponovna uporaba bitnog dijela baze (npr. puni katalog kampanja s iznosima) može povrijediti *sui generis* pravo (Direktiva 96/9/EZ čl. 7); CJEU *Innoweb* C-202/12: namjenska meta-tražilica nad tuđom bazom = ponovna uporaba | [Direktiva 96/9](https://eur-lex.europa.eu/eli/dir/1996/9/oj), [C-202/12](https://curia.europa.eu/juris/liste.jsf?num=C-202/12) |
| Hiperlink na javnu stranicu | link na slobodno dostupan sadržaj nije „priopćavanje javnosti" (CJEU *Svensson* C-466/12) | [C-466/12](https://curia.europa.eu/juris/liste.jsf?num=C-466/12) |
| Slike i opisi kampanja | autorsko pravo **organizatora**, ne 4funda; kopiranje opisa/fotografija bez dozvole organizatora je rizik | opće autorsko pravo — **nije provjereno** za konkretan slučaj |
| Affiliate / partnerski program | nije nađen | **nije provjereno** (ToS + pretraga) |
| Žig | „4fund" i logo; nominativna upotreba („plati na 4fund") vjerojatno dopuštena, ali bez sugeriranja partnerstva | **nije provjereno** |
| Odgovornost za prijevaru u linkanoj kampanji | mi ne hostamo tu kampanju; ali ako je kuriramo/promoviramo, reputacijski rizik je naš | — |

**Preporuka:** hibrid je izvediv ako je **opt-in organizatora** („Imam kampanju na 4fundu, dodaj
je ovdje" — organizator upisuje svoj link, naslov i sliku, čime nam daje dozvolu za svoj sadržaj).
**Ne** raditi masovni scraping 4fund kataloga (pravo baze + `forfund-route-templates.txt` u ovom
folderu pokazuje da je mapiranje ruta već rađeno — koristiti samo za istraživanje, ne za
produkcijski uvoz). Iznos „prikupljeno" za vanjske kampanje ne prikazivati kao naš podatak, ili ga
dohvaćati samo uz pristanak organizatora. Prije lansiranja pisati 4fundu (contact@4fund.com) — mogu
reći da ili ponuditi suradnju.

---

## 6. Zaključci za dizajn platforme

### 6.1 Tko je reguliran za što

| Akter | Uloga | Regulacija |
|---|---|---|
| Podržavatelj | SEPA uplata iz svoje banke | KYC kod svoje banke; VoP provjera imena |
| EMI (Monerium / Swan) | vodi račun organizatora, mint EURe / knjiženje | EMI licenca, KYC/KYB organizatora, AML, safeguarding |
| Organizator | prima u svoje ime na svoj račun | ZHP (K2/K3), Zakon o udrugama (K1), porez na dohodak / darove (K4/K5), PDV + fiskalizacija (K6), račun za sponzorstvo (K8) |
| ITalk / MPT | uparivanje uplate s intentom, rutiranje u Safe kampanje | nekustodijalni tehnički pružatelj (PSD2 3(j)); **od 10. 7. 2027. vjerojatno AMLR obveznik kao crowdfunding intermediary** |
| crowdfund.domovina.ai | katalog kampanja, profili, prijave | DSA hosting (čl. 11–17); DAC7 za K6; UCPD za napojnicu; GDPR |

### 6.2 Faza 1 — što nuditi

**Da:** K1 (udruge i zaklade za vlastitu djelatnost) i K2/K3 (humanitarna akcija ili stalni
prikupljač **s uploadanim rješenjem**). Razlozi: organizator je pravna osoba → može dobiti
korporativni Monerium KYB (FO danas ne može, §4.3); porezni tretman je jasan; nema DAC7 ni
fiskalizacije.

**Ne u fazi 1:**
- K4 i K5 (FO organizatori) — dok se ne potvrdi Swan za fizičke osobe **i** porez na darove
  (§3.1). To je upravo 4fundov glavni use case, pa bez njega nismo „hrvatski 4fund", nego
  „platforma za udruge". Treba to reći otvoreno u pozicioniranju.
- K6 (nagrade) — fiskalizacija, DAC7, potrošačko pravo, DSA čl. 30 kasnije.
- Politika, lutrije, kazne, sve s prinosom (§3.3).

### 6.3 Verifikacija koju platforma traži (minimalno, AMLR-spremno)

1. Organizator = pravna osoba: OIB, RNO/registar udruga, ovlaštena osoba (ime + e-pošta +
   telefon preko otp.domovina.ai), statut s ciljevima; **KYB obavlja EMI**, mi čuvamo samo
   referencu (account ID), ne dokumente.
2. Humanitarna kampanja: rješenje (KLASA/URBROJ), rok, oznaka akcije; kampanja se automatski
   zatvara na rok iz rješenja (ZHP čl. 21); podsjetnik za izvješće u 30 dana (čl. 27).
3. Ime vlasnika IBAN-a = ime organizatora (VoP).
4. Prag pojačane provjere po uzoru na 4fund (5.000 € po kampanji / 12.500 € po organizatoru),
   ali bez blokade isplate (mi je nemamo) — umjesto toga zastava u adminu i ručni pregled.
5. Notice & action: gumb „Prijavi kampanju" na svakoj stranici, obrazložene odluke (DSA čl. 16–17).
6. Izjava o namjeni viška sredstava prije prelaska cilja (porezna zamka, pinka §4.3).

### 6.4 Prihod uz 0 % proviziju

- Dobrovoljna napojnica kao **zaseban intent** na ITalkov račun (ne odbitak od uplate kampanji —
  to bi bio collect-and-forward), **0 kao jednako istaknuta opcija**, bez emocionalnog pritiska
  (UOKiK, §1.5).
- Premium usluge organizatoru (alias, isticanje) — fakturira ITalk, uz PDV i fiskalizaciju.
- Floata nema i ne smije ga biti (tripwire).

---

## 7. Otvorena pitanja za pravnika

1. **AMLR:** je li crowdfund.domovina.ai „crowdfunding intermediary" (čl. 2. st. 1. t. 16.) i od
   kojeg datuma; koje obveze možemo ispuniti oslanjanjem na KYC EMI-ja; jesu li čiste
   predprodajne kampanje („material benefit") izvan definicije?
2. **ZHP:** je li platforma „organizator" ili „posrednik" humanitarne akcije koju objavi treća
   osoba; mora li platforma provjeravati rješenje i odgovara li za akciju bez rješenja (čl. 63)?
   (Isto pitanje već u pinka §9.1 — treba ga zatvoriti jednom za obje platforme.)
3. **ZHP čl. 24:** zadovoljava li EMI račun organizatora (Monerium EE IBAN, Swan FR IBAN) uvjet
   „zasebnog računa" za humanitarnu akciju, ili mora biti račun kod banke u RH?
4. **Porez na darove:** plaća li FO 4 % na zbroj malih uplata različitih darovatelja za ne-humanitarnu
   svrhu (K5); postoji li prag za novac; rok i oblik prijave; je li primitak nastao mintom EURe ili
   konverzijom (pinka §9.3)?
5. **„Javno oglašena akcija" (ZPD čl. 8):** može li „javno objavljen račun osobe u potrebi" biti
   EE/FR IBAN kod EMI-ja ili Safe adresa?
6. **DAC7:** je li platforma bez naknade „platform operator" za K6; što ako je jedina „naknada"
   dobrovoljna napojnica?
7. **Napojnica ITalku:** naknada za uslugu (račun, PDV, fiskalizacija) ili dar d.o.o.-u (prihod,
   porez na dobit)?
8. **PSD3/PSR:** uvodi li konačni tekst obveze za tehničke pružatelje koje pogađaju MPT (npr.
   odgovornost za štetu, obavještavanje regulatora)?
9. **Hibrid s 4fundom:** smijemo li prikazivati iznos prikupljen na 4fund kampanji koju je organizator
   sam dodao (pravo baze podataka 4funda vs. podatak organizatora)?
10. **Swan:** smije li FO rezident RH biti account holder u našem partnerskom projektu za
    crowdfunding i čini li to ITalk Swanovim zastupnikom ili distributerom po PSD2/EMD2
    (registar agenata)?
11. **Monerium ToS §16** za model „kampanja udruge = zaseban Safe pod istim Monerium profilom udruge":
    je li to i dalje primanje u vlastito ime? (`pay.domovina.ai/docs/2026-10-11-funding-po-projektu.md`
    pretpostavlja da jest.)
