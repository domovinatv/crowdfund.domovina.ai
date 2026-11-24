#!/usr/bin/env node
// Generira seed/demo.sql: izmišljene demo kampanje za lokalni razvoj i testove (S4).
//
// Odluke ove skripte:
//  - DETERMINIZAM: fiksni PRNG (mulberry32, sjeme SJEME), fiksni „sad” (SAD) i UUIDv7 čiji je
//    vremenski dio vrijeme zapisa, a slučajni dio iz istog PRNG-a. Isti ulaz = isti bajtovi, pa
//    je diff stabilan; test uspoređuje datoteku s demoSql().
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
// Upotreba: npm run db:gen-seed   (piše seed/demo.sql)
//           node scripts/seed.mjs --stdout
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const SEED_PATH = join(ROOT, "seed", "demo.sql");

const SJEME = 20261124;
const SAD = Date.UTC(2026, 10, 20, 9, 0, 0); // 2026-11-20 09:00 UTC
const SAT = 3_600_000;
const DAN = 24 * SAT;
const TENANT = "sbx-crowdfund-demo";
const LANAC = 10200;

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
  for (const m of sql.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\n\);/g)) {
    const refs = new Set([...m[2].matchAll(/REFERENCES (\w+)\(/g)].map((r) => r[1]));
    refs.delete(m[1]);
    ovisi.set(m[1], refs);
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

/** Cijeli sadržaj seed/demo.sql (deterministički). */
export function demoSql() {
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
      about: i % 3 === 0 ? "Izmišljeni demo korisnik." : null, website: null, phone: null,
      country_code: "HR", avatar_file_id: null, locale: i === 8 ? "en" : "hr",
      platform_role: i === 9 ? "moderator" : "user", email_verified_at: t + SAT,
      created_at: t, updated_at: t, deleted_at: null,
    });
    upisi("auth_identities", { id: uuid7(t), user_id: u.id, provider: "email_link", subject: email, created_at: t, last_used_at: SAD - int(1, 20) * DAN });
    upisi("user_settings", { user_id: u.id, updated_at: t });
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
      id: uuid7(t + SAT), kind: "org_kyb", subject_type: "organization", subject_id: orgId, status: "approved",
      provider: "mock", provider_ref: `DEMO-KYB-${i + 1}`, trigger: "user", reason: null,
      requested_at: t + SAT, decided_at: t + 2 * DAN, due_at: null,
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
  KAMPANJE.forEach((k, idx) => {
    const org = orgs[k.org];
    const autor = users[k.by];
    const state = k.state ?? "active";
    const t = SAD - (95 - idx * 3) * DAN - int(0, 20) * SAT;
    const id = uuid7(t);
    const ends = k.recurrence ? null : t + (k.dana ?? int(45, 120)) * DAN;
    const krajAktivnosti = k.zatvorena ? SAD - k.zatvorena * DAN
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
    upisi("campaign_settings", {
      campaign_id: id, public_id: javniId(), kind: k.za ? "for_organization" : k.recurrence ? "recurring" : "one_time",
      category_key: k.cat, cover_theme: TEME[k.cat], created_by_user_id: autor.id,
      beneficiary_organization_id: k.za ? org.orgId : null,
      beneficiary_approved_at: k.za && state === "active" ? t + 2 * SAT : null,
      beneficiary_approved_by: k.za && state === "active" ? org.vlasnik.id : null,
      amount_presets: [2000, 5000, 10000, 30000, 50000], indexable: 1,
      hide_raised: k.hideRaised ? 1 : 0, hide_contributor_count: k.hideCount ? 1 : 0,
      contributions_sort: "latest", comments_mode: "everyone", allow_moneyboxes: 1, allow_external_offers: 0,
      contribution_notifications: 1, thank_you_message: "Hvala na podršci! (demo)",
      purpose_verified: k.purpose ? 1 : 0,
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
        upisi("checkouts", {
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
      upisi("contribution_attributions", {
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
    const brojKomentara = int(0, 3);
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
    for (const p of placeni.filter((x) => x.poruka).slice(0, 2)) {
      upisi("comments", {
        id: uuid7(p.t + 60_000), campaign_id: id, update_id: null, parent_id: null,
        author_id: p.anon ? null : p.platitelj.user?.id ?? null, contribution_id: p.id, body: p.poruka,
        hidden_at: null, hidden_by: null, created_at: p.t + 60_000, deleted_at: null,
      });
    }

    if (k.blokirana) {
      const tr = krajAktivnosti - DAN;
      const rid = uuid7(tr);
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

  // Nacrt u čarobnjaku (odluka 211): red u campaigns još ne postoji.
  const tn = SAD - 2 * DAN;
  upisi("campaign_drafts", {
    id: uuid7(tn), user_id: users[3].id, source: "server", step: 2,
    data: { demo: true, title: "Klupe za park uz rijeku", category: "projects", goal_cents: 90000 },
    campaign_id: null, created_at: tn, updated_at: tn + SAT,
  });

  // --- Ispis ------------------------------------------------------------------------------------
  const red = tabliceRedomOvisnosti();
  const nepoznate = [...redovi.keys()].filter((t) => !red.includes(t));
  if (nepoznate.length) throw new Error(`tablice nisu u migracijama: ${nepoznate.join(", ")}`);
  const brisanje = [...red].reverse().filter((t) => t !== "categories");
  const out = [
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
  return out.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const sql = demoSql();
  if (process.argv.includes("--stdout")) process.stdout.write(sql);
  else {
    mkdirSync(dirname(SEED_PATH), { recursive: true });
    writeFileSync(SEED_PATH, sql);
    console.log(`Zapisano ${SEED_PATH} (${sql.split("\n").filter((l) => l.startsWith("INSERT")).length} redaka)`);
  }
}
