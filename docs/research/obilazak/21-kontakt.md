# 21 — Kontakt obrazac

- **URL:** `/contact` · **Grupa:** 12 · naslov „Contact”.
- Lijevo podaci tvrtke (Zrzutka.pl Sp. z o.o., adresa, NIP, REGON, KRS) i upozorenje: za pitanja o verifikaciji
  profila ili kampanji pisati **s adrese e-pošte vezane uz profil**, inače iz sigurnosnih razloga nema detalja.

## Polja

| polje | tip | obavezno | ograničenja | napomena |
|---|---|---|---|---|
| Name `default[name]` | text | da | – | prijavljenom popunjeno |
| E-mail `default[email]` | email | da | – | prijavljenom popunjeno |
| Topic `default[topic]` | select | da | **10:** Account verification · Fundraiser verification · Email address change · Bank account change · Account or withdrawal blockage · Reporting abuse · Auctions, offers · Fundraiser promotion · Report suggestion · Other | zadano „Choose” |
| Message `default[content]` | textarea | da | maxlength nije zadan | – |
| reCAPTCHA | `g-recaptcha-response` | – | – | – |

Privitaka nema. Obrazac nije poslan.

## Za nas

Isti obrazac, teme prilagođene: verifikacija organizacije, verifikacija kampanje, promjena e-pošte, promjena
IBAN-a/Safea, prijava zlouporabe (DSA, uz poseban obrazac prijave), prijedlog, ostalo. Bez „withdrawal
blockage” (nema isplate). Captcha: Turnstile.
