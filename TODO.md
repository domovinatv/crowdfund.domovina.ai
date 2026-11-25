# TODO — crowdfund.domovina.ai (UI prototip)

Radna lista. Čuva se u repou da napredak preživi između sesija. Označene stavke su gotove i
provjerene (od S4: `npm run check` zelen). Odluke idu u [docs/decisions.md](docs/decisions.md).

Plan po sesijama: [docs/plan.md](docs/plan.md). Handoff po sesiji: [docs/handoffs/](docs/handoffs/).

Legenda: `[x]` gotovo · `[ ]` otvoreno · `[~]` u radu · `(!)` traži korisnika · `→ Sn` planirana sesija

## F0 — Istraživanje i obilazak

- [x] Javni pregled 4fund.com (`docs/research/2026-11-24-4fund-javni-pregled.md`) → S0
- [x] Pravni i poslovni okvir (`docs/research/2026-11-24-pravni-i-poslovni-okvir.md`) → S0
- [x] Mapa ponovne upotrebe naših repoa → S0
- [x] Baza znanja 00, 01, 02, 06 + plan, odluke, handoffi → S0
- [x] Korisnik prijavljen na 4fund u Brave profilu (Google) → S1
- [x] Obilazak A: račun, verifikacija, čarobnjak, My fundraisers, postavke (18 ekrana) → S1
- [x] Vrata objave: korisnik odlučio „d”: bez objave s osobnog računa, ITalk d.o.o. kao organizacija (odluke 150–151) → S1b
- [ ] (!) Edit / More / Statistics / Finances / Fixed Beneficiary nakon što 4fund odobri ITalk (čeka 4fund, vrh S2)
- [x] Anonimni obilazak: modal prijave, potvrda e-pošte, reset lozinke, odjavljeni čarobnjak → S1b dio C
- [x] Obilazak B: checkout, financije, isplata (forme), kasica, tracking, ponude/razine, organizacija, prijave → S1b
- [x] `02-4fund-na-mpt.md` stupac „Prototip” potvrđen → S1b

## F1 — Specifikacija

- [x] `docs/03-domenski-model.md` s erDiagramom, organizacije s članovima i ulogama (odluka 150) → S2
- [x] `docs/04-tokovi.md` (sequence po toku, 12 tokova) → S2
- [x] `docs/05-zivotni-ciklus.md` (kampanja, doprinos, verifikacija, prijava) → S2
- [x] Razlika prema campaign-core + nacrt D1 migracija (`docs/09-d1-shema.md`) → S2
- [ ] (!) Prijedlozi za campaign-core (`foundation`, `purpose_evidence`, `amount_hidden`, J2), odluka 213 — vlasnik jezgre
- [x] `docs/07-rute.md` (hr/en sitemap, 85 ruta 4funda preslikano) → S3
- [x] `docs/08-dizajn-sustav.md` (tokeni, komponente, žičani okviri) → S3
- [ ] (!) Ime i brend platforme: dvije runde prijedloga odbijene (`08` §6, `research/2026-11-25-ime-platforme-iteracija-2.md`), radno ime vrijedi (odluke 305, 1004)

## F2 — Prototip

- [x] Astro + Cloudflare + D1 kostur, `npm run check` → S4
- [x] Migracije + seed (24 kampanje, 4 tipa, 8 kategorija) → S4
- [x] Javne rute + Playwright smoke (85/85 ruta, 146 smoke testova) → S5
- [x] Organizatorski tokovi + e2e „nova kampanja” i „organizacija odobri tuđu kampanju” (400 Playwright) → S6

- [x] Rute bez en oblika u 07 (odluke 409, 502, 613) → S6
- [x] Migracije koje predlaže S5: `users.slug`, token praćenja, skriveni popis uplata (0004, odluke 608–610) → S6
- [x] Seed relativno na datum seedanja (odluka 611) → S6
- [x] Seed nedosljednosti: Sunčani krov i prijava s odlukom usklađeni (odluka 847) → S8
- [x] Login CSRF zatvoren bez koda (odluka 906), `login_events.last_activity_at` se osvježava (odluka 905) → S9

## F3 — Plaćanje i hibrid

- [x] MPT sandbox tenant, checkout, webhook, napojnica, potvrda (588 unit, 416 Playwright, e2e nad sandboxom) → S7
- [x] Prihvat uvjeta checkouta u `consents`; „prikaži poruku kao komentar”; obavijesti e-poštom (mock) (odluke 821–824) → S8
- [x] `potvrdiPovrat` po pravilu 717 → S8
- [x] Pravi SSE statusa: proxy MPT `/stream` kroz Worker, pull kao rezerva; radi nad stagingom (odluke 1100–1103) → S11
- [x] Webhook izvana: `webhook_url` sandbox tenanta na `https://crowdfund-staging.domovina.ai/webhooks/mpt`, 2 × POST → 200 (odluka 1003) → S10
- [x] Vanjska 4fund kampanja (e2e), recurring (podsjetnik + trajni nalog), faza-2 UI, `02` pokriven (odluke 800–849) → S8
- [x] e2e mjesečnog toka i komentara pri plaćanju (`mjesecno.spec.ts`); `subscriptions` povezan uz poznati IBAN (odluke 1019, 1020) → S10
- [x] e2e mock e-pošte organizatoru o novom doprinosu (`posta-organizatoru.spec.ts`, odluka 1108) → S11
- [x] e2e checkouta nad stagingom: `uplata.spec.ts` 6 passed (uklj. SSE), `mjesecno.spec.ts` 2 passed; kvota sandboxa 200/24 h (odluke 1200, 1201) → S12
- [ ] (!) Zahtjev 4fundu za API token radi prikaza iznosa vanjskih kampanja (odluka 800) — korisnikova odluka

## F4 — Paritet

- [x] Tablica pariteta (`docs/10`, 87 redova), pregled 375/1280 u Braveu, axe a11y 240 testova (odluke 900–908) → S9
- [x] Otvorena pitanja za pravnika i produkciju (`docs/11`) → S9
- [x] 11 „djelomično” redova iz `docs/10` zatvoreno: 3 „=”, 8 „≈”, R2 ✗ do odluke (odluke 1007–1018) → S10
- [x] R2 za medije i privitak: ✗ do produkcije, korisnik prihvatio auto-odluku 1007 (odluka 1109) → S11
- [x] Video na stranici kampanje (YouTube/Vimeo, klik za učitavanje) i opis kasice kroz renderer (odluke 1105–1107) → S11
- [x] Staging deploy `https://crowdfund-staging.domovina.ai` (D.O.M., javno, noindex, traka sandboxa; odluke 1000–1002) → S10
- [x] GitHub: javni `github.com/domovinatv/crowdfund.domovina.ai`, pregled povijesti prije pusha (odluka 1006) → S10
