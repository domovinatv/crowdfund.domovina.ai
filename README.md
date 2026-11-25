# crowdfund.domovina.ai

**Radno ime** (konačno ime i brend čekaju korisnika, `docs/08-dizajn-sustav.md` §6). Hrvatska P2P crowdfunding platforma s istom funkcionalnom strukturom kao
[4fund.com](https://4fund.com) (EU verzija poljskog Zrzutka.pl), ali bez kartica: uplata ide
SEPA prijenosom kroz **MPT** ([pay.domovina.ai](https://github.com/domovinatv/pay.domovina.ai),
Monerium ili Swan) izravno na račun / Safe kampanje. Platforma ne drži novac i ne uzima
proviziju.

## Stanje

**UI prototip, S0–S9 (25. 11. 2026.).** Astro 7 SSR na jednom Cloudflare Workeru + D1, hr/en. Pokriva tokove
4funda: javni katalog i stranica kampanje, čarobnjak kampanje, upravljanje (novosti, komentari, financije + CSV,
povrati, kasice, linkovi za praćenje), organizacije s KYB-om (mock) i odobravanjem tuđih kampanja, postavke,
moderacija, checkout s **pravom uplatom kroz MPT sandbox** (webhook s potpisom, napojnica kao zaseban intent),
mjesečno podupiranje podsjetnikom, vanjske 4fund kampanje i faza-2 UI s oznakom. Prijava, KYC/KYB i e-pošta su
mock; produkcija nije postavljena. Paritet ekran po ekran: [`docs/10-paritet.md`](docs/10-paritet.md); što treba
prije produkcije: [`docs/11-otvorena-pitanja.md`](docs/11-otvorena-pitanja.md).

`docs/` je izvor istine; kad se odluka promijeni, prvo se mijenja dokument. Početak čitanja:
[`docs/00-indeks.md`](docs/00-indeks.md), plan [`docs/plan.md`](docs/plan.md), radna lista [`TODO.md`](TODO.md),
odluke [`docs/decisions.md`](docs/decisions.md).

## Pokretanje

```bash
npm install
cp .dev.vars.example .dev.vars      # MPT sandbox ključevi, vidi komentar u datoteci i odluku 700
npm run db:seed:local               # migracije 0001–0009 + demo seed u lokalni D1 (crowdfund-dev)
npx astro build && npx wrangler dev --port 8798   # http://localhost:8798/hr
```

Demo prijava je mock: `/hr/prijava`, bilo koja adresa iz `seed/primjeri.json` (`demoRacuni`); poveznica za
prijavu prikazuje se na ekranu umjesto e-pošte. Za razvoj je dovoljan `npm run dev` (Astro 7 dopušta jedan po
direktoriju).

## Provjere

| Naredba | Što provjerava |
|---|---|
| `npm run check` | `astro check` + vitest (bez mreže, `skipped 0`) + build |
| `npm run routes` | svaka ruta iz `src/lib/rute.ts` nad pokrenutim serverom, bez sesije i s demo sesijom |
| `BASE_URL=http://localhost:8798 npx playwright test` | smoke ruta, e2e tokova, axe (WCAG 2.1 AA) na 375 i 1280 px; `uplata.spec.ts` ide na stvarni MPT sandbox |
| `scripts/provjera-docs.sh` | mermaid u `docs/`, SQL nacrt, pokrivenost ruta 4funda u `docs/07` |

## Struktura

| Put | Sadržaj |
|---|---|
| `src/pages/` | dispečer ruta (`[lang]/[...put]`), kratki linkovi `/{id}`, `/s/`, `/z/`, `api/`, `webhooks/mpt`, `admin/` |
| `src/views/` | pogled po ruti (`stranice/*.astro`) s učitavačem (`*.ucitaj.ts`) i tekstovi (`sadrzaj/`) |
| `src/lib/` | tablica ruta, pristup, sesija, D1 upiti (`db/`), MPT klijent i webhook (`mpt/`), vanjske kampanje |
| `migrations/` | D1: `0001_core` iz campaign-core v0.2.0, platformske tablice, dodaci S6–S8 |
| `seed/` | demo podaci (`scripts/seed.mjs`, `DEMO_SAD`), `primjeri.json` za testove |
| `test/`, `e2e/` | vitest i Playwright |

## Srodni repoi

| Repo | Uloga |
|---|---|
| `pay.domovina.ai` | MPT rail: payment intenti, sandbox, webhooks, Safe po kampanji |
| `campaign-core` | zajednička shema kampanje (D1 ugovor, invarijante) |
| `energy.domovina.ai` | `/beta` i `sandbox/`: postojeći UI za uplatu kroz MPT |
| `mpt-landing` | `/support`: „podrži MPT s MPT-om”, kopija energy `/beta` |
| `zajedno.domovina.ai` | baza znanja za projekte lokalnih zajednica (domenski model, pravo) |
| `domovina-ulaznice` | predložak Astro SSR + Worker + D1 na Cloudflareu |
