/**
 * „Kako radi” (docs/07 retci 101–106): prikupljanje za organizacije, doniranje, kasice,
 * dijeljenje, te dvije stranice izvan faze 1 (za druge, ponude). Izvori: docs/01, 02,
 * odluke 6–8, 14, 150, 202–210, 304; pravni okvir §6.
 */
import type { Dvojezicno, SadrzajStranice } from "./tipovi";

export const KAKO_RADI: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Kako radi prikupljanje",
    uvod:
      "Udruga, zaklada ili druga organizacija pokreće kampanju, ljudi doniraju bankovnim prijenosom, a novac stiže izravno organizaciji. Platforma ne uzima proviziju i nikad ne drži tuđi novac.",
    opis: "Kako organizacija pokreće kampanju, kako stižu donacije i kamo ide novac.",
    odjeljci: [
      {
        id: "tko-moze",
        naslov: "Tko može pokrenuti kampanju",
        tekst: [
          "U prvoj fazi kampanje pokreću pravne osobe: udruge i zaklade za svoju djelatnost, humanitarne akcije s rješenjem nadležnog tijela, župe, klubovi i škole. Organizacija može imati više članova s različitim ulogama, kao tim.",
          "Kampanje fizičkih osoba za sebe, obitelj ili prijatelje prikazane su u prototipu, ali u prvoj fazi nisu dostupne.",
        ],
        veze: [
          { kljuc: "for-organisations", tekst: "Kampanja u korist organizacije" },
          { kljuc: "how-it-works.for-others", tekst: "Prikupljanje za druge" },
        ],
      },
      {
        id: "koraci",
        naslov: "Od ideje do prve donacije",
        koraci: [
          "Prijaviš se e-poštom: dobiješ poveznicu ili kod, bez lozinke.",
          "Dodaš organizaciju i pozoveš članove. Organizacija prolazi provjeru kod pružatelja računa, koji vodi račun na koji stiže novac.",
          "U čarobnjaku odabereš vrstu kampanje, upišeš cilj i rok, dodaš sliku i opis. Nacrt se sprema dok radiš.",
          "Član s ulogom administratora objavljuje kampanju u ime organizacije.",
          "Dijeliš poveznicu, QR kod, plakat ili widget. Svaka donacija odmah je vidljiva na stranici kampanje.",
          "Javljaš novosti, odgovaraš na komentare i zahvaljuješ podržavateljima.",
        ],
        veze: [{ kljuc: "new-campaign", tekst: "Pokreni kampanju" }],
      },
      {
        id: "vrste",
        naslov: "Vrste kampanja",
        definicije: [
          { pojam: "Jednokratna", opis: "Prikupljanje za jasnu svrhu, s ciljem i po želji rokom. Cilj ne zatvara kampanju: može primati donacije i nakon što ga dosegne." },
          { pojam: "Mjesečna", opis: "Za redovite troškove. Podržavatelj dobiva mjesečni podsjetnik s QR kodom ili postavi trajni nalog u svojoj banci." },
          { pojam: "U korist organizacije", opis: "Netko pokreće kampanju, a novac ide organizaciji. Organizacija je odobrava prije objave." },
        ],
        veze: [{ kljuc: "monthly", tekst: "Mjesečne kampanje" }],
      },
      {
        id: "novac",
        naslov: "Kamo ide novac",
        tekst: [
          "Svaka donacija je SEPA prijenos iz banke podržavatelja izravno na račun organizacije kod licenciranog pružatelja (Monerium), odnosno na Safe organizacije. Platforma ima tehničku vezu koja uparuje uplatu s kampanjom, ali ne može pokrenuti nijedan odlazni prijenos.",
          "Zato nema ni isplate: novac je kod organizacije od trenutka uplate. Organizacija ga troši prema svojim pravilima potpisivanja.",
        ],
        veze: [
          { kljuc: "safety", tekst: "Tko drži novac" },
          { kljuc: "costs", tekst: "Troškovi" },
        ],
      },
    ],
  },
  en: {
    naslov: "How fundraising works",
    uvod:
      "An association, foundation or other organisation starts a campaign, people donate by bank transfer, and the money goes straight to the organisation. The platform takes no commission and never holds anyone's money.",
    opis: "How an organisation starts a campaign, how donations arrive and where the money goes.",
    odjeljci: [
      {
        id: "tko-moze",
        naslov: "Who can start a campaign",
        tekst: [
          "In the first phase, campaigns are run by legal entities: associations and foundations for their own work, humanitarian appeals with a permit from the competent authority, parishes, clubs and schools. An organisation can have several members with different roles, like a team.",
          "Campaigns by individuals for themselves, family or friends are shown in the prototype but are not available in the first phase.",
        ],
        veze: [
          { kljuc: "for-organisations", tekst: "Campaigns for an organisation" },
          { kljuc: "how-it-works.for-others", tekst: "Fundraising for others" },
        ],
      },
      {
        id: "koraci",
        naslov: "From idea to first donation",
        koraci: [
          "Sign in with your email: you get a link or a code, no password.",
          "Add your organisation and invite members. The organisation is checked by the account provider that holds the account the money arrives in.",
          "In the wizard, choose a campaign type, set a goal and an end date, add an image and a description. Your draft is saved as you go.",
          "A member with the admin role publishes the campaign on behalf of the organisation.",
          "Share the link, QR code, poster or widget. Every donation shows up on the campaign page straight away.",
          "Post updates, reply to comments and thank your supporters.",
        ],
        veze: [{ kljuc: "new-campaign", tekst: "Start a campaign" }],
      },
      {
        id: "vrste",
        naslov: "Campaign types",
        definicije: [
          { pojam: "One-off", opis: "Fundraising for a clear purpose, with a goal and optionally an end date. Reaching the goal does not close the campaign: it can keep receiving donations." },
          { pojam: "Monthly", opis: "For ongoing costs. Supporters get a monthly reminder with a QR code, or set up a standing order with their bank." },
          { pojam: "For an organisation", opis: "Someone starts a campaign and the money goes to an organisation. The organisation approves it before it is published." },
        ],
        veze: [{ kljuc: "monthly", tekst: "Monthly campaigns" }],
      },
      {
        id: "novac",
        naslov: "Where the money goes",
        tekst: [
          "Every donation is a SEPA transfer from the supporter's bank directly to the organisation's account with a licensed provider (Monerium), that is, to the organisation's Safe. The platform has a technical link that matches the payment to the campaign, but it cannot start any outgoing transfer.",
          "That is why there is no payout: the money is with the organisation from the moment it is paid. The organisation spends it according to its own signing rules.",
        ],
        veze: [
          { kljuc: "safety", tekst: "Who holds the money" },
          { kljuc: "costs", tekst: "Costs" },
        ],
      },
    ],
  },
};

