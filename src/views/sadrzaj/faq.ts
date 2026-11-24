/**
 * Česta pitanja po kategorijama (docs/07 retci 108–109). Ključ kategorije je engleski u oba
 * jezika (odluka 502): `/hr/cesta-pitanja/donating` i `/en/faq/donating`.
 * Pitanje je `Odjeljak` (naslov = pitanje), pa ga crta isti okvir kao ostale stranice.
 */
import type { Dvojezicno, Odjeljak, SadrzajStranice } from "./tipovi";

export const KATEGORIJE_FAQ = ["donating", "organising", "organisations", "money", "sharing", "safety", "account"] as const;
export type KategorijaFaq = (typeof KATEGORIJE_FAQ)[number];
export const isKategorijaFaq = (x: unknown): x is KategorijaFaq => KATEGORIJE_FAQ.includes(x as KategorijaFaq);

export interface Kategorija {
  naziv: string;
  opis: string;
  pitanja: Odjeljak[];
}

export const FAQ_STRANICA: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Česta pitanja",
    uvod: "Odgovori na pitanja o doniranju, vođenju kampanje, novcu i sigurnosti. Ako ne nađeš odgovor, piši nam.",
    opis: "Česta pitanja po temama: doniranje, organizatori, organizacije, novac, dijeljenje, sigurnost i račun.",
    odjeljci: [],
  },
  en: {
    naslov: "Frequently asked questions",
    uvod: "Answers to questions about donating, running a campaign, money and security. If you can't find an answer, write to us.",
    opis: "Frequently asked questions by topic: donating, organisers, organisations, money, sharing, security and your account.",
    odjeljci: [],
  },
};

