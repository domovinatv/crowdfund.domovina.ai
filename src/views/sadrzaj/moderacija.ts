/**
 * Moderacija platforme `/admin/*` (S6, A, docs/07 „Moderacija platforme”, odluka 645): red prijava i odluka s
 * obrazloženjem (DSA čl. 16–17), zahtjevi organizacija i simulirani KYB, verifikacije namjene, blokada kampanja.
 * Admin je samo na hrvatskom (docs/07), pa je ovdje samo `hr`. `{n}`, `{datum}`, `{dana}` popunjava pogled.
 * Nazivi razloga prijave, oblika i statusa verifikacije dolaze iz `prijava-sadrzaja.ts` i `organizacija.ts`.
 */
import type { Radnja, StatusPrijave } from "../../lib/db/moderacija";

export type VrstaCilja = "campaign" | "comment" | "update" | "moneybox" | "offer" | "user" | "organization";
export type OsnovaOdluke = "uvjeti" | "zakon";

export interface TekstoviModeracije {
  naslov: string;
  nav: { prijave: string; organizacije: string; verifikacije: string; kampanje: string };
  opce: { prototip: string; obavijesti: string; nema: string; razlog: string; razlogPomoc: string; odobri: string; odbij: string; zatrazeno: string; rok: string; odluceno: string };
  statusPrijave: Record<StatusPrijave, string>;
  radnje: Record<Radnja, string>;
  vrste: Record<VrstaCilja, string>;
  osnove: Record<OsnovaOdluke, string>;
  prijave: { naslov: string; uvod: string; filtar: string; sve: string; filtriraj: string; cilj: string; razlog: string; status: string; zaprimljena: string; otvori: string; nema: string };
  prijava: {
    naslov: string;
    natrag: string;
    opis: string;
    prijavitelj: string;
    telefon: string;
    privitak: string;
    da: string;
    kampanja: string;
    blokirana: string;
    preuzmi: string;
    preuzmiPomoc: string;
    odluka: string;
    odlukaZalba: string;
    odlukaUvod: string;
    zalbaUvod: string;
    radnja: string;
    radnjaPomoc: string;
    cinjenice: string;
    cinjenicePomoc: string;
    osnova: string;
    osnovaOpis: string;
    osnovaOpisPomoc: string;
    automatizirano: string;
    pravniLijek: string;
    pravniLijekTekst: string;
    donesi: string;
    odluke: string;
    nemaOdluka: string;
    zalbaOznaka: string;
    rokZalbe: string;
    zabiljeziZalbu: string;
    zabiljeziZalbuPomoc: string;
    zatvori: string;
    zatvoriPomoc: string;
    zatvorena: string;
    /** Dijelovi obrazloženja koje sastavlja `sastaviObrazlozenje` (spremaju se u `moderation_decisions.statement`). */
    dijelovi: { radnja: string; cinjenice: string; osnova: string; automatizirano: string; automatiziranoNe: string; pravniLijek: string };
  };
  organizacije: {
    naslov: string;
    uvod: string;
    oib: string;
    oblik: string;
    status: string;
    zahtjev: string;
    korak: string;
    podnositelj: string;
    projekt: string;
    uplate: string;
    kyb: string;
    pruzatelj: string;
    nemaKyb: string;
    simulacija: string;
    odobriKyb: string;
    odbijKyb: string;
    nema: string;
  };
  verifikacije: { naslov: string; uvod: string; kampanja: string; organizacija: string; prikupljeno: string; povod: string; povodi: Record<string, string>; ceka: string; nema: string; odbijPomoc: string };
  kampanje: { naslov: string; uvod: string; trazi: string; traziGumb: string; stanje: string; prijava: string; blokirana: string; blokiraj: string; deblokiraj: string; razlogBlokade: string; nema: string };
  poruke: Record<"preuzeta" | "odluka" | "zalba" | "zatvorena" | "odobrena" | "odbijena" | "blokirana" | "deblokirana", string>;
  greske: Record<
    | "nema"
    | "stanje"
    | "radnja"
    | "radnja_cilj"
    | "obrazlozenje_kratko"
    | "obrazlozenje_dugo"
    | "cinjenice_kratko"
    | "cinjenice_dugo"
    | "osnova"
    | "osnova_opis"
    | "razlog"
    | "razlog_kratko"
    | "rok",
    string
  >;
}