export const DONIRANJE: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Kako donirati",
    uvod:
      "Doniraš bankovnim prijenosom iz svoje banke: skeniraš QR kod u mobilnom bankarstvu ili prepišeš IBAN i referencu. Ne trebaš račun na platformi ni karticu.",
    opis: "Donacija SEPA prijenosom: QR kod, IBAN i referenca, dobrovoljna napojnica.",
    odjeljci: [
      {
        id: "koraci",
        naslov: "Korak po korak",
        koraci: [
          "Na stranici kampanje odabereš „Podrži” i upišeš iznos u eurima.",
          "Po želji dodaš poruku organizatoru (do 300 znakova) i odabereš hoće li se tvoje ime ili iznos prikazati javno.",
          "Upišeš e-poštu za potvrdu. Ime nije obavezno.",
          "Dobiješ QR kod te IBAN i referencu. Platiš u svojoj banci; najbrže je instant SEPA plaćanje.",
          "Stranica sama prati uplatu i javi kad je stigla.",
        ],
      },
      {
        id: "referenca",
        naslov: "Zašto je referenca važna",
        tekst: [
          "Referenca povezuje tvoju uplatu s kampanjom. Ako je ne prepišeš točno, uplata svejedno stiže organizaciji, ali je sustav ne može automatski pripisati kampanji.",
          "Iznos nikad ne služi za prepoznavanje uplatitelja. Uplata se veže samo uz referencu, pa ne moraš dodavati centi ni mijenjati iznos.",
        ],
      },
      {
        id: "stanja",
        naslov: "Stanja uplate",
        definicije: [
          { pojam: "Čeka uplatu", opis: "QR kod je izdan, uplata još nije stigla. Poveznica vrijedi ograničeno vrijeme." },
          { pojam: "Plaćeno", opis: "Uplata je stigla na račun organizacije i vidi se na kampanji." },
          { pojam: "Uplaćeno manje", opis: "Stigao je manji iznos od upisanog. Novac je kod organizacije, a doprinos se bilježi s uplaćenim iznosom." },
          { pojam: "Isteklo", opis: "Uplata nije stigla na vrijeme. Možeš pokrenuti novu." },
        ],
      },
      {
        id: "napojnica",
        naslov: "Napojnica platformi",
        tekst: [
          "Nakon donacije možeš, ako želiš, podržati i platformu. To je zaseban, drugi prijenos s vlastitim QR kodom, nikad dio donacije kampanji. Ništa nije unaprijed odabrano, a „0 €” je jednako istaknuta kao i ostali iznosi.",
        ],
        veze: [{ kljuc: "costs", tekst: "Troškovi i napojnica", sidro: "napojnica" }],
      },
      {
        id: "tvrtka",
        naslov: "Donacija u ime tvrtke",
        faza2: true,
        tekst: [
          "Doniranje s podacima pravne osobe (naziv, OIB) za potvrdu o donaciji postoji u sučelju, ali u prvoj fazi nije dostupno.",
        ],
      },
    ],
  },
  en: {
    naslov: "How to donate",
    uvod:
      "You donate by bank transfer from your own bank: scan the QR code in your mobile banking app or copy the IBAN and reference. You don't need an account on the platform or a card.",
    opis: "Donating by SEPA transfer: QR code, IBAN and reference, and an optional tip.",
    odjeljci: [
      {
        id: "koraci",
        naslov: "Step by step",
        koraci: [
          "On the campaign page, choose “Support” and enter an amount in euros.",
          "Optionally add a message to the organiser (up to 300 characters) and choose whether your name or amount is shown publicly.",
          "Enter your email for the confirmation. Your name is optional.",
          "You get a QR code plus an IBAN and a reference. Pay in your bank; an instant SEPA payment is fastest.",
          "The page tracks the payment and tells you when it has arrived.",
        ],
      },
      {
        id: "referenca",
        naslov: "Why the reference matters",
        tekst: [
          "The reference links your payment to the campaign. If you don't copy it exactly, the money still reaches the organisation, but the system cannot assign it to the campaign automatically.",
          "The amount is never used to identify who paid. A payment is matched by its reference only, so you never need to add cents or change the amount.",
        ],
      },
      {
        id: "stanja",
        naslov: "Payment statuses",
        definicije: [
          { pojam: "Awaiting payment", opis: "The QR code has been issued but the payment has not arrived yet. The link is valid for a limited time." },
          { pojam: "Paid", opis: "The payment has reached the organisation's account and is shown on the campaign." },
          { pojam: "Underpaid", opis: "A smaller amount than entered arrived. The money is with the organisation, and the contribution is recorded with the amount paid." },
          { pojam: "Expired", opis: "The payment did not arrive in time. You can start a new one." },
        ],
      },
      {
        id: "napojnica",
        naslov: "Tipping the platform",
        tekst: [
          "After donating you can, if you wish, also support the platform. It is a separate, second transfer with its own QR code, never part of your donation to the campaign. Nothing is preselected, and “€0” is shown just as prominently as the other amounts.",
        ],
        veze: [{ kljuc: "costs", tekst: "Costs and tips", sidro: "napojnica" }],
      },
      {
        id: "tvrtka",
        naslov: "Donating on behalf of a company",
        faza2: true,
        tekst: [
          "Donating with a legal entity's details (name, tax number) for a donation receipt exists in the interface but is not available in the first phase.",
        ],
      },
    ],
  },
};

