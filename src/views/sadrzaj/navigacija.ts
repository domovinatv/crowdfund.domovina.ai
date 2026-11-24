/** Bočna navigacija statičnih stranica: tri skupine, nazivi stranica u oba jezika. */
import type { KljucRute } from "../../lib/rute";
import type { Dvojezicno } from "./tipovi";

export type Skupina = "kako-radi" | "pomoc" | "pravno";

export const SKUPINE: Record<Skupina, { naslov: Dvojezicno<string>; stranice: KljucRute[] }> = {
  "kako-radi": {
    naslov: { hr: "Kako radi", en: "How it works" },
    stranice: [
      "how-it-works",
      "how-it-works.donate",
      "how-it-works.moneyboxes",
      "how-it-works.sharing",
      "for-organisations",
      "monthly",
      "how-it-works.for-others",
      "how-it-works.offers",
    ],
  },
  pomoc: {
    naslov: { hr: "Pomoć", en: "Help" },
    stranice: ["faq", "costs", "safety", "contact", "about"],
  },
  pravno: {
    naslov: { hr: "Pravno", en: "Legal" },
    stranice: ["terms", "privacy", "ranking", "about"],
  },
};

/** Kratki naziv stranice u navigaciji; `faza2` dobiva PhaseBadge. */
export const NAZIVI: Partial<Record<KljucRute, Dvojezicno<string> & { faza2?: boolean }>> = {
  "how-it-works": { hr: "Prikupljanje za organizacije", en: "Fundraising for organisations" },
  "how-it-works.donate": { hr: "Kako donirati", en: "How to donate" },
  "how-it-works.moneyboxes": { hr: "Kasice", en: "Moneyboxes" },
  "how-it-works.sharing": { hr: "Dijeljenje kampanje", en: "Sharing a campaign" },
  "how-it-works.for-others": { hr: "Prikupljanje za druge", en: "Fundraising for others", faza2: true },
  "how-it-works.offers": { hr: "Ponude i nagrade", en: "Offers and rewards", faza2: true },
  "for-organisations": { hr: "Kampanja za organizaciju", en: "Campaigns for an organisation" },
  monthly: { hr: "Mjesečne kampanje", en: "Monthly campaigns" },
  costs: { hr: "Troškovi", en: "Costs" },
  faq: { hr: "Česta pitanja", en: "FAQ" },
  safety: { hr: "Sigurnost", en: "Security" },
  contact: { hr: "Kontakt", en: "Contact" },
  about: { hr: "O nama", en: "About us" },
  terms: { hr: "Uvjeti korištenja", en: "Terms of use" },
  privacy: { hr: "Privatnost", en: "Privacy" },
  ranking: { hr: "Pravila prikaza", en: "Ranking and display" },
};
