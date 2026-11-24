/**
 * Sigurnost (docs/07 red 110): tko drži novac (Safe organizacije, Monerium, Swan), verifikacija,
 * prijave. Izvori: odluke 6, 18, 203, 208, 210; pravni okvir §4.3, §6.1, §6.3.
 */
import type { Dvojezicno, SadrzajStranice } from "./tipovi";

export const SIGURNOST: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Sigurnost",
    uvod:
      "Najsigurniji novac je onaj koji platforma nikad ne dira. Donacije idu izravno organizaciji, organizacije prolaze provjeru, a svatko može prijaviti sumnjivu kampanju.",
    opis: "Tko drži novac, kako se provjeravaju organizacije i kampanje, i kako prijaviti sumnjiv sadržaj.",
    odjeljci: [
      {
        id: "novac",
        naslov: "Tko drži novac",
        definicije: [
          { pojam: "Organizacija", opis: "Novac je na Safeu organizacije: digitalnom sefu kojim upravljaju potpisnici organizacije. Za trošenje treba više potpisa (na primjer dva od tri), pa ni jedna osoba ne može sama isprazniti račun." },
          { pojam: "Monerium", opis: "Licencirana institucija za elektronički novac koja organizaciji daje IBAN povezan sa Safeom, provjerava organizaciju i pretvara SEPA uplate u eure na Safeu." },
          { pojam: "Swan", opis: "Licencirana institucija za elektronički novac preko koje će organizacija moći primati donacije na klasičan bankovni račun u svoje ime. Nije dio prve faze." },
          { pojam: "Platforma", opis: "Ne drži novac, nije potpisnik nijednog Safea i nema pristup računima. Njezin sustav za plaćanja samo uparuje pristiglu uplatu s kampanjom preko reference." },
        ],
      },
      {
        id: "posljedice",
        naslov: "Što to znači za tebe",
        popis: [
          "Uplaćuješ iz svoje banke, na IBAN koji vidiš. Banka će ti pokazati odgovara li ime primatelja.",
          "Nikad ne upisuješ podatke kartice ni prijavu u internetsko bankarstvo na našim stranicama.",
          "Ako platforma prestane raditi, novac koji je već uplaćen ostaje kod organizacije.",
          "Povrat donacije radi organizacija sa svog računa; platforma ga bilježi, ali ne može ni vratiti ni zadržati novac.",
        ],
      },
      {
        id: "provjera",
        naslov: "Provjera organizacija i kampanja",
        popis: [
          "Organizacija prolazi provjeru kod pružatelja računa: podaci iz registra, OIB, ovlaštena osoba i statut. Platforma čuva samo status i referencu provjere.",
          "Humanitarna akcija prilaže rješenje nadležnog tijela s rokom; akcija završava na rok iz rješenja.",
          "Kampanja iznad 5.000 € ili organizator iznad 12.500 € ukupno dobivaju oznaku za ručni pregled namjene.",
          "Nakon provjere namjene naslov, opis i cilj kampanje se zaključavaju.",
        ],
      },
      {
        id: "racun",
        naslov: "Tvoj račun",
        tekst: [
          "Nema lozinke koju bi netko mogao ukrasti: prijavljuješ se poveznicom ili kodom poslanim e-poštom. Osjetljive radnje (povrat, brisanje, promjena uloga) traže dodatnu potvrdu kodom. Popis prijava vidiš u postavkama.",
        ],
        veze: [{ kljuc: "settings.security", tekst: "Postavke sigurnosti" }],
      },
      {
        id: "prijave",
        naslov: "Prijava sumnjivog sadržaja",
        tekst: [
          "Svaka kampanja, kasica i komentar imaju mogućnost prijave. Prijavu može poslati svatko, i bez računa. Primitak potvrđujemo, a o odluci obavještavamo i prijavitelja i autora, uz obrazloženje i mogućnost prigovora.",
          "Dok se sumnja provjerava, kampanja može biti privremeno isključena iz kataloga.",
        ],
        veze: [
          { kljuc: "report", tekst: "Prijavi sadržaj" },
          { kljuc: "ranking", tekst: "Pravila prikaza" },
        ],
      },
    ],
  },
  en: {
    naslov: "Security",
    uvod:
      "The safest money is money the platform never touches. Donations go straight to the organisation, organisations are verified, and anyone can report a suspicious campaign.",
    opis: "Who holds the money, how organisations and campaigns are verified, and how to report suspicious content.",
    odjeljci: [
      {
        id: "novac",
        naslov: "Who holds the money",
        definicije: [
          { pojam: "The organisation", opis: "The money sits in the organisation's Safe: a digital vault controlled by the organisation's signers. Spending needs several signatures (for example two of three), so no single person can empty the account." },
          { pojam: "Monerium", opis: "A licensed electronic money institution that gives the organisation an IBAN linked to its Safe, verifies the organisation and turns SEPA payments into euros on the Safe." },
          { pojam: "Swan", opis: "A licensed electronic money institution through which an organisation will be able to receive donations into a regular bank account in its own name. Not part of the first phase." },
          { pojam: "The platform", opis: "Holds no money, is not a signer on any Safe and has no access to accounts. Its payment system only matches an incoming payment to a campaign by its reference." },
        ],
      },
      {
        id: "posljedice",
        naslov: "What this means for you",
        popis: [
          "You pay from your own bank to an IBAN you can see. Your bank will show you whether the payee's name matches.",
          "You never enter card details or your online banking login on our pages.",
          "If the platform stopped working, money already paid would stay with the organisation.",
          "Refunds are made by the organisation from its own account; the platform records them but can neither return nor hold back any money.",
        ],
      },
      {
        id: "provjera",
        naslov: "Verifying organisations and campaigns",
        popis: [
          "The organisation is verified by the account provider: registry details, tax number, authorised person and statute. The platform keeps only the status and a reference.",
          "A humanitarian appeal uploads the permit from the competent authority, with its end date; the appeal ends on that date.",
          "A campaign above €5,000, or an organiser above €12,500 in total, is flagged for a manual review of its purpose.",
          "Once the purpose has been verified, the campaign's title, description and goal are locked.",
        ],
      },
      {
        id: "racun",
        naslov: "Your account",
        tekst: [
          "There is no password to steal: you sign in with a link or a code sent by email. Sensitive actions (refunds, deletion, changing roles) need an extra confirmation code. You can see your sign-in history in settings.",
        ],
        veze: [{ kljuc: "settings.security", tekst: "Security settings" }],
      },
      {
        id: "prijave",
        naslov: "Reporting suspicious content",
        tekst: [
          "Every campaign, moneybox and comment can be reported. Anyone can send a report, even without an account. We confirm receipt and notify both the reporter and the author of the decision, with reasons and a way to object.",
          "While a concern is being checked, a campaign may be temporarily removed from the catalogue.",
        ],
        veze: [
          { kljuc: "report", tekst: "Report content" },
          { kljuc: "ranking", tekst: "Ranking and display" },
        ],
      },
    ],
  },
};
