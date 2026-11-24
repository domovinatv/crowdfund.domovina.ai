# crowdfund.domovina.ai

**Radno ime.** Hrvatska P2P crowdfunding platforma s istom funkcionalnom strukturom kao
[4fund.com](https://4fund.com) (EU verzija poljskog Zrzutka.pl), ali bez kartica: uplata ide
SEPA prijenosom kroz **MPT** ([pay.domovina.ai](https://github.com/domovinatv/pay.domovina.ai),
Monerium ili Swan) izravno na račun / Safe kampanje. Platforma ne drži novac i ne uzima
proviziju.

## Stanje

**Faza: baza znanja + plan (S0, 24. 11. 2026.).** Koda još nema. `docs/` je izvor istine iz
kojeg se piše kod, ne obrnuto. Početak čitanja: [`docs/00-indeks.md`](docs/00-indeks.md).
Plan izvedbe UI prototipa: [`docs/plan.md`](docs/plan.md), radna lista [`TODO.md`](TODO.md).

## Srodni repoi

| Repo | Uloga |
|---|---|
| `pay.domovina.ai` | MPT rail: payment intenti, sandbox, webhooks, Safe po kampanji |
| `campaign-core` | zajednička shema kampanje (D1 ugovor, invarijante) |
| `energy.domovina.ai` | `/beta` i `sandbox/`: postojeći UI za uplatu kroz MPT |
| `mpt-landing` | `/support`: „podrži MPT s MPT-om”, kopija energy `/beta` |
| `zajedno.domovina.ai` | baza znanja za projekte lokalnih zajednica (domenski model, pravo) |
| `domovina-ulaznice` | predložak Astro SSR + Worker + D1 na Cloudflareu |
