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

## S4 — 24. 11. 2026.

400. **Kostur:** Astro 7.4 `output: "server"`, `@astrojs/cloudflare` 14.4 sa `session: false` i
     `imageService: "passthrough"` (bez SESSION KV i IMAGES vezova, uzor listici), wrangler 4.168, Tailwind 4.3
     kroz `@tailwindcss/vite`, vitest 5.1, TypeScript strict. D1 kroz `import { env } from "cloudflare:workers"`,
     `remoteBindings: false`, `database_id` lokalni placeholder (nikad remote do S9 vrata).
401. **Odluka 302 sužena na mjesto ID-a:** pravilo vrijedi za prvi segment iza `/{lang}/` i prvi segment rute
     bez jezika; dublji segmenti (`manage`, `stream`, `drafts`, `events`) se ne mogu sudariti. Jedini stvarni
     sudar `/en/safety` je preimenovan u `/en/security`. Test hvata i negativni slučaj. (potvrditi)
402. **`0001_core.sql` se generira** (`npm run db:gen-core`, `scripts/generiraj-core-sql.mjs`) iz `contract` paketa
     `@domovina/campaign-core` v0.2.0: stupci redom contracta, tablični `PRIMARY KEY`/`UNIQUE`, filtrirani unique
     kao `CREATE UNIQUE INDEX … WHERE`. Test drži datoteku jednakom generatoru. 52 tablice (15 jezgre + 37).
403. **`users.platform_role`** `TEXT NOT NULL DEFAULT 'user' CHECK (platform_role IN ('user','moderator'))`, odmah
     iza `locale` (odluka 313).
404. **Brend tokeni:** navy, navy-deep, red, red-text, paper, mist (08 §2.1 nije imenovao svih šest; paper i mist
     su izbor S4). Zamjena brenda = ovih 6 + i18n. (potvrditi)
405. **Seed je deterministički i resetira:** `scripts/seed.mjs` → `seed/demo.sql` (mulberry32, „sad” 2026-11-20,
     UUIDv7 s vremenom zapisa), počinje s `DELETE FROM` svih tablica osim `categories` obrnutim redom ovisnosti, pa
     briše i ručno unesene lokalne podatke. Demo oznaka: `campaigns.demo = 1`, `metadata {"demo":true}`, e-pošta
     `@demo.invalid`, slugovi `demo-`, reference `DEMO-`; Safe adrese izmišljene (`0xde5afe…`), `mode=byo`.
406. **Skriveni iznos i broj podržavatelja ne izlaze iz upita:** `aktivneKampanje()` vraća `null` kad je
     `hide_raised`/`hide_contributor_count`, ne samo da ih komponenta ne crta (sigurno i za budući JSON API).
407. **Testovi nad SQLiteom kroz `node:sqlite`** (Node 24) s malim D1 shimom, bez nove ovisnosti i bez mreže.
408. **Kolačić `lang`** (1 godina) postavlja middleware pri svakom posjetu `/hr/…` ili `/en/…`.
409. **Tablica ruta** (`src/lib/rute.ts`) ima 85 jezičnih ruta i 21 bez jezika; izostavljene su rute kojima 07 ne
     daje engleski oblik (`…/odjava`, koraci `organizacija/nova/…` i `postavke/verifikacija/…`,
     `cesta-pitanja/{kategorija}`). S5/S6 ih dodaju s en oblikom u 07.
410. **Lockfile vuče campaign-core kao `git+ssh`** (commit 0bc0069 = tag v0.2.0); stroj bez SSH ključa za GitHub
     može pasti na `npm ci`. Popravak (https URL u lockfileu) kad repo dobije remote/CI. (potvrditi)

## S5 — 24. 11. 2026.

