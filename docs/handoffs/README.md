# Handoffi za sesije S1–S13 (i S1b)

Plan je u [`docs/plan.md`](../plan.md). Svaka sesija ima svoj handoff `SN.md`. Korisnik nakon
`/clear` kaže „nastavi crowdfund” ili zalijepi prompt iz clipboarda.

## Lanac

1. Sesija N počinje iz `docs/handoffs/SN.md`.
2. Sesija N radi svoj paket po pravilima ispod.
3. Na kraju sesija N:
   - označi `SN` u „Stanje lanca” (commit, testovi, kratka napomena) i stavke u `TODO.md`;
   - **ako je naučila nešto što mijenja sljedeće pakete, uredi `S(N+1).md`** (i po potrebi
     kasnije handoffe i plan); nedovršeni dio paketa ide na **vrh** `S(N+1).md`;
   - u `S(N+1).md` upiše polazni commit i brojke;
   - pozove `/wrap-up`; handoff prompt je **sadržaj `docs/handoffs/S(N+1).md`**.
4. Bez konteksta usred paketa: nastavak je opet `SN` s popisom ostatka na vrhu; broj se ne povećava.
5. Vrata: lanac staje dok korisnik ne odluči. Pitanje je upisano na vrh sljedećeg handoffa.
6. Handoff se mijenja samo prema naprijed; gotovi `SN` ostaju kao povijest.

## Stanje lanca

