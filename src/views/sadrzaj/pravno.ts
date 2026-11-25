/**
 * O nama (impresum), uvjeti i privatnost (docs/07 retci 111, 112, 114). Uvjeti i privatnost su
 * NACRT PROTOTIPA, jasno označen; podaci o društvu koji nisu provjereni (OIB, adresa, registar)
 * stoje kao vidljivo označeni nadomjesci, ne kao izmišljene vrijednosti.
 */
import type { Dvojezicno, SadrzajStranice } from "./tipovi";

/** Nadomjestak za podatak o društvu koji se upisuje prije objave. */
export const NADOMJESTAK: Dvojezicno<string> = {
  hr: "[upisuje se prije objave]",
  en: "[to be added before launch]",
};

export const O_NAMA: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "O nama",
    uvod:
      "Gradimo platformu za prikupljanje donacija na kojoj novac ide izravno organizacijama, bez provizije i bez posrednika koji ga drži.",
    opis: "Tko stoji iza platforme, zašto je napravljena i impresum.",
    napomena: "Ovo je prototip. Ime platforme je radno, a uplate su testne.",
    odjeljci: [
      {
        id: "zasto",
        naslov: "Zašto",
        tekst: [
          "Udruge, župe, klubovi i škole često skupljaju novac preko posrednika koji uzimaju proviziju ili danima drže novac prije isplate. Mi smo htjeli obrnuto: da donacija stigne odmah, u cijelosti i izravno na račun organizacije, a da svatko može vidjeti kamo je otišla.",
          "Platforma zato ne drži novac i ne uzima proviziju. Živi od dobrovoljnih napojnica koje su uvijek zasebna uplata.",
        ],
        veze: [
          { kljuc: "how-it-works", tekst: "Kako radi" },
          { kljuc: "costs", tekst: "Troškovi" },
        ],
      },
      {
        id: "tko",
        naslov: "Tko stoji iza platforme",
        tekst: [
          "Platformu vodi ITalk d.o.o. Uplate se s kampanjama uparuju kroz sustav MPT, a račune organizacijama vode licencirani pružatelji, ne ITalk.",
        ],
      },
      {
        id: "impresum",
        naslov: "Impresum",
        definicije: [
          { pojam: "Pružatelj usluge", opis: "ITalk d.o.o." },
          { pojam: "OIB", opis: NADOMJESTAK.hr },
          { pojam: "Sjedište", opis: NADOMJESTAK.hr },
          { pojam: "Upis u sudski registar", opis: NADOMJESTAK.hr },
          { pojam: "Odgovorna osoba", opis: NADOMJESTAK.hr },
          { pojam: "Kontakt", opis: "Obrazac na stranici Kontakt." },
        ],
        veze: [{ kljuc: "contact", tekst: "Kontakt" }],
      },
    ],
  },
  en: {
    naslov: "About us",
    uvod:
      "We are building a donation platform where money goes straight to organisations, with no commission and no intermediary holding it.",
    opis: "Who is behind the platform, why it exists, and the legal notice.",
    napomena: "This is a prototype. The platform's name is a working title and all payments are test payments.",
    odjeljci: [
      {
        id: "zasto",
        naslov: "Why",
        tekst: [
          "Associations, parishes, clubs and schools often raise money through intermediaries that take a commission or hold the money for days before paying it out. We wanted the opposite: a donation that arrives immediately, in full and directly in the organisation's account, with anyone able to see where it went.",
          "That is why the platform holds no money and takes no commission. It lives on voluntary tips, which are always a separate payment.",
        ],
        veze: [
          { kljuc: "how-it-works", tekst: "How it works" },
          { kljuc: "costs", tekst: "Costs" },
        ],
      },
      {
        id: "tko",
        naslov: "Who is behind the platform",
        tekst: [
          "The platform is run by ITalk d.o.o. Payments are matched to campaigns through the MPT system, and organisations' accounts are held by licensed providers, not by ITalk.",
        ],
      },
      {
        id: "impresum",
        naslov: "Legal notice",
        definicije: [
          { pojam: "Service provider", opis: "ITalk d.o.o." },
          { pojam: "Tax number (OIB)", opis: NADOMJESTAK.en },
          { pojam: "Registered office", opis: NADOMJESTAK.en },
          { pojam: "Court register entry", opis: NADOMJESTAK.en },
          { pojam: "Responsible person", opis: NADOMJESTAK.en },
          { pojam: "Contact", opis: "The form on the Contact page." },
        ],
        veze: [{ kljuc: "contact", tekst: "Contact" }],
      },
    ],
  },
};

