# 04 — Tokovi

Sequence po toku. Entiteti su u [03](03-domenski-model.md), stanja u [05](05-zivotni-ciklus.md),
MPT API u [izvatku](research/2026-11-24-campaign-core-zajedno-izvadak.md) §D. Sudionici:

| kratica | tko |
|---|---|
| `K`, `P`, `O`, `M` | korisnik, podržavatelj, organizator (član organizacije), moderator |
| `W` | Astro SSR Worker platforme (stranice, API rute, webhook) |
| `D` | D1 (campaign-core + platformske tablice) |
| `MPT` | `api.mpt.hr/v1` (u prototipu sandbox tenant `sbx-…`, `sk_test_`) |
| `EMI` | Monerium ili Swan (KYC/KYB, SEPA) |
| `S` | Safe kampanje ili organizacije |
| `E` | izlazna e-pošta (u prototipu mock red `notifications`) |

Pravila koja vrijede za sve tokove: doprinos se knjiži samo iz webhooka ili statusa koji je Worker sam
pročitao; iznos nikad ne nosi identitet; osjetljive radnje organizatora traže kod e-poštom (`step_up`).

## 1. Registracija, prijava i verifikacija osobe

4fund: 01, 02, 13, 25. Kod nas nema lozinke: magic link ili kod e-poštom (odluka 15, mock bez slanja).
KYC radi EMI kad organizator otvara račun; mi čuvamo samo stanje.

```mermaid
sequenceDiagram
  actor K as Korisnik
  participant W
  participant D
  participant E
  participant EMI
  K->>W: POST /prijava (e-pošta, privola uvjeta)
  W->>D: users + auth_identities(email_code) ako ne postoji
  W->>D: one_time_codes(login, 6 znamenki, 5 min)
  W->>E: kod ili magic link (mock: prikazan na ekranu)
  K->>W: POST /prijava/kod (kod)
  W->>D: sessions + login_events, email_verified_at
  W-->>K: kolačić sesije
  opt lokalni nacrt postoji (odluka 152)
    K->>W: POST /nacrti (JSON iz localStorage)
    W->>D: campaign_drafts(source local)
  end
  K->>W: POST /postavke/verifikacija (pokreni KYC)
  W->>D: verifications(person_kyc, requested)
  W-->>K: preusmjeri na EMI (prototip: mock ekran)
  EMI-->>W: odluka KYC (prototip: gumb simuliraj)
  W->>D: verifications approved ili rejected + provider_ref
```

## 2. Organizacija, KYB i članovi

4fund: 20, 26 (company application, 5 koraka). Kod nas organizacija s članovima i ulogama (odluka 150).
KYB radi EMI, Safe organizacije postavlja `owner` kroz setup dApp (MPT ADR 0027); platforma nema potpisnika.

```mermaid
sequenceDiagram
  actor O as Vlasnik
  actor C as Novi clan
  participant W
  participant D
  participant EMI
  participant MPT
  participant E
  O->>W: POST /organizacije (naziv, pravni oblik, OIB, web, mreže, opis projekta, broj uplata)
  W->>D: organizers(core) + organizations(pending) + memberships(owner)
  W->>D: organization_applications(step 3, submitted)
  W->>D: verifications(org_kyb, submitted)
  W-->>O: korak 3 od 5, čeka pregled
  EMI-->>W: KYB odobren (prototip: simuliraj)
  W->>D: verifications approved, organizations active, application step 4
  O->>MPT: setup dApp, Safe organizacije (vlasnici članovi, 0 platformskih)
  O->>W: POST /organizacije/:id/safe (adresa)
  W->>D: spremi adresu, provjera praga i isUsableAddress
  O->>W: POST /organizacije/:id/pozivnice (e-pošta, uloga)
  W->>D: membership_invites(pending, token, 7 dana)
  W->>E: pozivnica
  C->>W: GET /pozivnica/:token (prijavljen)
  W->>D: memberships(user, org, uloga), invite accepted
  opt Fixed Beneficiary (korak 5)
    O->>W: POST /organizacije/:id/fixed-beneficiary
    W->>D: is_fixed_beneficiary = 1, application step 5
  end
```

## 3. Objava kampanje

4fund: 03–07 (čarobnjak), 15 (verifikacija namjene). Nacrt lokalno do prijave, zatim na poslužitelju.
Kampanja za organizaciju (Fixed Beneficiary) čeka odobrenje te organizacije.