500. **Jezične rute idu kroz jedan dispečer** `src/pages/[lang]/[...put].astro`: `prepoznaj()` iz `rute.ts` →
     pogled `src/views/stranice/<kljuc>.astro` + opcionalni učitavač `<kljuc>.ucitaj.ts` (`import.meta.glob`,
     bez ručnog registra). Učitavač vraća `Response` (404, 302) ili `{ podaci }`; pogled ne mijenja status.
     Ruta bez pogleda vraća 404, pa je pokrivenost vidljiva skriptom ruta. Rute bez jezika (`/{id}`, `/s/…`,
     `/z/…`, `/embed/…`) su obične Astro stranice.
501. **Sedam redoslijeda kataloga** (`src/lib/redoslijedi.ts`): `most` (zadano), `popular` (zadnja 24 h),
     `least`, `newest`, `oldest`, `ending` (bez roka na kraj), `updated` (zadnja novost); jednaki po novijem
     `created_at`, pa `id`. Isti tekst opisuje ih u katalogu i na `/hr/pravila-prikaza`.
502. **En oblici koji su nedostajali u 07:** `/en/follow/{token}/unsubscribe` (hr `pracenje/{token}/odjava`) i
     `/en/faq/{category}` (hr `cesta-pitanja/{category}`, ključ kategorije engleski u oba jezika, kao odluka 303).
503. **Provjera javnih ruta je podatak:** `e2e/javne-rute.ts` gradi popis iz `rute.ts` (`faza: "S5"`) i
     `seed/primjeri.json` (seed ga generira) s očekivanim statusom (J/J*/T → 200, P → 302 na prijavu, kratki
     linkovi → 302, rubni slučajevi vidljivosti → 404). Koriste ga `npm run routes` (`scripts/provjera-ruta.ts`
     nad pokrenutim serverom) i `npm run e2e` (Playwright, 375 px i 1280 px). Checkout koraci 2–3 su izostavljeni
     s razlogom (S7). Playwright nije u `npm run check` jer treba server.
504. **Isključena kampanja** (`paused_at`) otvara se poveznicom, ali nije u katalogu ni na naslovnici; ne prima uplate.
505. **Skriveni iznos ne curi ni kroz poredak:** kampanje s `hide_raised` idu na kraj u `most`, `least`, `popular`
     i u uredničkom izboru; filtar `successful` ih isključuje; uz `hide_raised` popis uplata vraća sve iznose kao
     `null` i slaže se samo po vremenu (iz iznosa bi se zbrojio ukupni). Uz skriveni broj podržavatelja `ukupno`
     popisa je `null`.
506. **`ending`:** prošli rok i bez roka idu na kraj. **`near`:** tekstualno po `location_name` kampanje i gradu
     organizatora (seed nema `lat`/`lng`). (potvrditi)
507. **Profil osobe nema `users.slug` u shemi:** slug je zasad `users.id` (UUIDv7); profil je privatan (404) kad je
     svih 9 prekidača vidljivosti isključeno, `indexable = 0` → `noindex`. Prijedlog migracije `users.slug` za S6. (potvrditi)
508. **Token praćenja je potpisan, ne spremljen:** `campaign_follows` nema stupac tokena ni e-poštu neprijavljenog,
     pa je token `{user_id}.{campaign_id}.{HMAC-SHA256}`; lokalno demo tajna, Worker tajnu iz okoline. Odjava
     isključuje sve tri obavijesti i ostavlja red (idempotentno). Prijedlog migracije (`token_hash`, `email`) za S6. (potvrditi)
509. **Popis uplata skriven** zasad u `campaigns.metadata.contributions_list = "hidden"` (stupca nema). (potvrditi)
510. **Brojači naslovnice:** „prikupljeno” zbraja samo kampanje bez skrivenog iznosa; broj doprinosa uključuje
     sve javno vidljive (active i closed, public i unlisted). Mjesečni iznos na kartici = plaćeno u zadnjih 30 dana.
511. **Urednički izbor bez stupca za istaknuto:** u katalogu, verificiran organizator, opis nije prazan, redom po
     prikupljenom; isti kriterij je opisan na `/hr/pravila-prikaza`. Izbor se ne prodaje.
