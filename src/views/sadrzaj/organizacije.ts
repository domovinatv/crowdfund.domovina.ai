/**
 * Za organizacije (docs/07 red 78), mjesečne kampanje (red 79, odluke 14, 215) i katalog ponuda
 * (red 80–81, faza 2). Izvori: odluke 150, 201–203, 18; pravni okvir §6.2–6.3.
 */
import type { Dvojezicno, SadrzajStranice } from "./tipovi";

export const ZA_ORGANIZACIJE: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Kampanje za organizacije",
    uvod:
      "Organizacija može prikupljati sama ili dopustiti drugima da prikupljaju u njezinu korist. U oba slučaja novac stiže izravno organizaciji, a ona odlučuje što se objavljuje u njezino ime.",
    opis: "Kako organizacija prikuplja sama ili kroz tuđe kampanje, kako odobrava kampanje i kamo ide novac.",
    odjeljci: [
      {
        id: "dva-nacina",
        naslov: "Dva načina",
        definicije: [
          { pojam: "Kampanja organizacije", opis: "Tim organizacije pokreće i vodi kampanju. Članovi rade svaki sa svojom prijavom, prema ulozi koju imaju." },
          { pojam: "Kampanja u korist organizacije", opis: "Volonter, roditelj ili navijač pokrene kampanju i odabere organizaciju kao primatelja. Kampanja se objavljuje tek kad je organizacija odobri." },
        ],
      },
      {
        id: "odobrenje",
        naslov: "Odobrenje",
        tekst: [
          "Zahtjev za odobrenje vidi član organizacije s ulogom administratora. Može ga odobriti ili odbiti. Dok zahtjev nije odobren, kampanja nije javna i ne prima donacije.",
        ],
      },
      {
        id: "uloge",
        naslov: "Uloge u timu",
        definicije: [
          { pojam: "Vlasnik", opis: "Upravlja članovima i podacima organizacije, pokreće provjeru i može obrisati organizaciju. Organizacija uvijek ima barem jednog vlasnika." },
          { pojam: "Administrator", opis: "Objavljuje kampanje i odobrava kampanje u korist organizacije." },
          { pojam: "Urednik", opis: "Uređuje kampanje, objavljuje novosti i odgovara na komentare." },
          { pojam: "Promatrač", opis: "Vidi financije i izvoz donacija, bez mogućnosti izmjena." },
        ],
      },
      {
        id: "novac",
        naslov: "Kamo ide novac",
        tekst: [
          "Svaka kampanja organizacije, i ona koju je pokrenuo netko drugi, šalje novac na račun i Safe te organizacije. Osoba koja je pokrenula kampanju u korist organizacije nikad ne dobiva novac.",
          "Platforma nije potpisnik Safea i ne može pokrenuti nijedan odlazni prijenos. Sredstva troše potpisnici koje odredi organizacija.",
        ],
        veze: [{ kljuc: "safety", tekst: "Sigurnost novca" }],
      },
      {
        id: "provjera",
        naslov: "Provjera organizacije",
        tekst: [
          "Organizacija prolazi provjeru kod pružatelja računa (podaci iz registra, OIB, ovlaštena osoba, statut). Platforma čuva samo status provjere i referencu, ne dokumente. Humanitarna akcija uz to prilaže rješenje nadležnog tijela.",
        ],
        veze: [
          { kljuc: "organisations", tekst: "Katalog organizacija" },
          { kljuc: "organisation.new", tekst: "Dodaj organizaciju" },
        ],
      },
    ],
  },
  en: {
    naslov: "Campaigns for organisations",
    uvod:
      "An organisation can raise money itself or let others raise money on its behalf. Either way the money goes straight to the organisation, and it decides what is published in its name.",
    opis: "How an organisation raises money itself or through other people's campaigns, how it approves them and where the money goes.",
    odjeljci: [
      {
        id: "dva-nacina",
        naslov: "Two ways",
        definicije: [
          { pojam: "The organisation's own campaign", opis: "The organisation's team starts and runs the campaign. Each member signs in with their own account and works according to their role." },
          { pojam: "A campaign for an organisation", opis: "A volunteer, parent or fan starts a campaign and chooses the organisation as the recipient. The campaign is published only after the organisation approves it." },
        ],
      },
      {
        id: "odobrenje",
        naslov: "Approval",
        tekst: [
          "Approval requests are seen by organisation members with the admin role. They can approve or reject it. Until the request is approved, the campaign is not public and does not receive donations.",
        ],
      },
      {
        id: "uloge",
        naslov: "Team roles",
        definicije: [
          { pojam: "Owner", opis: "Manages members and organisation details, starts verification and can delete the organisation. An organisation always has at least one owner." },
          { pojam: "Admin", opis: "Publishes campaigns and approves campaigns for the organisation." },
          { pojam: "Editor", opis: "Edits campaigns, posts updates and replies to comments." },
          { pojam: "Viewer", opis: "Sees finances and donation exports, without being able to change anything." },
        ],
      },
      {
        id: "novac",
        naslov: "Where the money goes",
        tekst: [
          "Every campaign for an organisation, including one started by someone else, sends money to that organisation's account and Safe. The person who started a campaign for an organisation never receives the money.",
          "The platform is not a signer on the Safe and cannot start any outgoing transfer. Funds are spent by the signers the organisation chooses.",
        ],
        veze: [{ kljuc: "safety", tekst: "Keeping money safe" }],
      },
      {
        id: "provjera",
        naslov: "Organisation verification",
        tekst: [
          "The organisation is verified by the account provider (registry details, tax number, authorised person, statute). The platform keeps only the verification status and a reference, not the documents. A humanitarian appeal also uploads the permit from the competent authority.",
        ],
        veze: [
          { kljuc: "organisations", tekst: "Organisations catalogue" },
          { kljuc: "organisation.new", tekst: "Add an organisation" },
        ],
      },
    ],
  },
};