export const KASICE: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Kasice",
    uvod:
      "Kasica je tvoja mala akcija unutar tuđe kampanje: za rođendan, utrku ili okupljanje pozoveš prijatelje da doniraju, a sav novac ide u glavnu kampanju.",
    opis: "Kasica za rođendan, utrku ili događaj: vlastita stranica, novac ide u glavnu kampanju.",
    odjeljci: [
      {
        id: "sto-je",
        naslov: "Što je kasica",
        tekst: [
          "Kasica ima svoj naslov, kratki opis, po želji cilj i kratku adresu oblika /s/ime. Prikazuje koliko je prikupljeno kroz nju, a donacije se zbrajaju i u glavnu kampanju.",
          "Novac nikad ne ide osobi koja je otvorila kasicu. Plaćanje je isto kao na kampanji: na račun organizacije, s referencom koja bilježi kasicu.",
        ],
      },
      {
        id: "otvaranje",
        naslov: "Kako otvoriti kasicu",
        koraci: [
          "Na stranici kampanje koja dopušta kasice odabereš „Otvori kasicu”. Trebaš biti prijavljen.",
          "Upišeš naslov (do 60 znakova) i opis. Kratka adresa se predloži sama, a možeš je promijeniti.",
          "Po želji postaviš cilj kasice i poruku zahvale.",
          "Prihvatiš pravila kasica i podijeliš poveznicu.",
        ],
      },
      {
        id: "organizator",
        naslov: "Za organizatora kampanje",
        tekst: [
          "Organizator odlučuje dopušta li kampanja kasice i u upravljanju kampanjom vidi sve kasice s prikupljenim iznosom. Pojedinu kasicu može isključiti.",
        ],
      },
    ],
  },
  en: {
    naslov: "Moneyboxes",
    uvod:
      "A moneybox is your own small drive inside someone else's campaign: for a birthday, a race or a get-together you invite friends to donate, and all the money goes to the main campaign.",
    opis: "A moneybox for a birthday, race or event: its own page, the money goes to the main campaign.",
    odjeljci: [
      {
        id: "sto-je",
        naslov: "What a moneybox is",
        tekst: [
          "A moneybox has its own title, a short description, an optional goal and a short address like /s/name. It shows how much has been raised through it, and its donations also count towards the main campaign.",
          "The money never goes to the person who opened the moneybox. Payment works just like on the campaign: to the organisation's account, with a reference that records the moneybox.",
        ],
      },
      {
        id: "otvaranje",
        naslov: "How to open a moneybox",
        koraci: [
          "On a campaign that allows moneyboxes, choose “Open a moneybox”. You need to be signed in.",
          "Enter a title (up to 60 characters) and a description. A short address is suggested for you and you can change it.",
          "Optionally set a goal for the moneybox and a thank-you message.",
          "Accept the moneybox rules and share the link.",
        ],
      },
      {
        id: "organizator",
        naslov: "For the campaign organiser",
        tekst: [
          "The organiser decides whether a campaign allows moneyboxes and sees every moneybox and the amount it has raised in campaign management. They can switch off any single moneybox.",
        ],
      },
    ],
  },
};

