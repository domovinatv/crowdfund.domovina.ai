# 11 — Otvorena pitanja: pravnik i produkcija

Sažetak nakon S9 (25. 11. 2026.). Prototip radi nad MPT **sandboxom** (`sbx-73b4d4042e`, odluka 700), s mock
prijavom, mock KYC/KYB-om i mock e-poštom. Ovdje je sve što treba odgovoriti ili napraviti prije prvog pravog eura.
Pitanja za pravnika su ona iz [pravnog okvira §7](research/2026-11-24-pravni-i-poslovni-okvir.md), sažeta i
dopunjena onim što je prototip pokazao. Svako pitanje ima mjesto u kodu ili odluku na koju utječe.

## A. Za pravnika

Prioritet: **1–4 blokiraju fazu 1**, 5–9 blokiraju pojedine funkcije, 10–14 su dorade.

| # | Pitanje | Zašto je otvoreno | Utječe na |
|---|---|---|---|
| 1 | **AMLR:** je li platforma (ili ITalk/MPT) „crowdfunding intermediary” i od kojeg datuma (10. 7. 2027.?); smijemo li se osloniti na KYC/KYB EMI-ja? | §4.4 pravnog okvira; prototip ne traži dokumente, samo status i referencu kod EMI-ja | `postavke/verifikacija`, `organizacija/nova`, odluka 8 |
| 2 | **ZHP:** je li platforma organizator ili posrednik humanitarne akcije; mora li provjeravati rješenje (KLASA/URBROJ) i odgovara li za akciju bez rješenja (čl. 63)? | prototip nema polje za rješenje ni posebnu vrstu „humanitarna akcija” u čarobnjaku; spominje ga samo u sadržaju (`kako-radi`, FAQ) | čarobnjak `nova-kampanja/vrsta`, moderacija `/admin` |
| 3 | **ZHP čl. 24:** je li EMI račun (Monerium EE IBAN, Swan FR IBAN) ili Safe „zaseban račun” humanitarne akcije, ili mora biti banka u RH? | cijeli model uplate ide na Safe/EMI račun organizatora | odluke 6, 203 |
| 4 | **Monerium ToS §16:** je li „kampanja udruge = zaseban Safe pod istim Monerium profilom” i dalje primanje u vlastito ime? | jedan tenant platforme, Safe po kampanji (odluka 203) | `pay.domovina.ai/docs/2026-10-11-funding-po-projektu.md` |
| 5 | **Napojnica ITalku:** naknada za uslugu (račun, PDV, fiskalizacija) ili dar d.o.o.-u? Je li jednako istaknuta „0” bez predodabira dovoljna prema UCPD/UOKiK slučaju? | napojnica je zaseban intent (odluke 7, 708) | `{id}/podrzi/{checkout}/napojnica` |
| 6 | **Porez na darove (4 %)** za fizičke osobe kao organizatore (K5): zbroj malih uplata, prag, rok, trenutak primitka (mint EURe ili konverzija)? | FO organizatori su u prototipu „nije u fazi 1” (odluka 8, 846) | osobna kampanja, `kako-radi/za-druge` |
| 7 | **Swan za FO:** smije li fizička osoba rezident RH biti account holder i čini li to ITalk zastupnikom/distributerom (PSD2/EMD2 registar agenata)? | jedini put do FO organizatora i do bankovnog računa kao odredišta (odluka 203) | faza 2 |
| 8 | **DAC7 i fiskalizacija** za ponude, aukcije, razine s cijenom i promociju: je li platforma bez provizije „platform operator”? | faza-2 UI postoji, kupnja/licitiranje/plaćanje onemogućeni (odluke 844, 845, 849) | `ponude/*`, `upravljanje/razine`, `upravljanje/promocija` |
| 9 | **Hibrid s 4fundom:** smijemo li prikazati iznos 4fund kampanje koju je organizator sam dodao, i treba li za to njihov API token? | sad bez iznosa, samo gumb na `/pay` (odluke 800, 801) | `src/lib/vanjske.ts` |
| 10 | **ZPD čl. 8 „javno oglašena akcija”:** smije li javni račun osobe u potrebi biti EMI IBAN ili Safe adresa? | — | kampanje za druge (faza 2) |
| 11 | **PSD3/PSR:** obveze za tehničke pružatelje (MPT) u konačnom tekstu | PSD2 3(j) je temelj položaja (odluka 6) | MPT, ne ovaj repo |
| 12 | **DSA čl. 16–17:** zadovoljavaju li obrazac prijave, obrazložena odluka moderatora i obavijest prijavitelju obveze hosting pružatelja? | tok postoji: `/hr/prijavi-sadrzaj` → `/admin/prijave/{id}` | moderacija |
| 13 | **GDPR:** rok čuvanja `consents`, `login_history`, `notifications` (mock e-pošta s tokenom), podataka uplatitelja iz MPT payer tagova; pravna osnova za praćenje (kolačić 30 dana za link praćenja) | privola u checkoutu (odluka 824), atribucija (02) | `privatnost`, `uvjeti`, kolačić `/z/{slug}` |
| 14 | **Uvjeti i pravila prikaza:** tekstovi `/hr/uvjeti`, `/hr/privatnost`, `/hr/pravila-prikaza` su nacrti prototipa | nisu pravno pregledani | statične stranice |

## B. Za produkciju (tehnički i poslovni koraci)

