#!/usr/bin/env node
// Generira seed/demo.sql: izmišljene demo kampanje za lokalni razvoj i testove (S4).
//
// Odluke ove skripte:
//  - DETERMINIZAM: fiksni PRNG (mulberry32, sjeme SJEME), „sad” (SAD) i UUIDv7 čiji je vremenski
//    dio vrijeme zapisa, a slučajni dio iz istog PRNG-a. Isti DEMO_SAD = isti bajtovi; test
//    uspoređuje datoteku s demoSql(<DEMO_SAD iz primjeri.json>).
//  - SAD (S6, odluka 532): početak tekućeg UTC dana pri generiranju, ili `DEMO_SAD=YYYY-MM-DD` iz
//    okoline. Sva vremena su relativna na SAD, pa demo kampanje nakon novog seeda ne pokazuju
//    „rok je prošao”. Datum stoji u prvom retku demo.sql i u primjeri.json (`demoSad`).
//  - DEMO OZNAKA: `campaigns.demo = 1` i `metadata = {"demo":true}`; sve ostalo je demo preko
//    veze na demo kampanju ili po e-pošti `@demo.invalid` (users, organizers, checkouts),
//    slugu organizacije `demo-…`, sidu intenta `demo…` i referencama `DEMO-…`. Sirovih IBAN-ova
//    nema (shema ih ne sprema, odluka 3.9 u docs/03); `payer_iban_hash` je `demo` + hex.
//    Safe adrese su izmišljene (`0xde…`), lanac 10200 (Chiado, testnet).
//  - RESET: demo.sql počinje s DELETE FROM za SVE tablice iz migracija osim `categories`
//    (referentni podaci iz 0003), obrnutim redom ovisnosti (REFERENCES iz migracija). Seed je
//    zato idempotentan, ali briše i ručno unesene lokalne podatke.
//  - `funded` se ne koristi (odluka 204), vertikala je uvijek `none` (docs/09).
//
//  - S5: kasice, linkovi za praćenje s posjetima, vanjske kampanje, praćenja, ponude (faza 2) i rubni
//    slučajevi javnog dijela. Nove kampanje su na kraju popisa, a checkouti/atribucije se upisuju
//    nakon kasica, pa ranije kampanje i doprinosi ostaju isti. Uz SQL nastaje seed/primjeri.json.
//    Galerija (campaign_media) se ne seeda: slika traži datoteku u R2, pa kartice koriste temu naslovnice.
//  - S6: demo računi za prijavu (organizator = vlasnica Zaklade Svjetionik nade, moderator, novi
//    korisnik bez ičega), demo sesije s POZNATIM tokenom (samo za lokalnu provjeru ruta; token u
//    primjeri.json, red u login_events s `device = 'demo seed'`), poveznica za prijavu, dodatna
//    potvrda i pozivnica s poznatim tokenom (`demo-…`), slug jedne osobe, popis uplata kao stupac.
//
// Upotreba: npm run db:gen-seed   (piše seed/demo.sql i seed/primjeri.json)
//           node scripts/seed.mjs --stdout
import { createHash, createHmac } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const SEED_PATH = join(ROOT, "seed", "demo.sql");
export const PRIMJERI_PATH = join(ROOT, "seed", "primjeri.json");

const SJEME = 20261124;
const SAT = 3_600_000;
const DAN = 24 * SAT;
const TENANT = "sbx-crowdfund-demo";
const LANAC = 10200;

/** „Sad” seeda kao `YYYY-MM-DD`: `DEMO_SAD` iz okoline ili tekući UTC dan (odluka 532). */
export function sadSeeda(okolina = process.env.DEMO_SAD, sat = new Date()) {
  if (okolina) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(okolina) || Number.isNaN(Date.parse(`${okolina}T00:00:00Z`))) {
      throw new Error(`DEMO_SAD mora biti YYYY-MM-DD, a ne ${okolina}`);
    }
    return okolina;
  }
  return sat.toISOString().slice(0, 10);
}

/** SHA-256 hex, isto kao `hashTokena` u src/lib/sesija.ts. */
const sha256 = (/** @type {string} */ s) => createHash("sha256").update(s).digest("hex");

/** Poznati demo tokeni (S6): vrijede samo nad lokalnim seedom. */
export const DEMO_TOKENI = {
  sesijaOrganizator: "demo-sesija-organizator",
  sesijaModerator: "demo-sesija-moderator",
  sesijaNovi: "demo-sesija-novi",
  poveznicaPrijave: "demo-poveznica-novi",
  pozivnica: "demo-pozivnica-novi",
  pozivnicaIstekla: "demo-pozivnica-istekla",
};

// --- PRNG i ID-evi -----------------------------------------------------------------------------

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tablice iz migracija, poredane tako da tablica dolazi iza svih na koje pokazuje. */
export function tabliceRedomOvisnosti(dir = join(ROOT, "migrations")) {
  const sql = readdirSync(dir)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
  /** @type {Map<string, Set<string>>} */
  const ovisi = new Map();
  // Naredbe redom migracija: CREATE dodaje tablicu, DROP je briše, RENAME je preimenuje (0004 gradi
  // campaign_follows iznova), pa popis odgovara konačnoj shemi.
  for (const m of sql.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\n\);|DROP TABLE (\w+);|ALTER TABLE (\w+) RENAME TO (\w+);/g)) {
    if (m[3]) ovisi.delete(m[3]);
    else if (m[4]) {
      const refs = ovisi.get(m[4]) ?? new Set();
      ovisi.delete(m[4]);
      ovisi.set(m[5], refs);
    } else {
      const refs = new Set([...m[2].matchAll(/REFERENCES (\w+)\(/g)].map((r) => r[1]));
      refs.delete(m[1]);
      ovisi.set(m[1], refs);
    }
  }
  /** @type {string[]} */
  const red = [];
  const posjeceno = new Set();
  const posjeti = (/** @type {string} */ t) => {
    if (posjeceno.has(t)) return;
    posjeceno.add(t);
    for (const r of [...(ovisi.get(t) ?? [])].sort()) posjeti(r);
    red.push(t);
  };
  for (const t of ovisi.keys()) posjeti(t);
  return red;
}

// --- Podaci --------------------------------------------------------------------------------------

const OSOBE = [
  ["Ana", "Primjerić"],
  ["Marko", "Oglednić"],
  ["Ivana", "Testić"],
  ["Luka", "Uzorković"],
  ["Petra", "Probić"],
  ["Tomislav", "Nacrtić"],
  ["Maja", "Skicić"],
  ["Josip", "Izmišljenić"],
  ["Katarina", "Zamišljić"],
  ["Filip", "Moderović"],
];

// [naziv, slug, legal_form, holder_type, kategorija, grad, poštanski, vlasnik (indeks osobe), ostali članovi]
const ORGANIZACIJE = [
  ["Udruga za zaštitu životinja Šapica", "demo-sapica", "udruga", "association", "animals", "Varaždin", "42000", 0, [[3, "editor"]]],
  ["KUD Lipa Ogledna", "demo-kud-lipa", "udruga", "association", "culture", "Osijek", "31000", 1, []],
  ["Zaklada Svjetionik nade", "demo-svjetionik", "zaklada", "association", "charity", "Split", "21000", 2, [[4, "admin"]]],
  ["Energetska zadruga Sunčani krov", "demo-suncani-krov", "zadruga", "cooperative", "projects", "Zagreb", "10000", 5, [[3, "viewer"]]],
  ["Športsko društvo Bura Ogledna", "demo-sd-bura", "udruga", "association", "sport", "Rijeka", "51000", 6, [[7, "editor"]]],
];

const PODRZAVATELJI = [
  "Nikola K.", "Sara M.", "Obitelj B.", "Dario P.", "Lea V.", "Ivan R.", "Mia T.", "Karlo Š.",
  "Ema L.", "Borna Č.", "Nina D.", "Matej F.", "Lucija G.", "Antonio H.", "Klara J.", "Vid Ž.",
  "Tea N.", "Roko S.", "Dora Z.", "Teo C.",
];

const PORUKE = [
  "Sretno!", "Bravo za inicijativu.", "Malo, ali od srca.", "Hvala što ovo radite!",
  "Podržavam, javite kako napreduje.", "Za bolje susjedstvo.", "Svaka čast cijeloj ekipi!",
  "Neka bude još ovakvih akcija.",
];