```mermaid
sequenceDiagram
  actor O as Organizator
  actor A as Admin primatelja
  participant W
  participant D
  participant MPT
  O->>W: čarobnjak 5 koraka (tip, naslov i cilj, mediji, opis, pregled)
  W->>D: campaign_drafts (svaki korak)
  O->>W: POST /nacrti/:id/objavi (u ime organizacije)
  W->>W: provjera uloge (admin ili owner) i obaveznih polja
  W->>D: campaigns(draft) + campaign_settings + campaign_media + campaign_safes
  alt kampanja za organizaciju (patronized)
    W->>D: state = review
    A->>W: POST /organizacije/:id/odobrenja/:kampanja (odobri)
    W->>D: beneficiary_approved_at, nastavak na registraciju
  end
  W->>MPT: registracija kampanje (tenant_campaigns, campaign_id, safe_address)
  MPT-->>W: 201
  W->>D: campaign_safes.verified_at, state = active
  W-->>O: kampanja objavljena, /{public_id}
  opt prag 5.000 EUR ili 12.500 EUR po organizatoru (odluka 18)
    W->>D: verifications(campaign_purpose, requested)
    O->>W: dokumenti (files, campaign_documents)
    W->>D: verifications submitted, pa approved ili rejected
  end
```

## 4. Uplata kroz MPT intent i webhook

4fund: 19 (checkout), 25 (bez prijave). Polja kao 4fund (iznos, poruka do 300, skrij ime, skrij iznos,
e-pošta, obavijesti), plaćanje = MPT intent (QR, IBAN, referenca, `short_ref`).

```mermaid
sequenceDiagram
  actor P as Podrzavatelj
  participant W
  participant D
  participant MPT
  participant EMI
  participant S
  P->>W: POST /{id}/podrzi (iznos, napojnica, poruka, skrivanje, e-pošta)
  W->>W: canAcceptContributions, sid = novi base64url
  W->>D: checkouts(open, contribution_sid, atribucija iz kolačića)
  W->>MPT: POST /v1/intents (sid, target_address = Safe, amount_eur, metadata checkout, kampanja, kasica, link)
  MPT-->>W: memo, iban, epc_qr_data, hub3_data, short_ref, expires_at
  W->>D: contributions(pending, payment_intent_sid) + contribution_profiles + contribution_attributions
  W-->>P: QR, IBAN, referenca, status uživo
  P->>EMI: SEPA Instant uplata s referencom
  EMI->>MPT: nalog primljen
  MPT->>W: webhook payment.received (webhook-id rcv_)
  W->>W: provjera potpisa (Standard Webhooks, whsec_)
  W->>D: webhook_receipts (dedup) + contribution_events
  W-->>P: SSE uplata primljena, potvrđuje se
  MPT->>S: EURe proslijeđen na Safe
  MPT->>W: webhook intent.paid (webhook-id int_, metadata)
  W->>D: webhook_receipts, contributions paid, campaign_stats, payer_iban_hash
  W->>D: checkouts intent_state = paid, notifications
  W-->>P: potvrda i zahvala
```

Ponovljeni webhook s istim `webhook-id` vraća 200 bez upisa. `payment.underpaid`, `payment.late` i
`payment.rejected` slijede tablicu iz [05](05-zivotni-ciklus.md). Pull rezerva: ako webhook ne stigne do
`wrangler dev`, stranica statusa zove `GET /v1/intents/:sid` i Worker upisuje isto kao iz webhooka.

## 5. Napojnica

4fund: 19 (klizač 0–30 %, zadano 20 %). Kod nas zaseban intent na Safe platforme (ITalk), zadano 0 ili
bez zadanog izbora, „0” jednako istaknut (odluka 7). Napojnica nikad ne ulazi u kampanju.

```mermaid
sequenceDiagram
  actor P as Podrzavatelj
  participant W
  participant D
  participant MPT
  P->>W: odabir napojnice (0, 1, 2, 5 EUR ili svoj iznos), 0 jednako istaknut
  alt napojnica 0
    W->>D: checkouts.tip_cents = 0, bez drugog intenta
  else napojnica veća od 0
    W->>MPT: POST /v1/intents (drugi sid, target = Safe platforme, metadata tip_for checkout)
    MPT-->>W: drugi QR i referenca
    W->>D: tips(open, sid, checkout_id)
    W-->>P: dva QR-a, napojnica kao zaseban i neobavezan korak
    MPT->>W: webhook intent.paid (sid napojnice)
    W->>D: tips paid (ne dira contributions ni campaign_stats)
  end
```

