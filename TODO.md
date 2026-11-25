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
- [ ] (!) Ime i brend platforme: 5 prijedloga u `08` §6, do odgovora radno ime (odluka 305), pitanje na vrhu S4

## F2 — Prototip

- [x] Astro + Cloudflare + D1 kostur, `npm run check` → S4
- [x] Migracije + seed (24 kampanje, 4 tipa, 8 kategorija) → S4
- [x] Javne rute + Playwright smoke (85/85 ruta, 146 smoke testova) → S5
- [x] Organizatorski tokovi + e2e „nova kampanja” i „organizacija odobri tuđu kampanju” (400 Playwright) → S6

- [x] Rute bez en oblika u 07 (odluke 409, 502, 613) → S6
- [x] Migracije koje predlaže S5: `users.slug`, token praćenja, skriveni popis uplata (0004, odluke 608–610) → S6
- [x] Seed relativno na datum seedanja (odluka 611) → S6
- [x] Seed nedosljednosti: Sunčani krov i prijava s odlukom usklađeni (odluka 847) → S8
- [ ] Login CSRF (POST bez Origin prolazi), `sessions.last_activity_at` se ne osvježava → S9

## F3 — Plaćanje i hibrid

- [x] MPT sandbox tenant, checkout, webhook, napojnica, potvrda (588 unit, 416 Playwright, e2e nad sandboxom) → S7
- [x] Prihvat uvjeta checkouta u `consents`; „prikaži poruku kao komentar”; obavijesti e-poštom (mock) (odluke 821–824) → S8
- [x] `potvrdiPovrat` po pravilu 717 → S8
- [ ] Pravi SSE statusa (CORS na MPT `/stream` ili proxy kroz Worker), jedan poziv raila po učitavanju → S9
- [ ] (!) Webhook preko tunela prema `wrangler dev` (traži korisnikov pristanak; sad samo unit testovi) → S9
- [x] Vanjska 4fund kampanja (e2e), recurring (podsjetnik + trajni nalog), faza-2 UI, `02` pokriven (odluke 800–849) → S8
- [ ] e2e mjesečnog toka i komentara/obavijesti pri plaćanju; povezati `subscriptions` s obećanjem (odluka 828) → S9
- [ ] (!) Zahtjev 4fundu za API token radi prikaza iznosa vanjskih kampanja (odluka 800) — korisnikova odluka

## F4 — Paritet

- [ ] Tablica pariteta, mobilni pregled, a11y → S9
- [ ] (!) Preview deploy na workers.dev → S9
- [ ] (!) GitHub remote i javnost repoa (odluka 17)
