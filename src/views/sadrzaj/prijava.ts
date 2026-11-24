/**
 * Prijava i račun (docs/07 §Prijava i račun, docs/04 §1, odluke 15 i 208): tekstovi prijave bez lozinke,
 * unosa koda, registracije, odjave, poveznice, mock Googlea i dodatne potvrde. `{email}`, `{n}` i `{radnja}`
 * su zamjenski znakovi koje pogled popunjava.
 */
import type { Dvojezicno } from "./tipovi";

export interface TekstoviPrijave {
  prijava: {
    naslov: string;
    uvod: string;
    eposta: string;
    epostaPomoc: string;
    posalji: string;
    nepoznataNaslov: string;
    nepoznataTekst: string;
    uvjetiPrije: string;
    uvjeti: string;
    uvjetiI: string;
    privatnost: string;
    stvoriRacun: string;
    registracijaPitanje: string;
    registracija: string;
    ili: string;
    google: string;
    vecPrijavljen: string;
    nastavi: string;
  };
  kod: {
    naslov: string;
    uvod: string;
    kod: string;
    kodPomoc: string;
    potvrdi: string;
    ponovo: string;
    drugaEposta: string;
    nemaNaslov: string;
    nemaTekst: string;
    naPrijavu: string;
    rok: string;
  };
  demo: {
    naslov: string;
    tekst: string;
    kod: string;
    link: string;
    nema: string;
  };
  registracija: {
    naslov: string;
    uvod: string;
    organizacija: string;
    ime: string;
    prezime: string;
    eposta: string;
    newsletter: string;
    posalji: string;
    imaRacun: string;
    prijava: string;
    obavezno: string;
  };
  potvrda: {
    naslov: string;
    uvod: string;
  };
  odjava: {
    naslov: string;
    tekst: string;
    gumb: string;
  };
  poveznica: {
    naslov: string;
    vrijedi: string;
    gumb: string;
  };
  google: {
    naslov: string;
    mock: string;
    demoRacuni: string;
    uloge: { organizator: string; moderator: string; novi: string };
    odaberi: string;
    ili: string;
    eposta: string;
    nastavi: string;
  };
  potvrdaRadnje: {
    naslov: string;
    uvod: string;
    nepoznata: string;
    radnje: Record<string, string>;
    potvrdi: string;
    ponovo: string;
    natrag: string;
  };
  /** Poruke uz polje i uz stanje koda. */
  greske: {
    email_prazno: string;
    email_neispravan: string;
    email_postoji: string;
    obrisan: string;
    uvjeti: string;
    ime: string;
    prezime: string;
    pogresan: string;
    istekao: string;
    iskoristen: string;
    pokusaji: string;
    nema: string;
    naslov: string;
  };
}

