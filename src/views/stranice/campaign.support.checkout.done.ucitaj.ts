/**
 * Checkout korak 4, potvrda `/hr/{id}/podrzi/{checkout}/potvrda` (T, odluka 711): zahvala, iznos, kampanja, stanje,
 * poveznica na MPT stranicu intenta (`checkout_url`), napomena da potvrda s ključem uplatitelja dolazi u produkciji,
 * natrag na kampanju i dijeljenje. Stanje se i ovdje povlači s raila (kasni webhook).
 * S10: checkout mjesečne podrške pokazuje i obećanje (podsjetnik ili trajni nalog) s poveznicom na upravljanje.
 */
import type { Checkout } from "../../lib/db/checkout";
import type { StranicaKampanje } from "../../lib/db/kampanja";
import type { MptIntent } from "../../lib/mpt/klijent";
import { kratkiLink } from "../../components/kampanja/ucitavanje";
import { intentZaPrikaz, ucitajCheckout } from "../../components/checkout/ucitavanje";
import { obecanjeCheckouta, type ObecanjeCheckouta } from "../../lib/db/ponavljanje";
import type { Ucitaj } from "../tipovi";

export interface PodaciPotvrde {
  k: StranicaKampanje;
  ch: Checkout;
  intent: MptIntent | null;
  /** Apsolutna adresa kampanje za dijeljenje. */
  adresa: string;
  /** Checkout je mjesec mjesečne podrške (S8 obećanje). */
  obecanje: ObecanjeCheckouta | null;
}

export const ucitaj: Ucitaj<PodaciPotvrde> = async (ctx) => {
  const r = await ucitajCheckout(ctx, "campaign.support.checkout.done");
  if (r instanceof Response) return r;
  const { k, ch, konfig } = r;
  const [intent, obecanje] = await Promise.all([intentZaPrikaz(konfig, ch.sid), obecanjeCheckouta(ctx.db, ch.id)]);
  return { podaci: { k, ch, intent, adresa: kratkiLink(ctx, k.publicId), obecanje } };
};
