# 10 — Postavke: Edit details

- **URL:** `/settings/edit` · **Grupa:** 6.

## Bočni izbornik postavki (cijeli)

| stavka | URL |
|---|---|
| Edit details | `/settings/edit` |
| Phone number | `/settings/phone-number` |
| Profile settings | `/settings/profile` |
| Change password | `/settings/change-password` |
| Limits and authentications | `/settings/limits` |
| Verify account | `/settings/verification` |
| Verify fundraisers | `/settings/whip-rounds-verification` |
| Tracking links | `/settings/reflinks` |
| Shared links to fundraisers | `/settings/auto-reflinks` |
| Recurring donations | `/settings/recurring-payments` |
| Login history | `/settings/login-history` |

„Invoices” i „Become a Fixed Beneficiary” iz javnog pregleda **nisu** u izborniku (`/settings/invoices` = 404).
Fixed Beneficiary je stavka u stepperu verifikacije ([02](02-verifikacija-racuna.md)); „Delete account” je
na [12](12-postavke-profil.md).

## Polja

| polje | tip | obavezno | ograničenja | poruka greške |
|---|---|---|---|---|
| Photo | file | ne | – | – |
| Name | text | – | maxlength 255 | – |
| Surname | text | – | maxlength 255 | – |
| About me | textarea | ne | maxlength 3500; **zaključano do verifikacije** | – |
| E-mail | text | – | samo prikaz; „(how to change e-mail address?)” | – |
| Website | text | ne | maxlength 255; zaključano do verifikacije | – |
