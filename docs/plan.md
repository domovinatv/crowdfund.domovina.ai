# Plan — UI prototip crowdfund platforme (lanac sesija)

## Zašto

Hrvatska P2P crowdfunding platforma s istom funkcionalnom strukturom kao 4fund.com, ali s
plaćanjem kroz MPT (SEPA → Monerium/Swan → račun/Safe kampanje), bez provizije i bez
držanja novca. Ovaj plan vodi do **UI prototipa** koji pokriva sve 4fundove tokove, s pravom
uplatom kroz MPT sandbox. Produkcija, pravni upis i pravi novac nisu dio ovog plana.

Arhitektura: [06-arhitektura](06-arhitektura.md). Preslikavanje funkcija: [02](02-4fund-na-mpt.md).

## Tvrdi uvjeti (svaka sesija)

1. Funkcionalni paritet s 4fundom, vlastiti vizualni identitet i tekstovi (odluka 3).
2. Obilazak 4funda samo čitanjem; ništa se ne potvrđuje ni ne plaća (odluka 4).
3. Platforma ne drži novac ni ključeve; uplata je MPT intent; napojnica zaseban intent s
   jednako istaknutom nulom (odluke 6, 7).
4. Samo MPT **sandbox** (`sbx-` tenant, `sk_test_`); produkcijski tenant je izvan plana.
5. Od S4: `npm run check` (astro check + vitest + build) zelen na kraju svake sesije,
   `skipped 0`.

## Sesije

| # | Faza | Paket | Odluke | Gotovo kad |
|---|---|---|---|---|
| S0 | F0 | Istraživanje, baza znanja, plan | 1–19 | ovi dokumenti u gitu |
| S1 | F0 | **Prijavljeni obilazak A** (vrata: korisnik prijavljen u Brave): račun, verifikacija, čarobnjak kampanje do „Objavi”, uređivanje, „My fundraisers”, statistika, postavke | 100– | `docs/research/obilazak/` ima ekran po datoteci za grupe 1, 2, 3, 6 iz §12 javnog pregleda; inventar `obilazak/README.md` s brojem ekrana |
| S1b | F0 | **Prijavljeni obilazak B**: checkout do zadnjeg koraka, financije i izvoz, isplata (samo forme), kasica, link za praćenje, ponude/razine, organizacija i Fixed Beneficiary, prijave, kontakt | 150– | grupe 4, 5, 7–12 pokrivene; `02-4fund-na-mpt.md` stupac „Prototip” potvrđen za sve redove |
| S2 | F1 | **Specifikacija**: `03-domenski-model` (erDiagram), `04-tokovi` (sequence po toku), `05-zivotni-ciklus` (stanja), razlika prema campaign-core (popis tablica/stupaca koji nedostaju), nacrt D1 migracija u `docs/` | 200– | svaki ekran iz obilaska ima rutu i entitet; mermaid parsira; popis razlika prema campaign-core |
| S3 | F1 | **Informacijska arhitektura i dizajn sustav**: `07-rute` (sitemap, rute hr/en), `08-dizajn-sustav` (tokeni, komponente, žičani okviri ključnih ekrana); ime i brend (vrata) | 300– | svaka ruta 4funda → naša ruta ili ✗ s razlogom; popis komponenti; korisnik odlučio ime ili zapisano radno ime |
| S4 | F2 | **Kostur**: Astro 7 SSR + `@astrojs/cloudflare` + D1, migracije iz S2 (campaign-core kao ovisnost), seed demo podataka, layout, i18n hr/en, `npm run check` | 400– | `npm run check` zelen; `wrangler dev` služi početnu s podacima iz D1; ≥ 20 seed kampanja |
| S5 | F2 | **Javni dio**: početna, katalog (filtri, 7 redoslijeda, kategorije), stranica kampanje (sve sekcije), profil osobe i organizacije, statične stranice (kako radi, troškovi, FAQ, sigurnost, pravila) | 500– | sve javne rute iz `07-rute` vraćaju 200; Playwright smoke po ruti |
| S6 | F2 | **Organizator**: mock prijava, verifikacija (obrazac + status), čarobnjak kampanje, uređivanje, nadzorna ploča, ažuriranja, komentari/moderacija, kasice, linkovi za praćenje, financije + CSV, organizacija i odobravanje tuđih kampanja | 600– | e2e: novi korisnik → verifikacija → kampanja objavljena → vidljiva u katalogu |
| S7 | F3 | **Uplata kroz MPT sandbox**: `/{id}/podrzi` checkout s istim poljima kao 4fund, `POST /v1/intents` sa `sk_test_`, QR/IBAN/referenca, SSE status, webhook (potpis, idempotencija) → `contributions`, napojnica kao drugi intent, potvrda | 700– | e2e: uplata → `simulate paid` → webhook → iznos i popis uplatitelja ažurirani; test potpisa i ponovljenog webhooka |
| S8 | F3 | **Hibrid i ostatak**: vanjska 4fund kampanja (opt-in link, oznaka, gumb na njihov `/pay`, provjera uvjeta za čitanje iznosa), recurring (podsjetnik + QR), faza-2 UI (ponude, razine, osobe) s oznakom | 800– | e2e za vanjsku kampanju; svaki red tablice u `02` ima ekran u prototipu |
| S9 | F4 | **Paritet i pregled**: tablica pariteta ekran-po-ekran naspram obilaska, a11y i mobilni pregled, preview deploy na `*.workers.dev` (vrata) | 900– | tablica pariteta bez praznih redova; Playwright prolazi na 375 px i 1280 px; preview URL (ako korisnik odobri) |

**Procjena:** 10 sesija (S1–S9 + S1b). **Vrata:** S1 (prijava u Brave), S3 (ime/brend),
S9 (deploy). **Paralelno:** S2 i S3 dijele samo `docs/00`, ali S3 treba entitete iz S2, pa
linearno. **Najrizičnije:** S1/S1b (Brave ekstenzija, opseg obilaska; ako zapne, S2 ide samo
s javnim pregledom), S7 (stvarni ugovor s MPT sandboxom, webhook prema `wrangler dev` treba
tunel ili ručni `simulate` + pull statusa).

## Gdje smo

S0, S1 i S1b gotovi (24. 11. 2026.): istraživanje, plan, obilazak 4funda (27 ekrana, prijavljeno i anonimno). ITalk d.o.o. čeka odobrenje računa tvrtke na 4fundu (nije vrata). Koda nema. Sljedeće: S2, specifikacija.
