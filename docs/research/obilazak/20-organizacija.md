# 20 — Company application i Fixed Beneficiary

- **URL:** `/company-application/steps` (i `/company-application`, `/company-application/form` → preusmjerenje na korake).
- **Grupa:** 11 · naslov „Company/Organisation registration”, „Complete all the steps to create an account for a
  company/organisation”, brojač „1 / 5 steps completed”.

## Koraci

| # | korak | stanje na ovom računu | tekst |
|---|---|---|---|
| 1 | Sign Up | Completed | registracija s e-poštom tvrtke/organizacije |
| 2 | Verification | „Go to verification” → `/settings/verification` | verifikacija računa **kao fizičke osobe** (zastupnik) |
| 3 | Company form | zaključano | podaci o tvrtki/organizaciji |
| 4 | Completing of the process | zaključano | „If possible for your company/organisation, we will guide you through…” promjenu tipa računa |
| 5 | Become a Fixed Beneficiary* (*Optional) | zaključano | drugi otvaraju kampanje u ime organizacije; „Read more” → blog o NGO stranici |

## Nije viđeno i zašto

- **Company form** (korak 3) i popis dokumenata za HR udrugu ili d.o.o.: otvara se tek nakon verifikacije
  osobe (korak 2), a verifikacija traži stvarne osobne podatke i Onfido (odluka 4, vrata korisnika). Polja
  ostaju iz javnog pregleda §2.4 (naziv, web, pravni oblik, opis organizacije i projekta, procijenjeni iznos).
- **Fixed Beneficiary pogled** (odobravanje/odbijanje tuđe kampanje, isplata): postoji samo na računu
  organizacije. Rute `/settings/fixed-beneficiary`, `/settings/invoices`, `/settings/company` vraćaju 404
  (provjereno GET-om). U konfiguraciji portala `user.type.organization: false`.
- Strana za javnost: `/patronized-fundraising` (200) i `/patron-catalog`, opisane u javnom pregledu §2–3.
- Odabir organizacije u čarobnjaku (autocomplete „Fixed Beneficiary”) je u [04](04-carobnjak-naslov-cilj.md).

## Za nas

Isti 5-koračni tok, ali korak 2–4 je KYB kod EMI-ja (Monerium/Swan) i MPT tenant (02, red „Organizacija”).
Fixed Beneficiary pogled radimo iz javnog pregleda: popis kampanja „u ime organizacije” sa stanjima
čeka/odobreno/odbijeno i obrazloženjem.
