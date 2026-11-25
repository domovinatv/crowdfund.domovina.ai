/**
 * Checkout korak 2 `/hr/{id}/podrzi/{checkout}` (T, docs/08 §5.3, odluka 704): upute za uplatu, stanje uživo,
 * simulacija u sandboxu. GET povlači stanje s raila (`uskladiCheckout`), pa je i „Osvježi stanje” bez JS-a pull.
 * Plaćen doprinos → uspjeh i „Nastavi” na napojnicu; istekao ili odbijen → poruka i novi pokušaj.
 */
import { doprinosNeuspio, doprinosPlacen, type Checkout } from "../../lib/db/checkout";
import type { StranicaKampanje } from "../../lib/db/kampanja";
import type { MptIntent } from "../../lib/mpt/klijent";
import { demoPracenjaCheckouta, intentZaPrikaz, jeSandbox, ucitajCheckout } from "../../components/checkout/ucitavanje";
import { procitajDemoPostu } from "../../lib/sesija";
import { obecanjeCheckouta, type ObecanjeCheckouta } from "../../lib/db/ponavljanje";
import type { Ucitaj } from "../tipovi";

export interface PodaciPlacanja {
  k: StranicaKampanje;
  ch: Checkout;
  intent: MptIntent | null;
  sandbox: boolean;
  placen: boolean;
  neuspio: boolean;
  /** Checkout je prvi mjesec (ili mjesec s podsjetnika) mjesečne podrške (S8). */
  obecanje: ObecanjeCheckouta | null;
  /** Mock e-pošta gostu: poveznica za potvrdu praćenja novosti iz kvačice obrasca (S10, A19). */
  demoPracenje: { email: string; link: string } | null;
}

export const ucitaj: Ucitaj<PodaciPlacanja> = async (ctx) => {
  const r = await ucitajCheckout(ctx, "campaign.support.checkout");
  if (r instanceof Response) return r;
  const { k, ch, konfig } = r;
  const placen = doprinosPlacen(ch);
  const neuspio = doprinosNeuspio(ch);
  const intent = placen || neuspio ? null : await intentZaPrikaz(konfig, ch.sid);
  const obecanje = await obecanjeCheckouta(ctx.db, ch.id);
  const posta = ctx.cookies ? procitajDemoPostu(ctx.cookies, demoPracenjaCheckouta(ch.id)) : null;
  const demoPracenje = posta?.link ? { email: posta.email, link: posta.link } : null;
  return { podaci: { k, ch, intent, sandbox: jeSandbox(konfig, intent), placen, neuspio, obecanje, demoPracenje } };
};
