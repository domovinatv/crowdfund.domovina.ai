/**
 * Troškovi (docs/07 red 107): 0 % provizije, napojnica kao zaseban intent (odluke 7, 207),
 * trošak SEPA-e, što plaća organizator. Bez izmišljenih cijena EMI-ja (nisu utvrđene).
 */
import type { Dvojezicno, SadrzajStranice } from "./tipovi";

export const TROSKOVI: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Troškovi",
    uvod:
      "Platforma ne uzima proviziju od donacija. Organizacija dobiva cijeli iznos koji je podržavatelj uplatio, a platforma živi od dobrovoljnih napojnica koje su uvijek zasebna uplata.",
    opis: "0 % provizije platforme, dobrovoljna napojnica kao zasebna uplata, trošak SEPA prijenosa i što plaća organizator.",
    odjeljci: [
      {
        id: "provizija",
        naslov: "0 % provizije",
        tekst: [
          "Objava kampanje, primanje donacija, kasice, poveznice za praćenje, QR kodovi i plakati ne naplaćuju se. Od donacije se ništa ne odbija: koliko podržavatelj pošalje, toliko stiže na račun organizacije.",
          "Platforma ne zarađuje ni na kamatama, jer novac kampanja nikad nije kod nje.",
        ],
      },
      {
        id: "napojnica",
        naslov: "Napojnica: dobrovoljna i zasebna",
        tekst: [
          "Nakon donacije podržavatelj može, ako želi, ostaviti napojnicu platformi. Pravila su jednostavna:",
        ],
        popis: [
          "Napojnica je zaseban, drugi prijenos s vlastitim QR kodom. Nikad se ne dodaje donaciji i nikad se ne odbija od nje.",
          "Ponuđeni su fiksni iznosi (0, 1, 2 ili 5 €) ili vlastiti iznos. Ništa nije unaprijed odabrano.",
          "Opcija „0 €” je jednako velika i jednako istaknuta kao ostale. Odabir nula ne mijenja ništa u donaciji ni u kampanji.",
          "Nema poruka koje grižnjom savjesti potiču na napojnicu.",
          "Napojnica ide društvu ITalk d.o.o., koje vodi platformu, a ne organizatoru kampanje.",
        ],
        veze: [{ kljuc: "how-it-works.donate", tekst: "Kako donirati", sidro: "napojnica" }],
      },
      {
        id: "sepa",
        naslov: "Trošak uplate za podržavatelja",
        tekst: [
          "Donacija je obični SEPA prijenos u eurima iz tvoje banke. Platforma za njega ne naplaćuje ništa. Ako tvoja banka naplaćuje naknadu za prijenos, to je naknada prema njezinu cjeniku, ista kao za svako drugo plaćanje.",
          "Po pravilima EU instant SEPA prijenos ne smije stajati više od običnog, pa je najbrži način ujedno i jednako povoljan.",
        ],
      },
      {
        id: "organizator",
        naslov: "Što plaća organizator",
        definicije: [
          { pojam: "Platformi", opis: "Ništa. Nema naknade za objavu, primanje donacija ni za isplatu, jer isplate nema: novac je od početka na računu organizacije." },
          { pojam: "Pružatelju računa", opis: "Naknade koje pružatelj računa (Monerium) naplaćuje prema svom cjeniku, ako ih ima. Platforma na njih nema utjecaja i ništa ne zadržava." },
          { pojam: "Mreži", opis: "Kad organizacija troši sredstva sa svog Safea, plaća mrežnu naknadu za tu transakciju." },
          { pojam: "Povrati", opis: "Ako organizacija nekome vraća donaciju, radi to sama, odlaznim prijenosom sa svog računa, uz trošak prema cjeniku svog pružatelja." },
        ],
      },
      {
        id: "premium",
        naslov: "Dodatne usluge",
        faza2: true,
        tekst: [
          "Plaćene dodatne usluge za organizatore, poput vlastite kratke adrese ili isticanja kampanje, nisu dio prve faze. Kad budu uvedene, naplaćivat će se zasebno, uz račun, i nikad iz donacija.",
        ],
        veze: [{ kljuc: "ranking", tekst: "Pravila prikaza" }],
      },
    ],
  },
  en: {
    naslov: "Costs",
    uvod:
      "The platform takes no commission on donations. The organisation receives the full amount the supporter paid, and the platform lives on voluntary tips that are always a separate payment.",
    opis: "0% platform commission, a voluntary tip as a separate payment, the cost of a SEPA transfer and what organisers pay.",
    odjeljci: [
      {
        id: "provizija",
        naslov: "0% commission",
        tekst: [
          "Publishing a campaign, receiving donations, moneyboxes, tracking links, QR codes and posters are all free. Nothing is deducted from a donation: what the supporter sends is what reaches the organisation's account.",
          "The platform does not earn interest either, because campaign money is never held by it.",
        ],
      },
      {
        id: "napojnica",
        naslov: "Tips: voluntary and separate",
        tekst: ["After donating, a supporter may, if they wish, leave a tip for the platform. The rules are simple:"],
        popis: [
          "A tip is a separate, second transfer with its own QR code. It is never added to the donation and never deducted from it.",
          "There are fixed amounts (€0, €1, €2 or €5) or an amount of your choice. Nothing is preselected.",
          "The “€0” option is just as large and just as prominent as the others. Choosing zero changes nothing about the donation or the campaign.",
          "There are no guilt-tripping messages nudging you to tip.",
          "Tips go to ITalk d.o.o., the company that runs the platform, not to the campaign organiser.",
        ],
        veze: [{ kljuc: "how-it-works.donate", tekst: "How to donate", sidro: "napojnica" }],
      },
      {
        id: "sepa",
        naslov: "What donating costs the supporter",
        tekst: [
          "A donation is an ordinary SEPA transfer in euros from your bank. The platform charges nothing for it. If your bank charges a transfer fee, that is its own fee under its price list, the same as for any other payment.",
          "Under EU rules, an instant SEPA transfer may not cost more than a standard one, so the fastest option is also no more expensive.",
        ],
      },
      {
        id: "organizator",
        naslov: "What the organiser pays",
        definicije: [
          { pojam: "To the platform", opis: "Nothing. There is no fee for publishing, receiving donations or payouts, because there are no payouts: the money is in the organisation's account from the start." },
          { pojam: "To the account provider", opis: "Any fees the account provider (Monerium) charges under its own price list. The platform has no say in them and keeps nothing." },
          { pojam: "To the network", opis: "When the organisation spends funds from its Safe, it pays the network fee for that transaction." },
          { pojam: "Refunds", opis: "If the organisation refunds a donation, it does so itself, by an outgoing transfer from its own account, at its provider's rates." },
        ],
      },
      {
        id: "premium",
        naslov: "Extra services",
        faza2: true,
        tekst: [
          "Paid extras for organisers, such as a custom short address or featuring a campaign, are not part of the first phase. When they are introduced they will be charged separately, with an invoice, and never out of donations.",
        ],
        veze: [{ kljuc: "ranking", tekst: "Ranking and display" }],
      },
    ],
  },
};
