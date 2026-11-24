/** Moje donacije `/hr/moje/donacije` (P, obilazak 08 „Donated by me”): doprinosi po `user_id` ili mojoj e-pošti. */
import { mojeDonacije, ukupnoDonirano, type MojaDonacija } from "../../lib/db/moje";
import { zahtijevajPrijavu } from "../../lib/pristup";
import type { Ucitaj } from "../tipovi";

export interface PodaciMojihDonacija {
  donacije: MojaDonacija[];
  ukupnoCenti: number;
}

export const ucitaj: Ucitaj<PodaciMojihDonacija> = async (ctx) => {
  const k = zahtijevajPrijavu(ctx);
  if (k instanceof Response) return k;
  const donacije = await mojeDonacije(ctx.db, k.id, k.email);
  return { podaci: { donacije, ukupnoCenti: ukupnoDonirano(donacije) } };
};
