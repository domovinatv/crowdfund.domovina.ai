# 01 — Registracija

- **URL:** `/sign-up/user-data` (i `/sign-up`, isti obrazac bez linka „Sign in”). `/en/...` prefiks vraća 404.
- **Grupa:** 1 · **Izvor:** HTML dohvaćen bez kolačića (`fetch(..., {credentials:'omit'})`), 24. 11. 2026. Ništa nije poslano.
- **Svrha:** otvaranje računa fizičke osobe; račun organizacije ide drugim tokom.

## Polja (`form name="user_data"`, POST na isti URL)

| polje | tip | obavezno | ograničenja | poruka greške |
|---|---|---|---|---|
| `user_data[email]` „Your email” | email | da | HTML5 email; podnaslov: adresa služi za komunikaciju, upravljanje profilom i **isplatu**, „trajan pristup” | nije viđena (bez slanja) |
| `user_data[password]` „Set password” | password | da | uživo popis pravila: ≥ 8 znakova, ≥ 1 veliko slovo, ≥ 1 znamenka ili poseban znak, ≥ 1 malo slovo | pravila se označavaju dok se tipka |
| `user_data[acceptTermsAndPrivacyPolicy]` | checkbox | da | linkovi `/terms`, `/privacy` | – |
| `user_data[subscribeNewsletter]` | checkbox | ne | marketinška privola, odvojena od uvjeta | – |
| `user_data[captcha]` | hidden | – | nevidljiva captcha | – |

## Akcije i prijelazi

- „Continue with Facebook” → `/third-party-account/connect/facebook/{lang}`; „Continue with Google” → `/third-party-account/connect/google/{lang}` (OAuth; korisnikov račun je otvoren tako).
- „If you wish to create an account for a company/organisation please click here” → `/company-application/steps` (grupa 11, S1b).
- „Sign in” → `#log-in`: prijava je **modal**, ne ruta (`/sign-in`, `/login` = 404). Modal se renderira na klijentu, pa ga dohvat bez kolačića ne vidi. Zabilježit će se u anonimnom obilasku (S1c).
- „Create account” šalje obrazac → potvrda e-pošte (javni pregled §2).

## Stanja

- Račun prijavljen preko Googlea **nema lozinku**. Verifikacija zato počinje korakom „Create password” ([02](02-verifikacija-racuna.md)).

## Za nas

Magic link i passkey umjesto lozinke (odluka 15: u prototipu mock). Odvojena privola za newsletter je
obavezna i kod nas. Ulaz „račun organizacije” s prvog ekrana prenosimo.
