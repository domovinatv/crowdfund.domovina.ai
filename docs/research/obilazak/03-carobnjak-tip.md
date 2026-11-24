# 03 — Čarobnjak: odabir tipa

- **URL:** `/fundraiser/create/choose-type?type=default` (kanonski `/fundraiser/create/choose-type`). Radi i bez prijave.
- **Grupa:** 2 · zaglavlje „Create fundraiser”, zatvaranje ✕ gore desno.

## Polja

| polje | tip | obavezno | ograničenja | poruka greške |
|---|---|---|---|---|
| Tip | kartice (jedna aktivna) | da | One-time fundraiser („Start raising funds for any cause”) · Recurring fundraiser („Receive monthly contributions”) · Fundraiser for organisation („Support the organisation with a fundraiser”) | – |
| Namjena „What best describes the purpose of the fundraiser?” | čipovi | da za one-time i recurring | **Charity, Culture, Projects, Needs, Sport, Animals, Travels, Other** (8; potkategorija u čarobnjaku nema) | gumb „Next step” se ne aktivira |

- Za „Fundraiser for organisation” se čipovi namjene **skrivaju** i pojavljuje se „Note! All funds collected
  will be withdrawn to the chosen organisation.”
- Link „Not sure which fundraiser to choose? Check out the differences!” s ikonom videa.

## Stanja i prijelazi

- „Next step” → `/fundraiser/create/set-goal` ([04](04-carobnjak-naslov-cilj.md)).
- **Nacrt se pamti** (na poslužitelju ili u pregledniku): ponovni ulazak otvara modal „The existing process of
  creating a fundraiser”: „You have a fundraiser creation process in progress. Do you want to go back and
  finish it or start anew (starting anew will delete all previously entered data)?” s gumbima „Start anew”
  i „Back to edit”. „Start anew” vraća na odabir tipa.
- Stepper čarobnjaka ima 5 koraka: Choose fundraiser type → Enter title and goal → Add photos or videos →
  Add fundraiser description → Fundraiser preview. Naslov ekrana ovisi o tipu: „Create a regular
  fundraiser” / „Create a recurring fundraiser” / „Create a fundraiser for organisation”.
