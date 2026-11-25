/**
 * Checkout korak 2 `/hr/{id}/podrzi/{checkout}` (T, docs/08 §5.3, odluka 704): upute za uplatu, stanje uživo,
 * simulacija u sandboxu. GET povlači stanje s raila (`uskladiCheckout`), pa je i „Osvježi stanje” bez JS-a pull.
 * Plaćen doprinos → uspjeh i „Nastavi” na napojnicu; istekao ili odbijen → poruka i novi pokušaj.
 */
import { doprinosNeuspio, doprinosPlacen, type Checkout } from "../../lib/db/checkout";
import type { StranicaKampanje } from "../../lib/db/kampanja";
import type { MptIntent } from "../../lib/mpt/klijent";
import { intentZaPrikaz, jeSandbox, ucitajCheckout } from "../../components/checkout/ucitavanje";
import type { Ucitaj } from "../tipovi";

export interface PodaciPlacanja {
  k: StranicaKampanje;
  ch: Checkout;
  intent: MptIntent | null;
  sandbox: boolean;
  placen: boolean;
  neuspio: boolean;
}

export const ucitaj: Ucitaj<PodaciPlacanja> = async (ctx) => {
  const r = await ucitajCheckout(ctx, "campaign.support.checkout");
  if (r instanceof Response) return r;
  const { k, ch, konfig } = r;
  const placen = doprinosPlacen(ch);
  const neuspio = doprinosNeuspio(ch);
  const intent = placen || neuspio ? null : await intentZaPrikaz(konfig, ch.sid);
  return { podaci: { k, ch, intent, sandbox: jeSandbox(konfig, intent), placen, neuspio } };
};