export const DIJELJENJE: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Dijeljenje kampanje",
    uvod:
      "Većina donacija dolazi od ljudi koji kampanju vide preko poznanika. Zato svaka kampanja ima nekoliko alata za dijeljenje, na mreži i izvan nje.",
    opis: "Poveznica, QR kod, plakat, widget i poveznice za praćenje s anonimnom statistikom.",
    odjeljci: [
      {
        id: "alati",
        naslov: "Alati",
        definicije: [
          { pojam: "Kratka poveznica", opis: "Adresa kampanje od šest znakova, prikladna za poruke i društvene mreže." },
          { pojam: "QR kod", opis: "Trajni QR kod kampanje za letke, plakate i ekrane. Ne istječe." },
          { pojam: "Plakat", opis: "Stranica za ispis s naslovom, slikom, QR kodom i kratkom adresom." },
          { pojam: "Widget", opis: "Okvir s napretkom kampanje koji se ugrađuje na web stranicu organizacije." },
        ],
      },
      {
        id: "pracenje",
        naslov: "Poveznice za praćenje",
        tekst: [
          "Za svaki kanal (newsletter, plakat u crkvi, objava na mreži) možeš napraviti zasebnu poveznicu oblika /z/ime. Donacija se pripisuje poveznici ako je podržavatelj došao preko nje u zadnjih 30 dana.",
          "Statistiku poveznice vide samo njezin vlasnik i tim kampanje, nikad javno. Prikazuju se zbrojevi, ne imena.",
        ],
      },
      {
        id: "stream",
        naslov: "Widget za prijenos uživo",
        faza2: true,
        tekst: ["Prikaz napretka kampanje preko prijenosa uživo postoji u sučelju, ali nije dio prve faze."],
      },
    ],
  },
  en: {
    naslov: "Sharing a campaign",
    uvod:
      "Most donations come from people who see a campaign through someone they know. That is why every campaign has several sharing tools, online and offline.",
    opis: "Short link, QR code, poster, widget and tracking links with anonymous statistics.",
    odjeljci: [
      {
        id: "alati",
        naslov: "Tools",
        definicije: [
          { pojam: "Short link", opis: "A six-character campaign address, handy for messages and social media." },
          { pojam: "QR code", opis: "A permanent campaign QR code for leaflets, posters and screens. It does not expire." },
          { pojam: "Poster", opis: "A printable page with the title, image, QR code and short address." },
          { pojam: "Widget", opis: "A frame showing campaign progress that you can embed on the organisation's website." },
        ],
      },
      {
        id: "pracenje",
        naslov: "Tracking links",
        tekst: [
          "For each channel (newsletter, a poster in the parish hall, a social media post) you can create a separate link like /z/name. A donation is credited to the link if the supporter arrived through it within the last 30 days.",
          "Link statistics are visible only to the link's owner and the campaign team, never publicly. They show totals, not names.",
        ],
      },
      {
        id: "stream",
        naslov: "Live stream widget",
        faza2: true,
        tekst: ["Showing campaign progress on a live stream exists in the interface but is not part of the first phase."],
      },
    ],
  },
};