| # | Korak | Stanje u prototipu | Tko odlučuje |
|---|---|---|---|
| 1 | **Ime, brend, domena** (vrh handoffa od S3; preporuka „Doprinos”) | radno ime i DOMOVINA paleta, 6 brend tokena (odluka 404) | korisnik (kupnja domene) |
| 2 | **Produkcijski MPT tenant** platforme: ključevi `sk_live_`, `webhook_url` na produkcijski Worker, `whsec_` u Worker secretu, `MPT_TIP_TARGET` = ITalkov Safe/račun | sandbox tenant istječe 23. 2. 2027. (odluka 700); webhook potvrđen samo unit testovima i pullom | korisnik + MPT |
| 3 | **Registracija kampanje kod MPT-a** i trajni QR (`campaign-qr`), pravi IBAN/EPC/HUB3 na stranici plaćanja | mock (odluke 704, 710); sandbox ne vraća IBAN ni QR | MPT |
| 4 | **KYB organizacija kroz Monerium** (korporativni profil, Safe po kampanji) umjesto mock statusa | mock `verifications(org_kyb)` (odluka 639) | korisnik + Monerium |
| 5 | **KYC osoba** (ovlaštena osoba organizacije) kroz EMI; mi čuvamo samo referencu | mock obrazac `postavke/verifikacija` | korisnik + EMI |
| 6 | **Swan** za FO organizatore i bankovni račun kao odredište | nije u fazi 1 (odluke 8, 203) | pravnik (A7) + Swan |
| 7 | **Prava prijava:** magic link e-poštom (kasnije Certilia), CSRF provjera `Origin` na `POST` prijave, osvježavanje `sessions.last_activity_at` | mock prijava (odluka 15); CSRF i aktivnost otvoreni (TODO F2) | implementacija |
| 8 | **Slanje e-pošte** (podsjetnici, obavijesti, potvrde, kodovi) | red u `notifications`, ništa se ne šalje (odluka 821) | implementacija + domena |
| 9 | **Cron Trigger** za mjesečne podsjetnike (`dospjeliPodsjetnici`) | funkcija postoji, okidač nije konfiguriran (odluka 827) | implementacija |
| 10 | **Status uplate uživo:** pravi SSE (CORS na MPT `/stream` ili proxy kroz Worker) | pull svake 3 s (odluka 728) | MPT ili implementacija |
| 11 | **Produkcijski D1** (`database_id`), migracije 0001–0009, bez demo seeda; `campaign-core` prijedlozi (odluka 213) | lokalni D1 `crowdfund-dev` s nul-ID-om u `wrangler.jsonc` | vlasnik jezgre + implementacija |
| 12 | **GitHub remote i javnost repoa** | repo lokalan (odluka 17) | korisnik |
| 13 | **4fund API token** za iznose vanjskih kampanja | zahtjev 4fundu nije poslan (odluka 800) | korisnik |
| 14 | **Preview deploy** na `*.workers.dev` | pripremljen, čeka odobrenje (vrata S9) | korisnik |

## C. Preview deploy na `*.workers.dev` (pripremljeno, čeka korisnika)

Ništa od ovoga nije pokrenuto (vrata S9). `wrangler whoami` (25. 11. 2026.) je prijavljen OAuth-om i vidi više
Cloudflare računa; ostali domovinatv repoi koriste račun **D.O.M.** (`account_id` `7dc7167b…`), pa je to
pretpostavljeni račun. Koraci nakon odobrenja:

```bash
export CLOUDFLARE_ACCOUNT_ID=7dc7167b7e2e00923bfa7cd697df14e4      # račun D.O.M.
npx wrangler d1 create crowdfund-preview                           # upiši database_id u wrangler.jsonc (env preview)
npx wrangler d1 migrations apply crowdfund-preview --remote
npx wrangler d1 execute crowdfund-preview --remote --file seed/demo.sql
for k in MPT_API_URL MPT_TENANT_ID MPT_SECRET_KEY MPT_PUBLIC_KEY MPT_WEBHOOK_SECRET MPT_DEMO_TARGET; do
  npx wrangler secret put "$k"                                     # vrijednosti iz .dev.vars (sandbox)
done
npx astro build && npx wrangler deploy                             # → https://crowdfund-domovina-ai.<subdomena>.workers.dev
```

Rizici koje korisnik treba prihvatiti ili zatvoriti prije javnog URL-a:

1. **Mock prijava je javna:** svatko s URL-om može se prijaviti kao demo organizator ili moderator. Prijedlog:
   Cloudflare Access (e-pošta korisnika) ispred cijelog Workera ili barem `/admin` i `/hr/prijava`.
2. **Sandbox ključevi** idu u Worker secrete; sandbox ne prenosi pravi novac, ali preview može stvarati intente na
   tenantu `sbx-73b4d4042e` (istječe 23. 2. 2027.).
3. **Webhook:** s javnim URL-om sandbox tenant smije dobiti `webhook_url` = `https://…workers.dev/webhooks/mpt`, pa
   bi se webhook prvi put provjerio izvana (TODO F3, tunel više ne treba).
4. **Brend:** preview pokazuje radno ime `crowdfund.domovina.ai` i stranice koje opisuju 4fund kao uzor; ništa ne
   oponaša 4fund (odluka 3), ali URL je javan dok se ne ugasi (`npx wrangler delete`).
