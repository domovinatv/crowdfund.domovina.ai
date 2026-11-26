# Ime platforme, iteracija 4: imena „na foru” (25. 11. 2026.)

Zadatak: kratko, zvučno, pamtljivo ime po uzoru na 4fund, GoFundMe, Kickstarter, Patreon, Leetchi, Zrzutka, Vakinha.
Usput je stigao dodatni kriterij vlasnika: **URL kampanje mora se čitati kao rečenica**, `<domena>/za-<slug>`,
npr. `skupi.hr/za-maju-operacija`. Zato su glagoli (imperativ) dobili prednost pred imenicama i maskotama.

Već odbijeno (ne ponavljam): Doprinos, Skupimo, Darujmo, Podrži, Moba, Priskočimo, Škuda, Složimo, Pripomoć,
Škrabica, Lemozina, Kolekta. Već provjereno od koordinatora: skupi.hr ZAUZETA, skupi.eu zauzeta, skupi.com na prodaju;
skupiza.hr, skupimoza.hr, dajza.hr bez NS.

## 1. Zašto ta imena rade (obrasci)

| # | Obrazac | Primjeri | Što radi |
|---|---|---|---|
| 1 | **Broj umjesto riječi** | 4fund (for fund), 2fund | kratko, vizualno, domena slobodna jer nije riječ; radi samo kad broj zvuči kao riječ (*4 = for*) |
| 2 | **Imperativ + objekt / „me”** | GoFundMe, JustGiving, Kickstarter | ime je već poziv na akciju (CTA); URL `gofundme.com/f/...` čita se kao naredba |
| 3 | **Onomatopeja / igra zvuka** | Leetchi (liči + *lychee*), Ulule | zvučno, simpatično, bez značenja koje bi suzilo brend |
| 4 | **Domaća razgovorna riječ za „skupljanje”** | Zrzutka (pol. „ubacivanje”), Vakinha (port. „kravica” = zajednička kasa), Pomagam.pl | svatko u zemlji odmah zna što znači; stranac pamti kao egzotičnu riječ |
| 5 | **Sufiks za maskotu / latinizam** | Patreon (patron + -eon), Indiegogo, Ketto | korijen ostaje prepoznatljiv, sufiks daje brend koji se može zaštititi |
| 6 | **Spoj dviju poznatih riječi** | Kickstarter, Betterplace, JustGiving, Indiegogo | samo-objašnjiv, ali dugačak; domene su skupe |
| 7 | **Hibrid jezika** | Donadoro (it. *donare* + *d'oro*) | domaći nastavak na stranom korijenu, razumljivo i domaćima i strancima |
| 8 | **Udvajanje / ritam** | Indiegogo (go-go), Kickstarter (k-k) | ponavljanje slogova olakšava pamćenje |

| 9 | **Riječ + broj + riječ** (prijedlog vlasnika) | crowd4fund, kap4kap, skupi4 | broj kao veznik usred spoja; vizualno jak, ali u hrvatskom „4” ne zvuči kao „za/po”, pa se ime izgovara „kap četiri kap” ili engleski „kap for kap” |

Hrvatski ekvivalent obrasca 7 već postoji u govoru: **-aj na engleskom glagolu** (*lajkaj, šeraj, sejvaj*). Odatle *Fundaj*.

## 2. Kandidati i domene

Metoda: `.hr` preko `dig +short NS` (bez NS = „vj. slobodna”), za 10 imena i `whois -h whois.dns.hr` („slobodna”);
`.eu` preko `whois -h whois.eu`; `.com` preko `whois.verisign-grs.com` (u zagradi godina registracije).
Od 13. `.hr` whois upita CARNET vraća samo GDPR zaglavlje bez odgovora, pa su kapni.hr i cvenkni.hr ostali „bez NS”.
Ukupno ≈ 145 whois upita + dig. Ništa nije kupljeno.

| Ime | Obrazac | Ideja | .hr | .eu | .com | `/za-<slug>` |
|---|---|---|---|---|---|---|
| **fundaj** | 7, 2 | „lajkaj/šeraj” → *fundaj* | **slobodna** (whois) | slobodna | zauzeta (2019) | fundaj.hr/za-maju-operacija ✔ |
| **fundajmo** | 7, 2 | 1. l. mn. | **slobodna** (whois) | slobodna | **slobodna** | fundajmo.hr/za-maju-... ✔ |
| ajmofund | 7 | „Ajmo!” + fund | **slobodna** (whois) | slobodna | **slobodna** | ajmofund.hr/za-... ~ |
| idemofund | 7 | „Idemo!” + fund | bez NS | slobodna | slobodna | ~ |
| skupfund | 6 | skup + fund | bez NS | slobodna | slobodna | ~ |
| zafund | 1 | za = for | bez NS | slobodna | zauzeta (2007) | ✘ (za/za) |
| fundko | 5 | fund + -ko | bez NS | slobodna | zauzeta (2016) | ~ |
| fundic / fundica | 5 | umanjenica | bez NS | slobodna | zauzeta (2010) | ~ |
| fundimo | 7 | | bez NS | zauzeta | zauzeta (2007) | ✔ |
| **cvenkaj** | 3, 2 | *cvenk* = zveket kovanice, razg. novac | **slobodna** (whois) | slobodna | **slobodna** | cvenkaj.hr/za-maju-... ✔ |
| **cvenkni** | 3, 2 | jednokratno: „cvenkni za Maju” | bez NS (whois bez odgovora) | slobodna | **slobodna** | cvenkni.hr/za-maju-... ✔✔ |
| cvenkica | 3, 5 | umanjenica | bez NS | slobodna | slobodna | ~ |
| cvenk | 3 | | zauzeta (NS) | slobodna | zauzeta (2010) | |
| zvecka | 3 | zveckanje | zauzeta (NS) | zauzeta | zauzeta | |
| cincin | 3, 8 | zdravica | bez NS | zauzeta | zauzeta | |
| dzing | 3 | | bez NS | zauzeta | zauzeta | |
| **ubaci** | 4, 2 | „ubaci koji euro” | vj. slobodna (iter. 2) | slobodna | zauzeta (2014) | ubaci.hr/za-maju-... ✔✔ |
| ubacime | 2 | GoFundMe kalk | bez NS | slobodna | slobodna | ✘ (krivo značenje: „ubaci mene”) |
| **kapni** | 4, 2 | „kap po kap” | bez NS (whois bez odgovora) | slobodna | zauzeta (2020) | kapni.hr/za-maju-... ✔✔ |
| **kapnimo** | 4, 2 | 1. l. mn. | **slobodna** (whois) | slobodna | **slobodna** | kapnimo.hr/za-maju-... ✔ |
| kapkap | 8 | kap-kap | bez NS | zauzeta | zauzeta | |
| kapica, kapko | 5 | | bez NS | zauzeta | zauzeta | |
| **gurnimo** | 2 | „gurnuti stvar naprijed” | bez NS | slobodna | **slobodna** | gurnimo.hr/za-maju-... ✔ |
| guraj, gurni, guramo | 2 | | bez NS | slobodna | zauzeta (2016/2009/2023) | ✔ |
| **pridonesi** | 2 | glagol od „doprinos/prilog” | bez NS | slobodna | **slobodna** | pridonesi.hr/za-maju-... ✔✔ |
| pomozi | 2 | | zauzeta (NS) | slobodna | zauzeta | |
| pomozime | 2 | GoFundMe kalk | bez NS | slobodna | slobodna | ✘ (gramatički „pomozi mi”) |
| dajme | 2 | | bez NS | slobodna | slobodna | ✘ (krivo značenje) |
| dajdaj | 8 | | bez NS | slobodna | zauzeta (2009) | ~ |
| dajruku, pruziruku | 6 | „pruži ruku” | bez NS | slobodna / zauzeta | zauzeta / slobodna | ~ |
| **daj5** | 1 | „daj pet!” (high five) + 5 € | bez NS | slobodna | zauzeta (2017) | daj5.hr/za-maju-... ✔ |
| dajpet | 1 | | zauzeta (NS) | slobodna | zauzeta (2025) | |
| **4ruke** | 1 | „četveroručno” = zajedno | **slobodna** (whois) | slobodna | **slobodna** | ~ (imenica) |
| **svi4** | 1 | „svi za jednog” | **slobodna** (whois) | slobodna | **slobodna** | ~ |
| 100ruku | 1 | sto ruku | bez NS | slobodna | slobodna | ~ |
| 2skupa | 1 | „dvoje skupa” | bez NS | slobodna | slobodna | ~ |
| sloga4 | 1 | | bez NS | slobodna | slobodna | ~ |
| osam8 | 1 | osam ≈ *awesome* | bez NS | slobodna | zauzeta (2026) | |
| **skupko** | 5 | skup + -ko maskota | **slobodna** (whois) | slobodna | **slobodna** | skupko.hr/za-... ~ |
| skupli | 5 | skup + -ly | bez NS | slobodna | slobodna | ~ |
| ajmoskupa | 6 | | bez NS | slobodna | slobodna | ~ |
| **donatko** | 5 | donate + -ko; sv. Donat (Zadar) | **slobodna** (whois) | slobodna | **slobodna** | ~ |
| rukica | 5 | | bez NS | slobodna | slobodna | ~ |
| **zajkasa** | 4, 6 | „zajednička kasa” (≈ Vakinha) | **slobodna** (whois) | slobodna | **slobodna** | ~ |
| prasica | 4 | kasica prasica | bez NS | zauzeta | slobodna | |
| pujsek | 4 | kajk. prasić | bez NS | zauzeta | zauzeta (2026) | |
| soldi / soldic | 4 | dalm. novac | bez NS | zauzeta / slobodna | zauzeta | |
| pinezi | 4 | kajk. novac | bez NS | slobodna | zauzeta (2007) | |
| kintica, lovica | 4 | sleng novac | bez NS | slobodna | zauzeta | |
| sitnis | 4 | sitniš | zauzeta (NS) | slobodna | slobodna | |
| kunic | 4 | kunić + kuna | bez NS | slobodna | zauzeta (2006) | |
| eurko, euric, centic | 5 | | razno | | zauzeta | |
| slogica | 5 | | bez NS | slobodna | zauzeta (2002) | |
| donacija hackovi | 2 | pomozi.me / ubaci.me | — | — | — | pomozi.me zauzeta (Vercel), ubaci.me zauzeta (Cloudflare); daj.me, gurni.me bez NS |
| baci, dodaj | 2 | | bez NS | zauzeta | zauzeta | |

✔✔ = domena + `/za-<slug>` je prirodna rečenica u 2. l. jd. (kako ljudi govore: „ubaci za Maju”);
✔ = rečenica radi; ~ = imenica/maskota, URL je oznaka a ne rečenica; ✘ = ne radi.

Isključeno: **ubacime, dajme, pomozime** (doslovni GoFundMe kalk daje krivo značenje ili gramatiku: „ubaci me” = ubaci mene);
**zajkasa** (prefiks *zaj-* se čita kao *zaje...*, a sliči i *zajam* = posudba); **svi4 / zafund** („za” u URL-u se udvostruči: `zafund.hr/za-maju`).

### 2a. Obrazac 9 (riječ + broj + riječ), dig koordinatora + moj whois

| Ime | .hr | .eu | .com | Čitanje / `/za-<slug>` | Rizik zamjene s 4fundom |
|---|---|---|---|---|---|
| **crowd4fund** | bez NS | slobodna (whois) | **zauzeta (whois: reg. 2012-05**, ali bez NS pa dig izgleda prazno) | „crowd for fund”; crowd4fund.hr/za-maju ~ | **visok**: sadrži cijeli niz „4fund”, a proizvod je funkcionalni klon 4funda (Zrzutka.pl). Gotovo siguran prigovor na žig / zbunjivanje kupaca i nemoguć SEO (svaka pretraga „crowd 4fund” vodi na 4fund) |
| fund4 / za4 / dajza / crowdhr | | | .com zauzeta (koord.) | | fund4: srednji |
| **kap4kap** | bez NS (CARNET whois više ne odgovara) | **slobodna** (whois) | **slobodna** (whois) | „kap po kap” s 4 umjesto „po”; kap4kap.hr/za-maju-operacija ✔ | nizak–srednji: „4” u sredini podsjeća na 4fund, ali nema „fund” |
| skupi4, skup4, 4skupi | bez NS | bez NS | bez NS (koord.) | „skupi for”; skupi4.hr/za-maju ✘ (udvaja „za”) | srednji: „4” + glagol skupljanja = blizu 4fund |
| 4pomoc | bez NS | bez NS | bez NS | „for pomoć”, mješavina | srednji |
| 2skupa, svi4 | gore | | | | nizak |

Zaključak za obrazac 9: radi vizualno, ali u hrvatskom broj nema homofon kao *4 = for* u engleskom, pa gubi glavnu prednost 4funda.
Sve s „4” uz platformu koja radi isto što i 4fund nosi rizik zamjene. *crowd4fund* odbaciti (i .com je zauzet). U top 8 ulazi samo **kap4kap**.

## 3. Top 8: web provjera

Pretraga (WebSearch, 8 upita): za **Fundaj/Fundajmo, Cvenkaj/Cvenk, Skupko, Donatko, Kapnimo, 4ruke, Ajmofund, Gurnimo, Pridonesi**
nema app, tvrtke ni platforme istog imena. Nađeno usput:
- **AYMO Ventures** (HR VC fondovi, HBOR je investitor u AYMO Growth Fund) — zvučno blizu *Ajmofund* i, još gore, *investicijski* fond. Diskvalificira Ajmofund.
- **DONAT d.o.o.** (Zadar, 1997) — blizu *Donatko*, druga djelatnost.
- **Darujme.cz** (češka donacijska platforma) — relevantno za odbijeni *Darujmo* (bilo bi preblizu).
- Za *cvenk* kao sleng za novac web nije dao rječnički izvor (vlastito znanje: razg. zagrebački, „imati cvenka”); prije odluke provjeriti u HJP-u.

Strana značenja (EN/DE/IT): za *fundaj, cvenkni, ubaci, kapni, gurnimo, pridonesi, daj5* nisam našao nepristojno ili negativno značenje.
Napomene: *fund* na engleskom znači i „investicijski fond”, što je u sukobu s pravilom „doprinosi, ne ulaže”; *daj5* sugerira fiksni iznos od 5 €
(a iznos je ono što uplatitelj želi dati); *kapnuti* razg. znači i „slučajno navratiti/doći”, bezopasno.

## 4. Ocjena top 8 (1–5)

| Ime | Zvučnost | Pamtljivost | Jasnoća | Hrv. duh | Intern. | Domene | Rizik (5 = nizak) | URL rečenica | Σ |
|---|---|---|---|---|---|---|---|---|---|
| **Fundaj** | 5 | 5 | 4 | 4 | 5 | 4 (.hr+.eu; .com → fundajmo.com) | 3 (anglizam, *fund* = fond) | 5 | **35** |
| **Ubaci** | 4 | 5 | 5 | 5 | 2 | 3 (.hr vj., .eu; .com zauzet) | 4 | 5 | **33** |
| **Cvenkni** | 5 | 5 | 3 | 5 | 2 („cv” strancima teško) | 5 (sve tri) | 4 | 5 | **34** |
| Kapni / Kapnimo | 4 | 4 | 4 | 5 | 2 | 5 (kapnimo sve tri) | 4 | 5 | **33** |
| Pridonesi | 3 | 3 | 5 | 4 | 1 | 5 | 5 | 5 | **31** |
| Gurnimo | 3 | 4 | 3 | 4 | 2 | 5 | 4 | 4 | **29** |
| Daj5 | 4 | 5 | 3 | 5 | 3 | 3 (.com zauzet) | 3 (fiksni iznos) | 4 | **30** |
| Kap4kap | 4 | 4 | 4 | 4 | 3 | 5 (.eu, .com whois; .hr bez NS) | 3 (zamjena s 4fund) | 4 | **31** |

Rizik zamjene s 4fundom: Fundaj nizak–srednji (dijeli korijen *fund*, ali ne broj ni oblik); Kap4kap i Daj5 srednji (broj u imenu);
ostali nizak. Rezerve u imenicama (bez URL rečenice): **Skupko**, **4ruke**, **Donatko** (sv. Donat), sve tri domene slobodne.

## 5. Preporuka

**Fundaj** (`fundaj.hr/za-maju-operacija`, uz `fundaj.eu`; `fundajmo.com` slobodna za redirect i međunarodno).
Isti trik kao 4fund i Donadoro: strani korijen koji svi u EU razumiju (*fund*) i domaći nastavak koji svaki Hrvat čita kao poziv
(*lajkaj → fundaj*). URL se čita kao rečenica. Najveći rizik: *fund* zvuči investicijski, pa tekst na stranici mora stalno govoriti „doprinesi”.

**Rezerva: Cvenkni** (`cvenkni.hr/za-maju-operacija`, .eu i .com slobodne): najviše „fore” (onomatopeja kao Leetchi),
čisto hrvatski i bez anglizma, ali strancima teško izgovoriti. Ako je važnija jasnoća nego fora: **Ubaci** (`ubaci.hr/za-maju-operacija`).

Prije kupnje: `.hr` whois ponovno za ubaci.hr, kapni.hr i cvenkni.hr (CARNET je prestao odgovarati), HJP potvrda za *cvenk*,
i pretraga EUIPO/DZIV žigova (nije rađena).