const NACRT: Dvojezicno<string> = {
  hr: "Nacrt prototipa. Ovaj tekst nije pravni dokument i ne obvezuje nikoga; konačne uvjete priprema pravnik prije pokretanja.",
  en: "Prototype draft. This text is not a legal document and binds no one; the final terms will be prepared by a lawyer before launch.",
};

export const UVJETI: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Uvjeti korištenja",
    uvod: "Pravila korištenja platforme za organizatore, podržavatelje i posjetitelje.",
    opis: "Nacrt uvjeta korištenja platforme (prototip).",
    napomena: NACRT.hr,
    odjeljci: [
      {
        id: "usluga",
        naslov: "1. Što platforma radi",
        tekst: [
          "Platforma omogućuje objavu kampanja, prikaz kampanja u katalogu, dijeljenje i komunikaciju s podržavateljima. Za svaku donaciju izdaje upute za plaćanje (QR kod, IBAN, referencu) i bilježi kad je uplata stigla.",
          "Platforma nije banka ni platna institucija, ne prima novac u ime organizatora i ne izvršava isplate. Donacija ide izravno s računa podržavatelja na račun organizatora.",
        ],
      },
      {
        id: "organizatori",
        naslov: "2. Organizatori",
        popis: [
          "U prvoj fazi organizator je pravna osoba koju je provjerio pružatelj računa.",
          "Organizator odgovara za istinitost kampanje, za to da ima sve potrebne dozvole (na primjer rješenje za humanitarnu akciju) i da novac troši za navedenu svrhu.",
          "Organizator smije koristiti samo slike i tekstove na koje ima pravo.",
          "Organizator na upit dostavlja dokaze o namjeni, posebno iznad pragova za provjeru.",
        ],
      },
      {
        id: "zabranjeno",
        naslov: "3. Što nije dopušteno",
        popis: [
          "Svrhe koje su protuzakonite ili za koje organizator nema potrebnu dozvolu.",
          "Poticanje mržnje, nasilja ili diskriminacije; uvrede i kleveta.",
          "Oružje, kockanje, lutrije, droge, alkohol i duhan.",
          "Plaćanje kazni i jamčevina.",
          "Kampanje koje podržavateljima obećavaju povrat novca, kamate ili udio u dobiti.",
          "Prikrivena prodaja robe ili usluga.",
          "Političke kampanje i financiranje stranaka.",
          "Lažni, prazni ili nerazumljivi opisi te spam.",
        ],
      },
      {
        id: "podrzavatelji",
        naslov: "4. Podržavatelji",
        tekst: [
          "Donacija je dobrovoljni dar organizatoru za svrhu kampanje. Podržavatelj ne dobiva protučinidbu. Zahtjev za povrat podržavatelj upućuje organizatoru; platforma povrat bilježi, ali ga ne izvršava.",
          "Napojnica platformi je dobrovoljna, zasebna uplata i ne ovisi o donaciji.",
        ],
      },
      {
        id: "moderacija",
        naslov: "5. Prijave i moderacija",
        tekst: [
          "Svatko može prijaviti sadržaj za koji smatra da je nezakonit ili krši ove uvjete. Platforma potvrđuje primitak, odlučuje s obrazloženjem i o odluci obavještava prijavitelja i autora. Autor može prigovoriti odluci.",
          "Platforma može kampanju privremeno isključiti iz kataloga dok se prijava provjerava, a trajno je ukloniti ako krši uvjete.",
        ],
        veze: [
          { kljuc: "report", tekst: "Prijavi sadržaj" },
          { kljuc: "ranking", tekst: "Pravila prikaza" },
        ],
      },
      {
        id: "odgovornost",
        naslov: "6. Odgovornost",
        tekst: [
          "Platforma ne odgovara za to kako organizator troši donacije ni za sadržaj koji objave korisnici, ali postupa po prijavama. Platforma ne odgovara za rad banaka i pružatelja računa.",
        ],
      },
      {
        id: "izmjene",
        naslov: "7. Izmjene i kontakt",
        tekst: ["O izmjenama uvjeta korisnike obavještavamo unaprijed. Pitanja šalji preko obrasca za kontakt."],
        veze: [{ kljuc: "contact", tekst: "Kontakt" }],
      },
    ],
  },
  en: {
    naslov: "Terms of use",
    uvod: "The rules for using the platform, for organisers, supporters and visitors.",
    opis: "Draft terms of use for the platform (prototype).",
    napomena: NACRT.en,
    odjeljci: [
      {
        id: "usluga",
        naslov: "1. What the platform does",
        tekst: [
          "The platform lets organisers publish campaigns, list them in the catalogue, share them and communicate with supporters. For each donation it issues payment instructions (QR code, IBAN, reference) and records when the payment has arrived.",
          "The platform is not a bank or a payment institution, does not receive money on behalf of organisers and makes no payouts. A donation goes directly from the supporter's account to the organiser's account.",
        ],
      },
      {
        id: "organizatori",
        naslov: "2. Organisers",
        popis: [
          "In the first phase, an organiser is a legal entity verified by the account provider.",
          "The organiser is responsible for the campaign being truthful, for holding any required permits (for example a permit for a humanitarian appeal) and for spending the money on the stated purpose.",
          "The organiser may only use images and texts they have the rights to.",
          "On request, the organiser provides evidence of how the money is used, especially above the review thresholds.",
        ],
      },
      {
        id: "zabranjeno",
        naslov: "3. What is not allowed",
        popis: [
          "Purposes that are unlawful or for which the organiser lacks a required permit.",
          "Inciting hatred, violence or discrimination; insults and defamation.",
          "Weapons, gambling, lotteries, drugs, alcohol and tobacco.",
          "Paying fines or bail.",
          "Campaigns that promise supporters their money back, interest or a share of profits.",
          "Disguised sales of goods or services.",
          "Political campaigns and party funding.",
          "False, empty or unintelligible descriptions, and spam.",
        ],
      },
      {
        id: "podrzavatelji",
        naslov: "4. Supporters",
        tekst: [
          "A donation is a voluntary gift to the organiser for the campaign's purpose. The supporter receives nothing in return. Refund requests go to the organiser; the platform records refunds but does not make them.",
          "A tip to the platform is a voluntary, separate payment and does not depend on the donation.",
        ],
      },
      {
        id: "moderacija",
        naslov: "5. Reports and moderation",
        tekst: [
          "Anyone can report content they believe is illegal or breaches these terms. The platform confirms receipt, decides with reasons and informs both the reporter and the author of the decision. The author can object to the decision.",
          "The platform may temporarily remove a campaign from the catalogue while a report is checked, and remove it permanently if it breaches the terms.",
        ],
        veze: [
          { kljuc: "report", tekst: "Report content" },
          { kljuc: "ranking", tekst: "Ranking and display" },
        ],
      },
      {
        id: "odgovornost",
        naslov: "6. Liability",
        tekst: [
          "The platform is not responsible for how an organiser spends donations or for content published by users, but it acts on reports. The platform is not responsible for the operation of banks and account providers.",
        ],
      },
      {
        id: "izmjene",
        naslov: "7. Changes and contact",
        tekst: ["We notify users of changes to these terms in advance. Send questions through the contact form."],
        veze: [{ kljuc: "contact", tekst: "Contact" }],
      },
    ],
  },
};

