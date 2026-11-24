/**
 * Kontakt (docs/07 red 115, ekran 21): tekst stranice, nazivi 10 tema i poruke grešaka.
 * Teme su naše (obilazak 21 „Za nas”): bez „blokade isplate” jer isplate nema.
 */
import type { GreskaPolja, PoljeKontakta, TemaKontakta } from "../../lib/db/kontakt";
import type { Dvojezicno, SadrzajStranice } from "./tipovi";

export const KONTAKT: Dvojezicno<SadrzajStranice> = {
  hr: {
    naslov: "Kontakt",
    uvod: "Pitanje, problem ili prijedlog? Odaberi temu i napiši poruku; odgovaramo e-poštom.",
    opis: "Obrazac za kontakt s timom platforme.",
    odjeljci: [
      {
        id: "prije",
        naslov: "Prije nego pišeš",
        popis: [
          "Za pitanja o provjeri računa, organizacije ili kampanje piši s adrese e-pošte koja je vezana uz račun. S druge adrese iz sigurnosnih razloga ne možemo davati pojedinosti.",
          "Nezakonit sadržaj ili sumnjivu kampanju najbrže prijaviš obrascem za prijavu sadržaja, koji ide izravno moderaciji.",
          "Pitanja o donaciji (povrat, potvrda) najprije uputi organizatoru kampanje: novac je kod njega.",
        ],
        veze: [
          { kljuc: "report", tekst: "Prijavi sadržaj" },
          { kljuc: "faq", tekst: "Česta pitanja" },
        ],
      },
      {
        id: "impresum",
        naslov: "Tko odgovara",
        tekst: ["Platformu vodi ITalk d.o.o. Podaci o društvu su u impresumu."],
        veze: [{ kljuc: "about", tekst: "Impresum", sidro: "impresum" }],
      },
    ],
  },
  en: {
    naslov: "Contact",
    uvod: "A question, a problem or a suggestion? Choose a topic and write your message; we reply by email.",
    opis: "Contact form for the platform team.",
    odjeljci: [
      {
        id: "prije",
        naslov: "Before you write",
        popis: [
          "For questions about verifying an account, organisation or campaign, write from the email address linked to your account. For security reasons we cannot share details with any other address.",
          "The fastest way to report illegal content or a suspicious campaign is the report form, which goes straight to moderation.",
          "Questions about a donation (refunds, confirmations) should go to the campaign organiser first: they hold the money.",
        ],
        veze: [
          { kljuc: "report", tekst: "Report content" },
          { kljuc: "faq", tekst: "FAQ" },
        ],
      },
      {
        id: "impresum",
        naslov: "Who replies",
        tekst: ["The platform is run by ITalk d.o.o. Company details are in the legal notice."],
        veze: [{ kljuc: "about", tekst: "Legal notice", sidro: "impresum" }],
      },
    ],
  },
};

export const TEME: Dvojezicno<Record<TemaKontakta, string>> = {
  hr: {
    account_verification: "Provjera računa ili organizacije",
    campaign_verification: "Provjera kampanje",
    email_change: "Promjena e-pošte",
    safe_or_account: "Promjena računa ili Safea organizacije",
    account_block: "Blokiran račun ili kampanja",
    report_abuse: "Prijava zlouporabe",
    offers: "Ponude",
    promotion: "Promocija kampanje",
    suggestion: "Prijedlog",
    other: "Ostalo",
  },
  en: {
    account_verification: "Account or organisation verification",
    campaign_verification: "Campaign verification",
    email_change: "Email address change",
    safe_or_account: "Change of the organisation's account or Safe",
    account_block: "Blocked account or campaign",
    report_abuse: "Reporting abuse",
    offers: "Offers",
    promotion: "Promoting a campaign",
    suggestion: "Suggestion",
    other: "Other",
  },
};

export const OBRAZAC: Dvojezicno<{
  naslov: string;
  ime: string;
  eposta: string;
  epostaPomoc: string;
  tema: string;
  odaberi: string;
  poruka: string;
  porukaPomoc: string;
  provjera: string;
  provjeraTekst: string;
  posalji: string;
  greskeNaslov: string;
  poslanoNaslov: string;
  poslanoTekst: string;
  obavezno: string;
}> = {
  hr: {
    naslov: "Pošalji poruku",
    ime: "Ime i prezime",
    eposta: "E-pošta",
    epostaPomoc: "Na ovu adresu šaljemo odgovor.",
    tema: "Tema",
    odaberi: "Odaberi temu",
    poruka: "Poruka",
    porukaPomoc: "Najviše 5.000 znakova.",
    provjera: "Zaštita od neželjenih poruka",
    provjeraTekst: "Ovdje će biti Cloudflare Turnstile. U prototipu je provjera isključena i uvijek prolazi.",
    posalji: "Pošalji poruku",
    greskeNaslov: "Poruka nije poslana. Provjeri označena polja:",
    poslanoNaslov: "Poruka je poslana",
    poslanoTekst: "Hvala. Odgovorit ćemo na adresu e-pošte koju si upisao. U prototipu se e-pošta ne šalje.",
    obavezno: "obavezno",
  },
  en: {
    naslov: "Send a message",
    ime: "Full name",
    eposta: "Email",
    epostaPomoc: "We will reply to this address.",
    tema: "Topic",
    odaberi: "Choose a topic",
    poruka: "Message",
    porukaPomoc: "Up to 5,000 characters.",
    provjera: "Spam protection",
    provjeraTekst: "Cloudflare Turnstile will go here. In the prototype the check is switched off and always passes.",
    posalji: "Send message",
    greskeNaslov: "Your message was not sent. Please check the marked fields:",
    poslanoNaslov: "Message sent",
    poslanoTekst: "Thank you. We will reply to the email address you entered. In the prototype no email is sent.",
    obavezno: "required",
  },
};

export const GRESKE: Dvojezicno<Record<PoljeKontakta, Partial<Record<GreskaPolja, string>>>> = {
  hr: {
    name: { obavezno: "Upiši ime.", predugo: "Ime može imati najviše 255 znakova." },
    email: {
      obavezno: "Upiši adresu e-pošte.",
      predugo: "Adresa e-pošte je preduga.",
      neispravno: "Upiši ispravnu adresu e-pošte, na primjer ime@primjer.hr.",
    },
    topic: { obavezno: "Odaberi temu.", neispravno: "Odaberi temu s popisa." },
    content: { obavezno: "Napiši poruku.", predugo: "Poruka može imati najviše 5.000 znakova." },
  },
  en: {
    name: { obavezno: "Enter your name.", predugo: "Your name can be up to 255 characters long." },
    email: {
      obavezno: "Enter your email address.",
      predugo: "The email address is too long.",
      neispravno: "Enter a valid email address, for example name@example.com.",
    },
    topic: { obavezno: "Choose a topic.", neispravno: "Choose a topic from the list." },
    content: { obavezno: "Write a message.", predugo: "Your message can be up to 5,000 characters long." },
  },
};
