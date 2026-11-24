# 24 — Kasica: obrazac „Add donation box”

- **URL:** `/{id}/add-moneybox` (link „Create donation box” na stranici tuđe kampanje). **Grupa:** 9.
- Naslov „Add donation box”, „Collect money that will go directly to the fundraiser you support.”; kartica
  kampanje koju kasica podržava (naslov, iznos od cilja, postotak). „Back to fundraiser”.
- Obrazac nije poslan; statistika kasice nije viđena (korisnik nema kasicu, „Donation boxes 0” u [08](08-moje-kampanje.md)).

## Polja

| polje | tip | obavezno | ograničenja | napomena |
|---|---|---|---|---|
| Donation box title `chip_box[title]` | text | da | **60**, brojač | sekcija „General information” |
| Link to donation box `chip_box[alias]` | text s prefiksom `4fund.com/s/` | da | **unaprijed popunjen** predloženim aliasom | – |
| Total amount (Optional) `chip_box[amountToCollect]` | number, EUR | ne | – | cilj kasice |
| Add a donation box cover (Optional) `chip_box[cover]` | file | ne | – | – |
| Donation box description `chip_box[content]` | textarea | – | **unaprijed popunjen** predloškom („Please make a donation to my donation box…”) | – |
| I accept the donation box terms and conditions `chip_box[acceptRules]` | checkbox | **da** | – | – |
| E-mail notifications about new donations via donation box `chip_box[paymentNotifications]` | checkbox | – | **zadano uključeno** | „Additional settings” |
| Add a personalized thank-you message `chip_box[enablePaymentSuccessMessage]` | checkbox | – | zadano isključeno | otkriva `chip_box[paymentSuccessMessage]` |

Gumbi „Cancel” / „Create donation box” (nije kliknut). Verifikacija za kasicu se ne traži (javni pregled §3).

## Za nas

Isti obrazac: naslov ≤ 60, slug `/k/{alias}` predložen, cilj neobavezan, opis s predloškom, prihvat
pravila, obavijesti zadano uključene, zahvala neobavezna. U MPT-u je kasica `metadata.moneybox` na
intentu prema istom primatelju (02, red „Kasica”).