512. **D1 nema ICU:** `q` ne razlikuje veličinu slova samo za ASCII, abecedni red organizacija je ASCII. Prihvaćeno
     za prototip.
513. **Seed S5:** nove kampanje i retci dodani na kraj (prijašnji retci bajt-jednaki); kasice, linkovi i posjeti,
     vanjske kampanje (`https://4fund.invalid/demo-…`), ponude, rubni slučajevi vidljivosti; galerija se ne seeda
     (slika traži R2), kartice koriste temu naslovnice. Prijava upisuje privolu `report_gdpr` verzije `report-2026-11`.
514. **Statični tekstovi** su u `src/views/sadrzaj/*.ts` kao `{ hr, en }` istog oblika; test drži iste id-eve i broj
     stavki na oba jezika i pada na „ulag/ulož/invest” (copy pravilo). FAQ kategorije: `donating`, `organising`,
     `organisations`, `money`, `sharing`, `safety`, `account`; nepoznat ključ → 404.
515. **Kontakt:** čita `?topic=` (odluka 303) i `?tema=` (07) kao isto; validacija samo na poslužitelju s granicama
     CHECK-a; neuspio POST vraća 200 s greškama uz polje (pogled ne postavlja 422, odluka 500); Turnstile je mock;
     uspjeh 303 `?poslano=1`. (potvrditi jedan oblik parametra)
516. **Rute s pristupom P** (`offers.new`, `campaign.moneybox.new`) do S6 vraćaju 302 na `/{lang}/prijava?next=…`.
517. **Impresum i pravni tekstovi:** neprovjereni podaci ITalka (OIB, sjedište, registar, odgovorna osoba) stoje
     kao „[upisuje se prije objave]”; uvjeti i privatnost nose oznaku „Nacrt prototipa”. Tvrdnje koje dokumenti ne
     pokrivaju doslovno (instant SEPA ne skuplja od obične, AZOP, Safe „npr. 2 od 3”) provjeriti prije objave. (potvrditi)
518. **`/hr` i `/en` hvata `src/pages/[id].astro`** (Astro ga za jedan segment rangira iznad `[lang]/[...put]`);
     on za `hr`/`en` crta naslovnicu istim pogledom i učitavačem kao dispečer. (potvrditi; alternativa su
     `src/pages/{hr,en}/index.astro` koji zovu dispečer)
519. **QR kampanje kodira kratki link `/{id}`** (jezik se bira pri skeniranju), korekcija M, margina 4 modula;
     ovisnost `uqr@0.1.3` (čisti JS), SVG renderer vlastiti; samo SVG preuzimanje, bez PNG-a. Uplatni QR je S7.
520. **Apsolutni linkovi** (QR, dijeljenje, kod widgeta) grade se iz origina zahtjeva, pa rade i lokalno.
521. **Popis uplata bez JS-a:** `?contributions=latest|highest` i `?contributions_page=N` (engleski ključevi, odluka
     303), 10 po stranici kumulativno, najviše 9 stranica (`uplateKampanje` ograničava `limit` na 100).
522. **Checkout korak 1 (`/hr/{id}/podrzi`) je stub do S7;** kampanja koja ne prima uplate vraća 200 s porukom i
     `noindex`; `?s=` se prikazuje samo ako kasica pripada kampanji.
523. **„Prati” POST** vraća 303 na `?prati=s6#prati` i ništa ne sprema (sesije i e-pošta neprijavljenog su S6).
524. **DSA prijava:** izjava u dobroj vjeri je zasebna kućica; bez nje `spremiPrijavu` samo validira i ništa ne piše.
525. **Posjet linku za praćenje:** hash posjetitelja = HMAC-SHA256(UTC dan, IP, User-Agent) s ključem `TAJNA_POSJETA`
     (lokalno demo), sirovi IP se ne sprema; kolačić `atribucija` (id linka, 30 dana, HttpOnly, Lax); `/z` je `no-store`.