## 6. Kasica

4fund: 24 (obrazac), 22 (tab kasica), 08 (moje kasice). Kasicu otvara bilo koji prijavljeni korisnik za
tuđu ili svoju kampanju, bez verifikacije; novac ide na Safe glavne kampanje.

```mermaid
sequenceDiagram
  actor K as Korisnik
  actor P as Podrzavatelj
  participant W
  participant D
  participant MPT
  K->>W: POST /{id}/kasica (naslov 60, alias, cilj, naslovnica, pravila)
  W->>D: moneyboxes(active, alias jedinstven) + consents(moneybox_rules)
  W-->>K: /s/{alias}
  P->>W: GET /s/{alias}
  W-->>P: stranica kasice (napredak kasice i kampanje)
  P->>W: POST /s/{alias}/podrzi
  W->>MPT: POST /v1/intents (target = Safe kampanje, metadata moneybox_id)
  MPT->>W: webhook intent.paid (metadata moneybox_id)
  W->>D: contributions(campaign_id glavne kampanje) + attributions.moneybox_id
  W->>D: notifications vlasniku kasice (ako payment_notifications)
```

## 7. Link za praćenje i dijeljenje

4fund: 16, 08 („Create a tracking link”). `/z/{slug}` i automatski `?ref=` po korisniku. Atribucija 30
dana kroz kolačić, posjet se broji jednom u 10 minuta.

```mermaid
sequenceDiagram
  actor K as Vlasnik linka
  actor P as Posjetitelj
  participant W
  participant D
  participant MPT
  K->>W: POST /{id}/linkovi (slug ili nasumičan, oznaka)
  W->>D: tracking_links(active)
  P->>W: GET /z/{slug}
  W->>D: link_visits (ako nema posjeta u 10 min za isti hash posjetitelja)
  W-->>P: 302 na /{id}, kolačić atribucije 30 dana
  P->>W: POST /{id}/podrzi
  W->>MPT: POST /v1/intents (metadata tracking_link_id)
  MPT->>W: webhook intent.paid
  W->>D: attributions.tracking_link_id
  K->>W: GET /z/{slug}+ (statistika: posjeti, broj i iznos doprinosa)
```

Isto za dijeljenje: `?ref={share_code}` stvara ili čita `share_links(user, campaign)` i postavlja isti
kolačić. Ako postoje oba, vrijedi zadnji klik.

## 8. Prijava sadržaja i moderacija

4fund: 22 (Report abuse: opis 50–500, telefon, privitak 20 MB, GDPR). Kod nas DSA čl. 16 (prijava i
potvrda primitka) i čl. 17 (obrazložena odluka i žalba).

```mermaid
sequenceDiagram
  actor P as Prijavitelj
  actor M as Moderator
  actor O as Organizator
  participant W
  participant D
  participant E
  P->>W: POST /prijava-sadrzaja (cilj, razlog, opis 50 do 500, privitak, privola)
  W->>D: reports(received) + files + consents(report_gdpr)
  W->>E: potvrda primitka prijavitelju
  M->>W: preuzmi prijavu
  W->>D: reports in_review
  M->>W: odluka (radnja, obrazloženje)
  W->>D: moderation_decisions + reports decided
  opt radnja block_campaign
    W->>D: campaign_settings.blocked_at, verifications(campaign_purpose, requested)
  end
  W->>E: odluka prijavitelju i organizatoru, s pravom žalbe 14 dana
  O->>W: POST /odluke/:id/zalba
  W->>D: reports appealed
  M->>W: odluka o žalbi
  W->>D: moderation_decisions(is_appeal) + reports closed
```

## 9. Vanjska kampanja (hibrid, 4fund)

Organizator dodaje svoju kampanju s 4funda (odluka 9). Mi ne uvozimo katalog i ne primamo uplate za nju:
gumb vodi na njihov `/{id}/pay`. Iznos s 4funda čitamo samo ako to uvjeti dopuštaju (provjera u S8).

```mermaid
sequenceDiagram
  actor O as Organizator
  actor P as Podrzavatelj
  participant W
  participant D
  participant F as 4fund
  O->>W: POST /organizacije/:id/vanjske (URL 4fund kampanje)
  W->>W: provjera oblika URL-a (4fund.com/{6 znakova})
  W->>D: external_campaigns(pending, verify_code)
  W-->>O: upiši kod u opis kampanje na 4fundu
  O->>W: potvrdi
  W->>F: GET stranica kampanje (javno)
  F-->>W: HTML s kodom
  W->>D: external_campaigns active, naslov i slika (ručno uređivi)
  P->>W: GET /katalog
  W-->>P: kartica s oznakom vanjska kampanja
  P->>F: klik Podrži na 4fundu (/{id}/pay)
```

