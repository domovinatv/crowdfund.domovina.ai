# 06 — Čarobnjak: opis

- **URL:** `/fundraiser/create/add-description`
- **Grupa:** 2 · naslov „Add description for your fundraiser”.

## Polja

| polje | tip | obavezno | ograničenja | poruka greške |
|---|---|---|---|---|
| Opis | rich text (Quill `ql-editor`), placeholder „Start writing a description here...” | da | „min. 50 characters. Current character count: n” | „Publish fundraiser” ostaje onemogućen ispod 50 znakova |

- Alatna traka: **bold, italic, link, slika, video, poravnanje (lijevo, sredina, desno), emoji.**
- AI „Improve” za opis na ovom koraku **nije viđen** (u javnom pregledu se spominje; možda u „Edit”).
- „Tips for adding a description”: tko si i za što skupljaš; trenutna situacija; zašto ti je važno;
  za što će se sredstva potrošiti; zahvali podržavateljima.

## Akcije

- „Previous step”, **„Preview”** → `/fundraiser/create/fundraiser-preview`, **„Publish fundraiser”**
  (objava je moguća izravno s ovog koraka; **nije kliknuto**).
