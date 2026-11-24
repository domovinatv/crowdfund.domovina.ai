# 27 — Isplata na verificiranom računu: dodatna autorizacija

- **URL:** `/user/withdraw/list` → preusmjerenje na `/safety/additional-authorization/{token}` (naslov „Additional authorization”).
- **Grupa:** 5 · račun pravne osobe u stanju „3 / 5” ([26](26-company-application-poslano.md)), zastupnik verificiran.

## Ekran

„Enter code number 1” · „We have sent you a 6-digit verification code to your email (…). Enter the code below.” ·
polje koda · **Verify** · „Any problems with the code?”

- Kod se **šalje automatski već pri otvaranju** „Withdraw funds”, bez klika (korisnik je dobio e-poštu).
- „code number 1” upućuje da može slijediti drugi kod (SMS), u skladu s „Limits and authentications” ([14](14-postavke-limiti.md)).
- Kod nije upisan; obrasci kartice i IBAN-a, potvrda 0,10 €, limiti i povijest isplata zato nisu viđeni.
  Na neverificiranom računu ekran je bio poruka o verifikaciji ([09](09-isplata-popis.md)).

## Za nas

Isplate nemamo (odluka 6). Obrazac „step-up” autentikacije (kod e-poštom prije osjetljive radnje) preuzimamo za
promjenu IBAN-a/Safea i članova organizacije; kod se šalje tek na klik „Pošalji kod”, ne pri samom otvaranju ekrana.
