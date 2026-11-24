# 26 — Company application: obrazac tvrtke i stanje nakon slanja

- **URL:** `/sign-up/user-data?company-application-chosen=1` → `/company-application/form` → `/company-application/steps`.
- **Grupa:** 11. Račun pravne osobe (ITalk d.o.o.) otvorio je i verificirao korisnik sam (e-pošta tvrtke,
  podaci zastupnika); obrazac tvrtke je popunila sesija, a **poslao ga je korisnik** (odluka 151).
  Osobni podaci zastupnika nisu zapisani (odluka 4).

## Ulaz

- Registracija s porukom „If you wish to create an account for a company/organisation please click here” vodi na
  korake (0/5); „Sign up” u koraku 1 otvara istu registraciju s `?company-application-chosen=1`, gdje je labela
  e-pošte „Your company/organisation e-mail” i nema poruke o tvrtki.
- Verifikacija zastupnika (korak 2) je ista kao verifikacija osobe ([02](02-verifikacija-racuna.md)); sažetak je na
  `/settings/verification/summary` s izbornikom: Create password · Account type · Your data · Your saved data ·
  **Upload documents** · **Apply for company account**, i linkom „If you want to apply for company account - click here”.

## Obrazac tvrtke (`company_application[…]`)

| polje | tip | obavezno | napomena |
|---|---|---|---|
| Company/organisation name `companyName` | text | da | – |
| Company/organisation website `companyWebsite` | text | da | – |
| Company/organisation legal form `companyLegalForm` | text (slobodan unos) | da | – |
| Company/organisation description `companyDescription` | textarea | da | bez brojača i limita na klijentu |
| Description of the project … on 4fund `projectDescription` | textarea | da | isto |
| Estimated monthly number of payments `paymentsNumber` | select | – | **1-10 · 11-100 · 101-1000 · >1000** |
| Country `country` | select | – | EU/EEA države (Austria … ), zadano iz računa |
| Contact e-mail `contactEmail` | text | da | **zaključano**, iz računa |
| Social media link `socialMediaLinks[n]` | text | da (prvi) | „Add another social media link”, brisanje ikonom |
| Accept terms and privacy policy | checkbox | da | – |
| Receive latest news … | checkbox | – | marketinški pristanak |

Gumb: **„Send message”**. Nema polja za OIB, adresu sjedišta, zastupnika ni dokumente: to 4fund traži ručno
u koraku 4 (javni pregled §2.4: „ručno ~2 dana”).

## Nakon slanja

Na vrhu: „**Your request has been sent. Please wait for information about the next steps.**”
Brojač **3 / 5 steps completed**: 1 Sign Up, 2 Verification, 3 Company form = „Completed”.
Korak 4 „Completing of the process” nema gumba, samo „In case of questions - contact us” (`/contact`).
Korak 5 „Become a Fixed Beneficiary*” nema gumba, samo „Read more” (blog). **Korisnik sada nema nijednu
radnju**: čeka e-poštu 4funda.

## Za nas

Tok je isti, ali umjesto ručnog e-mail dopisivanja: obrazac s OIB-om i sudskim registrom (provjera kroz
javni sudski registar), KYB kod EMI-ja, i **stanje zahtjeva vidljivo u sučelju** (zaprimljeno, u pregledu,
traži dopunu, odobreno, odbijeno, s razlogom). Organizacija ima članove s ulogama (odluka 150).
