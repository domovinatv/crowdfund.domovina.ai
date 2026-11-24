# 02 — Verifikacija računa („Account verification”)

- **URL-ovi:** `/settings/verification` → preusmjerava na `/settings/verification/type`;
  koraci `/settings/verification/create-password`, `/settings/verification/type`,
  `/settings/verification/data`; organizacija → `/company-application/steps`.
- **Grupa:** 1 · prijavljen korisnik (Google račun, neverificiran). Obrazac **nije spremljen**.
  Klik „Next step” s praznim obaveznim poljima je pokrenuo samo HTML5 validaciju.

## Koraci (lijevi stepper)

1. **Create password:** „postavi lozinku da se možeš verificirati i primati uplate”. Bez lozinke
   nema verifikacije, primanja uplata ni isplate. Ako lozinka postoji: „You have already set your
   account password… click here” (vodi na promjenu lozinke).
2. **Account type:** uvodni tekst kaže da je 4fund licencirani pružatelj platnih usluga u EU i
   mora identificirati korisnike. „Provide the actual data. After saving the form, we will ask you
   to verify the data provided.” Dvije opcije: **Account for natural person** (gumb, ide na
   korak 3) i **Account for company / organisation** (link na `/company-application/steps`).
   U stepperu je i stavka „Apply for a fixed beneficiary account”.
3. **Your data** (fizička osoba): obrazac ispod.
4. Nakon spremanja: provjera podataka (Onfido, javni pregled §2). **Nije pokrenuto**, a ekran se
   ne vidi bez spremanja obrasca.

## Polja koraka „Your data” (`form[...]`)

Uvod: „The profile manager is a natural person who creates and maintains an account”, i link
„Why we need your data and what about safety?”.

| polje | tip | obavezno | ograničenja | poruka greške |
|---|---|---|---|---|
| `firstName` First name | text | da | maxlength 100; popunjeno iz Google profila | HTML5 „Please fill out this field.” |
| `lastName` Last name | text | da | maxlength 100; popunjeno iz Google profila | isto |
| `citizenship` Nationality (country) | select | da | 194 države | „Please select an item in the list.” |
| `country` Country of birth | select | da | 194 države | isto |
| `birthDate` Date of birth | date | da | – | „Please fill out this field.” |
| `haveNationalIdentificationNumber` „I have a PESEL number” | checkbox | ne | zadano isključeno; uključivanjem se pokazuje `nationalIdentificationNumber` | – |
| `nationalIdentificationNumber` PESEL | text | uvjetno | maxlength 11 (poljski OIB) | – |
| `notHaveNationalIdentificationNumber` | checkbox (skriven) | – | zadano uključen, par prethodnom | – |
| `residenceCountry` „Residence country (you must be a resident of one of the EEA countries)” | select | da | 30 država EGP-a (EU + IS, LI, NO) | – |
| `identityDocumentType` Type of identity document | select | da (zadano „ID Card”) | ID Card / Passport / Passport Card (Ireland) / Residence Card / Polish temporary ID | – |
| `identityCardNumber` Series and number | text | da | – | – |
| `identityCardExpirationDate` Expiry date | date | da | – | – |
| `identityCardExpirationDateUnlimited` „Document without expiry date” | checkbox | ne | skriven dok se ne pokaže za odgovarajući dokument | – |
| `street` | text | da | maxlength 100 | – |
| `houseNumber` | text | da | maxlength 10 | – |
| `apartmentNumber` | text | ne | maxlength 10 | – |
| `postalCode` | text | da | maxlength 20 | – |
| `city` | text | da | maxlength 100 | – |
| `isPoliticallyExposedPerson` „PEP statement” | radio | da | „I am not a PEP” / „I am a PEP” | – |

Validacija je samo HTML5 (`required`, `maxlength`). Vlastitih poruka na klijentu nema.

## PEP izjava (modal)

- Naslov „PEP statement”, objašnjenje „PEP means a Politically Exposed Person as well as their family
  members or close associates”, „Read more / Show less” s punim popisom funkcija po poljskom
  zakonu o SPNFT (a–… šefovi država, ministri, zastupnici, članovi upravljanja strankama, suci
  vrhovnih sudova, … i bliski suradnici).
- „I declare that: I am not a PEP / I am a PEP”. Kod „I am a PEP” traži se potvrda, uz tekst „pročitaj i
  potvrdi izbor ili označi ‚I am not PEP' ako ništa od navedenog ne vrijedi”, i izbor jedne od tri
  opcije (`pepOption`): sam sam PEP / član obitelji PEP-a / bliski suradnik PEP-a. Zatim checkbox
  „svjestan sam kaznene odgovornosti za lažnu izjavu” i gumb „Confirm”.
- Za račun organizacije postoji ista izjava „(applies to the company owner)”.

## Ponašanje prije verifikacije (viđeno na drugim ekranima)

- Postavke: „About me” i „Website” zaključani („verify your account to edit this field”);
  telefon se ne može dodati; profil nije vidljiv tražilicama.
- Isplata: „To withdraw funds… you have to complete verification process”.
- Verifikacija kampanja: „Please send the documents after complete verification of your account.”
- Pregled kampanje u čarobnjaku: oznaka „Profile unverified” ispod imena.
- Objava kampanje **nije** blokirana: gumb „Publish fundraiser” je aktivan i neverificiranom korisniku.

## Za nas

KYC radi EMI (odluka 6, red u `02`). Mi držimo samo status i referencu. Prototip: obrazac s istim
grupama polja (identitet, dokument, adresa, PEP s tri podvrste i izjavom o kaznenoj odgovornosti),
pri čemu se OIB pokazuje umjesto PESEL-a, a rezidentnost u EGP-u ostaje uvjet.