## 10. Ponavljanje (podsjetnik)

4fund: 17, recurring samo karticom. Monerium nema SEPA DD, pa ponavljanje je mjesečni podsjetnik s novim
QR-om ili uputa za trajni nalog (odluka 14). Prepoznata ponavljanja jezgra bilježi u `subscriptions` po
`payer_iban_hash`.

```mermaid
sequenceDiagram
  actor P as Podrzavatelj
  participant W
  participant D
  participant MPT
  participant E
  P->>W: POST /{id}/podrzi (učestalost mjesečno, dan u mjesecu)
  W->>D: recurring_pledges(active, iznos, dan) + prvi checkout
  W->>MPT: POST /v1/intents (prvi mjesec, metadata pledge_id)
  MPT->>W: webhook intent.paid (metadata pledge_id, sender_iban)
  W->>D: contributions paid + subscriptions(payer_iban_hash) + pledge.subscription_id
  loop svaki mjesec (Cron Trigger)
    W->>D: pledgeovi kojima je danas dan
    W->>MPT: POST /v1/intents (novi sid, expires_in 86400)
    W->>E: podsjetnik s QR-om i poveznicom
  end
  P->>W: Postavke, Ponavljajuće, otkaži
  W->>D: recurring_pledges cancelled
```

Alternativa trajnog naloga: Worker pokaže trajni QR kampanje (`GET /v1/intents/campaign-qr`) i uputu za
trajni nalog u banci; svaka uplata dolazi kao `contribution.sepa` i jezgra je prepoznaje po IBAN hashu.

## 11. Povrat

4fund: „Return selected” u financijama, 0,50 € (javni pregled §6). Kod nas platforma ne drži novac: povrat
je odlazna transakcija organizatora iz Safea (ili s računa), a platforma ga samo bilježi.

```mermaid
sequenceDiagram
  actor P as Podrzavatelj
  actor O as Organizator
  participant W
  participant D
  participant S
  participant E
  P->>W: zahtjev za povrat (kontakt ili poveznica iz potvrde)
  W->>E: obavijest organizatoru
  O->>W: Financije, odaberi doprinose, Vrati (kod step_up)
  W->>D: one_time_codes(step_up) provjeren
  W-->>O: iznos, IBAN uplatitelja nije poznat, uputa za Safe prijenos ili povrat banci
  O->>S: Safe transakcija (potpisnici organizacije)
  O->>W: POST /financije/povrati (contribution_id, safe_tx_hash ili referenca)
  W->>D: refunds(recorded)
  W->>W: provjera tx na lancu
  W->>D: refunds confirmed, contributions refunded, campaign_stats umanjen
  W->>E: obavijest podržavatelju
```

Napomena: IBAN uplatitelja platforma nema (samo HMAC), pa povrat na IBAN ide kroz EMI organizatora (Monerium
redeem na IBAN koji podržavatelj sam upiše) ili on-chain na adresu. Rješenje za prototip je ručni zapis.

## 12. Trajni QR kampanje (bez checkouta)

Poster, widget i ispis koriste trajni QR (`cmp:` referenca). Nema checkouta ni napojnice.

```mermaid
sequenceDiagram
  actor P as Podrzavatelj
  participant W
  participant D
  participant MPT
  W->>MPT: GET /v1/intents/campaign-qr (target Safe, id kampanje)
  MPT-->>W: epc_qr_data, iban, memo cmp
  W-->>P: QR na posteru ili widgetu
  P->>MPT: SEPA uplata s memo cmp (preko EMI)
  MPT->>W: webhook contribution.sepa (webhook-id cmp_, monerium_order_id)
  W->>D: webhook_receipts + contributions(paid, monerium_order_id) + campaign_stats
```

## Pokrivenost

| tok (handoff S2) | sekcija |
|---|---|
| registracija i verifikacija | 1 |
| organizacija i KYB | 2 |
| objava kampanje | 3 |
| uplata kroz MPT intent i webhook | 4 (+ 12 trajni QR) |
| napojnica | 5 |
| kasica | 6 |
| tracking | 7 |
| prijava i moderacija | 8 |
| vanjska kampanja | 9 |
| recurring podsjetnik | 10 |
| povrat | 11 |