export const MODERACIJA: { hr: TekstoviModeracije } = {
  hr: {
    naslov: "Moderacija",
    nav: { prijave: "Prijave", organizacije: "Organizacije i KYB", verifikacije: "Verifikacije namjene", kampanje: "Kampanje" },
    opce: {
      prototip: "Prototip: odluke pružatelja platnih usluga (KYB) su simulirane, a obavijesti se ne šalju.",
      obavijesti: "Odluka se šalje prijavitelju i organizatoru s pravom žalbe u 14 dana (u prototipu bez slanja).",
      nema: "Nema stavki.",
      razlog: "Razlog",
      razlogPomoc: "Najmanje 20 znakova. Organizator vidi razlog.",
      odobri: "Odobri",
      odbij: "Odbij",
      zatrazeno: "Zatraženo",
      rok: "Rok",
      odluceno: "Odlučeno",
    },
    statusPrijave: { received: "zaprimljena", in_review: "u pregledu", decided: "odlučena", appealed: "žalba", closed: "zatvorena" },
    radnje: {
      no_action: "Bez radnje",
      hide_content: "Skrivanje sadržaja",
      restrict_feature: "Ograničenje funkcije",
      block_campaign: "Blokada kampanje",
      suspend_account: "Suspenzija računa",
    },
    vrste: { campaign: "Kampanja", comment: "Komentar", update: "Novost", moneybox: "Kasica", offer: "Ponuda", user: "Korisnik", organization: "Organizacija" },
    osnove: { uvjeti: "Uvjeti korištenja platforme", zakon: "Nezakonit sadržaj (propis)" },
    prijave: {
      naslov: "Prijave sadržaja",
      uvod: "Red prijava (DSA čl. 16): otvorene prve, najstarija prva. Cilj odluke je 14 dana od primitka.",
      filtar: "Status",
      sve: "Sve",
      filtriraj: "Prikaži",
      cilj: "Cilj",
      razlog: "Razlog",
      status: "Status",
      zaprimljena: "Zaprimljena",
      otvori: "Otvori",
      nema: "Nema prijava s tim statusom.",
    },
    prijava: {
      naslov: "Prijava",
      natrag: "Natrag na prijave",
      opis: "Opis prijavitelja",
      prijavitelj: "Prijavitelj",
      telefon: "Telefon",
      privitak: "Privitak",
      da: "priložen",
      kampanja: "Kampanja",
      blokirana: "blokirana",
      preuzmi: "Preuzmi prijavu",
      preuzmiPomoc: "Status prelazi u „u pregledu”.",
      odluka: "Odluka s obrazloženjem",
      odlukaZalba: "Odluka o žalbi",
      odlukaUvod: "Obrazloženje prema DSA čl. 17 sastavlja se iz polja ispod i šalje prijavitelju i organizatoru.",
      zalbaUvod: "Žalba je zaprimljena. Odluka o žalbi zatvara prijavu; „Bez radnje” deblokira kampanju.",
      radnja: "Radnja",
      radnjaPomoc: "Blokada kampanje otvara zahtjev za dokumente namjene s rokom od 14 dana.",
      cinjenice: "Činjenice i okolnosti",
      cinjenicePomoc: "Na čemu se odluka temelji. Najmanje 20 znakova.",
      osnova: "Osnova odluke",
      osnovaOpis: "Odredba",
      osnovaOpisPomoc: "Članak uvjeta korištenja ili propisa.",
      automatizirano: "Automatizirana sredstva",
      pravniLijek: "Pravna sredstva",
      pravniLijekTekst:
        "Žalba kroz platformu u roku od 14 dana; izvansudsko rješavanje spora (DSA čl. 21); sudska zaštita.",
      donesi: "Donesi odluku",
      odluke: "Odluke",
      nemaOdluka: "Odluka još nema.",
      zalbaOznaka: "odluka o žalbi",
      rokZalbe: "Rok za žalbu: {datum}",
      zabiljeziZalbu: "Zabilježi žalbu",
      zabiljeziZalbuPomoc: "Prototip: organizatorov obrazac žalbe još ne postoji, pa žalbu primljenu e-poštom bilježi moderator.",
      zatvori: "Zatvori prijavu",
      zatvoriPomoc: "Rok za žalbu je prošao.",
      zatvorena: "Prijava je zatvorena.",
      dijelovi: {
        radnja: "Radnja",
        cinjenice: "Činjenice i okolnosti",
        osnova: "Osnova",
        automatizirano: "Automatizirana sredstva",
        automatiziranoNe: "nisu korištena; odluku je donio moderator",
        pravniLijek: "Pravna sredstva",
      },
    },
    organizacije: {
      naslov: "Organizacije i KYB",
      uvod: "Zahtjevi organizacija i provjera pravne osobe (KYB). U prototipu se odluka pružatelja platnih usluga simulira.",
      oib: "OIB",
      oblik: "Pravni oblik",
      status: "Organizacija",
      zahtjev: "Zahtjev",
      korak: "korak {n}",
      podnositelj: "Podnositelj",
      projekt: "Opis projekta",
      uplate: "Očekivane uplate mjesečno",
      kyb: "KYB",
      pruzatelj: "pružatelj",
      nemaKyb: "KYB nije pokrenut.",
      simulacija: "Simuliraj odluku pružatelja",
      odobriKyb: "Simuliraj odobrenje",
      odbijKyb: "Simuliraj odbijanje",
      nema: "Nema zahtjeva organizacija.",
    },
    verifikacije: {
      naslov: "Verifikacije namjene",
      uvod:
        "Kampanje iznad praga ili blokirane kampanje dostavljaju dokumente o namjeni. Odobrenje zaključava naslov, opis i cilj; odbijanje blokira kampanju.",
      kampanja: "Kampanja",
      organizacija: "Organizator",
      prikupljeno: "Prikupljeno",
      povod: "Povod",
      povodi: { threshold_campaign: "prag kampanje", report: "prijava", risk: "procjena rizika", user: "organizator" },
      ceka: "Čeka dokumente organizatora.",
      nema: "Nema verifikacija namjene.",
      odbijPomoc: "Najmanje 20 znakova. Razlog postaje obrazloženje blokade.",
    },
    kampanje: {
      naslov: "Kampanje",
      uvod: "Blokada i deblokada po službenoj dužnosti. Svaka ostavlja obrazloženu odluku moderacije; blokada otvara zahtjev za dokumente namjene (14 dana).",
      trazi: "Traži po naslovu ili ID-u",
      traziGumb: "Traži",
      stanje: "Stanje",
      prijava: "Otvorenih prijava: {n}",
      blokirana: "Blokirana {datum}",
      blokiraj: "Blokiraj",
      deblokiraj: "Deblokiraj",
      razlogBlokade: "Razlog blokade",
      nema: "Nema kampanja.",
    },
    poruke: {
      preuzeta: "Prijava je preuzeta.",
      odluka: "Odluka je zabilježena.",
      zalba: "Žalba je zabilježena.",
      zatvorena: "Prijava je zatvorena.",
      odobrena: "Odobreno.",
      odbijena: "Odbijeno.",
      blokirana: "Kampanja je blokirana.",
      deblokirana: "Kampanja je deblokirana.",
    },
    greske: {
      nema: "Stavka ne postoji.",
      stanje: "Stavka je u međuvremenu promijenila stanje. Osvježite stranicu.",
      radnja: "Odaberite radnju.",
      radnja_cilj: "Blokada je moguća samo kad se prijava odnosi na kampanju.",
      obrazlozenje_kratko: "Obrazloženje je prekratko.",
      obrazlozenje_dugo: "Obrazloženje je predugo (najviše 2000 znakova).",
      cinjenice_kratko: "Opišite činjenice s najmanje 20 znakova.",
      cinjenice_dugo: "Najviše 1500 znakova.",
      osnova: "Odaberite osnovu odluke.",
      osnova_opis: "Navedite odredbu (3 do 200 znakova).",
      razlog: "Upišite razlog.",
      razlog_kratko: "Razlog mora imati najmanje 20 znakova.",
      rok: "Rok za to je istekao ili još nije prošao.",
    },
  },
};

export const umetni = (t: string, v: Record<string, string | number>): string => t.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));