export const ZA_DRUGE: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Prikupljanje za druge",
    uvod:
      "Kampanja koju fizička osoba pokreće za sebe, člana obitelji ili prijatelja. Prototip prikazuje cijeli tok, ali u prvoj fazi takve kampanje nisu dostupne.",
    opis: "Kampanje fizičkih osoba za sebe ili druge: kako će raditi i zašto nisu u prvoj fazi.",
    faza2: true,
    odjeljci: [
      {
        id: "zasto",
        naslov: "Zašto ne u prvoj fazi",
        tekst: [
          "Novac na platformi uvijek ide izravno na račun organizatora kod licenciranog pružatelja. Za fizičke osobe taj put još nije otvoren, a i porezna pravila za darove fizičkim osobama treba razjasniti prije nego ih ponudimo.",
          "Dok to ne bude riješeno, osoba u potrebi može dobiti pomoć kroz kampanju udruge ili humanitarne akcije s rješenjem.",
        ],
        veze: [{ kljuc: "for-organisations", tekst: "Kampanja u korist organizacije" }],
      },
      {
        id: "kako-ce",
        naslov: "Kako će raditi",
        popis: [
          "Organizator je osoba s provjerenim identitetom; provjeru radi pružatelj računa.",
          "Ako se prikuplja za drugu osobu, potrebna je njezina suglasnost, a za maloljetnika suglasnost roditelja ili skrbnika.",
          "Svrha mora biti jasna i dokaziva; za veće iznose traže se dokumenti o namjeni.",
          "Novac ide na račun organizatora, koji odgovara da ga potroši za navedenu svrhu.",
        ],
      },
    ],
  },
  en: {
    naslov: "Fundraising for others",
    uvod:
      "A campaign that an individual starts for themselves, a family member or a friend. The prototype shows the whole flow, but such campaigns are not available in the first phase.",
    opis: "Campaigns by individuals for themselves or others: how they will work and why they are not in the first phase.",
    faza2: true,
    odjeljci: [
      {
        id: "zasto",
        naslov: "Why not in the first phase",
        tekst: [
          "On the platform, money always goes directly to the organiser's account with a licensed provider. That route is not yet open for individuals, and the tax rules on gifts to individuals need to be clarified before we offer it.",
          "Until then, a person in need can be helped through a campaign by an association or a permitted humanitarian appeal.",
        ],
        veze: [{ kljuc: "for-organisations", tekst: "Campaigns for an organisation" }],
      },
      {
        id: "kako-ce",
        naslov: "How it will work",
        popis: [
          "The organiser is a person with a verified identity; the check is done by the account provider.",
          "When raising money for someone else, their consent is required, and for a minor the consent of a parent or guardian.",
          "The purpose must be clear and provable; larger amounts require documents about how the money will be used.",
          "The money goes to the organiser's account, and the organiser is responsible for spending it on the stated purpose.",
        ],
      },
    ],
  },
};

