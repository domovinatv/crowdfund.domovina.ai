# 04 — Čarobnjak: naslov i cilj

- **URL:** `/fundraiser/create/set-goal`
- **Grupa:** 2 · naslov „Give the title and write how much you want to collect”.

## Polja

| polje | tip | obavezno | ograničenja | poruka greške |
|---|---|---|---|---|
| „Specify the purpose (title) of the fundraiser” | text | da | maxlength **60**, brojač „n/60”; „Abc” (3 znaka) prihvaćen; placeholder ovisi o tipu | nema poruke, „Next step” ostaje onemogućen |
| „Total Amount” (one-time, organisation) | text, EUR | da | „1” prihvaćen, minimum na klijentu nije viđen | isto |
| „Monthly target (optional)” (recurring) | text, EUR | **ne** | – | – |
| „Chosen organisation” (samo organisation) | autocomplete | da | placeholder „Enter the name of the organisation (Fixed Beneficiary)”; padajući popis s logom i imenom organizacije (4 rezultata za „fund”) | – |

- Za organizaciju: skriveni savjet „See a catalog of all the organisations you can support…” s linkom
  „click here.” i tekst „The funds collected will go directly to the account of the organisation you designate.”

## Akcije

- **„Improve”** (AI), aktivan tek kad naslov nije prazan. Otvara modal „Improve Title”: „You can edit the improved
  title later in the main window”, „Your title: …”, „Assistant's proposals:” s **4 prijedloga** (za „Abc” su bili
  generički: „Join Us to Create a Brighter Tomorrow!” i slični). Gumbi „Cancel” i „Replace” (aktivan kad se
  odabere prijedlog).
- „Tips for setting up fundraiser” (harmonika): iznos i naslov se mogu kasnije promijeniti; skupljanje je
  besplatno; kampanja se ne zaustavlja ni iznad 100 % cilja.
- „Previous step” / „Next step” → `/fundraiser/create/add-multimedia`.

## Za nas

Isto: naslov ≤ 60, AI prijedlog je opcionalan (faza 2), za recurring je cilj opcionalan, a kampanja
za organizaciju traži organizaciju iz kataloga udruga koje su pristale (Fixed Beneficiary).
