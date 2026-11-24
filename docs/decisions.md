# Odluke

Svaka odluka: broj, datum, razlog, uvjet revizije. Odluka se ne briše, zamjenjuje se novom
koja se na nju poziva. Blokovi brojeva po sesiji: S1 od 100, S1b od 150, S2 od 200 … S9 od 900.

## S0 — 24. 11. 2026.

1. **Opseg:** UI prototip s pravom uplatom kroz MPT sandbox. Produkcija, pravi novac,
   produkcijski tenant i pravni upis su izvan plana. *Revizija:* korisnik traži produkciju.
2. **Radno ime repoa** `crowdfund.domovina.ai`; konačno ime i brend odlučuje korisnik u S3.
   *Razlog:* uzorak `*.domovina.ai`, ne koristimo 4fundovo ime.
3. **Funkcionalni paritet, vlastiti identitet.** Struktura, tokovi, polja, stanja i pravila
   kao 4fund; logo, ime, boje, ilustracije i tekstovi naši. *Razlog:* „identično sučelje”
   bi bilo kopiranje zaštićenog dizajna i teksta i moglo bi se zamijeniti s 4fundom.
   *Revizija:* nikad za brend; raspored ekrana smije biti blizak.
4. **Obilazak 4funda samo čitanjem**, Brave profil iz globalnog CLAUDE.md, korisnik se prijavi
   sam. Nikad potvrda obrasca, uplata, isplata, objava, brisanje, verifikacija. Tekst ekrana u
   git, snimke samo lokalno (`docs/research/obilazak/snimke/`, gitignore). Bez osobnih podataka
   drugih ljudi. *Razlog:* korisnikov račun i tuđi sadržaj.
5. **Stack:** Astro 7 SSR na jednom Cloudflare Workeru + D1, otoci samo gdje treba stanje.
   Uzori `domovina-ulaznice/web`, `omm.domovina.ai`. *Revizija:* nakon S9 podjela na web + API Worker.
6. **Plaćanje = MPT intent** tenanta platforme; platforma ne drži novac ni ključeve; nema
   isplate (novac je već kod organizatora). *Razlog:* temelj MPT-a i pravnog položaja (PSD2 3(j)).
7. **Napojnica** je zaseban intent na ITalk, „0” jednako istaknuta, bez emocionalnog pritiska.
   *Razlog:* UOKiK postupak protiv Zrzutke 11/2024 (pravni okvir §1).
8. **Faza 1 organizatori = pravne osobe** (udruge, zaklade, humanitarne akcije s rješenjem).
   Fizičke osobe, nagrade/prodaja i razine podrške postoje u prototipu kao UI s oznakom
   „nije u fazi 1”. *Razlog:* Monerium bez FO od 30. 10. 2026., porez na dar, fiskalizacija,
   DAC7. *Revizija:* pravnik + potvrda Swana za FO.
9. **Hibrid:** vanjsku 4fund kampanju dodaje organizator sam (link), mi ne uvozimo katalog.
   *Razlog:* 4fundovi uvjeti štite bazu.
10. **Shema:** `campaign-core` kao ovisnost i izvor stupaca; platformske tablice uz nju.
    Ne radi se četvrta kopija ugovora s railom. *Revizija:* S2 nađe nespojivost.
11. **Kod za novac** se uzima iz energy `lib/` (mpt-intent, payer-tags, receipt) i prvo se
    izvlači u zajednički modul, ne kopira treći put. *Revizija:* ako izvlačenje traži izmjene
    u energy/mpt-landing, prototip privremeno vendora kopiju s izvornim commitom u zaglavlju.
12. **Jezik:** sučelje hr primarno + en; dokumenti hrvatski.
13. **Copy:** „doprinos/donacija”, nikad „ulaganje”; `forbidden-words` iz energyja.
14. **Recurring** bez SEPA DD (Monerium ga nema): mjesečni podsjetnik + QR, ili uputa za
    trajni nalog. *Revizija:* Swan ili PIS (ADR 0031) daju DD.
15. **Auth u prototipu** je mock (e-pošta bez slanja, sesija u kolačiću). Certilia i pravi
    magic link su izvan plana.