export const MJESECNE: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Mjesečne kampanje",
    uvod:
      "Za troškove koji se ponavljaju, poput najma prostora, prehrane ili stipendija. Podržavatelj sam bira hoće li svaki mjesec dobiti podsjetnik ili postaviti trajni nalog u svojoj banci.",
    opis: "Redovita mjesečna podrška: podsjetnik s QR kodom ili trajni nalog, bez kartice i bez izravnog terećenja.",
    odjeljci: [
      {
        id: "podsjetnik",
        naslov: "Mjesečni podsjetnik",
        koraci: [
          "Na kampanji odabereš mjesečnu podršku, iznos i dan u mjesecu (od 1. do 28.).",
          "Tog dana dobiješ e-poruku s novim QR kodom i referencom za taj mjesec. Poveznica vrijedi 24 sata.",
          "Platiš u svojoj banci, kao i svaku drugu donaciju.",
        ],
        tekst: ["Ništa se ne naplaćuje samo od sebe: svaku uplatu potvrđuješ ti."],
      },
      {
        id: "trajni-nalog",
        naslov: "Trajni nalog",
        tekst: [
          "Ako ne želiš podsjetnike, kampanja ti daje IBAN i trajnu referencu. S njima u svojoj banci postaviš trajni nalog, a uplate se pripisuju kampanji svaki mjesec. Nalog mijenjaš ili gasiš u banci.",
        ],
      },
      {
        id: "upravljanje",
        naslov: "Pauza i otkaz",
        tekst: [
          "Mjesečnu podršku pauziraš, mijenjaš joj dan ili je otkažeš u postavkama računa. Ako tri mjeseca zaredom ne platiš po podsjetniku, podrška se sama pauzira i podsjetnici prestaju.",
        ],
        veze: [{ kljuc: "settings.recurring", tekst: "Moja mjesečna podrška" }],
      },
      {
        id: "zasto",
        naslov: "Zašto nema automatskog terećenja",
        tekst: [
          "Pružatelj računa organizacija za sada ne nudi SEPA izravno terećenje, a kartice ne koristimo. Podsjetnik i trajni nalog drže te u kontroli: novac nikad ne odlazi bez tvoje radnje.",
        ],
      },
    ],
  },
  en: {
    naslov: "Monthly campaigns",
    uvod:
      "For recurring costs such as rent, meals or scholarships. Supporters choose whether to get a reminder every month or set up a standing order with their bank.",
    opis: "Regular monthly support: a reminder with a QR code or a standing order, with no card and no direct debit.",
    odjeljci: [
      {
        id: "podsjetnik",
        naslov: "Monthly reminder",
        koraci: [
          "On the campaign, choose monthly support, an amount and a day of the month (1st to 28th).",
          "On that day you get an email with a new QR code and reference for that month. The link is valid for 24 hours.",
          "You pay in your bank, like any other donation.",
        ],
        tekst: ["Nothing is charged automatically: you confirm every payment yourself."],
      },
      {
        id: "trajni-nalog",
        naslov: "Standing order",
        tekst: [
          "If you prefer no reminders, the campaign gives you an IBAN and a permanent reference. Use them to set up a standing order with your bank, and each month's payment is credited to the campaign. You change or cancel the order in your bank.",
        ],
      },
      {
        id: "upravljanje",
        naslov: "Pausing and cancelling",
        tekst: [
          "You can pause monthly support, change its day or cancel it in your account settings. If you don't pay after a reminder three months in a row, the support pauses itself and the reminders stop.",
        ],
        veze: [{ kljuc: "settings.recurring", tekst: "My monthly support" }],
      },
      {
        id: "zasto",
        naslov: "Why there is no automatic debit",
        tekst: [
          "The organisations' account provider does not currently offer SEPA direct debit, and we don't use cards. A reminder or a standing order keeps you in control: money never leaves without you acting.",
        ],
      },
    ],
  },
};