export const FAQ: Dvojezicno<Record<KategorijaFaq, Kategorija>> = {
  hr: {
    donating: {
      naziv: "Doniranje",
      opis: "Kako uplatiti, referenca, potvrda, anonimnost.",
      pitanja: [
        {
          id: "treba-li-racun",
          naslov: "Trebam li račun na platformi da bih donirao?",
          tekst: ["Ne. Dovoljna je e-pošta za potvrdu. Račun ti treba samo ako želiš otvoriti kasicu, pratiti svoje donacije na jednom mjestu ili podržavati mjesečno."],
        },
        {
          id: "kartica",
          naslov: "Mogu li platiti karticom?",
          tekst: ["Ne. Donacije su SEPA prijenosi u eurima iz tvoje banke, preko QR koda ili IBAN-a i reference. Zato nema kartičnih naknada i platforma ne vidi podatke tvoje kartice ni računa."],
          veze: [{ kljuc: "how-it-works.donate", tekst: "Kako donirati" }],
        },
        {
          id: "krivi-poziv",
          naslov: "Što ako pogriješim referencu?",
          tekst: ["Novac svejedno stiže organizaciji, ali ga sustav ne može sam pripisati kampanji. Javi se organizatoru ili nama preko obrasca za kontakt, s datumom i iznosom uplate."],
          veze: [{ kljuc: "contact", tekst: "Kontakt" }],
        },
        {
          id: "anonimno",
          naslov: "Mogu li donirati anonimno?",
          tekst: ["Možeš sakriti svoje ime, iznos ili oboje na javnom popisu donacija. Organizator ipak vidi podatke potrebne za zahvalu i eventualni povrat."],
        },
        {
          id: "inozemstvo",
          naslov: "Mogu li donirati iz inozemstva?",
          tekst: ["Da, iz bilo koje banke koja šalje SEPA prijenose u eurima. Iz banaka izvan SEPA područja uplata može biti skuplja i sporija."],
        },
      ],
    },
    organising: {
      naziv: "Vođenje kampanje",
      opis: "Tko može pokrenuti kampanju, cilj, rok, novosti.",
      pitanja: [
        {
          id: "tko",
          naslov: "Tko može pokrenuti kampanju?",
          tekst: ["U prvoj fazi organizacije: udruge, zaklade, humanitarne akcije s rješenjem, župe, klubovi i škole. Kampanje fizičkih osoba za sebe ili druge dolaze kasnije."],
          veze: [{ kljuc: "how-it-works.for-others", tekst: "Prikupljanje za druge" }],
        },
        {
          id: "cilj",
          naslov: "Što se dogodi kad kampanja dosegne cilj ili rok?",
          tekst: ["Ništa se ne zatvara samo od sebe: kampanja i dalje prima donacije dok je organizator ne zatvori. Novac je ionako od početka kod organizacije. Iznimka je humanitarna akcija, koja završava na rok iz rješenja."],
        },
        {
          id: "izmjene",
          naslov: "Mogu li mijenjati kampanju nakon objave?",
          tekst: ["Da, uz jednu iznimku: nakon što je namjena kampanje provjerena, naslov, opis i cilj su zaključani. Novosti možeš objavljivati uvijek."],
        },
        {
          id: "nacrt",
          naslov: "Gubi li se nacrt ako zatvorim preglednik?",
          tekst: ["Ne. Dok nisi prijavljen, nacrt se čuva u pregledniku, a nakon prijave na tvom računu."],
        },
      ],
    },
    organisations: {
      naziv: "Organizacije",
      opis: "Članovi i uloge, provjera, kampanje u korist organizacije.",
      pitanja: [
        {
          id: "clanovi",
          naslov: "Može li više ljudi voditi istu organizaciju?",
          tekst: ["Da. Pozoveš članove e-poštom i svakome dodijeliš ulogu: vlasnik, administrator, urednik ili promatrač. Svatko radi sa svojom prijavom, bez dijeljenja lozinke."],
          veze: [{ kljuc: "for-organisations", tekst: "Uloge u timu", sidro: "uloge" }],
        },
        {
          id: "vise-organizacija",
          naslov: "Mogu li biti član više organizacija?",
          tekst: ["Da, s različitim ulogama u svakoj. U izborniku računa biraš u čije ime trenutno radiš."],
        },
        {
          id: "provjera",
          naslov: "Kako se organizacija provjerava?",
          tekst: ["Provjeru radi pružatelj računa koji organizaciji otvara račun: podaci iz registra, OIB, ovlaštena osoba i statut. Platforma čuva samo status i referencu."],
        },
        {
          id: "tudja-kampanja",
          naslov: "Netko je pokrenuo kampanju za našu organizaciju. Što sada?",
          tekst: ["Administrator organizacije dobiva zahtjev za odobrenje. Kampanja nije javna dok je ne odobrite, a novac iz nje uvijek ide na račun organizacije."],
        },
      ],
    },
    money: {
      naziv: "Novac i troškovi",
      opis: "Provizija, napojnica, isplata, povrati.",
      pitanja: [
        {
          id: "provizija",
          naslov: "Koliko platforma uzima od donacije?",
          tekst: ["Ništa. Organizacija dobiva cijeli iznos. Platforma živi od dobrovoljnih napojnica, koje su uvijek zasebna uplata."],
          veze: [{ kljuc: "costs", tekst: "Troškovi" }],
        },
        {
          id: "isplata",
          naslov: "Kako organizacija isplaćuje novac?",
          tekst: ["Ne treba isplata. Donacija stiže izravno na račun i Safe organizacije, gdje je odmah na raspolaganju potpisnicima organizacije."],
        },
        {
          id: "napojnica-obavezna",
          naslov: "Moram li ostaviti napojnicu?",
          tekst: ["Ne. „0 €” je jednako istaknuta opcija kao i ostale, ništa nije unaprijed odabrano i izbor ne utječe na donaciju."],
        },
        {
          id: "povrat",
          naslov: "Kako dobiti donaciju natrag?",
          tekst: ["Zahtjev uputi organizatoru kampanje. Povrat radi organizacija sa svog računa, a platforma ga samo bilježi. Platforma ne može sama vratiti novac jer ga nikad nije imala."],
        },
        {
          id: "potvrda",
          naslov: "Dobivam li potvrdu o donaciji?",
          tekst: ["Da, e-poštom, s iznosom, referencom i kampanjom. Potvrda za porezne svrhe ovisi o organizaciji; pitaj organizatora."],
        },
      ],
    },
    sharing: {
      naziv: "Dijeljenje i kasice",
      opis: "QR kod, plakat, widget, poveznice za praćenje, kasice.",
      pitanja: [
        {
          id: "qr-istek",
          naslov: "Istječe li QR kod kampanje?",
          tekst: ["Ne. QR kod kampanje je trajan i vodi na stranicu kampanje. Istječe samo QR kod pojedine uplate."],
        },
        {
          id: "kasica-novac",
          naslov: "Ide li novac iz kasice meni?",
          tekst: ["Ne. Sve donacije kroz kasicu idu u glavnu kampanju, na račun organizacije."],
          veze: [{ kljuc: "how-it-works.moneyboxes", tekst: "Kasice" }],
        },
        {
          id: "statistika",
          naslov: "Tko vidi statistiku poveznice za praćenje?",
          tekst: ["Samo vlasnik poveznice i tim kampanje. Prikazuju se zbrojevi, ne imena podržavatelja."],
          veze: [{ kljuc: "how-it-works.sharing", tekst: "Dijeljenje kampanje" }],
        },
      ],
    },
    safety: {
      naziv: "Sigurnost i prijave",
      opis: "Tko drži novac, provjera, prijava sumnjive kampanje.",
      pitanja: [
        {
          id: "tko-drzi",
          naslov: "Tko drži novac dok kampanja traje?",
          tekst: ["Organizacija, na svom računu i Safeu. Platforma nije potpisnik i ne može pokrenuti nijedan odlazni prijenos."],
          veze: [{ kljuc: "safety", tekst: "Sigurnost" }],
        },
        {
          id: "sumnja",
          naslov: "Sumnjam da je kampanja prijevara. Što da radim?",
          tekst: ["Prijavi je preko poveznice na stranici kampanje ili obrasca za prijavu. Potvrdit ćemo primitak i obavijestiti te o odluci."],
          veze: [{ kljuc: "report", tekst: "Prijavi sadržaj" }],
        },
        {
          id: "lazna-poruka",
          naslov: "Dobio sam poruku koja traži podatke moje kartice. Je li od vas?",
          tekst: ["Nije. Nikad ne tražimo podatke kartice, lozinke ni prijavu u internetsko bankarstvo. Uplata se uvijek radi u tvojoj banci."],
        },
      ],
    },
    account: {
      naziv: "Račun i prijava",
      opis: "Prijava bez lozinke, promjena e-pošte, brisanje računa.",
      pitanja: [
        {
          id: "lozinka",
          naslov: "Zašto nema lozinke?",
          tekst: ["Prijavljuješ se poveznicom ili kodom poslanim e-poštom. Nema lozinke koju bi netko mogao pogoditi ili ukrasti."],
        },
        {
          id: "e-posta",
          naslov: "Kako promijeniti e-poštu?",
          tekst: ["Piši nam preko obrasca za kontakt s teme „Promjena e-pošte”, s adrese koja je trenutno vezana uz račun."],
          veze: [{ kljuc: "contact", tekst: "Kontakt", upit: "tema=email_change" }],
        },
        {
          id: "brisanje",
          naslov: "Mogu li obrisati račun?",
          tekst: ["Da, u postavkama profila, uz potvrdu kodom. Brisanjem se zatvaraju tvoje kampanje; donacije koje su već uplaćene ostaju kod organizacija."],
        },
      ],
    },
  },
  en: {
    donating: {
      naziv: "Donating",
      opis: "How to pay, the reference, confirmation, anonymity.",
      pitanja: [
        {
          id: "treba-li-racun",
          naslov: "Do I need an account on the platform to donate?",
          tekst: ["No. An email address for the confirmation is enough. You only need an account to open a moneybox, see all your donations in one place or give monthly."],
        },
        {
          id: "kartica",
          naslov: "Can I pay by card?",
          tekst: ["No. Donations are SEPA transfers in euros from your bank, using a QR code or an IBAN and reference. That is why there are no card fees, and the platform never sees your card or account details."],
          veze: [{ kljuc: "how-it-works.donate", tekst: "How to donate" }],
        },
        {
          id: "krivi-poziv",
          naslov: "What if I get the reference wrong?",
          tekst: ["The money still reaches the organisation, but the system cannot assign it to the campaign by itself. Contact the organiser, or us through the contact form, with the date and amount of the payment."],
          veze: [{ kljuc: "contact", tekst: "Contact" }],
        },
        {
          id: "anonimno",
          naslov: "Can I donate anonymously?",
          tekst: ["You can hide your name, the amount or both on the public list of donations. The organiser still sees the details needed to thank you and make any refund."],
        },
        {
          id: "inozemstvo",
          naslov: "Can I donate from abroad?",
          tekst: ["Yes, from any bank that sends SEPA transfers in euros. From banks outside the SEPA area a payment may cost more and take longer."],
        },
      ],
    },
    organising: {
      naziv: "Running a campaign",
      opis: "Who can start a campaign, goals, end dates, updates.",
      pitanja: [
        {
          id: "tko",
          naslov: "Who can start a campaign?",
          tekst: ["In the first phase, organisations: associations, foundations, permitted humanitarian appeals, parishes, clubs and schools. Campaigns by individuals for themselves or others come later."],
          veze: [{ kljuc: "how-it-works.for-others", tekst: "Fundraising for others" }],
        },
        {
          id: "cilj",
          naslov: "What happens when a campaign reaches its goal or end date?",
          tekst: ["Nothing closes automatically: the campaign keeps receiving donations until the organiser closes it. The money is with the organisation from the start anyway. The exception is a humanitarian appeal, which ends on the date set in its permit."],
        },
        {
          id: "izmjene",
          naslov: "Can I edit a campaign after publishing it?",
          tekst: ["Yes, with one exception: once the campaign's purpose has been verified, the title, description and goal are locked. You can always post updates."],
        },
        {
          id: "nacrt",
          naslov: "Do I lose my draft if I close the browser?",
          tekst: ["No. Before you sign in, the draft is kept in your browser, and after you sign in, in your account."],
        },
      ],
    },
    organisations: {
      naziv: "Organisations",
      opis: "Members and roles, verification, campaigns for an organisation.",
      pitanja: [
        {
          id: "clanovi",
          naslov: "Can several people run the same organisation?",
          tekst: ["Yes. Invite members by email and give each a role: owner, admin, editor or viewer. Everyone signs in with their own account, with no shared password."],
          veze: [{ kljuc: "for-organisations", tekst: "Team roles", sidro: "uloge" }],
        },
        {
          id: "vise-organizacija",
          naslov: "Can I be a member of several organisations?",
          tekst: ["Yes, with a different role in each. In the account menu you choose which organisation you are currently acting for."],
        },
        {
          id: "provjera",
          naslov: "How is an organisation verified?",
          tekst: ["Verification is done by the account provider that opens the organisation's account: registry details, tax number, authorised person and statute. The platform keeps only the status and a reference."],
        },
        {
          id: "tudja-kampanja",
          naslov: "Someone started a campaign for our organisation. What now?",
          tekst: ["The organisation's admins receive an approval request. The campaign is not public until you approve it, and its money always goes to the organisation's account."],
        },
      ],
    },
    money: {
      naziv: "Money and costs",
      opis: "Commission, tips, payouts, refunds.",
      pitanja: [
        {
          id: "provizija",
          naslov: "How much does the platform take from a donation?",
          tekst: ["Nothing. The organisation receives the full amount. The platform lives on voluntary tips, which are always a separate payment."],
          veze: [{ kljuc: "costs", tekst: "Costs" }],
        },
        {
          id: "isplata",
          naslov: "How does an organisation withdraw the money?",
          tekst: ["No withdrawal is needed. A donation arrives directly in the organisation's account and Safe, where it is immediately available to the organisation's signers."],
        },
        {
          id: "napojnica-obavezna",
          naslov: "Do I have to leave a tip?",
          tekst: ["No. “€0” is shown as prominently as the other options, nothing is preselected and your choice has no effect on the donation."],
        },
        {
          id: "povrat",
          naslov: "How do I get a donation back?",
          tekst: ["Send your request to the campaign organiser. Refunds are made by the organisation from its own account, and the platform only records them. The platform cannot return money itself because it never had it."],
        },
        {
          id: "potvrda",
          naslov: "Do I get a confirmation of my donation?",
          tekst: ["Yes, by email, with the amount, reference and campaign. Whether you can get a receipt for tax purposes depends on the organisation; ask the organiser."],
        },
      ],
    },
    sharing: {
      naziv: "Sharing and moneyboxes",
      opis: "QR code, poster, widget, tracking links, moneyboxes.",
      pitanja: [
        {
          id: "qr-istek",
          naslov: "Does the campaign QR code expire?",
          tekst: ["No. The campaign QR code is permanent and leads to the campaign page. Only the QR code for an individual payment expires."],
        },
        {
          id: "kasica-novac",
          naslov: "Does the money from my moneybox go to me?",
          tekst: ["No. All donations through a moneybox go to the main campaign, into the organisation's account."],
          veze: [{ kljuc: "how-it-works.moneyboxes", tekst: "Moneyboxes" }],
        },
        {
          id: "statistika",
          naslov: "Who can see the statistics of a tracking link?",
          tekst: ["Only the link's owner and the campaign team. They show totals, not supporters' names."],
          veze: [{ kljuc: "how-it-works.sharing", tekst: "Sharing a campaign" }],
        },
      ],
    },
    safety: {
      naziv: "Security and reports",
      opis: "Who holds the money, verification, reporting a suspicious campaign.",
      pitanja: [
        {
          id: "tko-drzi",
          naslov: "Who holds the money while a campaign is running?",
          tekst: ["The organisation, in its own account and Safe. The platform is not a signer and cannot start any outgoing transfer."],
          veze: [{ kljuc: "safety", tekst: "Security" }],
        },
        {
          id: "sumnja",
          naslov: "I suspect a campaign is a scam. What should I do?",
          tekst: ["Report it using the link on the campaign page or the report form. We will confirm receipt and tell you about the decision."],
          veze: [{ kljuc: "report", tekst: "Report content" }],
        },
        {
          id: "lazna-poruka",
          naslov: "I got a message asking for my card details. Is it from you?",
          tekst: ["No. We never ask for card details, passwords or your online banking login. Payments are always made in your own bank."],
        },
      ],
    },
    account: {
      naziv: "Account and sign-in",
      opis: "Passwordless sign-in, changing your email, deleting your account.",
      pitanja: [
        {
          id: "lozinka",
          naslov: "Why is there no password?",
          tekst: ["You sign in with a link or code sent by email. There is no password for anyone to guess or steal."],
        },
        {
          id: "e-posta",
          naslov: "How do I change my email address?",
          tekst: ["Write to us through the contact form with the topic “Email address change”, from the address currently linked to your account."],
          veze: [{ kljuc: "contact", tekst: "Contact", upit: "tema=email_change" }],
        },
        {
          id: "brisanje",
          naslov: "Can I delete my account?",
          tekst: ["Yes, in your profile settings, with a confirmation code. Deleting your account closes your campaigns; donations already paid stay with the organisations."],
        },
      ],
    },
  },
};
