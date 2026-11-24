/**
 * Tekstovi javnog dijela S5: naslovnica, katalozi, profili osobe i organizacije, vanjska kampanja.
 * Oblik `{ hr, en }` (uzor `tipovi.ts`); test drži iste ključeve u oba jezika i copy „doprinosi” / „donira” (odluka 13).
 * Tekstovi su naši; 4fundov javni pregled (§8.1, §8.2, §8.4) služi samo kao popis funkcija (odluka 3).
 * `{n}`, `{m}`, `{ime}`, `{datum}`, `{iznos}` pogled zamjenjuje vrijednostima.
 */
import type { KljucRute } from "../../lib/rute";
import type { Dvojezicno } from "./tipovi";

export interface VrstaNaslovnice {
  vrsta: "one_time" | "recurring" | "for_organization";
  naslov: string;
  opis: string;
  katalog: string;
  vise: { kljuc: KljucRute; tekst: string };
}

export const NASLOVNICA: Dvojezicno<{
  naslov: string;
  uvod: string;
  pokreni: string;
  pregledaj: string;
  vrsteNaslov: string;
  vrste: VrstaNaslovnice[];
  izborNaslov: string;
  izborKriterij: string;
  izborVeza: string;
  brojaciNaslov: string;
  brojaciNapomena: string;
  kategorijeNaslov: string;
  aktivneNaslov: string;
  sveKampanje: string;
  praznoNaslov: string;
  praznoTekst: string;
}> = {
  hr: {
    naslov: "Prikupljajte zajedno, izravno na račun organizacije",
    uvod:
      "Udruge, zaklade i ustanove ovdje vode kampanje, a podržavatelji doniraju SEPA uplatom ili QR kodom. Novac ide ravno na račun organizacije; platforma ga nikad ne drži i ne uzima proviziju.",
    pokreni: "Pokreni kampanju",
    pregledaj: "Pregledaj kampanje",
    vrsteNaslov: "Tri vrste kampanje",
    vrste: [
      {
        vrsta: "one_time",
        naslov: "Jednokratna",
        opis: "Organizacija prikuplja za jasan cilj do zadanog roka: opremu, obnovu, putovanje ili hitnu pomoć.",
        katalog: "Jednokratne kampanje",
        vise: { kljuc: "how-it-works", tekst: "Kako radi prikupljanje" },
      },
      {
        vrsta: "recurring",
        naslov: "Mjesečna",
        opis: "Stalna podrška radu organizacije. Podržavatelj svaki mjesec dobije podsjetnik s QR kodom ili sam postavi trajni nalog u banci.",
        katalog: "Mjesečne kampanje",
        vise: { kljuc: "monthly", tekst: "Kako rade mjesečne" },
      },
      {
        vrsta: "for_organization",
        naslov: "Za organizaciju",
        opis: "Bilo tko može prikupljati u korist organizacije, na primjer umjesto rođendanskih poklona. Organizacija odobri kampanju, a novac ide izravno njoj.",
        katalog: "Kampanje za organizacije",
        vise: { kljuc: "for-organisations", tekst: "Kako radi kampanja za organizaciju" },
      },
    ],
    izborNaslov: "Izdvojene kampanje",
    izborKriterij:
      "Izdvajamo pravilom, nikad za novac: kampanja je aktivna, organizacija je verificirana i opis nije prazan, a redom idu po prikupljenom iznosu.",
    izborVeza: "Pravila prikaza",
    brojaciNaslov: "Platforma u brojkama",
    brojaciNapomena: "Brojke se računaju iz evidencije plaćenih doprinosa. U prototipu su to demo podaci.",
    kategorijeNaslov: "Kategorije",
    aktivneNaslov: "Najnovije aktivne kampanje",
    sveKampanje: "Sve kampanje",
    praznoNaslov: "Još nema aktivnih kampanja",
    praznoTekst: "Kad organizacija objavi prvu kampanju, pojavit će se ovdje.",
  },
  en: {
    naslov: "Raise funds together, straight into the organisation's account",
    uvod:
      "Associations, foundations and institutions run campaigns here, and supporters donate by SEPA transfer or QR code. The money goes straight to the organisation's account; the platform never holds it and takes no fee.",
    pokreni: "Start a campaign",
    pregledaj: "Browse campaigns",
    vrsteNaslov: "Three kinds of campaign",
    vrste: [
      {
        vrsta: "one_time",
        naslov: "One-off",
        opis: "An organisation raises money for a clear goal by a set date: equipment, renovation, a trip or emergency help.",
        katalog: "One-off campaigns",
        vise: { kljuc: "how-it-works", tekst: "How fundraising works" },
      },
      {
        vrsta: "recurring",
        naslov: "Monthly",
        opis: "Ongoing support for an organisation's work. Each month the supporter gets a reminder with a QR code, or sets up a standing order at their bank.",
        katalog: "Monthly campaigns",
        vise: { kljuc: "monthly", tekst: "How monthly campaigns work" },
      },
      {
        vrsta: "for_organization",
        naslov: "For an organisation",
        opis: "Anyone can raise money for an organisation, for example instead of birthday presents. The organisation approves the campaign and the money goes straight to it.",
        katalog: "Campaigns for organisations",
        vise: { kljuc: "for-organisations", tekst: "How a campaign for an organisation works" },
      },
    ],
    izborNaslov: "Featured campaigns",
    izborKriterij:
      "We feature by rule, never for money: the campaign is active, the organisation is verified and the description is not empty, ordered by amount raised.",
    izborVeza: "Ranking rules",
    brojaciNaslov: "The platform in numbers",
    brojaciNapomena: "The figures come from the record of paid contributions. In the prototype they are demo data.",
    kategorijeNaslov: "Categories",
    aktivneNaslov: "Newest active campaigns",
    sveKampanje: "All campaigns",
    praznoNaslov: "No active campaigns yet",
    praznoTekst: "When an organisation publishes its first campaign, it will appear here.",
  },
};

