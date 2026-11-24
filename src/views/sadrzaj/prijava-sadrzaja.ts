/**
 * DSA prijava sadržaja (`report`, čl. 16 DSA) i praćenje kampanje (`follow`, `follow.unsubscribe`).
 * Vlastiti tekstovi; oba jezika istog oblika (test).
 */
import type { CiljPrijave, GreskaPrijave, PoljePrijave, RazlogPrijave } from "../../lib/db/prijave";
import type { Dvojezicno } from "./tipovi";

export type PoljeObrasca = PoljePrijave | "izjava";

interface TekstoviPrijave {
  naslov: string;
  uvod: string;
  hitno: string;
  ciljNaslov: string;
  tip: string;
  idCilja: string;
  idPomoc: string;
  razlog: string;
  opis: string;
  opisPomoc: string;
  eposta: string;
  epostaPomoc: string;
  telefon: string;
  neobavezno: string;
  obavezno: string;
  izjava: string;
  privola: string;
  posalji: string;
  greskeNaslov: string;
  poslanoNaslov: string;
  poslanoTekst: string;
  odaberi: string;
  ciljevi: Record<CiljPrijave, string>;
  razlozi: Record<RazlogPrijave, string>;
  greske: Record<PoljeObrasca, Partial<Record<GreskaPrijave, string>> & { obavezno: string }>;
}

export const PRIJAVA: Dvojezicno<TekstoviPrijave> = {
  hr: {
    naslov: "Prijavi sadržaj",
    uvod: "Ako mislite da kampanja, komentar, kasica ili drugi sadržaj krši zakon ili pravila platforme, javite nam. Svaku prijavu pregledava čovjek, a o odluci vas obavještavamo e-poštom.",
    hitno: "Ako je nečiji život ili sigurnost u neposrednoj opasnosti, nazovite 112.",
    ciljNaslov: "Što prijavljujete",
    tip: "Vrsta sadržaja",
    idCilja: "Oznaka sadržaja",
    idPomoc: "ID kampanje (npr. iz poveznice), alias kasice ili oznaka iz poveznice „Prijavi”.",
    razlog: "Razlog prijave",
    opis: "Opis",
    opisPomoc: "Od 50 do 500 znakova. Objasnite što je sporno i zašto, što preciznije.",
    eposta: "E-pošta",
    epostaPomoc: "Na nju šaljemo potvrdu primitka i odluku.",
    telefon: "Telefon",
    neobavezno: "neobavezno",
    obavezno: "obavezno",
    izjava: "Izjavljujem u dobroj vjeri da su podaci i navodi u prijavi točni i potpuni.",
    privola: "Pristajem na obradu podataka iz prijave radi njezina rješavanja (politika privatnosti).",
    posalji: "Pošalji prijavu",
    greskeNaslov: "Prijava nije poslana. Ispravite označena polja:",
    poslanoNaslov: "Prijava je zaprimljena",
    poslanoTekst: "Hvala. Potvrdu smo zabilježili; pregledat ćemo prijavu i javiti vam odluku e-poštom.",
    odaberi: "Odaberite",
    ciljevi: {
      campaign: "Kampanja",
      comment: "Komentar",
      update: "Novost",
      moneybox: "Kasica",
      offer: "Ponuda",
      user: "Profil osobe",
      organization: "Organizacija",
    },
    razlozi: {
      fraud: "Prijevara ili lažno predstavljanje",
      illegal: "Nezakonit sadržaj",
      hate: "Govor mržnje",
      violence: "Nasilje ili prijetnje",
      privacy: "Povreda privatnosti",
      intellectual_property: "Povreda autorskog prava ili žiga",
      spam: "Neželjeni sadržaj (spam)",
      other: "Drugo",
    },
    greske: {
      targetType: { obavezno: "Odaberite vrstu sadržaja.", nevaljano: "Nepoznata vrsta sadržaja." },
      targetId: { obavezno: "Upišite oznaku sadržaja.", ne_postoji: "Takav sadržaj ne postoji ili nije javno vidljiv." },
      reason: { obavezno: "Odaberite razlog.", nevaljano: "Nepoznat razlog." },
      description: { obavezno: "Opišite problem.", prekratko: "Opis mora imati barem 50 znakova.", predugo: "Opis smije imati najviše 500 znakova." },
      email: { obavezno: "Upišite e-poštu.", nevaljano: "E-pošta nije ispravna." },
      phone: { obavezno: "Upišite telefon.", nevaljano: "Telefon smije sadržavati samo brojke, razmake i + ( ) / -." },
      privola: { obavezno: "Bez privole ne možemo obraditi prijavu." },
      izjava: { obavezno: "Potvrdite izjavu u dobroj vjeri." },
    },
  },
  en: {
    naslov: "Report content",
    uvod: "If you believe a campaign, comment, moneybox or other content breaks the law or the platform rules, let us know. Every report is reviewed by a person, and we email you the decision.",
    hitno: "If someone's life or safety is in immediate danger, call 112.",
    ciljNaslov: "What you are reporting",
    tip: "Type of content",
    idCilja: "Content reference",
    idPomoc: "Campaign ID (e.g. from the link), moneybox alias, or the reference from a “Report” link.",
    razlog: "Reason",
    opis: "Description",
    opisPomoc: "50 to 500 characters. Explain what is wrong and why, as precisely as you can.",
    eposta: "Email",
    epostaPomoc: "We send the acknowledgement and the decision to this address.",
    telefon: "Phone",
    neobavezno: "optional",
    obavezno: "required",
    izjava: "I declare in good faith that the information and allegations in this report are accurate and complete.",
    privola: "I agree to the processing of the data in this report in order to handle it (privacy policy).",
    posalji: "Send report",
    greskeNaslov: "The report was not sent. Please correct the marked fields:",
    poslanoNaslov: "Report received",
    poslanoTekst: "Thank you. We have recorded it; we will review the report and email you the decision.",
    odaberi: "Choose",
    ciljevi: {
      campaign: "Campaign",
      comment: "Comment",
      update: "Update",
      moneybox: "Moneybox",
      offer: "Offer",
      user: "Personal profile",
      organization: "Organisation",
    },
    razlozi: {
      fraud: "Fraud or impersonation",
      illegal: "Illegal content",
      hate: "Hate speech",
      violence: "Violence or threats",
      privacy: "Privacy violation",
      intellectual_property: "Copyright or trademark infringement",
      spam: "Spam",
      other: "Other",
    },
    greske: {
      targetType: { obavezno: "Choose the type of content.", nevaljano: "Unknown type of content." },
      targetId: { obavezno: "Enter the content reference.", ne_postoji: "No such content exists or it is not publicly visible." },
      reason: { obavezno: "Choose a reason.", nevaljano: "Unknown reason." },
      description: { obavezno: "Describe the problem.", prekratko: "The description needs at least 50 characters.", predugo: "The description can have at most 500 characters." },
      email: { obavezno: "Enter your email.", nevaljano: "The email address is not valid." },
      phone: { obavezno: "Enter a phone number.", nevaljano: "The phone number may only contain digits, spaces and + ( ) / -." },
      privola: { obavezno: "We cannot handle the report without your consent." },
      izjava: { obavezno: "Please confirm the good-faith declaration." },
    },
  },
};

