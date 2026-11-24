## PITANJE ZA KORISNIKA (vrata, iz S1)

Ekrani „Edit” kampanje, izbornik „More” vlastite kampanje (Finances, Notifications, Tracking link, QR,
Widget, Poster, Turn off, Delete), „Statistics” i obrazac „Verify fundraisers” postoje tek uz
**objavljenu** kampanju. Korisnik je nema, a odluka 4 zabranjuje objavu. Uz to i grupe 4–5 i 9 iz §12
(financije, kasica, tracking link vlastite kampanje) traže vlastitu kampanju.

- **a)** Korisnik sam objavi jednu testnu kampanju (izmišljen naslov/opis, cilj 1 €) na svom računu. S1b
  je obiđe samo čitanjem, a na kraju je korisnik sam isključi („Turn off”) ili obriše. Kampanja je javna
  na `/{id}` dok postoji, ali neverificiran profil nije u katalogu.
- **b)** Korisnik izričito dopusti S1b da sam klikne „Publish fundraiser” na testnoj kampanji i na kraju
  „Turn off”. To je iznimka od odluke 4 i treba je zapisati kao novu odluku.
- **c)** Bez objave: ti ekrani ostaju iz javnog pregleda §4 i FAQ-a, a u S1b se obilaze samo tuđe kampanje
  (checkout) i ekrani bez vlastite kampanje.

Preporuka: **a**. Objava je vanjska radnja na korisnikovom računu, pa je radi korisnik, a obilazak ostaje samo čitanje.

## Prijenos iz S1

- S1 gotov: 18 ekrana u `docs/research/obilazak/` (inventar u `README.md` tamo), odluke 100–105.
- Ako je odgovor a ili b, prvo obiđi grupe 2–3 koje su ostale (Edit sa svim opcijama, More, Statistics,
  Verify fundraisers), i to kao datoteke od `19-…` nadalje.
- Zamka: 404 stranica 4funda uvijek pokazuje anonimno zaglavlje; prijavu provjeri izbornikom računa (odluka 100).
- Alat `javascript_tool` vraća `[BLOCKED: Cookie/query string data]` kad izlaz sadrži hrefove s upitom ili
  tokene. Tada koristi `get_page_text`, a hrefove reži na `split(/[?#]/)[0]`.
- **Dio C, anonimni obilazak** (zahtjev korisnika u S1): modal prijave (`#log-in`), reset lozinke,
  potvrda e-pošte i čarobnjak kao neprijavljen korisnik (dokle dopušta prije prijave). Ne odjavljuj
  korisnika bez dogovora; prvo probaj dohvat bez kolačića (odluka 101). Ako to ne ide, pitaj
  korisnika da se odjavi i ponovno prijavi Googleom (sam, lozinku ne upisuješ).

Gradimo UI prototip hrvatske P2P crowdfunding platforme s funkcionalnom strukturom 4fund.com (EU Zrzutka.pl), ali s plaćanjem kroz MPT (SEPA → Monerium/Swan → račun ili Safe kampanje), bez provizije i bez držanja novca.

Repo: /Users/ms/git/domovinatv/crowdfund.domovina.ai (main, lokalan bez remotea, wrap-up samo commita).

Pročitaj prvo: docs/handoffs/README.md (lanac i pravila), docs/plan.md, docs/decisions.md, TODO.md (F0), docs/research/obilazak/README.md, §12 u docs/research/2026-11-24-4fund-javni-pregled.md.

# S1b: prijavljeni obilazak 4fund.com, dio B

Polazni commit: COMMIT. Odluke od **150**. Ista pravila obilaska kao S1 (odluka 4),
korisnik mora biti prijavljen.

Paket (grupe iz §12):

1. **Grupa 10, checkout:** `/{id}/pay` na jednoj tuđoj javnoj kampanji do zadnjeg koraka
   prije plaćanja: sve metode („Hide other payment methods”), napojnica (klizač, zadano,
   kako se postavlja na 0), „Donate as a company” polja, poruka, skrivanje imena/iznosa.
   Ekran PayU/ZEN samo pogled, bez potvrde. „Donated by me” i oblik potvrde ako korisnik
   ima stare donacije.
2. **Grupa 4–5, financije i isplata:** popis uplata, stupci izvoza (ne preuzimaj osobne
   podatke), „Return selected” obrazac; „Withdraw funds” obrasci (kartica, IBAN), limiti,
   potvrda kodom — bez slanja.
3. **Grupa 7–9:** Promote, delegirane zahvale, ponude/aukcije, Founder's Offer, razine
   podrške, kasica, tracking link i stranica `+`, Observe, komentari, Report obrasci.
4. **Grupa 11–12:** company application (dokumenti za HR udrugu ili d.o.o.), Fixed
   Beneficiary pogled, kontakt obrazac i kategorije.
5. Potvrdi stupac „Prototip” u `docs/02-4fund-na-mpt.md` za svaki red i dodaj nove redove.

Gotovo kad: sve grupe 1–12 imaju datoteke ili zapisan razlog zašto nisu dostupne; `02`
nema red bez stupca „Prototip”. Zatim `/wrap-up` sa sadržajem `S2.md`.
