# crowdfund.domovina.ai — CLAUDE.md

P2P crowdfunding platforma po funkcionalnom uzoru 4fund.com, plaćanje kroz MPT
(SEPA → Monerium/Swan → račun ili Safe kampanje). **Stanje: baza znanja i plan, bez koda.**
`docs/` je izvor istine; kad se odluka promijeni, prvo se mijenja dokument.

## Pravila

- **Funkcionalni paritet, vlastiti identitet.** Kopiramo strukturu, tokove, polja, stanja i
  poslovna pravila 4funda. Ne kopiramo njihov logo, ime, boje, ilustracije ni tekstove
  (`docs/decisions.md` odluka 3). Snimke njihovog sučelja ostaju lokalno u gitignoreanom
  `docs/research/obilazak/snimke/`.
- **Obilazak 4funda (Claude in Chrome):** samo Brave profil iz globalnog CLAUDE.md, samo
  čitanje. Nikad ne potvrđuj obrazac, uplatu, isplatu, objavu, brisanje ni verifikaciju; čarobnjak
  se prolazi do zadnjeg koraka prije „Objavi”. Ne zapisuj osobne podatke drugih ljudi.
- **Novac:** platforma nikad ne drži novac ni ključeve. Uplata = MPT payment intent tenanta
  platforme. Napojnica je zaseban intent, a „0” je jednako istaknuta opcija.
- **Pravni opseg faze 1:** `docs/research/2026-11-24-pravni-i-poslovni-okvir.md` §6.
  Fizičke osobe kao organizatori i kampanje s nagradama u prototipu postoje kao UI, ali su
  označene kao „nije u fazi 1”.
- Copy: podržavatelj **doprinosi** / **donira**, nikad „ulaže”.
- Tvrdnja o drugom repou ulazi u dokument tek kad je provjerena u tom repou, s putanjom.
- Iznos uplate nikad ne nosi identitet (pravilo pay.domovina.ai): veza je referenca intenta.

## Lanac sesija

Plan: `docs/plan.md`, handoffi `docs/handoffs/`. „Nastavi crowdfund” znači prvi otvoreni
red u „Stanje lanca” u `docs/handoffs/README.md`; prompt je sadržaj tog `SN.md`.
