/**
 * Pravila prikaza (DSA čl. 27, docs/07 red 113, odluka 501). Svih sedam redoslijeda dolazi iz
 * `OPIS_REDOSLIJEDA`, istog izvora koji koristi katalog, pa se tekst ne može razići s upitom.
 */
import { OPIS_REDOSLIJEDA, REDOSLIJEDI, ZADANI_REDOSLIJED } from "../../lib/redoslijedi";
import type { Lang } from "../../i18n";
import type { Definicija, Dvojezicno, SadrzajStranice } from "./tipovi";

const redoslijedi = (lang: Lang): Definicija[] =>
  REDOSLIJEDI.map((r) => {
    const o = OPIS_REDOSLIJEDA[r][lang];
    const zadano = r === ZADANI_REDOSLIJED ? (lang === "hr" ? " (zadano)" : " (default)") : "";
    return { pojam: o.naziv + zadano, opis: o.opis };
  });

export const PRAVILA_PRIKAZA: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Pravila prikaza",
    uvod:
      "Kako biramo koje se kampanje prikazuju u katalogu i na naslovnici i kojim redom. Pravila su ista za sve i nitko ne može platiti bolje mjesto.",
    opis: "Kriteriji prikaza i redoslijeda kampanja u katalogu i na naslovnici.",
    odjeljci: [
      {
        id: "katalog",
        naslov: "Što ulazi u katalog",
        popis: [
          "Samo aktivne javne kampanje: objavljene, nezatvorene i neobrisane.",
          "Kampanja koju je organizator privremeno isključio ili koju je moderacija blokirala ne prikazuje se.",
          "Kampanja koja je skrivena od kataloga (dostupna samo preko poveznice) ne ulazi u katalog ni u tražilice, ali radi svakome tko ima poveznicu.",
          "Kampanja čiji je rok prošao ostaje aktivna i u katalogu dok je organizator ne zatvori.",
        ],
      },
      {
        id: "redoslijedi",
        naslov: "Sedam redoslijeda",
        tekst: [
          "Katalog nudi sedam redoslijeda. Kad dvije kampanje imaju jednaku vrijednost, prva je novija kampanja (po datumu nastanka). Drugih kriterija rangiranja nema.",
        ],
        definicije: redoslijedi("hr"),
      },
      {
        id: "filtri",
        naslov: "Pretraga i filtri",
        tekst: [
          "Pretraga traži riječi u naslovu i opisu kampanje. Filtri (kategorija, vrsta kampanje, provjerena organizacija, kasice, uskoro završava, dosegnut cilj, blizina) samo sužavaju popis; redoslijed ostaje onaj koji si odabrao.",
        ],
      },
      {
        id: "placeno",
        naslov: "Bez plaćenog isticanja",
        tekst: [
          "U prvoj fazi nema plaćenog isticanja ni promoviranih kampanja. Napojnica platformi ne utječe na položaj kampanje u katalogu.",
        ],
      },
      {
        id: "urednicki-izbor",
        naslov: "Urednički izbor na naslovnici",
        tekst: [
          "Dio naslovnice ručno bira tim platforme. Izbor se ne prodaje i ne ovisi o napojnicama.",
        ],
        popis: [
          "Kampanja mora biti aktivna, javna i primati donacije.",
          "Mora imati naslovnu sliku i opis iz kojeg je jasna svrha.",
          "Prednost imaju provjerene organizacije i kampanje koje redovito objavljuju novosti.",
          "Izbor se mijenja tako da se iste kampanje ne zadržavaju dugo na naslovnici.",
        ],
      },
      {
        id: "moderacija",
        naslov: "Moderacija",
        tekst: [
          "Kampanja može biti uklonjena iz kataloga zbog prijave ili kršenja uvjeta. Organizator dobiva obrazloženu odluku i može prigovoriti.",
        ],
        veze: [
          { kljuc: "terms", tekst: "Uvjeti korištenja" },
          { kljuc: "report", tekst: "Prijavi sadržaj" },
        ],
      },
    ],
  },
  en: {
    naslov: "Ranking and display",
    uvod:
      "How we choose which campaigns appear in the catalogue and on the home page, and in what order. The rules are the same for everyone and nobody can pay for a better position.",
    opis: "Criteria for displaying and ordering campaigns in the catalogue and on the home page.",
    odjeljci: [
      {
        id: "katalog",
        naslov: "What is in the catalogue",
        popis: [
          "Only active public campaigns: published, not closed and not deleted.",
          "A campaign paused by its organiser or blocked by moderation is not shown.",
          "A campaign hidden from the catalogue (reachable by link only) is not listed in the catalogue or search engines, but works for anyone who has the link.",
          "A campaign whose end date has passed stays active and listed until the organiser closes it.",
        ],
      },
      {
        id: "redoslijedi",
        naslov: "Seven sort orders",
        tekst: [
          "The catalogue offers seven sort orders. When two campaigns have the same value, the newer campaign (by creation date) comes first. There are no other ranking criteria.",
        ],
        definicije: redoslijedi("en"),
      },
      {
        id: "filtri",
        naslov: "Search and filters",
        tekst: [
          "Search looks for words in a campaign's title and description. Filters (category, campaign type, verified organisation, moneyboxes, ending soon, goal reached, nearby) only narrow the list; the order stays the one you chose.",
        ],
      },
      {
        id: "placeno",
        naslov: "No paid placement",
        tekst: [
          "In the first phase there is no paid placement and there are no promoted campaigns. Tipping the platform has no effect on a campaign's position in the catalogue.",
        ],
      },
      {
        id: "urednicki-izbor",
        naslov: "Editor's picks on the home page",
        tekst: ["Part of the home page is chosen by hand by the platform team. Picks are not for sale and do not depend on tips."],
        popis: [
          "The campaign must be active, public and accepting donations.",
          "It must have a cover image and a description that makes its purpose clear.",
          "Verified organisations and campaigns that post regular updates are preferred.",
          "Picks rotate so the same campaigns do not stay on the home page for long.",
        ],
      },
      {
        id: "moderacija",
        naslov: "Moderation",
        tekst: [
          "A campaign can be removed from the catalogue following a report or a breach of the terms. The organiser receives a reasoned decision and can object.",
        ],
        veze: [
          { kljuc: "terms", tekst: "Terms of use" },
          { kljuc: "report", tekst: "Report content" },
        ],
      },
    ],
  },
};
