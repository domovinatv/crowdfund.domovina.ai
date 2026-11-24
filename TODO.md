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
- [ ] `docs/07-rute.md` (hr/en sitemap) → S3
- [ ] `docs/08-dizajn-sustav.md` (tokeni, komponente, žičani okviri) → S3
- [ ] (!) Ime i brend platforme → S3

## F2 — Prototip

- [ ] Astro + Cloudflare + D1 kostur, `npm run check` → S4
- [ ] Migracije + seed (≥ 20 kampanja) → S4
- [ ] Javne rute + Playwright smoke → S5
- [ ] Organizatorski tokovi + e2e „nova kampanja” → S6

## F3 — Plaćanje i hibrid

- [ ] MPT sandbox tenant, checkout, webhook, napojnica → S7
- [ ] Vanjska 4fund kampanja, recurring, faza-2 UI → S8

## F4 — Paritet

- [ ] Tablica pariteta, mobilni pregled, a11y → S9
- [ ] (!) Preview deploy na workers.dev → S9
- [ ] (!) GitHub remote i javnost repoa (odluka 17)