export const PONUDE_KATALOG: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Ponude",
    uvod:
      "Ovdje će biti predmeti i usluge koje ljudi nude u korist kampanja. U prvoj fazi ponuda nema, pa je katalog prazan.",
    opis: "Katalog ponuda u korist kampanja; nije dio prve faze.",
    faza2: true,
    odjeljci: [],
  },
  en: {
    naslov: "Offers",
    uvod:
      "This is where items and services that people offer to benefit campaigns will appear. There are no offers in the first phase, so the catalogue is empty.",
    opis: "Catalogue of offers that benefit campaigns; not part of the first phase.",
    faza2: true,
    odjeljci: [],
  },
};

export const PONUDE_PRAZNO: Dvojezicno<{ naslov: string; tekst: string; veza: string }> = {
  hr: {
    naslov: "Još nema ponuda",
    tekst: "Ponude su prodaja, pa traže račune i porezno izvještavanje. Uvodimo ih kad to bude riješeno.",
    veza: "Kako će ponude raditi",
  },
  en: {
    naslov: "No offers yet",
    tekst: "Offers are sales, so they need invoices and tax reporting. We will introduce them once that is in place.",
    veza: "How offers will work",
  },
};

export const PONUDE_NOVA: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Nova ponuda",
    uvod: "Obrazac ponude u korist kampanje. U prvoj fazi ponude se ne objavljuju.",
    opis: "Obrazac nove ponude; nije dio prve faze.",
    faza2: true,
    odjeljci: [
      {
        id: "uvjeti",
        naslov: "Prije nego počneš",
        popis: [
          "Trebaš provjeren profil.",
          "Kampanja kojoj ponuda pomaže mora dopuštati ponude.",
          "Odgovaraš za opis, isporuku i za to da predmet smiješ prodati.",
        ],
        veze: [{ kljuc: "how-it-works.offers", tekst: "Kako će ponude raditi" }],
      },
    ],
  },
  en: {
    naslov: "New offer",
    uvod: "The form for an offer that benefits a campaign. Offers are not published in the first phase.",
    opis: "New offer form; not part of the first phase.",
    faza2: true,
    odjeljci: [
      {
        id: "uvjeti",
        naslov: "Before you start",
        popis: [
          "You need a verified profile.",
          "The campaign the offer supports must allow offers.",
          "You are responsible for the description, delivery and for having the right to sell the item.",
        ],
        veze: [{ kljuc: "how-it-works.offers", tekst: "How offers will work" }],
      },
    ],
  },
};