526. **Velika slova u ID-u kampanje ili aliasu kasice → 301 na mala;** neaktivna kasica ili link → 404.
527. **Embed stranice** su `noindex`, linkovi se otvaraju u novoj kartici; `target=support` pada na link kampanje
     kad ona ne prima uplate.
528. **CSS za ispis plakata** je izvan `@layer` (iznimka od pravila `global.css`) da nadjača Tailwind u ispisu.
529. **Katalog:** učitavač preusmjerava (302) na čisti upit (bez praznih polja, bez `page=1`), jer GET obrazac bez
     JS-a šalje prazna polja; stranica iza zadnje vraća 200 s linkom na prvu. Filtri su `<details>`, zatvoreni na
     mobitelu, otvoreni na desktopu (`::details-content`).
530. **Naslovnica:** 3 vrste kampanje, urednički izbor (3), brojači, kategorije s brojem, 6 najnovijih aktivnih.
     Kartice uvijek crtaju temu naslovnice (gradijent iz tokena + ikona kategorije); vanjske slike se ne učitavaju.
531. **Profil organizacije:** CTA „Pokreni kampanju za ovu organizaciju” samo kad je `is_fixed_beneficiary = 1`;
     katalog organizacija filtrira kategoriju linkovima, abecedno. Profili osobe i organizacije imaju link „Prijavi”.
532. **Seed „sad” (2026-11-20) i stvarni sat se razilaze:** stranice računaju rok od stvarnog datuma, pa dio demo
     kampanja pokazuje „rok je prošao”. Popravak u S6: seed relativno na datum seedanja ili `DEMO_SAD` u okolini.

## S6 — 24.–25. 11. 2026.

600. **K za autora kampanje za organizaciju** vrijedi samo dok čeka odobrenje (`draft`/`review`, bez
     `beneficiary_approved_at`), kako piše u 07; nakon odobrenja upravlja organizacija.
601. **Moderator prolazi K, ne prolazi U:uloga;** prijavljen bez prava dobiva 404 (ne 403), da se ne otkriva postojanje.
602. **A rute (`/admin/*`):** bez sesije 302 na prijavu, prijavljen ne-moderator 404.
603. **P+e se provjerava u POST grani radnje;** kod vrijedi 10 min i ponovno se koristi za istu `action`; token
     rute `potvrda-radnje` je id retka `one_time_codes`.
604. **Magic link** je zaseban red `one_time_codes` iste svrhe s `action = 'link'`; GET poveznice je ne troši
     (skeneri pošte), troši je POST.
605. **Hash:** kod `SHA-256("{id}:{kod}")`, sesija `SHA-256(token)` u `sessions.id`; novi kod poništava stari,
     iskorišten kod gasi i poveznicu.
606. **„Demo pošta”** (mock slanja) je HttpOnly kolačić `demo_posta` (10 min) prikazan u označenom okviru; kolačić
     `prijava` pamti id koda. (potvrditi)
607. **Nepoznata e-pošta na prijavi:** uz prihvat uvjeta račun nastaje tiho (04 §1), bez njega stranica nudi otvaranje računa.
608. **`campaign_follows` izgrađena iznova (0004):** `user_id` nullable, `email`, `token_hash`, `confirmed_at`,
     djelomični UNIQUE indeksi umjesto PK. Zamjenjuje prijedlog 508.
609. **`users.slug` (0004)** ne smije izgledati kao UUID; profil traži slug ili id, linkovi `COALESCE(slug, id)`. Zamjenjuje 507.
610. **`campaign_settings.contributions_list`** (`visible|hidden`, 0004) zamjenjuje `metadata.contributions_list` (509).
611. **Seed „sad” = početak tekućeg UTC dana** ili `DEMO_SAD=YYYY-MM-DD`; datum u prvom retku `demo.sql` i u
     `primjeri.json`; testovi čitaju `SAD_SEEDA`. Zatvara 532. Posljedica: svaki `db:gen-seed` mijenja `demo.sql`.