interface TekstoviPracenja {
  naslov: string;
  pratite: string;
  obavijesti: string;
  komentari: string;
  novosti: string;
  kraj: string;
  ukljuceno: string;
  iskljuceno: string;
  neaktivno: string;
  nevidljiva: string;
  odjava: string;
  odjavaNaslov: string;
  odjavaPitanje: string;
  odjavaGumb: string;
  odjavljeniNaslov: string;
  odjavljeniTekst: string;
  promjene: string;
  otvori: string;
}

export const PRACENJE: Dvojezicno<TekstoviPracenja> = {
  hr: {
    naslov: "Praćenje kampanje",
    pratite: "Pratite kampanju",
    obavijesti: "Obavijesti e-poštom",
    komentari: "Novi komentari",
    novosti: "Novosti organizatora",
    kraj: "Kraj kampanje",
    ukljuceno: "uključeno",
    iskljuceno: "isključeno",
    neaktivno: "Sve obavijesti su isključene; ne šaljemo vam ništa o ovoj kampanji.",
    nevidljiva: "Kampanja više nije javno vidljiva, ali se s praćenja uvijek možete odjaviti.",
    odjava: "Odjavi praćenje",
    odjavaNaslov: "Odjava praćenja",
    odjavaPitanje: "Želite li prestati primati obavijesti o kampanji",
    odjavaGumb: "Da, odjavi me",
    odjavljeniNaslov: "Odjavljeni ste",
    odjavljeniTekst: "Više vam ne šaljemo obavijesti o ovoj kampanji.",
    promjene: "Pojedinačne obavijesti moći ćete uključiti i isključiti nakon prijave (S6 prototipa).",
    otvori: "Otvori kampanju",
  },
  en: {
    naslov: "Following a campaign",
    pratite: "You are following",
    obavijesti: "Email notifications",
    komentari: "New comments",
    novosti: "Updates from the organiser",
    kraj: "End of the campaign",
    ukljuceno: "on",
    iskljuceno: "off",
    neaktivno: "All notifications are off; we do not send you anything about this campaign.",
    nevidljiva: "The campaign is no longer publicly visible, but you can always unsubscribe.",
    odjava: "Unsubscribe",
    odjavaNaslov: "Unsubscribe",
    odjavaPitanje: "Do you want to stop receiving notifications about the campaign",
    odjavaGumb: "Yes, unsubscribe me",
    odjavljeniNaslov: "You are unsubscribed",
    odjavljeniTekst: "We no longer send you notifications about this campaign.",
    promjene: "You will be able to switch individual notifications on and off after signing in (prototype S6).",
    otvori: "Open the campaign",
  },
};
