# Nudi li 4fund / Zrzutka.pl svoju platnu licencu trećima kao servis?

Datum: 25. 11. 2026. Polazište: `crowdfund.domovina.ai/docs/research/2026-11-24-4fund-javni-pregled.md`
i `2026-11-24-pravni-i-poslovni-okvir.md` (licenca IP48/2019, PayU/ZEN, read-only API već
zabilježeni). Ovaj dokument provjerava te tvrdnje i dodaje registar EBA-e, agente, grupu i
usporedbe. Ništa nije kontaktirano, nijedna forma nije ispunjena.

## Odgovor ukratko

**Ne.** Nema nikakvog javnog traga da Zrzutka.pl sp. z o.o. nudi platnu infrastrukturu trećima
(acquiring, virtualne IBAN-ove, payout API, white-label, PaaS). Licencu koristi samo za vlastite
platforme zrzutka.pl i 4fund.com, isto kao Vinted Pay za Vinted. Opseg licence to i potvrđuje:
Zrzutka **nema ovlaštenje za acquiring** (Prilog I. t. 5b) ni za novčanu pošiljku (t. 6), a
upravo te usluge treba PSP koji radi za tuđe platforme.

## 1. Licenca: tip, registar, passport, usluge

### Provjereno

| Tvrdnja | Izvor |
|---|---|
| Tip: **krajowa instytucja płatnicza (KIP)**, puna platna institucija po PSD2. Nije mała instytucja płatnicza (MIP) ni EMI. | [zrzutka.pl/safety](https://zrzutka.pl/safety); [bank.pl](https://bank.pl/zrzutka-pl-z-licencja-knf-co-to-oznacza-dla-ponad-300-tys-zarejestrowanych-uzytkownikow-portalu/) |
| Dozvola KNF-a od 14. 10. 2019., Rejestr usług płatniczych br. **IP48/2019** | [4fund.com/safety](https://4fund.com/safety); [zrzutka.pl/safety](https://zrzutka.pl/safety) |
| Licencu su morali dobiti jer je novela poljskog zakona o platnim uslugama iz lipnja 2018. ukinula izuzeće na koje su se dotad oslanjali | [bank.pl](https://bank.pl/zrzutka-pl-z-licencja-knf-co-to-oznacza-dla-ponad-300-tys-zarejestrowanych-uzytkownikow-portalu/) |
| Registar EBA-e: `PSD_PI`, `PL_PFSA!8992796896`, upis 2019-10-25 | registar EBA-e, upit `POST https://euclid.eba.europa.eu/register/api/search/entities` (ENT_NAM ~ "zrzutka"), verzija zapisa 2023-11-16 |
| **Usluge (Prilog I. PSD2):** `PS_010` (1. polog gotovine na platni račun), `PS_020` (2. podizanje gotovine), `PS_03C` (3c. kreditni transferi), `PS_05A` (5. **izdavanje** platnih instrumenata). **Nema** `PS_05B` (acquiring), `PS_060` (novčana pošiljka), `PS_070` (PIS), `PS_080` (AIS). | isti zapis; šifre dekodirane iz `https://euclid.eba.europa.eu/register/pir-api/metadata` |
| **Passport:** iste četiri usluge prijavljene u svih 30 država EGP-a (27 EU + IS, LI, NO), uključujući **HR** | zapis EBA-e; [4fund.com/safety](https://4fund.com/safety): „No authority objected…” |
| **Agenti i podružnice: 0.** Upit po `ENT_COD_PAR_ENT = PL_PFSA!8992796896` vraća prazno. Isti upit za Mangopay S.A. vraća 191 podružnicu ili agenta, dakle oblik upita radi. | registar EBA-e |
| Opseg prema vlastitim uvjetima: „Our payment services are limited to providing Fundraisers' Accounts and processing withdrawals from them … Donation payments are processed by an external licensed payment services providers - PayU S.A. … or UAB ZEN.COM” | [4fund.com/terms](https://4fund.com/terms) §2.7 |
| Okvirni ugovor o platnim uslugama (Prilog 1) sklapa se **samo s Organizatorom** kampanje, i to tek kad prođe verifikaciju i otvori prvu kampanju | [4fund.com/terms](https://4fund.com/terms), Appendix 1 §2 |

### Zaključak / procjena

- Licenca pokriva usko ono što 4fund radi za sebe: vodi račun kampanje (platni račun),
  isplaćuje s njega i izdaje „platni instrument” (sučelje ili karticu za isplatu). Da bi
  procesirao uplate za tuđu platformu, trebao bi acquiring (5b) ili barem novčanu pošiljku (6),
  a ni jedno ni drugo nema.
- Nula agenata i podružnica znači da ni nijedna treća strana ne radi „pod njihovom licencom”
  kao agent. To je uobičajen put kojim PI posuđuje licencu partneru.

## 2. Tko stvarno procesira uplate

### Provjereno

| Tvrdnja | Izvor |
|---|---|
| Uplate donacija procesiraju **PayU S.A.** (Poznań, KNF IP1/2012) ili **UAB ZEN.COM** (Vilnius, EMI Litva) | [4fund.com/terms](https://4fund.com/terms) §2.7; [4fund.com/privacy](https://4fund.com/privacy) |
| „for most of the payment methods we offer, we use the payment services of a third party, PayU S.A.” PayU je zaseban voditelj obrade podataka | [4fund.com/privacy](https://4fund.com/privacy) |
| Ponavljajuće kartične uplate: PayU widget, PayU čuva podatke kartice, reklamacije idu izravno PayU-u | [4fund.com/terms](https://4fund.com/terms) §5 (recurring) |
| „Payment and withdrawal security is guaranteed by PayU” | [4fund.com/safety](https://4fund.com/safety) |
| Isplate na karticu: **Visa Direct** i **Mastercard Send** preko **PayU GPO** (PayU-ova globalna procesorska grana), ili SEPA na IBAN | [poland.payu.com](https://poland.payu.com/news/natychmiastowe-przelewy-na-karty-na-zrzutka-pl/) (8. 8. 2023.); [visa.pl](https://www.visa.pl/visa-everywhere/blog/bdp/2021/09/14/visa-direct-zrzutka-1631610538688.html); [4fund.com/terms](https://4fund.com/terms) |
| Na zrzutka.pl: „ponad 40 kanałów płatności”, „Zrzutka.pl współpracuje z PayU”; svaka zrzutka dobiva vlastiti broj računa za izravne uplate | [zrzutka.pl/blog/47](https://zrzutka.pl/blog/47/przyjmowanie-platnosci-na-zrzutka-pl) |
| PayU ima u registru EBA-e i `PS_05B` (acquiring), `PS_060` i `PS_070`; ZEN.COM ima `PS_05B` | registar EBA-e |

U uvjetima i politici privatnosti nisu nađeni Stripe, Adyen, Przelewy24, Tpay ni Checkout.com.

### Zaključak

Kartice, BLIK, pay-by-link, Apple Pay i Google Pay **nisu njihov acquiring**. Te uplate idu kroz
PayU, a dio kroz ZEN.COM. Zrzutka ima vlastiti ledger računa kampanja i vlastite isplate. To je
model „licencirani skrbnik + vanjski acquirer”, a ne PSP koji se može ponuditi dalje.

## 3. API, widgeti, B2B

### Provjereno

| Tvrdnja | Izvor |
|---|---|
| Javni API (OpenAPI 3.0) ima **samo GET**: kampanje korisnika, kampanja, uplate, „moneyBoxes”. Limit 10.000 zahtjeva na sat. | [4fund.com/api/v1/public/doc](https://4fund.com/api/v1/public/doc) |
| Pristup na zahtjev kroz kontakt obrazac, uz opis namjene; dobije se individualni `access_token` | [zrzutka.pl FAQ: open API](https://zrzutka.pl/faq/user-account/how-to-access-the-open-api) |
| Nisu javni: login, registracija, **uplate**, **isplate**, verifikacija, premium, **saldo**. „Dostęp do tych endpointów możemy udostępnić wyłącznie bankom, instytucjom płatniczym lub innym dostawcom posiadającym odpowiednią licencję … Ograniczenie to wynika z przepisów … PSD2.” | isti FAQ |
| Widget za blog ili web prikazuje kampanju i vodi na stranicu kampanje ili na stranicu za uplatu. Uz to postoje integracije Facebook Pixel i Google Analytics. | [zrzutka.pl/blog/237](https://zrzutka.pl/blog/237/zaawansowane-funkcje-zrzutka-pl-jak-z-nich-korzystac) |
| Firme i organizacije mogu otvoriti zrzutku s „profilem firmowym” (KYB i stvarni vlasnici), ali kao organizatori kampanje, ne kao klijenti platne infrastrukture | [zrzutka.pl/faq](https://zrzutka.pl/faq) |

Nisu nađeni stranica za developere, partnerski ili affiliate program, white-label ni
„payments for platforms”.

### Zaključak

Ograničenje „samo licenciranim subjektima” je **obveza iz PSD2**: kao pružatelj koji vodi
platne račune moraju TPP-ovima (AISP/PISP) dati pristup računima. To nije poslovna ponuda. Za
nas to znači da bismo saldo i uplate dobili samo da i sami imamo AIS/PIS licencu.

## 4. Grupa, vlasnici, izjave

### Provjereno

| Tvrdnja | Izvor |
|---|---|
| Uprava: Michał Starzyński (predsjednik, udjeličar), Tomasz Chołast (udjeličar), Krzysztof Ilnicki (potpredsjednik, CTO), Iwona Papierowska, Maksymilian Łazarski | [rejestr.io](https://rejestr.io/krs/634168/zrzutka-pl/powiazania) |
| Spółkę kontroluje Michał Starzyński; povezana je sa zakladom „To się uda”. U 2025. imala je 399 tis. zł prihoda od prodaje, 16,4 mil. zł od donacija (napojnica), 2,9 mil. zł od kamata i 3,3 mil. zł neto dobiti. | [press.pl](https://www.press.pl/tresc/91958,wlasciciel-zrzutka_pl-zakonczyl-2025-rok-z-3_3-mln-zl-zysku-netto) |
| Ilnicki o konkurenciji koja nema licencu: „korzystają ze wsparcia zewnętrznych dostawców usług płatniczych … Dlatego właśnie wychodzimy do wszystkich organizatorów zbiórek online w całej Unii Europejskiej z naszym modelem, w którym my sami, jako portal … posiadamy status PSP” | [forbes.pl](https://www.forbes.pl/biznes/zrzutkapl-i-4fundcom-polska-platforma-rozpoczyna-miedzynarodowa-ekspansje-globalnie/gc45qyk) |
| Planovi navedeni uz licencu (2019.): međunarodna verzija, zbiórke pod patronatom zaklada, ponavljajuće uplate, isplate na bankomatu. Nema spomena B2B. | [bank.pl](https://bank.pl/zrzutka-pl-z-licencja-knf-co-to-oznacza-dla-ponad-300-tys-zarejestrowanych-uzytkownikow-portalu/) |

U grupi nije nađena zasebna platna institucija ni fintech grana. U registru EBA-e ne postoji
drugi subjekt s imenom Zrzutka.

### Zaključak

Licenca im je **konkurentska prednost prema drugim crowdfunding platformama**: instant isplata,
bez provizije, sami rade KYC. Tako je i pozicioniraju. Kad bi je ponudili drugim platformama,
hranili bi upravo konkurente od kojih se time razlikuju. Prihod im dolazi od napojnica i kamata
na float, a ne od naknada za procesiranje. Iz toga procjenjujemo da je B2B ponuda malo vjerojatna.

## 5. Analogije

| Platforma | Licenca | Koriste je za | Izvor |
|---|---|---|---|
| **Vinted Pay, UAB** | **EMI**, Bank of Lithuania, LB002214, od 25. 9. 2023. (u registru EBA-e: e-novac, 3a/3b/3c, 5a, **5b**, 6, passport u 30 država) | **Samo Vinted**: „Vinted Pay manages your earnings from selling on Vinted”; „managing payments in-house would offer more control” | [lb.lt](https://www.lb.lt/en/sfi-financial-market-participants/vinted-pay-uab); [vintedpay.com](https://vintedpay.com/); [careers.vinted.com](https://careers.vinted.com/vintedpay); registar EBA-e |
| **Zrzutka.pl** | **PI (KIP)**, KNF IP48/2019; 1, 2, 3c, 5a; **bez 5b** | Samo zrzutka.pl i 4fund.com | gore |
| **Mangopay S.A.** (kontrast) | EMI, CSSF Luksemburg, od 2012.; e-novac, 3a/3b/3c, 5b; passport u 30 država; 191 podružnica ili agent | Izdvojen iz **Leetchija** (grupna i crowdfunding zbiranja, Céline Lazorthes) 2012.–2013. i otvoren svim marketplaceovima. Crédit Mutuel Arkéa kupio je 86 % 2015., a Advent International većinu 2022. uz 75 mil. € kapitala. Ima i proizvod „Charities” za crowdfunding stranice. | [Wikipedia](https://en.wikipedia.org/wiki/Mangopay); [TechCrunch 2015](https://techcrunch.com/2015/09/22/credit-mutuel-arkea-acquires-money-pot-and-payment-service-leetchi); [Advent](https://www.adventinternational.com/?p=17139); [mangopay.com](https://mangopay.com/press-and-media/charities-offer); registar EBA-e |
| **Lemonway** (kontrast) | PI, ACPR Francuska, od 2012.; 3a, 3c, 5b; passport u 30 država | Od početka PSP za marketplaceove i crowdfunding platforme | registar EBA-e; [lemonway.com blog](https://www.lemonway.com/en/blog/spain-italy-crowdfunding) |

**Zaključak:** Zrzutka je po modelu Vinted Pay (licenca kao interna infrastruktura), a ne
Mangopay. Bitna razlika: Mangopay je od Leetchija morao postati **zasebna tvrtka s EMI
licencom, acquiringom i agentskom mrežom** da bi služio treće. Zrzutka nema ni jedan od tih
sastojaka.

## 6. Što to znači za nas

### Ima li smisla pitati 4fund za PSP ugovor?

**Procjena: ne, osim kao nisko prioritetan „ne košta ništa” upit.**

- Opseg licence ne pokriva acquiring ni novčanu pošiljku. Da bi nam služili, trebali bi proširiti
  dozvolu kod KNF-a ili nas registrirati kao agenta. Nemaju nijednog agenta i nemaju poslovni
  motiv.
- Čak i kad bi pristali, uplate bi stvarno išle kroz PayU ili ZEN. Logičnije je otići ravno
  njima ili nekom PSP-u za platforme.
- Jedina realna „integracija” s 4fundom je linkanje ili embed njihovog widgeta za kampanje koje
  su već tamo, i read-only API za prikaz napretka. Oboje je bez ugovora.

### Realne alternative za HR crowdfunding i donacije

| Opcija | Što daje | Napomena |
|---|---|---|
| **Mangopay** | e-novčanik po korisniku, acquiring, KYC, isplate, proizvod Charities | Najbliža analogija (iz Leetchija). Cijena i minimalni volumen nepoznati, **nije provjereno**. |
| **Lemonway** | PI za marketplaceove i crowdfunding, račun po korisniku, acquiring | Jak u FR, ES i IT. HR nije provjeren. |
| **Stripe Connect** | kartice, Apple Pay i Google Pay, payouts | Crowdfunding je na Stripeovoj listi „restricted”: platforma treba odobrenje, a organizatori na odobrenoj platformi ne trebaju zasebno ([Stripe FAQ](https://support.stripe.com/questions/prohibited-and-restricted-businesses-list-faqs)). |
| **Swan** | EMI (ACPR), IBAN po računu, SEPA Instant, kartice, 5b | Već ga imamo kao providera u MPT-u. Produkcija za FO organizatore traži odobrenje projekta (vidi pravni okvir §5). |
| **Monerium** (postojeći rail) | EURe, IBAN po tenantu | FO organizator ne može ići izravno, samo kroz partnere (pravni okvir §5) |

### Dodana vrijednost MPT-a naspram njih (procjena)

- **MPT ne drži novac.** Novac ide na račun organizatora kod EMI-ja (Swan ili Monerium), pa
  ITalk ne treba licencu ni safeguarding. 4fund, Mangopay i Lemonway su skrbnici. Mi smo
  orkestrator.
- **Više providera.** Isti checkout i isti „paid” događaj idu preko Swana, Moneriuma i HR IBAN-a
  (ADR 0032). Mangopay i Lemonway vežu platformu uz jedan PSP.
- **SEPA bez kartičnih naknada.** Revolut i SEPA Instant s kratkom referencom i resolverom
  uplata bez reference. Za donacije to znači 0 % troška procesiranja, a 4fund upravo zato traži
  napojnicu jer plaća PayU.
- **Javne potvrde.** On-chain potvrde o uplati (ADR 0022 i 0023) i transparentnost kampanje.
  Kartični PSP-ovi to nemaju.
- **Gdje je MPT slabiji:** nema vlastitog acquiringa za kartice, Apple Pay ni Google Pay. Za
  donatore koji žele platiti karticom treba Swan kartični prihvat ili Stripe ili Mangopay kao
  dodatni „provider” u matcheru, a ne zamjenu raila.

## Otvoreno, nije provjereno

- Javni registar KNF-a (eRUP) nije izravno pročitan. Podaci su iz registra EBA-e, koji zrcali
  podatke nacionalnih nadzornika.
- Je li Zrzutka ikad na zahtjev potpisala B2B ugovor (privatno, bez javnog traga): nepoznato.
- Cijene i uvjeti Mangopaya i Lemonwaya za HR donacije.
