Gradimo UI prototip hrvatske P2P crowdfunding platforme s funkcionalnom strukturom 4fund.com (EU Zrzutka.pl), ali s plaćanjem kroz MPT (SEPA → Monerium/Swan → račun ili Safe kampanje), bez provizije i bez držanja novca.

Repo: /Users/ms/git/domovinatv/crowdfund.domovina.ai (main, lokalan bez remotea, wrap-up samo commita).

Pročitaj prvo: docs/handoffs/README.md (lanac i pravila), docs/plan.md, docs/decisions.md, TODO.md (F0), docs/research/obilazak/README.md, §12 u docs/research/2026-11-24-4fund-javni-pregled.md.

# S1b: prijavljeni obilazak 4fund.com, dio B

Polazni commit: (upisuje S1). Odluke od **150**. Ista pravila obilaska kao S1 (odluka 4),
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
