# 14 — Postavke: Limits and authentications

- **URL:** `/settings/limits` · **Grupa:** 6. Ništa nije mijenjano.

## Authentication method

„Additional authentication is required to approve certain activities and involves sending a 6-digit code to your
phone number or email address.” Izbor: **SMS message** (traži „Add phone number”) | **Email message**.
Polje `additionalAuthorizationMethod` (obavezno).

## Limits and SMS notifications

| polje | tip | obavezno | ograničenja |
|---|---|---|---|
| Daily payout limit (`dailyWithdrawalLimit`) | select | – | No limit / 100 / 500 / 1000 / 5000 / 10000 € dnevno |
| (tekst) | – | – | „Single payout limit is €20,000” |
| SMS notifications for high payouts (`isDailyWithdrawalNotification`) | checkbox | – | traži telefon |
| Choose the amount (`dailyWithdrawalNotificationAbove`) | select | – | Above 100 / 500 / 1000 / 5000 / 10000 € dnevno |

## Za nas

Nema isplate, pa ni limita isplate (odluka 6). Šestoznamenkasti kod e-poštom/SMS-om je obrazac za
osjetljive radnje organizatora (promjena IBAN-a/Safea, brisanje kampanje).
