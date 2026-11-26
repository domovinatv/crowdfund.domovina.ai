# Ime platforme, 6. iteracija: „srce”, „Dei” i uži izbor (26. 11. 2026.)

Nastavak runda 2–5:

- [iteracija 2](2026-11-25-ime-platforme-iteracija-2.md): Moba, Priskočimo, Pripomoć…
- [iteracija 3](2026-11-25-ime-platforme-iteracija-3-milodari.md): narodni nazivi za posudu milodara, npr. Škrabica i Lemozina
- [iteracija 4](2026-11-25-ime-platforme-iteracija-4-fora.md): imena „na foru” poput 4fund i GoFundMe, npr. Fundaj i Cvenkni
- [iteracija 5](2026-11-26-ime-platforme-iteracija-5-poslovica-evandjelje.md): „zrno po zrno” i evanđelje, npr. Zrnopozrno i Veselidar

Vlasnik nije odabrao ime. U užem je izboru **Odsrca**, a ime je i dalje otvoreno (odluka 1004).

## Kriterij koji je vlasnik dodao: URL kao rečenica

Adresa kampanje treba se čitati kao rečenica, npr. `odsrca.hr/za-maju-operacija`. Takav URL čini **put**, a ne poddomena:

| Oblik | Primjer | Čitanje | Tehnika |
|---|---|---|---|
| put (odabrano) | `odsrca.hr/za-maju` | „od srca za Maju” | jedan certifikat; 4fund radi isto (`4fund.com/<slug>`) |
| poddomena | `za-maju.odsrca.hr` | obrnut red | wildcard `*.odsrca.hr` na besplatnom CF-u radi, ali svaka kampanja dobiva svoj host: phishing, kolačići, Public Suffix List, SEO |
| dvije razine | `za.maju.odsrca.hr` | obrnut red | certifikat po kampanji (CF for SaaS / ACM); ne isplati se |

Slug ide u akuzativu („za Maju”). Organizator ga upisuje, a mi mu predlažemo oblik iz naslova.

## „Srce”

Provjereno 26. 11. 2026.:

- `.hr`: `whois -h whois.dns.hr`. Odgovor „No entries found” znači slobodna. To je provjereno usporedbom s `index.hr`. CARNET blokira nakon otprilike 10 upita i tada vraća timeout ili prazan odgovor.
- `.eu`: `whois.eu`, gdje „AVAILABLE” znači slobodna.
- `.com`: odgovor „No match” znači slobodna.

| Ime | .hr | .eu | .com | Napomena |
|---|---|---|---|---|
| **Odsrca** | ✅ (whois) | ✅ | ✅ | URL „od srca za Maju”; vjerski neutralno, a vjernik prepozna 2 Kor 9,7 („kako je srcem odlučio”) |
| Srceza | ✅ | ✅ | ✅ | `srceza.hr/maju`; kao riječ slabije čitljivo |
| Srcence | ✅ | ✅ | ✅ | umanjenica |
| Srcko / Srcka | ✅ | ✅ | ❌ | |
| Srca | ✅ | ❌ | ❌ | |
| Svesrcem, Izsrca, Srcedar, Dobrosrce, Velikosrce, Jednosrce | ? (blokada, nema NS) | ✅ | ✅ | `.hr` ponoviti |
| Srce | ❌ | ❌ | ❌ | |

Postojeće upotrebe fraze: volonterska grupa „Od srca do srca” i udruga „Daj 5 od srca” iz Vodica. Nijedna nije platforma i nijedna nema domenu `odsrca`. Fraza je česta, pa je žig na samu riječ slab, a logo se može zaštititi. Žig u DZIV-u i EUIPO-u **nije provjeren**.

`odsr.ca` je slobodna, ali je CIRA daje samo uz kanadsku prisutnost (građanin, rezident, tvrtka ili kanadski žig). ITalk to ne ispunjava, a ljudi `.ca` čitaju kao Kanadu. Odbačeno.

## „Dei” (latinski)

| Ime | Značenje | .hr | .eu | .com |
|---|---|---|---|---|
| Excorde | „od srca” na latinskom | vj. ✅ | ❌ | ❌ |
| Cordedei | „srcem Božjim” | vj. ✅ | ✅ | ✅ |
| Donodei | „Božjim darom” | vj. ✅ | ✅ | ✅ |
| Hilaremdatorem | 2 Kor 9,7 u Vulgati: *hilarem enim datorem diligit Deus* | vj. ✅ | ✅ | ✅ |
| Cordei, Deodar | kovanice | vj. ✅ | ✅ | ❌ |
| Dei, Deo, Donumdei, Deogratias, Hilarem | | | ❌ | ❌ |

Ovaj smjer nije dobar za ime platforme:

- vjerska jačina je 5 od 5;
- većina korisnika ne razumije latinski, pa se gubi URL koji se čita kao rečenica;
- imena podsjećaju na Opus Dei i Agnus Dei.

Latinski stih bolje radi kao potpis, npr. u podnožju ili na stranici „O nama”.

## Uži izbor nakon šest rundi

| Ime | Runda | .hr / .eu / .com | Zašto |
|---|---|---|---|
| **Odsrca** (preporuka) | 6 | ✅ ✅ ✅ | toplo, svima jasno, URL kao rečenica; slab žig |
| Umalome | 6 | vj. ✅ / ✅ / ✅ | Lk 16,10 „tko je vjeran u najmanjem…”; originalno |
| Zrnopozrno | 5 | ✅ ✅ ✅ | poslovica i gorušičino zrno; dugačko |
| Veselidar | 5 | ✅ ✅ ✅ | 2 Kor 9,7; kratko i vedro |
| Škrabica | 3 | ✅ ✅ ❌ | rječničko značenje: kutija za milodare |
| Cvenkni / Kapnimo | 4 | ✅ ✅ ✅ | na foru, potpuno hrvatski |

Odbačeno ili nije prošlo kod vlasnika: Doprinos, Skupimo, Darujmo, Podrži, Moba, Priskočimo, Škuda, Složimo, Pripomoć, Fundaj (investicijski prizvuk „fund”), crowd4fund (sadrži „4fund", rizik zamjene), Samarijanac, Desnica, Zakej, Talenti.

## Prije kupnje

1. Na domene.hr potvrditi `.hr` za odabrano ime.
2. Provjeriti žig u DZIV-u i EUIPO-u (razredi 36 i 42).
3. Registrirati `.hr`, `.eu` i `.com`. To radi vlasnik.
4. S13: odluka u bloku 1300, zamjena 6 brend tokena (odluka 404), i18n `site.name`, redeploy staginga.
