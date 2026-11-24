# Handoffi za sesije S1–S9 (i S1b)

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
| S3 | Rute i dizajn sustav | vrata: ime/brend | | | |
| S4 | Kostur Astro + D1 | | | | |
| S5 | Javni dio | | | | |
| S6 | Organizator | | | | |
| S7 | Uplata kroz MPT sandbox | | | | |
| S8 | Hibrid i ostatak | | | | |
| S9 | Paritet i pregled | vrata: deploy | | | |

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
- Istraživanja u `docs/research/YYYY-MM-DD-*.md`; obilazak u `docs/research/obilazak/`.
- Iz `pay.domovina.ai/CLAUDE.md`: iznos uplate nikad ne nosi identitet.
- Commit trailer: `Co-Authored-By` po sistemskoj uputi sesije.
