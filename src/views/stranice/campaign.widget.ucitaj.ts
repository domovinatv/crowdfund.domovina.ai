/**
 * Generator widgeta `/hr/{id}/widget`: GET obrazac s `?lang=hr|en`, `?target=campaign|support` te (S10, B09)
 * `?size=small|medium|large` i `?theme=light|dark` (ključevi kao na `/embed/{id}`, whitelist u `opcijeWidgetaIz`),
 * kod za kopiranje i pregled iframea u odabranoj veličini; adresa overlaya za stream (`#stream`).
 */
import { isLang, type Lang } from "../../i18n";
import type { StranicaKampanje } from "../../lib/db/kampanja";
import {
  VELICINE_WIDGETA,
  kodWidgeta,
  opcijeWidgetaIz,
  putStreama,
  putUgradnje,
  type CiljWidgeta,
  type IzgledWidgeta,
  type VelicinaWidgeta,
} from "../../components/kampanja/dijeljenje";
import { ucitajKampanju } from "../../components/kampanja/ucitavanje";
import type { Ucitaj } from "../tipovi";

export interface PodaciWidgeta {
  k: StranicaKampanje;
  jezik: Lang;
  target: CiljWidgeta;
  velicina: VelicinaWidgeta;
  izgled: IzgledWidgeta;
  /** Dimenzije iframea za odabranu veličinu (kod i pregled). */
  dimenzije: { w: number; h: number };
  kod: string;
  pregled: string;
  /** Apsolutna adresa overlaya za stream. */
  stream: string;
}

export const ucitaj: Ucitaj<PodaciWidgeta> = async (ctx) => {
  const k = await ucitajKampanju(ctx, "campaign.widget");
  if (k instanceof Response) return k;
  const q = ctx.url.searchParams;
  const jezik = isLang(q.get("lang")) ? (q.get("lang") as Lang) : ctx.lang;
  const { target, velicina, izgled } = opcijeWidgetaIz(q);
  const o = { velicina, izgled };
  return {
    podaci: {
      k,
      jezik,
      target,
      velicina,
      izgled,
      dimenzije: VELICINE_WIDGETA[velicina],
      kod: kodWidgeta(ctx.url.origin, k.publicId, jezik, target, k.title, o),
      pregled: putUgradnje(k.publicId, jezik, target, o),
      stream: putStreama(ctx.url.origin, k.publicId, jezik),
    },
  };
};