612. **Dispečer zove učitavač i kad ruta nema pogled** (CSV, rute samo za POST).
613. **En oblici podkoraka** (zatvara 409): `organisation/new/details|representative|project|kyb|review`,
     `settings/verification/type|details|review`, `settings/links/sharing`, `{id}/manage/finances.csv`.
     Provjera ruta: `new-campaign` i `settings` su 302 iznimke, `reminder` izostavljen (S7).
614. **Stranice samo za organizaciju** (financije, povrati, zatvaranje) ne otvaraju se moderatoru ni autoru koji
     čeka odobrenje; ostale podstranice prate `zahtijevajKampanju`. Izbornik upravljanja pokazuje samo dopuštene.
615. **Isključi/uključi kampanju, isključi kasicu i obavijest o novim uplatama** traže barem `editor`; link za
     praćenje isključuje autor linka ili editor.
616. **Obavijesti:** „nove uplate” je postavka kampanje (`contribution_notifications`); komentari i kraj kampanje
     su red praćenja svakog člana. Bez novog stupca.
617. **Zaključavanje** naslova, opisa i cilja kad je zadnja `campaign_purpose` verifikacija `approved` ili
     `purpose_verified = 1`; poslužitelj odbija izmjenu. Slug se mijenja samo u `draft`/`review`.
618. **Rok se sprema kao 21:59:59.999 UTC odabranog dana** (isti datum u UTC i Zagrebu); smije se ukloniti ili
     pomaknuti, ne u prošlost. (potvrditi)
619. **Povrat je uvijek puni primljeni iznos;** potvrda je ručna (bez on-chain provjere u prototipu), doprinos →
     `refunded`, `campaign_stats` se umanjuje, obavijest `refund_confirmed`. (potvrditi djelomične povrate)
620. **CSV financija:** UTF-8 BOM, CRLF, RFC 4180, apostrof ispred `= + - @` (zaštita od formula), iznos u eurima s točkom.
621. **Token praćenja gosta** je slučajan, sprema se samo SHA-256; potvrda POST-om na stranici praćenja. Stari
     potpisani token (508) i dalje vrijedi za prijavljene. Ponovni POST iste e-pošte na potvrđeno praćenje ne mijenja
     prekidače, samo izdaje novu poveznicu.
622. **Komentiraju samo prijavljeni;** u načinu „samo podržavatelji” članovi organizacije i osobe s plaćenim
     doprinosom. Novi komentar i novost obavještavaju potvrđene pratitelje. (potvrditi)
623. **Upload dokaza namjene je mock** (red `files` s ključem `mock/…`, `purpose_evidence` + `campaign_documents`);
     „pošalji na pregled” traži barem jedan dokument, bez verifikacije stvara je s `trigger = user`.
624. **Brisanje kampanje** gasi linkove za praćenje, kasice → `deleted`, traži upis ID-a kampanje i P+e.
625. **Nacrt neprijavljenog je u kolačićima `nacrt0`–`nacrt3`** (base64url JSON, HttpOnly, 30 dana, ~11 kB), ne u
     `localStorage`, pa čarobnjak radi bez JS-a. Mijenja način iz 152, ne načelo. (potvrditi)
626. **Lokalni nacrt prelazi na račun** pri prvom otvaranju čarobnjaka prijavljenog korisnika (`source = 'local'`,
     oznaka „nacrt iz ovog preglednika”), ne pri samoj prijavi.
627. **Tekući nacrt** = zadnji ažurirani neobjavljeni red `campaign_drafts`; „Kreni ispočetka” ga briše. Koraci
     nikad ne preusmjeravaju unatrag; koračnik i pregled pokazuju što nedostaje.
628. **Neprijavljeni smije ostaviti „tko prikuplja” prazno;** „Objavi” neprijavljenog vodi na prijavu s `next` na pregled.
629. **Opis je čisti tekst, 50–5.000 znakova.** Zabranjene riječi samo na početku riječi (pa „doprinos” prolazi):
     invest, ulag, ulož, ulaž, dionic, dividend, kamat, prinos, equity, shareholder, kriptovalut, zajam, zajm.
