# 01 — Vizija i pozicioniranje

## Zašto

4fund.com (Zrzutka.pl sp. z o.o., KNF licenca platne institucije IP48/2019, putovnica za EEA)
pokazuje da europska P2P crowdfunding platforma bez obvezne provizije radi: organizator
skuplja za sebe, obitelj, udrugu ili tuđu organizaciju, podržavatelj plati karticom ili
Apple Payem, a platforma živi od dobrovoljne napojnice (unaprijed 20 % na klizaču) i kamata
na novac koji čeka na računima kampanja ([pravni okvir §1](research/2026-11-24-pravni-i-poslovni-okvir.md)).

Naša vizija od početka (pinka.finance, energy `/beta`, „podrži MPT”) je ista platforma, ali:

| | 4fund | mi |
|---|---|---|
| Tko drži novac | 4fund (zaseban EUR račun po kampanji) | nitko od nas: račun organizatora kod EMI-ja ili Safe kampanje |
| Uplata | kartice, Apple/Google Pay, lokalne metode (PayU, ZEN) | SEPA (Instant) kroz MPT: QR (EPC/HUB3), IBAN + referenca; kasnije PIS |
| Trošak uplate | kartična naknada koju 4fund pokriva iz napojnica | 0 (SEPA), MPT hosted besplatan do 2.500 €/mj, self-hosted uvijek |
| Isplata | organizator povlači na karticu ili IBAN | nema isplate: novac je već kod organizatora |
| Javnost | iznos i popis uplatitelja na stranici | isto + javni dokaz na lancu (Safe) i potvrde o uplati (ADR 0022/0023) |
| Prihod | napojnica + kamate (float) | napojnica kao zaseban intent + premium; floata nema |

## Za koga (faza 1)

Pravne osobe: udruge i zaklade za vlastitu djelatnost, humanitarne akcije s rješenjem,
župe, klubovi, škole (preklapanje sa `zajedno.domovina.ai`). Fizičke osobe kao organizatori,
glavni slučaj 4funda, **nisu u fazi 1**: Monerium ih od 30. 10. 2026. ne prima, Swan nije
provjeren, a porez na dar (4 %) treba pravnika ([pravni okvir §6.2](research/2026-11-24-pravni-i-poslovni-okvir.md)).
UI prototip ih ipak prikazuje, s jasnom oznakom, jer je cilj prototipa puna struktura.

## Hibridni model

Kampanja koja već postoji na 4fundu može se pojaviti kod nas: naslov, opis, slike, kategorija
i sav „marketplace” (katalog, profil organizatora, dijeljenje, praćenje) žive kod nas, a gumb
„Podrži” vodi na 4fundov `/{id}/pay`. Organizator je dodaje sam (opt-in, unese link); mi ne
uvozimo 4fundov katalog jer njihovi uvjeti štite bazu ([pravni okvir §5](research/2026-11-24-pravni-i-poslovni-okvir.md)).
Takva kampanja nosi oznaku vanjskog plaćanja; iznos prikupljenog čitamo iz 4fundovog javnog
API-ja samo ako to uvjeti dopuštaju (provjera u S8), inače ga ne prikazujemo.

## Što prototip mora pokazati

Da se kroz naše sučelje može proći svaki tok koji 4fund ima (registracija, verifikacija,
organizacija, čarobnjak kampanje, katalog, stranica kampanje, uplata, kasica, link za praćenje,
ažuriranja, komentari, prijava, financije), s uplatom kroz MPT sandbox umjesto kartice.
