/**
 * Checkout korak 3 `/hr/{id}/podrzi/{checkout}/napojnica` (T, docs/08 §5.4, odluke 7 i 708): neobavezna napojnica
 * platformi tek nakon plaćenog doprinosa. Izbori 0 / 1 / 2 / 5 € / svoj, „0” prvi i jednako istaknut, ništa
 * predodabrano. POST 0 → 303 na potvrdu; > 0 → `stvoriNapojnicu` i 303 na istu stranicu, koja tada pokazuje upute
 * za uplatu drugog intenta (na Safe platforme, ne kampanje). Postojeća napojnica se ne mijenja.
 */
import {
  doprinosPlacen,
  iznosNapojnice,
  napojnicaNeuspjela,
  napojnicaPlacena,
  stvoriNapojnicu,
  type Checkout,
} from "../../lib/db/checkout";
import type { StranicaKampanje } from "../../lib/db/kampanja";
import type { MptIntent } from "../../lib/mpt/klijent";
import { apsolutno } from "../../components/kampanja/ucitavanje";
import { intentZaPrikaz, jeSandbox, ucitajCheckout } from "../../components/checkout/ucitavanje";
import { polje } from "../../components/upravljanje/ucitavanje";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export interface PodaciNapojnice {
  k: StranicaKampanje;
  ch: Checkout;
  placen: boolean;
  intent: MptIntent | null;
  sandbox: boolean;
  napojnicaPlacena: boolean;
  napojnicaNeuspjela: boolean;
  izbor: string;
  svojIznos: string;
  greska: "obavezno" | "nevaljan" | null;
  greskaUplate: boolean;
}

export const ucitaj: Ucitaj<PodaciNapojnice> = async (ctx) => {
  const r = await ucitajCheckout(ctx, "campaign.support.checkout.tip");
  if (r instanceof Response) return r;
  const { k, ch, konfig } = r;
  const placen = doprinosPlacen(ch);
  let izbor = "";
  let svojIznos = "";
  let greska: PodaciNapojnice["greska"] = null;
  let greskaUplate = false;
  const ovdje = url(ctx.lang, "campaign.support.checkout.tip", { id: k.publicId, checkout: ch.id });

  if (ctx.request.method === "POST" && placen && !ch.napojnica) {
    const f = await ctx.request.formData();
    izbor = polje(f, "napojnica");
    svojIznos = polje(f, "svojaNapojnica");
    const iznos = iznosNapojnice(izbor, svojIznos);
    if (typeof iznos !== "number") greska = iznos;
    else {
      const rez = await stvoriNapojnicu(ctx.db, konfig, ch.id, iznos, undefined, { povratniUrl: apsolutno(ctx, ovdje) });
      if (rez.ok && rez.nula) {
        return new Response(null, { status: 303, headers: { Location: url(ctx.lang, "campaign.support.checkout.done", { id: k.publicId, checkout: ch.id }) } });
      }
      if (rez.ok) return new Response(null, { status: 303, headers: { Location: ovdje } });
      if (rez.razlog === "iznos") greska = "nevaljan";
      else greskaUplate = true;
    }
  }

  const tipPlacen = napojnicaPlacena(ch);
  const tipNeuspio = napojnicaNeuspjela(ch);
  const intent = ch.napojnica && !tipPlacen && !tipNeuspio ? await intentZaPrikaz(konfig, ch.napojnica.sid) : null;
  return {
    podaci: {
      k, ch, placen, intent, sandbox: jeSandbox(konfig, intent),
      napojnicaPlacena: tipPlacen, napojnicaNeuspjela: tipNeuspio, izbor, svojIznos, greska, greskaUplate,
    },
  };
};