| Sesija | Paket | Stanje | Commit | Testovi | Napomena |
| --- | --- | --- | --- | --- | --- |
| S0 | Istraživanje, baza znanja, plan | gotovo | 7cd97c3 | – | odluke 1–19 |
| S1 | Prijavljeni obilazak A | gotovo | 2312e75 | – | 18 ekrana (`ls docs/research/obilazak/*.md \| wc -l` = 19 s README); Edit/More/Statistics čekaju vrata u S1b; odluke 100–105 |
| S1b | Prijavljeni obilazak B (+ C anonimni) | gotovo | b3076d5 | – | 27 ekrana (`ls docs/research/obilazak/[0-9]*.md \| wc -l`); odluke 150–154; ITalk company application čeka 4fund (vrh S2) |
| S2 | Specifikacija | gotovo | d097151 | `scripts/provjera-docs.sh`: mermaid 20 blokova / 0 neispravnih, SQL 42 tablice (37 platformskih + 5 stubova) | 03, 04 (12 tokova), 05, 09; 27/27 ekrana s entitetom; odluke 200–216; 3 prijedloga za campaign-core (odluka 213) |
| S3 | Rute i dizajn sustav | gotovo, vrata ime/brend otvorena | 5730472 | `scripts/provjera-docs.sh`: mermaid 21 / 0 neispravnih, SQL 42 tablice, rute 4funda 85 / 0 bez retka u 07 | 07 (sitemap hr/en, pristup po ruti), 08 (tokeni, 74 retka komponenti, 8 žičanih okvira); odluke 300–313; ime: 5 prijedloga, radno ime vrijedi (odluka 305), pitanje na vrhu S4 |
| S4 | Kostur Astro + D1 | gotovo, vrata ime/brend i dalje otvorena | 6fa6131 | `npm run check`: astro check 0 errors (30 datoteka), vitest 5 datoteka / 34 testa / 0 skipped, build complete; seed 24 kampanje (`wrangler d1 execute crowdfund-dev --local --command "SELECT count(*) FROM campaigns"`) | 52 tablice, 0001 generiran iz campaign-core v0.2.0; `wrangler dev`: `/` 302 → `/hr`, `/hr/` 200 s 12 kartica; `/en/safety` → `/en/security`; odluke 400–410 |
| S5 | Javni dio | gotovo, vrata ime/brend i dalje otvorena | 4412e25 | `npm run check`: astro check 0 errors, vitest 12 datoteka / 203 testa / 0 skipped, build complete; `npm run routes` 85/85 (3 izostavljene, S7); `npx playwright test` 146 passed | dispečer ruta (500), katalog sa 7 redoslijeda, stranica kampanje, QR/plakat/widget/embed, kasice, kratki linkovi, profili, 19 statičnih stranica hr/en; odluke 500–532 |
| S6 | Organizator | gotovo, vrata ime/brend i dalje otvorena | b5c6e2e | `npm run check`: astro check 0 errors, vitest 25 datoteka / 542 testa / 0 skipped, build complete; `npm run routes` 314 provjera / 314 odgovara / 0 bez pogleda / 4 izostavljene; `BASE_URL=http://localhost:8798 npx playwright test` 400 passed (uklj. e2e organizator i odobravanje) | mock prijava, pristup P/K/U/A/P+e, čarobnjak + objava + pragovi, upravljanje kampanjom (CSV, povrati, zaključavanje), organizacija + KYB mock + članovi + odobravanje, postavke + KYC mock, „moje”, `/admin`; migracije 0004, 0007; odluke 600–673 |
| S7 | Uplata kroz MPT sandbox | gotovo, vrata ime/brend i dalje otvorena | 7e44bd2 | `npm run check`: astro check 0 errors, vitest 28 datoteka / 588 testova / 0 skipped, build complete; `npm run routes` 320 / 320 / 0 bez pogleda / 1 izostavljena; `BASE_URL=http://localhost:8798 npx playwright test` 416 passed (4 e2e nad stvarnim sandboxom) | sandbox tenant, checkout 4 koraka, webhook (potpis, dedupe, idempotentno) + pull istim putem, napojnica kao drugi intent, potvrda; status pull umjesto SSE (MPT nema CORS); odluke 700–729 |
| S8 | Hibrid i ostatak | gotovo, vrata ime/brend i dalje otvorena | a7f1ddc | `npm run check`: astro check 0 errors, vitest 32 datoteke / 644 testa / 0 skipped, build complete; `npm run routes` 335 / 335 / 0 bez pogleda / 0 izostavljenih; `BASE_URL=http://localhost:8798 npx playwright test` 438 passed (uklj. e2e vanjske kampanje) | vanjska 4fund kampanja (API ne, gumb `/pay`), mjesečni podsjetnik + trajni nalog, privola i komentar iz poruke, faza-2 UI (ponude, razine, promocija, osobna kampanja), `02` pokriven; odluke 800–849 |
| S9 | Paritet i pregled | gotovo, vrata deploy i ime/brend otvorena | 3f4e967 | `npm run check`: astro check 0 errors (391 datoteka), vitest 32 datoteke / 645 testova / 0 skipped, build complete; `npm run routes` 335 / 335 / 0 bez pogleda / 0 izostavljenih; `BASE_URL=http://localhost:8798 npx playwright test` 678 passed (uklj. 240 axe na 375 i 1280 px) | `docs/10` paritet (87 redova, 11 djelomično), `docs/11` pravnik i produkcija + priprema deploya, Brave pregled 213 ruta × 2 širine bez preljeva, popravci (postotak, aktivnost sesije, a11y); odluke 900–910 |
| S10 | Vrata i dorade | gotovo, ime/brend otvoreno | 65a8fbd | `npm run check`: astro check 0 errors, vitest 34 datoteke / 678 testova / 0 skipped, build complete; `npm run routes` 335 / 335 (lokalno i nad stagingom); `BASE_URL=http://localhost:8798 npx playwright test` 686 passed; nad stagingom `uplata` + `mjesecno` 6 passed | staging `crowdfund-staging.domovina.ai` (D.O.M., javno, noindex), webhook izvana 2 × 200, javni GitHub repo, 11 „djelomično” zatvoreno (R2 ✗ auto, potvrditi), e2e mjesečnog toka; odluke 1000–1020 |
| S11 | Ostatak | gotovo, ime/brend otvoreno | 515360a | `npm run check`: astro check 0 errors, vitest 36 datoteka / 694 testa / 0 skipped, build complete; `npm run routes` 335 / 335 (lokalno i nad stagingom); `BASE_URL=http://localhost:8798 npx playwright test` 694 passed | SSE statusa kroz Worker proxy (radi nad stagingom), video kampanje (klik za učitavanje), opis kasice kroz renderer, e2e pošte organizatoru, lokalni sandbox tenant; e2e checkouta nad stagingom čeka kvotu simulacija; odluke 1100–1110 |
| S12 | Provjera i čekanje | gotovo, ime/brend otvoreno | ae3ec63 | `npm run check`: astro check 0 errors, vitest 36 datoteka / 694 testa, build complete; `BASE_URL=https://crowdfund-staging.domovina.ai npx playwright test e2e/uplata.spec.ts` 6 passed, `e2e/mjesecno.spec.ts` 2 passed | kvota sandboxa 200/24 h, e2e checkouta (uklj. SSE) zelen nad stagingom, bez promjena koda; odluke 1200–1202 |
| S13 | Čekanje odluka korisnika | čeka korisnika | | | |