export const PRIJAVA: Dvojezicno<TekstoviPrijave> = {
  hr: {
    prijava: {
      naslov: "Prijava",
      uvod: "Bez lozinke: upiši e-poštu, a mi ti pošaljemo jednokratni kod i poveznicu za prijavu.",
      eposta: "E-pošta",
      epostaPomoc: "Kod vrijedi 5 minuta.",
      posalji: "Pošalji kod",
      nepoznataNaslov: "Za ovu e-poštu još nema računa",
      nepoznataTekst: "Možeš ga otvoriti odmah: prihvati uvjete i pošaljemo ti kod. Ime i prezime upisuješ kasnije u postavkama.",
      uvjetiPrije: "Prihvaćam",
      uvjeti: "uvjete korištenja",
      uvjetiI: "i",
      privatnost: "pravila privatnosti",
      stvoriRacun: "Otvori račun i pošalji kod",
      registracijaPitanje: "Želiš upisati ime odmah?",
      registracija: "Registracija",
      ili: "ili",
      google: "Nastavi s Googleom (demo)",
      vecPrijavljen: "Već si prijavljen kao {email}.",
      nastavi: "Nastavi",
    },
    kod: {
      naslov: "Upiši kod",
      uvod: "Poslali smo 6-znamenkasti kod na {email}.",
      kod: "Kod iz e-pošte",
      kodPomoc: "6 znamenki. Najviše 5 pokušaja.",
      potvrdi: "Potvrdi",
      ponovo: "Pošalji novi kod",
      drugaEposta: "Druga e-pošta",
      nemaNaslov: "Nema poslanog koda",
      nemaTekst: "Kod se traži na stranici prijave. Upiši e-poštu i pošaljemo ga.",
      naPrijavu: "Na prijavu",
      rok: "Kod vrijedi do {vrijeme}.",
    },
    demo: {
      naslov: "Demo: e-pošta se ne šalje",
      tekst: "U pravoj platformi ova poruka stigla bi na {email}. U prototipu je prikazana ovdje.",
      kod: "Kod",
      link: "Poveznica za prijavu",
      nema: "Poruka s kodom nije spremljena u ovom pregledniku (demo). Zatraži novi kod.",
    },
    registracija: {
      naslov: "Registracija",
      uvod: "Račun bez lozinke: nakon upisa pošaljemo kod za potvrdu e-pošte.",
      organizacija: "Nakon potvrde e-pošte nastavljaš na zahtjev za organizaciju.",
      ime: "Ime",
      prezime: "Prezime",
      eposta: "E-pošta",
      newsletter: "Želim povremeno primati novosti platforme e-poštom (nije obavezno).",
      posalji: "Otvori račun",
      imaRacun: "Već imaš račun?",
      prijava: "Prijavi se",
      obavezno: "obavezno",
    },
    potvrda: {
      naslov: "Provjeri e-poštu",
      uvod: "Za potvrdu adrese poslali smo kod na {email}. Upiši ga ili otvori poveznicu iz poruke.",
    },
    odjava: {
      naslov: "Odjava",
      tekst: "Prijavljen si kao {email}. Odjava zatvara sesiju u ovom pregledniku.",
      gumb: "Odjavi se",
    },
    poveznica: {
      naslov: "Prijava poveznicom",
      vrijedi: "Poveznica je za {email}. Potvrdi prijavu gumbom (poveznica se ne troši samim otvaranjem).",
      gumb: "Prijavi me",
    },
    google: {
      naslov: "Prijava Googleom",
      mock: "Mock: u prototipu nema pravog Google računa ni slanja podataka Googleu. Odaberi demo račun ili upiši e-poštu.",
      demoRacuni: "Demo računi",
      uloge: { organizator: "organizatorica (vlasnica zaklade)", moderator: "moderator platforme", novi: "novi korisnik" },
      odaberi: "Nastavi kao",
      ili: "ili druga e-pošta",
      eposta: "E-pošta",
      nastavi: "Nastavi",
    },
    potvrdaRadnje: {
      naslov: "Potvrdi radnju",
      uvod: "Za radnju „{radnja}” treba dodatna potvrda. Poslali smo kod na {email}; potvrda vrijedi 10 minuta.",
      nepoznata: "osjetljiva radnja",
      radnje: {
        refund: "zapis povrata",
        close_campaign: "zatvaranje kampanje",
        delete_campaign: "brisanje kampanje",
        member_role: "promjena uloge člana",
        delete_account: "brisanje računa",
      },
      potvrdi: "Potvrdi",
      ponovo: "Pošalji novi kod",
      natrag: "Natrag",
    },
    greske: {
      email_prazno: "Upiši e-poštu.",
      email_neispravan: "E-pošta nije ispravna (npr. ime@primjer.hr).",
      email_postoji: "Račun s ovom e-poštom već postoji. Prijavi se.",
      obrisan: "Račun s ovom e-poštom je obrisan. Za pomoć se javi kroz kontakt.",
      uvjeti: "Za otvaranje računa prihvati uvjete i pravila privatnosti.",
      ime: "Upiši ime (najviše 255 znakova).",
      prezime: "Upiši prezime (najviše 255 znakova).",
      pogresan: "Kod nije točan. Preostalo pokušaja: {n}.",
      istekao: "Kod je istekao. Zatraži novi.",
      iskoristen: "Kod je već iskorišten. Zatraži novi.",
      pokusaji: "Previše pogrešnih pokušaja. Zatraži novi kod.",
      nema: "Kod ne postoji. Zatraži novi.",
      naslov: "Provjeri označena polja",
    },
  },
  en: {
    prijava: {
      naslov: "Sign in",
      uvod: "No password: enter your email and we send you a one-time code and a sign-in link.",
      eposta: "Email",
      epostaPomoc: "The code is valid for 5 minutes.",
      posalji: "Send code",
      nepoznataNaslov: "There is no account for this email yet",
      nepoznataTekst: "You can open one right away: accept the terms and we send you a code. You add your name later in settings.",
      uvjetiPrije: "I accept the",
      uvjeti: "terms of use",
      uvjetiI: "and the",
      privatnost: "privacy policy",
      stvoriRacun: "Open account and send code",
      registracijaPitanje: "Want to enter your name now?",
      registracija: "Sign up",
      ili: "or",
      google: "Continue with Google (demo)",
      vecPrijavljen: "You are already signed in as {email}.",
      nastavi: "Continue",
    },
    kod: {
      naslov: "Enter the code",
      uvod: "We sent a 6-digit code to {email}.",
      kod: "Code from the email",
      kodPomoc: "6 digits. At most 5 attempts.",
      potvrdi: "Confirm",
      ponovo: "Send a new code",
      drugaEposta: "Different email",
      nemaNaslov: "No code was sent",
      nemaTekst: "Request a code on the sign-in page. Enter your email and we send it.",
      naPrijavu: "Go to sign in",
      rok: "The code is valid until {vrijeme}.",
    },
    demo: {
      naslov: "Demo: no email is sent",
      tekst: "On the real platform this message would go to {email}. In the prototype it is shown here.",
      kod: "Code",
      link: "Sign-in link",
      nema: "The message with the code is not stored in this browser (demo). Request a new code.",
    },
    registracija: {
      naslov: "Sign up",
      uvod: "An account without a password: after you sign up we send a code to confirm your email.",
      organizacija: "After confirming your email you continue to the organisation application.",
      ime: "First name",
      prezime: "Last name",
      eposta: "Email",
      newsletter: "Send me occasional platform news by email (optional).",
      posalji: "Open account",
      imaRacun: "Already have an account?",
      prijava: "Sign in",
      obavezno: "required",
    },
    potvrda: {
      naslov: "Check your email",
      uvod: "To confirm your address we sent a code to {email}. Enter it or open the link in the message.",
    },
    odjava: {
      naslov: "Sign out",
      tekst: "You are signed in as {email}. Signing out closes the session in this browser.",
      gumb: "Sign out",
    },
    poveznica: {
      naslov: "Sign in with a link",
      vrijedi: "This link is for {email}. Confirm with the button (opening the link alone does not use it up).",
      gumb: "Sign me in",
    },
    google: {
      naslov: "Sign in with Google",
      mock: "Mock: the prototype has no real Google account and sends nothing to Google. Choose a demo account or enter an email.",
      demoRacuni: "Demo accounts",
      uloge: { organizator: "organiser (foundation owner)", moderator: "platform moderator", novi: "new user" },
      odaberi: "Continue as",
      ili: "or another email",
      eposta: "Email",
      nastavi: "Continue",
    },
    potvrdaRadnje: {
      naslov: "Confirm the action",
      uvod: "The action “{radnja}” needs an extra confirmation. We sent a code to {email}; the confirmation is valid for 10 minutes.",
      nepoznata: "sensitive action",
      radnje: {
        refund: "recording a refund",
        close_campaign: "closing the campaign",
        delete_campaign: "deleting the campaign",
        member_role: "changing a member's role",
        delete_account: "deleting the account",
      },
      potvrdi: "Confirm",
      ponovo: "Send a new code",
      natrag: "Back",
    },
    greske: {
      email_prazno: "Enter your email.",
      email_neispravan: "The email is not valid (e.g. name@example.com).",
      email_postoji: "An account with this email already exists. Sign in.",
      obrisan: "The account with this email was deleted. Use the contact form for help.",
      uvjeti: "To open an account, accept the terms and the privacy policy.",
      ime: "Enter your first name (at most 255 characters).",
      prezime: "Enter your last name (at most 255 characters).",
      pogresan: "The code is not correct. Attempts left: {n}.",
      istekao: "The code has expired. Request a new one.",
      iskoristen: "The code was already used. Request a new one.",
      pokusaji: "Too many wrong attempts. Request a new code.",
      nema: "The code does not exist. Request a new one.",
      naslov: "Check the marked fields",
    },
  },
};
