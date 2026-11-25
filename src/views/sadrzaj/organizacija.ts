/**
 * Organizacija (S6, tok 2, ekrani 20 i 26, odluke 150 i 202): zahtjev u 5 koraka, stanje zahtjeva i KYB-a, Safe,
 * postavke, članovi i pozivnice, odobravanje tuđih kampanja, kampanje organizacije i vanjske 4fund kampanje.
 * `{n}`, `{ukupno}`, `{datum}`, `{email}`, `{uloga}`, `{organizacija}`, `{dana}` popunjava pogled. Tekstovi su naši.
 */
import type { Dvojezicno } from "./tipovi";

type Uloge = Record<"owner" | "admin" | "editor" | "viewer", string>;

export interface TekstoviOrganizacije {
  uloge: Uloge;
  opisUloga: Uloge;
  statusOrganizacije: Record<"pending" | "active" | "suspended" | "closed", string>;
  statusZahtjeva: Record<"draft" | "submitted" | "approved" | "rejected", string>;
  statusVerifikacije: Record<"requested" | "submitted" | "in_review" | "approved" | "rejected" | "expired", string>;
  stanjeKampanje: Record<"draft" | "review" | "active" | "funded" | "closed" | "cancelled" | "paused" | "blocked", string>;
  oblici: Record<"udruga" | "zaklada" | "ustanova" | "vjerska_zajednica" | "zadruga" | "jls" | "doo" | "obrt" | "osoba", string>;
  uplate: Record<"1-10" | "11-100" | "101-1000" | ">1000", string>;
  greske: Record<string, string>;
  nav: { naslov: string; profil: string; zahtjev: string; postavke: string; clanovi: string; odobravanje: string; kampanje: string; vanjske: string };
  opce: { spremi: string; spremljeno: string; natrag: string; nastavi: string; odustani: string; bezOpisa: string; demo: string; mock: string; obavezno: string; neobavezno: string };
  carobnjak: {
    naslov: string;
    uvod: string;
    korak: string;
    koraci: Record<"details" | "representative" | "project" | "kyb" | "review", string>;
    opisiKoraka: Record<"details" | "representative" | "project" | "kyb" | "review", string>;
    zapocni: string;
    nastaviNacrt: string;
    nacrtPostoji: string;
    mojeOrganizacije: string;
    otvoriZahtjev: string;
    nemaNacrta: string;
    naPrviKorak: string;
    spremiNastavi: string;
    spremljenoNaRacunu: string;
    fizickeOsobe: string;
    polja: {
      naziv: string;
      slug: string;
      slugPomoc: string;
      pravniOblik: string;
      odaberi: string;
      oib: string;
      oibPomoc: string;
      web: string;
      mreze: string;
      mrezePomoc: string;
      opis: string;
      kategorija: string;
      bezKategorije: string;
      adresa: string;
      grad: string;
      postanski: string;
      ime: string;
      prezime: string;
      funkcija: string;
      funkcijaPomoc: string;
      ovlast: string;
      opisProjekta: string;
      opisProjektaPomoc: string;
      ocekivaneUplate: string;
    };
    zastupnikUvod: string;
    kybUvod: string;
    kybStavke: string[];
    kybPrivola: string;
    pregledUvod: string;
    uvjetiPrije: string;
    uvjeti: string;
    uvjetiI: string;
    privatnost: string;
    posalji: string;
    uredi: string;
    nedovrseno: string;
  };
  zahtjev: {
    naslov: string;
    brojac: string;
    koraci: Record<"1" | "2" | "3" | "4" | "5", { naslov: string; opis: string }>;
    gotovo: string;
    uTijeku: string;
    ceka: string;
    kyb: string;
    pruzatelj: string;
    zatrazeno: string;
    odluceno: string;
    razlog: string;
    odlukaKodModeratora: string;
    ponovno: string;
    nastaviNacrt: string;
    safeNaslov: string;
    safeUvod: string;
    safeAdresa: string;
    safeLanac: string;
    lanci: Record<"100" | "10200", string>;
    safeTrenutni: string;
    safeNema: string;
    safeNakonKyb: string;
    safeSpremi: string;
    primaNaslov: string;
    primaUkljuceno: string;
    primaIskljuceno: string;
    primaPostavke: string;
    poslano: string;
  };
  postavke: {
    naslov: string;
    uvod: string;
    slug: string;
    logo: string;
    prima: string;
    primaOpis: string;
    primaSamoAktivna: string;
  };
  clanovi: {
    naslov: string;
    uvod: string;
    clan: string;
    uloga: string;
    od: string;
    ti: string;
    promijeni: string;
    ukloni: string;
    potvrdaNapomena: string;
    pozivniceNaslov: string;
    nemaPozivnica: string;
    josDana: string;
    istekla: string;
    opozovi: string;
    pozoviNaslov: string;
    email: string;
    pozovi: string;
    samoVlasnik: string;
    demoNaslov: string;
    demoTekst: string;
    uloge: string;
  };
  pozivnica: {
    naslov: string;
    uvod: string;
    organizacija: string;
    uloga: string;
    pozvao: string;
    istjece: string;
    prihvati: string;
    odbij: string;
    prijaviSe: string;
    stanja: Record<"expired" | "accepted" | "revoked", string>;
    drugaEposta: string;
    ishodi: Record<"prihvacena" | "odbijena" | "vec_clan" | "nije_na_cekanju" | "druga_eposta" | "nema", string>;
  };
  odobravanje: {
    naslov: string;
    uvod: string;
    nijePrima: string;
    nema: string;
    autor: string;
    cilj: string;
    bezCilja: string;
    poslano: string;
    otvori: string;
    odobri: string;
    odbij: string;
    razlog: string;
    razlogPomoc: string;
    mpt: string;
    povijest: string;
    odobrena: string;
    odbijena: string;
    odobrenaPoruka: string;
    odbijenaPoruka: string;
    greske: Record<"nema" | "stanje" | "organizacija" | "safe" | "razlog_prazan" | "razlog_kratak" | "razlog_dug", string>;
  };
  kampanje: {
    naslov: string;
    uvod: string;
    nema: string;
    kampanja: string;
    stanje: string;
    prikupljeno: string;
    zaOrganizaciju: string;
    upravljaj: string;
    javno: string;
    nova: string;
  };
  vanjske: {
    naslov: string;
    uvod: string;
    url: string;
    urlPomoc: string;
    naslovPolje: string;
    opisPolje: string;
    opisPomoc: string;
    uredi: string;
    spremi: string;
    javna: string;
    dodaj: string;
    nema: string;
    kodUvod: string;
    provjeri: string;
    provjeriMock: string;
    ukloni: string;
    stanja: Record<"pending" | "active" | "removed", string>;
    dodana: string;
  };
}