const KOMENTARI = [
  "Podijelila sam s prijateljima, nadam se da će se skupiti brzo.",
  "Kada otprilike očekujete da ćete krenuti?",
  "Sjajna ideja, prošle godine je bilo odlično.",
  "Može li se pomoći i volontiranjem?",
  "Hvala na redovitim obavijestima.",
  "Gdje se mogu vidjeti računi za potrošeno?",
];

const TEME = {
  charity: "charity", culture: "event", projects: "project", needs: "needs",
  sport: "sports", animals: "animals", travel: "travel", other: "general",
};

/**
 * Kampanje. `org` = indeks organizacije (organizator i Safe), `by` = indeks osobe koja ju je
 * stvorila. `za` = Fixed Beneficiary (kind for_organization). `n` = broj doprinosa, `eur` = raspon
 * iznosa donacije u eurima. `tiers` = [naslov, cijena €, zaliha|null, opis].
 */
const KAMPANJE = [
  { org: 2, by: 2, type: "donation", cat: "charity", title: "Topli obroci za starije u susjedstvu", goal: 8000, n: 14, eur: [5, 100],
    opis: "Svaki dan dostavljamo topli obrok starijim sugrađanima koji žive sami. Prikupljeni novac pokriva namirnice i gorivo za dostavu kroz zimu." },
  { org: 2, by: 7, type: "donation", cat: "charity", title: "Rođendanska akcija za Svjetionik nade", goal: 1500, n: 9, eur: [10, 60], za: true,
    opis: "Umjesto poklona za rođendan skupljam za zakladu Svjetionik nade. Sav iznos ide izravno na račun zaklade." },
  { org: 2, by: 8, type: "donation", cat: "charity", title: "Školski pribor za djecu iz udomiteljskih obitelji", goal: 2000, n: 0, eur: [10, 50], za: true, state: "review",
    opis: "Kampanja čeka odobrenje zaklade. Cilj je kupiti ruksake i pribor za pedesetak djece prije drugog polugodišta." },
  { org: 1, by: 1, type: "tickets", cat: "culture", title: "Godišnji koncert KUD-a Lipa", goal: null, n: 12, dana: 25,
    tiers: [["Ulaznica", 15, 300, "Jedno mjesto u dvorani."], ["Obiteljska ulaznica", 40, 60, "Dvoje odraslih i do troje djece."]],
    opis: "Tradicionalni zimski koncert s plesovima i napjevima iz cijele Slavonije. Ulaznice vrijede za večer koncerta." },
  { org: 1, by: 1, type: "reward", cat: "culture", title: "Snimanje albuma izvornih napjeva", goal: 6000, n: 10, hideRaised: true,
    tiers: [["Zahvala u knjižici albuma", 15, null, "Vaše ime u popisu podržavatelja."], ["CD s potpisima", 35, 200, "Album poštom nakon izdavanja."], ["Privatna izvedba", 400, 3, "Nastup ansambla na vašem događaju."]],
    opis: "Snimamo dvanaest napjeva koje su pjevale naše bake, prije nego što se zaborave. Iznos skupljenog novca namjerno ne prikazujemo." },
  { org: 1, by: 1, type: "membership", cat: "culture", title: "Članstvo u KUD-u Lipa 2027.", goal: null, n: 8, recurrence: "monthly",
    tiers: [["Mjesečna članarina", 10, null, "Redovni član."], ["Podupiruća članarina", 25, null, "Član koji podupire rad ansambla."]],
    opis: "Mjesečna članarina pokriva najam dvorane za probe, nošnje i putne troškove ansambla." },
  { org: 3, by: 5, type: "reward", cat: "projects", title: "Sunčana elektrana na krovu doma kulture", goal: 28000, n: 13, purpose: true,
    tiers: [["Zahvalnica", 20, null, "Digitalna zahvalnica zadruge."], ["Pločica na zidu doma", 150, 100, "Vaše ime na pločici donatora."], ["Obilazak elektrane", 300, 20, "Vođeni obilazak s inženjerom."]],
    opis: "Postavljamo elektranu od 30 kW na krov doma kulture. Ušteda na struji ide u program za mlade u domu." },
  { org: 3, by: 5, type: "membership", cat: "projects", title: "Članski ulog u zadruzi Sunčani krov", goal: 10000, n: 7,
    tiers: [["Članski ulog", 100, null, "Jednokratni ulog za članstvo u zadruzi."]],
    opis: "Postanite član zadruge koja gradi zajedničke sunčane elektrane u kvartu. Ulog je članski, a ne ulaganje." },
  { org: 3, by: 5, type: "donation", cat: "projects", title: "Punionica za električne bicikle", goal: 3500, n: 0, eur: [5, 50], state: "draft",
    opis: "Kampanja je objavljena iz nacrta i čeka provjeru Safea zadruge." },
  { org: 2, by: 4, type: "donation", cat: "needs", title: "Prilagodba kupaonice za gospođu Ružu", goal: 4500, n: 11, eur: [10, 150], hideCount: true,
    opis: "Gospođa Ruža (izmišljena osoba) nakon operacije ne može koristiti kadu. Prilagođavamo kupaonicu s tušem i rukohvatima." },
  { org: 2, by: 2, type: "donation", cat: "needs", title: "Popravak krova nakon oluje", goal: 3000, n: 16, eur: [20, 200], state: "closed", zatvorena: 12,
    opis: "Oluja je odnijela dio krova obiteljske kuće. Cilj je dosegnut i kampanja je zatvorena, hvala svima." },
  { org: 2, by: 4, type: "donation", cat: "needs", title: "Ogrjev za zimu u planinskim selima", goal: 5000, n: 6, eur: [10, 80], pauzirana: 4,
    opis: "Kupujemo drva za dvadesetak domaćinstava u planinskim selima. Organizator je privremeno isključio uplate." },
  { org: 4, by: 6, type: "donation", cat: "sport", title: "Nova oprema za juniorsku momčad", goal: 2500, n: 12, eur: [5, 75],
    opis: "Juniori igraju u dresovima starima deset godina. Skupljamo za dresove, lopte i torbe za prvu pomoć." },
  { org: 4, by: 6, type: "tickets", cat: "sport", title: "Turnir u malom nogometu Bura Cup", goal: null, n: 9, dana: 30,
    tiers: [["Prijava ekipe", 60, 16, "Kotizacija za ekipu do 8 igrača."], ["Gledatelj, oba dana", 5, 500, "Ulaz na tribine."]],
    opis: "Dvodnevni humanitarni turnir u sportskoj dvorani. Dio kotizacije ide za opremu juniora." },
  { org: 4, by: 6, type: "membership", cat: "sport", title: "Godišnja članarina ŠD Bura", goal: null, n: 10, recurrence: "yearly",
    tiers: [["Članarina za odrasle", 30, null, "Godišnja članarina."], ["Članarina za djecu", 15, null, "Za djecu do 14 godina."]],
    opis: "Članarina pokriva najam terena, osiguranje igrača i suđenje na utakmicama." },
  { org: 0, by: 0, type: "donation", cat: "animals", title: "Sterilizacija mačaka lutalica", goal: 3000, n: 15, eur: [5, 60],
    opis: "Sterilizacijom smanjujemo broj napuštenih mačića. Jedan zahvat stoji oko 60 eura uz veterinarski popust." },
  { org: 0, by: 0, type: "reward", cat: "animals", title: "Kalendar 2027. s psima iz skloništa", goal: 1800, n: 11,
    tiers: [["Zidni kalendar", 15, 400, "Kalendar poštom."], ["Kalendar i šalica", 25, 150, "Komplet za ljubitelje pasa."]],
    opis: "Fotografirali smo pse iz skloništa koji čekaju dom. Prihod od kalendara ide za hranu i cijepljenje." },
  { org: 0, by: 3, type: "donation", cat: "animals", title: "Grijanje za azil tijekom zime", goal: 2200, n: 5, eur: [10, 50], visibility: "unlisted",
    opis: "Grijalice i izolacija za vanjske boksove. Kampanja je dostupna samo preko poveznice." },
  { org: 1, by: 1, type: "donation", cat: "travel", title: "Gostovanje KUD-a na festivalu folklora", goal: 7000, n: 10, eur: [10, 100],
    opis: "Ansambl je pozvan na međunarodni festival folklora. Skupljamo za autobus i smještaj za 40 članova." },
  { org: 4, by: 7, type: "tickets", cat: "travel", title: "Autobus za navijače na gostovanje", goal: null, n: 8, dana: 14,
    tiers: [["Mjesto u autobusu", 25, 50, "Polazak ispred dvorane u 7 sati."]],
    opis: "Organizirani prijevoz navijača na finalnu utakmicu sezone." },
  { org: 2, by: 4, type: "donation", cat: "travel", title: "Ekskurzija za djecu iz doma", goal: 4000, n: 3, eur: [20, 100], state: "cancelled", obrisana: 20,
    opis: "Kampanja je obrisana; organizator je uplate vratio podržavateljima." },
  { org: 3, by: 3, type: "donation", cat: "other", title: "Zajednički vrt u kvartu", goal: 1200, n: 4, eur: [5, 40], blokirana: 3,
    opis: "Pretvaramo zapuštenu parcelu u zajednički vrt. Kampanja je privremeno blokirana zbog prijave." },
  { org: 0, by: 0, type: "membership", cat: "other", title: "Podrži rad udruge Šapica mjesečno", goal: null, n: 9, recurrence: "monthly",
    tiers: [["Prijatelj Šapice", 5, null, "5 eura mjesečno."], ["Kum skloništa", 20, null, "20 eura mjesečno."]],
    opis: "Redovna mjesečna podrška omogućuje nam da planiramo hranu i veterinarske troškove unaprijed." },
  { org: 1, by: 1, type: "donation", cat: "other", title: "Knjižnica u kutiji za parkove", goal: null, n: 7, eur: [5, 30], hideRaised: true,
    opis: "Postavljamo drvene kućice za razmjenu knjiga u pet gradskih parkova. Kampanja nema cilj ni prikaz iznosa." },
  // S5: rubni slučajevi javnog dijela (dodane na kraj da PRNG ne pomakne ranije kampanje)
  { org: 4, by: 6, type: "donation", cat: "needs", title: "Defibrilator za mjesni dom", goal: 1000, n: 14, eur: [40, 150], zavrsila: 6,
    sort: "highest", komentari: "contributors",
    opis: "Rok kampanje je prošao, a cilj je dosegnut. Defibrilator je naručen i stiže prije blagdana." },
  { org: 2, by: 2, type: "donation", cat: "charity", title: "Božićni paketi za samce", goal: 2500, n: 10, eur: [10, 80], rokZa: 3, popisSkriven: true,
    opis: "Pakete s hranom i toplom odjećom dijelimo starijima koji blagdane provode sami. Popis uplata organizator ne prikazuje." },
  { org: 3, by: 5, type: "donation", cat: "projects", title: "Obnova društvenog doma u selu", goal: 9000, n: 8, eur: [20, 200], komentari: "off", bezKasica: true,
    opis: "Mijenjamo stolariju i krov društvenog doma. Komentari i kasice su za ovu kampanju isključeni." },
];

