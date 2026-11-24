# 00 — Indeks baze znanja

Baza osnovana 24. 11. 2026. Dokumenti 03–05 i 09 su iz S2; 07–08 nastaju u S3.
Provjera mermaida i SQL-a: `scripts/provjera-docs.sh`.

| # | Dokument | Sadržaj |
|---|---|---|
| 01 | [vizija-i-pozicioniranje](01-vizija-i-pozicioniranje.md) | Zašto, za koga, čime se razlikujemo od 4funda, hibridni model |
| 02 | [4fund-na-mpt](02-4fund-na-mpt.md) | Svaka funkcija 4funda → kako je radimo kroz MPT (ili zašto ne) |
| 03 | [domenski-model](03-domenski-model.md) | Entiteti (core vs. platforma), ograničenja, 2 erDiagrama, pokrivenost 27 ekrana, razlika prema campaign-core |
| 04 | [tokovi](04-tokovi.md) | 12 sequence dijagrama: prijava, organizacija i KYB, objava, uplata i webhook, napojnica, kasica, tracking, moderacija, vanjska kampanja, ponavljanje, povrat, trajni QR |
| 05 | [zivotni-ciklus](05-zivotni-ciklus.md) | Stanja kampanje (s preklopima), doprinosa (MPT intent → `contribution_states`), verifikacije, prijave i manjih entiteta |
| 06 | [arhitektura](06-arhitektura.md) | Astro + Workers + D1, MPT kao tenant, campaign-core, što se ponovno koristi |
| 09 | [d1-shema](09-d1-shema.md) | Nacrt D1 migracija: `0001_core` (generira se iz campaign-corea), `0002_platform` (37 tablica), seed kategorija |
| — | [plan](plan.md) · [decisions](decisions.md) · [handoffs](handoffs/README.md) | Lanac sesija do UI prototipa |

## Istraživanja (`research/`)

| Datoteka | Sadržaj |
|---|---|
| [2026-11-24-4fund-javni-pregled](research/2026-11-24-4fund-javni-pregled.md) | Teardown javnog dijela 4fund.com: uloge, vrste, kampanja, checkout, isplata, troškovi, katalog, moderacija, rute, domenski model, popis ekrana za prijavljeni obilazak |
| [2026-11-24-pravni-i-poslovni-okvir](research/2026-11-24-pravni-i-poslovni-okvir.md) | Zrzutka/4fund licenca i prihodi, usporedive platforme, HR pravo (ZHP NN 156/23, porez na dar, fiskalizacija), EU (ECSP, PSD2/3, AMLR, DSA, DAC7), hibrid, zaključci i pitanja za pravnika |
| [2026-11-24-mapa-ponovne-upotrebe](research/2026-11-24-mapa-ponovne-upotrebe.md) | Što već postoji u pay.domovina.ai, campaign-core, energy, mpt-landing, zajedno, domovina-ulaznice |
| [2026-11-24-obilazak-polja-i-entiteti](research/2026-11-24-obilazak-polja-i-entiteti.md) | Polja, ograničenja i stanja po ekranu obilaska, konsolidirano po entitetu (ulaz za 03) |
| [2026-11-24-campaign-core-zajedno-izvadak](research/2026-11-24-campaign-core-zajedno-izvadak.md) | campaign-core v0.2.0 (tablice, skupovi, invarijante), zajedno 03–05, MPT intent API, stanja, webhookovi, potpis |
| [forfund-route-templates.txt](research/forfund-route-templates.txt) | Predlošci ruta iz mape 4fund.com (bez imena osoba) |