export const ORGANIZACIJA: Dvojezicno<TekstoviOrganizacije> = {
  hr: {
    uloge: { owner: "vlasnik", admin: "administrator", editor: "urednik", viewer: "promatrač" },
    opisUloga: {
      owner: "članovi, KYB, Safe, brisanje organizacije",
      admin: "objava i odobravanje kampanja, postavke",
      editor: "kampanje, novosti, komentari, vanjske kampanje",
      viewer: "pregled kampanja, financije i izvoz",
    },
    statusOrganizacije: { pending: "čeka odobrenje", active: "aktivna", suspended: "suspendirana", closed: "zatvorena" },
    statusZahtjeva: { draft: "nacrt", submitted: "poslan, u pregledu", approved: "odobren", rejected: "odbijen" },
    statusVerifikacije: {
      requested: "zatraženo",
      submitted: "poslano",
      in_review: "u pregledu",
      approved: "odobreno",
      rejected: "odbijeno",
      expired: "isteklo",
    },
    stanjeKampanje: {
      draft: "nacrt",
      review: "čeka odobrenje organizacije",
      active: "aktivna",
      funded: "dosegnut cilj",
      closed: "završena",
      cancelled: "otkazana",
      paused: "isključena",
      blocked: "blokirana",
    },
    oblici: {
      udruga: "Udruga",
      zaklada: "Zaklada",
      ustanova: "Ustanova",
      vjerska_zajednica: "Vjerska zajednica",
      zadruga: "Zadruga",
      jls: "Jedinica lokalne samouprave",
      doo: "Trgovačko društvo (d.o.o.)",
      obrt: "Obrt",
      osoba: "Fizička osoba",
    },
    uplate: { "1-10": "1–10 mjesečno", "11-100": "11–100 mjesečno", "101-1000": "101–1000 mjesečno", ">1000": "više od 1000 mjesečno" },
    greske: {
      obavezno: "Ovo polje je obavezno.",
      predugo: "Tekst je predug.",
      prekratko: "Tekst je prekratak (barem 30 znakova).",
      neispravno: "Vrijednost nije ispravna.",
      zauzet: "Ova adresa je već zauzeta.",
      faza2: "Fizičke osobe kao organizatori nisu u prvoj fazi.",
      nije_aktivna: "Dostupno tek kad je organizacija aktivna (nakon odobrenog KYB-a).",
      nema: "Nacrt zahtjeva ne postoji. Počnite od prvog koraka.",
      nedovrsen: "Zahtjev nije potpun: dovršite sve korake.",
      uvjeti: "Za slanje prihvatite uvjete i pravila privatnosti.",
      email_prazno: "Upišite e-poštu.",
      email_neispravan: "E-pošta nije ispravna.",
      uloga: "Odaberite ulogu.",
      vec_clan: "Ta osoba je već član organizacije.",
      zadnji_owner: "Organizacija mora imati barem jednog vlasnika.",
      nije_clan: "Ta osoba više nije član.",
      kod_zauzet: "Ta kampanja je već dodana.",
    },
    nav: {
      naslov: "Organizacija",
      profil: "Javni profil",
      zahtjev: "Zahtjev",
      postavke: "Postavke",
      clanovi: "Članovi",
      odobravanje: "Odobravanje",
      kampanje: "Kampanje",
      vanjske: "Vanjske kampanje",
    },
    opce: {
      spremi: "Spremi",
      spremljeno: "Promjene su spremljene.",
      natrag: "Natrag",
      nastavi: "Nastavi",
      odustani: "Odustani",
      bezOpisa: "Bez opisa.",
      demo: "Demo",
      mock: "simulacija, bez stvarnog poziva",
      obavezno: "obavezno",
      neobavezno: "neobavezno",
    },
    carobnjak: {
      naslov: "Nova organizacija",
      uvod: "Organizacija prikuplja u svoje ime, ima članove s ulogama i vlastiti Safe. Zahtjev ima pet koraka; nacrt se sprema na vaš račun nakon svakog koraka.",
      korak: "Korak {n} od {ukupno}",
      koraci: { details: "Podaci", representative: "Zastupnik", project: "Projekt", kyb: "KYB", review: "Pregled" },
      opisiKoraka: {
        details: "naziv, pravni oblik, OIB, web i mreže, opis",
        representative: "osoba ovlaštena za zastupanje",
        project: "što ćete prikupljati i koliko uplata očekujete",
        kyb: "provjera organizacije kod institucije za e-novac",
        review: "pregled i slanje zahtjeva",
      },
      zapocni: "Započni zahtjev",
      nastaviNacrt: "Nastavi nacrt",
      nacrtPostoji: "Imate nedovršen zahtjev za organizaciju „{organizacija}”.",
      mojeOrganizacije: "Vaše organizacije",
      otvoriZahtjev: "Stanje zahtjeva",
      nemaNacrta: "Ovaj korak traži nacrt zahtjeva. Počnite od podataka o organizaciji.",
      naPrviKorak: "Na prvi korak",
      spremiNastavi: "Spremi i nastavi",
      spremljenoNaRacunu: "Nacrt je spremljen na vaš račun.",
      fizickeOsobe: "Fizičke osobe kao organizatori",
      polja: {
        naziv: "Naziv organizacije",
        slug: "Adresa profila",
        slugPomoc: "Mala slova, brojke i crtice, 3–40 znakova. Može se mijenjati dok zahtjev nije poslan.",
        pravniOblik: "Pravni oblik",
        odaberi: "Odaberite…",
        oib: "OIB organizacije",
        oibPomoc: "11 znamenki; provjeravamo kontrolnu znamenku.",
        web: "Web stranica",
        mreze: "Društvene mreže",
        mrezePomoc: "Do 3 poveznice, svaka u svom retku.",
        opis: "Opis organizacije",
        kategorija: "Kategorija",
        bezKategorije: "Bez kategorije",
        adresa: "Adresa sjedišta",
        grad: "Grad",
        postanski: "Poštanski broj",
        ime: "Ime",
        prezime: "Prezime",
        funkcija: "Funkcija u organizaciji",
        funkcijaPomoc: "Npr. predsjednica, ravnatelj, član uprave.",
        ovlast: "Ovlašten/a sam zastupati organizaciju i podatke unosim u njezino ime.",
        opisProjekta: "Opis projekta",
        opisProjektaPomoc: "Za što ćete prikupljati na platformi? Barem 30 znakova.",
        ocekivaneUplate: "Očekivani broj uplata",
      },
      zastupnikUvod: "Zastupnik je osoba upisana u registar kao ovlaštena za zastupanje. To ste vi, jer zahtjev šaljete sa svog računa.",
      kybUvod: "KYB (provjeru organizacije) provodi institucija za e-novac preko koje stiže novac (Monerium ili Swan). Platforma ne drži novac ni ključeve. U prototipu je provjera simulirana.",
      kybStavke: [
        "izvadak iz registra (udruga, zaklada, sudski ili obrtni registar)",
        "statut ili akt o osnivanju",
        "identitet zastupnika i stvarnih vlasnika",
        "potvrda o OIB-u organizacije",
      ],
      kybPrivola: "Pristajem da institucija za e-novac provede KYB organizacije i od nas zatraži dokumente.",
      pregledUvod: "Provjerite podatke prije slanja. Nakon slanja zahtjev pregledava institucija za e-novac; stanje vidite na stranici zahtjeva.",
      uvjetiPrije: "Prihvaćam",
      uvjeti: "uvjete korištenja",
      uvjetiI: "i",
      privatnost: "pravila privatnosti",
      posalji: "Pošalji zahtjev",
      uredi: "Uredi",
      nedovrseno: "nije ispunjeno",
    },
    zahtjev: {
      naslov: "Zahtjev organizacije",
      brojac: "{n} / 5 koraka završeno",
      koraci: {
        "1": { naslov: "Račun", opis: "Račun s kojeg šaljete zahtjev postaje vlasnik organizacije." },
        "2": { naslov: "Zastupnik", opis: "Osoba ovlaštena za zastupanje potvrđuje podatke." },
        "3": { naslov: "Obrazac", opis: "Podaci o organizaciji i projektu poslani na pregled." },
        "4": { naslov: "KYB i aktivacija", opis: "Institucija za e-novac odobrila je organizaciju; slijedi Safe organizacije." },
        "5": { naslov: "Prima kampanje drugih", opis: "Neobavezno: drugi mogu pokrenuti kampanju za organizaciju, uz vaše odobrenje." },
      },
      gotovo: "završeno",
      uTijeku: "u tijeku",
      ceka: "čeka",
      kyb: "KYB organizacije",
      pruzatelj: "Pružatelj",
      zatrazeno: "Zatraženo",
      odluceno: "Odlučeno",
      razlog: "Razlog",
      odlukaKodModeratora: "U prototipu odluku institucije za e-novac simulira moderator platforme.",
      ponovno: "Ispravio/la sam i šaljem ponovno",
      nastaviNacrt: "Nastavi ispunjavati zahtjev",
      safeNaslov: "Safe organizacije",
      safeUvod: "Novac kampanja stiže izravno na Safe organizacije. Safe postavljate sami u setup aplikaciji; vlasnici su članovi organizacije, platforma nema potpisnika. Ovdje upisujete samo adresu.",
      safeAdresa: "Adresa Safea",
      safeLanac: "Mreža",
      lanci: { "100": "Gnosis (100)", "10200": "Chiado, testna (10200)" },
      safeTrenutni: "Trenutna adresa",
      safeNema: "Adresa još nije upisana.",
      safeNakonKyb: "Adresu Safea upisujete nakon odobrenog KYB-a.",
      safeSpremi: "Spremi adresu",
      primaNaslov: "Kampanje drugih za organizaciju",
      primaUkljuceno: "Uključeno: drugi mogu pokrenuti kampanju za vašu organizaciju, a vi je odobravate.",
      primaIskljuceno: "Isključeno.",
      primaPostavke: "Promijeni u postavkama",
      poslano: "Zahtjev je poslan. Stanje pratite ovdje.",
    },
    postavke: {
      naslov: "Postavke organizacije",
      uvod: "Javni profil organizacije: naziv, opis, web, mreže i kategorija.",
      slug: "Adresa profila (ne mijenja se)",
      logo: "Logotip se u prototipu ne prenosi; profil prikazuje inicijal.",
      prima: "Prima kampanje drugih",
      primaOpis: "Drugi korisnici mogu pokrenuti kampanju za ovu organizaciju; svaka čeka odobrenje administratora.",
      primaSamoAktivna: "Može se uključiti tek kad je organizacija aktivna.",
    },
    clanovi: {
      naslov: "Članovi",
      uvod: "Svaki član ima jednu ulogu u ovoj organizaciji. Organizacija uvijek ima barem jednog vlasnika.",
      clan: "Član",
      uloga: "Uloga",
      od: "Član od",
      ti: "vi",
      promijeni: "Promijeni",
      ukloni: "Ukloni",
      potvrdaNapomena: "Promjena uloge i uklanjanje člana traže kod e-poštom.",
      pozivniceNaslov: "Pozivnice na čekanju",
      nemaPozivnica: "Nema pozivnica na čekanju.",
      josDana: "još {dana} d.",
      istekla: "istekla",
      opozovi: "Opozovi",
      pozoviNaslov: "Pozovi člana",
      email: "E-pošta",
      pozovi: "Pošalji pozivnicu",
      samoVlasnik: "Članove, uloge i pozivnice mijenja vlasnik organizacije.",
      demoNaslov: "Demo pošta",
      demoTekst: "Prototip ne šalje e-poštu. Poveznica pozivnice za {email}:",
      uloge: "Što koja uloga smije",
    },
    pozivnica: {
      naslov: "Pozivnica u organizaciju",
      uvod: "Pozvani ste da se pridružite organizaciji.",
      organizacija: "Organizacija",
      uloga: "Uloga",
      pozvao: "Poziva vas",
      istjece: "Vrijedi do",
      prihvati: "Prihvati",
      odbij: "Odbij",
      prijaviSe: "Prijavite se za prihvat",
      stanja: { expired: "Pozivnica je istekla. Zatražite novu od vlasnika organizacije.", accepted: "Pozivnica je već prihvaćena.", revoked: "Pozivnica je opozvana ili odbijena." },
      drugaEposta: "Pozivnica je poslana na {email}. Prijavite se tim računom da je prihvatite.",
      ishodi: {
        prihvacena: "Dobrodošli u organizaciju.",
        odbijena: "Pozivnica je odbijena.",
        vec_clan: "Već ste član ove organizacije.",
        nije_na_cekanju: "Pozivnica više ne vrijedi.",
        druga_eposta: "Pozivnica je za drugu e-poštu.",
        nema: "Pozivnica ne postoji.",
      },
    },
    odobravanje: {
      naslov: "Odobravanje kampanja",
      uvod: "Kampanje koje su drugi pokrenuli za vašu organizaciju. Novac odobrene kampanje ide na Safe organizacije.",
      nijePrima: "Organizacija trenutno ne prima nove kampanje drugih (postavke). Kampanje na čekanju i dalje možete odobriti ili odbiti.",
      nema: "Nema kampanja koje čekaju odobrenje.",
      autor: "Pokrenuo/la",
      cilj: "Cilj",
      bezCilja: "bez cilja",
      poslano: "Poslano",
      otvori: "Pregled kampanje",
      odobri: "Odobri",
      odbij: "Odbij",
      razlog: "Razlog odbijanja",
      razlogPomoc: "Autor kampanje vidi razlog. 10–500 znakova.",
      mpt: "Registracija kampanje u MPT-u je u prototipu simulirana.",
      povijest: "Zadnje odluke",
      odobrena: "odobrena",
      odbijena: "odbijena",
      odobrenaPoruka: "Kampanja je odobrena i aktivna.",
      odbijenaPoruka: "Kampanja je odbijena.",
      greske: {
        nema: "Kampanja ne postoji ili nije za ovu organizaciju.",
        stanje: "Kampanja više ne čeka odobrenje.",
        organizacija: "Organizacija mora biti aktivna da bi odobrila kampanju.",
        safe: "Organizacija nema upisan Safe.",
        razlog_prazan: "Upišite razlog odbijanja.",
        razlog_kratak: "Razlog je prekratak (barem 10 znakova).",
        razlog_dug: "Razlog je predug (najviše 500 znakova).",
      },
    },
    kampanje: {
      naslov: "Kampanje organizacije",
      uvod: "Sve kampanje organizacije, vlastite i one koje su drugi pokrenuli za nju.",
      nema: "Organizacija još nema kampanja.",
      kampanja: "Kampanja",
      stanje: "Stanje",
      prikupljeno: "Prikupljeno",
      zaOrganizaciju: "pokrenuo/la {ime}",
      upravljaj: "Upravljaj",
      javno: "Javna stranica",
      nova: "Nova kampanja",
    },
    vanjske: {
      naslov: "Vanjske kampanje",
      uvod: "Kampanju koju organizacija već vodi na 4fundu možete prikazati na profilu. Uplate za nju idu na 4fund; mi ništa ne uvozimo.",
      url: "Poveznica na 4fund kampanju",
      urlPomoc: "Oblik https://4fund.com/abc123",
      naslovPolje: "Naslov za prikaz",
      opisPolje: "Kratki opis",
      opisPomoc: "Do 300 znakova, svojim riječima. S 4funda ništa ne preuzimamo, pa ni opis.",
      uredi: "Uredi",
      spremi: "Spremi",
      javna: "Javna stranica",
      dodaj: "Dodaj kampanju",
      nema: "Nema vanjskih kampanja.",
      kodUvod: "Dokaz vlasništva: upišite ovaj kod u opis kampanje na 4fundu, pa kliknite „Provjeri”.",
      provjeri: "Provjeri",
      provjeriMock: "U prototipu se 4fund ne dohvaća: provjera samo potvrđuje kampanju.",
      ukloni: "Ukloni",
      stanja: { pending: "čeka provjeru", active: "prikazana", removed: "uklonjena" },
      dodana: "Kampanja je dodana. Upišite kod u opis na 4fundu.",
    },
  },
  en: {
    uloge: { owner: "owner", admin: "admin", editor: "editor", viewer: "viewer" },
    opisUloga: {
      owner: "members, KYB, Safe, deleting the organisation",
      admin: "publishing and approving campaigns, settings",
      editor: "campaigns, updates, comments, external campaigns",
      viewer: "viewing campaigns, finances and export",
    },
    statusOrganizacije: { pending: "awaiting approval", active: "active", suspended: "suspended", closed: "closed" },
    statusZahtjeva: { draft: "draft", submitted: "submitted, under review", approved: "approved", rejected: "rejected" },
    statusVerifikacije: {
      requested: "requested",
      submitted: "submitted",
      in_review: "under review",
      approved: "approved",
      rejected: "rejected",
      expired: "expired",
    },
    stanjeKampanje: {
      draft: "draft",
      review: "awaiting organisation approval",
      active: "active",
      funded: "goal reached",
      closed: "ended",
      cancelled: "cancelled",
      paused: "turned off",
      blocked: "blocked",
    },
    oblici: {
      udruga: "Association",
      zaklada: "Foundation",
      ustanova: "Institution",
      vjerska_zajednica: "Religious community",
      zadruga: "Cooperative",
      jls: "Local government unit",
      doo: "Limited company (d.o.o.)",
      obrt: "Sole trader (obrt)",
      osoba: "Individual",
    },
    uplate: { "1-10": "1–10 a month", "11-100": "11–100 a month", "101-1000": "101–1000 a month", ">1000": "more than 1000 a month" },
    greske: {
      obavezno: "This field is required.",
      predugo: "The text is too long.",
      prekratko: "The text is too short (at least 30 characters).",
      neispravno: "The value is not valid.",
      zauzet: "This address is already taken.",
      faza2: "Individuals as organisers are not in the first phase.",
      nije_aktivna: "Available once the organisation is active (after KYB approval).",
      nema: "There is no application draft. Start from the first step.",
      nedovrsen: "The application is incomplete: finish all steps.",
      uvjeti: "Accept the terms and privacy policy to submit.",
      email_prazno: "Enter an email address.",
      email_neispravan: "The email address is not valid.",
      uloga: "Choose a role.",
      vec_clan: "This person is already a member of the organisation.",
      zadnji_owner: "The organisation must have at least one owner.",
      nije_clan: "This person is no longer a member.",
      kod_zauzet: "This campaign has already been added.",
    },
    nav: {
      naslov: "Organisation",
      profil: "Public profile",
      zahtjev: "Application",
      postavke: "Settings",
      clanovi: "Members",
      odobravanje: "Approvals",
      kampanje: "Campaigns",
      vanjske: "External campaigns",
    },
    opce: {
      spremi: "Save",
      spremljeno: "Changes saved.",
      natrag: "Back",
      nastavi: "Continue",
      odustani: "Cancel",
      bezOpisa: "No description.",
      demo: "Demo",
      mock: "simulated, no real call",
      obavezno: "required",
      neobavezno: "optional",
    },
    carobnjak: {
      naslov: "New organisation",
      uvod: "An organisation raises funds in its own name, has members with roles and its own Safe. The application has five steps; the draft is saved to your account after each step.",
      korak: "Step {n} of {ukupno}",
      koraci: { details: "Details", representative: "Representative", project: "Project", kyb: "KYB", review: "Review" },
      opisiKoraka: {
        details: "name, legal form, OIB, website and social links, description",
        representative: "the person authorised to represent it",
        project: "what you will raise funds for and how many payments you expect",
        kyb: "verification of the organisation by the e-money institution",
        review: "review and submit the application",
      },
      zapocni: "Start the application",
      nastaviNacrt: "Continue the draft",
      nacrtPostoji: "You have an unfinished application for the organisation “{organizacija}”.",
      mojeOrganizacije: "Your organisations",
      otvoriZahtjev: "Application status",
      nemaNacrta: "This step needs an application draft. Start with the organisation details.",
      naPrviKorak: "Go to the first step",
      spremiNastavi: "Save and continue",
      spremljenoNaRacunu: "The draft is saved to your account.",
      fizickeOsobe: "Individuals as organisers",
      polja: {
        naziv: "Organisation name",
        slug: "Profile address",
        slugPomoc: "Lowercase letters, digits and hyphens, 3–40 characters. You can change it until the application is submitted.",
        pravniOblik: "Legal form",
        odaberi: "Choose…",
        oib: "Organisation OIB",
        oibPomoc: "11 digits; we check the control digit.",
        web: "Website",
        mreze: "Social media",
        mrezePomoc: "Up to 3 links, one per line.",
        opis: "Organisation description",
        kategorija: "Category",
        bezKategorije: "No category",
        adresa: "Registered address",
        grad: "City",
        postanski: "Postcode",
        ime: "First name",
        prezime: "Last name",
        funkcija: "Role in the organisation",
        funkcijaPomoc: "E.g. president, director, board member.",
        ovlast: "I am authorised to represent the organisation and I enter the data on its behalf.",
        opisProjekta: "Project description",
        opisProjektaPomoc: "What will you raise funds for on the platform? At least 30 characters.",
        ocekivaneUplate: "Expected number of payments",
      },
      zastupnikUvod: "The representative is the person listed in the register as authorised to represent the organisation. That is you, since you submit the application from your account.",
      kybUvod: "KYB (organisation verification) is carried out by the e-money institution the money arrives through (Monerium or Swan). The platform never holds money or keys. In the prototype the check is simulated.",
      kybStavke: [
        "an extract from the register (associations, foundations, court or trade register)",
        "statute or founding act",
        "identity of the representative and the beneficial owners",
        "confirmation of the organisation's OIB",
      ],
      kybPrivola: "I agree that the e-money institution carries out KYB of the organisation and may request documents from us.",
      pregledUvod: "Check the details before submitting. After submission the e-money institution reviews the application; you can follow its status on the application page.",
      uvjetiPrije: "I accept the",
      uvjeti: "terms of use",
      uvjetiI: "and the",
      privatnost: "privacy policy",
      posalji: "Submit the application",
      uredi: "Edit",
      nedovrseno: "not filled in",
    },
    zahtjev: {
      naslov: "Organisation application",
      brojac: "{n} / 5 steps completed",
      koraci: {
        "1": { naslov: "Account", opis: "The account you submit from becomes the organisation owner." },
        "2": { naslov: "Representative", opis: "The person authorised to represent confirms the details." },
        "3": { naslov: "Form", opis: "Organisation and project details submitted for review." },
        "4": { naslov: "KYB and activation", opis: "The e-money institution approved the organisation; next is the organisation Safe." },
        "5": { naslov: "Accepts campaigns by others", opis: "Optional: others can start a campaign for the organisation, with your approval." },
      },
      gotovo: "done",
      uTijeku: "in progress",
      ceka: "waiting",
      kyb: "Organisation KYB",
      pruzatelj: "Provider",
      zatrazeno: "Requested",
      odluceno: "Decided",
      razlog: "Reason",
      odlukaKodModeratora: "In the prototype the e-money institution's decision is simulated by a platform moderator.",
      ponovno: "I have fixed it and resubmit",
      nastaviNacrt: "Continue the application",
      safeNaslov: "Organisation Safe",
      safeUvod: "Campaign money arrives directly on the organisation Safe. You set the Safe up yourself in the setup app; its owners are organisation members and the platform has no signer. Here you only enter its address.",
      safeAdresa: "Safe address",
      safeLanac: "Network",
      lanci: { "100": "Gnosis (100)", "10200": "Chiado, testnet (10200)" },
      safeTrenutni: "Current address",
      safeNema: "No address yet.",
      safeNakonKyb: "You enter the Safe address after KYB is approved.",
      safeSpremi: "Save address",
      primaNaslov: "Campaigns by others for the organisation",
      primaUkljuceno: "On: others can start a campaign for your organisation, and you approve it.",
      primaIskljuceno: "Off.",
      primaPostavke: "Change in settings",
      poslano: "The application has been submitted. Follow its status here.",
    },
    postavke: {
      naslov: "Organisation settings",
      uvod: "The organisation's public profile: name, description, website, social links and category.",
      slug: "Profile address (cannot be changed)",
      logo: "Logos are not uploaded in the prototype; the profile shows an initial.",
      prima: "Accepts campaigns by others",
      primaOpis: "Other users can start a campaign for this organisation; each waits for an admin's approval.",
      primaSamoAktivna: "Can be turned on only once the organisation is active.",
    },
    clanovi: {
      naslov: "Members",
      uvod: "Each member has one role in this organisation. The organisation always has at least one owner.",
      clan: "Member",
      uloga: "Role",
      od: "Member since",
      ti: "you",
      promijeni: "Change",
      ukloni: "Remove",
      potvrdaNapomena: "Changing a role and removing a member require a code sent by email.",
      pozivniceNaslov: "Pending invitations",
      nemaPozivnica: "No pending invitations.",
      josDana: "{dana} more days",
      istekla: "expired",
      opozovi: "Revoke",
      pozoviNaslov: "Invite a member",
      email: "Email",
      pozovi: "Send invitation",
      samoVlasnik: "Members, roles and invitations are managed by the organisation owner.",
      demoNaslov: "Demo mail",
      demoTekst: "The prototype sends no email. Invitation link for {email}:",
      uloge: "What each role can do",
    },
    pozivnica: {
      naslov: "Invitation to an organisation",
      uvod: "You have been invited to join an organisation.",
      organizacija: "Organisation",
      uloga: "Role",
      pozvao: "Invited by",
      istjece: "Valid until",
      prihvati: "Accept",
      odbij: "Decline",
      prijaviSe: "Sign in to accept",
      stanja: { expired: "The invitation has expired. Ask the organisation owner for a new one.", accepted: "The invitation has already been accepted.", revoked: "The invitation was revoked or declined." },
      drugaEposta: "The invitation was sent to {email}. Sign in with that account to accept it.",
      ishodi: {
        prihvacena: "Welcome to the organisation.",
        odbijena: "The invitation was declined.",
        vec_clan: "You are already a member of this organisation.",
        nije_na_cekanju: "The invitation is no longer valid.",
        druga_eposta: "The invitation is for a different email address.",
        nema: "The invitation does not exist.",
      },
    },
    odobravanje: {
      naslov: "Campaign approvals",
      uvod: "Campaigns others have started for your organisation. Money of an approved campaign goes to the organisation Safe.",
      nijePrima: "The organisation is currently not accepting new campaigns by others (settings). You can still approve or reject pending ones.",
      nema: "No campaigns are waiting for approval.",
      autor: "Started by",
      cilj: "Goal",
      bezCilja: "no goal",
      poslano: "Submitted",
      otvori: "Campaign preview",
      odobri: "Approve",
      odbij: "Reject",
      razlog: "Reason for rejection",
      razlogPomoc: "The campaign author sees the reason. 10–500 characters.",
      mpt: "Registering the campaign with MPT is simulated in the prototype.",
      povijest: "Recent decisions",
      odobrena: "approved",
      odbijena: "rejected",
      odobrenaPoruka: "The campaign is approved and active.",
      odbijenaPoruka: "The campaign was rejected.",
      greske: {
        nema: "The campaign does not exist or is not for this organisation.",
        stanje: "The campaign is no longer waiting for approval.",
        organizacija: "The organisation must be active to approve a campaign.",
        safe: "The organisation has no Safe address.",
        razlog_prazan: "Enter a reason for rejection.",
        razlog_kratak: "The reason is too short (at least 10 characters).",
        razlog_dug: "The reason is too long (at most 500 characters).",
      },
    },
    kampanje: {
      naslov: "Organisation campaigns",
      uvod: "All of the organisation's campaigns, its own and those others started for it.",
      nema: "The organisation has no campaigns yet.",
      kampanja: "Campaign",
      stanje: "Status",
      prikupljeno: "Raised",
      zaOrganizaciju: "started by {ime}",
      upravljaj: "Manage",
      javno: "Public page",
      nova: "New campaign",
    },
    vanjske: {
      naslov: "External campaigns",
      uvod: "A campaign the organisation already runs on 4fund can be shown on its profile. Payments for it go to 4fund; we import nothing.",
      url: "Link to the 4fund campaign",
      urlPomoc: "Format https://4fund.com/abc123",
      naslovPolje: "Title to display",
      opisPolje: "Short description",
      opisPomoc: "Up to 300 characters, in your own words. We take nothing from 4fund, including the description.",
      uredi: "Edit",
      spremi: "Save",
      javna: "Public page",
      dodaj: "Add campaign",
      nema: "No external campaigns.",
      kodUvod: "Proof of ownership: put this code in the campaign description on 4fund, then click “Check”.",
      provjeri: "Check",
      provjeriMock: "The prototype does not fetch 4fund: the check only confirms the campaign.",
      ukloni: "Remove",
      stanja: { pending: "awaiting check", active: "shown", removed: "removed" },
      dodana: "The campaign was added. Put the code in its description on 4fund.",
    },
  },
};

/** `{x}` → vrijednost. */
export function umetni(t: string, v: Record<string, string | number>): string {
  return t.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));
}