export const KATALOG: Dvojezicno<{
  naslov: string;
  uvod: string;
  opis: string;
  rezultati: string;
  stranicaNaslova: string;
  praznoNaslov: string;
  praznoTekst: string;
  ocisti: string;
  izvanNaslov: string;
  izvanTekst: string;
  naPrvu: string;
}> = {
  hr: {
    naslov: "Kampanje",
    uvod: "Aktivne kampanje organizacija. Doprinos ide izravno na račun organizacije, platforma novac ne drži.",
    opis: "Pretražite aktivne kampanje udruga, zaklada i ustanova po kategoriji, vrsti i mjestu.",
    rezultati: "Rezultati",
    stranicaNaslova: "stranica {n}",
    praznoNaslov: "Nema kampanja za ove uvjete",
    praznoTekst: "Pokušajte s drugim pojmom ili s manje filtara.",
    ocisti: "Očisti filtre",
    izvanNaslov: "Stranica {n} ne postoji",
    izvanTekst: "Zadnja stranica rezultata za ove uvjete je {m}.",
    naPrvu: "Na prvu stranicu",
  },
  en: {
    naslov: "Campaigns",
    uvod: "Active campaigns run by organisations. Your contribution goes straight to the organisation's account; the platform never holds the money.",
    opis: "Search active campaigns by associations, foundations and institutions by category, type and place.",
    rezultati: "Results",
    stranicaNaslova: "page {n}",
    praznoNaslov: "No campaigns match these conditions",
    praznoTekst: "Try another search term or fewer filters.",
    ocisti: "Clear filters",
    izvanNaslov: "Page {n} does not exist",
    izvanTekst: "The last page of results for these conditions is {m}.",
    naPrvu: "Go to the first page",
  },
};