/** Ponude (faza 2, samo UI) po indeksu kampanje: [naslov, način, cijena €, status, prodavatelj]. */
const PONUDE = [
  [16, "Portret vašeg psa u olovci", "buy_now", 40, "active", 3],
  [16, "Vikend šetnje sa psima iz skloništa", "auction", 30, "active", 7],
  [15, "Ručno pletena dekica za mačke", "buy_now", 25, "sold", 4],
];

// --- SQL pomoćnici ------------------------------------------------------------------------------

/** @param {unknown} v */
function lit(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error(`broj ${v}`);
    return String(v);
  }
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "object") return lit(JSON.stringify(v));
  return `'${String(v).replaceAll("'", "''")}'`;
}

/** Cijeli sadržaj seed/demo.sql (deterministički za isti `sad`, `YYYY-MM-DD`). */
export function demoSql(sad = sadSeeda()) {
  return generiraj(sad).sql;
}

/** Sadržaj seed/primjeri.json: po jedan primjer za svaki dinamički parametar ruta (S5, S6). */
export function demoPrimjeri(sad = sadSeeda()) {
  return generiraj(sad).primjeri;
}

/**
 * Token praćenja za poveznicu `/hr/pracenje/{token}` (S5): shema nema stupac tokena, pa je token
 * `{user_id}.{campaign_id}.{HMAC-SHA256 base64url}`; provjera u src/lib/db/pracenje.ts.
 * Lokalna tajna vrijedi samo za demo; Worker koristi tajnu iz okoline.
 */
export const DEMO_TAJNA_PRACENJA = "demo-tajna-pracenja-samo-lokalno";
export function tokenPracenja(/** @type {string} */ userId, /** @type {string} */ campaignId, tajna = DEMO_TAJNA_PRACENJA) {
  const p = `${userId}.${campaignId}`;
  return `${p}.${createHmac("sha256", tajna).update(p).digest("base64url")}`;
}