## Zajednička pravila (svaka sesija)

- **Polazak:** od S4 `npm run check` i jedna rečenica da je zeleno; ako nije, prvo popravi.
  Prije S4: `git status` čist.
- **Opseg:** samo ovaj repo. Ostali repoi (`pay.domovina.ai`, `campaign-core`, `energy`,
  `mpt-landing`) se čitaju, ne mijenjaju; potrebna izmjena tamo ide kao bilješka u
  `docs/research/` i pitanje korisniku.
- **Orkestracija:** posao rade Opus 5.5 subagenti, glavna sesija orkestrira. `effort` uvijek
  eksplicitno (`high` za kod, `medium` za čitanje). Najviše 2–3 agenta paralelno. Fable samo
  na izričit zahtjev korisnika.
- **Claude in Chrome (S1, S1b, S9):** ne delegira se agentima; orkestrator radi sam. Brave
  profil i `deviceId` iz globalnog `~/.claude/CLAUDE.md` (`list_connected_browsers` →
  `select_browser`). Jedna grupa tabova, ne `open` naredba. Samo čitanje (odluka 4):
  nikad „Objavi”, „Plati”, „Isplati”, „Pošalji”, „Obriši”, „Verificiraj”. Tekst ekrana s
  `get_page_text`/`read_page`, ne snimke svakog ekrana (trošak konteksta).
- **Agentima zabranjeni** `TODO.md`, `docs/plan.md`, `docs/decisions.md` i handoffi; orkestrator
  ih ažurira.
- **Testovi:** bez mreže u unit testovima, `skipped 0`. Stvarni MPT sandbox samo u S7 e2e.
- **Trošak:** procjena prije svega preko ~100 poziva; nikad `claude -p` petlja; bez Monitora
  koji javlja napredak.
- **Brojke** samo uz naredbu kojom su dobivene.
- **Autonomno:** odluči sam i zapiši odluku u svom bloku; commitaj svaki zeleni korak na
  `main`. Nepovratno i vanjsko (deploy, remote, mail, prijava na tuđe servise, pravi novac)
  ostavi korisniku.
- **Token budget:** oko 150k konteksta orkestratora zatvori sesiju po koraku 3.
- **Veličina agentovog paketa (S6):** agent s ~15–20 ruta (pogledi + upiti + testovi) potroši 300k konteksta
  na pola posla; 7–10 ruta po agentu prođe u 120–240k. Paralelni agenti dijele jedan `astro dev` (Astro 7
  dopušta jedan po direktoriju) i lokalni D1; `db:seed:local` smije samo jedan, uz najavu.
- Istraživanja u `docs/research/YYYY-MM-DD-*.md`; obilazak u `docs/research/obilazak/`.
- Iz `pay.domovina.ai/CLAUDE.md`: iznos uplate nikad ne nosi identitet.
- Commit trailer: `Co-Authored-By` po sistemskoj uputi sesije.
