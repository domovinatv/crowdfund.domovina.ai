/**
 * Mjesečni podsjetnik `/hr/podsjetnik/{token}` (T, docs/07, tok 10, odluke 14, 709): kampanja, iznos i mjesec;
 * „Plati ovaj mjesec” otvara intent istim klijentom kao checkout (`platiPodsjetnik`) i 303 na stranicu plaćanja;
 * pauza, nastavak i odjava (POST → 303 `?poruka=`). Nepoznat token → 404; istekla poveznica → 200 s obaviješću
 * i bez plaćanja (pauza i odjava rade i nakon roka). GET ne mijenja stanje (docs/07 konvencija 5).
 */
import { apsolutno } from "../../components/kampanja/ucitavanje";
import { konfigIzKonteksta } from "../../components/checkout/ucitavanje";
import { polje } from "../../components/upravljanje/ucitavanje";
import { platiPodsjetnik, podsjetnikPoTokenu, promijeniPoTokenu, type Podsjetnik, type RadnjaPodsjetnika } from "../../lib/db/ponavljanje";
import { url } from "../../lib/rute";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export type GreskaPodsjetnika = "istekao" | "otkazano" | "mpt" | "konfig" | "kampanja";

export interface PodaciPodsjetnika {
  p: Podsjetnik;
  token: string;
  poruka: RadnjaPodsjetnika | null;
  greska: GreskaPodsjetnika | null;
}

const RADNJE: readonly RadnjaPodsjetnika[] = ["pauza", "nastavak", "odjava"];

export const ucitaj: Ucitaj<PodaciPodsjetnika> = async (ctx) => {
  const token = ctx.params.token ?? "";
  const sad = Date.now();
  const ovdje = url(ctx.lang, "reminder", { token });
  let greska: GreskaPodsjetnika | null = null;
  if (ctx.request.method === "POST") {
    const f = await ctx.request.formData();
    const radnja = polje(f, "radnja");
    if ((RADNJE as readonly string[]).includes(radnja)) {
      if (!(await podsjetnikPoTokenu(ctx.db, token, sad))) return nijePronadeno();
      await promijeniPoTokenu(ctx.db, token, radnja as RadnjaPodsjetnika, sad);
      return new Response(null, { status: 303, headers: { Location: `${ovdje}?poruka=${radnja}` } });
    }
    if (radnja !== "plati") return nijePronadeno();
    const konfig = konfigIzKonteksta(ctx);
    if (!konfig) greska = "konfig";
    else {
      const lang = ctx.lang;
      const r = await platiPodsjetnik(ctx.db, konfig, token, (checkout, id) => apsolutno(ctx, url(lang, "campaign.support.checkout", { id, checkout })), sad);
      if (!r) return nijePronadeno();
      if (r.ok) return new Response(null, { status: 303, headers: { Location: url(lang, "campaign.support.checkout", { id: r.publicId, checkout: r.checkoutId }) } });
      greska = r.razlog === "istekao" || r.razlog === "otkazano" || r.razlog === "mpt" ? r.razlog : "kampanja";
    }
  }
  const p = await podsjetnikPoTokenu(ctx.db, token, sad);
  if (!p) return nijePronadeno();
  const q = ctx.url.searchParams.get("poruka");
  const poruka = ctx.request.method === "GET" && (RADNJE as readonly string[]).includes(q ?? "") ? (q as RadnjaPodsjetnika) : null;
  return { podaci: { p, token, poruka, greska } };
};