export const ORGANIZACIJE: Dvojezicno<{
  naslov: string;
  uvod: string;
  opis: string;
  filtar: string;
  sve: string;
  praznoNaslov: string;
  praznoTekst: string;
  izvanNaslov: string;
  naPrvu: string;
  ctaNaslov: string;
  ctaTekst: string;
  ctaGumb: string;
}> = {
  hr: {
    naslov: "Organizacije",
    uvod: "Udruge, zaklade i ustanove koje prikupljaju na platformi. Svaka ima vlastiti račun, pa doprinosi idu izravno njoj.",
    opis: "Popis organizacija koje vode kampanje, s filtrom po kategoriji.",
    filtar: "Kategorija organizacije",
    sve: "Sve",
    praznoNaslov: "Nema organizacija u ovoj kategoriji",
    praznoTekst: "Odaberite drugu kategoriju ili pogledajte sve organizacije.",
    izvanNaslov: "Stranica {n} ne postoji",
    naPrvu: "Na prvu stranicu",
    ctaNaslov: "Želite pomoći organizaciji koja vam je važna?",
    ctaTekst: "Pokrenite kampanju u njezinu korist. Organizacija je odobri prije objave, a novac ide ravno na njezin račun.",
    ctaGumb: "Pokreni kampanju za organizaciju",
  },
  en: {
    naslov: "Organisations",
    uvod: "Associations, foundations and institutions raising funds on the platform. Each has its own account, so contributions go straight to it.",
    opis: "A list of organisations running campaigns, filterable by category.",
    filtar: "Organisation category",
    sve: "All",
    praznoNaslov: "No organisations in this category",
    praznoTekst: "Pick another category or see all organisations.",
    izvanNaslov: "Page {n} does not exist",
    naPrvu: "Go to the first page",
    ctaNaslov: "Want to help an organisation that matters to you?",
    ctaTekst: "Start a campaign for it. The organisation approves it before it goes live, and the money goes straight to its account.",
    ctaGumb: "Start a campaign for an organisation",
  },
};

export const PROFIL_OSOBE: Dvojezicno<{
  bezImena: string;
  opis: string;
  odDatuma: string;
  ukupno: string;
  eposta: string;
  telefon: string;
  web: string;
  vlastite: string;
  zaOrganizacije: string;
  podrzane: string;
  promovirane: string;
  promoviraneNapomena: string;
  prazno: string;
  prijavi: string;
}> = {
  hr: {
    bezImena: "Profil korisnika",
    opis: "Javni profil korisnika platforme i njegove javne kampanje.",
    odDatuma: "Na platformi od {datum}",
    ukupno: "Prikupljeno na njegovim kampanjama: {iznos}",
    eposta: "E-pošta",
    telefon: "Telefon",
    web: "Web",
    vlastite: "Kampanje",
    zaOrganizacije: "Kampanje za organizacije",
    podrzane: "Podržane kampanje",
    promovirane: "Promovira",
    promoviraneNapomena: "Kampanje za koje ima kasicu ili vlastiti link za dijeljenje.",
    prazno: "Ovdje još nema javnih kampanja.",
    prijavi: "Prijavi profil",
  },
  en: {
    bezImena: "User profile",
    opis: "A platform user's public profile and their public campaigns.",
    odDatuma: "On the platform since {datum}",
    ukupno: "Raised on their campaigns: {iznos}",
    eposta: "Email",
    telefon: "Phone",
    web: "Website",
    vlastite: "Campaigns",
    zaOrganizacije: "Campaigns for organisations",
    podrzane: "Supported campaigns",
    promovirane: "Promotes",
    promoviraneNapomena: "Campaigns they have a moneybox or their own sharing link for.",
    prazno: "No public campaigns here yet.",
    prijavi: "Report profile",
  },
};

