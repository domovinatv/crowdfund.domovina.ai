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

## S2 — 24. 11. 2026.

200. **campaign-core v0.2.0 se koristi bez izmjene** kao izvor 15 tablica jezgre; vertikale se ne stvaraju.
     J2 (migracije) u campaign-coreu ne postoji, pa S4 generira `0001_core.sql` iz `contract.ts` paketa i
     testom ga drži jednakim opisu. *Revizija:* campaign-core objavi J2.
201. **Kampanja pripada organizatoru jezgre, a organizator je 1:1 s platformskom organizacijom** (javni profil,
     članovi). Osobna kampanja (faza 2) je organizacija `kind = personal` s jednim članom i `holder_type = person`.
     *Razlog:* jezgra ostaje bez korisnika (energy docs/19 D5), a odluka 150 se drži na platformi.
202. **Uloge u organizaciji:** `owner` (članovi, KYB, brisanje), `admin` (objava, odobravanje tuđih kampanja),
     `editor` (kampanje, ažuriranja, komentari), `viewer` (financije, izvoz). Barem jedan `owner`. (potvrditi)
203. **Jedan MPT tenant platforme**, sve kampanje na njemu; Safe kampanje je Safe organizacije s 0 platformskih
     potpisnika (`mode = byo`, `platform_signer_count = 0`, `rails = platform`). Bankovni račun organizatora kao
     odredište (Swan) je faza 2. (potvrditi)
204. **4fund „Disabled” i blokada moderacije su preklopi** (`campaign_settings.paused_at`, `blocked_at`), ne nova
     stanja jezgre. Cilj ne zatvara kampanju, `funded` se u fazi 1 ne koristi, nakon roka kampanja ostaje `active`
     (kao 4fund). `closed` je samo ručno zatvaranje organizatora.
205. **Platformske tablice smiju imati `DEFAULT`** (jezgra nema nijedan); vrijeme unix ms, novac centi kao jezgra.
206. **Preslikavanje intenta na doprinos:** `open`/`underpaid` → `pending`, `paid` → `paid`, `late` → `paid`,
     `underpaid_expired` → `paid` + `underpaid = 1` (novac je na Safeu), `expired` → `expired`, `payment.rejected`
     → `failed`; `refunded` samo iz platformskog povrata. Logičko stanje intenta doslovno u `checkouts.intent_state`.
     (potvrditi)
207. **Napojnica u fiksnim iznosima** (0, 1, 2, 5 € ili svoj), ne postotak; ništa nije unaprijed odabrano osim
     ako korisnik ne klikne, „0” jednako istaknut; drugi intent na Safe platforme, drugi QR kao zaseban korak.
     *Razlog:* postotak s klizačem je mehanizam iz UOKiK slučaja (odluka 7). (potvrditi)
208. **Bez lozinke:** prijava magic linkom ili kodom e-poštom; ekran 13 (lozinka) postaje „načini prijave”.
     Dodatna autentikacija samo e-poštom (nema SMS-a), samo za osjetljive radnje (povrat, brisanje, uloge).
209. **Vanjska kampanja je zasebna platformska tablica**, ne core kampanja (nema Safe ni doprinosa). Vlasništvo se
     dokazuje kodom koji organizator upiše u opis 4fund kampanje. (potvrditi)
210. **Povrat je zapis organizatora** (Safe tx ili bankovna referenca), platforma ništa ne vraća; doprinos postaje
     `refunded` kad je zapis potvrđen. IBAN uplatitelja ne znamo (samo HMAC).
211. **Nacrt čarobnjaka je JSON u `campaign_drafts`**; red u `campaigns` nastaje tek na „Objavi” (jezgra traži
     organizatora, slug i stanje, a nacrt ih još nema). Nadopuna odluke 152.
212. **ID-evi:** UUIDv7 za sve; javni ID kampanje 6 znakova Crockford base32 (`/{public_id}`); sid intenta 22 znaka
     base64url koji generira Worker (idempotentno ponavljanje kroz `409 sid_already_exists`).
213. **Prijedlozi za campaign-core** (ne rade se, prototip radi bez njih): `foundation` u `HOLDER_TYPES`,
     `purpose_evidence` u `DOCUMENT_KINDS`, `contribution_profiles.amount_hidden`, te J2 migracije. Odluku donosi
     vlasnik jezgre (energy docs/19 §6).
