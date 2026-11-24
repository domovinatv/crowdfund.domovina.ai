/**
 * Hrvatski rječnik. Ključevi su izvor; `en.ts` mora imati iste (tip `Rjecnik`).
 * Copy: podržavatelj „doprinosi” / „donira”, nikad „ulaže” (CLAUDE.md).
 * Promjena brenda = ime ovdje i u en.ts (docs/08 §1).
 */
export const hr = {
  "site.name": "crowdfund.domovina.ai",
  "site.tagline": "Prikupljanje za udruge i organizacije, bez provizije platforme",
  "meta.description":
    "Pokrenite kampanju za svoju organizaciju ili podržite tuđu. Novac ide izravno organizaciji, platforma ga nikad ne drži.",

  "demo.bar": "Demo prototip: nema pravog novca, sve uplate su testne.",
  "demo.badge": "demo",

  "nav.main": "Glavna navigacija",
  "nav.campaigns": "Kampanje",
  "nav.organisations": "Organizacije",
  "nav.start": "Pokreni kampanju",
  "nav.signIn": "Prijava",
  "nav.menu": "Izbornik",
  "nav.home": "Naslovnica",

  "lang.label": "Jezik",
  "lang.hr": "Hrvatski",
  "lang.en": "English",

  "footer.about": "O platformi",
  "footer.help": "Pomoć",
  "footer.legal": "Pravno",
  "footer.howItWorks": "Kako radi",
  "footer.costs": "Troškovi",
  "footer.faq": "Česta pitanja",
  "footer.safety": "Sigurnost",
  "footer.contact": "Kontakt",
  "footer.terms": "Uvjeti",
  "footer.privacy": "Privatnost",
  "footer.ranking": "Pravila prikaza",
  "footer.aboutUs": "O nama",
  "footer.report": "Prijavi sadržaj",
  "footer.imprint": "Platformu vodi ITalk. Prototip, nije u produkciji.",

  "home.title": "Prikupljajte zajedno",
  "home.lead":
    "Udruge, zaklade i ustanove prikupljaju doprinose izravno na svoj račun. Podržavatelji doniraju SEPA uplatom ili QR kodom.",
  "home.cta.start": "Pokreni kampanju",
  "home.cta.browse": "Pregledaj kampanje",
  "home.active": "Aktivne kampanje",
  "home.empty.title": "Još nema aktivnih kampanja",
  "home.empty.body": "Kad organizacija objavi prvu kampanju, pojavit će se ovdje.",

  "card.by": "Organizator",
  "card.raised": "prikupljeno",
  "card.of": "od",
  "card.goal": "cilj",
  "card.noGoal": "bez cilja",
  "card.contributors": "podržavatelja",
  "card.progress": "Napredak prema cilju",
} as const;

export type KljucPrijevoda = keyof typeof hr;
export type Rjecnik = { readonly [K in KljucPrijevoda]: string };