export const PROFIL_ORGANIZACIJE: Dvojezicno<{
  verificirana: string;
  neverificirana: string;
  neverificiranaTekst: string;
  oOrganizaciji: string;
  web: string;
  mreze: string;
  osobni: string;
  kamoNovac: string;
  kamoNovacTekst: string;
  mreza: string;
  kampanje: string;
  kampanjePrazno: string;
  vanjske: string;
  vanjskeUvod: string;
  ctaNaslov: string;
  ctaTekst: string;
  ctaGumb: string;
  prijavi: string;
  oblici: Record<string, string>;
}> = {
  hr: {
    verificirana: "Verificirana organizacija",
    neverificirana: "Nije verificirana",
    neverificiranaTekst: "Organizacija još nije prošla provjeru podataka i ovlaštenih osoba.",
    oOrganizaciji: "O organizaciji",
    web: "Web",
    mreze: "Društvene mreže",
    osobni: "Osobni profil prikupljanja",
    kamoNovac: "Kamo ide novac",
    kamoNovacTekst:
      "Doprinosi idu izravno na račun organizacije (Safe {adresa}). Platforma novac ne drži i ne može ga premjestiti.",
    mreza: "mreža {n}",
    kampanje: "Kampanje",
    kampanjePrazno: "Organizacija trenutno nema javnih kampanja.",
    vanjske: "Kampanje na drugim platformama",
    vanjskeUvod: "Organizacija ih vodi izvan ove platforme; doprinos se uplaćuje na njihovoj stranici.",
    ctaNaslov: "Prikupite za {ime}",
    ctaTekst: "Pokrenite kampanju u korist ove organizacije. Ona je odobri prije objave, a novac ide ravno na njezin račun.",
    ctaGumb: "Pokreni kampanju za ovu organizaciju",
    prijavi: "Prijavi organizaciju",
    oblici: { udruga: "Udruga", zaklada: "Zaklada", ustanova: "Ustanova", fundacija: "Fundacija", zadruga: "Zadruga" },
  },
  en: {
    verificirana: "Verified organisation",
    neverificirana: "Not verified",
    neverificiranaTekst: "The organisation has not yet passed the check of its details and authorised persons.",
    oOrganizaciji: "About the organisation",
    web: "Website",
    mreze: "Social media",
    osobni: "Personal fundraising profile",
    kamoNovac: "Where the money goes",
    kamoNovacTekst:
      "Contributions go straight to the organisation's account (Safe {adresa}). The platform never holds the money and cannot move it.",
    mreza: "network {n}",
    kampanje: "Campaigns",
    kampanjePrazno: "The organisation has no public campaigns right now.",
    vanjske: "Campaigns on other platforms",
    vanjskeUvod: "The organisation runs these outside this platform; you contribute on their page.",
    ctaNaslov: "Raise funds for {ime}",
    ctaTekst: "Start a campaign for this organisation. It approves the campaign before it goes live, and the money goes straight to its account.",
    ctaGumb: "Start a campaign for this organisation",
    prijavi: "Report organisation",
    oblici: { udruga: "Association", zaklada: "Foundation", ustanova: "Institution", fundacija: "Foundation", zadruga: "Cooperative" },
  },
};

export const VANJSKA: Dvojezicno<{
  natrag: string;
  opis: string;
  tekst4fund: string;
  tekstOstalo: string;
  potvrdeno: string;
  iznos: string;
  gumb4fund: string;
  gumbOstalo: string;
  novaKartica: string;
  organizacija: string;
}> = {
  hr: {
    natrag: "Profil organizacije {ime}",
    opis: "Kampanja organizacije {ime} na vanjskoj platformi.",
    tekst4fund:
      "Ovu kampanju {ime} vodi na platformi 4fund. Doprinos se uplaćuje na njihovoj stranici, prema njihovim uvjetima i troškovima. Ovdje je navedena jer ju je organizacija povezala sa svojim profilom.",
    tekstOstalo:
      "Ovu kampanju {ime} vodi na drugoj platformi. Doprinos se uplaćuje na njezinoj stranici, prema njezinim uvjetima i troškovima.",
    potvrdeno: "Organizacija je {datum} potvrdila da je kampanja njezina.",
    iznos: "Prikupljeni iznos ne prikazujemo jer se vodi na vanjskoj platformi.",
    gumb4fund: "Podrži na 4fundu",
    gumbOstalo: "Podrži na vanjskoj stranici",
    novaKartica: "otvara se u novoj kartici",
    organizacija: "Organizacija",
  },
  en: {
    natrag: "{ime} profile",
    opis: "A campaign by {ime} on an external platform.",
    tekst4fund:
      "{ime} runs this campaign on 4fund. You contribute on their page, under their terms and fees. It is listed here because the organisation linked it to its profile.",
    tekstOstalo: "{ime} runs this campaign on another platform. You contribute on its page, under its terms and fees.",
    potvrdeno: "On {datum} the organisation confirmed that the campaign is its own.",
    iznos: "We do not show the amount raised because it is kept on the external platform.",
    gumb4fund: "Support on 4fund",
    gumbOstalo: "Support on the external page",
    novaKartica: "opens in a new tab",
    organizacija: "Organisation",
  },
};

/** Zamjena `{kljuc}` u tekstu. */
export const umetni = (tekst: string, v: Record<string, string | number>): string =>
  tekst.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));