export const PONUDE_KAKO: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Ponude i nagrade",
    uvod:
      "Ponuda je predmet ili usluga koju netko nudi u korist kampanje: kupac plati, a novac ide kampanji. Prototip prikazuje katalog i obrazac ponude, ali u prvoj fazi ponude nisu dostupne.",
    opis: "Kupnja i prodaja ponuda u korist kampanje: kako će raditi i zašto nisu u prvoj fazi.",
    faza2: true,
    odjeljci: [
      {
        id: "zasto",
        naslov: "Zašto ne u prvoj fazi",
        tekst: [
          "Ponuda je prodaja, a ne donacija. Prodaja donosi obveze koje donacija nema: račun i fiskalizaciju, izvještavanje platforme poreznoj upravi o prodavateljima i potrošačka prava kupca. Ponude uvodimo tek kad sve to bude pokriveno.",
        ],
      },
      {
        id: "kupnja",
        naslov: "Kupnja",
        popis: [
          "Ponuda ima naslov, opis, slike, cijenu ili početnu cijenu za dražbu, količinu i način isporuke.",
          "Kod dražbe se ponuda ne može povući, a pobjednik ima ograničeno vrijeme za uplatu.",
          "Plaćanje ide istim putem kao donacija: izravno na račun organizatora kampanje.",
        ],
      },
      {
        id: "prodaja",
        naslov: "Prodaja",
        popis: [
          "Ponudu može dodati organizator kampanje ili druga osoba s provjerenim profilom, ako kampanja to dopušta.",
          "Prodavatelj odgovara za opis, isporuku i za to da predmet smije prodati.",
        ],
        veze: [{ kljuc: "offers", tekst: "Katalog ponuda" }],
      },
    ],
  },
  en: {
    naslov: "Offers and rewards",
    uvod:
      "An offer is an item or service that someone sells to benefit a campaign: the buyer pays and the money goes to the campaign. The prototype shows the catalogue and the offer form, but offers are not available in the first phase.",
    opis: "Buying and selling offers to benefit a campaign: how it will work and why it is not in the first phase.",
    faza2: true,
    odjeljci: [
      {
        id: "zasto",
        naslov: "Why not in the first phase",
        tekst: [
          "An offer is a sale, not a donation. Sales bring obligations that donations do not: invoices and fiscalisation, platform reporting on sellers to the tax authority, and consumer rights for the buyer. We will introduce offers only once all of this is covered.",
        ],
      },
      {
        id: "kupnja",
        naslov: "Buying",
        popis: [
          "An offer has a title, description, images, a price or a starting price for an auction, a quantity and a delivery method.",
          "Auction bids cannot be withdrawn, and the winner has a limited time to pay.",
          "Payment goes the same way as a donation: straight to the campaign organiser's account.",
        ],
      },
      {
        id: "prodaja",
        naslov: "Selling",
        popis: [
          "An offer can be added by the campaign organiser or by another person with a verified profile, if the campaign allows it.",
          "The seller is responsible for the description, delivery and for having the right to sell the item.",
        ],
        veze: [{ kljuc: "offers", tekst: "Offers catalogue" }],
      },
    ],
  },
};
