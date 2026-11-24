/**
 * Kontakt (J*): GET crta obrazac (`?tema=` predodabire temu, `?poslano=1` potvrdu),
 * POST validira i sprema u `contact_messages`, pa 303 na istu rutu s `?poslano=1` (PRG).
 * Turnstile je u prototipu mock: polje `cf-turnstile-response` se ne provjerava.
 */
import { isTemaKontakta, spremiPorukuKontakta, type GreskeKontakta } from "../../lib/db/kontakt";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export interface PodaciKontakta {
  poslano: boolean;
  greske: GreskeKontakta;
  vrijednosti: { name: string; email: string; topic: string; content: string };
}

const PRAZNO = { name: "", email: "", topic: "", content: "" };
const niz = (x: FormDataEntryValue | null) => (typeof x === "string" ? x : "");

export const ucitaj: Ucitaj<PodaciKontakta> = async ({ lang, url: adresa, request, db }) => {
  if (request.method === "POST") {
    const f = await request.formData();
    const vrijednosti = { name: niz(f.get("name")), email: niz(f.get("email")), topic: niz(f.get("topic")), content: niz(f.get("content")) };
    const r = await spremiPorukuKontakta(db, vrijednosti);
    if (r.ok) return new Response(null, { status: 303, headers: { Location: `${url(lang, "contact")}?poslano=1` } });
    return { podaci: { poslano: false, greske: r.greske, vrijednosti } };
  }
  // `tema` iz docs/07; `topic` prihvaćen i zbog odluke 303 (engleski ključevi upita).
  const tema = adresa.searchParams.get("tema") ?? adresa.searchParams.get("topic");
  return {
    podaci: {
      poslano: adresa.searchParams.get("poslano") === "1",
      greske: {},
      vrijednosti: { ...PRAZNO, topic: isTemaKontakta(tema) ? tema : "" },
    },
  };
};
