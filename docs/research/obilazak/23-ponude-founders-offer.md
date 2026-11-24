# 23 — Ponude i aukcije: dodavanje i Founder's Offer

- **URL:** `/whip-rounds/add-awards` (kartica „Your fundraisers”) i
  `/whip-rounds/award-access-status/public/add-awards` (kartica „Fundraisers from other organisers”).
- **Grupa:** 8 · „Back to offer catalog”, naslov „Select the fundraiser to which you want to add a offer / auction”.

## Odabir kampanje

- „Your fundraisers”: na računu bez objavljene kampanje prazno.
- „Fundraisers from other organisers”: samo kampanje kojima je organizator dopustio tuđe ponude
  (status pristupa „public”). Pretraga „Enter keywords...”, **Sort:** Most donated, Least donated, Newest,
  Oldest, Last updated, Most accurate. Kartica: naslov, Created, Ends in (ili ukupno i broj donatora za
  kampanju bez roka), iznos od cilja i postotak, gumb **Select**, „Load more”.
- **Select** otvara stranicu kampanje na `/{id}#offers` u novom tabu. Kartica „Offers/auctions” ima
  „+ Add offer/auction”.

## Founder's Offer traži verifikaciju

Neverificiranom korisniku „+ Add offer/auction” otvara modal **„Offers”**: „To add offers as a founder (for
someone else's fundraiser) - verify yourself…”, „Verification process is conducted only once and only takes a
few minutes”, napomena o certificiranom PSP-u, gumbi „Cancel” / „Verify your profile”. Sam obrazac ponude
(naziv, cijena, aukcija, količina, TIN/DAC7) zato **nije viđen**; ostaje iz javnog pregleda §3.

## Usput

- Komentar na kampanji: `comment_create[body]`, **maxlength 2500**, obavezno.
- Kampanja bez roka i bez cilja prikazuje „€… total” i „Donate your way” umjesto „Donate”.

## Za nas

Ponude su faza 2 (odluka 8). Pravilo „tuđe ponude samo uz dopuštenje organizatora i verificiranog
ponuđača” preuzimamo u model (`campaigns.allow_external_offers`, ponuđač verificiran).