214. **Provjera dokumenata** dok nema builda: `scripts/provjera-docs.sh` (mermaid parse svih blokova u `docs/` uz
     jsdom u privremenoj mapi + SQL iz `09` u sqlite3 nad stubovima jezgre).
215. **Ponavljanje:** `recurring_pledges` s danom u mjesecu 1–28, Cron Trigger šalje podsjetnik s novim intentom
     (vrijedi 24 h); 3 propuštena mjeseca → `paused`. Alternativa: trajni QR + trajni nalog. (potvrditi)
216. **Kategorije:** 8 iz čarobnjaka 4funda (s „Ostalo”), jedna lista za kampanje i organizacije; 15 tema
     naslovnice kao ključevi, ilustracije naše.

## S3 — 24. 11. 2026.

300. **Jezik je prvi segment rute** (`/hr/…`, `/en/…`) s prevedenim segmentima; `/` preusmjerava po kolačiću
     `lang`, pa `Accept-Language`, zadano `hr`. *Razlog:* jasan `hreflang`, hrvatski URL-ovi za hrvatsku publiku.
301. **Kratki linkovi su bez jezika** (`/{id}`, `/s/{alias}`, `/z/{slug}`) i preusmjeravaju na jezičnu rutu.
     *Razlog:* isti oblik kao 4fund, kratki za QR i plakat.
302. **Statični segment od 6 znakova mora sadržavati `i`, `l`, `o`, `u` ili crticu** (slova izvan Crockford
     abecede), pa se ne sudara s javnim ID-om kampanje; S4 to drži testom nad tablicom ruta.
303. **Ključevi upitnih parametara su engleski u oba jezika** (`q`, `category`, `type`, `sort`, `page`), vrijednosti
     su ključevi iz baze. *Razlog:* jedan parser, linkovi rade preko jezika. (potvrditi)
304. **Statistika linka za praćenje** (4fund `/z/{slug}+`) vidljiva je samo vlasniku linka i timu kampanje, ne
     javno; 4fundova javnost te stranice nije provjerena. (potvrditi)
305. **Radno ime `crowdfund.domovina.ai` i DOMOVINA paleta** (navy `#002F6C`, crvena `#FF0000`) vrijede privremeno,
     do korisnikove odluke o imenu i brendu (vrata S3, vrh `S4.md`; prijedlozi u [08](08-dizajn-sustav.md) §6).
     Paleta je u 6 brend tokena ispod semantičkih, pa je zamjena jedna datoteka. *Revizija:* odgovor korisnika.
306. **Samo svijetla tema; tokeni kao CSS varijable s RGB kanalima.** *Razlog:* jedan skup provjerenih kontrasta,
     Tailwind modifikatori prozirnosti (pouka energy 09 §4).
307. **Crvena `#FF0000` je samo dekor** (4,00:1 na bijelom, ne prolazi AA za normalan tekst ni bijeli tekst na
     crvenom gumbu); tekst u crvenoj je `#C8102E` (5,88:1), primarni gumb je navy, greška ima vlastitu boju
     `#B42318`. *Razlog:* izmjereni kontrast, brend se ne miješa s greškom.
308. **Inter samohostan, Lucide ikone, bez Google Fonts CDN-a i bez emojija u sučelju.** (potvrditi)
309. **`scripts/provjera-docs.sh` traži red u `07-rute.md` za svaku rutu 4funda** iz mape stranice i obilaska
     (`research/forfund-rute-obilazak.txt`); 85 ruta, 0 bez retka.
310. **ID checkouta u URL-u je sposobnost** (`/hr/{id}/podrzi/{checkout}`): tko ima link vidi iznos, QR i stanje,
     ali ne e-poštu ni ime. ID je UUIDv7 (nepogodiv), stranica `noindex`. (potvrditi)
311. **Komponente su `.astro` bez stanja, React samo za otoke**; React komponente energyja i mpt-landinga prenose
     se kao otoci s izvornim repoom i commitom u zaglavlju (nadopuna odluke 11). Tokeni energyja se ne preuzimaju.
312. **✗ u fazi 1:** premium alias (`/{alias}`), why-us, EK brošura, press, blog, katalog kreatora, fakture,
     Facebook prijava, javni API, promocija i delegirane zahvale. Razlog po retku u [07](07-rute.md).
313. **Moderacija platforme je `/admin/*`, samo hrvatski**, uloga `moderator` je mock u prototipu.