630. **Fotografije su označeni mock** (nema R2); video je https YouTube/Vimeo poveznica u `campaign_media`.
631. **Nakon objave:** `active` → `/{id}?objavljeno=1`, `review` → `moje/kampanje?objavljeno={id}`.
632. **Autor koji je admin/owner organizacije** objavljuje za nju odmah `active`, zabilježeno kao njegovo odobrenje.
633. **Organizacija bez Safea** dobiva mock adresu `0xde5afe…` na lancu 10200; `campaign_safes` prag 1, vlasnici
     `[]`, `verified_at` samo kad je `active`. MPT registracija je mock (S7).
634. **Nova kampanja:** tenant `sbx-crowdfund-demo`, `demo = 0`, slug iz naslova (`-2`, `-3` …), prazan `campaign_stats`.
635. **Prag namjene:** `campaign_purpose` s `provider = 'platform'`; zbroj organizatora = aktivne kampanje + nova.
636. **Osobna organizacija** (kampanja fizičke osobe, „nije u fazi 1”): slug `osoba-<ime>-<6 znakova>`, `active`,
     `owner` članstvo; objava traži `person_kyc approved`.
637. **Zahtjev organizacije je u bazi od koraka 1:** `organizers`, `organizations(pending)`, `memberships(owner)`,
     `organization_applications(draft)`. „N / 5”: nacrt 2, poslano ili odbijeno 3, `active` 4, prima tuđe kampanje 5.
638. **Pravni oblik → `holder_type` jezgre:** udruga, zaklada, vjerska zajednica → association; ustanova → community;
     zadruga → cooperative; jls → municipality; doo, obrt → company. `osoba` „nije u fazi 1” i poslužitelj je odbija
     u zahtjevu organizacije (osobna organizacija nastaje samo iz čarobnjaka, odluka 636). (potvrditi)
639. **KYB:** korak bilježi `verifications(org_kyb, requested, mock)`, slanje zahtjeva → `submitted`; nakon odbijanja
     vlasnik ponovno šalje novom verifikacijom. Odluku simulira moderator na `/admin/organizacije`.
640. **Safe adresa organizacije** sprema se tek kad je organizacija `active`, malim slovima.
641. **„Prima kampanje drugih”** uključuje samo `active` organizacija; prekidač pomiče zahtjev između koraka 4 i 5.
642. **Odbijanje tuđe kampanje:** razlog 10–500 znakova u novim stupcima `campaign_settings.beneficiary_rejected_*`
     (0007). Odobrenje traži `active` organizaciju sa Safeom; bez reda `campaign_safes` mock MPT registracija ga
     stvara iz Safea organizacije.
643. **Pozivnice:** nova pozivnica iste e-pošte opoziva prethodnu; prihvat traži istu e-poštu; odbijanje = `revoked`;
     istek se računa pri čitanju; poveznica se prikazuje kroz kratki HttpOnly kolačić (10 min). Token se sprema kao SHA-256.
644. **Promjena uloge i uklanjanje člana** koriste P+e akciju `member_role`; barem jedan `owner` uvijek ostaje.
645. **Moderacija:** `block_campaign` blokira i otvara verifikaciju namjene (14 dana); `hide_content` skriva
     komentar; `no_action` na žalbu deblokira; svaka blokada/deblokada piše `moderation_decisions`; odbijena
     verifikacija namjene blokira kampanju i bilježi odluku (docs/05).
646. **Seed ne izmišlja OIB** (izmišljeni OIB s valjanom kontrolnom znamenkom mogao bi pripadati stvarnoj osobi).
647. **Vanjska kampanja:** URL `https://(www.)4fund.com/{6 znakova}`, kod vlasništva `DOMOVINA-XXXXXXXX`; provjera je mock.