export const PRIVATNOST: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Privatnost",
    uvod: "Koje podatke prikupljamo, zašto, koliko dugo ih čuvamo i koja su tvoja prava.",
    opis: "Nacrt politike privatnosti platforme (prototip).",
    napomena: NACRT.hr,
    odjeljci: [
      {
        id: "voditelj",
        naslov: "Voditelj obrade",
        tekst: [
          `Voditelj obrade je ITalk d.o.o., OIB ${NADOMJESTAK.hr}, sjedište ${NADOMJESTAK.hr}. Za pitanja o osobnim podacima koristi obrazac za kontakt.`,
        ],
        veze: [{ kljuc: "contact", tekst: "Kontakt" }],
      },
      {
        id: "podaci",
        naslov: "Koje podatke obrađujemo",
        definicije: [
          { pojam: "Račun", opis: "E-pošta, ime koje upišeš, jezik i povijest prijava (vrijeme, uređaj, skraćena IP adresa)." },
          { pojam: "Donacija", opis: "E-pošta za potvrdu, ime ako ga upišeš, poruka organizatoru, iznos i referenca uplate. Ime i iznos javno se prikazuju samo ako to dopustiš." },
          { pojam: "Uplata", opis: "IBAN uplatitelja ne vidimo. Od sustava za plaćanja dobivamo samo jednosmjerni sažetak iz kojeg se broj računa ne može dobiti natrag." },
          { pojam: "Organizacija", opis: "Podaci o organizaciji i ovlaštenoj osobi. Dokumente za provjeru čuva pružatelj računa; mi čuvamo samo status i referencu provjere." },
          { pojam: "Kontakt i prijave", opis: "Ime, e-pošta i sadržaj poruke ili prijave." },
        ],
      },
      {
        id: "svrha",
        naslov: "Zašto",
        popis: [
          "Da bi platforma radila: prijava, kampanje, donacije, potvrde i obavijesti koje si zatražio.",
          "Da bismo ispunili zakonske obveze, na primjer postupanje po prijavama nezakonitog sadržaja.",
          "Da bismo zaštitili korisnike od zlouporabe.",
        ],
      },
      {
        id: "kolacici",
        naslov: "Kolačići",
        definicije: [
          { pojam: "Jezik", opis: "Pamti odabrani jezik, godinu dana." },
          { pojam: "Prijava", opis: "Drži te prijavljenim dok se ne odjaviš." },
          { pojam: "Poveznica za praćenje", opis: "Pamti preko koje si poveznice za praćenje došao, 30 dana, da se donacija pripiše toj poveznici. Ne sadrži osobne podatke." },
        ],
        tekst: [
          "Ne koristimo oglasne kolačiće ni analitiku trećih strana. Fontovi i slike poslužuju se s naše domene.",
        ],
      },
      {
        id: "primatelji",
        naslov: "Tko još vidi podatke",
        popis: [
          "Organizator kampanje kojoj si donirao vidi podatke donacije koji su mu potrebni za zahvalu i, ako treba, povrat.",
          "Pružatelj računa organizacije obrađuje uplatu kao i svaki drugi bankovni prijenos.",
          "Pružatelj infrastrukture na kojoj platforma radi, kao izvršitelj obrade.",
        ],
      },
      {
        id: "prava",
        naslov: "Tvoja prava",
        tekst: [
          "Imaš pravo na pristup, ispravak i brisanje podataka, ograničenje obrade, prigovor i prijenos podataka. Pritužbu možeš podnijeti Agenciji za zaštitu osobnih podataka (AZOP).",
          "Rokovi čuvanja pojedinih podataka utvrdit će se prije pokretanja.",
        ],
      },
    ],
  },
  en: {
    naslov: "Privacy",
    uvod: "What data we collect, why, how long we keep it and what your rights are.",
    opis: "Draft privacy policy for the platform (prototype).",
    napomena: NACRT.en,
    odjeljci: [
      {
        id: "voditelj",
        naslov: "Data controller",
        tekst: [
          `The data controller is ITalk d.o.o., tax number ${NADOMJESTAK.en}, registered office ${NADOMJESTAK.en}. For questions about personal data, use the contact form.`,
        ],
        veze: [{ kljuc: "contact", tekst: "Contact" }],
      },
      {
        id: "podaci",
        naslov: "What data we process",
        definicije: [
          { pojam: "Account", opis: "Email, the name you enter, language and sign-in history (time, device, truncated IP address)." },
          { pojam: "Donation", opis: "Email for the confirmation, your name if you enter it, your message to the organiser, the amount and the payment reference. Your name and amount are shown publicly only if you allow it." },
          { pojam: "Payment", opis: "We do not see the payer's IBAN. The payment system gives us only a one-way digest from which the account number cannot be recovered." },
          { pojam: "Organisation", opis: "Details of the organisation and its authorised person. Verification documents are kept by the account provider; we keep only the verification status and a reference." },
          { pojam: "Contact and reports", opis: "Name, email and the content of the message or report." },
        ],
      },
      {
        id: "svrha",
        naslov: "Why",
        popis: [
          "To run the platform: sign-in, campaigns, donations, confirmations and notifications you asked for.",
          "To meet legal obligations, for example handling reports of illegal content.",
          "To protect users from abuse.",
        ],
      },
      {
        id: "kolacici",
        naslov: "Cookies",
        definicije: [
          { pojam: "Language", opis: "Remembers the language you chose, for one year." },
          { pojam: "Sign-in", opis: "Keeps you signed in until you sign out." },
          { pojam: "Tracking link", opis: "Remembers which tracking link you came through, for 30 days, so a donation is credited to that link. It holds no personal data." },
        ],
        tekst: ["We use no advertising cookies and no third-party analytics. Fonts and images are served from our own domain."],
      },
      {
        id: "primatelji",
        naslov: "Who else sees the data",
        popis: [
          "The organiser of a campaign you donated to sees the donation details they need to thank you and, if needed, make a refund.",
          "The organisation's account provider processes the payment like any other bank transfer.",
          "The infrastructure provider the platform runs on, as a data processor.",
        ],
      },
      {
        id: "prava",
        naslov: "Your rights",
        tekst: [
          "You have the right to access, rectify and erase your data, to restrict processing, to object and to data portability. You can lodge a complaint with the Croatian Personal Data Protection Agency (AZOP).",
          "Retention periods for individual types of data will be set before launch.",
        ],
      },
    ],
  },
};