function generiraj(/** @type {string} */ demoSad) {
  const SAD = Date.parse(`${demoSad}T00:00:00Z`);
  const rnd = mulberry32(SJEME);
  const int = (/** @type {number} */ a, /** @type {number} */ b) => a + Math.floor(rnd() * (b - a + 1));
  const sansa = (/** @type {number} */ p) => rnd() < p;
  const odaberi = (/** @type {readonly any[]} */ a) => a[Math.floor(rnd() * a.length)];
  const hex = (/** @type {number} */ n) => Array.from({ length: n }, () => Math.floor(rnd() * 16).toString(16)).join("");
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";
  const uuid7 = (/** @type {number} */ ms) => {
    const t = ms.toString(16).padStart(12, "0");
    return `${t.slice(0, 8)}-${t.slice(8)}-7${hex(3)}-${"89ab"[int(0, 3)]}${hex(3)}-${hex(12)}`;
  };
  const sid = () => "demo" + Array.from({ length: 18 }, () => B64[int(0, 63)]).join("");
  const javniIdevi = new Set();
  const javniId = () => {
    for (;;) {
      const id = Array.from({ length: 6 }, () => CROCKFORD[int(0, 31)]).join("");
      if (!javniIdevi.has(id)) return javniIdevi.add(id), id;
    }
  };
  const adresa = (/** @type {string} */ pref, /** @type {number} */ n) =>
    `0x${pref}${"0".repeat(40 - pref.length - 4)}${n.toString(16).padStart(4, "0")}`;
  const slug = (/** @type {string} */ s) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  /** @type {Map<string, string[]>} */
  const redovi = new Map();
  const upisi = (/** @type {string} */ tablica, /** @type {Record<string, unknown>} */ red) => {
    const kolone = Object.keys(red);
    const linija = `INSERT INTO ${tablica} (${kolone.join(", ")}) VALUES (${kolone.map((k) => lit(red[k])).join(", ")});`;
    redovi.set(tablica, [...(redovi.get(tablica) ?? []), linija]);
  };

  // Korisnici ---------------------------------------------------------------------------------
  const users = OSOBE.map(([ime, prezime], i) => {
    const t = SAD - (200 - i * 7) * DAN;
    const email = `${slug(ime)}.${slug(prezime)}@demo.invalid`;
    const u = { id: uuid7(t), email, display_name: `${ime} ${prezime}`, t };
    upisi("users", {
      id: u.id, email, display_name: u.display_name, first_name: ime, last_name: prezime,
      // S6: jedna osoba ima slug profila (`/hr/u/demo-marko`), ostale se otvaraju po id-u.
      slug: i === 1 ? "demo-marko" : null,
      about: i % 3 === 0 ? "Izmišljeni demo korisnik." : null, website: null, phone: null,
      country_code: "HR", avatar_file_id: null, locale: i === 8 ? "en" : "hr",
      platform_role: i === 9 ? "moderator" : "user", email_verified_at: t + SAT,
      created_at: t, updated_at: t, deleted_at: null,
    });
    upisi("auth_identities", { id: uuid7(t), user_id: u.id, provider: "email_link", subject: email, created_at: t, last_used_at: SAD - int(1, 20) * DAN });
    // Javni profil (S5): osoba 3 isključila je svih 9 prekidača (profil nije javan, 404);
    // osoba 1 prikazuje i ukupno prikupljeno, osoba 4 ne želi indeksiranje.
    const privatan = i === 3;
    upisi("user_settings", {
      user_id: u.id,
      ...(privatan
        ? { show_email: 0, show_avatar: 0, show_phone: 0, show_total_raised: 0, show_registered_date: 0,
            show_promoted: 0, show_owned: 0, show_donated: 0, show_for_organization: 0 }
        : {}),
      ...(i === 1 ? { show_total_raised: 1 } : {}),
      ...(i === 4 ? { indexable: 0 } : {}),
      updated_at: t,
    });
    return u;
  });
  const moderator = users[9];

  // Organizatori i organizacije ----------------------------------------------------------------
  const orgs = ORGANIZACIJE.map(([naziv, orgSlug, legalForm, holder, kat, grad, posta, vlasnik, clanovi], i) => {
    const t = SAD - (180 - i * 10) * DAN;
    const organizerId = uuid7(t);
    const safe = adresa("de5afe", i + 1);
    upisi("organizers", {
      id: organizerId, tenant_id: TENANT, holder_type: holder, legal_name: naziv, oib: null,
      address_line: `Ulica Primjera ${i + 1}`, city: grad, postal_code: posta, country_code: "HR",
      contact_email: `${orgSlug}@demo.invalid`, is_platform: 0, created_at: t, updated_at: t,
    });
    const orgId = uuid7(t);
    upisi("organizations", {
      id: orgId, organizer_id: organizerId, slug: orgSlug, kind: "legal", legal_form: legalForm,
      display_name: naziv, description: `${naziv} je izmišljena organizacija za demo prikaz platforme.`,
      website: null, social_links: [], logo_file_id: null, category_key: kat, safe_address: safe,
      safe_chain_id: LANAC, status: "active", is_fixed_beneficiary: legalForm === "zaklada" ? 1 : 0,
      created_at: t, updated_at: t, deleted_at: null,
    });
    upisi("memberships", { user_id: users[vlasnik].id, organization_id: orgId, role: "owner", invited_by: null, created_at: t, updated_at: t });
    for (const [c, uloga] of clanovi) {
      upisi("memberships", { user_id: users[c].id, organization_id: orgId, role: uloga, invited_by: users[vlasnik].id, created_at: t + DAN, updated_at: t + DAN });
    }
    upisi("verifications", {
      id: uuid7(t + SAT), kind: "org_kyb", subject_type: "organization", subject_id: orgId,
      // Sunčani krov (3) je još u pregledu: filtar `verified` u katalogu ima što isključiti (S5).
      status: i === 3 ? "in_review" : "approved",
      provider: "mock", provider_ref: `DEMO-KYB-${i + 1}`, trigger: "user", reason: null,
      requested_at: t + SAT, decided_at: i === 3 ? null : t + 2 * DAN, due_at: null,
    });
    return { organizerId, orgId, safe, vlasnik: users[vlasnik], naziv, t };
  });

  // Platitelji: hash IBAN-a (HMAC u produkciji), ponavljaju se među doprinosima.
  const platitelji = Array.from({ length: 40 }, (_, i) => ({
    hash: `demo${hex(60)}`,
    user: i < users.length ? users[i] : null,
    ime: i < users.length ? users[i].display_name : PODRZAVATELJI[i % PODRZAVATELJI.length],
    email: i < users.length ? users[i].email : `podrzavatelj-${String(i).padStart(2, "0")}@demo.invalid`,
  }));

  // Kampanje ------------------------------------------------------------------------------------
  // Checkouti i atribucije upisuju se tek nakon kasica i linkova (S5), da im se doda kasica/link
  // bez trošenja PRNG-a unutar petlje (ranije kampanje ostaju bajt-jednake).
  /** @type {Record<string, unknown>[]} */
  const checkouti = [];
  /** @type {Record<string, any>[]} */
  const atribucije = [];
  /** @type {Map<string, {idx: number, t: number, placen: boolean, checkoutId: string | null}>} */
  const doprinosMeta = new Map();
  /** @type {{id: string, publicId: string, t: number, autor: typeof users[number], org: typeof orgs[number], kraj: number}[]} */
  const kInfo = [];
  /** @type {string[]} */
  const prijaveModeracije = [];
  KAMPANJE.forEach((k, idx) => {
    const org = orgs[k.org];
    const autor = users[k.by];
    const state = k.state ?? "active";
    const t = SAD - (95 - idx * 3) * DAN - int(0, 20) * SAT;
    const id = uuid7(t);
    const ends = k.recurrence ? null
      : k.zavrsila ? SAD - k.zavrsila * DAN
      : k.rokZa ? SAD + k.rokZa * DAN
      : t + (k.dana ?? int(45, 120)) * DAN;
    const krajAktivnosti = k.zatvorena ? SAD - k.zatvorena * DAN
      : k.zavrsila ? SAD - k.zavrsila * DAN
      : k.obrisana ? SAD - k.obrisana * DAN
      : k.pauzirana ? SAD - k.pauzirana * DAN
      : k.blokirana ? SAD - k.blokirana * DAN
      : SAD - int(1, 30) * SAT;
    const azurirana = state === "active" && !k.pauzirana && !k.blokirana ? t + DAN : krajAktivnosti;
    const tierEur = k.tiers ? Math.min(...k.tiers.map((x) => x[1])) : null;

    upisi("campaigns", {
      id, tenant_id: TENANT, organizer_id: org.organizerId, slug: slug(k.title), type: k.type, vertical: "none",
      title: k.title, description: k.opis, goal_cents: k.goal === null ? null : k.goal * 100,
      min_contribution_cents: k.type === "donation" ? 100 : tierEur * 100, max_contributors: null, currency: "EUR",
      state, visibility: k.visibility ?? "public", mode: "byo", rails: "platform",
      starts_at: state === "draft" || state === "review" ? null : t, ends_at: ends,
      recurrence: k.recurrence ?? "none", cover_image_url: null, lat: null, lng: null,
      location_name: ORGANIZACIJE[k.org][5],
      surplus_intent: k.goal ? "Višak prikupljenog ide u redovni rad organizacije." : null,
      demo: 1, metadata: { demo: true }, created_by: autor.id, created_at: t, updated_at: azurirana,
      deleted_at: k.obrisana ? krajAktivnosti : null,
    });
    upisi("campaign_safes", {
      campaign_id: id, address: org.safe, chain_id: LANAC, threshold: 2,
      owners: [1, 2, 3].map((n) => adresa("de0e1", k.org * 3 + n)),
      platform_signer_count: 0, deployed_at: org.t + 3 * DAN,
      verified_at: state === "draft" ? null : t + SAT,
    });
    const publicId = javniId();
    kInfo.push({ id, publicId, t, autor, org, kraj: krajAktivnosti });
    upisi("campaign_settings", {
      campaign_id: id, public_id: publicId, kind: k.za ? "for_organization" : k.recurrence ? "recurring" : "one_time",
      category_key: k.cat, cover_theme: TEME[k.cat], created_by_user_id: autor.id,
      beneficiary_organization_id: k.za ? org.orgId : null,
      beneficiary_approved_at: k.za && state === "active" ? t + 2 * SAT : null,
      beneficiary_approved_by: k.za && state === "active" ? org.vlasnik.id : null,
      amount_presets: [2000, 5000, 10000, 30000, 50000], indexable: 1,
      hide_raised: k.hideRaised ? 1 : 0, hide_contributor_count: k.hideCount ? 1 : 0,
      contributions_sort: k.sort ?? "latest", comments_mode: k.komentari ?? "everyone",
      allow_moneyboxes: k.bezKasica ? 0 : 1, allow_external_offers: PONUDE.some((p) => p[0] === idx) ? 1 : 0,
      contribution_notifications: 1, thank_you_message: "Hvala na podršci! (demo)",
      purpose_verified: k.purpose ? 1 : 0,
      contributions_list: k.popisSkriven ? "hidden" : "visible",
      paused_at: k.pauzirana ? krajAktivnosti : null,
      blocked_at: k.blokirana ? krajAktivnosti : null,
      blocked_reason: k.blokirana ? "Privremena blokada do provjere prijave (demo)." : null,
      updated_at: azurirana,
    });
    if (k.purpose) {
      upisi("verifications", {
        id: uuid7(t + DAN), kind: "campaign_purpose", subject_type: "campaign", subject_id: id, status: "approved",
        provider: "mock", provider_ref: `DEMO-NAMJENA-${idx + 1}`, trigger: "threshold_campaign", reason: null,
        requested_at: t + DAN, decided_at: t + 5 * DAN, due_at: t + 15 * DAN,
      });
    }

    // Razine
    const tiers = (k.tiers ?? []).map(([naslov, eur, zaliha, opis], s) => ({
      id: uuid7(t), naslov, cents: eur * 100, zaliha, opis, s, prodano: 0,
    }));

    // Doprinosi
    const od = t + 2 * SAT;
    const vremena = Array.from({ length: k.n }, () => od + Math.floor(rnd() * (krajAktivnosti - od - SAT))).sort((a, b) => a - b);
    /** @type {{id: string, t: number, platitelj: typeof platitelji[number], poruka: string | null, anon: boolean}[]} */
    const placeni = [];
    const stat = { raised: 0, broj: 0, platitelji: new Set(), zadnji: /** @type {number | null} */ (null) };
    vremena.forEach((tc, j) => {
      const platitelj = sansa(0.25) ? odaberi(platitelji.slice(0, 10)) : platitelji[10 + ((idx * 7 + j * 3) % 30)];
      let stanje = state === "cancelled" ? "refunded" : "paid";
      if (stanje === "paid" && j >= 2) {
        const r = rnd();
        if (r < 0.06) stanje = "pending";
        else if (r < 0.1) stanje = "expired";
        else if (r < 0.12) stanje = "failed";
      }
      const tier = tiers.length ? odaberi(tiers) : null;
      const kolicina = tier && k.type === "tickets" ? int(1, 3) : 1;
      const iznos = tier ? tier.cents * kolicina
        : sansa(0.08) ? int(10, 40) * 2500
        : int(Math.ceil(k.eur[0] / 5), Math.floor(k.eur[1] / 5)) * 500;
      const placen = stanje === "paid" || stanje === "refunded";
      const cid = uuid7(tc);
      const paidAt = placen ? tc + int(1, 30) * 60_000 : null;
      if (stanje === "paid" && paidAt !== null) {
        stat.raised += iznos;
        stat.broj += 1;
        stat.platitelji.add(platitelj.hash);
        stat.zadnji = Math.max(stat.zadnji ?? 0, paidAt);
      }
      const preko = sansa(0.8) ? "checkout" : "campaign_qr";
      const s = preko === "checkout" ? sid() : null;
      const poruka = placen && sansa(0.4) ? odaberi(PORUKE) : null;
      const anon = sansa(0.2);
      if (placen && tier) tier.prodano += kolicina;
      upisi("contributions", {
        id: cid, campaign_id: id, tier_id: tier?.id ?? null, quantity: kolicina, amount_cents: iznos,
        amount_received_cents: placen ? iznos : null, currency: "EUR", state: stanje, payment_rail: "sepa",
        payment_intent_sid: s, monerium_order_id: preko === "campaign_qr" ? `demo-ord-${hex(12)}` : null,
        tx_hash: null, log_index: null, onchain_from: null, external_payment_ref: null,
        payer_iban_hash: platitelj.hash, underpaid: 0, created_at: tc,
        paid_at: paidAt, updated_at: tc + SAT,
      });
      const checkoutId = s ? uuid7(tc - 5 * 60_000) : null;
      if (s) {
        checkouti.push({
          id: checkoutId, campaign_id: id, contribution_sid: s, amount_cents: iznos,
          tip_cents: 0,
          intent_state: { paid: "paid", refunded: "paid", pending: "open", expired: "expired", failed: "rejected" }[stanje],
          user_id: platitelj.user?.id ?? null, email: platitelj.email,
          first_name: platitelj.ime.split(" ")[0], last_name: null, as_company: 0, company_name: null, company_oib: null,
          recurring_pledge_id: null, moneybox_id: null, tracking_link_id: null, share_link_id: null, offer_id: null,
          short_ref: null, expires_at: tc + 3 * DAN, created_at: tc - 5 * 60_000, updated_at: tc + SAT,
        });
      }
      if (!placen) return;
      upisi("contribution_profiles", {
        contribution_id: cid, anonymous: anon ? 1 : 0, display_name: anon ? null : platitelj.ime,
        display_name_verified: 0, message: poruka, message_hidden: 0, link_url: null, bank_verified: 1, updated_at: tc + SAT,
      });
      doprinosMeta.set(cid, { idx, t: tc, placen: stanje === "paid", checkoutId });
      atribucije.push({
        contribution_id: cid, checkout_id: checkoutId, user_id: platitelj.user?.id ?? null, moneybox_id: null,
        tracking_link_id: null, share_link_id: null, offer_id: null, amount_hidden: sansa(0.15) ? 1 : 0,
        show_message_as_comment: poruka && sansa(0.5) ? 1 : 0, source: preko,
      });
      if (stanje === "refunded") {
        upisi("refunds", {
          id: uuid7(krajAktivnosti + j * 60_000), contribution_id: cid, amount_cents: iznos, method: "bank_transfer",
          safe_tx_hash: null, bank_reference: `DEMO-POVRAT-${idx + 1}-${j + 1}`, status: "confirmed",
          recorded_by: org.vlasnik.id, created_at: krajAktivnosti + j * 60_000, confirmed_at: krajAktivnosti + DAN,
        });
      }
      placeni.push({ id: cid, t: tc, platitelj, poruka, anon });
    });

    for (const r of tiers) {
      upisi("campaign_tiers", {
        id: r.id, campaign_id: id, title: r.naslov, description: r.opis,
        kind: k.type === "tickets" ? "ticket" : k.type === "reward" ? "reward" : "none",
        price_cents: r.cents, inventory_total: r.zaliha, inventory_claimed: r.prodano,
        unit: k.type === "tickets" ? "ulaznica" : k.type === "membership" ? "članarina" : null,
        sort: r.s, sale_start: k.type === "tickets" ? t : null, sale_end: k.type === "tickets" ? ends : null,
        metadata: {}, created_at: t, updated_at: t,
      });
    }

    // Agregat: samo `paid` (refundirani i neplaćeni ne ulaze), kao batch u Workeru (docs/09).
    // Podržavatelj = različit payer_iban_hash.
    upisi("campaign_stats", {
      campaign_id: id, raised_cents: stat.raised, contribution_count: stat.broj,
      contributor_count: stat.platitelji.size, last_contribution_at: stat.zadnji, updated_at: stat.zadnji ?? t,
    });

    // Ažuriranja i komentari (samo kampanje koje su bile javne)
    if (state === "draft" || state === "review") return;
    const autorAzuriranja = k.za ? autor : org.vlasnik;
    const brojAzuriranja = int(0, 2) + (idx % 4 === 0 ? 1 : 0);
    /** @type {string[]} */
    const azuriranja = [];
    for (let a = 0; a < brojAzuriranja; a++) {
      const ta = t + (a + 1) * Math.floor((krajAktivnosti - t) / (brojAzuriranja + 1));
      const uid = uuid7(ta);
      azuriranja.push(uid);
      upisi("campaign_updates", {
        id: uid, campaign_id: id, author_id: autorAzuriranja.id,
        title: a === 0 ? "Prvi tjedan kampanje" : "Novosti s terena",
        body: a === 0
          ? `Hvala svima koji su podržali kampanju „${k.title}” u prvim danima. Javljamo se uskoro s prvim rezultatima.`
          : "Krenuli smo s prvim nabavama. Fotografije i račune objavit ćemo u sljedećem ažuriranju.",
        tier_id: null, published_at: ta, updated_at: ta, deleted_at: null,
      });
    }
    const brojKomentara = k.komentari === "off" ? 0 : int(0, 3);
    /** @type {string | null} */
    let prvi = null;
    for (let c = 0; c < brojKomentara; c++) {
      const tk = t + int(1, Math.max(1, Math.floor((krajAktivnosti - t) / SAT) - 1)) * SAT;
      const kid = uuid7(tk);
      const pisac = users[(idx + c * 3) % 9];
      const skriven = idx === 15 && c === 0;
      upisi("comments", {
        id: kid, campaign_id: id, update_id: c === 1 && azuriranja.length ? azuriranja[0] : null,
        parent_id: null, author_id: pisac.id, contribution_id: null,
        body: skriven ? "Ovaj komentar je sakriven jer je bio izvan teme (demo)." : odaberi(KOMENTARI),
        hidden_at: skriven ? tk + SAT : null, hidden_by: skriven ? org.vlasnik.id : null,
        created_at: tk, deleted_at: null,
      });
      if (c === 0) prvi = kid;
    }
    if (prvi && brojKomentara >= 2) {
      const tk = krajAktivnosti - 2 * SAT;
      upisi("comments", {
        id: uuid7(tk), campaign_id: id, update_id: null, parent_id: prvi, author_id: autorAzuriranja.id,
        contribution_id: null, body: "Hvala na pitanju, odgovorili smo u zadnjem ažuriranju.",
        hidden_at: null, hidden_by: null, created_at: tk, deleted_at: null,
      });
    }
    // Poruke iz checkouta prikazane kao komentar (show_message_as_comment)
    for (const p of placeni.filter((x) => x.poruka && k.komentari !== "off").slice(0, 2)) {
      upisi("comments", {
        id: uuid7(p.t + 60_000), campaign_id: id, update_id: null, parent_id: null,
        author_id: p.anon ? null : p.platitelj.user?.id ?? null, contribution_id: p.id, body: p.poruka,
        hidden_at: null, hidden_by: null, created_at: p.t + 60_000, deleted_at: null,
      });
    }

    if (k.blokirana) {
      const tr = krajAktivnosti - DAN;
      const rid = uuid7(tr);
      prijaveModeracije.push(rid);
      upisi("reports", {
        id: rid, target_type: "campaign", target_id: id, reason: "fraud",
        description: "Demo prijava: sumnjam da parcela nije u vlasništvu organizatora i da vrt neće biti napravljen.",
        reporter_user_id: users[8].id, reporter_email: null, phone: null, attachment_file_id: null,
        status: "in_review", created_at: tr, updated_at: krajAktivnosti,
      });
      upisi("moderation_decisions", {
        id: uuid7(krajAktivnosti), report_id: rid, target_type: "campaign", target_id: id, action: "block_campaign",
        statement: "Kampanja je privremeno blokirana dok organizator ne dostavi dokaz o pravu korištenja parcele (demo).",
        is_appeal: 0, decided_by: moderator.id, decided_at: krajAktivnosti,
      });
    }
  });

  // --- Javni dio (S5): kasice, linkovi za praćenje, posjeti, vanjske kampanje, praćenja, ponude ----
  // [kampanja, vlasnik, alias, naslov, cilj €, status]
  const KASICE = [
    [15, 4, "demo-macke-petra", "Petrina kasica za mačke", 300, "active"],
    [15, 7, "demo-josip-za-macke", "Josipov rođendan za mačke", 200, "active"],
    [0, 1, "demo-obroci-marko", "Ručak za susjede", 500, "active"],
    [12, 7, "demo-dresovi-juniori", "Dresovi za juniore", null, "active"],
    [18, 8, "demo-autobus-festival", "Autobus za festival", 1000, "active"],
    [25, 6, "demo-paketi-maja", "Majini paketi za samce", 400, "active"],
    [16, 4, "demo-kalendar-stara", "Stara kasica za kalendar", null, "disabled"],
  ];
  const kasice = KASICE.map(([ki, vl, alias, naslov, cilj, status]) => {
    const tm = kInfo[ki].t + 3 * DAN;
    const mid = uuid7(tm);
    upisi("moneyboxes", {
      id: mid, campaign_id: kInfo[ki].id, owner_user_id: users[vl].id, alias, title: naslov,
      description: `${users[vl].display_name} skuplja za kampanju preko svoje kasice (demo).`,
      goal_cents: cilj === null ? null : cilj * 100, cover_file_id: null, payment_notifications: 1,
      thank_you_message: null, status, created_at: tm, updated_at: status === "active" ? tm : SAD - 5 * DAN,
    });
    return { id: mid, ki, t: tm, status, alias };
  });
  // [kampanja, vlasnik, slug, oznaka, status]
  const LINKOVI = [
    [0, 2, "demo-obroci-fb", "Objava na društvenoj mreži", "active"],
    [15, 0, "demo-macke-insta", "Priča na Instagramu", "active"],
    [6, 5, "demo-elektrana-letak", "Letak u domu kulture", "active"],
    [12, 6, "demo-oprema-stari", "Stari plakat", "disabled"],
  ];
  const linkovi = LINKOVI.map(([ki, vl, lslug, oznaka, status]) => {
    const tl = kInfo[ki].t + 2 * DAN;
    const lid = uuid7(tl);
    upisi("tracking_links", {
      id: lid, campaign_id: kInfo[ki].id, owner_user_id: users[vl].id, slug: lslug, label: oznaka, status, created_at: tl,
    });
    return { id: lid, ki, t: tl, status, slug: lslug };
  });
  // Atribucija: svaki 3. plaćeni doprinos kroz checkout ide kasici (druga kasica iste kampanje uzima
  // pomak 1), svaki 4. linku; samo doprinosi nakon nastanka kasice/linka.
  /** @type {Map<number, number>} */
  const brojac = new Map();
  for (const a of atribucije) {
    const m = doprinosMeta.get(a.contribution_id);
    if (!m || !m.placen || !m.checkoutId) continue;
    const j = brojac.get(m.idx) ?? 0;
    brojac.set(m.idx, j + 1);
    const kas = kasice.filter((x) => x.ki === m.idx);
    const kasica = kas.find((x, slot) => j % 3 === slot && m.t > x.t);
    const link = linkovi.find((x) => x.ki === m.idx && j % 4 === 3 && m.t > x.t);
    if (kasica) a.moneybox_id = kasica.id;
    else if (link) a.tracking_link_id = link.id;
    const c = checkouti.find((x) => x.id === m.checkoutId);
    if (c) Object.assign(c, { moneybox_id: a.moneybox_id, tracking_link_id: a.tracking_link_id });
  }
  for (const c of checkouti) upisi("checkouts", c);
  for (const a of atribucije) upisi("contribution_attributions", a);

  // Posjeti: hash posjetitelja iz bazena (ponavljaju se), najviše jedan po satu po izvoru.
  const posjetitelji = Array.from({ length: 12 }, () => `demo${hex(28)}`);
  for (const izvor of [...linkovi.map((l) => ({ ...l, kolona: "tracking_link_id" })), ...kasice.map((x) => ({ ...x, kolona: "moneybox_id" }))]) {
    if (izvor.status !== "active") continue;
    const sati = new Set();
    const n = int(3, 8);
    while (sati.size < n) sati.add(int(1, Math.floor((SAD - izvor.t) / SAT) - 1));
    for (const h of [...sati].sort((a, b) => b - a)) {
      const tv = SAD - h * SAT;
      upisi("link_visits", {
        id: uuid7(tv), tracking_link_id: izvor.kolona === "tracking_link_id" ? izvor.id : null, share_link_id: null,
        moneybox_id: izvor.kolona === "moneybox_id" ? izvor.id : null, visitor_hash: odaberi(posjetitelji), visited_at: tv,
      });
    }
  }

  // Vanjske 4fund kampanje (tok 9, odluka 209): URL na rezerviranoj domeni .invalid, bez stvarnih poveznica.
  // [organizacija, naslov, kategorija, status]
  const VANJSKE = [
    [0, "Hrana za pse u skloništu tijekom zime", "animals", "active"],
    [2, "Topla zima za beskućnike", "charity", "active"],
    [1, "Nove nošnje za dječji ansambl", "culture", "pending"],
  ];
  const vanjske = VANJSKE.map(([oi, naslov, kat, status], i) => {
    const te = orgs[oi].t + (20 + i) * DAN;
    const eid = uuid7(te);
    const ext = `demo-${hex(8)}`;
    upisi("external_campaigns", {
      id: eid, organization_id: orgs[oi].orgId, platform: "4fund", external_id: ext,
      url: `https://4fund.invalid/${ext}`, title: naslov, image_url: null, category_key: kat,
      verify_code: `DEMO-VERIFY-${i + 1}`, status, verified_at: status === "active" ? te + DAN : null,
      created_at: te, updated_at: te + DAN,
    });
    return { id: eid, status };
  });

  // Praćenja (campaign_follows): [osoba, kampanja, komentari, novosti, kraj]
  const PRACENJA = [
    [1, 0, 1, 1, 1],
    [4, 15, 0, 1, 0],
    [6, 16, 0, 0, 1],
    [8, 25, 1, 1, 0],
  ];
  for (const [ui, ki, kom, nov, kraj] of PRACENJA) {
    upisi("campaign_follows", {
      user_id: users[ui].id, campaign_id: kInfo[ki].id, notify_comments: kom, notify_updates: nov, notify_end: kraj,
      confirmed_at: kInfo[ki].t + (ui + 1) * DAN, created_at: kInfo[ki].t + (ui + 1) * DAN,
    });
  }

  // Ponude (faza 2, samo UI)
  for (const [ki, naslov, nacin, eur, status, prodavatelj] of PONUDE) {
    const to = kInfo[ki].t + 4 * DAN;
    const oid = uuid7(to);
    upisi("offers", {
      id: oid, campaign_id: kInfo[ki].id, seller_user_id: users[prodavatelj].id, is_founder: 0, founder_status: null,
      title: naslov, description: "Prihod od ponude ide u kampanju (demo, nije u fazi 1).", mode: nacin,
      price_cents: eur * 100, quantity: 1, delivery: nacin === "auction" ? "in_person" : "post", status,
      ends_at: nacin === "auction" ? SAD + 10 * DAN : null, created_at: to, updated_at: to,
    });
    if (nacin === "auction") {
      [1, 2].forEach((ui, b) => upisi("offer_bids", {
        id: uuid7(to + (b + 1) * DAN), offer_id: oid, user_id: users[ui].id, amount_cents: (eur + 5 * (b + 1)) * 100,
        created_at: to + (b + 1) * DAN,
      }));
    }
  }

  const prvaKasica = kasice.find((x) => x.status === "active");
  const primjeri = {
    kampanja: {
      aktivna: kInfo[0].publicId,
      unlisted: kInfo[17].publicId,
      paused: kInfo[11].publicId,
      zavrsena: kInfo[10].publicId,
      rokIstekaoUspjesna: kInfo[24].publicId,
      uskoroZavrsava: kInfo[25].publicId,
      skrivenIznos: kInfo[4].publicId,
      skrivenBroj: kInfo[9].publicId,
      popisUplataSkriven: kInfo[25].publicId,
      komentariIskljuceni: kInfo[26].publicId,
      zaOrganizaciju: kInfo[1].publicId,
      mjesecna: kInfo[22].publicId,
      sPonudama: kInfo[16].publicId,
      review404: kInfo[2].publicId,
      draft404: kInfo[8].publicId,
      blokirana404: kInfo[21].publicId,
      obrisana404: kInfo[20].publicId,
    },
    korisnik: { javni: users[0].id, javniNeindeksiran: users[4].id, privatni404: users[3].id },
    organizacija: ORGANIZACIJE[0][1],
    organizacijaNeverificirana: ORGANIZACIJE[3][1],
    kasica: prvaKasica?.alias,
    kasicaNeaktivna404: kasice.find((x) => x.status !== "active")?.alias,
    linkZaPracenje: linkovi[0].slug,
    linkZaPracenjeNeaktivan404: linkovi.find((l) => l.status !== "active")?.slug,
    vanjska: vanjske.find((v) => v.status === "active")?.id,
    vanjskaNeaktivna404: vanjske.find((v) => v.status !== "active")?.id,
    pracenjeToken: tokenPracenja(users[PRACENJA[0][0]].id, kInfo[PRACENJA[0][1]].id),
    kategorija: "animals",
  };

  // Nacrt u čarobnjaku (odluka 211): red u campaigns još ne postoji.
  const tn = SAD - 2 * DAN;
  upisi("campaign_drafts", {
    id: uuid7(tn), user_id: users[3].id, source: "server", step: 2,
    data: { demo: true, title: "Klupe za park uz rijeku", category: "projects", goal_cents: 90000 },
    campaign_id: null, created_at: tn, updated_at: tn + SAT,
  });

  // --- S6: demo računi, sesije i tokeni (na kraju, da PRNG ne pomakne ništa iznad) ---------------
  // Organizator: Ivana (vlasnica Zaklade Svjetionik nade: active, KYB approved, is_fixed_beneficiary = 1,
  // organizator kampanje `kampanja.aktivna`). Moderator: Filip. Novi: račun bez organizacije i kampanja.
  const organizator = users[2];
  const orgOrganizatora = orgs[2];
  const tNovi = SAD - 3 * DAN;
  const novi = { id: uuid7(tNovi), email: "novi@demo.invalid" };
  upisi("users", {
    id: novi.id, email: novi.email, display_name: "Nova Korisnica", first_name: "Nova", last_name: "Korisnica",
    slug: null, about: null, website: null, phone: null, country_code: "HR", avatar_file_id: null, locale: "hr",
    platform_role: "user", email_verified_at: tNovi + 10 * 60_000, created_at: tNovi, updated_at: tNovi, deleted_at: null,
  });
  upisi("consents", {
    id: uuid7(tNovi), user_id: novi.id, email: null, kind: "terms_privacy", text_version: "uvjeti-2026-11", granted: 1, created_at: tNovi,
  });
  // Demo sesije: id = SHA-256(token), token je u primjeri.json. Rok 30 dana od SAD (kao kolačić).
  const tSes = SAD - 2 * SAT;
  for (const [u, token] of [[organizator, DEMO_TOKENI.sesijaOrganizator], [moderator, DEMO_TOKENI.sesijaModerator], [novi, DEMO_TOKENI.sesijaNovi]]) {
    const sesijaId = sha256(token);
    upisi("sessions", { id: sesijaId, user_id: u.id, created_at: tSes, expires_at: tSes + 30 * DAN, revoked_at: null });
    upisi("login_events", {
      id: uuid7(tSes), user_id: u.id, session_id: sesijaId, logged_in_at: tSes, last_activity_at: null,
      ip_prefix: "192.0.2.0/24", device: "demo seed",
    });
  }
  // Poveznica za prijavu (magic link) novog korisnika: red `login` s `action = 'link'`; istekla je, pa
  // stranica `/auth/link/{token}` pokazuje „istekla” (provjera ruta traži samo 200).
  upisi("one_time_codes", {
    id: uuid7(SAD - 30 * 60_000), user_id: novi.id, email: novi.email, purpose: "login", action: "link",
    code_hash: sha256(DEMO_TOKENI.poveznicaPrijave), attempts: 0, created_at: SAD - 30 * 60_000, expires_at: SAD - 25 * 60_000, used_at: null,
  });
  // Dodatna potvrda (P+e) organizatora: token rute `potvrda-radnje/{token}` je id reda.
  const potvrdaId = uuid7(SAD - 20 * 60_000);
  upisi("one_time_codes", {
    id: potvrdaId, user_id: organizator.id, email: organizator.email, purpose: "step_up", action: "close_campaign",
    code_hash: sha256(`${potvrdaId}:000000`), attempts: 0, created_at: SAD - 20 * 60_000, expires_at: SAD - 15 * 60_000, used_at: null,
  });
  // Pozivnica novoga u organizaciju organizatora (ruta `pozivnica/{token}`, token_hash = SHA-256 tokena).
  upisi("membership_invites", {
    id: uuid7(SAD - DAN), organization_id: orgOrganizatora.orgId, email: novi.email, role: "editor",
    token_hash: sha256(DEMO_TOKENI.pozivnica), status: "pending", invited_by: organizator.id,
    created_at: SAD - DAN, expires_at: SAD + 6 * DAN,
  });

  // --- S6 organizacija i moderacija (agent C): opet na kraju, da PRNG ne pomakne ništa iznad ----------
  // 1. Kampanja drugog korisnika (Maja) za Svjetionik koja čeka odobrenje: `/hr/o/demo-svjetionik/odobravanje`
  //    i e2e „organizacija odobri tuđu kampanju”. Druga takva (`review404`) ostaje za provjeru 404.
  const autorZaOdobrenje = users[6];
  const tO = SAD - 2 * DAN;
  const zaOdobrenje = { id: uuid7(tO), publicId: javniId() };
  const naslovZaOdobrenje = "Zimske jakne za djecu iz doma u Splitu";
  upisi("campaigns", {
    id: zaOdobrenje.id, tenant_id: TENANT, organizer_id: orgOrganizatora.organizerId, slug: slug(naslovZaOdobrenje), type: "donation",
    vertical: "none", title: naslovZaOdobrenje,
    description: "Skupljam za zakladu Svjetionik nade: trideset toplih jakni prije siječnja. Kampanja čeka odobrenje zaklade.",
    goal_cents: 120000, min_contribution_cents: 100, max_contributors: null, currency: "EUR", state: "review", visibility: "public",
    mode: "byo", rails: "platform", starts_at: null, ends_at: SAD + 60 * DAN, recurrence: "none", cover_image_url: null, lat: null,
    lng: null, location_name: "Split", surplus_intent: "Višak prikupljenog ide u redovni rad organizacije.", demo: 1,
    metadata: { demo: true }, created_by: autorZaOdobrenje.id, created_at: tO, updated_at: tO, deleted_at: null,
  });
  upisi("campaign_safes", {
    campaign_id: zaOdobrenje.id, address: orgOrganizatora.safe, chain_id: LANAC, threshold: 2,
    owners: [1, 2, 3].map((n) => adresa("de0e1", 2 * 3 + n)), platform_signer_count: 0, deployed_at: orgOrganizatora.t + 3 * DAN,
    verified_at: null,
  });
  upisi("campaign_settings", {
    campaign_id: zaOdobrenje.id, public_id: zaOdobrenje.publicId, kind: "for_organization", category_key: "charity",
    cover_theme: TEME.charity, created_by_user_id: autorZaOdobrenje.id, beneficiary_organization_id: orgOrganizatora.orgId,
    beneficiary_approved_at: null, beneficiary_approved_by: null, amount_presets: [2000, 5000, 10000, 30000, 50000], indexable: 1,
    hide_raised: 0, hide_contributor_count: 0, contributions_sort: "latest", comments_mode: "everyone", allow_moneyboxes: 1,
    allow_external_offers: 0, contribution_notifications: 1, thank_you_message: "Hvala na podršci! (demo)", purpose_verified: 0,
    contributions_list: "visible", paused_at: null, blocked_at: null, blocked_reason: null, updated_at: tO,
  });
  upisi("campaign_stats", {
    campaign_id: zaOdobrenje.id, raised_cents: 0, contribution_count: 0, contributor_count: 0, last_contribution_at: null, updated_at: tO,
  });

  // 2. Zahtjev Svjetionika (odobren, korak 5: prima kampanje drugih), da `/hr/o/demo-svjetionik/zahtjev` ima povijest.
  upisi("organization_applications", {
    id: uuid7(orgOrganizatora.t), organization_id: orgOrganizatora.orgId, submitted_by: organizator.id,
    project_description: "Prikupljamo za tople obroke, školski pribor i zimsku odjeću za djecu i starije u Splitu (demo).",
    expected_payments: "11-100", step: 5, status: "approved", reason: null, created_at: orgOrganizatora.t,
    updated_at: orgOrganizatora.t + 2 * DAN,
    representative: { ime: "Ivana", prezime: "Testić", funkcija: "predsjednica uprave", ovlast: true },
  });

  // 3. Organizacija na čekanju (Maja): `pending`, bez Safea, zahtjev poslan (korak 3), KYB `submitted` kod mocka.
  //    OIB je prazan: izmišljeni OIB s ispravnom kontrolnom znamenkom mogao bi pripadati stvarnoj osobi.
  const tP = SAD - 4 * DAN;
  const naCekanju = { organizerId: uuid7(tP), orgId: uuid7(tP), slug: "demo-zeleni-kvart", naziv: "Udruga Zeleni kvart Ogledni" };
  upisi("organizers", {
    id: naCekanju.organizerId, tenant_id: TENANT, holder_type: "association", legal_name: naCekanju.naziv, oib: null,
    address_line: "Ulica Primjera 6", city: "Zadar", postal_code: "23000", country_code: "HR",
    contact_email: `${naCekanju.slug}@demo.invalid`, is_platform: 0, created_at: tP, updated_at: tP,
  });
  upisi("organizations", {
    id: naCekanju.orgId, organizer_id: naCekanju.organizerId, slug: naCekanju.slug, kind: "legal", legal_form: "udruga",
    display_name: naCekanju.naziv, description: `${naCekanju.naziv} je izmišljena udruga za demo prikaz zahtjeva organizacije.`,
    website: "https://zeleni-kvart.invalid", social_links: [], logo_file_id: null, category_key: "projects", safe_address: null,
    safe_chain_id: null, status: "pending", is_fixed_beneficiary: 0, created_at: tP, updated_at: tP + SAT, deleted_at: null,
  });
  upisi("memberships", { user_id: autorZaOdobrenje.id, organization_id: naCekanju.orgId, role: "owner", invited_by: null, created_at: tP, updated_at: tP });
  upisi("organization_applications", {
    id: uuid7(tP), organization_id: naCekanju.orgId, submitted_by: autorZaOdobrenje.id,
    project_description: "Uređujemo zapuštene zelene površine u kvartu sa susjedima i školom; skupljamo za sadnice i alat (demo).",
    expected_payments: "1-10", step: 3, status: "submitted", reason: null, created_at: tP, updated_at: tP + SAT,
    representative: { ime: "Maja", prezime: "Skicić", funkcija: "predsjednica", ovlast: true },
  });
  upisi("verifications", {
    id: uuid7(tP + SAT), kind: "org_kyb", subject_type: "organization", subject_id: naCekanju.orgId, status: "submitted",
    provider: "mock", provider_ref: `MOCK-KYB-${naCekanju.slug}`, trigger: "user", reason: null, requested_at: tP + SAT,
    decided_at: null, due_at: null,
  });

  // 4. Istekla pozivnica u Svjetionik (stranica `pozivnica/{token}` pokazuje „istekla”).
  upisi("membership_invites", {
    id: uuid7(SAD - 10 * DAN), organization_id: orgOrganizatora.orgId, email: "bivsi.clan@demo.invalid", role: "viewer",
    token_hash: sha256(DEMO_TOKENI.pozivnicaIstekla), status: "pending", invited_by: organizator.id,
    created_at: SAD - 10 * DAN, expires_at: SAD - 3 * DAN,
  });

  // 5. Verifikacija namjene s poslanim dokumentima (`/admin/verifikacije`): kampanja `kampanja.aktivna`.
  const verifikacijaNamjene = uuid7(SAD - 4 * DAN);
  upisi("verifications", {
    id: verifikacijaNamjene, kind: "campaign_purpose", subject_type: "campaign", subject_id: kInfo[0].id, status: "submitted",
    provider: "platform", provider_ref: "DEMO-NAMJENA-PREGLED", trigger: "threshold_campaign", reason: null,
    requested_at: SAD - 4 * DAN, decided_at: null, due_at: SAD + 10 * DAN,
  });

  // 6. Nova DSA prijava (`received`) za red prijava, bez prijavljenog korisnika (samo e-pošta).
  const prijavaNova = uuid7(SAD - 6 * SAT);
  upisi("reports", {
    id: prijavaNova, target_type: "campaign", target_id: kInfo[3].id, reason: "spam",
    description: "Demo prijava: istu objavu o koncertu dobivam porukama s više nepoznatih brojeva, izgleda kao neželjena pošta.",
    reporter_user_id: null, reporter_email: "zabrinuti.gradanin@demo.invalid", phone: null, attachment_file_id: null,
    status: "received", created_at: SAD - 6 * SAT, updated_at: SAD - 6 * SAT,
  });
  primjeri.kampanja.zaOdobrenje404 = zaOdobrenje.publicId;

  Object.assign(primjeri, {
    demoSad,
    demoRacuni: { organizator: organizator.email, moderator: moderator.email, novi: novi.email },
    demoSesija: DEMO_TOKENI.sesijaOrganizator,
    demoSesijaModerator: DEMO_TOKENI.sesijaModerator,
    demoSesijaNovi: DEMO_TOKENI.sesijaNovi,
    organizacijaOrganizatora: ORGANIZACIJE[2][1],
    poveznicaPrijave: DEMO_TOKENI.poveznicaPrijave,
    potvrdaRadnje: potvrdaId,
    pozivnica: DEMO_TOKENI.pozivnica,
    prijavaModeracije: prijaveModeracije[0],
    korisnikSlug: "demo-marko",
    organizacijaNaCekanju: naCekanju.slug,
    pozivnicaIstekla: DEMO_TOKENI.pozivnicaIstekla,
    verifikacijaNamjene,
    prijavaNova,
  });

  // --- Ispis ------------------------------------------------------------------------------------
  const red = tabliceRedomOvisnosti();
  const nepoznate = [...redovi.keys()].filter((t) => !red.includes(t));
  if (nepoznate.length) throw new Error(`tablice nisu u migracijama: ${nepoznate.join(", ")}`);
  const brisanje = [...red].reverse().filter((t) => t !== "categories");
  const out = [
    `-- DEMO_SAD=${demoSad}`,
    "-- GENERIRANO: ne uređivati ručno. Izvor: scripts/seed.mjs (npm run db:gen-seed).",
    "-- Izmišljeni demo podaci (campaigns.demo = 1, e-pošta @demo.invalid). Nikakvi stvarni ljudi ni tvrtke.",
    "-- Reset: briše SVE tablice osim categories (referentni podaci iz 0003), pa upisuje seed.",
    "",
    ...brisanje.map((t) => `DELETE FROM ${t};`),
    "",
  ];
  for (const t of red) {
    const r = redovi.get(t);
    if (!r) continue;
    out.push(`-- ${t} (${r.length})`, ...r, "");
  }
  return { sql: out.join("\n"), primjeri };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { sql, primjeri } = generiraj(sadSeeda());
  if (process.argv.includes("--stdout")) process.stdout.write(sql);
  else {
    mkdirSync(dirname(SEED_PATH), { recursive: true });
    writeFileSync(SEED_PATH, sql);
    writeFileSync(PRIMJERI_PATH, `${JSON.stringify(primjeri, null, 2)}\n`);
    console.log(`Zapisano ${SEED_PATH} (${sql.split("\n").filter((l) => l.startsWith("INSERT")).length} redaka, DEMO_SAD=${primjeri.demoSad}) i ${PRIMJERI_PATH}`);
  }
}