16. **Testovi:** vitest bez mreže, `skipped 0`; Playwright na `wrangler dev` s lokalnim D1;
    MPT pozivi u unit testovima kroz test double, stvarni sandbox samo u S7 e2e.
17. **Repo je lokalan** (bez remotea) dok korisnik ne odluči o GitHubu i javnosti.
18. **Pragovi verifikacije namjene** kao 4fund (5.000 € po kampanji, 12.500 € po organizatoru)
    → zastava i ručni pregled, ne blokada.
19. **Snimke ekrana 4funda se ne objavljuju** ni u artefaktima ni u javnom repou.

## S1 — 24. 11. 2026.

100. **Prijava se provjerava izbornikom računa na stvarnoj stranici, ne na 404.** 404 stranica 4funda
     uvijek ima anonimno zaglavlje. *Razlog:* lažni „nije prijavljen” na početku S1.
101. **Anonimni ekrani** (registracija) čitaju se dohvatom HTML-a bez kolačića (`credentials:'omit'`)
     umjesto odjave korisnika. Klijentski modali (prijava, reset lozinke) idu u anonimni obilazak,
     S1b dio C (zahtjev korisnika u S1).
102. **Čarobnjak se smije proći izmišljenim podacima do pregleda.** Nacrt ostaje u korisnikovom računu
     (4fund ga pamti), a „Start anew” ga briše. „Publish fundraiser” se ne klikće ni na koraku opisa.
103. **Ekrani „Edit”, „More”, „Statistics” i obrazac „Verify fundraisers”** traže objavljenu kampanju, pa
     su u S1 ostali neviđeni. Objava testne kampanje su vrata za korisnika (vrh `S1b.md`).
     Do odgovora S2 za njih koristi javni pregled §4.
104. **Klik „Next step” na praznom obrascu verifikacije** je dopušten jer HTML5 `required` zaustavlja slanje.
     Na obrascu s popunjenim obaveznim poljima se ne klikće. (potvrditi)
105. **Popis polja bez vrijednosti:** JS izvlači `name`, `type`, `maxlength`, `required` i labelu, a za
     vrijednost samo „FILLED/empty”. Tablica prijava i donacije drugih ljudi se ne prepisuju.

## S1b — 24. 11. 2026.

150. **Organizacije s članovima i ulogama, kao GitHub.** Jedna osoba može biti član više organizacija, s ulogom
     po organizaciji, bez dijeljene prijave. 4fund to nema: organizacija je zaseban račun s vlastitom e-poštom,
     privatni račun se ne može pretvoriti, a više ljudi radi samo kroz punomoć/dijeljeni login ili kao vanjski
     organizatori prema Fixed Beneficiaryju. *Razlog:* korisnikova odluka (odgovor „d” na vrata S1b).
     *Ulaz za S2:* entiteti `organizations`, `memberships(user, org, role)`, kampanja pripada organizaciji ili osobi.
151. **MPT kampanja se ne objavljuje s osobnog 4fund računa.** Nacrt ostaje; korisnik sam otvara račun pravne
     osobe (ITalk d.o.o.), a kampanja ide kao „fundraiser for organisation” kroz Fixed Beneficiary. Iznimka od
     odluke 4 vrijedi samo za tu jednu kampanju i samo uz potvrdu prije svakog „Submit/Publish”.
152. **Odluka 102 je ispravljena:** nacrt čarobnjaka nije u računu nego u `localStorage` preglednika
     (`sbs-fundraiserState`) i prelazi na sljedeći prijavljeni račun ([25](research/obilazak/25-anonimni.md)).
     Kod nas: nacrt lokalno do prijave, pa na poslužitelj, uz jasnu oznaku izvora.
153. **Neprijavljeni donator** na 4fundu: e-pošta obavezna, ime neobavezno, „kao tvrtka” = samo naziv, obavezan
     prihvat uvjeta. Prijavljenom se „kao tvrtka” ne nudi. Preuzimamo tok, dodajemo neobavezan OIB (faza 2). (potvrditi)
154. **Klik na izbornik „Start anew”** u čarobnjaku je dopušten kad nacrt sadrži samo izmišljene podatke iz S1
     (obrisan je testni nacrt prije MPT nacrta). (potvrditi)
